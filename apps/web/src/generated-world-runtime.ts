import {
	type CivilizationExperimentCognitionOptions,
	type CivilizationExperimentRun,
	type CivilizationScheduledActivity,
	type CivilizationState,
	decodeLocalWorldAuthoritySnapshot,
	LOCAL_WORLD_AUTHORITY_DEFAULT_ORIGIN,
	type LocalWorldAuthorityFenceChoice,
	type LocalWorldAuthorityFenceSnapshot,
	type LocalWorldAuthoritySnapshot,
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
	resolveLocalWorldAuthorityFence,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import { standardFallbackModelGateway } from "@eonfolk/cognition";
import {
	PersistenceError,
	type ReleaseGenesisCivilizationState,
	replayCivilizationHistory,
} from "@eonfolk/persistence";
import type { GeneratedWorldState } from "@eonfolk/protocol";
import { createReleaseGenesis } from "@eonfolk/protocol";
import {
	type GeneratedCivilizationSpatialProjection,
	projectDisplayName,
	projectGeneratedCivilizationSpatial,
	relationshipKindDisplayName,
} from "@eonfolk/world-presentation";
import { generateWorld } from "@eonfolk/worldgen";
import {
	type GeneratedEmbodimentProjection,
	projectGeneratedWorldEmbodiment,
} from "./generated-presentation";
import type { BrowserPersistenceBoundaryInjector } from "./persistence/browser-versioned";
import { BrowserVersionedPersistence } from "./persistence/browser-versioned";
import {
	appendLiveGeneratedCivilizationDay,
	catchUpLiveGeneratedCivilizationDays,
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
/** Exact v8 namespace: first session starts at day 1; earlier 365-day v7 bytes stay unread. */
export const GENERATED_WORLD_STORAGE_KEY = "eonfolk-generated-authority-v8";
export const COGNITION_TREATMENT_STORAGE_KEY = "eonfolk-cognition-treatment";
export const AUTHORITY_FENCE_CHOICE_STORAGE_KEY =
	"eonfolk-authority-fence-choice-v1";

export type { LocalWorldAuthorityFenceChoice };

export type LocalCognitionTreatment = "standard-brain" | "model";

export function readLocalCognitionTreatment(): LocalCognitionTreatment {
	if (typeof localStorage === "undefined") return "standard-brain";
	return localStorage.getItem(COGNITION_TREATMENT_STORAGE_KEY) === "model"
		? "model"
		: "standard-brain";
}

export function writeLocalCognitionTreatment(
	treatment: LocalCognitionTreatment,
): void {
	localStorage.setItem(COGNITION_TREATMENT_STORAGE_KEY, treatment);
}

function liveDayCognition():
	| CivilizationExperimentCognitionOptions
	| undefined {
	if (readLocalCognitionTreatment() !== "model") return undefined;
	return { decisionGateway: standardFallbackModelGateway() };
}

function shouldProbeLocalAuthority(): boolean {
	if (generatedFaultHooks) return false;
	if (typeof fetch !== "function") return false;
	if (typeof process !== "undefined" && process.env.VITEST !== undefined)
		return false;
	if (typeof navigator !== "undefined" && navigator.webdriver) return false;
	return true;
}

export async function probeLocalWorldAuthority(
	origin: string = LOCAL_WORLD_AUTHORITY_DEFAULT_ORIGIN,
): Promise<LocalWorldAuthoritySnapshot | null> {
	try {
		const response = await fetch(`${origin.replace(/\/$/u, "")}/authority`, {
			signal: AbortSignal.timeout(250),
		});
		if (!response.ok) return null;
		return decodeLocalWorldAuthoritySnapshot(await response.text());
	} catch {
		return null;
	}
}

let sessionFenceChoice: LocalWorldAuthorityFenceChoice | null = null;

export function rememberLocalWorldAuthorityFenceChoice(
	choice: LocalWorldAuthorityFenceChoice | null,
): void {
	sessionFenceChoice = choice;
}

function fenceChoiceFromOptions(
	options: GeneratedWorldBuildOptions,
): LocalWorldAuthorityFenceChoice | null {
	if (options.authorityFenceChoice !== undefined)
		return options.authorityFenceChoice;
	return sessionFenceChoice;
}

async function resolveAttachedAuthority(
	options: GeneratedWorldBuildOptions,
): Promise<LocalWorldAuthoritySnapshot | null> {
	if (options.localAuthority === false) return null;
	if (options.localAuthority !== undefined) return options.localAuthority;
	if (!shouldProbeLocalAuthority()) return null;
	return probeLocalWorldAuthority(
		options.localAuthorityOrigin ?? LOCAL_WORLD_AUTHORITY_DEFAULT_ORIGIN,
	);
}

async function peekLocalDurableSnapshot(
	options: GeneratedWorldBuildOptions,
): Promise<LocalWorldAuthorityFenceSnapshot | null> {
	if (options.localDurableSnapshot !== undefined)
		return options.localDurableSnapshot;
	const indexedDbFactory =
		options.indexedDbFactory === undefined
			? globalThis.indexedDB
			: options.indexedDbFactory;
	if (indexedDbFactory === null || indexedDbFactory === undefined) return null;
	let port: BrowserVersionedPersistence | null = null;
	try {
		port = await BrowserVersionedPersistence.open({
			factory: indexedDbFactory,
			databaseName: options.databaseName ?? GENERATED_WORLD_STORAGE_KEY,
		});
		const scope = {
			runId: GENERATED_CIVILIZATION_RUN_ID,
			regionId: V1_GENESIS_WORLD_ID,
		};
		const head = await port.loadHead(scope);
		const latest = await port.loadLatestSnapshot(scope);
		const recorded = latest.state;
		if (recorded === null || typeof recorded !== "object") return null;
		const world = (recorded as { readonly world?: unknown }).world as
			| { readonly identity?: { readonly identityHash?: string } }
			| undefined;
		const worldIdentityHash = world?.identity?.identityHash;
		if (typeof worldIdentityHash !== "string" || worldIdentityHash.length === 0)
			return null;
		return Object.freeze({
			worldIdentityHash,
			stateHash: head.stateHash,
		});
	} catch (error) {
		if (error instanceof PersistenceError && error.code === "NOT_FOUND")
			return null;
		return null;
	} finally {
		port?.close();
	}
}

async function resolveAuthorityFence(options: GeneratedWorldBuildOptions) {
	const processSnapshot = await resolveAttachedAuthority(options);
	const localSnapshot = await peekLocalDurableSnapshot(options);
	const fence = resolveLocalWorldAuthorityFence({
		processSnapshot:
			processSnapshot === null
				? null
				: {
						worldIdentityHash: processSnapshot.worldIdentityHash,
						stateHash: processSnapshot.stateHash,
					},
		localSnapshot,
		playerChoice: fenceChoiceFromOptions(options),
	});
	return Object.freeze({ processSnapshot, fence });
}

function experienceFromLocalProcess(
	snapshot: LocalWorldAuthoritySnapshot,
	options: GeneratedWorldBuildOptions,
): GeneratedWorldExperience {
	const checkpoint = {
		schemaVersion: "eonfolk-civilization-experiment-v9" as const,
		runnerVersion: "eonfolk-civilization-runner-v9" as const,
		worldIdentityHash: snapshot.worldIdentityHash,
		horizonDays: snapshot.completedDay,
		finalStateHash: snapshot.stateHash,
		events: [],
		metrics: {
			simulationTime: snapshot.state.simulationTime,
			modelInvocations: 0,
		},
	};
	const projections = projectAuthorityView({
		world: snapshot.world,
		civilization: snapshot.state,
		checkpoint,
		activities: snapshot.activities,
		residentPopulation: Object.values(snapshot.state.citizens).filter(
			({ residenceState }) => residenceState === "resident",
		).length,
	});
	const worldEmbodiment = projectGeneratedWorldEmbodiment({
		current: projections,
		previous: projections,
		activities: snapshot.activities,
	});
	const embodimentBySettlement = new Map(
		worldEmbodiment.settlements.map((embodiment) => [
			embodiment.settlementId,
			embodiment,
		]),
	);
	return Object.freeze({
		worldId: snapshot.world.identity.worldId,
		worldIdentityHash: snapshot.worldIdentityHash,
		stateHash: snapshot.stateHash,
		simulationTime: snapshot.state.simulationTime,
		horizonDays: snapshot.completedDay,
		population: Object.keys(snapshot.state.citizens).length,
		settlementCount: projections.length,
		projections,
		embodiments: Object.freeze(
			projections.map((projection) => {
				const embodiment = embodimentBySettlement.get(
					projection.local.settlement.settlementId,
				);
				if (embodiment === undefined) throw new Error("Embodiment missing");
				return embodiment;
			}),
		),
		previousStateHash: snapshot.stateHash,
		previousHorizonDays: Math.max(1, snapshot.completedDay - 1),
		persistence: Object.freeze({
			kind: "local-process" as const,
			claim: "local-process-client" as const,
			failureCode: null,
			restored: true,
			catchUpReceipts: 0,
		}),
		authorityRegionId: snapshot.world.identity.worldId,
		authorityDatabaseName: options.databaseName ?? GENERATED_WORLD_STORAGE_KEY,
		sponsorCitizenId: RELEASE_GENESIS_MARA_CITIZEN_ID,
		sponsorPhase: "idle",
		activeCounselIntent: null,
		happenings: happeningsFromCivilization(snapshot.state),
		innerLives: innerLivesFromCivilization(snapshot.state),
	});
}

export interface GeneratedWorldPersistenceStatus {
	readonly kind:
		| "indexeddb"
		| "quarantined"
		| "unavailable"
		| "local-process"
		| "authority-conflict";
	readonly claim:
		| "durable-authority"
		| "admitted-deterministic-view"
		| "local-process-client"
		| "unmerged-authorities";
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
	readonly happenings: readonly GeneratedWorldHappening[];
	readonly innerLives: readonly GeneratedCitizenInnerLife[];
}

export type GeneratedChronicleRelation =
	| "fact"
	| "direct"
	| "trigger"
	| "contributing-condition"
	| "temporal-predecessor"
	| "allegation";

export interface GeneratedWorldHappening {
	readonly happeningId: string;
	readonly title: string;
	readonly summary: string;
	readonly relation: GeneratedChronicleRelation;
	readonly citizenId: string | null;
	readonly citizenName: string | null;
}

export interface GeneratedCitizenInnerLife {
	readonly citizenId: string;
	readonly want: string;
	readonly daysWork: string;
	readonly standingPlan: string;
	readonly standingTies: readonly string[];
	readonly waterStores: string | null;
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
	readonly checkpointRecovery?: "already-attempted";
	readonly localAuthority?: LocalWorldAuthoritySnapshot | false;
	readonly localAuthorityOrigin?: string;
	readonly localDurableSnapshot?: LocalWorldAuthorityFenceSnapshot | null;
	readonly authorityFenceChoice?: LocalWorldAuthorityFenceChoice | null;
}

const SILENT_CHECKPOINT_RECOVERY_CODES = new Set([
	"UNSUPPORTED_VERSION",
	"DATABASE_VERSION",
	"STALE_STATE",
]);

function deleteGeneratedAuthorityDatabase(name: string): Promise<void> {
	if (typeof indexedDB === "undefined")
		return Promise.reject(new Error("INDEXEDDB_UNAVAILABLE"));
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () =>
			reject(request.error ?? new Error("INDEXEDDB_DELETE_FAILED"));
		request.onblocked = () => resolve();
	});
}

