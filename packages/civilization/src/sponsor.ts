import {
	advanceStandingPlan,
	buildDecisionContext,
	civilizationCounselAffordances,
	interruptStandingPlan,
	replanStandingPlan,
	retryStandingPlan,
	validateIntentProposal,
} from "@eonfolk/cognition";
import {
	batchHash,
	batchId,
	type CausalParent,
	COGNITION_VERSION,
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
import { deepFreeze, replaceCivilizationMind } from "./state.js";
import type {
	CivilizationCounselOutcomeEffect,
	CivilizationCounselState,
	CivilizationState,
} from "./types.js";

export const CIVILIZATION_SPONSOR_MECHANISM_VERSION =
	"eonfolk-civilization-sponsor-v3" as const;

type SponsorCommandPayload = Extract<
	WorldCommandPayload,
	{
		kind:
			| "EstablishSponsorship"
			| "RecordPatronAbstention"
			| "IssueCounsel"
			| "ResolveCounsel";
	}
>;
export type CivilizationSponsorEventPayload = Extract<
	WorldEventPayload,
	{
		kind:
			| "SponsorshipEstablished"
			| "PatronAbstained"
			| "CounselIssued"
			| "CounselInterpreted";
	}
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

const CIVILIZATION_DAY_SECONDS = 86_400;

/** Applies the typed Standing Plan lifecycle caused by a later counsel boundary. */
export function applyCounselStandingPlanBoundary(input: {
	readonly state: CivilizationState;
	readonly citizenId: string;
	readonly action: "verify-reserve" | "accuse-publicly" | "follow-plan";
}): CivilizationState {
	assertCivilizationInvariants(input.state);
	const mind = input.state.minds[input.citizenId];
	const plan = mind?.snapshot.standingPlan;
	const step = plan?.steps.find(({ stepId }) => stepId === plan.currentStepId);
	if (
		mind === undefined ||
		plan === undefined ||
		step === undefined ||
		plan.status !== "active" ||
		step.status !== "active"
	)
		throw new Error("ACTION_UNAVAILABLE");
	const interrupted =
		input.action === "follow-plan" ? null : interruptStandingPlan(plan);
	const advancedPlan =
		input.action === "follow-plan"
			? advanceStandingPlan(plan, step.stepId)
			: interrupted!.retriesRemaining > 0
				? retryStandingPlan(interrupted!)
				: replanStandingPlan(interrupted!, {
						...plan,
						startBoundary: input.state.simulationTime,
						expiryBoundary:
							input.state.simulationTime + CIVILIZATION_DAY_SECONDS,
					});
	// Completing the final step at the real daily scheduler boundary rolls the
	// same routine intent into its next bounded day; it does not manufacture a
	// new target or change the citizen's chosen goal.
	const nextPlan =
		advancedPlan.status === "completed"
			? {
					...advancedPlan,
					version: advancedPlan.version + 1,
					steps: advancedPlan.steps.map((candidate, index) => ({
						...candidate,
						status: index === 0 ? ("active" as const) : ("pending" as const),
					})),
					currentStepId: advancedPlan.steps[0]!.stepId,
					startBoundary: input.state.simulationTime,
					expiryBoundary: input.state.simulationTime + CIVILIZATION_DAY_SECONDS,
					retriesRemaining: 1,
					replansRemaining: 2,
					status: "active" as const,
				}
			: advancedPlan;
	const next = replaceCivilizationMind(input.state, {
		...mind,
		snapshot: { ...mind.snapshot, standingPlan: nextPlan },
		committedAtRevision: input.state.revision,
		committedAtSimulationTime: input.state.simulationTime,
	});
	assertCivilizationInvariants(next);
	return next;
}

/**
 * Applies the typed, event-derived consequence at the later counsel boundary.
 * The caller supplies a fully typed effect, but Reality re-derives every value
 * from the current state before admitting it.
 */
export function applyCivilizationCounselOutcome(input: {
	readonly state: CivilizationState;
	readonly citizenId: string;
	readonly interventionId: string;
	readonly interpretationEventId: string;
	readonly sourceEventId: string;
	readonly effect: CivilizationCounselOutcomeEffect;
}): CivilizationState {
	assertCivilizationInvariants(input.state);
	const citizen = input.state.citizens[input.citizenId];
	const mind = input.state.minds[input.citizenId];
	const counsel = input.state.counsels[input.interventionId];
	const outcomeId = `outcome:${input.interventionId}`;
	if (
		citizen === undefined ||
		mind === undefined ||
		counsel?.resolution?.sourceEventId !== input.interpretationEventId ||
		input.state.counselOutcomes[outcomeId] !== undefined ||
		!identifier(input.sourceEventId)
	)
		throw new Error("ACTION_UNAVAILABLE");
	const revision = input.state.revision + 1;
	let relationships = input.state.relationships;
	let snapshot = mind.snapshot;
	if (input.effect.kind === "reserve-inspection") {
		const expected = Object.values(input.state.stocks)
			.filter(
				(stock) =>
					counsel.resolution?.action === "verify-reserve" &&
					stock.owner.kind === "settlement" &&
					stock.owner.settlementId === citizen.settlementId,
			)
			.map((stock) => ({
				stockId: stock.stockId,
				resourceTypeId: stock.resourceTypeId,
				quantity: stock.quantity,
			}))
			.sort((left, right) => left.stockId.localeCompare(right.stockId));
		if (
			expected.length === 0 ||
			jcs(expected) !== jcs(input.effect.stockObservations) ||
			input.effect.observationRecordId !==
				`record:${input.interventionId}:reserve-inspection`
		)
			throw new Error("ACTION_UNAVAILABLE");
		snapshot = {
			...snapshot,
			records: [
				...snapshot.records,
				{
					recordId: input.effect.observationRecordId,
					kind: "observation",
					subjectCitizenId: input.citizenId,
					proposition: "I inspected the settlement reserve at this boundary.",
					confidence: 10_000,
					sourceIds: [input.sourceEventId],
					visibility: {
						kind: "citizen-private",
						subjectCitizenId: input.citizenId,
					},
					createdRevision: revision,
				},
			],
		};
	} else if (input.effect.kind === "public-allegation") {
		const relationship = input.state.relationships[input.effect.relationshipId];
		const expectedTrustDelta = -Math.min(
			250,
			relationship?.trustBasisPoints ?? 0,
		);
		const expectedStrainDelta = Math.min(
			400,
			10_000 - (relationship?.strainBasisPoints ?? 10_000),
		);
		if (
			counsel.resolution?.action !== "accuse-publicly" ||
			relationship?.fromCitizenId !== input.citizenId ||
			relationship.toCitizenId !== input.effect.targetCitizenId ||
			input.effect.statementRecordId !==
				`record:${input.interventionId}:public-allegation` ||
			input.effect.trustDeltaBasisPoints !== expectedTrustDelta ||
			input.effect.strainDeltaBasisPoints !== expectedStrainDelta
		)
			throw new Error("ACTION_UNAVAILABLE");
		const updatedRelationship = {
			...relationship,
			trustBasisPoints:
				relationship.trustBasisPoints + input.effect.trustDeltaBasisPoints,
			strainBasisPoints:
				relationship.strainBasisPoints + input.effect.strainDeltaBasisPoints,
			lastInteractionSimulationTime: input.state.simulationTime,
			sourceEventIds: appendUnique(
				relationship.sourceEventIds,
				input.sourceEventId,
			),
		};
		relationships = {
			...relationships,
			[relationship.relationshipId]: updatedRelationship,
		};
		snapshot = {
			...snapshot,
			relationships: snapshot.relationships.map((candidate) =>
				candidate.relationshipId === relationship.relationshipId
					? {
							...candidate,
							trust: updatedRelationship.trustBasisPoints,
							strain: updatedRelationship.strainBasisPoints,
							lastMaterialEventId: input.sourceEventId,
						}
					: candidate,
			),
			records: [
				...snapshot.records,
				{
					recordId: input.effect.statementRecordId,
					kind: "message-claim",
					subjectCitizenId: input.citizenId,
					proposition: `I publicly alleged misconduct by ${input.effect.targetCitizenId}.`,
					confidence: null,
					sourceIds: [input.sourceEventId],
					visibility: { kind: "public" },
					createdRevision: revision,
				},
			],
		};
	} else if (
		counsel.resolution?.action !== "follow-plan" ||
		input.effect.planId !== snapshot.standingPlan.planId
	) {
		throw new Error("ACTION_UNAVAILABLE");
	}
	const next: CivilizationState = deepFreeze({
		...input.state,
		revision,
		citizens: {
			...input.state.citizens,
			[input.citizenId]: {
				...citizen,
				sourceEventIds: appendUnique(
					citizen.sourceEventIds,
					input.sourceEventId,
				),
			},
		},
		relationships,
		minds: {
			...input.state.minds,
			[input.citizenId]: {
				...mind,
				snapshot,
				committedAtRevision: input.state.revision,
				committedAtSimulationTime: input.state.simulationTime,
			},
		},
		counselOutcomes: {
			...input.state.counselOutcomes,
			[outcomeId]: {
				schemaVersion: "eonfolk-civilization-counsel-outcome-v1" as const,
				outcomeId,
				interventionId: input.interventionId,
				citizenId: input.citizenId,
				interpretationEventId: input.interpretationEventId,
				recordedAtSimulationTime: input.state.simulationTime,
				recordedAtRevision: revision,
				sourceEventId: input.sourceEventId,
				effect: input.effect,
			},
		},
		provenance: [
			...input.state.provenance,
			{
				eventId: input.sourceEventId,
				mechanismId: "civilization.scheduler.counsel-outcome.v1",
				causeEventIds: [input.interpretationEventId],
				actorVisibleSourceEventIds: [input.interpretationEventId],
				modelDecisionId: null,
			},
		],
	});
	assertCivilizationInvariants(next);
	return next;
}

export interface CivilizationSponsorSnapshotBoundary {
	readonly schemaVersion: "eonfolk-sponsor-snapshot-boundary-v1";
	readonly snapshotId: string;
	readonly runId: string;
	readonly regionId: string;
	readonly stateHash: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly nextSequence: number;
	readonly baseWorldHeadHash: string;
	readonly boundaryHash: string;
}

export async function createCivilizationSponsorSnapshotBoundary(
	input: Omit<
		CivilizationSponsorSnapshotBoundary,
		"schemaVersion" | "boundaryHash"
	>,
): Promise<CivilizationSponsorSnapshotBoundary> {
	const withoutHash = {
		schemaVersion: "eonfolk-sponsor-snapshot-boundary-v1" as const,
		...input,
	};
	return { ...withoutHash, boundaryHash: await stateHash(withoutHash) };
}

export interface CivilizationSponsorTransitionInput {
	readonly state: CivilizationState;
	readonly runId: string;
	readonly regionId: string;
	readonly priorWorldHeadHash: string;
	readonly nextSequence: number;
	readonly snapshotBoundary: CivilizationSponsorSnapshotBoundary;
	readonly authoritativeHeaders: readonly WorldBatchHeader[];
	readonly fencingToken: number;
	readonly command: WorldCommand<SponsorCommandPayload>;
	/** Contiguous, already-applied suffix that ends at state. */
	readonly authoritativeHistory: readonly CivilizationAuthorityEventEnvelope[];
	/** Application-produced proposal and audit record; Reality reconstructs and validates all authority inputs. */
	readonly resolution?: ValidatedStandardBrainResolution | undefined;
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
	readonly committedDecisionRecord: CognitiveDecisionRecord | null;
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

function validBatchHeaderShape(header: WorldBatchHeader): boolean {
	return (
		exactKeys(header, [
			"schemaVersion",
			"runId",
			"regionId",
			"batchId",
			"priorWorldHeadHash",
			"firstSequence",
			"eventCount",
			"eventHashes",
			"payloadFingerprint",
			"resultRevision",
			"finalStateHash",
			"batchHash",
		]) &&
		header.schemaVersion === PROTOCOL_SCHEMA_VERSION &&
		identifier(header.runId) &&
		identifier(header.regionId) &&
		identifier(header.batchId) &&
		hashPattern.test(header.priorWorldHeadHash) &&
		hashPattern.test(header.payloadFingerprint) &&
		hashPattern.test(header.finalStateHash) &&
		hashPattern.test(header.batchHash) &&
		nonnegative(header.firstSequence) &&
		nonnegative(header.eventCount) &&
		nonnegative(header.resultRevision) &&
		header.eventHashes.length === header.eventCount &&
		header.eventHashes.every((digest) => hashPattern.test(digest))
	);
}

function validCommand(command: WorldCommand<SponsorCommandPayload>): boolean {
	if (
		typeof command !== "object" ||
		command === null ||
		typeof command.payload !== "object" ||
		command.payload === null ||
		typeof command.principal !== "object" ||
		command.principal === null ||
		command.provenanceRef !== undefined ||
		!exactKeys(command, [
			"schemaVersion",
			"commandId",
			"payloadFingerprint",
			"expectedRevision",
			"principal",
			"runId",
			"regionId",
			"payload",
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
	if (payload.kind === "RecordPatronAbstention")
		return (
			exactKeys(payload, ["kind", "abstentionId", "citizenId", "reason"]) &&
			identifier(payload.abstentionId) &&
			payload.reason === "withhold-counsel" &&
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
			(payload.intent === "verify-reserve" ||
				payload.intent === "accuse-publicly") &&
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
		identifier(payload.proposalId) &&
		(payload.action === "verify-reserve" ||
			payload.action === "accuse-publicly" ||
			payload.action === "follow-plan")
	);
}

/** Untrusted adapters must cross this shape boundary before invoking authority. */
export function parseCivilizationSponsorCommand(
	value: unknown,
): WorldCommand<SponsorCommandPayload> | null {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return null;
	const command = value as WorldCommand<SponsorCommandPayload>;
	return validCommand(command) ? command : null;
}

function validSponsorEnvelopeShape(
	event: WorldEventEnvelope,
	expectedSimulationTime: number,
): event is CivilizationSponsorEventEnvelope {
	const payload = event.eventPayload;
	if (
		event.simulationTime !== expectedSimulationTime ||
		!exactKeys(event, [
			"schemaVersion",
			"engineVersion",
			"eventId",
			"runId",
			"regionId",
			"sequence",
			"simulationTime",
			"eventPayload",
			"causalParents",
			"relatedEvents",
			"visibility",
			"provenance",
			"preStateHash",
			"postStateHash",
			"batchId",
			"eventHash",
		]) ||
		event.relatedEvents.length !== 0
	)
		return false;
	if (payload.kind === "SponsorshipEstablished")
		return (
			event.causalParents.length === 0 &&
			exactKeys(payload, [
				"kind",
				"covenantId",
				"patronPrincipalId",
				"citizenId",
				"settlementId",
			]) &&
			identifier(payload.covenantId) &&
			identifier(payload.patronPrincipalId) &&
			identifier(payload.citizenId) &&
			identifier(payload.settlementId) &&
			exactKeys(event.visibility, ["kind"]) &&
			event.visibility.kind === "public" &&
			exactKeys(event.provenance, ["kind", "commandId"])
		);
	if (payload.kind === "PatronAbstained")
		return (
			event.causalParents.length === 1 &&
			event.causalParents[0]?.relation === "direct" &&
			event.causalParents[0]?.mechanismId ===
				"sponsor.covenant.authorizes-abstention.v1" &&
			exactKeys(payload, ["kind", "abstentionId", "citizenId", "reason"]) &&
			identifier(payload.abstentionId) &&
			identifier(payload.citizenId) &&
			payload.reason === "withhold-counsel" &&
			exactKeys(event.visibility, ["kind", "subjectCitizenId"]) &&
			event.visibility.kind === "patron-visible-through-covenant" &&
			event.visibility.subjectCitizenId === payload.citizenId &&
			exactKeys(event.provenance, ["kind", "commandId", "interventionId"])
		);
	if (payload.kind === "CounselIssued")
		return (
			event.causalParents.length === 1 &&
			event.causalParents[0]?.relation === "direct" &&
			event.causalParents[0]?.mechanismId ===
				"sponsor.covenant.authorizes-counsel.v1" &&
			exactKeys(payload, ["kind", "interventionId", "citizenId", "intent"]) &&
			identifier(payload.interventionId) &&
			identifier(payload.citizenId) &&
			(payload.intent === "verify-reserve" ||
				payload.intent === "accuse-publicly") &&
			exactKeys(event.visibility, ["kind", "subjectCitizenId"]) &&
			event.visibility.kind === "patron-visible-through-covenant" &&
			event.visibility.subjectCitizenId === payload.citizenId &&
			exactKeys(event.provenance, ["kind", "commandId", "interventionId"])
		);
	if (payload.kind === "CounselInterpreted")
		return (
			event.causalParents.length === 1 &&
			event.causalParents[0]?.relation === "contributing" &&
			event.causalParents[0]?.mechanismId ===
				"counsel.considered-at-decision-boundary.v1" &&
			exactKeys(payload, [
				"kind",
				"citizenId",
				"interventionId",
				"action",
				"disposition",
				"planId",
			]) &&
			identifier(payload.citizenId) &&
			identifier(payload.interventionId) &&
			identifier(payload.planId) &&
			(payload.action === "verify-reserve" ||
				payload.action === "accuse-publicly" ||
				payload.action === "follow-plan") &&
			(payload.disposition === "accepted" ||
				payload.disposition === "delayed" ||
				payload.disposition === "rejected" ||
				payload.disposition === "reinterpreted") &&
			exactKeys(event.visibility, ["kind", "subjectCitizenId"]) &&
			event.visibility.kind === "patron-visible-through-covenant" &&
			event.visibility.subjectCitizenId === payload.citizenId &&
			exactKeys(event.provenance, [
				"kind",
				"commandId",
				"interventionId",
				"decisionId",
				"proposalId",
			])
		);
	return false;
}

function validEventProvenance(event: WorldEventEnvelope): boolean {
	if (event.eventPayload.kind === "SponsorshipEstablished")
		return (
			event.provenance.kind === "patron-intervention" &&
			identifier(event.provenance.commandId) &&
			event.provenance.interventionId === undefined
		);
	if (event.eventPayload.kind === "PatronAbstained")
		return (
			event.provenance.kind === "patron-intervention" &&
			identifier(event.provenance.commandId) &&
			event.provenance.interventionId === event.eventPayload.abstentionId
		);
	if (event.eventPayload.kind === "CounselIssued")
		return (
			event.provenance.kind === "patron-intervention" &&
			identifier(event.provenance.commandId) &&
			event.provenance.interventionId === event.eventPayload.interventionId
		);
	if (event.eventPayload.kind === "CounselInterpreted")
		return (
			event.provenance.kind === "cognition" &&
			identifier(event.provenance.commandId) &&
			identifier(event.provenance.decisionId) &&
			identifier(event.provenance.proposalId) &&
			event.provenance.interventionId === event.eventPayload.interventionId
		);
	return true;
}

/** Exact runtime schema and hash boundary for persisted sponsor envelopes. */
export async function parseCivilizationSponsorEvent(
	value: unknown,
	expectedSimulationTime: number,
): Promise<CivilizationSponsorEventEnvelope | null> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return null;
	const event = value as CivilizationSponsorEventEnvelope;
	if (
		!Array.isArray(event.causalParents) ||
		!Array.isArray(event.relatedEvents) ||
		event.eventPayload === null ||
		typeof event.eventPayload !== "object" ||
		event.visibility === null ||
		typeof event.visibility !== "object" ||
		event.provenance === null ||
		typeof event.provenance !== "object" ||
		event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		event.engineVersion !== ENGINE_VERSION ||
		!identifier(event.eventId) ||
		!identifier(event.runId) ||
		!identifier(event.regionId) ||
		!identifier(event.batchId) ||
		!nonnegative(event.sequence) ||
		!hashPattern.test(event.preStateHash) ||
		!hashPattern.test(event.postStateHash) ||
		!hashPattern.test(event.eventHash) ||
		!validSponsorEnvelopeShape(event, expectedSimulationTime) ||
		!validEventProvenance(event)
	)
		return null;
	const { eventHash: digest, ...withoutHash } = event;
	return (await eventHash(withoutHash)) === digest ? event : null;
}

/**
 * Applies one already-hashed sponsor event to canonical civilization state.
 * Adapters must use this derivation instead of supplying a claimed post-state.
 */
export async function applyCivilizationSponsorEvent(input: {
	readonly state: CivilizationState;
	readonly event: unknown;
}): Promise<CivilizationState> {
	assertCivilizationInvariants(input.state);
	const parsed = await parseCivilizationSponsorEvent(
		input.event,
		input.state.simulationTime,
	);
	if (parsed === null) throw new Error("invalid sponsor event schema or hash");
	const preStateHash = await stateHash(input.state);
	const known = new Set(input.state.provenance.map(({ eventId }) => eventId));
	if (
		parsed.preStateHash !== preStateHash ||
		parsed.causalParents.some(({ eventId }) => !known.has(eventId))
	)
		throw new Error("sponsor event does not continue canonical state");
	const postState = applyPayload(
		input.state,
		parsed.eventPayload,
		parsed,
		true,
	);
	if ((await stateHash(postState)) !== parsed.postStateHash)
		throw new Error("sponsor event post-state hash mismatch");
	return postState;
}

async function validHistory(
	state: CivilizationState,
	currentHash: string,
	history: readonly WorldEventEnvelope[],
	headers: readonly WorldBatchHeader[],
	boundary: CivilizationSponsorSnapshotBoundary,
	priorWorldHeadHash: string,
	runId: string,
	regionId: string,
	nextSequence: number,
): Promise<boolean> {
	const { boundaryHash, ...boundaryWithoutHash } = boundary;
	if (
		!exactKeys(boundary, [
			"schemaVersion",
			"snapshotId",
			"runId",
			"regionId",
			"stateHash",
			"revision",
			"simulationTime",
			"nextSequence",
			"baseWorldHeadHash",
			"boundaryHash",
		]) ||
		boundary.schemaVersion !== "eonfolk-sponsor-snapshot-boundary-v1" ||
		!identifier(boundary.snapshotId) ||
		boundary.runId !== runId ||
		boundary.regionId !== regionId ||
		!hashPattern.test(boundary.stateHash) ||
		!hashPattern.test(boundary.baseWorldHeadHash) ||
		!hashPattern.test(boundaryHash) ||
		(await stateHash(boundaryWithoutHash)) !== boundaryHash ||
		!nonnegative(boundary.revision) ||
		!nonnegative(boundary.simulationTime) ||
		!nonnegative(boundary.nextSequence) ||
		!nonnegative(nextSequence)
	)
		return false;
	if (history.length === 0)
		return (
			headers.length === 0 &&
			boundary.stateHash === currentHash &&
			boundary.revision === state.revision &&
			boundary.simulationTime === state.simulationTime &&
			boundary.nextSequence === nextSequence &&
			boundary.baseWorldHeadHash === priorWorldHeadHash
		);
	if (
		headers.length !== history.length ||
		boundary.stateHash !== history[0]?.preStateHash ||
		boundary.nextSequence !== history[0]?.sequence ||
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
	let worldHead = boundary.baseWorldHeadHash;
	for (const [index, event] of history.entries()) {
		const header = headers[index]!;
		const { eventHash: digest, ...withoutHash } = event;
		const expectedHead = await batchHash({
			runId,
			regionId,
			batchId: event.batchId,
			priorWorldHeadHash: worldHead,
			firstSequence: event.sequence,
			eventHashes: [digest],
			payloadFingerprint: header.payloadFingerprint,
			resultRevision: header.resultRevision,
			finalStateHash: event.postStateHash,
		});
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
			([
				"SponsorshipEstablished",
				"PatronAbstained",
				"CounselIssued",
				"CounselInterpreted",
			].includes(event.eventPayload.kind) &&
				!validSponsorEnvelopeShape(event, state.simulationTime)) ||
			!state.provenance.some(({ eventId }) => eventId === event.eventId) ||
			!validBatchHeaderShape(header) ||
			header.runId !== runId ||
			header.regionId !== regionId ||
			header.batchId !== event.batchId ||
			header.priorWorldHeadHash !== worldHead ||
			header.firstSequence !== event.sequence ||
			header.eventCount !== 1 ||
			jcs(header.eventHashes) !== jcs([digest]) ||
			header.finalStateHash !== event.postStateHash ||
			header.batchHash !== expectedHead ||
			event.causalParents.some(
				(parent) =>
					!known.has(parent.eventId) || !identifier(parent.mechanismId),
			)
		)
			return false;
		known.add(event.eventId);
		worldHead = header.batchHash;
		priorSequence = event.sequence;
		priorHash = event.postStateHash;
	}
	return (
		worldHead === priorWorldHeadHash &&
		boundary.revision + headers.length === state.revision &&
		state.simulationTime === boundary.simulationTime
	);
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
	let patronAbstentions = state.patronAbstentions;
	let counsels = state.counsels;
	let minds = state.minds;
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
	} else if (payload.kind === "PatronAbstained") {
		const covenant = Object.values(state.sponsorships).find(
			(item) => item.beneficiaryCitizenId === payload.citizenId,
		);
		if (
			covenant === undefined ||
			event.causalParents.length !== 1 ||
			event.causalParents[0]?.eventId !== covenant.sourceEventId ||
			state.patronAbstentions[payload.abstentionId] !== undefined
		)
			throw new Error("ACTION_UNAVAILABLE");
		patronAbstentions = {
			...patronAbstentions,
			[payload.abstentionId]: {
				schemaVersion: "eonfolk-civilization-patron-abstention-v1",
				abstentionId: payload.abstentionId,
				covenantId: covenant.covenantId,
				patronPrincipalId: covenant.patronPrincipalId,
				citizenId: payload.citizenId,
				reason: payload.reason,
				recordedAtSimulationTime: state.simulationTime,
				recordedAtRevision: state.revision + (finalInBatch ? 1 : 0),
				sourceEventId: event.eventId,
			},
		};
		mechanismId = "sponsor.patron.abstained.v1";
	} else if (payload.kind === "CounselIssued") {
		const covenant = Object.values(state.sponsorships).find(
			(item) => item.beneficiaryCitizenId === payload.citizenId,
		);
		if (
			covenant === undefined ||
			event.causalParents.length !== 1 ||
			event.causalParents[0]?.eventId !== covenant.sourceEventId ||
			state.counsels[payload.interventionId] !== undefined ||
			Object.values(state.counsels).some(
				(item) =>
					item.citizenId === payload.citizenId && item.resolution === null,
			)
		)
			throw new Error("ACTION_UNAVAILABLE");
		const priorMind = state.minds[payload.citizenId];
		if (priorMind === undefined) throw new Error("ACTION_UNAVAILABLE");
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
		// The authoritative fact is only that counsel was communicated. Preserve
		// its substantive claim as a typed allegation in the actor's Mind; it can
		// unlock investigation or challenge affordances without becoming Reality.
		const allegation = {
			recordId: `record:${payload.interventionId}:patron-allegation`,
			kind: "message-claim" as const,
			subjectCitizenId: payload.citizenId,
			proposition:
				payload.intent === "verify-reserve"
					? "The patron alleges that the settlement reserve warrants verification."
					: "The patron alleges that a related citizen warrants a public challenge.",
			confidence: 5_000,
			sourceIds: [event.eventId],
			visibility: {
				kind: "citizen-private" as const,
				subjectCitizenId: payload.citizenId,
			},
			createdRevision: state.revision + (finalInBatch ? 1 : 0),
		};
		minds = {
			...minds,
			[payload.citizenId]: {
				...priorMind,
				snapshot: {
					...priorMind.snapshot,
					records: [...priorMind.snapshot.records, allegation],
				},
				// Mind checkpoints are committed against the pre-transition Reality;
				// the enclosing event advances the civilization revision atomically.
				committedAtRevision: state.revision,
				committedAtSimulationTime: state.simulationTime,
			},
		};
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
			event.causalParents.length !== 1 ||
			event.causalParents[0]?.eventId !== counsel.sourceEventId ||
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
		patronAbstentions,
		minds,
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

async function validDecisionRecordBinding(input: {
	readonly record: CognitiveDecisionRecord;
	readonly context: DecisionContext;
	readonly proposal: IntentProposal;
	readonly wholePreStateHash: string;
	readonly commandId: string;
	readonly stage: "authorization" | "committed";
	readonly receiptRef: string | null;
	readonly acceptedEventInterval: CommandReceipt["eventInterval"];
}): Promise<boolean> {
	const { record, context, proposal } = input;
	const { decisionRecordHash: digest, ...withoutHash } = record;
	return (
		exactKeys(record, [
			"schemaVersion",
			"recordVersion",
			"decisionId",
			"decisionBoundaryId",
			"actorId",
			"runId",
			"regionId",
			"revision",
			"simulationTime",
			"wholePreStateHash",
			"decisionReason",
			"activeStandingPlanId",
			"activeStandingPlanVersion",
			"suppliedRecordIds",
			"readRecordIds",
			"relationshipIds",
			"valueIds",
			"commitmentIds",
			"contextHash",
			"actionCatalogHash",
			"actionCatalogVersion",
			"budgets",
			"cognitionConfigurationVersion",
			"cognitionKind",
			"provider",
			"model",
			"modelVersion",
			"promptTemplateHash",
			"proposalSchemaHash",
			"artifactHash",
			"proposalCanonicalBytes",
			"proposalHash",
			"explanation",
			"failureCode",
			"validator",
			"proposedCommandId",
			"receiptRef",
			"acceptedEventInterval",
			"rationaleTemplateId",
			"subjectCitizenId",
			"sensitivity",
			"provenance",
			"decisionRecordHash",
		]) &&
		exactKeys(record.validator, ["stage", "outcome", "reason"]) &&
		exactKeys(record.provenance, ["kind", "version"]) &&
		(await decisionRecordHash(withoutHash)) === digest &&
		record.schemaVersion === "eonfolk-cognitive-decision-record-v1" &&
		record.recordVersion === "1" &&
		identifier(record.decisionBoundaryId) &&
		record.actorId === context.actorId &&
		record.runId === context.runId &&
		record.regionId === context.regionId &&
		record.revision === context.revision &&
		record.simulationTime === context.simulationTime &&
		record.wholePreStateHash === input.wholePreStateHash &&
		record.decisionReason === context.decisionReason &&
		record.activeStandingPlanId === context.activeStandingPlan.planId &&
		record.activeStandingPlanVersion === context.activeStandingPlan.version &&
		record.contextHash === context.contextHash &&
		record.actionCatalogHash === context.catalogHash &&
		record.actionCatalogVersion === context.actionCatalogVersion &&
		jcs(record.budgets) === jcs(context.budgets) &&
		record.cognitionConfigurationVersion === COGNITION_VERSION &&
		record.proposalCanonicalBytes === jcs(proposal) &&
		record.proposalHash === proposal.proposalHash &&
		record.proposedCommandId === input.commandId &&
		record.receiptRef === input.receiptRef &&
		jcs(record.acceptedEventInterval) === jcs(input.acceptedEventInterval) &&
		record.failureCode === null &&
		record.validator.outcome === "accepted" &&
		record.validator.stage === input.stage &&
		identifier(record.validator.reason) &&
		record.cognitionKind === "standard-brain" &&
		record.provider === null &&
		record.model === null &&
		record.modelVersion === null &&
		record.promptTemplateHash === null &&
		record.proposalSchemaHash === null &&
		record.artifactHash === null &&
		record.explanation !== null &&
		jcs(record.explanation) === jcs(proposal.explanation) &&
		record.rationaleTemplateId === proposal.explanation.templateId &&
		record.subjectCitizenId === context.actorId &&
		record.sensitivity === "citizen-private-audit" &&
		jcs(record.provenance) === jcs({ kind: "cognition-audit", version: "1" }) &&
		jcs(record.suppliedRecordIds) ===
			jcs(context.visibleRecords.map(({ recordId }) => recordId)) &&
		jcs(record.readRecordIds) ===
			jcs(proposal.explanation.visibleRecordIdsRead) &&
		jcs(record.relationshipIds) ===
			jcs(proposal.explanation.relationshipIdsRead) &&
		jcs(record.valueIds) === jcs(proposal.explanation.valueIdsRead) &&
		jcs(record.commitmentIds) === jcs(proposal.explanation.commitmentIdsRead)
	);
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
	) {
		return false;
	}
	const rebuilt = await buildCivilizationCounselDecisionContext({
		state,
		runId: command.runId,
		regionId: command.regionId,
		citizenId: command.payload.citizenId,
		interventionId: counsel.interventionId,
		decisionId: command.payload.decisionId,
	});
	if (rebuilt === null || jcs(rebuilt) !== jcs(context)) {
		return false;
	}
	if (
		record.decisionId !== command.payload.decisionId ||
		!(await validDecisionRecordBinding({
			record,
			context,
			proposal,
			wholePreStateHash,
			commandId: command.commandId,
			stage: "authorization",
			receiptRef: null,
			acceptedEventInterval: null,
		}))
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

/** Revalidates the exact finalized cognition bytes stored beside a sponsor event. */
export async function validateCommittedCivilizationDecisionRecord(input: {
	readonly state: CivilizationState;
	readonly event: unknown;
	readonly commandReceipt: unknown;
	readonly decisionRecord: unknown;
}): Promise<boolean> {
	assertCivilizationInvariants(input.state);
	const event = await parseCivilizationSponsorEvent(
		input.event,
		input.state.simulationTime,
	);
	if (
		event?.eventPayload.kind !== "CounselInterpreted" ||
		event.provenance.kind !== "cognition" ||
		input.commandReceipt === null ||
		typeof input.commandReceipt !== "object" ||
		Array.isArray(input.commandReceipt) ||
		input.decisionRecord === null ||
		typeof input.decisionRecord !== "object" ||
		Array.isArray(input.decisionRecord)
	)
		return false;
	const receipt = input.commandReceipt as CommandReceipt;
	const record = input.decisionRecord as CognitiveDecisionRecord;
	const decisionId = event.provenance.decisionId;
	const proposalId = event.provenance.proposalId;
	const interventionId = event.eventPayload.interventionId;
	if (
		!identifier(decisionId) ||
		!identifier(proposalId) ||
		!identifier(interventionId)
	)
		return false;
	const payload: Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }> = {
		kind: "ResolveCounsel",
		citizenId: event.eventPayload.citizenId,
		interventionId: event.eventPayload.interventionId,
		decisionId,
		proposalId,
		action: event.eventPayload.action,
	};
	if (
		!exactKeys(receipt, [
			"schemaVersion",
			"runId",
			"regionId",
			"commandId",
			"payloadFingerprint",
			"principal",
			"expectedRevision",
			"actualRevision",
			"outcome",
			"eventInterval",
			"rejectionCode",
			"resultingRevision",
			"resultingWorldHeadHash",
			"createdSimulationTime",
			"fencingToken",
		]) ||
		receipt.schemaVersion !== "eonfolk-command-receipt-v1" ||
		receipt.runId !== event.runId ||
		receipt.regionId !== event.regionId ||
		receipt.expectedRevision !== input.state.revision ||
		receipt.actualRevision !== input.state.revision ||
		receipt.outcome !== "accepted" ||
		receipt.rejectionCode !== null ||
		receipt.resultingRevision !== input.state.revision + 1 ||
		receipt.createdSimulationTime !== input.state.simulationTime ||
		receipt.principal.kind !== "citizen" ||
		receipt.principal.principalId !== event.eventPayload.citizenId ||
		jcs(receipt.eventInterval) !==
			jcs({
				fromSequenceInclusive: event.sequence,
				toSequenceExclusive: event.sequence + 1,
				eventIds: [event.eventId],
			}) ||
		(await payloadFingerprint(payload)) !== receipt.payloadFingerprint ||
		record.decisionId !== event.provenance.decisionId
	)
		return false;
	let proposal: IntentProposal;
	try {
		proposal = JSON.parse(
			record.proposalCanonicalBytes ?? "",
		) as IntentProposal;
	} catch {
		return false;
	}
	const context = await buildCivilizationCounselDecisionContext({
		state: input.state,
		runId: event.runId,
		regionId: event.regionId,
		citizenId: event.eventPayload.citizenId,
		interventionId,
		decisionId,
	});
	if (
		context === null ||
		proposal.proposalId !== event.provenance.proposalId ||
		proposal.explanation.counselDisposition !==
			event.eventPayload.disposition ||
		(await validateIntentProposal(context, proposal)) !== "accepted"
	)
		return false;
	const action = proposal.action;
	const actionKind =
		action.kind === "VerifyReserve"
			? "verify-reserve"
			: action.kind === "AccusePublicly"
				? "accuse-publicly"
				: action.kind === "FollowStandingPlan"
					? "follow-plan"
					: null;
	return (
		actionKind === event.eventPayload.action &&
		(await validDecisionRecordBinding({
			record,
			context,
			proposal,
			wholePreStateHash: event.preStateHash,
			commandId: receipt.commandId,
			stage: "committed",
			receiptRef: receipt.commandId,
			acceptedEventInterval: receipt.eventInterval,
		}))
	);
}

/** Reality-owned visibility projection; Application may pass only this to Brain. */
export async function buildCivilizationCounselDecisionContext(input: {
	readonly state: CivilizationState;
	readonly runId: string;
	readonly regionId: string;
	readonly citizenId: string;
	readonly interventionId: string;
	readonly decisionId: string;
}): Promise<DecisionContext | null> {
	assertCivilizationInvariants(input.state);
	const counsel = input.state.counsels[input.interventionId];
	const mind = input.state.minds[input.citizenId]?.snapshot;
	const covenant = Object.values(input.state.sponsorships).find(
		(item) => item.beneficiaryCitizenId === input.citizenId,
	);
	if (
		counsel === undefined ||
		counsel.citizenId !== input.citizenId ||
		counsel.resolution !== null ||
		mind === undefined ||
		covenant === undefined
	)
		return null;
	const actor = input.state.citizens[mind.citizenId];
	const relationship = [...mind.relationships]
		.sort((left, right) =>
			left.relationshipId.localeCompare(right.relationshipId),
		)
		.find(
			(item) =>
				item.fromCitizenId === mind.citizenId &&
				input.state.citizens[item.toCitizenId]?.residenceState === "resident" &&
				input.state.citizens[item.toCitizenId]?.settlementId ===
					actor?.settlementId &&
				input.state.citizens[item.toCitizenId]?.siteId === actor?.siteId,
		);
	const targetId = relationship?.toCitizenId;
	if (
		actor === undefined ||
		targetId === undefined ||
		relationship === undefined
	)
		return null;
	const visibleRecords = mind.records.filter(
		(record) =>
			record.subjectCitizenId === mind.citizenId &&
			record.sourceIds.length > 0 &&
			record.sourceIds.every(
				(sourceId) =>
					actor.sourceEventIds.includes(sourceId) &&
					input.state.provenance.some(({ eventId }) => eventId === sourceId),
			),
	);
	const legalEvidenceRecords = visibleRecords.filter(
		(record) =>
			(record.kind === "observation" ||
				record.kind === "private-knowledge" ||
				record.kind === "message-claim") &&
			record.confidence !== null,
	);
	const independentEvidenceRecords = legalEvidenceRecords.filter(
		({ kind }) => kind !== "message-claim",
	);
	const catalog = civilizationCounselAffordances({
		targetCitizenId: targetId,
		planId: mind.standingPlan.planId,
		relationshipId: relationship.relationshipId,
		verificationRecordIds: (counsel.intent === "verify-reserve"
			? legalEvidenceRecords
			: independentEvidenceRecords
		)
			.map(({ recordId }) => recordId)
			.sort(),
		accusationRecordIds: independentEvidenceRecords
			.map(({ recordId }) => recordId)
			.sort(),
		counselIntent: counsel.intent,
		followDisposition: mind.values.some(({ valueId }) =>
			["continuity", "prudence", "reliability"].includes(valueId),
		)
			? "delayed"
			: "rejected",
	});
	return buildDecisionContext({
		contextId: `context:${input.decisionId}`,
		actorMind: { ...mind, records: visibleRecords },
		runId: input.runId,
		regionId: input.regionId,
		revision: input.state.revision,
		simulationTime: input.state.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: catalog,
		visibilityContext: {
			policyVersion: VISIBILITY_POLICY_VERSION,
			covenants: Object.values(input.state.sponsorships).map((item) => ({
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
	if (command.payload.kind === "RecordPatronAbstention") {
		if (
			command.principal.kind !== "patron" ||
			command.principal.beneficiaryCitizenId !== actor.citizenId ||
			covenant?.patronPrincipalId !== command.principal.principalId ||
			covenant.settlementId !== actor.settlementId
		)
			return "INVALID_PRINCIPAL";
		if (state.patronAbstentions[command.payload.abstentionId] !== undefined)
			return "NO_OP";
		return {
			payload: {
				kind: "PatronAbstained",
				abstentionId: command.payload.abstentionId,
				citizenId: actor.citizenId,
				reason: command.payload.reason,
			},
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: actor.citizenId,
			},
			causalParents: [
				{
					eventId: covenant.sourceEventId,
					relation: "direct",
					mechanismId: "sponsor.covenant.authorizes-abstention.v1",
				},
			],
		};
	}
	if (command.payload.kind === "IssueCounsel") {
		if (
			command.principal.kind !== "patron" ||
			command.principal.beneficiaryCitizenId !== actor.citizenId ||
			covenant?.patronPrincipalId !== command.principal.principalId ||
			covenant.settlementId !== actor.settlementId
		)
			return "INVALID_PRINCIPAL";
		if (
			state.counsels[command.payload.interventionId] !== undefined ||
			Object.values(state.counsels).some(
				(item) =>
					item.citizenId === actor.citizenId && item.resolution === null,
			)
		)
			return "NO_OP";
		if (state.minds[actor.citizenId] === undefined) return "ACTION_UNAVAILABLE";
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
	const resolveCommand = command as WorldCommand<
		Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }>
	>;
	const counsel = state.counsels[resolveCommand.payload.interventionId ?? ""];
	if (
		covenant === undefined ||
		covenant.settlementId !== actor.settlementId ||
		counsel === undefined ||
		counsel.covenantId !== covenant.covenantId ||
		counsel.citizenId !== actor.citizenId ||
		counsel.resolution !== null ||
		Object.values(state.counsels).some(
			(item) =>
				item.resolution?.decisionId === resolveCommand.payload.decisionId ||
				item.resolution?.proposalId === resolveCommand.payload.proposalId,
		) ||
		input.resolution === undefined ||
		!(await validResolution(
			state,
			resolveCommand,
			input.resolution,
			counsel,
			priorStateHash,
		))
	)
		return "ACTION_UNAVAILABLE";
	const disposition = input.resolution.proposal.explanation.counselDisposition;
	if (disposition === "not-applicable") return "ACTION_UNAVAILABLE";
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
				relation: "contributing",
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
		committedDecisionRecord: null,
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
			input.authoritativeHeaders,
			input.snapshotBoundary,
			input.priorWorldHeadHash,
			input.runId,
			input.regionId,
			input.nextSequence,
		))
	)
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (!validCommand(input.command))
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (
		input.command.runId !== input.runId ||
		input.command.regionId !== input.regionId
	)
		return reject(input, priorStateHash, "RUN_REGION_MISMATCH");
	if (
		(await payloadFingerprint(input.command.payload)) !==
		input.command.payloadFingerprint
	)
		return reject(input, priorStateHash, "BAD_FINGERPRINT");
	if (
		input.authoritativeHistory.some(
			(event) => event.provenance.commandId === input.command.commandId,
		)
	)
		return reject(input, priorStateHash, "INVALID_COMMAND");
	if (input.command.expectedRevision !== input.state.revision)
		return reject(input, priorStateHash, "STALE_REVISION");
	let trustedResolution: ValidatedStandardBrainResolution | undefined;
	if (input.command.payload.kind === "ResolveCounsel") {
		const resolveCommand = input.command as WorldCommand<
			Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }>
		>;
		const counsel =
			input.command.payload.interventionId === null
				? undefined
				: input.state.counsels[input.command.payload.interventionId];
		if (counsel === undefined)
			return reject(input, priorStateHash, "ACTION_UNAVAILABLE");
		if (
			input.resolution === undefined ||
			!(await validResolution(
				input.state,
				resolveCommand,
				input.resolution,
				counsel,
				priorStateHash,
			))
		)
			return reject(input, priorStateHash, "ACTION_UNAVAILABLE");
		trustedResolution = input.resolution;
	}
	const specification = await pending(
		trustedResolution === undefined
			? input
			: { ...input, resolution: trustedResolution },
		priorStateHash,
	);
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
						: input.command.payload.kind === "RecordPatronAbstention"
							? { interventionId: input.command.payload.abstentionId }
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
	const acceptedReceipt = receipt(
		input.state,
		input.command,
		digest,
		input.fencingToken,
		"accepted",
		null,
		[event],
		postState.revision,
	);
	let committedDecisionRecord: CognitiveDecisionRecord | null = null;
	if (
		input.command.payload.kind === "ResolveCounsel" &&
		trustedResolution !== undefined
	) {
		const { decisionRecordHash: _priorDigest, ...priorRecord } =
			trustedResolution.decisionRecord;
		const committedWithoutHash = {
			...priorRecord,
			validator: {
				stage: "committed" as const,
				outcome: "accepted" as const,
				reason: "canonical event batch committed",
			},
			receiptRef: acceptedReceipt.commandId,
			acceptedEventInterval: acceptedReceipt.eventInterval,
		};
		committedDecisionRecord = deepFreeze({
			...committedWithoutHash,
			decisionRecordHash: await decisionRecordHash(committedWithoutHash),
		});
	}
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
		committedDecisionRecord,
		receipt: acceptedReceipt,
	};
}

export async function replayCivilizationSponsorEvents(input: {
	readonly snapshotState: CivilizationState;
	readonly snapshotBoundary: CivilizationSponsorSnapshotBoundary;
	readonly headers: readonly WorldBatchHeader[];
	readonly events: readonly CivilizationSponsorEventEnvelope[];
	readonly expectedFinalWorldHeadHash: string;
}): Promise<{
	readonly state: CivilizationState;
	readonly stateHash: string;
	readonly worldHeadHash: string;
}> {
	assertCivilizationInvariants(input.snapshotState);
	let current = input.snapshotState;
	let currentHash = await stateHash(current);
	const { boundaryHash, ...boundaryWithoutHash } = input.snapshotBoundary;
	if (
		input.snapshotBoundary.schemaVersion !==
			"eonfolk-sponsor-snapshot-boundary-v1" ||
		(await stateHash(boundaryWithoutHash)) !== boundaryHash ||
		currentHash !== input.snapshotBoundary.stateHash ||
		current.revision !== input.snapshotBoundary.revision ||
		current.simulationTime !== input.snapshotBoundary.simulationTime ||
		input.headers.length !== input.events.length
	)
		throw new Error("snapshot state hash mismatch");
	const known = new Set(current.provenance.map(({ eventId }) => eventId));
	let sequence = input.snapshotBoundary.nextSequence;
	let worldHeadHash = input.snapshotBoundary.baseWorldHeadHash;
	for (const [index, event] of input.events.entries()) {
		const header = input.headers[index]!;
		const { eventHash: digest, ...withoutHash } = event;
		if (
			event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
			event.engineVersion !== ENGINE_VERSION ||
			event.runId !== input.snapshotBoundary.runId ||
			event.regionId !== input.snapshotBoundary.regionId ||
			event.sequence !== sequence ||
			event.preStateHash !== currentHash ||
			known.has(event.eventId) ||
			!validSponsorEnvelopeShape(event, current.simulationTime) ||
			!validEventProvenance(event) ||
			event.causalParents.some(
				(parent) =>
					!known.has(parent.eventId) || !identifier(parent.mechanismId),
			)
		)
			throw new Error("invalid sponsor event chain");
		if ((await eventHash(withoutHash)) !== digest)
			throw new Error("sponsor event hash mismatch");
		const expectedHead = await batchHash({
			runId: event.runId,
			regionId: event.regionId,
			batchId: event.batchId,
			priorWorldHeadHash: worldHeadHash,
			firstSequence: sequence,
			eventHashes: [digest],
			payloadFingerprint: header.payloadFingerprint,
			resultRevision: header.resultRevision,
			finalStateHash: event.postStateHash,
		});
		if (
			!validBatchHeaderShape(header) ||
			header.runId !== event.runId ||
			header.regionId !== event.regionId ||
			header.priorWorldHeadHash !== worldHeadHash ||
			header.firstSequence !== sequence ||
			header.eventCount !== 1 ||
			jcs(header.eventHashes) !== jcs([digest]) ||
			header.batchId !== event.batchId ||
			header.finalStateHash !== event.postStateHash ||
			header.resultRevision !== current.revision + 1 ||
			header.batchHash !== expectedHead
		)
			throw new Error("sponsor batch header mismatch");
		current = applyPayload(
			current,
			event.eventPayload,
			event,
			input.events[index + 1]?.batchId !== event.batchId,
		);
		currentHash = await stateHash(current);
		if (currentHash !== event.postStateHash)
			throw new Error("sponsor post-state hash mismatch");
		known.add(event.eventId);
		worldHeadHash = header.batchHash;
		sequence += 1;
	}
	if (worldHeadHash !== input.expectedFinalWorldHeadHash)
		throw new Error("final world head mismatch");
	return { state: current, stateHash: currentHash, worldHeadHash };
}
