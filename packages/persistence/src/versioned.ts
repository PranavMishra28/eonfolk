import { assertRecordBound, resolveBounds } from "./bounds.js";
import { canonicalJson, cloneValue } from "./codec.js";
import { PersistenceError } from "./errors.js";
import type { JsonValue, PersistenceBounds } from "./types.js";
import {
	AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_EVENT_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	AUTHORITY_HEAD_SCHEMA_VERSION,
	AUTHORITY_SNAPSHOT_SCHEMA_VERSION,
	EMPTY_EVENT_HASH,
	VERSIONED_PERSISTENCE_PORT_VERSION,
	type AppendAuthorityBatchRequest,
	type AppendAuthorityBatchResult,
	type AuthorityAppendReceipt,
	type AuthorityEventRangeRequest,
	type AuthorityEventRecord,
	type AuthorityHead,
	type AuthorityReplayRequest,
	type AuthorityReplayResult,
	type AuthorityScope,
	type AuthoritySnapshotRecord,
	type InitializeAuthorityRequest,
	type InitializeAuthorityResult,
	type SaveAuthoritySnapshotRequest,
	type VersionedCrashInjector,
	type VersionedPersistencePort,
} from "./versioned-types.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const textEncoder = new TextEncoder();

function assertIdentifier(value: string, label: string): void {
	let containsControlCharacter = false;
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
			containsControlCharacter = true;
			break;
		}
	}
	if (value.length < 1 || value.length > 128 || containsControlCharacter) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} is not a bounded identifier`,
		);
	}
}

function assertInteger(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} must be a non-negative safe integer`,
		);
	}
}

function assertHash(value: string, label: string): void {
	if (!HASH_PATTERN.test(value)) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} must be a lowercase SHA-256 hash`,
		);
	}
}

function assertVersion(actual: string, expected: string, label: string): void {
	if (actual !== expected) {
		throw new PersistenceError(
			"UNSUPPORTED_VERSION",
			`${label} ${actual} is unsupported; expected ${expected}`,
		);
	}
}

function assertScope(
	record: AuthorityScope,
	scope: AuthorityScope,
	label: string,
): void {
	if (record.runId !== scope.runId || record.regionId !== scope.regionId) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} scope does not match`,
		);
	}
}

function withoutKey<T extends Record<string, unknown>>(
	record: T,
	key: keyof T,
): Record<string, unknown> {
	const result = { ...record };
	delete result[key];
	return result;
}

async function sha256(value: string): Promise<string> {
	if (globalThis.crypto?.subtle === undefined) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"WebCrypto SHA-256 is unavailable",
		);
	}
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		textEncoder.encode(value),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function domainHash(domain: string, value: unknown): Promise<string> {
	return await sha256(`${domain}\u0000${canonicalJson(value as JsonValue)}`);
}

function streamKey(scope: AuthorityScope): string {
	return canonicalJson([scope.runId, scope.regionId]);
}

function recordKey(scope: AuthorityScope, identifier: string): string {
	return canonicalJson([scope.runId, scope.regionId, identifier]);
}

function eventKey(scope: AuthorityScope, sequence: number): string {
	return canonicalJson([scope.runId, scope.regionId, sequence]);
}

export async function hashAuthoritativeState(
	state: JsonValue,
): Promise<string> {
	return await domainHash("eonfolk-authoritative-state-v1", state);
}

export async function createAuthorityHead(
	input: Omit<AuthorityHead, "headHash" | "schemaVersion">,
): Promise<AuthorityHead> {
	const unsigned = {
		...input,
		schemaVersion: AUTHORITY_HEAD_SCHEMA_VERSION,
	};
	return {
		...unsigned,
		headHash: await domainHash("eonfolk-authority-head-v1", unsigned),
	};
}

export async function createAuthoritySnapshot(
	input: Omit<
		AuthoritySnapshotRecord,
		"schemaVersion" | "snapshotHash" | "stateHash"
	>,
): Promise<AuthoritySnapshotRecord> {
	const unsigned = {
		...input,
		schemaVersion: AUTHORITY_SNAPSHOT_SCHEMA_VERSION,
		stateHash: await hashAuthoritativeState(input.state),
	};
	return {
		...unsigned,
		snapshotHash: await domainHash("eonfolk-authority-snapshot-v1", unsigned),
	};
}

