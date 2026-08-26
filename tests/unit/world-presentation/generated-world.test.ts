import { describe, expect, it } from "vitest";

import {
	createReleaseGenesis,
	jcs,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import {
	projectGeneratedSettlementLocal,
	projectGeneratedWorldOverview,
} from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const SEEDS = [
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f",
	"102030405060708090a0b0c0d0e0f000112233445566778899aabbccddeeff00",
	"ffeeddccbbaa9988776655443322110000f0e0d0c0b0a0908070605040302010",
] as const;

function compareIds(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values: readonly string[]): readonly string[] {
	return [...values].sort(compareIds);
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null || Object.isFrozen(value))
		return value;
	for (const child of Object.values(value)) deepFreeze(child);
	return Object.freeze(value);
}

async function generatedWorld(seedHex: string = SEEDS[0], ordinal = 0) {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: `presentation-${ordinal}`,
			seedHex,
		}),
	});
}

describe("generated-world presentation projection", () => {
	it("is deterministic, deeply immutable, and leaves canonical input bytes and hash unchanged", async () => {
		const world = await generatedWorld();
		const bytesBefore = jcs(world);
		const hashBefore = await stateHash(world);
		deepFreeze(world);
		const settlementId = Object.keys(world.settlements)[0];
		if (settlementId === undefined)
			throw new Error("missing generated settlement");

		const firstOverview = projectGeneratedWorldOverview(world);
		const firstLocal = projectGeneratedSettlementLocal(world, settlementId);
		const secondOverview = projectGeneratedWorldOverview(world);
		const secondLocal = projectGeneratedSettlementLocal(world, settlementId);

		expect(secondOverview).toEqual(firstOverview);
		expect(secondLocal).toEqual(firstLocal);
		expect(jcs(world)).toBe(bytesBefore);
		expect(await stateHash(world)).toBe(hashBefore);
		expect(Object.isFrozen(firstOverview)).toBe(true);
		expect(Object.isFrozen(firstOverview.terrainCells)).toBe(true);
		expect(Object.isFrozen(firstOverview.terrainCells[0])).toBe(true);
		expect(
			Object.isFrozen(firstOverview.cameraTargets.regions[0]?.position),
		).toBe(true);
		expect(Object.isFrozen(firstLocal)).toBe(true);
		expect(Object.isFrozen(firstLocal.localSpace.bounds.minimum)).toBe(true);
		expect(Object.isFrozen(firstLocal.routes[0]?.waypoints)).toBe(true);
		expect(Object.isFrozen(firstLocal.cameraTargets.follow)).toBe(true);
	});

	it("preserves every generated reference with stable inspectable ordering", async () => {
		const world = await generatedWorld();
		const overview = projectGeneratedWorldOverview(world);
		const settlementRecord = Object.values(world.settlements)[0];
		if (settlementRecord === undefined)
			throw new Error("missing generated settlement");
		const settlement = settlementRecord.value;
		const local = projectGeneratedSettlementLocal(
			world,
			settlement.settlementId,
		);

		expect(overview.terrainCells.map((cell) => cell.cellId)).toEqual(
			sorted(Object.keys(world.cells)),
		);
		expect(overview.chunks.map((chunk) => chunk.chunkId)).toEqual(
			sorted(Object.keys(world.chunks)),
		);
		expect(
			overview.territories.map((territory) => territory.territoryId),
		).toEqual(sorted(Object.keys(world.territories)));
		for (const chunk of overview.chunks) {
			expect(chunk.cellIds).toEqual(
				sorted(world.chunks[chunk.chunkId]?.value.cellIds ?? []),
			);
			expect(chunk.territoryIds).toEqual(
				sorted(world.chunks[chunk.chunkId]?.value.territoryIds ?? []),
			);
		}
		for (const territory of overview.territories) {
			expect(territory.cellIds).toEqual(
				sorted(world.territories[territory.territoryId]?.value.cellIds ?? []),
			);
		}
		for (const cell of overview.terrainCells) {
			const canonical = world.cells[cell.cellId]?.value;
			expect(cell.regionId).toBe(canonical?.regionId);
			expect(cell.chunkId).toBe(canonical?.chunkId);
			expect(cell.territoryId).toBe(canonical?.territoryId);
		}

		expect(local.settlement.anchorCellId).toBe(settlement.anchorCellId);
		expect(local.settlement.territoryId).toBe(settlement.territoryId);
		expect(local.settlement.siteIds).toEqual(sorted(settlement.siteIds));
		expect(local.localSpace.siteIds).toEqual(
			sorted(world.localSpaces[settlement.localSpaceId]?.value.siteIds ?? []),
		);
		expect(local.localSpace.routeIds).toEqual(
			sorted(world.localSpaces[settlement.localSpaceId]?.value.routeIds ?? []),
		);
		for (const site of local.sites) {
			const canonical = world.sites[site.siteId]?.value;
			expect(canonical).toBeDefined();
			expect(site.placeIds).toEqual(sorted(canonical?.placeIds ?? []));
			expect(site.buildingIds).toEqual(sorted(canonical?.buildingIds ?? []));
			expect(site.interactionSlotIds).toEqual(
				sorted(canonical?.interactionSlotIds ?? []),
			);
		}
		for (const route of local.routes) {
			const canonical = world.routes[route.routeId]?.value;
			expect(route.fromSiteId).toBe(canonical?.fromSiteId);
			expect(route.toSiteId).toBe(canonical?.toSiteId);
			expect(route.waypoints).toEqual(canonical?.waypoints);
		}
		for (const place of local.places) {
			const canonical = world.places[place.placeId]?.value;
			expect(place.siteId).toBe(canonical?.siteId);
			expect(place.interactionSlotIds).toEqual(
				sorted(canonical?.interactionSlotIds ?? []),
			);
		}
		for (const building of local.buildings) {
			const canonical = world.buildings[building.buildingId]?.value;
			expect(building.siteId).toBe(canonical?.siteId);
			expect(building.entranceSlotId).toBe(canonical?.entranceSlotId);
		}
		for (const slot of local.interactionSlots) {
			const canonical = world.interactionSlots[slot.interactionSlotId]?.value;
			expect(slot.siteId).toBe(canonical?.siteId);
			expect(slot.activityKinds).toEqual(
				sorted(canonical?.activityKinds ?? []),
			);
		}

		const overviewEntities = [
			...overview.regions,
			...overview.chunks,
			...overview.territories,
			...overview.terrainCells,
			...overview.settlementAnchors,
		];
		const localEntities = [
			local.settlement,
			local.localSpace,
			...local.sites,
			...local.places,
			...local.buildings,
			...local.routes,
			...local.interactionSlots,
		];
		for (const entity of [...overviewEntities, ...localEntities]) {
			expect(entity.inspectableId.length).toBeGreaterThan(0);
			expect(entity.semanticLabel.length).toBeGreaterThan(0);
		}

		expect(
			overview.cameraTargets.regions.every(
				(target) => target.kind === "region",
			),
		).toBe(true);
		expect(
			overview.cameraTargets.settlements.every(
				(target) => target.kind === "settlement",
			),
		).toBe(true);
		expect(local.cameraTargets.settlement.kind).toBe("settlement");
		expect(
			local.cameraTargets.follow.every((target) => target.kind === "follow"),
		).toBe(true);
		const expectedFollowIds = sorted([
			...local.sites.map((entity) => entity.siteId),
			...local.places.map((entity) => entity.placeId),
			...local.buildings.map((entity) => entity.buildingId),
			...local.routes.map((entity) => entity.routeId),
			...local.interactionSlots.map((entity) => entity.interactionSlotId),
		]);
		expect(
			sorted(local.cameraTargets.follow.map((target) => target.targetId)),
		).toEqual(expectedFollowIds);
	});

	it("projects three generated seeds into materially different semantic worlds", async () => {
		const worlds = await Promise.all(
			SEEDS.map((seedHex, index) => generatedWorld(seedHex, index)),
		);
		const projections = worlds.map(projectGeneratedWorldOverview);
		const semanticSignatures = projections.map((projection) =>
			[...projection.terrainCells]
				.sort(
					(left, right) => left.gridY - right.gridY || left.gridX - right.gridX,
				)
				.map(
					(cell) =>
						`${cell.gridX}:${cell.gridY}:${cell.terrain}:${cell.elevationMillimeters}`,
				)
				.join("|"),
		);
		const anchorSignatures = projections.map((projection) => {
			const anchor = projection.settlementAnchors[0];
			return `${anchor?.name}:${anchor?.gridX}:${anchor?.gridY}`;
		});

		expect(new Set(projections.map((projection) => jcs(projection))).size).toBe(
			3,
		);
		expect(new Set(semanticSignatures).size).toBe(3);
		expect(new Set(anchorSignatures).size).toBe(3);
	});

	it("reports semantic counts that match the referenced canonical entities", async () => {
		const world = await generatedWorld();
		const overview = projectGeneratedWorldOverview(world);
		const settlement = Object.values(world.settlements)[0]?.value;
		if (settlement === undefined)
			throw new Error("missing generated settlement");
		const local = projectGeneratedSettlementLocal(
			world,
			settlement.settlementId,
		);
		const localSpace = world.localSpaces[settlement.localSpaceId]?.value;
		if (localSpace === undefined)
			throw new Error("missing generated local space");
		const sites = settlement.siteIds.map(
			(siteId) => world.sites[siteId]?.value,
		);
		const placeIds = new Set(sites.flatMap((site) => site?.placeIds ?? []));
		const buildingIds = new Set(
			sites.flatMap((site) => site?.buildingIds ?? []),
		);
		const slotIds = new Set(
			sites.flatMap((site) => site?.interactionSlotIds ?? []),
		);

		expect(overview.semanticCounts).toEqual({
			regions: Object.keys(world.regions).length,
			chunks: Object.keys(world.chunks).length,
			territories: Object.keys(world.territories).length,
			terrainCells: Object.keys(world.cells).length,
			settlements: Object.keys(world.settlements).length,
		});
		expect(local.semanticCounts).toEqual({
			sites: settlement.siteIds.length,
			places: placeIds.size,
			buildings: buildingIds.size,
			routes: localSpace.routeIds.length,
			interactionSlots: slotIds.size,
		});
	});
});