let pendingExperience: Promise<GeneratedWorldExperience> | undefined;

interface PreparedGeneratedWorldBase {
	readonly generatedWorld: GeneratedWorldState;
	readonly prepared: PreparedGeneratedCivilization;
}

let pendingDefaultPreparedBase: Promise<PreparedGeneratedWorldBase> | undefined;

function happeningsFromCivilization(
	civilization: CivilizationState,
): readonly GeneratedWorldHappening[] {
	const happenings: GeneratedWorldHappening[] = [];
	const mara = civilization.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID];
	const counselOutcome = Object.values(civilization.counselOutcomes)
		.filter((outcome) => outcome.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID)
		.sort((left, right) => left.recordedAtRevision - right.recordedAtRevision)
		.at(-1);
	if (mara !== undefined && counselOutcome !== undefined) {
		if (counselOutcome.effect.kind === "reserve-inspection")
			happenings.push(
				Object.freeze({
					happeningId: counselOutcome.outcomeId,
					title: `${mara.name} checked the stores`,
					summary: `${mara.name} inspected the settlement reserve. That is a recorded observation, not a rumor.`,
					relation: "direct",
					citizenId: mara.citizenId,
					citizenName: mara.name,
				}),
			);
		else if (counselOutcome.effect.kind === "public-allegation") {
			const target =
				civilization.citizens[counselOutcome.effect.targetCitizenId];
			happenings.push(
				Object.freeze({
					happeningId: counselOutcome.outcomeId,
					title: `${mara.name} spoke publicly`,
					summary:
						target === undefined
							? `${mara.name} made a public allegation. That is recorded speech, not a proven fact.`
							: `${mara.name} made a public allegation about ${target.name}. That is recorded speech, not a proven fact.`,
					relation: "allegation",
					citizenId: mara.citizenId,
					citizenName: mara.name,
				}),
			);
		} else
			happenings.push(
				Object.freeze({
					happeningId: counselOutcome.outcomeId,
					title: `${mara.name} kept to her plan`,
					summary: `${mara.name} continued her standing plan after the advice. That is a recorded choice.`,
					relation: "contributing-condition",
					citizenId: mara.citizenId,
					citizenName: mara.name,
				}),
			);
	}
	const traveller =
		civilization.citizens[RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID];
	const migration = civilization.migrations["migration-founding-party"];
	if (traveller !== undefined && migration !== undefined) {
		if (migration.state === "planned")
			happenings.push(
				Object.freeze({
					happeningId: "orin-prepares-to-leave",
					title: `${traveller.name} is preparing to leave Dawnmere`,
					summary: `${traveller.name} is gathering for a second founding. The expedition can still be watched from this settlement.`,
					relation: "temporal-predecessor",
					citizenId: traveller.citizenId,
					citizenName: traveller.name,
				}),
			);
		else if (migration.state === "travelling")
			happenings.push(
				Object.freeze({
					happeningId: "orin-left-dawnmere",
					title: `${traveller.name} left Dawnmere`,
					summary: `${traveller.name} set out to found another settlement.`,
					relation: "direct",
					citizenId: traveller.citizenId,
					citizenName: traveller.name,
				}),
			);
		else if (migration.state === "arrived")
			happenings.push(
				Object.freeze({
					happeningId: "orin-founded-settlement",
					title: `${traveller.name} reached new ground`,
					summary: `${traveller.name} arrived with the founding party.`,
					relation: "trigger",
					citizenId: traveller.citizenId,
					citizenName: traveller.name,
				}),
			);
	} else if (
		traveller !== undefined &&
		traveller.residenceState !== "resident"
	) {
		happenings.push(
			Object.freeze({
				happeningId: "orin-left-dawnmere",
				title: `${traveller.name} left Dawnmere`,
				summary: `${traveller.name} is no longer resident in the origin settlement.`,
				relation: "fact",
				citizenId: traveller.citizenId,
				citizenName: traveller.name,
			}),
		);
	}
	for (const project of Object.values(civilization.projects).sort(
		(left, right) => left.projectId.localeCompare(right.projectId),
	)) {
		if (
			project.sponsor.kind !== "citizen" ||
			project.projectId === "project-expedition-kit"
		)
			continue;
		const sponsor = civilization.citizens[project.sponsor.citizenId];
		if (sponsor === undefined) continue;
		happenings.push(
			Object.freeze({
				happeningId: `project-originated:${project.projectId}`,
				title: `${sponsor.name} started ${projectDisplayName(project.name)}`,
				summary: `${sponsor.name} proposed ${projectDisplayName(project.name)} from their standing plan and a recorded water need. That is a recorded project, not a rumor.`,
				relation: "direct",
				citizenId: sponsor.citizenId,
				citizenName: sponsor.name,
			}),
		);
	}
	return Object.freeze(happenings);
}

