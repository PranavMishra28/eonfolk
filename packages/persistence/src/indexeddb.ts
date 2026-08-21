import {
	assertRecordBound,
	assertTotalBound,
	resolveBounds,
} from "./bounds.js";
import {
	canonicalJson,
	cloneValue,
	compoundKey,
	recordBytes,
} from "./codec.js";
import { PersistenceError } from "./errors.js";
import type {
	AppendRejectedDecisionRequest,
	BatchRangeRequest,
	BeginCatchUpRequest,
	CatchUpOperationRecord,
	CommandReceipt,
	CommitCatchUpChapterRequest,
	CommitGenesisRequest,
	CommitGenesisResult,
	CommitRejectedCommandRequest,
	CommitTransitionRequest,
	CommitTransitionResult,
	CrashInjector,
	DecisionRecord,
	EventRangeRequest,
	ExperimentManifest,
	PersistenceBounds,
	PersistencePort,
	ReplayRange,
	ReplayRangeRequest,
	SaveSnapshotRequest,
	SnapshotRecord,
	WorldBatchRecord,
	WorldEventRecord,
	WorldHead,
} from "./types.js";
import {
	asJson,
	assertIdentifier,
	assertSafeU64,
	nextCatchUpRecord,
	validateCatchUp,
	validateDecision,
	validateGenesis,
	validateHead,
	validateRange,
	validateRejectedReceiptAgainstHead,
	validateSnapshot,
	validateTransition,
} from "./validation.js";

export const PERSISTENCE_STORE_NAMES = Object.freeze({
	manifests: "experimentManifests",
	worlds: "worlds",
	batches: "batches",
	events: "events",
	decisions: "decisionRecords",
	receipts: "commandReceipts",
	catchUps: "catchUpOperations",
	snapshots: "snapshots",
} as const);

const ALL_STORES = Object.freeze(Object.values(PERSISTENCE_STORE_NAMES));
const DATABASE_VERSION = 1;

interface KeyedRecord<T> {
	readonly key: string;
	readonly record: T;
}

interface ManifestRow extends KeyedRecord<ExperimentManifest> {
	readonly genesisFingerprint: string;
}

interface WorldRow {
	readonly key: string;
	readonly head: WorldHead;
	readonly storedBytes: number;
}

export interface IndexedDbPersistenceOptions {
	readonly bounds?: Partial<PersistenceBounds>;
	readonly crashInjector?: CrashInjector;
	readonly databaseName?: string;
	readonly factory?: IDBFactory;
}

function manifestKey(runId: string): string {
	return compoundKey(runId);
}

function worldKey(runId: string, regionId: string): string {
	return compoundKey(runId, regionId);
}

function batchKey(runId: string, regionId: string, revision: number): string {
	return compoundKey(runId, regionId, revision);
}

function eventKey(runId: string, regionId: string, sequence: number): string {
	return compoundKey(runId, regionId, sequence);
}

function decisionKey(
	runId: string,
	regionId: string,
	decisionId: string,
): string {
	return compoundKey(runId, regionId, decisionId);
}

function receiptKey(
	runId: string,
	regionId: string,
	commandId: string,
): string {
	return compoundKey(runId, regionId, commandId);
}

function catchUpKey(
	runId: string,
	regionId: string,
	operationId: string,
): string {
	return compoundKey(runId, regionId, operationId);
}

