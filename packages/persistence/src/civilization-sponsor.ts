import {
	advanceGeneralizedScheduler,
	assertCivilizationInvariants,
	deriveCivilizationSchedulerPolicy,
	projectCivilizationScheduledActivities,
	type CivilizationState,
	type SchedulerRoutineDecision,
} from "@eonfolk/civilization";
import {
	applyCivilizationSponsorEvent,
	applyCounselStandingPlanBoundary,
	parseCivilizationSponsorEvent,
	validateCommittedCivilizationDecisionRecord,
} from "@eonfolk/civilization/sponsor";
import {
	batchId as protocolBatchId,
	payloadFingerprint,
	stateHash as protocolStateHash,
	type GeneratedWorldState,
} from "@eonfolk/protocol";
import { canonicalJson, cloneValue } from "./codec.js";
import {
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
	type ReleaseGenesisCivilizationState,
} from "./civilization.js";
import { PersistenceError } from "./errors.js";
import type { JsonValue } from "./types.js";
import { createAuthorityEvent, hashAuthoritativeState } from "./versioned.js";
import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_REJECTION_SCHEMA_VERSION,
	type AuthorityHead,
	type RecordRejectedAuthorityCommandRequest,
} from "./versioned-types.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;

export interface CivilizationSponsorAuthorityAppend {
	readonly state: ReleaseGenesisCivilizationState;
	readonly request: AppendAuthorityBatchRequest;
}

export interface CivilizationSponsorRejectionAppend {
	readonly state: ReleaseGenesisCivilizationState;
	readonly request: RecordRejectedAuthorityCommandRequest;
}

export interface CivilizationCounselBoundaryFact {
	readonly schemaVersion: "eonfolk-counsel-boundary-fact-v3";
	readonly citizenId: string;
	readonly interventionId: string;
	readonly interpretationEventId: string;
	readonly interpretationAction:
		| "verify-reserve"
		| "accuse-publicly"
		| "follow-plan";
	readonly interpretationDisposition:
		| "accepted"
		| "delayed"
		| "rejected"
		| "reinterpreted";
	readonly causalRelation: "contributing-condition" | "temporal-predecessor";
	readonly routineKind: SchedulerRoutineDecision["kind"];
	readonly routineSubjectId: string;
	readonly planRoutineKind: SchedulerRoutineDecision["kind"];
	readonly planRoutineSubjectId: string;
	readonly consequenceKind: "routine-continued" | "routine-reassigned";
	readonly schedulerActionKinds: readonly string[];
	readonly simulationTime: number;
	readonly requiredNeedUnits: number;
	readonly consumedNeedUnits: number;
	readonly unmetNeedUnits: number;
	readonly sourceStockIds: readonly string[];
}

function fail(
	code: "INVALID_INPUT" | "STALE_STATE" | "UNSUPPORTED_VERSION",
	message: string,
): never {
	throw new PersistenceError(code, message);
}

function record(
	value: unknown,
	label: string,
): Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail("INVALID_INPUT", `${label} must be a record`);
	return value as Readonly<Record<string, unknown>>;
}

function string(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length < 1)
		fail("INVALID_INPUT", `${label} must be a non-empty string`);
	return value;
}

function integer(value: unknown, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0)
		fail("INVALID_INPUT", `${label} must be a non-negative safe integer`);
	return value as number;
}

function array(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) fail("INVALID_INPUT", `${label} must be an array`);
	return value;
}

function exactKeys(
	value: Readonly<Record<string, unknown>>,
	expected: readonly string[],
): boolean {
	const keys = Object.keys(value).sort();
	return (
		keys.length === expected.length &&
		keys.every((key, index) => key === [...expected].sort()[index])
	);
}

function validPrincipal(value: unknown): boolean {
	const principal = record(value, "sponsor receipt principal");
	return principal.kind === "citizen"
		? exactKeys(principal, ["kind", "principalId"]) &&
				typeof principal.principalId === "string"
		: principal.kind === "patron" &&
				exactKeys(principal, ["kind", "principalId", "beneficiaryCitizenId"]) &&
				typeof principal.principalId === "string" &&
				typeof principal.beneficiaryCitizenId === "string";
}

