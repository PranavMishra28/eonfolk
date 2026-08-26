import { describe, expect, it } from "vitest";

import {
	MEMORY_SCHEMA_VERSION,
	buildMemoryAwareDecisionContext,
	createMemoryStore,
	planGroundedRoutine,
	remember,
	retrieveMemories,
	standardBrain,
	type MemoryKind,
} from "../../../packages/cognition/src/index.js";
import { seedPrng } from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

function memory(
	ownerCitizenId: string,
	memoryId: string,
	kind: MemoryKind,
	overrides: Partial<Parameters<typeof remember>[1]> = {},
): Parameters<typeof remember>[1] {
	return {
		schemaVersion: MEMORY_SCHEMA_VERSION,
		memoryId,
		ownerCitizenId,
		kind,
		proposition: `${kind} fact`,
		cueIds: [kind],
		relatedCitizenIds: [],
		goalId: null,
		commitmentId: null,
		salienceBasisPoints: 5_000,
		confidenceBasisPoints: 8_000,
		createdAtSimulationTime: 0,
		reinforcedAtSimulationTime: 0,
		createdRevision: 0,
		sourceIds: [`source-${memoryId}`],
		visibility: { kind: "citizen-private", subjectCitizenId: ownerCitizenId },
		provenanceVersion: "memory-provenance-v1",
		...overrides,
	};
}

