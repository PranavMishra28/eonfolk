import { describe, expect, it } from "vitest";
import { stateHash } from "@eonfolk/protocol";
import {
	buildGeneratedWorldExperience,
	GENERATED_WORLD_HORIZON_DAYS,
	loadGeneratedWorldExperience,
} from "./generated-world-runtime";
import {
	createGeneratedSponsorAuthority,
	resolveGeneratedCounsel,
} from "./generated-sponsor-authority";
import { V1_GENESIS_WORLD_ID } from "./v1-genesis-runtime";

describe("canonical generated-world browser experience", () => {
	it("memoizes one identity-bound 365-day civilization", async () => {
		const first = await loadGeneratedWorldExperience();
		const second = await loadGeneratedWorldExperience();

		expect(second).toBe(first);
		expect(first.worldId).toBe(V1_GENESIS_WORLD_ID);
		expect(first.horizonDays).toBe(GENERATED_WORLD_HORIZON_DAYS);
		expect(first.simulationTime).toBe(GENERATED_WORLD_HORIZON_DAYS * 86_400);
		expect(first.worldIdentityHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.stateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousStateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousStateHash).not.toBe(first.stateHash);
		expect(first.previousHorizonDays).toBe(1);
		expect(first.persistence).toEqual({
			kind: "unavailable",
			restored: false,
			catchUpReceipts: 0,
		});
	});

	it("projects every actual resident exactly once across founded settlements", async () => {
		const experience = await buildGeneratedWorldExperience();
		const actors = experience.projections.flatMap(
			(projection) => projection.spatial.actors,
		);

		expect(experience.population).toBe(8);
		expect(experience.settlementCount).toBe(2);
		expect(actors).toHaveLength(8);
		expect(new Set(actors.map(({ citizenId }) => citizenId)).size).toBe(8);
		expect(
			experience.projections.map(({ spatial }) => spatial.actors.length).sort(),
		).toEqual([1, 7]);
		const foundingTimes = experience.projections.map(
			({ local }) => local.settlement.foundedAtSimulationTime,
		);
		expect(foundingTimes[0]).toBe(0);
		expect(foundingTimes[1]).toBeGreaterThan(0);
		expect(foundingTimes[1]).toBeLessThanOrEqual(experience.simulationTime);
		expect(
			experience.projections.every(
				({ availability }) => availability.status === "available",
			),
		).toBe(true);
		expect(experience.embodiments).toHaveLength(2);
		expect(experience.embodiments.flatMap(({ actors }) => actors)).toHaveLength(
			8,
		);
		expect(
			experience.embodiments.every(
				(embodiment, index) =>
					embodiment.settlementId ===
						experience.projections[index]?.local.settlement.settlementId &&
					embodiment.source.stateHash === experience.stateHash,
			),
		).toBe(true);
	});

	it("exposes only scheduler-owned actions and grounded settlement sources", async () => {
		const experience = await buildGeneratedWorldExperience();

		for (const projection of experience.projections) {
			expect(projection.spatial.source.runId).toBe(experience.worldId);
			expect(projection.spatial.source.stateHash).toBe(experience.stateHash);
			expect(projection.spatial.contradictionCount).toBe(0);
			expect(projection.spatial.teleportCount).toBe(0);
			for (const actor of projection.spatial.actors) {
				expect(actor.action.sourceKind).toBe("current-behavior");
				expect(actor.action.status).toBe("in-progress");
				expect(actor.action.eventId).toBeNull();
				expect(
					projection.local.sites.some(
						({ siteId }) => siteId === actor.action.destinationPlaceId,
					),
				).toBe(true);
			}
		}
		for (const embodiment of experience.embodiments)
			for (const actor of embodiment.actors) {
				const projected = experience.projections
					.flatMap(({ spatial }) => spatial.actors)
					.find(({ citizenId }) => citizenId === actor.citizenId);
				expect(projected?.action.actionId).toBe(actor.actionId);
				expect(projected?.positionMm).toEqual(actor.positionMm);
			}
	});

	it("projects named sponsor candidates from canonical identity and relationship state", async () => {
		const experience = await buildGeneratedWorldExperience();
		const candidates = experience.sponsorSource.candidates;

		expect(candidates).toHaveLength(7);
		expect(candidates.map(({ name }) => name)).toContain("Iven Rook");
		expect(candidates.map(({ name }) => name)).not.toContain("Mara Vale");
		const iven = candidates.find(({ name }) => name === "Iven Rook");
		expect(iven).toMatchObject({
			role: "provisioner",
			valueIds: ["reliability", "care"],
		});
		expect(iven?.relationships).toHaveLength(2);
		expect(iven?.currentTension).toMatch(/highest measured pressure/u);
		expect(iven?.sourceReferenceIds[0]).toEqual(expect.any(String));
		expect(iven?.sourceReferenceIds[0]?.length).toBeGreaterThan(0);
		expect(experience.sponsorSource.stateHash).toBe(experience.stateHash);
	});

	it("runs one deterministic Standard Brain boundary and traces a delayed systemic consequence", async () => {
		const experience = await buildGeneratedWorldExperience();
		const iven = experience.sponsorSource.candidates.find(
			({ name }) => name === "Iven Rook",
		);
		expect(iven).toBeDefined();
		const sponsored = await createGeneratedSponsorAuthority(
			experience.sponsorSource,
			iven?.citizenId ?? "",
		);
		const first = await resolveGeneratedCounsel({
			source: experience.sponsorSource,
			authority: sponsored,
			counsel: "verify-reserve",
		});
		const replay = await resolveGeneratedCounsel({
			source: experience.sponsorSource,
			authority: sponsored,
			counsel: "verify-reserve",
		});

		expect(replay).toEqual(first);
		expect(first.decision).toMatchObject({
			actionKind: "VerifyReserve",
			disposition: "accepted",
			cognitionKind: "standard-brain",
		});
		expect(first.events).toHaveLength(4);
		expect(first.events.at(-1)).toMatchObject({
			kind: "InstitutionCommitmentRecorded",
			simulationTime: experience.simulationTime + 21_600,
			effect: {
				kind: "institution-commitment",
				institutionName: "Origin Council",
				commitmentKind: "witnessed-reserve-check",
				state: "active",
			},
			causalParents: [
				{
					relation: "direct-cause",
				},
			],
		});
		expect(first.chronicle.map(({ relation }) => relation)).toEqual([
			"temporal-predecessor",
			"contributing-condition",
			"direct-cause",
		]);
		expect(first.shareArtifact?.durationSeconds).toBe(15);
		expect(first.shareArtifact?.beats).toHaveLength(3);
		expect(first.shareArtifact?.canonicalPath).toBe("/world");
		expect(first.authorityHash).toMatch(/^[0-9a-f]{64}$/u);
		const { authorityHash, ...withoutAuthorityHash } = first;
		expect(await stateHash(withoutAuthorityHash)).toBe(authorityHash);
		for (const item of first.events) {
			const { postStateHash, ...withoutStateHash } = item;
			expect(await stateHash(withoutStateHash)).toBe(postStateHash);
		}
	});

	it("records a refused public allegation without presenting it as fact", async () => {
		const experience = await buildGeneratedWorldExperience();
		const iven = experience.sponsorSource.candidates.find(
			({ name }) => name === "Iven Rook",
		);
		const sponsored = await createGeneratedSponsorAuthority(
			experience.sponsorSource,
			iven?.citizenId ?? "",
		);
		const resolved = await resolveGeneratedCounsel({
			source: experience.sponsorSource,
			authority: sponsored,
			counsel: "raise-allegation-publicly",
		});

		expect(resolved.decision).toMatchObject({
			actionKind: "FollowStandingPlan",
			disposition: "rejected",
		});
		expect(
			resolved.events.some(({ kind }) => kind === "AllegationRaised"),
		).toBe(false);
		expect(
			resolved.chronicle.some(
				({ relation }) => relation === "in-world-allegation",
			),
		).toBe(false);
		expect(resolved.events.at(-1)?.publicFact).toMatch(
			/kept its existing allocation commitment/u,
		);
	});
});
