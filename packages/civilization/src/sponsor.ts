import {
	buildDecisionContext,
	civilizationCounselCatalog,
	validateIntentProposal,
} from "@eonfolk/cognition";
import {
	batchHash,
	batchId,
	type CausalParent,
	type CognitiveDecisionRecord,
	type CommandReceipt,
	type CommandRejectionCode,
	type DecisionContext,
	decisionRecordHash,
	ENGINE_VERSION,
	eventHash,
	type IntentProposal,
	jcs,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	stateHash,
	VISIBILITY_POLICY_VERSION,
	type WorldBatchHeader,
	type WorldCommand,
	type WorldCommandPayload,
	type WorldEventEnvelope,
	type WorldEventPayload,
} from "@eonfolk/protocol";

import { assertCivilizationInvariants } from "./audit.js";
import { deepFreeze } from "./state.js";
import type { CivilizationCounselState, CivilizationState } from "./types.js";

export const CIVILIZATION_SPONSOR_MECHANISM_VERSION =
	"eonfolk-civilization-sponsor-v2" as const;

type SponsorCommandPayload = Extract<
	WorldCommandPayload,
	{ kind: "EstablishSponsorship" | "IssueCounsel" | "ResolveCounsel" }
>;
export type CivilizationSponsorEventPayload = Extract<
	WorldEventPayload,
	{ kind: "SponsorshipEstablished" | "CounselIssued" | "CounselInterpreted" }
>;
export type CivilizationAuthorityEventEnvelope = WorldEventEnvelope;
export type CivilizationSponsorEventEnvelope =
	WorldEventEnvelope<CivilizationSponsorEventPayload>;

export interface ValidatedStandardBrainResolution {
	readonly decisionId: string;
	readonly context: DecisionContext;
	readonly proposal: IntentProposal;
	readonly decisionRecord: CognitiveDecisionRecord;
}

export interface CivilizationSponsorTransitionInput {
	readonly state: CivilizationState;
	readonly runId: string;
	readonly regionId: string;
	readonly priorWorldHeadHash: string;
	/** Snapshot metadata owns this cursor; history may be empty after compaction. */
	readonly nextSequence: number;
	readonly fencingToken: number;
	readonly command: WorldCommand<SponsorCommandPayload>;
	/** Contiguous, already-applied suffix that ends at state. */
	readonly authoritativeHistory: readonly CivilizationAuthorityEventEnvelope[];
	readonly priorReceipts?: readonly CommandReceipt[];
	readonly resolution?: ValidatedStandardBrainResolution;
}

export interface CivilizationSponsorTransition {
	readonly accepted: boolean;
	readonly duplicate: boolean;
	readonly priorState: CivilizationState;
	readonly postState: CivilizationState;
	readonly priorStateHash: string;
	readonly finalStateHash: string;
	readonly priorWorldHeadHash: string;
	readonly resultingWorldHeadHash: string;
	readonly events: readonly CivilizationSponsorEventEnvelope[];
	readonly batchHeader: WorldBatchHeader | null;
	readonly receipt: CommandReceipt;
}

interface PendingEvent {
	readonly payload: CivilizationSponsorEventPayload;
	readonly visibility: CivilizationSponsorEventEnvelope["visibility"];
	readonly causalParents: readonly CausalParent[];
}

const hashPattern = /^[0-9a-f]{64}$/u;
const identifier = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	value.length <= 160 &&
	!/\p{Cc}/u.test(value);
const nonnegative = (value: unknown): value is number =>
	Number.isSafeInteger(value) && Number(value) >= 0;

function exactKeys(value: object, expected: readonly string[]): boolean {
	const actual = Object.keys(value).sort();
	const sorted = [...expected].sort();
	return (
		actual.length === sorted.length &&
		actual.every((key, i) => key === sorted[i])
	);
}