function validateReceipt(
	value: unknown,
	current: ReleaseGenesisCivilizationState,
	head: AuthorityHead,
): Readonly<Record<string, unknown>> {
	const receipt = record(value, "sponsor command receipt");
	const civilization = current.civilization as unknown as CivilizationState;
	integer(receipt.expectedRevision, "sponsor expectedRevision");
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
		receipt.runId !== head.runId ||
		receipt.regionId !== head.regionId ||
		typeof receipt.commandId !== "string" ||
		(receipt.commandId as string).length === 0 ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint) ||
		!validPrincipal(receipt.principal) ||
		integer(receipt.actualRevision, "sponsor actualRevision") !==
			civilization.revision ||
		integer(receipt.createdSimulationTime, "sponsor receipt time") !==
			civilization.simulationTime ||
		integer(receipt.fencingToken, "sponsor receipt fence") !==
			head.fencingToken ||
		typeof receipt.resultingWorldHeadHash !== "string" ||
		!HASH_PATTERN.test(receipt.resultingWorldHeadHash)
	)
		fail("INVALID_INPUT", "CSP");
	return receipt;
}

function json(value: unknown, label: string): JsonValue {
	try {
		canonicalJson(value as JsonValue);
	} catch {
		fail("INVALID_INPUT", `${label} is not JSON-safe`);
	}
	return cloneValue(value as JsonValue);
}

function validateState(value: ReleaseGenesisCivilizationState) {
	const state = record(value, "release civilization state");
	if (state.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_STATE_VERSION)
		fail("UNSUPPORTED_VERSION", "CSP");
	if (state.phase !== "checkpoint" && state.phase !== "active")
		fail("INVALID_INPUT", "CSP");
	if (state.civilization === null) fail("INVALID_INPUT", "CSP");
	const scheduler = record(state.scheduler, "release civilization scheduler");
	integer(scheduler.simulationTime, "release civilization simulationTime");
	return value;
}

function decisionJson(value: unknown | null): JsonValue | null {
	return value === null ? null : json(value, "sponsor decision record");
}

export async function createCivilizationSponsorRejectionAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly commandReceipt: unknown;
	readonly decisionRecord: unknown | null;
}): Promise<CivilizationSponsorRejectionAppend> {
	const current = validateState(input.state);
	if (input.decisionRecord !== null) fail("INVALID_INPUT", "CSP");
	assertCivilizationInvariants(
		current.civilization as unknown as CivilizationState,
	);
	if ((await hashAuthoritativeState(current)) !== input.head.stateHash)
		fail("STALE_STATE", "CSP");
	const receipt = validateReceipt(input.commandReceipt, current, input.head);
	if (
		receipt.outcome !== "rejected" ||
		receipt.eventInterval !== null ||
		typeof receipt.rejectionCode !== "string" ||
		receipt.resultingRevision !==
			(current.civilization as unknown as CivilizationState).revision ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint)
	)
		fail("INVALID_INPUT", "CSP");
	const appendId = string(receipt.commandId, "sponsor commandId");
	const durableReceipt = json(
		{ ...receipt, resultingWorldHeadHash: input.head.lastEventHash },
		"durable rejected sponsor receipt",
	);
	return {
		state: current,
		request: {
			schemaVersion: AUTHORITY_REJECTION_SCHEMA_VERSION,
			runId: input.head.runId,
			regionId: input.head.regionId,
			appendId,
			expectedRevision: input.head.revision,
			expectedLastSequence: input.head.lastSequence,
			expectedStateHash: input.head.stateHash,
			expectedLastEventHash: input.head.lastEventHash,
			fencingToken: input.head.fencingToken,
			commandReceipt: durableReceipt,
			decisionRecord: decisionJson(input.decisionRecord),
		},
	};
}

