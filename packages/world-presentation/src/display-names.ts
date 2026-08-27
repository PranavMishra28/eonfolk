/**
 * Player-facing names for canonical identifiers. Mapping lives here so views
 * never regex-soup IDs. Research/Developer surfaces may still show evidence IDs.
 */

const ROLE_DISPLAY_NAMES = Object.freeze({
	"expedition-steward": "Expedition steward",
	provisioner: "Provisioner",
	"water-keeper": "Water keeper",
	forester: "Forester",
	builder: "Builder",
	mediator: "Mediator",
	keeper: "Keeper",
	scout: "Scout",
	unassigned: "Unassigned",
});

const BUILDING_KIND_DISPLAY_NAMES = Object.freeze({
	"meeting-hall": "Meeting hall",
	"shared-dwelling": "Shared dwelling",
	storehouse: "Storehouse",
	"open-workshop": "Open workshop",
	"expedition-cache": "Expedition cache",
});

const PROJECT_DISPLAY_NAMES = Object.freeze({
	"expedition-kit": "Expedition kit",
	"assemble-expedition-kit": "Assemble expedition kit",
});

const PROJECT_STATE_DISPLAY_NAMES = Object.freeze({
	proposed: "proposed",
	approved: "approved",
	resourcing: "gathering materials",
	active: "under way",
	paused: "paused",
	completed: "completed",
	failed: "failed",
	abandoned: "abandoned",
});

const RELATIONSHIP_KIND_DISPLAY_NAMES = Object.freeze({
	kin: "kin",
	household: "household",
	friend: "friends",
	colleague: "colleagues",
	rival: "rivals",
});

const SITE_KIND_DISPLAY_NAMES = Object.freeze({
	residential: "residential",
	resource: "resource",
	production: "production",
	civic: "civic",
	storage: "storage",
	undeveloped: "undeveloped",
});

const PLACE_KIND_DISPLAY_NAMES = Object.freeze({
	meeting: "meeting",
	dwelling: "dwelling",
	storage: "storage",
	work: "work",
	resource: "resource",
});

const VALUE_DISPLAY_NAMES = Object.freeze({
	stewardship: "stewardship",
	curiosity: "curiosity",
	reliability: "reliability",
	care: "care",
	craft: "craft",
	solidarity: "solidarity",
	fairness: "fairness",
	prudence: "prudence",
});

function titleWords(value: string): string {
	const words = value.replaceAll(/[-_:]+/gu, " ").trim();
	if (words.length === 0) return words;
	return words
		.split(" ")
		.map((word) =>
			word.length === 0 ? word : `${word[0]?.toUpperCase()}${word.slice(1)}`,
		)
		.join(" ");
}

function lookup(
	table: Readonly<Record<string, string>>,
	id: string,
	fallback: (value: string) => string = titleWords,
): string {
	return table[id] ?? fallback(id);
}

export function roleDisplayName(roleId: string | null | undefined): string {
	if (roleId === null || roleId === undefined || roleId.length === 0)
		return ROLE_DISPLAY_NAMES.unassigned;
	return lookup(ROLE_DISPLAY_NAMES, roleId);
}

export function buildingKindDisplayName(buildingKind: string): string {
	return lookup(BUILDING_KIND_DISPLAY_NAMES, buildingKind);
}

export function projectDisplayName(projectNameOrId: string): string {
	return lookup(PROJECT_DISPLAY_NAMES, projectNameOrId);
}

export function projectStateDisplayName(state: string): string {
	return lookup(PROJECT_STATE_DISPLAY_NAMES, state, (value) => value);
}

export function relationshipKindDisplayName(kind: string): string {
	return lookup(RELATIONSHIP_KIND_DISPLAY_NAMES, kind);
}

export function valueDisplayName(valueId: string): string {
	return lookup(VALUE_DISPLAY_NAMES, valueId, (value) =>
		value.replaceAll("-", " "),
	);
}

export function indefiniteArticle(word: string): "a" | "an" {
	const first = word.trim().toLowerCase()[0];
	return first !== undefined && "aeiou".includes(first) ? "an" : "a";
}

export function siteKindPhrase(kind: string): string {
	const label = lookup(SITE_KIND_DISPLAY_NAMES, kind, (value) =>
		value.replaceAll("-", " "),
	);
	return `${indefiniteArticle(label)} ${label}`;
}

export function placeKindPhrase(kind: string): string {
	const label = lookup(PLACE_KIND_DISPLAY_NAMES, kind, (value) =>
		value.replaceAll("-", " "),
	);
	return `${indefiniteArticle(label)} ${label}`;
}

export function countNoun(
	count: number,
	singular: string,
	plural: string,
): string {
	return `${String(count)} ${count === 1 ? singular : plural}`;
}