function validCommand(command: WorldCommand<SponsorCommandPayload>): boolean {
	if (
		!exactKeys(command, [
			"schemaVersion",
			"commandId",
			"payloadFingerprint",
			"expectedRevision",
			"principal",
			"runId",
			"regionId",
			"payload",
			...(command.provenanceRef === undefined ? [] : ["provenanceRef"]),
		]) ||
		command.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		!identifier(command.commandId) ||
		!hashPattern.test(command.payloadFingerprint) ||
		!nonnegative(command.expectedRevision) ||
		!identifier(command.runId) ||
		!identifier(command.regionId) ||
		!identifier(command.payload.citizenId) ||
		!identifier(command.principal.principalId)
	)
		return false;
	const payload = command.payload;
	if (payload.kind === "EstablishSponsorship")
		return (
			exactKeys(payload, ["kind", "covenantId", "citizenId"]) &&
			identifier(payload.covenantId) &&
			command.principal.kind === "patron" &&
			exactKeys(command.principal, [
				"kind",
				"principalId",
				"beneficiaryCitizenId",
			])
		);
	if (payload.kind === "IssueCounsel")
		return (
			exactKeys(payload, ["kind", "interventionId", "citizenId", "intent"]) &&
			identifier(payload.interventionId) &&
			command.principal.kind === "patron" &&
			exactKeys(command.principal, [
				"kind",
				"principalId",
				"beneficiaryCitizenId",
			])
		);
	return (
		exactKeys(payload, [
			"kind",
			"citizenId",
			"interventionId",
			"decisionId",
			"proposalId",
			"action",
		]) &&
		command.principal.kind === "citizen" &&
		exactKeys(command.principal, ["kind", "principalId"]) &&
		(payload.interventionId === null || identifier(payload.interventionId)) &&
		identifier(payload.decisionId) &&
		identifier(payload.proposalId)
	);
}

function validEventProvenance(event: WorldEventEnvelope): boolean {
	if (event.eventPayload.kind === "SponsorshipEstablished")
		return (
			event.provenance.kind === "patron-intervention" &&
			identifier(event.provenance.commandId) &&
			event.provenance.interventionId === undefined
		);
	if (event.eventPayload.kind === "CounselIssued")
		return (
			event.provenance.kind === "patron-intervention" &&
			event.provenance.interventionId === event.eventPayload.interventionId
		);
	if (event.eventPayload.kind === "CounselInterpreted")
		return (
			event.provenance.kind === "cognition" &&
			identifier(event.provenance.decisionId) &&
			identifier(event.provenance.proposalId) &&
			event.provenance.interventionId === event.eventPayload.interventionId
		);
	return true;
}

async function validHistory(
	state: CivilizationState,
	currentHash: string,
	history: readonly WorldEventEnvelope[],
	runId: string,
	regionId: string,
	nextSequence: number,
): Promise<boolean> {
	if (!nonnegative(nextSequence)) return false;
	if (history.length === 0) return true;
	if (
		history.at(-1)?.postStateHash !== currentHash ||
		history.at(-1)!.sequence + 1 !== nextSequence
	)
		return false;
	const suffixIds = new Set(history.map(({ eventId }) => eventId));
	const known = new Set(
		state.provenance
			.map(({ eventId }) => eventId)
			.filter((eventId) => !suffixIds.has(eventId)),
	);
	let priorSequence: number | null = null;
	let priorHash: string | null = null;
	for (const event of history) {
		const { eventHash: digest, ...withoutHash } = event;
		if (
			event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
			event.engineVersion !== ENGINE_VERSION ||
			event.runId !== runId ||
			event.regionId !== regionId ||
			!nonnegative(event.sequence) ||
			(priorSequence !== null && event.sequence !== priorSequence + 1) ||
			(priorHash !== null && event.preStateHash !== priorHash) ||
			known.has(event.eventId) ||
			!hashPattern.test(event.preStateHash) ||
			!hashPattern.test(event.postStateHash) ||
			!hashPattern.test(digest) ||
			(await eventHash(withoutHash)) !== digest ||
			!validEventProvenance(event) ||
			!state.provenance.some(({ eventId }) => eventId === event.eventId) ||
			event.causalParents.some(
				(parent) =>
					!known.has(parent.eventId) || !identifier(parent.mechanismId),
			)
		)
			return false;
		known.add(event.eventId);
		priorSequence = event.sequence;
		priorHash = event.postStateHash;
	}
	return true;
}

