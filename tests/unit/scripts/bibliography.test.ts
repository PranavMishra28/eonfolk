import { describe, expect, it } from "vitest";
import { validateBibliography } from "../../../scripts/check-bibliography.mjs";

const entry = (key: string, type = "article") => `@${type}{${key},
  title = {A title},
  year = {2026},
  url = {https://example.invalid/${key}}${
		type === "online" ? ",\n  urldate = {2026-08-22}" : ""
	}\n}`;

describe("bibliography freshness", () => {
	it("accepts unique complete entries declared by the research map", () => {
		expect(
			validateBibliography(
				`${entry("paper")}\n\n${entry("manual", "online")}\n`,
				"<!-- bibliography-keys: paper manual -->",
			),
		).toEqual({ entries: 2, required: 2 });
	});

	it("rejects duplicate keys and missing research-map entries", () => {
		expect(() =>
			validateBibliography(
				`${entry("paper")}\n${entry("paper")}\n`,
				"<!-- bibliography-keys: paper -->",
			),
		).toThrow(/duplicate BibTeX key/u);
		expect(() =>
			validateBibliography(
				entry("paper"),
				"<!-- bibliography-keys: missing -->",
			),
		).toThrow(/missing BibTeX key missing/u);
	});

	it("rejects incomplete entries and online sources without access dates", () => {
		expect(() =>
			validateBibliography(
				"@article{paper,\n  title = {A},\n  year = {2026}\n}",
				"<!-- bibliography-keys: paper -->",
			),
		).toThrow(/lacks required field url/u);
		expect(() =>
			validateBibliography(
				entry("manual", "online").replace(/,\n {2}urldate[^\n]+/u, ""),
				"<!-- bibliography-keys: manual -->",
			),
		).toThrow(/lacks required online field urldate/u);
	});
});
