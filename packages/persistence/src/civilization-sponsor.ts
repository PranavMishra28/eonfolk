import {
	advanceGeneralizedScheduler,
	assertCivilizationInvariants,
	type CivilizationCounselOutcomeEffect,
	type CivilizationState,
	deriveCivilizationSchedulerPolicy,
	projectCivilizationScheduledActivities,
	type SchedulerRoutineDecision,
} from "@eonfolk/civilization";
import {
	applyCivilizationCounselOutcome,
	applyCivilizationSponsorEvent,
	applyCounselStandingPlanBoundary,
	parseCivilizationSponsorEvent,
	validateCommittedCivilizationDecisionRecord,
} from "@eonfolk/civilization/sponsor";
import {
	type GeneratedWorldState,
	payloadFingerprint,
	batchId as protocolBatchId,
	stateHash as protocolStateHash,
} from "@eonfolk/protocol";
import {
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
	type ReleaseGenesisCivilizationState,
} from "./civilization.js";
import { canonicalJson, cloneValue } from "./codec.js";
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
	readonly schemaVersion: "eonfolk-counsel-boundary-fact-v4";
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
	readonly effect: CivilizationCounselOutcomeEffect;
	readonly counterfactual: {
		readonly schemaVersion: "eonfolk-counsel-counterfactual-v1";
		readonly policy: "patron-non-intervention";
		readonly abstentionEventId: string | null;
		readonly routineKind: SchedulerRoutineDecision["kind"];
		readonly routineSubjectId: string;
		readonly schedulerActionKinds: readonly string[];
	};
}

export interface CivilizationAbstentionBoundaryFact {
	readonly schemaVersion: "eonfolk-abstention-boundary-fact-v1";
	readonly citizenId: string;
	readonly abstentionId: string;
	readonly abstentionEventId: string;
	readonly planId: string;
	readonly planStepId: string;
	readonly consequenceKind: "standing-plan-continued-after-patron-abstention";
	readonly routineKind: SchedulerRoutineDecision["kind"];
	readonly routineSubjectId: string;
	readonly schedulerActionKinds: readonly string[];
	readonly simulationTime: number;
	readonly requiredNeedUnits: number;
	readonly consumedNeedUnits: number;
	readonly unmetNeedUnits: number;
	readonly sourceStockIds: readonly string[];
}

