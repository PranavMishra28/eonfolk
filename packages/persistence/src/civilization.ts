import { canonicalJson, cloneValue } from "./codec.js";
import { PersistenceError } from "./errors.js";
import type { JsonValue } from "./types.js";
import {
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	hashAuthoritativeState,
} from "./versioned.js";
import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	type AuthorityAppendReceipt,
	type AuthorityEventRecord,
	type AuthorityHead,
	type AuthorityScope,
	type AuthoritySnapshotRecord,
	EMPTY_EVENT_HASH,
	type InitializeAuthorityRequest,
	VERSIONED_PERSISTENCE_PORT_VERSION,
	type VersionedPersistencePort,
} from "./versioned-types.js";

export const RELEASE_GENESIS_CIVILIZATION_STATE_VERSION =
	"eonfolk-release-genesis-civilization-state-v2" as const;
export const RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION =
	"eonfolk-release-genesis-civilization-transition-v2" as const;
export const RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION =
	"eonfolk-release-genesis-civilization-engine-v3" as const;
export const CIVILIZATION_PERSISTENCE_MIGRATION_POLICY = Object.freeze({
	mode: "exact-only",
	engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
	stateVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	transitionVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
} as const);

const SOURCE_EXPERIMENT_VERSION = "eonfolk-civilization-experiment-v4" as const;
const SOURCE_RUNNER_VERSION = "eonfolk-civilization-runner-v4" as const;
const SOURCE_EVENT_VERSION =
	"eonfolk-civilization-experiment-event-v4" as const;
const SOURCE_STEP_VERSION = "eonfolk-civilization-experiment-step-v4" as const;
const SECONDS_PER_DAY = 86_400;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const textEncoder = new TextEncoder();

interface SourceExperimentMetrics {
	readonly modelInvocations: number;
	readonly simulationTime: number;
}

/**
 * Structural view of the civilization runner output. Keeping this contract
 * provider-neutral avoids making the persistence core depend on the simulator.
 */
export interface CivilizationExperimentCheckpoint {
	readonly schemaVersion: string;
	readonly runnerVersion: string;
	readonly worldIdentityHash: string;
	readonly horizonDays: number;
	readonly initialStateHash: string;
	readonly finalStateHash: string;
	readonly finalEventHash: string | null;
	readonly events: readonly unknown[];
	readonly steps: readonly unknown[];
	readonly metrics: SourceExperimentMetrics;
	readonly state: unknown;
	readonly world: unknown;
}

export interface ReleaseGenesisCivilizationState {
	readonly [key: string]: JsonValue;
	readonly schemaVersion: typeof RELEASE_GENESIS_CIVILIZATION_STATE_VERSION;
	readonly phase: "initialized" | "checkpoint";
	readonly worldIdentityHash: string;
	readonly sourceInitialStateHash: string;
	readonly finalExperimentStateHash: string;
	readonly world: JsonValue;
	readonly civilization: JsonValue | null;
	readonly scheduler: {
		readonly completedDay: number;
		readonly simulationTime: number;
		readonly modelInvocations: 0;
	};
	readonly sourceHistory: {
		readonly stepHashes: readonly string[];
		readonly eventHashes: readonly string[];
	};
}

export interface ReleaseGenesisCivilizationTransition {
	readonly [key: string]: JsonValue;
	readonly schemaVersion: typeof RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION;
	readonly previousCompletedDay: number;
	readonly resultingCompletedDay: number;
	readonly resultingSimulationTime: number;
	readonly resultingExperimentStateHash: string;
	readonly sourceSteps: readonly JsonValue[];
	readonly sourceEvents: readonly JsonValue[];
	readonly patch: readonly CivilizationJsonPatchOperation[];
}

export type CivilizationJsonPatchOperation =
	| {
			readonly [key: string]: JsonValue;
			readonly op: "set";
			readonly path: readonly string[];
			readonly value: JsonValue;
	  }
	| {
			readonly [key: string]: JsonValue;
			readonly op: "delete";
			readonly path: readonly string[];
	  };

export interface CivilizationPersistencePlan {
	readonly scope: AuthorityScope;
	readonly genesis: InitializeAuthorityRequest;
	readonly batches: readonly AppendAuthorityBatchRequest[];
	readonly finalSnapshot: AuthoritySnapshotRecord;
	readonly finalState: ReleaseGenesisCivilizationState;
}

export interface CreateCivilizationPersistencePlanInput extends AuthorityScope {
	readonly genesisId: string;
	readonly genesisWorld: unknown;
	readonly checkpoints: readonly CivilizationExperimentCheckpoint[];
	readonly batchSize?: number;
	readonly snapshotId?: string;
}

