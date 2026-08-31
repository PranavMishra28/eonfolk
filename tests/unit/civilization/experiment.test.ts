import { describe, expect, it } from "vitest";
import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "../../../apps/web/src/v1-genesis-runtime.js";
import {
	assertCivilizationInvariants,
	BULK_OPENING_DECISION_HORIZON_DAYS,
	bulkOpeningDecisionCount,
	continueCivilizationExperimentDay,
	deriveCivilizationSeedConditions,
	FAST_OPENING_DECISION_HORIZON_DAYS,
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
	runCivilizationExperiment,
} from "../../../packages/civilization/src/index.js";
import { replayCivilizationSchedulerDecisions } from "../../../packages/cognition/src/index.js";
import {
	createReleaseGenesis,
	domainHash,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { projectGeneratedCivilizationSpatial } from "../../../packages/world-presentation/src/index.js";
import {
	generateWorld,
	materializeFoundedSettlement,
	planTerritoryMigrationRoute,
} from "../../../packages/worldgen/src/index.js";

const PROGRESSION_SEED =
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";
const STAGNATION_SEED = "0e".padStart(64, "0");
const FAST_OPENING_DECISION_COUNT = bulkOpeningDecisionCount(
	FAST_OPENING_DECISION_HORIZON_DAYS,
);
const THIRTY_DAY_OPENING_DECISION_COUNT = bulkOpeningDecisionCount(30);
/** Odd day inside the Standard Brain prefix where idle related residents pair. */
const THINKING_CONVERSATION_DAY = 5;

async function generatedWorld(seedHex: string, releaseId: string) {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({ releaseId, seedHex }),
	});
}

