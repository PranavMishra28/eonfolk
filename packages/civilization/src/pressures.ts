import type {
	AgreementState,
	InstitutionState,
	StockState,
} from "@eonfolk/protocol";

import { positiveQuantity, quantity, simulationTime } from "./state.js";
import type {
	ActorStockObservation,
	CivilizationCitizenState,
	CivilizationState,
	CollectiveProjectAffordance,
	GroundedPressureState,
	PressureDerivationPolicy,
} from "./types.js";
import { CivilizationError } from "./types.js";

function requiredCitizen(
	state: CivilizationState,
	citizenId: string,
): CivilizationCitizenState {
	const citizen = state.citizens[citizenId];
	if (citizen === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`citizen ${citizenId} is not registered`,
		);
	return citizen;
}

function severity(available: number, required: number): number {
	if (required <= 0) return 0;
	return Math.max(
		0,
		10_000 - Math.min(10_000, Math.trunc((available * 10_000) / required)),
	);
}

function stockIsActorObservable(
	state: CivilizationState,
	actor: CivilizationCitizenState,
	stock: StockState,
): boolean {
	if (stock.owner.kind === "citizen")
		return stock.owner.citizenId === actor.citizenId;
	if (stock.owner.kind === "household")
		return stock.owner.householdId === actor.householdId;
	if (stock.owner.kind === "institution") {
		const institution = state.institutions[stock.owner.institutionId];
		return (
			institution?.memberships.some(
				(membership) =>
					membership.citizenId === actor.citizenId &&
					membership.leftAtSimulationTime === null,
			) ?? false
		);
	}
	return false;
}

function relevantStocks(
	state: CivilizationState,
	actor: CivilizationCitizenState,
	resourceTypeIds: readonly string[],
): readonly StockState[] {
	return Object.values(state.stocks)
		.filter(
			(stock) =>
				resourceTypeIds.includes(stock.resourceTypeId) &&
				stockIsActorObservable(state, actor, stock),
		)
		.sort((left, right) => left.stockId.localeCompare(right.stockId));
}

function pressure(
	dataClass: GroundedPressureState["dataClass"],
	subjectCitizenId: string,
	kind: GroundedPressureState["kind"],
	severityBasisPoints: number,
	atSimulationTime: number,
	stockIds: readonly string[],
	referenceIds: readonly string[],
): GroundedPressureState {
	return {
		schemaVersion: "eonfolk-grounded-pressure-v1",
		dataClass,
		subjectCitizenId,
		kind,
		severityBasisPoints,
		observedAtSimulationTime: atSimulationTime,
		sourceStockIds: [...stockIds].sort(),
		sourceReferenceIds: [...referenceIds].sort(),
		provenanceVersion: "grounded-pressure-v1",
	};
}

function validatePolicy(policy: PressureDerivationPolicy): void {
	positiveQuantity(
		policy.quantityObservationGranularity,
		"observation granularity",
	);
	positiveQuantity(policy.socialIntervalSeconds, "social interval");
	if (
		policy.foodResourceTypeIds.length === 0 ||
		policy.waterResourceTypeIds.length === 0
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"pressure policy needs food and water resources",
		);
}

function validateGrounding(
	state: CivilizationState,
	policy: PressureDerivationPolicy,
): void {
	for (const resourceTypeId of [
		...policy.foodResourceTypeIds,
		...policy.waterResourceTypeIds,
	])
		if (state.resourceDefinitions[resourceTypeId] === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`pressure resource ${resourceTypeId} is unknown`,
			);
}