export interface PersistCivilizationHistoryResult {
	readonly plan: CivilizationPersistencePlan;
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly receipts: readonly AuthorityAppendReceipt[];
}

function fail(
	code: "INVALID_INPUT" | "RANGE_GAP" | "STALE_STATE" | "UNSUPPORTED_VERSION",
	message: string,
): never {
	throw new PersistenceError(code, message);
}

function record(
	value: unknown,
	label: string,
): Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail("INVALID_INPUT", `${label} must be a record`);
	return value as Readonly<Record<string, unknown>>;
}

function integer(value: unknown, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0)
		fail("INVALID_INPUT", `${label} must be a non-negative safe integer`);
	return value as number;
}

function string(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length < 1)
		fail("INVALID_INPUT", `${label} must be a non-empty string`);
	return value;
}

function hash(value: unknown, label: string): string {
	const result = string(value, label);
	if (!HASH_PATTERN.test(result))
		fail("INVALID_INPUT", `${label} must be a lowercase SHA-256 hash`);
	return result;
}

function json(value: unknown, label: string): JsonValue {
	try {
		canonicalJson(value as JsonValue);
	} catch (error) {
		if (error instanceof PersistenceError) throw error;
		fail("INVALID_INPUT", `${label} is not JSON-safe`);
	}
	return cloneValue(value as JsonValue);
}

function array(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) fail("INVALID_INPUT", `${label} must be an array`);
	return value;
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
	const size = parts.reduce((total, part) => total + part.byteLength, 0);
	const result = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.byteLength;
	}
	return result;
}

function u32be(value: number): Uint8Array {
	if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff)
		fail("INVALID_INPUT", "source hash field exceeds u32 framing");
	const result = new Uint8Array(4);
	new DataView(result.buffer).setUint32(0, value, false);
	return result;
}

async function sourceDomainHash(
	domain: string,
	value: JsonValue,
): Promise<string> {
	if (globalThis.crypto?.subtle === undefined)
		fail("INVALID_INPUT", "WebCrypto SHA-256 is unavailable");
	const prefix = textEncoder.encode("EONFOLK-TUPLE-v2");
	const fields = [
		textEncoder.encode(domain),
		textEncoder.encode(canonicalJson(value)),
	];
	const framed: Uint8Array[] = [prefix, Uint8Array.of(0)];
	for (const field of fields) framed.push(u32be(field.byteLength), field);
	const bytes = Uint8Array.from(concatenate(framed));
	const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes.buffer);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function without(
	value: Readonly<Record<string, unknown>>,
	keys: readonly string[],
): JsonValue {
	const result: Record<string, JsonValue> = {};
	for (const [key, item] of Object.entries(value)) {
		if (!keys.includes(key)) result[key] = json(item, key);
	}
	return result;
}

async function validateSourceEvent(
	value: unknown,
	index: number,
	priorHash: string | null,
): Promise<{ readonly json: JsonValue; readonly eventHash: string }> {
	const source = record(value, `source event ${index}`);
	if (source.schemaVersion !== SOURCE_EVENT_VERSION)
		fail("UNSUPPORTED_VERSION", `source event ${index} version is unsupported`);
	if (integer(source.eventIndex, `source event ${index}.eventIndex`) !== index)
		fail("RANGE_GAP", `source event ${index} has an unexpected index`);
	if (source.priorEventHash !== priorHash)
		fail("RANGE_GAP", `source event ${index} breaks its hash chain`);
	integer(source.simulationTime, `source event ${index}.simulationTime`);
	string(source.kind, `source event ${index}.kind`);
	hash(source.postStateHash, `source event ${index}.postStateHash`);
	const eventHash = hash(source.eventHash, `source event ${index}.eventHash`);
	const expected = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v4",
		without(source, ["eventHash", "eventId"]),
	);
	if (eventHash !== expected)
		fail("STALE_STATE", `source event ${index} integrity hash is invalid`);
	if (
		source.eventId !== `civilization-event:${index}:${eventHash.slice(0, 16)}`
	)
		fail("STALE_STATE", `source event ${index} ID does not match its hash`);
	return { json: json(source, `source event ${index}`), eventHash };
}