function settlementWaterCopy(civilization: CivilizationState): string {
	const mara = civilization.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID];
	const settlementId = mara?.settlementId;
	const waterUnits = Object.values(civilization.stocks)
		.filter(
			(stock) =>
				stock.owner.kind === "settlement" &&
				stock.owner.settlementId === settlementId &&
				(stock.resourceTypeId === "water" ||
					stock.resourceTypeId === "spring-water"),
		)
		.reduce((total, stock) => total + stock.quantity, 0);
	const residents = Object.values(civilization.citizens).filter(
		(candidate) =>
			candidate.residenceState === "resident" &&
			candidate.settlementId === settlementId,
	);
	const dailyNeed = residents.reduce(
		(total, candidate) => total + candidate.waterRequiredUnitsPerDay,
		0,
	);
	const days = dailyNeed > 0 ? Math.floor(waterUnits / dailyNeed) : 0;
	if (days >= 7)
		return "Dawnmere's water stores are not in crisis. No theft is recorded.";
	return `Dawnmere has about ${String(days)} day${days === 1 ? "" : "s"} of water at the current daily need. No theft is recorded.`;
}

function standingPlanWant(goalType: string): string {
	if (goalType === "routine:transport")
		return "Keep water and stores moving to where people need them.";
	if (goalType === "routine:produce")
		return "See today's work through at the workshop or field.";
	if (goalType === "routine:construct")
		return "Advance the settlement project she committed to.";
	if (goalType === "routine:consume")
		return "See that people are fed and watered.";
	if (goalType === "routine:travel")
		return "Reach the next place on the journey.";
	if (goalType.startsWith("routine:"))
		return `Continue ${goalType.slice("routine:".length).replaceAll("-", " ")} work.`;
	return goalType.replaceAll("-", " ");
}

