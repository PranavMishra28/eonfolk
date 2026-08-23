import {
	domainHash,
	type GeneratedWorldState,
	type ProjectState,
	type ResourceDefinition,
	type StockOwner,
	type StockState,
	type StorageState,
	type WorldCell,
} from "@eonfolk/protocol";

import {
	assertCivilizationInvariants,
	auditCivilizationState,
} from "./audit.js";
import {
	advanceFounding,
	advanceMigration,
	approveProject,
	completeProject,
	completeProjectMilestone,
	consumeProjectResource,
	contributeProjectLabor,
	deliverProjectResource,
	registerFounding,
	registerMigration,
	registerProject,
	registerResourceDefinition,
	registerStock,
	registerStorage,
	startProject,
} from "./kernel.js";
import { createCivilizationState, evolve } from "./state.js";
import type { CivilizationState } from "./types.js";

export const CIVILIZATION_EXPERIMENT_SCHEMA_VERSION =
	"eonfolk-civilization-experiment-v1" as const;
export const CIVILIZATION_EXPERIMENT_RUNNER_VERSION =
	"eonfolk-civilization-runner-v1" as const;
export const CIVILIZATION_EXPERIMENT_EVENT_VERSION =
	"eonfolk-civilization-experiment-event-v1" as const;
export const CIVILIZATION_EXPERIMENT_STEP_VERSION =
	"eonfolk-civilization-experiment-step-v1" as const;

const SECONDS_PER_DAY = 86_400;
const POPULATION = 8;
const PROJECT_DAY = 1;
const PROJECT_COMPLETION_DAY = 2;
const EXPANSION_DECISION_DAY = 30;
const MIGRATION_DEPARTURE_DAY = 45;
const PROJECT_TIMBER = 6;
const MIGRATION_GRAIN = 18;
const MIGRATION_TIMBER = 8;
const MINIMUM_DESTINATION_SUITABILITY = 4_800;
const MINIMUM_DESTINATION_WATER = 3_800;
const MINIMUM_DESTINATION_TIMBER = 2_600;
const MINIMUM_DESTINATION_MATERIAL = 2_600;

const RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
	{
		resourceTypeId: "grain",
		name: "grain",
		unit: "grams",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
	{
		resourceTypeId: "timber",
		name: "timber",
		unit: "millimeters",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
] as const;

export type CivilizationExperimentEventKind =
	| "project-approved"
	| "project-completed"
	| "project-stalled"
	| "expansion-deferred"
	| "migration-prepared"
	| "migration-departed"
	| "migration-arrived"
	| "founding-viable";

export interface TerritoryExperimentProfile {
	readonly territoryId: string;
	readonly traversableCellCount: number;
	readonly suitabilityBasisPoints: number;
	readonly waterBasisPoints: number;
	readonly timberBasisPoints: number;
	readonly materialBasisPoints: number;
	readonly travelFrictionBasisPoints: number;
}

export interface CivilizationExperimentSeedConditions {
	readonly originSettlementId: string;
	readonly originTerritoryId: string;
	readonly destination: TerritoryExperimentProfile;
	readonly initialGrain: number;
	readonly initialTimber: number;
	readonly expansionEligible: boolean;
	readonly eligibilityReasons: readonly string[];
}

export interface CivilizationExperimentEvent {
	readonly schemaVersion: typeof CIVILIZATION_EXPERIMENT_EVENT_VERSION;
	readonly eventIndex: number;
	readonly eventId: string;
	readonly eventHash: string;
	readonly priorEventHash: string | null;
	readonly simulationTime: number;
	readonly kind: CivilizationExperimentEventKind;
	readonly details: Readonly<Record<string, string | number | boolean | null>>;
	readonly postStateHash: string;
}

export interface CivilizationExperimentStep {
	readonly schemaVersion: typeof CIVILIZATION_EXPERIMENT_STEP_VERSION;
	readonly stepIndex: number;
	readonly fromSimulationTime: number;
	readonly toSimulationTime: number;
	readonly preStateHash: string;
	readonly postStateHash: string;
	readonly eventHashes: readonly string[];
	readonly stepHash: string;
}

export interface CivilizationExperimentMetrics {
	readonly horizonDays: number;
	readonly simulationTime: number;
	readonly revision: number;
	readonly population: number;
	readonly stockTotalsByResource: Readonly<Record<string, number>>;
	readonly consumedProjectTimber: number;
	readonly completedProjects: number;
	readonly stalledProjects: number;
	readonly plannedMigrations: number;
	readonly travellingMigrations: number;
	readonly arrivedMigrations: number;
	readonly viableFoundings: number;
	readonly outcome: "progression" | "stagnation";
	readonly outcomeReason: string;
	readonly invariantIssues: readonly string[];
	readonly modelInvocations: 0;
}

export interface CivilizationExperimentRun {
	readonly schemaVersion: typeof CIVILIZATION_EXPERIMENT_SCHEMA_VERSION;
	readonly runnerVersion: typeof CIVILIZATION_EXPERIMENT_RUNNER_VERSION;
	readonly worldIdentityHash: string;
	readonly horizonDays: number;
	readonly seedConditions: CivilizationExperimentSeedConditions;
	readonly initialStateHash: string;
	readonly finalStateHash: string;
	readonly finalEventHash: string | null;
	readonly events: readonly CivilizationExperimentEvent[];
	readonly steps: readonly CivilizationExperimentStep[];
	readonly metrics: CivilizationExperimentMetrics;
	readonly state: CivilizationState;
	readonly limitations: readonly string[];
}

export interface CivilizationExperimentMatrix {
	readonly schemaVersion: "eonfolk-civilization-experiment-matrix-v1";
	readonly runnerVersion: typeof CIVILIZATION_EXPERIMENT_RUNNER_VERSION;
	readonly horizons: readonly [30, 90, 365];
	readonly runs: readonly CivilizationExperimentRun[];
	readonly matrixHash: string;
}

export const CIVILIZATION_EXPERIMENT_LIMITATIONS = Object.freeze([
	"A viable founding is a kernel record; the current kernel cannot materialize it as a second GeneratedWorld settlement or extend immutable reference catalogs.",
	"Migration validates people, carried stocks, territory, departure, arrival, and aggregate travel friction, but does not yet move citizen positions along a generated route.",
	"Seeded grain and timber are deterministic terrain-derived genesis proxies, not a complete production, need, demographic, or ecological model.",
	"The experiment uses deterministic standard rules and invokes no model, cognition provider, training, or inference path.",
]);

function required<T>(value: T | undefined, label: string): T {
	if (value === undefined)
		throw new Error(`civilization experiment lacks ${label}`);
	return value;
}

function average(values: readonly number[]): number {
	if (values.length === 0) return 0;
	return Math.trunc(
		values.reduce((total, value) => total + value, 0) / values.length,
	);
}

function values<T>(
	record: Readonly<Record<string, { readonly value: T }>>,
): T[] {
	return Object.values(record).map((entry) => entry.value);
}

function profileTerritory(
	territoryId: string,
	cells: readonly WorldCell[],
): TerritoryExperimentProfile {
	const traversable = cells.filter(
		(cell) => cell.territoryId === territoryId && cell.terrain !== "water",
	);
	return {
		territoryId,
		traversableCellCount: traversable.length,
		suitabilityBasisPoints: average(
			traversable.map((cell) => cell.settlementSuitabilityBasisPoints),
		),
		waterBasisPoints: average(
			traversable.map((cell) => cell.waterAvailabilityBasisPoints),
		),
		timberBasisPoints: average(
			traversable.map((cell) => cell.timberBasisPoints),
		),
		materialBasisPoints: average(
			traversable.map((cell) => cell.materialBasisPoints),
		),
		travelFrictionBasisPoints: average(
			traversable.map((cell) => cell.travelFrictionBasisPoints),
		),
	};
}

export function deriveCivilizationSeedConditions(
	world: GeneratedWorldState,
): CivilizationExperimentSeedConditions {
	const settlements = values(world.settlements).sort((left, right) =>
		left.settlementId.localeCompare(right.settlementId),
	);
	const origin = required(settlements[0], "an origin settlement");
	const cells = values(world.cells);
	const originProfile = profileTerritory(origin.territoryId, cells);
	const alternatives = values(world.territories)
		.map((territory) => profileTerritory(territory.territoryId, cells))
		.filter((profile) => profile.territoryId !== origin.territoryId)
		.sort(
			(left, right) =>
				right.suitabilityBasisPoints - left.suitabilityBasisPoints ||
				right.waterBasisPoints - left.waterBasisPoints ||
				left.territoryId.localeCompare(right.territoryId),
		);
	const destination = required(alternatives[0], "a destination territory");
	const initialGrain =
		18 + Math.trunc(originProfile.suitabilityBasisPoints / 300);
	const initialTimber = 8 + Math.trunc(originProfile.timberBasisPoints / 350);
	const eligibilityReasons = [
		...(destination.traversableCellCount > 0
			? []
			: ["destination-has-no-traversable-cell"]),
		...(destination.suitabilityBasisPoints >= MINIMUM_DESTINATION_SUITABILITY
			? []
			: ["destination-suitability-below-threshold"]),
		...(destination.waterBasisPoints >= MINIMUM_DESTINATION_WATER
			? []
			: ["destination-water-below-threshold"]),
		...(destination.timberBasisPoints >= MINIMUM_DESTINATION_TIMBER
			? []
			: ["destination-timber-below-threshold"]),
		...(destination.materialBasisPoints >= MINIMUM_DESTINATION_MATERIAL
			? []
			: ["destination-material-below-threshold"]),
		...(initialGrain >= MIGRATION_GRAIN
			? []
			: ["origin-grain-below-physical-requirement"]),
		...(initialTimber >= PROJECT_TIMBER + MIGRATION_TIMBER
			? []
			: ["origin-timber-below-physical-requirement"]),
	];
	return {
		originSettlementId: origin.settlementId,
		originTerritoryId: origin.territoryId,
		destination,
		initialGrain,
		initialTimber,
		expansionEligible: eligibilityReasons.length === 0,
		eligibilityReasons,
	};
}

function citizenId(index: number): string {
	return `citizen-${String(index + 1).padStart(2, "0")}`;
}

function siteBuildingKinds(
	world: GeneratedWorldState,
): Readonly<Record<string, readonly string[]>> {
	const result: Record<string, string[]> = {};
	for (const site of values(world.sites)) result[site.siteId] = [];
	for (const building of values(world.buildings)) {
		const kinds = result[building.siteId] ?? [];
		result[building.siteId] = [...kinds, building.buildingKind].sort();
	}
	return result;
}

function storage(
	storageId: string,
	siteId: string,
	owner: StockOwner,
): StorageState {
	return {
		storageId,
		siteId,
		owner,
		acceptedResourceTypeIds: ["grain", "timber"],
		capacityByResource: { grain: 100_000, timber: 100_000 },
		accessInstitutionId: null,
	};
}

function stock(
	stockId: string,
	storageId: string,
	owner: StockOwner,
	resourceTypeId: "grain" | "timber",
	quantity: number,
	updatedAtSimulationTime = 0,
): StockState {
	return {
		stockId,
		storageId,
		owner,
		resourceTypeId,
		quantity,
		reservedQuantity: 0,
		updatedAtSimulationTime,
	};
}

function projectRecord(
	settlementId: string,
	siteId: string,
	participantCitizenId: string,
): ProjectState {
	return {
		projectId: "project-expedition-kit",
		kind: "expedition-preparation",
		name: "expedition-kit",
		settlementId,
		siteId,
		sponsor: { kind: "citizen", citizenId: participantCitizenId },
		state: "proposed",
		dependencyProjectIds: [],
		milestones: [
			{
				milestoneId: "milestone-expedition-kit",
				name: "assemble-expedition-kit",
				dependencyMilestoneIds: [],
				resources: [
					{
						resourceTypeId: "timber",
						quantity: PROJECT_TIMBER,
						deliveredQuantity: 0,
						consumedQuantity: 0,
					},
				],
				labor: [
					{
						capabilityId: "build",
						requiredLaborSeconds: 3_600,
						completedLaborSeconds: 0,
					},
				],
				progressBasisPoints: 0,
				state: "ready",
			},
		],
		participantCitizenIds: [participantCitizenId],
		storageId: "storage-project-expedition-kit",
		startedAtSimulationTime: null,
		endedAtSimulationTime: null,
		failureReason: null,
		sourceEventIds: [],
	};
}

function bootstrapCivilization(
	world: GeneratedWorldState,
	conditions: CivilizationExperimentSeedConditions,
): CivilizationState {
	const siteIds = Object.keys(world.sites).sort();
	const workSite =
		values(world.sites)
			.filter((site) => site.kind === "production")
			.sort((left, right) => left.siteId.localeCompare(right.siteId))[0] ??
		required(values(world.sites)[0], "a work site");
	const migrant = citizenId(0);
	let state = createCivilizationState({
		citizenIds: Array.from({ length: POPULATION }, (_, index) =>
			citizenId(index),
		),
		settlementIds: Object.keys(world.settlements).sort(),
		territoryIds: Object.keys(world.territories).sort(),
		siteIds,
		buildingKindsBySite: siteBuildingKinds(world),
		capabilitiesByCitizen: Object.fromEntries(
			Array.from({ length: POPULATION }, (_, index) => [
				citizenId(index),
				index === 0 ? { build: 8_000 } : { build: 2_000 },
			]),
		),
	});
	for (const definition of RESOURCE_DEFINITIONS)
		state = registerResourceDefinition(state, definition);
	const migrantOwner = { kind: "citizen" as const, citizenId: migrant };
	state = registerStorage(
		state,
		storage("storage-migrant", workSite.siteId, migrantOwner),
	);
	state = registerStock(
		state,
		stock(
			"stock-migrant-grain",
			"storage-migrant",
			migrantOwner,
			"grain",
			conditions.initialGrain,
		),
	);
	state = registerStock(
		state,
		stock(
			"stock-migrant-timber",
			"storage-migrant",
			migrantOwner,
			"timber",
			conditions.initialTimber,
		),
	);
	return state;
}

async function stateHash(state: CivilizationState): Promise<string> {
	return domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v1", state);
}

async function eventRecord(input: {
	readonly eventIndex: number;
	readonly priorEventHash: string | null;
	readonly simulationTime: number;
	readonly kind: CivilizationExperimentEventKind;
	readonly details: Readonly<Record<string, string | number | boolean | null>>;
	readonly postStateHash: string;
}): Promise<CivilizationExperimentEvent> {
	const body = {
		schemaVersion: CIVILIZATION_EXPERIMENT_EVENT_VERSION,
		eventIndex: input.eventIndex,
		priorEventHash: input.priorEventHash,
		simulationTime: input.simulationTime,
		kind: input.kind,
		details: input.details,
		postStateHash: input.postStateHash,
	};
	const eventHash = await domainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v1",
		body,
	);
	return {
		...body,
		eventId: `civilization-event:${input.eventIndex}:${eventHash.slice(0, 16)}`,
		eventHash,
	};
}

