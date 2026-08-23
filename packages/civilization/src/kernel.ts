import type {
	AgreementState,
	HouseholdState,
	InstitutionState,
	MigrationState,
	ProductionProcess,
	ProductionRecipe,
	ProjectMilestone,
	ProjectState,
	RecipeFlow,
	ResourceDefinition,
	SettlementFoundingState,
	StockOwner,
	StockState,
	StorageState,
} from "@eonfolk/protocol";

import {
	evolve,
	identifier,
	positiveQuantity,
	quantity,
	requireReference,
	simulationTime,
} from "./state.js";
import type {
	AccountingEntry,
	CivilizationState,
	PhysicalResourceRequirement,
	ProcessBinding,
	TransferLine,
} from "./types.js";
import { CivilizationError } from "./types.js";

function absent(
	record: Readonly<Record<string, unknown>>,
	id: string,
	label: string,
): void {
	identifier(id, label);
	if (record[id] !== undefined)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`${label} ${id} already exists`,
		);
}

function present<T>(
	record: Readonly<Record<string, T>>,
	id: string,
	label: string,
): T {
	const value = record[id];
	if (value === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`${label} ${id} is unknown`,
		);
	return value;
}

function ownerKey(owner: StockOwner): string {
	switch (owner.kind) {
		case "citizen":
			return `citizen:${owner.citizenId}`;
		case "household":
			return `household:${owner.householdId}`;
		case "institution":
			return `institution:${owner.institutionId}`;
		case "settlement":
			return `settlement:${owner.settlementId}`;
		case "project":
			return `project:${owner.projectId}`;
	}
}

function validateOwner(
	state: CivilizationState,
	owner: StockOwner,
	allowProjectId?: string,
): void {
	switch (owner.kind) {
		case "citizen":
			requireReference(state.references.citizenIds, owner.citizenId, "citizen");
			break;
		case "settlement":
			requireReference(
				state.references.settlementIds,
				owner.settlementId,
				"settlement",
			);
			break;
		case "household":
			present(state.households, owner.householdId, "household");
			break;
		case "institution":
			present(state.institutions, owner.institutionId, "institution");
			break;
		case "project":
			if (owner.projectId !== allowProjectId)
				present(state.projects, owner.projectId, "project");
			break;
	}
}

function nextEntry(
	state: CivilizationState,
	kind: AccountingEntry["kind"],
	stockDeltas: AccountingEntry["stockDeltas"],
	atSimulationTime: number,
	context: { readonly recipeId?: string; readonly projectId?: string } = {},
): AccountingEntry {
	return {
		entryId: `accounting:${state.revision + 1}:${state.accounting.length + 1}`,
		kind,
		simulationTime: atSimulationTime,
		stockDeltas,
		recipeId: context.recipeId ?? null,
		projectId: context.projectId ?? null,
	};
}

export function registerResourceDefinition(
	state: CivilizationState,
	definition: ResourceDefinition,
): CivilizationState {
	absent(
		state.resourceDefinitions,
		definition.resourceTypeId,
		"resourceTypeId",
	);
	identifier(definition.name, "resource name");
	quantity(definition.decayBasisPointsPerDay, "decayBasisPointsPerDay");
	if (definition.decayBasisPointsPerDay > 10_000)
		throw new CivilizationError(
			"INVALID_INPUT",
			"decay exceeds 10000 basis points per day",
		);
	return evolve(state, {
		resourceDefinitions: {
			...state.resourceDefinitions,
			[definition.resourceTypeId]: { ...definition },
		},
	});
}

function validateStorage(
	state: CivilizationState,
	storage: StorageState,
	allowProjectId?: string,
): void {
	absent(state.storages, storage.storageId, "storageId");
	requireReference(state.references.siteIds, storage.siteId, "site");
	validateOwner(state, storage.owner, allowProjectId);
	if (storage.accessInstitutionId !== null)
		present(state.institutions, storage.accessInstitutionId, "institution");
	if (
		storage.acceptedResourceTypeIds.length === 0 ||
		new Set(storage.acceptedResourceTypeIds).size !==
			storage.acceptedResourceTypeIds.length
	) {
		throw new CivilizationError(
			"INVALID_INPUT",
			"storage must accept unique resource types",
		);
	}
	for (const resourceTypeId of storage.acceptedResourceTypeIds) {
		present(state.resourceDefinitions, resourceTypeId, "resource definition");
		positiveQuantity(
			storage.capacityByResource[resourceTypeId] ?? 0,
			`capacity for ${resourceTypeId}`,
		);
	}
	for (const resourceTypeId of Object.keys(storage.capacityByResource)) {
		if (!storage.acceptedResourceTypeIds.includes(resourceTypeId))
			throw new CivilizationError(
				"INVALID_INPUT",
				`capacity declared for unaccepted resource ${resourceTypeId}`,
			);
	}
}

export function registerStorage(
	state: CivilizationState,
	storage: StorageState,
): CivilizationState {
	if (storage.owner.kind === "project")
		throw new CivilizationError(
			"INVALID_INPUT",
			"project storage must be registered atomically with its project",
		);
	validateStorage(state, storage);
	return evolve(state, {
		storages: { ...state.storages, [storage.storageId]: { ...storage } },
	});
}