function standingPlanWork(goalType: string): string {
	if (goalType === "routine:transport") return "Moving stores along her route.";
	if (goalType === "routine:produce") return "Producing at her assigned site.";
	if (goalType === "routine:construct")
		return "Working the current settlement project.";
	if (goalType === "routine:consume") return "Meeting a daily need.";
	if (goalType === "routine:travel")
		return "Travelling with the founding party.";
	if (goalType.startsWith("routine:"))
		return `Day's work: ${goalType.slice("routine:".length).replaceAll("-", " ")}.`;
	return `Day's work: ${goalType.replaceAll("-", " ")}.`;
}

function innerLivesFromCivilization(
	civilization: CivilizationState,
): readonly GeneratedCitizenInnerLife[] {
	const waterStores = settlementWaterCopy(civilization);
	return Object.freeze(
		Object.values(civilization.citizens)
			.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
			.map((citizen) => {
				const mind = civilization.minds[citizen.citizenId];
				const plan = mind?.snapshot.standingPlan;
				const goalType = plan?.goalType ?? "routine:wait";
				const currentStep = plan?.steps.find(
					(step) => step.stepId === plan.currentStepId,
				);
				const standingPlan =
					plan === undefined
						? "No standing plan is recorded."
						: `${goalType.replaceAll(":", " · ")} · ${currentStep?.kind ?? "waiting"}`;
				const ties = Object.values(civilization.relationships)
					.filter((relation) => relation.fromCitizenId === citizen.citizenId)
					.map((relation) => {
						const other = civilization.citizens[relation.toCitizenId];
						if (other === undefined) return null;
						return `${other.name} (${relationshipKindDisplayName(relation.kind)})`;
					})
					.filter((tie): tie is string => tie !== null);
				const originated = Object.values(civilization.projects).find(
					(project) =>
						project.sponsor.kind === "citizen" &&
						project.sponsor.citizenId === citizen.citizenId,
				);
				const daysWork = standingPlanWork(goalType);
				return Object.freeze({
					citizenId: citizen.citizenId,
					want:
						citizen.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID
							? "Keep Dawnmere's water stores from failing, without straining her friendship."
							: originated === undefined
								? standingPlanWant(goalType)
								: `Keep water moving, including ${projectDisplayName(originated.name)} they originated.`,
					daysWork:
						originated === undefined
							? daysWork
							: `${daysWork} They originated ${projectDisplayName(originated.name)}.`,
					standingPlan,
					standingTies: Object.freeze(ties),
					waterStores:
						citizen.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID
							? waterStores
							: null,
				});
			}),
	);
}

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

