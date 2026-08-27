import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	createCivilizationPersistencePlan,
	hashAuthoritativeState,
	type JsonValue,
	RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
} from "@eonfolk/persistence";
import type { GeneratedWorldState } from "@eonfolk/protocol";

export const V1_INDEXEDDB_DATABASE = "eonfolk-v1-civilization";
export const V1_INDEXEDDB_STORE = "canonical-checkpoints";
export const V1_INDEXEDDB_DATABASE_VERSION = 1;
export const V1_BROWSER_CHECKPOINT_SCHEMA_VERSION =
	"eonfolk-v1-browser-checkpoint-v1" as const;

const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const KEY_PATTERN = /^[a-z][a-z0-9:-]{0,127}$/u;
const CHECKPOINT_RECORD_KEYS = new Set([
	"schemaVersion",
	"storageKey",
	"worldId",
	"worldIdentityHash",
	"persistenceEngineVersion",
	"persistenceStateVersion",
	"persistenceTransitionVersion",
	"checkpointSchemaVersion",
	"runnerVersion",
	"initializedHorizonDays",
	"horizonDays",
	"initialStateHash",
	"finalStateHash",
	"finalEventHash",
	"eventCount",
	"stepCount",
	"genesisWorld",
	"checkpoint",
	"catchUpReceipts",
	"recordHash",
]);
const CATCH_UP_RECEIPT_KEYS = new Set([
	"requestId",
	"fromHorizonDays",
	"toHorizonDays",
	"resultingStateHash",
]);

export type V1CheckpointFailureCode =
	| "AUTHORITY_FAILURE"
	| "CORRUPT_RECORD"
	| "IDENTITY_MISMATCH"
	| "INVALID_REQUEST"
	| "STORAGE_CONFLICT"
	| "STORAGE_FAILURE"
	| "UNSUPPORTED_VERSION";

export class V1CheckpointError extends Error {
	readonly code: V1CheckpointFailureCode;

	constructor(code: V1CheckpointFailureCode, message: string) {
		super(message);
		this.name = "V1CheckpointError";
		this.code = code;
	}
}

export interface V1CatchUpReceipt {
	readonly requestId: string;
	readonly fromHorizonDays: number;
	readonly toHorizonDays: number;
	readonly resultingStateHash: string;
}

interface V1CheckpointBody {
	readonly schemaVersion: typeof V1_BROWSER_CHECKPOINT_SCHEMA_VERSION;
	readonly storageKey: string;
	readonly worldId: string;
	readonly worldIdentityHash: string;
	readonly persistenceEngineVersion: typeof RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION;
	readonly persistenceStateVersion: typeof RELEASE_GENESIS_CIVILIZATION_STATE_VERSION;
	readonly persistenceTransitionVersion: typeof RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION;
	readonly checkpointSchemaVersion: string;
	readonly runnerVersion: string;
	readonly initializedHorizonDays: number;
	readonly horizonDays: number;
	readonly initialStateHash: string;
	readonly finalStateHash: string;
	readonly finalEventHash: string | null;
	readonly eventCount: number;
	readonly stepCount: number;
	readonly genesisWorld: GeneratedWorldState;
	readonly checkpoint: CivilizationExperimentRun;
	readonly catchUpReceipts: readonly V1CatchUpReceipt[];
}

export interface V1PersistedCheckpoint extends V1CheckpointBody {
	readonly recordHash: string;
}

export interface V1CheckpointStoragePort {
	load(storageKey: string): Promise<unknown | null>;
	compareAndSwap(input: {
		readonly storageKey: string;
		readonly expectedRecordHash: string | null;
		readonly next: V1PersistedCheckpoint;
	}): Promise<{ readonly idempotent: boolean }>;
}

export type V1IndexedDbAvailability =
	| {
			readonly available: true;
			readonly port: V1CheckpointStoragePort;
	  }
	| {
			readonly available: false;
			readonly reason: "indexeddb-unavailable";
	  };

