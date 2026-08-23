import type { ProjectState } from "../../../packages/protocol/src/index.js";
import { jcs } from "../../../packages/protocol/src/index.js";
import { describe, expect, it } from "vitest";

import {
	CIVILIZATION_SCHEDULER_SCHEMA_VERSION,
	advanceGeneralizedScheduler,
	assertCivilizationInvariants,
	auditCivilizationState,
	createCivilizationState,
	registerAgreement,
	registerCitizen,
	registerInstitution,
	registerProject,
	registerRecipe,
	registerResourceDefinition,
	registerStock,
	registerStorage,
	runGeneralizedSchedulerHorizon,
	type CivilizationState,
	type GeneralizedSchedulerPolicy,
} from "../../../packages/civilization/src/index.js";

const DAY = 86_400;
const SETTLEMENT = "settlement-river";
const SOURCE_SITE = "site-forest";
const WORK_SITE = "site-hearth";

function citizen(citizenId: string, residenceState: "resident" | "departed") {
	return {
		schemaVersion: "eonfolk-civilization-social-v1" as const,
		citizenId,
		name: `Person ${citizenId}`,
		valueIds: ["care", "reliability"],
		settlementId: SETTLEMENT,
		siteId: WORK_SITE,
		householdId: null,
		primaryRoleId: "resident",
		residenceState,
		arrivedAtSimulationTime: 0,
		departedAtSimulationTime: residenceState === "departed" ? 0 : null,
		foodRequiredUnitsPerDay: 1,
		waterRequiredUnitsPerDay: 1,
		laborCapacitySecondsPerDay: 1_000,
		committedLaborSecondsPerDay: 100,
		lastSocialSimulationTime: 0,
		sourceEventIds: [],
	};
}

function project(): ProjectState {
	return {
		projectId: "project-granary",
		kind: "construction",
		name: "granary",
		settlementId: SETTLEMENT,
		siteId: WORK_SITE,
		sponsor: { kind: "institution", institutionId: "institution-council" },
		state: "proposed",
		dependencyProjectIds: [],
		milestones: [
			{
				milestoneId: "milestone-frame",
				name: "frame",
				dependencyMilestoneIds: [],
				resources: [
					{
						resourceTypeId: "timber",
						quantity: 4,
						deliveredQuantity: 0,
						consumedQuantity: 0,
					},
				],
				labor: [
					{
						capabilityId: "build",
						requiredLaborSeconds: 300,
						completedLaborSeconds: 0,
					},
				],
				progressBasisPoints: 0,
				state: "ready",
			},
		],
		participantCitizenIds: ["citizen-a"],
		storageId: "storage-project",
		startedAtSimulationTime: null,
		endedAtSimulationTime: null,
		failureReason: null,
		sourceEventIds: ["event-project-proposed"],
	};
}

function stock(
	stockId: string,
	storageId: string,
	resourceTypeId: string,
	quantity: number,
	owner:
		| { readonly kind: "settlement"; readonly settlementId: string }
		| { readonly kind: "institution"; readonly institutionId: string }
		| { readonly kind: "project"; readonly projectId: string },
) {
	return {
		stockId,
		storageId,
		resourceTypeId,
		quantity,
		reservedQuantity: 0,
		updatedAtSimulationTime: 0,
		owner,
	};
}

