import { describe, expect, it } from "vitest";
import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	formCitizenGoal,
	registerCitizen,
	registerStock,
	registerStorage,
} from "../../../packages/civilization/src/index.js";
import {
	CITIZEN_A,
	stateWithCitizenStocks,
	stock,
	storage,
} from "./fixtures.js";

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
		name: `Person ${citizenId}`,
		valueIds: ["care", "reliability"],
		settlementId: "settlement-a",
		siteId: "site-a",
		householdId: null,
		primaryRoleId: "resident" as const,
		residenceState: "resident" as const,
		arrivedAtSimulationTime: 0,
		departedAtSimulationTime: null,
		foodRequiredUnitsPerDay: 30,
		waterRequiredUnitsPerDay: 10,
		laborCapacitySecondsPerDay: 24_000,
		committedLaborSecondsPerDay: 12_000,
		lastSocialSimulationTime: 0,
		sourceEventIds: [],
	};
}

describe("self-generated citizen goals", () => {
	it("forms a water goal from empty drinking stores", () => {
		let state = stateWithCitizenStocks();
		state = registerCitizen(state, person(CITIZEN_A));
		const goal = formCitizenGoal(state, CITIZEN_A, policy, 43_200);
		expect(goal?.desiredEffect).toBe("replenish-water");
		expect(goal?.sourceKind).toBe("need-pressure");
		expect(goal?.lifecycle).toBe("active");
		expect(goal?.playerFacingIntent).toMatch(/drinking water/u);
	});

	it("changes the formed goal when the same citizen's stores change", () => {
		let dry = stateWithCitizenStocks();
		dry = registerCitizen(dry, person(CITIZEN_A));
		const dryGoal = formCitizenGoal(dry, CITIZEN_A, policy, 43_200);

		const owner = { kind: "citizen" as const, citizenId: CITIZEN_A };
		const withCistern = registerStorage(
			dry,
			storage("storage-a-cistern", owner),
		);
		const wet = registerStock(
			withCistern,
			stock("meal-citizen-a-cistern", owner, "storage-a-cistern", "meal", 200),
		);
		const wetGoal = formCitizenGoal(wet, CITIZEN_A, policy, 43_200);

		expect(dryGoal?.desiredEffect).toBe("replenish-water");
		expect(wetGoal?.desiredEffect).toBe("secure-housing");
		expect(wetGoal?.goalId).not.toBe(dryGoal?.goalId);
	});
});
