import type { CivilizationCounselOutcomeEffect } from "../../civilization/src/types.js";
import {
	canRead,
	type ReadPurpose,
	VISIBILITY_POLICY_VERSION,
	type Viewer,
	type Visibility,
	type VisibilityContext,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";

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

export interface CivilizationChronicleAbstentionBoundary {
	readonly eventId: string;
	readonly relatedEventIds: readonly string[];
	readonly createdRevision: number;
	readonly visibility: Visibility;
	readonly fact: {
		readonly schemaVersion: "eonfolk-abstention-boundary-fact-v1";
		readonly citizenId: string;
		readonly abstentionEventId: string;
		readonly planId: string;
		readonly planStepId: string;
		readonly consequenceKind: "standing-plan-continued-after-patron-abstention";
		readonly routineKind: string;
		readonly routineSubjectId: string;
		readonly simulationTime: number;
		readonly requiredNeedUnits: number;
		readonly consumedNeedUnits: number;
		readonly unmetNeedUnits: number;
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

function humanizeIdentifier(value: string): string {
	return value.replaceAll("-", " ");
}

function stockLocation(stockId: string): string {
	if (stockId.startsWith("stock-origin-")) return "in the settlement reserve";
	if (stockId.startsWith("stock-source-")) return "at its source";
	if (stockId.startsWith("stock-work-")) return "at active worksites";
	return "in the recorded reserve";
}

function stockObservationText(observation: {
	readonly stockId: string;
	readonly resourceTypeId: string;
	readonly quantity: number;
}): string {
	return `${humanizeIdentifier(observation.resourceTypeId)} ${stockLocation(observation.stockId)}: ${String(observation.quantity)} units`;
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
	readonly abstentionBoundaries?: readonly CivilizationChronicleAbstentionBoundary[];
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
			text = `${citizenName(payload.citizenId, input.citizenNames)} entered a sponsorship covenant with ${input.viewer.kind === "participant" && input.viewer.principalId === payload.patronPrincipalId ? "you" : "their patron"}.`;
		} else if (payload.kind === "PatronAbstained") {
			text = `You offered no counsel to ${citizenName(payload.citizenId, input.citizenNames)}. The boundary closed without sponsor input; her active Standing Plan remained in force.`;
			unresolvedTension = `What will ${citizenName(payload.citizenId, input.citizenNames)} do independently?`;
		} else if (payload.kind === "CounselIssued") {
			text = `You advised ${citizenName(payload.citizenId, input.citizenNames)} to ${payload.intent.replace("-", " ")}. Advice was an input, not her action.`;
			unresolvedTension = `How will ${citizenName(payload.citizenId, input.citizenNames)} interpret that counsel?`;
		} else if (payload.kind === "CounselInterpreted") {
			text = `${citizenName(payload.citizenId, input.citizenNames)} ${payload.disposition === "delayed" ? "delayed acting on" : payload.disposition} the advice and independently chose to ${payload.action.replaceAll("-", " ")}.`;
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
				? `At the next daily boundary, the inspection recorded ${fact.effect.stockObservations.map(stockObservationText).join("; ")}.`
				: fact.effect.kind === "public-allegation"
					? `At the next daily boundary, a public allegation about ${citizenName(fact.effect.targetCitizenId, input.citizenNames)} reduced recorded trust by ${String(-fact.effect.trustDeltaBasisPoints)} and increased strain by ${String(fact.effect.strainDeltaBasisPoints)} basis points. The allegation was not proof.`
					: "At the next daily boundary, the existing Standing Plan continued; the earlier advice was only a temporal predecessor.";
		beats.push({
			beat: beats.length + 1,
			text: `${citizenName(fact.citizenId, input.citizenNames)} chose to ${interpreted}. ${consequence} Daily needs: ${String(fact.consumedNeedUnits)} of ${String(fact.requiredNeedUnits)} units met; ${String(fact.unmetNeedUnits)} unmet.`,
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
	for (const boundary of input.abstentionBoundaries ?? []) {
		const fact = boundary.fact;
		if (
			fact.schemaVersion !== "eonfolk-abstention-boundary-fact-v1" ||
			fact.consequenceKind !==
				"standing-plan-continued-after-patron-abstention" ||
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
		const name = citizenName(fact.citizenId, input.citizenNames);
		beats.push({
			beat: beats.length + 1,
			text: `${name} received no advice and independently continued the active Standing Plan. At the next daily boundary, the recorded routine was ${humanizeIdentifier(fact.routineKind)} toward ${humanizeIdentifier(fact.routineSubjectId)}. Daily needs: ${String(fact.consumedNeedUnits)} of ${String(fact.requiredNeedUnits)} units met; ${String(fact.unmetNeedUnits)} unmet. Abstention preceded this outcome but is not recorded as its cause.`,
			evidenceEventIds: [
				boundary.eventId,
				...boundary.relatedEventIds.filter((eventId) =>
					visibleEventIds.has(eventId),
				),
			],
			relation: "temporal-predecessor",
		});
		unresolvedTension = `What will ${name}'s independent plan demand at the next boundary?`;
	}
	const selected = beats.slice(-3).map((beat, index) => ({
		...beat,
		beat: index + 1,
	}));
	const subjectId = [...visible]
		.reverse()
		.map(({ eventPayload }) =>
			"citizenId" in eventPayload ? eventPayload.citizenId : null,
		)
		.find((candidate): candidate is string => candidate !== null);
	const subject =
		subjectId === undefined
			? "CITIZEN"
			: citizenName(subjectId, input.citizenNames).toUpperCase();
	return {
		schemaVersion: "eonfolk-civilization-chronicle-v1",
		visibilityPolicyVersion: VISIBILITY_POLICY_VERSION,
		beats: selected,
		unresolvedTension,
		storyCard: [
			...(visible.some(
				({ eventPayload }) => eventPayload.kind === "PatronAbstained",
			)
				? [`NO ADVICE / ${subject} CHOSE INDEPENDENTLY`]
				: visible.some(
							({ eventPayload }) => eventPayload.kind === "CounselIssued",
						)
					? [`YOU ADVISED / ${subject} DECIDED`]
					: []),
			...selected.map(({ text }) => text),
			...(unresolvedTension === null
				? []
				: [`UNRESOLVED: ${unresolvedTension}`]),
		].join("\n"),
	};
}
