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

	it(
		"preserves replay, accounting, physical prerequisites, and no-model progress",
		async () => {
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
						const first = await runCivilizationExperiment({
							world,
							horizonDays,
						});
						const replay = await runCivilizationExperiment({
							world,
							horizonDays,
						});

						expect(jcs(replay)).toBe(jcs(first));
						expect(first.metrics.modelInvocations).toBe(0);
						expect(first.metrics.simulationTime).toBe(horizonDays * 86_400);
						expect(first.steps).toHaveLength(horizonDays);
						expect(first.steps.at(-1)?.postStateHash).toBe(
							first.finalStateHash,
						);
						expect(first.metrics.invariantIssues).toEqual([]);
						const audit = auditCivilizationState(first.state);
						expect(audit.ok).toBe(true);
						expect(first.metrics.completedProductionRuns).toBeGreaterThan(0);
						expect(first.metrics.consumedNeedUnits).toBeGreaterThan(0);
						expect(first.metrics.transportedResourceUnits).toBeGreaterThan(0);
						expect(first.metrics.groundedNeedOutcomes).toBeGreaterThan(0);
						expect(first.metrics.population).toBeLessThanOrEqual(8);
						expect(Object.keys(first.state.citizens)).toHaveLength(8);
						expect(
							new Set(
								Object.values(first.state.citizens).map(({ name }) => name),
							).size,
						).toBe(8);
						expect(first.state.citizens["citizen-01"]).toMatchObject({
							name: "Mara Vale",
							primaryRoleId: "expedition-steward",
							valueIds: ["stewardship", "curiosity"],
						});
						for (const entry of first.state.accounting.filter(
							(entry) => entry.kind === "transport",
						))
							expect(
								entry.stockDeltas.reduce(
									(total, delta) => total + delta.quantityDelta,
									0,
								),
							).toBe(0);

						for (const activity of first.activities) {
							const routineRoute = activity.routine.route;
							if (activity.location.kind === "route") {
								expect(routineRoute).not.toBeNull();
								const route =
									first.world.routes[activity.location.routeId]?.value;
								expect(route).toBeDefined();
								expect(routineRoute).toMatchObject({
									routeId: route?.routeId,
									fromSiteId: route?.fromSiteId,
									toSiteId: route?.toSiteId,
								});
								expect(first.state.citizens[activity.citizenId]?.siteId).toBe(
									route?.fromSiteId,
								);
								expect(activity.canonicalAction.originPlaceId).toBe(
									route?.fromSiteId,
								);
								expect(activity.canonicalAction.status).toBe("in-progress");
								expect(["walk", "carry"]).toContain(
									activity.canonicalAction.kind,
								);
								expect(
									activity.location.progressBasisPoints,
								).toBeGreaterThanOrEqual(1);
								expect(
									activity.location.progressBasisPoints,
								).toBeLessThanOrEqual(9_999);
							} else if (
								routineRoute !== null &&
								first.state.citizens[activity.citizenId]?.siteId !==
									routineRoute.fromSiteId
							) {
								expect(activity.canonicalAction.originPlaceId).toBe(
									first.state.citizens[activity.citizenId]?.siteId,
								);
								expect(activity.canonicalAction.destinationPlaceId).toBe(
									first.state.citizens[activity.citizenId]?.siteId,
								);
							}
						}

						const founding =
							first.state.foundings["founding-second-settlement"];
						if (first.seedConditions.expansionEligible) {
							expect(founding?.state).toBe("viable");
							expect(first.metrics.agreementGatedInstitutionProjects).toBe(1);
							expect(first.metrics.materializedSettlements).toBe(1);
							expect(Object.keys(first.world.settlements)).toHaveLength(2);
						}
						if (founding?.state === "viable") {
							expect(first.seedConditions.expansionEligible).toBe(true);
							expect(
								first.state.projects["project-expedition-kit"]?.state,
							).toBe("completed");
							expect(
								first.state.migrations["migration-founding-party"]?.state,
							).toBe("arrived");
							expect(
								(first.state.stocks["stock-migrant-grain"]?.quantity ?? 0) >=
									18,
							).toBe(true);
							expect(
								(first.state.stocks["stock-migrant-timber"]?.quantity ?? 0) >=
									8,
							).toBe(true);
							const journey =
								first.state.migrationJourneys["migration-founding-party"];
							expect(journey?.completedTraversalUnits).toBe(
								journey?.totalTraversalUnits,
							);
							expect(journey?.routeCellIds).toEqual(
								first.seedConditions.route.cellIds,
							);
							expect(first.state.materializedFoundings).toEqual({
								"founding-second-settlement": "settlement-second",
							});
							expect(Object.keys(first.world.settlements)).toHaveLength(2);
							expect(
								first.world.settlements["settlement-second"]?.provenance
									.sourceKind,
							).toBe("migration");
							expect(first.metrics.materializedSettlements).toBe(1);
							for (const [index, cellId] of journey?.routeCellIds.entries() ??
								[]) {
								const cell = first.world.cells[cellId]?.value;
								expect(cell?.terrain).not.toBe("water");
								if (index === 0) continue;
								const prior =
									first.world.cells[journey?.routeCellIds[index - 1] ?? ""]
										?.value;
								expect(
									Math.abs((cell?.gridX ?? 0) - (prior?.gridX ?? 0)) +
										Math.abs((cell?.gridY ?? 0) - (prior?.gridY ?? 0)),
								).toBe(1);
							}
						}
						if (!first.seedConditions.expansionEligible && horizonDays >= 30) {
							expect(first.metrics.agreementGatedInstitutionProjects).toBe(0);
							expect(Object.keys(first.state.migrations)).toEqual([]);
							expect(Object.keys(first.state.foundings)).toEqual([]);
							expect(first.metrics.outcome).toBe("stagnation");
							expect(first.metrics.materializedSettlements).toBe(0);
							expect(Object.keys(first.world.settlements)).toHaveLength(1);
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
		},
		deep ? 130_000 : 30_000,
	);
});