export async function createAuthorityEvent(
	input: Omit<AuthorityEventRecord, "eventHash" | "schemaVersion">,
): Promise<AuthorityEventRecord> {
	const unsigned = {
		...input,
		schemaVersion: AUTHORITY_EVENT_SCHEMA_VERSION,
	};
	return {
		...unsigned,
		eventHash: await domainHash("eonfolk-authority-event-v1", unsigned),
	};
}

async function validateHead(head: AuthorityHead): Promise<void> {
	assertVersion(
		head.schemaVersion,
		AUTHORITY_HEAD_SCHEMA_VERSION,
		"head schema",
	);
	assertIdentifier(head.runId, "head.runId");
	assertIdentifier(head.regionId, "head.regionId");
	assertIdentifier(head.engineVersion, "head.engineVersion");
	assertIdentifier(head.stateSchemaVersion, "head.stateSchemaVersion");
	assertInteger(head.revision, "head.revision");
	assertInteger(head.lastSequence, "head.lastSequence");
	assertInteger(head.simulationTime, "head.simulationTime");
	assertInteger(head.fencingToken, "head.fencingToken");
	assertHash(head.stateHash, "head.stateHash");
	assertHash(head.lastEventHash, "head.lastEventHash");
	assertHash(head.headHash, "head.headHash");
	const expected = await domainHash(
		"eonfolk-authority-head-v1",
		withoutKey(head as unknown as Record<string, unknown>, "headHash"),
	);
	if (expected !== head.headHash) {
		throw new PersistenceError(
			"STALE_STATE",
			"authority head integrity hash does not match",
		);
	}
}

async function validateSnapshot(
	snapshot: AuthoritySnapshotRecord,
	bounds: PersistenceBounds,
): Promise<void> {
	assertVersion(
		snapshot.schemaVersion,
		AUTHORITY_SNAPSHOT_SCHEMA_VERSION,
		"snapshot schema",
	);
	assertIdentifier(snapshot.runId, "snapshot.runId");
	assertIdentifier(snapshot.regionId, "snapshot.regionId");
	assertIdentifier(snapshot.engineVersion, "snapshot.engineVersion");
	assertIdentifier(snapshot.stateSchemaVersion, "snapshot.stateSchemaVersion");
	assertIdentifier(snapshot.snapshotId, "snapshot.snapshotId");
	assertInteger(snapshot.revision, "snapshot.revision");
	assertInteger(snapshot.baseSequence, "snapshot.baseSequence");
	assertInteger(snapshot.simulationTime, "snapshot.simulationTime");
	assertHash(snapshot.stateHash, "snapshot.stateHash");
	assertHash(snapshot.lastEventHash, "snapshot.lastEventHash");
	assertHash(snapshot.snapshotHash, "snapshot.snapshotHash");
	assertRecordBound(
		snapshot as unknown as JsonValue,
		bounds,
		"authority snapshot",
	);
	const [stateHash, snapshotHash] = await Promise.all([
		hashAuthoritativeState(snapshot.state),
		domainHash(
			"eonfolk-authority-snapshot-v1",
			withoutKey(
				snapshot as unknown as Record<string, unknown>,
				"snapshotHash",
			),
		),
	]);
	if (
		stateHash !== snapshot.stateHash ||
		snapshotHash !== snapshot.snapshotHash
	) {
		throw new PersistenceError("STALE_STATE", "authority snapshot is corrupt");
	}
}

