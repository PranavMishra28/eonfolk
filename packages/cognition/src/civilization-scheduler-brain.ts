import type {
	ActionCatalogEntry,
	CitizenMindSnapshot,
	PrngState,
	StandingPlan,
	VisibilityContext,
} from "../../protocol/src/index.js";

import { buildMemoryAwareDecisionContext, type MemoryStore } from "./memory.js";
import { standardBrain, validateIntentProposal } from "./standard-brain.js";
import {
	advanceStandingPlan,
	interruptStandingPlan,
	replanStandingPlan,
	retryStandingPlan,
} from "./standing-plan.js";

export const CIVILIZATION_SCHEDULER_BRAIN_VERSION =
	"eonfolk-civilization-scheduler-brain-v1" as const;

export type CivilizationRoutineKind =
	| "produce"
	| "transport"
	| "construct"
	| "consume"
	| "social-maintenance"
	| "travel"
	| "away";

export interface CivilizationRoutineResolution {
	readonly kind: CivilizationRoutineKind;
	readonly subjectId: string;
}

export interface CivilizationRoutineOption {
	readonly entry: ActionCatalogEntry;
	/** Application-owned meaning of the known typed action after validation. */
	readonly routine: CivilizationRoutineResolution;
}

export interface CivilizationSchedulerMindState {
	readonly actorMind: CitizenMindSnapshot;
	readonly memoryStore: MemoryStore;
	readonly prngState: PrngState;
	readonly decisionOrdinal: number;
}

export type PriorRoutineOutcome = "completed" | "blocked" | null;

export type StandingPlanTransition =
	| "continued"
	| "advanced"
	| "completed"
	| "interrupted-retried"
	| "interrupted-replanned"
	| "choice-replanned";

export interface CivilizationSchedulerDecisionEvidence {
	readonly schemaVersion: typeof CIVILIZATION_SCHEDULER_BRAIN_VERSION;
	readonly decisionOrdinal: number;
	readonly actorId: string;
	readonly contextHash: string;
	readonly proposalHash: string;
	readonly selectedActionId: string;
	readonly routine: CivilizationRoutineResolution;
	readonly retrievedMemoryIds: readonly string[];
	readonly readVisibleRecordIds: readonly string[];
	readonly planId: string;
	readonly planVersionBefore: number;
	readonly planVersionAfter: number;
	readonly planTransition: StandingPlanTransition;
	readonly modelInvocations: 0;
}

export interface CivilizationSchedulerDecisionResult {
	readonly state: CivilizationSchedulerMindState;
	readonly evidence: CivilizationSchedulerDecisionEvidence;
}

function stepKind(kind: CivilizationRoutineKind): string {
	switch (kind) {
		case "produce":
			return "Produce";
		case "transport":
			return "TransportResource";
		case "construct":
			return "WorkProject";
		case "consume":
			return "Consume";
		case "social-maintenance":
			return "SocialMaintenance";
		case "travel":
			return "JoinMigration";
		case "away":
			return "Away";
	}
}

function replacementPlan(
	prior: StandingPlan,
	routine: CivilizationRoutineResolution,
	boundary: number,
): StandingPlan {
	const steps = Array.from({ length: 4 }, (_, index) => ({
		stepId: `${prior.planId}:replan:${String(prior.version + 1)}:${String(index + 1)}`,
		kind: stepKind(routine.kind),
		targetIds: [routine.subjectId],
		status: index === 0 ? ("active" as const) : ("pending" as const),
		children: [],
	}));
	return {
		planId: prior.planId,
		version: 1,
		citizenId: prior.citizenId,
		goalType: `routine:${routine.kind}`,
		targetIds: [routine.subjectId],
		steps,
		currentStepId: steps[0]!.stepId,
		commitmentId: prior.commitmentId,
		sourceId: CIVILIZATION_SCHEDULER_BRAIN_VERSION,
		startBoundary: boundary,
		expiryBoundary: Math.max(boundary, prior.expiryBoundary),
		retriesRemaining: prior.retriesRemaining,
		replansRemaining: prior.replansRemaining,
		status: "active",
	};
}

function settlePriorOutcome(input: {
	readonly plan: StandingPlan;
	readonly outcome: PriorRoutineOutcome;
	readonly fallbackRoutine: CivilizationRoutineResolution;
	readonly boundary: number;
}): {
	readonly plan: StandingPlan;
	readonly transition: StandingPlanTransition;
} {
	if (input.outcome === null || input.plan.status !== "active")
		return { plan: input.plan, transition: "continued" };
	if (input.outcome === "completed") {
		const advanced = advanceStandingPlan(input.plan, input.plan.currentStepId);
		return {
			plan: advanced,
			transition: advanced.status === "completed" ? "completed" : "advanced",
		};
	}
	const interrupted = interruptStandingPlan(input.plan);
	if (interrupted.retriesRemaining > 0)
		return {
			plan: retryStandingPlan(interrupted),
			transition: "interrupted-retried",
		};
	return {
		plan: replanStandingPlan(
			interrupted,
			replacementPlan(interrupted, input.fallbackRoutine, input.boundary),
		),
		transition: "interrupted-replanned",
	};
}

function assertOptions(
	actorId: string,
	planId: string,
	options: readonly CivilizationRoutineOption[],
): void {
	if (options.length === 0 || options.length > 8)
		throw new RangeError("scheduler decision needs one through eight options");
	const ids = options.map(({ entry }) => entry.actionId);
	if (new Set(ids).size !== ids.length)
		throw new Error("scheduler routine option IDs must be unique");
	for (const option of options) {
		if (option.routine.subjectId.length === 0)
			throw new Error("scheduler routine subject is required");
		if (
			option.entry.action.kind === "FollowStandingPlan" &&
			option.entry.action.planId !== planId
		)
			throw new Error("scheduler option follows a different standing plan");
		if (
			"targetCitizenId" in option.entry.action &&
			option.entry.action.targetCitizenId === actorId &&
			option.routine.kind === "away"
		)
			throw new Error("scheduler option has an invalid away resolution");
	}
}

