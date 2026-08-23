import type { ProductionProcess } from "@eonfolk/protocol";

import {
	approveProject,
	completeProduction,
	completeProject,
	completeProjectMilestone,
	consumeCitizensDailyNeeds,
	consumeProjectResource,
	contributeProjectLabor,
	deliverProjectResource,
	materializeCompletedProject,
	startProduction,
	startProject,
	transferResources,
} from "./kernel.js";
import { arriveCitizen, departCitizen, leaveHousehold } from "./population.js";
import { legalCollectiveProjectAffordances } from "./pressures.js";
import { evolve, identifier, positiveQuantity, quantity } from "./state.js";
import type { CivilizationState, ProcessBinding } from "./types.js";
import { CivilizationError } from "./types.js";

export const CIVILIZATION_SCHEDULER_SCHEMA_VERSION =
	"eonfolk-civilization-scheduler-v1" as const;
const DAY_SECONDS = 86_400;

export interface SchedulerTransportLane {
	readonly laneId: string;
	readonly routeId: string;
	readonly fromStockId: string;
	readonly toStockId: string;
	readonly carrierCitizenId: string;
	readonly traversalUnits: number;
	readonly capacityUnitsPerStep: number;
	readonly laborSecondsPerTraversalUnit: number;
	readonly requiredCapabilityId: string;
	readonly minimumCapabilityBasisPoints: number;
}

export interface SchedulerProductionJob {
	readonly jobId: string;
	readonly recipeId: string;
	readonly siteId: string;
	readonly participantCitizenIds: readonly string[];
	readonly binding: ProcessBinding;
	readonly outputStockId: string;
	readonly targetQuantity: number;
	readonly inputLaneIds: readonly string[];
}

export interface SchedulerCollectiveProject {
	readonly projectId: string;
	readonly actorCitizenId: string;
	readonly buildingKind: string;
}

export interface SchedulerDemographicRule {
	readonly ruleId: string;
	readonly citizenId: string;
	readonly kind: "depart-on-unmet-need" | "arrive-on-sustained-surplus";
	readonly thresholdBasisPoints: number;
	readonly sustainedSteps: number;
	readonly arrivalSettlementId: string;
	readonly arrivalSiteId: string;
}

export interface GeneralizedSchedulerPolicy {
	readonly schemaVersion: typeof CIVILIZATION_SCHEDULER_SCHEMA_VERSION;
	readonly stepSeconds: number;
	readonly foodResourceTypeIds: readonly string[];
	readonly waterResourceTypeIds: readonly string[];
	readonly needStockIdsByCitizen: Readonly<Record<string, readonly string[]>>;
	readonly transportLanes: readonly SchedulerTransportLane[];
	readonly productionJobs: readonly SchedulerProductionJob[];
	readonly collectiveProjects: readonly SchedulerCollectiveProject[];
	readonly demographicRules: readonly SchedulerDemographicRule[];
	readonly maxDemographicTransitionsPerStep: 0 | 1;
}

export type SchedulerActionKind =
	| "process-completed"
	| "transported"
	| "process-started"
	| "need-evaluated"
	| "citizen-departed"
	| "citizen-arrived"
	| "project-authorized"
	| "project-resourced"
	| "project-labor"
	| "project-completed"
	| "project-materialized";

export interface SchedulerAction {
	readonly kind: SchedulerActionKind;
	readonly subjectId: string;
	readonly quantity: number;
}

export interface SchedulerStepResult {
	readonly state: CivilizationState;
	readonly actions: readonly SchedulerAction[];
	readonly routines: readonly SchedulerRoutineAssignment[];
	readonly modelInvocations: 0;
}

export interface SchedulerRoutineDecision {
	readonly schemaVersion: "eonfolk-civilization-routine-decision-v1";
	readonly citizenId: string;
	readonly actionId: string;
	readonly activeStandingPlanId: string;
	readonly kind: SchedulerRoutineAssignment["kind"];
	readonly subjectId: string;
}

export interface SchedulerRoutineAssignment {
	readonly schemaVersion: "eonfolk-civilization-routine-v1";
	readonly routineId: string;
	readonly citizenId: string;
	readonly kind:
		| "produce"
		| "transport"
		| "construct"
		| "consume"
		| "social-maintenance"
		| "travel"
		| "away";
	readonly subjectId: string;
	readonly assignedAtSimulationTime: number;
	readonly route: {
		readonly routeId: string;
		readonly fromSiteId: string;
		readonly toSiteId: string;
		readonly traversalUnits: number;
	} | null;
}

export interface SchedulerHorizonResult extends SchedulerStepResult {
	readonly completedSteps: number;
}

