import {
	advanceGeneralizedScheduler,
	assertCivilizationInvariants,
	deriveCivilizationSchedulerPolicy,
	projectCivilizationScheduledActivities,
	type CivilizationCounselOutcomeEffect,
	type CivilizationState,
	type SchedulerRoutineDecision,
} from "@eonfolk/civilization";
import {
	applyCivilizationCounselOutcome,
	applyCivilizationSponsorEvent,
	applyCounselStandingPlanBoundary,
	parseCivilizationSponsorEvent,
	validateCommittedCivilizationDecisionRecord,
} from "@eonfolk/civilization/sponsor";
import type { GeneratedWorldState } from "@eonfolk/protocol";
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
	"eonfolk-release-genesis-civilization-state-v7" as const;
export const RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION =
	"eonfolk-release-genesis-civilization-transition-v6" as const;
export const RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION =
	"eonfolk-release-genesis-civilization-engine-v8" as const;
export const CIVILIZATION_PERSISTENCE_MIGRATION_POLICY = Object.freeze({
	mode: "exact-only",
	engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
	stateVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	transitionVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
} as const);

const SOURCE_EXPERIMENT_VERSION = "eonfolk-civilization-experiment-v8" as const;
const SOURCE_RUNNER_VERSION = "eonfolk-civilization-runner-v8" as const;
const SOURCE_EVENT_VERSION =
	"eonfolk-civilization-experiment-event-v8" as const;
const SOURCE_STEP_VERSION = "eonfolk-civilization-experiment-step-v8" as const;
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
	readonly activities: readonly unknown[];
	readonly state: unknown;
	readonly world: unknown;
}

export interface ReleaseGenesisCivilizationState {
	readonly [key: string]: JsonValue;
	readonly schemaVersion: typeof RELEASE_GENESIS_CIVILIZATION_STATE_VERSION;
	readonly phase: "initialized" | "checkpoint" | "active";
	readonly worldIdentityHash: string;
	readonly sourceInitialStateHash: string;
	readonly finalExperimentStateHash: string;
	readonly world: JsonValue;
	readonly civilization: JsonValue | null;
	readonly scheduler: {
		readonly completedDay: number;
		readonly simulationTime: number;
		readonly modelInvocations: 0;
		readonly activities: JsonValue;
	};
	readonly sourceHistory: {
		readonly stepHashes: readonly string[];
		readonly eventHashes: readonly string[];
	};
}

export interface ReleaseGenesisCivilizationTransition {
	readonly [key: string]: JsonValue;
	readonly schemaVersion: typeof RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION;
	readonly transitionKind: "checkpoint";
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

function exactKeys(
	value: Readonly<Record<string, unknown>>,
	expected: readonly string[],
): boolean {
	const actual = Object.keys(value).sort();
	const wanted = [...expected].sort();
	return (
		actual.length === wanted.length &&
		actual.every((key, index) => key === wanted[index])
	);
}

function integer(value: unknown, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0)
		fail("INVALID_INPUT", `${label} must be a non-negative safe integer`);
	return value as number;
}

function counselOutcomeEffect(
	value: unknown,
): CivilizationCounselOutcomeEffect {
	const effect = record(value, "counsel boundary effect");
	if (
		effect.kind === "reserve-inspection" &&
		exactKeys(effect, ["kind", "observationRecordId", "stockObservations"]) &&
		typeof effect.observationRecordId === "string" &&
		array(effect.stockObservations, "reserve observations").every((entry) => {
			const observation = record(entry, "reserve observation");
			return (
				exactKeys(observation, ["stockId", "resourceTypeId", "quantity"]) &&
				typeof observation.stockId === "string" &&
				typeof observation.resourceTypeId === "string" &&
				Number.isSafeInteger(observation.quantity) &&
				Number(observation.quantity) >= 0
			);
		})
	)
		return cloneValue(
			effect as JsonValue,
		) as unknown as CivilizationCounselOutcomeEffect;
	if (
		effect.kind === "public-allegation" &&
		exactKeys(effect, [
			"kind",
			"statementRecordId",
			"targetCitizenId",
			"relationshipId",
			"trustDeltaBasisPoints",
			"strainDeltaBasisPoints",
		]) &&
		typeof effect.statementRecordId === "string" &&
		typeof effect.targetCitizenId === "string" &&
		typeof effect.relationshipId === "string" &&
		Number.isSafeInteger(effect.trustDeltaBasisPoints) &&
		Number.isSafeInteger(effect.strainDeltaBasisPoints)
	)
		return cloneValue(
			effect as JsonValue,
		) as unknown as CivilizationCounselOutcomeEffect;
	if (
		effect.kind === "plan-continuation" &&
		exactKeys(effect, ["kind", "planId"]) &&
		typeof effect.planId === "string"
	)
		return cloneValue(
			effect as JsonValue,
		) as unknown as CivilizationCounselOutcomeEffect;
	fail("INVALID_INPUT", "CIVP");
}

