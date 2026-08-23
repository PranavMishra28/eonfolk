import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { projectGeneratedCivilizationSpatial } from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

function seedHex(bytes: Uint8Array): string {
	return [...bytes]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

describe("generated civilization spatial properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("preserves identity, grounding, determinism and presentation noninterference", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				fc.nat({ max: 1_000_000 }),
				async (seedBytes, presentationTick) => {
					const world = await generateWorld({
						releaseGenesis: await createReleaseGenesis({
							releaseId: "generated-spatial-property",
							seedHex: seedHex(seedBytes),
						}),
					});
					const run = await runCivilizationExperiment({
						world,
						horizonDays: 1,
					});
					const worldBefore = jcs(run.world);
					const civilizationBefore = jcs(run.state);
					const settlementId = run.seedConditions.originSettlementId;
					const input = {
						world: run.world,
						civilization: run.state,
						checkpoint: run,
						settlementId,
						presentationTick,
					} as const;
					const first = projectGeneratedCivilizationSpatial(input);
					const second = projectGeneratedCivilizationSpatial(input);
					const later = projectGeneratedCivilizationSpatial({
						...input,
						presentationTick: presentationTick + 1,
					});

					expect(second).toEqual(first);
					expect(first.availability).toEqual({
						status: "unavailable",
						reasons: ["canonical-activities-unavailable"],
					});
					expect(first.scene).toEqual(later.scene);
					expect(first.overview).toEqual(later.overview);
					expect(first.local).toEqual(later.local);
					expect(first.projects).toEqual(later.projects);
					expect(first.spatial.actors).toEqual([]);
					expect(later.spatial.presentationTick).toBe(presentationTick + 1);
					expect(jcs(run.world)).toBe(worldBefore);
					expect(jcs(run.state)).toBe(civilizationBefore);

					for (const building of first.local.buildings) {
						const entrance = first.scene.nodes[building.entranceSlotId];
						expect(entrance?.affordance).toBe("entrance");
						expect(entrance?.placeId).toBe(building.siteId);
					}
					for (const edge of first.scene.edges) {
						expect(first.scene.nodes[edge.fromNodeId]).toBeDefined();
						expect(first.scene.nodes[edge.toNodeId]).toBeDefined();
						expect(edge.costMm).toBeGreaterThanOrEqual(0);
					}
				},
			),
			{ numRuns: deep ? 80 : 12 },
		);
	});
});
