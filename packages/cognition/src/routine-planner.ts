import type {
	CitizenId,
	CognitionAction,
	PlanId,
	StandingPlan,
	StandingPlanStep,
} from "../../protocol/src/index.js";

export interface VisiblePlanningRecord {
	readonly recordId: string;
	readonly effectCodes: readonly string[];
}

export interface PlanningAffordance {
	readonly actionId: string;
	readonly action: CognitionAction;
	readonly estimatedDurationSeconds: number;
	readonly energyCost: number;
	readonly requiredVisibleRecordIds: readonly string[];
	readonly prerequisiteActionIds: readonly string[];
	readonly effectCodes: readonly string[];
	readonly targetIds: readonly string[];
	readonly interruptible: boolean;
}

export interface RoutinePlanningGoal {
	readonly goalType: string;
	readonly desiredEffectCodes: readonly string[];
	readonly targetIds: readonly string[];
	readonly commitmentId: string | null;
	readonly maximumSteps: number;
	readonly expiryBoundary: number;
}

export interface RoutinePlanningContext {
	readonly planId: PlanId;
	readonly citizenId: CitizenId;
	readonly boundary: number;
	readonly visibleRecords: readonly VisiblePlanningRecord[];
	readonly affordances: readonly PlanningAffordance[];
	readonly goal: RoutinePlanningGoal;
	readonly maximumExpansions: number;
}

export interface GroundedRoutineDemand {
	readonly demandId: string;
	readonly goalType: string;
	readonly severityBasisPoints: number;
	readonly desiredEffectCodes: readonly string[];
	readonly targetIds: readonly string[];
	readonly commitmentId: string | null;
	readonly requiredVisibleRecordIds: readonly string[];
}

export interface GroundedRoutinePlanningContext
	extends Omit<RoutinePlanningContext, "goal"> {
	readonly demands: readonly GroundedRoutineDemand[];
	readonly expiryBoundary: number;
}

interface CandidatePlan {
	readonly actions: readonly PlanningAffordance[];
	readonly effects: ReadonlySet<string>;
	readonly duration: number;
	readonly energy: number;
}

function assertBoundedContext(context: RoutinePlanningContext): void {
	if (
		!Number.isSafeInteger(context.boundary) ||
		context.boundary < 0 ||
		!Number.isSafeInteger(context.goal.expiryBoundary) ||
		context.goal.expiryBoundary < context.boundary
	) {
		throw new RangeError("routine plan boundaries are invalid");
	}
	if (
		!Number.isSafeInteger(context.goal.maximumSteps) ||
		context.goal.maximumSteps < 1 ||
		context.goal.maximumSteps > 8 ||
		!Number.isSafeInteger(context.maximumExpansions) ||
		context.maximumExpansions < 1 ||
		context.maximumExpansions > 256
	) {
		throw new RangeError("routine planner budget is invalid");
	}
}

function validateAffordance(affordance: PlanningAffordance): void {
	if (
		!Number.isSafeInteger(affordance.estimatedDurationSeconds) ||
		affordance.estimatedDurationSeconds < 0 ||
		!Number.isSafeInteger(affordance.energyCost) ||
		affordance.energyCost < 0
	) {
		throw new RangeError("planning affordance cost is invalid");
	}
}

function coversGoal(
	candidate: CandidatePlan,
	desired: ReadonlySet<string>,
): boolean {
	return [...desired].every((effect) => candidate.effects.has(effect));
}

function compareCandidates(
	left: CandidatePlan,
	right: CandidatePlan,
	desired: ReadonlySet<string>,
): number {
	const leftCoverage = [...desired].filter((effect) =>
		left.effects.has(effect),
	).length;
	const rightCoverage = [...desired].filter((effect) =>
		right.effects.has(effect),
	).length;
	return (
		rightCoverage - leftCoverage ||
		left.actions.length - right.actions.length ||
		left.duration - right.duration ||
		left.energy - right.energy ||
		left.actions
			.map(({ actionId }) => actionId)
			.join("|")
			.localeCompare(right.actions.map(({ actionId }) => actionId).join("|"))
	);
}

