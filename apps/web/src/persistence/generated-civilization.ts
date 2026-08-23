import {
	createAuthoritySnapshot,
	createCivilizationPersistencePlan,
	replayCivilizationHistory,
	type AuthorityAppendReceipt,
	type AuthorityHead,
	type AuthoritySnapshotRecord,
	type ReleaseGenesisCivilizationState,
	type VersionedPersistencePort,
} from "@eonfolk/persistence";
import type { GeneratedWorldState } from "@eonfolk/protocol";
import {
	runCivilizationExperiment,
	type CivilizationExperimentRun,
} from "@eonfolk/civilization";
import {
	validateV1PersistedCheckpoint,
	type V1PersistedCheckpoint,
} from "../v1-indexeddb";

export const GENERATED_CIVILIZATION_CATCH_UP_HORIZONS = Object.freeze([
	1, 7, 30, 90, 365,
] as const);
export const GENERATED_CIVILIZATION_RUN_ID = "v1-generated-civilization";
export const GENERATED_CIVILIZATION_GENESIS_SNAPSHOT_ID =
	"civilization-genesis";
export const LEGACY_CHECKPOINT_MIGRATION_VERSION =
	"eonfolk-legacy-checkpoint-migration-v1" as const;

export type GeneratedCivilizationCatchUpHorizon =
	(typeof GENERATED_CIVILIZATION_CATCH_UP_HORIZONS)[number];

export interface AdvanceGeneratedCivilizationRequest {
	readonly port: VersionedPersistencePort;
	readonly genesisWorld: GeneratedWorldState;
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly authorityRunner?: typeof runCivilizationExperiment;
}

export interface AdvanceGeneratedCivilizationResult {
	readonly targetHorizonDays: GeneratedCivilizationCatchUpHorizon;
	readonly checkpoints: readonly CivilizationExperimentRun[];
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly receipts: readonly AuthorityAppendReceipt[];
	readonly idempotentAppends: number;
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
	readonly genesisWorld: GeneratedWorldState;
	readonly checkpoints: readonly CivilizationExperimentRun[];
	readonly targetHorizonDays: number;
}): Promise<{
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly receipts: readonly AuthorityAppendReceipt[];
	readonly idempotentAppends: number;
}> {
	const plan = await createCivilizationPersistencePlan({
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.genesisWorld.identity.worldId,
		genesisId: "generated-civilization-genesis",
		genesisWorld: input.genesisWorld,
		checkpoints: input.checkpoints,
		batchSize: 1,
		snapshotId: "civilization",
	});
	assertGeneratedPreCommitInvariants(input.checkpoints);
	await input.port.initialize(plan.genesis);
	const receipts: AuthorityAppendReceipt[] = [];
	let idempotentAppends = 0;
	for (const batch of plan.batches) {
		const result = await input.port.appendEventBatch(batch);
		receipts.push(result.receipt);
		if (result.idempotent) idempotentAppends += 1;
	}
	const head = await input.port.loadHead(plan.scope);
	const snapshot = await createAuthoritySnapshot({
		...plan.scope,
		engineVersion: head.engineVersion,
		stateSchemaVersion: head.stateSchemaVersion,
		snapshotId: snapshotId(input.targetHorizonDays),
		revision: head.revision,
		baseSequence: head.lastSequence,
		simulationTime: head.simulationTime,
		lastEventHash: head.lastEventHash,
		state: plan.finalState,
	});
	await input.port.saveSnapshot({ snapshot, fencingToken: head.fencingToken });
	return { head, snapshot, receipts, idempotentAppends };
}

/**
 * Deterministically recomputes only the reviewed catch-up checkpoints. The
 * civilization runner remains the sole simulation authority and must report
 * zero model invocations at every horizon.
 */
export async function advanceGeneratedCivilization(
	input: AdvanceGeneratedCivilizationRequest,
): Promise<AdvanceGeneratedCivilizationResult> {
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
	}
	const persisted = await persistPlan({
		port: input.port,
		genesisWorld: input.genesisWorld,
		checkpoints,
		targetHorizonDays: input.targetHorizonDays,
	});
	return {
		targetHorizonDays: input.targetHorizonDays,
		checkpoints,
		...persisted,
	};
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
	const persisted = await persistPlan({
		port: input.port,
		genesisWorld: legacy.genesisWorld,
		checkpoints: [legacy.checkpoint],
		targetHorizonDays: legacy.horizonDays,
	});
	return {
		migrationVersion: LEGACY_CHECKPOINT_MIGRATION_VERSION,
		sourceRecordHash: legacy.recordHash,
		targetSnapshotId: persisted.snapshot.snapshotId,
		head: persisted.head,
		snapshot: persisted.snapshot,
	};
}
