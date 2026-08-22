import {
	checkedQuantity,
	type WorldEventEnvelope,
	type WorldEventPayload,
} from "../../protocol/src/index.js";
import { assertWorldInvariants } from "./invariants.js";
import type { CitizenState, WorldState } from "./state.js";

function updateCitizen(
	state: WorldState,
	citizenId: string,
	update: (citizen: CitizenState) => CitizenState,
): WorldState {
	const citizen = state.citizens[citizenId];
	if (citizen === undefined || !citizen.alive)
		throw new Error("ACTION_UNAVAILABLE");
	return {
		...state,
		citizens: { ...state.citizens, [citizenId]: update(citizen) },
	};
}

function adjustInventory(
	citizen: CitizenState,
	resource: "food" | "water" | "wood",
	delta: number,
): CitizenState {
	return {
		...citizen,
		inventory: {
			...citizen.inventory,
			[resource]: checkedQuantity(citizen.inventory[resource] + delta),
		},
	};
}

function clampBand(value: number): number {
	return Math.max(0, Math.min(10_000, value));
}

export function reducePayload(
	prior: WorldState,
	payload: WorldEventPayload,
	envelope: {
		readonly eventId: string;
		readonly sequence: number;
		readonly finalRevision: number | null;
	},
): WorldState {
	let state: WorldState = prior;
	switch (payload.kind) {
		case "Observed": {
			if (!state.citizens[payload.observerId])
				throw new Error("ACTION_UNAVAILABLE");
			break;
		}
		case "CitizenMoved": {
			if (!state.places[payload.toPlaceId])
				throw new Error("ACTION_UNAVAILABLE");
			state = updateCitizen(state, payload.citizenId, (citizen) => {
				if (citizen.placeId !== payload.fromPlaceId)
					throw new Error("ACTION_UNAVAILABLE");
				if (
					!state.places[citizen.placeId]!.neighbors.includes(payload.toPlaceId)
				)
					throw new Error("ACTION_UNAVAILABLE");
				return {
					...citizen,
					placeId: payload.toPlaceId,
					currentBehavior: payload.behavior,
				};
			});
			break;
		}
		case "TravelStarted": {
			if (!state.places[payload.destinationPlaceId])
				throw new Error("ACTION_UNAVAILABLE");
			state = updateCitizen(state, payload.citizenId, (citizen) => {
				if (
					citizen.travel != null ||
					citizen.placeId !== payload.originPlaceId ||
					!state.places[citizen.placeId]!.neighbors.includes(
						payload.destinationPlaceId,
					) ||
					payload.departureSimulationTime !== state.simulationTime ||
					payload.expectedArrivalSimulationTime <= state.simulationTime
				)
					throw new Error("ACTION_UNAVAILABLE");
				return {
					...citizen,
					travel: {
						travelId: payload.travelId,
						originPlaceId: payload.originPlaceId,
						destinationPlaceId: payload.destinationPlaceId,
						routeId: payload.routeId,
						departureSimulationTime: payload.departureSimulationTime,
						expectedArrivalSimulationTime:
							payload.expectedArrivalSimulationTime,
						task: payload.task,
					},
					currentBehavior: payload.task,
				};
			});
			break;
		}
		case "TravelArrived": {
			state = updateCitizen(state, payload.citizenId, (citizen) => {
				if (
					citizen.travel == null ||
					citizen.travel.travelId !== payload.travelId ||
					citizen.travel.destinationPlaceId !== payload.destinationPlaceId ||
					state.simulationTime < citizen.travel.expectedArrivalSimulationTime
				)
					throw new Error("ACTION_UNAVAILABLE");
				return {
					...citizen,
					placeId: payload.destinationPlaceId,
					travel: null,
					currentBehavior: payload.behavior,
				};
			});
			break;
		}
		case "ResourceGathered": {
			const site = state.resourceSites[payload.siteId];
			const citizen = state.citizens[payload.citizenId];
			checkedQuantity(payload.quantity);
			if (
				!site ||
				!citizen ||
				site.resource !== payload.resource ||
				citizen.placeId !== site.placeId ||
				site.quantity < payload.quantity ||
				payload.quantity === 0
			) {
				throw new Error("ACTION_UNAVAILABLE");
			}
			state = {
				...state,
				resourceSites: {
					...state.resourceSites,
					[site.siteId]: {
						...site,
						quantity: site.quantity - payload.quantity,
					},
				},
			};
			state = updateCitizen(state, payload.citizenId, (current) => ({
				...adjustInventory(current, payload.resource, payload.quantity),
				currentBehavior: payload.behavior,
			}));
			break;
		}
		case "ResourceConsumed": {
			const citizen = state.citizens[payload.citizenId];
			checkedQuantity(payload.quantity);
			checkedQuantity(payload.relief);
			if (
				!citizen ||
				citizen.inventory[payload.resource] < payload.quantity ||
				payload.quantity === 0
			)
				throw new Error("ACTION_UNAVAILABLE");
			state = updateCitizen(state, payload.citizenId, (current) => ({
				...adjustInventory(current, payload.resource, -payload.quantity),
				needs: {
					...current.needs,
					[payload.need]: Math.max(
						0,
						current.needs[payload.need] - payload.relief,
					),
				},
				currentBehavior: payload.behavior,
			}));
			state = {
				...state,
				conservation: {
					...state.conservation,
					consumed: {
						...state.conservation.consumed,
						[payload.resource]:
							state.conservation.consumed[payload.resource] + payload.quantity,
					},
				},
			};
			break;
		}
		case "ExchangeCompleted": {
			const first = state.citizens[payload.firstCitizenId];
			const second = state.citizens[payload.secondCitizenId];
			if (
				!first ||
				!second ||
				first.placeId !== second.placeId ||
				first.inventory[payload.firstGives.resource] <
					payload.firstGives.quantity ||
				second.inventory[payload.secondGives.resource] <
					payload.secondGives.quantity ||
				payload.firstGives.quantity <= 0 ||
				payload.secondGives.quantity <= 0
			)
				throw new Error("ACTION_UNAVAILABLE");
			let updatedFirst = adjustInventory(
				first,
				payload.firstGives.resource,
				-payload.firstGives.quantity,
			);
			updatedFirst = adjustInventory(
				updatedFirst,
				payload.secondGives.resource,
				payload.secondGives.quantity,
			);
			let updatedSecond = adjustInventory(
				second,
				payload.secondGives.resource,
				-payload.secondGives.quantity,
			);
			updatedSecond = adjustInventory(
				updatedSecond,
				payload.firstGives.resource,
				payload.firstGives.quantity,
			);
			state = {
				...state,
				citizens: {
					...state.citizens,
					[first.citizenId]: {
						...updatedFirst,
						currentBehavior: payload.behavior,
					},
					[second.citizenId]: {
						...updatedSecond,
						currentBehavior: payload.behavior,
					},
				},
			};
			break;
		}
		case "MillRepaired": {
			const citizen = state.citizens[payload.citizenId];
			if (
				!citizen ||
				citizen.placeId !== state.mill.placeId ||
				state.mill.repaired ||
				citizen.inventory.wood < 2
			) {
				throw new Error("ACTION_UNAVAILABLE");
			}
			state = updateCitizen(state, citizen.citizenId, (current) => ({
				...adjustInventory(current, "wood", -2),
				currentBehavior: payload.behavior,
			}));
			state = {
				...state,
				mill: {
					...state.mill,
					repaired: true,
					woodConsumed: state.mill.woodConsumed + 2,
				},
				conservation: {
					...state.conservation,
					consumed: {
						...state.conservation.consumed,
						wood: state.conservation.consumed.wood + 2,
					},
				},
			};
			break;
		}
		case "TimeAdvanced": {
			if (
				!Number.isSafeInteger(payload.seconds) ||
				payload.seconds <= 0 ||
				payload.seconds > 604_800
			)
				throw new Error("ACTION_UNAVAILABLE");
			if (state.simulationTime + payload.seconds > Number.MAX_SAFE_INTEGER)
				throw new Error("simulation time overflow");
			const citizens: Record<string, CitizenState> = {};
			for (const citizen of Object.values(state.citizens)) {
				citizens[citizen.citizenId] = {
					...citizen,
					needs: {
						hunger: clampBand(citizen.needs.hunger + payload.needIncrease),
						thirst: clampBand(citizen.needs.thirst + payload.needIncrease),
						rest: clampBand(
							citizen.needs.rest + Math.trunc(payload.needIncrease / 2),
						),
					},
				};
			}
			state = {
				...state,
				simulationTime: state.simulationTime + payload.seconds,
				citizens,
			};
			break;
		}
		case "CounselIssued": {
			if (!state.citizens[payload.citizenId])
				throw new Error("ACTION_UNAVAILABLE");
			state = {
				...state,
				lastCounsel: { ...payload, eventId: envelope.eventId },
			};
			break;
		}
		case "CounselInterpreted": {
			state = updateCitizen(state, payload.citizenId, (citizen) => {
				const standingPlan = {
					...citizen.standingPlan,
					planId: payload.planId,
					version: citizen.standingPlan.version + 1,
					goalType:
						payload.action === "verify-reserve"
							? "verify-ledger"
							: payload.action === "accuse-publicly"
								? "disclose-now"
								: citizen.standingPlan.goalType,
					currentStepId:
						payload.action === "verify-reserve"
							? "mara-recount"
							: payload.action === "accuse-publicly"
								? "mara-decide"
								: citizen.standingPlan.currentStepId,
				};
				return { ...citizen, standingPlan, currentBehavior: "fulfill-plan" };
			});
			state = { ...state, selectedCounselBranch: payload.action };
			break;
		}
		case "ReturnResponseRecorded": {
			if (!state.citizens[payload.citizenId])
				throw new Error("ACTION_UNAVAILABLE");
			state = {
				...state,
				lastReturnResponse: { ...payload, eventId: envelope.eventId },
			};
			break;
		}
		case "BeliefChanged": {
			const citizen = state.citizens[payload.citizenId];
			if (!citizen) throw new Error("ACTION_UNAVAILABLE");
			const record = {
				recordId: payload.beliefId,
				kind: "belief" as const,
				subjectCitizenId: payload.citizenId,
				proposition: payload.proposition,
				confidence: payload.confidence,
				sourceIds: payload.sourceEventIds,
				visibility: {
					kind: "patron-visible-through-covenant" as const,
					subjectCitizenId: payload.citizenId,
				},
				createdRevision: envelope.finalRevision ?? state.revision,
			};
			state = {
				...state,
				epistemicRecords: {
					...state.epistemicRecords,
					[record.recordId]: record,
				},
				citizens: {
					...state.citizens,
					[citizen.citizenId]: {
						...citizen,
						recordIds: [...citizen.recordIds, record.recordId],
					},
				},
			};
			break;
		}
		case "StatementMade": {
			const speaker = state.citizens[payload.speakerId];
			if (!speaker || payload.recipientIds.some((id) => !state.citizens[id]))
				throw new Error("ACTION_UNAVAILABLE");
			const recordId = `claim-${envelope.eventId}`;
			state = {
				...state,
				epistemicRecords: {
					...state.epistemicRecords,
					[recordId]: {
						recordId,
						kind: "message-claim",
						subjectCitizenId: payload.speakerId,
						proposition: payload.proposition,
						confidence: null,
						sourceIds: [envelope.eventId],
						visibility: { kind: "public" },
						createdRevision: envelope.finalRevision ?? state.revision,
					},
				},
			};
			break;
		}
		case "RelationshipChanged": {
			const key = Object.keys(state.relationships).find((candidate) => {
				const relationship = state.relationships[candidate]!;
				return (
					relationship.fromCitizenId === payload.fromCitizenId &&
					relationship.toCitizenId === payload.toCitizenId
				);
			});
			if (key === undefined) throw new Error("ACTION_UNAVAILABLE");
			const relationship = state.relationships[key]!;
			state = {
				...state,
				relationships: {
					...state.relationships,
					[key]: {
						...relationship,
						trust: clampBand(relationship.trust + payload.trustDelta),
						strain: clampBand(relationship.strain + payload.strainDelta),
						lastMaterialEventId: envelope.eventId,
					},
				},
			};
			break;
		}
		case "PetitionChanged": {
			state = {
				...state,
				petitionEndorsements: checkedQuantity(
					state.petitionEndorsements + payload.endorsementDelta,
				),
			};
			break;
		}
		case "StandingPlanChanged": {
			state = updateCitizen(state, payload.citizenId, (citizen) => ({
				...citizen,
				standingPlan: {
					...citizen.standingPlan,
					planId: payload.planId,
					status: payload.status,
					currentStepId: payload.currentStepId,
				},
			}));
			break;
		}
	}
	state = {
		...state,
		nextSequence: envelope.sequence + 1,
		nextCreationSequence: state.nextCreationSequence + 1,
		revision: envelope.finalRevision ?? state.revision,
	};
	assertWorldInvariants(state);
	return state;
}

export function reduceEnvelope(
	prior: WorldState,
	envelope: WorldEventEnvelope,
	finalRevision: number | null,
): WorldState {
	if (
		envelope.runId !== prior.runId ||
		envelope.regionId !== prior.regionId ||
		envelope.sequence !== prior.nextSequence
	) {
		throw new Error("event ledger mismatch");
	}
	return reducePayload(prior, envelope.eventPayload, {
		eventId: envelope.eventId,
		sequence: envelope.sequence,
		finalRevision,
	});
}