function uniqueIds(values: readonly string[], label: string): void {
	if (new Set(values).size !== values.length)
		throw new CivilizationError(
			"INVALID_INPUT",
			`${label} contains duplicates`,
		);
	for (const value of values) identifier(value, label);
}

function validatePolicy(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
) {
	if (policy.schemaVersion !== CIVILIZATION_SCHEDULER_SCHEMA_VERSION)
		throw new CivilizationError(
			"INVALID_INPUT",
			"scheduler schema is unsupported",
		);
	positiveQuantity(policy.stepSeconds, "scheduler stepSeconds");
	if (policy.stepSeconds !== DAY_SECONDS)
		throw new CivilizationError(
			"INVALID_INPUT",
			"scheduler step must equal one canonical day",
		);
	if (
		policy.maxDemographicTransitionsPerStep !== 0 &&
		policy.maxDemographicTransitionsPerStep !== 1
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"demographic transitions must be bounded to one",
		);
	uniqueIds(policy.foodResourceTypeIds, "foodResourceTypeId");
	uniqueIds(policy.waterResourceTypeIds, "waterResourceTypeId");
	if (
		policy.foodResourceTypeIds.length === 0 ||
		policy.waterResourceTypeIds.length === 0
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"daily needs require food and water resources",
		);
	for (const resourceTypeId of [
		...policy.foodResourceTypeIds,
		...policy.waterResourceTypeIds,
	])
		if (state.resourceDefinitions[resourceTypeId] === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`need resource ${resourceTypeId} is unknown`,
			);
	uniqueIds(
		policy.transportLanes.map(({ laneId }) => laneId),
		"laneId",
	);
	uniqueIds(
		policy.productionJobs.map(({ jobId }) => jobId),
		"jobId",
	);
	uniqueIds(
		policy.collectiveProjects.map(({ projectId }) => projectId),
		"collective projectId",
	);
	uniqueIds(
		policy.demographicRules.map(({ ruleId }) => ruleId),
		"demographic ruleId",
	);
	for (const lane of policy.transportLanes) {
		identifier(lane.routeId, "transport routeId");
		positiveQuantity(lane.traversalUnits, "lane traversalUnits");
		positiveQuantity(lane.capacityUnitsPerStep, "lane capacityUnitsPerStep");
		positiveQuantity(
			lane.laborSecondsPerTraversalUnit,
			"lane laborSecondsPerTraversalUnit",
		);
		quantity(
			lane.traversalUnits * lane.laborSecondsPerTraversalUnit,
			"lane total laborSeconds",
		);
		quantity(
			lane.minimumCapabilityBasisPoints,
			"lane minimumCapabilityBasisPoints",
		);
		if (lane.minimumCapabilityBasisPoints > 10_000)
			throw new CivilizationError(
				"INVALID_INPUT",
				"transport capability exceeds 10000 basis points",
			);
		const from = state.stocks[lane.fromStockId];
		const to = state.stocks[lane.toStockId];
		if (
			from === undefined ||
			to === undefined ||
			from.resourceTypeId !== to.resourceTypeId
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`lane ${lane.laneId} has invalid stocks`,
			);
		if (
			state.storages[from.storageId]?.siteId ===
			state.storages[to.storageId]?.siteId
		)
			throw new CivilizationError(
				"INVALID_INPUT",
				`lane ${lane.laneId} is not physical transport`,
			);
		const carrier = state.citizens[lane.carrierCitizenId];
		if (
			carrier === undefined ||
			(state.references.capabilitiesByCitizen[lane.carrierCitizenId]?.[
				lane.requiredCapabilityId
			] ?? 0) < lane.minimumCapabilityBasisPoints
		)
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`lane ${lane.laneId} lacks a capable carrier`,
			);
	}
	for (const job of policy.productionJobs) {
		positiveQuantity(job.targetQuantity, "production targetQuantity");
		const recipe = state.recipes[job.recipeId];
		const output = state.stocks[job.outputStockId];
		if (recipe === undefined || output === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`production job ${job.jobId} is not grounded`,
			);
		if (!state.references.siteIds.includes(job.siteId))
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`production job ${job.jobId} has unknown site`,
			);
		uniqueIds(job.participantCitizenIds, "production participantCitizenId");
		if (
			job.participantCitizenIds.length === 0 ||
			job.participantCitizenIds.some(
				(citizenId) => state.citizens[citizenId] === undefined,
			)
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`production job ${job.jobId} has unknown participants`,
			);
		if (
			!recipe.outputs.some(
				({ resourceTypeId }) => resourceTypeId === output.resourceTypeId,
			)
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`production job ${job.jobId} target is not a recipe output`,
			);
		for (const flow of recipe.inputs) {
			const stock =
				state.stocks[job.binding.inputStockIds[flow.resourceTypeId] ?? ""];
			if (stock?.resourceTypeId !== flow.resourceTypeId)
				throw new CivilizationError(
					"INVALID_REFERENCE",
					`production job ${job.jobId} has an invalid input binding`,
				);
		}
		for (const flow of [...recipe.outputs, ...recipe.byproducts]) {
			const stock =
				state.stocks[job.binding.outputStockIds[flow.resourceTypeId] ?? ""];
			if (stock?.resourceTypeId !== flow.resourceTypeId)
				throw new CivilizationError(
					"INVALID_REFERENCE",
					`production job ${job.jobId} has an invalid output binding`,
				);
		}
		for (const laneId of job.inputLaneIds)
			if (
				!policy.transportLanes.some(
					(lane) =>
						lane.laneId === laneId &&
						Object.values(job.binding.inputStockIds).includes(lane.toStockId),
				)
			)
				throw new CivilizationError(
					"INVALID_REFERENCE",
					`production job ${job.jobId} has unknown lane`,
				);
	}
	for (const plan of policy.collectiveProjects) {
		identifier(plan.buildingKind, "materialized buildingKind");
		if (
			state.projects[plan.projectId] === undefined ||
			state.citizens[plan.actorCitizenId] === undefined
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`collective project ${plan.projectId} is not grounded`,
			);
	}
	for (const rule of policy.demographicRules) {
		quantity(rule.thresholdBasisPoints, "demographic thresholdBasisPoints");
		positiveQuantity(rule.sustainedSteps, "demographic sustainedSteps");
		if (
			rule.thresholdBasisPoints > 10_000 ||
			state.citizens[rule.citizenId] === undefined ||
			!state.references.settlementIds.includes(rule.arrivalSettlementId) ||
			!state.references.siteIds.includes(rule.arrivalSiteId)
		)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`demographic rule ${rule.ruleId} is invalid`,
			);
	}
}