export function registerStock(
	state: CivilizationState,
	stock: StockState,
): CivilizationState {
	absent(state.stocks, stock.stockId, "stockId");
	if (
		Object.values(state.stocks).some(
			(existing) =>
				existing.storageId === stock.storageId &&
				existing.resourceTypeId === stock.resourceTypeId,
		)
	) {
		throw new CivilizationError(
			"ALREADY_EXISTS",
			"storage already has a stock for this resource type",
		);
	}
	present(
		state.resourceDefinitions,
		stock.resourceTypeId,
		"resource definition",
	);
	const storage = present(state.storages, stock.storageId, "storage");
	validateOwner(state, stock.owner);
	if (ownerKey(storage.owner) !== ownerKey(stock.owner))
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"stock owner must match storage owner",
		);
	if (!storage.acceptedResourceTypeIds.includes(stock.resourceTypeId))
		throw new CivilizationError(
			"INVALID_INPUT",
			"storage rejects stock resource type",
		);
	quantity(stock.quantity, "stock quantity");
	quantity(stock.reservedQuantity, "reserved quantity");
	if (stock.reservedQuantity > stock.quantity)
		throw new CivilizationError(
			"INVALID_INPUT",
			"reserved quantity exceeds stock quantity",
		);
	if (stock.quantity > (storage.capacityByResource[stock.resourceTypeId] ?? -1))
		throw new CivilizationError(
			"CAPACITY_EXCEEDED",
			"initial stock exceeds storage capacity",
		);
	simulationTime(
		stock.updatedAtSimulationTime,
		"stock updatedAtSimulationTime",
	);
	if (stock.updatedAtSimulationTime < state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"stock update predates current state",
		);
	const stocks = { ...state.stocks, [stock.stockId]: { ...stock } };
	const entry = nextEntry(
		state,
		"stock-created",
		[{ stockId: stock.stockId, quantityDelta: stock.quantity }],
		stock.updatedAtSimulationTime,
	);
	return evolve(
		state,
		{ stocks, accounting: [...state.accounting, entry] },
		stock.updatedAtSimulationTime,
	);
}

function stockCapacity(state: CivilizationState, stock: StockState): number {
	const storage = present(state.storages, stock.storageId, "storage");
	return storage.capacityByResource[stock.resourceTypeId] ?? 0;
}

export function transferResources(
	state: CivilizationState,
	lines: readonly TransferLine[],
	atSimulationTime: number,
): CivilizationState {
	simulationTime(atSimulationTime);
	if (atSimulationTime < state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"transfer time cannot move backwards",
		);
	if (lines.length === 0)
		throw new CivilizationError("INVALID_INPUT", "transfer batch is empty");
	const deltas: Record<string, number> = {};
	for (const line of lines) {
		positiveQuantity(line.quantity, "transfer quantity");
		if (line.fromStockId === line.toStockId)
			throw new CivilizationError(
				"INVALID_INPUT",
				"transfer endpoints must differ",
			);
		const from = present(state.stocks, line.fromStockId, "source stock");
		const to = present(state.stocks, line.toStockId, "destination stock");
		if (from.resourceTypeId !== to.resourceTypeId)
			throw new CivilizationError(
				"INVALID_INPUT",
				"transfer resource types differ",
			);
		deltas[from.stockId] = (deltas[from.stockId] ?? 0) - line.quantity;
		deltas[to.stockId] = (deltas[to.stockId] ?? 0) + line.quantity;
	}
	for (const [stockId, delta] of Object.entries(deltas)) {
		const stock = present(state.stocks, stockId, "stock");
		const result = stock.quantity + delta;
		if (result < stock.reservedQuantity)
			throw new CivilizationError(
				"INSUFFICIENT_RESOURCE",
				`stock ${stockId} lacks unreserved quantity`,
			);
		if (result > stockCapacity(state, stock))
			throw new CivilizationError(
				"CAPACITY_EXCEEDED",
				`stock ${stockId} exceeds capacity`,
			);
	}
	const stocks = { ...state.stocks };
	for (const [stockId, delta] of Object.entries(deltas).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		const stock = present(state.stocks, stockId, "stock");
		stocks[stockId] = {
			...stock,
			quantity: stock.quantity + delta,
			updatedAtSimulationTime: atSimulationTime,
		};
	}
	const entry = nextEntry(
		state,
		"transfer",
		Object.entries(deltas)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([stockId, quantityDelta]) => ({ stockId, quantityDelta })),
		atSimulationTime,
	);
	return evolve(
		state,
		{ stocks, accounting: [...state.accounting, entry] },
		atSimulationTime,
	);
}

function validateFlows(
	state: CivilizationState,
	flows: readonly RecipeFlow[],
	label: string,
): void {
	const seen = new Set<string>();
	for (const flow of flows) {
		present(
			state.resourceDefinitions,
			flow.resourceTypeId,
			"resource definition",
		);
		positiveQuantity(flow.quantity, `${label} quantity`);
		if (seen.has(flow.resourceTypeId))
			throw new CivilizationError(
				"INVALID_INPUT",
				`${label} repeats ${flow.resourceTypeId}`,
			);
		seen.add(flow.resourceTypeId);
	}
}

