import {
	type CivilizationScheduledActivity,
	type CivilizationExperimentRun,
	type CivilizationState,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import { createReleaseGenesis } from "@eonfolk/protocol";
import type { GeneratedWorldState } from "@eonfolk/protocol";
import {
	replayCivilizationHistory,
	type ReleaseGenesisCivilizationState,
} from "@eonfolk/persistence";
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
	GENERATED_CIVILIZATION_RUN_ID,
} from "./persistence/generated-civilization";
import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "./v1-genesis-runtime";

export const GENERATED_WORLD_HORIZON_DAYS = 365;
export const GENERATED_WORLD_INITIAL_HORIZON_DAYS = 1;
export const GENERATED_WORLD_COMPARISON_HORIZON_DAYS = 1;
/** Exact v3 namespace: earlier authority bytes remain untouched and cannot be misread. */
export const GENERATED_WORLD_STORAGE_KEY = "eonfolk-generated-authority-v3";

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
	readonly sponsorCitizenId: string;
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
	return projectAuthorityView({
		world: run.world,
		civilization: run.state,
		checkpoint: run,
		activities: run.activities,
		residentPopulation: run.metrics.residentPopulation,
	});
}

function projectAuthorityView(input: {
	readonly world: GeneratedWorldState;
	readonly civilization: CivilizationState;
	readonly checkpoint: Parameters<
		typeof projectGeneratedCivilizationSpatial
	>[0]["checkpoint"];
	readonly activities: readonly CivilizationScheduledActivity[];
	readonly residentPopulation: number;
}): readonly GeneratedCivilizationSpatialProjection[] {
	const settlementIds = Object.values(input.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort();
	if (settlementIds.length === 0)
		throw new Error("The civilization checkpoint contains no settlement");
	const projections = settlementIds
		.map((settlementId) =>
			projectGeneratedCivilizationSpatial({
				world: input.world,
				civilization: input.civilization,
				checkpoint: input.checkpoint,
				activities: input.activities,
				settlementId,
				presentationTick: input.checkpoint.metrics.simulationTime * 30,
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
	if (projectedPopulation !== input.residentPopulation)
		throw new Error(
			`The spatial projection accounts for ${projectedPopulation} of ${input.residentPopulation} residents`,
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
	let authorityState: ReleaseGenesisCivilizationState | null = null;
	let authorityEvents: readonly {
		readonly eventId: string;
		readonly eventHash: string;
	}[] = [];
	let authorityStateHash: string | null = null;
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
			const latest = await port.loadLatestSnapshot({
				runId: GENERATED_CIVILIZATION_RUN_ID,
				regionId: generatedWorld.identity.worldId,
			});
			const replay = await replayCivilizationHistory(port, {
				runId: GENERATED_CIVILIZATION_RUN_ID,
				regionId: generatedWorld.identity.worldId,
				snapshotId: latest.snapshotId,
				toSequenceExclusive: advanced.head.lastSequence + 1,
			});
			authorityState = replay.state;
			authorityStateHash = replay.stateHash;
			authorityEvents = await port.getEventRange({
				runId: GENERATED_CIVILIZATION_RUN_ID,
				regionId: generatedWorld.identity.worldId,
				fromSequenceInclusive: 1,
				toSequenceExclusive: advanced.head.lastSequence + 1,
			});
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
	const durableCivilization =
		authorityState?.civilization === null || authorityState === null
			? null
			: (authorityState.civilization as unknown as CivilizationState);
	const authorityWorld =
		authorityState === null
			? generatedWorld
			: (authorityState.world as unknown as GeneratedWorldState);
	const sponsorCivilization = durableCivilization ?? run.state;
	const sponsorCitizenId = Object.values(sponsorCivilization.minds)
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
		.find((mind) => {
			const citizen = sponsorCivilization.citizens[mind.citizenId];
			return mind.snapshot.relationships.some(
				(relationship) =>
					sponsorCivilization.citizens[relationship.toCitizenId]
						?.residenceState === "resident" &&
					sponsorCivilization.citizens[relationship.toCitizenId]
						?.settlementId === citizen?.settlementId &&
					sponsorCivilization.citizens[relationship.toCitizenId]?.siteId ===
						citizen?.siteId,
			);
		})?.citizenId;
	if (sponsorCitizenId === undefined)
		throw new Error("The generated world has no counsel-capable citizen");
	const durableActivities =
		authorityState === null
			? null
			: (authorityState.scheduler
					.activities as unknown as readonly CivilizationScheduledActivity[]);
	const durableHorizon = authorityState?.scheduler.completedDay ?? null;
	const durableCheckpoint =
		durableCivilization === null ||
		durableActivities === null ||
		durableHorizon === null ||
		authorityStateHash === null
			? null
			: {
					schemaVersion: "eonfolk-civilization-experiment-v7" as const,
					runnerVersion: "eonfolk-civilization-runner-v7" as const,
					worldIdentityHash: generatedWorld.identity.identityHash,
					horizonDays: durableHorizon,
					finalStateHash: authorityStateHash,
					events: authorityEvents.map((event, eventIndex) => ({
						eventIndex,
						eventId: event.eventId,
						eventHash: event.eventHash,
					})),
					metrics: {
						simulationTime: authorityState!.scheduler.simulationTime,
						modelInvocations: 0,
					},
				};
	const projections =
		durableCheckpoint === null
			? projectCheckpoint(run)
			: projectAuthorityView({
					world: authorityWorld,
					civilization: durableCivilization!,
					checkpoint: durableCheckpoint,
					activities: durableActivities!,
					residentPopulation: Object.values(
						durableCivilization!.citizens,
					).filter(({ residenceState }) => residenceState === "resident")
						.length,
				});
	const previousProjections = projectCheckpoint(previousRun);
	const worldEmbodiment = projectGeneratedWorldEmbodiment({
		current: projections,
		previous: previousProjections,
		activities: durableActivities ?? run.activities,
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
		stateHash: authorityStateHash ?? run.finalStateHash,
		simulationTime:
			authorityState?.scheduler.simulationTime ?? run.metrics.simulationTime,
		horizonDays: authorityState?.scheduler.completedDay ?? run.horizonDays,
		population:
			durableCivilization === null
				? run.metrics.population
				: Object.keys(durableCivilization.citizens).length,
		settlementCount: projections.length,
		projections,
		embodiments,
		previousStateHash: previousRun.finalStateHash,
		previousHorizonDays: previousRun.horizonDays,
		embodimentLimitations: worldEmbodiment.limitations,
		persistence,
		authorityRegionId: run.world.identity.worldId,
		authorityDatabaseName: databaseName,
		sponsorCitizenId,
	});
}

/** One immutable generated civilization shared by every view in this session. */
export function loadGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience ??= buildGeneratedWorldExperience();
	return pendingExperience;
}

/** Reloads the sole durable authority projection after an accepted command. */
export function refreshGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience = buildGeneratedWorldExperience();
	return pendingExperience;
}
