import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_CATCH_UP_RECEIPT_SCHEMA_VERSION,
	type AuthorityAppendReceipt,
	type AuthorityHead,
	type AuthoritySnapshotRecord,
	type CatchUpOperationRecord,
	type CivilizationPersistencePlan,
	createAuthorityEvent,
	createAuthoritySnapshot,
	createCivilizationPersistencePlan,
	hashAuthoritativeState,
	type JsonValue,
	persistAuthorityCatchUp,
	RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
	type ReleaseGenesisCivilizationState,
	replayCivilizationHistory,
	type VersionedPersistencePort,
} from "@eonfolk/persistence";
import type { GeneratedWorldState } from "@eonfolk/protocol";
import {
	type V1PersistedCheckpoint,
	validateV1PersistedCheckpoint,
} from "../v1-indexeddb";

export const GENERATED_CIVILIZATION_CATCH_UP_HORIZONS = Object.freeze([
	1, 7, 30, 90, 365,
] as const);
export const GENERATED_CIVILIZATION_RUN_ID = "v1-generated-civilization";
export const GENERATED_CIVILIZATION_GENESIS_SNAPSHOT_ID =
	"civilization-genesis";
export const LEGACY_CHECKPOINT_MIGRATION_VERSION =
	"eonfolk-legacy-checkpoint-migration-v1" as const;
export const GENERATED_CIVILIZATION_OPERATION_LIMITS = Object.freeze({
	maximumHorizonDays: 365,
	maximumChapters: 5,
	maximumRunnerInvocations: 5,
	maximumSourceSteps: 365,
	maximumSourceEvents: 16_384,
	maximumPlanBytes: 4_194_304,
	maximumPreparationRuntimeMs: 30_000,
} as const);

export type GeneratedCivilizationCatchUpHorizon =
	(typeof GENERATED_CIVILIZATION_CATCH_UP_HORIZONS)[number];

export interface AdvanceGeneratedCivilizationRequest {
	readonly port: VersionedPersistencePort;
	readonly genesisWorld: GeneratedWorldState;
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly authorityRunner?: typeof runCivilizationExperiment;
	readonly confirmationId?: string;
}

export interface GeneratedCivilizationOperationMeasurement {
	readonly chapters: number;
	readonly horizonDays: number;
	readonly runnerInvocations: number;
	readonly sourceSteps: number;
	readonly sourceEvents: number;
	readonly planBytes: number;
	readonly preparationRuntimeMs: number;
}

export interface AdvanceGeneratedCivilizationResult {
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly checkpoints: readonly CivilizationExperimentRun[];
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly receipts: readonly AuthorityAppendReceipt[];
	readonly idempotentAppends: number;
	readonly catchUpOperation: CatchUpOperationRecord;
	readonly measurement: GeneratedCivilizationOperationMeasurement;
}

export interface PreparedGeneratedCivilization {
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly checkpoints: readonly CivilizationExperimentRun[];
	readonly plan: CivilizationPersistencePlan;
	readonly measurement: GeneratedCivilizationOperationMeasurement;
}

export interface LegacyCheckpointMigrationResult {
	readonly migrationVersion: typeof LEGACY_CHECKPOINT_MIGRATION_VERSION;
	readonly sourceRecordHash: string;
	readonly targetSnapshotId: string;
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
}

function snapshotId(horizonDays: number): string {
	return `civilization-day-${horizonDays}`;
}

function selectedHorizons(
	target: GeneratedCivilizationCatchUpHorizon,
): readonly GeneratedCivilizationCatchUpHorizon[] {
	const index = GENERATED_CIVILIZATION_CATCH_UP_HORIZONS.indexOf(target);
	if (index < 0)
		throw new RangeError(
			"target horizon is outside the reviewed catch-up catalog",
		);
	return GENERATED_CIVILIZATION_CATCH_UP_HORIZONS.slice(0, index + 1);
}

