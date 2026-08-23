import { describe, expect, it } from "vitest";
import {
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
} from "@eonfolk/civilization";
import { buildGeneratedWorldExperience } from "./generated-world-runtime";

describe("canonical Mara generated-world runtime", () => {
	it("selects Mara by canonical identity while projecting a different Second Founding resident", async () => {
		const experience = await buildGeneratedWorldExperience({
			indexedDbFactory: null,
		});
		const primary = experience.projections[0];
		const second = experience.projections.find(
			(projection) =>
				projection.local.settlement.settlementId === "settlement-second",
		);

		expect(experience.sponsorCitizenId).toBe(RELEASE_GENESIS_MARA_CITIZEN_ID);
		expect(
			primary?.spatial.actors.some(
				(actor) => actor.citizenId === RELEASE_GENESIS_MARA_CITIZEN_ID,
			),
		).toBe(true);
		expect(second?.spatial.actors.map(({ citizenId }) => citizenId)).toEqual([
			RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
		]);
	});
});
