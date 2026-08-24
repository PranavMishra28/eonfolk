import { describe, expect, it } from "vitest";
import {
	createCognitiveDecisionRecord,
	createModelBrain,
	restoreRecordedIntentProposal,
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
		schemaVersion: "eonfolk-model-choice-v2",
		actionId: "action-verify-reserve",
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

	it("derives evidence references and public copy from the selected catalog entry", async () => {
		const { context } = await setup();
		const proposal = await brainFor(validArtifact()).propose(context);
		expect(proposal.explanation.visibleRecordIdsRead).toEqual(
			context.actionCatalog.find(
				(entry) => entry.actionId === "action-verify-reserve",
			)?.evidenceRecordIds,
		);
		expect(proposal.publicJustification).toBe(
			"This choice delays a public conclusion.",
		);
		expect(JSON.stringify(proposal)).not.toContain("hidden-toma-secret-mara");
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

	it("restores historical model decisions without invoking inference again", async () => {
		const { context } = await setup();
		let invocations = 0;
		const brain = createModelBrain(
			{
				provider: "local-process-contract-fixture",
				model: "fixture-model",
				modelVersion: "fixture-v1",
				maxRequestBytes: 32_768,
				maxResponseBytes: 2_048,
			},
			{
				invoke: async () => {
					invocations += 1;
					return validArtifact();
				},
			},
		);
		const proposal = await brain.propose(context);
		const record = await createCognitiveDecisionRecord({
			acceptedEventInterval: null,
			context,
			decisionBoundaryId: "boundary-model-replay",
			decisionId: "decision-model-replay",
			failureCode: null,
			proposal,
			proposedCommandId: "command-model-replay",
			receiptRef: "command-model-replay",
			validator: {
				outcome: "accepted",
				reason: "accepted",
				stage: "committed",
			},
			wholePreStateHash: "d".repeat(64),
		});

		const restored = await restoreRecordedIntentProposal({
			context,
			record,
			validate: validateIntentProposal,
		});
		expect(restored).toEqual(proposal);
		expect(Object.isFrozen(restored)).toBe(true);
		expect(invocations).toBe(1);
	});
});
