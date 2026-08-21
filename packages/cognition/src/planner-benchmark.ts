import { domainHash } from "../../protocol/src/index.js";

export const FROZEN_PLANNER_BENCHMARK_VERSION =
	"riverhold-planner-benchmark-v1" as const;

export type FrozenPlannerBenchmarkCase =
	| {
			readonly caseId: string;
			readonly kind: "factor";
			readonly trust: "low" | "high";
			readonly evidence: "low" | "high";
			readonly commitment: "absent" | "present";
			readonly counsel: "none" | "verify-reserve" | "accuse-publicly";
			readonly plan: "active" | "blocked";
	  }
	| {
			readonly caseId: string;
			readonly kind: "blocked-replan";
			readonly ordinal: number;
	  }
	| {
			readonly caseId: string;
			readonly kind: "urgent";
			readonly ordinal: number;
	  }
	| {
			readonly caseId: string;
			readonly kind: "hidden-pair";
			readonly pairId: string;
			readonly variant: "a" | "b";
	  };

export interface PlannerBenchmarkObservation {
	readonly caseId: string;
	readonly legal: boolean;
	readonly byteDeterministic: boolean;
	readonly hiddenEquivalent: boolean;
	readonly goalCompleted: boolean;
	readonly planSignature: string | null;
	readonly planDepth: number | null;
	readonly expandedNodes: number | null;
	readonly generatedNodes: number | null;
	readonly proposalBytes: number;
	readonly latencyMicros: number;
}

export interface FrozenPlannerBenchmarkReport {
	readonly benchmarkVersion: typeof FROZEN_PLANNER_BENCHMARK_VERSION;
	readonly disposition: "reject-candidate" | "defer-no-candidate";
	readonly eligible: false;
	readonly reason: "candidate-promotion-disabled" | "candidate-not-run";
	readonly caseCount: 64;
	readonly baselineGoalCompletions: null;
	readonly candidateGoalCompletions: null;
	readonly candidateGoalImprovement: null;
	readonly candidateDistinctPlans: number | null;
	readonly candidateMedianMicros: number | null;
	readonly candidateP95Micros: number | null;
	readonly candidateWorstMicros: number | null;
}

function freezeCase<T extends FrozenPlannerBenchmarkCase>(value: T): T {
	return Object.freeze(value);
}

function buildFrozenCases(): readonly FrozenPlannerBenchmarkCase[] {
	const result: FrozenPlannerBenchmarkCase[] = [];
	for (const trust of ["low", "high"] as const) {
		for (const evidence of ["low", "high"] as const) {
			for (const commitment of ["absent", "present"] as const) {
				for (const counsel of [
					"none",
					"verify-reserve",
					"accuse-publicly",
				] as const) {
					for (const plan of ["active", "blocked"] as const) {
						result.push(
							freezeCase({
								caseId: `factor-${trust}-${evidence}-${commitment}-${counsel}-${plan}`,
								kind: "factor",
								trust,
								evidence,
								commitment,
								counsel,
								plan,
							}),
						);
					}
				}
			}
		}
	}
	for (let ordinal = 1; ordinal <= 8; ordinal += 1) {
		result.push(
			freezeCase({
				caseId: `blocked-replan-${ordinal.toString().padStart(2, "0")}`,
				kind: "blocked-replan",
				ordinal,
			}),
		);
	}
	for (let ordinal = 1; ordinal <= 4; ordinal += 1) {
		result.push(
			freezeCase({
				caseId: `urgent-${ordinal.toString().padStart(2, "0")}`,
				kind: "urgent",
				ordinal,
			}),
		);
	}
	for (const pairId of ["hidden-01", "hidden-02"] as const) {
		for (const variant of ["a", "b"] as const) {
			result.push(
				freezeCase({
					caseId: `${pairId}-${variant}`,
					kind: "hidden-pair",
					pairId,
					variant,
				}),
			);
		}
	}
	if (result.length !== 64)
		throw new Error("frozen benchmark must have 64 cases");
	return Object.freeze(result);
}

export const FROZEN_PLANNER_BENCHMARK_CASES = buildFrozenCases();

