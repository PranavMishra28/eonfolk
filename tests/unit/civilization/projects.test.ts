import { describe, expect, it } from "vitest";

import {
	abandonProject,
	advanceFounding,
	advanceMigration,
	advanceMigrationJourney,
	approveProject,
	completeProject,
	completeProjectMilestone,
	consumeProjectResource,
	contributeProjectLabor,
	deliverProjectResource,
	failProject,
	recordFoundingMaterialization,
	registerFounding,
	registerMigration,
	registerMigrationJourney,
	registerProject,
	registerStock,
	startProject,
} from "../../../packages/civilization/src/index.js";
import {
	CITIZEN_A,
	project,
	SETTLEMENT,
	stateWithCitizenStocks,
	stock,
	storage,
	TERRITORY,
} from "./fixtures.js";

function registeredProject(
	state: ReturnType<typeof stateWithCitizenStocks>,
	projectId: string,
	dependencies: readonly string[] = [],
) {
	const record = project(projectId, dependencies);
	let next = registerProject(
		state,
		record,
		storage(record.storageId, { kind: "project", projectId }),
	);
	next = registerStock(next, {
		...stock(
			`${projectId}-timber`,
			{ kind: "project", projectId },
			record.storageId,
			"timber",
			0,
		),
		updatedAtSimulationTime: next.simulationTime,
	});
	return next;
}

function finishProject(
	state: ReturnType<typeof stateWithCitizenStocks>,
	projectId: string,
	at = 1,
) {
	const milestoneId = `${projectId}-milestone`;
	let next = approveProject(state, projectId);
	next = startProject(next, projectId, at);
	next = deliverProjectResource(next, {
		projectId,
		milestoneId,
		fromStockId: "timber-citizen-a",
		toStockId: `${projectId}-timber`,
		quantity: 2,
		atSimulationTime: at,
	});
	next = consumeProjectResource(next, {
		projectId,
		milestoneId,
		stockId: `${projectId}-timber`,
		quantity: 2,
		atSimulationTime: at,
	});
	next = contributeProjectLabor(next, {
		projectId,
		milestoneId,
		citizenId: CITIZEN_A,
		capabilityId: "build",
		laborSeconds: 3,
		atSimulationTime: at,
	});
	next = completeProjectMilestone(next, projectId, milestoneId);
	return completeProject(next, projectId, at);
}

