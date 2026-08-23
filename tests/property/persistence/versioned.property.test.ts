import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	EMPTY_EVENT_HASH,
	MemoryVersionedPersistence,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	hashAuthoritativeState,
	replayAuthoritativeEvents,
	type AuthorityEventRecord,
	type JsonValue,
} from "../../../packages/persistence/src/index.js";

const SCOPE = Object.freeze({
	runId: "property-run",
	regionId: "property-region",
});
const ENGINE_VERSION = "property-engine-v1";
const STATE_SCHEMA_VERSION = "property-civilization-v1";
const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

interface PropertyState {
	readonly [key: string]: JsonValue;
	readonly value: number;
}

async function initialize(port: MemoryVersionedPersistence) {
	const state: PropertyState = { value: 0 };
	const snapshot = await createAuthoritySnapshot({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_SCHEMA_VERSION,
		snapshotId: "property-genesis",
		revision: 0,
		baseSequence: 0,
		simulationTime: 0,
		lastEventHash: EMPTY_EVENT_HASH,
		state,
	});
	const head = await createAuthorityHead({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_SCHEMA_VERSION,
		revision: 0,
		lastSequence: 0,
		simulationTime: 0,
		stateHash: snapshot.stateHash,
		lastEventHash: EMPTY_EVENT_HASH,
		fencingToken: 1,
	});
	await port.initialize({
		...SCOPE,
		schemaVersion: AUTHORITY_GENESIS_SCHEMA_VERSION,
		genesisId: "property-genesis",
		head,
		snapshot,
	});
	return snapshot;
}

describe("versioned persistence properties", () => {
	it("matches a fenced append model and replays every accepted event exactly", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(
					fc.record({
						eventCount: fc.integer({ min: 1, max: 4 }),
						retry: fc.boolean(),
						transferFence: fc.boolean(),
					}),
					{ minLength: 1, maxLength: deep ? 25 : 10 },
				),
				async (steps) => {
					const port = new MemoryVersionedPersistence();
					const snapshot = await initialize(port);
					let expectedValue = 0;
					let expectedFence = 1;
					let expectedSequence = 0;
					for (const [batchIndex, step] of steps.entries()) {
						if (step.transferFence) {
							await port.acquireWriterFence(SCOPE, expectedFence);
							expectedFence += 1;
						}
						const head = await port.loadHead(SCOPE);
						let preStateHash = head.stateHash;
						let previousEventHash = head.lastEventHash;
						const events: AuthorityEventRecord[] = [];
						for (
							let eventIndex = 0;
							eventIndex < step.eventCount;
							eventIndex += 1
						) {
							expectedValue += 1;
							const event = await createAuthorityEvent({
								...SCOPE,
								engineVersion: ENGINE_VERSION,
								stateSchemaVersion: STATE_SCHEMA_VERSION,
								appendId: `append-${batchIndex}`,
								batchId: `batch-${batchIndex}`,
								eventId: `event-${batchIndex}-${eventIndex}`,
								sequence: head.lastSequence + eventIndex + 1,
								simulationTime: batchIndex * 10 + eventIndex,
								eventType: "PropertyAdvanced",
								causalParents: [],
								visibility: { kind: "public" },
								provenance: {
									mechanismId: "property-rule-v1",
									cognitionDecisionId: null,
									brainKind: "standard",
								},
								preStateHash,
								postStateHash: await hashAuthoritativeState({
									value: expectedValue,
								}),
								previousEventHash,
								payload: { value: expectedValue },
							});
							events.push(event);
							preStateHash = event.postStateHash;
							previousEventHash = event.eventHash;
						}
						const request = {
							...SCOPE,
							schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
							appendId: `append-${batchIndex}`,
							batchId: `batch-${batchIndex}`,
							expectedRevision: head.revision,
							expectedLastSequence: head.lastSequence,
							expectedStateHash: head.stateHash,
							expectedLastEventHash: head.lastEventHash,
							fencingToken: head.fencingToken,
							events,
						} as const;
						expectedSequence += step.eventCount;
						const committed = await port.appendEventBatch(request);
						expect(committed.idempotent).toBe(false);
						if (step.retry)
							expect((await port.appendEventBatch(request)).idempotent).toBe(
								true,
							);
					}

					const head = await port.loadHead(SCOPE);
					expect(head.revision).toBe(steps.length);
					expect(head.lastSequence).toBe(expectedSequence);
					expect(head.fencingToken).toBe(expectedFence);
					const replay = await replayAuthoritativeEvents<PropertyState>(
						port,
						{
							...SCOPE,
							snapshotId: snapshot.snapshotId,
							toSequenceExclusive: expectedSequence + 1,
						},
						(_state, event) => ({
							value: (event.payload as { readonly value: number }).value,
						}),
					);
					expect(replay.state).toEqual({ value: expectedValue });
					expect(replay.stateHash).toBe(head.stateHash);
					expect(replay.lastEventHash).toBe(head.lastEventHash);
				},
			),
			{ numRuns: deep ? 500 : 50, seed: 0xe0f201 },
		);
	});

	it("never commits a batch whose chain is altered", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 1, max: 1_000_000 }),
				async (wrongValue) => {
					const port = new MemoryVersionedPersistence();
					await initialize(port);
					const head = await port.loadHead(SCOPE);
					const event = await createAuthorityEvent({
						...SCOPE,
						engineVersion: ENGINE_VERSION,
						stateSchemaVersion: STATE_SCHEMA_VERSION,
						appendId: "append-corrupt",
						batchId: "batch-corrupt",
						eventId: "event-corrupt",
						sequence: 1,
						simulationTime: 1,
						eventType: "PropertyAdvanced",
						causalParents: [],
						visibility: { kind: "public" },
						provenance: {
							mechanismId: "property-rule-v1",
							cognitionDecisionId: null,
							brainKind: "standard",
						},
						preStateHash: head.stateHash,
						postStateHash: await hashAuthoritativeState({ value: 1 }),
						previousEventHash: head.lastEventHash,
						payload: { value: 1 },
					});
					await expect(
						port.appendEventBatch({
							...SCOPE,
							schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
							appendId: event.appendId,
							batchId: event.batchId,
							expectedRevision: head.revision,
							expectedLastSequence: head.lastSequence,
							expectedStateHash: head.stateHash,
							expectedLastEventHash: head.lastEventHash,
							fencingToken: head.fencingToken,
							events: [{ ...event, payload: { value: wrongValue + 1 } }],
						}),
					).rejects.toMatchObject({ code: "STALE_STATE" });
					expect((await port.loadHead(SCOPE)).revision).toBe(0);
				},
			),
			{ numRuns: deep ? 500 : 50, seed: 0xe0f202 },
		);
	});
});