export async function validateAuthorityEventRecord(
	event: AuthorityEventRecord,
	bounds: PersistenceBounds = resolveBounds(),
): Promise<void> {
	assertVersion(
		event.schemaVersion,
		AUTHORITY_EVENT_SCHEMA_VERSION,
		"event schema",
	);
	for (const [label, value] of Object.entries({
		"event.runId": event.runId,
		"event.regionId": event.regionId,
		"event.engineVersion": event.engineVersion,
		"event.stateSchemaVersion": event.stateSchemaVersion,
		"event.appendId": event.appendId,
		"event.batchId": event.batchId,
		"event.eventId": event.eventId,
		"event.eventType": event.eventType,
		"event.provenance.mechanismId": event.provenance.mechanismId,
	}))
		assertIdentifier(value, label);
	assertInteger(event.sequence, "event.sequence");
	assertInteger(event.simulationTime, "event.simulationTime");
	for (const [index, parent] of event.causalParents.entries()) {
		assertIdentifier(parent.eventId, `event.causalParents[${index}].eventId`);
		if (
			!(
				[
					"direct-cause",
					"trigger",
					"contributing-condition",
					"temporal-predecessor",
					"allegation",
				] as const
			).includes(parent.relation)
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				`event.causalParents[${index}].relation is unsupported`,
			);
		}
	}
	if (
		event.provenance.brainKind !== null &&
		event.provenance.brainKind !== "standard" &&
		event.provenance.brainKind !== "model"
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"event.provenance.brainKind is unsupported",
		);
	}
	if (
		event.provenance.brainKind === "model" &&
		event.provenance.cognitionDecisionId === null
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"model provenance requires a persisted cognition decision ID",
		);
	}
	if (event.provenance.cognitionDecisionId !== null) {
		assertIdentifier(
			event.provenance.cognitionDecisionId,
			"event.provenance.cognitionDecisionId",
		);
	}
	assertHash(event.preStateHash, "event.preStateHash");
	assertHash(event.postStateHash, "event.postStateHash");
	assertHash(event.previousEventHash, "event.previousEventHash");
	assertHash(event.eventHash, "event.eventHash");
	assertRecordBound(event as unknown as JsonValue, bounds, "authority event");
	const expected = await domainHash(
		"eonfolk-authority-event-v1",
		withoutKey(event as unknown as Record<string, unknown>, "eventHash"),
	);
	if (expected !== event.eventHash) {
		throw new PersistenceError(
			"STALE_STATE",
			"authority event integrity hash does not match",
		);
	}
}

async function validateAppendReceipt(
	receipt: AuthorityAppendReceipt,
): Promise<void> {
	assertVersion(
		receipt.schemaVersion,
		AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION,
		"append receipt schema",
	);
	for (const [label, value] of Object.entries({
		"receipt.runId": receipt.runId,
		"receipt.regionId": receipt.regionId,
		"receipt.appendId": receipt.appendId,
		"receipt.batchId": receipt.batchId,
	})) {
		assertIdentifier(value, label);
	}
	assertInteger(receipt.revision, "receipt.revision");
	assertInteger(receipt.fromSequenceInclusive, "receipt.fromSequenceInclusive");
	assertInteger(receipt.toSequenceExclusive, "receipt.toSequenceExclusive");
	assertHash(receipt.appendHash, "receipt.appendHash");
	assertHash(receipt.resultingStateHash, "receipt.resultingStateHash");
	assertHash(receipt.resultingLastEventHash, "receipt.resultingLastEventHash");
	assertHash(receipt.receiptHash, "receipt.receiptHash");
	if (receipt.fromSequenceInclusive >= receipt.toSequenceExclusive) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"append receipt interval must be non-empty",
		);
	}
	const expected = await domainHash(
		"eonfolk-authority-append-receipt-v1",
		withoutKey(receipt as unknown as Record<string, unknown>, "receiptHash"),
	);
	if (expected !== receipt.receiptHash) {
		throw new PersistenceError(
			"STALE_STATE",
			"append receipt integrity hash does not match",
		);
	}
}

interface AuthorityStores {
	heads: Map<string, AuthorityHead>;
	genesisFingerprints: Map<string, string>;
	events: Map<string, AuthorityEventRecord>;
	receipts: Map<string, AuthorityAppendReceipt>;
	requestFingerprints: Map<string, string>;
	snapshots: Map<string, AuthoritySnapshotRecord>;
}

function createStores(): AuthorityStores {
	return {
		heads: new Map(),
		genesisFingerprints: new Map(),
		events: new Map(),
		receipts: new Map(),
		requestFingerprints: new Map(),
		snapshots: new Map(),
	};
}

