import {
	type AppendAuthorityBatchRequest,
	type AppendAuthorityBatchResult,
	type AuthorityAppendReceipt,
	type AuthorityEventRangeRequest,
	type AuthorityEventRecord,
	type AuthorityHead,
	type AuthorityScope,
	type AuthoritySnapshotRecord,
	type InitializeAuthorityRequest,
	type InitializeAuthorityResult,
	MemoryVersionedPersistence,
	PersistenceError,
	type SaveAuthoritySnapshotRequest,
	VERSIONED_PERSISTENCE_PORT_VERSION,
	type VersionedCrashInjector,
	type VersionedPersistencePort,
} from "@eonfolk/persistence";
import { jcs } from "@eonfolk/protocol";

export const GENERATED_AUTHORITY_DATABASE_VERSION = 1;
export const GENERATED_AUTHORITY_STORES = Object.freeze({
	streams: "authorityStreams",
	operations: "authorityOperations",
	events: "authorityEvents",
	receipts: "authorityReceipts",
	snapshots: "authoritySnapshots",
} as const);

const STORE_NAMES = Object.freeze(Object.values(GENERATED_AUTHORITY_STORES));

type AuthorityOperation =
	| {
			readonly kind: "append";
			readonly ordinal: number;
			readonly request: AppendAuthorityBatchRequest;
	  }
	| {
			readonly kind: "fence";
			readonly ordinal: number;
			readonly expectedFencingToken: number;
	  }
	| {
			readonly kind: "snapshot";
			readonly ordinal: number;
			readonly request: SaveAuthoritySnapshotRequest;
	  };

interface StreamRow {
	readonly key: string;
	readonly genesis: InitializeAuthorityRequest;
	readonly head: AuthorityHead;
	readonly operationCount: number;
}

interface KeyedRow<T> {
	readonly key: string;
	readonly streamKey: string;
	readonly value: T;
}

interface StreamBundle {
	readonly stream: StreamRow;
	readonly operations: readonly AuthorityOperation[];
}

export interface BrowserVersionedPersistenceOptions {
	readonly databaseName?: string;
	readonly factory?: IDBFactory;
	readonly crashInjector?: VersionedCrashInjector;
	readonly boundaryInjector?: BrowserPersistenceBoundaryInjector;
}

export type BrowserPersistenceBoundaryPoint =
	| "open"
	| "upgrade"
	| "read"
	| "write"
	| "transaction-abort";

export interface BrowserPersistenceBoundaryInjector {
	hit(
		point: BrowserPersistenceBoundaryPoint,
		transaction?: IDBTransaction,
	): void;
}

function fail(
	code: ConstructorParameters<typeof PersistenceError>[0],
	message: string,
): never {
	throw new PersistenceError(code, message);
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function equal(left: unknown, right: unknown): boolean {
	try {
		return jcs(left) === jcs(right);
	} catch {
		return false;
	}
}

function streamKey(scope: AuthorityScope): string {
	return JSON.stringify([scope.runId, scope.regionId]);
}

function recordKey(scope: AuthorityScope, id: string | number): string {
	return JSON.stringify([scope.runId, scope.regionId, id]);
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(request.error ?? new Error("IndexedDB request failed")),
			{ once: true },
		);
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener(
			"abort",
			() =>
				reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
			{ once: true },
		);
		transaction.addEventListener(
			"error",
			() =>
				reject(transaction.error ?? new Error("IndexedDB transaction failed")),
			{ once: true },
		);
	});
}

async function openDatabase(
	factory: IDBFactory,
	name: string,
	injector?: BrowserPersistenceBoundaryInjector,
): Promise<IDBDatabase> {
	injector?.hit("open");
	const request = factory.open(name, GENERATED_AUTHORITY_DATABASE_VERSION);
	let upgradeFailure: unknown;
	request.addEventListener("upgradeneeded", () => {
		try {
			injector?.hit("upgrade");
		} catch (error) {
			upgradeFailure = error;
			request.transaction?.abort();
			return;
		}
		for (const store of STORE_NAMES) {
			if (!request.result.objectStoreNames.contains(store))
				request.result.createObjectStore(store, { keyPath: "key" });
		}
	});
	let database: IDBDatabase;
	try {
		database = await requestValue(request);
	} catch (error) {
		throw upgradeFailure ?? error;
	}
	const missing = STORE_NAMES.filter(
		(store) => !database.objectStoreNames.contains(store),
	);
	if (missing.length > 0) {
		database.close();
		fail("STALE_STATE", "missing");
	}
	return database;
}