/** Exact canonical derivation from owned/shared stocks and grounded references. */
export function deriveCanonicalPressures(
	state: CivilizationState,
	citizenId: string,
	policy: PressureDerivationPolicy,
	atSimulationTime: number,
): readonly GroundedPressureState[] {
	validatePolicy(policy);
	validateGrounding(state, policy);
	simulationTime(atSimulationTime);
	const actor = requiredCitizen(state, citizenId);
	const foodStocks = relevantStocks(state, actor, policy.foodResourceTypeIds);
	const waterStocks = relevantStocks(state, actor, policy.waterResourceTypeIds);
	const food = foodStocks.reduce(
		(sum, stock) => sum + stock.quantity - stock.reservedQuantity,
		0,
	);
	const water = waterStocks.reduce(
		(sum, stock) => sum + stock.quantity - stock.reservedQuantity,
		0,
	);
	const household =
		actor.householdId === null
			? undefined
			: state.households[actor.householdId];
	const housingSeverity =
		household?.dwellingBuildingId === null ||
		household === undefined ||
		!policy.habitableBuildingIds.includes(household.dwellingBuildingId)
			? 10_000
			: 0;
	const laborSeverity =
		actor.laborCapacitySecondsPerDay === 0
			? actor.committedLaborSecondsPerDay === 0
				? 0
				: 10_000
			: Math.min(
					10_000,
					Math.trunc(
						(actor.committedLaborSecondsPerDay * 10_000) /
							actor.laborCapacitySecondsPerDay,
					),
				);
	const socialAge = Math.max(
		0,
		atSimulationTime - actor.lastSocialSimulationTime,
	);
	return [
		pressure(
			"canonical-derived",
			citizenId,
			"food",
			severity(food, actor.foodRequiredUnitsPerDay),
			atSimulationTime,
			foodStocks.map(({ stockId }) => stockId),
			[actor.siteId, actor.settlementId],
		),
		pressure(
			"canonical-derived",
			citizenId,
			"water",
			severity(water, actor.waterRequiredUnitsPerDay),
			atSimulationTime,
			waterStocks.map(({ stockId }) => stockId),
			[actor.siteId, actor.settlementId],
		),
		pressure(
			"canonical-derived",
			citizenId,
			"housing",
			housingSeverity,
			atSimulationTime,
			[],
			[actor.householdId ?? actor.settlementId, actor.siteId],
		),
		pressure(
			"canonical-derived",
			citizenId,
			"labor",
			laborSeverity,
			atSimulationTime,
			[],
			[actor.primaryRoleId ?? actor.citizenId],
		),
		pressure(
			"canonical-derived",
			citizenId,
			"travel",
			actor.residenceState === "travelling" ? 10_000 : 0,
			atSimulationTime,
			[],
			[actor.siteId, actor.settlementId],
		),
		pressure(
			"canonical-derived",
			citizenId,
			"social",
			Math.min(
				10_000,
				Math.trunc((socialAge * 10_000) / policy.socialIntervalSeconds),
			),
			atSimulationTime,
			[],
			Object.values(state.relationships)
				.filter(
					(relationship) =>
						relationship.fromCitizenId === citizenId ||
						relationship.toCitizenId === citizenId,
				)
				.map(({ relationshipId }) => relationshipId),
		),
	];
}

/** Creates deliberately coarse observations from only stocks the actor may inspect. */
export function observeActorStocks(
	state: CivilizationState,
	actorCitizenId: string,
	stockIds: readonly string[],
	policy: PressureDerivationPolicy,
	atSimulationTime: number,
): readonly ActorStockObservation[] {
	validatePolicy(policy);
	validateGrounding(state, policy);
	simulationTime(atSimulationTime);
	const actor = requiredCitizen(state, actorCitizenId);
	return [...new Set(stockIds)].sort().map((stockId) => {
		const stock = state.stocks[stockId];
		if (stock === undefined || !stockIsActorObservable(state, actor, stock))
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`stock ${stockId} is not actor-observable`,
			);
		return {
			stockId,
			estimatedQuantity:
				Math.trunc(stock.quantity / policy.quantityObservationGranularity) *
				policy.quantityObservationGranularity,
			observedAtSimulationTime: atSimulationTime,
			sourceEventIds: [],
		};
	});
}

/** Actor decision estimate. It consumes observations, never hidden canonical quantities. */
export function deriveActorPressureEstimates(
	state: CivilizationState,
	actorCitizenId: string,
	observations: readonly ActorStockObservation[],
	policy: PressureDerivationPolicy,
	atSimulationTime: number,
): readonly GroundedPressureState[] {
	validatePolicy(policy);
	validateGrounding(state, policy);
	simulationTime(atSimulationTime);
	const actor = requiredCitizen(state, actorCitizenId);
	const seen = new Set<string>();
	for (const observation of observations) {
		if (seen.has(observation.stockId))
			throw new CivilizationError(
				"INVALID_INPUT",
				"actor observations repeat a stock",
			);
		seen.add(observation.stockId);
		quantity(observation.estimatedQuantity, "observed quantity");
		simulationTime(observation.observedAtSimulationTime, "observation time");
		if (observation.observedAtSimulationTime > atSimulationTime)
			throw new CivilizationError(
				"INVALID_INPUT",
				"stock observation is from the future",
			);
		const stock = state.stocks[observation.stockId];
		if (stock === undefined || !stockIsActorObservable(state, actor, stock))
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`stock ${observation.stockId} is not actor-observable`,
			);
	}
	const sum = (resourceTypeIds: readonly string[]) =>
		observations.reduce((total, observation) => {
			const resourceTypeId = state.stocks[observation.stockId]?.resourceTypeId;
			return (
				total +
				(resourceTypeId !== undefined &&
				resourceTypeIds.includes(resourceTypeId)
					? observation.estimatedQuantity
					: 0)
			);
		}, 0);
	return [
		pressure(
			"actor-estimate",
			actorCitizenId,
			"food",
			severity(sum(policy.foodResourceTypeIds), actor.foodRequiredUnitsPerDay),
			atSimulationTime,
			observations.map(({ stockId }) => stockId),
			[actor.siteId, actor.settlementId],
		),
		pressure(
			"actor-estimate",
			actorCitizenId,
			"water",
			severity(
				sum(policy.waterResourceTypeIds),
				actor.waterRequiredUnitsPerDay,
			),
			atSimulationTime,
			observations.map(({ stockId }) => stockId),
			[actor.siteId, actor.settlementId],
		),
	];
}

