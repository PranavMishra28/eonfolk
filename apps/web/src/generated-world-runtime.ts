import { createReleaseGenesis } from "@eonfolk/protocol";
import {
	projectGeneratedCivilizationSpatial,
	type GeneratedCivilizationSpatialProjection,
} from "@eonfolk/world-presentation";
import { generateWorld } from "@eonfolk/worldgen";
import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "./v1-genesis-runtime";
import {
	catchUpV1Checkpoint,
	createV1IndexedDbStorage,
	initializeV1Checkpoint,
	loadV1Checkpoint,
} from "./v1-indexeddb";

export const GENERATED_WORLD_HORIZON_DAYS = 365;
export const GENERATED_WORLD_INITIAL_HORIZON_DAYS = 1;
export const GENERATED_WORLD_STORAGE_KEY =
	"release-genesis:eonfolk-genesis-world-v1";

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
	readonly persistence: GeneratedWorldPersistenceStatus;
}

export interface GeneratedWorldBuildOptions {
	readonly indexedDbFactory?: IDBFactory | null;
	readonly storageKey?: string;
	readonly initialHorizonDays?: number;
	readonly targetHorizonDays?: number;
}

let pendingExperience: Promise<GeneratedWorldExperience> | undefined;

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
	const initialHorizonDays =
		options.initialHorizonDays ?? GENERATED_WORLD_INITIAL_HORIZON_DAYS;
	const storageKey = options.storageKey ?? GENERATED_WORLD_STORAGE_KEY;
	const indexedDbFactory =
		options.indexedDbFactory === undefined
			? globalThis.indexedDB
			: options.indexedDbFactory;
	const availability = createV1IndexedDbStorage(indexedDbFactory);
	let run: CivilizationExperimentRun;
	let persistence: GeneratedWorldPersistenceStatus;
	if (!availability.available) {
		run = await runCivilizationExperiment({
			world: generatedWorld,
			horizonDays: targetHorizonDays,
		});
		persistence = Object.freeze({
			kind: "unavailable",
			restored: false,
			catchUpReceipts: 0,
		});
	} else {
		let stored = await loadV1Checkpoint(availability.port, storageKey);
		const restored = stored !== null;
		if (stored === null) {
			const initial = await runCivilizationExperiment({
				world: generatedWorld,
				horizonDays: initialHorizonDays,
			});
			stored = (
				await initializeV1Checkpoint({
					storage: availability.port,
					storageKey,
					genesisWorld: generatedWorld,
					checkpoint: initial,
				})
			).checkpoint;
		}
		if (
			stored.worldId !== generatedWorld.identity.worldId ||
			stored.worldIdentityHash !== generatedWorld.identity.identityHash
		)
			throw new Error(
				"Stored civilization identity does not match Release Genesis",
			);
		if (stored.horizonDays > targetHorizonDays)
			throw new Error("Stored civilization is ahead of the requested horizon");
		if (stored.horizonDays < targetHorizonDays) {
			stored = (
				await catchUpV1Checkpoint({
					storage: availability.port,
					storageKey,
					requestId: `catchup:${stored.horizonDays}:${targetHorizonDays}`,
					targetHorizonDays,
				})
			).checkpoint;
		}
		run = stored.checkpoint;
		persistence = Object.freeze({
			kind: "indexeddb",
			restored,
			catchUpReceipts: stored.catchUpReceipts.length,
		});
	}
	const settlementIds = Object.values(run.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort();
	if (settlementIds.length === 0)
		throw new Error("The civilization checkpoint contains no settlement");
	const projections = Object.freeze(
		settlementIds
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
			}),
	);
	const projectedPopulation = projections.reduce(
		(total, projection) => total + projection.spatial.actors.length,
		0,
	);
	if (projectedPopulation !== run.metrics.residentPopulation)
		throw new Error(
			`The spatial projection accounts for ${projectedPopulation} of ${run.metrics.residentPopulation} residents`,
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
		persistence,
	});
}

/** One immutable generated civilization shared by every view in this session. */
export function loadGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience ??= buildGeneratedWorldExperience();
	return pendingExperience;
}
