import { jcs } from "../../../packages/protocol/src/index.js";
import { describe, expect, it } from "vitest";

import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	arriveCitizen,
	assertCivilizationInvariants,
	departCitizen,
	deriveActorPressureEstimates,
	deriveCanonicalPressures,
	formHousehold,
	legalCollectiveProjectAffordances,
	leaveHousehold,
	observeActorStocks,
	registerAgreement,
	registerCitizen,
	registerInstitution,
	registerProject,
	registerRelationship,
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
		settlementId: SETTLEMENT,
		siteId: SITE,
		householdId: null,
		primaryRoleId: "resident",
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

function socialState() {
	let state = stateWithCitizenStocks();
	state = registerCitizen(state, person(CITIZEN_A));
	state = registerCitizen(state, person(CITIZEN_B));
	return state;
}

describe("grounded population and social systems", () => {
	it("forms a reciprocal household and rejects duplicate membership", () => {
		const state = formHousehold(socialState(), {
			householdId: "household-shared",
			settlementId: SETTLEMENT,
			memberCitizenIds: [CITIZEN_A, CITIZEN_B],
			dependentCitizenIds: [],
			dwellingBuildingId: "building-home",
			sharedStorageIds: [],
			commitmentIds: [],
		});
		expect(state.citizens[CITIZEN_A]?.householdId).toBe("household-shared");
		expect(state.citizens[CITIZEN_B]?.householdId).toBe("household-shared");
		assertCivilizationInvariants(state);
		expect(() =>
			formHousehold(state, {
				...state.households["household-shared"]!,
				householdId: "household-second",
			}),
		).toThrow(/already belongs/u);
		const oneLeft = leaveHousehold(state, CITIZEN_A);
		expect(oneLeft.citizens[CITIZEN_A]?.householdId).toBeNull();
		expect(oneLeft.households["household-shared"]?.memberCitizenIds).toEqual([
			CITIZEN_B,
		]);
		const empty = leaveHousehold(oneLeft, CITIZEN_B);
		expect(empty.households["household-shared"]).toBeUndefined();
		assertCivilizationInvariants(empty);
	});

	it("bounds demographic change to known people and one transition", () => {
		const initial = socialState();
		const departed = departCitizen(initial, CITIZEN_A, 10);
		expect(Object.keys(departed.citizens)).toHaveLength(2);
		expect(departed.citizens[CITIZEN_A]?.residenceState).toBe("departed");
		const returned = arriveCitizen(
			departed,
			{ citizenId: CITIZEN_A, settlementId: SETTLEMENT, siteId: SITE },
			20,
		);
		expect(returned.citizens[CITIZEN_A]?.residenceState).toBe("resident");
		expect(() =>
			registerCitizen(initial, person("citizen-not-in-genesis")),
		).toThrow(/unknown/u);
	});

	it("requires canonical identity, role inputs, and stable values", () => {
		const initial = stateWithCitizenStocks();
		expect(() =>
			registerCitizen(initial, { ...person(CITIZEN_A), name: " " }),
		).toThrow(/name/u);
		expect(() =>
			registerCitizen(initial, { ...person(CITIZEN_A), valueIds: [] }),
		).toThrow(/citizen values/u);
		const registered = registerCitizen(initial, person(CITIZEN_A));
		expect(registered.citizens[CITIZEN_A]).toMatchObject({
			name: `Person ${CITIZEN_A}`,
			primaryRoleId: "resident",
			valueIds: ["care", "reliability"],
		});
		expect(JSON.parse(jcs(registered)).citizens[CITIZEN_A]).toMatchObject({
			name: `Person ${CITIZEN_A}`,
			primaryRoleId: "resident",
			valueIds: ["care", "reliability"],
		});
	});

	it("derives exact pressure from stocks and a coarser actor estimate", () => {
		const state = socialState();
		const canonical = deriveCanonicalPressures(
			state,
			CITIZEN_A,
			policy,
			43_200,
		);
		expect(
			canonical.find(({ kind }) => kind === "food")?.severityBasisPoints,
		).toBe(0);
		expect(
			canonical.find(({ kind }) => kind === "water")?.severityBasisPoints,
		).toBe(10_000);
		expect(
			canonical.find(({ kind }) => kind === "housing")?.severityBasisPoints,
		).toBe(10_000);

		const observations = observeActorStocks(
			state,
			CITIZEN_A,
			["grain-citizen-a", "meal-citizen-a"],
			policy,
			43_200,
		);
		expect(
			observations.map(({ estimatedQuantity }) => estimatedQuantity),
		).toEqual([40, 0]);
		const estimated = deriveActorPressureEstimates(
			state,
			CITIZEN_A,
			observations,
			policy,
			43_200,
		);
		expect(
			estimated.every(({ dataClass }) => dataClass === "actor-estimate"),
		).toBe(true);
		expect(() =>
			observeActorStocks(state, CITIZEN_A, ["grain-citizen-b"], policy, 43_200),
		).toThrow(/not actor-observable/u);
	});

	it("validates typed directed relationships without seed-name behavior", () => {
		const relationship = {
			schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
			relationshipId: "relationship-generic",
			fromCitizenId: CITIZEN_A,
			toCitizenId: CITIZEN_B,
			kind: "colleague" as const,
			familiarityBasisPoints: 5_000,
			trustBasisPoints: 6_000,
			strainBasisPoints: 500,
			lastInteractionSimulationTime: 0,
			sourceEventIds: [],
		};
		const first = registerRelationship(socialState(), relationship);
		const second = registerRelationship(socialState(), relationship);
		expect(jcs(first)).toBe(jcs(second));
		expect(() =>
			registerRelationship(first, {
				...relationship,
				relationshipId: "relationship-duplicate-direction",
			}),
		).toThrow(/directed/u);
	});

	it("exposes collective project work only through authority, policy, and resources", () => {
		let state = socialState();
		state = registerInstitution(state, {
			institutionId: "institution-builders",
			settlementId: SETTLEMENT,
			name: "builders",
			kind: "mutual-aid",
			roles: [
				{
					roleId: "steward",
					name: "steward",
					authorityKinds: ["work-project"],
					capacity: 1,
				},
			],
			memberships: [
				{
					citizenId: CITIZEN_A,
					roleId: "steward",
					joinedAtSimulationTime: 0,
					leftAtSimulationTime: null,
					sourceEventIds: ["event-join"],
				},
			],
			storageIds: [],
			projectIds: [],
			agreementIds: [],
			normIds: ["norm-build-safely"],
			foundedAtSimulationTime: 0,
			dissolvedAtSimulationTime: null,
		});
		const institutionOwner = {
			kind: "institution" as const,
			institutionId: "institution-builders",
		};
		state = registerStorage(
			state,
			storage("storage-institution", institutionOwner),
		);
		state = registerStock(
			state,
			stock(
				"timber-institution",
				institutionOwner,
				"storage-institution",
				"timber",
				20,
			),
		);
		state = registerProject(
			state,
			{
				projectId: "project-common-hall",
				kind: "construction",
				name: "common-hall",
				settlementId: SETTLEMENT,
				siteId: SITE,
				sponsor: institutionOwner,
				state: "proposed",
				dependencyProjectIds: [],
				milestones: [
					{
						milestoneId: "frame",
						name: "frame",
						dependencyMilestoneIds: [],
						resources: [
							{
								resourceTypeId: "timber",
								quantity: 10,
								deliveredQuantity: 0,
								consumedQuantity: 0,
							},
						],
						labor: [
							{
								capabilityId: "build",
								requiredLaborSeconds: 100,
								completedLaborSeconds: 0,
							},
						],
						progressBasisPoints: 0,
						state: "ready",
					},
				],
				participantCitizenIds: [CITIZEN_A],
				storageId: "storage-project",
				startedAtSimulationTime: null,
				endedAtSimulationTime: null,
				failureReason: null,
				sourceEventIds: ["event-project"],
			},
			{
				...storage("storage-project", {
					kind: "project",
					projectId: "project-common-hall",
				}),
				acceptedResourceTypeIds: ["timber"],
				capacityByResource: { timber: 100 },
			},
		);
		expect(legalCollectiveProjectAffordances(state, CITIZEN_A, 0)).toEqual([]);
		state = registerAgreement(state, {
			agreementId: "policy-construction",
			parties: [institutionOwner, { kind: "citizen", citizenId: CITIZEN_A }],
			kind: "policy",
			commitments: ["allow-project:construction"],
			authorityInstitutionId: "institution-builders",
			effectiveFromSimulationTime: 0,
			expiresAtSimulationTime: null,
			state: "active",
			sourceEventIds: ["event-policy"],
		});
		expect(legalCollectiveProjectAffordances(state, CITIZEN_A, 0)).toEqual([
			expect.objectContaining({
				projectId: "project-common-hall",
				authorityRoleId: "steward",
				policyAgreementId: "policy-construction",
			}),
		]);
		expect(legalCollectiveProjectAffordances(state, CITIZEN_B, 0)).toEqual([]);
	});
});