describe("deterministic civilization experiment", () => {
	it("grounds the V1 release carrier at its authoritative supply-route origin", async () => {
		const releaseGenesis = await createReleaseGenesis({
			releaseId: V1_GENESIS_RELEASE_ID,
			seedHex: V1_GENESIS_SEED,
		});
		const world = await generateWorld({
			releaseGenesis,
			worldId: V1_GENESIS_WORLD_ID,
			treatmentId: "standard-brain",
		});
		const run = await runCivilizationExperiment({ world, horizonDays: 30 });
		const carrier = run.activities.find(
			(activity) => activity.location.kind === "route",
		);
		expect(carrier?.citizenId).toBe("citizen-05");
		expect(carrier?.routine.kind).toBe("transport");
		if (carrier?.location.kind !== "route" || carrier.routine.route === null)
			throw new Error("V1 release route carrier is not grounded");
		expect(run.state.citizens[carrier.citizenId]?.siteId).toBe(
			carrier.routine.route.fromSiteId,
		);
		expect(carrier.location.progressBasisPoints).toBeGreaterThan(0);
		expect(run.metrics.completedProjects).toBeGreaterThan(0);
		expect(run.metrics.materializedSettlements).toBeGreaterThan(0);
	});
	it("derives legitimate progression and stagnation from generated geography", async () => {
		const progressingWorld = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-progressing",
		);
		const stagnantWorld = await generatedWorld(
			STAGNATION_SEED,
			"civilization-stagnant",
		);
		const progressing = deriveCivilizationSeedConditions(progressingWorld);
		const stagnant = deriveCivilizationSeedConditions(stagnantWorld);

		expect(progressing.expansionEligible).toBe(true);
		expect(progressing.eligibilityReasons).toEqual([]);
		expect(stagnant.expansionEligible).toBe(false);
		expect(stagnant.eligibilityReasons).toContain(
			"destination-suitability-below-threshold",
		);
		expect(stagnant.destination.suitabilityBasisPoints).toBeLessThan(
			progressing.destination.suitabilityBasisPoints,
		);

		const sameGeography = await generatedWorld(
			STAGNATION_SEED,
			"renamed-stagnant-fixture",
		);
		expect(deriveCivilizationSeedConditions(sameGeography)).toEqual(stagnant);
		const route = planTerritoryMigrationRoute(progressingWorld, {
			originSettlementId: progressing.originSettlementId,
			destinationTerritoryId: progressing.destination.territoryId,
		});
		expect({
			destinationCellId: route.destinationCellId,
			cellIds: route.cellIds,
			traversalUnitsByLeg: route.traversalUnitsByLeg,
			totalTraversalUnits: route.totalTraversalUnits,
		}).toEqual(progressing.route);
	});

	it("materializes a frozen canonical founding without mutating generated genesis", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-world-materialization",
		);
		const conditions = deriveCivilizationSeedConditions(world);
		const evolved = materializeFoundedSettlement(world, {
			settlementId: "settlement-test-founding",
			name: "Test Founding",
			territoryId: conditions.destination.territoryId,
			anchorCellId: conditions.route.destinationCellId,
			founderCitizenIds: ["citizen-01"],
			residentCitizenIds: ["citizen-01"],
			migrationId: "migration-test-founding",
			foundedAtSimulationTime: 86_400,
		});
		expect(Object.keys(world.settlements)).toHaveLength(1);
		expect(Object.keys(evolved.settlements)).toHaveLength(2);
		expect(evolved.settlements["settlement-test-founding"]?.provenance).toEqual(
			{
				sourceKind: "migration",
				sourceId: "migration-test-founding",
				schemaVersion: "eonfolk-world-founding-v1",
			},
		);
		expect(Object.isFrozen(evolved)).toBe(true);
		expect(Object.isFrozen(evolved.settlements)).toBe(true);
	});

	it("replays a 90-day physical founding byte-for-byte with versioned hash chains", async () => {
		const world = await generatedWorld(PROGRESSION_SEED, "civilization-replay");
		const first = await runCivilizationExperiment({
			world,
			horizonDays: FAST_OPENING_DECISION_HORIZON_DAYS,
		});
		const second = await runCivilizationExperiment({
			world,
			horizonDays: FAST_OPENING_DECISION_HORIZON_DAYS,
		});

		expect(jcs(second)).toBe(jcs(first));
		expect({
			eventVersions: [
				...new Set(first.events.map((event) => event.schemaVersion)),
			],
			runnerVersion: first.runnerVersion,
			schemaVersion: first.schemaVersion,
			stepVersions: [...new Set(first.steps.map((step) => step.schemaVersion))],
		}).toEqual({
			eventVersions: ["eonfolk-civilization-experiment-event-v9"],
			runnerVersion: "eonfolk-civilization-runner-v9",
			schemaVersion: "eonfolk-civilization-experiment-v9",
			stepVersions: ["eonfolk-civilization-experiment-step-v9"],
		});
		expect(first.steps).toHaveLength(FAST_OPENING_DECISION_HORIZON_DAYS);
		expect(first.steps[0]?.fromSimulationTime).toBe(0);
		expect(first.steps.at(-1)?.toSimulationTime).toBe(
			FAST_OPENING_DECISION_HORIZON_DAYS * 86_400,
		);
		expect(new Set(first.steps.map((step) => step.stepHash))).toHaveLength(
			FAST_OPENING_DECISION_HORIZON_DAYS,
		);
		expect(first.finalStateHash).toBe(first.steps.at(-1)?.postStateHash);
		expect(first.events.map((event) => event.kind)).toEqual([
			"project-stalled",
			"project-approved",
			"project-completed",
			"migration-prepared",
			"migration-departed",
			"migration-traversed",
			"migration-arrived",
			"founding-viable",
			"settlement-materialized",
			"project-originated",
			"project-approved",
			"project-completed",
		]);
		for (const [index, event] of first.events.entries()) {
			expect(event.eventIndex).toBe(index);
			expect(event.priorEventHash).toBe(
				index === 0 ? null : first.events[index - 1]?.eventHash,
			);
			const { eventHash, eventId, ...eventBody } = event;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-EVENT:v7", eventBody),
			).toBe(eventHash);
			expect(eventId).toBe(
				`civilization-event:${index}:${eventHash.slice(0, 16)}`,
			);
		}
		for (const [index, step] of first.steps.entries()) {
			const { stepHash, ...stepBody } = step;
			expect(
				await domainHash("EONFOLK:CIVILIZATION-EXPERIMENT-STEP:v7", stepBody),
			).toBe(stepHash);
			expect(step.stepIndex).toBe(index);
			expect(step.fromSimulationTime).toBe(index * 86_400);
			expect(step.toSimulationTime).toBe((index + 1) * 86_400);
			if (index > 0)
				expect(step.preStateHash).toBe(first.steps[index - 1]?.postStateHash);
		}
		expect(first.finalEventHash).toBe(first.events.at(-1)?.eventHash);
		expect(first.cognitionDecisions).toHaveLength(FAST_OPENING_DECISION_COUNT);
		expect(
			new Set(first.cognitionDecisions.map(({ actorId }) => actorId)),
		).toHaveLength(8);
		expect(
			first.cognitionDecisions.every(
				({ modelInvocations }) => modelInvocations === 0,
			),
		).toBe(true);
		expect(first.finalStandingPlans).toHaveLength(8);
		expect(
			first.cognitionDecisions.some(
				({ planTransition }) => planTransition === "choice-replanned",
			),
		).toBe(true);
		const waterMemoryDecision = first.cognitionDecisions.find(
			({ selectedActionId }) =>
				selectedActionId === "transport:lane-daily-water",
		);
		expect(waterMemoryDecision).toMatchObject({
			actorId: "citizen-06",
			planTransition: "choice-replanned",
			routine: { kind: "transport", subjectId: "lane-daily-water" },
			modelInvocations: 0,
		});
		expect(waterMemoryDecision?.retrievedMemoryIds).toEqual([
			"memory:citizen-06:water-reserve",
		]);
		expect(waterMemoryDecision?.readVisibleRecordIds).toEqual([
			"memory:citizen-06:water-reserve",
		]);
		expect(
			replayCivilizationSchedulerDecisions(first.cognitionDecisions),
		).toEqual(first.cognitionDecisions.map(({ routine }) => routine));
		expect(first.metrics.modelInvocations).toBe(0);
		expect(first.metrics.standardBrainDecisionCount).toBe(
			FAST_OPENING_DECISION_COUNT,
		);
		expect(first.metrics.standingPlanTransitionCount).toBeGreaterThan(8);
		expect(first.metrics.memoryRetrievedDecisionCount).toBeGreaterThanOrEqual(
			3,
		);
		expect(first.metrics.outcome).toBe("progression");
		expect(first.metrics.viableFoundings).toBe(1);
		expect(first.metrics.materializedSettlements).toBe(1);
		expect(first.state.projects["project-expedition-kit"]?.state).toBe(
			"completed",
		);
		expect(
			first.state.projects["project-citizen-06-water-reserve"]?.state,
		).toBe("completed");
		expect(first.metrics.completedProjects).toBe(2);
		expect(first.state.migrations["migration-founding-party"]?.state).toBe(
			"arrived",
		);
		expect(first.state.foundings["founding-second-settlement"]?.state).toBe(
			"viable",
		);
		expect(first.state.materializedFoundings).toEqual({
			"founding-second-settlement": "settlement-second",
		});
		expect(first.state.references.settlementIds).toContain("settlement-second");
		expect(Object.keys(first.state.citizens)).toHaveLength(8);
		expect(Object.keys(first.state.households)).toHaveLength(4);
		expect(Object.keys(first.state.relationships)).toHaveLength(8);
		expect(first.metrics.population).toBe(8);
		expect(first.metrics.residentPopulation).toBe(8);
		expect(first.metrics.travellingPopulation).toBe(0);
		expect(first.metrics.departedPopulation).toBe(0);
		expect(first.metrics.householdCount).toBe(4);
		expect(first.metrics.relationshipCount).toBe(8);
		expect(first.metrics.completedProductionRuns).toBeGreaterThan(0);
		expect(first.metrics.consumedNeedUnits).toBeGreaterThan(0);
		expect(first.metrics.transportedResourceUnits).toBeGreaterThan(0);
		expect(first.metrics.groundedNeedOutcomes).toBeGreaterThanOrEqual(8 * 89);
		expect(first.metrics.agreementGatedInstitutionProjects).toBe(1);
		expect(first.metrics.averagePressureBasisPointsByKind).toEqual({
			food: expect.any(Number),
			water: expect.any(Number),
			housing: expect.any(Number),
			labor: expect.any(Number),
			travel: expect.any(Number),
			social: expect.any(Number),
		});
		expect(first.activities).toHaveLength(8);
		expect(
			new Set(first.activities.map(({ citizenId }) => citizenId)).size,
		).toBe(8);
		expect(
			first.activities.every(
				(activity) =>
					activity.canonicalAction.sourceKind === "current-behavior" &&
					activity.canonicalAction.eventId === null &&
					activity.routine.schemaVersion ===
						"eonfolk-civilization-routine-v1" &&
					activity.canonicalAction.simulationEnd !== null &&
					activity.visualLifecycle.simulationEnd <=
						activity.canonicalAction.simulationEnd,
			),
		).toBe(true);
		expect(jcs(second.activities)).toBe(jcs(first.activities));
		expect(first.state.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID]).toMatchObject(
			{
				name: "Mara Vale",
				valueIds: ["stewardship", "curiosity"],
				primaryRoleId: "expedition-steward",
				settlementId: first.seedConditions.originSettlementId,
				residenceState: "resident",
			},
		);
		expect(
			first.state.citizens[RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID],
		).toMatchObject({
			name: "Orin Ash",
			settlementId: "settlement-second",
			siteId: "settlement-second:founding-site",
			residenceState: "resident",
		});
		expect(first.state.references.siteIds).toContain(
			"settlement-second:founding-site",
		);
		expect(
			first.state.stocks["stock-migrant-water"]?.quantity,
		).toBeGreaterThanOrEqual(18);
		expect(Object.keys(world.settlements)).toHaveLength(1);
		expect(Object.keys(first.world.settlements)).toHaveLength(2);
		const secondSettlement = first.world.settlements["settlement-second"];
		expect(secondSettlement?.dataClass).toBe("canonical");
		expect(secondSettlement?.provenance.sourceKind).toBe("migration");
		expect(secondSettlement?.value.territoryId).toBe(
			first.seedConditions.destination.territoryId,
		);
		expect(secondSettlement?.value.anchorCellId).toBe(
			first.seedConditions.route.destinationCellId,
		);
		expect(
			first.world.localSpaces[secondSettlement?.value.localSpaceId ?? ""],
		).toBeDefined();
		expect(
			first.world.sites[secondSettlement?.value.siteIds[0] ?? ""],
		).toBeDefined();
		expect(
			first.world.interactionSlots["settlement-second:founding-site:camp-slot"],
		).toBeDefined();
		const journey = first.state.migrationJourneys["migration-founding-party"];
		expect(journey?.completedTraversalUnits).toBe(
			first.seedConditions.route.totalTraversalUnits,
		);
		expect(journey?.currentLegIndex).toBe(
			first.seedConditions.route.traversalUnitsByLeg.length,
		);
		expect(first.seedConditions.route.cellIds.at(-1)).toBe(
			secondSettlement?.value.anchorCellId,
		);
		for (const [
			index,
			cellId,
		] of first.seedConditions.route.cellIds.entries()) {
			const cell = first.world.cells[cellId]?.value;
			expect(cell?.terrain).not.toBe("water");
			if (index === 0) continue;
			const prior =
				first.world.cells[first.seedConditions.route.cellIds[index - 1] ?? ""]
					?.value;
			expect(
				Math.abs((cell?.gridX ?? 0) - (prior?.gridX ?? 0)) +
					Math.abs((cell?.gridY ?? 0) - (prior?.gridY ?? 0)),
			).toBe(1);
		}
		expect(
			(first.state.stocks["stock-migrant-grain"]?.quantity ?? 0) >= 18,
		).toBe(true);
		expect(
			(first.state.stocks["stock-migrant-timber"]?.quantity ?? 0) >= 8,
		).toBe(true);
		const identities = Object.values(first.state.citizens).map((citizen) => ({
			name: citizen.name,
			roleId: citizen.primaryRoleId,
			valueIds: citizen.valueIds,
		}));
		expect(new Set(identities.map(({ name }) => name)).size).toBe(8);
		expect(
			identities.every(
				({ name, roleId, valueIds }) =>
					name.length > 0 && roleId !== null && valueIds.length >= 1,
			),
		).toBe(true);
		expect(JSON.parse(jcs(first.state)).citizens["citizen-01"]).toMatchObject({
			name: "Mara Vale",
			primaryRoleId: "expedition-steward",
			valueIds: ["stewardship", "curiosity"],
		});
		expect(first.metrics.invariantIssues).toEqual([]);
		expect(first.limitations.join(" ")).not.toMatch(/cannot materialize/u);
		assertCivilizationInvariants(first.state);
	});

	it("leaves an unsuitable seed honestly stagnant under the same rules", async () => {
		const world = await generatedWorld(
			STAGNATION_SEED,
			"civilization-stagnation",
		);
		const run = await runCivilizationExperiment({ world, horizonDays: 90 });

		expect(run.seedConditions.expansionEligible).toBe(false);
		expect(run.events.map((event) => event.kind)).toEqual([
			"expansion-deferred",
			"project-originated",
			"project-approved",
			"project-completed",
		]);
		expect(run.metrics.outcome).toBe("stagnation");
		expect(run.metrics.outcomeReason).toContain(
			"destination-suitability-below-threshold",
		);
		expect(run.metrics.completedProjects).toBe(1);
		expect(run.state.projects["project-citizen-06-water-reserve"]?.state).toBe(
			"completed",
		);
		expect(run.metrics.completedProductionRuns).toBeGreaterThan(0);
		expect(run.metrics.consumedNeedUnits).toBeGreaterThan(0);
		expect(run.metrics.transportedResourceUnits).toBeGreaterThan(0);
		expect(run.metrics.groundedNeedOutcomes).toBeGreaterThan(0);
		expect(run.metrics.agreementGatedInstitutionProjects).toBe(0);
		expect(run.metrics.arrivedMigrations).toBe(0);
		expect(run.metrics.viableFoundings).toBe(0);
		expect(run.metrics.materializedSettlements).toBe(0);
		expect(Object.keys(run.world.settlements)).toHaveLength(1);
		expect(Object.keys(run.state.migrations)).toEqual([]);
		expect(Object.keys(run.state.foundings)).toEqual([]);
		expect(run.metrics.invariantIssues).toEqual([]);
	});

	it("schedules one relationship-grounded mutual conversation on a thinking day", async () => {
		expect(THINKING_CONVERSATION_DAY).toBeLessThanOrEqual(
			BULK_OPENING_DECISION_HORIZON_DAYS,
		);
		expect(THINKING_CONVERSATION_DAY % 2).toBe(1);
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-canonical-social-interaction",
		);
		const run = await runCivilizationExperiment({
			world,
			horizonDays: THINKING_CONVERSATION_DAY,
		});
		expect(run.cognitionDecisions).toHaveLength(THINKING_CONVERSATION_DAY * 8);
		const social = run.activities.filter((activity) =>
			["talk", "listen", "exchange"].includes(activity.canonicalAction.kind),
		);
		expect(social).toHaveLength(2);
		const first = social[0];
		const second = social[1];
		if (first === undefined || second === undefined)
			throw new Error("release genesis lacks its canonical social dyad");
		expect(first.citizenId).not.toBe(second.citizenId);
		expect(first.canonicalAction.targetId).toBe(second.citizenId);
		expect(second.canonicalAction.targetId).toBe(first.citizenId);
		expect(first.routine).toMatchObject({
			kind: "social-maintenance",
			subjectId: second.citizenId,
			route: null,
		});
		expect(second.routine).toMatchObject({
			kind: "social-maintenance",
			subjectId: first.citizenId,
			route: null,
		});
		const firstCitizen = run.state.citizens[first.citizenId];
		const secondCitizen = run.state.citizens[second.citizenId];
		expect(firstCitizen).toBeDefined();
		expect(secondCitizen).toBeDefined();
		expect(firstCitizen?.settlementId).toBe(secondCitizen?.settlementId);
		expect(firstCitizen?.siteId).toBe(secondCitizen?.siteId);
		expect(
			Object.values(run.state.relationships).some(
				(relationship) =>
					(relationship.fromCitizenId === first.citizenId &&
						relationship.toCitizenId === second.citizenId) ||
					(relationship.fromCitizenId === second.citizenId &&
						relationship.toCitizenId === first.citizenId),
			),
		).toBe(true);
		expect(first.location).toEqual(second.location);
		if (
			first.location.kind !== "interaction-slot" ||
			second.location.kind !== "interaction-slot"
		)
			throw new Error("canonical social dyad is not slot-grounded");
		const slot =
			run.world.interactionSlots[first.location.interactionSlotId]?.value;
		expect(slot?.siteId).toBe(firstCitizen?.siteId);
		expect(slot?.capacity).toBeGreaterThanOrEqual(2);
		expect(
			new Set([
				first.canonicalAction.affordanceSlotIndex,
				second.canonicalAction.affordanceSlotIndex,
			]),
		).toHaveLength(2);
		expect(firstCitizen?.lastSocialSimulationTime).toBe(
			run.state.simulationTime,
		);
		expect(secondCitizen?.lastSocialSimulationTime).toBe(
			run.state.simulationTime,
		);
		expect(firstCitizen?.lastSocialSimulationTime).not.toBe(
			first.visualLifecycle.performEnd,
		);
		expect(first.visualLifecycle.performEnd).toBeLessThan(
			run.state.simulationTime,
		);

		const input = {
			world: run.world,
			civilization: run.state,
			checkpoint: run,
			settlementId: firstCitizen?.settlementId ?? "missing-settlement",
			presentationTick: 0,
		} as const;
		const canonical = projectGeneratedCivilizationSpatial({
			...input,
			activities: run.activities,
		});
		expect(canonical.spatial.interactions).toHaveLength(1);
		expect(canonical.spatial.interactions[0]?.participantIds).toEqual(
			[first.citizenId, second.citizenId].sort(),
		);

		const unrelatedSettlementCitizen = Object.values(run.state.citizens).find(
			(citizen) => citizen.settlementId !== firstCitizen?.settlementId,
		);
		const targetPerturbations = [
			first.citizenId,
			"unknown-citizen",
			null,
			unrelatedSettlementCitizen?.citizenId ?? "unknown-settlement-citizen",
		] as const;
		for (const targetId of targetPerturbations) {
			const perturbed = run.activities.map((activity) =>
				activity.citizenId === first.citizenId
					? {
							...activity,
							canonicalAction: {
								...activity.canonicalAction,
								targetId,
							},
						}
					: activity,
			);
			expect(
				projectGeneratedCivilizationSpatial({
					...input,
					activities: perturbed,
				}).spatial.interactions,
			).toEqual([]);
		}
	});

	it("does not immediately re-pair a conversation the next odd day", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-canonical-social-cooldown",
		);
		const firstDay = await runCivilizationExperiment({ world, horizonDays: 1 });
		const talking = firstDay.activities.filter((activity) =>
			["talk", "listen"].includes(activity.canonicalAction.kind),
		);
		expect(talking.length === 0 || talking.length === 2).toBe(true);
		if (talking.length === 2) {
			const speaker = firstDay.state.citizens[talking[0]?.citizenId ?? ""];
			expect(speaker?.lastSocialSimulationTime).toBe(
				firstDay.state.simulationTime,
			);
			expect(speaker?.lastSocialSimulationTime).not.toBe(
				talking[0]?.visualLifecycle.performEnd,
			);
		}
		const thirdDay = await runCivilizationExperiment({ world, horizonDays: 3 });
		const thirdDayTalk = thirdDay.activities.filter((activity) =>
			["talk", "listen"].includes(activity.canonicalAction.kind),
		);
		if (talking.length === 2) expect(thirdDayTalk).toEqual([]);
	});

	it("copies conversation testimony and lets a later opening decision cite it", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-conversation-epistemics",
		);
		const prelude = await runCivilizationExperiment({
			world,
			horizonDays: THINKING_CONVERSATION_DAY,
		});
		expect(prelude.cognitionDecisions).toHaveLength(
			THINKING_CONVERSATION_DAY * 8,
		);
		expect(
			prelude.finalStandingPlans.every(
				(plan) => plan.sourceId === "routine-planner-v1",
			),
		).toBe(true);
		const heard = Object.values(prelude.state.minds).flatMap((mind) =>
			mind.snapshot.records.filter((record) => record.kind === "message-claim"),
		);
		expect(heard.length).toBeGreaterThan(0);
		expect(heard.some((record) => /told/u.test(record.proposition))).toBe(true);
		const continued = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: prelude.world,
			state: prelude.state,
			completedDay: THINKING_CONVERSATION_DAY,
			skipOpeningDecisions: false,
		});
		const laterCitation = continued.cognitionDecisions.find(
			(decision) =>
				decision.selectedActionId.startsWith("heed:") &&
				decision.retrievedMemoryIds.some((id) => id.includes(":heard:")),
		);
		expect(laterCitation).toBeDefined();
		expect(
			laterCitation?.readVisibleRecordIds.some((id) => id.includes("heard")),
		).toBe(true);
		expect(laterCitation?.planTransition).toBe("choice-replanned");
	});

	it("lets a later live day contain a citizen-originated project distinct from the seeded expedition", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-citizen-originated-project",
		);
		const prelude = await runCivilizationExperiment({ world, horizonDays: 5 });
		expect(prelude.state.projects["project-expedition-kit"]).toBeDefined();
		expect(
			Object.values(prelude.state.projects).some(
				(project) => project.sponsor.kind === "citizen",
			),
		).toBe(false);
		const continued = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: prelude.world,
			state: prelude.state,
			completedDay: 5,
			skipOpeningDecisions: false,
		});
		const originated = Object.values(continued.state.projects).find(
			(project) =>
				project.projectId !== "project-expedition-kit" &&
				project.sponsor.kind === "citizen",
		);
		expect(originated).toMatchObject({
			projectId: "project-citizen-06-water-reserve",
			kind: "water-reserve",
			name: "water-reserve",
			sponsor: { kind: "citizen", citizenId: "citizen-06" },
		});
		if (originated === undefined)
			throw new Error("later day lacks a citizen-originated project");
		expect(originated.projectId).not.toBe("project-expedition-kit");
		expect(
			continued.state.minds["citizen-06"]?.snapshot.standingPlan.goalType,
		).toBe("routine:transport");
		expect(
			continued.cognitionDecisions.some(
				(decision) =>
					decision.selectedActionId ===
						"propose-project:project-citizen-06-water-reserve" &&
					decision.retrievedMemoryIds.includes(
						"memory:citizen-06:water-reserve",
					),
			),
		).toBe(true);
		expect(
			continued.events.some(
				(event) =>
					event.kind === "project-originated" &&
					event.details.projectId === originated?.projectId,
			),
		).toBe(true);
		const play = projectGeneratedCivilizationSpatial({
			world: continued.world,
			civilization: continued.state,
			checkpoint: {
				schemaVersion: "eonfolk-civilization-experiment-v9",
				runnerVersion: "eonfolk-civilization-runner-v9",
				worldIdentityHash: continued.world.identity.identityHash,
				horizonDays: 6,
				finalStateHash: continued.finalStateHash,
				events: continued.events,
				metrics: {
					simulationTime: continued.state.simulationTime,
					modelInvocations: 0,
				},
			},
			settlementId: originated.settlementId,
			activities: continued.activities,
			presentationTick: 0,
		});
		expect(
			play.projects.some(
				(project) =>
					project.projectId === originated?.projectId &&
					project.name === "Water reserve",
			),
		).toBe(true);
	});

	it("originates the water-reserve during a 30-day bulk run that actually opened cognition", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-bulk-opening-horizon",
		);
		const thirty = await runCivilizationExperiment({
			world,
			horizonDays: 30,
		});
		expect(thirty.metrics.standardBrainDecisionCount).toBe(
			THIRTY_DAY_OPENING_DECISION_COUNT,
		);
		expect(thirty.cognitionDecisions).toHaveLength(
			THIRTY_DAY_OPENING_DECISION_COUNT,
		);
		expect(
			thirty.cognitionDecisions.every(
				({ modelInvocations }) => modelInvocations === 0,
			),
		).toBe(true);
		expect(
			thirty.finalStandingPlans.every(
				(plan) => plan.sourceId === "routine-planner-v1",
			),
		).toBe(true);
		const heard = Object.values(thirty.state.minds).flatMap((mind) =>
			mind.snapshot.records.filter((record) => record.kind === "message-claim"),
		);
		expect(heard.length).toBeGreaterThan(0);
		const originated = Object.values(thirty.state.projects).find(
			(project) =>
				project.projectId !== "project-expedition-kit" &&
				project.sponsor.kind === "citizen",
		);
		expect(originated).toMatchObject({
			projectId: "project-citizen-06-water-reserve",
			kind: "water-reserve",
			name: "water-reserve",
			sponsor: { kind: "citizen", citizenId: "citizen-06" },
			state: "completed",
		});
		expect(
			thirty.cognitionDecisions.some(
				(decision) =>
					decision.selectedActionId ===
						"propose-project:project-citizen-06-water-reserve" &&
					decision.retrievedMemoryIds.includes(
						"memory:citizen-06:water-reserve",
					),
			),
		).toBe(true);
		expect(
			thirty.events.some(
				(event) =>
					event.kind === "project-originated" &&
					event.details.projectId === originated?.projectId,
			),
		).toBe(true);
		expect(
			thirty.events.some(
				(event) =>
					event.kind === "project-completed" &&
					event.details.projectId === originated?.projectId,
			),
		).toBe(true);
		const ninety = await runCivilizationExperiment({
			world,
			horizonDays: FAST_OPENING_DECISION_HORIZON_DAYS,
		});
		expect(ninety.steps[29]?.postStateHash).toBe(thirty.finalStateHash);
	});

	it("runs real Standard Brain openings every day through day 90 with a later social consequence", async () => {
		expect(BULK_OPENING_DECISION_HORIZON_DAYS).toBe(365);
		expect(FAST_OPENING_DECISION_HORIZON_DAYS).toBe(90);
		expect(bulkOpeningDecisionCount(365)).toBe(365 * 8);
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-ninety-day-opening-horizon",
		);
		const thirty = await runCivilizationExperiment({
			world,
			horizonDays: 30,
		});
		const ninety = await runCivilizationExperiment({
			world,
			horizonDays: FAST_OPENING_DECISION_HORIZON_DAYS,
		});
		expect(ninety.metrics.standardBrainDecisionCount).toBe(
			FAST_OPENING_DECISION_COUNT,
		);
		expect(ninety.cognitionDecisions).toHaveLength(FAST_OPENING_DECISION_COUNT);
		expect(
			ninety.cognitionDecisions.every(
				({ modelInvocations }) => modelInvocations === 0,
			),
		).toBe(true);
		const laterOpenings = ninety.cognitionDecisions.slice(
			thirty.cognitionDecisions.length,
		);
		expect(laterOpenings).toHaveLength(
			FAST_OPENING_DECISION_COUNT - THIRTY_DAY_OPENING_DECISION_COUNT,
		);
		expect(
			laterOpenings.some(
				(decision) =>
					decision.retrievedMemoryIds.some(
						(id) => id.includes(":heard:") || id.includes(":water-reserve"),
					) || decision.selectedActionId.startsWith("heed:"),
			),
		).toBe(true);
		expect(
			laterOpenings.some(
				(decision) =>
					decision.planTransition === "choice-replanned" ||
					decision.selectedActionId.startsWith("heed:"),
			),
		).toBe(true);
		const lateHeard = Object.values(ninety.state.minds).flatMap((mind) =>
			mind.snapshot.records.filter(
				(record) =>
					record.kind === "message-claim" &&
					record.createdRevision > (thirty.state.revision ?? 0),
			),
		);
		expect(lateHeard.length).toBeGreaterThan(0);
		expect(
			ninety.finalStandingPlans.every(
				(plan) => plan.sourceId === "routine-planner-v1",
			),
		).toBe(true);
		expect(
			ninety.state.projects["project-citizen-06-water-reserve"]?.state,
		).toBe("completed");
		expect(ninety.steps[29]?.postStateHash).toBe(thirty.finalStateHash);
	});

	it("reports deterministic 30/90-day multi-seed metrics and prefix identity", async () => {
		const progressing = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-matrix-progress",
		);
		const stagnant = await generatedWorld(
			STAGNATION_SEED,
			"civilization-matrix-stagnant",
		);
		const thirty = await runCivilizationExperiment({
			world: progressing,
			horizonDays: 30,
		});
		const ninety = await runCivilizationExperiment({
			world: progressing,
			horizonDays: 90,
		});
		const stagnantNinety = await runCivilizationExperiment({
			world: stagnant,
			horizonDays: 90,
		});
		expect(thirty.metrics.outcome).toBe("progression");
		expect(ninety.metrics.outcome).toBe("progression");
		expect(stagnantNinety.metrics.outcome).toBe("stagnation");
		expect(thirty.metrics.plannedMigrations).toBe(0);
		expect(thirty.metrics.viableFoundings).toBe(1);
		expect(ninety.metrics.viableFoundings).toBe(1);
		expect(stagnantNinety.metrics.viableFoundings).toBe(0);
		expect(stagnantNinety.metrics.materializedSettlements).toBe(0);
		for (const run of [thirty, ninety, stagnantNinety]) {
			expect(run.metrics.completedProductionRuns).toBeGreaterThan(0);
			expect(run.metrics.consumedNeedUnits).toBeGreaterThan(0);
			expect(run.metrics.transportedResourceUnits).toBeGreaterThan(0);
			expect(run.metrics.groundedNeedOutcomes).toBeGreaterThan(0);
			expect(run.metrics.modelInvocations).toBe(0);
			expect(run.metrics.standardBrainDecisionCount).toBe(
				bulkOpeningDecisionCount(run.horizonDays),
			);
			expect(run.metrics.population).toBeLessThanOrEqual(8);
			expect(run.metrics.invariantIssues).toEqual([]);
			expect(
				run.state.projects["project-citizen-06-water-reserve"]?.state,
			).toBe("completed");
		}
		expect(thirty.finalStateHash).toBe(ninety.steps[29]?.postStateHash);
		expect(thirty.steps.map((step) => step.stepHash)).toEqual(
			ninety.steps.slice(0, 30).map((step) => step.stepHash),
		);
		expect(thirty.events.map((event) => event.eventHash)).toEqual(
			ninety.events
				.slice(0, thirty.events.length)
				.map((event) => event.eventHash),
		);
		expect(ninety.metrics.standardBrainDecisionCount).toBe(
			FAST_OPENING_DECISION_COUNT,
		);
	});

	it("schedules expansion from affordances and route work rather than an absolute day", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-no-calendar-trigger",
		);
		const firstEvaluation = await runCivilizationExperiment({
			world,
			horizonDays: 1,
		});
		expect(firstEvaluation.events.map((event) => event.kind)).toEqual([
			"project-stalled",
		]);
		expect(
			firstEvaluation.events.every((event) => event.simulationTime === 86_400),
		).toBe(true);
		expect(
			firstEvaluation.state.migrationJourneys["migration-founding-party"],
		).toBeUndefined();
		const resourceAuthorized = await runCivilizationExperiment({
			world,
			horizonDays: 2,
		});
		expect(resourceAuthorized.events.map((event) => event.kind)).toEqual([
			"project-stalled",
			"project-approved",
			"project-completed",
			"migration-prepared",
			"migration-departed",
		]);
		expect(
			resourceAuthorized.events
				.slice(1)
				.every((event) => event.simulationTime === 2 * 86_400),
		).toBe(true);
		expect(
			resourceAuthorized.state.migrationJourneys["migration-founding-party"]
				?.completedTraversalUnits,
		).toBe(0);
		const completed = await runCivilizationExperiment({
			world,
			horizonDays: 30,
		});
		const arrival = completed.events.find(
			(event) => event.kind === "migration-arrived",
		);
		const migration = completed.state.migrations["migration-founding-party"];
		expect(arrival?.simulationTime).toBe(
			migration?.expectedArrivalSimulationTime,
		);
		expect(arrival?.simulationTime).toBeLessThan(30 * 86_400);
		expect(completed.metrics.materializedSettlements).toBe(1);
	});

	it("rejects implicit, negative, or unbounded experiment time", async () => {
		const world = await generatedWorld(
			PROGRESSION_SEED,
			"civilization-invalid-time",
		);
		for (const horizonDays of [0, -1, 1.5, 366])
			await expect(
				runCivilizationExperiment({ world, horizonDays }),
			).rejects.toThrow(/horizonDays/u);
	});
});