function rowsForStream<T>(
	rows: readonly KeyedRow<T>[],
	key: string,
): readonly KeyedRow<T>[] {
	return rows.filter((row) => row.streamKey === key);
}

export class BrowserVersionedPersistence implements VersionedPersistencePort {
	readonly portVersion = VERSIONED_PERSISTENCE_PORT_VERSION;
	readonly #database: IDBDatabase;
	readonly #crashInjector: VersionedCrashInjector | undefined;
	readonly #boundaryInjector: BrowserPersistenceBoundaryInjector | undefined;

	private constructor(
		database: IDBDatabase,
		options: BrowserVersionedPersistenceOptions,
	) {
		this.#database = database;
		this.#crashInjector = options.crashInjector;
		this.#boundaryInjector = options.boundaryInjector;
	}

	static async open(
		options: BrowserVersionedPersistenceOptions = {},
	): Promise<BrowserVersionedPersistence> {
		const factory = options.factory ?? globalThis.indexedDB;
		if (factory === undefined) fail("INVALID_INPUT", "IndexedDB unavailable");
		return new BrowserVersionedPersistence(
			await openDatabase(
				factory,
				options.databaseName ?? "eonfolk-generated-authority",
				options.boundaryInjector,
			),
			options,
		);
	}

	close(): void {
		this.#database.close();
	}

