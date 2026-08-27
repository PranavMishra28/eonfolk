import { describe, expect, it } from "vitest";
import {
	assertCivilizationInvariants,
	auditCivilizationState,
	CivilizationError,
	completeProduction,
	registerAgreement,
	registerHousehold,
	registerInstitution,
	registerRecipe,
	registerStock,
	registerStorage,
	startProduction,
	transferResources,
} from "../../../packages/civilization/src/index.js";
import { jcs } from "../../../packages/protocol/src/index.js";
import {
	CITIZEN_A,
	CITIZEN_B,
	millingRecipe,
	SETTLEMENT,
	SITE,
	stateWithCitizenStocks,
	stateWithResources,
	stock,
	storage,
} from "./fixtures.js";

describe("civilization economy kernel", () => {
	it("is immutable and deterministic for identical commands", () => {
		const initial = stateWithCitizenStocks();
		const before = jcs(initial);
		const command = [
			{
				fromStockId: "grain-citizen-a",
				toStockId: "grain-citizen-b",
				quantity: 7,
			},
		];
		const first = transferResources(initial, command, 4);
		const second = transferResources(initial, command, 4);

		expect(jcs(first)).toBe(jcs(second));
		expect(jcs(initial)).toBe(before);
		expect(Object.isFrozen(first)).toBe(true);
		expect(first.stocks["grain-citizen-a"]?.quantity).toBe(33);
		expect(first.stocks["grain-citizen-b"]?.quantity).toBe(27);
	});

	it("rejects an invalid transfer batch atomically and conserves valid transfers", () => {
		const initial = stateWithCitizenStocks();
		const before = jcs(initial);
		expect(() =>
			transferResources(
				initial,
				[
					{
						fromStockId: "grain-citizen-a",
						toStockId: "grain-citizen-b",
						quantity: 5,
					},
					{
						fromStockId: "grain-citizen-b",
						toStockId: "grain-citizen-c",
						quantity: 100,
					},
				],
				1,
			),
		).toThrowError(CivilizationError);
		expect(jcs(initial)).toBe(before);

		const after = transferResources(
			initial,
			[
				{
					fromStockId: "grain-citizen-a",
					toStockId: "grain-citizen-b",
					quantity: 5,
				},
				{
					fromStockId: "grain-citizen-b",
					toStockId: "grain-citizen-c",
					quantity: 3,
				},
			],
			1,
		);
		const audit = auditCivilizationState(after);
		expect(audit.ok).toBe(true);
		expect(audit.stockTotalsByResource.grain).toBe(70);
		assertCivilizationInvariants(after);
	});

	it("permits output only through a registered recipe with elapsed duration and capability", () => {
		let state = registerRecipe(stateWithCitizenStocks(), millingRecipe);
		state = startProduction(
			state,
			{
				processId: "process-one",
				recipeId: millingRecipe.recipeId,
				siteId: SITE,
				projectId: null,
				participantCitizenIds: [CITIZEN_A],
				startedAtSimulationTime: 2,
				expectedCompletionSimulationTime: 7,
				progressBasisPoints: 0,
				state: "active",
				sourceEventIds: [],
			},
			{
				inputStockIds: { grain: "grain-citizen-a" },
				outputStockIds: { meal: "meal-citizen-a" },
			},
		);
		expect(state.stocks["grain-citizen-a"]?.quantity).toBe(36);
		expect(() => completeProduction(state, "process-one", 6)).toThrowError(
			/duration/,
		);
		const completed = completeProduction(state, "process-one", 7);
		expect(completed.stocks["meal-citizen-a"]?.quantity).toBe(2);
		expect(completed.processes["process-one"]?.state).toBe("completed");
		expect(auditCivilizationState(completed).ok).toBe(true);
	});

	it("stores households, institutions, and an agreement as validated state", () => {
		let state = stateWithResources();
		state = registerHousehold(state, {
			householdId: "household-a",
			settlementId: SETTLEMENT,
			memberCitizenIds: [CITIZEN_A],
			dependentCitizenIds: [],
			dwellingBuildingId: null,
			sharedStorageIds: [],
			commitmentIds: [],
		});
		state = registerInstitution(state, {
			institutionId: "institution-a",
			settlementId: SETTLEMENT,
			name: "institution-a",
			kind: "mutual-aid",
			roles: [
				{
					roleId: "steward",
					name: "steward",
					authorityKinds: ["allocate"],
					capacity: 1,
				},
			],
			memberships: [
				{
					citizenId: CITIZEN_B,
					roleId: "steward",
					joinedAtSimulationTime: 0,
					leftAtSimulationTime: null,
					sourceEventIds: [],
				},
			],
			storageIds: [],
			projectIds: [],
			agreementIds: [],
			normIds: [],
			foundedAtSimulationTime: 0,
			dissolvedAtSimulationTime: null,
		});
		state = registerAgreement(state, {
			agreementId: "agreement-a",
			parties: [
				{ kind: "household", householdId: "household-a" },
				{ kind: "institution", institutionId: "institution-a" },
			],
			kind: "labor",
			commitments: ["provide-labor"],
			authorityInstitutionId: "institution-a",
			effectiveFromSimulationTime: 0,
			expiresAtSimulationTime: null,
			state: "active",
			sourceEventIds: [],
		});
		expect(state.agreements["agreement-a"]?.parties).toHaveLength(2);
	});

	it("rejects unknown sites, owners, and resource references", () => {
		const state = stateWithResources();
		expect(() =>
			registerStorage(state, {
				...storage("bad", { kind: "citizen", citizenId: CITIZEN_A }),
				siteId: "missing-site",
			}),
		).toThrowError(/unknown/);
		const validStorage = registerStorage(
			state,
			storage("storage-a", { kind: "citizen", citizenId: CITIZEN_A }),
		);
		expect(() =>
			registerStock(
				validStorage,
				stock(
					"bad-stock",
					{ kind: "citizen", citizenId: CITIZEN_A },
					"storage-a",
					"unknown-resource",
					1,
				),
			),
		).toThrowError(/unknown/);
	});
});
