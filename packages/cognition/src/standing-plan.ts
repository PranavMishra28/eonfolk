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

function orderedSteps(
	steps: readonly StandingPlanStep[],
): readonly StandingPlanStep[] {
	return steps.flatMap((step) => [step, ...orderedSteps(step.children)]);
}

function updateStepStatuses(
	steps: readonly StandingPlanStep[],
	statuses: Readonly<Record<string, StandingPlanStep["status"]>>,
): readonly StandingPlanStep[] {
	return steps.map((step) => ({
		...step,
		status: statuses[step.stepId] ?? step.status,
		children: updateStepStatuses(step.children, statuses),
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

export function advanceStandingPlan(
	plan: StandingPlan,
	completedStepId: string,
): StandingPlan {
	assertStandingPlan(plan);
	if (plan.status !== "active" || plan.currentStepId !== completedStepId) {
		throw new Error("only the active current plan step can advance");
	}
	const ordered = orderedSteps(plan.steps);
	const currentIndex = ordered.findIndex(
		(step) => step.stepId === completedStepId,
	);
	const next = ordered
		.slice(currentIndex + 1)
		.find((step) => step.status === "pending");
	const statuses: Record<string, StandingPlanStep["status"]> = {
		[completedStepId]: "completed",
	};
	if (next !== undefined) statuses[next.stepId] = "active";
	const updated: StandingPlan = {
		...plan,
		version: plan.version + 1,
		steps: updateStepStatuses(plan.steps, statuses),
		currentStepId: next?.stepId ?? completedStepId,
		status: next === undefined ? "completed" : "active",
	};
	assertStandingPlan(updated);
	return updated;
}

export function interruptStandingPlan(plan: StandingPlan): StandingPlan {
	assertStandingPlan(plan);
	if (plan.status !== "active")
		throw new Error("only an active plan can interrupt");
	const updated: StandingPlan = {
		...plan,
		version: plan.version + 1,
		steps: updateStepStatuses(plan.steps, {
			[plan.currentStepId]: "blocked",
		}),
		status: "blocked",
	};
	assertStandingPlan(updated);
	return updated;
}

export function retryStandingPlan(plan: StandingPlan): StandingPlan {
	assertStandingPlan(plan);
	if (plan.status !== "blocked" || plan.retriesRemaining < 1) {
		throw new Error("standing plan has no legal retry");
	}
	const updated: StandingPlan = {
		...plan,
		version: plan.version + 1,
		steps: updateStepStatuses(plan.steps, { [plan.currentStepId]: "active" }),
		retriesRemaining: plan.retriesRemaining - 1,
		status: "active",
	};
	assertStandingPlan(updated);
	return updated;
}

export function replanStandingPlan(
	prior: StandingPlan,
	replacement: StandingPlan,
): StandingPlan {
	assertStandingPlan(prior);
	assertStandingPlan(replacement);
	if (
		prior.status !== "blocked" ||
		prior.replansRemaining < 1 ||
		prior.planId !== replacement.planId ||
		prior.citizenId !== replacement.citizenId ||
		replacement.startBoundary < prior.startBoundary
	) {
		throw new Error("standing plan cannot be replanned with this replacement");
	}
	const updated: StandingPlan = {
		...replacement,
		version: prior.version + 1,
		retriesRemaining: prior.retriesRemaining,
		replansRemaining: prior.replansRemaining - 1,
	};
	assertStandingPlan(updated);
	return updated;
}

export function abandonStandingPlan(plan: StandingPlan): StandingPlan {
	assertStandingPlan(plan);
	if (plan.status === "completed" || plan.status === "abandoned") {
		throw new Error("terminal standing plan cannot be abandoned");
	}
	const statuses = Object.fromEntries(
		orderedSteps(plan.steps)
			.filter((step) => step.status === "active" || step.status === "pending")
			.map((step) => [step.stepId, "abandoned" as const]),
	);
	const updated: StandingPlan = {
		...plan,
		version: plan.version + 1,
		steps: updateStepStatuses(plan.steps, statuses),
		status: "abandoned",
	};
	assertStandingPlan(updated);
	return updated;
}
