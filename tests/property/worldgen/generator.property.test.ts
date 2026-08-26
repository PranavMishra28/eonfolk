import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import {
	generateWorld,
	WORLD_GRID_HEIGHT,
	WORLD_GRID_WIDTH,
} from "../../../packages/worldgen/src/index.js";

function seedHex(bytes: Uint8Array): string {
	return [...bytes]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

function inBounds(
	point: {
		readonly xMillimeters: number;
		readonly yMillimeters: number;
		readonly elevationMillimeters: number;
	},
	bounds: {
		readonly minimum: typeof point;
		readonly maximum: typeof point;
	},
): boolean {
	return (
		point.xMillimeters >= bounds.minimum.xMillimeters &&
		point.xMillimeters <= bounds.maximum.xMillimeters &&
		point.yMillimeters >= bounds.minimum.yMillimeters &&
		point.yMillimeters <= bounds.maximum.yMillimeters &&
		point.elevationMillimeters >= bounds.minimum.elevationMillimeters &&
		point.elevationMillimeters <= bounds.maximum.elevationMillimeters
	);
}

function traversableCellsAreConnected(
	cells: readonly {
		readonly cellId: string;
		readonly gridX: number;
		readonly gridY: number;
		readonly terrain: string;
	}[],
): boolean {
	const traversable = cells.filter((cell) => cell.terrain !== "water");
	const byCoordinate = new Map(
		traversable.map((cell) => [`${cell.gridX},${cell.gridY}`, cell]),
	);
	const first = traversable[0];
	if (first === undefined) return false;
	const visited = new Set([first.cellId]);
	const queue = [first];
	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) break;
		for (const [offsetX, offsetY] of [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		] as const) {
			const neighbor = byCoordinate.get(
				`${current.gridX + offsetX},${current.gridY + offsetY}`,
			);
			if (neighbor !== undefined && !visited.has(neighbor.cellId)) {
				visited.add(neighbor.cellId);
				queue.push(neighbor);
			}
		}
	}
	return visited.size === traversable.length;
}