function validateRoutineDecisions(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	decisions: readonly SchedulerRoutineDecision[],
): void {
	uniqueIds(
		decisions.map(({ citizenId }) => citizenId),
		"scheduler decision citizenId",
	);
	for (const decision of decisions) {
		if (
			decision.schemaVersion !== "eonfolk-civilization-routine-decision-v1" ||
			decision.actionId.length === 0 ||
			decision.activeStandingPlanId.length === 0 ||
			decision.subjectId.length === 0
		)
			throw new CivilizationError(
				"INVALID_INPUT",
				"scheduler decision is malformed",
			);
		const citizen = state.citizens[decision.citizenId];
		if (citizen === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`decision citizen ${decision.citizenId} is unknown`,
			);
		const legal = (() => {
			switch (decision.kind) {
				case "produce":
					return policy.productionJobs.some(
						(job) =>
							job.jobId === decision.subjectId &&
							job.participantCitizenIds.includes(decision.citizenId),
					);
				case "transport":
					return policy.transportLanes.some(
						(lane) =>
							lane.laneId === decision.subjectId &&
							lane.carrierCitizenId === decision.citizenId,
					);
				case "construct":
					return policy.collectiveProjects.some(
						(project) =>
							project.projectId === decision.subjectId &&
							project.actorCitizenId === decision.citizenId,
					);
				case "consume":
					return (
						citizen.residenceState === "resident" &&
						["food", "water", decision.citizenId].includes(decision.subjectId)
					);
				case "social-maintenance":
					return (
						citizen.residenceState === "resident" &&
						decision.subjectId === decision.citizenId
					);
				case "travel":
					return (
						citizen.residenceState === "travelling" &&
						Object.values(state.migrations).some(
							(migration) =>
								migration.migrationId === decision.subjectId &&
								migration.citizenIds.includes(decision.citizenId),
						)
					);
				case "away":
					return (
						citizen.residenceState === "departed" &&
						decision.subjectId === decision.citizenId
					);
			}
		})();
		if (!legal)
			throw new CivilizationError(
				"PREREQUISITE_UNMET",
				`decision ${decision.actionId} does not resolve to a legal scheduler routine`,
			);
	}
}

function permitsRoutine(
	decisions: readonly SchedulerRoutineDecision[],
	citizenId: string,
	kind: SchedulerRoutineAssignment["kind"],
	subjectId: string,
): boolean {
	const decision = decisions.find(
		(candidate) => candidate.citizenId === citizenId,
	);
	return (
		decision === undefined ||
		(decision.kind === kind && decision.subjectId === subjectId)
	);
}