export function schedulerFixture(
	options: {
		readonly policyAgreement?: boolean;
		readonly provisions?: number;
	} = {},
): {
	readonly state: CivilizationState;
	readonly policy: GeneralizedSchedulerPolicy;
} {
	let state = createCivilizationState({
		citizenIds: ["citizen-c", "citizen-a", "citizen-b"],
		settlementIds: [SETTLEMENT],
		territoryIds: ["territory-river"],
		siteIds: [WORK_SITE, SOURCE_SITE],
		buildingKindsBySite: { [WORK_SITE]: ["workshop"], [SOURCE_SITE]: [] },
		capabilitiesByCitizen: {
			"citizen-a": { build: 8_000, craft: 8_000, haul: 7_000 },
			"citizen-b": { craft: 5_000 },
			"citizen-c": {},
		},
	});
	for (const definition of [
		{
			resourceTypeId: "grain",
			name: "grain",
			unit: "grams" as const,
			conserved: true,
			divisible: true,
			decayBasisPointsPerDay: 0,
		},
		{
			resourceTypeId: "food",
			name: "food",
			unit: "count" as const,
			conserved: false,
			divisible: false,
			decayBasisPointsPerDay: 0,
		},
		{
			resourceTypeId: "water",
			name: "water",
			unit: "milliliters" as const,
			conserved: false,
			divisible: true,
			decayBasisPointsPerDay: 0,
		},
		{
			resourceTypeId: "timber",
			name: "timber",
			unit: "millimeters" as const,
			conserved: true,
			divisible: true,
			decayBasisPointsPerDay: 0,
		},
	])
		state = registerResourceDefinition(state, definition);
	state = registerCitizen(state, citizen("citizen-a", "resident"));
	state = registerCitizen(state, citizen("citizen-b", "resident"));
	state = registerCitizen(state, citizen("citizen-c", "departed"));
	state = registerInstitution(state, {
		institutionId: "institution-council",
		settlementId: SETTLEMENT,
		name: "council",
		kind: "council",
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
				citizenId: "citizen-a",
				roleId: "steward",
				joinedAtSimulationTime: 0,
				leftAtSimulationTime: null,
				sourceEventIds: ["event-steward"],
			},
		],
		storageIds: [],
		projectIds: [],
		agreementIds: [],
		normIds: [],
		foundedAtSimulationTime: 0,
		dissolvedAtSimulationTime: null,
	});
	const settlementOwner = {
		kind: "settlement" as const,
		settlementId: SETTLEMENT,
	};
	const institutionOwner = {
		kind: "institution" as const,
		institutionId: "institution-council",
	};
	state = registerStorage(state, {
		storageId: "storage-source",
		siteId: SOURCE_SITE,
		owner: settlementOwner,
		acceptedResourceTypeIds: ["grain"],
		capacityByResource: { grain: 4_000 },
		accessInstitutionId: null,
	});
	state = registerStorage(state, {
		storageId: "storage-work",
		siteId: WORK_SITE,
		owner: settlementOwner,
		acceptedResourceTypeIds: ["grain", "food", "water"],
		capacityByResource: { grain: 20, food: 20, water: 20 },
		accessInstitutionId: null,
	});
	state = registerStorage(state, {
		storageId: "storage-council",
		siteId: WORK_SITE,
		owner: institutionOwner,
		acceptedResourceTypeIds: ["timber"],
		capacityByResource: { timber: 20 },
		accessInstitutionId: "institution-council",
	});
	state = registerStock(
		state,
		stock(
			"stock-grain-source",
			"storage-source",
			"grain",
			2_000,
			settlementOwner,
		),
	);
	state = registerStock(
		state,
		stock("stock-grain-work", "storage-work", "grain", 0, settlementOwner),
	);
	state = registerStock(
		state,
		stock(
			"stock-food",
			"storage-work",
			"food",
			options.provisions ?? 4,
			settlementOwner,
		),
	);
	state = registerStock(
		state,
		stock(
			"stock-water",
			"storage-work",
			"water",
			options.provisions ?? 4,
			settlementOwner,
		),
	);
	state = registerStock(
		state,
		stock(
			"stock-timber-council",
			"storage-council",
			"timber",
			8,
			institutionOwner,
		),
	);
	state = registerRecipe(state, {
		recipeId: "recipe-provisions",
		name: "prepare-provisions",
		durationSeconds: 600,
		laborSeconds: 100,
		requiredCapabilities: [
			{ capabilityId: "craft", levelBasisPoints: 5_000, sourceEventIds: [] },
		],
		requiredBuildingKinds: ["workshop"],
		inputs: [{ resourceTypeId: "grain", quantity: 4 }],
		outputs: [
			{ resourceTypeId: "food", quantity: 4 },
			{ resourceTypeId: "water", quantity: 4 },
		],
		byproducts: [],
	});
	state = registerProject(state, project(), {
		storageId: "storage-project",
		siteId: WORK_SITE,
		owner: { kind: "project", projectId: "project-granary" },
		acceptedResourceTypeIds: ["timber"],
		capacityByResource: { timber: 4 },
		accessInstitutionId: null,
	});
	state = registerStock(
		state,
		stock("stock-timber-project", "storage-project", "timber", 0, {
			kind: "project",
			projectId: "project-granary",
		}),
	);
	if (options.policyAgreement !== false)
		state = registerAgreement(state, {
			agreementId: "agreement-build",
			parties: [
				{ kind: "institution", institutionId: "institution-council" },
				{ kind: "settlement", settlementId: SETTLEMENT },
			],
			kind: "policy",
			commitments: ["allow-project:construction"],
			authorityInstitutionId: "institution-council",
			effectiveFromSimulationTime: 0,
			expiresAtSimulationTime: null,
			state: "active",
			sourceEventIds: ["event-policy"],
		});
	const policy: GeneralizedSchedulerPolicy = {
		schemaVersion: CIVILIZATION_SCHEDULER_SCHEMA_VERSION,
		stepSeconds: DAY,
		foodResourceTypeIds: ["food"],
		waterResourceTypeIds: ["water"],
		needStockIdsByCitizen: {
			"citizen-a": ["stock-food", "stock-water"],
			"citizen-b": ["stock-food", "stock-water"],
			"citizen-c": ["stock-food", "stock-water"],
		},
		transportLanes: [
			{
				laneId: "lane-grain",
				routeId: "route-grain",
				fromStockId: "stock-grain-source",
				toStockId: "stock-grain-work",
				carrierCitizenId: "citizen-a",
				traversalUnits: 2,
				capacityUnitsPerStep: 4,
				laborSecondsPerTraversalUnit: 25,
				requiredCapabilityId: "haul",
				minimumCapabilityBasisPoints: 5_000,
			},
		],
		productionJobs: [
			{
				jobId: "job-provisions",
				recipeId: "recipe-provisions",
				siteId: WORK_SITE,
				participantCitizenIds: ["citizen-a"],
				binding: {
					inputStockIds: { grain: "stock-grain-work" },
					outputStockIds: { food: "stock-food", water: "stock-water" },
				},
				outputStockId: "stock-food",
				targetQuantity: 8,
				inputLaneIds: ["lane-grain"],
			},
		],
		collectiveProjects: [
			{
				projectId: "project-granary",
				actorCitizenId: "citizen-a",
				buildingKind: "granary",
			},
		],
		demographicRules: [
			{
				ruleId: "return-c",
				citizenId: "citizen-c",
				kind: "arrive-on-sustained-surplus",
				thresholdBasisPoints: 0,
				sustainedSteps: 2,
				arrivalSettlementId: SETTLEMENT,
				arrivalSiteId: WORK_SITE,
			},
		],
		maxDemographicTransitionsPerStep: 1,
	};
	assertCivilizationInvariants(state);
	return { state, policy };
}

