import { describe, expect, it } from "vitest";
import {
	BULK_OPENING_DECISION_HORIZON_DAYS,
	bulkOpeningDecisionCount,
	FAST_OPENING_DECISION_HORIZON_DAYS,
	runCivilizationExperiment,
	runCivilizationExperimentMatrix,
} from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const PROGRESSION_SEED =
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";
const STAGNATION_SEED = "0e".padStart(64, "0");
const YEAR_OPENING_DECISION_COUNT = bulkOpeningDecisionCount(
	BULK_OPENING_DECISION_HORIZON_DAYS,
);

async function generatedWorld(seedHex: string, releaseId: string) {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({ releaseId, seedHex }),
	});
}

describe("year-horizon Standard Brain lock", () => {
	it("runs real Standard Brain openings every day of the generated year", async () => {
		expect(BULK_OPENING_DECISION_HORIZON_DAYS).toBe(365);
		expect(FAST_OPENING_DECISION_HORIZON_DAYS).toBe(90);
		expect(YEAR_OPENING_DECISION_COUNT).toBe(365 * 8);
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-year-opening-horizon",
		);
		const ninety = await runCivilizationExperiment({
			world,
			horizonDays: FAST_OPENING_DECISION_HORIZON_DAYS,
		});
		const year = await runCivilizationExperiment({
			world,
			horizonDays: BULK_OPENING_DECISION_HORIZON_DAYS,
		});
		const replay = await runCivilizationExperiment({
			world,
			horizonDays: BULK_OPENING_DECISION_HORIZON_DAYS,
		});
		expect(year.metrics.standardBrainDecisionCount).toBe(
			YEAR_OPENING_DECISION_COUNT,
		);
		expect(year.cognitionDecisions).toHaveLength(YEAR_OPENING_DECISION_COUNT);
		expect(
			year.cognitionDecisions.every(
				({ modelInvocations }) => modelInvocations === 0,
			),
		).toBe(true);
		expect(year.steps).toHaveLength(365);
		expect(ninety.finalStateHash).toBe(year.steps[89]?.postStateHash);
		expect(year.state.projects["project-citizen-06-water-reserve"]?.state).toBe(
			"completed",
		);
		expect(year.state.projects["project-citizen-05-grain-reserve"]?.state).toBe(
			"completed",
		);
		expect(jcs(replay)).toBe(jcs(year));
		const routedCarrier = year.activities.find(
			(activity) => activity.location.kind === "route",
		);
		expect(routedCarrier).toBeDefined();
		expect(routedCarrier?.routine.kind).toBe("transport");
	}, 120_000);

	it("keeps 30/90/365 prefix identity when the year actually thinks", async () => {
		const worlds = [
			await generatedWorld(
				PROGRESSION_SEED,
				"civilization-year-matrix-progress",
			),
			await generatedWorld(
				STAGNATION_SEED,
				"civilization-year-matrix-stagnant",
			),
		];
		const first = await runCivilizationExperimentMatrix({ worlds });
		const reversed = await runCivilizationExperimentMatrix({
			worlds: [...worlds].reverse(),
		});
		expect(first.matrixHash).toBe(reversed.matrixHash);
		expect(first.runs).toHaveLength(6);
		const progressionRuns = first.runs
			.filter((run) => run.seedConditions.expansionEligible)
			.sort((left, right) => left.horizonDays - right.horizonDays);
		const thirty = progressionRuns[0];
		const ninety = progressionRuns[1];
		const year = progressionRuns[2];
		if (thirty === undefined || ninety === undefined || year === undefined)
			throw new Error("progression horizons are incomplete");
		expect(year.metrics.standardBrainDecisionCount).toBe(
			YEAR_OPENING_DECISION_COUNT,
		);
		expect(thirty.finalStateHash).toBe(year.steps[29]?.postStateHash);
		expect(ninety.finalStateHash).toBe(year.steps[89]?.postStateHash);
		expect(ninety.steps.map((step) => step.stepHash)).toEqual(
			year.steps.slice(0, 90).map((step) => step.stepHash),
		);
		expect(year.state.projects["project-citizen-06-water-reserve"]?.state).toBe(
			"completed",
		);
		expect(year.state.projects["project-citizen-05-grain-reserve"]?.state).toBe(
			"completed",
		);
	}, 180_000);
});