async function validateSourceStep(
	value: unknown,
	index: number,
	priorPostStateHash: string,
): Promise<{
	readonly json: JsonValue;
	readonly stepHash: string;
	readonly postStateHash: string;
}> {
	const source = record(value, `source step ${index}`);
	if (source.schemaVersion !== SOURCE_STEP_VERSION)
		fail("UNSUPPORTED_VERSION", `source step ${index} version is unsupported`);
	if (integer(source.stepIndex, `source step ${index}.stepIndex`) !== index)
		fail("RANGE_GAP", `source step ${index} has an unexpected index`);
	if (source.preStateHash !== priorPostStateHash)
		fail("RANGE_GAP", `source step ${index} breaks state continuity`);
	const from = integer(source.fromSimulationTime, `source step ${index}.from`);
	const to = integer(source.toSimulationTime, `source step ${index}.to`);
	if (from !== index * SECONDS_PER_DAY || to !== (index + 1) * SECONDS_PER_DAY)
		fail("RANGE_GAP", `source step ${index} has unexpected scheduler bounds`);
	const eventHashes = array(
		source.eventHashes,
		`source step ${index}.eventHashes`,
	);
	for (const [eventIndex, eventHash] of eventHashes.entries())
		hash(eventHash, `source step ${index}.eventHashes[${eventIndex}]`);
	const postStateHash = hash(
		source.postStateHash,
		`source step ${index}.postStateHash`,
	);
	const stepHash = hash(source.stepHash, `source step ${index}.stepHash`);
	const expected = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v4",
		without(source, ["stepHash"]),
	);
	if (stepHash !== expected)
		fail("STALE_STATE", `source step ${index} integrity hash is invalid`);
	return {
		json: json(source, `source step ${index}`),
		stepHash,
		postStateHash,
	};
}

interface ValidatedCheckpoint {
	readonly checkpoint: CivilizationExperimentCheckpoint;
	readonly world: JsonValue;
	readonly civilization: JsonValue;
	readonly steps: readonly JsonValue[];
	readonly stepHashes: readonly string[];
	readonly events: readonly JsonValue[];
	readonly eventHashes: readonly string[];
}

async function validateCheckpoint(
	checkpoint: CivilizationExperimentCheckpoint,
	worldIdentityHash: string,
): Promise<ValidatedCheckpoint> {
	if (checkpoint.schemaVersion !== SOURCE_EXPERIMENT_VERSION)
		fail(
			"UNSUPPORTED_VERSION",
			"civilization experiment version is unsupported",
		);
	if (checkpoint.runnerVersion !== SOURCE_RUNNER_VERSION)
		fail("UNSUPPORTED_VERSION", "civilization runner version is unsupported");
	if (checkpoint.worldIdentityHash !== worldIdentityHash)
		fail("INVALID_INPUT", "checkpoint belongs to another generated world");
	const horizonDays = integer(checkpoint.horizonDays, "checkpoint.horizonDays");
	if (horizonDays < 1 || horizonDays > 365)
		fail("INVALID_INPUT", "checkpoint horizon must be from 1 through 365 days");
	if (
		checkpoint.metrics.modelInvocations !== 0 ||
		checkpoint.metrics.simulationTime !== horizonDays * SECONDS_PER_DAY
	)
		fail("INVALID_INPUT", "checkpoint is not an inference-free exact horizon");
	const initialStateHash = hash(
		checkpoint.initialStateHash,
		"checkpoint.initialStateHash",
	);
	const sourceSteps = array(checkpoint.steps, "checkpoint.steps");
	if (sourceSteps.length !== horizonDays)
		fail("RANGE_GAP", "checkpoint does not contain one source step per day");
	const steps: JsonValue[] = [];
	const stepHashes: string[] = [];
	let priorPostStateHash = initialStateHash;
	for (const [index, step] of sourceSteps.entries()) {
		const validated = await validateSourceStep(step, index, priorPostStateHash);
		steps.push(validated.json);
		stepHashes.push(validated.stepHash);
		priorPostStateHash = validated.postStateHash;
	}
	if (priorPostStateHash !== checkpoint.finalStateHash)
		fail("STALE_STATE", "checkpoint final hash differs from its final step");
	const sourceEvents = array(checkpoint.events, "checkpoint.events");
	const events: JsonValue[] = [];
	const eventHashes: string[] = [];
	let priorEventHash: string | null = null;
	for (const [index, event] of sourceEvents.entries()) {
		const validated = await validateSourceEvent(event, index, priorEventHash);
		events.push(validated.json);
		eventHashes.push(validated.eventHash);
		priorEventHash = validated.eventHash;
	}
	const scheduledEventHashes = steps.flatMap((step, stepIndex) =>
		array(
			record(step, `source step ${stepIndex}`).eventHashes,
			`source step ${stepIndex}.eventHashes`,
		).map((value, eventIndex) =>
			hash(value, `source step ${stepIndex}.eventHashes[${eventIndex}]`),
		),
	);
	if (
		scheduledEventHashes.length !== eventHashes.length ||
		scheduledEventHashes.some((value, index) => value !== eventHashes[index])
	)
		fail(
			"RANGE_GAP",
			"source steps do not account for the ordered event chain",
		);
	if (checkpoint.finalEventHash !== priorEventHash)
		fail("STALE_STATE", "checkpoint final event hash differs from its chain");
	const world = json(checkpoint.world, "checkpoint.world");
	const civilization = json(checkpoint.state, "checkpoint.state");
	const sourceWorldHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v4",
		world,
	);
	const sourceStateHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v4",
		{ civilization, worldStateHash: sourceWorldHash },
	);
	if (sourceStateHash !== checkpoint.finalStateHash)
		fail("STALE_STATE", "checkpoint world and civilization bytes are corrupt");
	return {
		checkpoint,
		world,
		civilization,
		steps,
		stepHashes,
		events,
		eventHashes,
	};
}