function activePolicy(
	agreement: AgreementState,
	institutionId: string,
	projectKind: string,
	atSimulationTime: number,
): boolean {
	return (
		agreement.kind === "policy" &&
		agreement.authorityInstitutionId === institutionId &&
		agreement.state === "active" &&
		agreement.effectiveFromSimulationTime <= atSimulationTime &&
		(agreement.expiresAtSimulationTime === null ||
			atSimulationTime < agreement.expiresAtSimulationTime) &&
		agreement.commitments.some(
			(commitment) =>
				commitment === "allow-project:any" ||
				commitment === `allow-project:${projectKind}`,
		)
	);
}

function activeAuthority(
	institution: InstitutionState,
	actorCitizenId: string,
) {
	const memberships = institution.memberships.filter(
		(membership) =>
			membership.citizenId === actorCitizenId &&
			membership.leftAtSimulationTime === null,
	);
	return institution.roles
		.filter(
			(role) =>
				role.authorityKinds.includes("work-project") &&
				memberships.some((membership) => membership.roleId === role.roleId),
		)
		.sort((left, right) => left.roleId.localeCompare(right.roleId))[0];
}

/** Legal collective work exists only when membership, authority, policy, and resources agree. */
export function legalCollectiveProjectAffordances(
	state: CivilizationState,
	actorCitizenId: string,
	atSimulationTime: number,
): readonly CollectiveProjectAffordance[] {
	simulationTime(atSimulationTime);
	requiredCitizen(state, actorCitizenId);
	const affordances: CollectiveProjectAffordance[] = [];
	for (const project of Object.values(state.projects).sort((left, right) =>
		left.projectId.localeCompare(right.projectId),
	)) {
		if (
			project.sponsor.kind !== "institution" ||
			project.siteId === null ||
			["completed", "failed", "abandoned"].includes(project.state)
		)
			continue;
		const institution = state.institutions[project.sponsor.institutionId];
		if (institution === undefined) continue;
		const role = activeAuthority(institution, actorCitizenId);
		if (role === undefined) continue;
		const policy = Object.values(state.agreements)
			.filter((agreement) =>
				activePolicy(
					agreement,
					institution.institutionId,
					project.kind,
					atSimulationTime,
				),
			)
			.sort((left, right) =>
				left.agreementId.localeCompare(right.agreementId),
			)[0];
		if (policy === undefined) continue;
		const milestone = project.milestones
			.filter(
				(candidate) =>
					candidate.state === "ready" || candidate.state === "active",
			)
			.sort((left, right) =>
				left.milestoneId.localeCompare(right.milestoneId),
			)[0];
		if (milestone === undefined) continue;
		const owned = Object.values(state.stocks).filter(
			(stock) =>
				stock.owner.kind === "institution" &&
				stock.owner.institutionId === institution.institutionId,
		);
		const resourcesAvailable = milestone.resources.every(
			(requirement) =>
				owned
					.filter(
						(stock) => stock.resourceTypeId === requirement.resourceTypeId,
					)
					.reduce(
						(sum, stock) => sum + stock.quantity - stock.reservedQuantity,
						0,
					) >=
				requirement.quantity - requirement.deliveredQuantity,
		);
		if (!resourcesAvailable) continue;
		affordances.push({
			actionId: `collective-work:${project.projectId}:${milestone.milestoneId}`,
			actorCitizenId,
			institutionId: institution.institutionId,
			projectId: project.projectId,
			milestoneId: milestone.milestoneId,
			siteId: project.siteId,
			authorityRoleId: role.roleId,
			policyAgreementId: policy.agreementId,
			evidenceSourceEventIds: [
				...new Set([
					...project.sourceEventIds,
					...policy.sourceEventIds,
					...institution.memberships.flatMap(
						(membership) => membership.sourceEventIds,
					),
				]),
			].sort(),
		});
	}
	return affordances;
}