function string(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length < 1)
		fail("INVALID_INPUT", `${label} must be a non-empty string`);
	return value;
}

function hash(value: unknown, label: string): string {
	const result = string(value, label);
	if (!HASH_PATTERN.test(result)) fail("INVALID_INPUT", "CIVP");
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
		fail("INVALID_INPUT", "CIVP");
	const result = new Uint8Array(4);
	new DataView(result.buffer).setUint32(0, value, false);
	return result;
}

async function sourceDomainHash(
	domain: string,
	value: JsonValue,
): Promise<string> {
	if (globalThis.crypto?.subtle === undefined) fail("INVALID_INPUT", "CIVP");
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
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (integer(source.eventIndex, `source event ${index}.eventIndex`) !== index)
		fail("RANGE_GAP", "CIVP");
	if (source.priorEventHash !== priorHash) fail("RANGE_GAP", "CIVP");
	integer(source.simulationTime, `source event ${index}.simulationTime`);
	string(source.kind, `source event ${index}.kind`);
	hash(source.postStateHash, `source event ${index}.postStateHash`);
	const eventHash = hash(source.eventHash, `source event ${index}.eventHash`);
	const expected = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v7",
		without(source, ["eventHash", "eventId"]),
	);
	if (eventHash !== expected) fail("STALE_STATE", "CIVP");
	if (
		source.eventId !== `civilization-event:${index}:${eventHash.slice(0, 16)}`
	)
		fail("STALE_STATE", "CIVP");
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
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (integer(source.stepIndex, `source step ${index}.stepIndex`) !== index)
		fail("RANGE_GAP", "CIVP");
	if (source.preStateHash !== priorPostStateHash) fail("RANGE_GAP", "CIVP");
	const from = integer(source.fromSimulationTime, `source step ${index}.from`);
	const to = integer(source.toSimulationTime, `source step ${index}.to`);
	if (from !== index * SECONDS_PER_DAY || to !== (index + 1) * SECONDS_PER_DAY)
		fail("RANGE_GAP", "CIVP");
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
		"EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v7",
		without(source, ["stepHash"]),
	);
	if (stepHash !== expected) fail("STALE_STATE", "CIVP");
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
	readonly activities: JsonValue;
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
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (checkpoint.runnerVersion !== SOURCE_RUNNER_VERSION)
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (checkpoint.worldIdentityHash !== worldIdentityHash)
		fail("INVALID_INPUT", "CIVP");
	const horizonDays = integer(checkpoint.horizonDays, "checkpoint.horizonDays");
	if (horizonDays < 1 || horizonDays > 365) fail("INVALID_INPUT", "CIVP");
	if (
		checkpoint.metrics.modelInvocations !== 0 ||
		checkpoint.metrics.simulationTime !== horizonDays * SECONDS_PER_DAY
	)
		fail("INVALID_INPUT", "CIVP");
	const initialStateHash = hash(
		checkpoint.initialStateHash,
		"checkpoint.initialStateHash",
	);
	const sourceSteps = array(checkpoint.steps, "checkpoint.steps");
	if (sourceSteps.length !== horizonDays) fail("RANGE_GAP", "CIVP");
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
		fail("STALE_STATE", "CIVP");
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
		fail("RANGE_GAP", "CIVP");
	if (checkpoint.finalEventHash !== priorEventHash) fail("STALE_STATE", "CIVP");
	const world = json(checkpoint.world, "checkpoint.world");
	const civilization = json(checkpoint.state, "checkpoint.state");
	const activities = json(checkpoint.activities, "checkpoint.activities");
	const sourceWorldHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v7",
		world,
	);
	const sourceStateHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v7",
		{ activities, civilization, worldStateHash: sourceWorldHash },
	);
	if (sourceStateHash !== checkpoint.finalStateHash)
		fail("STALE_STATE", "CIVP");
	return {
		checkpoint,
		world,
		civilization,
		activities,
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
	if (path.length === 0) fail("INVALID_INPUT", "CIVP");
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
			fail("INVALID_INPUT", "CIVP");
		return result;
	});
	if (path.length < 1 || path.length > 32) fail("INVALID_INPUT", "CIVP");
	return path;
}