/** Maps one already-validated sponsor transition onto the sole civilization stream. */
export async function createCivilizationSponsorAuthorityAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly protocolEvent: unknown;
	readonly commandReceipt: unknown;
	readonly decisionRecord: unknown | null;
}): Promise<CivilizationSponsorAuthorityAppend> {
	const current = validateState(input.state);
	assertCivilizationInvariants(
		current.civilization as unknown as CivilizationState,
	);
	if (
		(await hashAuthoritativeState(current)) !== input.head.stateHash ||
		current.scheduler.simulationTime !== input.head.simulationTime
	)
		fail("STALE_STATE", "CSP");
	const protocolEvent = await parseCivilizationSponsorEvent(
		input.protocolEvent,
		current.scheduler.simulationTime,
	);
	if (protocolEvent === null) fail("INVALID_INPUT", "CSP");
	const receipt = validateReceipt(input.commandReceipt, current, input.head);
	const interval = record(
		receipt.eventInterval,
		"accepted sponsor receipt interval",
	);
	const eventId = string(protocolEvent.eventId, "sponsor eventId");
	const eventIds = array(interval.eventIds, "accepted sponsor eventIds");
	if (
		receipt.outcome !== "accepted" ||
		receipt.expectedRevision !==
			(current.civilization as unknown as CivilizationState).revision ||
		receipt.rejectionCode !== null ||
		!exactKeys(interval, [
			"fromSequenceInclusive",
			"toSequenceExclusive",
			"eventIds",
		]) ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint) ||
		eventIds.length !== 1 ||
		eventIds[0] !== eventId ||
		integer(
			interval.fromSequenceInclusive,
			"accepted sponsor interval start",
		) !== integer(protocolEvent.sequence, "sponsor sequence") ||
		integer(interval.toSequenceExclusive, "accepted sponsor interval end") !==
			(protocolEvent.sequence as number) + 1
	)
		fail("INVALID_INPUT", "CSP");
	const eventPayload = protocolEvent.eventPayload;
	const kind = eventPayload.kind;
	const provenance = protocolEvent.provenance;
	const civilization = current.civilization as unknown as CivilizationState;
	const expectedBatchId = await protocolBatchId(
		input.head.runId,
		input.head.regionId,
		civilization.revision,
		string(receipt.commandId, "sponsor commandId"),
	);
	const expectedPayload =
		kind === "SponsorshipEstablished"
			? {
					kind: "EstablishSponsorship" as const,
					covenantId: eventPayload.covenantId,
					citizenId: eventPayload.citizenId,
				}
			: kind === "CounselIssued"
				? {
						kind: "IssueCounsel" as const,
						interventionId: eventPayload.interventionId,
						citizenId: eventPayload.citizenId,
						intent: eventPayload.intent,
					}
				: {
						kind: "ResolveCounsel" as const,
						citizenId: eventPayload.citizenId,
						interventionId: eventPayload.interventionId,
						decisionId: provenance.decisionId,
						proposalId: provenance.proposalId,
						action: eventPayload.action,
					};
	const principal = record(receipt.principal, "sponsor receipt principal");
	const covenant = Object.values(civilization.sponsorships).find(
		(item) => item.beneficiaryCitizenId === eventPayload.citizenId,
	);
	const principalMatches =
		kind === "SponsorshipEstablished"
			? principal.kind === "patron" &&
				principal.principalId === eventPayload.patronPrincipalId &&
				principal.beneficiaryCitizenId === eventPayload.citizenId
			: kind === "CounselIssued"
				? principal.kind === "patron" &&
					principal.principalId === covenant?.patronPrincipalId &&
					principal.beneficiaryCitizenId === eventPayload.citizenId
				: principal.kind === "citizen" &&
					principal.principalId === eventPayload.citizenId;
	if (
		protocolEvent.runId !== input.head.runId ||
		protocolEvent.regionId !== input.head.regionId ||
		protocolEvent.sequence !== input.head.lastSequence + 1 ||
		protocolEvent.preStateHash !== (await protocolStateHash(civilization)) ||
		protocolEvent.batchId !== expectedBatchId ||
		provenance.commandId !== receipt.commandId ||
		!principalMatches ||
		(await payloadFingerprint(expectedPayload)) !== receipt.payloadFingerprint
	)
		fail("INVALID_INPUT", "CSP");
	if (provenance.kind === "cognition") {
		if (
			!(await validateCommittedCivilizationDecisionRecord({
				state: civilization,
				event: protocolEvent,
				commandReceipt: receipt,
				decisionRecord: input.decisionRecord,
			}))
		)
			fail("INVALID_INPUT", "CSP");
	} else if (input.decisionRecord !== null) {
		fail("INVALID_INPUT", "CSP");
	}
	let derivedPostCivilization: CivilizationState;
	try {
		derivedPostCivilization = await applyCivilizationSponsorEvent({
			state: civilization,
			event: protocolEvent,
		});
	} catch {
		fail("INVALID_INPUT", "CSP");
	}
	const postCivilization = json(
		derivedPostCivilization,
		"derived sponsor post civilization",
	);
	if (
		receipt.resultingRevision !==
		(postCivilization as unknown as CivilizationState).revision
	)
		fail("INVALID_INPUT", "CSP");
	const next: ReleaseGenesisCivilizationState = {
		...current,
		phase: "active",
		civilization: postCivilization,
	};
	const parents = array(protocolEvent.causalParents, "sponsor causalParents");
	const relation = (value: unknown) => {
		if (value === "direct") return "direct-cause" as const;
		if (value === "trigger") return "trigger" as const;
		if (value === "contributing") return "contributing-condition" as const;
		fail("INVALID_INPUT", "CSP");
	};
	const appendId = string(receipt.commandId, "sponsor commandId");
	const batchId = string(protocolEvent.batchId, "sponsor batchId");
	const event = await createAuthorityEvent({
		runId: input.head.runId,
		regionId: input.head.regionId,
		engineVersion: input.head.engineVersion,
		stateSchemaVersion: input.head.stateSchemaVersion,
		appendId,
		batchId,
		eventId,
		sequence: input.head.lastSequence + 1,
		simulationTime: integer(
			protocolEvent.simulationTime,
			"sponsor simulationTime",
		),
		eventType: "CivilizationSponsorCommandCommitted",
		causalParents: parents.map((value, index) => {
			const parent = record(value, `sponsor causal parent ${index}`);
			return {
				eventId: string(
					parent.eventId,
					`sponsor causal parent ${index}.eventId`,
				),
				relation: relation(parent.relation),
			};
		}),
		visibility: json(protocolEvent.visibility, "sponsor visibility"),
		provenance: {
			mechanismId:
				parents.length > 0
					? string(
							record(parents[0], "first sponsor causal parent").mechanismId,
							"first sponsor mechanismId",
						)
					: `sponsor.${kind}.v1`,
			cognitionDecisionId:
				provenance.kind === "cognition"
					? string(provenance.decisionId, "sponsor decisionId")
					: null,
			brainKind: provenance.kind === "cognition" ? "standard" : null,
		},
		preStateHash: input.head.stateHash,
		postStateHash: await hashAuthoritativeState(next),
		previousEventHash: input.head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "sponsor",
			protocolEvent: json(input.protocolEvent, "protocol sponsor event"),
			commandReceipt: json(receipt, "protocol sponsor receipt"),
			decisionRecord: decisionJson(input.decisionRecord),
		},
	});
	const durableReceipt = json(
		{ ...receipt, resultingWorldHeadHash: event.eventHash },
		"durable accepted sponsor receipt",
	);
	return {
		state: next,
		request: {
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			runId: input.head.runId,
			regionId: input.head.regionId,
			appendId,
			batchId,
			expectedRevision: input.head.revision,
			expectedLastSequence: input.head.lastSequence,
			expectedStateHash: input.head.stateHash,
			expectedLastEventHash: input.head.lastEventHash,
			fencingToken: input.head.fencingToken,
			events: [event],
			commandReceipt: durableReceipt,
			decisionRecord: decisionJson(input.decisionRecord),
		},
	};
}

