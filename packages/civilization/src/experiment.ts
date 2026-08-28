import {
	CIVILIZATION_SCHEDULER_BRAIN_VERSION,
	type CivilizationRoutineOption,
	type CivilizationRoutineResolution,
	type CivilizationSchedulerDecisionEvidence,
	type CivilizationSchedulerDecisionGateway,
	type CivilizationSchedulerMindState,
	createMemoryStore,
	decideCivilizationSchedulerRoutine,
	MEMORY_SCHEMA_VERSION,
	remember,
} from "@eonfolk/cognition";
import {
	bytesFromHex,
	type CitizenMindSnapshot,
	domainHash,
	type GeneratedWorldState,
	type ProjectState,
	type ResourceDefinition,
	type StandingPlan,
	type StockOwner,
	type StockState,
	type StorageState,
	seedPrng,
	VISIBILITY_POLICY_VERSION,
	type WorldCell,
} from "@eonfolk/protocol";
import {
	materializeFoundedSettlement,
	planTerritoryMigrationRoute,
} from "@eonfolk/worldgen";

import {
	assertCivilizationInvariants,
	auditCivilizationState,
} from "./audit.js";
import {
	advanceFounding,
	advanceMigration,
	advanceMigrationJourney,
	checkpointCivilizationAccounting,
	recordFoundingMaterialization,
	registerAgreement,
	registerFounding,
	registerInstitution,
	registerMigration,
	registerMigrationJourney,
	registerProject,
	registerRecipe,
	registerResourceDefinition,
	registerStock,
	registerStorage,
} from "./kernel.js";
import {
	formHousehold,
	recordSocialContact,
	registerCitizen,
	registerRelationship,
} from "./population.js";
import { deriveCanonicalPressures } from "./pressures.js";
import {
	advanceGeneralizedScheduler,
	CIVILIZATION_SCHEDULER_SCHEMA_VERSION,
	type GeneralizedSchedulerPolicy,
	type SchedulerAction,
	type SchedulerRoutineAssignment,
	type SchedulerRoutineDecision,
} from "./scheduler.js";
import {
	createCivilizationState,
	registerCivilizationMind,
	replaceCivilizationMind,
} from "./state.js";
import type { CivilizationState } from "./types.js";

export const CIVILIZATION_EXPERIMENT_SCHEMA_VERSION =
	"eonfolk-civilization-experiment-v9" as const;
export const CIVILIZATION_EXPERIMENT_RUNNER_VERSION =
	"eonfolk-civilization-runner-v9" as const;
export const CIVILIZATION_EXPERIMENT_EVENT_VERSION =
	"eonfolk-civilization-experiment-event-v9" as const;
export const CIVILIZATION_EXPERIMENT_STEP_VERSION =
	"eonfolk-civilization-experiment-step-v9" as const;

