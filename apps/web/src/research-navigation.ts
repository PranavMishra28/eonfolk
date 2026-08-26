const focusKinds = ["citizen", "location", "object", "event"] as const;
export type WorldFocusKind = (typeof focusKinds)[number];

export type WorldFocus = Readonly<
	| { kind: "citizen"; citizenId: string }
	| { kind: "location"; locationId: string }
	| { kind: "object"; objectId: string }
	| { kind: "event"; eventId: string }
>;

const exactParameters = ["focus-version", "focus-kind", "focus-id"] as const;
const focusIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/u;

function validId(value: string | undefined): value is string {
	return value !== undefined && focusIdPattern.test(value);
}

function isWorldFocusKind(value: string | undefined): value is WorldFocusKind {
	return focusKinds.includes(value as WorldFocusKind);
}

export function worldFocusId(focus: WorldFocus): string {
	return focus[`${focus.kind}Id` as keyof WorldFocus] as string;
}

/**
 * Builds the same-origin, versioned hand-off from Chronicle or Evidence mode to
 * the world. The href contains identifiers only; it never carries display copy
 * or claims that could be mistaken for Reality.
 */
export function buildWorldFocusHref(focus: WorldFocus): string | null {
	const focusId = worldFocusId(focus);
	if (!validId(focusId)) return null;

	const parameters = new URLSearchParams({
		"focus-version": "1",
		"focus-kind": focus.kind,
		"focus-id": focusId,
	});
	return `/world?${parameters.toString()}`;
}

/**
 * Parses only links produced by the focus contract. Unknown, duplicated,
 * cross-origin-shaped, hashed, or incomplete inputs fail closed to null.
 */
export function parseWorldFocusHref(href: string): WorldFocus | null {
	if (!href.startsWith("/world?") || href.includes("#")) return null;
	const parameters = new URLSearchParams(href.slice(7));
	if (
		[...parameters].length !== exactParameters.length ||
		exactParameters.some((key) => parameters.getAll(key).length !== 1)
	)
		return null;

	const version = parameters.get("focus-version") ?? undefined;
	const kind = parameters.get("focus-kind") ?? undefined;
	const focusId = parameters.get("focus-id") ?? undefined;
	if (version !== "1" || !isWorldFocusKind(kind) || !validId(focusId))
		return null;

	return { kind, [`${kind}Id`]: focusId } as WorldFocus;
}
