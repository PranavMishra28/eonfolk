import { describe, expect, it } from "vitest";
import {
	createModelBrain,
	runDecisionGateway,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import { seedPrng } from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

async function setup() {
	const { context } = await riverholdDecisionFixture({
		counselIntent: "verify-reserve",
	});
	const prngState = await seedPrng(
		new Uint8Array(32).fill(9),
		"model-brain-test",
		context.actorId,
		"fallback",
	);
	const fallback = async () =>
		(
			await standardBrain(context, {
				proposalId: "proposal-model-fallback",
				prngState,
			})
		).proposal;
	return { context, fallback };
}

function validArtifact() {
	return JSON.stringify({
		schemaVersion: "eonfolk-model-choice-v1",
		actionId: "action-verify-reserve",
		publicJustification:
			"I will verify the reserve before making a public accusation.",
		visibleRecordIdsRead: ["observation-ledger-mismatch"],
		relationshipIdsRead: ["relationship-mara-toma"],
		valueIdsRead: [],
		commitmentIdsRead: [],
		counselDisposition: "accepted",
	});
}

function brainFor(output: string) {
	return createModelBrain(
		{
			provider: "local-process",
			model: "fixture-model",
			modelVersion: "fixture-v1",
			maxRequestBytes: 32_768,
			maxResponseBytes: 2_048,
		},
		{ invoke: async () => output },
	);
}

describe("closed model brain adapter", () => {
	it("turns one bounded choice into a valid provenance-bearing proposal", async () => {
		const { context } = await setup();
		const proposal = await brainFor(validArtifact()).propose(context);
		expect(await validateIntentProposal(context, proposal)).toBe("accepted");
		expect(proposal.provenance.cognitionKind).toBe("model");
		expect(proposal.action).toEqual(
			context.actionCatalog.find(
				(entry) => entry.actionId === "action-verify-reserve",
			)?.action,
		);
		expect(proposal.explanation.scoreTerms).toEqual([]);
	});

	it.each([
		["markdown", `\`\`\`json\n${validArtifact()}\n\`\`\``],
		[
			"unknown action",
			validArtifact().replace("action-verify-reserve", "invented"),
		],
		["extra field", `${validArtifact().slice(0, -1)},"reasoning":"secret"}`],
	])("rejects %s rather than widening authority", async (_label, output) => {
		const { context } = await setup();
		await expect(brainFor(output).propose(context)).rejects.toThrow();
	});

	it("cannot smuggle unread or hidden record identifiers through validation", async () => {
		const { context } = await setup();
		const output = validArtifact().replace(
			"observation-ledger-mismatch",
			"hidden-toma-secret-mara",
		);
		const proposal = await brainFor(output).propose(context);
		expect(await validateIntentProposal(context, proposal)).toBe(
			"ACTION_UNAVAILABLE",
		);
	});

	it("falls back deterministically for malformed model output", async () => {
		const { context, fallback } = await setup();
		const result = await runDecisionGateway({
			context,
			primary: brainFor('{"actionId":"broken"}'),
			deterministicFallback: fallback,
			validate: validateIntentProposal,
			primaryTimeoutMilliseconds: 100,
		});
		expect(result.selectedSource).toBe("deterministic-fallback");
		expect(result.primaryFailure).toBe("threw");
	});

	it("forwards cancellation to the host-owned transport", async () => {
		const { context } = await setup();
		let observedSignal: AbortSignal | undefined;
		const brain = createModelBrain(
			{
				provider: "local-process",
				model: "fixture-model",
				modelVersion: "fixture-v1",
				maxRequestBytes: 32_768,
				maxResponseBytes: 2_048,
			},
			{
				invoke: async (_request, signal) => {
					observedSignal = signal;
					return validArtifact();
				},
			},
		);
		const controller = new AbortController();
		await brain.propose(context, controller.signal);
		expect(observedSignal).toBe(controller.signal);
	});
});
