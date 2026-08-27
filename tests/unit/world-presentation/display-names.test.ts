import {
	buildingKindDisplayName,
	countNoun,
	indefiniteArticle,
	projectDisplayName,
	projectStateDisplayName,
	relationshipKindDisplayName,
	roleDisplayName,
	siteKindPhrase,
} from "../../../packages/world-presentation/src/index.js";
import { describe, expect, it } from "vitest";

describe("player-facing display names", () => {
	it("maps roles, buildings, projects, and relationships without exposing slugs", () => {
		expect(roleDisplayName("expedition-steward")).toBe("Expedition steward");
		expect(buildingKindDisplayName("meeting-hall")).toBe("Meeting hall");
		expect(projectDisplayName("expedition-kit")).toBe("Expedition kit");
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
});
