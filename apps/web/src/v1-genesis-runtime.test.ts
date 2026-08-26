import { describe, expect, it } from "vitest";
import {
	loadV1GenesisExperience,
	V1_GENESIS_WORLD_ID,
} from "./v1-genesis-runtime";

describe("Release Genesis browser projection", () => {
	it("memoizes one deterministic world identity and generalized projection", async () => {
		const first = await loadV1GenesisExperience();
		const second = await loadV1GenesisExperience();

		expect(second).toBe(first);
		expect(first.overview.source.worldId).toBe(V1_GENESIS_WORLD_ID);
		expect(first.overview.source.generatedAtSimulationTime).toBe(0);
		expect(first.overview.semanticCounts).toEqual({
			regions: 1,
			chunks: 4,
			territories: 4,
			terrainCells: 64,
			settlements: 1,
		});
		expect(first.settlement.semanticCounts).toEqual({
			sites: 5,
			places: 5,
			buildings: 4,
			routes: 4,
			interactionSlots: 10,
		});
		expect(first.settlement.settlement.settlementId).toBe(
			first.overview.settlementAnchors[0]?.settlementId,
		);
	});
});