export interface V1InitializeCheckpointRequest {
	readonly storage: V1CheckpointStoragePort;
	readonly storageKey: string;
	readonly genesisWorld: GeneratedWorldState;
	readonly checkpoint: CivilizationExperimentRun;
}

export interface V1CheckpointCommitResult {
	readonly checkpoint: V1PersistedCheckpoint;
	readonly idempotent: boolean;
}

export interface V1CatchUpRequest {
	readonly storage: V1CheckpointStoragePort;
	readonly storageKey: string;
	readonly requestId: string;
	readonly targetHorizonDays: number;
	readonly authorityRunner?: typeof runCivilizationExperiment;
}

export interface V1CatchUpResult extends V1CheckpointCommitResult {
	readonly receipt: V1CatchUpReceipt;
	readonly appendedEvents: ReadonlyArray<
		CivilizationExperimentRun["events"][number]
	>;
}

function fail(code: V1CheckpointFailureCode, message: string): never {
	throw new V1CheckpointError(code, message);
}

function record(
	value: unknown,
	label: string,
): Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail("CORRUPT_RECORD", `${label} must be a record`);
	return value as Readonly<Record<string, unknown>>;
}

function validKey(value: string, label: string): string {
	if (!KEY_PATTERN.test(value))
		fail("INVALID_REQUEST", `${label} is not a bounded canonical key`);
	return value;
}

function validHorizon(value: number, label: string): number {
	if (!Number.isSafeInteger(value) || value < 1 || value > 365)
		fail("INVALID_REQUEST", `${label} must be an integer from 1 through 365`);
	return value;
}

function bodyOf(value: V1PersistedCheckpoint): V1CheckpointBody {
	return {
		schemaVersion: value.schemaVersion,
		storageKey: value.storageKey,
		worldId: value.worldId,
		worldIdentityHash: value.worldIdentityHash,
		persistenceEngineVersion: value.persistenceEngineVersion,
		persistenceStateVersion: value.persistenceStateVersion,
		persistenceTransitionVersion: value.persistenceTransitionVersion,
		checkpointSchemaVersion: value.checkpointSchemaVersion,
		runnerVersion: value.runnerVersion,
		initializedHorizonDays: value.initializedHorizonDays,
		horizonDays: value.horizonDays,
		initialStateHash: value.initialStateHash,
		finalStateHash: value.finalStateHash,
		finalEventHash: value.finalEventHash,
		eventCount: value.eventCount,
		stepCount: value.stepCount,
		genesisWorld: value.genesisWorld,
		checkpoint: value.checkpoint,
		catchUpReceipts: value.catchUpReceipts,
	};
}

async function hashBody(body: V1CheckpointBody): Promise<string> {
	return hashAuthoritativeState(body as unknown as JsonValue);
}

async function validateAuthority(
	genesisWorld: GeneratedWorldState,
	checkpoints: readonly CivilizationExperimentRun[],
): Promise<void> {
	await createCivilizationPersistencePlan({
		runId: "v1-browser-validation",
		regionId: genesisWorld.identity.worldId,
		genesisId: "v1-browser-validation-genesis",
		genesisWorld,
		checkpoints,
		batchSize: 1,
	});
}