function snapshotKey(
	runId: string,
	regionId: string,
	snapshotId: string,
): string {
	return compoundKey(runId, regionId, snapshotId);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
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
	return new Promise<void>((resolve, reject) => {
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
): Promise<IDBDatabase> {
	return await new Promise<IDBDatabase>((resolve, reject) => {
		const request = factory.open(name, DATABASE_VERSION);
		request.addEventListener(
			"upgradeneeded",
			() => {
				const database = request.result;
				for (const storeName of ALL_STORES) {
					if (!database.objectStoreNames.contains(storeName)) {
						database.createObjectStore(storeName, { keyPath: "key" });
					}
				}
			},
			{ once: true },
		);
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(request.error ?? new Error("IndexedDB open failed")),
			{ once: true },
		);
		request.addEventListener(
			"blocked",
			() =>
				reject(
					new PersistenceError(
						"INVALID_INPUT",
						"IndexedDB upgrade was blocked",
					),
				),
			{ once: true },
		);
	});
}

async function getRow<T>(
	store: IDBObjectStore,
	key: string,
): Promise<T | undefined> {
	return await requestResult(store.get(key) as IDBRequest<T | undefined>);
}

async function requireWorld(
	transaction: IDBTransaction,
	runId: string,
	regionId: string,
): Promise<WorldRow> {
	const row = await getRow<WorldRow>(
		transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds),
		worldKey(runId, regionId),
	);
	if (row === undefined)
		throw new PersistenceError("NOT_FOUND", "local world was not found");
	return row;
}

function put(store: IDBObjectStore, value: unknown): void {
	store.put(value);
}

export class IndexedDbPersistence implements PersistencePort {
	readonly #bounds: PersistenceBounds;
	readonly #crashInjector: CrashInjector | undefined;
	readonly #database: IDBDatabase;

	private constructor(
		database: IDBDatabase,
		options: IndexedDbPersistenceOptions,
	) {
		this.#database = database;
		this.#bounds = resolveBounds(options.bounds);
		this.#crashInjector = options.crashInjector;
	}

