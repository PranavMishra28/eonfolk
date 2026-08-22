import type { WorldEventPayload } from "../../protocol/src/index.js";
import type { WorldState } from "./state.js";

export interface ScheduledAction {
	readonly simulationTime: number;
	readonly priority: number;
	readonly actorId: string;
	readonly localOrdinal: number;
	readonly payload: WorldEventPayload;
}

export function compareScheduledActions(
	left: ScheduledAction,
	right: ScheduledAction,
): number {
	return (
		left.simulationTime - right.simulationTime ||
		left.priority - right.priority ||
		(left.actorId < right.actorId
			? -1
			: left.actorId > right.actorId
				? 1
				: 0) ||
		left.localOrdinal - right.localOrdinal
	);
}

function resourceAtPlace(state: WorldState, placeId: string) {
	return Object.values(state.resourceSites).find(
		(site) => site.placeId === placeId && site.quantity > 0,
	);
}

function routeTarget(state: WorldState, slug: string, from: string): string {
	if (slug === "mara") return from === "market" ? "granary" : "market";
	if (slug === "odo") return from === "mill" ? "market" : "mill";
	if (slug === "els") return from === "granary" ? "market" : "granary";
	return state.places[from]!.neighbors[0] ?? from;
}

export function scheduleAutonomousActions(
	state: WorldState,
	atSimulationTime: number,
): readonly ScheduledAction[] {
	const actions: ScheduledAction[] = [];
	const citizens = Object.values(state.citizens).filter(
		(citizen) => citizen.alive,
	);
	const iven = citizens.find((citizen) => citizen.slug === "iven");
	const toma = citizens.find((citizen) => citizen.slug === "toma");
	const exchanged =
		iven !== undefined &&
		toma !== undefined &&
		iven.travel == null &&
		toma.travel == null &&
		iven.placeId === toma.placeId &&
		iven.inventory.wood >= 1 &&
		toma.inventory.food >= 1;
	if (exchanged && iven && toma) {
		actions.push({
			simulationTime: atSimulationTime,
			priority: 10,
			actorId: iven.citizenId,
			localOrdinal: 0,
			payload: {
				kind: "ExchangeCompleted",
				firstCitizenId: iven.citizenId,
				secondCitizenId: toma.citizenId,
				firstGives: { resource: "wood", quantity: 1 },
				secondGives: { resource: "food", quantity: 1 },
				behavior: "respond-socially",
			},
		});
	}
	for (const citizen of citizens) {
		if (citizen.travel != null) {
			if (atSimulationTime >= citizen.travel.expectedArrivalSimulationTime) {
				actions.push({
					simulationTime: atSimulationTime,
					priority: 5,
					actorId: citizen.citizenId,
					localOrdinal: 0,
					payload: {
						kind: "TravelArrived",
						citizenId: citizen.citizenId,
						travelId: citizen.travel.travelId,
						destinationPlaceId: citizen.travel.destinationPlaceId,
						behavior: citizen.travel.task,
					},
				});
			}
			continue;
		}
		if (
			exchanged &&
			(citizen.citizenId === iven?.citizenId ||
				citizen.citizenId === toma?.citizenId)
		)
			continue;
		const urgent =
			citizen.needs.thirst >= 7_000
				? "water"
				: citizen.needs.hunger >= 7_000
					? "food"
					: null;
		if (urgent !== null && citizen.inventory[urgent] > 0) {
			actions.push({
				simulationTime: atSimulationTime,
				priority: 0,
				actorId: citizen.citizenId,
				localOrdinal: 0,
				payload: {
					kind: "ResourceConsumed",
					citizenId: citizen.citizenId,
					resource: urgent,
					quantity: 1,
					need: urgent === "food" ? "hunger" : "thirst",
					relief: 3_000,
					behavior: "maintain-self",
				},
			});
			continue;
		}
		const site = resourceAtPlace(state, citizen.placeId);
		if (site !== undefined) {
			actions.push({
				simulationTime: atSimulationTime,
				priority: 20,
				actorId: citizen.citizenId,
				localOrdinal: 0,
				payload: {
					kind: "ResourceGathered",
					citizenId: citizen.citizenId,
					siteId: site.siteId,
					resource: site.resource,
					quantity: 1,
					behavior: "acquire-resource",
				},
			});
			continue;
		}
		const toPlaceId = routeTarget(state, citizen.slug, citizen.placeId);
		if (toPlaceId !== citizen.placeId) {
			actions.push({
				simulationTime: atSimulationTime,
				priority: 30,
				actorId: citizen.citizenId,
				localOrdinal: 0,
				payload: {
					kind: "TravelStarted",
					citizenId: citizen.citizenId,
					travelId: `travel:${citizen.citizenId}:${atSimulationTime}`,
					originPlaceId: citizen.placeId,
					destinationPlaceId: toPlaceId,
					routeId: `${citizen.placeId}>${toPlaceId}`,
					departureSimulationTime: atSimulationTime,
					expectedArrivalSimulationTime: atSimulationTime + 120,
					task: "fulfill-plan",
				},
			});
		}
	}
	return actions.sort(compareScheduledActions);
}