export function registerRecipe(
	state: CivilizationState,
	recipe: ProductionRecipe,
): CivilizationState {
	absent(state.recipes, recipe.recipeId, "recipeId");
	identifier(recipe.name, "recipe name");
	positiveQuantity(recipe.durationSeconds, "recipe duration");
	positiveQuantity(recipe.laborSeconds, "recipe labor");
	validateFlows(state, recipe.inputs, "recipe input");
	validateFlows(state, recipe.outputs, "recipe output");
	validateFlows(state, recipe.byproducts, "recipe byproduct");
	if (recipe.outputs.length === 0)
		throw new CivilizationError("INVALID_INPUT", "recipe must produce output");
	for (const capability of recipe.requiredCapabilities) {
		identifier(capability.capabilityId, "capabilityId");
		quantity(capability.levelBasisPoints, "capability level");
		if (capability.levelBasisPoints > 10_000)
			throw new CivilizationError(
				"INVALID_INPUT",
				"capability level exceeds 10000 basis points",
			);
	}
	return evolve(state, {
		recipes: { ...state.recipes, [recipe.recipeId]: { ...recipe } },
	});
}

function bindingStock(
	state: CivilizationState,
	binding: Readonly<Record<string, string>>,
	flow: RecipeFlow,
	label: string,
): StockState {
	const stockId = binding[flow.resourceTypeId];
	if (stockId === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`${label} binding lacks ${flow.resourceTypeId}`,
		);
	const stock = present(state.stocks, stockId, `${label} stock`);
	if (stock.resourceTypeId !== flow.resourceTypeId)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`${label} stock has wrong resource type`,
		);
	return stock;
}

function participantsMeetCapabilities(
	state: CivilizationState,
	process: ProductionProcess,
	recipe: ProductionRecipe,
): void {
	for (const citizenId of process.participantCitizenIds)
		requireReference(state.references.citizenIds, citizenId, "citizen");
	for (const requirement of recipe.requiredCapabilities) {
		const maximum = process.participantCitizenIds.reduce(
			(best, citizenId) =>
				Math.max(
					best,
					state.references.capabilitiesByCitizen[citizenId]?.[
						requirement.capabilityId
					] ?? 0,
				),
			0,
		);
		if (maximum < requirement.levelBasisPoints)
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`participants lack ${requirement.capabilityId}`,
			);
	}
}

export function startProduction(
	state: CivilizationState,
	process: ProductionProcess,
	binding: ProcessBinding,
): CivilizationState {
	absent(state.processes, process.processId, "processId");
	const recipe = present(state.recipes, process.recipeId, "recipe");
	requireReference(state.references.siteIds, process.siteId, "site");
	if (process.projectId !== null)
		present(state.projects, process.projectId, "project");
	if (process.state !== "active" || process.progressBasisPoints !== 0)
		throw new CivilizationError(
			"INVALID_INPUT",
			"new process must be active at zero progress",
		);
	simulationTime(process.startedAtSimulationTime, "process start");
	if (
		process.startedAtSimulationTime < state.simulationTime ||
		process.expectedCompletionSimulationTime !==
			process.startedAtSimulationTime + recipe.durationSeconds
	) {
		throw new CivilizationError(
			"INVALID_INPUT",
			"process timing does not match recipe",
		);
	}
	participantsMeetCapabilities(state, process, recipe);
	const siteKinds = state.references.buildingKindsBySite[process.siteId] ?? [];
	for (const buildingKind of recipe.requiredBuildingKinds)
		if (!siteKinds.includes(buildingKind))
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`site lacks ${buildingKind}`,
			);

	const deltas: Record<string, number> = {};
	for (const flow of recipe.inputs) {
		const stock = bindingStock(state, binding.inputStockIds, flow, "input");
		deltas[stock.stockId] = (deltas[stock.stockId] ?? 0) - flow.quantity;
	}
	for (const flow of [...recipe.outputs, ...recipe.byproducts])
		bindingStock(state, binding.outputStockIds, flow, "output");
	for (const [stockId, delta] of Object.entries(deltas)) {
		const stock = present(state.stocks, stockId, "input stock");
		if (stock.quantity + delta < stock.reservedQuantity)
			throw new CivilizationError(
				"INSUFFICIENT_RESOURCE",
				`input stock ${stockId} lacks quantity`,
			);
	}
	const stocks = { ...state.stocks };
	for (const [stockId, delta] of Object.entries(deltas)) {
		const stock = present(state.stocks, stockId, "input stock");
		stocks[stockId] = {
			...stock,
			quantity: stock.quantity + delta,
			updatedAtSimulationTime: process.startedAtSimulationTime,
		};
	}
	const entry = nextEntry(
		state,
		"recipe-input",
		Object.entries(deltas)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([stockId, quantityDelta]) => ({ stockId, quantityDelta })),
		process.startedAtSimulationTime,
		{ recipeId: recipe.recipeId },
	);
	return evolve(
		state,
		{
			stocks,
			processes: { ...state.processes, [process.processId]: { ...process } },
			processBindings: {
				...state.processBindings,
				[process.processId]: {
					inputStockIds: { ...binding.inputStockIds },
					outputStockIds: { ...binding.outputStockIds },
				},
			},
			accounting: [...state.accounting, entry],
		},
		process.startedAtSimulationTime,
	);
}