function worldIdentity(value: JsonValue, label: string): string {
	const world = record(value, label);
	const identity = record(world.identity, `${label}.identity`);
	return hash(identity.identityHash, `${label}.identity.identityHash`);
}

function assertPrefix(
	prior: readonly string[],
	next: readonly string[],
	label: string,
): void {
	if (
		prior.length > next.length ||
		prior.some((value, index) => value !== next[index])
	)
		fail("RANGE_GAP", `${label} is not a stable prefix`);
}

function isJsonRecord(
	value: unknown,
): value is { readonly [key: string]: JsonValue } {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createJsonPatch(
	prior: JsonValue,
	next: JsonValue,
	path: readonly string[] = [],
): readonly CivilizationJsonPatchOperation[] {
	if (canonicalJson(prior) === canonicalJson(next)) return [];
	if (isJsonRecord(prior) && isJsonRecord(next)) {
		const operations: CivilizationJsonPatchOperation[] = [];
		for (const key of [
			...new Set([...Object.keys(prior), ...Object.keys(next)]),
		].sort()) {
			if (!(key in next))
				operations.push({ op: "delete", path: [...path, key] });
			else if (!(key in prior))
				operations.push({
					op: "set",
					path: [...path, key],
					value: cloneValue(next[key]!),
				});
			else
				operations.push(
					...createJsonPatch(prior[key]!, next[key]!, [...path, key]),
				);
		}
		return operations;
	}
	if (path.length === 0)
		fail("INVALID_INPUT", "civilization patch cannot replace its state root");
	return [{ op: "set", path, value: cloneValue(next) }];
}

function safePath(value: unknown, label: string): readonly string[] {
	const path = array(value, label).map((segment, index) => {
		const result = string(segment, `${label}[${index}]`);
		if (
			result.length > 128 ||
			result === "__proto__" ||
			result === "constructor" ||
			result === "prototype"
		)
			fail("INVALID_INPUT", `${label}[${index}] is unsafe`);
		return result;
	});
	if (path.length < 1 || path.length > 32)
		fail("INVALID_INPUT", `${label} must contain from 1 through 32 segments`);
	return path;
}

function applyJsonPatch(
	state: ReleaseGenesisCivilizationState,
	value: unknown,
): ReleaseGenesisCivilizationState {
	const operations = array(value, "civilization patch");
	if (operations.length > 4_096)
		fail("INVALID_INPUT", "civilization patch exceeds 4096 operations");
	const root = cloneValue(state) as unknown as Record<string, JsonValue>;
	let priorPath = "";
	const paths = new Set<string>();
	for (const [index, operationValue] of operations.entries()) {
		const operation = record(operationValue, `patch operation ${index}`);
		const path = safePath(operation.path, `patch operation ${index}.path`);
		const pathKey = canonicalJson(path);
		if (
			paths.has(pathKey) ||
			(index > 0 && pathKey.localeCompare(priorPath) <= 0)
		)
			fail(
				"INVALID_INPUT",
				"civilization patch paths are not unique and ordered",
			);
		paths.add(pathKey);
		priorPath = pathKey;
		let parent: Record<string, JsonValue> = root;
		for (const segment of path.slice(0, -1)) {
			const child = parent[segment];
			if (!isJsonRecord(child))
				fail("RANGE_GAP", `patch operation ${index} has a missing parent`);
			parent = child as Record<string, JsonValue>;
		}
		const leaf = path.at(-1);
		if (leaf === undefined)
			fail("INVALID_INPUT", "patch operation path is empty");
		if (operation.op === "set") {
			if (!("value" in operation))
				fail("INVALID_INPUT", `patch operation ${index} lacks a value`);
			parent[leaf] = json(operation.value, `patch operation ${index}.value`);
		} else if (operation.op === "delete") {
			if (!(leaf in parent))
				fail("RANGE_GAP", `patch operation ${index} deletes a missing value`);
			delete parent[leaf];
		} else
			fail("UNSUPPORTED_VERSION", `patch operation ${index} is unsupported`);
	}
	return validatePersistedState(root);
}

function validatePersistedState(
	value: JsonValue,
): ReleaseGenesisCivilizationState {
	const state = record(value, "persisted civilization state");
	if (state.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_STATE_VERSION)
		fail(
			"UNSUPPORTED_VERSION",
			"persisted civilization state version is unsupported",
		);
	if (state.phase !== "initialized" && state.phase !== "checkpoint")
		fail("INVALID_INPUT", "persisted civilization phase is invalid");
	const scheduler = record(state.scheduler, "persisted scheduler");
	const sourceHistory = record(state.sourceHistory, "persisted source history");
	integer(scheduler.completedDay, "scheduler.completedDay");
	integer(scheduler.simulationTime, "scheduler.simulationTime");
	if (scheduler.modelInvocations !== 0)
		fail("INVALID_INPUT", "persisted civilization state invoked a model");
	hash(state.worldIdentityHash, "state.worldIdentityHash");
	hash(state.sourceInitialStateHash, "state.sourceInitialStateHash");
	hash(state.finalExperimentStateHash, "state.finalExperimentStateHash");
	json(state.world, "state.world");
	if (
		worldIdentity(state.world as JsonValue, "state.world") !==
		state.worldIdentityHash
	)
		fail("STALE_STATE", "persisted world identity does not match its state");
	if (state.phase === "initialized" && state.civilization !== null)
		fail(
			"INVALID_INPUT",
			"initialized state must not invent civilization bytes",
		);
	if (state.phase === "checkpoint" && state.civilization === null)
		fail("INVALID_INPUT", "checkpoint state requires civilization bytes");
	for (const [index, item] of array(
		sourceHistory.stepHashes,
		"stepHashes",
	).entries())
		hash(item, `stepHashes[${index}]`);
	for (const [index, item] of array(
		sourceHistory.eventHashes,
		"eventHashes",
	).entries())
		hash(item, `eventHashes[${index}]`);
	const completedDay = integer(
		scheduler.completedDay,
		"scheduler.completedDay",
	);
	if (
		(state.phase === "initialized" &&
			(completedDay !== 0 ||
				scheduler.simulationTime !== 0 ||
				(sourceHistory.stepHashes as readonly unknown[]).length !== 0 ||
				(sourceHistory.eventHashes as readonly unknown[]).length !== 0 ||
				state.finalExperimentStateHash !== state.sourceInitialStateHash)) ||
		(state.phase === "checkpoint" &&
			((sourceHistory.stepHashes as readonly unknown[]).length !==
				completedDay ||
				scheduler.simulationTime !== completedDay * SECONDS_PER_DAY))
	)
		fail(
			"RANGE_GAP",
			"persisted civilization scheduler/history is inconsistent",
		);
	return cloneValue(value) as ReleaseGenesisCivilizationState;
}

async function validateTransitionSourceRecords(
	current: ReleaseGenesisCivilizationState,
	event: AuthorityEventRecord,
): Promise<void> {
	const payload = record(event.payload, "civilization transition");
	const sourceSteps = array(payload.sourceSteps, "transition.sourceSteps");
	const sourceEvents = array(payload.sourceEvents, "transition.sourceEvents");
	let priorStateHash = current.finalExperimentStateHash;
	const stepEventHashes: string[] = [];
	for (const [offset, step] of sourceSteps.entries()) {
		const index = current.scheduler.completedDay + offset;
		const validated = await validateSourceStep(step, index, priorStateHash);
		priorStateHash = validated.postStateHash;
		stepEventHashes.push(
			...array(
				record(step, `transition step ${index}`).eventHashes,
				`transition step ${index}.eventHashes`,
			).map((value, eventIndex) =>
				hash(value, `transition step ${index}.eventHashes[${eventIndex}]`),
			),
		);
	}
	if (priorStateHash !== payload.resultingExperimentStateHash)
		fail("STALE_STATE", "transition source steps end at another state hash");
	let priorEventHash = current.sourceHistory.eventHashes.at(-1) ?? null;
	const eventHashes: string[] = [];
	for (const [offset, sourceEvent] of sourceEvents.entries()) {
		const index = current.sourceHistory.eventHashes.length + offset;
		const validated = await validateSourceEvent(
			sourceEvent,
			index,
			priorEventHash,
		);
		priorEventHash = validated.eventHash;
		eventHashes.push(validated.eventHash);
	}
	if (
		stepEventHashes.length !== eventHashes.length ||
		stepEventHashes.some((value, index) => value !== eventHashes[index])
	)
		fail("RANGE_GAP", "transition steps do not account for source events");
}

async function validateCheckpointSourceState(
	state: ReleaseGenesisCivilizationState,
): Promise<void> {
	if (state.phase !== "checkpoint" || state.civilization === null) return;
	const sourceWorldHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v4",
		state.world,
	);
	const expected = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v4",
		{ civilization: state.civilization, worldStateHash: sourceWorldHash },
	);
	if (expected !== state.finalExperimentStateHash)
		fail("STALE_STATE", "replayed civilization source state hash is invalid");
}

