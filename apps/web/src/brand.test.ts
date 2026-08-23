import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EonfolkMark } from "./components/EonfolkMark";

describe("EONFOLK mark", () => {
	it("is decorative beside the visible wordmark by default", () => {
		const html = renderToStaticMarkup(createElement(EonfolkMark));
		expect(html).toContain('src="/eonfolk-mark.svg"');
		expect(html).toContain('alt=""');
		expect(html).toContain('aria-hidden="true"');
		expect(html).toContain('draggable="false"');
	});

	it("supports an accessible standalone label", () => {
		const html = renderToStaticMarkup(
			createElement(EonfolkMark, { label: "EONFOLK" }),
		);
		expect(html).toContain('alt="EONFOLK"');
		expect(html).not.toContain("aria-hidden");
	});

	it("ships one self-contained, script-free vector source", () => {
		const svg = readFileSync(
			new URL("../public/eonfolk-mark.svg", import.meta.url),
			"utf8",
		);
		expect(svg).toContain('viewBox="0 0 48 48"');
		expect(svg).toContain("open age ring");
		expect(svg).not.toMatch(
			/<script|<foreignObject|\b(?:href|src)=["'](?:https?:|data:)/iu,
		);
	});
});
