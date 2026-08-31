import { deriveCanonicalPressures } from "./pressures.js";
import type {
	GeneralizedSchedulerPolicy,
	SchedulerRoutineDecision,
} from "./scheduler.js";
import type {
	CivilizationGoal,
	CivilizationMindState,
	CivilizationState,
	GroundedPressureState,
	PressureDerivationPolicy,
} from "./types.js";

export const CIVILIZATION_GOAL_PRESSURE_THRESHOLD = 2_500;
const DAY_SECONDS = 86_400;

const PRESSURE_KIND_ORDER: readonly GroundedPressureState["kind"][] = [
	"water",
	"food",
	"housing",
	"labor",
	"travel",
	"social",
];

function pressurePolicyFromScheduler(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
): PressureDerivationPolicy {
	const habitableBuildingIds = Object.values(state.households)
		.map(({ dwellingBuildingId }) => dwellingBuildingId)
		.filter((buildingId): buildingId is string => buildingId !== null);
	return {
		foodResourceTypeIds: policy.foodResourceTypeIds,
		waterResourceTypeIds: policy.waterResourceTypeIds,
		habitableBuildingIds,
		quantityObservationGranularity: 1,
		socialIntervalSeconds: DAY_SECONDS,
	};
}

function playerFacingIntent(kind: GroundedPressureState["kind"]): string {
	if (kind === "water") return "Keep drinking water where people can reach it.";
	if (kind === "food") return "Keep food coming in before stores run short.";
	if (kind === "housing") return "Find a lasting place to live.";
	if (kind === "labor") return "Ease the work that is already promised.";
	if (kind === "travel") return "Prepare to leave this settlement.";
	return "Stay in contact with people they rely on.";
}

function desiredEffect(kind: GroundedPressureState["kind"]): string {
	if (kind === "water") return "replenish-water";
	if (kind === "food") return "replenish-food";
	if (kind === "housing") return "secure-housing";
	if (kind === "labor") return "rebalance-labor";
	if (kind === "travel") return "complete-travel";
	return "maintain-social-contact";
}

function sourceKindFor(
	kind: GroundedPressureState["kind"],
): CivilizationGoal["sourceKind"] {
	if (kind === "housing") return "danger";
	if (kind === "labor") return "commitment";
	if (kind === "travel") return "project";
	return "need-pressure";
}

function dominantPressure(
	pressures: readonly GroundedPressureState[],
): GroundedPressureState | null {
	const ranked = pressures
		.filter(
			(pressure) =>
				pressure.severityBasisPoints >= CIVILIZATION_GOAL_PRESSURE_THRESHOLD,
		)
		.sort(
			(left, right) =>
				right.severityBasisPoints - left.severityBasisPoints ||
				PRESSURE_KIND_ORDER.indexOf(left.kind) -
					PRESSURE_KIND_ORDER.indexOf(right.kind),
		);
	return ranked[0] ?? null;
}

function continueGoal(
	prior: CivilizationGoal | undefined,
	pressure: GroundedPressureState,
	state: CivilizationState,
): boolean {
	return (
		prior !== undefined &&
		prior.lifecycle === "active" &&
		prior.desiredEffect === desiredEffect(pressure.kind) &&
		prior.citizenId === pressure.subjectCitizenId &&
		prior.formedAtRevision <= state.revision
	);
}

/** Forms one Goal from the strongest grounded pressure the citizen can observe. */
export function formCitizenGoal(
	state: CivilizationState,
	citizenId: string,
	policy: PressureDerivationPolicy,
	atSimulationTime: number,
): CivilizationGoal | null {
	const citizen = state.citizens[citizenId];
	if (citizen === undefined || citizen.residenceState === "departed")
		return null;
	const pressure = dominantPressure(
		deriveCanonicalPressures(state, citizenId, policy, atSimulationTime),
	);
	if (pressure === null) return null;
	const prior = (state.minds[citizenId]?.goals ?? []).find(
		(goal) => goal.lifecycle === "active",
	);
	if (continueGoal(prior, pressure, state) && prior !== undefined) return prior;
	return {
		schemaVersion: "eonfolk-civilization-goal-v1",
		goalId: `goal:${citizenId}:${pressure.kind}:${String(state.revision)}`,
		citizenId,
		lifecycle: "active",
		sourceKind: sourceKindFor(pressure.kind),
		sourceIds: [...pressure.sourceStockIds, ...pressure.sourceReferenceIds],
		formedAtSimulationTime: atSimulationTime,
		formedAtRevision: state.revision,
		desiredEffect: desiredEffect(pressure.kind),
		targetIds: pressure.sourceStockIds,
		priorityBasisPoints: pressure.severityBasisPoints,
		confidenceBasisPoints: 8_000,
		reviewBoundary: atSimulationTime + DAY_SECONDS,
		playerFacingIntent: playerFacingIntent(pressure.kind),
		standingPlanId:
			state.minds[citizenId]?.snapshot.standingPlan.planId ?? null,
	};
}