describe("civilization projects and physical expansion", () => {
	it("enforces dependency, resource, labor, progress, and completion gates", () => {
		let state = registeredProject(stateWithCitizenStocks(), "project-base");
		state = registeredProject(state, "project-dependent", ["project-base"]);
		state = approveProject(state, "project-dependent");
		expect(() => startProject(state, "project-dependent", 1)).toThrowError(
			/incomplete/,
		);
		state = finishProject(state, "project-base");
		state = startProject(state, "project-dependent", 2);
		state = deliverProjectResource(state, {
			projectId: "project-dependent",
			milestoneId: "project-dependent-milestone",
			fromStockId: "timber-citizen-a",
			toStockId: "project-dependent-timber",
			quantity: 2,
			atSimulationTime: 2,
		});
		state = consumeProjectResource(state, {
			projectId: "project-dependent",
			milestoneId: "project-dependent-milestone",
			stockId: "project-dependent-timber",
			quantity: 2,
			atSimulationTime: 2,
		});
		expect(
			state.projects["project-dependent"]?.milestones[0]?.progressBasisPoints,
		).toBe(5_000);
		expect(() =>
			completeProjectMilestone(
				state,
				"project-dependent",
				"project-dependent-milestone",
			),
		).toThrowError(/incomplete/);
		state = contributeProjectLabor(state, {
			projectId: "project-dependent",
			milestoneId: "project-dependent-milestone",
			citizenId: CITIZEN_A,
			capabilityId: "build",
			laborSeconds: 3,
			atSimulationTime: 2,
		});
		state = completeProjectMilestone(
			state,
			"project-dependent",
			"project-dependent-milestone",
		);
		state = completeProject(state, "project-dependent", 3);
		expect(state.projects["project-dependent"]?.state).toBe("completed");
	});

	it("supports explicit project failure and abandonment without time triggers", () => {
		let state = registeredProject(stateWithCitizenStocks(), "project-fail");
		state = failProject(state, "project-fail", "site-unusable", 2);
		expect(state.projects["project-fail"]?.state).toBe("failed");
		expect(state.projects["project-fail"]?.failureReason).toBe("site-unusable");
		state = registeredProject(state, "project-abandon");
		state = abandonProject(state, "project-abandon", 3);
		expect(state.projects["project-abandon"]?.state).toBe("abandoned");
	});

	it("requires physically carried stocks and completed projects for founding viability", () => {
		let state = registeredProject(stateWithCitizenStocks(), "project-shelter");
		state = registerMigration(
			state,
			{
				migrationId: "migration-a",
				citizenIds: [CITIZEN_A],
				originSettlementId: SETTLEMENT,
				destinationTerritoryId: TERRITORY,
				destinationSettlementId: null,
				carriedStockIds: ["grain-citizen-a"],
				departureSimulationTime: 2,
				expectedArrivalSimulationTime: 5,
				state: "planned",
				sourceEventIds: [],
			},
			[{ resourceTypeId: "grain", quantity: 10 }],
		);
		state = registerFounding(
			state,
			{
				foundingId: "founding-a",
				migrationId: "migration-a",
				proposedSettlementId: "settlement-new",
				territoryId: TERRITORY,
				founderCitizenIds: [CITIZEN_A],
				requiredProjectIds: ["project-shelter"],
				requiredStockIds: ["grain-citizen-a"],
				state: "proposed",
				viabilityEvidenceEventIds: [],
			},
			[{ resourceTypeId: "grain", quantity: 10 }],
		);
		state = registerMigrationJourney(state, "migration-a", {
			cellIds: ["cell-origin", "cell-ford", "cell-destination"],
			traversalUnitsByLeg: [4, 6],
		});
		state = advanceFounding(state, "founding-a", "preparing", 1);
		expect(() =>
			advanceFounding(state, "founding-a", "travelling", 2),
		).toThrowError(/departed/);
		state = advanceMigration(state, "migration-a", "travelling", 2);
		state = advanceFounding(state, "founding-a", "travelling", 2);
		expect(() =>
			advanceMigration(state, "migration-a", "arrived", 5),
		).toThrowError(/route traversal/);
		state = advanceMigrationJourney(state, "migration-a", 4, 3);
		expect(state.migrations["migration-a"]?.state).toBe("travelling");
		expect(
			state.migrationJourneys["migration-a"]?.completedTraversalUnits,
		).toBe(4);
		state = advanceMigrationJourney(state, "migration-a", 6, 5);
		expect(state.migrations["migration-a"]?.state).toBe("arrived");
		state = advanceFounding(state, "founding-a", "establishing", 5);
		expect(() =>
			advanceFounding(state, "founding-a", "viable", 5),
		).toThrowError(/incomplete/);
		state = finishProject(state, "project-shelter", 6);
		state = advanceFounding(state, "founding-a", "viable", 6);
		expect(state.foundings["founding-a"]?.state).toBe("viable");
		state = recordFoundingMaterialization(state, "founding-a", 6);
		expect(state.references.settlementIds).toContain("settlement-new");
		expect(state.materializedFoundings).toEqual({
			"founding-a": "settlement-new",
		});
	});

	it("rejects invalid project and migration references", () => {
		const state = stateWithCitizenStocks();
		const invalid = { ...project("project-bad"), siteId: "site-missing" };
		expect(() =>
			registerProject(
				state,
				invalid,
				storage(invalid.storageId, {
					kind: "project",
					projectId: invalid.projectId,
				}),
			),
		).toThrowError(/unknown/);
		expect(() =>
			registerMigration(
				state,
				{
					migrationId: "migration-bad",
					citizenIds: [CITIZEN_A],
					originSettlementId: SETTLEMENT,
					destinationTerritoryId: TERRITORY,
					destinationSettlementId: null,
					carriedStockIds: ["timber-citizen-a"],
					departureSimulationTime: 1,
					expectedArrivalSimulationTime: 2,
					state: "planned",
					sourceEventIds: [],
				},
				[{ resourceTypeId: "grain", quantity: 100 }],
			),
		).toThrowError(/unmet/);
		let journeyState = registerMigration(
			state,
			{
				migrationId: "migration-route",
				citizenIds: [CITIZEN_A],
				originSettlementId: SETTLEMENT,
				destinationTerritoryId: TERRITORY,
				destinationSettlementId: null,
				carriedStockIds: ["grain-citizen-a"],
				departureSimulationTime: 1,
				expectedArrivalSimulationTime: 2,
				state: "planned",
				sourceEventIds: [],
			},
			[{ resourceTypeId: "grain", quantity: 1 }],
		);
		expect(() =>
			advanceMigration(journeyState, "migration-route", "travelling", 1),
		).toThrowError(/physical route/);
		expect(() =>
			registerMigrationJourney(journeyState, "migration-route", {
				cellIds: ["cell-a", "cell-a"],
				traversalUnitsByLeg: [1],
			}),
		).toThrowError(/cycle/);
		journeyState = registerMigrationJourney(journeyState, "migration-route", {
			cellIds: ["cell-a", "cell-b"],
			traversalUnitsByLeg: [2],
		});
		journeyState = advanceMigration(
			journeyState,
			"migration-route",
			"travelling",
			1,
		);
		expect(() =>
			advanceMigrationJourney(journeyState, "migration-route", 0, 1),
		).toThrowError(/positive/);
	});
});
