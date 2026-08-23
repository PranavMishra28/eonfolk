import {
	type CivilizationExperimentCognitionOptions,
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import { PersistenceError } from "@eonfolk/persistence";
import { createReleaseGenesis } from "@eonfolk/protocol";
import {
	type GeneratedCivilizationSpatialProjection,
	projectGeneratedCivilizationSpatial,
} from "@eonfolk/world-presentation";
import { generateWorld } from "@eonfolk/worldgen";
import {
	type GeneratedEmbodimentProjection,
	projectGeneratedWorldEmbodiment,
} from "./generated-presentation";
import type { BrowserPersistenceBoundaryInjector } from "./persistence/browser-versioned";
import { BrowserVersionedPersistence } from "./persistence/browser-versioned";
import {
	advanceGeneratedCivilization,
	type GeneratedCivilizationCatchUpHorizon,
} from "./persistence/generated-civilization";

const generatedFaultHooks =
	typeof __EONFOLK_E2E_CRASH_HOOKS__ !== "undefined" &&
	__EONFOLK_E2E_CRASH_HOOKS__;

import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "./v1-genesis-runtime";

export const GENERATED_WORLD_HORIZON_DAYS = 365;
export const GENERATED_WORLD_INITIAL_HORIZON_DAYS = 1;
export const GENERATED_WORLD_COMPARISON_HORIZON_DAYS = 1;
export const GENERATED_WORLD_STORAGE_KEY = "eonfolk-generated-authority";

export interface GeneratedWorldPersistenceStatus {
	readonly kind: "indexeddb" | "quarantined" | "unavailable";
	readonly restored: boolean;
	readonly catchUpReceipts: number;
}

export interface GeneratedWorldExperience {
	readonly worldId: string;
	readonly worldIdentityHash: string;
	readonly stateHash: string;
	readonly simulationTime: number;
	readonly horizonDays: number;
	readonly population: number;
	readonly settlementCount: number;
	readonly projections: readonly GeneratedCivilizationSpatialProjection[];
	readonly embodiments: readonly GeneratedEmbodimentProjection[];
	readonly previousStateHash: string;
	readonly previousHorizonDays: number;
	readonly embodimentLimitations: readonly string[];
	readonly persistence: GeneratedWorldPersistenceStatus;
}

export interface GeneratedWorldBuildOptions {
	readonly indexedDbFactory?: IDBFactory | null;
	readonly databaseName?: string;
	readonly targetHorizonDays?: GeneratedCivilizationCatchUpHorizon;
	readonly beforeAuthorityAdvance?: () => void | Promise<void>;
	readonly cognition?: CivilizationExperimentCognitionOptions;
	readonly persistenceBoundaryInjector?: BrowserPersistenceBoundaryInjector;
	readonly checkpointTransform?: (
		checkpoint: CivilizationExperimentRun,
	) => CivilizationExperimentRun;
	readonly mapAuthorityFailure?: (error: unknown) => Error;
}

let pendingExperience: Promise<GeneratedWorldExperience> | undefined;

function projectCheckpoint(
	run: CivilizationExperimentRun,
): readonly GeneratedCivilizationSpatialProjection[] {
	const settlementIds = Object.values(run.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort();
	if (settlementIds.length === 0) throw new Error("Settlement missing");
	const projections = settlementIds
		.map((settlementId) =>
			projectGeneratedCivilizationSpatial({
				world: run.world,
				civilization: run.state,
				checkpoint: run,
				activities: run.activities,
				settlementId,
				presentationTick: run.metrics.simulationTime * 30,
			}),
		)
		.sort((left, right) => {
			const founded =
				left.local.settlement.foundedAtSimulationTime -
				right.local.settlement.foundedAtSimulationTime;
			if (founded !== 0) return founded;
			return left.local.settlement.settlementId <
				right.local.settlement.settlementId
				? -1
				: 1;
		});
	const projectedPopulation = projections.reduce(
		(total, projection) => total + projection.spatial.actors.length,
		0,
	);
	if (projectedPopulation !== run.metrics.residentPopulation)
		throw new Error(
			`Population mismatch: ${projectedPopulation}/${run.metrics.residentPopulation}`,
		);
	return Object.freeze(projections);
}

/**
 * Builds the browser's read-only V1 projection from the same generated world,
 * deterministic civilization run, and scheduler-owned activities used by the
 * kernel tests. Presentation is not permitted to invent missing inhabitants or
 * actions.
 */
export async function buildGeneratedWorldExperience(
	options: GeneratedWorldBuildOptions = {},
): Promise<GeneratedWorldExperience> {
	if (generatedFaultHooks) await options.beforeAuthorityAdvance?.();
	const authorityRunner: typeof runCivilizationExperiment = async (input) => {
		const run = await runCivilizationExperiment({
			...input,
			...(options.cognition === undefined
				? {}
				: { cognition: options.cognition }),
		});
		return generatedFaultHooks
			? (options.checkpointTransform?.(run) ?? run)
			: run;
	};
	const releaseGenesis = await createReleaseGenesis({
		releaseId: V1_GENESIS_RELEASE_ID,
		seedHex: V1_GENESIS_SEED,
	});
	const generatedWorld = await generateWorld({
		releaseGenesis,
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
	const targetHorizonDays =
		options.targetHorizonDays ?? GENERATED_WORLD_HORIZON_DAYS;
	const databaseName = options.databaseName ?? GENERATED_WORLD_STORAGE_KEY;
	const indexedDbFactory =
		options.indexedDbFactory === undefined
			? globalThis.indexedDB
			: options.indexedDbFactory;
	let run: CivilizationExperimentRun | null = null;
	let previousRun: CivilizationExperimentRun | null = null;
	let persistence: GeneratedWorldPersistenceStatus | null = null;
	const runWithoutPersistence = async (
		kind: "quarantined" | "unavailable",
	): Promise<void> => {
		[previousRun, run] = await Promise.all([
			authorityRunner({
				world: generatedWorld,
				horizonDays: GENERATED_WORLD_COMPARISON_HORIZON_DAYS,
			}),
			authorityRunner({
				world: generatedWorld,
				horizonDays: targetHorizonDays,
			}),
		]);
		persistence = Object.freeze({
			kind,
			restored: false,
			catchUpReceipts: 0,
		});
	};
	if (indexedDbFactory === null || indexedDbFactory === undefined) {
		await runWithoutPersistence("unavailable");
	} else {
		let port: BrowserVersionedPersistence | null = null;
		try {
			port = await BrowserVersionedPersistence.open({
				factory: indexedDbFactory,
				databaseName,
				...(generatedFaultHooks &&
				options.persistenceBoundaryInjector !== undefined
					? { boundaryInjector: options.persistenceBoundaryInjector }
					: {}),
			});
			const advanced = await advanceGeneratedCivilization({
				port,
				genesisWorld: generatedWorld,
				targetHorizonDays,
				authorityRunner,
			});
			const finalCheckpoint = advanced.checkpoints.at(-1);
			if (finalCheckpoint === undefined) throw new Error("Checkpoint missing");
			run = finalCheckpoint;
			previousRun = advanced.checkpoints[0] ?? finalCheckpoint;
			persistence = Object.freeze({
				kind: "indexeddb",
				restored:
					advanced.receipts.length > 0 &&
					advanced.idempotentAppends === advanced.receipts.length,
				catchUpReceipts: advanced.receipts.length,
			});
		} catch (error) {
			if (generatedFaultHooks && options.mapAuthorityFailure !== undefined)
				throw options.mapAuthorityFailure(error);
			const quarantine = shouldQuarantine(error);
			if (!quarantine && !shouldDegradePersistence(error)) throw error;
			await runWithoutPersistence(quarantine ? "quarantined" : "unavailable");
		} finally {
			port?.close();
		}
	}
	if (run === null || previousRun === null || persistence === null)
		throw new Error();
	const projections = projectCheckpoint(run);
	const previousProjections = projectCheckpoint(previousRun);
	const worldEmbodiment = projectGeneratedWorldEmbodiment({
		current: projections,
		previous: previousProjections,
		activities: run.activities,
	});
	const embodimentBySettlement = new Map(
		worldEmbodiment.settlements.map((embodiment) => [
			embodiment.settlementId,
			embodiment,
		]),
	);
	const embodiments = Object.freeze(
		projections.map((projection) => {
			const embodiment = embodimentBySettlement.get(
				projection.local.settlement.settlementId,
			);
			if (embodiment === undefined) throw new Error("Embodiment missing");
			return embodiment;
		}),
	);
	return Object.freeze({
		worldId: run.world.identity.worldId,
		worldIdentityHash: run.world.identity.identityHash,
		stateHash: run.finalStateHash,
		simulationTime: run.metrics.simulationTime,
		horizonDays: run.horizonDays,
		population: run.metrics.population,
		settlementCount: projections.length,
		projections,
		embodiments,
		previousStateHash: previousRun.finalStateHash,
		previousHorizonDays: previousRun.horizonDays,
		embodimentLimitations: worldEmbodiment.limitations,
		persistence,
	});
}

function shouldQuarantine(error: unknown): boolean {
	return (
		(error instanceof PersistenceError &&
			(error.code === "STALE_STATE" || error.code === "RANGE_GAP")) ||
		(error instanceof DOMException && error.name === "VersionError")
	);
}

const INDEXED_DB_UNAVAILABLE_ERRORS = [
	"AbortError",
	"ConstraintError",
	"InvalidStateError",
	"NotReadableError",
	"QuotaExceededError",
	"SecurityError",
	"TransactionInactiveError",
	"UnknownError",
] as const;

function shouldDegradePersistence(error: unknown): boolean {
	return (
		(error instanceof DOMException &&
			INDEXED_DB_UNAVAILABLE_ERRORS.includes(
				error.name as (typeof INDEXED_DB_UNAVAILABLE_ERRORS)[number],
			)) ||
		(generatedFaultHooks && error instanceof Error)
	);
}

/** One immutable generated civilization shared by every view in this session. */
export function loadGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience ??= buildGeneratedWorldExperience();
	return pendingExperience;
}
