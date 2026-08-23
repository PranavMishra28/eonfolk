import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	createContractBoundModelBrain,
	createLocalProcessBrainContract,
	modelChoiceContractDigests,
	planRoutine,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import type {
	DecisionContext,
	StandingPlan,
} from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

function chainInput(length: number, reverse: boolean) {
	const recordIds = Array.from({ length }, (_, index) => `visible-${index}`);
	const affordances = Array.from({ length }, (_, index) => ({
		actionId: `action-${String(index).padStart(2, "0")}`,
		action: { kind: "Move" as const, toPlaceId: `place-${index}` },
		estimatedDurationSeconds: 10 + index,
		energyCost: 5 + index,
		requiredVisibleRecordIds: [recordIds[index]!],
		prerequisiteActionIds:
			index === 0 ? [] : [`action-${String(index - 1).padStart(2, "0")}`],
		effectCodes: [`effect-${index}`],
		targetIds: [`place-${index}`],
		interruptible: true,
	}));
	return {
		planId: `plan-chain-${length}`,
		citizenId: "citizen-property",
		boundary: 0,
		visibleRecords: recordIds.map((recordId) => ({
			recordId,
			effectCodes: [],
		})),
		affordances: reverse ? [...affordances].reverse() : affordances,
		goal: {
			goalType: "reach-chain-end",
			desiredEffectCodes: [`effect-${length - 1}`],
			targetIds: [`place-${length - 1}`],
			commitmentId: null,
			maximumSteps: length,
			expiryBoundary: 86_400,
		},
		maximumExpansions: 128,
	} as const;
}

function activeSteps(plan: StandingPlan): number {
	const count = (steps: StandingPlan["steps"]): number =>
		steps.reduce(
			(total, step) =>
				total + (step.status === "active" ? 1 : 0) + count(step.children),
			0,
		);
	return count(plan.steps);
}

async function modelContext(): Promise<DecisionContext> {
	return (await riverholdDecisionFixture({ counselIntent: "verify-reserve" }))
		.context;
}

async function contractBoundBrain(output: () => string) {
	const digest = "a".repeat(64);
	const artifact = {
		artifactId: "property-fixture",
		byteLength: 1,
		licenseId: "MIT",
		licenseTextSha256: digest,
		sha256: digest,
		version: "fixture-v1",
	};
	const digests = await modelChoiceContractDigests();
	const contract = await createLocalProcessBrainContract({
		adapterHash: digest,
		adapterId: "property-adapter",
		adapterVersion: "fixture-v1",
		chatTemplate: artifact,
		environmentNames: [],
		generation: {
			contextTokens: 2_048,
			maxOutputTokens: 128,
			seed: 0,
			temperatureBasisPoints: 0,
		},
		limits: {
			coldTimeoutMs: 1_000,
			maxRequestBytes: 16_384,
			maxStderrBytes: 2_048,
			maxStdoutBytes: 2_048,
			retries: 0,
			warmTimeoutMs: 1_000,
		},
		model: artifact,
		modelConfiguration: artifact,
		modelSource: "preprovisioned-local",
		networkPolicy: "deny-all-required",
		localEndpoint: null,
		promptTemplateHash: digests.promptTemplateHash,
		proposalSchemaHash: digests.proposalSchemaHash,
		runtime: {
			executable: artifact,
			kind: "other-local",
			sourceCommit: "b".repeat(40),
		},
		serviceRuntime: null,
		tokenizer: artifact,
		transport: "length-prefixed-jcs-stdin-single-jcs-stdout",
		trustRemoteCode: false,
	});
	return createContractBoundModelBrain(contract, {
		contractHash: contract.contractHash,
		invoke: async () => output(),
	});
}

describe("bounded cognition properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("respects arbitrary bounded prerequisite chains independent of input order", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 6 }), (length) => {
				const forward = planRoutine(chainInput(length, false));
				const reversed = planRoutine(chainInput(length, true));
				expect(reversed).toEqual(forward);
				expect(forward.steps).toHaveLength(length);
				expect(activeSteps(forward)).toBe(1);
				expect(forward.steps.at(-1)?.targetIds).toEqual([
					`place-${length - 1}`,
				]);
			}),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0301 },
		);
	});

	it("cannot complete a chain after any required visible record is removed", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 2, max: 6 }).chain((length) =>
					fc.record({
						length: fc.constant(length),
						removed: fc.integer({ min: 0, max: length - 1 }),
					}),
				),
				({ length, removed }) => {
					const input = chainInput(length, false);
					expect(() =>
						planRoutine({
							...input,
							visibleRecords: input.visibleRecords.filter(
								(record) => record.recordId !== `visible-${removed}`,
							),
						}),
					).toThrow("ACTION_UNAVAILABLE");
				},
			),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0302 },
		);
	});

	it("never turns arbitrary untrusted text into an accepted model proposal", async () => {
		const context = await modelContext();
		let artifact = "";
		const brain = await contractBoundBrain(() => artifact);
		await fc.assert(
			fc.asyncProperty(fc.string({ maxLength: 1_024 }), async (value) => {
				artifact = value;
				try {
					const proposal = await brain.propose(context);
					expect(await validateIntentProposal(context, proposal)).not.toBe(
						"accepted",
					);
				} catch (error) {
					expect(error).toBeInstanceOf(Error);
				}
			}),
			{ numRuns: deep ? 500 : 100, seed: 0xe0f1_0303 },
		);
	});
});