export function civilizationAbstentionBoundaryAppendId(
	abstentionId: string,
): string {
	const appendId = `abstention-boundary:${string(abstentionId, "abstentionId")}:1`;
	if (appendId.length > 122) fail("INVALID_INPUT", "CSP");
	return appendId;
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

function standingPlanRoutineKind(
	stepKind: string,
): SchedulerRoutineDecision["kind"] {
	return stepKind === "Produce"
		? "produce"
		: stepKind === "TransportResource"
			? "transport"
			: stepKind === "WorkProject"
				? "construct"
				: stepKind === "Consume"
					? "consume"
					: stepKind === "JoinMigration"
						? "travel"
						: stepKind === "Away"
							? "away"
							: "social-maintenance";
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
			: kind === "PatronAbstained"
				? {
						kind: "RecordPatronAbstention" as const,
						abstentionId: eventPayload.abstentionId,
						citizenId: eventPayload.citizenId,
						reason: eventPayload.reason,
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
			: kind === "PatronAbstained" || kind === "CounselIssued"
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
		if (value === "direct") return "direct" as const;
		if (value === "trigger") return "trigger" as const;
		if (value === "contributing") return "contributing" as const;
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
				mechanismId: string(
					parent.mechanismId,
					`sponsor causal parent ${index}.mechanismId`,
				),
			};
		}),
		relatedEvents: array(
			protocolEvent.relatedEvents,
			"sponsor relatedEvents",
		).map((value, index) => {
			const related = record(value, `sponsor related event ${index}`);
			if (
				related.relation !== "temporal-predecessor" &&
				related.relation !== "response-to"
			)
				fail("INVALID_INPUT", "CSP");
			return {
				eventId: string(
					related.eventId,
					`sponsor related event ${index}.eventId`,
				),
				relation: related.relation,
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
	const routineKind = standingPlanRoutineKind(step.kind);
	const relationship = [...mind!.snapshot.relationships]
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
		);
	const relationshipTarget = relationship?.toCitizenId;
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
	const counterfactual = advanceGeneralizedScheduler(civilization, policy, []);
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
	const appendId = `boundary:${input.interventionId}:1`;
	const batchId = `batch:${appendId}`;
	const eventId = `event:${appendId}`;
	let effect: CivilizationCounselOutcomeEffect;
	if (resolution.action === "verify-reserve") {
		const stockObservations = Object.values(derivedState.stocks)
			.filter(
				(stock) =>
					stock.owner.kind === "settlement" &&
					stock.owner.settlementId ===
						derivedState.citizens[input.citizenId]?.settlementId,
			)
			.map((stock) => ({
				stockId: stock.stockId,
				resourceTypeId: stock.resourceTypeId,
				quantity: stock.quantity,
			}))
			.sort((left, right) => left.stockId.localeCompare(right.stockId));
		if (stockObservations.length === 0) fail("INVALID_INPUT", "CSP");
		effect = {
			kind: "reserve-inspection",
			observationRecordId: `record:${input.interventionId}:reserve-inspection`,
			stockObservations,
		};
	} else if (resolution.action === "accuse-publicly") {
		if (relationship === undefined) fail("INVALID_INPUT", "CSP");
		effect = {
			kind: "public-allegation",
			statementRecordId: `record:${input.interventionId}:public-allegation`,
			targetCitizenId: relationship.toCitizenId,
			relationshipId: relationship.relationshipId,
			trustDeltaBasisPoints: -Math.min(250, relationship.trust),
			strainDeltaBasisPoints: Math.min(400, 10_000 - relationship.strain),
		};
	} else {
		effect = { kind: "plan-continuation", planId: plan.planId };
	}
	try {
		derivedState = applyCivilizationCounselOutcome({
			state: derivedState,
			citizenId: input.citizenId,
			interventionId: input.interventionId,
			interpretationEventId: resolution.sourceEventId,
			sourceEventId: eventId,
			effect,
		});
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
		schemaVersion: "eonfolk-counsel-boundary-fact-v4",
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
		effect,
		counterfactual: {
			schemaVersion: "eonfolk-counsel-counterfactual-v1",
			policy: "patron-non-intervention",
			abstentionEventId:
				Object.values(civilization.patronAbstentions)
					.filter((item) => item.citizenId === input.citizenId)
					.sort(
						(left, right) => right.recordedAtRevision - left.recordedAtRevision,
					)[0]?.sourceEventId ?? null,
			routineKind:
				counterfactual.routines.find(
					(candidate) => candidate.citizenId === input.citizenId,
				)?.kind ?? "social-maintenance",
			routineSubjectId:
				counterfactual.routines.find(
					(candidate) => candidate.citizenId === input.citizenId,
				)?.subjectId ?? input.citizenId,
			schedulerActionKinds: [
				...new Set(counterfactual.actions.map(({ kind }) => kind)),
			].sort(),
		},
	};
	const projectedActivities = projectCivilizationScheduledActivities({
		state: derivedState,
		world: current.world as unknown as GeneratedWorldState,
		routines: derived.routines,
	}).map((activity) =>
		activity.citizenId !== input.citizenId ||
		resolution.action === "follow-plan"
			? activity
			: {
					...activity,
					canonicalAction: {
						...activity.canonicalAction,
						actionId: `counsel-outcome:${input.interventionId}`,
						kind: resolution.action === "verify-reserve" ? "inspect" : "talk",
						targetId:
							resolution.action === "verify-reserve"
								? effect.kind === "reserve-inspection"
									? (effect.stockObservations[0]?.stockId ?? null)
									: null
								: (relationshipTarget ?? null),
					},
				},
	);
	const next: ReleaseGenesisCivilizationState = {
		...current,
		civilization: json(derivedState, "boundary civilization"),
		scheduler: {
			completedDay: current.scheduler.completedDay + 1,
			simulationTime: derived.state.simulationTime,
			modelInvocations: 0,
			activities: json(projectedActivities, "boundary activities"),
		},
	};
	const causalParents =
		fact.causalRelation === "contributing-condition"
			? [
					{
						eventId: resolution.sourceEventId,
						relation: "contributing" as const,
						mechanismId: "civilization.scheduler.counsel-boundary.v1",
					},
				]
			: [];
	const relatedEvents = [
		...(fact.causalRelation === "temporal-predecessor"
			? [
					{
						eventId: resolution.sourceEventId,
						relation: "temporal-predecessor" as const,
					},
				]
			: []),
		...(fact.counterfactual.abstentionEventId === null
			? []
			: [
					{
						eventId: fact.counterfactual.abstentionEventId,
						relation: "temporal-predecessor" as const,
					},
				]),
	];
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
		causalParents,
		relatedEvents,
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

/**
 * Advances one deterministic daily scheduler boundary after a recorded patron
 * abstention. The citizen follows the already-authoritative Standing Plan; the
 * abstention is chronology only and is never admitted as a causal parent.
 */
export async function createCivilizationAbstentionBoundaryAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly citizenId: string;
	readonly abstentionId: string;
}): Promise<
	CivilizationSponsorAuthorityAppend & {
		readonly fact: CivilizationAbstentionBoundaryFact;
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
	const abstention = civilization.patronAbstentions[input.abstentionId];
	const mind = civilization.minds[input.citizenId];
	const plan = mind?.snapshot.standingPlan;
	const step = plan?.steps.find(({ stepId }) => stepId === plan.currentStepId);
	if (
		abstention?.citizenId !== input.citizenId ||
		plan === undefined ||
		plan.status !== "active" ||
		plan.expiryBoundary < civilization.simulationTime ||
		step?.status !== "active"
	)
		fail("INVALID_INPUT", "CSP");
	const routineDecision: SchedulerRoutineDecision = {
		schemaVersion: "eonfolk-civilization-routine-decision-v1",
		citizenId: input.citizenId,
		actionId: `abstention-follow:${input.abstentionId}`,
		activeStandingPlanId: plan.planId,
		kind: standingPlanRoutineKind(step.kind),
		subjectId: step.targetIds[0] ?? input.citizenId,
	};
	const policy = deriveCivilizationSchedulerPolicy(
		current.world as unknown as GeneratedWorldState,
	);
	let derived: ReturnType<typeof advanceGeneralizedScheduler>;
	try {
		derived = advanceGeneralizedScheduler(civilization, policy, [
			routineDecision,
		]);
		assertCivilizationInvariants(derived.state);
	} catch {
		fail("INVALID_INPUT", "CSP");
	}
	const routine = derived.routines.find(
		(candidate) => candidate.citizenId === input.citizenId,
	);
	const outcome = derived.state.needOutcomes
		.filter(
			(candidate) =>
				candidate.citizenId === input.citizenId &&
				candidate.evaluatedAtSimulationTime === derived.state.simulationTime,
		)
		.at(-1);
	if (
		derived.modelInvocations !== 0 ||
		derived.state.simulationTime !== civilization.simulationTime + 86_400 ||
		routine?.kind !== routineDecision.kind ||
		routine?.subjectId !== routineDecision.subjectId ||
		outcome === undefined
	)
		fail("INVALID_INPUT", "CSP");
	const fact: CivilizationAbstentionBoundaryFact = {
		schemaVersion: "eonfolk-abstention-boundary-fact-v1",
		citizenId: input.citizenId,
		abstentionId: input.abstentionId,
		abstentionEventId: abstention.sourceEventId,
		planId: plan.planId,
		planStepId: step.stepId,
		consequenceKind: "standing-plan-continued-after-patron-abstention",
		routineKind: routineDecision.kind,
		routineSubjectId: routineDecision.subjectId,
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
	const projectedActivities = projectCivilizationScheduledActivities({
		state: derived.state,
		world: current.world as unknown as GeneratedWorldState,
		routines: derived.routines,
	});
	const next: ReleaseGenesisCivilizationState = {
		...current,
		civilization: json(derived.state, "abstention boundary civilization"),
		scheduler: {
			completedDay: current.scheduler.completedDay + 1,
			simulationTime: derived.state.simulationTime,
			modelInvocations: 0,
			activities: json(projectedActivities, "abstention boundary activities"),
		},
	};
	const appendId = civilizationAbstentionBoundaryAppendId(input.abstentionId);
	const batchId = `batch:${appendId}`;
	const event = await createAuthorityEvent({
		runId: input.head.runId,
		regionId: input.head.regionId,
		engineVersion: input.head.engineVersion,
		stateSchemaVersion: input.head.stateSchemaVersion,
		appendId,
		batchId,
		eventId: `event:${appendId}`,
		sequence: input.head.lastSequence + 1,
		simulationTime: derived.state.simulationTime,
		eventType: "CivilizationAbstentionBoundaryCommitted",
		causalParents: [],
		relatedEvents: [
			{
				eventId: abstention.sourceEventId,
				relation: "temporal-predecessor",
			},
		],
		visibility: {
			kind: "patron-visible-through-covenant",
			subjectCitizenId: input.citizenId,
		},
		provenance: {
			mechanismId: "civilization.scheduler.abstention-boundary.v1",
			cognitionDecisionId: null,
			brainKind: null,
		},
		preStateHash: input.head.stateHash,
		postStateHash: await hashAuthoritativeState(next),
		previousEventHash: input.head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "abstention-boundary",
			fact: json(fact, "abstention boundary fact"),
			routineDecision: json(
				routineDecision,
				"abstention boundary routine decision",
			),
			schedulerActions: json(derived.actions, "abstention boundary actions"),
			schedulerRoutines: json(derived.routines, "abstention boundary routines"),
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
