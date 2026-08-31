import { describe, expect, it } from "vitest";
import {
	buildingKindDisplayName,
	containsOpaqueIdentity,
	countNoun,
	indefiniteArticle,
	playerFacingCopy,
	playerFacingPlaceName,
	projectDisplayName,
	projectStateDisplayName,
	relationshipKindDisplayName,
	roleDisplayName,
	siteKindPhrase,
} from "../../../packages/world-presentation/src/index.js";

describe("player-facing display names", () => {
	it("maps roles, buildings, projects, and relationships without exposing slugs", () => {
		expect(roleDisplayName("expedition-steward")).toBe("Expedition steward");
		expect(buildingKindDisplayName("meeting-hall")).toBe("Meeting hall");
		expect(projectDisplayName("expedition-kit")).toBe("Expedition kit");
		expect(projectDisplayName("water-reserve")).toBe("Water reserve");
		expect(projectStateDisplayName("completed")).toBe("completed");
		expect(relationshipKindDisplayName("friend")).toBe("friends");
		expect(siteKindPhrase("undeveloped")).toBe("an undeveloped");
		expect(indefiniteArticle("undeveloped")).toBe("an");
		expect(countNoun(1, "person", "people")).toBe("1 person");
		expect(countNoun(8, "person", "people")).toBe("8 people");
		expect(countNoun(1, "life is unfolding", "lives are unfolding")).toBe(
			"1 life is unfolding",
		);
	});

	it("never leaves a raw site identity in player-facing copy", () => {
		expect(containsOpaqueIdentity("walking toward site_k5n7q9w2x4z6")).toBe(
			true,
		);
		expect(containsOpaqueIdentity("walking toward Workshop")).toBe(false);
		expect(
			playerFacingPlaceName("site_k5n7q9w2x4z6", [
				{ siteId: "site_k5n7q9w2x4z6", name: "Workshop" },
			]),
		).toBe("Workshop");
		expect(playerFacingPlaceName("site_missingplace", [])).toBe("this place");
		expect(playerFacingPlaceName("settlement-second:founding-site", [])).toBe(
			"the founding camp",
		);
		expect(playerFacingCopy("inspecting the work at site_k5n7q9w2x4z6")).toBe(
			"inspecting the work at this place",
		);
		expect(playerFacingCopy("site_k5n7q9w2x4z6")).toBe("this place");
	});
});
