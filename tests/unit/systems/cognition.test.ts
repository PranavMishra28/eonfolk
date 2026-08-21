import { describe, expect, it } from "vitest";
import {
	buildDecisionContext,
	chooseControlAction,
	createCognitiveDecisionRecord,
	projectDecisionTrace,
	STANDARD_BRAIN_EVALUATION_POLICIES,
	standardBrain,
	standardBrainAblated,
	terminalDecisionVector,
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
	it("lets visible plans and commitments reject advice without a random draw", async () => {
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
		expect(accuse.proposal.action.kind).toBe("FollowStandingPlan");
		expect(accuse.proposal.explanation.counselDisposition).toBe("rejected");
		expect(accuse.proposal.explanation.decisiveReasonCodes).toContain("plan");
		expect(accuse.proposal.explanation.relationshipIdsRead).toContain(
			"relationship-mara-toma",
		);
		expect(accuse.proposal.explanation.tieBreak.used).toBe(false);
		expect(accuse.proposal.publicJustification).toMatch(
			/^I will keep my plan: /,
		);
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
		const baseline = await decide("verify-reserve");
		const trust = await decide("verify-reserve", { trust: 500 });
		const values = await decide("verify-reserve", {
			valueOrder: ["candor", "loyalty", "caution"],
		});
		const evidence = await decide("verify-reserve", {
			evidenceConfidence: 1_000,
		});
		const commitment = await decide(null, { removeCommitment: true });
		const term = (result: Awaited<ReturnType<typeof decide>>, code: string) =>
			result.proposal.explanation.scoreTerms.find(
				(entry) => entry.code === code,
			);
		expect(term(trust, "relationship")?.value).not.toBe(
			term(baseline, "relationship")?.value,
		);
		expect(term(values, "value")?.value).not.toBe(
			term(baseline, "value")?.value,
		);
		expect(term(evidence, "evidence")?.value).not.toBe(
			term(baseline, "evidence")?.value,
		);
		expect(term(commitment, "commitment")).toBeUndefined();
		for (const perturbed of [trust, values, evidence]) {
			expect(jcs(perturbed.proposal.explanation)).not.toBe(
				jcs(baseline.proposal.explanation),
			);
		}
		expect(commitment.proposal.action.kind).toBe("VerifyReserve");
		expect((await decide(null)).proposal.action.kind).toBe(
			"FollowStandingPlan",
		);
	});

	it("transfers the same decision rule to a non-Mara citizen", async () => {
		const transferred = await decide("verify-reserve", { actorSlug: "sela" });
		expect(transferred.context.actorId).toBe(
			citizenBySlug(transferred.genesis.state, "sela").citizenId,
		);
		expect(transferred.proposal.action.kind).toBe("VerifyReserve");
		expect(transferred.proposal.publicJustification).not.toContain("Mara");
		expect(
			transferred.mind.records.every(
				({ recordId }) => !recordId.includes("ledger-mismatch"),
			),
		).toBe(true);
		expect(
			transferred.mind.records.some(({ recordId }) =>
				recordId.startsWith("observation-sela"),
			),
		).toBe(true);
	});

	it("distinguishes three named controls through closed control-specific rules", async () => {
		const fixture = await riverholdDecisionFixture({
			counselIntent: "verify-reserve",
		});
		const prng = await seedPrng(
			new Uint8Array(32).fill(9),
			"controls",
			fixture.context.actorId,
			"matrix",
		);
		expect(STANDARD_BRAIN_EVALUATION_POLICIES).toEqual([
			"standard-brain",
			"canonical-trajectory",
			"reactive-nearest-need",
			"seeded-legal-random",
		]);
		const canonical = chooseControlAction({
			control: "canonical-trajectory",
			context: fixture.context,
			prngState: prng,
		});
		expect(canonical.actionId).toBe("action-follow-plan");
		expect(canonical.selectionReason).toBe("standing-plan-action");
		const canonicalFallbackContext = await buildDecisionContext({
			contextId: "control-canonical-fallback",
			actorMind: fixture.mind,
			runId: fixture.context.runId,
			regionId: fixture.context.regionId,
			revision: fixture.context.revision,
			simulationTime: fixture.context.simulationTime,
			decisionReason: fixture.context.decisionReason,
			actionCatalog: fixture.context.actionCatalog.filter(
				({ action }) => action.kind !== "FollowStandingPlan",
			),
			visibilityContext: fixture.visibilityContext,
			counselIntent: fixture.context.counselIntent,
		});
		const canonicalFallback = chooseControlAction({
			control: "canonical-trajectory",
			context: canonicalFallbackContext,
			prngState: prng,
		});
		expect(canonicalFallback.actionId).toBe("action-accuse-publicly");
		expect(canonicalFallback.selectionReason).toBe(
			"no-standing-plan-action-lexicographic-fallback",
		);

		const fallback = chooseControlAction({
			control: "reactive-nearest-need",
			context: fixture.context,
			prngState: prng,
		});
		expect(fallback.actionId).toBe("action-accuse-publicly");
		expect(fallback.selectionReason).toBe(
			"no-need-action-lexicographic-fallback",
		);

		const needActionCatalog = fixture.context.actionCatalog.map((entry) =>
			entry.actionId === "action-verify-reserve"
				? { ...entry, tags: [...entry.tags, "need" as const] }
				: entry,
		);
		const needContext = await buildDecisionContext({
			contextId: "control-need",
			actorMind: fixture.mind,
			runId: fixture.context.runId,
			regionId: fixture.context.regionId,
			revision: fixture.context.revision,
			simulationTime: fixture.context.simulationTime,
			decisionReason: "need-threshold",
			actionCatalog: needActionCatalog,
			visibilityContext: fixture.visibilityContext,
			counselIntent: "verify-reserve",
		});
		const needDriven = chooseControlAction({
			control: "reactive-nearest-need",
			context: needContext,
			prngState: prng,
		});
		expect(needDriven.actionId).toBe("action-verify-reserve");
		expect(needDriven.selectionReason).toBe("tagged-need-action");
		const changedCounselContext = await buildDecisionContext({
			contextId: "control-need-changed-counsel",
			actorMind: fixture.mind,
			runId: fixture.context.runId,
			regionId: fixture.context.regionId,
			revision: fixture.context.revision,
			simulationTime: fixture.context.simulationTime,
			decisionReason: "need-threshold",
			actionCatalog: needActionCatalog,
			visibilityContext: fixture.visibilityContext,
			counselIntent: "accuse-publicly",
		});
		const counselChanged = chooseControlAction({
			control: "reactive-nearest-need",
			context: changedCounselContext,
			prngState: prng,
		});
		expect(counselChanged).toEqual(needDriven);

		const random = chooseControlAction({
			control: "seeded-legal-random",
			context: fixture.context,
			prngState: prng,
		});
		expect(random.selectionReason).toBe("seeded-legal-draw");
		expect(
			fixture.context.actionCatalog.some(
				({ actionId }) => actionId === random.actionId,
			),
		).toBe(true);
		for (const decision of [canonical, fallback, needDriven, random]) {
			expect(
				terminalDecisionVector({
					context: decision === needDriven ? needContext : fixture.context,
					actionId: decision.actionId,
				}).actionId,
			).toBe(decision.actionId);
		}
	});

	it("makes every predeclared ablation change action or typed explanation", async () => {
		const counseled = await riverholdDecisionFixture({
			counselIntent: "verify-reserve",
		});
		const abstained = await riverholdDecisionFixture({ counselIntent: null });
		const prng = await seedPrng(
			new Uint8Array(32).fill(9),
			"ablations",
			counseled.context.actorId,
			"matrix",
		);
		const fullCounseled = await standardBrain(counseled.context, {
			proposalId: "full-counseled",
			prngState: prng,
		});
		for (const ablation of ["evidence", "relationships", "values"] as const) {
			const result = await standardBrainAblated(
				counseled.context,
				{ proposalId: `ablate-${ablation}`, prngState: prng },
				ablation,
			);
			expect(result.proposal.action.kind).toBe("VerifyReserve");
			expect(result.proposal.explanation.scoreTerms).not.toContainEqual(
				expect.objectContaining({
					code: {
						evidence: "evidence",
						relationships: "relationship",
						values: "value",
					}[ablation],
				}),
			);
			expect(jcs(result.proposal.explanation)).not.toBe(
				jcs(fullCounseled.proposal.explanation),
			);
		}

		const fullAbstained = await standardBrain(abstained.context, {
			proposalId: "full-abstained",
			prngState: prng,
		});
		expect(fullAbstained.proposal.action.kind).toBe("FollowStandingPlan");
		for (const ablation of ["commitments", "standing-plan"] as const) {
			const result = await standardBrainAblated(
				abstained.context,
				{ proposalId: `ablate-${ablation}`, prngState: prng },
				ablation,
			);
			expect(result.proposal.action.kind).toBe("VerifyReserve");
			expect(jcs(result.proposal.explanation)).not.toBe(
				jcs(fullAbstained.proposal.explanation),
			);
		}
	});

	it("never cites an unrelated value as a positive FollowStandingPlan reason", async () => {
		const result = await decide(null, {
			valueOrder: ["unrelated-a", "unrelated-b", "unrelated-c"],
		});
		expect(result.proposal.action.kind).toBe("FollowStandingPlan");
		expect(
			result.proposal.explanation.scoreTerms.some(
				({ code }) => code === "value",
			),
		).toBe(false);
		expect(result.proposal.publicJustification).not.toContain(
			"fits the values",
		);
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
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				provenance: { ...result.proposal.provenance, provider: "spoofed" },
			}),
		).toBe("ACTION_UNAVAILABLE");
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				explanation: { ...result.proposal.explanation, unknown: true },
			}),
		).toBe("ACTION_UNAVAILABLE");
		expect(
			await validateIntentProposal(result.context, {
				...result.proposal,
				explanation: {
					...result.proposal.explanation,
					visibleRecordIdsRead: ["private-unavailable-record"],
				},
			}),
		).toBe("ACTION_UNAVAILABLE");
		const deeplyNested = { value: null } as { value: unknown };
		let cursor = deeplyNested;
		for (let depth = 0; depth < 12; depth += 1) {
			const next = { value: null };
			cursor.value = next;
			cursor = next;
		}
		expect(await validateIntentProposal(result.context, deeplyNested)).toBe(
			"ACTION_UNAVAILABLE",
		);
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