function cloneStores(stores: AuthorityStores): AuthorityStores {
	return {
		heads: new Map(stores.heads),
		genesisFingerprints: new Map(stores.genesisFingerprints),
		events: new Map(stores.events),
		receipts: new Map(stores.receipts),
		requestFingerprints: new Map(stores.requestFingerprints),
		snapshots: new Map(stores.snapshots),
	};
}

function requireHead(
	stores: AuthorityStores,
	scope: AuthorityScope,
): AuthorityHead {
	const head = stores.heads.get(streamKey(scope));
	if (head === undefined)
		throw new PersistenceError("NOT_FOUND", "authority stream was not found");
	return head;
}

export interface MemoryVersionedPersistenceOptions {
	readonly bounds?: Partial<PersistenceBounds>;
	readonly crashInjector?: VersionedCrashInjector;
}

export class MemoryVersionedPersistence implements VersionedPersistencePort {
	readonly portVersion = VERSIONED_PERSISTENCE_PORT_VERSION;
	readonly #bounds: PersistenceBounds;
	readonly #crashInjector: VersionedCrashInjector | undefined;
	#stores = createStores();

	constructor(options: MemoryVersionedPersistenceOptions = {}) {
		this.#bounds = resolveBounds(options.bounds);
		this.#crashInjector = options.crashInjector;
	}