const appendUnique = (
	values: readonly string[],
	value: string,
): readonly string[] => (values.includes(value) ? values : [...values, value]);

function applyPayload(
	state: CivilizationState,
	payload: CivilizationSponsorEventPayload,
	event: Pick<
		CivilizationSponsorEventEnvelope,
		"eventId" | "causalParents" | "provenance"
	>,
	finalInBatch: boolean,
): CivilizationState {
	const citizen = state.citizens[payload.citizenId];
	if (citizen === undefined || citizen.residenceState !== "resident")
		throw new Error("ACTION_UNAVAILABLE");
	let sponsorships = state.sponsorships;
	let counsels = state.counsels;
	let mechanismId: string;
	if (payload.kind === "SponsorshipEstablished") {
		if (
			citizen.settlementId !== payload.settlementId ||
			state.sponsorships[payload.covenantId] !== undefined ||
			Object.values(state.sponsorships).some(
				(item) =>
					item.beneficiaryCitizenId === payload.citizenId ||
					item.patronPrincipalId === payload.patronPrincipalId,
			)
		)
			throw new Error("ACTION_UNAVAILABLE");
		sponsorships = {
			...sponsorships,
			[payload.covenantId]: {
				schemaVersion: "eonfolk-civilization-sponsorship-v1",
				covenantId: payload.covenantId,
				patronPrincipalId: payload.patronPrincipalId,
				beneficiaryCitizenId: payload.citizenId,
				settlementId: payload.settlementId,
				establishedAtSimulationTime: state.simulationTime,
				establishedAtRevision: state.revision + (finalInBatch ? 1 : 0),
				sourceEventId: event.eventId,
			},
		};
		mechanismId = "sponsor.covenant.established.v1";
	} else if (payload.kind === "CounselIssued") {
		const covenant = Object.values(state.sponsorships).find(
			(item) => item.beneficiaryCitizenId === payload.citizenId,
		);
		if (
			covenant === undefined ||
			state.counsels[payload.interventionId] !== undefined
		)
			throw new Error("ACTION_UNAVAILABLE");
		const counsel: CivilizationCounselState = {
			schemaVersion: "eonfolk-civilization-counsel-v1",
			interventionId: payload.interventionId,
			covenantId: covenant.covenantId,
			citizenId: payload.citizenId,
			intent: payload.intent,
			sourceEventId: event.eventId,
			issuedAtSimulationTime: state.simulationTime,
			resolution: null,
		};
		counsels = { ...counsels, [payload.interventionId]: counsel };
		mechanismId = "sponsor.counsel.issued.v1";
	} else {
		const counsel =
			payload.interventionId === null
				? undefined
				: state.counsels[payload.interventionId];
		if (
			counsel === undefined ||
			counsel.citizenId !== payload.citizenId ||
			counsel.resolution !== null ||
			payload.disposition === "not-applicable" ||
			event.provenance.kind !== "cognition" ||
			!identifier(event.provenance.decisionId) ||
			!identifier(event.provenance.proposalId)
		)
			throw new Error("ACTION_UNAVAILABLE");
		counsels = {
			...counsels,
			[counsel.interventionId]: {
				...counsel,
				resolution: {
					sourceEventId: event.eventId,
					decisionId: event.provenance.decisionId,
					proposalId: event.provenance.proposalId,
					action: payload.action,
					disposition: payload.disposition,
				},
			},
		};
		mechanismId = "brain.counsel.interpreted.v1";
	}
	const visibleSources = event.causalParents
		.map(({ eventId }) => eventId)
		.filter((eventId) => citizen.sourceEventIds.includes(eventId));
	const next = deepFreeze({
		...state,
		revision: finalInBatch ? state.revision + 1 : state.revision,
		citizens: {
			...state.citizens,
			[citizen.citizenId]: {
				...citizen,
				sourceEventIds: appendUnique(citizen.sourceEventIds, event.eventId),
			},
		},
		sponsorships,
		counsels,
		provenance: [
			...state.provenance,
			{
				eventId: event.eventId,
				mechanismId,
				causeEventIds: event.causalParents.map(({ eventId }) => eventId),
				actorVisibleSourceEventIds: visibleSources,
				modelDecisionId: null,
			},
		],
	});
	assertCivilizationInvariants(next);
	return next;
}

