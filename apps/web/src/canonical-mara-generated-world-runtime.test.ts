import { RELEASE_GENESIS_MARA_CITIZEN_ID } from "@eonfolk/civilization";
import { describe, expect, it } from "vitest";
import { buildGeneratedWorldExperience } from "./generated-world-runtime";

describe("canonical Mara generated-world runtime", () => {
	it("selects Mara by identity in the first-session Dawnmere settlement", async () => {
		const experience = await buildGeneratedWorldExperience({
			indexedDbFactory: null,
		});
		const primary = experience.projections[0];

		expect(experience.sponsorCitizenId).toBe(RELEASE_GENESIS_MARA_CITIZEN_ID);
		expect(experience.settlementCount).toBe(1);
		expect(
			primary?.spatial.actors.some(
				(actor) => actor.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID,
			),
		).toBe(true);
		expect(
			experience.projections.some(
				(projection) =>
					projection.local.settlement.settlementId === "settlement-second",
			),
		).toBe(false);
	});

	it("projects Mara's water stores, Iven friendship, and a want that is not locomotion", async () => {
		const experience = await buildGeneratedWorldExperience({
			indexedDbFactory: null,
		});
		const mara = experience.innerLives.find(
			(life) => life.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID,
		);
		expect(mara?.waterStores).toMatch(/water/iu);
		expect(mara?.standingTies.some((tie) => /Iven/u.test(tie))).toBe(true);
		expect(mara?.want).toMatch(/water|friend/iu);
		expect(mara?.want).not.toMatch(/walking|walks to/iu);
		expect(mara?.daysWork.length).toBeGreaterThan(0);
	});
});
