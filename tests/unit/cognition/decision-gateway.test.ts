import { describe, expect, it } from "vitest";
import {
	runDecisionGateway,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import { seedPrng } from "../../../packages/protocol/src/index.js";
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
});