function travelDays(profile: TerritoryExperimentProfile): number {
	return 5 + Math.trunc(profile.travelFrictionBasisPoints / 1_000);
}

function projectTimberConsumed(state: CivilizationState): number {
	return state.accounting
		.filter(
			(entry) =>
				entry.kind === "project-consumption" &&
				entry.projectId === "project-expedition-kit",
		)
		.flatMap((entry) => entry.stockDeltas)
		.reduce((total, delta) => total + Math.max(0, -delta.quantityDelta), 0);
}

function metrics(
	state: CivilizationState,
	horizonDays: number,
	conditions: CivilizationExperimentSeedConditions,
): CivilizationExperimentMetrics {
	const audit = auditCivilizationState(state);
	const projects = Object.values(state.projects);
	const migrations = Object.values(state.migrations);
	const viableFoundings = Object.values(state.foundings).filter(
		(founding) => founding.state === "viable",
	).length;
	const completedProjects = projects.filter(
		(project) => project.state === "completed",
	).length;
	const stalledProjects = projects.filter((project) =>
		["approved", "resourcing", "paused", "failed", "abandoned"].includes(
			project.state,
		),
	).length;
	const outcome =
		viableFoundings > 0 || migrations.length > 0 ? "progression" : "stagnation";
	let outcomeReason = "founding-prerequisites-incomplete";
	if (!conditions.expansionEligible)
		outcomeReason = conditions.eligibilityReasons.join(",");
	else if (viableFoundings > 0) outcomeReason = "physical-founding-viable";
	else if (migrations.length > 0) outcomeReason = "physical-expansion-underway";
	else if (horizonDays < EXPANSION_DECISION_DAY)
		outcomeReason = "expansion-decision-not-yet-reached";
	return {
		horizonDays,
		simulationTime: state.simulationTime,
		revision: state.revision,
		population: POPULATION,
		stockTotalsByResource: audit.stockTotalsByResource,
		consumedProjectTimber: projectTimberConsumed(state),
		completedProjects,
		stalledProjects,
		plannedMigrations: migrations.filter((item) => item.state === "planned")
			.length,
		travellingMigrations: migrations.filter(
			(item) => item.state === "travelling",
		).length,
		arrivedMigrations: migrations.filter((item) => item.state === "arrived")
			.length,
		viableFoundings,
		outcome,
		outcomeReason,
		invariantIssues: audit.issues,
		modelInvocations: 0,
	};
}

