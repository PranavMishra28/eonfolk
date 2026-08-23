import { jcs } from "../../../packages/protocol/src/index.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	deriveActorPressureEstimates,
	observeActorStocks,
	registerCitizen,
	registerStock,
	registerStorage,
} from "../../../packages/civilization/src/index.js";
import {
	CITIZEN_A,
	CITIZEN_B,
	SETTLEMENT,
	SITE,
	stateWithCitizenStocks,
	stock,
	storage,
} from "../../unit/civilization/fixtures.js";

const policy = {
	foodResourceTypeIds: ["grain"],
	waterResourceTypeIds: ["meal"],
	habitableBuildingIds: ["building-home"],
	quantityObservationGranularity: 10,
	socialIntervalSeconds: 86_400,
} as const;

function person(citizenId: string) {
	return {
		schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
		citizenId,
		settlementId: SETTLEMENT,
		siteId: SITE,
		householdId: null,
		primaryRoleId: null,
		residenceState: "resident" as const,
		arrivedAtSimulationTime: 0,
		departedAtSimulationTime: null,
		foodRequiredUnitsPerDay: 30,
		waterRequiredUnitsPerDay: 10,
		laborCapacitySecondsPerDay: 20_000,
		committedLaborSecondsPerDay: 10_000,
		lastSocialSimulationTime: 0,
		sourceEventIds: [],
	};
}

describe("social/needs properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("does not let hidden stock quantities perturb actor pressure estimates", () => {
		const run = (hiddenQuantity: number) => {
			let state = stateWithCitizenStocks();
			state = registerCitizen(state, person(CITIZEN_A));
			state = registerCitizen(state, person(CITIZEN_B));
			const hiddenOwner = { kind: "citizen" as const, citizenId: CITIZEN_B };
			state = registerStorage(
				state,
				storage("hidden-storage", hiddenOwner, 1_000),
			);
			state = registerStock(
				state,
				stock(
					"hidden-meal",
					hiddenOwner,
					"hidden-storage",
					"meal",
					hiddenQuantity,
				),
			);
			const observations = observeActorStocks(
				state,
				CITIZEN_A,
				["grain-citizen-a", "meal-citizen-a"],
				policy,
				1,
			);
			return deriveActorPressureEstimates(
				state,
				CITIZEN_A,
				observations,
				policy,
				1,
			);
		};
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 1_000 }), (hiddenQuantity) => {
				expect(jcs(run(hiddenQuantity))).toBe(jcs(run(0)));
			}),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0401 },
		);
		expect(run(0)).toEqual(run(1_000));
	});

	it("cannot grow registered population beyond finite genesis references", () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 24 }), {
					maxLength: deep ? 200 : 50,
				}),
				(ids) => {
					let state = stateWithCitizenStocks();
					for (const citizenId of ids) {
						try {
							state = registerCitizen(state, person(citizenId));
						} catch {
							// Invalid/unknown/duplicate people fail atomically.
						}
					}
					expect(Object.keys(state.citizens).length).toBeLessThanOrEqual(
						state.references.citizenIds.length,
					);
					expect(
						Object.keys(state.citizens).every((citizenId) =>
							state.references.citizenIds.includes(citizenId),
						),
					).toBe(true);
				},
			),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0402 },
		);
	});
});