export function assertGeneratedPreCommitInvariants(
	checkpoints: readonly CivilizationExperimentRun[],
): void {
	if (checkpoints.length === 0) throw new Error();
	for (const checkpoint of checkpoints) {
		const citizens = Object.values(checkpoint.state.citizens);
		const residents = citizens.filter(
			({ residenceState }) => residenceState === "resident",
		).length;
		if (
			checkpoint.metrics.invariantIssues.length > 0 ||
			checkpoint.metrics.residentPopulation !== residents ||
			checkpoint.metrics.travellingPopulation !== citizens.length - residents ||
			checkpoint.metrics.population !== citizens.length
		)
			throw new Error("invalid");
	}
}

async function persistPlan(input: {
	readonly port: VersionedPersistencePort;
	readonly plan: CivilizationPersistencePlan;
	readonly targetHorizonDays: number;
	readonly confirmationId: string;
}): Promise<{
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly receipts: readonly AuthorityAppendReceipt[];
	readonly idempotentAppends: number;
	readonly catchUpOperation: CatchUpOperationRecord;
}> {
	await input.port.initialize(input.plan.genesis);
	const catchUp = await persistAuthorityCatchUp(input.port, {
		...input.plan.scope,
		operationId: `generated-day-${input.targetHorizonDays}`,
		confirmationId: input.confirmationId,
		confirmed: true,
		chapters: input.plan.batches,
	});
	const receipts = await Promise.all(
		input.plan.batches.map(async (batch) => {
			const receipt = await input.port.getAppendReceipt(
				input.plan.scope,
				batch.appendId,
			);
			if (receipt === null) throw new Error("durable chapter receipt missing");
			return receipt;
		}),
	);
	const newlyCommitted =
		catchUp.chapterReceipts.length - catchUp.idempotentChapters;
	const idempotentAppends = receipts.length - newlyCommitted;
	const head = catchUp.head;
	let snapshotState = input.plan.finalState;
	const extendedAuthority =
		(await hashAuthoritativeState(snapshotState)) !== head.stateHash;
	if (extendedAuthority) {
		const latest = await input.port.loadLatestSnapshot(input.plan.scope);
		const replayed = await replayCivilizationHistory(input.port, {
			...input.plan.scope,
			snapshotId: latest.snapshotId,
			toSequenceExclusive: head.lastSequence + 1,
		});
		snapshotState = replayed.state;
	}
	const snapshot = await createAuthoritySnapshot({
		...input.plan.scope,
		engineVersion: head.engineVersion,
		stateSchemaVersion: head.stateSchemaVersion,
		snapshotId: extendedAuthority
			? `${snapshotId(input.targetHorizonDays)}-authority-${head.revision}`
			: snapshotId(input.targetHorizonDays),
		revision: head.revision,
		baseSequence: head.lastSequence,
		simulationTime: head.simulationTime,
		lastEventHash: head.lastEventHash,
		state: snapshotState,
	});
	await input.port.saveSnapshot({ snapshot, fencingToken: head.fencingToken });
	return {
		head,
		snapshot,
		receipts,
		idempotentAppends,
		catchUpOperation: catchUp.receipt,
	};
}

/**
 * Computes and fully validates a deterministic candidate before any durable
 * authority is opened or mutated. A caller may present this separately
 * admitted view when storage is unavailable, but must never treat it as a
 * hydrated checkpoint.
 */