export async function runCivilizationExperiment(input: {
	readonly world: GeneratedWorldState;
	readonly horizonDays: number;
}): Promise<CivilizationExperimentRun> {
	if (
		!Number.isSafeInteger(input.horizonDays) ||
		input.horizonDays < 1 ||
		input.horizonDays > 365
	)
		throw new RangeError("horizonDays must be an integer from 1 through 365");
	const conditions = deriveCivilizationSeedConditions(input.world);
	let state = bootstrapCivilization(input.world, conditions);
	assertCivilizationInvariants(state);
	const initialStateHash = await stateHash(state);
	const events: CivilizationExperimentEvent[] = [];
	const steps: CivilizationExperimentStep[] = [];
	let priorEventHash: string | null = null;
	let migrationArrivalDay: number | null = null;

	const appendEvent = async (
		kind: CivilizationExperimentEventKind,
		details: CivilizationExperimentEvent["details"],
	): Promise<void> => {
		const postStateHash = await stateHash(state);
		const event = await eventRecord({
			eventIndex: events.length,
			priorEventHash,
			simulationTime: state.simulationTime,
			kind,
			details,
			postStateHash,
		});
		events.push(event);
		priorEventHash = event.eventHash;
	};

	for (let day = 1; day <= input.horizonDays; day += 1) {
		const fromSimulationTime = state.simulationTime;
		const preStateHash = await stateHash(state);
		const beforeEventIndex = events.length;
		const atSimulationTime = day * SECONDS_PER_DAY;
		state = evolve(state, {}, atSimulationTime);

		if (day === PROJECT_DAY) {
			const workSite = required(
				values(input.world.sites)
					.filter((site) => site.kind === "production")
					.sort((left, right) => left.siteId.localeCompare(right.siteId))[0] ??
					values(input.world.sites)[0],
				"a project site",
			);
			const project = projectRecord(
				conditions.originSettlementId,
				workSite.siteId,
				citizenId(0),
			);
			state = registerProject(
				state,
				project,
				storage(project.storageId, workSite.siteId, {
					kind: "project",
					projectId: project.projectId,
				}),
			);
			state = registerStock(
				state,
				stock(
					"stock-project-timber",
					project.storageId,
					{ kind: "project", projectId: project.projectId },
					"timber",
					0,
					atSimulationTime,
				),
			);
			state = approveProject(state, project.projectId);
			await appendEvent("project-approved", {
				projectId: project.projectId,
				physicalTimberRequired: PROJECT_TIMBER,
			});
		}

		if (day === PROJECT_COMPLETION_DAY) {
			const available = state.stocks["stock-migrant-timber"]?.quantity ?? 0;
			if (available >= PROJECT_TIMBER) {
				state = startProject(state, "project-expedition-kit", atSimulationTime);
				state = deliverProjectResource(state, {
					projectId: "project-expedition-kit",
					milestoneId: "milestone-expedition-kit",
					fromStockId: "stock-migrant-timber",
					toStockId: "stock-project-timber",
					quantity: PROJECT_TIMBER,
					atSimulationTime,
				});
				state = consumeProjectResource(state, {
					projectId: "project-expedition-kit",
					milestoneId: "milestone-expedition-kit",
					stockId: "stock-project-timber",
					quantity: PROJECT_TIMBER,
					atSimulationTime,
				});
				state = contributeProjectLabor(state, {
					projectId: "project-expedition-kit",
					milestoneId: "milestone-expedition-kit",
					citizenId: citizenId(0),
					capabilityId: "build",
					laborSeconds: 3_600,
					atSimulationTime,
				});
				state = completeProjectMilestone(
					state,
					"project-expedition-kit",
					"milestone-expedition-kit",
				);
				state = completeProject(
					state,
					"project-expedition-kit",
					atSimulationTime,
				);
				await appendEvent("project-completed", {
					projectId: "project-expedition-kit",
					consumedTimber: PROJECT_TIMBER,
				});
			} else {
				await appendEvent("project-stalled", {
					projectId: "project-expedition-kit",
					availableTimber: available,
					requiredTimber: PROJECT_TIMBER,
				});
			}
		}

		if (day === EXPANSION_DECISION_DAY) {
			const projectComplete =
				state.projects["project-expedition-kit"]?.state === "completed";
			if (conditions.expansionEligible && projectComplete) {
				migrationArrivalDay =
					MIGRATION_DEPARTURE_DAY + travelDays(conditions.destination);
				state = registerMigration(
					state,
					{
						migrationId: "migration-founding-party",
						citizenIds: [citizenId(0)],
						originSettlementId: conditions.originSettlementId,
						destinationTerritoryId: conditions.destination.territoryId,
						destinationSettlementId: null,
						carriedStockIds: ["stock-migrant-grain", "stock-migrant-timber"],
						departureSimulationTime: MIGRATION_DEPARTURE_DAY * SECONDS_PER_DAY,
						expectedArrivalSimulationTime:
							migrationArrivalDay * SECONDS_PER_DAY,
						state: "planned",
						sourceEventIds: [],
					},
					[
						{ resourceTypeId: "grain", quantity: MIGRATION_GRAIN },
						{ resourceTypeId: "timber", quantity: MIGRATION_TIMBER },
					],
				);
				state = registerFounding(
					state,
					{
						foundingId: "founding-second-settlement",
						migrationId: "migration-founding-party",
						proposedSettlementId: "settlement-second",
						territoryId: conditions.destination.territoryId,
						founderCitizenIds: [citizenId(0)],
						requiredProjectIds: ["project-expedition-kit"],
						requiredStockIds: ["stock-migrant-grain", "stock-migrant-timber"],
						state: "proposed",
						viabilityEvidenceEventIds: [],
					},
					[
						{ resourceTypeId: "grain", quantity: MIGRATION_GRAIN },
						{ resourceTypeId: "timber", quantity: MIGRATION_TIMBER },
					],
				);
				state = advanceFounding(
					state,
					"founding-second-settlement",
					"preparing",
					atSimulationTime,
				);
				await appendEvent("migration-prepared", {
					destinationTerritoryId: conditions.destination.territoryId,
					arrivalDay: migrationArrivalDay,
					carriedGrain: state.stocks["stock-migrant-grain"]?.quantity ?? 0,
					carriedTimber: state.stocks["stock-migrant-timber"]?.quantity ?? 0,
				});
			} else {
				await appendEvent("expansion-deferred", {
					projectComplete,
					expansionEligible: conditions.expansionEligible,
					reasonCount: conditions.eligibilityReasons.length,
				});
			}
		}

		if (
			day === MIGRATION_DEPARTURE_DAY &&
			state.migrations["migration-founding-party"]?.state === "planned"
		) {
			state = advanceMigration(
				state,
				"migration-founding-party",
				"travelling",
				atSimulationTime,
			);
			state = advanceFounding(
				state,
				"founding-second-settlement",
				"travelling",
				atSimulationTime,
			);
			await appendEvent("migration-departed", {
				destinationTerritoryId: conditions.destination.territoryId,
				physicalStocks: 2,
			});
		}

		if (
			migrationArrivalDay !== null &&
			day === migrationArrivalDay &&
			state.migrations["migration-founding-party"]?.state === "travelling"
		) {
			state = advanceMigration(
				state,
				"migration-founding-party",
				"arrived",
				atSimulationTime,
			);
			state = advanceFounding(
				state,
				"founding-second-settlement",
				"establishing",
				atSimulationTime,
			);
			await appendEvent("migration-arrived", {
				destinationTerritoryId: conditions.destination.territoryId,
				travelDays: travelDays(conditions.destination),
			});
		}

		if (
			migrationArrivalDay !== null &&
			day === migrationArrivalDay + 1 &&
			state.foundings["founding-second-settlement"]?.state === "establishing"
		) {
			state = advanceFounding(
				state,
				"founding-second-settlement",
				"viable",
				atSimulationTime,
			);
			await appendEvent("founding-viable", {
				proposedSettlementId: "settlement-second",
				projectComplete:
					state.projects["project-expedition-kit"]?.state === "completed",
				migrationArrived:
					state.migrations["migration-founding-party"]?.state === "arrived",
			});
		}

		assertCivilizationInvariants(state);
		const postStateHash = await stateHash(state);
		const eventHashes = events
			.slice(beforeEventIndex)
			.map((event) => event.eventHash);
		const stepBody = {
			schemaVersion: CIVILIZATION_EXPERIMENT_STEP_VERSION,
			stepIndex: day - 1,
			fromSimulationTime,
			toSimulationTime: atSimulationTime,
			preStateHash,
			postStateHash,
			eventHashes,
		};
		steps.push({
			...stepBody,
			stepHash: await domainHash(
				"EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v1",
				stepBody,
			),
		});
	}

	const finalStateHash = await stateHash(state);
	return {
		schemaVersion: CIVILIZATION_EXPERIMENT_SCHEMA_VERSION,
		runnerVersion: CIVILIZATION_EXPERIMENT_RUNNER_VERSION,
		worldIdentityHash: input.world.identity.identityHash,
		horizonDays: input.horizonDays,
		seedConditions: conditions,
		initialStateHash,
		finalStateHash,
		finalEventHash: priorEventHash,
		events,
		steps,
		metrics: metrics(state, input.horizonDays, conditions),
		state,
		limitations: CIVILIZATION_EXPERIMENT_LIMITATIONS,
	};
}

