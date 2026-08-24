import { describe, expect, it } from "vitest";
import {
	buildGeneratedWorldExperience,
	GENERATED_WORLD_HORIZON_DAYS,
	GENERATED_WORLD_STORAGE_KEY,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";
import { V1_GENESIS_WORLD_ID } from "./v1-genesis-runtime";

describe("canonical generated-world browser experience", () => {
	it("memoizes one identity-bound 365-day civilization", async () => {
		const first = await loadGeneratedWorldExperience();
		const second = await loadGeneratedWorldExperience();

		expect(second).toBe(first);
		expect(first.worldId).toBe(V1_GENESIS_WORLD_ID);
		expect(first.horizonDays).toBe(GENERATED_WORLD_HORIZON_DAYS);
		expect(first.simulationTime).toBe(GENERATED_WORLD_HORIZON_DAYS * 86_400);
		expect(first.worldIdentityHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.stateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousStateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousStateHash).not.toBe(first.stateHash);
		expect(first.previousHorizonDays).toBe(1);
		expect(first.persistence).toEqual({
			kind: "unavailable",
			claim: "admitted-deterministic-view",
			failureCode: "INDEXEDDB_UNAVAILABLE",
			restored: false,
			catchUpReceipts: 0,
		});
		expect(GENERATED_WORLD_STORAGE_KEY).toBe("eonfolk-generated-authority-v5");
	});

	it("refreshes from the immutable default base without changing admitted authority", async () => {
		const first = await loadGeneratedWorldExperience();
		const refreshed = await refreshGeneratedWorldExperience();

		expect(refreshed).not.toBe(first);
		expect(refreshed).toEqual(first);
	});

	it("projects every actual resident exactly once across founded settlements", async () => {
		const experience = await buildGeneratedWorldExperience();
		const actors = experience.projections.flatMap(
			(projection) => projection.spatial.actors,
		);

		expect(experience.population).toBe(8);
		expect(experience.settlementCount).toBe(2);
		expect(actors).toHaveLength(8);
		expect(new Set(actors.map(({ citizenId }) => citizenId)).size).toBe(8);
		expect(
			experience.projections.map(({ spatial }) => spatial.actors.length).sort(),
		).toEqual([1, 7]);
		const foundingTimes = experience.projections.map(
			({ local }) => local.settlement.foundedAtSimulationTime,
		);
		expect(foundingTimes[0]).toBe(0);
		expect(foundingTimes[1]).toBeGreaterThan(0);
		expect(foundingTimes[1]).toBeLessThanOrEqual(experience.simulationTime);
		expect(
			experience.projections.every(
				({ availability }) => availability.status === "available",
			),
		).toBe(true);
		expect(experience.embodiments).toHaveLength(2);
		expect(experience.embodiments.flatMap(({ actors }) => actors)).toHaveLength(
			8,
		);
		expect(
			experience.embodiments.every(
				(embodiment, index) =>
					embodiment.settlementId ===
						experience.projections[index]?.local.settlement.settlementId &&
					embodiment.source.stateHash === experience.stateHash,
			),
		).toBe(true);
	});

	it("degrades a production IndexedDB SecurityError without exposing its detail", async () => {
		const factory = {
			open: () => {
				throw new DOMException("secret browser denial", "SecurityError");
			},
		} as unknown as IDBFactory;
		const experience = await buildGeneratedWorldExperience({
			indexedDbFactory: factory,
		});
		expect(experience.persistence).toEqual({
			kind: "unavailable",
			claim: "admitted-deterministic-view",
			failureCode: "SecurityError",
			restored: false,
			catchUpReceipts: 0,
		});
		expect(JSON.stringify(experience)).not.toContain("secret browser denial");
	});

	it("exposes only scheduler-owned actions and grounded settlement sources", async () => {
		const experience = await buildGeneratedWorldExperience();

		for (const projection of experience.projections) {
			expect(projection.spatial.source.runId).toBe(experience.worldId);
			expect(projection.spatial.source.stateHash).toBe(experience.stateHash);
			expect(projection.spatial.contradictionCount).toBe(0);
			expect(projection.spatial.teleportCount).toBe(0);
			for (const actor of projection.spatial.actors) {
				expect(actor.action.sourceKind).toBe("current-behavior");
				expect(actor.action.status).toBe("in-progress");
				expect(actor.action.eventId).toBeNull();
				expect(
					projection.local.sites.some(
						({ siteId }) => siteId === actor.action.destinationPlaceId,
					),
				).toBe(true);
			}
		}
		for (const embodiment of experience.embodiments)
			for (const actor of embodiment.actors) {
				const projected = experience.projections
					.flatMap(({ spatial }) => spatial.actors)
					.find(({ citizenId }) => citizenId === actor.citizenId);
				expect(projected?.action.actionId).toBe(actor.actionId);
				expect(projected?.positionMm).toEqual(actor.positionMm);
			}
	});
});
