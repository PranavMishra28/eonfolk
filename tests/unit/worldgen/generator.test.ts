import { describe, expect, it } from "vitest";

import {
	createReleaseGenesis,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import {
	generateWorld,
	INITIAL_SITE_COUNT,
	WORLD_CHUNK_COUNT,
	WORLD_GRID_HEIGHT,
	WORLD_GRID_WIDTH,
	WORLD_TERRITORY_COUNT,
} from "../../../packages/worldgen/src/index.js";
import {
	DIFFERENTIATION_SEEDS,
	GOLDEN_RELEASE_ID,
	GOLDEN_SEED_HEX,
	GOLDEN_WORLD_HASH,
} from "./fixtures.js";

describe("deterministic generated world", () => {
	it("matches the versioned golden hash", async () => {
		const release = await createReleaseGenesis({
			releaseId: GOLDEN_RELEASE_ID,
			seedHex: GOLDEN_SEED_HEX,
		});
		const first = await generateWorld({ releaseGenesis: release });
		const second = await generateWorld({ releaseGenesis: release });

		expect(second).toEqual(first);
		expect(await stateHash(first)).toBe(GOLDEN_WORLD_HASH);
		expect(Object.keys(first.cells)).toHaveLength(
			WORLD_GRID_WIDTH * WORLD_GRID_HEIGHT,
		);
		expect(Object.keys(first.territories)).toHaveLength(WORLD_TERRITORY_COUNT);
		expect(Object.keys(first.chunks)).toHaveLength(WORLD_CHUNK_COUNT);
		expect(Object.keys(first.sites)).toHaveLength(INITIAL_SITE_COUNT);
		expect(Object.keys(first.places)).toHaveLength(INITIAL_SITE_COUNT);
	});

	it("creates materially different valid worlds for three fixed seeds", async () => {
		const worlds = await Promise.all(
			DIFFERENTIATION_SEEDS.map(async (seedHex, index) =>
				generateWorld({
					releaseGenesis: await createReleaseGenesis({
						releaseId: `seed-${index}`,
						seedHex,
					}),
				}),
			),
		);
		const hashes = await Promise.all(worlds.map((world) => stateHash(world)));
		const terrainSignatures = worlds.map((world) =>
			Object.values(world.cells)
				.map((record) => record.value.terrain)
				.join(","),
		);
		const anchorCells = worlds.map(
			(world) => Object.values(world.settlements)[0]?.value.anchorCellId,
		);

		expect(new Set(hashes).size).toBe(3);
		expect(new Set(terrainSignatures).size).toBe(3);
		expect(new Set(anchorCells).size).toBe(3);
	});

	it("rejects a forged or unsupported Release Genesis", async () => {
		const release = await createReleaseGenesis({
			releaseId: GOLDEN_RELEASE_ID,
			seedHex: GOLDEN_SEED_HEX,
		});
		await expect(
			generateWorld({
				releaseGenesis: { ...release, genesisHash: "00".repeat(32) },
			}),
		).rejects.toThrow(/hash does not match/u);
		await expect(
			generateWorld({
				releaseGenesis: {
					...release,
					versions: { ...release.versions, generator: "future-generator" },
				},
			}),
		).rejects.toThrow(/unsupported generator/u);
	});
});