export function completeProduction(
	state: CivilizationState,
	processId: string,
	atSimulationTime: number,
): CivilizationState {
	const process = present(state.processes, processId, "process");
	if (process.state !== "active")
		throw new CivilizationError(
			"INVALID_STATE",
			"only an active process can complete",
		);
	if (atSimulationTime < process.expectedCompletionSimulationTime)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"process duration has not elapsed",
		);
	const recipe = present(state.recipes, process.recipeId, "recipe");
	const binding = present(state.processBindings, processId, "process binding");
	const deltas: Record<string, number> = {};
	for (const flow of [...recipe.outputs, ...recipe.byproducts]) {
		const stock = bindingStock(state, binding.outputStockIds, flow, "output");
		deltas[stock.stockId] = (deltas[stock.stockId] ?? 0) + flow.quantity;
	}
	for (const [stockId, delta] of Object.entries(deltas)) {
		const stock = present(state.stocks, stockId, "output stock");
		if (stock.quantity + delta > stockCapacity(state, stock))
			throw new CivilizationError(
				"CAPACITY_EXCEEDED",
				`output stock ${stockId} exceeds capacity`,
			);
	}
	const stocks = { ...state.stocks };
	for (const [stockId, delta] of Object.entries(deltas)) {
		const stock = present(state.stocks, stockId, "output stock");
		stocks[stockId] = {
			...stock,
			quantity: stock.quantity + delta,
			updatedAtSimulationTime: atSimulationTime,
		};
	}
	const completed: ProductionProcess = {
		...process,
		progressBasisPoints: 10_000,
		state: "completed",
	};
	const entry = nextEntry(
		state,
		"recipe-output",
		Object.entries(deltas)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([stockId, quantityDelta]) => ({ stockId, quantityDelta })),
		atSimulationTime,
		{ recipeId: recipe.recipeId },
	);
	return evolve(
		state,
		{
			stocks,
			processes: { ...state.processes, [processId]: completed },
			accounting: [...state.accounting, entry],
		},
		atSimulationTime,
	);
}

export function registerHousehold(
	state: CivilizationState,
	household: HouseholdState,
): CivilizationState {
	absent(state.households, household.householdId, "householdId");
	requireReference(
		state.references.settlementIds,
		household.settlementId,
		"settlement",
	);
	for (const citizenId of [
		...household.memberCitizenIds,
		...household.dependentCitizenIds,
	])
		requireReference(state.references.citizenIds, citizenId, "citizen");
	if (
		new Set(household.memberCitizenIds).size !==
		household.memberCitizenIds.length
	)
		throw new CivilizationError("INVALID_INPUT", "household repeats a member");
	for (const storageId of household.sharedStorageIds)
		present(state.storages, storageId, "storage");
	for (const agreementId of household.commitmentIds)
		present(state.agreements, agreementId, "agreement");
	return evolve(state, {
		households: {
			...state.households,
			[household.householdId]: { ...household },
		},
	});
}

export function registerInstitution(
	state: CivilizationState,
	institution: InstitutionState,
): CivilizationState {
	absent(state.institutions, institution.institutionId, "institutionId");
	requireReference(
		state.references.settlementIds,
		institution.settlementId,
		"settlement",
	);
	if (institution.dissolvedAtSimulationTime !== null)
		throw new CivilizationError(
			"INVALID_INPUT",
			"new institution cannot already be dissolved",
		);
	const roleIds = institution.roles.map((role) => role.roleId);
	if (new Set(roleIds).size !== roleIds.length)
		throw new CivilizationError("INVALID_INPUT", "institution repeats a role");
	for (const membership of institution.memberships) {
		requireReference(
			state.references.citizenIds,
			membership.citizenId,
			"citizen",
		);
		if (!roleIds.includes(membership.roleId))
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`membership role ${membership.roleId} is unknown`,
			);
	}
	for (const storageId of institution.storageIds)
		present(state.storages, storageId, "storage");
	for (const projectId of institution.projectIds)
		present(state.projects, projectId, "project");
	for (const agreementId of institution.agreementIds)
		present(state.agreements, agreementId, "agreement");
	return evolve(state, {
		institutions: {
			...state.institutions,
			[institution.institutionId]: { ...institution },
		},
	});
}

export function registerAgreement(
	state: CivilizationState,
	agreement: AgreementState,
): CivilizationState {
	absent(state.agreements, agreement.agreementId, "agreementId");
	if (agreement.parties.length < 2)
		throw new CivilizationError(
			"INVALID_INPUT",
			"agreement needs at least two parties",
		);
	for (const party of agreement.parties) validateOwner(state, party);
	if (agreement.authorityInstitutionId !== null)
		present(
			state.institutions,
			agreement.authorityInstitutionId,
			"institution",
		);
	if (
		agreement.expiresAtSimulationTime !== null &&
		agreement.expiresAtSimulationTime <= agreement.effectiveFromSimulationTime
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"agreement expiry must follow its start",
		);
	return evolve(state, {
		agreements: {
			...state.agreements,
			[agreement.agreementId]: { ...agreement },
		},
	});
}