export async function prepareGeneratedCivilization(input: {
	readonly genesisWorld: GeneratedWorldState;
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly authorityRunner?: typeof runCivilizationExperiment;
	readonly now?: () => number;
	readonly maximumRuntimeMs?: number;
}): Promise<PreparedGeneratedCivilization> {
	const now = input.now ?? (() => performance.now());
	const startedAt = now();
	const runtimeLimit =
		input.maximumRuntimeMs ??
		GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumPreparationRuntimeMs;
	if (!Number.isFinite(runtimeLimit) || runtimeLimit <= 0)
		throw new RangeError("invalid generated civilization runtime limit");
	const authorityRunner = input.authorityRunner ?? runCivilizationExperiment;
	const checkpoints: CivilizationExperimentRun[] = [];
	for (const horizonDays of selectedHorizons(input.targetHorizonDays)) {
		const generated = await authorityRunner({
			world: input.genesisWorld,
			horizonDays,
		});
		if (generated.metrics.modelInvocations !== 0)
			throw new Error("generated civilization catch-up invoked a model");
		checkpoints.push(generated);
		if (now() - startedAt > runtimeLimit)
			throw new RangeError(
				"generated civilization preparation exceeded its cap",
			);
	}
	const plan = await createCivilizationPersistencePlan({
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.genesisWorld.identity.worldId,
		genesisId: "generated-civilization-genesis",
		genesisWorld: input.genesisWorld,
		checkpoints,
		batchSize: 1,
		snapshotId: "civilization",
	});
	assertGeneratedPreCommitInvariants(checkpoints);
	const source = checkpoints.at(-1);
	if (source === undefined) throw new Error("generated checkpoint missing");
	const measurement: GeneratedCivilizationOperationMeasurement = Object.freeze({
		chapters: plan.batches.length,
		horizonDays: input.targetHorizonDays,
		runnerInvocations: checkpoints.length,
		sourceSteps: source.steps.length,
		sourceEvents: source.events.length,
		planBytes: new TextEncoder().encode(JSON.stringify(plan)).byteLength,
		preparationRuntimeMs: Math.max(0, now() - startedAt),
	});
	if (
		measurement.horizonDays >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumHorizonDays ||
		measurement.chapters >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumChapters ||
		measurement.runnerInvocations >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumRunnerInvocations ||
		measurement.sourceSteps >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumSourceSteps ||
		measurement.sourceEvents >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumSourceEvents ||
		measurement.planBytes >
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumPlanBytes ||
		measurement.preparationRuntimeMs > runtimeLimit
	)
		throw new RangeError("generated civilization operation exceeds V1 caps");
	return Object.freeze({
		targetHorizonDays: input.targetHorizonDays,
		checkpoints: Object.freeze(checkpoints),
		plan,
		measurement,
	});
}

const LIVE_DAY_RUNNER_VERSION = "eonfolk-civilization-runner-v9" as const;
const SECONDS_PER_DAY = 86_400;

type PlayerAuthorityMaps = Readonly<{
	readonly sponsorships?: Readonly<Record<string, JsonValue>>;
	readonly counsels?: Readonly<Record<string, JsonValue>>;
	readonly patronAbstentions?: Readonly<Record<string, JsonValue>>;
}>;

export function preservePlayerAuthority(
	nextCivilization: JsonValue,
	currentCivilization: JsonValue | null,
): JsonValue {
	if (
		currentCivilization === null ||
		typeof currentCivilization !== "object" ||
		Array.isArray(currentCivilization) ||
		typeof nextCivilization !== "object" ||
		nextCivilization === null ||
		Array.isArray(nextCivilization)
	)
		return nextCivilization;
	const current = currentCivilization as PlayerAuthorityMaps;
	const next = nextCivilization as PlayerAuthorityMaps;
	const sponsorships = {
		...(next.sponsorships ?? {}),
		...(current.sponsorships ?? {}),
	};
	const counsels = { ...(next.counsels ?? {}), ...(current.counsels ?? {}) };
	const patronAbstentions = {
		...(next.patronAbstentions ?? {}),
		...(current.patronAbstentions ?? {}),
	};
	if (
		Object.keys(sponsorships).length === 0 &&
		Object.keys(counsels).length === 0 &&
		Object.keys(patronAbstentions).length === 0
	)
		return nextCivilization;
	return {
		...(nextCivilization as Readonly<Record<string, JsonValue>>),
		sponsorships,
		counsels,
		patronAbstentions,
	};
}

/**
 * Player-authorized one-day advance. Wall clock never calls this. Play/faster
 * may request it; the append is the same checkpoint reducer as catch-up.
 * Sponsorship and counsel records are preserved and must not freeze the clock.
 */