/**
 * Advances one real model-free scheduler boundary after interpretation. The
 * scheduler consequence is derived independently. A non-plan interpretation
 * can be a contributing condition for a routine reassignment; merely
 * continuing the existing plan is recorded only as a temporal predecessor.
 */
export async function createCivilizationCounselBoundaryAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly citizenId: string;
	readonly interventionId: string;
}): Promise<
	CivilizationSponsorAuthorityAppend & {
		readonly fact: CivilizationCounselBoundaryFact;
	}
> {
	const current = validateState(input.state);
	if (current.phase !== "active" || current.civilization === null)
		fail("INVALID_INPUT", "CSP");
	if (
		(await hashAuthoritativeState(current)) !== input.head.stateHash ||
		current.scheduler.simulationTime !== input.head.simulationTime
	)
		fail("STALE_STATE", "CSP");
	const civilization = current.civilization as unknown as CivilizationState;
	assertCivilizationInvariants(civilization);
	const counsel = civilization.counsels[input.interventionId];
	const mind = civilization.minds[input.citizenId];
	const resolution = counsel?.resolution;
	const plan = mind?.snapshot.standingPlan;
	const step = plan?.steps.find(({ stepId }) => stepId === plan.currentStepId);
	if (
		counsel?.citizenId !== input.citizenId ||
		resolution === null ||
		resolution === undefined ||
		plan === undefined ||
		plan.status !== "active" ||
		plan.expiryBoundary < civilization.simulationTime ||
		step?.status !== "active"
	)
		fail("INVALID_INPUT", "CSP");
	const routineKind =
		step.kind === "Produce"
			? "produce"
			: step.kind === "TransportResource"
				? "transport"
				: step.kind === "WorkProject"
					? "construct"
					: step.kind === "Consume"
						? "consume"
						: step.kind === "JoinMigration"
							? "travel"
							: step.kind === "Away"
								? "away"
								: "social-maintenance";
	const relationshipTarget = [...mind!.snapshot.relationships]
		.sort((left, right) =>
			left.relationshipId.localeCompare(right.relationshipId),
		)
		.find(
			(relationship) =>
				relationship.fromCitizenId === input.citizenId &&
				civilization.citizens[relationship.toCitizenId]?.residenceState ===
					"resident" &&
				civilization.citizens[relationship.toCitizenId]?.settlementId ===
					civilization.citizens[input.citizenId]?.settlementId,
		)?.toCitizenId;
	if (resolution.action !== "follow-plan" && relationshipTarget === undefined)
		fail("INVALID_INPUT", "CSP");
	const routineDecision: SchedulerRoutineDecision = {
		schemaVersion: "eonfolk-civilization-routine-decision-v1",
		citizenId: input.citizenId,
		actionId:
			resolution.action === "follow-plan"
				? `follow:${plan.planId}`
				: `counsel:${resolution.action}:${input.interventionId}`,
		activeStandingPlanId: plan.planId,
		kind:
			resolution.action === "follow-plan" ? routineKind : "social-maintenance",
		subjectId:
			resolution.action === "follow-plan"
				? (step.targetIds[0] ?? input.citizenId)
				: relationshipTarget!,
	};
	const routineDecisions = [routineDecision];
	const policy = deriveCivilizationSchedulerPolicy(
		current.world as unknown as GeneratedWorldState,
	);
	let derived: ReturnType<typeof advanceGeneralizedScheduler>;
	try {
		derived = advanceGeneralizedScheduler(
			civilization,
			policy,
			routineDecisions,
		);
		assertCivilizationInvariants(derived.state);
	} catch {
		fail("INVALID_INPUT", "CSP");
	}
	let derivedState = derived.state;
	try {
		derivedState = applyCounselStandingPlanBoundary({
			state: derivedState,
			citizenId: input.citizenId,
			action: resolution.action,
		});
		assertCivilizationInvariants(derivedState);
	} catch {
		fail("INVALID_INPUT", "CSP");
	}
	const outcome = derivedState.needOutcomes
		.filter(
			(candidate) =>
				candidate.citizenId === input.citizenId &&
				candidate.evaluatedAtSimulationTime === derived.state.simulationTime,
		)
		.at(-1);
	if (outcome === undefined) fail("INVALID_INPUT", "CSP");
	const fact: CivilizationCounselBoundaryFact = {
		schemaVersion: "eonfolk-counsel-boundary-fact-v3",
		citizenId: input.citizenId,
		interventionId: input.interventionId,
		interpretationEventId: resolution.sourceEventId,
		interpretationAction: resolution.action,
		interpretationDisposition: resolution.disposition,
		causalRelation:
			resolution.action === "follow-plan"
				? "temporal-predecessor"
				: "contributing-condition",
		routineKind: routineDecision.kind,
		routineSubjectId: routineDecision.subjectId,
		planRoutineKind: routineKind,
		planRoutineSubjectId: step.targetIds[0] ?? input.citizenId,
		consequenceKind:
			routineDecision.kind === routineKind &&
			routineDecision.subjectId === (step.targetIds[0] ?? input.citizenId)
				? "routine-continued"
				: "routine-reassigned",
		schedulerActionKinds: [
			...new Set(derived.actions.map(({ kind }) => kind)),
		].sort(),
		simulationTime: derived.state.simulationTime,
		requiredNeedUnits: outcome.foodRequiredUnits + outcome.waterRequiredUnits,
		consumedNeedUnits: outcome.foodConsumedUnits + outcome.waterConsumedUnits,
		unmetNeedUnits:
			outcome.foodRequiredUnits -
			outcome.foodConsumedUnits +
			(outcome.waterRequiredUnits - outcome.waterConsumedUnits),
		sourceStockIds: [...outcome.sourceStockIds].sort(),
	};
	const next: ReleaseGenesisCivilizationState = {
		...current,
		civilization: json(derivedState, "boundary civilization"),
		scheduler: {
			completedDay: current.scheduler.completedDay + 1,
			simulationTime: derived.state.simulationTime,
			modelInvocations: 0,
			activities: json(
				projectCivilizationScheduledActivities({
					state: derivedState,
					world: current.world as unknown as GeneratedWorldState,
					routines: derived.routines,
				}),
				"boundary activities",
			),
		},
	};
	const appendId = `boundary:${input.interventionId}:1`;
	const batchId = `batch:${appendId}`;
	const eventId = `event:${appendId}`;
	const event = await createAuthorityEvent({
		runId: input.head.runId,
		regionId: input.head.regionId,
		engineVersion: input.head.engineVersion,
		stateSchemaVersion: input.head.stateSchemaVersion,
		appendId,
		batchId,
		eventId,
		sequence: input.head.lastSequence + 1,
		simulationTime: derived.state.simulationTime,
		eventType: "CivilizationCounselBoundaryCommitted",
		causalParents: [
			{
				eventId: resolution.sourceEventId,
				relation: fact.causalRelation,
			},
		],
		visibility: {
			kind: "patron-visible-through-covenant",
			subjectCitizenId: input.citizenId,
		},
		provenance: {
			mechanismId: "civilization.scheduler.counsel-boundary.v1",
			cognitionDecisionId: resolution.decisionId,
			brainKind: "standard",
		},
		preStateHash: input.head.stateHash,
		postStateHash: await hashAuthoritativeState(next),
		previousEventHash: input.head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "counsel-boundary",
			fact: json(fact, "boundary fact"),
			routineDecision: json(routineDecision, "boundary routine decision"),
			schedulerActions: json(derived.actions, "boundary actions"),
			schedulerRoutines: json(derived.routines, "boundary routines"),
		},
	});
	return {
		state: next,
		fact,
		request: {
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			runId: input.head.runId,
			regionId: input.head.regionId,
			appendId,
			batchId,
			expectedRevision: input.head.revision,
			expectedLastSequence: input.head.lastSequence,
			expectedStateHash: input.head.stateHash,
			expectedLastEventHash: input.head.lastEventHash,
			fencingToken: input.head.fencingToken,
			events: [event],
		},
	};
}