function contextMatchesState(
	state: CivilizationState,
	context: DecisionContext,
): boolean {
	const mind = state.minds[context.actorId]?.snapshot;
	const actor = state.citizens[context.actorId];
	if (mind === undefined || actor === undefined) return false;
	if (
		mind.values.some((value) => !actor.valueIds.includes(value.valueId)) ||
		mind.records.some((record) =>
			record.sourceIds.some(
				(sourceId) =>
					!state.provenance.some(({ eventId }) => eventId === sourceId),
			),
		)
	)
		return false;
	return mind.relationships.every((relationship) => {
		const canonical = state.relationships[relationship.relationshipId];
		return (
			canonical !== undefined &&
			canonical.fromCitizenId === relationship.fromCitizenId &&
			canonical.toCitizenId === relationship.toCitizenId &&
			canonical.familiarityBasisPoints === relationship.familiarity &&
			canonical.trustBasisPoints === relationship.trust &&
			canonical.strainBasisPoints === relationship.strain
		);
	});
}

async function validResolution(
	state: CivilizationState,
	command: WorldCommand<
		Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }>
	>,
	resolution: ValidatedStandardBrainResolution,
	counsel: CivilizationCounselState,
	wholePreStateHash: string,
): Promise<boolean> {
	const { context, proposal, decisionRecord: record } = resolution;
	const mind = state.minds[command.payload.citizenId]?.snapshot;
	const covenant = Object.values(state.sponsorships).find(
		(item) => item.beneficiaryCitizenId === command.payload.citizenId,
	);
	if (
		mind === undefined ||
		covenant === undefined ||
		!contextMatchesState(state, context) ||
		resolution.decisionId !== command.payload.decisionId ||
		context.actorId !== command.payload.citizenId ||
		context.runId !== command.runId ||
		context.regionId !== command.regionId ||
		context.revision !== state.revision ||
		context.simulationTime !== state.simulationTime ||
		context.decisionReason !== "sponsor-counsel" ||
		context.counselIntent !== counsel.intent ||
		proposal.provenance.cognitionKind !== "standard-brain" ||
		proposal.proposalId !== command.payload.proposalId ||
		proposal.actorId !== context.actorId ||
		(await validateIntentProposal(context, proposal)) !== "accepted"
	)
		return false;
	const targetId = mind.standingPlan.targetIds.find(
		(candidate) =>
			candidate !== mind.citizenId &&
			state.citizens[candidate]?.residenceState === "resident" &&
			state.citizens[candidate]?.settlementId ===
				state.citizens[mind.citizenId]?.settlementId,
	);
	const relationship = mind.relationships.find(
		(item) => item.toCitizenId === targetId,
	);
	if (targetId === undefined || relationship === undefined) return false;
	const canonicalCatalog = civilizationCounselCatalog({
		actorId: mind.citizenId,
		targetCitizenId: targetId,
		planId: mind.standingPlan.planId,
		relationshipId: relationship.relationshipId,
		evidenceRecordIds: mind.records.map(({ recordId }) => recordId).sort(),
	});
	const rebuilt = await buildDecisionContext({
		contextId: context.contextId,
		actorMind: mind,
		runId: command.runId,
		regionId: command.regionId,
		revision: state.revision,
		simulationTime: state.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: canonicalCatalog,
		visibilityContext: {
			policyVersion: VISIBILITY_POLICY_VERSION,
			covenants: Object.values(state.sponsorships).map((item) => ({
				patronPrincipalId: item.patronPrincipalId,
				beneficiaryCitizenId: item.beneficiaryCitizenId,
				grantRevision: item.establishedAtRevision,
				revokeRevision: null,
			})),
			localOwnerPrincipalId: covenant.patronPrincipalId,
			nonproduction: false,
		},
		counselIntent: counsel.intent,
	});
	if (jcs(rebuilt) !== jcs(context)) return false;
	const { decisionRecordHash: digest, ...withoutHash } = record;
	if (
		(await decisionRecordHash(withoutHash)) !== digest ||
		record.decisionId !== command.payload.decisionId ||
		record.actorId !== context.actorId ||
		record.runId !== command.runId ||
		record.regionId !== command.regionId ||
		record.revision !== state.revision ||
		record.simulationTime !== state.simulationTime ||
		record.wholePreStateHash !== wholePreStateHash ||
		record.contextHash !== context.contextHash ||
		record.actionCatalogHash !== context.catalogHash ||
		record.proposalCanonicalBytes !== jcs(proposal) ||
		record.proposalHash !== proposal.proposalHash ||
		record.proposedCommandId !== command.commandId ||
		record.receiptRef !== null ||
		record.acceptedEventInterval !== null ||
		record.failureCode !== null ||
		record.validator.outcome !== "accepted" ||
		record.cognitionKind !== "standard-brain" ||
		record.provider !== null ||
		record.model !== null ||
		record.explanation === null ||
		jcs(record.explanation) !== jcs(proposal.explanation) ||
		jcs(record.suppliedRecordIds) !==
			jcs(context.visibleRecords.map(({ recordId }) => recordId))
	)
		return false;
	const action = proposal.action;
	if (action.kind === "FollowStandingPlan")
		return (
			command.payload.action === "follow-plan" &&
			action.planId === mind.standingPlan.planId &&
			mind.standingPlan.status === "active"
		);
	if (action.kind !== "VerifyReserve" && action.kind !== "AccusePublicly")
		return false;
	if (
		(action.kind === "VerifyReserve" &&
			command.payload.action !== "verify-reserve") ||
		(action.kind === "AccusePublicly" &&
			command.payload.action !== "accuse-publicly")
	)
		return false;
	const actor = state.citizens[context.actorId]!;
	const target = state.citizens[action.targetCitizenId];
	if (
		target === undefined ||
		target.citizenId === actor.citizenId ||
		target.residenceState !== "resident" ||
		target.settlementId !== actor.settlementId
	)
		return false;
	return (
		action.kind !== "AccusePublicly" ||
		Object.values(state.relationships).some(
			(item) =>
				item.fromCitizenId === actor.citizenId &&
				item.toCitizenId === target.citizenId,
		)
	);
}

