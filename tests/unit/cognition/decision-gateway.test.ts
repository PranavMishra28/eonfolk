import { describe, expect, it } from "vitest";
import {
	createCognitiveDecisionRecord,
	runDecisionGateway,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import {
	proposalHash,
	seedPrng,
} from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

async function fixture() {
	const decision = await riverholdDecisionFixture({
		counselIntent: "verify-reserve",
	});
	const prngState = await seedPrng(
		new Uint8Array(32).fill(7),
		"decision-gateway",
		decision.context.actorId,
		"fallback",
	);
	const fallback = async () =>
		(
			await standardBrain(decision.context, {
				proposalId: "proposal-gateway-fallback",
				prngState,
			})
		).proposal;
	return { ...decision, fallback };
}

describe("post-cognition decision gateway", () => {
	it("validates the deterministic brain even when no primary exists", async () => {
		const test = await fixture();
		const result = await runDecisionGateway({
			context: test.context,
			primary: null,
			deterministicFallback: test.fallback,
			validate: validateIntentProposal,
			primaryTimeoutMilliseconds: 100,
		});

		expect(result.selectedSource).toBe("deterministic-fallback");
		expect(result.primaryAttempts).toBe(0);
		expect(result.proposal.action.kind).toBe("VerifyReserve");
	});

	it("accepts a primary proposal only after the same validator passes", async () => {
		const test = await fixture();
		const proposal = await test.fallback();
		const result = await runDecisionGateway({
			context: test.context,
			primary: { propose: async () => proposal },
			deterministicFallback: test.fallback,
			validate: validateIntentProposal,
			primaryTimeoutMilliseconds: 100,
		});

		expect(result.selectedSource).toBe("primary");
		expect(result.proposal).toEqual(proposal);
	});

	it.each([
		["invalid", { propose: async () => ({ actionId: "invented" }) }],
		[
			"threw",
			{
				propose: async () => {
					throw new Error("model process failed");
				},
			},
		],
	] as const)(
		"falls back deterministically when the primary %s",
		async (failure, primary) => {
			const test = await fixture();
			const result = await runDecisionGateway({
				context: test.context,
				primary,
				deterministicFallback: test.fallback,
				validate: validateIntentProposal,
				primaryTimeoutMilliseconds: 100,
			});

			expect(result.selectedSource).toBe("deterministic-fallback");
			expect(result.primaryFailure).toBe(failure);
			expect(result.proposal.action.kind).toBe("VerifyReserve");
		},
	);

	it("aborts a late primary and uses the validated fallback", async () => {
		const test = await fixture();
		let observedAbort = false;
		const result = await runDecisionGateway({
			context: test.context,
			primary: {
				propose: async (_context, signal) =>
					new Promise((resolve) => {
						signal?.addEventListener("abort", () => {
							observedAbort = true;
							resolve({ actionId: "late" });
						});
					}),
			},
			deterministicFallback: test.fallback,
			validate: validateIntentProposal,
			primaryTimeoutMilliseconds: 5,
		});

		expect(observedAbort).toBe(true);
		expect(result.primaryFailure).toBe("timeout");
		expect(result.selectedSource).toBe("deterministic-fallback");
	});

	it("fails closed if the deterministic fallback violates its contract", async () => {
		const test = await fixture();
		await expect(
			runDecisionGateway({
				context: test.context,
				primary: null,
				deterministicFallback: async () => ({}) as never,
				validate: validateIntentProposal,
				primaryTimeoutMilliseconds: 100,
			}),
		).rejects.toThrow(/deterministic fallback violated/u);
	});

	it("accepts a closed model proposal and preserves exact artifact provenance", async () => {
		const test = await fixture();
		const standard = await test.fallback();
		const { proposalHash: _standardHash, ...standardWithoutHash } = standard;
		const withoutHash = {
			...standardWithoutHash,
			proposalId: "proposal-model",
			provenance: {
				cognitionKind: "model" as const,
				cognitionVersion: standard.provenance.cognitionVersion,
				provider: "ollama-local",
				model: "qwen3-coder-30b",
				modelVersion: "06c1097efce0",
				promptTemplateHash: "11".repeat(32),
				proposalSchemaHash: "22".repeat(32),
				artifactHash: "33".repeat(32),
			},
			publicJustification:
				"I will verify the reserve before making a public accusation.",
			explanation: {
				...standard.explanation,
				templateId: "model-proposal-v1",
				decisiveReasonCodes: [],
				scoreTerms: [],
				totalScore: 0,
				tieBreak: { used: false, draw: null, tiedActionIds: [] },
				discardedCandidates: [],
			},
		};
		const proposal = {
			...withoutHash,
			proposalHash: await proposalHash(withoutHash),
		};

		expect(await validateIntentProposal(test.context, proposal)).toBe(
			"accepted",
		);
		const record = await createCognitiveDecisionRecord({
			decisionId: "decision-model",
			decisionBoundaryId: "boundary-model",
			wholePreStateHash: "44".repeat(32),
			context: test.context,
			proposal,
			failureCode: null,
			validator: {
				stage: "committed",
				outcome: "accepted",
				reason: "accepted",
			},
			proposedCommandId: "command-model",
			receiptRef: "command-model",
			acceptedEventInterval: null,
		});
		expect(record.cognitionKind).toBe("model");
		expect(record.provider).toBe("ollama-local");
		expect(record.artifactHash).toBe("33".repeat(32));

		const brokenCopy = {
			...proposal,
			publicJustification:
				"I will verify the reserve before making a public accus",
		};
		const { proposalHash: _oldHash, ...brokenWithoutHash } = brokenCopy;
		expect(
			await validateIntentProposal(test.context, {
				...brokenWithoutHash,
				proposalHash: await proposalHash(brokenWithoutHash),
			}),
		).toBe("ACTION_UNAVAILABLE");
	});
});