describe("bounded typed memory", () => {
	it("stores and deterministically retrieves all six memory classes", async () => {
		const fixture = await riverholdDecisionFixture();
		const actorId = fixture.mind.citizenId;
		let store = createMemoryStore(actorId);
		for (const kind of [
			"episodic",
			"semantic",
			"social",
			"goal",
			"commitment",
			"reflection",
		] as const)
			store = remember(store, memory(actorId, `memory-${kind}`, kind));
		expect(Object.isFrozen(store.records["memory-episodic"]?.cueIds)).toBe(
			true,
		);
		const query = {
			actorCitizenId: actorId,
			revision: 0,
			simulationTime: 60,
			cueIds: ["goal", "reflection"],
			relationshipCitizenIds: [],
			activeGoalId: null,
			activeCommitmentIds: [],
			maximumRecords: 6,
			maximumBytes: 16_384,
			recencyHorizonSeconds: 86_400,
		} as const;
		const first = retrieveMemories(store, query, fixture.visibilityContext);
		const second = retrieveMemories(store, query, fixture.visibilityContext);
		expect(first).toEqual(second);
		expect(first.selected.map(({ memory: value }) => value.kind)).toEqual([
			"goal",
			"reflection",
			"commitment",
			"episodic",
			"semantic",
			"social",
		]);
	});

	it("scores relevance, recency, salience, relationship, and goal explicitly", async () => {
		const fixture = await riverholdDecisionFixture();
		const actorId = fixture.mind.citizenId;
		let store = createMemoryStore(actorId);
		store = remember(
			store,
			memory(actorId, "memory-scored", "goal", {
				cueIds: ["scarcity"],
				relatedCitizenIds: ["citizen-neighbor"],
				goalId: "goal-food",
				commitmentId: "commitment-share",
				salienceBasisPoints: 8_000,
			}),
		);
		const result = retrieveMemories(
			store,
			{
				actorCitizenId: actorId,
				revision: 0,
				simulationTime: 60,
				cueIds: ["scarcity"],
				relationshipCitizenIds: ["citizen-neighbor"],
				activeGoalId: "goal-food",
				activeCommitmentIds: ["commitment-share"],
				maximumRecords: 1,
				maximumBytes: 16_384,
				recencyHorizonSeconds: 86_400,
			},
			fixture.visibilityContext,
		);
		const score = result.selected[0]?.score;
		expect(score).toEqual(
			expect.objectContaining({
				relevance: 1_000,
				salience: 2_000,
				relationship: 1_500,
				goal: 2_000,
			}),
		);
		expect(score?.recency).toBeGreaterThan(0);
	});

	it("excludes future and over-budget records", async () => {
		const fixture = await riverholdDecisionFixture();
		const actorId = fixture.mind.citizenId;
		let store = createMemoryStore(actorId);
		store = remember(
			store,
			memory(actorId, "memory-future", "episodic", {
				createdAtSimulationTime: 100,
				reinforcedAtSimulationTime: 100,
			}),
		);
		const result = retrieveMemories(
			store,
			{
				actorCitizenId: actorId,
				revision: 0,
				simulationTime: 99,
				cueIds: ["episodic"],
				relationshipCitizenIds: [],
				activeGoalId: null,
				activeCommitmentIds: [],
				maximumRecords: 1,
				maximumBytes: 1,
				recencyHorizonSeconds: 100,
			},
			fixture.visibilityContext,
		);
		expect(result.visibleCandidateCount).toBe(0);
		expect(result.selected).toEqual([]);
	});

	it("places only retrieved actor-visible memory records in DecisionContext", async () => {
		const fixture = await riverholdDecisionFixture();
		const actorId = fixture.mind.citizenId;
		let store = createMemoryStore(actorId);
		store = remember(store, memory(actorId, "memory-visible", "semantic"));
		store = remember(
			store,
			memory(actorId, "memory-hidden", "reflection", {
				visibility: {
					kind: "citizen-private",
					subjectCitizenId: "different-citizen",
				},
			}),
		);
		const result = await buildMemoryAwareDecisionContext({
			contextId: "context-memory",
			actorMind: fixture.mind,
			memoryStore: store,
			retrieval: {
				cueIds: ["semantic", "reflection"],
				relationshipCitizenIds: [],
				activeGoalId: null,
				activeCommitmentIds: [],
				maximumRecords: 8,
				maximumBytes: 16_384,
				recencyHorizonSeconds: 86_400,
			},
			runId: fixture.context.runId,
			regionId: fixture.context.regionId,
			revision: fixture.context.revision,
			simulationTime: fixture.context.simulationTime,
			decisionReason: "scheduled-review",
			actionCatalog: fixture.context.actionCatalog,
			visibilityContext: fixture.visibilityContext,
			counselIntent: null,
		});
		expect(result.retrieval.visibleCandidateCount).toBe(1);
		expect(
			result.context.visibleRecords.some(
				({ recordId }) => recordId === "memory-visible",
			),
		).toBe(true);
		expect(
			result.context.visibleRecords.some(
				({ recordId }) => recordId === "memory-hidden",
			),
		).toBe(false);
	});

	it("changes routine and Standard Brain choices when visible need state changes", async () => {
		const plan = planGroundedRoutine({
			planId: "plan-needs",
			citizenId: "citizen-needs",
			boundary: 0,
			visibleRecords: [
				{ recordId: "need-food", effectCodes: [] },
				{ recordId: "need-water", effectCodes: [] },
			],
			affordances: [
				{
					actionId: "eat",
					action: { kind: "Consume", resource: "food" },
					estimatedDurationSeconds: 10,
					energyCost: 0,
					requiredVisibleRecordIds: ["need-food"],
					prerequisiteActionIds: [],
					effectCodes: ["need:food:met"],
					targetIds: ["food"],
					interruptible: true,
				},
				{
					actionId: "drink",
					action: { kind: "Consume", resource: "water" },
					estimatedDurationSeconds: 10,
					energyCost: 0,
					requiredVisibleRecordIds: ["need-water"],
					prerequisiteActionIds: [],
					effectCodes: ["need:water:met"],
					targetIds: ["water"],
					interruptible: true,
				},
			],
			demands: [
				{
					demandId: "food",
					goalType: "meet-food",
					severityBasisPoints: 3_000,
					desiredEffectCodes: ["need:food:met"],
					targetIds: ["food"],
					commitmentId: null,
					requiredVisibleRecordIds: ["need-food"],
				},
				{
					demandId: "water",
					goalType: "meet-water",
					severityBasisPoints: 9_000,
					desiredEffectCodes: ["need:water:met"],
					targetIds: ["water"],
					commitmentId: null,
					requiredVisibleRecordIds: ["need-water"],
				},
			],
			maximumExpansions: 8,
			expiryBoundary: 86_400,
		});
		expect(plan.goalType).toBe("meet-water");

		const fixture = await riverholdDecisionFixture();
		const needRecord = {
			recordId: "need-water-visible",
			kind: "observation" as const,
			subjectCitizenId: fixture.context.actorId,
			proposition: "water reserve is low",
			confidence: 9_000,
			sourceIds: ["pressure-water"],
			visibility: {
				kind: "citizen-private" as const,
				subjectCitizenId: fixture.context.actorId,
			},
			createdRevision: fixture.context.revision,
		};
		const context = {
			...fixture.context,
			visibleRecords: [...fixture.context.visibleRecords, needRecord],
			actionCatalog: [
				{
					actionId: "need-water",
					action: { kind: "Consume" as const, resource: "water" as const },
					publicPreconditions: [],
					publicStakes: [],
					tags: ["need" as const],
					evidenceRecordIds: [needRecord.recordId],
					relationshipId: null,
					risk: 0,
					counselAffinity: "neutral" as const,
				},
				{
					...fixture.context.actionCatalog[0]!,
					actionId: "ignore-need",
					evidenceRecordIds: [],
					risk: 0,
				},
			],
			budgets: { ...fixture.context.budgets, maxCandidates: 8 },
		};
		const chosen = await standardBrain(context, {
			proposalId: "proposal-needs",
			prngState: await seedPrng(
				new Uint8Array(32).fill(1),
				"needs",
				fixture.context.actorId,
				"decision",
			),
		});
		expect(chosen.proposal.actionId).toBe("need-water");
		expect(
			chosen.proposal.explanation.scoreTerms.some(
				({ code }) => code === "need",
			),
		).toBe(true);
	});
});
