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
	"water-reserve": "Water reserve",
	"grain-reserve": "Grain reserve",
	"path-upkeep": "Path upkeep",
});

const PROJECT_DISPLAY_NAMES = Object.freeze({
	"expedition-kit": "Expedition kit",
	"assemble-expedition-kit": "Assemble expedition kit",
	"water-reserve": "Water reserve",
	"assemble-water-reserve": "Assemble water reserve",
	"grain-reserve": "Grain reserve",
	"assemble-grain-reserve": "Assemble grain reserve",
	"path-upkeep": "Path upkeep",
	"assemble-path-upkeep": "Assemble path upkeep",
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

const STANDING_PLAN_STEP_DISPLAY_NAMES = Object.freeze({
	WorkProject: "working the settlement project",
	TransportResource: "moving stores",
	Gather: "producing at their site",
	Produce: "producing at their site",
	Consume: "meeting a daily need",
	Exchange: "talking with a neighbour",
	SocialMaintenance: "talking with a neighbour",
	JoinMigration: "travelling with the founding party",
	ProposeProject: "starting work from a standing need",
	FollowStandingPlan: "continuing today's work",
	Move: "moving through town",
	Away: "away from town",
	VerifyReserve: "checking the water stores",
	AccusePublicly: "speaking in public",
	RepairMill: "repairing the mill",
	waiting: "waiting",
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

export function standingPlanStepDisplayName(stepKind: string): string {
	return lookup(
		STANDING_PLAN_STEP_DISPLAY_NAMES,
		stepKind,
		(_value) => "today's work",
	);
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

const OPAQUE_IDENTITY = /\b[a-z]+_[a-z0-9]{8,}\b/giu;

/** True when copy still contains a typed stable id such as `site_…`. */
export function containsOpaqueIdentity(value: string): boolean {
	OPAQUE_IDENTITY.lastIndex = 0;
	return OPAQUE_IDENTITY.test(value);
}

/**
 * Player-facing place name. Falls back to a generic phrase, never a raw id.
 */
export function playerFacingPlaceName(
	siteId: string,
	sites: readonly Readonly<{
		readonly siteId: string;
		readonly name: string;
	}>[],
): string {
	const named = sites.find((site) => site.siteId === siteId)?.name.trim();
	if (named !== undefined && named.length > 0) return named;
	if (siteId.includes("founding-site")) return "the founding camp";
	return "this place";
}

/** Strips typed stable ids so Want/HUD copy cannot leak `site_…`. */
export function playerFacingCopy(value: string): string {
	const stripped = value.replaceAll(OPAQUE_IDENTITY, "this place").trim();
	return stripped.length === 0 ? "this place" : stripped;
}
