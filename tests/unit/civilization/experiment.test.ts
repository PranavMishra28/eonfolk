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
import {
	generateWorld,
	materializeFoundedSettlement,
	planTerritoryMigrationRoute,
} from "../../../packages/worldgen/src/index.js";

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
		const route = planTerritoryMigrationRoute(progressingWorld, {
			originSettlementId: progressing.originSettlementId,
			destinationTerritoryId: progressing.destination.territoryId,
		});
		expect({
			destinationCellId: route.destinationCellId,
			cellIds: route.cellIds,
			traversalUnitsByLeg: route.traversalUnitsByLeg,
			totalTraversalUnits: route.totalTraversalUnits,
		}).toEqual(progressing.route);
	});

	it("materializes a frozen canonical founding without mutating generated genesis", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-world-materialization",
		);
		const conditions = deriveCivilizationSeedConditions(world);
		const evolved = materializeFoundedSettlement(world, {
			settlementId: "settlement-test-founding",
			name: "Test Founding",
			territoryId: conditions.destination.territoryId,
			anchorCellId: conditions.route.destinationCellId,
			founderCitizenIds: ["citizen-01"],
			residentCitizenIds: ["citizen-01"],
			migrationId: "migration-test-founding",
			foundedAtSimulationTime: 86_400,
		});
		expect(Object.keys(world.settlements)).toHaveLength(1);
		expect(Object.keys(evolved.settlements)).toHaveLength(2);
		expect(evolved.settlements["settlement-test-founding"]?.provenance).toEqual(
			{
				sourceKind: "migration",
				sourceId: "migration-test-founding",
				schemaVersion: "eonfolk-world-founding-v1",
			},
		);
		expect(Object.isFrozen(evolved)).toBe(true);
		expect(Object.isFrozen(evolved.settlements)).toBe(true);
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
			"migration-traversed",
			"migration-arrived",
			"founding-viable",
			"settlement-materialized",
		]);
		for (const [index, event] of first.events.entries()) {
			expect(event.eventIndex).toBe(index);
			expect(event.priorEventHash).toBe(
				index === 0 ? null : first.events[index - 1]?.eventHash,
			);
			const { eventHash, eventId, ...eventBody } = event;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v2", eventBody),
			).toBe(eventHash);
			expect(eventId).toBe(
				`civilization-event:${index}:${eventHash.slice(0, 16)}`,
			);
		}
		for (const [index, step] of first.steps.entries()) {
			const { stepHash, ...stepBody } = step;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v2", stepBody),
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
		expect(first.metrics.materializedSettlements).toBe(1);
		expect(first.state.projects["project-expedition-kit"]?.state).toBe(
			"completed",
		);
		expect(first.state.migrations["migration-founding-party"]?.state).toBe(
			"arrived",
		);
		expect(first.state.foundings["founding-second-settlement"]?.state).toBe(
			"viable",
		);
		expect(first.state.materializedFoundings).toEqual({
			"founding-second-settlement": "settlement-second",
		});
		expect(first.state.references.settlementIds).toContain("settlement-second");
		expect(Object.keys(world.settlements)).toHaveLength(1);
		expect(Object.keys(first.world.settlements)).toHaveLength(2);
		const secondSettlement = first.world.settlements["settlement-second"];
		expect(secondSettlement?.dataClass).toBe("canonical");
		expect(secondSettlement?.provenance.sourceKind).toBe("migration");
		expect(secondSettlement?.value.territoryId).toBe(
			first.seedConditions.destination.territoryId,
		);
		expect(secondSettlement?.value.anchorCellId).toBe(
			first.seedConditions.route.destinationCellId,
		);
		expect(
			first.world.localSpaces[secondSettlement?.value.localSpaceId ?? ""],
		).toBeDefined();
		expect(
			first.world.sites[secondSettlement?.value.siteIds[0] ?? ""],
		).toBeDefined();
		const journey = first.state.migrationJourneys["migration-founding-party"];
		expect(journey?.completedTraversalUnits).toBe(
			first.seedConditions.route.totalTraversalUnits,
		);
		expect(journey?.currentLegIndex).toBe(
			first.seedConditions.route.traversalUnitsByLeg.length,
		);
		expect(first.seedConditions.route.cellIds.at(-1)).toBe(
			secondSettlement?.value.anchorCellId,
		);
		for (const [
			index,
			cellId,
		] of first.seedConditions.route.cellIds.entries()) {
			const cell = first.world.cells[cellId]?.value;
			expect(cell?.terrain).not.toBe("water");
			if (index === 0) continue;
			const prior =
				first.world.cells[first.seedConditions.route.cellIds[index - 1] ?? ""]
					?.value;
			expect(
				Math.abs((cell?.gridX ?? 0) - (prior?.gridX ?? 0)) +
					Math.abs((cell?.gridY ?? 0) - (prior?.gridY ?? 0)),
			).toBe(1);
		}
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
		expect(first.limitations.join(" ")).not.toMatch(/cannot materialize/u);
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
			"expansion-deferred",
		]);
		expect(run.metrics.outcome).toBe("stagnation");
		expect(run.metrics.outcomeReason).toContain(
			"destination-suitability-below-threshold",
		);
		expect(run.metrics.completedProjects).toBe(0);
		expect(run.metrics.arrivedMigrations).toBe(0);
		expect(run.metrics.viableFoundings).toBe(0);
		expect(run.metrics.materializedSettlements).toBe(0);
		expect(Object.keys(run.world.settlements)).toHaveLength(1);
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
		expect(progressionRuns[0]?.metrics.plannedMigrations).toBe(0);
		expect(progressionRuns[0]?.metrics.viableFoundings).toBe(1);
		expect(progressionRuns[0]?.metrics.materializedSettlements).toBe(1);
		expect(progressionRuns[1]?.metrics.viableFoundings).toBe(1);
		expect(progressionRuns[2]?.metrics.viableFoundings).toBe(1);
		expect(
			stagnationRuns.every((run) => run.metrics.outcome === "stagnation"),
		).toBe(true);
		expect(
			stagnationRuns.every((run) => run.metrics.viableFoundings === 0),
		).toBe(true);
		expect(
			stagnationRuns.every((run) => run.metrics.materializedSettlements === 0),
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

	it("schedules expansion from affordances and route work rather than an absolute day", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-no-calendar-trigger",
		);
		const firstEvaluation = await runCivilizationExperiment({
			world,
			horizonDays: 1,
		});
		expect(firstEvaluation.events.map((event) => event.kind)).toEqual([
			"project-approved",
			"project-completed",
			"migration-prepared",
			"migration-departed",
		]);
		expect(
			firstEvaluation.events.every((event) => event.simulationTime === 86_400),
		).toBe(true);
		expect(
			firstEvaluation.state.migrationJourneys["migration-founding-party"]
				?.completedTraversalUnits,
		).toBe(0);
		const completed = await runCivilizationExperiment({
			world,
			horizonDays: 30,
		});
		const arrival = completed.events.find(
			(event) => event.kind === "migration-arrived",
		);
		const migration = completed.state.migrations["migration-founding-party"];
		expect(arrival?.simulationTime).toBe(
			migration?.expectedArrivalSimulationTime,
		);
		expect(arrival?.simulationTime).toBeLessThan(30 * 86_400);
		expect(completed.metrics.materializedSettlements).toBe(1);
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