function routineAssignments(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	actions: readonly SchedulerAction[],
	atSimulationTime: number,
): readonly SchedulerRoutineAssignment[] {
	const action = (kind: SchedulerActionKind, subjectId?: string) =>
		actions.find(
			(candidate) =>
				candidate.kind === kind &&
				(subjectId === undefined || candidate.subjectId === subjectId),
		);
	return Object.values(state.citizens)
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
		.map((citizen) => {
			let kind: SchedulerRoutineAssignment["kind"] = "social-maintenance";
			let subjectId = citizen.citizenId;
			let route: SchedulerRoutineAssignment["route"] = null;
			if (citizen.residenceState === "departed") kind = "away";
			else if (citizen.residenceState === "travelling") {
				kind = "travel";
				subjectId =
					Object.values(state.migrations)
						.filter((migration) =>
							migration.citizenIds.includes(citizen.citizenId),
						)
						.sort((left, right) =>
							left.migrationId.localeCompare(right.migrationId),
						)[0]?.migrationId ?? citizen.citizenId;
			} else {
				const project = Object.values(state.projects)
					.filter(
						(candidate) =>
							candidate.participantCitizenIds.includes(citizen.citizenId) &&
							action("project-labor", candidate.projectId) !== undefined,
					)
					.sort((left, right) =>
						left.projectId.localeCompare(right.projectId),
					)[0];
				const process = Object.values(state.processes)
					.filter(
						(candidate) =>
							candidate.participantCitizenIds.includes(citizen.citizenId) &&
							action("process-started", candidate.processId) !== undefined,
					)
					.sort((left, right) =>
						left.processId.localeCompare(right.processId),
					)[0];
				const lane = [...policy.transportLanes]
					.filter(
						(candidate) =>
							candidate.carrierCitizenId === citizen.citizenId &&
							action("transported", candidate.laneId) !== undefined,
					)
					.sort((left, right) => left.laneId.localeCompare(right.laneId))[0];
				if (project !== undefined) {
					kind = "construct";
					subjectId = project.projectId;
				} else if (process !== undefined) {
					kind = "produce";
					subjectId = process.processId;
				} else if (lane !== undefined) {
					const from = state.stocks[lane.fromStockId];
					const to = state.stocks[lane.toStockId];
					kind = "transport";
					subjectId = lane.laneId;
					route = {
						routeId: lane.routeId,
						fromSiteId: state.storages[from?.storageId ?? ""]?.siteId ?? "",
						toSiteId: state.storages[to?.storageId ?? ""]?.siteId ?? "",
						traversalUnits: lane.traversalUnits,
					};
				} else if (action("need-evaluated", citizen.citizenId) !== undefined) {
					kind = "consume";
					subjectId = `need:${citizen.citizenId}:${atSimulationTime}`;
				}
			}
			return {
				schemaVersion: "eonfolk-civilization-routine-v1" as const,
				routineId: `routine:${atSimulationTime}:${citizen.citizenId}`,
				citizenId: citizen.citizenId,
				kind,
				subjectId,
				assignedAtSimulationTime: atSimulationTime,
				route,
			};
		});
}

function availableLabor(state: CivilizationState): Record<string, number> {
	return Object.fromEntries(
		Object.values(state.citizens).map((citizen) => [
			citizen.citizenId,
			citizen.residenceState === "resident"
				? citizen.laborCapacitySecondsPerDay -
					citizen.committedLaborSecondsPerDay
				: 0,
		]),
	);
}

function reserveLabor(
	available: Record<string, number>,
	citizenIds: readonly string[],
	required: number,
): boolean {
	const ordered = [...new Set(citizenIds)].sort();
	if (ordered.reduce((sum, id) => sum + (available[id] ?? 0), 0) < required)
		return false;
	let remaining = required;
	for (const citizenId of ordered) {
		const amount = Math.min(remaining, available[citizenId] ?? 0);
		available[citizenId] = (available[citizenId] ?? 0) - amount;
		remaining -= amount;
	}
	return true;
}

function storageFreeCapacity(
	state: CivilizationState,
	stockId: string,
): number {
	const stock = state.stocks[stockId];
	if (stock === undefined) return 0;
	return (
		(state.storages[stock.storageId]?.capacityByResource[
			stock.resourceTypeId
		] ?? 0) - stock.quantity
	);
}

function outputCapacityAvailable(
	state: CivilizationState,
	binding: ProcessBinding,
	flows: readonly {
		readonly resourceTypeId: string;
		readonly quantity: number;
	}[],
): boolean {
	const requiredByStock: Record<string, number> = {};
	for (const flow of flows) {
		const stockId = binding.outputStockIds[flow.resourceTypeId];
		if (stockId === undefined) return false;
		requiredByStock[stockId] = (requiredByStock[stockId] ?? 0) + flow.quantity;
	}
	const pendingByStock: Record<string, number> = {};
	for (const process of Object.values(state.processes)) {
		if (process.state !== "active") continue;
		const recipe = state.recipes[process.recipeId];
		const processBinding = state.processBindings[process.processId];
		if (recipe === undefined || processBinding === undefined) continue;
		for (const flow of [...recipe.outputs, ...recipe.byproducts]) {
			const stockId = processBinding.outputStockIds[flow.resourceTypeId];
			if (stockId !== undefined)
				pendingByStock[stockId] =
					(pendingByStock[stockId] ?? 0) + flow.quantity;
		}
	}
	return Object.entries(requiredByStock).every(
		([stockId, required]) =>
			storageFreeCapacity(state, stockId) - (pendingByStock[stockId] ?? 0) >=
			required,
	);
}