async function pending(
	input: CivilizationSponsorTransitionInput,
	priorStateHash: string,
): Promise<PendingEvent | CommandRejectionCode> {
	const { state, command } = input;
	const actor = state.citizens[command.payload.citizenId];
	if (actor === undefined || actor.residenceState !== "resident")
		return "ACTION_UNAVAILABLE";
	if (command.payload.kind === "EstablishSponsorship") {
		if (
			command.principal.kind !== "patron" ||
			command.principal.beneficiaryCitizenId !== actor.citizenId
		)
			return "INVALID_PRINCIPAL";
		if (
			state.sponsorships[command.payload.covenantId] !== undefined ||
			Object.values(state.sponsorships).some(
				(item) =>
					item.beneficiaryCitizenId === actor.citizenId ||
					item.patronPrincipalId === command.principal.principalId,
			)
		)
			return "NO_OP";
		return {
			payload: {
				kind: "SponsorshipEstablished",
				covenantId: command.payload.covenantId,
				patronPrincipalId: command.principal.principalId,
				citizenId: actor.citizenId,
				settlementId: actor.settlementId,
			},
			visibility: { kind: "public" },
			causalParents: [],
		};
	}
	const covenant = Object.values(state.sponsorships).find(
		(item) => item.beneficiaryCitizenId === actor.citizenId,
	);
	if (command.payload.kind === "IssueCounsel") {
		if (
			command.principal.kind !== "patron" ||
			command.principal.beneficiaryCitizenId !== actor.citizenId ||
			covenant?.patronPrincipalId !== command.principal.principalId ||
			covenant.settlementId !== actor.settlementId
		)
			return "INVALID_PRINCIPAL";
		if (state.counsels[command.payload.interventionId] !== undefined)
			return "NO_OP";
		return {
			payload: {
				kind: "CounselIssued",
				interventionId: command.payload.interventionId,
				citizenId: command.payload.citizenId,
				intent: command.payload.intent,
			},
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: actor.citizenId,
			},
			causalParents: [
				{
					eventId: covenant.sourceEventId,
					relation: "direct",
					mechanismId: "sponsor.covenant.authorizes-counsel.v1",
				},
			],
		};
	}
	if (
		command.principal.kind !== "citizen" ||
		command.principal.principalId !== actor.citizenId
	)
		return "INVALID_PRINCIPAL";
	if (command.payload.interventionId === null) return "ACTION_UNAVAILABLE";
	const counsel = state.counsels[command.payload.interventionId];
	if (
		covenant === undefined ||
		covenant.settlementId !== actor.settlementId ||
		counsel === undefined ||
		counsel.covenantId !== covenant.covenantId ||
		counsel.citizenId !== actor.citizenId ||
		counsel.resolution !== null ||
		input.resolution === undefined ||
		!(await validResolution(
			state,
			command as WorldCommand<
				Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }>
			>,
			input.resolution,
			counsel,
			priorStateHash,
		))
	)
		return "ACTION_UNAVAILABLE";
	const disposition = input.resolution.proposal.explanation.counselDisposition;
	if (
		disposition !== "accepted" &&
		disposition !== "rejected" &&
		disposition !== "reinterpreted"
	)
		return "ACTION_UNAVAILABLE";
	return {
		payload: {
			kind: "CounselInterpreted",
			citizenId: actor.citizenId,
			interventionId: counsel.interventionId,
			action: command.payload.action,
			disposition,
			planId: input.resolution.context.activeStandingPlan.planId,
		},
		visibility: {
			kind: "patron-visible-through-covenant",
			subjectCitizenId: actor.citizenId,
		},
		causalParents: [
			{
				eventId: counsel.sourceEventId,
				relation: "trigger",
				mechanismId: "counsel.considered-at-decision-boundary.v1",
			},
		],
	};
}