export async function appendLiveGeneratedCivilizationDay(input: {
	readonly port: VersionedPersistencePort;
	readonly genesisWorld: GeneratedWorldState;
	readonly authorityRunner?: typeof runCivilizationExperiment;
}): Promise<{
	readonly horizonDays: number;
	readonly head: AuthorityHead;
	readonly stateHash: string;
	readonly advanced: boolean;
}> {
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.genesisWorld.identity.worldId,
	};
	const opened = await input.port.loadHead(scope);
	const head = await input.port.acquireWriterFence(scope, opened.fencingToken);
	const snapshot = await input.port.loadLatestSnapshot(scope);
	const replay = await replayCivilizationHistory(input.port, {
		...scope,
		snapshotId: snapshot.snapshotId,
		toSequenceExclusive: head.lastSequence + 1,
	});
	const current = replay.state;
	const currentDay = current.scheduler.completedDay;
	if (
		currentDay >= GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumHorizonDays ||
		current.civilization === null
	)
		return Object.freeze({
			horizonDays: currentDay,
			head,
			stateHash: replay.stateHash,
			advanced: false,
		});
	const nextDay = currentDay + 1;
	const runner = input.authorityRunner ?? runCivilizationExperiment;
	const nextRun = await runner({
		world: input.genesisWorld,
		horizonDays: nextDay,
	});
	if (nextRun.metrics.modelInvocations !== 0)
		throw new Error("live day advance invoked a model");
	const step = nextRun.steps[currentDay];
	if (step === undefined)
		throw new Error("live day advance is missing the next experiment step");
	const nextState: ReleaseGenesisCivilizationState = {
		schemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		phase: "checkpoint",
		worldIdentityHash: current.worldIdentityHash,
		sourceInitialStateHash: current.sourceInitialStateHash,
		finalExperimentStateHash: nextRun.finalStateHash,
		world: nextRun.world as unknown as ReleaseGenesisCivilizationState["world"],
		civilization: preservePlayerAuthority(
			nextRun.state as unknown as JsonValue,
			current.civilization as unknown as JsonValue,
		) as ReleaseGenesisCivilizationState["civilization"],
		scheduler: {
			completedDay: nextDay,
			simulationTime: nextDay * SECONDS_PER_DAY,
			modelInvocations: 0,
			activities: nextRun.activities as unknown as JsonValue,
		},
		sourceHistory: {
			stepHashes: [...current.sourceHistory.stepHashes, step.stepHash],
			eventHashes: [...current.sourceHistory.eventHashes, ...step.eventHashes],
		},
	};
	const appendId = `civilization-live-day-${String(nextDay)}`;
	const batchId = `civilization-live-batch-${String(nextDay)}`;
	const preStateHash = await hashAuthoritativeState(current);
	const event = await createAuthorityEvent({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		appendId,
		batchId,
		eventId: `civilization-checkpoint-${String(nextDay)}`,
		sequence: head.lastSequence + 1,
		simulationTime: nextDay * SECONDS_PER_DAY,
		eventType: "CivilizationCheckpointCommitted",
		causalParents:
			currentDay === 0
				? []
				: [
						{
							eventId: `civilization-checkpoint-${String(currentDay)}`,
							relation: "direct",
							mechanismId: "civilization.checkpoint-prefix-advance.v1",
						},
					],
		visibility: { kind: "authority-only" },
		provenance: {
			mechanismId: LIVE_DAY_RUNNER_VERSION,
			cognitionDecisionId: null,
			brainKind: null,
		},
		preStateHash,
		postStateHash: await hashAuthoritativeState(nextState),
		previousEventHash: head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "checkpoint",
			previousCompletedDay: currentDay,
			resultingCompletedDay: nextDay,
			resultingSimulationTime: nextDay * SECONDS_PER_DAY,
			resultingExperimentStateHash: nextRun.finalStateHash,
			sourceStepHashes: [step.stepHash],
			sourceEventHashes: [...step.eventHashes],
			checkpoint: {
				world: nextRun.world as unknown as JsonValue,
				civilization: preservePlayerAuthority(
					nextRun.state as unknown as JsonValue,
					current.civilization as unknown as JsonValue,
				),
				activities: nextRun.activities as unknown as JsonValue,
			},
		},
	});
	await input.port.appendEventBatch({
		...scope,
		schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
		appendId,
		batchId,
		expectedRevision: head.revision,
		expectedLastSequence: head.lastSequence,
		expectedStateHash: head.stateHash,
		expectedLastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
		events: [event],
	});
	const advancedHead = await input.port.loadHead(scope);
	const nextSnapshot = await createAuthoritySnapshot({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		snapshotId: `civilization-day-${String(nextDay)}`,
		revision: advancedHead.revision,
		baseSequence: advancedHead.lastSequence,
		simulationTime: nextDay * SECONDS_PER_DAY,
		lastEventHash: advancedHead.lastEventHash,
		state: nextState,
	});
	await input.port.saveSnapshot({
		snapshot: nextSnapshot,
		fencingToken: advancedHead.fencingToken,
	});
	return Object.freeze({
		horizonDays: nextDay,
		head: advancedHead,
		stateHash: nextSnapshot.stateHash,
		advanced: true,
	});
}

