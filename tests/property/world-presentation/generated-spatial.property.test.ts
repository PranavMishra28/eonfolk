import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import {
	inspectGeneratedTemporalWindow,
	projectGeneratedCivilizationSpatial,
} from "../../../packages/world-presentation/src/index.js";
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
						activities: run.activities,
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
						status: "available",
						reasons: [],
					});
					expect(first.scene).toEqual(later.scene);
					expect(first.overview).toEqual(later.overview);
					expect(first.local).toEqual(later.local);
					expect(first.projects).toEqual(later.projects);
					const expectedLocalCitizens = Object.values(
						run.state.citizens,
					).filter(
						(citizen) =>
							citizen.settlementId === settlementId &&
							citizen.residenceState === "resident",
					);
					expect(first.spatial.actors).toHaveLength(
						Math.min(expectedLocalCitizens.length, 8),
					);
					expect(later.spatial.actors).toEqual(first.spatial.actors);
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

	it("accepts only monotonic canonical route samples as continuous movement", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				fc.integer({ min: 0, max: 9_998 }),
				fc.integer({ min: 1, max: 2_500 }),
				async (seedBytes, firstProgress, requestedDelta) => {
					const secondProgress = Math.min(
						9_999,
						firstProgress + requestedDelta,
					);
					fc.pre(secondProgress > firstProgress);
					const world = await generateWorld({
						releaseGenesis: await createReleaseGenesis({
							releaseId: "generated-route-property",
							seedHex: seedHex(seedBytes),
						}),
					});
					const run = await runCivilizationExperiment({
						world,
						horizonDays: 1,
					});
					const route = Object.values(run.world.routes)
						.map((record) => record.value)
						.sort((left, right) =>
							left.routeId.localeCompare(right.routeId),
						)[0];
					const citizen = Object.values(run.state.citizens).sort(
						(left, right) => left.citizenId.localeCompare(right.citizenId),
					)[0];
					if (route === undefined || citizen === undefined)
						throw new Error("generated fixture lacks route citizen");
					const civilization = {
						...run.state,
						citizens: {
							[citizen.citizenId]: {
								...citizen,
								siteId: route.fromSiteId,
							},
						},
					} as const;
					const frame = (
						progressBasisPoints: number,
						presentationTick: number,
					) =>
						projectGeneratedCivilizationSpatial({
							world: run.world,
							civilization,
							checkpoint: run,
							settlementId: run.seedConditions.originSettlementId,
							activities: [
								{
									schemaVersion:
										"eonfolk-generated-spatial-activity-v1" as const,
									citizenId: citizen.citizenId,
									canonicalAction: {
										actionId: "property-route",
										sourceKind: "current-behavior" as const,
										eventId: null,
										eventSequence: null,
										status: "in-progress" as const,
										kind: "walk" as const,
										originPlaceId: route.fromSiteId,
										destinationPlaceId: route.toSiteId,
										affordanceId: null,
										affordanceSlotIndex: null,
										targetId: null,
										simulationStart: civilization.simulationTime,
										simulationEnd: null,
										resultEventId: null,
									},
									location: {
										kind: "route" as const,
										routeId: route.routeId,
										progressBasisPoints,
									},
									projectId: null,
									carriedProp: null,
									focal: true,
								},
							],
							presentationTick,
						});
					const inspection = inspectGeneratedTemporalWindow([
						frame(firstProgress, 0),
						frame(
							secondProgress,
							Math.ceil(
								(((secondProgress - firstProgress) *
									route.distanceMillimeters) /
									10_000 /
									1_000) *
									30,
							) + 1,
						),
					]);

					expect(inspection.mismatches).toEqual([]);
					expect(inspection.teleportCount).toBe(0);
					expect(inspection.movingCitizenIds).toEqual([citizen.citizenId]);
					expect(
						inspection.traversedDistanceMmByCitizen[citizen.citizenId],
					).toBeGreaterThan(0);
				},
			),
			{ numRuns: deep ? 40 : 6 },
		);
	});
});