function validateMilestones(
	state: CivilizationState,
	milestones: readonly ProjectMilestone[],
): void {
	const ids = milestones.map((milestone) => milestone.milestoneId);
	if (milestones.length === 0 || new Set(ids).size !== ids.length)
		throw new CivilizationError(
			"INVALID_INPUT",
			"project milestones must be non-empty and unique",
		);
	for (const milestone of milestones) {
		for (const dependencyId of milestone.dependencyMilestoneIds)
			if (!ids.includes(dependencyId) || dependencyId === milestone.milestoneId)
				throw new CivilizationError(
					"INVALID_REFERENCE",
					`invalid milestone dependency ${dependencyId}`,
				);
		for (const resource of milestone.resources) {
			present(
				state.resourceDefinitions,
				resource.resourceTypeId,
				"resource definition",
			);
			positiveQuantity(resource.quantity, "project resource quantity");
			if (resource.deliveredQuantity !== 0 || resource.consumedQuantity !== 0)
				throw new CivilizationError(
					"INVALID_INPUT",
					"new project resources must start at zero",
				);
		}
		if (
			new Set(milestone.resources.map((resource) => resource.resourceTypeId))
				.size !== milestone.resources.length
		) {
			throw new CivilizationError(
				"INVALID_INPUT",
				`milestone ${milestone.milestoneId} repeats a resource requirement`,
			);
		}
		for (const labor of milestone.labor) {
			positiveQuantity(labor.requiredLaborSeconds, "required project labor");
			if (labor.completedLaborSeconds !== 0)
				throw new CivilizationError(
					"INVALID_INPUT",
					"new project labor must start at zero",
				);
		}
		if (
			new Set(milestone.labor.map((labor) => labor.capabilityId)).size !==
			milestone.labor.length
		) {
			throw new CivilizationError(
				"INVALID_INPUT",
				`milestone ${milestone.milestoneId} repeats a labor requirement`,
			);
		}
		const expectedState =
			milestone.dependencyMilestoneIds.length === 0 ? "ready" : "blocked";
		if (
			milestone.state !== expectedState ||
			milestone.progressBasisPoints !== 0
		)
			throw new CivilizationError(
				"INVALID_INPUT",
				`milestone ${milestone.milestoneId} has invalid initial state`,
			);
	}
	const visit = (id: string, path: Set<string>): void => {
		if (path.has(id))
			throw new CivilizationError(
				"INVALID_INPUT",
				"milestone dependency cycle",
			);
		const milestone = milestones.find(
			(candidate) => candidate.milestoneId === id,
		);
		if (milestone === undefined) return;
		const next = new Set(path).add(id);
		for (const dependencyId of milestone.dependencyMilestoneIds)
			visit(dependencyId, next);
	};
	for (const id of ids) visit(id, new Set());
}

export function registerProject(
	state: CivilizationState,
	project: ProjectState,
	storage: StorageState,
): CivilizationState {
	absent(state.projects, project.projectId, "projectId");
	if (
		project.state !== "proposed" ||
		project.startedAtSimulationTime !== null ||
		project.endedAtSimulationTime !== null ||
		project.failureReason !== null
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"new project must be proposed and unstarted",
		);
	requireReference(
		state.references.settlementIds,
		project.settlementId,
		"settlement",
	);
	if (project.siteId !== null)
		requireReference(state.references.siteIds, project.siteId, "site");
	if (project.sponsor.kind === "citizen")
		requireReference(
			state.references.citizenIds,
			project.sponsor.citizenId,
			"citizen",
		);
	else
		present(state.institutions, project.sponsor.institutionId, "institution");
	for (const dependencyId of project.dependencyProjectIds)
		present(state.projects, dependencyId, "project dependency");
	for (const citizenId of project.participantCitizenIds)
		requireReference(state.references.citizenIds, citizenId, "citizen");
	if (
		project.storageId !== storage.storageId ||
		storage.owner.kind !== "project" ||
		storage.owner.projectId !== project.projectId
	)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"project storage ownership is invalid",
		);
	validateStorage(state, storage, project.projectId);
	validateMilestones(state, project.milestones);
	return evolve(state, {
		storages: { ...state.storages, [storage.storageId]: { ...storage } },
		projects: { ...state.projects, [project.projectId]: { ...project } },
	});
}

function updateProject(
	state: CivilizationState,
	project: ProjectState,
	atSimulationTime = state.simulationTime,
): CivilizationState {
	return evolve(
		state,
		{ projects: { ...state.projects, [project.projectId]: project } },
		atSimulationTime,
	);
}

export function approveProject(
	state: CivilizationState,
	projectId: string,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (project.state !== "proposed")
		throw new CivilizationError(
			"INVALID_STATE",
			"only proposed projects can be approved",
		);
	return updateProject(state, { ...project, state: "approved" });
}

export function startProject(
	state: CivilizationState,
	projectId: string,
	atSimulationTime: number,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (project.state !== "approved" && project.state !== "resourcing")
		throw new CivilizationError("INVALID_STATE", "project is not startable");
	for (const dependencyId of project.dependencyProjectIds)
		if (
			present(state.projects, dependencyId, "project dependency").state !==
			"completed"
		)
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`project dependency ${dependencyId} is incomplete`,
			);
	return updateProject(
		state,
		{ ...project, state: "active", startedAtSimulationTime: atSimulationTime },
		atSimulationTime,
	);
}

function milestoneAt(
	project: ProjectState,
	milestoneId: string,
): { readonly milestone: ProjectMilestone; readonly index: number } {
	const index = project.milestones.findIndex(
		(candidate) => candidate.milestoneId === milestoneId,
	);
	if (index < 0)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`milestone ${milestoneId} is unknown`,
		);
	const milestone = project.milestones[index];
	if (milestone === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`milestone ${milestoneId} is unknown`,
		);
	return { milestone, index };
}

function replaceMilestone(
	project: ProjectState,
	index: number,
	milestone: ProjectMilestone,
): ProjectState {
	return {
		...project,
		milestones: project.milestones.map((current, currentIndex) =>
			currentIndex === index ? milestone : current,
		),
	};
}

function milestoneProgress(milestone: ProjectMilestone): number {
	const parts = [
		...milestone.resources.map((resource) =>
			Math.floor((resource.consumedQuantity * 10_000) / resource.quantity),
		),
		...milestone.labor.map((labor) =>
			Math.floor(
				(labor.completedLaborSeconds * 10_000) / labor.requiredLaborSeconds,
			),
		),
	];
	return parts.length === 0
		? 10_000
		: Math.floor(parts.reduce((sum, part) => sum + part, 0) / parts.length);
}