function receipt(
	state: CivilizationState,
	command: WorldCommand<SponsorCommandPayload>,
	worldHeadHash: string,
	fencingToken: number,
	outcome: "accepted" | "rejected",
	rejectionCode: CommandRejectionCode | null,
	events: readonly CivilizationSponsorEventEnvelope[],
	resultingRevision: number,
): CommandReceipt {
	return {
		schemaVersion: "eonfolk-command-receipt-v1",
		runId: command.runId,
		regionId: command.regionId,
		commandId: command.commandId,
		payloadFingerprint: command.payloadFingerprint,
		principal: command.principal,
		expectedRevision: command.expectedRevision,
		actualRevision: state.revision,
		outcome,
		eventInterval:
			events.length === 0
				? null
				: {
						fromSequenceInclusive: events[0]!.sequence,
						toSequenceExclusive: events.at(-1)!.sequence + 1,
						eventIds: events.map(({ eventId }) => eventId),
					},
		rejectionCode,
		resultingRevision,
		resultingWorldHeadHash: worldHeadHash,
		createdSimulationTime: state.simulationTime,
		fencingToken,
	};
}

function reject(
	input: CivilizationSponsorTransitionInput,
	priorStateHash: string,
	code: CommandRejectionCode,
): CivilizationSponsorTransition {
	return {
		accepted: false,
		duplicate: false,
		priorState: input.state,
		postState: input.state,
		priorStateHash,
		finalStateHash: priorStateHash,
		priorWorldHeadHash: input.priorWorldHeadHash,
		resultingWorldHeadHash: input.priorWorldHeadHash,
		events: [],
		batchHeader: null,
		receipt: receipt(
			input.state,
			input.command,
			input.priorWorldHeadHash,
			input.fencingToken,
			"rejected",
			code,
			[],
			input.state.revision,
		),
	};
}

