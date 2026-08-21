import { CITIZENS, FIXTURE, MARA_PROJECTION } from "./fixture.mjs";

export const SEMANTIC_ACTIONS = Object.freeze([
	Object.freeze({
		id: "follow-mara",
		role: "button",
		name: "Follow Mara",
		description:
			"Follow Mara. She acts for herself; this does not command her movement or work.",
		enabled: true,
		focusable: true,
		keys: Object.freeze(["Enter", " "]),
	}),
	Object.freeze({
		id: "people",
		role: "button",
		name: "People",
		description: "Open the named citizen list.",
		enabled: true,
		focusable: true,
		keys: Object.freeze(["Enter", " "]),
	}),
]);

export function createSemanticTree() {
	return Object.freeze([
		Object.freeze({
			order: 1,
			role: "region",
			name: "Riverhold world",
			text: "Riverhold settlement: bridge, well, market, mill, woodpile, eight citizens, and three visible activity families.",
		}),
		Object.freeze({
			order: 2,
			role: "heading",
			name: "Mara",
			text: `${MARA_PROJECTION.autonomy}. ${MARA_PROJECTION.standingPlan} ${MARA_PROJECTION.visibleReason}`,
		}),
		Object.freeze({
			order: 3,
			role: "status",
			name: "Authoritative interaction",
			text: FIXTURE.authoritativeInteraction.label,
		}),
		Object.freeze({
			order: 4,
			role: "note",
			name: "Mara and Toma relationship",
			text: `${FIXTURE.relationshipCue.label} ${FIXTURE.relationshipCue.status}.`,
		}),
		Object.freeze({
			order: 5,
			role: "region",
			name: "Chronicle beat: Exchange settled",
			text: FIXTURE.chronicleBeat.text,
		}),
		...CITIZENS.map((citizen, index) =>
			Object.freeze({
				order: 6 + index,
				role: "listitem",
				name: citizen.name,
				text: citizen.activity,
				citizenId: citizen.id,
			}),
		),
		...SEMANTIC_ACTIONS.map((action, index) =>
			Object.freeze({ order: 14 + index, ...action }),
		),
	]);
}

export function activateSemanticAction(actionId, key) {
	const action = SEMANTIC_ACTIONS.find(({ id }) => id === actionId);
	if (
		!action?.enabled ||
		!action.focusable ||
		!action.keys.includes(key)
	) {
		return Object.freeze({ activated: false, actionId });
	}
	return Object.freeze({
		activated: true,
		actionId,
		selectedCitizenId: actionId === "follow-mara" ? "citizen:mara" : null,
	});
}

export function mountSemanticObserver(root, { onFollowMara = () => {} } = {}) {
	if (!root?.ownerDocument) throw new TypeError("root must be a DOM element");
	const document = root.ownerDocument;
	root.replaceChildren();
	root.className = "gate0-visual gate0-visual--semantic";
	root.dataset.fixtureId = FIXTURE.fixtureId;
	root.setAttribute("role", "region");
	root.setAttribute("aria-label", "Riverhold world");

	const summary = document.createElement("p");
	summary.textContent =
		"Riverhold settlement: bridge, well, market, mill, woodpile, eight citizens, and three visible activity families.";
	root.append(summary);

	const maraHeading = document.createElement("h1");
	maraHeading.textContent = "Mara";
	const autonomy = document.createElement("p");
	autonomy.className = "gate0-visual__autonomy";
	autonomy.textContent = `${MARA_PROJECTION.autonomy}. ${MARA_PROJECTION.standingPlan} ${MARA_PROJECTION.visibleReason}`;
	root.append(maraHeading, autonomy);

	const interaction = document.createElement("p");
	interaction.setAttribute("role", "status");
	interaction.setAttribute("aria-label", "Authoritative interaction");
	interaction.textContent = FIXTURE.authoritativeInteraction.label;
	root.append(interaction);

	const relationship = document.createElement("p");
	relationship.setAttribute("role", "note");
	relationship.setAttribute("aria-label", "Mara and Toma relationship");
	relationship.textContent = `${FIXTURE.relationshipCue.label} ${FIXTURE.relationshipCue.status}.`;
	root.append(relationship);

	const chronicle = document.createElement("section");
	chronicle.setAttribute("aria-label", "Chronicle beat: Exchange settled");
	chronicle.textContent = FIXTURE.chronicleBeat.text;
	root.append(chronicle);

	const list = document.createElement("ul");
	list.setAttribute("aria-label", "Riverhold citizens and current activities");
	for (const citizen of CITIZENS) {
		const item = document.createElement("li");
		item.dataset.citizenId = citizen.id;
		item.textContent = `${citizen.name}: ${citizen.activity}.`;
		list.append(item);
	}
	root.append(list);

	const follow = document.createElement("button");
	follow.type = "button";
	follow.textContent = "Follow Mara";
	follow.setAttribute("aria-describedby", "gate0-autonomy-note");
	follow.addEventListener("click", () => onFollowMara("citizen:mara"));
	const note = document.createElement("p");
	note.id = "gate0-autonomy-note";
	note.textContent =
		"She acts for herself; following does not command movement or work.";
	const people = document.createElement("button");
	people.type = "button";
	people.textContent = "People";
	root.append(follow, note, people);
	return Object.freeze({
		followButton: follow,
		peopleButton: people,
		citizenList: list,
	});
}
