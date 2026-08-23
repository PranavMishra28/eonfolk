import {
	canRead,
	type ReadPurpose,
	VISIBILITY_POLICY_VERSION,
	type Viewer,
	type VisibilityContext,
	type Visibility,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";
import type { CivilizationCounselOutcomeEffect } from "../../civilization/src/types.js";

export interface CivilizationChronicleBoundary {
	readonly eventId: string;
	readonly parentEventIds: readonly string[];
	readonly createdRevision: number;
	readonly visibility: Visibility;
	readonly fact: {
		readonly schemaVersion: "eonfolk-counsel-boundary-fact-v4";
		readonly citizenId: string;
		readonly interventionId: string;
		readonly interpretationAction:
			| "verify-reserve"
			| "accuse-publicly"
			| "follow-plan";
		readonly interpretationDisposition:
			| "accepted"
			| "delayed"
			| "rejected"
			| "reinterpreted";
		readonly causalRelation: "contributing-condition" | "temporal-predecessor";
		readonly routineKind: string;
		readonly routineSubjectId: string;
		readonly planRoutineKind: string;
		readonly planRoutineSubjectId: string;
		readonly consequenceKind: "routine-continued" | "routine-reassigned";
		readonly schedulerActionKinds: readonly string[];
		readonly simulationTime: number;
		readonly requiredNeedUnits: number;
		readonly consumedNeedUnits: number;
		readonly unmetNeedUnits: number;
		readonly sourceStockIds: readonly string[];
		readonly effect: CivilizationCounselOutcomeEffect;
	};
}

export interface CivilizationChronicleBeat {
	readonly beat: number;
	readonly text: string;
	readonly evidenceEventIds: readonly string[];
	readonly relation:
		| "fact"
		| "direct"
		| "trigger"
		| "contributing-condition"
		| "temporal-predecessor";
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
		return "contributing-condition";
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
	readonly boundaries?: readonly CivilizationChronicleBoundary[];
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
		} else if (payload.kind === "PatronAbstained") {
			text = `The patron withheld counsel for ${citizenName(payload.citizenId, input.citizenNames)} at this boundary.`;
			unresolvedTension = `What will ${citizenName(payload.citizenId, input.citizenNames)} do without intervention?`;
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
	for (const boundary of input.boundaries ?? []) {
		if (
			boundary.fact.schemaVersion !== "eonfolk-counsel-boundary-fact-v4" ||
			boundary.createdRevision < 0 ||
			canRead(
				input.viewer,
				input.purpose,
				{
					createdRevision: boundary.createdRevision,
					visibility: boundary.visibility,
				},
				input.atRevision,
				input.visibilityContext,
			) !== "allow"
		)
			continue;
		const fact = boundary.fact;
		const interpreted = fact.interpretationAction.replaceAll("-", " ");
		const consequence =
			fact.effect.kind === "reserve-inspection"
				? `The later inspection recorded ${fact.effect.stockObservations.map((item) => `${item.stockId}=${String(item.quantity)}`).join(", ")}.`
				: fact.effect.kind === "public-allegation"
					? `A public allegation about ${citizenName(fact.effect.targetCitizenId, input.citizenNames)} reduced recorded trust by ${String(-fact.effect.trustDeltaBasisPoints)} and increased strain by ${String(fact.effect.strainDeltaBasisPoints)} basis points.`
					: `The interpretation temporally preceded the standing plan ${fact.effect.planId} continuing.`;
		beats.push({
			beat: beats.length + 1,
			text: `${citizenName(fact.citizenId, input.citizenNames)} reached the later decision boundary after choosing to ${interpreted}. ${consequence} The authoritative need ledger recorded ${fact.consumedNeedUnits} of ${fact.requiredNeedUnits} units consumed and ${fact.unmetNeedUnits} unmet.`,
			evidenceEventIds: [
				boundary.eventId,
				...boundary.parentEventIds.filter((eventId) =>
					visibleEventIds.has(eventId),
				),
			],
			relation: fact.causalRelation,
		});
		unresolvedTension = `Will ${citizenName(fact.citizenId, input.citizenNames)} and the settlement cover the next daily boundary?`;
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