export function deliverProjectResource(
	state: CivilizationState,
	input: {
		readonly projectId: string;
		readonly milestoneId: string;
		readonly fromStockId: string;
		readonly toStockId: string;
		readonly quantity: number;
		readonly atSimulationTime: number;
	},
): CivilizationState {
	const project = present(state.projects, input.projectId, "project");
	if (!["approved", "resourcing", "active"].includes(project.state))
		throw new CivilizationError(
			"INVALID_STATE",
			"project cannot receive resources in its current state",
		);
	const { milestone, index } = milestoneAt(project, input.milestoneId);
	const destination = present(state.stocks, input.toStockId, "project stock");
	if (
		destination.owner.kind !== "project" ||
		destination.owner.projectId !== project.projectId ||
		destination.storageId !== project.storageId
	)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"delivery destination is not the project stock",
		);
	const requirementIndex = milestone.resources.findIndex(
		(resource) => resource.resourceTypeId === destination.resourceTypeId,
	);
	const requirement = milestone.resources[requirementIndex];
	if (requirement === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"milestone does not require delivered resource",
		);
	positiveQuantity(input.quantity, "delivery quantity");
	if (requirement.deliveredQuantity + input.quantity > requirement.quantity)
		throw new CivilizationError(
			"INVALID_INPUT",
			"delivery exceeds milestone requirement",
		);
	const transferred = transferResources(
		state,
		[
			{
				fromStockId: input.fromStockId,
				toStockId: input.toStockId,
				quantity: input.quantity,
			},
		],
		input.atSimulationTime,
	);
	const transferredProject = present(
		transferred.projects,
		project.projectId,
		"project",
	);
	const transferredMilestone = milestoneAt(
		transferredProject,
		input.milestoneId,
	).milestone;
	const resources = transferredMilestone.resources.map(
		(resource, currentIndex) =>
			currentIndex === requirementIndex
				? {
						...resource,
						deliveredQuantity: resource.deliveredQuantity + input.quantity,
					}
				: resource,
	);
	const updatedMilestone = { ...transferredMilestone, resources };
	const stateKind =
		transferredProject.state === "approved"
			? "resourcing"
			: transferredProject.state;
	return updateProject(
		transferred,
		replaceMilestone(
			{ ...transferredProject, state: stateKind },
			index,
			updatedMilestone,
		),
		input.atSimulationTime,
	);
}

export function consumeProjectResource(
	state: CivilizationState,
	input: {
		readonly projectId: string;
		readonly milestoneId: string;
		readonly stockId: string;
		readonly quantity: number;
		readonly atSimulationTime: number;
	},
): CivilizationState {
	const project = present(state.projects, input.projectId, "project");
	if (project.state !== "active")
		throw new CivilizationError(
			"INVALID_STATE",
			"only active projects consume resources",
		);
	const { milestone, index } = milestoneAt(project, input.milestoneId);
	if (
		milestone.state === "blocked" ||
		milestone.state === "completed" ||
		milestone.state === "failed"
	)
		throw new CivilizationError(
			"INVALID_STATE",
			"milestone cannot consume resources",
		);
	const stock = present(state.stocks, input.stockId, "project stock");
	if (
		stock.owner.kind !== "project" ||
		stock.owner.projectId !== project.projectId ||
		stock.storageId !== project.storageId
	)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"consumption stock is not owned by project",
		);
	const requirementIndex = milestone.resources.findIndex(
		(resource) => resource.resourceTypeId === stock.resourceTypeId,
	);
	const requirement = milestone.resources[requirementIndex];
	if (requirement === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"milestone does not require stock resource",
		);
	positiveQuantity(input.quantity, "consumption quantity");
	if (
		requirement.consumedQuantity + input.quantity >
		requirement.deliveredQuantity
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"resource has not been delivered",
		);
	if (stock.quantity - input.quantity < stock.reservedQuantity)
		throw new CivilizationError(
			"INSUFFICIENT_RESOURCE",
			"project stock lacks quantity",
		);
	const updatedStock = {
		...stock,
		quantity: stock.quantity - input.quantity,
		updatedAtSimulationTime: input.atSimulationTime,
	};
	const resources = milestone.resources.map((resource, currentIndex) =>
		currentIndex === requirementIndex
			? {
					...resource,
					consumedQuantity: resource.consumedQuantity + input.quantity,
				}
			: resource,
	);
	const updatedMilestone = {
		...milestone,
		resources,
		state: "active" as const,
		progressBasisPoints: milestoneProgress({ ...milestone, resources }),
	};
	const updatedProject = replaceMilestone(project, index, updatedMilestone);
	const entry = nextEntry(
		state,
		"project-consumption",
		[{ stockId: stock.stockId, quantityDelta: -input.quantity }],
		input.atSimulationTime,
		{ projectId: project.projectId },
	);
	return evolve(
		state,
		{
			stocks: { ...state.stocks, [stock.stockId]: updatedStock },
			projects: { ...state.projects, [project.projectId]: updatedProject },
			accounting: [...state.accounting, entry],
		},
		input.atSimulationTime,
	);
}

