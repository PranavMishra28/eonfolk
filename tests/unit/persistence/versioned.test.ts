import { describe, expect, it } from "vitest";

import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	AUTHORITY_REJECTION_SCHEMA_VERSION,
	type AuthorityEventRecord,
	type AuthorityHead,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	EMPTY_EVENT_HASH,
	hashAuthoritativeState,
	MemoryVersionedPersistence,
	PERSISTENCE_MIGRATION_POLICY,
	type PersistenceError,
	replayAuthoritativeEvents,
	type VersionedCrashPoint,
	validateAuthorityEventRecord,
} from "../../../packages/persistence/src/index.js";

const SCOPE = Object.freeze({
	runId: "run-release-genesis",
	regionId: "region-1",
});
const ENGINE_VERSION = "engine-test-v1";
const STATE_SCHEMA_VERSION = "civilization-state-v1";

type CounterState = {
	readonly count: number;
	readonly observations: readonly string[];
};

class OneShotCrash {
	point: VersionedCrashPoint | null = null;

	hit(point: VersionedCrashPoint): void {
		if (this.point === point) {
			this.point = null;
			throw new Error(`injected crash at ${point}`);
		}
	}
}

async function genesis(state: CounterState = { count: 0, observations: [] }) {
	const snapshot = await createAuthoritySnapshot({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_SCHEMA_VERSION,
		snapshotId: "snapshot-genesis",
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
	return {
		...SCOPE,
		schemaVersion: AUTHORITY_GENESIS_SCHEMA_VERSION,
		genesisId: "genesis-release",
		head,
		snapshot,
	} as const;
}

async function append(
	head: AuthorityHead,
	ordinal: number,
	counts: readonly number[],
): Promise<AppendAuthorityBatchRequest> {
	let preStateHash = head.stateHash;
	let previousEventHash = head.lastEventHash;
	const events: AuthorityEventRecord[] = [];
	for (const [index, count] of counts.entries()) {
		const postState: CounterState = {
			count,
			observations: Array.from(
				{ length: count },
				(_, item) => `fact-${item + 1}`,
			),
		};
		const event = await createAuthorityEvent({
			...SCOPE,
			engineVersion: ENGINE_VERSION,
			stateSchemaVersion: STATE_SCHEMA_VERSION,
			appendId: `append-${ordinal}`,
			batchId: `batch-${ordinal}`,
			eventId: `event-${ordinal}-${index}`,
			sequence: head.lastSequence + index + 1,
			simulationTime: ordinal * 100 + index,
			eventType: "CounterAdvanced",
			causalParents:
				events.length === 0
					? []
					: [
							{
								eventId: events.at(-1)?.eventId ?? "missing",
								relation: "direct",
								mechanismId: "counter-rule-v1",
							},
						],
			visibility: { kind: "public" },
			provenance: {
				mechanismId: "counter-rule-v1",
				cognitionDecisionId: null,
				brainKind: "standard",
			},
			preStateHash,
			postStateHash: await hashAuthoritativeState(postState),
			previousEventHash,
			payload: { count },
		});
		events.push(event);
		preStateHash = event.postStateHash;
		previousEventHash = event.eventHash;
	}
	return {
		...SCOPE,
		schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
		appendId: `append-${ordinal}`,
		batchId: `batch-${ordinal}`,
		expectedRevision: head.revision,
		expectedLastSequence: head.lastSequence,
		expectedStateHash: head.stateHash,
		expectedLastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
		events,
	};
}

function reduceCounter(
	_state: CounterState,
	event: AuthorityEventRecord,
): CounterState {
	const count = (event.payload as { readonly count: number }).count;
	return {
		count,
		observations: Array.from(
			{ length: count },
			(_, item) => `fact-${item + 1}`,
		),
	};
}

describe("MemoryVersionedPersistence", () => {
	it("publishes an exact-only version and migration contract", () => {
		expect(PERSISTENCE_MIGRATION_POLICY).toMatchObject({
			mode: "exact-only",
			portVersion: "eonfolk-persistence-port-v4",
		});
		expect(
			Object.keys(PERSISTENCE_MIGRATION_POLICY.supportedRecordVersions),
		).toEqual([
			"append",
			"appendReceipt",
			"catchUpReceipt",
			"rejection",
			"event",
			"genesis",
			"head",
			"snapshot",
		]);
	});

	it("initializes generic civilization state atomically and idempotently", async () => {
		const crash = new OneShotCrash();
		const port = new MemoryVersionedPersistence({ crashInjector: crash });
		const initial = await genesis();
		crash.point = "authority-genesis:before-commit";
		await expect(port.initialize(initial)).rejects.toThrow("injected crash");
		await expect(port.loadHead(SCOPE)).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		crash.point = "authority-genesis:after-commit";
		await expect(port.initialize(initial)).rejects.toThrow("injected crash");
		expect((await port.initialize(initial)).idempotent).toBe(true);
		await expect(
			port.initialize({ ...initial, genesisId: "different-genesis" }),
		).rejects.toMatchObject({ code: "RUN_ID_COLLISION" });
	});

	it("commits a batch atomically and recovers an exact retry after a commit crash", async () => {
		const crash = new OneShotCrash();
		const port = new MemoryVersionedPersistence({ crashInjector: crash });
		await port.initialize(await genesis());
		const request = await append(await port.loadHead(SCOPE), 1, [1, 2]);

		crash.point = "authority-append:before-commit";
		await expect(port.appendEventBatch(request)).rejects.toThrow(
			"injected crash",
		);
		expect((await port.loadHead(SCOPE)).revision).toBe(0);
		expect(await port.getAppendReceipt(SCOPE, request.appendId)).toBeNull();

		crash.point = "authority-append:after-commit";
		await expect(port.appendEventBatch(request)).rejects.toThrow(
			"injected crash",
		);
		expect((await port.loadHead(SCOPE)).revision).toBe(1);
		const retry = await port.appendEventBatch(request);
		expect(retry.idempotent).toBe(true);
		expect(retry.receipt.fromSequenceInclusive).toBe(1);
		expect(retry.receipt.toSequenceExclusive).toBe(3);
		expect(
			(
				await port.getEventRange({
					...SCOPE,
					fromSequenceInclusive: 1,
					toSequenceExclusive: 3,
				})
			).map((event) => event.sequence),
		).toEqual([1, 2]);
	});

	it("persists rejected receipts atomically without moving the world head", async () => {
		const crash = new OneShotCrash();
		const port = new MemoryVersionedPersistence({ crashInjector: crash });
		await port.initialize(await genesis());
		const head = await port.loadHead(SCOPE);
		const request = {
			...SCOPE,
			schemaVersion: AUTHORITY_REJECTION_SCHEMA_VERSION,
			appendId: "rejected-command-1",
			expectedRevision: head.revision,
			expectedLastSequence: head.lastSequence,
			expectedStateHash: head.stateHash,
			expectedLastEventHash: head.lastEventHash,
			fencingToken: head.fencingToken,
			commandReceipt: { outcome: "rejected" },
		} as const;
		crash.point = "authority-rejection:before-commit";
		await expect(port.recordRejectedCommand(request)).rejects.toThrow(
			"injected crash",
		);
		expect(await port.getAppendReceipt(SCOPE, request.appendId)).toBeNull();
		expect(await port.loadHead(SCOPE)).toEqual(head);
		crash.point = "authority-rejection:after-commit";
		await expect(port.recordRejectedCommand(request)).rejects.toThrow(
			"injected crash",
		);
		const retry = await port.recordRejectedCommand(request);
		expect(retry.idempotent).toBe(true);
		expect(retry.head).toEqual(head);
		expect(retry.receipt.fromSequenceInclusive).toBe(
			retry.receipt.toSequenceExclusive,
		);
		expect(
			await port.getEventRange({
				...SCOPE,
				fromSequenceInclusive: 1,
				toSequenceExclusive: 1,
			}),
		).toEqual([]);
	});

	it("rejects an authority record above the exact default byte cap", async () => {
		const port = new MemoryVersionedPersistence();
		await port.initialize(await genesis());
		const head = await port.loadHead(SCOPE);
		const request = await append(head, 1, [1]);
		const event = request.events[0]!;
		const { eventHash: _eventHash, ...withoutHash } = event;
		const oversized = await createAuthorityEvent({
			...withoutHash,
			payload: { padding: "x".repeat(262_144) },
		});
		await expect(
			port.appendEventBatch({ ...request, events: [oversized] }),
		).rejects.toMatchObject({ code: "STORAGE_LIMIT" });
		expect(await port.loadHead(SCOPE)).toEqual(head);
	});

	it("rejects changed retries, duplicate batches, stale writers, gaps, and corrupt records", async () => {
		const port = new MemoryVersionedPersistence();
		await port.initialize(await genesis());
		const first = await append(await port.loadHead(SCOPE), 1, [1]);
		await port.appendEventBatch(first);
		await expect(
			port.appendEventBatch({ ...first, batchId: "changed-batch" }),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_COLLISION" });

		const oldHead = await port.loadHead(SCOPE);
		const fenced = await port.acquireWriterFence(SCOPE, oldHead.fencingToken);
		const stale = await append(oldHead, 2, [2]);
		await expect(port.appendEventBatch(stale)).rejects.toMatchObject({
			code: "STALE_FENCE",
		});
		const duplicateBatch = await append(fenced, 2, [2]);
		await expect(
			port.appendEventBatch({ ...duplicateBatch, batchId: first.batchId }),
		).rejects.toMatchObject({ code: "BATCH_COLLISION" });
		await expect(
			port.getEventRange({
				...SCOPE,
				fromSequenceInclusive: 1,
				toSequenceExclusive: 3,
			}),
		).rejects.toMatchObject({ code: "RANGE_GAP" });

		const event = first.events[0];
		if (event === undefined) throw new Error("fixture event missing");
		await expect(
			validateAuthorityEventRecord({ ...event, payload: { count: 99 } }),
		).rejects.toMatchObject({ code: "STALE_STATE" });
		await expect(
			validateAuthorityEventRecord({
				...event,
				schemaVersion: "future-event-v2",
			} as unknown as AuthorityEventRecord),
		).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
	});

	it("requires exact preceding same-stream causal and related references", async () => {
		const port = new MemoryVersionedPersistence();
		await port.initialize(await genesis());
		const firstRequest = await append(await port.loadHead(SCOPE), 1, [1]);
		const first = firstRequest.events[0]!;
		const { eventHash: _firstHash, ...firstWithoutHash } = first;
		const missingParent = await createAuthorityEvent({
			...firstWithoutHash,
			causalParents: [
				{
					eventId: "missing-event",
					relation: "direct",
					mechanismId: "counter-rule-v1",
				},
			],
		});
		await expect(
			port.appendEventBatch({
				...firstRequest,
				events: [missingParent],
			}),
		).rejects.toMatchObject({ code: "RANGE_GAP" });
		await expect(
			validateAuthorityEventRecord({
				...missingParent,
				causalParents: [
					{
						eventId: "missing-event",
						relation: "allegation",
						mechanismId: "counter-rule-v1",
					},
				],
			} as unknown as AuthorityEventRecord),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
		const futureRequest = await append(await port.loadHead(SCOPE), 1, [1, 2]);
		const futureFirst = futureRequest.events[0]!;
		const { eventHash: _futureFirstHash, ...futureFirstWithoutHash } =
			futureFirst;
		const nonPrecedingParent = await createAuthorityEvent({
			...futureFirstWithoutHash,
			causalParents: [
				{
					eventId: futureRequest.events[1]!.eventId,
					relation: "trigger",
					mechanismId: "counter-rule-v1",
				},
			],
		});
		await expect(
			port.appendEventBatch({
				...futureRequest,
				events: [nonPrecedingParent, futureRequest.events[1]!],
			}),
		).rejects.toMatchObject({ code: "RANGE_GAP" });

		await port.appendEventBatch(firstRequest);
		const secondRequest = await append(await port.loadHead(SCOPE), 2, [2]);
		const second = secondRequest.events[0]!;
		const { eventHash: _secondHash, ...secondWithoutHash } = second;
		const related = await createAuthorityEvent({
			...secondWithoutHash,
			relatedEvents: [
				{ eventId: first.eventId, relation: "temporal-predecessor" },
			],
		});
		await expect(
			port.appendEventBatch({ ...secondRequest, events: [related] }),
		).resolves.toMatchObject({ head: { revision: 2 } });
	});

	it("saves only exact-head snapshots and replays without cognition", async () => {
		const port = new MemoryVersionedPersistence();
		const initial = await genesis();
		await port.initialize(initial);
		const committed = await port.appendEventBatch(
			await append(await port.loadHead(SCOPE), 1, [1, 2]),
		);
		const state: CounterState = {
			count: 2,
			observations: ["fact-1", "fact-2"],
		};
		const snapshot = await createAuthoritySnapshot({
			...SCOPE,
			engineVersion: ENGINE_VERSION,
			stateSchemaVersion: STATE_SCHEMA_VERSION,
			snapshotId: "snapshot-2",
			revision: committed.head.revision,
			baseSequence: committed.head.lastSequence,
			simulationTime: committed.head.simulationTime,
			lastEventHash: committed.head.lastEventHash,
			state,
		});
		await port.saveSnapshot({
			snapshot,
			fencingToken: committed.head.fencingToken,
		});
		expect((await port.loadLatestSnapshot(SCOPE)).snapshotId).toBe(
			"snapshot-2",
		);

		const replay = await replayAuthoritativeEvents<CounterState>(
			port,
			{
				...SCOPE,
				snapshotId: initial.snapshot.snapshotId,
				toSequenceExclusive: 3,
			},
			reduceCounter,
		);
		expect(replay.state).toEqual(state);
		expect(replay.stateHash).toBe(committed.head.stateHash);
		expect(replay.lastEventHash).toBe(committed.head.lastEventHash);
		await expect(
			replayAuthoritativeEvents<CounterState>(
				port,
				{
					...SCOPE,
					snapshotId: initial.snapshot.snapshotId,
					toSequenceExclusive: 3,
				},
				(current) => current,
			),
		).rejects.toMatchObject({ code: "STALE_STATE" });
	});

	it("recovers fenced ownership and snapshot writes at transaction boundaries", async () => {
		const crash = new OneShotCrash();
		const port = new MemoryVersionedPersistence({ crashInjector: crash });
		await port.initialize(await genesis());

		crash.point = "authority-fence:before-commit";
		await expect(port.acquireWriterFence(SCOPE, 1)).rejects.toThrow(
			"injected crash",
		);
		expect((await port.loadHead(SCOPE)).fencingToken).toBe(1);
		crash.point = "authority-fence:after-commit";
		await expect(port.acquireWriterFence(SCOPE, 1)).rejects.toThrow(
			"injected crash",
		);
		const fenced = await port.loadHead(SCOPE);
		expect(fenced.fencingToken).toBe(2);

		const snapshot = await createAuthoritySnapshot({
			...SCOPE,
			engineVersion: ENGINE_VERSION,
			stateSchemaVersion: STATE_SCHEMA_VERSION,
			snapshotId: "snapshot-current",
			revision: fenced.revision,
			baseSequence: fenced.lastSequence,
			simulationTime: fenced.simulationTime,
			lastEventHash: fenced.lastEventHash,
			state: { count: 0, observations: [] },
		});
		crash.point = "authority-snapshot:before-commit";
		await expect(
			port.saveSnapshot({ snapshot, fencingToken: fenced.fencingToken }),
		).rejects.toThrow("injected crash");
		await expect(
			port.loadSnapshot(SCOPE, snapshot.snapshotId),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		crash.point = "authority-snapshot:after-commit";
		await expect(
			port.saveSnapshot({ snapshot, fencingToken: fenced.fencingToken }),
		).rejects.toThrow("injected crash");
		expect(
			(await port.loadSnapshot(SCOPE, snapshot.snapshotId)).snapshotHash,
		).toBe(snapshot.snapshotHash);
	});

	it("clones caller state so later mutation cannot alter durable bytes", async () => {
		const mutable = { count: 0, observations: [] as string[] };
		const initial = await genesis(mutable);
		const port = new MemoryVersionedPersistence();
		await port.initialize(initial);
		mutable.observations.push("tamper");
		expect((await port.loadSnapshot(SCOPE, "snapshot-genesis")).state).toEqual({
			count: 0,
			observations: [],
		});
	});
});

describe("version failure boundary", () => {
	it("does not invoke an unsafe upcaster for a future genesis", async () => {
		const port = new MemoryVersionedPersistence();
		const initial = await genesis();
		await expect(
			port.initialize({
				...initial,
				schemaVersion: "eonfolk-authority-genesis-v2",
			} as unknown as typeof initial),
		).rejects.toEqual(
			expect.objectContaining<Partial<PersistenceError>>({
				code: "UNSUPPORTED_VERSION",
			}),
		);

		await port.initialize(initial);
		const request = await append(await port.loadHead(SCOPE), 1, [1]);
		const incompatibleEvents = await Promise.all(
			request.events.map(async (event) => {
				const {
					schemaVersion: _schemaVersion,
					eventHash: _eventHash,
					...unsigned
				} = event;
				return await createAuthorityEvent({
					...unsigned,
					stateSchemaVersion: "civilization-state-v2",
				});
			}),
		);
		await expect(
			port.appendEventBatch({ ...request, events: incompatibleEvents }),
		).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
		expect((await port.loadHead(SCOPE)).revision).toBe(0);
	});
});
