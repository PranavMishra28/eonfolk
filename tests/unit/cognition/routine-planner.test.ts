import { describe, expect, it } from "vitest";
import {
	abandonStandingPlan,
	advanceStandingPlan,
	assertStandingPlan,
	interruptStandingPlan,
	originateProjectFromStandingPlan,
	type PlanningAffordance,
	planProjectWork,
	planRoutine,
	replanStandingPlan,
	retryStandingPlan,
} from "../../../packages/cognition/src/index.js";
import type { ProjectState } from "../../../packages/protocol/src/index.js";

const effects = {
	gathered: "stock:timber:available",
	delivered: "project:hall:timber-delivered",
	milestone: "project:hall:milestone:frame",
};

function affordances(): readonly PlanningAffordance[] {
	return [
		{
			actionId: "work-frame",
			action: {
				kind: "WorkProject",
				projectId: "hall",
				milestoneId: "frame",
				siteId: "site-hall",
			},
			estimatedDurationSeconds: 3_600,
			energyCost: 500,
			requiredVisibleRecordIds: ["record-project-approved"],
			prerequisiteActionIds: ["deliver-timber"],
			effectCodes: [effects.milestone],
			targetIds: ["hall", "frame"],
			interruptible: true,
		},
		{
			actionId: "gather-timber",
			action: { kind: "Gather", resource: "wood", siteId: "site-forest" },
			estimatedDurationSeconds: 1_800,
			energyCost: 300,
			requiredVisibleRecordIds: ["record-timber-known"],
			prerequisiteActionIds: [],
			effectCodes: [effects.gathered],
			targetIds: ["site-forest"],
			interruptible: true,
		},
		{
			actionId: "deliver-timber",
			action: {
				kind: "TransportResource",
				resourceTypeId: "timber",
				quantity: 4_000,
				fromStorageId: "storage-household",
				toStorageId: "storage-project-hall",
			},
			estimatedDurationSeconds: 900,
			energyCost: 100,
			requiredVisibleRecordIds: ["record-project-approved"],
			prerequisiteActionIds: ["gather-timber"],
			effectCodes: [effects.delivered],
			targetIds: ["hall"],
			interruptible: true,
		},
	];
}

function project(state: ProjectState["state"] = "approved"): ProjectState {
	return {
		projectId: "hall",
		kind: "construction",
		name: "Common hall",
		settlementId: "settlement-origin",
		siteId: "site-hall",
		sponsor: { kind: "institution", institutionId: "assembly" },
		state,
		dependencyProjectIds: [],
		milestones: [
			{
				milestoneId: "frame",
				name: "Raise frame",
				dependencyMilestoneIds: [],
				resources: [
					{
						resourceTypeId: "timber",
						quantity: 4_000,
						deliveredQuantity: 0,
						consumedQuantity: 0,
					},
				],
				labor: [
					{
						capabilityId: "building",
						requiredLaborSeconds: 3_600,
						completedLaborSeconds: 0,
					},
				],
				progressBasisPoints: 0,
				state: "ready",
			},
		],
		participantCitizenIds: [],
		storageId: "storage-project-hall",
		startedAtSimulationTime: null,
		endedAtSimulationTime: null,
		failureReason: null,
		sourceEventIds: ["event-project-approved"],
	};
}

const records = [
	{ recordId: "record-project-approved", effectCodes: [] },
	{ recordId: "record-timber-known", effectCodes: [] },
];