export function contributeProjectLabor(
	state: CivilizationState,
	input: {
		readonly projectId: string;
		readonly milestoneId: string;
		readonly citizenId: string;
		readonly capabilityId: string;
		readonly laborSeconds: number;
		readonly atSimulationTime: number;
	},
): CivilizationState {
	const project = present(state.projects, input.projectId, "project");
	if (project.state !== "active")
		throw new CivilizationError(
			"INVALID_STATE",
			"only active projects accept labor",
		);
	if (!project.participantCitizenIds.includes(input.citizenId))
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"laborer is not a project participant",
		);
	if (
		(state.references.capabilitiesByCitizen[input.citizenId]?.[
			input.capabilityId
		] ?? 0) <= 0
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"laborer lacks required capability",
		);
	const { milestone, index } = milestoneAt(project, input.milestoneId);
	if (
		milestone.state === "blocked" ||
		milestone.state === "completed" ||
		milestone.state === "failed"
	)
		throw new CivilizationError(
			"INVALID_STATE",
			"milestone cannot accept labor",
		);
	const laborIndex = milestone.labor.findIndex(
		(labor) => labor.capabilityId === input.capabilityId,
	);
	const requirement = milestone.labor[laborIndex];
	if (requirement === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"milestone does not require this capability",
		);
	positiveQuantity(input.laborSeconds, "laborSeconds");
	if (
		requirement.completedLaborSeconds + input.laborSeconds >
		requirement.requiredLaborSeconds
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"labor exceeds milestone requirement",
		);
	const labor = milestone.labor.map((current, currentIndex) =>
		currentIndex === laborIndex
			? {
					...current,
					completedLaborSeconds:
						current.completedLaborSeconds + input.laborSeconds,
				}
			: current,
	);
	const updatedMilestone = {
		...milestone,
		labor,
		state: "active" as const,
		progressBasisPoints: milestoneProgress({ ...milestone, labor }),
	};
	return updateProject(
		state,
		replaceMilestone(project, index, updatedMilestone),
		input.atSimulationTime,
	);
}

export function completeProjectMilestone(
	state: CivilizationState,
	projectId: string,
	milestoneId: string,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (project.state !== "active")
		throw new CivilizationError("INVALID_STATE", "project is not active");
	const { milestone, index } = milestoneAt(project, milestoneId);
	if (milestone.state === "blocked")
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"milestone dependencies are incomplete",
		);
	if (
		milestone.resources.some(
			(resource) => resource.consumedQuantity !== resource.quantity,
		) ||
		milestone.labor.some(
			(labor) => labor.completedLaborSeconds !== labor.requiredLaborSeconds,
		)
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"milestone requirements are incomplete",
		);
	let updated = replaceMilestone(project, index, {
		...milestone,
		state: "completed",
		progressBasisPoints: 10_000,
	});
	updated = {
		...updated,
		milestones: updated.milestones.map((candidate) =>
			candidate.state === "blocked" &&
			candidate.dependencyMilestoneIds.every((dependencyId) =>
				updated.milestones.some(
					(item) =>
						item.milestoneId === dependencyId && item.state === "completed",
				),
			)
				? { ...candidate, state: "ready" }
				: candidate,
		),
	};
	return updateProject(state, updated);
}

export function completeProject(
	state: CivilizationState,
	projectId: string,
	atSimulationTime: number,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (
		project.state !== "active" ||
		project.milestones.some((milestone) => milestone.state !== "completed")
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"project milestones are incomplete",
		);
	return updateProject(
		state,
		{ ...project, state: "completed", endedAtSimulationTime: atSimulationTime },
		atSimulationTime,
	);
}

export function failProject(
	state: CivilizationState,
	projectId: string,
	reason: string,
	atSimulationTime: number,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (["completed", "failed", "abandoned"].includes(project.state))
		throw new CivilizationError("INVALID_STATE", "project is already terminal");
	if (reason.trim().length === 0)
		throw new CivilizationError("INVALID_INPUT", "failure reason is required");
	return updateProject(
		state,
		{
			...project,
			state: "failed",
			endedAtSimulationTime: atSimulationTime,
			failureReason: reason,
			milestones: project.milestones.map((milestone) =>
				milestone.state === "completed"
					? milestone
					: { ...milestone, state: "failed" },
			),
		},
		atSimulationTime,
	);
}

export function abandonProject(
	state: CivilizationState,
	projectId: string,
	atSimulationTime: number,
): CivilizationState {
	const project = present(state.projects, projectId, "project");
	if (["completed", "failed", "abandoned"].includes(project.state))
		throw new CivilizationError("INVALID_STATE", "project is already terminal");
	return updateProject(
		state,
		{ ...project, state: "abandoned", endedAtSimulationTime: atSimulationTime },
		atSimulationTime,
	);
}

function validatePhysicalRequirements(
	state: CivilizationState,
	stockIds: readonly string[],
	requirements: readonly PhysicalResourceRequirement[],
): void {
	for (const requirement of requirements) {
		present(
			state.resourceDefinitions,
			requirement.resourceTypeId,
			"resource definition",
		);
		positiveQuantity(requirement.quantity, "physical requirement quantity");
		const held = stockIds.reduce((total, stockId) => {
			const stock = present(state.stocks, stockId, "required stock");
			return (
				total +
				(stock.resourceTypeId === requirement.resourceTypeId
					? stock.quantity - stock.reservedQuantity
					: 0)
			);
		}, 0);
		if (held < requirement.quantity)
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`physical ${requirement.resourceTypeId} requirement is unmet`,
			);
	}
}