const SECONDS_PER_DAY = 86_400;
const SOCIAL_CONTACT_COOLDOWN_SECONDS = 3 * SECONDS_PER_DAY;
const POPULATION = 8;
/** Stable Reality identity for the Release Genesis focal citizen. */
export const RELEASE_GENESIS_MARA_CITIZEN_ID = "citizen-01" as const;
export const RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID = "citizen-04" as const;
const PROJECT_TIMBER = 6;
const MIGRATION_GRAIN = 18;
const MIGRATION_WATER = 18;
const MIGRATION_TIMBER = 8;
const MIGRATION_DAILY_TRAVERSAL_UNITS = 10_000;
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
	{
		resourceTypeId: "water",
		name: "water",
		unit: "milliliters",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
	{
		resourceTypeId: "food",
		name: "prepared-food",
		unit: "count",
		conserved: false,
		divisible: false,
		decayBasisPointsPerDay: 0,
	},
	{
		resourceTypeId: "spring-water",
		name: "spring-water",
		unit: "milliliters",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
	{
		resourceTypeId: "standing-timber",
		name: "standing-timber",
		unit: "millimeters",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
] as const;

const CITIZEN_IDENTITIES = Object.freeze([
	{
		name: "Mara Vale",
		roleId: "expedition-steward",
		valueIds: ["stewardship", "curiosity"],
	},
	{
		name: "Iven Rook",
		roleId: "provisioner",
		valueIds: ["reliability", "care"],
	},
	{
		name: "Sela Thorn",
		roleId: "water-keeper",
		valueIds: ["care", "prudence"],
	},
	{ name: "Orin Ash", roleId: "forester", valueIds: ["stewardship", "craft"] },
	{ name: "Toma Reed", roleId: "builder", valueIds: ["craft", "solidarity"] },
	{ name: "Nia Wren", roleId: "mediator", valueIds: ["fairness", "care"] },
	{
		name: "Bram Moss",
		roleId: "keeper",
		valueIds: ["continuity", "reliability"],
	},
	{ name: "Edda Fen", roleId: "scout", valueIds: ["curiosity", "prudence"] },
] as const);

export type CivilizationExperimentEventKind =
	| "project-approved"
	| "project-completed"
	| "project-stalled"
	| "expansion-deferred"
	| "migration-prepared"
	| "migration-departed"
	| "migration-traversed"
	| "migration-arrived"
	| "founding-viable"
	| "settlement-materialized";

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
	readonly initialWater: number;
	readonly initialTimber: number;
	readonly originResidentialCapacity: number;
	readonly populationPressureBasisPoints: number;
	readonly expansionEligible: boolean;
	readonly eligibilityReasons: readonly string[];
	readonly route: {
		readonly destinationCellId: string;
		readonly cellIds: readonly string[];
		readonly traversalUnitsByLeg: readonly number[];
		readonly totalTraversalUnits: number;
	};
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
	readonly residentPopulation: number;
	readonly travellingPopulation: number;
	readonly departedPopulation: number;
	readonly householdCount: number;
	readonly relationshipCount: number;
	readonly averagePressureBasisPointsByKind: Readonly<
		Record<"food" | "water" | "housing" | "labor" | "travel" | "social", number>
	>;
	readonly stockTotalsByResource: Readonly<Record<string, number>>;
	readonly completedProductionRuns: number;
	readonly consumedNeedUnits: number;
	readonly transportedResourceUnits: number;
	readonly groundedNeedOutcomes: number;
	readonly unmetNeedUnits: number;
	readonly agreementGatedInstitutionProjects: number;
	readonly consumedProjectTimber: number;
	readonly completedProjects: number;
	readonly stalledProjects: number;
	readonly plannedMigrations: number;
	readonly travellingMigrations: number;
	readonly arrivedMigrations: number;
	readonly viableFoundings: number;
	readonly materializedSettlements: number;
	readonly outcome: "progression" | "stagnation";
	readonly outcomeReason: string;
	readonly invariantIssues: readonly string[];
	readonly standardBrainDecisionCount: number;
	readonly standingPlanTransitionCount: number;
	readonly memoryRetrievedDecisionCount: number;
	readonly modelInvocations: 0;
}

export interface CivilizationVisualLifecycle {
	readonly dayStart: number;
	readonly travelEnd: number;
	readonly performEnd: number;
	readonly simulationEnd: number;
	readonly travelKind: "walk" | "carry" | null;
	readonly performKind:
		| "idle"
		| "walk"
		| "carry"
		| "gather"
		| "inspect"
		| "talk"
		| "listen"
		| "exchange"
		| "repair"
		| "eat-rest"
		| "react";
	readonly routineKind: SchedulerRoutineAssignment["kind"];
}

export interface CivilizationScheduledActivity {
	readonly schemaVersion: "eonfolk-generated-spatial-activity-v1";
	readonly citizenId: string;
	readonly routine: SchedulerRoutineAssignment;
	readonly canonicalAction: Readonly<{
		readonly actionId: string;
		readonly sourceKind: "current-behavior";
		readonly eventId: null;
		readonly eventSequence: null;
		readonly status: "in-progress";
		readonly kind:
			| "idle"
			| "walk"
			| "carry"
			| "gather"
			| "inspect"
			| "talk"
			| "listen"
			| "exchange"
			| "repair"
			| "eat-rest"
			| "react";
		readonly originPlaceId: string;
		readonly destinationPlaceId: string;
		readonly affordanceId: string;
		readonly affordanceSlotIndex: number;
		readonly targetId: string | null;
		readonly simulationStart: number;
		readonly simulationEnd: number | null;
		readonly resultEventId: null;
	}>;
	readonly location:
		| Readonly<{
				readonly kind: "interaction-slot";
				readonly interactionSlotId: string;
		  }>
		| Readonly<{
				readonly kind: "route";
				readonly routeId: string;
				readonly progressBasisPoints: number;
		  }>;
	readonly projectId: string | null;
	readonly carriedProp: "grain" | "logs" | "trade" | "tool" | "water" | null;
	readonly focal: boolean;
	readonly visualLifecycle: CivilizationVisualLifecycle;
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
	readonly cognitionDecisions: readonly CivilizationSchedulerDecisionEvidence[];
	readonly finalStandingPlans: readonly StandingPlan[];
	readonly metrics: CivilizationExperimentMetrics;
	readonly activities: readonly CivilizationScheduledActivity[];
	readonly state: CivilizationState;
	readonly world: GeneratedWorldState;
	readonly limitations: readonly string[];
}

export interface CivilizationExperimentMatrix {
	readonly schemaVersion: "eonfolk-civilization-experiment-matrix-v6";
	readonly runnerVersion: typeof CIVILIZATION_EXPERIMENT_RUNNER_VERSION;
	readonly horizons: readonly [30, 90, 365];
	readonly runs: readonly CivilizationExperimentRun[];
	readonly matrixHash: string;
}

export const CIVILIZATION_EXPERIMENT_LIMITATIONS = Object.freeze([
	"The experiment materializes an undeveloped second settlement and founding ground; the origin has one agreement-gated institution project, not a generalized construction economy.",
	"Migration physically advances and accounts for a deterministic cell route at a fixed experiment travel budget; weather, injury, vehicles, and individual position rendering are not modeled.",
	"Terrain-derived source stocks feed audited daily transport, production, and consumption; birth, death, ecology, and replenishment beyond the bounded horizon remain excluded.",
	"Scheduler-owned activities expose one deterministic in-progress sample for a physically grounded route routine; they do not mutate a citizen's canonical site or model a complete trip.",
	"Three opening daily decision boundaries use deterministic Standard Brain, bounded Standing Plans, and actor-visible memory; later stable daily spans use the same resolved scheduler policy without a model.",
	"The experiment invokes no model, cognition provider, training, or inference path; captured decision evidence replays without rerunning any Brain.",
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

function routeFor(
	world: GeneratedWorldState,
	originSettlementId: string,
	destinationTerritoryId: string,
): CivilizationExperimentSeedConditions["route"] {
	const route = planTerritoryMigrationRoute(world, {
		originSettlementId,
		destinationTerritoryId,
	});
	return {
		destinationCellId: route.destinationCellId,
		cellIds: route.cellIds,
		traversalUnitsByLeg: route.traversalUnitsByLeg,
		totalTraversalUnits: route.totalTraversalUnits,
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
	const initialWater = 18 + Math.trunc(originProfile.waterBasisPoints / 300);
	const initialTimber = 8 + Math.trunc(originProfile.timberBasisPoints / 350);
	const originSiteIds = new Set(origin.siteIds);
	const residentialSiteIds = new Set(
		values(world.sites)
			.filter(
				(site) => originSiteIds.has(site.siteId) && site.kind === "residential",
			)
			.map((site) => site.siteId),
	);
	const originResidentialCapacity = values(world.buildings)
		.filter((building) => residentialSiteIds.has(building.siteId))
		.reduce((total, building) => total + building.capacity, 0);
	const populationPressureBasisPoints = Math.min(
		10_000,
		Math.max(0, POPULATION - originResidentialCapacity) * 1_250,
	);
	const eligibilityReasons = [
		...(populationPressureBasisPoints > 0
			? []
			: ["origin-has-no-population-pressure"]),
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
		...(initialWater >= MIGRATION_WATER
			? []
			: ["origin-water-below-physical-requirement"]),
		...(initialTimber >= PROJECT_TIMBER + MIGRATION_TIMBER
			? []
			: ["origin-timber-below-physical-requirement"]),
	];
	return {
		originSettlementId: origin.settlementId,
		originTerritoryId: origin.territoryId,
		destination,
		initialGrain,
		initialWater,
		initialTimber,
		originResidentialCapacity,
		populationPressureBasisPoints,
		expansionEligible: eligibilityReasons.length === 0,
		eligibilityReasons,
		route: routeFor(world, origin.settlementId, destination.territoryId),
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
	acceptedResourceTypeIds: readonly string[] = ["grain", "timber", "water"],
	accessInstitutionId: string | null = null,
): StorageState {
	return {
		storageId,
		siteId,
		owner,
		acceptedResourceTypeIds,
		capacityByResource: Object.fromEntries(
			acceptedResourceTypeIds.map((resourceTypeId) => [
				resourceTypeId,
				100_000,
			]),
		),
		accessInstitutionId,
	};
}

function stock(
	stockId: string,
	storageId: string,
	owner: StockOwner,
	resourceTypeId: string,
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
		sponsor: {
			kind: "institution",
			institutionId: "institution-origin-council",
		},
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

interface CivilizationBootstrap {
	readonly state: CivilizationState;
	readonly schedulerPolicy: GeneralizedSchedulerPolicy;
}

function bootstrapCivilization(
	world: GeneratedWorldState,
	conditions: CivilizationExperimentSeedConditions,
): CivilizationBootstrap {
	const siteIds = Object.keys(world.sites).sort();
	const origin = required(
		values(world.settlements).find(
			(settlement) => settlement.settlementId === conditions.originSettlementId,
		),
		"the origin settlement",
	);
	const originSiteIdSet = new Set(origin.siteIds);
	const workSite =
		values(world.sites)
			.filter(
				(site) =>
					originSiteIdSet.has(site.siteId) && site.kind === "production",
			)
			.sort((left, right) => left.siteId.localeCompare(right.siteId))[0] ??
		required(
			values(world.sites)
				.filter((site) => originSiteIdSet.has(site.siteId))
				.sort((left, right) => left.siteId.localeCompare(right.siteId))[0],
			"an origin work site",
		);
	const supplyRoute = required(
		values(world.routes)
			.filter(
				(route) =>
					originSiteIdSet.has(route.fromSiteId) &&
					originSiteIdSet.has(route.toSiteId) &&
					(route.fromSiteId === workSite.siteId ||
						route.toSiteId === workSite.siteId),
			)
			.sort((left, right) => left.routeId.localeCompare(right.routeId))[0],
		"an origin supply route",
	);
	const sourceSiteId =
		supplyRoute.fromSiteId === workSite.siteId
			? supplyRoute.toSiteId
			: supplyRoute.fromSiteId;
	const migrant = RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID;
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
				{
					build: index === 0 ? 8_000 : 2_000,
					craft: index === 1 ? 8_000 : 2_000,
					haul: index >= 4 && index <= 6 ? 8_000 : 2_000,
					water: index === 2 ? 8_000 : 2_000,
					forestry: index === 3 ? 8_000 : 2_000,
				},
			]),
		),
	});
	for (const definition of RESOURCE_DEFINITIONS)
		state = registerResourceDefinition(state, definition);
	const originSites = values(world.sites)
		.filter((site) => origin.siteIds.includes(site.siteId))
		.sort((left, right) => left.siteId.localeCompare(right.siteId));
	const communalSite = originSites.find((site) =>
		values(world.interactionSlots).some(
			(slot) =>
				slot.siteId === site.siteId &&
				slot.capacity >= 2 &&
				slot.activityKinds.some((kind) =>
					["meet", "rendezvous"].includes(kind),
				),
		),
	);
	const dwelling = values(world.buildings)
		.filter((building) =>
			originSites.some((site) => site.siteId === building.siteId),
		)
		.sort((left, right) => left.buildingId.localeCompare(right.buildingId))[0];
	for (let index = 0; index < POPULATION; index += 1) {
		const id = citizenId(index);
		const identity = required(CITIZEN_IDENTITIES[index], `identity for ${id}`);
		const site =
			id === RELEASE_GENESIS_MARA_CITIZEN_ID || id === citizenId(1)
				? workSite
				: id === citizenId(4)
					? required(world.sites[sourceSiteId]?.value, "the supply source site")
					: index >= POPULATION - 2 && communalSite !== undefined
						? communalSite
						: required(
								originSites[index % originSites.length],
								"an origin citizen site",
							);
		state = registerCitizen(state, {
			schemaVersion: "eonfolk-civilization-social-v1",
			citizenId: id,
			name: identity.name,
			valueIds: identity.valueIds,
			settlementId: conditions.originSettlementId,
			siteId: site.siteId,
			householdId: null,
			primaryRoleId: identity.roleId,
			residenceState: "resident",
			arrivedAtSimulationTime: 0,
			departedAtSimulationTime: null,
			foodRequiredUnitsPerDay: 3,
			waterRequiredUnitsPerDay: 4,
			laborCapacitySecondsPerDay: 24_000,
			committedLaborSecondsPerDay: 0,
			lastSocialSimulationTime: 0,
			sourceEventIds: [],
		});
	}
	for (let index = 1; index < POPULATION; index += 2) {
		const memberCitizenIds = [citizenId(index), citizenId(index + 1)].filter(
			(id) => id !== migrant && state.citizens[id] !== undefined,
		);
		state = formHousehold(state, {
			householdId: `household-${String(Math.trunc(index / 2) + 1).padStart(2, "0")}`,
			settlementId: conditions.originSettlementId,
			memberCitizenIds,
			dependentCitizenIds: [],
			dwellingBuildingId: dwelling?.buildingId ?? null,
			sharedStorageIds: [],
			commitmentIds: [],
		});
	}
	for (let index = 0; index < POPULATION; index += 1) {
		state = registerRelationship(state, {
			schemaVersion: "eonfolk-civilization-social-v1",
			relationshipId: `relationship-${String(index + 1).padStart(2, "0")}`,
			fromCitizenId: citizenId(index),
			toCitizenId: citizenId((index + 1) % POPULATION),
			kind: index === 0 ? "friend" : "colleague",
			familiarityBasisPoints: 5_000,
			trustBasisPoints: 5_500,
			strainBasisPoints: 500,
			lastInteractionSimulationTime: 0,
			sourceEventIds: [],
		});
	}
	const migrantOwner = { kind: "citizen" as const, citizenId: migrant };
	state = registerStorage(
		state,
		storage("storage-migrant", workSite.siteId, migrantOwner),
	);
	state = registerStock(
		state,
		stock(
			"stock-migrant-water",
			"storage-migrant",
			migrantOwner,
			"water",
			conditions.initialWater,
		),
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
	state = registerInstitution(state, {
		institutionId: "institution-origin-council",
		settlementId: conditions.originSettlementId,
		name: "Origin Council",
		kind: "settlement-council",
		roles: [
			{
				roleId: "expedition-steward",
				name: "Expedition Steward",
				authorityKinds: ["work-project"],
				capacity: 1,
			},
		],
		memberships: [
			{
				citizenId: citizenId(0),
				roleId: "expedition-steward",
				joinedAtSimulationTime: 0,
				leftAtSimulationTime: null,
				sourceEventIds: [],
			},
		],
		storageIds: [],
		projectIds: [],
		agreementIds: [],
		normIds: [],
		foundedAtSimulationTime: 0,
		dissolvedAtSimulationTime: null,
	});
	state = registerAgreement(state, {
		agreementId: "agreement-expedition-work",
		parties: [
			{ kind: "institution", institutionId: "institution-origin-council" },
			{ kind: "settlement", settlementId: conditions.originSettlementId },
		],
		kind: "policy",
		commitments: ["allow-project:expedition-preparation"],
		authorityInstitutionId: "institution-origin-council",
		effectiveFromSimulationTime: 0,
		expiresAtSimulationTime: null,
		state: "active",
		sourceEventIds: [],
	});
	const settlementOwner = {
		kind: "settlement" as const,
		settlementId: conditions.originSettlementId,
	};
	const institutionOwner = {
		kind: "institution" as const,
		institutionId: "institution-origin-council",
	};
	state = registerStorage(
		state,
		storage("storage-origin-source", sourceSiteId, settlementOwner, [
			"grain",
			"spring-water",
			"standing-timber",
		]),
	);
	state = registerStorage(
		state,
		storage("storage-origin-work", workSite.siteId, settlementOwner, [
			"grain",
			"spring-water",
			"standing-timber",
			"food",
			"water",
		]),
	);
	state = registerStorage(
		state,
		storage(
			"storage-origin-council",
			workSite.siteId,
			institutionOwner,
			["timber"],
			"institution-origin-council",
		),
	);
	for (const item of [
		stock(
			"stock-source-grain",
			"storage-origin-source",
			settlementOwner,
			"grain",
			conditions.initialGrain * 500,
		),
		stock(
			"stock-source-spring-water",
			"storage-origin-source",
			settlementOwner,
			"spring-water",
			conditions.initialWater * 600,
		),
		stock(
			"stock-source-standing-timber",
			"storage-origin-source",
			settlementOwner,
			"standing-timber",
			conditions.initialTimber * 20,
		),
		stock(
			"stock-work-grain",
			"storage-origin-work",
			settlementOwner,
			"grain",
			0,
		),
		stock(
			"stock-work-spring-water",
			"storage-origin-work",
			settlementOwner,
			"spring-water",
			0,
		),
		stock(
			"stock-work-standing-timber",
			"storage-origin-work",
			settlementOwner,
			"standing-timber",
			0,
		),
		stock(
			"stock-origin-food",
			"storage-origin-work",
			settlementOwner,
			"food",
			24,
		),
		stock(
			"stock-origin-water",
			"storage-origin-work",
			settlementOwner,
			"water",
			32,
		),
		stock(
			"stock-origin-timber",
			"storage-origin-council",
			institutionOwner,
			"timber",
			0,
		),
	])
		state = registerStock(state, item);
	for (const recipe of [
		{
			recipeId: "recipe-daily-food",
			name: "prepare-daily-food",
			durationSeconds: 3_600,
			laborSeconds: 7_200,
			requiredCapabilities: [
				{
					capabilityId: "craft",
					levelBasisPoints: 5_000,
					sourceEventIds: [],
				},
			],
			requiredBuildingKinds: [],
			inputs: [{ resourceTypeId: "grain", quantity: 32 }],
			outputs: [{ resourceTypeId: "food", quantity: 32 }],
			byproducts: [],
		},
		{
			recipeId: "recipe-daily-water",
			name: "draw-daily-water",
			durationSeconds: 3_600,
			laborSeconds: 5_400,
			requiredCapabilities: [
				{
					capabilityId: "water",
					levelBasisPoints: 5_000,
					sourceEventIds: [],
				},
			],
			requiredBuildingKinds: [],
			inputs: [{ resourceTypeId: "spring-water", quantity: 40 }],
			outputs: [{ resourceTypeId: "water", quantity: 40 }],
			byproducts: [],
		},
		{
			recipeId: "recipe-building-timber",
			name: "prepare-building-timber",
			durationSeconds: 7_200,
			laborSeconds: 7_200,
			requiredCapabilities: [
				{
					capabilityId: "forestry",
					levelBasisPoints: 5_000,
					sourceEventIds: [],
				},
			],
			requiredBuildingKinds: [],
			inputs: [{ resourceTypeId: "standing-timber", quantity: 8 }],
			outputs: [{ resourceTypeId: "timber", quantity: 8 }],
			byproducts: [],
		},
	] as const)
		state = registerRecipe(state, recipe);
	if (conditions.expansionEligible) {
		const project = projectRecord(
			conditions.originSettlementId,
			workSite.siteId,
			citizenId(0),
		);
		state = registerProject(
			state,
			project,
			storage(
				project.storageId,
				workSite.siteId,
				{ kind: "project", projectId: project.projectId },
				["timber"],
			),
		);
		state = registerStock(
			state,
			stock(
				"stock-project-timber",
				project.storageId,
				{ kind: "project", projectId: project.projectId },
				"timber",
				0,
			),
		);
	}
	const traversalUnits = Math.max(
		1,
		Math.ceil(supplyRoute.distanceMillimeters / 1_000),
	);
	const commonLane = {
		routeId: supplyRoute.routeId,
		traversalUnits,
		laborSecondsPerTraversalUnit: 10,
		minimumCapabilityBasisPoints: 5_000,
	} as const;
	const schedulerPolicy: GeneralizedSchedulerPolicy = {
		schemaVersion: CIVILIZATION_SCHEDULER_SCHEMA_VERSION,
		stepSeconds: SECONDS_PER_DAY,
		foodResourceTypeIds: ["food"],
		waterResourceTypeIds: ["water"],
		needStockIdsByCitizen: Object.fromEntries(
			Array.from({ length: POPULATION }, (_, index) => [
				citizenId(index),
				["stock-origin-food", "stock-origin-water"],
			]),
		),
		transportLanes: [
			{
				...commonLane,
				laneId: "lane-daily-grain",
				fromStockId: "stock-source-grain",
				toStockId: "stock-work-grain",
				carrierCitizenId: citizenId(4),
				capacityUnitsPerStep: 32,
				requiredCapabilityId: "haul",
			},
			{
				...commonLane,
				laneId: "lane-daily-water",
				fromStockId: "stock-source-spring-water",
				toStockId: "stock-work-spring-water",
				carrierCitizenId: citizenId(5),
				capacityUnitsPerStep: 40,
				requiredCapabilityId: "haul",
			},
			{
				...commonLane,
				laneId: "lane-building-timber",
				fromStockId: "stock-source-standing-timber",
				toStockId: "stock-work-standing-timber",
				carrierCitizenId: citizenId(6),
				capacityUnitsPerStep: 8,
				requiredCapabilityId: "haul",
			},
		],
		productionJobs: [
			{
				jobId: "job-daily-food",
				recipeId: "recipe-daily-food",
				siteId: workSite.siteId,
				participantCitizenIds: [citizenId(1)],
				binding: {
					inputStockIds: { grain: "stock-work-grain" },
					outputStockIds: { food: "stock-origin-food" },
				},
				outputStockId: "stock-origin-food",
				targetQuantity: 64,
				inputLaneIds: ["lane-daily-grain"],
			},
			{
				jobId: "job-daily-water",
				recipeId: "recipe-daily-water",
				siteId: workSite.siteId,
				participantCitizenIds: [citizenId(2)],
				binding: {
					inputStockIds: { "spring-water": "stock-work-spring-water" },
					outputStockIds: { water: "stock-origin-water" },
				},
				outputStockId: "stock-origin-water",
				targetQuantity: 80,
				inputLaneIds: ["lane-daily-water"],
			},
			{
				jobId: "job-building-timber",
				recipeId: "recipe-building-timber",
				siteId: workSite.siteId,
				participantCitizenIds: [citizenId(3)],
				binding: {
					inputStockIds: {
						"standing-timber": "stock-work-standing-timber",
					},
					outputStockIds: { timber: "stock-origin-timber" },
				},
				outputStockId: "stock-origin-timber",
				targetQuantity: 12,
				inputLaneIds: ["lane-building-timber"],
			},
		],
		collectiveProjects: conditions.expansionEligible
			? [
					{
						projectId: "project-expedition-kit",
						actorCitizenId: citizenId(0),
						buildingKind: "expedition-cache",
					},
				]
			: [],
		demographicRules: [],
		maxDemographicTransitionsPerStep: 1,
	};
	return { state, schedulerPolicy };
}

/** Reconstructs the versioned model-free scheduler policy from canonical world bytes. */
export function deriveCivilizationSchedulerPolicy(
	world: GeneratedWorldState,
): GeneralizedSchedulerPolicy {
	return bootstrapCivilization(world, deriveCivilizationSeedConditions(world))
		.schedulerPolicy;
}

function activityKind(activityKinds: readonly string[]): {
	readonly kind: CivilizationScheduledActivity["canonicalAction"]["kind"];
	readonly prop: CivilizationScheduledActivity["carriedProp"];
} {
	if (activityKinds.includes("gather")) return { kind: "gather", prop: "logs" };
	if (activityKinds.includes("store")) return { kind: "carry", prop: "grain" };
	if (activityKinds.includes("work")) return { kind: "repair", prop: "tool" };
	if (activityKinds.includes("rest"))
		return { kind: "eat-rest", prop: "water" };
	if (activityKinds.includes("meet") || activityKinds.includes("rendezvous"))
		return { kind: "talk", prop: null };
	return { kind: "inspect", prop: null };
}

function initialRoutineAssignments(
	state: CivilizationState,
): readonly SchedulerRoutineAssignment[] {
	return Object.values(state.citizens)
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
		.map((citizen) => ({
			schemaVersion: "eonfolk-civilization-routine-v1" as const,
			routineId: `routine:0:${citizen.citizenId}`,
			citizenId: citizen.citizenId,
			kind: "social-maintenance" as const,
			subjectId: citizen.citizenId,
			assignedAtSimulationTime: 0,
			route: null,
		}));
}

function visualLifecycleFor(
	state: CivilizationState,
	index: number,
	kind: "route" | "work" | "social" | "rest",
	travelKind: "walk" | "carry" | null,
	performKind: CivilizationVisualLifecycle["performKind"],
	routineKind: SchedulerRoutineAssignment["kind"],
): CivilizationVisualLifecycle {
	const dayEnd = state.simulationTime;
	const dayStart = Math.max(0, dayEnd - SECONDS_PER_DAY);
	const span = Math.max(1, dayEnd - dayStart);
	const stagger = Math.trunc((span * (index % 8)) / 96);
	const start = Math.min(dayEnd, dayStart + stagger);
	const fractions =
		kind === "route"
			? { travel: 0.58, perform: 0.08 }
			: kind === "social"
				? { travel: 0.14, perform: 0.22 }
				: kind === "rest"
					? { travel: 0.16, perform: 0.34 }
					: { travel: 0.22, perform: 0.46 };
	const travelEnd = Math.min(
		dayEnd,
		start + Math.max(1, Math.round(span * fractions.travel)),
	);
	const performEnd = Math.min(
		dayEnd,
		travelEnd + Math.max(1, Math.round(span * fractions.perform)),
	);
	const simulationEnd = Math.min(
		dayEnd,
		performEnd + Math.max(1, Math.round(span * 0.08)),
	);
	return Object.freeze({
		dayStart: start,
		travelEnd,
		performEnd,
		simulationEnd,
		travelKind,
		performKind,
		routineKind,
	});
}

function recentlyInConversation(
	state: CivilizationState,
	citizenId: string,
): boolean {
	const citizen = state.citizens[citizenId];
	if (citizen === undefined || citizen.lastSocialSimulationTime <= 0)
		return false;
	return (
		state.simulationTime - citizen.lastSocialSimulationTime <
		SOCIAL_CONTACT_COOLDOWN_SECONDS
	);
}

function applyConversationRecency(
	state: CivilizationState,
	activities: readonly CivilizationScheduledActivity[],
): CivilizationState {
	const seen = new Set<string>();
	let next = state;
	for (const activity of activities) {
		if (
			(activity.canonicalAction.kind !== "talk" &&
				activity.canonicalAction.kind !== "listen") ||
			activity.canonicalAction.targetId === null
		)
			continue;
		const pair = [activity.citizenId, activity.canonicalAction.targetId]
			.sort()
			.join("+");
		if (seen.has(pair)) continue;
		seen.add(pair);
		next = recordSocialContact(next, {
			fromCitizenId: activity.citizenId,
			toCitizenId: activity.canonicalAction.targetId,
			atSimulationTime: state.simulationTime,
		});
	}
	return next;
}

function preferredActivityKinds(
	routine: SchedulerRoutineAssignment,
): readonly string[] {
	switch (routine.kind) {
		case "produce":
			return ["work", "gather"];
		case "transport":
			return ["store", "work"];
		case "construct":
			return ["work"];
		case "consume":
			return ["rest"];
		case "social-maintenance":
			return ["meet", "rendezvous"];
		case "travel":
			return ["store"];
		case "away":
			return [];
	}
}

function carriedPropForRoutine(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	routine: SchedulerRoutineAssignment,
): CivilizationScheduledActivity["carriedProp"] {
	if (routine.kind !== "transport") return null;
	const lane = policy.transportLanes.find(
		(candidate) => candidate.laneId === routine.subjectId,
	);
	const resourceTypeId =
		lane === undefined
			? undefined
			: state.stocks[lane.fromStockId]?.resourceTypeId;
	if (resourceTypeId === "grain") return "grain";
	if (resourceTypeId === "water" || resourceTypeId === "spring-water")
		return "water";
	if (resourceTypeId === "timber" || resourceTypeId === "standing-timber")
		return "logs";
	return "trade";
}

function scheduleActivities(
	state: CivilizationState,
	world: GeneratedWorldState,
	routines: readonly SchedulerRoutineAssignment[],
	policy: GeneralizedSchedulerPolicy,
): readonly CivilizationScheduledActivity[] {
	const slots = values(world.interactionSlots).sort((left, right) =>
		left.interactionSlotId.localeCompare(right.interactionSlotId),
	);
	const occupancy = new Map<string, number>();
	const mutualSocial = new Map<
		string,
		Readonly<{
			partnerCitizenId: string;
			interactionSlotId: string;
			affordanceSlotIndex: number;
			kind: "talk" | "listen";
		}>
	>();
	const routinesByCitizen = new Map(
		routines.map((routine) => [routine.citizenId, routine]),
	);
	const paired = new Set<string>();
	const dayNumber = Math.floor(state.simulationTime / SECONDS_PER_DAY);
	const conversationsToday = dayNumber % 2 === 1;
	for (const relationship of Object.values(state.relationships).sort(
		(left, right) => left.relationshipId.localeCompare(right.relationshipId),
	)) {
		const first = state.citizens[relationship.fromCitizenId];
		const second = state.citizens[relationship.toCitizenId];
		const firstRoutine = routinesByCitizen.get(relationship.fromCitizenId);
		const secondRoutine = routinesByCitizen.get(relationship.toCitizenId);
		if (
			first === undefined ||
			second === undefined ||
			first.citizenId === second.citizenId ||
			first.residenceState !== "resident" ||
			second.residenceState !== "resident" ||
			first.settlementId !== second.settlementId ||
			first.siteId !== second.siteId ||
			firstRoutine?.kind !== "social-maintenance" ||
			secondRoutine?.kind !== "social-maintenance" ||
			firstRoutine.subjectId !== second.citizenId ||
			secondRoutine.subjectId !== first.citizenId ||
			!conversationsToday ||
			recentlyInConversation(state, first.citizenId) ||
			recentlyInConversation(state, second.citizenId) ||
			paired.has(first.citizenId) ||
			paired.has(second.citizenId)
		)
			continue;
		const slot = slots.find(
			(candidate) =>
				candidate.siteId === first.siteId &&
				candidate.capacity -
					(occupancy.get(candidate.interactionSlotId) ?? 0) >=
					2 &&
				candidate.activityKinds.some((kind) =>
					["meet", "rendezvous"].includes(kind),
				),
		);
		if (slot === undefined) continue;
		const firstSlotIndex = occupancy.get(slot.interactionSlotId) ?? 0;
		occupancy.set(slot.interactionSlotId, firstSlotIndex + 2);
		const orderedIds = [first.citizenId, second.citizenId].sort();
		for (const [index, citizenIdValue] of orderedIds.entries()) {
			const partnerCitizenId = required(
				orderedIds[index === 0 ? 1 : 0],
				"mutual social partner",
			);
			mutualSocial.set(citizenIdValue, {
				partnerCitizenId,
				interactionSlotId: slot.interactionSlotId,
				affordanceSlotIndex: firstSlotIndex + index,
				kind: index === 0 ? "talk" : "listen",
			});
			paired.add(citizenIdValue);
		}
	}
	return Object.values(state.citizens)
		.filter((citizen) => citizen.residenceState === "resident")
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
		.flatMap((citizen, index): CivilizationScheduledActivity[] => {
			const routine = required(
				routines.find((candidate) => candidate.citizenId === citizen.citizenId),
				`routine for ${citizen.citizenId}`,
			);
			const social = mutualSocial.get(citizen.citizenId);
			if (social !== undefined) {
				const lifecycle = visualLifecycleFor(
					state,
					index,
					"social",
					"walk",
					social.kind,
					routine.kind,
				);
				return [
					{
						schemaVersion: "eonfolk-generated-spatial-activity-v1" as const,
						citizenId: citizen.citizenId,
						routine,
						canonicalAction: {
							actionId: `scheduled:${state.revision}:${citizen.citizenId}:${social.interactionSlotId}:${social.partnerCitizenId}`,
							sourceKind: "current-behavior" as const,
							eventId: null,
							eventSequence: null,
							status: "in-progress" as const,
							kind: social.kind,
							originPlaceId: citizen.siteId,
							destinationPlaceId: citizen.siteId,
							affordanceId: social.interactionSlotId,
							affordanceSlotIndex: social.affordanceSlotIndex,
							targetId: social.partnerCitizenId,
							simulationStart: lifecycle.dayStart,
							simulationEnd: lifecycle.simulationEnd,
							resultEventId: null,
						},
						location: {
							kind: "interaction-slot" as const,
							interactionSlotId: social.interactionSlotId,
						},
						projectId: null,
						carriedProp: null,
						focal: index === 0,
						visualLifecycle: lifecycle,
					},
				];
			}
			const route =
				routine.route === null
					? undefined
					: world.routes[routine.route.routeId]?.value;
			const isGroundedRoute =
				routine.route !== null &&
				route !== undefined &&
				citizen.siteId === route.fromSiteId &&
				routine.route.fromSiteId === route.fromSiteId &&
				routine.route.toSiteId === route.toSiteId;
			if (isGroundedRoute && routine.route !== null && route !== undefined) {
				const isTransport = routine.kind === "transport";
				const travelKind = isTransport ? ("carry" as const) : ("walk" as const);
				const lifecycle = visualLifecycleFor(
					state,
					index,
					"route",
					travelKind,
					travelKind,
					routine.kind,
				);
				return [
					{
						schemaVersion: "eonfolk-generated-spatial-activity-v1" as const,
						citizenId: citizen.citizenId,
						routine,
						canonicalAction: {
							actionId: `scheduled:${state.revision}:${citizen.citizenId}:${route.routeId}`,
							sourceKind: "current-behavior" as const,
							eventId: null,
							eventSequence: null,
							status: "in-progress" as const,
							kind: travelKind,
							originPlaceId: route.fromSiteId,
							destinationPlaceId: route.toSiteId,
							affordanceId: route.routeId,
							affordanceSlotIndex: 0,
							targetId: routine.subjectId,
							simulationStart: lifecycle.dayStart,
							simulationEnd: lifecycle.simulationEnd,
							resultEventId: null,
						},
						location: {
							kind: "route" as const,
							routeId: route.routeId,
							progressBasisPoints:
								1 +
								((state.revision + index + routine.route.traversalUnits) %
									9_999),
						},
						projectId: null,
						carriedProp: carriedPropForRoutine(state, policy, routine),
						focal: index === 0,
						visualLifecycle: lifecycle,
					},
				];
			}
			const siteSlots = slots.filter((slot) => slot.siteId === citizen.siteId);
			const preferred = preferredActivityKinds(routine);
			const available = (candidate: (typeof siteSlots)[number]) =>
				(occupancy.get(candidate.interactionSlotId) ?? 0) < candidate.capacity;
			const matchingPreferred = siteSlots.filter(
				(candidate) =>
					available(candidate) &&
					candidate.activityKinds.some((kind) => preferred.includes(kind)),
			);
			const matchingAvailable = siteSlots.filter(available);
			const pool =
				matchingPreferred.length > 0 ? matchingPreferred : matchingAvailable;
			if (pool.length === 0) return [];
			const slot = required(
				pool[(dayNumber + index) % pool.length],
				`activity slot for ${citizen.citizenId}`,
			);
			const affordanceSlotIndex = occupancy.get(slot.interactionSlotId) ?? 0;
			occupancy.set(slot.interactionSlotId, affordanceSlotIndex + 1);
			const slotActivity = activityKind(slot.activityKinds);
			const readable =
				slotActivity.kind === "talk"
					? ({ kind: "inspect", prop: null } as const)
					: slotActivity;
			const project = Object.values(state.projects)
				.filter(
					(candidate) =>
						candidate.siteId === citizen.siteId &&
						candidate.participantCitizenIds.includes(citizen.citizenId) &&
						!["failed", "abandoned"].includes(candidate.state),
				)
				.sort((left, right) =>
					left.projectId.localeCompare(right.projectId),
				)[0];
			const lifecycle = visualLifecycleFor(
				state,
				index,
				readable.kind === "eat-rest" ? "rest" : "work",
				"walk",
				readable.kind,
				routine.kind,
			);
			return [
				{
					schemaVersion: "eonfolk-generated-spatial-activity-v1" as const,
					citizenId: citizen.citizenId,
					routine,
					canonicalAction: {
						actionId: `scheduled:${state.revision}:${citizen.citizenId}:${slot.interactionSlotId}`,
						sourceKind: "current-behavior" as const,
						eventId: null,
						eventSequence: null,
						status: "in-progress" as const,
						kind: readable.kind,
						originPlaceId: citizen.siteId,
						destinationPlaceId: citizen.siteId,
						affordanceId: slot.interactionSlotId,
						affordanceSlotIndex,
						targetId: project?.projectId ?? null,
						simulationStart: lifecycle.dayStart,
						simulationEnd: lifecycle.simulationEnd,
						resultEventId: null,
					},
					location: {
						kind: "interaction-slot" as const,
						interactionSlotId: slot.interactionSlotId,
					},
					projectId: project?.projectId ?? null,
					carriedProp: readable.prop,
					focal: index === 0,
					visualLifecycle: lifecycle,
				},
			];
		});
}

/**
 * Projects the scheduler's committed routine assignments into the same typed
 * activities used by Release Genesis presentation. This is deterministic
 * projection, not a second behavior authority.
 */
export function projectCivilizationScheduledActivities(input: {
	readonly state: CivilizationState;
	readonly world: GeneratedWorldState;
	readonly routines: readonly SchedulerRoutineAssignment[];
}): readonly CivilizationScheduledActivity[] {
	return scheduleActivities(
		input.state,
		input.world,
		input.routines,
		deriveCivilizationSchedulerPolicy(input.world),
	);
}

interface CivilizationCognitionRuntime {
	readonly minds: Readonly<Record<string, CivilizationSchedulerMindState>>;
	readonly priorOutcomes: Readonly<
		Record<string, "completed" | "blocked" | null>
	>;
}

function plannedRoutine(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	citizenIdValue: string,
): CivilizationRoutineResolution {
	const project = policy.collectiveProjects.find(
		(candidate) => candidate.actorCitizenId === citizenIdValue,
	);
	if (project !== undefined)
		return { kind: "construct", subjectId: project.projectId };
	const job = policy.productionJobs.find((candidate) =>
		candidate.participantCitizenIds.includes(citizenIdValue),
	);
	if (job !== undefined) return { kind: "produce", subjectId: job.jobId };
	const lane = policy.transportLanes.find(
		(candidate) => candidate.carrierCitizenId === citizenIdValue,
	);
	if (lane !== undefined) return { kind: "transport", subjectId: lane.laneId };
	const citizen = required(
		state.citizens[citizenIdValue],
		`cognition citizen ${citizenIdValue}`,
	);
	if (citizen.residenceState === "travelling") {
		const migration = Object.values(state.migrations).find((candidate) =>
			candidate.citizenIds.includes(citizenIdValue),
		);
		if (migration !== undefined)
			return { kind: "travel", subjectId: migration.migrationId };
	}
	if (citizen.residenceState === "departed")
		return { kind: "away", subjectId: citizenIdValue };
	return { kind: "social-maintenance", subjectId: citizenIdValue };
}

function initialStandingPlan(input: {
	readonly citizenId: string;
	readonly routine: CivilizationRoutineResolution;
}): StandingPlan {
	const steps = Array.from({ length: 2 }, (_, index) => ({
		stepId: `plan:${input.citizenId}:step:${String(index + 1)}`,
		kind:
			input.routine.kind === "produce"
				? "Produce"
				: input.routine.kind === "transport"
					? "TransportResource"
					: input.routine.kind === "construct"
						? "WorkProject"
						: input.routine.kind === "consume"
							? "Consume"
							: input.routine.kind === "travel"
								? "JoinMigration"
								: input.routine.kind === "away"
									? "Away"
									: "SocialMaintenance",
		targetIds: [input.routine.subjectId],
		status: index === 0 ? ("active" as const) : ("pending" as const),
		children: [],
	}));
	return {
		planId: `plan:${input.citizenId}:daily-routine`,
		version: 1,
		citizenId: input.citizenId,
		goalType: `routine:${input.routine.kind}`,
		targetIds: [input.routine.subjectId],
		steps,
		currentStepId: steps[0]!.stepId,
		commitmentId: null,
		sourceId: CIVILIZATION_SCHEDULER_BRAIN_VERSION,
		startBoundary: 0,
		expiryBoundary: 30 * SECONDS_PER_DAY,
		retriesRemaining: 1,
		replansRemaining: 2,
		status: "active",
	};
}

async function initializeCognitionRuntime(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	worldIdentityHash: string,
): Promise<CivilizationCognitionRuntime> {
	const minds: Record<string, CivilizationSchedulerMindState> = {};
	for (const citizen of Object.values(state.citizens).sort((left, right) =>
		left.citizenId.localeCompare(right.citizenId),
	)) {
		const routine = plannedRoutine(state, policy, citizen.citizenId);
		let memoryStore = createMemoryStore(citizen.citizenId);
		const waterLane = policy.transportLanes.find(
			(lane) =>
				lane.carrierCitizenId === citizen.citizenId &&
				state.stocks[lane.toStockId]?.resourceTypeId === "spring-water",
		);
		if (waterLane !== undefined) {
			memoryStore = remember(memoryStore, {
				schemaVersion: MEMORY_SCHEMA_VERSION,
				memoryId: `memory:${citizen.citizenId}:water-reserve`,
				ownerCitizenId: citizen.citizenId,
				kind: "semantic",
				proposition: "The settlement has only one day of prepared water.",
				cueIds: ["need", `transport:${waterLane.laneId}`],
				relatedCitizenIds: [],
				goalId: null,
				commitmentId: null,
				salienceBasisPoints: 9_000,
				confidenceBasisPoints: 9_000,
				createdAtSimulationTime: 0,
				reinforcedAtSimulationTime: 0,
				createdRevision: 0,
				sourceIds: [waterLane.toStockId],
				visibility: {
					kind: "citizen-private",
					subjectCitizenId: citizen.citizenId,
				},
				provenanceVersion: "memory-provenance-v1",
			});
		}
		// One salient outgoing relationship is sufficient for the bounded counsel
		// decision. The full social graph remains canonical Reality rather than
		// being duplicated into every citizen's daily Mind checkpoint.
		const relationships: CitizenMindSnapshot["relationships"] = Object.values(
			state.relationships,
		)
			.filter(({ fromCitizenId }) => fromCitizenId === citizen.citizenId)
			.sort((left, right) =>
				left.relationshipId.localeCompare(right.relationshipId),
			)
			.slice(0, 1)
			.map((relationship) => ({
				relationshipId: relationship.relationshipId,
				fromCitizenId: relationship.fromCitizenId,
				toCitizenId: relationship.toCitizenId,
				familiarity: relationship.familiarityBasisPoints,
				trust: relationship.trustBasisPoints,
				strain: relationship.strainBasisPoints,
				lastMaterialEventId: null,
				visibility: {
					kind: "citizen-private" as const,
					subjectCitizenId: citizen.citizenId,
				},
				createdRevision: state.revision,
			}));
		const values = citizen.valueIds.slice(0, 3).map((valueId, index) => ({
			valueId,
			rank: (index + 1) as 1 | 2 | 3,
			weight: Math.max(1_000, 3_000 - index * 500),
		}));
		minds[citizen.citizenId] = {
			actorMind: {
				citizenId: citizen.citizenId,
				values,
				relationships,
				records: [],
				standingPlan: initialStandingPlan({
					citizenId: citizen.citizenId,
					routine,
				}),
			},
			memoryStore,
			prngState: await seedPrng(
				bytesFromHex(worldIdentityHash, 32),
				"civilization-standard-brain",
				citizen.citizenId,
				"scheduler-boundary",
			),
			decisionOrdinal: 0,
		};
	}
	return {
		minds,
		priorOutcomes: Object.fromEntries(
			Object.keys(minds).map((id) => [id, null]),
		),
	};
}

function routineFromPlan(plan: StandingPlan): CivilizationRoutineResolution {
	const step = required(
		plan.steps.find(({ stepId }) => stepId === plan.currentStepId),
		`current step for ${plan.planId}`,
	);
	const subjectId = required(step.targetIds[0], `target for ${step.stepId}`);
	switch (step.kind) {
		case "Produce":
			return { kind: "produce", subjectId };
		case "TransportResource":
			return { kind: "transport", subjectId };
		case "WorkProject":
			return { kind: "construct", subjectId };
		case "Consume":
			return { kind: "consume", subjectId };
		case "JoinMigration":
			return { kind: "travel", subjectId };
		case "Away":
			return { kind: "away", subjectId };
		case "SocialMaintenance":
			return { kind: "social-maintenance", subjectId };
		default:
			throw new Error(`unknown scheduler plan step ${step.kind}`);
	}
}

function advanceSchedulerMindPlans(
	runtime: CivilizationCognitionRuntime,
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	boundary: number,
): CivilizationCognitionRuntime {
	const minds: Record<string, CivilizationSchedulerMindState> = {};
	for (const [citizenId, mind] of Object.entries(runtime.minds).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const routine = plannedRoutine(state, policy, citizenId);
		const refreshed = initialStandingPlan({ citizenId, routine });
		minds[citizenId] = {
			...mind,
			actorMind: {
				...mind.actorMind,
				standingPlan: {
					...refreshed,
					planId: mind.actorMind.standingPlan.planId,
					version: mind.actorMind.standingPlan.version + 1,
					startBoundary: boundary,
					expiryBoundary: boundary + SECONDS_PER_DAY,
				},
			},
		};
	}
	return { ...runtime, minds };
}

function cognitionOptions(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	mind: CivilizationSchedulerMindState,
): readonly CivilizationRoutineOption[] {
	const planRoutine = routineFromPlan(mind.actorMind.standingPlan);
	const options: CivilizationRoutineOption[] = [
		{
			entry: {
				actionId: `follow:${mind.actorMind.standingPlan.planId}`,
				action: {
					kind: "FollowStandingPlan",
					planId: mind.actorMind.standingPlan.planId,
				},
				publicPreconditions: ["the current step remains legal"],
				publicStakes: ["continues the citizen's existing commitment"],
				tags: [],
				evidenceRecordIds: [],
				relationshipId: null,
				risk: 0,
				counselAffinity: "neutral",
			},
			routine: planRoutine,
		},
	];
	const waterLane = policy.transportLanes.find(
		(lane) =>
			lane.carrierCitizenId === mind.actorMind.citizenId &&
			state.stocks[lane.toStockId]?.resourceTypeId === "spring-water",
	);
	const memoryId = `memory:${mind.actorMind.citizenId}:water-reserve`;
	if (waterLane !== undefined && mind.decisionOrdinal === 0) {
		const from = required(state.stocks[waterLane.fromStockId], "water source");
		const to = required(state.stocks[waterLane.toStockId], "water destination");
		options.push({
			entry: {
				actionId: `transport:${waterLane.laneId}`,
				action: {
					kind: "TransportResource",
					resourceTypeId: from.resourceTypeId,
					quantity: waterLane.capacityUnitsPerStep,
					fromStorageId: from.storageId,
					toStorageId: to.storageId,
				},
				publicPreconditions: ["water route and source stock are visible"],
				publicStakes: ["delays the current plan to protect daily water"],
				tags: ["need", "evidence"],
				evidenceRecordIds: [memoryId],
				relationshipId: null,
				risk: 100,
				counselAffinity: "neutral",
			},
			routine: { kind: "transport", subjectId: waterLane.laneId },
		});
	}
	return options;
}

async function decideOpeningRoutines(input: {
	readonly state: CivilizationState;
	readonly policy: GeneralizedSchedulerPolicy;
	readonly runtime: CivilizationCognitionRuntime;
	readonly worldIdentityHash: string;
	readonly cognition?: CivilizationExperimentCognitionOptions;
}): Promise<{
	readonly runtime: CivilizationCognitionRuntime;
	readonly decisions: readonly SchedulerRoutineDecision[];
	readonly evidence: readonly CivilizationSchedulerDecisionEvidence[];
}> {
	const minds: Record<string, CivilizationSchedulerMindState> = {
		...input.runtime.minds,
	};
	const decisions: SchedulerRoutineDecision[] = [];
	const evidence: CivilizationSchedulerDecisionEvidence[] = [];
	const visibilityContext = {
		policyVersion: VISIBILITY_POLICY_VERSION,
		covenants: [],
		localOwnerPrincipalId: "local-owner",
		nonproduction: false,
	} as const;
	for (const actorId of Object.keys(minds).sort()) {
		const mind = required(minds[actorId], `scheduler mind ${actorId}`);
		const fallbackRoutine = routineFromPlan(mind.actorMind.standingPlan);
		const result = await decideCivilizationSchedulerRoutine({
			state: mind,
			runId: `civilization:${input.worldIdentityHash}`,
			regionId: "release-genesis-region",
			revision: input.state.revision,
			simulationTime: input.state.simulationTime,
			visibilityContext,
			options: cognitionOptions(input.state, input.policy, mind),
			fallbackRoutine,
			priorOutcome: input.runtime.priorOutcomes[actorId] ?? null,
			...(input.cognition?.decisionGateway === undefined
				? {}
				: { decisionGateway: input.cognition.decisionGateway }),
		});
		minds[actorId] = result.state;
		evidence.push(result.evidence);
		decisions.push({
			schemaVersion: "eonfolk-civilization-routine-decision-v1",
			citizenId: actorId,
			actionId: result.evidence.selectedActionId,
			activeStandingPlanId: result.evidence.planId,
			kind: result.evidence.routine.kind,
			subjectId: result.evidence.routine.subjectId,
		});
	}
	return {
		runtime: { ...input.runtime, minds },
		decisions,
		evidence,
	};
}

function routineOutcome(
	decision: SchedulerRoutineDecision,
	actions: readonly SchedulerAction[],
	routines: readonly SchedulerRoutineAssignment[],
): "completed" | "blocked" {
	if (
		decision.kind === "produce" &&
		actions.some(
			(action) =>
				(action.kind === "process-started" ||
					action.kind === "process-completed") &&
				action.subjectId.includes(decision.subjectId),
		)
	)
		return "completed";
	if (
		decision.kind === "transport" &&
		actions.some(
			(action) =>
				action.kind === "transported" &&
				action.subjectId === decision.subjectId,
		)
	)
		return "completed";
	if (
		decision.kind === "construct" &&
		actions.some(
			(action) =>
				action.kind.startsWith("project-") &&
				action.subjectId === decision.subjectId,
		)
	)
		return "completed";
	if (
		decision.kind === "consume" &&
		actions.some(
			(action) =>
				action.kind === "need-evaluated" &&
				action.subjectId === decision.citizenId,
		)
	)
		return "completed";
	if (["produce", "transport", "construct"].includes(decision.kind))
		return "blocked";
	return routines.some(
		(routine) =>
			routine.citizenId === decision.citizenId &&
			routine.kind === decision.kind &&
			routine.subjectId === decision.subjectId,
	)
		? "completed"
		: "blocked";
}

async function stateHash(
	state: CivilizationState,
	worldStateHash: string,
	activities: readonly CivilizationScheduledActivity[],
): Promise<string> {
	return domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-STATE:v7", {
		activities,
		civilization: state,
		worldStateHash,
	});
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
		"EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v7",
		body,
	);
	return {
		...body,
		eventId: `civilization-event:${input.eventIndex}:${eventHash.slice(0, 16)}`,
		eventHash,
	};
}