function toStandingPlan(
	context: RoutinePlanningContext,
	actions: readonly PlanningAffordance[],
): StandingPlan {
	const steps: StandingPlanStep[] = actions.map((affordance, index) => ({
		stepId: `${context.planId}:step:${String(index + 1)}`,
		kind: affordance.action.kind,
		targetIds: affordance.targetIds,
		status: index === 0 ? "active" : "pending",
		children: [],
	}));
	return {
		planId: context.planId,
		version: 1,
		citizenId: context.citizenId,
		goalType: context.goal.goalType,
		targetIds: context.goal.targetIds,
		steps,
		currentStepId: steps[0]!.stepId,
		commitmentId: context.goal.commitmentId,
		sourceId: "routine-planner-v1",
		startBoundary: context.boundary,
		expiryBoundary: context.goal.expiryBoundary,
		retriesRemaining: 1,
		replansRemaining: 1,
		status: "active",
	};
}

/** Bounded deterministic forward search over actor-visible legal affordances. */
export function planRoutine(context: RoutinePlanningContext): StandingPlan {
	assertBoundedContext(context);
	const visibleIds = new Set(
		context.visibleRecords.map(({ recordId }) => recordId),
	);
	const affordances = [...context.affordances]
		.map((affordance) => {
			validateAffordance(affordance);
			return affordance;
		})
		.filter((affordance) =>
			affordance.requiredVisibleRecordIds.every((id) => visibleIds.has(id)),
		)
		.sort((left, right) => left.actionId.localeCompare(right.actionId));
	if (
		new Set(affordances.map(({ actionId }) => actionId)).size !==
		affordances.length
	) {
		throw new Error("planning affordance IDs must be unique");
	}
	const desired = new Set(context.goal.desiredEffectCodes);
	const frontier: CandidatePlan[] = [
		{ actions: [], effects: new Set<string>(), duration: 0, energy: 0 },
	];
	let best = frontier[0]!;
	let expansions = 0;
	while (frontier.length > 0 && expansions < context.maximumExpansions) {
		const candidate = frontier.shift()!;
		if (compareCandidates(candidate, best, desired) < 0) best = candidate;
		if (coversGoal(candidate, desired)) {
			best = candidate;
			break;
		}
		if (candidate.actions.length >= context.goal.maximumSteps) continue;
		const selected = new Set(candidate.actions.map(({ actionId }) => actionId));
		for (const affordance of affordances) {
			if (
				selected.has(affordance.actionId) ||
				!affordance.prerequisiteActionIds.every((id) => selected.has(id))
			) {
				continue;
			}
			const actions = [...candidate.actions, affordance];
			frontier.push({
				actions,
				effects: new Set([...candidate.effects, ...affordance.effectCodes]),
				duration: candidate.duration + affordance.estimatedDurationSeconds,
				energy: candidate.energy + affordance.energyCost,
			});
			expansions += 1;
			if (expansions >= context.maximumExpansions) break;
		}
		frontier.sort((left, right) => compareCandidates(left, right, desired));
	}
	if (!coversGoal(best, desired) || best.actions.length === 0) {
		throw new Error("ACTION_UNAVAILABLE");
	}
	return toStandingPlan(context, best.actions);
}

/** Selects the strongest actor-visible grounded demand before bounded search. */
export function planGroundedRoutine(
	context: GroundedRoutinePlanningContext,
): StandingPlan {
	const visibleIds = new Set(
		context.visibleRecords.map(({ recordId }) => recordId),
	);
	const demand = [...context.demands]
		.map((candidate) => {
			if (
				!Number.isSafeInteger(candidate.severityBasisPoints) ||
				candidate.severityBasisPoints < 0 ||
				candidate.severityBasisPoints > 10_000
			)
				throw new RangeError("grounded demand severity is invalid");
			return candidate;
		})
		.filter((candidate) =>
			candidate.requiredVisibleRecordIds.every((recordId) =>
				visibleIds.has(recordId),
			),
		)
		.sort(
			(left, right) =>
				right.severityBasisPoints - left.severityBasisPoints ||
				Number(right.commitmentId !== null) -
					Number(left.commitmentId !== null) ||
				left.demandId.localeCompare(right.demandId),
		)[0];
	if (demand === undefined || demand.severityBasisPoints === 0)
		throw new Error("ACTION_UNAVAILABLE");
	return planRoutine({
		planId: context.planId,
		citizenId: context.citizenId,
		boundary: context.boundary,
		visibleRecords: context.visibleRecords,
		affordances: context.affordances,
		goal: {
			goalType: demand.goalType,
			desiredEffectCodes: demand.desiredEffectCodes,
			targetIds: demand.targetIds,
			commitmentId: demand.commitmentId,
			maximumSteps: 8,
			expiryBoundary: context.expiryBoundary,
		},
		maximumExpansions: context.maximumExpansions,
	});
}
