import type { ProjectState, StandingPlan } from "../../protocol/src/index.js";
import {
	type PlanningAffordance,
	planRoutine,
	type VisiblePlanningRecord,
} from "./routine-planner.js";

export interface VisibleProjectPlanningContext {
	readonly planId: string;
	readonly actorId: string;
	readonly boundary: number;
	readonly project: ProjectState;
	readonly visibleRecords: readonly VisiblePlanningRecord[];
	readonly legalAffordances: readonly PlanningAffordance[];
	readonly commitmentId: string | null;
}

export interface CitizenProjectOrigination {
	readonly projectId: string;
	readonly projectKind: "water-reserve";
	readonly projectName: "water-reserve";
	readonly settlementId: string;
	readonly siteId: string;
	readonly evidenceRecordIds: readonly string[];
	readonly sourceGoalType: string;
}

/**
 * Maps an inspectable standing-plan goal plus a recorded water need onto one
 * typed project. Returns null when the pair is absent so titles cannot be
 * invented.
 */
export function originateProjectFromStandingPlan(input: {
	readonly citizenId: string;
	readonly goalType: string;
	readonly settlementId: string;
	readonly siteId: string;
	readonly visibleNeedRecordId: string | null;
}): CitizenProjectOrigination | null {
	if (
		input.goalType !== "routine:transport" ||
		input.visibleNeedRecordId === null ||
		!input.visibleNeedRecordId.includes("water-reserve") ||
		input.settlementId.length === 0 ||
		input.siteId.length === 0
	)
		return null;
	return {
		projectId: `project-${input.citizenId}-water-reserve`,
		projectKind: "water-reserve",
		projectName: "water-reserve",
		settlementId: input.settlementId,
		siteId: input.siteId,
		evidenceRecordIds: [input.visibleNeedRecordId],
		sourceGoalType: input.goalType,
	};
}

function activeMilestone(project: ProjectState) {
	return project.milestones
		.filter(
			(milestone) =>
				milestone.state === "ready" || milestone.state === "active",
		)
		.sort((left, right) =>
			left.milestoneId.localeCompare(right.milestoneId),
		)[0];
}

/** Creates a short legal plan for the next visible project milestone only. */
export function planProjectWork(
	context: VisibleProjectPlanningContext,
): StandingPlan {
	if (
		context.project.state === "completed" ||
		context.project.state === "failed" ||
		context.project.state === "abandoned"
	) {
		throw new Error("ACTION_UNAVAILABLE");
	}
	const milestone = activeMilestone(context.project);
	if (milestone === undefined) throw new Error("ACTION_UNAVAILABLE");
	const desiredEffect = `project:${context.project.projectId}:milestone:${milestone.milestoneId}`;
	return planRoutine({
		planId: context.planId,
		citizenId: context.actorId,
		boundary: context.boundary,
		visibleRecords: context.visibleRecords,
		affordances: context.legalAffordances.filter(
			(affordance) =>
				affordance.action.kind !== "WorkProject" ||
				(affordance.action.projectId === context.project.projectId &&
					affordance.action.milestoneId === milestone.milestoneId),
		),
		goal: {
			goalType: "advance-project",
			desiredEffectCodes: [desiredEffect],
			targetIds: [context.project.projectId, milestone.milestoneId],
			commitmentId: context.commitmentId,
			maximumSteps: 4,
			expiryBoundary: context.boundary + 86_400,
		},
		maximumExpansions: 64,
	});
}