export function frozenPlannerBenchmarkCorpusHash(): Promise<string> {
	return domainHash("EONFOLK:PLANNER-BENCHMARK-CORPUS:v1", {
		benchmarkVersion: FROZEN_PLANNER_BENCHMARK_VERSION,
		cases: FROZEN_PLANNER_BENCHMARK_CASES,
	});
}

function assertCompleteObservations(
	label: string,
	observations: readonly PlannerBenchmarkObservation[],
): void {
	if (observations.length !== FROZEN_PLANNER_BENCHMARK_CASES.length)
		throw new Error(`${label} observations must cover all frozen cases`);
	const expectedIds = FROZEN_PLANNER_BENCHMARK_CASES.map(
		(benchmarkCase) => benchmarkCase.caseId,
	).sort();
	const actualIds = observations
		.map((observation) => observation.caseId)
		.sort();
	if (new Set(actualIds).size !== actualIds.length)
		throw new Error(`${label} observations contain duplicate cases`);
	if (actualIds.some((caseId, index) => caseId !== expectedIds[index]))
		throw new Error(`${label} observations do not match frozen cases`);
	for (const observation of observations) {
		if (
			!Number.isSafeInteger(observation.latencyMicros) ||
			observation.latencyMicros < 0
		)
			throw new RangeError(`${label} latency must be a nonnegative integer`);
		if (
			!Number.isSafeInteger(observation.proposalBytes) ||
			observation.proposalBytes < 1
		)
			throw new RangeError(
				`${label} proposal bytes must be a positive integer`,
			);
		for (const [field, value] of [
			["planDepth", observation.planDepth],
			["expandedNodes", observation.expandedNodes],
			["generatedNodes", observation.generatedNodes],
		] as const) {
			if (value !== null && (!Number.isSafeInteger(value) || value < 0))
				throw new RangeError(`${label} ${field} must be null or nonnegative`);
		}
	}
}

function percentile(values: readonly number[], quantile: number): number {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(sorted.length * quantile) - 1]!;
}

export function evaluateFrozenPlannerBenchmark(input: {
	readonly baseline: readonly PlannerBenchmarkObservation[];
	readonly candidate?: readonly PlannerBenchmarkObservation[];
}): FrozenPlannerBenchmarkReport {
	assertCompleteObservations("baseline", input.baseline);
	if (input.candidate === undefined) {
		return Object.freeze({
			benchmarkVersion: FROZEN_PLANNER_BENCHMARK_VERSION,
			disposition: "defer-no-candidate",
			eligible: false,
			reason: "candidate-not-run",
			caseCount: 64,
			baselineGoalCompletions: null,
			candidateGoalCompletions: null,
			candidateGoalImprovement: null,
			candidateDistinctPlans: null,
			candidateMedianMicros: null,
			candidateP95Micros: null,
			candidateWorstMicros: null,
		});
	}
	assertCompleteObservations("candidate", input.candidate);
	// Promotion is intentionally disabled. The current observations include
	// caller-reported goal/safety/search fields and therefore are useful only as
	// smoke diagnostics. A later trusted runner must bind frozen context/catalog/
	// oracle bytes and derive terminal outcomes before this can promote anything.
	const candidateDistinctPlans = new Set(
		input.candidate
			.map((observation) => observation.planSignature)
			.filter((value): value is string => value !== null),
	).size;
	const candidateMedianMicros = percentile(
		input.candidate.map((observation) => observation.latencyMicros),
		0.5,
	);
	const candidateP95Micros = percentile(
		input.candidate.map((observation) => observation.latencyMicros),
		0.95,
	);
	const candidateWorstMicros = Math.max(
		...input.candidate.map((observation) => observation.latencyMicros),
	);
	return Object.freeze({
		benchmarkVersion: FROZEN_PLANNER_BENCHMARK_VERSION,
		disposition: "reject-candidate",
		eligible: false,
		reason: "candidate-promotion-disabled",
		caseCount: 64,
		baselineGoalCompletions: null,
		candidateGoalCompletions: null,
		candidateGoalImprovement: null,
		candidateDistinctPlans,
		candidateMedianMicros,
		candidateP95Micros,
		candidateWorstMicros,
	});
}