function projectTimberConsumed(state: CivilizationState): number {
	return (
		state.projects["project-expedition-kit"]?.milestones.reduce(
			(total, milestone) =>
				total +
				milestone.resources
					.filter(({ resourceTypeId }) => resourceTypeId === "timber")
					.reduce(
						(resourceTotal, resource) =>
							resourceTotal + resource.consumedQuantity,
						0,
					),
			0,
		) ?? 0
	);
}

function averagePressures(
	state: CivilizationState,
): CivilizationExperimentMetrics["averagePressureBasisPointsByKind"] {
	const kinds = [
		"food",
		"water",
		"housing",
		"labor",
		"travel",
		"social",
	] as const;
	const habitableBuildingIds = Object.values(state.households)
		.map(({ dwellingBuildingId }) => dwellingBuildingId)
		.filter((buildingId): buildingId is string => buildingId !== null);
	const samples = Object.values(state.citizens).flatMap((citizen) =>
		citizen.residenceState === "departed"
			? []
			: deriveCanonicalPressures(
					state,
					citizen.citizenId,
					{
						foodResourceTypeIds: ["food"],
						waterResourceTypeIds: ["water"],
						habitableBuildingIds,
						quantityObservationGranularity: 1,
						socialIntervalSeconds: SECONDS_PER_DAY,
					},
					state.simulationTime,
				),
	);
	return Object.fromEntries(
		kinds.map((kind) => {
			const values = samples
				.filter((sample) => sample.kind === kind)
				.map(({ severityBasisPoints }) => severityBasisPoints);
			return [kind, average(values)];
		}),
	) as CivilizationExperimentMetrics["averagePressureBasisPointsByKind"];
}