export function liveReturnCatchUpConfirmationId(input: {
	readonly fromDay: number;
	readonly toDay: number;
	readonly revision: number;
	readonly sequence: number;
	readonly fencingToken: number;
}): string {
	return `ld-${String(input.fromDay)}-${String(input.toDay)}-${String(input.revision)}-${String(input.sequence)}-${String(input.fencingToken)}`;
}

export function parseLiveReturnCatchUpConfirmationId(confirmationId: string): {
	readonly fromDay: number;
	readonly toDay: number;
	readonly revision: number;
	readonly sequence: number;
	readonly fencingToken: number;
} | null {
	const match = /^ld-([1-9]\d*)-([1-9]\d*)-(\d+)-(\d+)-(\d+)$/u.exec(
		confirmationId,
	);
	if (match === null) return null;
	const fromDay = Number(match[1]);
	const toDay = Number(match[2]);
	if (toDay <= fromDay) return null;
	return Object.freeze({
		fromDay,
		toDay,
		revision: Number(match[3]),
		sequence: Number(match[4]),
		fencingToken: Number(match[5]),
	});
}

/**
 * Player-authorized return catch-up. Durable operation/receipt chapters mean a
 * crash after 3 of 7 committed days resumes the remainder instead of 7 more.
 */
export async function catchUpLiveGeneratedCivilizationDays(input: {
	readonly port: VersionedPersistencePort;
	readonly genesisWorld: GeneratedWorldState;
	readonly operationId: string;
	readonly additionalDays: number;
	readonly authorityRunner?: typeof runCivilizationExperiment;
}): Promise<{
	readonly horizonDays: number;
	readonly head: AuthorityHead;
	readonly stateHash: string;
	readonly advancedDays: number;
	readonly catchUpOperation: CatchUpOperationRecord;
}> {
	if (
		!Number.isSafeInteger(input.additionalDays) ||
		input.additionalDays < 1 ||
		input.additionalDays > 7
	)
		throw new RangeError("return catch-up days are outside the 1–7 cap");
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.genesisWorld.identity.worldId,
	};
	const startMarker = await input.port.getAppendReceipt(
		scope,
		`catch-up:${input.operationId}:start`,
	);
	const opened = await input.port.loadHead(scope);
	const head =
		startMarker === null
			? await input.port.acquireWriterFence(scope, opened.fencingToken)
			: opened;
	const latest = await input.port.loadLatestSnapshot(scope);
	const liveReplay = await replayCivilizationHistory(input.port, {
		...scope,
		snapshotId: latest.snapshotId,
		toSequenceExclusive: head.lastSequence + 1,
	});
	const runner = input.authorityRunner ?? runCivilizationExperiment;
	let fromDay = liveReplay.state.scheduler.completedDay;
	let toDay = Math.min(
		fromDay + input.additionalDays,
		GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumHorizonDays,
	);
	let expectedRevision = head.revision;
	let expectedSequence = head.lastSequence;
	let fencingToken = head.fencingToken;
	let cursor = liveReplay.state;
	let preStateHash = liveReplay.stateHash;
	let previousEventHash = head.lastEventHash;
	if (startMarker !== null) {
		const receipt = startMarker.commandReceipt as {
			readonly catchUpOperation?: { readonly confirmationId?: unknown };
		};
		const confirmationId =
			typeof receipt.catchUpOperation?.confirmationId === "string"
				? receipt.catchUpOperation.confirmationId
				: "";
		const parsed = parseLiveReturnCatchUpConfirmationId(confirmationId);
		if (parsed === null)
			throw new Error("return catch-up receipt is missing its plan identity");
		fromDay = parsed.fromDay;
		toDay = parsed.toDay;
		expectedRevision = parsed.revision;
		expectedSequence = parsed.sequence;
		fencingToken = parsed.fencingToken;
		const originSnapshot = await input.port
			.loadSnapshot(scope, snapshotId(fromDay))
			.catch(async () => await input.port.loadLatestSnapshot(scope));
		const origin = await replayCivilizationHistory(input.port, {
			...scope,
			snapshotId: originSnapshot.snapshotId,
			toSequenceExclusive: expectedSequence + 1,
		});
		cursor = origin.state;
		preStateHash = origin.stateHash;
		previousEventHash = originSnapshot.lastEventHash;
	}
	if (toDay <= fromDay)
		return Object.freeze({
			horizonDays: liveReplay.state.scheduler.completedDay,
			head,
			stateHash: liveReplay.stateHash,
			advancedDays: 0,
			catchUpOperation: {
				schemaVersion: AUTHORITY_CATCH_UP_RECEIPT_SCHEMA_VERSION,
				runId: scope.runId,
				regionId: scope.regionId,
				operationId: input.operationId,
				confirmationId: liveReturnCatchUpConfirmationId({
					fromDay: Math.max(1, fromDay),
					toDay: Math.max(fromDay + 1, toDay + 1),
					revision: expectedRevision,
					sequence: expectedSequence,
					fencingToken,
				}),
				planHash: "0".repeat(64),
				totalChapters: 0,
				nextChapter: 0,
				status: "complete" as const,
				initialRevision: expectedRevision,
				currentRevision: head.revision,
				initialStateHash: liveReplay.stateHash,
				currentStateHash: liveReplay.stateHash,
				initialWorldHeadHash: head.lastEventHash,
				currentWorldHeadHash: head.lastEventHash,
				finalRevision: head.revision,
				finalStateHash: liveReplay.stateHash,
				finalWorldHeadHash: head.lastEventHash,
				rejectionCode: null,
			},
		});
	const chapters: AppendAuthorityBatchRequest[] = [];
	for (let day = fromDay; day < toDay; day += 1) {
		const nextDay = day + 1;
		const nextRun = await runner({
			world: input.genesisWorld,
			horizonDays: nextDay,
		});
		if (nextRun.metrics.modelInvocations !== 0)
			throw new Error("live day advance invoked a model");
		const step = nextRun.steps[day];
		if (step === undefined)
			throw new Error("live day advance is missing the next experiment step");
		const preserved = preservePlayerAuthority(
			nextRun.state as unknown as JsonValue,
			cursor.civilization as unknown as JsonValue,
		);
		const nextState: ReleaseGenesisCivilizationState = {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
			phase: "checkpoint",
			worldIdentityHash: cursor.worldIdentityHash,
			sourceInitialStateHash: cursor.sourceInitialStateHash,
			finalExperimentStateHash: nextRun.finalStateHash,
			world:
				nextRun.world as unknown as ReleaseGenesisCivilizationState["world"],
			civilization:
				preserved as ReleaseGenesisCivilizationState["civilization"],
			scheduler: {
				completedDay: nextDay,
				simulationTime: nextDay * SECONDS_PER_DAY,
				modelInvocations: 0,
				activities: nextRun.activities as unknown as JsonValue,
			},
			sourceHistory: {
				stepHashes: [...cursor.sourceHistory.stepHashes, step.stepHash],
				eventHashes: [...cursor.sourceHistory.eventHashes, ...step.eventHashes],
			},
		};
		const appendId = `civilization-live-day-${String(nextDay)}`;
		const batchId = `civilization-live-batch-${String(nextDay)}`;
		const event = await createAuthorityEvent({
			...scope,
			engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
			stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
			appendId,
			batchId,
			eventId: `civilization-checkpoint-${String(nextDay)}`,
			sequence: expectedSequence + (day - fromDay) + 1,
			simulationTime: nextDay * SECONDS_PER_DAY,
			eventType: "CivilizationCheckpointCommitted",
			causalParents: [
				{
					eventId: `civilization-checkpoint-${String(day)}`,
					relation: "direct",
					mechanismId: "civilization.checkpoint-prefix-advance.v1",
				},
			],
			visibility: { kind: "authority-only" },
			provenance: {
				mechanismId: LIVE_DAY_RUNNER_VERSION,
				cognitionDecisionId: null,
				brainKind: null,
			},
			preStateHash,
			postStateHash: await hashAuthoritativeState(nextState),
			previousEventHash,
			payload: {
				schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
				transitionKind: "checkpoint",
				previousCompletedDay: day,
				resultingCompletedDay: nextDay,
				resultingSimulationTime: nextDay * SECONDS_PER_DAY,
				resultingExperimentStateHash: nextRun.finalStateHash,
				sourceStepHashes: [step.stepHash],
				sourceEventHashes: [...step.eventHashes],
				checkpoint: {
					world: nextRun.world as unknown as JsonValue,
					civilization: preserved,
					activities: nextRun.activities as unknown as JsonValue,
				},
			},
		});
		chapters.push({
			...scope,
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			appendId,
			batchId,
			expectedRevision: expectedRevision + (day - fromDay),
			expectedLastSequence: expectedSequence + (day - fromDay),
			expectedStateHash: preStateHash,
			expectedLastEventHash: previousEventHash,
			fencingToken,
			events: [event],
		});
		cursor = nextState;
		preStateHash = event.postStateHash;
		previousEventHash = event.eventHash;
	}
	const confirmationId = liveReturnCatchUpConfirmationId({
		fromDay,
		toDay,
		revision: expectedRevision,
		sequence: expectedSequence,
		fencingToken,
	});
	const catchUp = await persistAuthorityCatchUp(input.port, {
		...scope,
		operationId: input.operationId,
		confirmationId,
		confirmed: true,
		chapters,
	});
	const advancedHead = await input.port.loadHead(scope);
	const latestHeadReplay = await replayCivilizationHistory(input.port, {
		...scope,
		snapshotId: latest.snapshotId,
		toSequenceExclusive: advancedHead.lastSequence + 1,
	});
	const resultingDay = latestHeadReplay.state.scheduler.completedDay;
	const nextSnapshot = await createAuthoritySnapshot({
		...scope,
		engineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
		stateSchemaVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
		snapshotId: `civilization-day-${String(resultingDay)}`,
		revision: advancedHead.revision,
		baseSequence: advancedHead.lastSequence,
		simulationTime: resultingDay * SECONDS_PER_DAY,
		lastEventHash: advancedHead.lastEventHash,
		state: latestHeadReplay.state,
	});
	await input.port.saveSnapshot({
		snapshot: nextSnapshot,
		fencingToken: advancedHead.fencingToken,
	});
	return Object.freeze({
		horizonDays: resultingDay,
		head: advancedHead,
		stateHash: nextSnapshot.stateHash,
		advancedDays: Math.max(
			0,
			resultingDay - liveReplay.state.scheduler.completedDay,
		),
		catchUpOperation: catchUp.receipt,
	});
}

