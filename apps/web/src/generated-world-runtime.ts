import {
	type CivilizationExperimentCognitionOptions,
	type CivilizationExperimentRun,
	type CivilizationScheduledActivity,
	type CivilizationState,
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	PersistenceError,
	type ReleaseGenesisCivilizationState,
	replayCivilizationHistory,
} from "@eonfolk/persistence";
import type { GeneratedWorldState } from "@eonfolk/protocol";
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
	GENERATED_CIVILIZATION_RUN_ID,
	type GeneratedCivilizationCatchUpHorizon,
	type PreparedGeneratedCivilization,
	persistPreparedGeneratedCivilization,
	prepareGeneratedCivilization,
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
/** Exact v7 namespace: earlier authority bytes remain untouched and cannot be misread. */
export const GENERATED_WORLD_STORAGE_KEY = "eonfolk-generated-authority-v7";

export interface GeneratedWorldPersistenceStatus {
	readonly kind: "indexeddb" | "quarantined" | "unavailable";
	readonly claim: "durable-authority" | "admitted-deterministic-view";
	readonly failureCode: string | null;
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
	readonly persistence: GeneratedWorldPersistenceStatus;
	readonly authorityRegionId: string;
	readonly authorityDatabaseName: string;
	readonly sponsorCitizenId: string;
	readonly sponsorPhase:
		| "idle"
		| "sponsored"
		| "abstained"
		| "counseled"
		| "resolved";
	readonly activeCounselIntent: "verify-reserve" | "accuse-publicly" | null;
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
}

let pendingExperience: Promise<GeneratedWorldExperience> | undefined;

interface PreparedGeneratedWorldBase {
	readonly generatedWorld: GeneratedWorldState;
	readonly prepared: PreparedGeneratedCivilization;
}