	#hit(point: Parameters<VersionedCrashInjector["hit"]>[0]): void {
		this.#crashInjector?.hit(point);
	}

	async #readBundle(scope: AuthorityScope): Promise<StreamBundle> {
		this.#boundaryInjector?.hit("read");
		const key = streamKey(scope);
		const transaction = this.#database.transaction(
			[
				GENERATED_AUTHORITY_STORES.streams,
				GENERATED_AUTHORITY_STORES.operations,
			],
			"readonly",
		);
		const done = transactionDone(transaction);
		const [stream, operationRows] = await Promise.all([
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.streams).get(key),
			) as Promise<StreamRow | undefined>,
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.operations).getAll(),
			) as Promise<KeyedRow<AuthorityOperation>[]>,
		]);
		await done;
		if (stream === undefined) fail("NOT_FOUND", "stream missing");
		const operations = rowsForStream(operationRows, key)
			.map((row) => row.value)
			.sort((left, right) => left.ordinal - right.ordinal);
		if (
			operations.length !== stream.operationCount ||
			operations.some((operation, index) => operation.ordinal !== index)
		)
			fail("RANGE_GAP", "operation gap");
		return { stream: clone(stream), operations: clone(operations) };
	}

	async #hydrate(bundle: StreamBundle): Promise<MemoryVersionedPersistence> {
		const memory = new MemoryVersionedPersistence();
		await memory.initialize(bundle.stream.genesis);
		for (const operation of bundle.operations) {
			if (operation.kind === "append")
				await memory.appendEventBatch(operation.request);
			else if (operation.kind === "fence")
				await memory.acquireWriterFence(
					bundle.stream.genesis,
					operation.expectedFencingToken,
				);
			else await memory.saveSnapshot(operation.request);
		}
		const head = await memory.loadHead(bundle.stream.genesis);
		if (!equal(head, bundle.stream.head)) fail("STALE_STATE", "head mismatch");
		await this.#verifyMaterializedStores(bundle, memory);
		return memory;
	}

	async #verifyMaterializedStores(
		bundle: StreamBundle,
		memory: MemoryVersionedPersistence,
	): Promise<void> {
		const transaction = this.#database.transaction(
			[
				GENERATED_AUTHORITY_STORES.events,
				GENERATED_AUTHORITY_STORES.receipts,
				GENERATED_AUTHORITY_STORES.snapshots,
			],
			"readonly",
		);
		const done = transactionDone(transaction);
		const [eventRows, receiptRows, snapshotRows] = await Promise.all([
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.events).getAll(),
			) as Promise<KeyedRow<AuthorityEventRecord>[]>,
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.receipts).getAll(),
			) as Promise<KeyedRow<AuthorityAppendReceipt>[]>,
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.snapshots).getAll(),
			) as Promise<KeyedRow<AuthoritySnapshotRecord>[]>,
		]);
		await done;
		const key = streamKey(bundle.stream.genesis);
		const expectedEvents = bundle.operations
			.filter(
				(
					operation,
				): operation is Extract<AuthorityOperation, { kind: "append" }> =>
					operation.kind === "append",
			)
			.flatMap((operation) => operation.request.events)
			.sort((left, right) => left.sequence - right.sequence);
		const appendOperations = bundle.operations.filter(
			(
				operation,
			): operation is Extract<AuthorityOperation, { kind: "append" }> =>
				operation.kind === "append",
		);
		const expectedReceipts = await Promise.all(
			appendOperations.map(async (operation) => {
				const receipt = await memory.getAppendReceipt(
					bundle.stream.genesis,
					operation.request.appendId,
				);
				if (receipt === null) fail("RANGE_GAP", "receipt missing");
				return receipt;
			}),
		);
		const expectedSnapshots = [
			bundle.stream.genesis.snapshot,
			...bundle.operations
				.filter(
					(
						operation,
					): operation is Extract<AuthorityOperation, { kind: "snapshot" }> =>
						operation.kind === "snapshot",
				)
				.map((operation) => operation.request.snapshot),
		].sort((left, right) => left.snapshotId.localeCompare(right.snapshotId));
		const actualEvents = rowsForStream(eventRows, key)
			.map((row) => row.value)
			.sort((left, right) => left.sequence - right.sequence);
		const actualReceipts = rowsForStream(receiptRows, key)
			.map((row) => row.value)
			.sort((left, right) => left.appendId.localeCompare(right.appendId));
		expectedReceipts.sort((left, right) =>
			left.appendId.localeCompare(right.appendId),
		);
		const actualSnapshots = rowsForStream(snapshotRows, key)
			.map((row) => row.value)
			.sort((left, right) => left.snapshotId.localeCompare(right.snapshotId));
		if (
			!equal(actualEvents, expectedEvents) ||
			!equal(actualReceipts, expectedReceipts) ||
			!equal(actualSnapshots, expectedSnapshots)
		)
			fail("STALE_STATE", "materialized mismatch");
	}

	async #commitOperation(input: {
		readonly bundle: StreamBundle;
		readonly operation: AuthorityOperation;
		readonly head: AuthorityHead;
		readonly stores: readonly string[];
		readonly write: (transaction: IDBTransaction) => void;
		readonly before: Parameters<VersionedCrashInjector["hit"]>[0];
		readonly after: Parameters<VersionedCrashInjector["hit"]>[0];
	}): Promise<void> {
		this.#boundaryInjector?.hit("write");
		const key = streamKey(input.bundle.stream.genesis);
		const transaction = this.#database.transaction(
			[
				GENERATED_AUTHORITY_STORES.streams,
				GENERATED_AUTHORITY_STORES.operations,
				...input.stores,
			],
			"readwrite",
			{ durability: "strict" },
		);
		const done = transactionDone(transaction);
		try {
			this.#boundaryInjector?.hit("transaction-abort", transaction);
			const streams = transaction.objectStore(
				GENERATED_AUTHORITY_STORES.streams,
			);
			const current = (await requestValue(streams.get(key))) as
				| StreamRow
				| undefined;
			if (
				current === undefined ||
				current.head.headHash !== input.bundle.stream.head.headHash ||
				current.operationCount !== input.bundle.stream.operationCount
			)
				fail("STALE_REVISION", "head race");
			input.write(transaction);
			transaction.objectStore(GENERATED_AUTHORITY_STORES.operations).put({
				key: recordKey(input.bundle.stream.genesis, input.operation.ordinal),
				streamKey: key,
				value: clone(input.operation),
			} satisfies KeyedRow<AuthorityOperation>);
			streams.put({
				...current,
				head: clone(input.head),
				operationCount: current.operationCount + 1,
			} satisfies StreamRow);
			this.#hit(input.before);
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// The browser may already have aborted the transaction.
			}
			await done.catch(() => undefined);
			throw error;
		}
		await done;
		this.#hit(input.after);
	}

	async initialize(
		request: InitializeAuthorityRequest,
	): Promise<InitializeAuthorityResult> {
		const reference = new MemoryVersionedPersistence();
		const validated = await reference.initialize(request);
		try {
			const existingBundle = await this.#readBundle(request);
			return await (await this.#hydrate(existingBundle)).initialize(request);
		} catch (error) {
			if (!(error instanceof PersistenceError) || error.code !== "NOT_FOUND")
				throw error;
		}
		const key = streamKey(request);
		this.#boundaryInjector?.hit("write");
		const transaction = this.#database.transaction(
			[
				GENERATED_AUTHORITY_STORES.streams,
				GENERATED_AUTHORITY_STORES.snapshots,
			],
			"readwrite",
			{ durability: "strict" },
		);
		const done = transactionDone(transaction);
		try {
			this.#boundaryInjector?.hit("transaction-abort", transaction);
			const streams = transaction.objectStore(
				GENERATED_AUTHORITY_STORES.streams,
			);
			const existing = (await requestValue(streams.get(key))) as
				| StreamRow
				| undefined;
			if (existing !== undefined) fail("STALE_REVISION", "genesis race");
			streams.put({
				key,
				genesis: clone(request),
				head: clone(validated.head),
				operationCount: 0,
			} satisfies StreamRow);
			transaction.objectStore(GENERATED_AUTHORITY_STORES.snapshots).put({
				key: recordKey(request, request.snapshot.snapshotId),
				streamKey: key,
				value: clone(request.snapshot),
			} satisfies KeyedRow<AuthoritySnapshotRecord>);
			this.#hit("authority-genesis:before-commit");
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				/* already closed */
			}
			await done.catch(() => undefined);
			throw error;
		}
		await done;
		this.#hit("authority-genesis:after-commit");
		return validated;
	}

	async loadHead(scope: AuthorityScope): Promise<AuthorityHead> {
		const bundle = await this.#readBundle(scope);
		return clone(await (await this.#hydrate(bundle)).loadHead(scope));
	}

	async acquireWriterFence(
		scope: AuthorityScope,
		expectedFencingToken: number,
	): Promise<AuthorityHead> {
		const bundle = await this.#readBundle(scope);
		const next = await (await this.#hydrate(bundle)).acquireWriterFence(
			scope,
			expectedFencingToken,
		);
		await this.#commitOperation({
			bundle,
			operation: {
				kind: "fence",
				ordinal: bundle.stream.operationCount,
				expectedFencingToken,
			},
			head: next,
			stores: [],
			write: () => undefined,
			before: "authority-fence:before-commit",
			after: "authority-fence:after-commit",
		});
		return clone(next);
	}

	async appendEventBatch(
		request: AppendAuthorityBatchRequest,
	): Promise<AppendAuthorityBatchResult> {
		const bundle = await this.#readBundle(request);
		const result = await (await this.#hydrate(bundle)).appendEventBatch(
			request,
		);
		if (result.idempotent) return clone(result);
		await this.#commitOperation({
			bundle,
			operation: {
				kind: "append",
				ordinal: bundle.stream.operationCount,
				request: clone(request),
			},
			head: result.head,
			stores: [
				GENERATED_AUTHORITY_STORES.events,
				GENERATED_AUTHORITY_STORES.receipts,
			],
			write: (transaction) => {
				const events = transaction.objectStore(
					GENERATED_AUTHORITY_STORES.events,
				);
				for (const event of request.events)
					events.put({
						key: recordKey(request, event.sequence),
						streamKey: streamKey(request),
						value: clone(event),
					} satisfies KeyedRow<AuthorityEventRecord>);
				transaction.objectStore(GENERATED_AUTHORITY_STORES.receipts).put({
					key: recordKey(request, request.appendId),
					streamKey: streamKey(request),
					value: clone(result.receipt),
				} satisfies KeyedRow<AuthorityAppendReceipt>);
			},
			before: "authority-append:before-commit",
			after: "authority-append:after-commit",
		});
		return clone(result);
	}

	async getAppendReceipt(
		scope: AuthorityScope,
		appendId: string,
	): Promise<AuthorityAppendReceipt | null> {
		const bundle = await this.#readBundle(scope);
		const expected = await (await this.#hydrate(bundle)).getAppendReceipt(
			scope,
			appendId,
		);
		const transaction = this.#database.transaction(
			GENERATED_AUTHORITY_STORES.receipts,
			"readonly",
		);
		const done = transactionDone(transaction);
		const row = (await requestValue(
			transaction
				.objectStore(GENERATED_AUTHORITY_STORES.receipts)
				.get(recordKey(scope, appendId)),
		)) as KeyedRow<AuthorityAppendReceipt> | undefined;
		await done;
		if (
			(row === undefined) !== (expected === null) ||
			(row !== undefined && !equal(row.value, expected))
		)
			fail("STALE_STATE", "receipt mismatch");
		return expected === null ? null : clone(expected);
	}

	async getEventRange(
		request: AuthorityEventRangeRequest,
	): Promise<readonly AuthorityEventRecord[]> {
		const bundle = await this.#readBundle(request);
		const expected = await (await this.#hydrate(bundle)).getEventRange(request);
		const transaction = this.#database.transaction(
			GENERATED_AUTHORITY_STORES.events,
			"readonly",
		);
		const done = transactionDone(transaction);
		const rows = (await requestValue(
			transaction.objectStore(GENERATED_AUTHORITY_STORES.events).getAll(),
		)) as KeyedRow<AuthorityEventRecord>[];
		await done;
		const actual = rowsForStream(rows, streamKey(request))
			.map((row) => row.value)
			.filter(
				(event) =>
					event.sequence >= request.fromSequenceInclusive &&
					event.sequence < request.toSequenceExclusive,
			)
			.sort((left, right) => left.sequence - right.sequence);
		if (!equal(actual, expected)) fail("STALE_STATE", "event mismatch");
		return clone(actual);
	}

	async saveSnapshot(
		request: SaveAuthoritySnapshotRequest,
	): Promise<AuthoritySnapshotRecord> {
		const bundle = await this.#readBundle(request.snapshot);
		const reference = await this.#hydrate(bundle);
		let prior: AuthoritySnapshotRecord | null = null;
		try {
			prior = await reference.loadSnapshot(
				request.snapshot,
				request.snapshot.snapshotId,
			);
		} catch (error) {
			if (!(error instanceof PersistenceError) || error.code !== "NOT_FOUND")
				throw error;
		}
		const result = await reference.saveSnapshot(request);
		if (prior !== null) return clone(result);
		await this.#commitOperation({
			bundle,
			operation: {
				kind: "snapshot",
				ordinal: bundle.stream.operationCount,
				request: clone(request),
			},
			head: bundle.stream.head,
			stores: [GENERATED_AUTHORITY_STORES.snapshots],
			write: (transaction) =>
				transaction.objectStore(GENERATED_AUTHORITY_STORES.snapshots).put({
					key: recordKey(request.snapshot, request.snapshot.snapshotId),
					streamKey: streamKey(request.snapshot),
					value: clone(request.snapshot),
				} satisfies KeyedRow<AuthoritySnapshotRecord>),
			before: "authority-snapshot:before-commit",
			after: "authority-snapshot:after-commit",
		});
		return clone(result);
	}

	async loadSnapshot(
		scope: AuthorityScope,
		snapshotId: string,
	): Promise<AuthoritySnapshotRecord> {
		const bundle = await this.#readBundle(scope);
		const expected = await (await this.#hydrate(bundle)).loadSnapshot(
			scope,
			snapshotId,
		);
		const transaction = this.#database.transaction(
			GENERATED_AUTHORITY_STORES.snapshots,
			"readonly",
		);
		const done = transactionDone(transaction);
		const row = (await requestValue(
			transaction
				.objectStore(GENERATED_AUTHORITY_STORES.snapshots)
				.get(recordKey(scope, snapshotId)),
		)) as KeyedRow<AuthoritySnapshotRecord> | undefined;
		await done;
		if (row === undefined || !equal(row.value, expected))
			fail("STALE_STATE", "snapshot mismatch");
		return clone(row.value);
	}

	async loadLatestSnapshot(
		scope: AuthorityScope,
	): Promise<AuthoritySnapshotRecord> {
		const bundle = await this.#readBundle(scope);
		const expected = await (await this.#hydrate(bundle)).loadLatestSnapshot(
			scope,
		);
		return await this.loadSnapshot(scope, expected.snapshotId);
	}
}
