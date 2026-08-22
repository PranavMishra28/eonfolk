import type { WorldEventPayload } from "../../protocol/src/index.js";
import { travelDurationSeconds, type WorldState } from "./state.js";

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

function routeTarget(state: WorldState, slug: string, from: string): string {
	if (slug === "mara") return from === "market" ? "granary" : "market";
	if (slug === "toma") return from === "market" ? "granary" : "market";
	if (slug === "iven") return from === "market" ? "spring" : "market";
	if (slug === "odo") return from;
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
	for (const reservation of Object.values(state.taskReservations).sort(
		(left, right) => left.taskId.localeCompare(right.taskId),
	)) {
		const participants = reservation.citizenIds.map(
			(citizenId) => state.citizens[citizenId],
		);
		if (participants.some((citizen) => citizen === undefined)) continue;
		if (
			reservation.affordanceId === "market-exchange" &&
			participants.length === 2
		) {
			const iven = participants.find((citizen) => citizen?.slug === "iven");
			const toma = participants.find((citizen) => citizen?.slug === "toma");
			if (
				iven !== undefined &&
				toma !== undefined &&
				iven.inventory.wood >= 1 &&
				toma.inventory.food >= 1
			)
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
			continue;
		}
		if (reservation.affordanceId === "mill-repair") {
			const citizen = participants[0];
			if (
				citizen !== undefined &&
				!state.mill.repaired &&
				(citizen.inventory.wood >= 2 || state.settlementInventory.wood >= 2)
			)
				actions.push({
					simulationTime: atSimulationTime,
					priority: 15,
					actorId: citizen.citizenId,
					localOrdinal: 0,
					payload: {
						kind: "MillRepaired",
						citizenId: citizen.citizenId,
						woodUsed: 2,
						behavior: "fulfill-plan",
					},
				});
			continue;
		}
		const site = Object.values(state.resourceSites).find(
			(candidate) =>
				`${candidate.siteId}-${candidate.resource}` ===
				reservation.affordanceId,
		);
		const citizen = participants[0];
		if (site !== undefined && citizen !== undefined && site.quantity > 0)
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
		if (citizen.activeTaskId !== null) continue;
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
		const toPlaceId = routeTarget(state, citizen.slug, citizen.placeId);
		if (toPlaceId !== citizen.placeId) {
			const duration = travelDurationSeconds(state, citizen.placeId, toPlaceId);
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
					expectedArrivalSimulationTime: atSimulationTime + duration,
					task: "fulfill-plan",
				},
			});
		}
	}
	return actions.sort(compareScheduledActions);
}