export function registerSchedulerTests(): void {
	describe("generalized civilization scheduler", () => {
		it("connects physical transport, capable labor, production, needs, institutions, agreement-gated work, and materialization", () => {
			const { state, policy } = schedulerFixture();
			const result = advanceGeneralizedScheduler(state, policy);
			expect(result.modelInvocations).toBe(0);
			expect(result.routines).toHaveLength(3);
			expect(
				result.routines.find(({ citizenId }) => citizenId === "citizen-a"),
			).toMatchObject({
				schemaVersion: "eonfolk-civilization-routine-v1",
				citizenId: "citizen-a",
			});
			expect(
				result.state.accounting.some((entry) => entry.kind === "transport"),
			).toBe(true);
			expect(result.actions.map(({ kind }) => kind)).toEqual(
				expect.arrayContaining([
					"transported",
					"process-started",
					"need-evaluated",
					"project-authorized",
					"project-resourced",
					"project-labor",
					"project-completed",
					"project-materialized",
				]),
			);
			expect(result.state.projects["project-granary"]?.state).toBe("completed");
			expect(
				result.state.materializedProjects["project-granary"]?.buildingKind,
			).toBe("granary");
			expect(result.state.references.buildingKindsBySite[WORK_SITE]).toContain(
				"granary",
			);
			expect(result.state.needOutcomes).toHaveLength(2);
			expect(result.state.stocks["stock-grain-source"]?.quantity).toBe(1_996);
			expect(auditCivilizationState(result.state)).toMatchObject({
				ok: true,
				issues: [],
			});
		});

		it("leaves collective construction inert without an active authorizing agreement", () => {
			const { state, policy } = schedulerFixture({ policyAgreement: false });
			const result = advanceGeneralizedScheduler(state, policy);
			expect(result.state.projects["project-granary"]?.state).toBe("proposed");
			expect(
				result.state.materializedProjects["project-granary"],
			).toBeUndefined();
			expect(
				result.actions.some(({ kind }) => kind.startsWith("project-")),
			).toBe(false);
			expect(auditCivilizationState(result.state).ok).toBe(true);
		});

		it("rejects a transport plan whose named carrier lacks the required capability", () => {
			const fixture = schedulerFixture();
			const policy: GeneralizedSchedulerPolicy = {
				...fixture.policy,
				transportLanes: fixture.policy.transportLanes.map((lane) => ({
					...lane,
					minimumCapabilityBasisPoints: 9_000,
				})),
			};
			const before = jcs(fixture.state);
			expect(() => advanceGeneralizedScheduler(fixture.state, policy)).toThrow(
				/lacks a capable carrier/,
			);
			expect(jcs(fixture.state)).toBe(before);
		});

		it("schedules the largest normalized scarcity first and honors shared lane capacity", () => {
			const fixture = schedulerFixture();
			const settlementOwner = {
				kind: "settlement" as const,
				settlementId: SETTLEMENT,
			};
			let state = registerStorage(fixture.state, {
				storageId: "storage-relief",
				siteId: WORK_SITE,
				owner: settlementOwner,
				acceptedResourceTypeIds: ["food", "water"],
				capacityByResource: { food: 20, water: 20 },
				accessInstitutionId: null,
			});
			state = registerStock(
				state,
				stock(
					"stock-food-relief",
					"storage-relief",
					"food",
					0,
					settlementOwner,
				),
			);
			state = registerStock(
				state,
				stock(
					"stock-water-relief",
					"storage-relief",
					"water",
					0,
					settlementOwner,
				),
			);
			const primary = fixture.policy.productionJobs[0];
			expect(primary).toBeDefined();
			if (primary === undefined)
				throw new Error("fixture lacks production job");
			const policy: GeneralizedSchedulerPolicy = {
				...fixture.policy,
				collectiveProjects: [],
				productionJobs: [
					{ ...primary, targetQuantity: 5 },
					{
						...primary,
						jobId: "job-relief",
						outputStockId: "stock-food-relief",
						targetQuantity: 8,
						binding: {
							inputStockIds: { grain: "stock-grain-work" },
							outputStockIds: {
								food: "stock-food-relief",
								water: "stock-water-relief",
							},
						},
					},
				],
			};
			const result = advanceGeneralizedScheduler(state, policy);
			expect(
				result.actions.filter(({ kind }) => kind === "transported"),
			).toHaveLength(1);
			expect(
				result.actions.find(({ kind }) => kind === "process-started")
					?.subjectId,
			).toContain("job-relief");
			expect(auditCivilizationState(result.state).ok).toBe(true);
		});

		it("bounds demographic change to one known person under grounded scarcity", () => {
			const fixture = schedulerFixture({ provisions: 0 });
			const policy: GeneralizedSchedulerPolicy = {
				...fixture.policy,
				productionJobs: [],
				collectiveProjects: [],
				demographicRules: [
					{
						ruleId: "depart-a",
						citizenId: "citizen-a",
						kind: "depart-on-unmet-need",
						thresholdBasisPoints: 5_000,
						sustainedSteps: 1,
						arrivalSettlementId: SETTLEMENT,
						arrivalSiteId: WORK_SITE,
					},
					{
						ruleId: "depart-b",
						citizenId: "citizen-b",
						kind: "depart-on-unmet-need",
						thresholdBasisPoints: 5_000,
						sustainedSteps: 1,
						arrivalSettlementId: SETTLEMENT,
						arrivalSiteId: WORK_SITE,
					},
				],
			};
			const result = advanceGeneralizedScheduler(fixture.state, policy);
			expect(
				result.actions.filter(({ kind }) => kind === "citizen-departed"),
			).toHaveLength(1);
			expect(
				Object.values(result.state.citizens).filter(
					({ residenceState }) => residenceState === "departed",
				),
			).toHaveLength(2);
			expect(auditCivilizationState(result.state).ok).toBe(true);
		});

		it.each([30, 90, 365])(
			"is deterministic, audit-clean, and model-free across %i days",
			(days) => {
				const fixture = schedulerFixture();
				const first = runGeneralizedSchedulerHorizon(
					fixture.state,
					fixture.policy,
					days,
				);
				const second = runGeneralizedSchedulerHorizon(
					fixture.state,
					fixture.policy,
					days,
				);
				expect(jcs(first.state)).toBe(jcs(second.state));
				expect(first.completedSteps).toBe(days);
				expect(first.modelInvocations).toBe(0);
				expect(first.routines).toHaveLength(3);
				expect(first.state.simulationTime).toBe(days * DAY);
				expect(first.state.citizens["citizen-c"]?.residenceState).toBe(
					"resident",
				);
				expect(
					Object.values(first.state.stocks).every(
						({ quantity }) => quantity >= 0,
					),
				).toBe(true);
				expect(
					first.state.needOutcomes.every(
						(outcome) =>
							outcome.foodConsumedUnits === outcome.foodRequiredUnits &&
							outcome.waterConsumedUnits === outcome.waterRequiredUnits,
					),
				).toBe(true);
				expect(auditCivilizationState(first.state)).toMatchObject({
					ok: true,
					issues: [],
				});
			},
		);

		it("audits persisted need facts against their exact resource accounting", () => {
			const fixture = schedulerFixture();
			const result = advanceGeneralizedScheduler(fixture.state, fixture.policy);
			const tampered: CivilizationState = {
				...result.state,
				needOutcomes: result.state.needOutcomes.map((outcome, index) =>
					index === 0 ? { ...outcome, foodConsumedUnits: 0 } : outcome,
				),
			};
			expect(auditCivilizationState(tampered).issues).toEqual(
				expect.arrayContaining([
					expect.stringMatching(
						/differs from accounting|wrong food accounting/,
					),
				]),
			);
		});
	});
}