describe("generated-world properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";
	const seeds = fc.uint8Array({ minLength: 32, maxLength: 32 });

	it("preserves hierarchy, references, numeric bounds and traversability", async () => {
		await fc.assert(
			fc.asyncProperty(seeds, async (seedBytes) => {
				const release = await createReleaseGenesis({
					releaseId: "property-world",
					seedHex: seedHex(seedBytes),
				});
				const world = await generateWorld({ releaseGenesis: release });
				expect(await generateWorld({ releaseGenesis: release })).toEqual(world);
				const regions = Object.values(world.regions).map(
					(record) => record.value,
				);
				const territories = Object.values(world.territories).map(
					(record) => record.value,
				);
				const chunks = Object.values(world.chunks).map(
					(record) => record.value,
				);
				const cells = Object.values(world.cells).map((record) => record.value);
				const settlements = Object.values(world.settlements).map(
					(record) => record.value,
				);
				const localSpaces = Object.values(world.localSpaces).map(
					(record) => record.value,
				);

				expect(regions).toHaveLength(1);
				expect(cells).toHaveLength(WORLD_GRID_WIDTH * WORLD_GRID_HEIGHT);
				expect(new Set(cells.map((cell) => cell.cellId)).size).toBe(
					cells.length,
				);
				expect(
					regions[0]?.cellIds.every(
						(cellId) => world.cells[cellId] !== undefined,
					),
				).toBe(true);
				expect(
					regions[0]?.chunkIds.every(
						(chunkId) => world.chunks[chunkId] !== undefined,
					),
				).toBe(true);
				expect(
					regions[0]?.territoryIds.every(
						(territoryId) => world.territories[territoryId] !== undefined,
					),
				).toBe(true);
				expect(
					chunks.every(
						(chunk) =>
							world.regions[chunk.regionId] !== undefined &&
							chunk.cellIds.every(
								(cellId) =>
									world.cells[cellId]?.value.chunkId === chunk.chunkId,
							) &&
							chunk.territoryIds.every(
								(territoryId) => world.territories[territoryId] !== undefined,
							),
					),
				).toBe(true);
				expect(
					territories.every(
						(territory) =>
							world.regions[territory.regionId] !== undefined &&
							territory.cellIds.every(
								(cellId) =>
									world.cells[cellId]?.value.territoryId ===
									territory.territoryId,
							),
					),
				).toBe(true);
				expect(
					cells.every(
						(cell) =>
							Number.isSafeInteger(cell.elevationMillimeters) &&
							cell.gridX >= 0 &&
							cell.gridX < WORLD_GRID_WIDTH &&
							cell.gridY >= 0 &&
							cell.gridY < WORLD_GRID_HEIGHT &&
							[
								cell.slopeBasisPoints,
								cell.waterAvailabilityBasisPoints,
								cell.productivityBasisPoints,
								cell.timberBasisPoints,
								cell.materialBasisPoints,
								cell.travelFrictionBasisPoints,
								cell.settlementSuitabilityBasisPoints,
							].every(
								(value) =>
									Number.isSafeInteger(value) && value >= 0 && value <= 10_000,
							),
					),
				).toBe(true);
				expect(traversableCellsAreConnected(cells)).toBe(true);

				const settlement = settlements[0];
				const localSpace = localSpaces[0];
				expect(settlement).toBeDefined();
				expect(localSpace).toBeDefined();
				if (settlement === undefined || localSpace === undefined) return;
				expect(world.cells[settlement.anchorCellId]?.value.terrain).not.toBe(
					"water",
				);
				expect(settlement.localSpaceId).toBe(localSpace.localSpaceId);
				expect(world.territories[settlement.territoryId]).toBeDefined();
				expect(localSpace.settlementId).toBe(settlement.settlementId);
				expect(
					settlement.siteIds.every(
						(siteId) => world.sites[siteId] !== undefined,
					),
				).toBe(true);
				for (const siteId of localSpace.siteIds) {
					const site = world.sites[siteId]?.value;
					expect(site).toBeDefined();
					if (site === undefined) continue;
					expect(world.cells[site.cellId]).toBeDefined();
					expect(site.localSpaceId).toBe(localSpace.localSpaceId);
					expect(
						site.placeIds.every(
							(placeId) => world.places[placeId]?.value.siteId === siteId,
						),
					).toBe(true);
					expect(inBounds(site.bounds.minimum, localSpace.bounds)).toBe(true);
					expect(inBounds(site.bounds.maximum, localSpace.bounds)).toBe(true);
					for (const slotId of site.interactionSlotIds) {
						const slot = world.interactionSlots[slotId]?.value;
						expect(slot?.siteId).toBe(siteId);
						expect(
							slot === undefined ? false : inBounds(slot.position, site.bounds),
						).toBe(true);
					}
					for (const buildingId of site.buildingIds) {
						const building = world.buildings[buildingId]?.value;
						expect(building?.siteId).toBe(siteId);
						expect(
							building === undefined
								? false
								: inBounds(building.position, site.bounds),
						).toBe(true);
						expect(
							building === undefined
								? undefined
								: world.interactionSlots[building.entranceSlotId]?.value.siteId,
						).toBe(siteId);
					}
				}
				const connectedSites = new Set<string>();
				for (const routeId of localSpace.routeIds) {
					const route = world.routes[routeId]?.value;
					expect(route).toBeDefined();
					if (route === undefined) continue;
					expect(world.sites[route.fromSiteId]).toBeDefined();
					expect(world.sites[route.toSiteId]).toBeDefined();
					expect(route.distanceMillimeters).toBeGreaterThan(0);
					expect(route.travelFrictionBasisPoints).toBeLessThan(10_000);
					expect(
						route.waypoints.every((point) =>
							inBounds(point, localSpace.bounds),
						),
					).toBe(true);
					connectedSites.add(route.fromSiteId);
					connectedSites.add(route.toSiteId);
				}
				expect(connectedSites.size).toBe(localSpace.siteIds.length);
			}),
			{ numRuns: deep ? 160 : 24, seed: 0xe0f101 },
		);
	});
});
