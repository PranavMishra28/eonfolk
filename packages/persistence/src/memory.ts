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

interface StoredManifest {
	readonly record: ExperimentManifest;
	readonly genesisFingerprint: string;
}

interface StoredWorld {
	readonly head: WorldHead;
	readonly storedBytes: number;
}

interface MemoryStores {
	manifests: Map<string, StoredManifest>;
	worlds: Map<string, StoredWorld>;
	batches: Map<string, WorldBatchRecord>;
	events: Map<string, WorldEventRecord>;
	decisions: Map<string, DecisionRecord>;
	receipts: Map<string, CommandReceipt>;
	catchUps: Map<string, CatchUpOperationRecord>;
	snapshots: Map<string, SnapshotRecord>;
}

function createStores(): MemoryStores {
	return {
		manifests: new Map(),
		worlds: new Map(),
		batches: new Map(),
		events: new Map(),
		decisions: new Map(),
		receipts: new Map(),
		catchUps: new Map(),
		snapshots: new Map(),
	};
}

function cloneStores(source: MemoryStores): MemoryStores {
	return {
		manifests: new Map(source.manifests),
		worlds: new Map(source.worlds),
		batches: new Map(source.batches),
		events: new Map(source.events),
		decisions: new Map(source.decisions),
		receipts: new Map(source.receipts),
		catchUps: new Map(source.catchUps),
		snapshots: new Map(source.snapshots),
	};
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

function requireWorld(
	stores: MemoryStores,
	runId: string,
	regionId: string,
): StoredWorld {
	const world = stores.worlds.get(worldKey(runId, regionId));
	if (world === undefined)
		throw new PersistenceError("NOT_FOUND", "local world was not found");
	return world;
}

function ensureDecisionCanInsert(
	stores: MemoryStores,
	decision: DecisionRecord,
): boolean {
	const key = decisionKey(
		decision.runId,
		decision.regionId,
		decision.decisionId,
	);
	const existing = stores.decisions.get(key);
	if (existing === undefined) return true;
	if (existing.decisionRecordHash !== decision.decisionRecordHash) {
		throw new PersistenceError(
			"DECISION_ID_COLLISION",
			"decision ID has different bytes",
		);
	}
	return false;
}

export interface MemoryPersistenceOptions {
	readonly bounds?: Partial<PersistenceBounds>;
	readonly crashInjector?: CrashInjector;
}

export class MemoryPersistence implements PersistencePort {
	readonly #bounds: PersistenceBounds;
	readonly #crashInjector: CrashInjector | undefined;
	#stores = createStores();

	constructor(options: MemoryPersistenceOptions = {}) {
		this.#bounds = resolveBounds(options.bounds);
		this.#crashInjector = options.crashInjector;
	}

	#hit(point: Parameters<CrashInjector["hit"]>[0]): void {
		this.#crashInjector?.hit(point);
	}

	#install(staged: MemoryStores): void {
		this.#stores = staged;
	}

	async commitGenesis(
		request: CommitGenesisRequest,
	): Promise<CommitGenesisResult> {
		const validated = validateGenesis(request, this.#bounds);
		const key = manifestKey(request.manifest.runId);
		const existing = this.#stores.manifests.get(key);
		if (existing !== undefined) {
			if (existing.genesisFingerprint !== validated.fingerprint) {
				throw new PersistenceError(
					"RUN_ID_COLLISION",
					"run ID already has a different genesis",
				);
			}
			const world = requireWorld(
				this.#stores,
				request.manifest.runId,
				request.manifest.regionId,
			);
			const snapshot = this.#stores.snapshots.get(
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
				snapshot,
				idempotent: true,
			});
		}
		if (this.#stores.manifests.size !== 0) {
			throw new PersistenceError(
				"LOCAL_WORLD_LIMIT",
				"the first slice permits one local run",
			);
		}
		assertTotalBound(0, validated.bytes, this.#bounds);
		this.#hit("genesis:before-write");
		const staged = cloneStores(this.#stores);
		staged.manifests.set(key, {
			record: cloneValue(request.manifest),
			genesisFingerprint: validated.fingerprint,
		});
		staged.worlds.set(worldKey(request.head.runId, request.head.regionId), {
			head: cloneValue(request.head),
			storedBytes: validated.bytes,
		});
		staged.snapshots.set(
			snapshotKey(
				request.snapshot.runId,
				request.snapshot.regionId,
				request.snapshot.snapshotId,
			),
			cloneValue(request.snapshot),
		);
		this.#hit("genesis:before-commit");
		this.#install(staged);
		this.#hit("genesis:after-commit");
		return cloneValue({ ...request, idempotent: false });
	}

	async getExperimentManifest(runId: string): Promise<ExperimentManifest> {
		assertIdentifier(runId, "runId");
		const manifest = this.#stores.manifests.get(manifestKey(runId));
		if (manifest === undefined)
			throw new PersistenceError("NOT_FOUND", "manifest was not found");
		return cloneValue(manifest.record);
	}

	async getHead(runId: string, regionId: string): Promise<WorldHead> {
		return cloneValue(requireWorld(this.#stores, runId, regionId).head);
	}

	async getCommandReceipt(
		runId: string,
		regionId: string,
		commandId: string,
	): Promise<CommandReceipt | null> {
		const receipt = this.#stores.receipts.get(
			receiptKey(runId, regionId, commandId),
		);
		return receipt === undefined ? null : cloneValue(receipt);
	}

	async getDecisionRecord(
		runId: string,
		regionId: string,
		decisionId: string,
	): Promise<DecisionRecord | null> {
		const decision = this.#stores.decisions.get(
			decisionKey(runId, regionId, decisionId),
		);
		return decision === undefined ? null : cloneValue(decision);
	}

	async getCatchUpOperationReceipt(
		runId: string,
		regionId: string,
		operationId: string,
	): Promise<CatchUpOperationRecord | null> {
		const receipt = this.#stores.catchUps.get(
			catchUpKey(runId, regionId, operationId),
		);
		return receipt === undefined ? null : cloneValue(receipt);
	}

	#stageTransition(
		staged: MemoryStores,
		request: CommitTransitionRequest,
	): CommitTransitionResult {
		const currentWorld = requireWorld(staged, request.runId, request.regionId);
		const existingReceipt = staged.receipts.get(
			receiptKey(request.runId, request.regionId, request.receipt.commandId),
		);
		if (existingReceipt !== undefined) {
			if (
				existingReceipt.payloadFingerprint !==
				request.receipt.payloadFingerprint
			) {
				throw new PersistenceError(
					"IDEMPOTENCY_COLLISION",
					"command ID already has a different payload fingerprint",
				);
			}
			return {
				receipt: cloneValue(existingReceipt),
				head: cloneValue(currentWorld.head),
				idempotent: true,
			};
		}
		let delta = validateTransition(request, currentWorld.head, this.#bounds);
		const storedBatch = staged.batches.get(
			batchKey(request.runId, request.regionId, request.batch.resultRevision),
		);
		if (storedBatch !== undefined) {
			throw new PersistenceError(
				"BATCH_COLLISION",
				"result revision already has a batch",
			);
		}
		for (const event of request.events) {
			if (
				staged.events.has(
					eventKey(request.runId, request.regionId, event.sequence),
				)
			) {
				throw new PersistenceError(
					"EVENT_COLLISION",
					"event sequence already exists",
				);
			}
		}
		let insertDecision = false;
		if (request.decision !== null) {
			insertDecision = ensureDecisionCanInsert(staged, request.decision);
			if (!insertDecision) delta -= recordBytes(asJson(request.decision));
		}
		const replacedHeadBytes = recordBytes(asJson(currentWorld.head));
		const storedBytes = assertTotalBound(
			currentWorld.storedBytes,
			delta - replacedHeadBytes,
			this.#bounds,
		);
		staged.batches.set(
			batchKey(request.runId, request.regionId, request.batch.resultRevision),
			cloneValue(request.batch),
		);
		for (const event of request.events) {
			staged.events.set(
				eventKey(request.runId, request.regionId, event.sequence),
				cloneValue(event),
			);
		}
		if (request.decision !== null && insertDecision) {
			staged.decisions.set(
				decisionKey(
					request.runId,
					request.regionId,
					request.decision.decisionId,
				),
				cloneValue(request.decision),
			);
		}
		staged.receipts.set(
			receiptKey(request.runId, request.regionId, request.receipt.commandId),
			cloneValue(request.receipt),
		);
		staged.worlds.set(worldKey(request.runId, request.regionId), {
			head: cloneValue(request.postHead),
			storedBytes,
		});
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
		const staged = cloneStores(this.#stores);
		const result = this.#stageTransition(staged, request);
		if (result.idempotent) return result;
		this.#hit("transition:before-commit");
		this.#install(staged);
		this.#hit("transition:after-commit");
		return result;
	}

	async commitRejectedCommand(
		request: CommitRejectedCommandRequest,
	): Promise<CommandReceipt> {
		const staged = cloneStores(this.#stores);
		const world = requireWorld(staged, request.runId, request.regionId);
		const key = receiptKey(
			request.runId,
			request.regionId,
			request.receipt.commandId,
		);
		const existing = staged.receipts.get(key);
		if (existing !== undefined) {
			if (existing.payloadFingerprint !== request.receipt.payloadFingerprint) {
				throw new PersistenceError(
					"IDEMPOTENCY_COLLISION",
					"command ID has another fingerprint",
				);
			}
			return cloneValue(existing);
		}
		if (request.fencingToken !== world.head.fencingToken) {
			throw new PersistenceError(
				"STALE_FENCE",
				"rejected command used a stale fencing token",
			);
		}
		let delta = validateRejectedReceiptAgainstHead(
			request.receipt,
			world.head,
			this.#bounds,
		);
		if (request.decision !== null) {
			const decisionBytes = validateDecision(
				request.decision,
				request.runId,
				request.regionId,
				this.#bounds,
			);
			if (ensureDecisionCanInsert(staged, request.decision)) {
				delta += decisionBytes;
				staged.decisions.set(
					decisionKey(
						request.runId,
						request.regionId,
						request.decision.decisionId,
					),
					cloneValue(request.decision),
				);
			}
		}
		staged.receipts.set(key, cloneValue(request.receipt));
		staged.worlds.set(worldKey(request.runId, request.regionId), {
			head: world.head,
			storedBytes: assertTotalBound(world.storedBytes, delta, this.#bounds),
		});
		this.#hit("rejected-command:before-commit");
		this.#install(staged);
		this.#hit("rejected-command:after-commit");
		return cloneValue(request.receipt);
	}

	async appendRejectedDecision(
		request: AppendRejectedDecisionRequest,
	): Promise<DecisionRecord> {
		const staged = cloneStores(this.#stores);
		const world = requireWorld(staged, request.runId, request.regionId);
		if (request.fencingToken !== world.head.fencingToken) {
			throw new PersistenceError(
				"STALE_FENCE",
				"rejected decision used a stale fencing token",
			);
		}
		const bytes = validateDecision(
			request.decision,
			request.runId,
			request.regionId,
			this.#bounds,
		);
		if (!ensureDecisionCanInsert(staged, request.decision))
			return cloneValue(request.decision);
		staged.decisions.set(
			decisionKey(request.runId, request.regionId, request.decision.decisionId),
			cloneValue(request.decision),
		);
		staged.worlds.set(worldKey(request.runId, request.regionId), {
			head: world.head,
			storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
		});
		this.#hit("rejected-decision:before-commit");
		this.#install(staged);
		this.#hit("rejected-decision:after-commit");
		return cloneValue(request.decision);
	}

	async beginCatchUpOperation(
		request: BeginCatchUpRequest,
	): Promise<CatchUpOperationRecord> {
		const staged = cloneStores(this.#stores);
		const { record } = request;
		const world = requireWorld(staged, record.runId, record.regionId);
		const key = catchUpKey(record.runId, record.regionId, record.operationId);
		const existing = staged.catchUps.get(key);
		if (existing !== undefined) {
			if (existing.planHash !== record.planHash) {
				throw new PersistenceError(
					"CATCH_UP_ID_COLLISION",
					"operation ID has another plan hash",
				);
			}
			return cloneValue(existing);
		}
		if (request.fencingToken !== world.head.fencingToken) {
			throw new PersistenceError(
				"STALE_FENCE",
				"catch-up begin used a stale fencing token",
			);
		}
		const bytes = validateCatchUp(record, world.head, this.#bounds);
		staged.catchUps.set(key, cloneValue(record));
		staged.worlds.set(worldKey(record.runId, record.regionId), {
			head: world.head,
			storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
		});
		this.#hit("catch-up-begin:before-commit");
		this.#install(staged);
		this.#hit("catch-up-begin:after-commit");
		return cloneValue(record);
	}

	async commitCatchUpChapter(
		request: CommitCatchUpChapterRequest,
	): Promise<CatchUpOperationRecord> {
		assertIdentifier(request.operationId, "operationId");
		assertSafeU64(request.chapterOrdinal, "chapterOrdinal");
		const { runId, regionId } = request.transition;
		const staged = cloneStores(this.#stores);
		const key = catchUpKey(runId, regionId, request.operationId);
		const operation = staged.catchUps.get(key);
		if (operation === undefined)
			throw new PersistenceError(
				"NOT_FOUND",
				"catch-up operation was not found",
			);
		if (operation.planHash !== request.planHash) {
			throw new PersistenceError(
				"CATCH_UP_ID_COLLISION",
				"operation plan hash changed",
			);
		}
		if (request.chapterOrdinal < operation.nextChapter) {
			const receipt = staged.receipts.get(
				receiptKey(runId, regionId, request.transition.receipt.commandId),
			);
			if (
				receipt?.payloadFingerprint ===
				request.transition.receipt.payloadFingerprint
			) {
				return cloneValue(operation);
			}
			throw new PersistenceError(
				"IDEMPOTENCY_COLLISION",
				"completed chapter retry does not match",
			);
		}
		if (
			operation.status !== "in-progress" ||
			request.chapterOrdinal !== operation.nextChapter
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"only the exact next catch-up chapter may commit",
			);
		}
		const transition = this.#stageTransition(staged, request.transition);
		if (transition.idempotent) {
			throw new PersistenceError(
				"IDEMPOTENCY_COLLISION",
				"chapter command belongs to another commit",
			);
		}
		const next = nextCatchUpRecord(operation, transition.head);
		assertRecordBound(asJson(next), this.#bounds, "catch-up receipt");
		staged.catchUps.set(key, cloneValue(next));
		const postTransitionWorld = requireWorld(staged, runId, regionId);
		staged.worlds.set(worldKey(runId, regionId), {
			head: postTransitionWorld.head,
			storedBytes: assertTotalBound(
				postTransitionWorld.storedBytes,
				recordBytes(asJson(next)) - recordBytes(asJson(operation)),
				this.#bounds,
			),
		});
		this.#hit("catch-up-chapter:before-commit");
		this.#install(staged);
		this.#hit("catch-up-chapter:after-commit");
		return cloneValue(next);
	}

	async acquireFencingToken(
		runId: string,
		regionId: string,
		expectedToken: number,
	): Promise<WorldHead> {
		assertSafeU64(expectedToken, "expectedToken");
		const staged = cloneStores(this.#stores);
		const world = requireWorld(staged, runId, regionId);
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
		const storedBytes = assertTotalBound(
			world.storedBytes,
			recordBytes(asJson(head)) - recordBytes(asJson(world.head)),
			this.#bounds,
		);
		staged.worlds.set(worldKey(runId, regionId), { head, storedBytes });
		this.#hit("fence:before-commit");
		this.#install(staged);
		this.#hit("fence:after-commit");
		return cloneValue(head);
	}

	async loadSnapshot(
		runId: string,
		regionId: string,
		snapshotId: string,
	): Promise<SnapshotRecord> {
		const snapshot = this.#stores.snapshots.get(
			snapshotKey(runId, regionId, snapshotId),
		);
		if (snapshot === undefined)
			throw new PersistenceError("NOT_FOUND", "snapshot was not found");
		return cloneValue(snapshot);
	}

	async saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRecord> {
		const staged = cloneStores(this.#stores);
		const { snapshot } = request;
		const world = requireWorld(staged, snapshot.runId, snapshot.regionId);
		if (request.fencingToken !== world.head.fencingToken) {
			throw new PersistenceError(
				"STALE_FENCE",
				"snapshot used a stale fencing token",
			);
		}
		if (
			snapshot.baseSequence > world.head.lastSequence ||
			snapshot.createdAtRevision > world.head.revision
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"snapshot is ahead of the durable world",
			);
		}
		const bytes = validateSnapshot(snapshot, this.#bounds);
		const key = snapshotKey(
			snapshot.runId,
			snapshot.regionId,
			snapshot.snapshotId,
		);
		const existing = staged.snapshots.get(key);
		if (existing !== undefined) {
			if (canonicalJson(asJson(existing)) !== canonicalJson(asJson(snapshot))) {
				throw new PersistenceError(
					"SNAPSHOT_ID_COLLISION",
					"snapshot ID has different bytes",
				);
			}
			return cloneValue(existing);
		}
		const snapshotCount = [...staged.snapshots.values()].filter(
			(item) =>
				item.runId === snapshot.runId && item.regionId === snapshot.regionId,
		).length;
		if (snapshotCount >= this.#bounds.maximumSnapshots) {
			throw new PersistenceError(
				"STORAGE_LIMIT",
				"snapshot count reached the local bound",
			);
		}
		staged.snapshots.set(key, cloneValue(snapshot));
		staged.worlds.set(worldKey(snapshot.runId, snapshot.regionId), {
			head: world.head,
			storedBytes: assertTotalBound(world.storedBytes, bytes, this.#bounds),
		});
		this.#hit("snapshot:before-commit");
		this.#install(staged);
		this.#hit("snapshot:after-commit");
		return cloneValue(snapshot);
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
		requireWorld(this.#stores, request.runId, request.regionId);
		const result: WorldBatchRecord[] = [];
		for (
			let revision = request.fromRevisionInclusive;
			revision < request.toRevisionExclusive;
			revision += 1
		) {
			const batch = this.#stores.batches.get(
				batchKey(request.runId, request.regionId, revision),
			);
			if (batch === undefined)
				throw new PersistenceError(
					"RANGE_GAP",
					`missing batch revision ${revision}`,
				);
			result.push(cloneValue(batch));
		}
		return result;
	}

	async getEventRange(
		request: EventRangeRequest,
	): Promise<readonly WorldEventRecord[]> {
		validateRange(request, this.#bounds.maximumEventsPerRange, "event range");
		requireWorld(this.#stores, request.runId, request.regionId);
		const result: WorldEventRecord[] = [];
		for (
			let sequence = request.fromSequenceInclusive;
			sequence < request.toSequenceExclusive;
			sequence += 1
		) {
			const event = this.#stores.events.get(
				eventKey(request.runId, request.regionId, sequence),
			);
			if (event === undefined)
				throw new PersistenceError(
					"RANGE_GAP",
					`missing event sequence ${sequence}`,
				);
			result.push(cloneValue(event));
		}
		return result;
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
		const batches = [...this.#stores.batches.values()]
			.filter(
				(batch) =>
					batch.runId === request.runId &&
					batch.regionId === request.regionId &&
					batchIds.has(batch.batchId),
			)
			.sort((left, right) => left.firstSequence - right.firstSequence)
			.map((batch) => cloneValue(batch));
		if (batchIds.size !== batches.length) {
			throw new PersistenceError(
				"RANGE_GAP",
				"replay range is missing a covering batch",
			);
		}
		return { snapshot, batches, events };
	}
}