function applyJsonPatch(
	state: ReleaseGenesisCivilizationState,
	value: unknown,
): ReleaseGenesisCivilizationState {
	const operations = array(value, "civilization patch");
	if (operations.length > 4_096) fail("INVALID_INPUT", "CIVP");
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
			fail("INVALID_INPUT", "CIVP");
		paths.add(pathKey);
		priorPath = pathKey;
		let parent: Record<string, JsonValue> = root;
		for (const segment of path.slice(0, -1)) {
			const child = parent[segment];
			if (!isJsonRecord(child)) fail("RANGE_GAP", "CIVP");
			parent = child as Record<string, JsonValue>;
		}
		const leaf = path.at(-1);
		if (leaf === undefined) fail("INVALID_INPUT", "CIVP");
		if (operation.op === "set") {
			if (!("value" in operation)) fail("INVALID_INPUT", "CIVP");
			parent[leaf] = json(operation.value, `patch operation ${index}.value`);
		} else if (operation.op === "delete") {
			if (!(leaf in parent)) fail("RANGE_GAP", "CIVP");
			delete parent[leaf];
		} else fail("UNSUPPORTED_VERSION", "CIVP");
	}
	return validatePersistedState(root);
}

function validatePersistedState(
	value: JsonValue,
): ReleaseGenesisCivilizationState {
	const state = record(value, "persisted civilization state");
	if (state.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_STATE_VERSION)
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (
		state.phase !== "initialized" &&
		state.phase !== "checkpoint" &&
		state.phase !== "active"
	)
		fail("INVALID_INPUT", "CIVP");
	const scheduler = record(state.scheduler, "persisted scheduler");
	const sourceHistory = record(state.sourceHistory, "persisted source history");
	integer(scheduler.completedDay, "scheduler.completedDay");
	integer(scheduler.simulationTime, "scheduler.simulationTime");
	array(scheduler.activities, "scheduler.activities");
	if (scheduler.modelInvocations !== 0) fail("INVALID_INPUT", "CIVP");
	hash(state.worldIdentityHash, "state.worldIdentityHash");
	hash(state.sourceInitialStateHash, "state.sourceInitialStateHash");
	hash(state.finalExperimentStateHash, "state.finalExperimentStateHash");
	json(state.world, "state.world");
	if (
		worldIdentity(state.world as JsonValue, "state.world") !==
		state.worldIdentityHash
	)
		fail("STALE_STATE", "CIVP");
	if (state.phase === "initialized" && state.civilization !== null)
		fail("INVALID_INPUT", "CIVP");
	if (
		(state.phase === "checkpoint" || state.phase === "active") &&
		state.civilization === null
	)
		fail("INVALID_INPUT", "CIVP");
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
				scheduler.simulationTime !== completedDay * SECONDS_PER_DAY)) ||
		(state.phase === "active" &&
			((sourceHistory.stepHashes as readonly unknown[]).length > completedDay ||
				scheduler.simulationTime !== completedDay * SECONDS_PER_DAY))
	)
		fail("RANGE_GAP", "CIVP");
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
		fail("STALE_STATE", "CIVP");
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
		fail("RANGE_GAP", "CIVP");
}

async function validateCheckpointSourceState(
	state: ReleaseGenesisCivilizationState,
): Promise<void> {
	if (state.phase !== "checkpoint" || state.civilization === null) return;
	const sourceWorldHash = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v7",
		state.world,
	);
	const expected = await sourceDomainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v7",
		{
			activities: state.scheduler.activities,
			civilization: state.civilization,
			worldStateHash: sourceWorldHash,
		},
	);
	if (expected !== state.finalExperimentStateHash) fail("STALE_STATE", "CIVP");
}