function routineForGoal(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	goal: CivilizationGoal,
): Pick<SchedulerRoutineDecision, "kind" | "subjectId"> | null {
	if (goal.desiredEffect === "replenish-water") {
		const lane = policy.transportLanes.find(
			(candidate) =>
				candidate.carrierCitizenId === goal.citizenId &&
				policy.waterResourceTypeIds.includes(
					state.stocks[candidate.toStockId]?.resourceTypeId ?? "",
				),
		);
		if (lane !== undefined)
			return { kind: "transport", subjectId: lane.laneId };
	}
	if (goal.desiredEffect === "replenish-food") {
		const job = policy.productionJobs.find((candidate) =>
			candidate.participantCitizenIds.includes(goal.citizenId),
		);
		if (job !== undefined) return { kind: "produce", subjectId: job.jobId };
		const lane = policy.transportLanes.find(
			(candidate) =>
				candidate.carrierCitizenId === goal.citizenId &&
				policy.foodResourceTypeIds.includes(
					state.stocks[candidate.toStockId]?.resourceTypeId ?? "",
				),
		);
		if (lane !== undefined)
			return { kind: "transport", subjectId: lane.laneId };
	}
	if (goal.desiredEffect === "secure-housing") {
		const project = policy.collectiveProjects.find(
			(candidate) => candidate.actorCitizenId === goal.citizenId,
		);
		if (project !== undefined)
			return { kind: "construct", subjectId: project.projectId };
	}
	return null;
}

export interface LiveGoalDecisionPass {
	readonly minds: Readonly<Record<string, CivilizationMindState>>;
	readonly decisions: readonly SchedulerRoutineDecision[];
}

/**
 * Layer-2 live cognition: persist Goals from pressures and emit routine
 * decisions that Reality may still refuse. Does not call Standard Brain.
 */
export function formLiveGoalDecisions(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	atSimulationTime: number = state.simulationTime,
): LiveGoalDecisionPass {
	const pressurePolicy = pressurePolicyFromScheduler(state, policy);
	const minds: Record<string, CivilizationMindState> = {};
	const decisions: SchedulerRoutineDecision[] = [];
	for (const citizenId of Object.keys(state.citizens).sort()) {
		const registered = state.minds[citizenId];
		if (registered === undefined) continue;
		const goal = formCitizenGoal(
			state,
			citizenId,
			pressurePolicy,
			atSimulationTime,
		);
		const priorGoals = (registered.goals ?? []).map((existing) =>
			existing.lifecycle === "active" &&
			(goal === null || existing.goalId !== goal.goalId)
				? { ...existing, lifecycle: "suspended" as const }
				: existing,
		);
		const goals =
			goal === null
				? priorGoals
				: [
						...priorGoals.filter((existing) => existing.goalId !== goal.goalId),
						goal,
					];
		minds[citizenId] = {
			...registered,
			goals,
			activeGoalId: goal?.goalId ?? null,
			committedAtRevision: state.revision,
			committedAtSimulationTime: state.simulationTime,
		};
		if (goal === null) continue;
		const routine = routineForGoal(state, policy, goal);
		if (routine === null) continue;
		decisions.push({
			schemaVersion: "eonfolk-civilization-routine-decision-v1",
			citizenId,
			actionId: `goal:${goal.goalId}`,
			activeStandingPlanId: registered.snapshot.standingPlan.planId,
			kind: routine.kind,
			subjectId: routine.subjectId,
		});
	}
	return { minds, decisions };
}