export function registerMigration(
	state: CivilizationState,
	migration: MigrationState,
	requirements: readonly PhysicalResourceRequirement[],
): CivilizationState {
	absent(state.migrations, migration.migrationId, "migrationId");
	if (migration.state !== "planned")
		throw new CivilizationError(
			"INVALID_INPUT",
			"new migration must be planned",
		);
	if (migration.citizenIds.length === 0)
		throw new CivilizationError("INVALID_INPUT", "migration needs citizens");
	for (const citizenId of migration.citizenIds)
		requireReference(state.references.citizenIds, citizenId, "citizen");
	requireReference(
		state.references.settlementIds,
		migration.originSettlementId,
		"settlement",
	);
	requireReference(
		state.references.territoryIds,
		migration.destinationTerritoryId,
		"territory",
	);
	if (migration.destinationSettlementId !== null)
		requireReference(
			state.references.settlementIds,
			migration.destinationSettlementId,
			"settlement",
		);
	if (
		migration.expectedArrivalSimulationTime <= migration.departureSimulationTime
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"arrival must follow departure",
		);
	for (const stockId of migration.carriedStockIds) {
		const stock = present(state.stocks, stockId, "carried stock");
		if (
			stock.owner.kind !== "citizen" ||
			!migration.citizenIds.includes(stock.owner.citizenId)
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`stock ${stockId} is not carried by a migrant`,
			);
	}
	validatePhysicalRequirements(state, migration.carriedStockIds, requirements);
	return evolve(state, {
		migrations: {
			...state.migrations,
			[migration.migrationId]: { ...migration },
		},
		migrationRequirements: {
			...state.migrationRequirements,
			[migration.migrationId]: requirements.map((requirement) => ({
				...requirement,
			})),
		},
	});
}

export function advanceMigration(
	state: CivilizationState,
	migrationId: string,
	nextState: MigrationState["state"],
	atSimulationTime: number,
): CivilizationState {
	const migration = present(state.migrations, migrationId, "migration");
	const allowed =
		(migration.state === "planned" && nextState === "travelling") ||
		(migration.state === "travelling" && nextState === "arrived");
	if (!allowed)
		throw new CivilizationError(
			"INVALID_STATE",
			`migration cannot advance from ${migration.state} to ${nextState}`,
		);
	validatePhysicalRequirements(
		state,
		migration.carriedStockIds,
		state.migrationRequirements[migrationId] ?? [],
	);
	if (
		nextState === "travelling" &&
		atSimulationTime < migration.departureSimulationTime
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"departure time has not arrived",
		);
	if (
		nextState === "arrived" &&
		atSimulationTime < migration.expectedArrivalSimulationTime
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"arrival time has not arrived",
		);
	return evolve(
		state,
		{
			migrations: {
				...state.migrations,
				[migrationId]: { ...migration, state: nextState },
			},
		},
		atSimulationTime,
	);
}

export function registerFounding(
	state: CivilizationState,
	founding: SettlementFoundingState,
	requirements: readonly PhysicalResourceRequirement[],
): CivilizationState {
	absent(state.foundings, founding.foundingId, "foundingId");
	if (founding.state !== "proposed")
		throw new CivilizationError(
			"INVALID_INPUT",
			"new founding must be proposed",
		);
	const migration = present(
		state.migrations,
		founding.migrationId,
		"migration",
	);
	requireReference(
		state.references.territoryIds,
		founding.territoryId,
		"territory",
	);
	if (
		founding.founderCitizenIds.some(
			(citizenId) => !migration.citizenIds.includes(citizenId),
		)
	)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			"founders must belong to migration",
		);
	for (const projectId of founding.requiredProjectIds)
		present(state.projects, projectId, "required project");
	for (const stockId of founding.requiredStockIds)
		if (!migration.carriedStockIds.includes(stockId))
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`founding stock ${stockId} is not physically carried`,
			);
	validatePhysicalRequirements(state, founding.requiredStockIds, requirements);
	return evolve(state, {
		foundings: { ...state.foundings, [founding.foundingId]: { ...founding } },
		foundingRequirements: {
			...state.foundingRequirements,
			[founding.foundingId]: requirements.map((requirement) => ({
				...requirement,
			})),
		},
	});
}

export function advanceFounding(
	state: CivilizationState,
	foundingId: string,
	nextState: SettlementFoundingState["state"],
	atSimulationTime: number,
): CivilizationState {
	const founding = present(state.foundings, foundingId, "founding");
	const migration = present(
		state.migrations,
		founding.migrationId,
		"migration",
	);
	const expected: Partial<
		Record<SettlementFoundingState["state"], SettlementFoundingState["state"]>
	> = {
		proposed: "preparing",
		preparing: "travelling",
		travelling: "establishing",
		establishing: "viable",
	};
	if (expected[founding.state] !== nextState)
		throw new CivilizationError(
			"INVALID_STATE",
			`founding cannot advance from ${founding.state} to ${nextState}`,
		);
	validatePhysicalRequirements(
		state,
		founding.requiredStockIds,
		state.foundingRequirements[foundingId] ?? [],
	);
	if (nextState === "travelling" && migration.state !== "travelling")
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"migration has not departed",
		);
	if (
		(nextState === "establishing" || nextState === "viable") &&
		migration.state !== "arrived"
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"migration has not arrived",
		);
	if (
		nextState === "viable" &&
		founding.requiredProjectIds.some(
			(projectId) =>
				present(state.projects, projectId, "required project").state !==
				"completed",
		)
	)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"founding projects are incomplete",
		);
	return evolve(
		state,
		{
			foundings: {
				...state.foundings,
				[foundingId]: { ...founding, state: nextState },
			},
		},
		atSimulationTime,
	);
}
