export const WORLD_FOCUS_VERSION = "1" as const;

const focusKinds = ["citizen", "location", "object", "event"] as const;
export type WorldFocusKind = (typeof focusKinds)[number];

export type WorldFocus = Readonly<
	| { kind: "citizen"; citizenId: string; eventId?: string }
	| { kind: "location"; locationId: string; eventId?: string }
	| { kind: "object"; objectId: string; eventId?: string }
	| { kind: "event"; eventId: string }
>;

const exactParameters = new Set([
	"focus-version",
	"focus-kind",
	"focus-id",
	"event-id",
]);
const focusIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/u;

function validId(value: string | undefined): value is string {
	return value !== undefined && focusIdPattern.test(value);
}

function isWorldFocusKind(value: string | undefined): value is WorldFocusKind {
	return focusKinds.some((candidate) => candidate === value);
}

function valueOnce(
	parameters: URLSearchParams,
	key: string,
): string | undefined {
	const values = parameters.getAll(key);
	return values.length === 1 ? values[0] : undefined;
}

function idFor(focus: WorldFocus): string {
	switch (focus.kind) {
		case "citizen":
			return focus.citizenId;
		case "location":
			return focus.locationId;
		case "object":
			return focus.objectId;
		case "event":
			return focus.eventId;
	}
}

function contextEventFor(focus: WorldFocus): string | undefined {
	return focus.kind === "event" ? undefined : focus.eventId;
}

/**
 * Builds the same-origin, versioned hand-off from Chronicle or Evidence mode to
 * the world. The href contains identifiers only; it never carries display copy
 * or claims that could be mistaken for Reality.
 */
export function buildWorldFocusHref(focus: WorldFocus): string {
	const focusId = idFor(focus);
	const contextEventId = contextEventFor(focus);
	if (
		!validId(focusId) ||
		(contextEventId !== undefined && !validId(contextEventId))
	)
		throw new Error("World focus identifiers must use the bounded ID grammar");

	const parameters = new URLSearchParams({
		"focus-version": WORLD_FOCUS_VERSION,
		"focus-kind": focus.kind,
		"focus-id": focusId,
	});
	if (contextEventId !== undefined) parameters.set("event-id", contextEventId);
	return `/world?${parameters.toString()}`;
}

/**
 * Parses only links produced by the focus contract. Unknown, duplicated,
 * cross-origin-shaped, hashed, or incomplete inputs fail closed to null.
 */
export function parseWorldFocusHref(href: string): WorldFocus | null {
	if (!href.startsWith("/world?") || href.includes("#")) return null;

	let url: URL;
	try {
		url = new URL(href, "https://eonfolk.invalid");
	} catch {
		return null;
	}
	if (url.origin !== "https://eonfolk.invalid" || url.pathname !== "/world")
		return null;
	if ([...url.searchParams.keys()].some((key) => !exactParameters.has(key)))
		return null;
	if (
		[...exactParameters].some((key) => url.searchParams.getAll(key).length > 1)
	)
		return null;

	const version = valueOnce(url.searchParams, "focus-version");
	const kind = valueOnce(url.searchParams, "focus-kind");
	const focusId = valueOnce(url.searchParams, "focus-id");
	const contextEventId = valueOnce(url.searchParams, "event-id");
	if (
		version !== WORLD_FOCUS_VERSION ||
		!isWorldFocusKind(kind) ||
		!validId(focusId) ||
		(contextEventId !== undefined && !validId(contextEventId))
	)
		return null;

	switch (kind) {
		case "citizen":
			return {
				kind,
				citizenId: focusId,
				...(contextEventId === undefined ? {} : { eventId: contextEventId }),
			};
		case "location":
			return {
				kind,
				locationId: focusId,
				...(contextEventId === undefined ? {} : { eventId: contextEventId }),
			};
		case "object":
			return {
				kind,
				objectId: focusId,
				...(contextEventId === undefined ? {} : { eventId: contextEventId }),
			};
		case "event":
			return contextEventId === undefined ? { kind, eventId: focusId } : null;
	}
}