export async function createCivilizationPersistencePlan(
	input: CreateCivilizationPersistencePlanInput,
): Promise<CivilizationPersistencePlan> {
	if (input.checkpoints.length < 1) fail("INVALID_INPUT", "CIVP");
	// Checkpoint transitions carry their source suffix and can approach the
	// per-record safety bound. One transition per atomic append keeps the default
	// fail-closed without widening the authoritative record limit.
	const batchSize = input.batchSize ?? 1;
	if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 32)
		fail("INVALID_INPUT", "CIVP");
	const genesisWorld = json(input.genesisWorld, "genesisWorld");
	const identityHash = worldIdentity(genesisWorld, "genesisWorld");
	const ordered = [...input.checkpoints];
	for (let index = 1; index < ordered.length; index += 1) {
		if (
			(ordered[index]?.horizonDays ?? 0) <=
			(ordered[index - 1]?.horizonDays ?? 0)
		)
			fail("RANGE_GAP", "CIVP");
	}
	const checkpoints: ValidatedCheckpoint[] = [];
	for (const checkpoint of ordered)
		checkpoints.push(await validateCheckpoint(checkpoint, identityHash));
	const initialHash = checkpoints[0]?.checkpoint.initialStateHash;
	if (initialHash === undefined) fail("INVALID_INPUT", "CIVP");
	for (let index = 1; index < checkpoints.length; index += 1) {
		const prior = checkpoints[index - 1];
		const next = checkpoints[index];
		if (prior === undefined || next === undefined)
			fail("INVALID_INPUT", "CIVP");
		if (next.checkpoint.initialStateHash !== initialHash)
			fail("RANGE_GAP", "CIVP");
		assertPrefix(prior.stepHashes, next.stepHashes, "source step chain");
		assertPrefix(prior.eventHashes, next.eventHashes, "source event chain");
		if (
			next.steps[prior.checkpoint.horizonDays - 1] === undefined ||
			record(next.steps[prior.checkpoint.horizonDays - 1], "prefix step")
				.postStateHash !== prior.checkpoint.finalStateHash
		)
			fail("RANGE_GAP", "CIVP");
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
		scheduler: {
			completedDay: 0,
			simulationTime: 0,
			modelInvocations: 0,
			activities: [],
		},
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
				activities: checkpoint.activities,
			},
			sourceHistory: {
				stepHashes: checkpoint.stepHashes,
				eventHashes: checkpoint.eventHashes,
			},
		};
		states.push(state);
		transitions.push({
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "checkpoint",
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
				fail("INVALID_INPUT", "CIVP");
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
		if (first === undefined) fail("INVALID_INPUT", "CIVP");
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
	if (finalState === undefined) fail("INVALID_INPUT", "CIVP");
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

export async function reduceCivilizationAuthorityEvent(
	currentValue: ReleaseGenesisCivilizationState,
	event: AuthorityEventRecord,
): Promise<ReleaseGenesisCivilizationState> {
	const current = validatePersistedState(currentValue);
	const payload = record(event.payload, "civilization transition");
	if (event.eventType === "CivilizationSponsorCommandRejected") {
		if (
			payload.schemaVersion !==
				RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION ||
			payload.transitionKind !== "sponsor-rejected" ||
			array(payload.patch, "rejected sponsor patch").length !== 0
		)
			fail("UNSUPPORTED_VERSION", "CIVP");
		return current;
	}
	if (event.eventType === "CivilizationSponsorCommandCommitted") {
		if (
			payload.schemaVersion !==
				RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION ||
			payload.transitionKind !== "sponsor"
		)
			fail("UNSUPPORTED_VERSION", "CIVP");
		if (
			!exactKeys(payload, [
				"schemaVersion",
				"transitionKind",
				"protocolEvent",
				"commandReceipt",
				"decisionRecord",
			]) ||
			current.civilization === null
		)
			fail("INVALID_INPUT", "CIVP");
		const currentCivilization =
			current.civilization as unknown as CivilizationState;
		assertCivilizationInvariants(currentCivilization);
		const protocolEvent = await parseCivilizationSponsorEvent(
			payload.protocolEvent,
			current.scheduler.simulationTime,
		);
		if (
			protocolEvent === null ||
			protocolEvent.runId !== event.runId ||
			protocolEvent.regionId !== event.regionId ||
			protocolEvent.eventId !== event.eventId ||
			protocolEvent.sequence !== event.sequence ||
			protocolEvent.simulationTime !== event.simulationTime
		)
			fail("INVALID_INPUT", "CIVP");
		const outerParents = protocolEvent.causalParents.map((parent) => ({
			eventId: parent.eventId,
			relation:
				parent.relation === "direct"
					? ("direct-cause" as const)
					: parent.relation === "trigger"
						? ("trigger" as const)
						: ("contributing-condition" as const),
		}));
		const expectedMechanism =
			protocolEvent.causalParents[0]?.mechanismId ??
			`sponsor.${protocolEvent.eventPayload.kind}.v1`;
		if (
			canonicalJson(event.causalParents as unknown as JsonValue) !==
				canonicalJson(outerParents as unknown as JsonValue) ||
			canonicalJson(event.visibility) !==
				canonicalJson(protocolEvent.visibility as unknown as JsonValue) ||
			event.provenance.mechanismId !== expectedMechanism ||
			event.provenance.cognitionDecisionId !==
				(protocolEvent.provenance.kind === "cognition"
					? protocolEvent.provenance.decisionId
					: null) ||
			event.provenance.brainKind !==
				(protocolEvent.provenance.kind === "cognition" ? "standard" : null)
		)
			fail("INVALID_INPUT", "CIVP");
		if (protocolEvent.eventPayload.kind === "CounselInterpreted") {
			if (
				!(await validateCommittedCivilizationDecisionRecord({
					state: currentCivilization,
					event: protocolEvent,
					commandReceipt: payload.commandReceipt,
					decisionRecord: payload.decisionRecord,
				}))
			)
				fail("INVALID_INPUT", "CIVP");
		} else if (payload.decisionRecord !== null) {
			fail("INVALID_INPUT", "CIVP");
		}
		let postCivilization: CivilizationState;
		try {
			postCivilization = await applyCivilizationSponsorEvent({
				state: currentCivilization,
				event: protocolEvent,
			});
			assertCivilizationInvariants(postCivilization);
		} catch {
			fail("INVALID_INPUT", "CIVP");
		}
		const next: ReleaseGenesisCivilizationState = {
			...current,
			phase: "active",
			civilization: cloneValue(postCivilization as unknown as JsonValue),
		};
		if (
			next.worldIdentityHash !== current.worldIdentityHash ||
			next.sourceInitialStateHash !== current.sourceInitialStateHash ||
			next.finalExperimentStateHash !== current.finalExperimentStateHash ||
			canonicalJson(next.world) !== canonicalJson(current.world) ||
			canonicalJson(next.scheduler) !== canonicalJson(current.scheduler) ||
			canonicalJson(next.sourceHistory) !==
				canonicalJson(current.sourceHistory) ||
			event.simulationTime !== current.scheduler.simulationTime ||
			next.civilization === null
		)
			fail("RANGE_GAP", "CIVP");
		return next;
	}
	if (event.eventType === "CivilizationCounselBoundaryCommitted") {
		if (
			payload.schemaVersion !==
				RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION ||
			payload.transitionKind !== "counsel-boundary" ||
			!exactKeys(payload, [
				"schemaVersion",
				"transitionKind",
				"fact",
				"routineDecision",
				"schedulerActions",
				"schedulerRoutines",
			]) ||
			current.phase !== "active" ||
			current.civilization === null
		)
			fail("UNSUPPORTED_VERSION", "CIVP");
		const fact = record(payload.fact, "counsel boundary fact");
		if (
			!exactKeys(fact, [
				"schemaVersion",
				"citizenId",
				"interventionId",
				"interpretationEventId",
				"interpretationAction",
				"interpretationDisposition",
				"causalRelation",
				"routineKind",
				"routineSubjectId",
				"planRoutineKind",
				"planRoutineSubjectId",
				"consequenceKind",
				"schedulerActionKinds",
				"simulationTime",
				"requiredNeedUnits",
				"consumedNeedUnits",
				"unmetNeedUnits",
				"sourceStockIds",
				"effect",
				"counterfactual",
			]) ||
			fact.schemaVersion !== "eonfolk-counsel-boundary-fact-v4" ||
			typeof fact.citizenId !== "string" ||
			typeof fact.interventionId !== "string" ||
			typeof fact.interpretationEventId !== "string" ||
			!["verify-reserve", "accuse-publicly", "follow-plan"].includes(
				String(fact.interpretationAction),
			) ||
			!["accepted", "delayed", "rejected", "reinterpreted"].includes(
				String(fact.interpretationDisposition),
			) ||
			!["contributing-condition", "temporal-predecessor"].includes(
				String(fact.causalRelation),
			) ||
			![
				"produce",
				"transport",
				"construct",
				"consume",
				"social-maintenance",
				"travel",
				"away",
			].includes(String(fact.routineKind)) ||
			typeof fact.routineSubjectId !== "string" ||
			fact.routineSubjectId.length === 0 ||
			![
				"produce",
				"transport",
				"construct",
				"consume",
				"social-maintenance",
				"travel",
				"away",
			].includes(String(fact.planRoutineKind)) ||
			typeof fact.planRoutineSubjectId !== "string" ||
			fact.planRoutineSubjectId.length === 0 ||
			!["routine-continued", "routine-reassigned"].includes(
				String(fact.consequenceKind),
			) ||
			array(fact.schedulerActionKinds, "boundary scheduler action kinds").some(
				(kind) => typeof kind !== "string" || kind.length === 0,
			) ||
			(event.causalParents.length !== 1 && event.causalParents.length !== 2) ||
			event.causalParents[0]?.eventId !== fact.interpretationEventId ||
			event.causalParents[0]?.relation !== fact.causalRelation ||
			event.provenance.mechanismId !==
				"civilization.scheduler.counsel-boundary.v1"
		)
			fail("INVALID_INPUT", "CIVP");
		const routineDecision = cloneValue(
			record(payload.routineDecision, "boundary routine decision") as JsonValue,
		) as unknown as SchedulerRoutineDecision;
		const currentCivilization =
			current.civilization as unknown as CivilizationState;
		assertCivilizationInvariants(currentCivilization);
		const effect = counselOutcomeEffect(fact.effect);
		const counterfactual = record(
			fact.counterfactual,
			"counsel boundary counterfactual",
		);
		if (
			!exactKeys(counterfactual, [
				"schemaVersion",
				"policy",
				"abstentionEventId",
				"routineKind",
				"routineSubjectId",
				"schedulerActionKinds",
			]) ||
			counterfactual.schemaVersion !== "eonfolk-counsel-counterfactual-v1" ||
			counterfactual.policy !== "patron-non-intervention" ||
			(counterfactual.abstentionEventId !== null &&
				typeof counterfactual.abstentionEventId !== "string") ||
			typeof counterfactual.routineKind !== "string" ||
			typeof counterfactual.routineSubjectId !== "string" ||
			array(
				counterfactual.schedulerActionKinds,
				"counterfactual action kinds",
			).some((kind) => typeof kind !== "string") ||
			(counterfactual.abstentionEventId === null
				? event.causalParents.length !== 1
				: event.causalParents.length !== 2 ||
					event.causalParents[1]?.eventId !==
						counterfactual.abstentionEventId ||
					event.causalParents[1]?.relation !== "temporal-predecessor")
		)
			fail("INVALID_INPUT", "CIVP");
		const counsel = currentCivilization.counsels[String(fact.interventionId)];
		const resolution = counsel?.resolution;
		const plan =
			currentCivilization.minds[String(fact.citizenId)]?.snapshot.standingPlan;
		const planStep = plan?.steps.find(
			({ stepId }) => stepId === plan.currentStepId,
		);
		const relationshipTarget = [
			...(currentCivilization.minds[String(fact.citizenId)]?.snapshot
				.relationships ?? []),
		]
			.sort((left, right) =>
				left.relationshipId.localeCompare(right.relationshipId),
			)
			.find(
				(relationship) =>
					relationship.fromCitizenId === fact.citizenId &&
					currentCivilization.citizens[relationship.toCitizenId]
						?.residenceState === "resident" &&
					currentCivilization.citizens[relationship.toCitizenId]
						?.settlementId ===
						currentCivilization.citizens[String(fact.citizenId)]?.settlementId,
			)?.toCitizenId;
		const expectedRoutineKind =
			planStep?.kind === "Produce"
				? "produce"
				: planStep?.kind === "TransportResource"
					? "transport"
					: planStep?.kind === "WorkProject"
						? "construct"
						: planStep?.kind === "Consume"
							? "consume"
							: planStep?.kind === "JoinMigration"
								? "travel"
								: planStep?.kind === "Away"
									? "away"
									: "social-maintenance";
		if (
			counsel?.citizenId !== fact.citizenId ||
			resolution?.sourceEventId !== fact.interpretationEventId ||
			resolution.action !== fact.interpretationAction ||
			resolution.disposition !== fact.interpretationDisposition ||
			event.causalParents[0]?.relation !==
				(resolution.action === "follow-plan"
					? "temporal-predecessor"
					: "contributing-condition") ||
			event.provenance.cognitionDecisionId !== resolution.decisionId ||
			event.provenance.brainKind !== "standard" ||
			plan?.status !== "active" ||
			plan.expiryBoundary < currentCivilization.simulationTime ||
			planStep?.status !== "active" ||
			fact.planRoutineKind !== expectedRoutineKind ||
			fact.planRoutineSubjectId !== (planStep.targetIds[0] ?? fact.citizenId) ||
			fact.consequenceKind !==
				(routineDecision.kind === expectedRoutineKind &&
				routineDecision.subjectId === (planStep.targetIds[0] ?? fact.citizenId)
					? "routine-continued"
					: "routine-reassigned") ||
			(resolution.action === "follow-plan"
				? fact.consequenceKind !== "routine-continued"
				: fact.consequenceKind !== "routine-reassigned") ||
			routineDecision.citizenId !== fact.citizenId ||
			routineDecision.activeStandingPlanId !== plan.planId ||
			(resolution.action === "follow-plan"
				? routineDecision.actionId !== `follow:${plan.planId}` ||
					routineDecision.kind !== expectedRoutineKind ||
					routineDecision.subjectId !==
						(planStep.targetIds[0] ?? fact.citizenId)
				: relationshipTarget === undefined ||
					routineDecision.actionId !==
						`counsel:${resolution.action}:${String(fact.interventionId)}` ||
					routineDecision.kind !== "social-maintenance" ||
					routineDecision.subjectId !== relationshipTarget)
		)
			fail("INVALID_INPUT", "CIVP");
		const policy = deriveCivilizationSchedulerPolicy(
			current.world as unknown as GeneratedWorldState,
		);
		const derivedCounterfactual = advanceGeneralizedScheduler(
			currentCivilization,
			policy,
			[],
		);
		let derived: ReturnType<typeof advanceGeneralizedScheduler>;
		try {
			derived = advanceGeneralizedScheduler(currentCivilization, policy, [
				routineDecision,
			]);
			assertCivilizationInvariants(derived.state);
		} catch {
			fail("INVALID_INPUT", "CIVP");
		}
		let derivedState = derived.state;
		try {
			derivedState = applyCounselStandingPlanBoundary({
				state: derivedState,
				citizenId: String(fact.citizenId),
				action: resolution.action,
			});
			assertCivilizationInvariants(derivedState);
		} catch {
			fail("INVALID_INPUT", "CIVP");
		}
		try {
			derivedState = applyCivilizationCounselOutcome({
				state: derivedState,
				citizenId: String(fact.citizenId),
				interventionId: String(fact.interventionId),
				interpretationEventId: String(fact.interpretationEventId),
				sourceEventId: event.eventId,
				effect,
			});
		} catch {
			fail("INVALID_INPUT", "CIVP");
		}
		const counterfactualRoutine = derivedCounterfactual.routines.find(
			(candidate) => candidate.citizenId === fact.citizenId,
		);
		const expectedAbstentionEventId =
			Object.values(currentCivilization.patronAbstentions)
				.filter((item) => item.citizenId === fact.citizenId)
				.sort(
					(left, right) => right.recordedAtRevision - left.recordedAtRevision,
				)[0]?.sourceEventId ?? null;
		if (
			canonicalJson(derived.actions as unknown as JsonValue) !==
				canonicalJson(payload.schedulerActions as JsonValue) ||
			canonicalJson(derived.routines as unknown as JsonValue) !==
				canonicalJson(payload.schedulerRoutines as JsonValue) ||
			fact.routineKind !== routineDecision.kind ||
			fact.routineSubjectId !== routineDecision.subjectId ||
			canonicalJson(fact.schedulerActionKinds as JsonValue) !==
				canonicalJson(
					[
						...new Set(derived.actions.map(({ kind }) => kind)),
					].sort() as JsonValue,
				) ||
			counterfactual.abstentionEventId !== expectedAbstentionEventId ||
			counterfactual.routineKind !==
				(counterfactualRoutine?.kind ?? "social-maintenance") ||
			counterfactual.routineSubjectId !==
				(counterfactualRoutine?.subjectId ?? fact.citizenId) ||
			canonicalJson(counterfactual.schedulerActionKinds as JsonValue) !==
				canonicalJson(
					[
						...new Set(derivedCounterfactual.actions.map(({ kind }) => kind)),
					].sort() as JsonValue,
				)
		)
			fail("STALE_STATE", "CIVP");
		const outcome = derivedState.needOutcomes
			.filter(
				(candidate) =>
					candidate.citizenId === fact.citizenId &&
					candidate.evaluatedAtSimulationTime === derived.state.simulationTime,
			)
			.at(-1);
		if (
			outcome === undefined ||
			fact.simulationTime !== derived.state.simulationTime ||
			fact.requiredNeedUnits !==
				outcome.foodRequiredUnits + outcome.waterRequiredUnits ||
			fact.consumedNeedUnits !==
				outcome.foodConsumedUnits + outcome.waterConsumedUnits ||
			fact.unmetNeedUnits !==
				outcome.foodRequiredUnits -
					outcome.foodConsumedUnits +
					(outcome.waterRequiredUnits - outcome.waterConsumedUnits) ||
			canonicalJson(fact.sourceStockIds as JsonValue) !==
				canonicalJson([...outcome.sourceStockIds].sort() as JsonValue)
		)
			fail("STALE_STATE", "CIVP");
		const expectedActivities = projectCivilizationScheduledActivities({
			state: derivedState,
			world: current.world as unknown as GeneratedWorldState,
			routines: derived.routines,
		}).map((activity) =>
			activity.citizenId !== fact.citizenId ||
			resolution.action === "follow-plan"
				? activity
				: {
						...activity,
						canonicalAction: {
							...activity.canonicalAction,
							actionId: `counsel-outcome:${String(fact.interventionId)}`,
							kind: resolution.action === "verify-reserve" ? "inspect" : "talk",
							targetId:
								resolution.action === "verify-reserve"
									? effect.kind === "reserve-inspection"
										? (effect.stockObservations[0]?.stockId ?? null)
										: null
									: (relationshipTarget ?? null),
						},
					},
		);
		const next: ReleaseGenesisCivilizationState = {
			...current,
			civilization: cloneValue(derivedState as unknown as JsonValue),
			scheduler: {
				completedDay: current.scheduler.completedDay + 1,
				simulationTime: derived.state.simulationTime,
				modelInvocations: 0,
				activities: cloneValue(expectedActivities as unknown as JsonValue),
			},
		};
		if (
			next.phase !== "active" ||
			next.worldIdentityHash !== current.worldIdentityHash ||
			next.sourceInitialStateHash !== current.sourceInitialStateHash ||
			next.finalExperimentStateHash !== current.finalExperimentStateHash ||
			canonicalJson(next.world) !== canonicalJson(current.world) ||
			canonicalJson(next.sourceHistory) !==
				canonicalJson(current.sourceHistory) ||
			canonicalJson(next.civilization as JsonValue) !==
				canonicalJson(derivedState as unknown as JsonValue) ||
			next.scheduler.completedDay !== current.scheduler.completedDay + 1 ||
			next.scheduler.simulationTime !== derivedState.simulationTime ||
			canonicalJson(next.scheduler.activities) !==
				canonicalJson(expectedActivities as unknown as JsonValue) ||
			event.simulationTime !== derivedState.simulationTime ||
			next.scheduler.modelInvocations !== 0
		)
			fail("RANGE_GAP", "CIVP");
		return next;
	}
	if (event.eventType !== "CivilizationCheckpointCommitted")
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (payload.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION)
		fail(
			"UNSUPPORTED_VERSION",
			"civilization transition version is unsupported",
		);
	if (payload.transitionKind !== "checkpoint")
		fail("UNSUPPORTED_VERSION", "CIVP");
	if (payload.previousCompletedDay !== current.scheduler.completedDay)
		fail("RANGE_GAP", "CIVP");
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
		fail("RANGE_GAP", "CIVP");
	if (
		payload.resultingCompletedDay !== next.scheduler.completedDay ||
		payload.resultingSimulationTime !== next.scheduler.simulationTime ||
		payload.resultingExperimentStateHash !== next.finalExperimentStateHash
	)
		fail("STALE_STATE", "CIVP");
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
		fail("RANGE_GAP", "CIVP");
	for (const [index, step] of sourceSteps.entries()) {
		if (
			record(step, `transition step ${index}`).stepHash !==
			next.sourceHistory.stepHashes[priorSteps.length + index]
		)
			fail("STALE_STATE", "CIVP");
	}
	for (const [index, sourceEvent] of sourceEvents.entries()) {
		if (
			record(sourceEvent, `transition event ${index}`).eventHash !==
			next.sourceHistory.eventHashes[priorEvents.length + index]
		)
			fail("STALE_STATE", "CIVP");
	}
	return next;
}

export async function persistCivilizationHistory(
	port: VersionedPersistencePort,
	input: CreateCivilizationPersistencePlanInput,
): Promise<PersistCivilizationHistoryResult> {
	if (port.portVersion !== VERSIONED_PERSISTENCE_PORT_VERSION)
		fail("UNSUPPORTED_VERSION", "CIVP");
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
		fail("UNSUPPORTED_VERSION", "CIVP");
	const rangeSize = input.rangeSize ?? 32;
	if (!Number.isSafeInteger(rangeSize) || rangeSize < 1 || rangeSize > 16_384)
		fail("INVALID_INPUT", "CIVP");
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
				fail("UNSUPPORTED_VERSION", "CIVP");
			if (
				event.preStateHash !== stateHash ||
				event.previousEventHash !== lastEventHash
			)
				fail("RANGE_GAP", "CIVP");
			if (event.eventType === "CivilizationCheckpointCommitted")
				await validateTransitionSourceRecords(state, event);
			if (event.eventType === "CivilizationSponsorCommandCommitted") {
				const stored = await port.getAppendReceipt(input, event.appendId);
				const sponsorPayload = record(event.payload, "sponsor transition");
				const embeddedReceipt = record(
					sponsorPayload.commandReceipt,
					"embedded sponsor receipt",
				);
				if (
					stored === null ||
					stored.resultingStateHash !== event.postStateHash ||
					stored.resultingLastEventHash !== event.eventHash ||
					canonicalJson(stored.decisionRecord as JsonValue) !==
						canonicalJson(sponsorPayload.decisionRecord as JsonValue) ||
					canonicalJson({
						...record(stored.commandReceipt, "durable sponsor receipt"),
						resultingWorldHeadHash: embeddedReceipt.resultingWorldHeadHash,
					} as JsonValue) !== canonicalJson(embeddedReceipt as JsonValue)
				)
					fail("STALE_STATE", "CIVP");
			}
			state = await reduceCivilizationAuthorityEvent(state, event);
			await validateCheckpointSourceState(state);
			stateHash = await hashAuthoritativeState(state);
			if (stateHash !== event.postStateHash) fail("STALE_STATE", "CIVP");
			lastEventHash = event.eventHash;
			events.push(event);
		}
	}
	return { state: cloneValue(state), events, stateHash, lastEventHash };
}