export async function persistPreparedGeneratedCivilization(input: {
	readonly port: VersionedPersistencePort;
	readonly prepared: PreparedGeneratedCivilization;
	readonly confirmationId?: string;
}): Promise<AdvanceGeneratedCivilizationResult> {
	const persisted = await persistPlan({
		port: input.port,
		plan: input.prepared.plan,
		targetHorizonDays: input.prepared.targetHorizonDays,
		confirmationId:
			input.confirmationId ??
			`confirmed-generated-day-${input.prepared.targetHorizonDays}`,
	});
	return {
		targetHorizonDays: input.prepared.targetHorizonDays,
		checkpoints: input.prepared.checkpoints,
		measurement: input.prepared.measurement,
		...persisted,
	};
}

/**
 * Deterministically recomputes only the reviewed catch-up checkpoints. The
 * civilization runner remains the sole simulation authority and must report
 * zero model invocations at every horizon.
 */
export async function advanceGeneratedCivilization(
	input: AdvanceGeneratedCivilizationRequest,
): Promise<AdvanceGeneratedCivilizationResult> {
	const prepared = await prepareGeneratedCivilization({
		genesisWorld: input.genesisWorld,
		targetHorizonDays: input.targetHorizonDays,
		...(input.authorityRunner === undefined
			? {}
			: { authorityRunner: input.authorityRunner }),
	});
	return await persistPreparedGeneratedCivilization({
		port: input.port,
		prepared,
		...(input.confirmationId === undefined
			? {}
			: { confirmationId: input.confirmationId }),
	});
}

