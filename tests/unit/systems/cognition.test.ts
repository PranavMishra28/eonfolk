import { describe, expect, it } from "vitest";
import {
	createCognitiveDecisionRecord,
	decideWithDeterministicFallback,
	projectDecisionTrace,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import {
	jcs,
	seedPrng,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import { citizenBySlug } from "../../../packages/sim/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

async function decide(
	counselIntent: "verify-reserve" | "accuse-publicly" | null,
	options = {},
) {
	const fixture = await riverholdDecisionFixture({ counselIntent, ...options });
	const prng = await seedPrng(
		new Uint8Array(
			fixture.genesis.state.worldSeedHex
				.match(/../gu)!
				.map((part) => Number.parseInt(part, 16)),
		),
		"standard-brain",
		fixture.context.actorId,
		"decision-boundary",
	);
	const result = await standardBrain(fixture.context, {
		proposalId: `proposal-${counselIntent ?? "abstain"}`,
		prngState: prng,
	});
	return { ...fixture, ...result };
}

describe("Mind and Standard Brain", () => {
	it("produces three grounded, materially distinct counsel dispositions", async () => {
		const verify = await decide("verify-reserve");
		const accuse = await decide("accuse-publicly");
		const abstain = await decide(null);
		expect(verify.proposal.action.kind).toBe("VerifyReserve");
		expect(verify.proposal.explanation.counselDisposition).toBe("accepted");
		expect(verify.proposal.publicJustification).toMatch(
			/^Your counsel matched my judgment: /,
		);
		expect(verify.proposal.publicJustification).not.toContain(
			"because counsel",
		);
		expect(accuse.proposal.action.kind).toBe("AccusePublicly");
		expect(accuse.proposal.explanation.counselDisposition).toBe("accepted");
		expect(abstain.proposal.action.kind).toBe("FollowStandingPlan");
		expect(abstain.proposal.explanation.counselDisposition).toBe(
			"not-applicable",
		);
		expect(
			new Set([
				verify.proposal.proposalHash,
				accuse.proposal.proposalHash,
				abstain.proposal.proposalHash,
			]).size,
		).toBe(3);
	});

	it("can reject or reinterpret counsel for visible grounded reasons", async () => {
		const reinterpreted = await decide("accuse-publicly", {
			trust: 10_000,
			evidenceConfidence: 10_000,
			valueOrder: ["caution", "candor", "loyalty"],
		});
		expect(reinterpreted.proposal.action.kind).toBe("VerifyReserve");
		expect(reinterpreted.proposal.explanation.counselDisposition).toBe(
			"reinterpreted",
		);
		expect(reinterpreted.proposal.explanation.decisiveReasonCodes).toContain(
			"relationship",
		);
		const rejected = await decide("verify-reserve", { extraCommitments: 5 });
		expect(rejected.proposal.action.kind).toBe("FollowStandingPlan");
		expect(rejected.proposal.explanation.counselDisposition).toBe("rejected");
		expect(rejected.proposal.explanation.decisiveReasonCodes).toContain(
			"commitment",
		);
	});

	it("changes grounded score receipts under independent trust, value, evidence, and commitment perturbations", async () => {
		const baseline = await decide(null);
		const trust = await decide(null, { trust: 500 });
		const value = await decide(null, {
			valueOrder: ["candor", "caution", "loyalty"],
		});
		const evidence = await decide(null, { evidenceConfidence: 1_000 });
		const commitment = await decide(null, { removeCommitment: true });
		const term = (result: Awaited<ReturnType<typeof decide>>, code: string) =>
			result.proposal.explanation.scoreTerms.find(
				(entry) => entry.code === code,
			);
		expect(term(trust, "relationship")?.value).not.toBe(
			term(baseline, "relationship")?.value,
		);
		expect(term(value, "value")?.sourceIds).not.toEqual(
			term(baseline, "value")?.sourceIds,
		);
		expect(term(evidence, "evidence")?.value).not.toBe(
			term(baseline, "evidence")?.value,
		);
		expect(term(commitment, "commitment")).toBeUndefined();
	});

	it("transfers the same decision rule to a non-Mara citizen", async () => {
		const transferred = await decide("verify-reserve", { actorSlug: "sela" });
		expect(transferred.context.actorId).toBe(
			citizenBySlug(transferred.genesis.state, "sela").citizenId,
		);
		expect(transferred.proposal.action.kind).toBe("VerifyReserve");
		expect(transferred.proposal.publicJustification).not.toContain("Mara");
	});

	it("keeps DecisionContext byte-identical when only an unreadable secret changes", async () => {
		const first = await riverholdDecisionFixture({ hiddenSecret: "secret A" });
		const second = await riverholdDecisionFixture({ hiddenSecret: "secret B" });
		expect(jcs(first.context)).toBe(jcs(second.context));
		expect(
			first.context.visibleRecords.some((record) =>
				record.recordId.includes("hidden-toma"),
			),
		).toBe(false);
	});

	it("rejects stale or unknown proposals against the closed catalog", async () => {
		const result = await decide("verify-reserve");
		expect(await validateIntentProposal(result.context, result.proposal)).toBe(
			"accepted",
		);
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				revision: result.proposal.revision + 1,
			}),
		).toBe("ACTION_UNAVAILABLE");
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				actionId: "invent-new-reality",
			}),
		).toBe("ACTION_UNAVAILABLE");
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				publicJustification: "tampered after hashing",
			}),
		).toBe("ACTION_UNAVAILABLE");
	});

	it("falls back once and deterministically for missing, throwing, malformed, and timeout adapters", async () => {
		const fixture = await riverholdDecisionFixture({
			counselIntent: "verify-reserve",
		});
		const prng = await seedPrng(
			new Uint8Array(
				fixture.genesis.state.worldSeedHex
					.match(/../gu)!
					.map((part) => Number.parseInt(part, 16)),
			),
			"standard-brain",
			fixture.context.actorId,
			"fallback",
		);
		const missing = await decideWithDeterministicFallback({
			context: fixture.context,
			proposalId: "proposal-missing",
			prngState: prng,
		});
		const throwing = await decideWithDeterministicFallback({
			context: fixture.context,
			proposalId: "proposal-throwing",
			prngState: prng,
			optionalBrain: {
				propose: async () => {
					throw new Error("offline");
				},
			},
		});
		const malformed = await decideWithDeterministicFallback({
			context: fixture.context,
			proposalId: "proposal-malformed",
			prngState: prng,
			optionalBrain: { propose: async () => ({ action: "anything" }) },
		});
		const timeout = await decideWithDeterministicFallback({
			context: fixture.context,
			proposalId: "proposal-timeout",
			prngState: prng,
			optionalBrain: { propose: async () => undefined },
			forcedFailure: "timeout",
		});
		expect([
			missing.fallbackReason,
			throwing.fallbackReason,
			malformed.fallbackReason,
			timeout.fallbackReason,
		]).toEqual(["missing", "throwing", "malformed", "timeout"]);
		expect([
			missing.adapterInvocations,
			throwing.adapterInvocations,
			malformed.adapterInvocations,
			timeout.adapterInvocations,
		]).toEqual([0, 1, 1, 0]);
		expect(
			[missing, throwing, malformed, timeout].every(
				(result) => result.proposal.action.kind === "VerifyReserve",
			),
		).toBe(true);
	});

	it("hashes a bounded raw audit record and exposes only reauthorized trace fields", async () => {
		const result = await decide("verify-reserve");
		const record = await createCognitiveDecisionRecord({
			decisionId: "decision-fixture",
			decisionBoundaryId: "boundary-fixture",
			wholePreStateHash: await stateHash(result.genesis.state),
			context: result.context,
			proposal: result.proposal,
			failureCode: null,
			validator: {
				stage: "committed",
				outcome: "accepted",
				reason: "accepted",
			},
			proposedCommandId: "cmd-fixture",
			receiptRef: "cmd-fixture",
			acceptedEventInterval: {
				fromSequenceInclusive: 1,
				toSequenceExclusive: 1,
				eventIds: [],
			},
		});
		expect(record.provider).toBeNull();
		expect(record.proposalCanonicalBytes).toBe(jcs(result.proposal));
		expect(record).not.toHaveProperty("chainOfThought");
		const projection = projectDecisionTrace({
			record,
			proposal: result.proposal,
			recordsById: Object.fromEntries(
				result.mind.records.map((entry) => [entry.recordId, entry]),
			),
			relationshipsById: Object.fromEntries(
				result.mind.relationships.map((entry) => [entry.relationshipId, entry]),
			),
			eventsById: {},
			viewer: { kind: "participant", principalId: "principal_local_patron" },
			purpose: "patron-view",
			atRevision: 0,
			visibilityContext: result.visibilityContext,
		});
		expect(jcs(projection)).not.toContain(record.wholePreStateHash);
		expect(jcs(projection)).not.toContain(record.decisionRecordHash);
		expect(jcs(projection)).not.toContain("hidden-toma-secret");
		expect(() =>
			projectDecisionTrace({
				record,
				proposal: result.proposal,
				recordsById: Object.fromEntries(
					result.mind.records.map((entry) => [entry.recordId, entry]),
				),
				relationshipsById: Object.fromEntries(
					result.mind.relationships.map((entry) => [
						entry.relationshipId,
						entry,
					]),
				),
				eventsById: {},
				viewer: { kind: "participant", principalId: "unrelated" },
				purpose: "patron-view",
				atRevision: 0,
				visibilityContext: result.visibilityContext,
			}),
		).toThrow("ACTION_UNAVAILABLE");
	});
});