export async function createCivilizationPersistencePlan(
	input: CreateCivilizationPersistencePlanInput,
): Promise<CivilizationPersistencePlan> {
	if (input.checkpoints.length < 1)
		fail("INVALID_INPUT", "at least one civilization checkpoint is required");
	const batchSize = input.batchSize ?? 16;
	if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 32)
		fail("INVALID_INPUT", "civilization batch size must be from 1 through 32");
	const genesisWorld = json(input.genesisWorld, "genesisWorld");
	const identityHash = worldIdentity(genesisWorld, "genesisWorld");
	const ordered = [...input.checkpoints];
	for (let index = 1; index < ordered.length; index += 1) {
		if (
			(ordered[index]?.horizonDays ?? 0) <=
			(ordered[index - 1]?.horizonDays ?? 0)
		)
			fail("RANGE_GAP", "checkpoint horizons must be strictly increasing");
	}
	const checkpoints: ValidatedCheckpoint[] = [];
	for (const checkpoint of ordered)
		checkpoints.push(await validateCheckpoint(checkpoint, identityHash));
	const initialHash = checkpoints[0]?.checkpoint.initialStateHash;
	if (initialHash === undefined)
		fail("INVALID_INPUT", "checkpoint list is empty");
	for (let index = 1; index < checkpoints.length; index += 1) {
		const prior = checkpoints[index - 1];
		const next = checkpoints[index];
		if (prior === undefined || next === undefined)
			fail("INVALID_INPUT", "checkpoint list has a gap");
		if (next.checkpoint.initialStateHash !== initialHash)
			fail("RANGE_GAP", "checkpoint initial state identity changed");
		assertPrefix(prior.stepHashes, next.stepHashes, "source step chain");
		assertPrefix(prior.eventHashes, next.eventHashes, "source event chain");
		if (
			next.steps[prior.checkpoint.horizonDays - 1] === undefined ||
			record(next.steps[prior.checkpoint.horizonDays - 1], "prefix step")
				.postStateHash !== prior.checkpoint.finalStateHash
		)
			fail("RANGE_GAP", "checkpoint state is not an exact prior prefix");
	}

	const scope = { runId: input.runId, regionId: input.regionId } as const;
	const genesisState: ReleaseGenesisCivilizationState = {
		schemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		phase: "initialized",
		worldIdentityHash: identityHash,
		sourceInitialStateHash: initialHash,
		finalExperimentStateHash: initialHash,
		world: genesisWorld,
		civilization: null,
		scheduler: { completedDay: 0, simulationTime: 0, modelInvocations: 0 },
		sourceHistory: { stepHashes: [], eventHashes: [] },
	};
	const genesisSnapshot = await createAuthoritySnapshot({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		snapshotId: `${input.snapshotId ?? "civilization"}-genesis`,
		revision: 0,
		baseSequence: 0,
		simulationTime: 0,
		lastEventHash: EMPTY_EVENT_HASH,
		state: genesisState,
	});
	const genesisHead = await createAuthorityHead({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		revision: 0,
		lastSequence: 0,
		simulationTime: 0,
		stateHash: genesisSnapshot.stateHash,
		lastEventHash: EMPTY_EVENT_HASH,
		fencingToken: 1,
	});
	const genesis: InitializeAuthorityRequest = {
		...scope,
		schemaVersion: AUTHORITY_GENESIS_SCHEMA_VERSION,
		genesisId: input.genesisId,
		head: genesisHead,
		snapshot: genesisSnapshot,
	};

	const states: ReleaseGenesisCivilizationState[] = [];
	const transitions: ReleaseGenesisCivilizationTransition[] = [];
	let priorState = genesisState;
	let priorDay = 0;
	let priorStepCount = 0;
	let priorEventCount = 0;
	for (const checkpoint of checkpoints) {
		const state: ReleaseGenesisCivilizationState = {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
			phase: "checkpoint",
			worldIdentityHash: identityHash,
			sourceInitialStateHash: initialHash,
			finalExperimentStateHash: checkpoint.checkpoint.finalStateHash,
			world: checkpoint.world,
			civilization: checkpoint.civilization,
			scheduler: {
				completedDay: checkpoint.checkpoint.horizonDays,
				simulationTime: checkpoint.checkpoint.metrics.simulationTime,
				modelInvocations: 0,
			},
			sourceHistory: {
				stepHashes: checkpoint.stepHashes,
				eventHashes: checkpoint.eventHashes,
			},
		};
		states.push(state);
		transitions.push({
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			previousCompletedDay: priorDay,
			resultingCompletedDay: state.scheduler.completedDay,
			resultingSimulationTime: state.scheduler.simulationTime,
			resultingExperimentStateHash: state.finalExperimentStateHash,
			sourceSteps: checkpoint.steps.slice(priorStepCount),
			sourceEvents: checkpoint.events.slice(priorEventCount),
			patch: createJsonPatch(priorState, state),
		});
		priorState = state;
		priorDay = checkpoint.checkpoint.horizonDays;
		priorStepCount = checkpoint.steps.length;
		priorEventCount = checkpoint.events.length;
	}

	const batches: AppendAuthorityBatchRequest[] = [];
	let priorStateHash = genesisHead.stateHash;
	let priorEventHash = genesisHead.lastEventHash;
	for (let offset = 0; offset < transitions.length; offset += batchSize) {
		const upper = Math.min(transitions.length, offset + batchSize);
		const appendId = `civilization-append-${offset + 1}-${upper}`;
		const batchId = `civilization-batch-${offset + 1}-${upper}`;
		const events: AuthorityEventRecord[] = [];
		for (let index = offset; index < upper; index += 1) {
			const transition = transitions[index];
			const state = states[index];
			if (transition === undefined || state === undefined)
				fail("INVALID_INPUT", "transition plan has a gap");
			const event = await createAuthorityEvent({
				...scope,
				engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
				stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
				appendId,
				batchId,
				eventId: `civilization-checkpoint-${state.scheduler.completedDay}`,
				sequence: index + 1,
				simulationTime: state.scheduler.simulationTime,
				eventType: "CivilizationCheckpointCommitted",
				causalParents:
					index === 0
						? []
						: [
								{
									eventId: `civilization-checkpoint-${states[index - 1]?.scheduler.completedDay ?? 0}`,
									relation: "direct-cause",
								},
							],
				visibility: { kind: "authority-only" },
				provenance: {
					mechanismId: SOURCE_RUNNER_VERSION,
					cognitionDecisionId: null,
					brainKind: null,
				},
				preStateHash: priorStateHash,
				postStateHash: await hashAuthoritativeState(state),
				previousEventHash: priorEventHash,
				payload: transition,
			});
			events.push(event);
			priorStateHash = event.postStateHash;
			priorEventHash = event.eventHash;
		}
		const first = events[0];
		if (first === undefined) fail("INVALID_INPUT", "empty batch was generated");
		batches.push({
			...scope,
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			appendId,
			batchId,
			expectedRevision: batches.length,
			expectedLastSequence: offset,
			expectedStateHash: first.preStateHash,
			expectedLastEventHash: first.previousEventHash,
			fencingToken: 1,
			events,
		});
	}
	const finalState = states.at(-1);
	if (finalState === undefined) fail("INVALID_INPUT", "final state is missing");
	const finalSnapshot = await createAuthoritySnapshot({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		snapshotId: `${input.snapshotId ?? "civilization"}-final`,
		revision: batches.length,
		baseSequence: transitions.length,
		simulationTime: finalState.scheduler.simulationTime,
		lastEventHash: priorEventHash,
		state: finalState,
	});
	return { scope, genesis, batches, finalSnapshot, finalState };
}