	static async open(
		options: IndexedDbPersistenceOptions = {},
	): Promise<IndexedDbPersistence> {
		const factory = options.factory ?? globalThis.indexedDB;
		if (factory === undefined) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"IndexedDB is unavailable in this runtime",
			);
		}
		const database = await openDatabase(
			factory,
			options.databaseName ?? "eonfolk-local-proof",
		);
		return new IndexedDbPersistence(database, options);
	}

	close(): void {
		this.#database.close();
	}

	#hit(point: Parameters<CrashInjector["hit"]>[0]): void {
		this.#crashInjector?.hit(point);
	}

	async #write<T>(
		stores: readonly string[],
		beforeCommit: Parameters<CrashInjector["hit"]>[0],
		afterCommit: Parameters<CrashInjector["hit"]>[0],
		operation: (transaction: IDBTransaction) => Promise<T>,
	): Promise<T> {
		const transaction = this.#database.transaction([...stores], "readwrite", {
			durability: "strict",
		});
		const done = transactionDone(transaction);
		let result: T;
		try {
			result = await operation(transaction);
			this.#hit(beforeCommit);
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// The transaction may have already aborted because a request failed.
			}
			try {
				await done;
			} catch {
				// Preserve the typed validation or injected-crash error.
			}
			throw error;
		}
		await done;
		this.#hit(afterCommit);
		return result;
	}

	async #read<T>(
		stores: readonly string[],
		operation: (transaction: IDBTransaction) => Promise<T>,
	): Promise<T> {
		const transaction = this.#database.transaction([...stores], "readonly");
		const done = transactionDone(transaction);
		const result = await operation(transaction);
		await done;
		return result;
	}

	async commitGenesis(
		request: CommitGenesisRequest,
	): Promise<CommitGenesisResult> {
		const validated = validateGenesis(request, this.#bounds);
		this.#hit("genesis:before-write");
		return await this.#write(
			ALL_STORES,
			"genesis:before-commit",
			"genesis:after-commit",
			async (transaction) => {
				const manifests = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.manifests,
				);
				const existing = await getRow<ManifestRow>(
					manifests,
					manifestKey(request.manifest.runId),
				);
				if (existing !== undefined) {
					if (existing.genesisFingerprint !== validated.fingerprint) {
						throw new PersistenceError(
							"RUN_ID_COLLISION",
							"run ID has a different genesis",
						);
					}
					const world = await requireWorld(
						transaction,
						request.manifest.runId,
						request.manifest.regionId,
					);
					const snapshot = await getRow<KeyedRecord<SnapshotRecord>>(
						transaction.objectStore(PERSISTENCE_STORE_NAMES.snapshots),
						snapshotKey(
							request.snapshot.runId,
							request.snapshot.regionId,
							request.snapshot.snapshotId,
						),
					);
					if (snapshot === undefined) {
						throw new PersistenceError(
							"NOT_FOUND",
							"idempotent genesis is missing its snapshot",
						);
					}
					return cloneValue({
						manifest: existing.record,
						head: world.head,
						snapshot: snapshot.record,
						idempotent: true,
					});
				}
				const count = await requestResult(manifests.count());
				if (count !== 0) {
					throw new PersistenceError(
						"LOCAL_WORLD_LIMIT",
						"the first slice permits one local run",
					);
				}
				assertTotalBound(0, validated.bytes, this.#bounds);
				put(manifests, {
					key: manifestKey(request.manifest.runId),
					record: cloneValue(request.manifest),
					genesisFingerprint: validated.fingerprint,
				} satisfies ManifestRow);
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(request.head.runId, request.head.regionId),
					head: cloneValue(request.head),
					storedBytes: validated.bytes,
				} satisfies WorldRow);
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.snapshots), {
					key: snapshotKey(
						request.snapshot.runId,
						request.snapshot.regionId,
						request.snapshot.snapshotId,
					),
					record: cloneValue(request.snapshot),
				} satisfies KeyedRecord<SnapshotRecord>);
				return cloneValue({ ...request, idempotent: false });
			},
		);
	}

	async getExperimentManifest(runId: string): Promise<ExperimentManifest> {
		assertIdentifier(runId, "runId");
		return await this.#read(
			[PERSISTENCE_STORE_NAMES.manifests],
			async (transaction) => {
				const row = await getRow<ManifestRow>(
					transaction.objectStore(PERSISTENCE_STORE_NAMES.manifests),
					manifestKey(runId),
				);
				if (row === undefined)
					throw new PersistenceError("NOT_FOUND", "manifest was not found");
				return cloneValue(row.record);
			},
		);
	}

	async getHead(runId: string, regionId: string): Promise<WorldHead> {
		return await this.#read(
			[PERSISTENCE_STORE_NAMES.worlds],
			async (transaction) =>
				cloneValue((await requireWorld(transaction, runId, regionId)).head),
		);
	}

	async #getOptional<T>(storeName: string, key: string): Promise<T | null> {
		return await this.#read([storeName], async (transaction) => {
			const row = await getRow<KeyedRecord<T>>(
				transaction.objectStore(storeName),
				key,
			);
			return row === undefined ? null : cloneValue(row.record);
		});
	}

	async getCommandReceipt(
		runId: string,
		regionId: string,
		commandId: string,
	): Promise<CommandReceipt | null> {
		return await this.#getOptional(
			PERSISTENCE_STORE_NAMES.receipts,
			receiptKey(runId, regionId, commandId),
		);
	}

	async getDecisionRecord(
		runId: string,
		regionId: string,
		decisionId: string,
	): Promise<DecisionRecord | null> {
		return await this.#getOptional(
			PERSISTENCE_STORE_NAMES.decisions,
			decisionKey(runId, regionId, decisionId),
		);
	}

	async getCatchUpOperationReceipt(
		runId: string,
		regionId: string,
		operationId: string,
	): Promise<CatchUpOperationRecord | null> {
		return await this.#getOptional(
			PERSISTENCE_STORE_NAMES.catchUps,
			catchUpKey(runId, regionId, operationId),
		);
	}

	async #stageTransition(
		transaction: IDBTransaction,
		request: CommitTransitionRequest,
	): Promise<CommitTransitionResult> {
		const world = await requireWorld(
			transaction,
			request.runId,
			request.regionId,
		);
		const receipts = transaction.objectStore(PERSISTENCE_STORE_NAMES.receipts);
		const existingReceipt = await getRow<KeyedRecord<CommandReceipt>>(
			receipts,
			receiptKey(request.runId, request.regionId, request.receipt.commandId),
		);
		if (existingReceipt !== undefined) {
			if (
				existingReceipt.record.payloadFingerprint !==
				request.receipt.payloadFingerprint
			) {
				throw new PersistenceError(
					"IDEMPOTENCY_COLLISION",
					"command ID has another fingerprint",
				);
			}
			return {
				receipt: cloneValue(existingReceipt.record),
				head: cloneValue(world.head),
				idempotent: true,
			};
		}
		let delta = validateTransition(request, world.head, this.#bounds);
		const batches = transaction.objectStore(PERSISTENCE_STORE_NAMES.batches);
		if (
			(await getRow<KeyedRecord<WorldBatchRecord>>(
				batches,
				batchKey(request.runId, request.regionId, request.batch.resultRevision),
			)) !== undefined
		) {
			throw new PersistenceError(
				"BATCH_COLLISION",
				"result revision already has a batch",
			);
		}
		const events = transaction.objectStore(PERSISTENCE_STORE_NAMES.events);
		for (const event of request.events) {
			if (
				(await getRow<KeyedRecord<WorldEventRecord>>(
					events,
					eventKey(request.runId, request.regionId, event.sequence),
				)) !== undefined
			) {
				throw new PersistenceError(
					"EVENT_COLLISION",
					"event sequence already exists",
				);
			}
		}
		const decisions = transaction.objectStore(
			PERSISTENCE_STORE_NAMES.decisions,
		);
		let insertDecision = false;
		if (request.decision !== null) {
			const existing = await getRow<KeyedRecord<DecisionRecord>>(
				decisions,
				decisionKey(
					request.runId,
					request.regionId,
					request.decision.decisionId,
				),
			);
			if (
				existing !== undefined &&
				existing.record.decisionRecordHash !==
					request.decision.decisionRecordHash
			) {
				throw new PersistenceError(
					"DECISION_ID_COLLISION",
					"decision ID has different bytes",
				);
			}
			insertDecision = existing === undefined;
			if (!insertDecision) delta -= recordBytes(asJson(request.decision));
		}
		const storedBytes = assertTotalBound(
			world.storedBytes,
			delta - recordBytes(asJson(world.head)),
			this.#bounds,
		);
		put(batches, {
			key: batchKey(
				request.runId,
				request.regionId,
				request.batch.resultRevision,
			),
			record: cloneValue(request.batch),
		} satisfies KeyedRecord<WorldBatchRecord>);
		for (const event of request.events) {
			put(events, {
				key: eventKey(request.runId, request.regionId, event.sequence),
				record: cloneValue(event),
			} satisfies KeyedRecord<WorldEventRecord>);
		}
		if (request.decision !== null && insertDecision) {
			put(decisions, {
				key: decisionKey(
					request.runId,
					request.regionId,
					request.decision.decisionId,
				),
				record: cloneValue(request.decision),
			} satisfies KeyedRecord<DecisionRecord>);
		}
		put(receipts, {
			key: receiptKey(
				request.runId,
				request.regionId,
				request.receipt.commandId,
			),
			record: cloneValue(request.receipt),
		} satisfies KeyedRecord<CommandReceipt>);
		put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
			key: worldKey(request.runId, request.regionId),
			head: cloneValue(request.postHead),
			storedBytes,
		} satisfies WorldRow);
		return {
			receipt: cloneValue(request.receipt),
			head: cloneValue(request.postHead),
			idempotent: false,
		};
	}

	async commitTransition(
		request: CommitTransitionRequest,
	): Promise<CommitTransitionResult> {
		this.#hit("transition:before-write");
		return await this.#write(
			[
				PERSISTENCE_STORE_NAMES.worlds,
				PERSISTENCE_STORE_NAMES.batches,
				PERSISTENCE_STORE_NAMES.events,
				PERSISTENCE_STORE_NAMES.decisions,
				PERSISTENCE_STORE_NAMES.receipts,
			],
			"transition:before-commit",
			"transition:after-commit",
			async (transaction) => await this.#stageTransition(transaction, request),
		);
	}

	async commitRejectedCommand(
		request: CommitRejectedCommandRequest,
	): Promise<CommandReceipt> {
		return await this.#write(
			[
				PERSISTENCE_STORE_NAMES.worlds,
				PERSISTENCE_STORE_NAMES.decisions,
				PERSISTENCE_STORE_NAMES.receipts,
			],
			"rejected-command:before-commit",
			"rejected-command:after-commit",
			async (transaction) => {
				const world = await requireWorld(
					transaction,
					request.runId,
					request.regionId,
				);
				const receipts = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.receipts,
				);
				const key = receiptKey(
					request.runId,
					request.regionId,
					request.receipt.commandId,
				);
				const existing = await getRow<KeyedRecord<CommandReceipt>>(
					receipts,
					key,
				);
				if (existing !== undefined) {
					if (
						existing.record.payloadFingerprint !==
						request.receipt.payloadFingerprint
					) {
						throw new PersistenceError(
							"IDEMPOTENCY_COLLISION",
							"command ID has another fingerprint",
						);
					}
					return cloneValue(existing.record);
				}
				if (request.fencingToken !== world.head.fencingToken) {
					throw new PersistenceError(
						"STALE_FENCE",
						"rejected command used a stale fence",
					);
				}
				let delta = validateRejectedReceiptAgainstHead(
					request.receipt,
					world.head,
					this.#bounds,
				);
				if (request.decision !== null) {
					delta += validateDecision(
						request.decision,
						request.runId,
						request.regionId,
						this.#bounds,
					);
					const decisions = transaction.objectStore(
						PERSISTENCE_STORE_NAMES.decisions,
					);
					const decisionKeyValue = decisionKey(
						request.runId,
						request.regionId,
						request.decision.decisionId,
					);
					const prior = await getRow<KeyedRecord<DecisionRecord>>(
						decisions,
						decisionKeyValue,
					);
					if (
						prior !== undefined &&
						prior.record.decisionRecordHash !==
							request.decision.decisionRecordHash
					) {
						throw new PersistenceError(
							"DECISION_ID_COLLISION",
							"decision ID has different bytes",
						);
					}
					if (prior === undefined) {
						put(decisions, {
							key: decisionKeyValue,
							record: cloneValue(request.decision),
						});
					} else {
						delta -= recordBytes(asJson(request.decision));
					}
				}
				put(receipts, { key, record: cloneValue(request.receipt) });
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(request.runId, request.regionId),
					head: world.head,
					storedBytes: assertTotalBound(world.storedBytes, delta, this.#bounds),
				} satisfies WorldRow);
				return cloneValue(request.receipt);
			},
		);
	}

	async appendRejectedDecision(
		request: AppendRejectedDecisionRequest,
	): Promise<DecisionRecord> {
		return await this.#write(
			[PERSISTENCE_STORE_NAMES.worlds, PERSISTENCE_STORE_NAMES.decisions],
			"rejected-decision:before-commit",
			"rejected-decision:after-commit",
			async (transaction) => {
				const world = await requireWorld(
					transaction,
					request.runId,
					request.regionId,
				);
				if (request.fencingToken !== world.head.fencingToken) {
					throw new PersistenceError(
						"STALE_FENCE",
						"rejected decision used a stale fence",
					);
				}
				const bytes = validateDecision(
					request.decision,
					request.runId,
					request.regionId,
					this.#bounds,
				);
				const decisions = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.decisions,
				);
				const key = decisionKey(
					request.runId,
					request.regionId,
					request.decision.decisionId,
				);
				const existing = await getRow<KeyedRecord<DecisionRecord>>(
					decisions,
					key,
				);
				if (existing !== undefined) {
					if (
						existing.record.decisionRecordHash !==
						request.decision.decisionRecordHash
					) {
						throw new PersistenceError(
							"DECISION_ID_COLLISION",
							"decision ID has different bytes",
						);
					}
					return cloneValue(existing.record);
				}
				put(decisions, { key, record: cloneValue(request.decision) });
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(request.runId, request.regionId),
					head: world.head,
					storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
				} satisfies WorldRow);
				return cloneValue(request.decision);
			},
		);
	}

	async beginCatchUpOperation(
		request: BeginCatchUpRequest,
	): Promise<CatchUpOperationRecord> {
		return await this.#write(
			[PERSISTENCE_STORE_NAMES.worlds, PERSISTENCE_STORE_NAMES.catchUps],
			"catch-up-begin:before-commit",
			"catch-up-begin:after-commit",
			async (transaction) => {
				const { record } = request;
				const world = await requireWorld(
					transaction,
					record.runId,
					record.regionId,
				);
				const catchUps = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.catchUps,
				);
				const key = catchUpKey(
					record.runId,
					record.regionId,
					record.operationId,
				);
				const existing = await getRow<KeyedRecord<CatchUpOperationRecord>>(
					catchUps,
					key,
				);
				if (existing !== undefined) {
					if (existing.record.planHash !== record.planHash) {
						throw new PersistenceError(
							"CATCH_UP_ID_COLLISION",
							"operation ID has another plan",
						);
					}
					return cloneValue(existing.record);
				}
				if (request.fencingToken !== world.head.fencingToken) {
					throw new PersistenceError(
						"STALE_FENCE",
						"catch-up begin used a stale fence",
					);
				}
				const bytes = validateCatchUp(record, world.head, this.#bounds);
				put(catchUps, { key, record: cloneValue(record) });
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(record.runId, record.regionId),
					head: world.head,
					storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
				} satisfies WorldRow);
				return cloneValue(record);
			},
		);
	}

	async commitCatchUpChapter(
		request: CommitCatchUpChapterRequest,
	): Promise<CatchUpOperationRecord> {
		assertIdentifier(request.operationId, "operationId");
		assertSafeU64(request.chapterOrdinal, "chapterOrdinal");
		const { runId, regionId } = request.transition;
		return await this.#write(
			[
				PERSISTENCE_STORE_NAMES.worlds,
				PERSISTENCE_STORE_NAMES.batches,
				PERSISTENCE_STORE_NAMES.events,
				PERSISTENCE_STORE_NAMES.decisions,
				PERSISTENCE_STORE_NAMES.receipts,
				PERSISTENCE_STORE_NAMES.catchUps,
			],
			"catch-up-chapter:before-commit",
			"catch-up-chapter:after-commit",
			async (transaction) => {
				const catchUps = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.catchUps,
				);
				const key = catchUpKey(runId, regionId, request.operationId);
				const row = await getRow<KeyedRecord<CatchUpOperationRecord>>(
					catchUps,
					key,
				);
				if (row === undefined)
					throw new PersistenceError(
						"NOT_FOUND",
						"catch-up operation was not found",
					);
				const operation = row.record;
				if (operation.planHash !== request.planHash) {
					throw new PersistenceError(
						"CATCH_UP_ID_COLLISION",
						"operation plan changed",
					);
				}
				if (request.chapterOrdinal < operation.nextChapter) {
					const receipt = await getRow<KeyedRecord<CommandReceipt>>(
						transaction.objectStore(PERSISTENCE_STORE_NAMES.receipts),
						receiptKey(runId, regionId, request.transition.receipt.commandId),
					);
					if (
						receipt?.record.payloadFingerprint ===
						request.transition.receipt.payloadFingerprint
					) {
						return cloneValue(operation);
					}
					throw new PersistenceError(
						"IDEMPOTENCY_COLLISION",
						"completed chapter retry changed",
					);
				}
				if (
					operation.status !== "in-progress" ||
					request.chapterOrdinal !== operation.nextChapter
				) {
					throw new PersistenceError(
						"INVALID_INPUT",
						"only the exact next chapter may commit",
					);
				}
				const transition = await this.#stageTransition(
					transaction,
					request.transition,
				);
				if (transition.idempotent) {
					throw new PersistenceError(
						"IDEMPOTENCY_COLLISION",
						"chapter command belongs to another commit",
					);
				}
				const next = nextCatchUpRecord(operation, transition.head);
				assertRecordBound(asJson(next), this.#bounds, "catch-up receipt");
				put(catchUps, { key, record: cloneValue(next) });
				const postTransitionWorld = await requireWorld(
					transaction,
					runId,
					regionId,
				);
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(runId, regionId),
					head: postTransitionWorld.head,
					storedBytes: assertTotalBound(
						postTransitionWorld.storedBytes,
						recordBytes(asJson(next)) - recordBytes(asJson(operation)),
						this.#bounds,
					),
				} satisfies WorldRow);
				return cloneValue(next);
			},
		);
	}

	async acquireFencingToken(
		runId: string,
		regionId: string,
		expectedToken: number,
	): Promise<WorldHead> {
		assertSafeU64(expectedToken, "expectedToken");
		return await this.#write(
			[PERSISTENCE_STORE_NAMES.worlds],
			"fence:before-commit",
			"fence:after-commit",
			async (transaction) => {
				const world = await requireWorld(transaction, runId, regionId);
				if (world.head.fencingToken !== expectedToken) {
					throw new PersistenceError(
						"STALE_FENCE",
						"writer transfer expected a stale fence",
					);
				}
				if (expectedToken === Number.MAX_SAFE_INTEGER) {
					throw new PersistenceError(
						"STORAGE_LIMIT",
						"fencing token exhausted safe integers",
					);
				}
				const head = { ...world.head, fencingToken: expectedToken + 1 };
				validateHead(head);
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(runId, regionId),
					head,
					storedBytes: assertTotalBound(
						world.storedBytes,
						recordBytes(asJson(head)) - recordBytes(asJson(world.head)),
						this.#bounds,
					),
				} satisfies WorldRow);
				return cloneValue(head);
			},
		);
	}

	async loadSnapshot(
		runId: string,
		regionId: string,
		snapshotId: string,
	): Promise<SnapshotRecord> {
		const snapshot = await this.#getOptional<SnapshotRecord>(
			PERSISTENCE_STORE_NAMES.snapshots,
			snapshotKey(runId, regionId, snapshotId),
		);
		if (snapshot === null)
			throw new PersistenceError("NOT_FOUND", "snapshot was not found");
		return snapshot;
	}

	async saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRecord> {
		return await this.#write(
			[PERSISTENCE_STORE_NAMES.worlds, PERSISTENCE_STORE_NAMES.snapshots],
			"snapshot:before-commit",
			"snapshot:after-commit",
			async (transaction) => {
				const { snapshot } = request;
				const world = await requireWorld(
					transaction,
					snapshot.runId,
					snapshot.regionId,
				);
				if (request.fencingToken !== world.head.fencingToken) {
					throw new PersistenceError(
						"STALE_FENCE",
						"snapshot used a stale fence",
					);
				}
				if (
					snapshot.baseSequence > world.head.lastSequence ||
					snapshot.createdAtRevision > world.head.revision
				) {
					throw new PersistenceError(
						"INVALID_INPUT",
						"snapshot is ahead of the world",
					);
				}
				const bytes = validateSnapshot(snapshot, this.#bounds);
				const snapshots = transaction.objectStore(
					PERSISTENCE_STORE_NAMES.snapshots,
				);
				const key = snapshotKey(
					snapshot.runId,
					snapshot.regionId,
					snapshot.snapshotId,
				);
				const existing = await getRow<KeyedRecord<SnapshotRecord>>(
					snapshots,
					key,
				);
				if (existing !== undefined) {
					if (
						canonicalJson(asJson(existing.record)) !==
						canonicalJson(asJson(snapshot))
					) {
						throw new PersistenceError(
							"SNAPSHOT_ID_COLLISION",
							"snapshot ID has different bytes",
						);
					}
					return cloneValue(existing.record);
				}
				const all = await requestResult(
					snapshots.getAll() as IDBRequest<KeyedRecord<SnapshotRecord>[]>,
				);
				const count = all.filter(
					(row) =>
						row.record.runId === snapshot.runId &&
						row.record.regionId === snapshot.regionId,
				).length;
				if (count >= this.#bounds.maximumSnapshots) {
					throw new PersistenceError(
						"STORAGE_LIMIT",
						"snapshot count reached its local bound",
					);
				}
				put(snapshots, { key, record: cloneValue(snapshot) });
				put(transaction.objectStore(PERSISTENCE_STORE_NAMES.worlds), {
					key: worldKey(snapshot.runId, snapshot.regionId),
					head: world.head,
					storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
				} satisfies WorldRow);
				return cloneValue(snapshot);
			},
		);
	}

	async getBatchRange(
		request: BatchRangeRequest,
	): Promise<readonly WorldBatchRecord[]> {
		validateRange(
			{
				runId: request.runId,
				regionId: request.regionId,
				fromSequenceInclusive: request.fromRevisionInclusive,
				toSequenceExclusive: request.toRevisionExclusive,
			},
			this.#bounds.maximumBatchesPerRange,
			"batch range",
		);
		return await this.#read(
			[PERSISTENCE_STORE_NAMES.worlds, PERSISTENCE_STORE_NAMES.batches],
			async (transaction) => {
				await requireWorld(transaction, request.runId, request.regionId);
				const store = transaction.objectStore(PERSISTENCE_STORE_NAMES.batches);
				const result: WorldBatchRecord[] = [];
				for (
					let revision = request.fromRevisionInclusive;
					revision < request.toRevisionExclusive;
					revision += 1
				) {
					const row = await getRow<KeyedRecord<WorldBatchRecord>>(
						store,
						batchKey(request.runId, request.regionId, revision),
					);
					if (row === undefined) {
						throw new PersistenceError(
							"RANGE_GAP",
							`missing batch revision ${revision}`,
						);
					}
					result.push(cloneValue(row.record));
				}
				return result;
			},
		);
	}

	async getEventRange(
		request: EventRangeRequest,
	): Promise<readonly WorldEventRecord[]> {
		validateRange(request, this.#bounds.maximumEventsPerRange, "event range");
		return await this.#read(
			[PERSISTENCE_STORE_NAMES.worlds, PERSISTENCE_STORE_NAMES.events],
			async (transaction) => {
				await requireWorld(transaction, request.runId, request.regionId);
				const store = transaction.objectStore(PERSISTENCE_STORE_NAMES.events);
				const result: WorldEventRecord[] = [];
				for (
					let sequence = request.fromSequenceInclusive;
					sequence < request.toSequenceExclusive;
					sequence += 1
				) {
					const row = await getRow<KeyedRecord<WorldEventRecord>>(
						store,
						eventKey(request.runId, request.regionId, sequence),
					);
					if (row === undefined) {
						throw new PersistenceError(
							"RANGE_GAP",
							`missing event sequence ${sequence}`,
						);
					}
					result.push(cloneValue(row.record));
				}
				return result;
			},
		);
	}

	async getReplayRange(request: ReplayRangeRequest): Promise<ReplayRange> {
		const snapshot = await this.loadSnapshot(
			request.runId,
			request.regionId,
			request.snapshotId,
		);
		if (request.fromSequenceInclusive !== snapshot.baseSequence + 1) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"replay must begin immediately after its snapshot",
			);
		}
		const events = await this.getEventRange(request);
		const batchIds = new Set(events.map((event) => event.batchId));
		const batches = await this.#read(
			[PERSISTENCE_STORE_NAMES.batches],
			async (transaction) => {
				const rows = await requestResult(
					transaction
						.objectStore(PERSISTENCE_STORE_NAMES.batches)
						.getAll() as IDBRequest<KeyedRecord<WorldBatchRecord>[]>,
				);
				return rows
					.map((row) => row.record)
					.filter(
						(batch) =>
							batch.runId === request.runId &&
							batch.regionId === request.regionId &&
							batchIds.has(batch.batchId),
					)
					.sort((left, right) => left.firstSequence - right.firstSequence)
					.map((batch) => cloneValue(batch));
			},
		);
		if (batchIds.size !== batches.length) {
			throw new PersistenceError(
				"RANGE_GAP",
				"replay range is missing a covering batch",
			);
		}
		return { snapshot, batches, events };
	}
}