export async function prepareCivilizationSponsorTransition(
	input: CivilizationSponsorTransitionInput,
): Promise<CivilizationSponsorTransition> {
	assertCivilizationInvariants(input.state);
	const priorStateHash = await stateHash(input.state);
	if (
		!identifier(input.runId) ||
		!identifier(input.regionId) ||
		!hashPattern.test(input.priorWorldHeadHash) ||
		!nonnegative(input.nextSequence) ||
		!nonnegative(input.fencingToken) ||
		!(await validHistory(
			input.state,
			priorStateHash,
			input.authoritativeHistory,
			input.runId,
			input.regionId,
			input.nextSequence,
		))
	)
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (
		input.command.runId !== input.runId ||
		input.command.regionId !== input.regionId
	)
		return reject(input, priorStateHash, "RUN_REGION_MISMATCH");
	if (!validCommand(input.command))
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (
		(await payloadFingerprint(input.command.payload)) !==
		input.command.payloadFingerprint
	)
		return reject(input, priorStateHash, "BAD_FINGERPRINT");
	const prior = input.priorReceipts?.find(
		({ commandId }) => commandId === input.command.commandId,
	);
	if (prior !== undefined) {
		if (
			prior.runId !== input.runId ||
			prior.regionId !== input.regionId ||
			prior.payloadFingerprint !== input.command.payloadFingerprint ||
			prior.expectedRevision !== input.command.expectedRevision ||
			jcs(prior.principal) !== jcs(input.command.principal)
		)
			return reject(input, priorStateHash, "INVALID_COMMAND");
		return {
			accepted: prior.outcome === "accepted",
			duplicate: true,
			priorState: input.state,
			postState: input.state,
			priorStateHash,
			finalStateHash: priorStateHash,
			priorWorldHeadHash: input.priorWorldHeadHash,
			resultingWorldHeadHash: input.priorWorldHeadHash,
			events: [],
			batchHeader: null,
			receipt: prior,
		};
	}
	if (
		input.authoritativeHistory.some(
			(event) => event.provenance.commandId === input.command.commandId,
		)
	)
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (input.command.expectedRevision !== input.state.revision)
		return reject(input, priorStateHash, "STALE_REVISION");
	const specification = await pending(input, priorStateHash);
	if (typeof specification === "string")
		return reject(input, priorStateHash, specification);
	const id = await batchId(
		input.runId,
		input.regionId,
		input.state.revision,
		input.command.commandId,
	);
	const eventId = `event:${id}:0`;
	const provenance: CivilizationSponsorEventEnvelope["provenance"] =
		input.command.payload.kind === "ResolveCounsel"
			? {
					kind: "cognition",
					commandId: input.command.commandId,
					interventionId: input.command.payload.interventionId!,
					decisionId: input.command.payload.decisionId,
					proposalId: input.command.payload.proposalId,
				}
			: {
					kind: "patron-intervention",
					commandId: input.command.commandId,
					...(input.command.payload.kind === "IssueCounsel"
						? { interventionId: input.command.payload.interventionId }
						: {}),
				};
	const postState = applyPayload(
		input.state,
		specification.payload,
		{ eventId, causalParents: specification.causalParents, provenance },
		true,
	);
	const finalStateHash = await stateHash(postState);
	const withoutHash = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		engineVersion: ENGINE_VERSION,
		eventId,
		runId: input.runId,
		regionId: input.regionId,
		sequence: input.nextSequence,
		simulationTime: postState.simulationTime,
		eventPayload: specification.payload,
		causalParents: specification.causalParents,
		relatedEvents: [],
		visibility: specification.visibility,
		provenance,
		preStateHash: priorStateHash,
		postStateHash: finalStateHash,
		batchId: id,
	};
	const event: CivilizationSponsorEventEnvelope = {
		...withoutHash,
		eventHash: await eventHash(withoutHash),
	};
	const digest = await batchHash({
		runId: input.runId,
		regionId: input.regionId,
		batchId: id,
		priorWorldHeadHash: input.priorWorldHeadHash,
		firstSequence: input.nextSequence,
		eventHashes: [event.eventHash],
		payloadFingerprint: input.command.payloadFingerprint,
		resultRevision: postState.revision,
		finalStateHash,
	});
	const header: WorldBatchHeader = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		runId: input.runId,
		regionId: input.regionId,
		batchId: id,
		priorWorldHeadHash: input.priorWorldHeadHash,
		firstSequence: input.nextSequence,
		eventCount: 1,
		eventHashes: [event.eventHash],
		payloadFingerprint: input.command.payloadFingerprint,
		resultRevision: postState.revision,
		finalStateHash,
		batchHash: digest,
	};
	return {
		accepted: true,
		duplicate: false,
		priorState: input.state,
		postState,
		priorStateHash,
		finalStateHash,
		priorWorldHeadHash: input.priorWorldHeadHash,
		resultingWorldHeadHash: digest,
		events: [event],
		batchHeader: header,
		receipt: receipt(
			input.state,
			input.command,
			digest,
			input.fencingToken,
			"accepted",
			null,
			[event],
			postState.revision,
		),
	};
}