async function makeCheckpoint(
	input: Omit<
		V1CheckpointBody,
		| "schemaVersion"
		| "worldId"
		| "worldIdentityHash"
		| "checkpointSchemaVersion"
		| "runnerVersion"
		| "horizonDays"
		| "initialStateHash"
		| "finalStateHash"
		| "finalEventHash"
		| "eventCount"
		| "stepCount"
		| "persistenceEngineVersion"
		| "persistenceStateVersion"
		| "persistenceTransitionVersion"
	> & {
		readonly genesisWorld: GeneratedWorldState;
		readonly checkpoint: CivilizationExperimentRun;
	},
): Promise<V1PersistedCheckpoint> {
	validKey(input.storageKey, "storageKey");
	validHorizon(input.initializedHorizonDays, "initializedHorizonDays");
	validHorizon(input.checkpoint.horizonDays, "checkpoint.horizonDays");
	try {
		await validateAuthority(input.genesisWorld, [input.checkpoint]);
	} catch (error) {
		fail(
			"AUTHORITY_FAILURE",
			`checkpoint authority rejected the candidate: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
	const body: V1CheckpointBody = {
		schemaVersion: V1_BROWSER_CHECKPOINT_SCHEMA_VERSION,
		storageKey: input.storageKey,
		worldId: input.genesisWorld.identity.worldId,
		worldIdentityHash: input.genesisWorld.identity.identityHash,
		persistenceEngineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		persistenceStateVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		persistenceTransitionVersion:
			RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
		checkpointSchemaVersion: input.checkpoint.schemaVersion,
		runnerVersion: input.checkpoint.runnerVersion,
		initializedHorizonDays: input.initializedHorizonDays,
		horizonDays: input.checkpoint.horizonDays,
		initialStateHash: input.checkpoint.initialStateHash,
		finalStateHash: input.checkpoint.finalStateHash,
		finalEventHash: input.checkpoint.finalEventHash,
		eventCount: input.checkpoint.events.length,
		stepCount: input.checkpoint.steps.length,
		genesisWorld: input.genesisWorld,
		checkpoint: input.checkpoint,
		catchUpReceipts: input.catchUpReceipts,
	};
	validateReceiptHistory(body);
	return { ...body, recordHash: await hashBody(body) };
}

function validateReceiptHistory(candidate: V1CheckpointBody): void {
	if (
		!Number.isSafeInteger(candidate.initializedHorizonDays) ||
		candidate.initializedHorizonDays < 1 ||
		candidate.initializedHorizonDays > 365 ||
		!Array.isArray(candidate.catchUpReceipts)
	)
		fail("CORRUPT_RECORD", "checkpoint receipt history is malformed");
	const requestIds = new Set<string>();
	let expectedFrom = candidate.initializedHorizonDays;
	for (const [index, value] of candidate.catchUpReceipts.entries()) {
		const receipt = record(value, `catch-up receipt ${index}`);
		if (
			Object.keys(receipt).length !== CATCH_UP_RECEIPT_KEYS.size ||
			Object.keys(receipt).some((key) => !CATCH_UP_RECEIPT_KEYS.has(key)) ||
			typeof receipt.requestId !== "string" ||
			!KEY_PATTERN.test(receipt.requestId) ||
			requestIds.has(receipt.requestId) ||
			receipt.fromHorizonDays !== expectedFrom ||
			!Number.isSafeInteger(receipt.toHorizonDays) ||
			(receipt.toHorizonDays as number) <= expectedFrom ||
			(receipt.toHorizonDays as number) > 365 ||
			typeof receipt.resultingStateHash !== "string" ||
			!HASH_PATTERN.test(receipt.resultingStateHash)
		)
			fail("CORRUPT_RECORD", `catch-up receipt ${index} is malformed`);
		requestIds.add(receipt.requestId);
		expectedFrom = receipt.toHorizonDays as number;
	}
	if (expectedFrom !== candidate.horizonDays)
		fail("CORRUPT_RECORD", "catch-up receipts do not reach the checkpoint");
	const finalReceipt = candidate.catchUpReceipts.at(-1);
	if (
		finalReceipt !== undefined &&
		finalReceipt.resultingStateHash !== candidate.finalStateHash
	)
		fail("CORRUPT_RECORD", "catch-up receipt state hash is stale");
}

export async function validateV1PersistedCheckpoint(
	value: unknown,
	expectedStorageKey?: string,
): Promise<V1PersistedCheckpoint> {
	const raw = record(value, "checkpoint record");
	if (
		Object.keys(raw).length !== CHECKPOINT_RECORD_KEYS.size ||
		Object.keys(raw).some((key) => !CHECKPOINT_RECORD_KEYS.has(key))
	)
		fail("CORRUPT_RECORD", "checkpoint record shape is not canonical");
	if (raw.schemaVersion !== V1_BROWSER_CHECKPOINT_SCHEMA_VERSION)
		fail("UNSUPPORTED_VERSION", "checkpoint record version is unsupported");
	const candidate = value as V1PersistedCheckpoint;
	if (
		typeof candidate.storageKey !== "string" ||
		!KEY_PATTERN.test(candidate.storageKey)
	)
		fail("CORRUPT_RECORD", "checkpoint storage key is malformed");
	if (
		expectedStorageKey !== undefined &&
		candidate.storageKey !== expectedStorageKey
	)
		fail("IDENTITY_MISMATCH", "checkpoint storage identity does not match");
	if (
		candidate.persistenceEngineVersion !==
			RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION ||
		candidate.persistenceStateVersion !==
			RELEASE_GENESIS_CIVILIZATION_STATE_VERSION ||
		candidate.persistenceTransitionVersion !==
			RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION
	)
		fail(
			"UNSUPPORTED_VERSION",
			"checkpoint persistence version is unsupported",
		);
	if (
		candidate.worldId !== candidate.genesisWorld?.identity?.worldId ||
		candidate.worldIdentityHash !==
			candidate.genesisWorld?.identity?.identityHash ||
		candidate.worldIdentityHash !== candidate.checkpoint?.worldIdentityHash ||
		candidate.checkpointSchemaVersion !== candidate.checkpoint?.schemaVersion ||
		candidate.runnerVersion !== candidate.checkpoint?.runnerVersion ||
		candidate.horizonDays !== candidate.checkpoint?.horizonDays ||
		candidate.initialStateHash !== candidate.checkpoint?.initialStateHash ||
		candidate.finalStateHash !== candidate.checkpoint?.finalStateHash ||
		candidate.finalEventHash !== candidate.checkpoint?.finalEventHash ||
		candidate.eventCount !== candidate.checkpoint?.events?.length ||
		candidate.stepCount !== candidate.checkpoint?.steps?.length
	)
		fail("IDENTITY_MISMATCH", "checkpoint metadata does not match its payload");
	validateReceiptHistory(candidate);
	if (
		typeof candidate.recordHash !== "string" ||
		!HASH_PATTERN.test(candidate.recordHash)
	)
		fail("CORRUPT_RECORD", "checkpoint record hash is malformed");
	let expectedHash: string;
	try {
		expectedHash = await hashBody(bodyOf(candidate));
	} catch {
		fail("CORRUPT_RECORD", "checkpoint record is not canonical JSON");
	}
	if (expectedHash !== candidate.recordHash)
		fail("CORRUPT_RECORD", "checkpoint record hash does not match its bytes");
	try {
		await validateAuthority(candidate.genesisWorld, [candidate.checkpoint]);
	} catch (error) {
		if (error instanceof V1CheckpointError) throw error;
		fail(
			"CORRUPT_RECORD",
			`checkpoint authority validation failed: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
	return candidate;
}

async function loadRaw(
	storage: V1CheckpointStoragePort,
	storageKey: string,
): Promise<unknown | null> {
	try {
		return await storage.load(storageKey);
	} catch (error) {
		if (error instanceof V1CheckpointError) throw error;
		fail(
			"STORAGE_FAILURE",
			`checkpoint load failed: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
}

async function commitCheckpoint(
	storage: V1CheckpointStoragePort,
	input: Parameters<V1CheckpointStoragePort["compareAndSwap"]>[0],
): Promise<{ readonly idempotent: boolean }> {
	try {
		return await storage.compareAndSwap(input);
	} catch (error) {
		if (error instanceof V1CheckpointError) throw error;
		fail(
			"STORAGE_FAILURE",
			`checkpoint transaction failed: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
}

export async function initializeV1Checkpoint(
	input: V1InitializeCheckpointRequest,
): Promise<V1CheckpointCommitResult> {
	const next = await makeCheckpoint({
		storageKey: input.storageKey,
		genesisWorld: input.genesisWorld,
		checkpoint: input.checkpoint,
		initializedHorizonDays: input.checkpoint.horizonDays,
		catchUpReceipts: [],
	});
	const existing = await loadRaw(input.storage, input.storageKey);
	if (existing !== null) {
		const validated = await validateV1PersistedCheckpoint(
			existing,
			input.storageKey,
		);
		if (validated.recordHash !== next.recordHash)
			fail("STORAGE_CONFLICT", "checkpoint storage is already initialized");
		return { checkpoint: validated, idempotent: true };
	}
	const committed = await commitCheckpoint(input.storage, {
		storageKey: input.storageKey,
		expectedRecordHash: null,
		next,
	});
	return { checkpoint: next, idempotent: committed.idempotent };
}

export async function loadV1Checkpoint(
	storage: V1CheckpointStoragePort,
	storageKey: string,
): Promise<V1PersistedCheckpoint | null> {
	validKey(storageKey, "storageKey");
	const value = await loadRaw(storage, storageKey);
	return value === null
		? null
		: validateV1PersistedCheckpoint(value, storageKey);
}

export async function catchUpV1Checkpoint(
	input: V1CatchUpRequest,
): Promise<V1CatchUpResult> {
	validKey(input.storageKey, "storageKey");
	validKey(input.requestId, "requestId");
	validHorizon(input.targetHorizonDays, "targetHorizonDays");
	const current = await loadV1Checkpoint(input.storage, input.storageKey);
	if (current === null)
		fail("INVALID_REQUEST", "catch-up requires an initialized checkpoint");
	const priorReceipt = current.catchUpReceipts.find(
		(receipt) => receipt.requestId === input.requestId,
	);
	if (priorReceipt !== undefined) {
		if (priorReceipt.toHorizonDays !== input.targetHorizonDays)
			fail("INVALID_REQUEST", "catch-up request ID was reused with new bounds");
		return {
			checkpoint: current,
			idempotent: true,
			receipt: priorReceipt,
			appendedEvents: [],
		};
	}
	if (input.targetHorizonDays <= current.horizonDays)
		fail("INVALID_REQUEST", "catch-up target must advance the stored horizon");
	const authorityRunner = input.authorityRunner ?? runCivilizationExperiment;
	let checkpoint: CivilizationExperimentRun;
	try {
		checkpoint = await authorityRunner({
			world: current.genesisWorld,
			horizonDays: input.targetHorizonDays,
		});
	} catch (error) {
		fail(
			"AUTHORITY_FAILURE",
			`catch-up authority failed: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
	// The persistence authority validates both complete chains and their exact prefix.
	try {
		await validateAuthority(current.genesisWorld, [
			current.checkpoint,
			checkpoint,
		]);
	} catch (error) {
		fail(
			"AUTHORITY_FAILURE",
			`catch-up authority returned an invalid history: ${error instanceof Error ? error.message : "unknown failure"}`,
		);
	}
	const receipt: V1CatchUpReceipt = {
		requestId: input.requestId,
		fromHorizonDays: current.horizonDays,
		toHorizonDays: input.targetHorizonDays,
		resultingStateHash: checkpoint.finalStateHash,
	};
	const next = await makeCheckpoint({
		storageKey: input.storageKey,
		genesisWorld: current.genesisWorld,
		checkpoint,
		initializedHorizonDays: current.initializedHorizonDays,
		catchUpReceipts: [...current.catchUpReceipts, receipt],
	});
	const appendedEvents = checkpoint.events.slice(
		current.checkpoint.events.length,
	);
	const committed = await commitCheckpoint(input.storage, {
		storageKey: input.storageKey,
		expectedRecordHash: current.recordHash,
		next,
	});
	return {
		checkpoint: next,
		idempotent: committed.idempotent,
		receipt,
		appendedEvents,
	};
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

function transactionComplete(transaction: IDBTransaction): Promise<void> {
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

function failStorage(action: string, error: unknown): never {
	if (error instanceof V1CheckpointError) throw error;
	if (
		error !== null &&
		typeof error === "object" &&
		"name" in error &&
		error.name === "VersionError"
	)
		fail(
			"UNSUPPORTED_VERSION",
			`${action} found an unsupported IndexedDB version`,
		);
	return fail(
		"STORAGE_FAILURE",
		`${action} failed: ${error instanceof Error ? error.message : "unknown failure"}`,
	);
}

async function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = factory.open(
			V1_INDEXEDDB_DATABASE,
			V1_INDEXEDDB_DATABASE_VERSION,
		);
		let settled = false;
		request.addEventListener("upgradeneeded", () => {
			if (!request.result.objectStoreNames.contains(V1_INDEXEDDB_STORE))
				request.result.createObjectStore(V1_INDEXEDDB_STORE);
		});
		request.addEventListener(
			"success",
			() => {
				if (settled) {
					request.result.close();
					return;
				}
				settled = true;
				resolve(request.result);
			},
			{ once: true },
		);
		request.addEventListener(
			"error",
			() => {
				if (settled) return;
				settled = true;
				reject(request.error ?? new Error("IndexedDB open failed"));
			},
			{ once: true },
		);
		request.addEventListener(
			"blocked",
			() => {
				if (settled) return;
				settled = true;
				reject(new Error("IndexedDB schema upgrade was blocked"));
			},
			{ once: true },
		);
	});
}

class BrowserIndexedDbCheckpointStorage implements V1CheckpointStoragePort {
	readonly #factory: IDBFactory;

	constructor(factory: IDBFactory) {
		this.#factory = factory;
	}

	async load(storageKey: string): Promise<unknown | null> {
		validKey(storageKey, "storageKey");
		try {
			const database = await openDatabase(this.#factory);
			try {
				const transaction = database.transaction(
					V1_INDEXEDDB_STORE,
					"readonly",
				);
				const completion = transactionComplete(transaction);
				const result = await requestValue(
					transaction.objectStore(V1_INDEXEDDB_STORE).get(storageKey),
				);
				await completion;
				return result === undefined ? null : result;
			} finally {
				database.close();
			}
		} catch (error) {
			return failStorage("IndexedDB load", error);
		}
	}

	async compareAndSwap(input: {
		readonly storageKey: string;
		readonly expectedRecordHash: string | null;
		readonly next: V1PersistedCheckpoint;
	}): Promise<{ readonly idempotent: boolean }> {
		validKey(input.storageKey, "storageKey");
		await validateV1PersistedCheckpoint(input.next, input.storageKey);
		let database: IDBDatabase | undefined;
		try {
			database = await openDatabase(this.#factory);
			const transaction = database.transaction(V1_INDEXEDDB_STORE, "readwrite");
			const completion = transactionComplete(transaction);
			const store = transaction.objectStore(V1_INDEXEDDB_STORE);
			const prior = (await requestValue(store.get(input.storageKey))) as
				| V1PersistedCheckpoint
				| undefined;
			if (prior?.recordHash === input.next.recordHash) {
				await completion;
				return { idempotent: true };
			}
			if ((prior?.recordHash ?? null) !== input.expectedRecordHash) {
				transaction.abort();
				await completion.catch(() => undefined);
				fail("STORAGE_CONFLICT", "checkpoint compare-and-swap lost authority");
			}
			await requestValue(store.put(input.next, input.storageKey));
			await completion;
			return { idempotent: false };
		} catch (error) {
			return failStorage("IndexedDB transaction", error);
		} finally {
			database?.close();
		}
	}
}

export function createV1IndexedDbStorage(
	factory: IDBFactory | null | undefined = globalThis.indexedDB,
): V1IndexedDbAvailability {
	return factory === undefined || factory === null
		? { available: false, reason: "indexeddb-unavailable" }
		: { available: true, port: new BrowserIndexedDbCheckpointStorage(factory) };
}
