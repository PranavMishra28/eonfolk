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
	type RecordRejectedAuthorityCommandRequest,
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
			readonly kind: "rejection";
			readonly ordinal: number;
			readonly request: RecordRejectedAuthorityCommandRequest;
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
	readonly events: readonly AuthorityEventRecord[];
	readonly receipts: readonly AuthorityAppendReceipt[];
	readonly snapshots: readonly AuthoritySnapshotRecord[];
}

type MutableStreamBundle = {
	-readonly [Key in keyof StreamBundle]: StreamBundle[Key] extends readonly (infer Item)[]
		? Item[]
		: StreamBundle[Key];
};

interface StoredRows {
	readonly stream: StreamRow | undefined;
	readonly operations: readonly KeyedRow<AuthorityOperation>[];
	readonly events: readonly KeyedRow<AuthorityEventRecord>[];
	readonly receipts: readonly KeyedRow<AuthorityAppendReceipt>[];
	readonly snapshots: readonly KeyedRow<AuthoritySnapshotRecord>[];
}

type ValidatedAuthoritySession = [StreamBundle, MemoryVersionedPersistence];

interface CommitOperationInput {
	readonly bundle: StreamBundle;
	readonly operation: AuthorityOperation;
	readonly head: AuthorityHead;
	readonly write: (transaction: IDBTransaction) => void;
	readonly before: Parameters<VersionedCrashInjector["hit"]>[0];
	readonly after: Parameters<VersionedCrashInjector["hit"]>[0];
	readonly receipt?: AuthorityAppendReceipt;
}