/**
 * One normal scheduler decision boundary. Memory is visibility-filtered before
 * scoring, Standard Brain emits one known typed action, validation runs, and
 * only then may the Application update typed Mind state. Reality is untouched.
 */
export async function decideCivilizationSchedulerRoutine(input: {
	readonly state: CivilizationSchedulerMindState;
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly visibilityContext: VisibilityContext;
	readonly options: readonly CivilizationRoutineOption[];
	readonly fallbackRoutine: CivilizationRoutineResolution;
	readonly priorOutcome: PriorRoutineOutcome;
}): Promise<CivilizationSchedulerDecisionResult> {
	const initialPlan = input.state.actorMind.standingPlan;
	assertOptions(
		input.state.actorMind.citizenId,
		initialPlan.planId,
		input.options,
	);
	const settled = settlePriorOutcome({
		plan: initialPlan,
		outcome: input.priorOutcome,
		fallbackRoutine: input.fallbackRoutine,
		boundary: input.simulationTime,
	});
	if (settled.plan.status !== "active")
		throw new Error(
			"scheduler decision boundary needs an active standing plan",
		);
	const actorMind = { ...input.state.actorMind, standingPlan: settled.plan };
	const built = await buildMemoryAwareDecisionContext({
		contextId: `civilization:${input.runId}:${actorMind.citizenId}:${String(input.state.decisionOrdinal)}`,
		actorMind,
		memoryStore: input.state.memoryStore,
		retrieval: {
			cueIds: input.options.flatMap(({ entry }) => [
				entry.actionId,
				...entry.tags,
			]),
			relationshipCitizenIds: actorMind.relationships.map(
				({ toCitizenId }) => toCitizenId,
			),
			activeGoalId: settled.plan.goalType,
			activeCommitmentIds:
				settled.plan.commitmentId === null ? [] : [settled.plan.commitmentId],
			maximumRecords: 8,
			maximumBytes: 8_192,
			recencyHorizonSeconds: 30 * 86_400,
		},
		runId: input.runId,
		regionId: input.regionId,
		revision: input.revision,
		simulationTime: input.simulationTime,
		decisionReason: "plan-boundary",
		actionCatalog: input.options.map(({ entry }) => entry),
		visibilityContext: input.visibilityContext,
		counselIntent: null,
	});
	const choice = await standardBrain(built.context, {
		proposalId: `civilization-proposal:${actorMind.citizenId}:${String(input.state.decisionOrdinal)}`,
		prngState: input.state.prngState,
	});
	if (
		(await validateIntentProposal(built.context, choice.proposal)) !==
		"accepted"
	)
		throw new Error("Standard Brain produced an invalid scheduler proposal");
	const selected = input.options.find(
		({ entry }) => entry.actionId === choice.proposal.actionId,
	);
	if (selected === undefined)
		throw new Error(
			"validated scheduler action lacks an Application resolution",
		);
	let plan = settled.plan;
	let transition = settled.transition;
	if (choice.proposal.action.kind !== "FollowStandingPlan") {
		const interrupted = interruptStandingPlan(plan);
		if (interrupted.replansRemaining < 1)
			throw new Error(
				"standing plan has no replan budget for selected routine",
			);
		plan = replanStandingPlan(
			interrupted,
			replacementPlan(interrupted, selected.routine, input.simulationTime),
		);
		transition = "choice-replanned";
	}
	const nextState: CivilizationSchedulerMindState = {
		actorMind: { ...actorMind, standingPlan: plan },
		memoryStore: input.state.memoryStore,
		prngState: choice.nextPrngState,
		decisionOrdinal: input.state.decisionOrdinal + 1,
	};
	return {
		state: nextState,
		evidence: {
			schemaVersion: CIVILIZATION_SCHEDULER_BRAIN_VERSION,
			decisionOrdinal: input.state.decisionOrdinal,
			actorId: actorMind.citizenId,
			contextHash: built.context.contextHash,
			proposalHash: choice.proposal.proposalHash,
			selectedActionId: choice.proposal.actionId,
			routine: selected.routine,
			retrievedMemoryIds: built.retrieval.selected.map(
				({ memory }) => memory.memoryId,
			),
			readVisibleRecordIds: choice.proposal.explanation.visibleRecordIdsRead,
			planId: plan.planId,
			planVersionBefore: initialPlan.version,
			planVersionAfter: plan.version,
			planTransition: transition,
			modelInvocations: 0,
		},
	};
}

/** Historical replay projects accepted evidence and never calls a Brain. */
export function replayCivilizationSchedulerDecisions(
	records: readonly CivilizationSchedulerDecisionEvidence[],
): readonly CivilizationRoutineResolution[] {
	return [...records]
		.sort(
			(left, right) =>
				left.decisionOrdinal - right.decisionOrdinal ||
				left.actorId.localeCompare(right.actorId),
		)
		.map((record) => {
			if (
				record.schemaVersion !== CIVILIZATION_SCHEDULER_BRAIN_VERSION ||
				record.modelInvocations !== 0 ||
				!Number.isSafeInteger(record.decisionOrdinal) ||
				record.decisionOrdinal < 0 ||
				record.selectedActionId.length === 0 ||
				record.routine.subjectId.length === 0
			)
				throw new Error("invalid civilization scheduler decision evidence");
			return record.routine;
		});
}