function outcomeSeverity(consumed: number, required: number): number {
	return required === 0
		? 0
		: 10_000 - Math.trunc((consumed * 10_000) / required);
}

function latestNeedSeverity(
	state: CivilizationState,
	citizenId: string,
): number | undefined {
	const outcome = [...state.needOutcomes]
		.reverse()
		.find((candidate) => candidate.citizenId === citizenId);
	return outcome === undefined
		? undefined
		: Math.max(
				outcomeSeverity(outcome.foodConsumedUnits, outcome.foodRequiredUnits),
				outcomeSeverity(outcome.waterConsumedUnits, outcome.waterRequiredUnits),
			);
}

function sustainedCitizenUnmet(
	state: CivilizationState,
	rule: SchedulerDemographicRule,
): boolean {
	const outcomes = state.needOutcomes
		.filter((outcome) => outcome.citizenId === rule.citizenId)
		.slice(-rule.sustainedSteps);
	return (
		outcomes.length === rule.sustainedSteps &&
		outcomes.every(
			(outcome) =>
				Math.max(
					outcomeSeverity(outcome.foodConsumedUnits, outcome.foodRequiredUnits),
					outcomeSeverity(
						outcome.waterConsumedUnits,
						outcome.waterRequiredUnits,
					),
				) >= rule.thresholdBasisPoints,
		)
	);
}

function sustainedSettlementSurplus(
	state: CivilizationState,
	rule: SchedulerDemographicRule,
): boolean {
	const residents = Object.values(state.citizens)
		.filter(
			(citizen) =>
				citizen.residenceState === "resident" &&
				citizen.settlementId === rule.arrivalSettlementId,
		)
		.map(({ citizenId }) => citizenId);
	if (residents.length === 0) return false;
	for (const citizenId of residents) {
		const outcomes = state.needOutcomes
			.filter((outcome) => outcome.citizenId === citizenId)
			.slice(-rule.sustainedSteps);
		if (
			outcomes.length < rule.sustainedSteps ||
			outcomes.some(
				(outcome) =>
					Math.max(
						outcomeSeverity(
							outcome.foodConsumedUnits,
							outcome.foodRequiredUnits,
						),
						outcomeSeverity(
							outcome.waterConsumedUnits,
							outcome.waterRequiredUnits,
						),
					) > rule.thresholdBasisPoints,
			)
		)
			return false;
	}
	return true;
}