export function reduceCivilizationAuthorityEvent(
	currentValue: ReleaseGenesisCivilizationState,
	event: AuthorityEventRecord,
): ReleaseGenesisCivilizationState {
	const current = validatePersistedState(currentValue);
	if (event.eventType !== "CivilizationCheckpointCommitted")
		fail(
			"UNSUPPORTED_VERSION",
			`unsupported civilization event ${event.eventType}`,
		);
	const payload = record(event.payload, "civilization transition");
	if (payload.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION)
		fail(
			"UNSUPPORTED_VERSION",
			"civilization transition version is unsupported",
		);
	if (payload.previousCompletedDay !== current.scheduler.completedDay)
		fail("RANGE_GAP", "civilization transition starts from another checkpoint");
	const next = applyJsonPatch(current, payload.patch);
	if (
		next.phase !== "checkpoint" ||
		next.worldIdentityHash !== current.worldIdentityHash ||
		next.sourceInitialStateHash !== current.sourceInitialStateHash ||
		next.scheduler.completedDay <= current.scheduler.completedDay ||
		next.scheduler.simulationTime !==
			next.scheduler.completedDay * SECONDS_PER_DAY ||
		event.simulationTime !== next.scheduler.simulationTime
	)
		fail("RANGE_GAP", "civilization transition violates scheduler identity");
	if (
		payload.resultingCompletedDay !== next.scheduler.completedDay ||
		payload.resultingSimulationTime !== next.scheduler.simulationTime ||
		payload.resultingExperimentStateHash !== next.finalExperimentStateHash
	)
		fail("STALE_STATE", "civilization transition result summary is invalid");
	const priorSteps = current.sourceHistory.stepHashes;
	const priorEvents = current.sourceHistory.eventHashes;
	assertPrefix(
		priorSteps,
		next.sourceHistory.stepHashes,
		"persisted step history",
	);
	assertPrefix(
		priorEvents,
		next.sourceHistory.eventHashes,
		"persisted event history",
	);
	const sourceSteps = array(payload.sourceSteps, "transition.sourceSteps");
	const sourceEvents = array(payload.sourceEvents, "transition.sourceEvents");
	if (
		next.sourceHistory.stepHashes.length !==
			priorSteps.length + sourceSteps.length ||
		next.sourceHistory.eventHashes.length !==
			priorEvents.length + sourceEvents.length
	)
		fail("RANGE_GAP", "civilization transition omits source records");
	for (const [index, step] of sourceSteps.entries()) {
		if (
			record(step, `transition step ${index}`).stepHash !==
			next.sourceHistory.stepHashes[priorSteps.length + index]
		)
			fail("STALE_STATE", "transition source step hash does not match history");
	}
	for (const [index, sourceEvent] of sourceEvents.entries()) {
		if (
			record(sourceEvent, `transition event ${index}`).eventHash !==
			next.sourceHistory.eventHashes[priorEvents.length + index]
		)
			fail(
				"STALE_STATE",
				"transition source event hash does not match history",
			);
	}
	return next;
}

