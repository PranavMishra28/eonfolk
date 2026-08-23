import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
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
import { BrowserVersionedPersistence } from "./persistence/browser-versioned";
import {
	advanceGeneratedCivilization,
	type GeneratedCivilizationCatchUpHorizon,
} from "./persistence/generated-civilization";
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
	readonly kind: "indexeddb" | "unavailable";
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
	readonly authorityRegionId: string;
	readonly authorityDatabaseName: string;
}

export interface GeneratedWorldBuildOptions {
	readonly indexedDbFactory?: IDBFactory | null;
	readonly databaseName?: string;
	readonly targetHorizonDays?: GeneratedCivilizationCatchUpHorizon;
}

let pendingExperience: Promise<GeneratedWorldExperience> | undefined;

function projectCheckpoint(
	run: CivilizationExperimentRun,
): readonly GeneratedCivilizationSpatialProjection[] {
	const settlementIds = Object.values(run.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort();
	if (settlementIds.length === 0)
		throw new Error("The civilization checkpoint contains no settlement");
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
			`The spatial projection accounts for ${projectedPopulation} of ${run.metrics.residentPopulation} residents`,
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
	let run: CivilizationExperimentRun;
	let previousRun: CivilizationExperimentRun;
	let persistence: GeneratedWorldPersistenceStatus;
	if (indexedDbFactory === null || indexedDbFactory === undefined) {
		[previousRun, run] = await Promise.all([
			runCivilizationExperiment({
				world: generatedWorld,
				horizonDays: GENERATED_WORLD_COMPARISON_HORIZON_DAYS,
			}),
			runCivilizationExperiment({
				world: generatedWorld,
				horizonDays: targetHorizonDays,
			}),
		]);
		persistence = Object.freeze({
			kind: "unavailable",
			restored: false,
			catchUpReceipts: 0,
		});
	} else {
		const port = await BrowserVersionedPersistence.open({
			factory: indexedDbFactory,
			databaseName,
		});
		try {
			const advanced = await advanceGeneratedCivilization({
				port,
				genesisWorld: generatedWorld,
				targetHorizonDays,
			});
			const finalCheckpoint = advanced.checkpoints.at(-1);
			if (finalCheckpoint === undefined)
				throw new Error("Generated catch-up produced no checkpoint");
			run = finalCheckpoint;
			previousRun = advanced.checkpoints[0] ?? finalCheckpoint;
			persistence = Object.freeze({
				kind: "indexeddb",
				restored:
					advanced.receipts.length > 0 &&
					advanced.idempotentAppends === advanced.receipts.length,
				catchUpReceipts: advanced.receipts.length,
			});
		} finally {
			port.close();
		}
	}
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
			if (embodiment === undefined)
				throw new Error("Generated settlement lacks an embodiment projection");
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
		authorityRegionId: run.world.identity.worldId,
		authorityDatabaseName: databaseName,
	});
}

/** One immutable generated civilization shared by every view in this session. */
export function loadGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience ??= buildGeneratedWorldExperience();
	return pendingExperience;
}