function metrics(
	state: CivilizationState,
	horizonDays: number,
	conditions: CivilizationExperimentSeedConditions,
	cognitionDecisions: readonly CivilizationSchedulerDecisionEvidence[],
): CivilizationExperimentMetrics {
	const audit = auditCivilizationState(state);
	const projects = Object.values(state.projects);
	const migrations = Object.values(state.migrations);
	const viableFoundings = Object.values(state.foundings).filter(
		(founding) => founding.state === "viable",
	).length;
	const materializedSettlements = Object.keys(
		state.materializedFoundings,
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
	else if (materializedSettlements > 0)
		outcomeReason = "canonical-second-settlement-materialized";
	else if (viableFoundings > 0) outcomeReason = "physical-founding-viable";
	else if (migrations.length > 0) outcomeReason = "physical-expansion-underway";
	const residents = Object.values(state.citizens).filter(
		(citizen) => citizen.residenceState === "resident",
	).length;
	const travelling = Object.values(state.citizens).filter(
		(citizen) => citizen.residenceState === "travelling",
	).length;
	const departed = Object.values(state.citizens).filter(
		(citizen) => citizen.residenceState === "departed",
	).length;
	return {
		horizonDays,
		simulationTime: state.simulationTime,
		revision: state.revision,
		population: residents + travelling,
		residentPopulation: residents,
		travellingPopulation: travelling,
		departedPopulation: departed,
		householdCount: Object.keys(state.households).length,
		relationshipCount: Object.keys(state.relationships).length,
		averagePressureBasisPointsByKind: averagePressures(state),
		stockTotalsByResource: audit.stockTotalsByResource,
		completedProductionRuns: state.schedulerTotals.completedProductionRuns,
		consumedNeedUnits: state.schedulerTotals.consumedNeedUnits,
		transportedResourceUnits: state.schedulerTotals.transportedResourceUnits,
		groundedNeedOutcomes: state.schedulerTotals.groundedNeedOutcomes,
		unmetNeedUnits: state.schedulerTotals.unmetNeedUnits,
		agreementGatedInstitutionProjects: projects.filter(
			(project) =>
				project.state === "completed" && project.sponsor.kind === "institution",
		).length,
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
		materializedSettlements,
		outcome,
		outcomeReason,
		invariantIssues: audit.issues,
		standardBrainDecisionCount: cognitionDecisions.length,
		standingPlanTransitionCount: cognitionDecisions.filter(
			({ planTransition }) => planTransition !== "continued",
		).length,
		memoryRetrievedDecisionCount: cognitionDecisions.filter(
			({ retrievedMemoryIds }) => retrievedMemoryIds.length > 0,
		).length,
		modelInvocations: 0,
	};
}

export interface CivilizationExperimentCognitionOptions {
	readonly decisionGateway: CivilizationSchedulerDecisionGateway;
}

interface CivilizationExperimentDayWork {
	state: CivilizationState;
	world: GeneratedWorldState;
	worldStateHash: string;
	routines: readonly SchedulerRoutineAssignment[];
	activities: readonly CivilizationScheduledActivity[];
	cognitionRuntime: CivilizationCognitionRuntime;
	expansionDeferralRecorded: boolean;
	projectStallRecorded: boolean;
	events: CivilizationExperimentEvent[];
	priorEventHash: string | null;
	priorStateHash: string;
	cognitionDecisions: CivilizationSchedulerDecisionEvidence[];
	eventIndexBase: number;
}

export interface ContinuedCivilizationDay {
	readonly world: GeneratedWorldState;
	readonly state: CivilizationState;
	readonly activities: readonly CivilizationScheduledActivity[];
	readonly step: CivilizationExperimentStep;
	readonly events: readonly CivilizationExperimentEvent[];
	readonly finalStateHash: string;
}

async function simulateCivilizationExperimentDay(input: {
	readonly day: number;
	readonly work: CivilizationExperimentDayWork;
	readonly schedulerPolicy: GeneralizedSchedulerPolicy;
	readonly conditions: CivilizationExperimentSeedConditions;
	readonly worldIdentityHash: string;
	readonly skipOpeningDecisions: boolean;
	readonly cognition?: CivilizationExperimentCognitionOptions;
}): Promise<CivilizationExperimentStep> {
	const work = input.work;
	let { state, world, worldStateHash, routines, activities, cognitionRuntime } =
		work;
	let { expansionDeferralRecorded, projectStallRecorded, priorEventHash } =
		work;
	const events = work.events;
	const cognitionDecisions = work.cognitionDecisions;
	const schedulerPolicy = input.schedulerPolicy;
	const conditions = input.conditions;
	const fromSimulationTime = state.simulationTime;
	const preStateHash = work.priorStateHash;
	const beforeEventIndex = events.length;
	const atSimulationTime = input.day * SECONDS_PER_DAY;
	let departedThisEvaluation = false;
	const appendEvent = async (
		kind: CivilizationExperimentEventKind,
		details: CivilizationExperimentEvent["details"],
	): Promise<void> => {
		activities = scheduleActivities(state, world, routines, schedulerPolicy);
		const postStateHash = await stateHash(state, worldStateHash, activities);
		const event = await eventRecord({
			eventIndex: work.eventIndexBase + events.length,
			priorEventHash,
			simulationTime: state.simulationTime,
			kind,
			details,
			postStateHash,
		});
		events.push(event);
		priorEventHash = event.eventHash;
	};
	const opening =
		input.skipOpeningDecisions || input.day > 3
			? null
			: await decideOpeningRoutines({
					state,
					policy: schedulerPolicy,
					runtime: cognitionRuntime,
					worldIdentityHash: input.worldIdentityHash,
					...(input.cognition === undefined
						? {}
						: { cognition: input.cognition }),
				});
	if (opening !== null) {
		cognitionRuntime = opening.runtime;
		cognitionDecisions.push(...opening.evidence);
	}
	const scheduled = advanceGeneralizedScheduler(
		state,
		schedulerPolicy,
		opening?.decisions ?? [],
	);
	state = scheduled.state;
	routines = scheduled.routines;
	if (opening === null || input.day >= 2) {
		cognitionRuntime = advanceSchedulerMindPlans(
			cognitionRuntime,
			state,
			schedulerPolicy,
			state.simulationTime,
		);
	}
	for (const [citizenId, schedulerMind] of Object.entries(
		cognitionRuntime.minds,
	).sort(([left], [right]) => left.localeCompare(right))) {
		state = replaceCivilizationMind(state, {
			schemaVersion: "eonfolk-civilization-mind-v1",
			citizenId,
			snapshot: schedulerMind.actorMind,
			committedAtRevision: state.revision,
			committedAtSimulationTime: state.simulationTime,
		});
	}
	if (opening !== null) {
		cognitionRuntime = {
			...cognitionRuntime,
			priorOutcomes: Object.fromEntries(
				opening.decisions.map((decision) => [
					decision.citizenId,
					input.day >= 2
						? null
						: routineOutcome(decision, scheduled.actions, scheduled.routines),
				]),
			),
		};
	}
	const schedulerAction = (
		kind: SchedulerAction["kind"],
	): SchedulerAction | undefined =>
		scheduled.actions.find((action) => action.kind === kind);
	if (schedulerAction("project-authorized") !== undefined)
		await appendEvent("project-approved", {
			projectId: "project-expedition-kit",
			physicalTimberRequired: PROJECT_TIMBER,
		});
	if (schedulerAction("project-completed") !== undefined)
		await appendEvent("project-completed", {
			projectId: "project-expedition-kit",
			consumedTimber: PROJECT_TIMBER,
		});
	if (
		conditions.expansionEligible &&
		!projectStallRecorded &&
		state.projects["project-expedition-kit"]?.state === "proposed"
	) {
		projectStallRecorded = true;
		await appendEvent("project-stalled", {
			projectId: "project-expedition-kit",
			availableTimber: state.stocks["stock-origin-timber"]?.quantity ?? 0,
			requiredTimber: PROJECT_TIMBER,
		});
	}

	const projectComplete =
		state.projects["project-expedition-kit"]?.state === "completed";
	if (
		conditions.expansionEligible &&
		projectComplete &&
		state.migrations["migration-founding-party"] === undefined
	) {
		const travelEvaluationCount = Math.ceil(
			conditions.route.totalTraversalUnits / MIGRATION_DAILY_TRAVERSAL_UNITS,
		);
		state = registerMigration(
			state,
			{
				migrationId: "migration-founding-party",
				citizenIds: [RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID],
				originSettlementId: conditions.originSettlementId,
				destinationTerritoryId: conditions.destination.territoryId,
				destinationSettlementId: null,
				carriedStockIds: [
					"stock-migrant-grain",
					"stock-migrant-water",
					"stock-migrant-timber",
				],
				departureSimulationTime: atSimulationTime,
				expectedArrivalSimulationTime:
					atSimulationTime + travelEvaluationCount * SECONDS_PER_DAY,
				state: "planned",
				sourceEventIds: [],
			},
			[
				{ resourceTypeId: "grain", quantity: MIGRATION_GRAIN },
				{ resourceTypeId: "water", quantity: MIGRATION_WATER },
				{ resourceTypeId: "timber", quantity: MIGRATION_TIMBER },
			],
		);
		state = registerMigrationJourney(state, "migration-founding-party", {
			cellIds: conditions.route.cellIds,
			traversalUnitsByLeg: conditions.route.traversalUnitsByLeg,
		});
		state = registerFounding(
			state,
			{
				foundingId: "founding-second-settlement",
				migrationId: "migration-founding-party",
				proposedSettlementId: "settlement-second",
				territoryId: conditions.destination.territoryId,
				founderCitizenIds: [RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID],
				requiredProjectIds: ["project-expedition-kit"],
				requiredStockIds: [
					"stock-migrant-grain",
					"stock-migrant-water",
					"stock-migrant-timber",
				],
				state: "proposed",
				viabilityEvidenceEventIds: [],
			},
			[
				{ resourceTypeId: "grain", quantity: MIGRATION_GRAIN },
				{ resourceTypeId: "water", quantity: MIGRATION_WATER },
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
			routeCells: conditions.route.cellIds.length,
			totalTraversalUnits: conditions.route.totalTraversalUnits,
			carriedGrain: state.stocks["stock-migrant-grain"]?.quantity ?? 0,
			carriedTimber: state.stocks["stock-migrant-timber"]?.quantity ?? 0,
		});
	} else if (!conditions.expansionEligible && !expansionDeferralRecorded) {
		expansionDeferralRecorded = true;
		await appendEvent("expansion-deferred", {
			projectComplete,
			expansionEligible: false,
			populationPressureBasisPoints: conditions.populationPressureBasisPoints,
			reasonCount: conditions.eligibilityReasons.length,
		});
	}

	if (state.migrations["migration-founding-party"]?.state === "planned") {
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
		departedThisEvaluation = true;
		await appendEvent("migration-departed", {
			destinationTerritoryId: conditions.destination.territoryId,
			physicalStocks: 3,
		});
	}

	if (
		state.migrations["migration-founding-party"]?.state === "travelling" &&
		!departedThisEvaluation
	) {
		const beforeJourney = required(
			state.migrationJourneys["migration-founding-party"],
			"active migration journey",
		);
		state = advanceMigrationJourney(
			state,
			"migration-founding-party",
			MIGRATION_DAILY_TRAVERSAL_UNITS,
			atSimulationTime,
		);
		const afterJourney = required(
			state.migrationJourneys["migration-founding-party"],
			"advanced migration journey",
		);
		await appendEvent("migration-traversed", {
			traversedUnits:
				afterJourney.completedTraversalUnits -
				beforeJourney.completedTraversalUnits,
			completedTraversalUnits: afterJourney.completedTraversalUnits,
			totalTraversalUnits: afterJourney.totalTraversalUnits,
			currentCellId:
				afterJourney.routeCellIds[
					Math.min(
						afterJourney.currentLegIndex,
						afterJourney.routeCellIds.length - 1,
					)
				] ?? null,
		});
		if (state.migrations["migration-founding-party"]?.state === "arrived") {
			state = advanceFounding(
				state,
				"founding-second-settlement",
				"establishing",
				atSimulationTime,
			);
			await appendEvent("migration-arrived", {
				destinationTerritoryId: conditions.destination.territoryId,
				destinationCellId: conditions.route.destinationCellId,
				completedTraversalUnits: afterJourney.completedTraversalUnits,
			});
		}
	}

	if (state.foundings["founding-second-settlement"]?.state === "establishing") {
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
		world = materializeFoundedSettlement(world, {
			settlementId: "settlement-second",
			name: "Second Founding",
			territoryId: conditions.destination.territoryId,
			anchorCellId: conditions.route.destinationCellId,
			founderCitizenIds: [RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID],
			residentCitizenIds: [RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID],
			migrationId: "migration-founding-party",
			foundedAtSimulationTime: atSimulationTime,
		});
		worldStateHash = await domainHash(
			"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v7",
			world,
		);
		state = recordFoundingMaterialization(
			state,
			"founding-second-settlement",
			atSimulationTime,
			"settlement-second:founding-site",
		);
		await appendEvent("settlement-materialized", {
			settlementId: "settlement-second",
			territoryId: conditions.destination.territoryId,
			anchorCellId: conditions.route.destinationCellId,
		});
	}

	assertCivilizationInvariants(state);
	state = checkpointCivilizationAccounting(state);
	activities = scheduleActivities(state, world, routines, schedulerPolicy);
	state = applyConversationRecency(state, activities);
	const postStateHash = await stateHash(state, worldStateHash, activities);
	const eventHashes = events
		.slice(beforeEventIndex)
		.map((event) => event.eventHash);
	const stepBody = {
		schemaVersion: CIVILIZATION_EXPERIMENT_STEP_VERSION,
		stepIndex: input.day - 1,
		fromSimulationTime,
		toSimulationTime: atSimulationTime,
		preStateHash,
		postStateHash,
		eventHashes,
	};
	const step: CivilizationExperimentStep = {
		...stepBody,
		stepHash: await domainHash(
			"EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v7",
			stepBody,
		),
	};
	work.state = state;
	work.world = world;
	work.worldStateHash = worldStateHash;
	work.routines = routines;
	work.activities = activities;
	work.cognitionRuntime = cognitionRuntime;
	work.expansionDeferralRecorded = expansionDeferralRecorded;
	work.projectStallRecorded = projectStallRecorded;
	work.priorEventHash = priorEventHash;
	work.priorStateHash = postStateHash;
	return step;
}

/**
 * One 86400s child of an already-persisted civilization. Sponsorship, counsel,
 * minds, and provenance stay on this ledger instead of being grafted onto a
 * genesis replay.
 */
export async function continueCivilizationExperimentDay(input: {
	readonly genesisWorld: GeneratedWorldState;
	readonly world: GeneratedWorldState;
	readonly state: CivilizationState;
	readonly completedDay: number;
	readonly eventIndexBase?: number;
	readonly priorEventHash?: string | null;
	readonly skipOpeningDecisions?: boolean;
	readonly cognition?: CivilizationExperimentCognitionOptions;
}): Promise<ContinuedCivilizationDay> {
	if (
		!Number.isSafeInteger(input.completedDay) ||
		input.completedDay < 0 ||
		input.completedDay >= 365
	)
		throw new RangeError("completedDay must be an integer from 0 through 364");
	const conditions = deriveCivilizationSeedConditions(input.genesisWorld);
	const schedulerPolicy = deriveCivilizationSchedulerPolicy(input.genesisWorld);
	const worldStateHash = await domainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v7",
		input.world,
	);
	const routines = initialRoutineAssignments(input.state);
	const activities = scheduleActivities(
		input.state,
		input.world,
		routines,
		schedulerPolicy,
	);
	let cognitionRuntime = await initializeCognitionRuntime(
		input.state,
		schedulerPolicy,
		input.genesisWorld.identity.identityHash,
	);
	const minds: Record<string, CivilizationSchedulerMindState> = {
		...cognitionRuntime.minds,
	};
	for (const [citizenId, registered] of Object.entries(input.state.minds)) {
		const base = minds[citizenId];
		if (base === undefined) continue;
		minds[citizenId] = { ...base, actorMind: registered.snapshot };
	}
	cognitionRuntime = { ...cognitionRuntime, minds };
	const work: CivilizationExperimentDayWork = {
		state: input.state,
		world: input.world,
		worldStateHash,
		routines,
		activities,
		cognitionRuntime,
		expansionDeferralRecorded:
			!conditions.expansionEligible && input.completedDay >= 1,
		projectStallRecorded: input.completedDay >= 1,
		events: [],
		priorEventHash: input.priorEventHash ?? null,
		priorStateHash: await stateHash(input.state, worldStateHash, activities),
		cognitionDecisions: [],
		eventIndexBase: input.eventIndexBase ?? 0,
	};
	const step = await simulateCivilizationExperimentDay({
		day: input.completedDay + 1,
		work,
		schedulerPolicy,
		conditions,
		worldIdentityHash: input.genesisWorld.identity.identityHash,
		skipOpeningDecisions: input.skipOpeningDecisions ?? true,
		...(input.cognition === undefined ? {} : { cognition: input.cognition }),
	});
	assertCivilizationInvariants(work.state);
	return Object.freeze({
		world: work.world,
		state: work.state,
		activities: work.activities,
		step,
		events: Object.freeze([...work.events]),
		finalStateHash: work.priorStateHash,
	});
}