export async function replayCivilizationSponsorEvents(input: {
	readonly snapshotState: CivilizationState;
	readonly snapshotStateHash: string;
	readonly runId: string;
	readonly regionId: string;
	readonly nextSequence: number;
	readonly events: readonly CivilizationSponsorEventEnvelope[];
}): Promise<{ readonly state: CivilizationState; readonly stateHash: string }> {
	assertCivilizationInvariants(input.snapshotState);
	let current = input.snapshotState;
	let currentHash = await stateHash(current);
	if (currentHash !== input.snapshotStateHash)
		throw new Error("snapshot state hash mismatch");
	const known = new Set(current.provenance.map(({ eventId }) => eventId));
	let sequence = input.nextSequence;
	for (const [index, event] of input.events.entries()) {
		const { eventHash: digest, ...withoutHash } = event;
		if (
			event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
			event.engineVersion !== ENGINE_VERSION ||
			event.runId !== input.runId ||
			event.regionId !== input.regionId ||
			event.sequence !== sequence ||
			event.preStateHash !== currentHash ||
			known.has(event.eventId) ||
			!validEventProvenance(event) ||
			event.causalParents.some(
				(parent) =>
					!known.has(parent.eventId) || !identifier(parent.mechanismId),
			)
		)
			throw new Error("invalid sponsor event chain");
		if ((await eventHash(withoutHash)) !== digest)
			throw new Error("sponsor event hash mismatch");
		current = applyPayload(
			current,
			event.eventPayload,
			event,
			input.events[index + 1]?.batchId !== event.batchId,
		);
		currentHash = await stateHash(current);
		if (currentHash !== event.postStateHash)
			throw new Error("sponsor event post-state hash mismatch");
		known.add(event.eventId);
		sequence += 1;
	}
	return { state: current, stateHash: currentHash };
}
