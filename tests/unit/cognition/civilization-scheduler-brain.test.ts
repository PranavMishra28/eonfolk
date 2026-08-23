import { describe, expect, it } from "vitest";

import {
	MEMORY_SCHEMA_VERSION,
	createMemoryStore,
	decideCivilizationSchedulerRoutine,
	remember,
	type CivilizationRoutineOption,
	type CivilizationSchedulerMindState,
} from "../../../packages/cognition/src/index.js";
import {
	riverholdDecisionFixture,
	riverholdPrng,
} from "../../fixtures/riverhold/index.js";

function options(
	planId: string,
	memoryId: string,
): readonly CivilizationRoutineOption[] {
	return [
		{
			entry: {
				actionId: "follow-plan",
				action: { kind: "FollowStandingPlan", planId },
				publicPreconditions: [],
				publicStakes: [],
				tags: [],
				evidenceRecordIds: [],
				relationshipId: null,
				risk: 0,
				counselAffinity: "neutral",
			},
			routine: { kind: "social-maintenance", subjectId: "citizen_mara" },
		},
		{
			entry: {
				actionId: "drink-water",
				action: { kind: "Consume", resource: "water" },
				publicPreconditions: ["water shortage is remembered"],
				publicStakes: ["interrupts the current routine"],
				tags: ["need", "evidence"],
				evidenceRecordIds: [memoryId],
				relationshipId: null,
				risk: 100,
				counselAffinity: "neutral",
			},
			routine: { kind: "consume", subjectId: "water" },
		},
	];
}

async function mindState(input: {
	readonly visibilitySubject?: string;
	readonly withMemory: boolean;
}): Promise<{
	readonly fixture: Awaited<ReturnType<typeof riverholdDecisionFixture>>;
	readonly state: CivilizationSchedulerMindState;
	readonly memoryId: string;
}> {
	const fixture = await riverholdDecisionFixture();
	const memoryId = "memory-water-warning";
	let memoryStore = createMemoryStore(fixture.mind.citizenId);
	if (input.withMemory)
		memoryStore = remember(memoryStore, {
			schemaVersion: MEMORY_SCHEMA_VERSION,
			memoryId,
			ownerCitizenId: fixture.mind.citizenId,
			kind: "semantic",
			proposition: "I saw the drinking-water jar run low.",
			cueIds: ["need", "drink-water"],
			relatedCitizenIds: [],
			goalId: null,
			commitmentId: null,
			salienceBasisPoints: 9_000,
			confidenceBasisPoints: 9_000,
			createdAtSimulationTime: 0,
			reinforcedAtSimulationTime: 0,
			createdRevision: 0,
			sourceIds: ["event-water-observed"],
			visibility: {
				kind: "citizen-private",
				subjectCitizenId: input.visibilitySubject ?? fixture.mind.citizenId,
			},
			provenanceVersion: "memory-provenance-v1",
		});
	return {
		fixture,
		memoryId,
		state: {
			actorMind: fixture.mind,
			memoryStore,
			prngState: await riverholdPrng(fixture.mind.citizenId),
			decisionOrdinal: 0,
		},
	};
}

async function decide(
	input: Awaited<ReturnType<typeof mindState>>,
	priorOutcome: "completed" | "blocked" | null = null,
) {
	return decideCivilizationSchedulerRoutine({
		state: input.state,
		runId: input.fixture.context.runId,
		regionId: input.fixture.context.regionId,
		revision: input.fixture.context.revision,
		simulationTime: input.fixture.context.simulationTime,
		visibilityContext: input.fixture.visibilityContext,
		options: options(input.fixture.mind.standingPlan.planId, input.memoryId),
		fallbackRoutine: {
			kind: "social-maintenance",
			subjectId: input.fixture.mind.citizenId,
		},
		priorOutcome,
	});
}

describe("civilization scheduler Standard Brain", () => {
	it("lets actor-visible retrieval change one legal routine and replans after validation", async () => {
		const withoutMemory = await decide(await mindState({ withMemory: false }));
		const withMemory = await decide(await mindState({ withMemory: true }));

		expect(withoutMemory.evidence.selectedActionId).toBe("follow-plan");
		expect(withMemory.evidence).toMatchObject({
			selectedActionId: "drink-water",
			routine: { kind: "consume", subjectId: "water" },
			planTransition: "choice-replanned",
			modelInvocations: 0,
		});
		expect(withMemory.evidence.retrievedMemoryIds).toEqual([
			"memory-water-warning",
		]);
		expect(withMemory.evidence.readVisibleRecordIds).toEqual([
			"memory-water-warning",
		]);
		expect(withMemory.state.actorMind.standingPlan.goalType).toBe(
			"routine:consume",
		);
	});

	it("filters hidden memory before scoring so it cannot perturb the choice", async () => {
		const absent = await decide(await mindState({ withMemory: false }));
		const hidden = await decide(
			await mindState({
				withMemory: true,
				visibilitySubject: "citizen_someone_else",
			}),
		);

		expect(hidden.evidence.retrievedMemoryIds).toEqual([]);
		expect(hidden.evidence.selectedActionId).toBe(
			absent.evidence.selectedActionId,
		);
		expect(hidden.evidence.contextHash).toBe(absent.evidence.contextHash);
		expect(hidden.evidence.proposalHash).toBe(absent.evidence.proposalHash);
	});

	it("uses bounded retry and then replan transitions after repeated interruption", async () => {
		const initial = await mindState({ withMemory: false });
		const first = await decide(initial, "blocked");
		expect(first.evidence.planTransition).toBe("interrupted-retried");
		expect(first.state.actorMind.standingPlan.retriesRemaining).toBe(0);

		const second = await decide({ ...initial, state: first.state }, "blocked");
		expect(second.evidence.planTransition).toBe("interrupted-replanned");
		expect(second.state.actorMind.standingPlan.replansRemaining).toBe(
			first.state.actorMind.standingPlan.replansRemaining - 1,
		);
		expect(second.state.actorMind.standingPlan.status).toBe("active");
	});
});
