import {
	canRead,
	type ReadPurpose,
	VISIBILITY_POLICY_VERSION,
	type Viewer,
	type VisibilityContext,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";

export interface CivilizationChronicleBeat {
	readonly beat: number;
	readonly text: string;
	readonly evidenceEventIds: readonly string[];
	readonly relation: "fact" | "direct" | "trigger" | "contributing";
}

export interface CivilizationChronicleProjection {
	readonly schemaVersion: "eonfolk-civilization-chronicle-v1";
	readonly visibilityPolicyVersion: typeof VISIBILITY_POLICY_VERSION;
	readonly beats: readonly CivilizationChronicleBeat[];
	readonly unresolvedTension: string | null;
	readonly storyCard: string;
}

function citizenName(
	citizenId: string,
	names: Readonly<Record<string, string>>,
): string {
	return names[citizenId] ?? citizenId;
}

function relationFor(
	event: WorldEventEnvelope,
	visibleEventIds: ReadonlySet<string>,
): CivilizationChronicleBeat["relation"] {
	const parents = event.causalParents.filter((parent) =>
		visibleEventIds.has(parent.eventId),
	);
	if (parents.some(({ relation }) => relation === "trigger")) return "trigger";
	if (parents.some(({ relation }) => relation === "contributing"))
		return "contributing";
	return parents.length > 0 ? "direct" : "fact";
}

/** Projects only typed, viewer-visible authority events at real commit revisions. */
export function projectCivilizationChronicle(input: {
	readonly events: readonly WorldEventEnvelope[];
	readonly eventRevisions: Readonly<Record<string, number>>;
	readonly viewer: Viewer;
	readonly purpose: ReadPurpose;
	readonly atRevision: number;
	readonly visibilityContext: VisibilityContext;
	readonly citizenNames: Readonly<Record<string, string>>;
}): CivilizationChronicleProjection {
	const visible = input.events.filter((event) => {
		const createdRevision = input.eventRevisions[event.eventId];
		return (
			Number.isSafeInteger(createdRevision) &&
			(createdRevision as number) >= 0 &&
			canRead(
				input.viewer,
				input.purpose,
				{
					createdRevision: createdRevision as number,
					visibility: event.visibility,
				},
				input.atRevision,
				input.visibilityContext,
			) === "allow"
		);
	});
	const visibleEventIds = new Set(visible.map(({ eventId }) => eventId));
	const beats: CivilizationChronicleBeat[] = [];
	let unresolvedTension: string | null = null;
	for (const event of visible) {
		const payload = event.eventPayload;
		let text: string | null = null;
		if (payload.kind === "SponsorshipEstablished") {
			text = `${citizenName(payload.citizenId, input.citizenNames)} entered a sponsorship covenant with ${payload.patronPrincipalId}.`;
		} else if (payload.kind === "CounselIssued") {
			text = `${citizenName(payload.citizenId, input.citizenNames)} received counsel to ${payload.intent.replace("-", " ")}.`;
			unresolvedTension = `How will ${citizenName(payload.citizenId, input.citizenNames)} interpret that counsel?`;
		} else if (payload.kind === "CounselInterpreted") {
			text = `${citizenName(payload.citizenId, input.citizenNames)} ${payload.disposition === "delayed" ? "deferred" : payload.disposition} the counsel and chose to ${payload.action.replaceAll("-", " ")}.`;
			unresolvedTension =
				payload.disposition === "delayed"
					? `${citizenName(payload.citizenId, input.citizenNames)} has not resolved the counsel yet.`
					: "No later consequence is recorded yet.";
		}
		if (text === null) continue;
		const evidenceEventIds = [
			event.eventId,
			...event.causalParents
				.filter(({ eventId }) => visibleEventIds.has(eventId))
				.map(({ eventId }) => eventId),
		];
		beats.push({
			beat: beats.length + 1,
			text,
			evidenceEventIds,
			relation: relationFor(event, visibleEventIds),
		});
	}
	const selected = beats.slice(-3).map((beat, index) => ({
		...beat,
		beat: index + 1,
	}));
	return {
		schemaVersion: "eonfolk-civilization-chronicle-v1",
		visibilityPolicyVersion: VISIBILITY_POLICY_VERSION,
		beats: selected,
		unresolvedTension,
		storyCard: [
			...selected.map(({ text }) => text),
			...(unresolvedTension === null
				? []
				: [`UNRESOLVED: ${unresolvedTension}`]),
		].join("\n"),
	};
}