async function attachedLocalProcessExperience(
	options: GeneratedWorldBuildOptions,
	resolved: Awaited<ReturnType<typeof resolveAuthorityFence>>,
	usesDefaultAuthority = false,
): Promise<GeneratedWorldExperience | null> {
	if (
		resolved.fence.writer !== "local-process" ||
		resolved.processSnapshot === null
	)
		return null;
	if (usesDefaultAuthority) sessionFenceChoice = "adopt-process";
	return experienceFromLocalProcess(resolved.processSnapshot, options);
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
	const usesDefaultAuthority =
		!generatedFaultHooks &&
		Object.keys(options).filter((key) => key !== "checkpointRecovery")
			.length === 0;
	const resolvedFence = await resolveAuthorityFence(options);
	const attached = await attachedLocalProcessExperience(
		options,
		resolvedFence,
		usesDefaultAuthority,
	);
	if (attached !== null) return attached;
	const skipDurableWrite = resolvedFence.fence.browserMustNotWrite;
	const conflictView = resolvedFence.fence.conflict;
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
		options.targetHorizonDays ?? GENERATED_WORLD_INITIAL_HORIZON_DAYS;
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
		kind: "quarantined" | "unavailable" | "authority-conflict",
		failureCode: string,
	): void => {
		previousRun = admittedPreviousRun;
		run = admittedRun;
		authorityState = prepared.plan.finalState;
		authorityStateHash = prepared.plan.finalSnapshot.stateHash;
		persistence = Object.freeze({
			kind,
			claim:
				kind === "authority-conflict"
					? ("unmerged-authorities" as const)
					: ("admitted-deterministic-view" as const),
			failureCode,
			restored: false,
			catchUpReceipts: 0,
		});
	};
	if (
		conflictView &&
		(indexedDbFactory === null || indexedDbFactory === undefined)
	) {
		selectAdmittedView("authority-conflict", "AUTHORITY_FORK");
	} else if (indexedDbFactory === null || indexedDbFactory === undefined) {
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
						kind: conflictView
							? ("authority-conflict" as const)
							: ("indexeddb" as const),
						claim: conflictView
							? ("unmerged-authorities" as const)
							: ("durable-authority" as const),
						failureCode: conflictView ? "AUTHORITY_FORK" : null,
						restored: input.restored,
						catchUpReceipts: input.catchUpReceipts,
					}),
				});
			};
			if (skipDurableWrite) {
				const head = await openedPort.loadHead(scope);
				const durableAuthority = await readDurableAuthority({
					head,
					restored: true,
					catchUpReceipts: 0,
				});
				run = admittedRun;
				previousRun = admittedPreviousRun;
				authorityState = durableAuthority.state;
				authorityStateHash = durableAuthority.stateHash;
				authorityEvents = durableAuthority.events;
				persistence = durableAuthority.persistence;
			} else {
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
			}
		} catch (error) {
			const failure = classifyDurableFailure(error);
			if (failure === null) throw error;
			const silentRebuild =
				!skipDurableWrite &&
				failure.kind === "quarantined" &&
				SILENT_CHECKPOINT_RECOVERY_CODES.has(failure.code) &&
				options.checkpointRecovery !== "already-attempted" &&
				!generatedFaultHooks &&
				options.checkpointTransform === undefined &&
				options.persistenceBoundaryInjector === undefined;
			if (silentRebuild) {
				port?.close();
				port = null;
				try {
					await deleteGeneratedAuthorityDatabase(databaseName);
					return await buildGeneratedWorldExperienceInternal({
						...options,
						checkpointRecovery: "already-attempted",
					});
				} catch {
					selectAdmittedView(failure.kind, failure.code);
				}
			} else if (conflictView)
				selectAdmittedView("authority-conflict", "AUTHORITY_FORK");
			else selectAdmittedView(failure.kind, failure.code);
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
		happenings: happeningsFromCivilization(sponsorCivilization),
		innerLives: innerLivesFromCivilization(sponsorCivilization),
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

export async function applyLocalWorldAuthorityFenceChoice(
	choice: LocalWorldAuthorityFenceChoice,
	options: GeneratedWorldBuildOptions = {},
): Promise<GeneratedWorldExperience> {
	const remembered = choice === "fresh-local" ? "stay-local" : choice;
	sessionFenceChoice = remembered;
	if (choice === "fresh-local" || choice === "adopt-process") {
		try {
			await deleteGeneratedAuthorityDatabase(
				options.databaseName ?? GENERATED_WORLD_STORAGE_KEY,
			);
		} catch {
			/* Choice still applies; IndexedDB may already be absent. */
		}
	}
	pendingExperience = buildGeneratedWorldExperienceInternal({
		...options,
		authorityFenceChoice: remembered,
	});
	return pendingExperience;
}

/**
 * Player-authorized scheduler step. Wall clock must not call this.
 */
export async function advanceGeneratedWorldLiveDay(): Promise<GeneratedWorldExperience> {
	const resolved = await resolveAuthorityFence({});
	const attached = await attachedLocalProcessExperience({}, resolved, true);
	if (attached !== null) return attached;
	if (resolved.fence.browserMustNotWrite)
		return await refreshGeneratedWorldExperience();
	const indexedDbFactory = globalThis.indexedDB;
	if (indexedDbFactory === undefined)
		return await refreshGeneratedWorldExperience();
	const releaseGenesis = await createReleaseGenesis({
		releaseId: V1_GENESIS_RELEASE_ID,
		seedHex: V1_GENESIS_SEED,
	});
	const generatedWorld = await generateWorld({
		releaseGenesis,
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
	const port = await BrowserVersionedPersistence.open({
		factory: indexedDbFactory,
		databaseName: GENERATED_WORLD_STORAGE_KEY,
	});
	try {
		const cognition = liveDayCognition();
		await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: generatedWorld,
			...(cognition === undefined ? {} : { cognition }),
		});
	} finally {
		port.close();
	}
	return await refreshGeneratedWorldExperience();
}

export async function catchUpGeneratedWorldReturnDays(input: {
	readonly operationId: string;
	readonly additionalDays: number;
}): Promise<GeneratedWorldExperience> {
	const resolved = await resolveAuthorityFence({});
	const attached = await attachedLocalProcessExperience({}, resolved, true);
	if (attached !== null) return attached;
	if (resolved.fence.browserMustNotWrite)
		return await refreshGeneratedWorldExperience();
	const indexedDbFactory = globalThis.indexedDB;
	if (indexedDbFactory === undefined)
		return await refreshGeneratedWorldExperience();
	const releaseGenesis = await createReleaseGenesis({
		releaseId: V1_GENESIS_RELEASE_ID,
		seedHex: V1_GENESIS_SEED,
	});
	const generatedWorld = await generateWorld({
		releaseGenesis,
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
	const port = await BrowserVersionedPersistence.open({
		factory: indexedDbFactory,
		databaseName: GENERATED_WORLD_STORAGE_KEY,
	});
	try {
		await catchUpLiveGeneratedCivilizationDays({
			port,
			genesisWorld: generatedWorld,
			operationId: input.operationId,
			additionalDays: input.additionalDays,
		});
	} finally {
		port.close();
	}
	return await refreshGeneratedWorldExperience();
}
