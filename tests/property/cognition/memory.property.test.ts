import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	MEMORY_SCHEMA_VERSION,
	createMemoryStore,
	remember,
	retrieveMemories,
} from "../../../packages/cognition/src/index.js";
import { VISIBILITY_POLICY_VERSION } from "../../../packages/protocol/src/index.js";

const visibilityContext = {
	policyVersion: VISIBILITY_POLICY_VERSION,
	covenants: [],
	localOwnerPrincipalId: "local",
	nonproduction: true,
} as const;

function record(
	owner: string,
	memoryId: string,
	value: number,
	hidden: boolean,
) {
	return {
		schemaVersion: MEMORY_SCHEMA_VERSION,
		memoryId,
		ownerCitizenId: owner,
		kind: "episodic" as const,
		proposition: `bounded-${value}`,
		cueIds: [`cue-${value % 5}`],
		relatedCitizenIds: [`citizen-${value % 3}`],
		goalId: value % 2 === 0 ? "goal-even" : null,
		commitmentId: value % 3 === 0 ? "commitment-three" : null,
		salienceBasisPoints: value % 10_001,
		confidenceBasisPoints: 8_000,
		createdAtSimulationTime: value,
		reinforcedAtSimulationTime: value,
		createdRevision: 0,
		sourceIds: [`source-${value}`],
		visibility: hidden
			? { kind: "citizen-private" as const, subjectCitizenId: "hidden-owner" }
			: { kind: "citizen-private" as const, subjectCitizenId: owner },
		provenanceVersion: "memory-provenance-v1" as const,
	};
}

describe("memory retrieval properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("is deterministic across insertion order", () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(fc.integer({ min: 0, max: 10_000 }), { maxLength: 30 }),
				(values) => {
					const owner = "citizen-owner";
					const build = (ordered: readonly number[]) =>
						ordered.reduce(
							(store, value) =>
								remember(store, record(owner, `memory-${value}`, value, false)),
							createMemoryStore(owner),
						);
					const query = {
						actorCitizenId: owner,
						revision: 0,
						simulationTime: 20_000,
						cueIds: ["cue-1", "cue-3"],
						relationshipCitizenIds: ["citizen-1"],
						activeGoalId: "goal-even",
						activeCommitmentIds: ["commitment-three"],
						maximumRecords: 12,
						maximumBytes: 32_000,
						recencyHorizonSeconds: 20_000,
					} as const;
					expect(
						retrieveMemories(build(values), query, visibilityContext),
					).toEqual(
						retrieveMemories(
							build([...values].reverse()),
							query,
							visibilityContext,
						),
					);
				},
			),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0501 },
		);
	});

	it("hidden memories never change visible retrieval", () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 0, max: 10_000 }), { maxLength: 30 }),
				(hiddenValues) => {
					const owner = "citizen-owner";
					let base = createMemoryStore(owner);
					base = remember(base, record(owner, "visible", 7, false));
					let withHidden = base;
					for (const [index, value] of hiddenValues.entries())
						withHidden = remember(
							withHidden,
							record(owner, `hidden-${index}`, value, true),
						);
					const query = {
						actorCitizenId: owner,
						revision: 0,
						simulationTime: 20_000,
						cueIds: ["cue-2"],
						relationshipCitizenIds: [],
						activeGoalId: null,
						activeCommitmentIds: [],
						maximumRecords: 8,
						maximumBytes: 16_384,
						recencyHorizonSeconds: 20_000,
					} as const;
					expect(
						retrieveMemories(withHidden, query, visibilityContext).selected,
					).toEqual(retrieveMemories(base, query, visibilityContext).selected);
				},
			),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0502 },
		);
	});
});