let pendingDefaultPreparedBase: Promise<PreparedGeneratedWorldBase> | undefined;

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
	if (settlementIds.length === 0) throw new Error("Settlement missing");
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
async function buildGeneratedWorldExperienceInternal(
	options: GeneratedWorldBuildOptions,
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
	const targetHorizonDays =
		options.targetHorizonDays ?? GENERATED_WORLD_HORIZON_DAYS;
	const databaseName = options.databaseName ?? GENERATED_WORLD_STORAGE_KEY;
	const indexedDbFactory =
		options.indexedDbFactory === undefined
			? globalThis.indexedDB
			: options.indexedDbFactory;
	let run: CivilizationExperimentRun | null = null;
	let previousRun: CivilizationExperimentRun | null = null;
	let authorityState: ReleaseGenesisCivilizationState | null = null;
	let authorityEvents: readonly {
		readonly eventId: string;
		readonly eventHash: string;
	}[] = [];
	let authorityStateHash: string | null = null;
	let persistence: GeneratedWorldPersistenceStatus | null = null;
	const prepareBase = async (): Promise<PreparedGeneratedWorldBase> => {
		const releaseGenesis = await createReleaseGenesis({
			releaseId: V1_GENESIS_RELEASE_ID,
			seedHex: V1_GENESIS_SEED,
		});
		const generatedWorld = await generateWorld({
			releaseGenesis,
			worldId: V1_GENESIS_WORLD_ID,
			treatmentId: "standard-brain",
		});
		const prepared = await prepareGeneratedCivilization({
			genesisWorld: generatedWorld,
			targetHorizonDays,
			authorityRunner,
		});
		return Object.freeze({ generatedWorld, prepared });
	};
	const usesDefaultAuthority =
		!generatedFaultHooks && Object.keys(options).length === 0;
	let preparedBase: Promise<PreparedGeneratedWorldBase>;
	if (usesDefaultAuthority) {
		pendingDefaultPreparedBase ??= prepareBase();
		preparedBase = pendingDefaultPreparedBase;
	} else preparedBase = prepareBase();
	const { generatedWorld, prepared } = await preparedBase;
	const admittedRun = prepared.checkpoints.at(-1);
	const admittedPreviousRun = prepared.checkpoints[0];
	if (admittedRun === undefined || admittedPreviousRun === undefined)
		throw new Error("Checkpoint missing");
	const selectAdmittedView = (
		kind: "quarantined" | "unavailable",
		failureCode: string,
	): void => {
		previousRun = admittedPreviousRun;
		run = admittedRun;
		authorityState = prepared.plan.finalState;
		authorityStateHash = prepared.plan.finalSnapshot.stateHash;
		persistence = Object.freeze({
			kind,
			claim: "admitted-deterministic-view",
			failureCode,
			restored: false,
			catchUpReceipts: 0,
		});
	};
	if (indexedDbFactory === null || indexedDbFactory === undefined) {
		selectAdmittedView("unavailable", "INDEXEDDB_UNAVAILABLE");
	} else {
		let port: BrowserVersionedPersistence | null = null;
		try {
			const openedPort = await BrowserVersionedPersistence.open({
				factory: indexedDbFactory,
				databaseName,
				...(generatedFaultHooks &&
				options.persistenceBoundaryInjector !== undefined
					? { boundaryInjector: options.persistenceBoundaryInjector }
					: {}),
			});
			port = openedPort;
			const scope = {
				runId: GENERATED_CIVILIZATION_RUN_ID,
				regionId: generatedWorld.identity.worldId,
			};
			const readDurableAuthority = async (input: {
				readonly head: Awaited<ReturnType<typeof openedPort.loadHead>>;
				readonly restored: boolean;
				readonly catchUpReceipts: number;
			}) => {
				const latest = await openedPort.loadLatestSnapshot(scope);
				const replay = await replayCivilizationHistory(openedPort, {
					...scope,
					snapshotId: latest.snapshotId,
					toSequenceExclusive: input.head.lastSequence + 1,
				});
				const events = await openedPort.getEventRange({
					...scope,
					fromSequenceInclusive: 1,
					toSequenceExclusive: input.head.lastSequence + 1,
				});
				return Object.freeze({
					state: replay.state,
					stateHash: replay.stateHash,
					events,
					persistence: Object.freeze({
						kind: "indexeddb" as const,
						claim: "durable-authority" as const,
						failureCode: null,
						restored: input.restored,
						catchUpReceipts: input.catchUpReceipts,
					}),
				});
			};
			const advanced = await persistPreparedGeneratedCivilization({
				port: openedPort,
				prepared,
				confirmationId: `release-genesis-day-${targetHorizonDays}-confirmation`,
			});
			const durableAuthority = await readDurableAuthority({
				head: advanced.head,
				restored:
					advanced.catchUpOperation.status === "complete" &&
					advanced.idempotentAppends === advanced.receipts.length,
				catchUpReceipts: advanced.catchUpOperation.nextChapter,
			});
			run = admittedRun;
			previousRun = admittedPreviousRun;
			authorityState = durableAuthority.state;
			authorityStateHash = durableAuthority.stateHash;
			authorityEvents = durableAuthority.events;
			persistence = durableAuthority.persistence;
		} catch (error) {
			const failure = classifyDurableFailure(error);
			if (failure === null) throw error;
			selectAdmittedView(failure.kind, failure.code);
		} finally {
			port?.close();
		}
	}
	if (run === null || previousRun === null || persistence === null)
		throw new Error("Generated authority admission did not produce a view");
	const durableCivilization =
		authorityState?.civilization === null || authorityState === null
			? null
			: (authorityState.civilization as unknown as CivilizationState);
	const authorityWorld =
		authorityState === null
			? generatedWorld
			: (authorityState.world as unknown as GeneratedWorldState);
	const sponsorCivilization = durableCivilization ?? run.state;
	const sponsorCitizenId = RELEASE_GENESIS_MARA_CITIZEN_ID;
	const sponsorCitizen = sponsorCivilization.citizens[sponsorCitizenId];
	if (
		sponsorCitizen?.residenceState !== "resident" ||
		sponsorCivilization.minds[sponsorCitizenId] === undefined
	)
		throw new Error("Citizen missing");
	const activeCounsel = Object.values(sponsorCivilization.counsels).find(
		(counsel) =>
			counsel.citizenId === sponsorCitizenId && counsel.resolution === null,
	);
	const hasResolvedCounsel = Object.values(sponsorCivilization.counsels).some(
		(counsel) =>
			counsel.citizenId === sponsorCitizenId && counsel.resolution !== null,
	);
	const hasSponsorship = Object.values(sponsorCivilization.sponsorships).some(
		(covenant) => covenant.beneficiaryCitizenId === sponsorCitizenId,
	);
	const hasAbstention = Object.values(
		sponsorCivilization.patronAbstentions,
	).some((abstention) => abstention.citizenId === sponsorCitizenId);
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
					schemaVersion: "eonfolk-civilization-experiment-v9" as const,
					runnerVersion: "eonfolk-civilization-runner-v9" as const,
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
			if (embodiment === undefined) throw new Error("Embodiment missing");
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
		persistence,
		authorityRegionId: run.world.identity.worldId,
		authorityDatabaseName: databaseName,
		sponsorCitizenId,
		sponsorPhase:
			activeCounsel !== undefined
				? "counseled"
				: hasResolvedCounsel
					? "resolved"
					: hasAbstention
						? "abstained"
						: hasSponsorship
							? "sponsored"
							: "idle",
		activeCounselIntent: activeCounsel?.intent ?? null,
	});
}

export function buildGeneratedWorldExperience(
	options: GeneratedWorldBuildOptions = {},
): Promise<GeneratedWorldExperience> {
	return buildGeneratedWorldExperienceInternal(options);
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

function classifyDurableFailure(error: unknown): Readonly<{
	readonly kind: "quarantined" | "unavailable";
	readonly code: string;
}> | null {
	if (
		error instanceof PersistenceError &&
		[
			"RANGE_GAP",
			"RUN_ID_COLLISION",
			"STALE_STATE",
			"UNSUPPORTED_VERSION",
		].includes(error.code)
	)
		return Object.freeze({ kind: "quarantined", code: error.code });
	if (error instanceof DOMException && error.name === "VersionError")
		return Object.freeze({ kind: "quarantined", code: "DATABASE_VERSION" });
	if (
		error instanceof DOMException &&
		INDEXED_DB_UNAVAILABLE_ERRORS.includes(
			error.name as (typeof INDEXED_DB_UNAVAILABLE_ERRORS)[number],
		)
	)
		return Object.freeze({ kind: "unavailable", code: error.name });
	if (generatedFaultHooks && error instanceof Error)
		return Object.freeze({ kind: "unavailable", code: "INJECTED_BOUNDARY" });
	return null;
}

/** One immutable generated civilization shared by every view in this session. */
export function loadGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience ??= buildGeneratedWorldExperience();
	return pendingExperience;
}

/** Reloads the sole durable authority projection after an accepted command. */
export function refreshGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	pendingExperience = buildGeneratedWorldExperienceInternal({});
	return pendingExperience;
}