export async function runCivilizationExperimentMatrix(input: {
	readonly worlds: readonly GeneratedWorldState[];
}): Promise<CivilizationExperimentMatrix> {
	if (input.worlds.length === 0)
		throw new RangeError(
			"civilization experiment matrix needs at least one world",
		);
	const horizons = [30, 90, 365] as const;
	const orderedWorlds = [...input.worlds].sort((left, right) =>
		left.identity.identityHash.localeCompare(right.identity.identityHash),
	);
	const runs: CivilizationExperimentRun[] = [];
	for (const world of orderedWorlds)
		for (const horizonDays of horizons)
			runs.push(await runCivilizationExperiment({ world, horizonDays }));
	const matrixBody = {
		schemaVersion: "eonfolk-civilization-experiment-matrix-v1" as const,
		runnerVersion: CIVILIZATION_EXPERIMENT_RUNNER_VERSION,
		horizons,
		runs: runs.map((run) => ({
			worldIdentityHash: run.worldIdentityHash,
			horizonDays: run.horizonDays,
			initialStateHash: run.initialStateHash,
			finalStateHash: run.finalStateHash,
			finalEventHash: run.finalEventHash,
			metrics: run.metrics,
		})),
	};
	return {
		...matrixBody,
		runs,
		matrixHash: await domainHash(
			"EONFOLK:CIVILIZATION-EXPERIMENT-MATRIX:v1",
			matrixBody,
		),
	};
}
