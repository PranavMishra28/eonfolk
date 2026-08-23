import { validateIntentProposal } from "@eonfolk/cognition";
import {
	type CausalParent,
	type CommandReceipt,
	type CommandRejectionCode,
	type DecisionContext,
	batchHash as deriveBatchHash,
	batchId as deriveBatchId,
	eventHash as deriveEventHash,
	payloadFingerprint as derivePayloadFingerprint,
	ENGINE_VERSION,
	type IntentProposal,
	jcs,
	PROTOCOL_SCHEMA_VERSION,
	type SponsorshipEstablishedPayload,
	stateHash,
	type WorldBatchHeader,
	type WorldCommand,
	type WorldCommandPayload,
	type WorldEventEnvelope,
	type WorldEventPayload,
} from "@eonfolk/protocol";

import { assertCivilizationInvariants } from "./audit.js";
import { deepFreeze } from "./state.js";
import type {
	CivilizationCitizenState,
	CivilizationRelationshipState,
	CivilizationState,
} from "./types.js";

export const CIVILIZATION_SPONSOR_MECHANISM_VERSION =
	"eonfolk-civilization-sponsor-v1" as const;

type SponsorCommandPayload = Extract<
	WorldCommandPayload,
	{ readonly kind: "IssueCounsel" | "ResolveCounsel" }
>;

export type CivilizationSponsorEventPayload =
	| SponsorshipEstablishedPayload
	| Extract<
			WorldEventPayload,
			{
				readonly kind:
					| "CounselIssued"
					| "CounselInterpreted"
					| "BeliefChanged"
					| "StatementMade"
					| "RelationshipChanged";
			}
	  >;

export type CivilizationAuthorityEventPayload =
	| WorldEventPayload
	| SponsorshipEstablishedPayload;

export type CivilizationAuthorityEventEnvelope =
	WorldEventEnvelope<CivilizationAuthorityEventPayload>;

export type CivilizationSponsorEventEnvelope =
	WorldEventEnvelope<CivilizationSponsorEventPayload>;

export interface ValidatedStandardBrainResolution {
	readonly decisionId: string;
	readonly context: DecisionContext;
	readonly proposal: IntentProposal;
}

export interface CivilizationSponsorTransitionInput {
	readonly state: CivilizationState;
	readonly runId: string;
	readonly regionId: string;
	readonly priorWorldHeadHash: string;
	readonly fencingToken: number;
	readonly command: WorldCommand<SponsorCommandPayload>;
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

interface PendingSponsorEvent {
	readonly payload: CivilizationSponsorEventPayload;
	readonly visibility: CivilizationSponsorEventEnvelope["visibility"];
	readonly externalParents: readonly CausalParent[];
	readonly parentIndexes: readonly {
		readonly index: number;
		readonly relation: CausalParent["relation"];
		readonly mechanismId: string;
	}[];
}

const hashPattern = /^[0-9a-f]{64}$/u;

function isIdentifier(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length >= 1 &&
		value.length <= 160 &&
		!/\p{Cc}/u.test(value)
	);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) >= 0;
}

function hasExactKeys(value: object, expected: readonly string[]): boolean {
	const actual = Object.keys(value).sort();
	const sorted = [...expected].sort();
	return (
		actual.length === sorted.length &&
		actual.every((key, index) => key === sorted[index])
	);
}

function samePrincipal(
	left: WorldCommand["principal"],
	right: WorldCommand["principal"],
): boolean {
	return jcs(left) === jcs(right);
}

function citizen(
	state: CivilizationState,
	citizenId: string,
): CivilizationCitizenState | null {
	return state.citizens[citizenId] ?? null;
}

function localResident(
	state: CivilizationState,
	citizenId: string,
	settlementId: string,
): CivilizationCitizenState | null {
	const value = citizen(state, citizenId);
	return value?.residenceState === "resident" &&
		value.settlementId === settlementId
		? value
		: null;
}

function appendUnique(
	values: readonly string[],
	value: string,
): readonly string[] {
	return values.includes(value) ? values : [...values, value];
}

function clampBasisPoints(value: number): number {
	return Math.max(0, Math.min(10_000, value));
}

