import type {
	ProductionRecipe,
	ProjectState,
	ResourceDefinition,
	StockOwner,
	StockState,
	StorageState,
} from "../../../packages/protocol/src/index.js";
import {
	createCivilizationState,
	registerResourceDefinition,
	registerStock,
	registerStorage,
	type CivilizationState,
} from "../../../packages/civilization/src/index.js";

export const CITIZEN_A = "citizen-a";
export const CITIZEN_B = "citizen-b";
export const CITIZEN_C = "citizen-c";
export const SETTLEMENT = "settlement-a";
export const TERRITORY = "territory-b";
export const SITE = "site-a";

export const resources: readonly ResourceDefinition[] = [
	{
		resourceTypeId: "grain",
		name: "grain",
		unit: "grams",
		conserved: true,
		divisible: true,
		decayBasisPointsPerDay: 0,
	},
	{
		resourceTypeId: "meal",
		name: "meal",
		unit: "count",
		conserved: false,
		divisible: false,
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
];

export function emptyState(): CivilizationState {
	return createCivilizationState({
		citizenIds: [CITIZEN_C, CITIZEN_A, CITIZEN_B],
		settlementIds: [SETTLEMENT],
		territoryIds: [TERRITORY],
		siteIds: [SITE],
		buildingKindsBySite: { [SITE]: ["workshop"] },
		capabilitiesByCitizen: {
			[CITIZEN_A]: { craft: 7_000, build: 8_000 },
			[CITIZEN_B]: { build: 4_000 },
			[CITIZEN_C]: {},
		},
	});
}

export function stateWithResources(): CivilizationState {
	return resources.reduce(registerResourceDefinition, emptyState());
}

export function storage(
	storageId: string,
	owner: StockOwner,
	capacity = 1_000,
): StorageState {
	return {
		storageId,
		siteId: SITE,
		owner,
		acceptedResourceTypeIds: ["grain", "meal", "timber"],
		capacityByResource: { grain: capacity, meal: capacity, timber: capacity },
		accessInstitutionId: null,
	};
}

export function stock(
	stockId: string,
	owner: StockOwner,
	storageId: string,
	resourceTypeId: string,
	quantity: number,
): StockState {
	return {
		stockId,
		owner,
		resourceTypeId,
		storageId,
		quantity,
		reservedQuantity: 0,
		updatedAtSimulationTime: 0,
	};
}

export function stateWithCitizenStocks(): CivilizationState {
	let state = stateWithResources();
	for (const [citizenId, amount] of [
		[CITIZEN_A, 40],
		[CITIZEN_B, 20],
		[CITIZEN_C, 10],
	] as const) {
		const owner = { kind: "citizen" as const, citizenId };
		const storageId = `storage-${citizenId}`;
		state = registerStorage(state, storage(storageId, owner));
		state = registerStock(
			state,
			stock(`grain-${citizenId}`, owner, storageId, "grain", amount),
		);
		state = registerStock(
			state,
			stock(`meal-${citizenId}`, owner, storageId, "meal", 0),
		);
		state = registerStock(
			state,
			stock(`timber-${citizenId}`, owner, storageId, "timber", amount),
		);
	}
	return state;
}

export const millingRecipe: ProductionRecipe = {
	recipeId: "recipe-milling",
	name: "milling",
	durationSeconds: 5,
	laborSeconds: 3,
	requiredCapabilities: [
		{ capabilityId: "craft", levelBasisPoints: 5_000, sourceEventIds: [] },
	],
	requiredBuildingKinds: ["workshop"],
	inputs: [{ resourceTypeId: "grain", quantity: 4 }],
	outputs: [{ resourceTypeId: "meal", quantity: 2 }],
	byproducts: [],
};

export function project(
	projectId: string,
	dependencyProjectIds: readonly string[] = [],
): ProjectState {
	return {
		projectId,
		kind: "construction",
		name: "construction",
		settlementId: SETTLEMENT,
		siteId: SITE,
		sponsor: { kind: "citizen", citizenId: CITIZEN_A },
		state: "proposed",
		dependencyProjectIds,
		milestones: [
			{
				milestoneId: `${projectId}-milestone`,
				name: "assembly",
				dependencyMilestoneIds: [],
				resources: [
					{
						resourceTypeId: "timber",
						quantity: 2,
						deliveredQuantity: 0,
						consumedQuantity: 0,
					},
				],
				labor: [
					{
						capabilityId: "build",
						requiredLaborSeconds: 3,
						completedLaborSeconds: 0,
					},
				],
				progressBasisPoints: 0,
				state: "ready",
			},
		],
		participantCitizenIds: [CITIZEN_A],
		storageId: `${projectId}-storage`,
		startedAtSimulationTime: null,
		endedAtSimulationTime: null,
		failureReason: null,
		sourceEventIds: [],
	};
}