export interface BrowserVersionedPersistenceOptions {
	readonly databaseName?: string;
	readonly factory?: IDBFactory | undefined;
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

function tuple(value: unknown): readonly unknown[] | null {
	if (typeof value !== "string") return null;
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function targetsScope(parts: readonly unknown[] | null, scope: AuthorityScope) {
	return parts?.[0] === scope.runId && parts[1] === scope.regionId;
}

function streamRowForScope(
	rows: readonly unknown[],
	scope: AuthorityScope,
): StreamRow | undefined {
	const expectedKey = streamKey(scope);
	let result: StreamRow | undefined;
	for (const raw of rows) {
		const row = raw as Partial<StreamRow>;
		const parts = tuple(row?.key);
		const genesis = row?.genesis as Partial<AuthorityScope> | null | undefined;
		const genesisTargets =
			genesis?.runId === scope.runId && genesis.regionId === scope.regionId;
		if (
			!targetsScope(parts, scope) &&
			row?.key !== expectedKey &&
			!genesisTargets
		)
			continue;
		if (
			row.key !== expectedKey ||
			result !== undefined ||
			typeof row.operationCount !== "number" ||
			!Number.isSafeInteger(row.operationCount) ||
			row.operationCount < 0 ||
			typeof row.genesis !== "object" ||
			row.genesis === null ||
			row.genesis.runId !== scope.runId ||
			row.genesis.regionId !== scope.regionId
		)
			fail("STALE_STATE", "stream identity mismatch");
		result = row as StreamRow;
	}
	return result;
}

function rowsForScope<T>(
	rows: readonly unknown[],
	scope: AuthorityScope,
	idField: "ordinal" | "sequence" | "appendId" | "snapshotId",
): readonly KeyedRow<T>[] {
	const expectedStreamKey = streamKey(scope);
	const result: KeyedRow<T>[] = [];
	const identities = new Set<string>();
	for (const raw of rows) {
		const row = raw as Partial<KeyedRow<unknown>>;
		const keyParts = tuple(row?.key);
		const streamParts = tuple(row?.streamKey);
		if (
			!targetsScope(keyParts, scope) &&
			!targetsScope(streamParts, scope) &&
			row?.streamKey !== expectedStreamKey
		)
			continue;
		const id = keyParts?.[2];
		const value = row?.value as Record<string, unknown> | null;
		const numericId =
			typeof id === "number" && Number.isSafeInteger(id) && id >= 0;
		const validId =
			idField === "ordinal"
				? numericId
				: idField === "sequence"
					? numericId && id > 0
					: typeof id === "string" && id.length > 0;
		const identity = `${typeof id}:${String(id)}`;
		if (
			!validId ||
			row.key !== recordKey(scope, id as string | number) ||
			row.streamKey !== expectedStreamKey ||
			typeof value !== "object" ||
			value === null ||
			value[idField] !== id ||
			identities.has(identity)
		)
			fail("STALE_STATE", "record identity mismatch");
		identities.add(identity);
		result.push(row as KeyedRow<T>);
	}
	return result;
}

async function storedRows(
	transaction: IDBTransaction,
	scope: AuthorityScope,
): Promise<StoredRows> {
	const [exactStream, streams, operations, events, receipts, snapshots] =
		(await Promise.all([
			requestValue(
				transaction
					.objectStore(GENERATED_AUTHORITY_STORES.streams)
					.get(streamKey(scope)),
			),
			requestValue(
				transaction.objectStore(GENERATED_AUTHORITY_STORES.streams).getAll(),
			),
			...STORE_NAMES.slice(1).map((store) =>
				requestValue(transaction.objectStore(store).getAll()),
			),
		])) as [
			unknown | undefined,
			unknown[],
			unknown[],
			unknown[],
			unknown[],
			unknown[],
		];
	const stream = streamRowForScope(streams, scope);
	if (
		(exactStream === undefined) !== (stream === undefined) ||
		(exactStream !== undefined && !equal(exactStream, stream))
	)
		fail("STALE_STATE", "stream lookup mismatch");
	return {
		stream,
		operations: rowsForScope<AuthorityOperation>(operations, scope, "ordinal"),
		events: rowsForScope<AuthorityEventRecord>(events, scope, "sequence"),
		receipts: rowsForScope<AuthorityAppendReceipt>(receipts, scope, "appendId"),
		snapshots: rowsForScope<AuthoritySnapshotRecord>(
			snapshots,
			scope,
			"snapshotId",
		),
	};
}

function materializedValues(stored: StoredRows): Omit<StreamBundle, "stream"> {
	return {
		operations: stored.operations
			.map((row) => row.value)
			.sort((left, right) => left.ordinal - right.ordinal),
		events: stored.events
			.map((row) => row.value)
			.sort((left, right) => left.sequence - right.sequence),
		receipts: stored.receipts
			.map((row) => row.value)
			.sort((left, right) => left.appendId.localeCompare(right.appendId)),
		snapshots: stored.snapshots
			.map((row) => row.value)
			.sort((left, right) => left.snapshotId.localeCompare(right.snapshotId)),
	};
}

export class BrowserVersionedPersistence implements VersionedPersistencePort {
	readonly portVersion = VERSIONED_PERSISTENCE_PORT_VERSION;
	readonly #database: IDBDatabase;
	readonly #crashInjector: VersionedCrashInjector | undefined;
	readonly #boundaryInjector: BrowserPersistenceBoundaryInjector | undefined;
	#validatedSession: ValidatedAuthoritySession | null = null;

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
		if (this.#validatedSession !== null)
			fail("INVALID_INPUT", "validated authority session still active");
		this.#database.close();
	}

	#hit(point: Parameters<VersionedCrashInjector["hit"]>[0]): void {
		this.#crashInjector?.hit(point);
	}

	async #readBundle(scope: AuthorityScope): Promise<StreamBundle> {
		this.#boundaryInjector?.hit("read");
		const transaction = this.#database.transaction(STORE_NAMES, "readonly");
		const done = transactionDone(transaction);
		const stored = await storedRows(transaction, scope);
		await done;
		if (stored.stream === undefined) {
			if (
				stored.operations.length > 0 ||
				stored.events.length > 0 ||
				stored.receipts.length > 0 ||
				stored.snapshots.length > 0
			)
				fail("STALE_STATE", "orphaned authority material");
			fail("NOT_FOUND", "stream missing");
		}
		const materialized = materializedValues(stored);
		if (
			materialized.operations.length !== stored.stream.operationCount ||
			materialized.operations.some(
				(operation, index) => operation.ordinal !== index,
			)
		)
			fail("RANGE_GAP", "operation gap");
		return clone({ stream: stored.stream, ...materialized });
	}

