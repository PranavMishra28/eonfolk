import type {
	StandingPlan,
	StandingPlanStep,
} from "../../protocol/src/index.js";

function visit(
	steps: readonly StandingPlanStep[],
	depth: number,
	ids: Set<string>,
	active: string[],
): void {
	if (depth > 4) throw new RangeError("standing plan exceeds maximum depth");
	for (const step of steps) {
		if (ids.has(step.stepId))
			throw new Error("standing plan step IDs must be unique");
		ids.add(step.stepId);
		if (step.status === "active") active.push(step.stepId);
		visit(step.children, depth + 1, ids, active);
	}
}

export function assertStandingPlan(plan: StandingPlan): void {
	if (!Number.isSafeInteger(plan.version) || plan.version < 1)
		throw new RangeError("invalid plan version");
	if (
		!Number.isSafeInteger(plan.startBoundary) ||
		!Number.isSafeInteger(plan.expiryBoundary) ||
		plan.startBoundary > plan.expiryBoundary
	) {
		throw new RangeError("invalid plan boundaries");
	}
	if (
		!Number.isInteger(plan.retriesRemaining) ||
		plan.retriesRemaining < 0 ||
		plan.retriesRemaining > 3
	)
		throw new RangeError("invalid retry budget");
	if (
		!Number.isInteger(plan.replansRemaining) ||
		plan.replansRemaining < 0 ||
		plan.replansRemaining > 3
	)
		throw new RangeError("invalid replan budget");
	const ids = new Set<string>();
	const active: string[] = [];
	visit(plan.steps, 1, ids, active);
	if (!ids.has(plan.currentStepId))
		throw new Error("current plan step is absent");
	if (plan.status === "active" && active.length !== 1)
		throw new Error("active plan requires exactly one active step");
}

function updateSteps(
	steps: readonly StandingPlanStep[],
	target: string,
	status: StandingPlanStep["status"],
): readonly StandingPlanStep[] {
	return steps.map((step) => ({
		...step,
		status: step.stepId === target ? status : step.status,
		children: updateSteps(step.children, target, status),
	}));
}

export function updateStandingPlanStep(
	plan: StandingPlan,
	stepId: string,
	status: StandingPlanStep["status"],
): StandingPlan {
	const updated = {
		...plan,
		version: plan.version + 1,
		steps: updateSteps(plan.steps, stepId, status),
	};
	assertStandingPlan(updated);
	return updated;
}