function executeCollectiveProject(
	state: CivilizationState,
	plan: SchedulerCollectiveProject,
	atSimulationTime: number,
	labor: Record<string, number>,
	actions: SchedulerAction[],
): CivilizationState {
	let next = state;
	const affordance = legalCollectiveProjectAffordances(
		next,
		plan.actorCitizenId,
		atSimulationTime,
	).find((candidate) => candidate.projectId === plan.projectId);
	if (affordance === undefined) return next;
	let project = next.projects[plan.projectId];
	if (project === undefined) return next;
	if (project.state === "proposed") {
		next = approveProject(next, project.projectId);
		actions.push({
			kind: "project-authorized",
			subjectId: project.projectId,
			quantity: 1,
		});
		project = next.projects[project.projectId];
	}
	if (project === undefined) return next;
	let milestone = project.milestones.find(
		({ milestoneId }) => milestoneId === affordance.milestoneId,
	);
	if (milestone === undefined) return next;
	for (const requirement of milestone.resources) {
		const remaining = requirement.quantity - requirement.deliveredQuantity;
		if (remaining <= 0) continue;
		const source = Object.values(next.stocks)
			.filter(
				(stock) =>
					stock.owner.kind === "institution" &&
					stock.owner.institutionId === affordance.institutionId &&
					stock.resourceTypeId === requirement.resourceTypeId &&
					stock.quantity - stock.reservedQuantity >= remaining,
			)
			.sort((left, right) => left.stockId.localeCompare(right.stockId))[0];
		const destination = Object.values(next.stocks).find(
			(stock) =>
				stock.owner.kind === "project" &&
				stock.owner.projectId === project?.projectId &&
				stock.resourceTypeId === requirement.resourceTypeId,
		);
		if (
			source === undefined ||
			destination === undefined ||
			storageFreeCapacity(next, destination.stockId) < remaining
		)
			return next;
		next = deliverProjectResource(next, {
			projectId: project.projectId,
			milestoneId: milestone.milestoneId,
			fromStockId: source.stockId,
			toStockId: destination.stockId,
			quantity: remaining,
			atSimulationTime,
		});
		actions.push({
			kind: "project-resourced",
			subjectId: project.projectId,
			quantity: remaining,
		});
		project = next.projects[project.projectId];
		milestone = project?.milestones.find(
			({ milestoneId }) => milestoneId === affordance.milestoneId,
		);
		if (project === undefined || milestone === undefined) return next;
	}
	if (project.state === "approved" || project.state === "resourcing")
		next = startProject(next, project.projectId, atSimulationTime);
	project = next.projects[project.projectId];
	milestone = project?.milestones.find(
		({ milestoneId }) => milestoneId === affordance.milestoneId,
	);
	if (project === undefined || milestone === undefined) return next;
	for (const requirement of milestone.resources) {
		const remaining = requirement.quantity - requirement.consumedQuantity;
		if (remaining <= 0) continue;
		const stock = Object.values(next.stocks).find(
			(candidate) =>
				candidate.owner.kind === "project" &&
				candidate.owner.projectId === project?.projectId &&
				candidate.resourceTypeId === requirement.resourceTypeId,
		);
		if (stock === undefined) return next;
		next = consumeProjectResource(next, {
			projectId: project.projectId,
			milestoneId: milestone.milestoneId,
			stockId: stock.stockId,
			quantity: remaining,
			atSimulationTime,
		});
	}
	project = next.projects[project.projectId];
	milestone = project?.milestones.find(
		({ milestoneId }) => milestoneId === affordance.milestoneId,
	);
	if (project === undefined || milestone === undefined) return next;
	for (const requirement of milestone.labor) {
		let remaining =
			requirement.requiredLaborSeconds - requirement.completedLaborSeconds;
		for (const citizenId of [...project.participantCitizenIds].sort()) {
			if (remaining === 0) break;
			if (
				(next.references.capabilitiesByCitizen[citizenId]?.[
					requirement.capabilityId
				] ?? 0) <= 0
			)
				continue;
			const amount = Math.min(remaining, labor[citizenId] ?? 0);
			if (amount === 0) continue;
			next = contributeProjectLabor(next, {
				projectId: project.projectId,
				milestoneId: milestone.milestoneId,
				citizenId,
				capabilityId: requirement.capabilityId,
				laborSeconds: amount,
				atSimulationTime,
			});
			labor[citizenId] = (labor[citizenId] ?? 0) - amount;
			remaining -= amount;
			actions.push({
				kind: "project-labor",
				subjectId: project.projectId,
				quantity: amount,
			});
		}
	}
	project = next.projects[project.projectId];
	milestone = project?.milestones.find(
		({ milestoneId }) => milestoneId === affordance.milestoneId,
	);
	if (
		project &&
		milestone?.resources.every(
			(item) => item.consumedQuantity === item.quantity,
		) &&
		milestone.labor.every(
			(item) => item.completedLaborSeconds === item.requiredLaborSeconds,
		)
	)
		next = completeProjectMilestone(
			next,
			project.projectId,
			milestone.milestoneId,
		);
	project = next.projects[plan.projectId];
	if (
		project !== undefined &&
		project.state === "active" &&
		project.milestones.every(
			({ state: milestoneState }) => milestoneState === "completed",
		)
	) {
		next = completeProject(next, project.projectId, atSimulationTime);
		actions.push({
			kind: "project-completed",
			subjectId: project.projectId,
			quantity: 1,
		});
		next = materializeCompletedProject(next, {
			projectId: project.projectId,
			buildingKind: plan.buildingKind,
			atSimulationTime,
		});
		actions.push({
			kind: "project-materialized",
			subjectId: project.projectId,
			quantity: 1,
		});
	}
	return next;
}

