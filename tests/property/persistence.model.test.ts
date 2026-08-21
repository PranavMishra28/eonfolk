import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { MemoryPersistence } from "../../packages/persistence/src/index.js";
import {
	genesis,
	hash,
	REGION_ID,
	RUN_ID,
	transition,
} from "../unit/persistence/fixtures.js";

describe("persistence state-machine properties", () => {
	it("matches a revision/sequence/fence model under appends, retries, and transfers", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(
					fc.record({
						eventCount: fc.integer({ min: 1, max: 4 }),
						retry: fc.boolean(),
						transferFence: fc.boolean(),
					}),
					{ minLength: 1, maxLength: 20 },
				),
				async (steps) => {
					const persistence = new MemoryPersistence();
					await persistence.commitGenesis(genesis());
					let expectedRevision = 0;
					let expectedSequence = 0;
					let expectedFence = 1;
					for (const [index, step] of steps.entries()) {
						if (step.transferFence) {
							const before = await persistence.getHead(RUN_ID, REGION_ID);
							const after = await persistence.acquireFencingToken(
								RUN_ID,
								REGION_ID,
								expectedFence,
							);
							expectedFence += 1;
							expect(after.stateHash).toBe(before.stateHash);
							expect(after.worldHeadHash).toBe(before.worldHeadHash);
						}
						const head = await persistence.getHead(RUN_ID, REGION_ID);
						const candidate = transition(head, index + 1, step.eventCount);
						const committed = await persistence.commitTransition(candidate);
						expect(committed.idempotent).toBe(false);
						expectedRevision += 1;
						expectedSequence += step.eventCount;
						if (step.retry) {
							const retried = await persistence.commitTransition(candidate);
							expect(retried.idempotent).toBe(true);
						}
					}
					const durable = await persistence.getHead(RUN_ID, REGION_ID);
					expect(durable.revision).toBe(expectedRevision);
					expect(durable.lastSequence).toBe(expectedSequence);
					expect(durable.fencingToken).toBe(expectedFence);
					expect(
						(
							await persistence.getBatchRange({
								runId: RUN_ID,
								regionId: REGION_ID,
								fromRevisionInclusive: 1,
								toRevisionExclusive: expectedRevision + 1,
							})
						).length,
					).toBe(expectedRevision);
					expect(
						(
							await persistence.getEventRange({
								runId: RUN_ID,
								regionId: REGION_ID,
								fromSequenceInclusive: 1,
								toSequenceExclusive: expectedSequence + 1,
							})
						).length,
					).toBe(expectedSequence);
				},
			),
			{ numRuns: 50, seed: 0x0e0f01 },
		);
	});

	it("never mutates canonical state for an idempotency collision", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 32 }), async (eventCount) => {
				const persistence = new MemoryPersistence();
				await persistence.commitGenesis(genesis());
				const candidate = transition(
					await persistence.getHead(RUN_ID, REGION_ID),
					1,
					eventCount,
				);
				await persistence.commitTransition(candidate);
				const before = await persistence.getHead(RUN_ID, REGION_ID);
				await expect(
					persistence.commitTransition({
						...candidate,
						receipt: {
							...candidate.receipt,
							payloadFingerprint: hash(90_000 + eventCount),
						},
					}),
				).rejects.toMatchObject({ code: "IDEMPOTENCY_COLLISION" });
				expect(await persistence.getHead(RUN_ID, REGION_ID)).toEqual(before);
			}),
			{ numRuns: 32, seed: 0x0e0f02 },
		);
	});
});