function applySponsorPayload(
	state: CivilizationState,
	payload: CivilizationSponsorEventPayload,
	eventId: string,
	causalParents: readonly CausalParent[],
	finalInBatch: boolean,
): CivilizationState {
	let citizens = state.citizens;
	let relationships = state.relationships;
	const updateCitizen = (citizenId: string): void => {
		const current = citizen(state, citizenId);
		if (current === null) throw new Error("ACTION_UNAVAILABLE");
		citizens = {
			...citizens,
			[citizenId]: {
				...current,
				sourceEventIds: appendUnique(current.sourceEventIds, eventId),
			},
		};
	};
	let mechanismId: string;
	switch (payload.kind) {
		case "SponsorshipEstablished": {
			const sponsored = citizen(state, payload.citizenId);
			if (
				sponsored === null ||
				sponsored.residenceState !== "resident" ||
				sponsored.settlementId !== payload.settlementId ||
				!isIdentifier(payload.patronPrincipalId)
			)
				throw new Error("ACTION_UNAVAILABLE");
			updateCitizen(payload.citizenId);
			mechanismId = "sponsor.covenant.established.v1";
			break;
		}
		case "CounselIssued":
			if (
				!isIdentifier(payload.interventionId) ||
				(payload.intent !== "verify-reserve" &&
					payload.intent !== "accuse-publicly")
			)
				throw new Error("INVALID_COMMAND");
			updateCitizen(payload.citizenId);
			mechanismId = "sponsor.counsel.issued.v1";
			break;
		case "CounselInterpreted":
			if (
				payload.interventionId === null ||
				!isIdentifier(payload.interventionId) ||
				!isIdentifier(payload.planId) ||
				!["verify-reserve", "accuse-publicly", "follow-plan"].includes(
					payload.action,
				) ||
				!["accepted", "rejected", "reinterpreted"].includes(payload.disposition)
			)
				throw new Error("INVALID_COMMAND");
			updateCitizen(payload.citizenId);
			mechanismId = "brain.counsel.interpreted.v1";
			break;
		case "BeliefChanged":
			if (
				!isIdentifier(payload.beliefId) ||
				!Number.isSafeInteger(payload.confidence) ||
				payload.confidence < 0 ||
				payload.confidence > 10_000 ||
				payload.proposition.length === 0 ||
				payload.proposition.length > 512 ||
				payload.sourceEventIds.some(
					(sourceEventId) =>
						!causalParents.some(
							({ eventId: parentId }) => parentId === sourceEventId,
						),
				)
			)
				throw new Error("INVALID_COMMAND");
			updateCitizen(payload.citizenId);
			mechanismId = "epistemics.belief.recorded.v1";
			break;
		case "StatementMade": {
			const speaker = citizen(state, payload.speakerId);
			const recipients = payload.recipientIds.map((recipientId) =>
				localResident(state, recipientId, speaker?.settlementId ?? ""),
			);
			if (
				speaker === null ||
				speaker.residenceState !== "resident" ||
				payload.allegation !== true ||
				payload.proposition.length === 0 ||
				payload.proposition.length > 512 ||
				new Set(payload.recipientIds).size !== payload.recipientIds.length ||
				payload.recipientIds.includes(payload.speakerId) ||
				recipients.some((recipient) => recipient === null)
			)
				throw new Error("ACTION_UNAVAILABLE");
			updateCitizen(payload.speakerId);
			mechanismId = "communication.statement.recorded.v1";
			break;
		}
		case "RelationshipChanged": {
			const relationship = Object.values(state.relationships).find(
				(candidate) =>
					candidate.fromCitizenId === payload.fromCitizenId &&
					candidate.toCitizenId === payload.toCitizenId,
			);
			if (
				relationship === undefined ||
				!Number.isSafeInteger(payload.trustDelta) ||
				!Number.isSafeInteger(payload.strainDelta) ||
				Math.abs(payload.trustDelta) > 1_500 ||
				Math.abs(payload.strainDelta) > 1_500 ||
				relationship.trustBasisPoints + payload.trustDelta < 0 ||
				relationship.trustBasisPoints + payload.trustDelta > 10_000 ||
				relationship.strainBasisPoints + payload.strainDelta < 0 ||
				relationship.strainBasisPoints + payload.strainDelta > 10_000
			)
				throw new Error("ACTION_UNAVAILABLE");
			const updated: CivilizationRelationshipState = {
				...relationship,
				trustBasisPoints: clampBasisPoints(
					relationship.trustBasisPoints + payload.trustDelta,
				),
				strainBasisPoints: clampBasisPoints(
					relationship.strainBasisPoints + payload.strainDelta,
				),
				lastInteractionSimulationTime: state.simulationTime,
				sourceEventIds: appendUnique(relationship.sourceEventIds, eventId),
			};
			relationships = {
				...relationships,
				[relationship.relationshipId]: updated,
			};
			mechanismId = "relationships.bounded-update.v1";
			break;
		}
	}
	const next = deepFreeze({
		...state,
		revision: finalInBatch ? state.revision + 1 : state.revision,
		citizens,
		relationships,
		provenance: [
			...state.provenance,
			{
				eventId,
				mechanismId,
				causeEventIds: causalParents.map(({ eventId: parentId }) => parentId),
				actorVisibleSourceEventIds: causalParents.map(
					({ eventId: parentId }) => parentId,
				),
				// This reducer accepts Standard Brain resolutions only. A decision ID is
				// retained in the envelope, while the model-only provenance field stays null.
				modelDecisionId: null,
			},
		],
	});
	assertCivilizationInvariants(next);
	return next;
}