describe("bounded routine and project planning", () => {
	it("builds a deterministic multi-step plan from visible legal affordances", () => {
		const input = {
			planId: "plan-hall-frame",
			citizenId: "citizen-builder",
			boundary: 600,
			visibleRecords: records,
			affordances: affordances(),
			goal: {
				goalType: "advance-project",
				desiredEffectCodes: [effects.milestone],
				targetIds: ["hall"],
				commitmentId: "agreement-build-hall",
				maximumSteps: 4,
				expiryBoundary: 90_000,
			},
			maximumExpansions: 64,
		} as const;
		const first = planRoutine(input);
		const reordered = planRoutine({
			...input,
			affordances: [...input.affordances].reverse(),
			visibleRecords: [...input.visibleRecords].reverse(),
		});

		expect(first).toEqual(reordered);
		expect(first.steps.map(({ kind }) => kind)).toEqual([
			"Gather",
			"TransportResource",
			"WorkProject",
		]);
		expect(first.steps.map(({ status }) => status)).toEqual([
			"active",
			"pending",
			"pending",
		]);
		expect(first.commitmentId).toBe("agreement-build-hall");
	});

	it("cannot use an affordance whose supporting fact is not visible", () => {
		expect(() =>
			planRoutine({
				planId: "plan-hidden",
				citizenId: "citizen-builder",
				boundary: 0,
				visibleRecords: records.filter(
					({ recordId }) => recordId !== "record-timber-known",
				),
				affordances: affordances(),
				goal: {
					goalType: "advance-project",
					desiredEffectCodes: [effects.milestone],
					targetIds: ["hall"],
					commitmentId: null,
					maximumSteps: 4,
					expiryBoundary: 86_400,
				},
				maximumExpansions: 64,
			}),
		).toThrow("ACTION_UNAVAILABLE");
	});

	it("fails closed when the bounded search budget cannot reach the goal", () => {
		expect(() =>
			planRoutine({
				planId: "plan-budget",
				citizenId: "citizen-builder",
				boundary: 0,
				visibleRecords: records,
				affordances: affordances(),
				goal: {
					goalType: "advance-project",
					desiredEffectCodes: [effects.milestone],
					targetIds: ["hall"],
					commitmentId: null,
					maximumSteps: 4,
					expiryBoundary: 86_400,
				},
				maximumExpansions: 1,
			}),
		).toThrow("ACTION_UNAVAILABLE");
	});

	it("plans only the active visible milestone for the named project", () => {
		const plan = planProjectWork({
			planId: "plan-project-wrapper",
			actorId: "citizen-builder",
			boundary: 3_600,
			project: project(),
			visibleRecords: records,
			legalAffordances: [
				...affordances(),
				{
					...affordances()[0]!,
					actionId: "work-other-project",
					action: {
						kind: "WorkProject" as const,
						projectId: "other",
						milestoneId: "frame",
						siteId: "site-other",
					},
				},
			],
			commitmentId: "agreement-build-hall",
		});

		expect(plan.targetIds).toEqual(["hall", "frame"]);
		expect(plan.steps.at(-1)?.kind).toBe("WorkProject");
	});

	it.each(["completed", "failed", "abandoned"] as const)(
		"refuses to plan a %s project",
		(state) => {
			expect(() =>
				planProjectWork({
					planId: "plan-terminal",
					actorId: "citizen-builder",
					boundary: 0,
					project: project(state),
					visibleRecords: records,
					legalAffordances: affordances(),
					commitmentId: null,
				}),
			).toThrow("ACTION_UNAVAILABLE");
		},
	);

	it("advances, interrupts, retries, replans, and abandons with bounded budgets", () => {
		const makePlan = (boundary = 600) =>
			planRoutine({
				planId: "plan-lifecycle",
				citizenId: "citizen-builder",
				boundary,
				visibleRecords: records,
				affordances: affordances(),
				goal: {
					goalType: "advance-project",
					desiredEffectCodes: [effects.milestone],
					targetIds: ["hall"],
					commitmentId: "agreement-build-hall",
					maximumSteps: 4,
					expiryBoundary: boundary + 86_400,
				},
				maximumExpansions: 64,
			});
		const initial = makePlan();
		const advanced = advanceStandingPlan(initial, initial.currentStepId);
		expect(advanced.steps.map(({ status }) => status)).toEqual([
			"completed",
			"active",
			"pending",
		]);
		const interrupted = interruptStandingPlan(advanced);
		expect(interrupted.status).toBe("blocked");
		const retried = retryStandingPlan(interrupted);
		expect(retried.status).toBe("active");
		expect(retried.retriesRemaining).toBe(0);
		const blockedAgain = interruptStandingPlan(retried);
		expect(() => retryStandingPlan(blockedAgain)).toThrow(/no legal retry/u);

		const replacement = makePlan(1_200);
		const replanned = replanStandingPlan(blockedAgain, replacement);
		expect(replanned.version).toBe(blockedAgain.version + 1);
		expect(replanned.replansRemaining).toBe(0);
		const abandoned = abandonStandingPlan(replanned);
		expect(abandoned.status).toBe("abandoned");
		expect(
			abandoned.steps.every(
				(step) => step.status === "abandoned" || step.status === "completed",
			),
		).toBe(true);
	});

	it("rejects multiple active steps before lifecycle mutation", () => {
		const initial = planRoutine({
			planId: "plan-invalid-active",
			citizenId: "citizen-builder",
			boundary: 0,
			visibleRecords: records,
			affordances: affordances(),
			goal: {
				goalType: "advance-project",
				desiredEffectCodes: [effects.milestone],
				targetIds: ["hall"],
				commitmentId: null,
				maximumSteps: 4,
				expiryBoundary: 86_400,
			},
			maximumExpansions: 64,
		});
		const invalid = {
			...initial,
			steps: initial.steps.map((step) => ({
				...step,
				status: "active" as const,
			})),
		};
		expect(() => assertStandingPlan(invalid)).toThrow(
			/active plan requires exactly one active step/u,
		);
	});
});

describe("citizen project origination from standing plan", () => {
	it("names a water-reserve project from a transport plan and water need", () => {
		const originated = originateProjectFromStandingPlan({
			citizenId: "citizen-06",
			goalType: "routine:transport",
			settlementId: "settlement-dawnmere",
			siteId: "site-work",
			visibleNeedRecordId: "memory:citizen-06:water-reserve",
		});
		expect(originated).toEqual({
			projectId: "project-citizen-06-water-reserve",
			projectKind: "water-reserve",
			projectName: "water-reserve",
			settlementId: "settlement-dawnmere",
			siteId: "site-work",
			evidenceRecordIds: ["memory:citizen-06:water-reserve"],
			sourceGoalType: "routine:transport",
		});
	});

	it("refuses a title when the standing plan or water need is missing", () => {
		expect(
			originateProjectFromStandingPlan({
				citizenId: "citizen-06",
				goalType: "routine:produce",
				settlementId: "settlement-dawnmere",
				siteId: "site-work",
				visibleNeedRecordId: "memory:citizen-06:water-reserve",
			}),
		).toBeNull();
		expect(
			originateProjectFromStandingPlan({
				citizenId: "citizen-06",
				goalType: "routine:transport",
				settlementId: "settlement-dawnmere",
				siteId: "site-work",
				visibleNeedRecordId: null,
			}),
		).toBeNull();
		expect(
			originateProjectFromStandingPlan({
				citizenId: "citizen-06",
				goalType: "routine:transport",
				settlementId: "settlement-dawnmere",
				siteId: "site-work",
				visibleNeedRecordId: "memory:citizen-06:random-title",
			}),
		).toBeNull();
	});
});