export async function runCivilizationExperiment(input: {
	readonly world: GeneratedWorldState;
	readonly horizonDays: number;
	readonly cognition?: CivilizationExperimentCognitionOptions;
}): Promise<CivilizationExperimentRun> {
	if (
		!Number.isSafeInteger(input.horizonDays) ||
		input.horizonDays < 1 ||
		input.horizonDays > 365
	)
		throw new RangeError("horizonDays must be an integer from 1 through 365");
	const conditions = deriveCivilizationSeedConditions(input.world);
	const bootstrap = bootstrapCivilization(input.world, conditions);
	let state = bootstrap.state;
	const schedulerPolicy = bootstrap.schedulerPolicy;
	let world = input.world;
	let worldStateHash = await domainHash(
		"EONFOLK:CIVILIZATION-EXPERIMENT-WORLD:v7",
		world,
	);
	const routines = initialRoutineAssignments(state);
	let activities = scheduleActivities(state, world, routines, schedulerPolicy);
	let cognitionRuntime = await initializeCognitionRuntime(
		state,
		schedulerPolicy,
		input.world.identity.identityHash,
	);
	// The scheduler owns these plans before sponsorship exists. Persist a bounded
	// canonical view at genesis so CounselIssued can never invent a Mind or intent.
	for (const [citizenId, schedulerMind] of Object.entries(
		cognitionRuntime.minds,
	).sort(([left], [right]) => left.localeCompare(right))) {
		state = registerCivilizationMind(state, {
			schemaVersion: "eonfolk-civilization-mind-v1",
			citizenId,
			snapshot: schedulerMind.actorMind,
			committedAtRevision: state.revision,
			committedAtSimulationTime: state.simulationTime,
		});
	}
	const cognitionDecisions: CivilizationSchedulerDecisionEvidence[] = [];
	assertCivilizationInvariants(state);
	const initialStateHash = await stateHash(state, worldStateHash, activities);
	const events: CivilizationExperimentEvent[] = [];
	const steps: CivilizationExperimentStep[] = [];
	const work: CivilizationExperimentDayWork = {
		state,
		world,
		worldStateHash,
		routines,
		activities,
		cognitionRuntime,
		expansionDeferralRecorded: false,
		projectStallRecorded: false,
		events,
		priorEventHash: null,
		priorStateHash: initialStateHash,
		cognitionDecisions,
		eventIndexBase: 0,
	};

	for (let day = 1; day <= input.horizonDays; day += 1) {
		steps.push(
			await simulateCivilizationExperimentDay({
				day,
				work,
				schedulerPolicy,
				conditions,
				worldIdentityHash: input.world.identity.identityHash,
				skipOpeningDecisions: false,
				...(input.cognition === undefined
					? {}
					: { cognition: input.cognition }),
			}),
		);
	}
	state = work.state;
	world = work.world;
	worldStateHash = work.worldStateHash;
	activities = work.activities;
	cognitionRuntime = work.cognitionRuntime;
	const priorEventHash = work.priorEventHash;

	assertCivilizationInvariants(state);
	const finalStateHash = await stateHash(state, worldStateHash, activities);
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
		cognitionDecisions,
		finalStandingPlans: Object.values(cognitionRuntime.minds)
			.map(({ actorMind }) => actorMind.standingPlan)
			.sort((left, right) => left.citizenId.localeCompare(right.citizenId)),
		metrics: metrics(state, input.horizonDays, conditions, cognitionDecisions),
		activities,
		state,
		world,
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
		schemaVersion: "eonfolk-civilization-experiment-matrix-v6" as const,
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
			"EONFOLK:CIVILIZATION-EXPERIMENT-MATRIX:v6",
			matrixBody,
		),
	};
}