	#hit(point: Parameters<VersionedCrashInjector["hit"]>[0]): void {
		this.#crashInjector?.hit(point);
	}

	async initialize(
		request: InitializeAuthorityRequest,
	): Promise<InitializeAuthorityResult> {
		assertVersion(
			request.schemaVersion,
			AUTHORITY_GENESIS_SCHEMA_VERSION,
			"genesis schema",
		);
		assertIdentifier(request.genesisId, "genesis.genesisId");
		assertScope(request.head, request, "genesis head");
		assertScope(request.snapshot, request, "genesis snapshot");
		await Promise.all([
			validateHead(request.head),
			validateSnapshot(request.snapshot, this.#bounds),
		]);
		if (
			request.head.revision !== 0 ||
			request.head.lastSequence !== 0 ||
			request.head.lastEventHash !== EMPTY_EVENT_HASH ||
			request.snapshot.revision !== 0 ||
			request.snapshot.baseSequence !== 0 ||
			request.head.simulationTime !== request.snapshot.simulationTime ||
			request.snapshot.engineVersion !== request.head.engineVersion ||
			request.snapshot.stateSchemaVersion !== request.head.stateSchemaVersion ||
			request.snapshot.stateHash !== request.head.stateHash ||
			request.snapshot.lastEventHash !== request.head.lastEventHash
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"genesis head and snapshot do not describe the same empty stream",
			);
		}
		const key = streamKey(request);
		const fingerprint = canonicalJson(request as unknown as JsonValue);
		const existing = this.#stores.genesisFingerprints.get(key);
		if (existing !== undefined) {
			if (existing !== fingerprint)
				throw new PersistenceError(
					"RUN_ID_COLLISION",
					"authority genesis differs for the same stream",
				);
			return {
				head: await this.loadHead(request),
				snapshot: await this.loadSnapshot(request, request.snapshot.snapshotId),
				idempotent: true,
			};
		}
		const staged = cloneStores(this.#stores);
		staged.genesisFingerprints.set(key, fingerprint);
		staged.heads.set(key, cloneValue(request.head));
		staged.snapshots.set(
			recordKey(request, request.snapshot.snapshotId),
			cloneValue(request.snapshot),
		);
		this.#hit("authority-genesis:before-commit");
		this.#stores = staged;
		this.#hit("authority-genesis:after-commit");
		return {
			head: cloneValue(request.head),
			snapshot: cloneValue(request.snapshot),
			idempotent: false,
		};
	}

	async loadHead(scope: AuthorityScope): Promise<AuthorityHead> {
		const head = cloneValue(requireHead(this.#stores, scope));
		await validateHead(head);
		return head;
	}

	async acquireWriterFence(
		scope: AuthorityScope,
		expectedFencingToken: number,
	): Promise<AuthorityHead> {
		assertInteger(expectedFencingToken, "expectedFencingToken");
		const current = await this.loadHead(scope);
		if (current.fencingToken !== expectedFencingToken)
			throw new PersistenceError(
				"STALE_FENCE",
				"writer used a stale fencing token",
			);
		if (expectedFencingToken === Number.MAX_SAFE_INTEGER)
			throw new PersistenceError(
				"STORAGE_LIMIT",
				"fencing token exhausted safe integers",
			);
		const {
			schemaVersion: _schemaVersion,
			headHash: _headHash,
			...unsignedCurrent
		} = current;
		const next = await createAuthorityHead({
			...unsignedCurrent,
			fencingToken: expectedFencingToken + 1,
		});
		const staged = cloneStores(this.#stores);
		staged.heads.set(streamKey(scope), next);
		this.#hit("authority-fence:before-commit");
		this.#stores = staged;
		this.#hit("authority-fence:after-commit");
		return cloneValue(next);
	}

	async appendEventBatch(
		request: AppendAuthorityBatchRequest,
	): Promise<AppendAuthorityBatchResult> {
		assertVersion(
			request.schemaVersion,
			AUTHORITY_APPEND_SCHEMA_VERSION,
			"append schema",
		);
		assertIdentifier(request.appendId, "append.appendId");
		assertIdentifier(request.batchId, "append.batchId");
		assertInteger(request.expectedRevision, "append.expectedRevision");
		assertInteger(request.expectedLastSequence, "append.expectedLastSequence");
		assertInteger(request.fencingToken, "append.fencingToken");
		assertHash(request.expectedStateHash, "append.expectedStateHash");
		assertHash(request.expectedLastEventHash, "append.expectedLastEventHash");
		if (
			request.events.length < 1 ||
			request.events.length > this.#bounds.maximumEventsPerBatch
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"append event count is outside bounds",
			);
		}
		assertRecordBound(
			request as unknown as JsonValue,
			this.#bounds,
			"authority append",
		);
		const receiptKey = recordKey(request, request.appendId);
		const requestFingerprint = await domainHash(
			"eonfolk-authority-append-v1",
			request,
		);
		const priorReceipt = this.#stores.receipts.get(receiptKey);
		if (priorReceipt !== undefined) {
			await validateAppendReceipt(priorReceipt);
			if (
				this.#stores.requestFingerprints.get(receiptKey) !== requestFingerprint
			) {
				throw new PersistenceError(
					"IDEMPOTENCY_COLLISION",
					"append ID has different authoritative bytes",
				);
			}
			return {
				head: await this.loadHead(request),
				receipt: cloneValue(priorReceipt),
				idempotent: true,
			};
		}
		const head = await this.loadHead(request);
		if (
			[...this.#stores.receipts.values()].some(
				(receipt) =>
					receipt.runId === request.runId &&
					receipt.regionId === request.regionId &&
					receipt.batchId === request.batchId,
			)
		) {
			throw new PersistenceError(
				"BATCH_COLLISION",
				"batch ID already belongs to another append",
			);
		}
		if (request.fencingToken !== head.fencingToken)
			throw new PersistenceError(
				"STALE_FENCE",
				"append used a stale fencing token",
			);
		if (request.expectedRevision !== head.revision)
			throw new PersistenceError(
				"STALE_REVISION",
				"append expected a stale revision",
			);
		if (request.expectedLastSequence !== head.lastSequence)
			throw new PersistenceError(
				"RANGE_GAP",
				"append expected a stale sequence head",
			);
		if (request.expectedStateHash !== head.stateHash)
			throw new PersistenceError(
				"STALE_STATE",
				"append expected a stale state hash",
			);
		if (request.expectedLastEventHash !== head.lastEventHash)
			throw new PersistenceError(
				"STALE_WORLD_HEAD",
				"append expected a stale event hash",
			);

		let previousStateHash = head.stateHash;
		let previousEventHash = head.lastEventHash;
		let previousSimulationTime = head.simulationTime;
		const eventIds = new Set<string>();
		for (const [index, event] of request.events.entries()) {
			await validateAuthorityEventRecord(event, this.#bounds);
			assertScope(event, request, `event ${index}`);
			if (
				event.engineVersion !== head.engineVersion ||
				event.stateSchemaVersion !== head.stateSchemaVersion
			) {
				throw new PersistenceError(
					"UNSUPPORTED_VERSION",
					"append runtime versions differ from the authority stream",
				);
			}
			if (
				event.appendId !== request.appendId ||
				event.batchId !== request.batchId ||
				event.sequence !== head.lastSequence + index + 1 ||
				event.simulationTime < previousSimulationTime ||
				event.preStateHash !== previousStateHash ||
				event.previousEventHash !== previousEventHash
			)
				throw new PersistenceError(
					"RANGE_GAP",
					`event ${index} breaks authoritative continuity`,
				);
			if (this.#stores.events.has(eventKey(request, event.sequence)))
				throw new PersistenceError(
					"EVENT_COLLISION",
					"event sequence already exists",
				);
			if (
				eventIds.has(event.eventId) ||
				[...this.#stores.events.values()].some(
					(existing) =>
						existing.runId === request.runId &&
						existing.regionId === request.regionId &&
						existing.eventId === event.eventId,
				)
			)
				throw new PersistenceError(
					"EVENT_COLLISION",
					"event ID already exists in the authority stream",
				);
			eventIds.add(event.eventId);
			previousStateHash = event.postStateHash;
			previousEventHash = event.eventHash;
			previousSimulationTime = event.simulationTime;
		}
		const finalEvent = request.events.at(-1);
		if (finalEvent === undefined)
			throw new PersistenceError("INVALID_INPUT", "append requires an event");
		const nextHead = await createAuthorityHead({
			runId: request.runId,
			regionId: request.regionId,
			engineVersion: head.engineVersion,
			stateSchemaVersion: head.stateSchemaVersion,
			revision: head.revision + 1,
			lastSequence: finalEvent.sequence,
			simulationTime: finalEvent.simulationTime,
			stateHash: finalEvent.postStateHash,
			lastEventHash: finalEvent.eventHash,
			fencingToken: head.fencingToken,
		});
		const unsignedReceipt = {
			schemaVersion: AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION,
			runId: request.runId,
			regionId: request.regionId,
			appendId: request.appendId,
			appendHash: requestFingerprint,
			batchId: request.batchId,
			revision: nextHead.revision,
			fromSequenceInclusive: request.events[0]?.sequence ?? 0,
			toSequenceExclusive: finalEvent.sequence + 1,
			resultingStateHash: nextHead.stateHash,
			resultingLastEventHash: nextHead.lastEventHash,
		};
		const receipt: AuthorityAppendReceipt = {
			...unsignedReceipt,
			receiptHash: await domainHash(
				"eonfolk-authority-append-receipt-v1",
				unsignedReceipt,
			),
		};
		const staged = cloneStores(this.#stores);
		for (const event of request.events)
			staged.events.set(eventKey(request, event.sequence), cloneValue(event));
		staged.receipts.set(receiptKey, receipt);
		staged.requestFingerprints.set(receiptKey, requestFingerprint);
		staged.heads.set(streamKey(request), nextHead);
		this.#hit("authority-append:before-commit");
		this.#stores = staged;
		this.#hit("authority-append:after-commit");
		return {
			head: cloneValue(nextHead),
			receipt: cloneValue(receipt),
			idempotent: false,
		};
	}

	async getAppendReceipt(
		scope: AuthorityScope,
		appendId: string,
	): Promise<AuthorityAppendReceipt | null> {
		assertIdentifier(appendId, "appendId");
		const receipt = this.#stores.receipts.get(recordKey(scope, appendId));
		if (receipt === undefined) return null;
		await validateAppendReceipt(receipt);
		assertScope(receipt, scope, "append receipt");
		return cloneValue(receipt);
	}

	async getEventRange(
		request: AuthorityEventRangeRequest,
	): Promise<readonly AuthorityEventRecord[]> {
		assertInteger(request.fromSequenceInclusive, "range.fromSequenceInclusive");
		assertInteger(request.toSequenceExclusive, "range.toSequenceExclusive");
		if (
			request.fromSequenceInclusive < 1 ||
			request.toSequenceExclusive < request.fromSequenceInclusive ||
			request.toSequenceExclusive - request.fromSequenceInclusive >
				this.#bounds.maximumEventsPerRange
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"event range is not a bounded half-open interval",
			);
		}
		const head = await this.loadHead(request);
		if (request.toSequenceExclusive > head.lastSequence + 1)
			throw new PersistenceError(
				"RANGE_GAP",
				"event range extends beyond the durable head",
			);
		const events: AuthorityEventRecord[] = [];
		let previousEventHash: string;
		let previousStateHash: string;
		let previousSimulationTime: number;
		if (request.fromSequenceInclusive === 1) {
			const genesisSnapshot = [...this.#stores.snapshots.values()].find(
				(snapshot) =>
					snapshot.runId === request.runId &&
					snapshot.regionId === request.regionId &&
					snapshot.baseSequence === 0,
			);
			if (genesisSnapshot === undefined) {
				throw new PersistenceError("RANGE_GAP", "genesis snapshot is missing");
			}
			await validateSnapshot(genesisSnapshot, this.#bounds);
			previousEventHash = genesisSnapshot.lastEventHash;
			previousStateHash = genesisSnapshot.stateHash;
			previousSimulationTime = genesisSnapshot.simulationTime;
		} else {
			const previous = this.#stores.events.get(
				eventKey(request, request.fromSequenceInclusive - 1),
			);
			if (previous === undefined) {
				throw new PersistenceError(
					"RANGE_GAP",
					`missing event sequence ${request.fromSequenceInclusive - 1}`,
				);
			}
			await validateAuthorityEventRecord(previous, this.#bounds);
			assertScope(previous, request, "previous event");
			previousEventHash = previous.eventHash;
			previousStateHash = previous.postStateHash;
			previousSimulationTime = previous.simulationTime;
		}
		for (
			let sequence = request.fromSequenceInclusive;
			sequence < request.toSequenceExclusive;
			sequence += 1
		) {
			const event = this.#stores.events.get(eventKey(request, sequence));
			if (event === undefined)
				throw new PersistenceError(
					"RANGE_GAP",
					`missing event sequence ${sequence}`,
				);
			await validateAuthorityEventRecord(event, this.#bounds);
			assertScope(event, request, `event ${sequence}`);
			if (
				event.sequence !== sequence ||
				event.previousEventHash !== previousEventHash ||
				event.preStateHash !== previousStateHash ||
				event.simulationTime < previousSimulationTime
			) {
				throw new PersistenceError(
					"RANGE_GAP",
					`event ${sequence} breaks range continuity`,
				);
			}
			previousEventHash = event.eventHash;
			previousStateHash = event.postStateHash;
			previousSimulationTime = event.simulationTime;
			events.push(cloneValue(event));
		}
		return events;
	}

	async saveSnapshot(
		request: SaveAuthoritySnapshotRequest,
	): Promise<AuthoritySnapshotRecord> {
		const { snapshot } = request;
		await validateSnapshot(snapshot, this.#bounds);
		const head = await this.loadHead(snapshot);
		if (request.fencingToken !== head.fencingToken)
			throw new PersistenceError(
				"STALE_FENCE",
				"snapshot used a stale fencing token",
			);
		if (
			snapshot.engineVersion !== head.engineVersion ||
			snapshot.stateSchemaVersion !== head.stateSchemaVersion
		) {
			throw new PersistenceError(
				"UNSUPPORTED_VERSION",
				"snapshot runtime versions differ from the stream",
			);
		}
		if (
			snapshot.revision !== head.revision ||
			snapshot.baseSequence !== head.lastSequence ||
			snapshot.simulationTime !== head.simulationTime ||
			snapshot.stateHash !== head.stateHash ||
			snapshot.lastEventHash !== head.lastEventHash
		) {
			throw new PersistenceError(
				"STALE_WORLD_HEAD",
				"snapshot must describe the exact durable head",
			);
		}
		const key = recordKey(snapshot, snapshot.snapshotId);
		const existing = this.#stores.snapshots.get(key);
		if (existing !== undefined) {
			if (
				canonicalJson(existing as unknown as JsonValue) !==
				canonicalJson(snapshot as unknown as JsonValue)
			)
				throw new PersistenceError(
					"SNAPSHOT_ID_COLLISION",
					"snapshot ID has different bytes",
				);
			return cloneValue(existing);
		}
		const count = [...this.#stores.snapshots.values()].filter(
			(item) =>
				item.runId === snapshot.runId && item.regionId === snapshot.regionId,
		).length;
		if (count >= this.#bounds.maximumSnapshots)
			throw new PersistenceError(
				"STORAGE_LIMIT",
				"snapshot count reached its bound",
			);
		const staged = cloneStores(this.#stores);
		staged.snapshots.set(key, cloneValue(snapshot));
		this.#hit("authority-snapshot:before-commit");
		this.#stores = staged;
		this.#hit("authority-snapshot:after-commit");
		return cloneValue(snapshot);
	}

	async loadSnapshot(
		scope: AuthorityScope,
		snapshotId: string,
	): Promise<AuthoritySnapshotRecord> {
		assertIdentifier(snapshotId, "snapshotId");
		const snapshot = this.#stores.snapshots.get(recordKey(scope, snapshotId));
		if (snapshot === undefined)
			throw new PersistenceError(
				"NOT_FOUND",
				"authority snapshot was not found",
			);
		await validateSnapshot(snapshot, this.#bounds);
		assertScope(snapshot, scope, "snapshot");
		return cloneValue(snapshot);
	}

	async loadLatestSnapshot(
		scope: AuthorityScope,
	): Promise<AuthoritySnapshotRecord> {
		const snapshot = [...this.#stores.snapshots.values()]
			.filter(
				(item) =>
					item.runId === scope.runId && item.regionId === scope.regionId,
			)
			.sort(
				(left, right) =>
					right.baseSequence - left.baseSequence ||
					right.revision - left.revision ||
					left.snapshotId.localeCompare(right.snapshotId),
			)[0];
		if (snapshot === undefined)
			throw new PersistenceError(
				"NOT_FOUND",
				"authority snapshot was not found",
			);
		return await this.loadSnapshot(scope, snapshot.snapshotId);
	}
}

export async function replayAuthoritativeEvents<TState extends JsonValue>(
	port: VersionedPersistencePort,
	request: AuthorityReplayRequest,
	reduce: (state: TState, event: AuthorityEventRecord) => TState,
): Promise<AuthorityReplayResult<TState>> {
	assertVersion(
		port.portVersion,
		VERSIONED_PERSISTENCE_PORT_VERSION,
		"persistence port",
	);
	const snapshot = await port.loadSnapshot(request, request.snapshotId);
	const events = await port.getEventRange({
		runId: request.runId,
		regionId: request.regionId,
		fromSequenceInclusive: snapshot.baseSequence + 1,
		toSequenceExclusive: request.toSequenceExclusive,
	});
	let state = cloneValue(snapshot.state) as TState;
	let stateHash = await hashAuthoritativeState(state);
	let lastEventHash = snapshot.lastEventHash;
	for (const event of events) {
		if (
			event.engineVersion !== snapshot.engineVersion ||
			event.stateSchemaVersion !== snapshot.stateSchemaVersion
		) {
			throw new PersistenceError(
				"UNSUPPORTED_VERSION",
				"replay requires an explicit reviewed runtime migration",
			);
		}
		if (
			event.preStateHash !== stateHash ||
			event.previousEventHash !== lastEventHash
		)
			throw new PersistenceError(
				"RANGE_GAP",
				"replay input does not continue from the snapshot",
			);
		state = reduce(cloneValue(state), cloneValue(event));
		stateHash = await hashAuthoritativeState(state);
		if (stateHash !== event.postStateHash)
			throw new PersistenceError(
				"STALE_STATE",
				`reducer disagrees with event ${event.eventId}`,
			);
		lastEventHash = event.eventHash;
	}
	return { state: cloneValue(state), events, stateHash, lastEventHash };
}
