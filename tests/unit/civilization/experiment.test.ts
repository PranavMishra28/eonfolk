import { describe, expect, it } from "vitest";
import {
	assertCivilizationInvariants,
	deriveCivilizationSeedConditions,
	runCivilizationExperiment,
	runCivilizationExperimentMatrix,
} from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	domainHash,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const PROGRESSION_SEED =
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";
const STAGNATION_SEED = "0e".padStart(64, "0");

async function generatedWorld(seedHex: string, releaseId: string) {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({ releaseId, seedHex }),
	});
}

describe("deterministic civilization experiment", () => {
	it("derives legitimate progression and stagnation from generated geography", async () => {
		const progressingWorld = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-progressing",
		);
		const stagnantWorld = await generatedWorld(
			STAGNATION_SEED,
			"civilization-stagnant",
		);
		const progressing = deriveCivilizationSeedConditions(progressingWorld);
		const stagnant = deriveCivilizationSeedConditions(stagnantWorld);

		expect(progressing.expansionEligible).toBe(true);
		expect(progressing.eligibilityReasons).toEqual([]);
		expect(stagnant.expansionEligible).toBe(false);
		expect(stagnant.eligibilityReasons).toContain(
			"destination-suitability-below-threshold",
		);
		expect(stagnant.destination.suitabilityBasisPoints).toBeLessThan(
			progressing.destination.suitabilityBasisPoints,
		);

		const sameGeography = await generatedWorld(
			STAGNATION_SEED,
			"renamed-stagnant-fixture",
		);
		expect(deriveCivilizationSeedConditions(sameGeography)).toEqual(stagnant);
	});

	it("replays a 365-day physical founding byte-for-byte with versioned hash chains", async () => {
		const world = await generatedWorld(PROGRESSION_SEED, "civilization-replay");
		const first = await runCivilizationExperiment({ world, horizonDays: 365 });
		const second = await runCivilizationExperiment({ world, horizonDays: 365 });

		expect(jcs(second)).toBe(jcs(first));
		expect(first.steps).toHaveLength(365);
		expect(first.steps[0]?.fromSimulationTime).toBe(0);
		expect(first.steps.at(-1)?.toSimulationTime).toBe(365 * 86_400);
		expect(new Set(first.steps.map((step) => step.stepHash))).toHaveLength(365);
		expect(first.finalStateHash).toBe(first.steps.at(-1)?.postStateHash);
		expect(first.events.map((event) => event.kind)).toEqual([
			"project-approved",
			"project-completed",
			"migration-prepared",
			"migration-departed",
			"migration-arrived",
			"founding-viable",
		]);
		for (const [index, event] of first.events.entries()) {
			expect(event.eventIndex).toBe(index);
			expect(event.priorEventHash).toBe(
				index === 0 ? null : first.events[index - 1]?.eventHash,
			);
			const { eventHash, eventId, ...eventBody } = event;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v1", eventBody),
			).toBe(eventHash);
			expect(eventId).toBe(
				`civilization-event:${index}:${eventHash.slice(0, 16)}`,
			);
		}
		for (const [index, step] of first.steps.entries()) {
			const { stepHash, ...stepBody } = step;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v1", stepBody),
			).toBe(stepHash);
			expect(step.stepIndex).toBe(index);
			expect(step.fromSimulationTime).toBe(index * 86_400);
			expect(step.toSimulationTime).toBe((index + 1) * 86_400);
			if (index > 0)
				expect(step.preStateHash).toBe(first.steps[index - 1]?.postStateHash);
		}
		expect(first.finalEventHash).toBe(first.events.at(-1)?.eventHash);
		expect(first.metrics.modelInvocations).toBe(0);
		expect(first.metrics.outcome).toBe("progression");
		expect(first.metrics.viableFoundings).toBe(1);
		expect(first.state.projects["project-expedition-kit"]?.state).toBe(
			"completed",
		);
		expect(first.state.migrations["migration-founding-party"]?.state).toBe(
			"arrived",
		);
		expect(first.state.foundings["founding-second-settlement"]?.state).toBe(
			"viable",
		);
		expect(
			(first.state.stocks["stock-migrant-grain"]?.quantity ?? 0) >= 18,
		).toBe(true);
		expect(
			(first.state.stocks["stock-migrant-timber"]?.quantity ?? 0) >= 8,
		).toBe(true);
		expect(first.metrics.stockTotalsByResource.grain).toBe(
			first.seedConditions.initialGrain,
		);
		expect(
			(first.metrics.stockTotalsByResource.timber ?? 0) +
				first.metrics.consumedProjectTimber,
		).toBe(first.seedConditions.initialTimber);
		expect(first.metrics.invariantIssues).toEqual([]);
		expect(first.limitations.join(" ")).toMatch(/cannot materialize/u);
		assertCivilizationInvariants(first.state);
	});

	it("leaves an unsuitable seed honestly stagnant under the same rules", async () => {
		const world = await generatedWorld(
			STAGNATION_SEED,
			"civilization-stagnation",
		);
		const run = await runCivilizationExperiment({ world, horizonDays: 365 });

		expect(run.seedConditions.expansionEligible).toBe(false);
		expect(run.events.map((event) => event.kind)).toEqual([
			"project-approved",
			"project-completed",
			"expansion-deferred",
		]);
		expect(run.metrics.outcome).toBe("stagnation");
		expect(run.metrics.outcomeReason).toContain(
			"destination-suitability-below-threshold",
		);
		expect(run.metrics.completedProjects).toBe(1);
		expect(run.metrics.arrivedMigrations).toBe(0);
		expect(run.metrics.viableFoundings).toBe(0);
		expect(Object.keys(run.state.migrations)).toEqual([]);
		expect(Object.keys(run.state.foundings)).toEqual([]);
		expect(run.metrics.invariantIssues).toEqual([]);
	});

	it("reports deterministic 30/90/365-day multi-seed metrics and prefix identity", async () => {
		const worlds = [
			await generatedWorld(PROGRESSION_SEED, "civilization-matrix-progress"),
			await generatedWorld(STAGNATION_SEED, "civilization-matrix-stagnant"),
		];
		const first = await runCivilizationExperimentMatrix({ worlds });
		const reversed = await runCivilizationExperimentMatrix({
			worlds: [...worlds].reverse(),
		});
		expect(first.matrixHash).toBe(reversed.matrixHash);
		expect(first.runs).toHaveLength(6);
		expect(new Set(first.runs.map((run) => run.horizonDays))).toEqual(
			new Set([30, 90, 365]),
		);

		const progressionRuns = first.runs
			.filter((run) => run.seedConditions.expansionEligible)
			.sort((left, right) => left.horizonDays - right.horizonDays);
		const stagnationRuns = first.runs.filter(
			(run) => !run.seedConditions.expansionEligible,
		);
		expect(progressionRuns.map((run) => run.metrics.outcome)).toEqual([
			"progression",
			"progression",
			"progression",
		]);
		expect(progressionRuns[0]?.metrics.plannedMigrations).toBe(1);
		expect(progressionRuns[0]?.metrics.viableFoundings).toBe(0);
		expect(progressionRuns[1]?.metrics.viableFoundings).toBe(1);
		expect(progressionRuns[2]?.metrics.viableFoundings).toBe(1);
		expect(
			stagnationRuns.every((run) => run.metrics.outcome === "stagnation"),
		).toBe(true);
		expect(
			stagnationRuns.every((run) => run.metrics.viableFoundings === 0),
		).toBe(true);

		const thirty = progressionRuns[0];
		const year = progressionRuns[2];
		if (thirty === undefined || year === undefined)
			throw new Error("progression horizons are incomplete");
		expect(thirty.finalStateHash).toBe(year.steps[29]?.postStateHash);
		expect(thirty.steps.map((step) => step.stepHash)).toEqual(
			year.steps.slice(0, 30).map((step) => step.stepHash),
		);
		expect(thirty.events.map((event) => event.eventHash)).toEqual(
			year.events
				.slice(0, thirty.events.length)
				.map((event) => event.eventHash),
		);
	});

	it("rejects implicit, negative, or unbounded experiment time", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-invalid-time",
		);
		for (const horizonDays of [0, -1, 1.5, 366])
			await expect(
				runCivilizationExperiment({ world, horizonDays }),
			).rejects.toThrow(/horizonDays/u);
	});
});