/** Advances one deterministic step. All behavior is typed and model-free. */
export function advanceGeneralizedScheduler(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	routineDecisions: readonly SchedulerRoutineDecision[] = [],
): SchedulerStepResult {
	validatePolicy(state, policy);
	validateRoutineDecisions(state, policy, routineDecisions);
	const atSimulationTime = state.simulationTime + policy.stepSeconds;
	let next = state;
	const actions: SchedulerAction[] = [];
	const labor = availableLabor(next);
	const transportRemaining = Object.fromEntries(
		policy.transportLanes.map((lane) => [
			lane.laneId,
			lane.capacityUnitsPerStep,
		]),
	);
	for (const process of Object.values(next.processes).sort((left, right) =>
		left.processId.localeCompare(right.processId),
	)) {
		if (
			process.state === "active" &&
			process.expectedCompletionSimulationTime <= atSimulationTime
		) {
			next = completeProduction(next, process.processId, atSimulationTime);
			actions.push({
				kind: "process-completed",
				subjectId: process.processId,
				quantity: 1,
			});
		}
	}
	for (const job of [...policy.productionJobs].sort((left, right) => {
		const leftQuantity = next.stocks[left.outputStockId]?.quantity ?? 0;
		const rightQuantity = next.stocks[right.outputStockId]?.quantity ?? 0;
		const leftScarcity = Math.max(0, left.targetQuantity - leftQuantity);
		const rightScarcity = Math.max(0, right.targetQuantity - rightQuantity);
		const normalizedDifference =
			Math.trunc((rightScarcity * 10_000) / right.targetQuantity) -
			Math.trunc((leftScarcity * 10_000) / left.targetQuantity);
		return normalizedDifference === 0
			? left.jobId.localeCompare(right.jobId)
			: normalizedDifference;
	})) {
		if (
			!job.participantCitizenIds.every((citizenId) =>
				permitsRoutine(routineDecisions, citizenId, "produce", job.jobId),
			)
		)
			continue;
		const recipe = next.recipes[job.recipeId];
		const output = next.stocks[job.outputStockId];
		if (
			recipe === undefined ||
			output === undefined ||
			output.quantity >= job.targetQuantity
		)
			continue;
		if (
			Object.values(next.processes).some(
				(process) =>
					process.state === "active" &&
					process.processId.startsWith(`scheduled:${job.jobId}:`),
			)
		)
			continue;
		for (const laneId of [...job.inputLaneIds].sort()) {
			const lane = policy.transportLanes.find(
				(candidate) => candidate.laneId === laneId,
			);
			if (lane === undefined) continue;
			if (
				!permitsRoutine(
					routineDecisions,
					lane.carrierCitizenId,
					"transport",
					lane.laneId,
				)
			)
				continue;
			const to = next.stocks[lane.toStockId];
			const from = next.stocks[lane.fromStockId];
			const required =
				recipe.inputs.find(
					({ resourceTypeId }) => resourceTypeId === to?.resourceTypeId,
				)?.quantity ?? 0;
			const shortage = Math.max(0, required - (to?.quantity ?? 0));
			const amount = Math.min(
				shortage,
				transportRemaining[lane.laneId] ?? 0,
				Math.max(0, (from?.quantity ?? 0) - (from?.reservedQuantity ?? 0)),
				storageFreeCapacity(next, lane.toStockId),
			);
			const transportLabor =
				lane.traversalUnits * lane.laborSecondsPerTraversalUnit;
			if (amount > 0 && (labor[lane.carrierCitizenId] ?? 0) >= transportLabor) {
				next = transferResources(
					next,
					[
						{
							fromStockId: lane.fromStockId,
							toStockId: lane.toStockId,
							quantity: amount,
						},
					],
					atSimulationTime,
					{ kind: "transport" },
				);
				labor[lane.carrierCitizenId] =
					(labor[lane.carrierCitizenId] ?? 0) - transportLabor;
				transportRemaining[lane.laneId] =
					(transportRemaining[lane.laneId] ?? 0) - amount;
				actions.push({
					kind: "transported",
					subjectId: lane.laneId,
					quantity: amount,
				});
			}
		}
		const inputsReady = recipe.inputs.every((flow) => {
			const stockId = job.binding.inputStockIds[flow.resourceTypeId];
			const stock = stockId === undefined ? undefined : next.stocks[stockId];
			return (
				stock !== undefined &&
				stock.quantity - stock.reservedQuantity >= flow.quantity
			);
		});
		if (
			!inputsReady ||
			!outputCapacityAvailable(next, job.binding, [
				...recipe.outputs,
				...recipe.byproducts,
			])
		)
			continue;
		const laborSnapshot = { ...labor };
		if (
			!reserveLabor(
				laborSnapshot,
				job.participantCitizenIds,
				recipe.laborSeconds,
			)
		)
			continue;
		Object.assign(labor, laborSnapshot);
		const processId = `scheduled:${job.jobId}:${atSimulationTime}`;
		const process: ProductionProcess = {
			processId,
			recipeId: recipe.recipeId,
			siteId: job.siteId,
			projectId: null,
			participantCitizenIds: [...job.participantCitizenIds].sort(),
			startedAtSimulationTime: atSimulationTime,
			expectedCompletionSimulationTime:
				atSimulationTime + recipe.durationSeconds,
			progressBasisPoints: 0,
			state: "active",
			sourceEventIds: [],
		};
		next = startProduction(next, process, job.binding);
		actions.push({
			kind: "process-started",
			subjectId: processId,
			quantity: recipe.laborSeconds,
		});
	}
	const residents = Object.values(next.citizens)
		.filter((citizen) => citizen.residenceState === "resident")
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId));
	next = consumeCitizensDailyNeeds(
		next,
		residents.map((citizen) => ({
			citizenId: citizen.citizenId,
			foodResourceTypeIds: policy.foodResourceTypeIds,
			waterResourceTypeIds: policy.waterResourceTypeIds,
			stockIds: policy.needStockIdsByCitizen[citizen.citizenId] ?? [],
		})),
		atSimulationTime,
	);
	for (const citizen of residents) {
		actions.push({
			kind: "need-evaluated",
			subjectId: citizen.citizenId,
			quantity: latestNeedSeverity(next, citizen.citizenId) ?? 0,
		});
	}
	for (const plan of [...policy.collectiveProjects].sort((left, right) =>
		left.projectId.localeCompare(right.projectId),
	)) {
		if (
			!permitsRoutine(
				routineDecisions,
				plan.actorCitizenId,
				"construct",
				plan.projectId,
			)
		)
			continue;
		next = executeCollectiveProject(
			next,
			plan,
			atSimulationTime,
			labor,
			actions,
		);
	}
	let demographicTransitions = 0;
	for (const rule of [...policy.demographicRules].sort((left, right) =>
		left.ruleId.localeCompare(right.ruleId),
	)) {
		if (demographicTransitions >= policy.maxDemographicTransitionsPerStep)
			break;
		const citizen = next.citizens[rule.citizenId];
		if (citizen === undefined) continue;
		if (
			rule.kind === "depart-on-unmet-need" &&
			citizen.residenceState === "resident" &&
			sustainedCitizenUnmet(next, rule)
		) {
			if (citizen.householdId !== null)
				next = leaveHousehold(next, citizen.citizenId);
			next = departCitizen(next, citizen.citizenId, atSimulationTime);
			actions.push({
				kind: "citizen-departed",
				subjectId: citizen.citizenId,
				quantity: 1,
			});
			demographicTransitions += 1;
		} else if (
			rule.kind === "arrive-on-sustained-surplus" &&
			citizen.residenceState === "departed" &&
			sustainedSettlementSurplus(next, rule)
		) {
			next = arriveCitizen(
				next,
				{
					citizenId: citizen.citizenId,
					settlementId: rule.arrivalSettlementId,
					siteId: rule.arrivalSiteId,
				},
				atSimulationTime,
			);
			actions.push({
				kind: "citizen-arrived",
				subjectId: citizen.citizenId,
				quantity: 1,
			});
			demographicTransitions += 1;
		}
	}
	if (next.simulationTime < atSimulationTime)
		next = evolve(next, {}, atSimulationTime);
	const dailyOutcomes = next.needOutcomes.filter(
		(outcome) => outcome.evaluatedAtSimulationTime === atSimulationTime,
	);
	next = evolve(
		next,
		{
			schedulerTotals: {
				completedProductionRuns:
					state.schedulerTotals.completedProductionRuns +
					actions.filter(({ kind }) => kind === "process-completed").length,
				consumedNeedUnits:
					state.schedulerTotals.consumedNeedUnits +
					dailyOutcomes.reduce(
						(total, outcome) =>
							total + outcome.foodConsumedUnits + outcome.waterConsumedUnits,
						0,
					),
				transportedResourceUnits:
					state.schedulerTotals.transportedResourceUnits +
					actions
						.filter(({ kind }) => kind === "transported")
						.reduce((total, action) => total + action.quantity, 0),
				groundedNeedOutcomes:
					state.schedulerTotals.groundedNeedOutcomes + dailyOutcomes.length,
				unmetNeedUnits:
					state.schedulerTotals.unmetNeedUnits +
					dailyOutcomes.reduce(
						(total, outcome) =>
							total +
							(outcome.foodRequiredUnits - outcome.foodConsumedUnits) +
							(outcome.waterRequiredUnits - outcome.waterConsumedUnits),
						0,
					),
			},
		},
		atSimulationTime,
	);
	return {
		state: next,
		actions,
		routines: routineAssignments(next, policy, actions, atSimulationTime),
		modelInvocations: 0,
	};
}

export function runGeneralizedSchedulerHorizon(
	state: CivilizationState,
	policy: GeneralizedSchedulerPolicy,
	steps: number,
): SchedulerHorizonResult {
	quantity(steps, "scheduler horizon steps");
	let next = state;
	const actions: SchedulerAction[] = [];
	let routines: readonly SchedulerRoutineAssignment[] = [];
	for (let index = 0; index < steps; index += 1) {
		const result = advanceGeneralizedScheduler(next, policy);
		next = result.state;
		actions.push(...result.actions);
		routines = result.routines;
	}
	return {
		state: next,
		actions,
		routines,
		modelInvocations: 0,
		completedSteps: steps,
	};
}