function commandShapeIsValid(
	command: WorldCommand<SponsorCommandPayload>,
): boolean {
	if (
		!hasExactKeys(command, [
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
		!isIdentifier(command.commandId) ||
		!hashPattern.test(command.payloadFingerprint) ||
		!isNonNegativeSafeInteger(command.expectedRevision) ||
		!isIdentifier(command.runId) ||
		!isIdentifier(command.regionId)
	)
		return false;
	const payload = command.payload;
	if (
		!isIdentifier(payload.citizenId) ||
		!isIdentifier(command.principal.principalId)
	)
		return false;
	if (payload.kind === "IssueCounsel")
		return (
			hasExactKeys(payload, [
				"kind",
				"interventionId",
				"citizenId",
				"intent",
			]) &&
			command.principal.kind === "patron" &&
			hasExactKeys(command.principal, [
				"kind",
				"principalId",
				"beneficiaryCitizenId",
			]) &&
			isIdentifier(payload.interventionId) &&
			(payload.intent === "verify-reserve" ||
				payload.intent === "accuse-publicly")
		);
	return (
		hasExactKeys(payload, [
			"kind",
			"citizenId",
			"interventionId",
			"decisionId",
			"proposalId",
			"action",
		]) &&
		command.principal.kind === "citizen" &&
		hasExactKeys(command.principal, ["kind", "principalId"]) &&
		(payload.interventionId === null || isIdentifier(payload.interventionId)) &&
		isIdentifier(payload.decisionId) &&
		isIdentifier(payload.proposalId) &&
		["verify-reserve", "accuse-publicly", "follow-plan"].includes(
			payload.action,
		)
	);
}

async function historyIsValid(
	history: readonly CivilizationAuthorityEventEnvelope[],
	runId: string,
	regionId: string,
): Promise<boolean> {
	let priorSequence = -1;
	const eventIds = new Set<string>();
	for (const event of history) {
		if (
			event.runId !== runId ||
			event.regionId !== regionId ||
			event.sequence !== priorSequence + 1 ||
			eventIds.has(event.eventId)
		)
			return false;
		const { eventHash, ...withoutHash } = event;
		if (
			!hashPattern.test(eventHash) ||
			(await deriveEventHash(withoutHash)) !== eventHash ||
			event.causalParents.some(
				(parent) =>
					!eventIds.has(parent.eventId) || !isIdentifier(parent.mechanismId),
			)
		)
			return false;
		priorSequence = event.sequence;
		eventIds.add(event.eventId);
	}
	return true;
}

function eventProvenanceIsValid(
	event: CivilizationSponsorEventEnvelope,
): boolean {
	const patronEvent =
		event.eventPayload.kind === "SponsorshipEstablished" ||
		event.eventPayload.kind === "CounselIssued";
	if (patronEvent)
		return (
			event.provenance.kind === "patron-intervention" &&
			isIdentifier(event.provenance.commandId) &&
			isIdentifier(event.provenance.interventionId)
		);
	return (
		event.provenance.kind === "cognition" &&
		isIdentifier(event.provenance.commandId) &&
		isIdentifier(event.provenance.interventionId) &&
		isIdentifier(event.provenance.decisionId) &&
		isIdentifier(event.provenance.proposalId)
	);
}

function receiptFor(
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

async function rejected(
	input: CivilizationSponsorTransitionInput,
	priorStateHash: string,
	code: CommandRejectionCode,
): Promise<CivilizationSponsorTransition> {
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
		receipt: receiptFor(
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

function sponsorshipsFor(
	history: readonly CivilizationAuthorityEventEnvelope[],
	citizenId: string,
): readonly WorldEventEnvelope<SponsorshipEstablishedPayload>[] {
	return history.filter(
		(event): event is WorldEventEnvelope<SponsorshipEstablishedPayload> =>
			event.eventPayload.kind === "SponsorshipEstablished" &&
			event.eventPayload.citizenId === citizenId,
	);
}

function counselFor(
	history: readonly CivilizationAuthorityEventEnvelope[],
	interventionId: string,
): WorldEventEnvelope<
	Extract<WorldEventPayload, { readonly kind: "CounselIssued" }>
> | null {
	return (
		history.find(
			(
				event,
			): event is WorldEventEnvelope<
				Extract<WorldEventPayload, { readonly kind: "CounselIssued" }>
			> =>
				event.eventPayload.kind === "CounselIssued" &&
				event.eventPayload.interventionId === interventionId,
		) ?? null
	);
}

function resolveAction(
	state: CivilizationState,
	command: Pick<
		WorldCommand<Extract<SponsorCommandPayload, { kind: "ResolveCounsel" }>>,
		"payload" | "runId" | "regionId"
	>,
	resolution: ValidatedStandardBrainResolution,
): {
	readonly targetCitizenId: string | null;
	readonly planId: string;
	readonly relationship: CivilizationRelationshipState | null;
} | null {
	const actor = localResident(
		state,
		command.payload.citizenId,
		state.citizens[command.payload.citizenId]?.settlementId ?? "",
	);
	if (
		actor === null ||
		resolution.decisionId !== command.payload.decisionId ||
		resolution.context.actorId !== actor.citizenId ||
		resolution.context.runId !== command.runId ||
		resolution.context.regionId !== command.regionId ||
		resolution.context.revision !== state.revision ||
		resolution.context.decisionReason !== "sponsor-counsel" ||
		resolution.proposal.actorId !== actor.citizenId ||
		resolution.proposal.proposalId !== command.payload.proposalId ||
		resolution.proposal.provenance.cognitionKind !== "standard-brain"
	)
		return null;
	const action = resolution.proposal.action;
	if (action.kind === "FollowStandingPlan") {
		return command.payload.action === "follow-plan" &&
			action.planId === resolution.context.activeStandingPlan.planId
			? { targetCitizenId: null, planId: action.planId, relationship: null }
			: null;
	}
	if (action.kind !== "VerifyReserve" && action.kind !== "AccusePublicly")
		return null;
	if (
		(action.kind === "VerifyReserve" &&
			command.payload.action !== "verify-reserve") ||
		(action.kind === "AccusePublicly" &&
			command.payload.action !== "accuse-publicly")
	)
		return null;
	const target = localResident(
		state,
		action.targetCitizenId,
		actor.settlementId,
	);
	if (target === null || target.citizenId === actor.citizenId) return null;
	const relationship =
		Object.values(state.relationships).find(
			(candidate) =>
				candidate.fromCitizenId === actor.citizenId &&
				candidate.toCitizenId === target.citizenId,
		) ?? null;
	if (action.kind === "AccusePublicly" && relationship === null) return null;
	return {
		targetCitizenId: target.citizenId,
		planId: resolution.context.activeStandingPlan.planId,
		relationship,
	};
}

async function pendingEvents(
	input: CivilizationSponsorTransitionInput,
): Promise<readonly PendingSponsorEvent[] | CommandRejectionCode> {
	const { state, command, authoritativeHistory: history } = input;
	const actor = citizen(state, command.payload.citizenId);
	if (actor === null || actor.residenceState !== "resident")
		return "ACTION_UNAVAILABLE";
	if (command.payload.kind === "IssueCounsel") {
		if (
			command.principal.kind !== "patron" ||
			command.principal.beneficiaryCitizenId !== actor.citizenId
		)
			return "INVALID_PRINCIPAL";
		if (
			history.some(
				(event) =>
					event.eventPayload.kind === "CounselIssued" &&
					event.eventPayload.interventionId === command.payload.interventionId,
			)
		)
			return "NO_OP";
		const sponsorships = sponsorshipsFor(history, actor.citizenId);
		if (
			sponsorships.some(
				(event) =>
					!eventProvenanceIsValid(event) ||
					event.eventPayload.settlementId !== actor.settlementId,
			)
		)
			return "INVALID_COMMAND";
		if (
			sponsorships.some(
				(event) =>
					event.eventPayload.patronPrincipalId !==
					command.principal.principalId,
			)
		)
			return "INVALID_PRINCIPAL";
		const established = sponsorships.find(
			(event) =>
				event.eventPayload.patronPrincipalId === command.principal.principalId,
		);
		if (
			established !== undefined &&
			!actor.sourceEventIds.includes(established.eventId)
		)
			return "INVALID_COMMAND";
		const events: PendingSponsorEvent[] = [];
		if (established === undefined) {
			events.push({
				payload: {
					kind: "SponsorshipEstablished",
					patronPrincipalId: command.principal.principalId,
					citizenId: actor.citizenId,
					settlementId: actor.settlementId,
				},
				visibility: { kind: "public" },
				externalParents: [],
				parentIndexes: [],
			});
		}
		events.push({
			payload: {
				kind: "CounselIssued",
				interventionId: command.payload.interventionId,
				citizenId: actor.citizenId,
				intent: command.payload.intent,
			},
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: actor.citizenId,
			},
			externalParents:
				established === undefined
					? []
					: [
							{
								eventId: established.eventId,
								relation: "direct",
								mechanismId: "sponsor.covenant.authorizes-counsel.v1",
							},
						],
			parentIndexes:
				established === undefined
					? [
							{
								index: 0,
								relation: "direct",
								mechanismId: "sponsor.covenant.authorizes-counsel.v1",
							},
						]
					: [],
		});
		return events;
	}
	if (
		command.principal.kind !== "citizen" ||
		command.principal.principalId !== actor.citizenId
	)
		return "INVALID_PRINCIPAL";
	if (command.payload.interventionId === null) return "ACTION_UNAVAILABLE";
	const counsel = counselFor(history, command.payload.interventionId);
	const sponsorParent =
		counsel?.causalParents.find(
			(parent) =>
				parent.relation === "direct" &&
				parent.mechanismId === "sponsor.covenant.authorizes-counsel.v1",
		) ?? null;
	const sponsorEvent =
		sponsorParent === null
			? null
			: (sponsorshipsFor(history, actor.citizenId).find(
					(event) => event.eventId === sponsorParent.eventId,
				) ?? null);
	if (
		counsel === null ||
		!eventProvenanceIsValid(counsel) ||
		sponsorEvent === null ||
		!eventProvenanceIsValid(sponsorEvent) ||
		counsel.eventPayload.citizenId !== actor.citizenId ||
		!actor.sourceEventIds.includes(counsel.eventId) ||
		history.some(
			(event) =>
				event.eventPayload.kind === "CounselInterpreted" &&
				event.eventPayload.interventionId === command.payload.interventionId,
		)
	)
		return "ACTION_UNAVAILABLE";
	if (input.resolution === undefined) return "ACTION_UNAVAILABLE";
	if (
		(await validateIntentProposal(
			input.resolution.context,
			input.resolution.proposal,
		)) !== "accepted"
	)
		return "ACTION_UNAVAILABLE";
	const resolved = resolveAction(
		state,
		{
			payload: command.payload,
			runId: command.runId,
			regionId: command.regionId,
		},
		input.resolution,
	);
	if (resolved === null) return "ACTION_UNAVAILABLE";
	const disposition =
		command.payload.action === "follow-plan"
			? "rejected"
			: command.payload.action === counsel.eventPayload.intent
				? "accepted"
				: "reinterpreted";
	const events: PendingSponsorEvent[] = [
		{
			payload: {
				kind: "CounselInterpreted",
				citizenId: actor.citizenId,
				interventionId: command.payload.interventionId,
				action: command.payload.action,
				disposition,
				planId: resolved.planId,
			},
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: actor.citizenId,
			},
			externalParents: [
				{
					eventId: counsel.eventId,
					relation: "trigger",
					mechanismId: "counsel.considered-at-decision-boundary.v1",
				},
			],
			parentIndexes: [],
		},
	];
	if (command.payload.action === "verify-reserve") {
		events.push({
			payload: {
				kind: "BeliefChanged",
				citizenId: actor.citizenId,
				beliefId: `belief:${command.payload.interventionId}:reserve-check`,
				proposition: `Reserve claim involving ${resolved.targetCitizenId} remains unverified pending direct inspection.`,
				confidence: 6_000,
				sourceEventIds: [],
			},
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: actor.citizenId,
			},
			externalParents: [],
			parentIndexes: [
				{
					index: 0,
					relation: "direct",
					mechanismId: "reserve.claim-inspection-requested.v1",
				},
			],
		});
		if (resolved.relationship !== null) {
			const trustDelta = Math.min(
				500,
				10_000 - resolved.relationship.trustBasisPoints,
			);
			const strainDelta = -Math.min(
				300,
				resolved.relationship.strainBasisPoints,
			);
			if (trustDelta !== 0 || strainDelta !== 0)
				events.push({
					payload: {
						kind: "RelationshipChanged",
						fromCitizenId: actor.citizenId,
						toCitizenId: resolved.targetCitizenId!,
						trustDelta,
						strainDelta,
						reasonCode: "reserve-verification-restraint",
					},
					visibility: {
						kind: "patron-visible-through-covenant",
						subjectCitizenId: actor.citizenId,
					},
					externalParents: [],
					parentIndexes: [
						{
							index: 1,
							relation: "direct",
							mechanismId: "restraint.preserves-relationship.v1",
						},
					],
				});
		}
	} else if (command.payload.action === "accuse-publicly") {
		const recipients = Object.values(state.citizens)
			.filter(
				(candidate) =>
					candidate.residenceState === "resident" &&
					candidate.settlementId === actor.settlementId &&
					candidate.citizenId !== actor.citizenId,
			)
			.map(({ citizenId }) => citizenId)
			.sort();
		events.push(
			{
				payload: {
					kind: "StatementMade",
					speakerId: actor.citizenId,
					recipientIds: recipients,
					proposition: `${resolved.targetCitizenId} may have concealed reserve information.`,
					allegation: true,
				},
				visibility: { kind: "public" },
				externalParents: [],
				parentIndexes: [
					{
						index: 0,
						relation: "direct",
						mechanismId: "counsel.public-allegation-selected.v1",
					},
				],
			},
			{
				payload: {
					kind: "RelationshipChanged",
					fromCitizenId: actor.citizenId,
					toCitizenId: resolved.targetCitizenId!,
					trustDelta: -Math.min(1_500, resolved.relationship!.trustBasisPoints),
					strainDelta: Math.min(
						1_500,
						10_000 - resolved.relationship!.strainBasisPoints,
					),
					reasonCode: "public-allegation",
				},
				visibility: {
					kind: "patron-visible-through-covenant",
					subjectCitizenId: actor.citizenId,
				},
				externalParents: [],
				parentIndexes: [
					{
						index: 1,
						relation: "direct",
						mechanismId: "public-allegation.strains-relationship.v1",
					},
				],
			},
		);
	}
	return events;
}

export async function prepareCivilizationSponsorTransition(
	input: CivilizationSponsorTransitionInput,
): Promise<CivilizationSponsorTransition> {
	assertCivilizationInvariants(input.state);
	const priorStateHash = await stateHash(input.state);
	if (
		!isIdentifier(input.runId) ||
		!isIdentifier(input.regionId) ||
		!hashPattern.test(input.priorWorldHeadHash) ||
		!isNonNegativeSafeInteger(input.fencingToken) ||
		!(await historyIsValid(
			input.authoritativeHistory,
			input.runId,
			input.regionId,
		))
	)
		return rejected(input, priorStateHash, "INVALID_COMMAND");
	if (
		input.command.runId !== input.runId ||
		input.command.regionId !== input.regionId
	)
		return rejected(input, priorStateHash, "RUN_REGION_MISMATCH");
	if (!commandShapeIsValid(input.command))
		return rejected(input, priorStateHash, "INVALID_COMMAND");
	const actualFingerprint = await derivePayloadFingerprint(
		input.command.payload,
	);
	if (actualFingerprint !== input.command.payloadFingerprint)
		return rejected(input, priorStateHash, "BAD_FINGERPRINT");
	const priorReceipt = input.priorReceipts?.find(
		(receipt) => receipt.commandId === input.command.commandId,
	);
	if (priorReceipt !== undefined) {
		if (
			priorReceipt.runId !== input.runId ||
			priorReceipt.regionId !== input.regionId ||
			priorReceipt.payloadFingerprint !== input.command.payloadFingerprint ||
			priorReceipt.expectedRevision !== input.command.expectedRevision ||
			!samePrincipal(priorReceipt.principal, input.command.principal) ||
			input.priorWorldHeadHash !== priorReceipt.resultingWorldHeadHash
		)
			return rejected(input, priorStateHash, "INVALID_COMMAND");
		return {
			accepted: priorReceipt.outcome === "accepted",
			duplicate: true,
			priorState: input.state,
			postState: input.state,
			priorStateHash,
			finalStateHash: priorStateHash,
			priorWorldHeadHash: input.priorWorldHeadHash,
			resultingWorldHeadHash: priorReceipt.resultingWorldHeadHash,
			events: [],
			batchHeader: null,
			receipt: priorReceipt,
		};
	}
	if (
		input.authoritativeHistory.some(
			(event) => event.provenance.commandId === input.command.commandId,
		)
	)
		return rejected(input, priorStateHash, "INVALID_COMMAND");
	if (input.command.expectedRevision !== input.state.revision)
		return rejected(input, priorStateHash, "STALE_REVISION");
	const specifications = await pendingEvents(input);
	if (typeof specifications === "string")
		return rejected(input, priorStateHash, specifications);
	if (specifications.length === 0)
		return rejected(input, priorStateHash, "NO_OP");
	const derivedBatchId = await deriveBatchId(
		input.runId,
		input.regionId,
		input.state.revision,
		input.command.commandId,
	);
	let current = input.state;
	let preHash = priorStateHash;
	const events: CivilizationSponsorEventEnvelope[] = [];
	const firstSequence = (input.authoritativeHistory.at(-1)?.sequence ?? -1) + 1;
	for (const [index, specification] of specifications.entries()) {
		const eventId = `event:${derivedBatchId}:${String(index)}`;
		const causalParents = [
			...specification.externalParents,
			...specification.parentIndexes.map((parent) => {
				if (parent.index >= index)
					throw new Error("invalid causal parent index");
				return {
					eventId: `event:${derivedBatchId}:${String(parent.index)}`,
					relation: parent.relation,
					mechanismId: parent.mechanismId,
				};
			}),
		];
		const finalInBatch = index === specifications.length - 1;
		const provenance: CivilizationSponsorEventEnvelope["provenance"] =
			input.command.payload.kind === "IssueCounsel"
				? {
						kind: "patron-intervention",
						commandId: input.command.commandId,
						interventionId: input.command.payload.interventionId,
					}
				: {
						kind: "cognition",
						commandId: input.command.commandId,
						interventionId: input.command.payload.interventionId!,
						decisionId: input.command.payload.decisionId,
						proposalId: input.command.payload.proposalId,
					};
		const eventPayload: CivilizationSponsorEventPayload =
			specification.payload.kind === "BeliefChanged"
				? {
						...specification.payload,
						sourceEventIds: causalParents.map(
							({ eventId: parentEventId }) => parentEventId,
						),
					}
				: specification.payload;
		const postState = applySponsorPayload(
			current,
			eventPayload,
			eventId,
			causalParents,
			finalInBatch,
		);
		const postHash = await stateHash(postState);
		const withoutHash = {
			schemaVersion: PROTOCOL_SCHEMA_VERSION,
			engineVersion: ENGINE_VERSION,
			eventId,
			runId: input.runId,
			regionId: input.regionId,
			sequence: firstSequence + index,
			simulationTime: postState.simulationTime,
			eventPayload,
			causalParents,
			relatedEvents: [],
			visibility: specification.visibility,
			provenance,
			preStateHash: preHash,
			postStateHash: postHash,
			batchId: derivedBatchId,
		};
		const envelope: CivilizationSponsorEventEnvelope = {
			...withoutHash,
			eventHash: await deriveEventHash(withoutHash),
		};
		events.push(envelope);
		current = postState;
		preHash = postHash;
	}
	const digest = await deriveBatchHash({
		runId: input.runId,
		regionId: input.regionId,
		batchId: derivedBatchId,
		priorWorldHeadHash: input.priorWorldHeadHash,
		firstSequence,
		eventHashes: events.map(({ eventHash }) => eventHash),
		payloadFingerprint: input.command.payloadFingerprint,
		resultRevision: current.revision,
		finalStateHash: preHash,
	});
	const batchHeader: WorldBatchHeader = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		runId: input.runId,
		regionId: input.regionId,
		batchId: derivedBatchId,
		priorWorldHeadHash: input.priorWorldHeadHash,
		firstSequence,
		eventCount: events.length,
		eventHashes: events.map(({ eventHash }) => eventHash),
		payloadFingerprint: input.command.payloadFingerprint,
		resultRevision: current.revision,
		finalStateHash: preHash,
		batchHash: digest,
	};
	return {
		accepted: true,
		duplicate: false,
		priorState: input.state,
		postState: current,
		priorStateHash,
		finalStateHash: preHash,
		priorWorldHeadHash: input.priorWorldHeadHash,
		resultingWorldHeadHash: digest,
		events,
		batchHeader,
		receipt: receiptFor(
			input.state,
			input.command,
			digest,
			input.fencingToken,
			"accepted",
			null,
			events,
			current.revision,
		),
	};
}

export async function replayCivilizationSponsorEvents(input: {
	readonly snapshotState: CivilizationState;
	readonly snapshotStateHash: string;
	readonly runId: string;
	readonly regionId: string;
	readonly events: readonly CivilizationSponsorEventEnvelope[];
	readonly priorEventIds?: readonly string[];
}): Promise<{ readonly state: CivilizationState; readonly stateHash: string }> {
	let current = input.snapshotState;
	let currentHash = await stateHash(current);
	if (currentHash !== input.snapshotStateHash)
		throw new Error("snapshot state hash mismatch");
	const knownEventIds = new Set(input.priorEventIds ?? []);
	let priorSequence: number | null = null;
	for (const [index, event] of input.events.entries()) {
		if (
			event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
			event.engineVersion !== ENGINE_VERSION ||
			event.runId !== input.runId ||
			event.regionId !== input.regionId ||
			event.preStateHash !== currentHash ||
			!eventProvenanceIsValid(event) ||
			(priorSequence !== null && event.sequence !== priorSequence + 1) ||
			knownEventIds.has(event.eventId) ||
			event.causalParents.some(
				(parent) =>
					!knownEventIds.has(parent.eventId) ||
					!isIdentifier(parent.mechanismId),
			)
		)
			throw new Error("invalid sponsor event chain");
		const { eventHash, ...withoutHash } = event;
		if ((await deriveEventHash(withoutHash)) !== eventHash)
			throw new Error("sponsor event hash mismatch");
		const finalInBatch = input.events[index + 1]?.batchId !== event.batchId;
		current = applySponsorPayload(
			current,
			event.eventPayload,
			event.eventId,
			event.causalParents,
			finalInBatch,
		);
		currentHash = await stateHash(current);
		if (currentHash !== event.postStateHash)
			throw new Error("sponsor event post-state hash mismatch");
		knownEventIds.add(event.eventId);
		priorSequence = event.sequence;
	}
	return { state: current, stateHash: currentHash };
}
