import { describe, expect, it } from "vitest";

import {
	buildWorldFocusHref,
	parseWorldFocusHref,
	type WorldFocus,
} from "./research-navigation";

describe("Chronicle-to-world navigation contract", () => {
	it.each<WorldFocus>([
		{ kind: "citizen", citizenId: "citizen:mara" },
		{ kind: "location", locationId: "place:market-east" },
		{ kind: "object", objectId: "object:reserve-ledger" },
		{ kind: "event", eventId: "evt:0042" },
	])("round trips the typed $kind focus", (focus) => {
		const href = buildWorldFocusHref(focus);
		expect(href).toMatch(/^\/world\?focus-version=1&focus-kind=/u);
		expect(parseWorldFocusHref(href ?? "")).toEqual(focus);
	});

	it.each([
		"/world",
		"/world?focus-version=2&focus-kind=event&focus-id=evt:1",
		"/world?focus-version=1&focus-kind=unknown&focus-id=evt:1",
		"/world?focus-version=1&focus-kind=event&focus-id=evt:1&event-id=evt:2",
		"/world?focus-version=1&focus-kind=event&focus-id=evt:1&extra=claim",
		"/world?focus-version=1&focus-version=1&focus-kind=event&focus-id=evt:1",
		"/world?focus-version=1&focus-kind=citizen&focus-id=citizen:mara&event-id=evt:1&event-id=evt:2",
		"/world?focus-version=1&focus-kind=event&focus-id=bad%20id",
		"https://example.com/world?focus-version=1&focus-kind=event&focus-id=evt:1",
		"/world?focus-version=1&focus-kind=event&focus-id=evt:1#claim",
	])("fails closed for malformed or ambiguous href %s", (href) => {
		expect(parseWorldFocusHref(href)).toBeNull();
	});

	it("never serializes display copy into a focus link", () => {
		const href = buildWorldFocusHref({
			kind: "citizen",
			citizenId: "citizen:mara",
		});
		expect(href).not.toMatch(/claim|title|body|cause/iu);
		expect(
			buildWorldFocusHref({
				kind: "event",
				eventId: "Mara caused a shortage",
			}),
		).toBeNull();
	});
});