export async function persistCivilizationHistory(
	port: VersionedPersistencePort,
	input: CreateCivilizationPersistencePlanInput,
): Promise<PersistCivilizationHistoryResult> {
	if (port.portVersion !== VERSIONED_PERSISTENCE_PORT_VERSION)
		fail("UNSUPPORTED_VERSION", "persistence port version is unsupported");
	const plan = await createCivilizationPersistencePlan(input);
	await port.initialize(plan.genesis);
	const receipts: AuthorityAppendReceipt[] = [];
	for (const batch of plan.batches)
		receipts.push((await port.appendEventBatch(batch)).receipt);
	const head = await port.loadHead(plan.scope);
	const snapshot = await port.saveSnapshot({
		snapshot: plan.finalSnapshot,
		fencingToken: head.fencingToken,
	});
	return { plan, head, snapshot, receipts };
}

export async function replayCivilizationHistory(
	port: VersionedPersistencePort,
	input: AuthorityScope & {
		readonly snapshotId: string;
		readonly toSequenceExclusive: number;
		readonly rangeSize?: number;
	},
): Promise<{
	readonly state: ReleaseGenesisCivilizationState;
	readonly events: readonly AuthorityEventRecord[];
	readonly stateHash: string;
	readonly lastEventHash: string;
}> {
	if (port.portVersion !== VERSIONED_PERSISTENCE_PORT_VERSION)
		fail("UNSUPPORTED_VERSION", "persistence port version is unsupported");
	const rangeSize = input.rangeSize ?? 32;
	if (!Number.isSafeInteger(rangeSize) || rangeSize < 1 || rangeSize > 16_384)
		fail("INVALID_INPUT", "replay range size must be from 1 through 16384");
	const snapshot = await port.loadSnapshot(input, input.snapshotId);
	let state = validatePersistedState(snapshot.state);
	let stateHash = await hashAuthoritativeState(state);
	let lastEventHash = snapshot.lastEventHash;
	const events: AuthorityEventRecord[] = [];
	for (
		let from = snapshot.baseSequence + 1;
		from < input.toSequenceExclusive;
		from += rangeSize
	) {
		const range = await port.getEventRange({
			...input,
			fromSequenceInclusive: from,
			toSequenceExclusive: Math.min(
				input.toSequenceExclusive,
				from + rangeSize,
			),
		});
		for (const event of range) {
			if (
				event.engineVersion !== RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION ||
				event.stateSchemaVersion !== RELEASE_GENESIS_CIVILIZATION_STATE_VERSION
			)
				fail(
					"UNSUPPORTED_VERSION",
					"replay event runtime version is unsupported",
				);
			if (
				event.preStateHash !== stateHash ||
				event.previousEventHash !== lastEventHash
			)
				fail(
					"RANGE_GAP",
					"replay event does not continue from prior authority",
				);
			await validateTransitionSourceRecords(state, event);
			state = reduceCivilizationAuthorityEvent(state, event);
			await validateCheckpointSourceState(state);
			stateHash = await hashAuthoritativeState(state);
			if (stateHash !== event.postStateHash)
				fail("STALE_STATE", `reducer disagrees with ${event.eventId}`);
			lastEventHash = event.eventHash;
			events.push(event);
		}
	}
	return { state: cloneValue(state), events, stateHash, lastEventHash };
}
