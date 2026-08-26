import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { projectGeneratedCivilizationSpatial } from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

function seedHex(bytes: Uint8Array): string {
	return [...bytes]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

describe("canonical social interaction properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("keeps every generated dyad mutual, known, local, related and capacity-grounded", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uint8Array({ minLength: 32, maxLength: 32 }),
				async (seedBytes) => {
					const world = await generateWorld({
						releaseGenesis: await createReleaseGenesis({
							releaseId: "canonical-social-property",
							seedHex: seedHex(seedBytes),
						}),
					});
					const first = await runCivilizationExperiment({
						world,
						horizonDays: 365,
					});
					const second = await runCivilizationExperiment({
						world,
						horizonDays: 365,
					});
					expect(second.finalStateHash).toBe(first.finalStateHash);
					expect(jcs(second.activities)).toBe(jcs(first.activities));

					const social = first.activities.filter((activity) =>
						["talk", "listen", "exchange"].includes(
							activity.canonicalAction.kind,
						),
					);
					expect(social.length).toBeGreaterThanOrEqual(2);
					for (const activity of social) {
						const actor = first.state.citizens[activity.citizenId];
						const targetId = activity.canonicalAction.targetId;
						const target =
							targetId === null ? undefined : first.state.citizens[targetId];
						expect(targetId).not.toBe(activity.citizenId);
						expect(actor).toBeDefined();
						expect(target).toBeDefined();
						expect(actor?.settlementId).toBe(target?.settlementId);
						expect(actor?.siteId).toBe(target?.siteId);
						expect(activity.routine).toMatchObject({
							kind: "social-maintenance",
							subjectId: targetId,
							route: null,
						});
						expect(
							first.activities.some(
								(candidate) =>
									candidate.citizenId === targetId &&
									candidate.canonicalAction.targetId === activity.citizenId &&
									candidate.canonicalAction.affordanceId ===
										activity.canonicalAction.affordanceId,
							),
						).toBe(true);
						expect(
							Object.values(first.state.relationships).some(
								(relationship) =>
									(relationship.fromCitizenId === activity.citizenId &&
										relationship.toCitizenId === targetId) ||
									(relationship.fromCitizenId === targetId &&
										relationship.toCitizenId === activity.citizenId),
							),
						).toBe(true);
						if (activity.location.kind !== "interaction-slot")
							throw new Error("social activity is not slot-grounded");
						const slot =
							first.world.interactionSlots[activity.location.interactionSlotId]
								?.value;
						expect(slot?.siteId).toBe(actor?.siteId);
						expect(slot?.capacity).toBeGreaterThan(
							activity.canonicalAction.affordanceSlotIndex ?? -1,
						);
					}

					const settlementId =
						first.state.citizens[social[0]?.citizenId ?? ""]?.settlementId;
					if (settlementId === undefined)
						throw new Error("social dyad has no settlement");
					const stateBefore = jcs(first.state);
					const projected = projectGeneratedCivilizationSpatial({
						world: first.world,
						civilization: first.state,
						checkpoint: first,
						settlementId,
						activities: first.activities,
						presentationTick: 365,
					});
					expect(projected.spatial.interactions.length).toBeGreaterThanOrEqual(
						1,
					);
					expect(jcs(first.state)).toBe(stateBefore);
					expect(first.metrics.population).toBe(8);
				},
			),
			{ numRuns: deep ? 12 : 4 },
		);
	}, 30_000);
});
