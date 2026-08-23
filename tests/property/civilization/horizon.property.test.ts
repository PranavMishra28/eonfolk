import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	auditCivilizationState,
	runCivilizationExperiment,
} from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

function seedHex(bytes: Uint8Array): string {
	return [...bytes]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

describe("civilization long-horizon properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("preserves replay, accounting, physical prerequisites, and no-model progress", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				fc.constantFrom(30, 90, 365),
				async (seedBytes, horizonDays) => {
					const release = await createReleaseGenesis({
						releaseId: "civilization-horizon-property",
						seedHex: seedHex(seedBytes),
					});
					const world = await generateWorld({ releaseGenesis: release });
					const first = await runCivilizationExperiment({ world, horizonDays });
					const replay = await runCivilizationExperiment({
						world,
						horizonDays,
					});

					expect(jcs(replay)).toBe(jcs(first));
					expect(first.metrics.modelInvocations).toBe(0);
					expect(first.metrics.simulationTime).toBe(horizonDays * 86_400);
					expect(first.steps).toHaveLength(horizonDays);
					expect(first.steps.at(-1)?.postStateHash).toBe(first.finalStateHash);
					expect(first.metrics.invariantIssues).toEqual([]);
					const audit = auditCivilizationState(first.state);
					expect(audit.ok).toBe(true);
					expect(audit.stockTotalsByResource.grain).toBe(
						first.seedConditions.initialGrain,
					);
					expect(
						(audit.stockTotalsByResource.timber ?? 0) +
							first.metrics.consumedProjectTimber,
					).toBe(first.seedConditions.initialTimber);

					const founding = first.state.foundings["founding-second-settlement"];
					if (founding?.state === "viable") {
						expect(first.seedConditions.expansionEligible).toBe(true);
						expect(first.state.projects["project-expedition-kit"]?.state).toBe(
							"completed",
						);
						expect(
							first.state.migrations["migration-founding-party"]?.state,
						).toBe("arrived");
						expect(
							(first.state.stocks["stock-migrant-grain"]?.quantity ?? 0) >= 18,
						).toBe(true);
						expect(
							(first.state.stocks["stock-migrant-timber"]?.quantity ?? 0) >= 8,
						).toBe(true);
					}
					if (!first.seedConditions.expansionEligible && horizonDays >= 30) {
						expect(Object.keys(first.state.migrations)).toEqual([]);
						expect(Object.keys(first.state.foundings)).toEqual([]);
						expect(first.metrics.outcome).toBe("stagnation");
					}
					for (const [index, event] of first.events.entries())
						expect(event.priorEventHash).toBe(
							index === 0 ? null : first.events[index - 1]?.eventHash,
						);
				},
			),
			{
				numRuns: deep ? 40 : 12,
				seed: 0x0e0f_0301,
				interruptAfterTimeLimit: deep ? 120_000 : 30_000,
			},
		);
	});
});