	async #hydrate(bundle: StreamBundle): Promise<MemoryVersionedPersistence> {
		try {
			const memory = new MemoryVersionedPersistence();
			await memory.initialize(bundle.stream.genesis);
			for (const operation of bundle.operations) {
				if (operation.kind === "append")
					await memory.appendEventBatch(operation.request);
				else if (operation.kind === "rejection")
					await memory.recordRejectedCommand(operation.request);
				else if (operation.kind === "fence")
					await memory.acquireWriterFence(
						bundle.stream.genesis,
						operation.expectedFencingToken,
					);
				else await memory.saveSnapshot(operation.request);
			}
			const head = await memory.loadHead(bundle.stream.genesis);
			if (!equal(head, bundle.stream.head))
				fail("STALE_STATE", "head mismatch");
			await this.#verifyMaterializedStores(bundle, memory);
			return memory;
		} catch (error) {
			if (
				error instanceof PersistenceError &&
				[
					"RANGE_GAP",
					"RUN_ID_COLLISION",
					"STALE_STATE",
					"UNSUPPORTED_VERSION",
				].includes(error.code)
			)
				throw error;
			fail("STALE_STATE", "malformed authority material");
		}
	}

	async #validatedView(
		scope: AuthorityScope,
	): Promise<ValidatedAuthoritySession> {
		const session = this.#validatedSession;
		if (session !== null && session[0].stream.key === streamKey(scope))
			return session;
		const bundle = await this.#readBundle(scope);
		return [bundle, await this.#hydrate(bundle)];
	}

	async session<T>(
		scope: AuthorityScope,
		operation: () => Promise<T>,
	): Promise<T> {
		if (this.#validatedSession !== null)
			fail("INVALID_INPUT", "validated authority session already active");
		const bundle = await this.#readBundle(scope);
		this.#validatedSession = [bundle, await this.#hydrate(bundle)];
		let result: T | undefined;
		const errors: unknown[] = [];
		try {
			result = await operation();
		} catch (error) {
			errors.push(error);
		}
		try {
			const durableBundle = await this.#readBundle(scope);
			await this.#hydrate(durableBundle);
			if (!equal(durableBundle, bundle))
				fail("STALE_REVISION", "authority changed during validated session");
		} catch (error) {
			errors.push(error);
		}
		this.#validatedSession = null;
		if (errors.length)
			throw errors.length > 1
				? new AggregateError(errors, "SP:BODY_AND_SESSION_FINALIZATION_FAILED")
				: errors[0];
		return result as T;
	}

	async #verifyMaterializedStores(
		bundle: StreamBundle,
		memory: MemoryVersionedPersistence,
	): Promise<void> {
		const expectedEvents = bundle.operations
			.filter(
				(
					operation,
				): operation is Extract<AuthorityOperation, { kind: "append" }> =>
					operation.kind === "append",
			)
			.flatMap((operation) => operation.request.events);
		const receiptOperations = bundle.operations.filter(
			(
				operation,
			): operation is Extract<
				AuthorityOperation,
				{ kind: "append" | "rejection" }
			> => operation.kind === "append" || operation.kind === "rejection",
		);
		const expectedReceipts = await Promise.all(
			receiptOperations.map(async (operation) => {
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
		expectedReceipts.sort((left, right) =>
			left.appendId.localeCompare(right.appendId),
		);
		if (
			!equal(bundle.events, expectedEvents) ||
			!equal(bundle.receipts, expectedReceipts) ||
			!equal(bundle.snapshots, expectedSnapshots)
		)
			fail("STALE_STATE", "materialized mismatch");
	}

	async #commitOperation(input: CommitOperationInput): Promise<void> {
		try {
			const receipt = input.receipt;
			const operationNeedsReceipt =
				input.operation.kind === "append" ||
				input.operation.kind === "rejection";
			if (operationNeedsReceipt && receipt === undefined)
				fail("STALE_STATE", "committed receipt missing");
			this.#boundaryInjector?.hit("write");
			const session = this.#validatedSession;
			const transaction = this.#database.transaction(STORE_NAMES, "readwrite", {
				durability: "strict",
			});
			const done = transactionDone(transaction);
			try {
				this.#boundaryInjector?.hit("transaction-abort", transaction);
				const stored = await storedRows(
					transaction,
					input.bundle.stream.genesis,
				);
				const streams = transaction.objectStore(
					GENERATED_AUTHORITY_STORES.streams,
				);
				const current = stored.stream;
				if (
					current === undefined ||
					!equal(current, input.bundle.stream) ||
					!equal(materializedValues(stored), {
						operations: input.bundle.operations,
						events: input.bundle.events,
						receipts: input.bundle.receipts,
						snapshots: input.bundle.snapshots,
					})
				)
					fail("STALE_REVISION", "head race");
				input.write(transaction);
				transaction.objectStore(GENERATED_AUTHORITY_STORES.operations).put({
					key: recordKey(input.bundle.stream.genesis, input.operation.ordinal),
					streamKey: streamKey(input.bundle.stream.genesis),
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
			if (session !== null && session[0] === input.bundle) {
				const operation = input.operation;
				const next = input.bundle as MutableStreamBundle;
				next.stream = {
					...next.stream,
					head: input.head,
					operationCount: next.stream.operationCount + 1,
				};
				next.operations.push(operation);
				if (operation.kind === "append") {
					next.events.push(...operation.request.events);
				}
				if (receipt !== undefined) {
					next.receipts.push(receipt);
					next.receipts.sort((left, right) =>
						left.appendId.localeCompare(right.appendId),
					);
				}
				if (operation.kind === "snapshot") {
					next.snapshots.push(operation.request.snapshot);
					next.snapshots.sort((left, right) =>
						left.snapshotId.localeCompare(right.snapshotId),
					);
				}
			}
			this.#hit(input.after);
		} catch (error) {
			const session = this.#validatedSession;
			if (session !== null && session[0] === input.bundle)
				session[1] = await this.#hydrate(session[0]);
			throw error;
		}
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
		const transaction = this.#database.transaction(STORE_NAMES, "readwrite", {
			durability: "strict",
		});
		const done = transactionDone(transaction);
		try {
			this.#boundaryInjector?.hit("transaction-abort", transaction);
			const stored = await storedRows(transaction, request);
			if (stored.stream !== undefined) fail("STALE_REVISION", "genesis race");
			if (
				stored.operations.length > 0 ||
				stored.events.length > 0 ||
				stored.receipts.length > 0 ||
				stored.snapshots.length > 0
			)
				fail("STALE_STATE", "orphaned authority material");
			const streams = transaction.objectStore(
				GENERATED_AUTHORITY_STORES.streams,
			);
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
		const view = await this.#validatedView(scope);
		return clone(await view[1].loadHead(scope));
	}

	async acquireWriterFence(
		scope: AuthorityScope,
		expectedFencingToken: number,
	): Promise<AuthorityHead> {
		const view = await this.#validatedView(scope);
		const next = await view[1].acquireWriterFence(scope, expectedFencingToken);
		await this.#commitOperation({
			bundle: view[0],
			operation: {
				kind: "fence",
				ordinal: view[0].stream.operationCount,
				expectedFencingToken,
			},
			head: next,
			write: () => undefined,
			before: "authority-fence:before-commit",
			after: "authority-fence:after-commit",
		});
		return clone(next);
	}

	async appendEventBatch(
		request: AppendAuthorityBatchRequest,
	): Promise<AppendAuthorityBatchResult> {
		const view = await this.#validatedView(request);
		const result = await view[1].appendEventBatch(request);
		if (result.idempotent) return clone(result);
		await this.#commitOperation({
			bundle: view[0],
			operation: {
				kind: "append",
				ordinal: view[0].stream.operationCount,
				request: clone(request),
			},
			head: result.head,
			receipt: result.receipt,
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

	async recordRejectedCommand(
		request: RecordRejectedAuthorityCommandRequest,
	): Promise<AppendAuthorityBatchResult> {
		const view = await this.#validatedView(request);
		const result = await view[1].recordRejectedCommand(request);
		if (result.idempotent) return clone(result);
		await this.#commitOperation({
			bundle: view[0],
			operation: {
				kind: "rejection",
				ordinal: view[0].stream.operationCount,
				request: clone(request),
			},
			head: result.head,
			receipt: result.receipt,
			write: (transaction) =>
				transaction.objectStore(GENERATED_AUTHORITY_STORES.receipts).put({
					key: recordKey(request, request.appendId),
					streamKey: streamKey(request),
					value: clone(result.receipt),
				} satisfies KeyedRow<AuthorityAppendReceipt>),
			before: "authority-rejection:before-commit",
			after: "authority-rejection:after-commit",
		});
		return clone(result);
	}

	async getAppendReceipt(
		scope: AuthorityScope,
		appendId: string,
	): Promise<AuthorityAppendReceipt | null> {
		const view = await this.#validatedView(scope);
		const expected = await view[1].getAppendReceipt(scope, appendId);
		const actual = view[0].receipts.find(
			(receipt) => receipt.appendId === appendId,
		);
		if (
			(actual === undefined) !== (expected === null) ||
			(actual !== undefined && !equal(actual, expected))
		)
			fail("STALE_STATE", "receipt mismatch");
		return expected === null ? null : clone(expected);
	}

	async getEventRange(
		request: AuthorityEventRangeRequest,
	): Promise<readonly AuthorityEventRecord[]> {
		const view = await this.#validatedView(request);
		const expected = await view[1].getEventRange(request);
		const actual = view[0].events.filter(
			(event) =>
				event.sequence >= request.fromSequenceInclusive &&
				event.sequence < request.toSequenceExclusive,
		);
		if (!equal(actual, expected)) fail("STALE_STATE", "event mismatch");
		return clone(actual);
	}

	async saveSnapshot(
		request: SaveAuthoritySnapshotRequest,
	): Promise<AuthoritySnapshotRecord> {
		const view = await this.#validatedView(request.snapshot);
		let prior: AuthoritySnapshotRecord | null = null;
		try {
			prior = await view[1].loadSnapshot(
				request.snapshot,
				request.snapshot.snapshotId,
			);
		} catch (error) {
			if (!(error instanceof PersistenceError) || error.code !== "NOT_FOUND")
				throw error;
		}
		const result = await view[1].saveSnapshot(request);
		if (prior !== null) return clone(result);
		await this.#commitOperation({
			bundle: view[0],
			operation: {
				kind: "snapshot",
				ordinal: view[0].stream.operationCount,
				request: clone(request),
			},
			head: view[0].stream.head,
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
		const view = await this.#validatedView(scope);
		const expected = await view[1].loadSnapshot(scope, snapshotId);
		const actual = view[0].snapshots.find(
			(snapshot) => snapshot.snapshotId === snapshotId,
		);
		if (actual === undefined || !equal(actual, expected))
			fail("STALE_STATE", "snapshot mismatch");
		return clone(actual);
	}

	async loadLatestSnapshot(
		scope: AuthorityScope,
	): Promise<AuthoritySnapshotRecord> {
		const view = await this.#validatedView(scope);
		const expected = await view[1].loadLatestSnapshot(scope);
		const actual = view[0].snapshots.find(
			(snapshot) => snapshot.snapshotId === expected.snapshotId,
		);
		if (actual === undefined || !equal(actual, expected))
			fail("STALE_STATE", "snapshot mismatch");
		return clone(actual);
	}
}
