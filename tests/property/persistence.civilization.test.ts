import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../packages/civilization/src/index.js";
import {
	createCivilizationPersistencePlan,
	MemoryVersionedPersistence,
	persistCivilizationHistory,
	replayCivilizationHistory,
} from "../../packages/persistence/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../packages/protocol/src/index.js";
import { generateWorld } from "../../packages/worldgen/src/index.js";

function seedHex(bytes: Uint8Array): string {
	return [...bytes]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

describe("civilization persistence properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it(
		"reconstructs exact generated-world and civilization bytes without a model",
		async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uint8Array({ minLength: 32, maxLength: 32 }),
					fc.constantFrom(30, 90, 365),
					fc.integer({ min: 1, max: 4 }),
					async (seedBytes, horizonDays, rangeSize) => {
						const release = await createReleaseGenesis({
							releaseId: "persistence-civilization-property",
							seedHex: seedHex(seedBytes),
						});
						const world = await generateWorld({ releaseGenesis: release });
						const checkpoint = await runCivilizationExperiment({
							world,
							horizonDays,
						});
						const regionId = Object.keys(world.regions).sort()[0];
						if (regionId === undefined)
							throw new Error("generated region is missing");
						const input = {
							runId: `property-${release.genesisHash.slice(0, 24)}`,
							regionId,
							genesisId: `genesis-${release.genesisHash.slice(0, 24)}`,
							genesisWorld: world,
							checkpoints: [checkpoint],
							snapshotId: `snapshot-${horizonDays}`,
						} as const;
						const firstPlan = await createCivilizationPersistencePlan(input);
						const secondPlan = await createCivilizationPersistencePlan(input);
						expect(jcs(secondPlan)).toBe(jcs(firstPlan));

						const port = new MemoryVersionedPersistence();
						const persisted = await persistCivilizationHistory(port, input);
						const retry = await persistCivilizationHistory(port, input);
						expect(
							retry.receipts.map((receipt) => receipt.receiptHash),
						).toEqual(persisted.receipts.map((receipt) => receipt.receiptHash));
						const replay = await replayCivilizationHistory(port, {
							...persisted.plan.scope,
							snapshotId: persisted.plan.genesis.snapshot.snapshotId,
							toSequenceExclusive: 2,
							rangeSize,
						});
						expect(jcs(replay.state.world)).toBe(jcs(checkpoint.world));
						expect(jcs(replay.state.civilization)).toBe(jcs(checkpoint.state));
						expect(replay.state.finalExperimentStateHash).toBe(
							checkpoint.finalStateHash,
						);
						expect(replay.state.scheduler.modelInvocations).toBe(0);
						expect(replay.stateHash).toBe(persisted.head.stateHash);
					},
				),
				{ numRuns: deep ? 60 : 12, seed: 0xe0f303 },
			);
		},
		deep ? 30_000 : 15_000,
	);
});
