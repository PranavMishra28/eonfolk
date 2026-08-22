import type {
	ResourceKind,
	StandingPlanStep,
} from "../../protocol/src/index.js";
import { checkedQuantity } from "../../protocol/src/index.js";
import type { WorldState } from "./state.js";

function planDepth(steps: readonly StandingPlanStep[], depth: number): number {
	return steps.reduce(
		(maximum, step) =>
			Math.max(maximum, depth, planDepth(step.children, depth + 1)),
		depth,
	);
}

function currentQuantity(state: WorldState, resource: ResourceKind): number {
	const siteTotal = Object.values(state.resourceSites)
		.filter((site) => site.resource === resource)
		.reduce((sum, site) => sum + site.quantity, 0);
	const citizenTotal = Object.values(state.citizens).reduce(
		(sum, citizen) => sum + citizen.inventory[resource],
		0,
	);
	const reserve = resource === "food" ? state.sealedRepairReserve : 0;
	return (
		siteTotal + citizenTotal + state.settlementInventory[resource] + reserve
	);
}

export function assertWorldInvariants(state: WorldState): void {
	if (!Number.isSafeInteger(state.revision) || state.revision < 0)
		throw new Error("invalid revision");
	if (!Number.isSafeInteger(state.simulationTime) || state.simulationTime < 0)
		throw new Error("invalid simulation time");
	if (!Number.isSafeInteger(state.nextSequence) || state.nextSequence < 1)
		throw new Error("invalid next sequence");
	if (
		!Number.isSafeInteger(state.nextCreationSequence) ||
		state.nextCreationSequence < 1
	)
		throw new Error("invalid creation sequence");
	for (const resource of ["food", "water", "wood"] as const) {
		checkedQuantity(
			state.settlementInventory[resource],
			`settlement ${resource}`,
		);
		checkedQuantity(
			state.conservation.consumed[resource],
			`consumed ${resource}`,
		);
		const conserved =
			currentQuantity(state, resource) + state.conservation.consumed[resource];
		if (conserved !== state.conservation.baseline[resource]) {
			throw new Error(
				`${resource} conservation failed: ${conserved} != ${state.conservation.baseline[resource]}`,
			);
		}
	}
	checkedQuantity(state.sealedRepairReserve, "sealed reserve");
	checkedQuantity(state.mill.woodConsumed, "mill wood consumed");
	if (
		state.publicLedgerFood !==
		state.settlementInventory.food + state.sealedRepairReserve
	) {
		throw new Error(
			"public ledger no longer matches public open plus sealed food",
		);
	}
	for (const site of Object.values(state.resourceSites))
		checkedQuantity(site.quantity, `${site.siteId} quantity`);
	for (const citizen of Object.values(state.citizens)) {
		if (!state.places[citizen.placeId])
			throw new Error(`citizen ${citizen.citizenId} has no place`);
		if (citizen.travel != null) {
			if (
				citizen.travel.originPlaceId !== citizen.placeId ||
				!state.places[citizen.travel.destinationPlaceId] ||
				!state.places[citizen.placeId]!.neighbors.includes(
					citizen.travel.destinationPlaceId,
				) ||
				citizen.travel.expectedArrivalSimulationTime <=
					citizen.travel.departureSimulationTime ||
				citizen.travel.departureSimulationTime > state.simulationTime
			)
				throw new Error(`citizen ${citizen.citizenId} has invalid travel`);
		}
		for (const resource of ["food", "water", "wood"] as const) {
			checkedQuantity(
				citizen.inventory[resource],
				`${citizen.slug} ${resource}`,
			);
		}
		for (const [need, value] of Object.entries(citizen.needs)) {
			if (!Number.isInteger(value) || value < 0 || value > 10_000)
				throw new Error(`${citizen.slug} ${need} is outside bounds`);
		}
		if (planDepth(citizen.standingPlan.steps, 1) > 4)
			throw new Error(`${citizen.slug} plan exceeds depth budget`);
	}
	for (const relationship of Object.values(state.relationships)) {
		if (
			!state.citizens[relationship.fromCitizenId] ||
			!state.citizens[relationship.toCitizenId]
		) {
			throw new Error("relationship endpoint missing");
		}
		for (const value of [
			relationship.familiarity,
			relationship.trust,
			relationship.strain,
		]) {
			if (!Number.isInteger(value) || value < 0 || value > 10_000)
				throw new Error("relationship band is outside bounds");
		}
	}
}

export function resourceTotals(
	state: WorldState,
): Readonly<Record<ResourceKind, number>> {
	return {
		food: currentQuantity(state, "food") + state.conservation.consumed.food,
		water: currentQuantity(state, "water") + state.conservation.consumed.water,
		wood: currentQuantity(state, "wood") + state.conservation.consumed.wood,
	};
}
