import { describe, expect, it } from "vitest";
import {
	evaluateFrozenPlannerBenchmark,
	FROZEN_PLANNER_BENCHMARK_CASES,
	frozenPlannerBenchmarkCorpusHash,
	type FrozenPlannerBenchmarkCase,
	type PlannerBenchmarkObservation,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import {
	catalogHash,
	contextHash,
	type DecisionContext,
	jcs,
	seedPrng,
	type StandingPlan,
} from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

function counselFor(
	benchmarkCase: FrozenPlannerBenchmarkCase,
): "verify-reserve" | "accuse-publicly" | null {
	if (benchmarkCase.kind !== "factor") return null;
	return benchmarkCase.counsel === "none" ? null : benchmarkCase.counsel;
}

function blockPlan(plan: StandingPlan): StandingPlan {
	const blockSteps = (steps: StandingPlan["steps"]): StandingPlan["steps"] =>
		steps.map((step) => ({
			...step,
			status: step.status === "active" ? ("blocked" as const) : step.status,
			children: blockSteps(step.children),
		}));
	return { ...plan, status: "blocked", steps: blockSteps(plan.steps) };
}

async function rebuildContext(
	context: DecisionContext,
	options: {
		readonly blocked?: boolean;
		readonly soleAction?: "VerifyReserve" | "AccusePublicly";
	},
): Promise<DecisionContext> {
	const actionCatalog = context.actionCatalog.filter(
		(entry) =>
			(options.blocked !== true ||
				entry.action.kind !== "FollowStandingPlan") &&
			(options.soleAction === undefined ||
				entry.action.kind === options.soleAction),
	);
	const digest = await catalogHash({
		version: context.actionCatalogVersion,
		entries: actionCatalog,
	});
	const {
		contextHash: _contextHash,
		catalogHash: _catalogHash,
		...withoutDigests
	} = context;
	const withoutHash = {
		...withoutDigests,
		activeStandingPlan:
			options.blocked === true
				? blockPlan(context.activeStandingPlan)
				: context.activeStandingPlan,
		actionCatalog,
		catalogHash: digest,
	};
	return {
		...withoutHash,
		contextHash: await contextHash(withoutHash),
	};
}

async function contextFor(benchmarkCase: FrozenPlannerBenchmarkCase) {
	if (benchmarkCase.kind === "factor") {
		const fixture = await riverholdDecisionFixture({
			counselIntent: counselFor(benchmarkCase),
			trust: benchmarkCase.trust === "low" ? 500 : 9_000,
			evidenceConfidence: benchmarkCase.evidence === "low" ? 1_000 : 9_000,
			removeCommitment: benchmarkCase.commitment === "absent",
		});
		return rebuildContext(fixture.context, {
			blocked: benchmarkCase.plan === "blocked",
		});
	}
	if (benchmarkCase.kind === "blocked-replan") {
		const fixture = await riverholdDecisionFixture({
			counselIntent:
				benchmarkCase.ordinal % 3 === 0
					? "accuse-publicly"
					: benchmarkCase.ordinal % 2 === 0
						? "verify-reserve"
						: null,
			trust: benchmarkCase.ordinal % 2 === 0 ? 9_000 : 500,
			evidenceConfidence: benchmarkCase.ordinal <= 4 ? 1_000 : 9_000,
			removeCommitment: benchmarkCase.ordinal % 4 === 0,
		});
		return rebuildContext(fixture.context, { blocked: true });
	}
	if (benchmarkCase.kind === "urgent") {
		const soleAction =
			benchmarkCase.ordinal % 2 === 0 ? "AccusePublicly" : "VerifyReserve";
		const fixture = await riverholdDecisionFixture({
			counselIntent:
				soleAction === "VerifyReserve" ? "verify-reserve" : "accuse-publicly",
			trust: benchmarkCase.ordinal <= 2 ? 500 : 9_000,
			evidenceConfidence: 9_000,
		});
		return rebuildContext(fixture.context, { soleAction });
	}
	const fixture = await riverholdDecisionFixture({
		counselIntent: null,
		trust: benchmarkCase.pairId === "hidden-01" ? 500 : 9_000,
		evidenceConfidence: benchmarkCase.pairId === "hidden-01" ? 1_000 : 9_000,
		hiddenSecret:
			benchmarkCase.variant === "a"
				? "Private hypothesis A."
				: "Private hypothesis B.",
	});
	return fixture.context;
}

function stableCaseKey(benchmarkCase: FrozenPlannerBenchmarkCase): string {
	return benchmarkCase.kind === "hidden-pair"
		? benchmarkCase.pairId
		: benchmarkCase.caseId;
}

async function observeBaseline(): Promise<{
	readonly observations: readonly PlannerBenchmarkObservation[];
	readonly contexts: Readonly<Record<string, string>>;
	readonly proposals: Readonly<Record<string, string>>;
}> {
	const observations: PlannerBenchmarkObservation[] = [];
	const contexts: Record<string, string> = {};
	const proposals: Record<string, string> = {};
	for (const benchmarkCase of FROZEN_PLANNER_BENCHMARK_CASES) {
		const context = await contextFor(benchmarkCase);
		const key = stableCaseKey(benchmarkCase);
		const prngState = await seedPrng(
			new Uint8Array(32).fill(7),
			"planner-benchmark-v1",
			context.actorId,
			key,
		);
		const proposalBytes: string[] = [];
		let legal = true;
		const started = performance.now();
		for (let repetition = 0; repetition < 5; repetition += 1) {
			const result = await standardBrain(context, {
				proposalId: `proposal-${key}`,
				prngState,
			});
			proposalBytes.push(jcs(result.proposal));
			legal =
				legal &&
				(await validateIntentProposal(context, result.proposal)) === "accepted";
		}
		const latencyMicros = Math.max(
			0,
			Math.round(((performance.now() - started) * 1_000) / 5),
		);
		contexts[benchmarkCase.caseId] = jcs(context);
		proposals[benchmarkCase.caseId] = proposalBytes[0]!;
		observations.push({
			caseId: benchmarkCase.caseId,
			legal,
			byteDeterministic: proposalBytes.every(
				(bytes) => bytes === proposalBytes[0],
			),
			hiddenEquivalent: true,
			goalCompleted:
				benchmarkCase.kind === "factor" || benchmarkCase.kind === "hidden-pair",
			planSignature: null,
			planDepth: null,
			expandedNodes: null,
			generatedNodes: null,
			proposalBytes: new TextEncoder().encode(proposalBytes[0]!).byteLength,
			latencyMicros,
		});
	}
	return { observations, contexts, proposals };
}

describe("frozen 64-context Planner Brain benchmark", () => {
	it("freezes the predeclared 48+8+4+4 corpus", async () => {
		expect(FROZEN_PLANNER_BENCHMARK_CASES).toHaveLength(64);
		expect(
			new Set(FROZEN_PLANNER_BENCHMARK_CASES.map(({ caseId }) => caseId)).size,
		).toBe(64);
		expect(
			FROZEN_PLANNER_BENCHMARK_CASES.filter(({ kind }) => kind === "factor"),
		).toHaveLength(48);
		expect(
			FROZEN_PLANNER_BENCHMARK_CASES.filter(
				({ kind }) => kind === "blocked-replan",
			),
		).toHaveLength(8);
		expect(
			FROZEN_PLANNER_BENCHMARK_CASES.filter(({ kind }) => kind === "urgent"),
		).toHaveLength(4);
		expect(
			FROZEN_PLANNER_BENCHMARK_CASES.filter(
				({ kind }) => kind === "hidden-pair",
			),
		).toHaveLength(4);
		expect(Object.isFrozen(FROZEN_PLANNER_BENCHMARK_CASES)).toBe(true);
		expect(await frozenPlannerBenchmarkCorpusHash()).toBe(
			"cb1713b932e1a848a264ac3fcf7788b42ce281a17306887ebf39e2beeb965596",
		);
	});

	it("keeps Standard Brain legal, repeatable, and hidden-fact isolated", async () => {
		const baseline = await observeBaseline();
		expect(baseline.observations.every(({ legal }) => legal)).toBe(true);
		expect(
			baseline.observations.every(({ byteDeterministic }) => byteDeterministic),
		).toBe(true);
		for (const pairId of ["hidden-01", "hidden-02"] as const) {
			expect(baseline.contexts[`${pairId}-a`]).toBe(
				baseline.contexts[`${pairId}-b`],
			);
			expect(baseline.proposals[`${pairId}-a`]).toBe(
				baseline.proposals[`${pairId}-b`],
			);
		}
		const report = evaluateFrozenPlannerBenchmark({
			baseline: baseline.observations,
		});
		expect(report).toMatchObject({
			disposition: "defer-no-candidate",
			eligible: false,
			reason: "candidate-not-run",
			caseCount: 64,
			baselineGoalCompletions: 52,
			candidateGoalCompletions: null,
		});

		const gateFixture = baseline.observations.map((observation, index) => ({
			...observation,
			goalCompleted: true,
			planSignature: `plan-${index % 4}`,
			planDepth: 1,
			expandedNodes: 8,
			generatedNodes: 16,
			latencyMicros: 900,
		}));
		expect(
			evaluateFrozenPlannerBenchmark({
				baseline: baseline.observations,
				candidate: gateFixture,
			}),
		).toMatchObject({
			disposition: "promote-candidate",
			eligible: true,
			candidateGoalImprovement: 12,
			candidateDistinctPlans: 4,
			candidateMedianMicros: 900,
		});
		expect(
			evaluateFrozenPlannerBenchmark({
				baseline: baseline.observations,
				candidate: gateFixture.map((observation, index) =>
					index === 0
						? { ...observation, goalCompleted: false, expandedNodes: 65 }
						: observation,
				),
			}),
		).toMatchObject({
			disposition: "reject-candidate",
			eligible: false,
		});
	});
});