export async function replayGeneratedCivilization(input: {
	readonly port: VersionedPersistencePort;
	readonly regionId: string;
	readonly snapshotId?: string;
}): Promise<{
	readonly state: ReleaseGenesisCivilizationState;
	readonly stateHash: string;
	readonly eventCount: number;
	readonly lastEventHash: string;
}> {
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	const head = await input.port.loadHead(scope);
	const replay = await replayCivilizationHistory(input.port, {
		...scope,
		snapshotId: input.snapshotId ?? GENERATED_CIVILIZATION_GENESIS_SNAPSHOT_ID,
		toSequenceExclusive: head.lastSequence + 1,
	});
	return {
		state: replay.state,
		stateHash: replay.stateHash,
		eventCount: replay.events.length,
		lastEventHash: replay.lastEventHash,
	};
}

/**
 * The sole reviewed migration accepts the exact legacy browser checkpoint
 * schema, fully revalidates it, and writes a new genesis/event/snapshot stream.
 * There is deliberately no generic upcaster or best-effort repair path.
 */
export async function migrateLegacyGeneratedCheckpoint(input: {
	readonly port: VersionedPersistencePort;
	readonly legacy: V1PersistedCheckpoint;
}): Promise<LegacyCheckpointMigrationResult> {
	const legacy = await validateV1PersistedCheckpoint(
		input.legacy,
		input.legacy.storageKey,
	);
	assertGeneratedPreCommitInvariants([legacy.checkpoint]);
	const persisted = await persistPlan({
		port: input.port,
		plan: await createCivilizationPersistencePlan({
			runId: GENERATED_CIVILIZATION_RUN_ID,
			regionId: legacy.genesisWorld.identity.worldId,
			genesisId: "generated-civilization-genesis",
			genesisWorld: legacy.genesisWorld,
			checkpoints: [legacy.checkpoint],
			batchSize: 1,
			snapshotId: "civilization",
		}),
		targetHorizonDays: legacy.horizonDays,
		confirmationId: `confirmed-legacy-day-${legacy.horizonDays}`,
	});
	return {
		migrationVersion: LEGACY_CHECKPOINT_MIGRATION_VERSION,
		sourceRecordHash: legacy.recordHash,
		targetSnapshotId: persisted.snapshot.snapshotId,
		head: persisted.head,
		snapshot: persisted.snapshot,
	};
}
