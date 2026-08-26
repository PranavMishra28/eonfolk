import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	type AuthorityAppendReceipt,
	type AuthorityHead,
	type AuthoritySnapshotRecord,
	type CatchUpOperationRecord,
	type CivilizationPersistencePlan,
	createAuthoritySnapshot,
	createCivilizationPersistencePlan,
	hashAuthoritativeState,
	persistAuthorityCatchUp,
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
