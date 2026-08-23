import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import {
	advanceGeneratedCivilization,
	GENERATED_CIVILIZATION_CATCH_UP_HORIZONS,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";
import { MemoryVersionedPersistence } from "../../../packages/persistence/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

let world: Awaited<ReturnType<typeof generateWorld>>;

beforeAll(async () => {
	const genesis = await createReleaseGenesis({
		releaseId: "generated-persistence-property",
		seedHex: "d0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a",
	});
	world = await generateWorld({
		releaseGenesis: genesis,
		worldId: "generated-persistence-property-world",
		treatmentId: "standard-brain",
	});
});

describe("generated civilization persistence properties", () => {
	it("replays every reviewed catch-up horizon and makes exact retry a no-op", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(...GENERATED_CIVILIZATION_CATCH_UP_HORIZONS),
				async (targetHorizonDays) => {
					const port = new MemoryVersionedPersistence();
					const first = await advanceGeneratedCivilization({
						port,
						genesisWorld: world,
						targetHorizonDays,
					});
					const retry = await advanceGeneratedCivilization({
						port,
						genesisWorld: world,
						targetHorizonDays,
					});
					const replay = await replayGeneratedCivilization({
						port,
						regionId: world.identity.worldId,
					});

					expect(retry.idempotentAppends).toBe(retry.receipts.length);
					expect(replay.state.scheduler.completedDay).toBe(targetHorizonDays);
					expect(replay.stateHash).toBe(first.head.stateHash);
					expect(replay.stateHash).toBe(retry.head.stateHash);
					expect(replay.lastEventHash).toBe(first.head.lastEventHash);
				},
			),
			{ numRuns: GENERATED_CIVILIZATION_CATCH_UP_HORIZONS.length },
		);
	});
});
