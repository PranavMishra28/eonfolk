import {
	canRead,
	type ReadPurpose,
	VISIBILITY_POLICY_VERSION,
	type Viewer,
	type VisibilityContext,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";

export interface ChronicleSentence {
	readonly sentenceId: string;
	readonly text: string;
	readonly evidenceEventIds: readonly string[];
	readonly relation:
		| "fact"
		| "direct"
		| "trigger"
		| "contributing"
		| "allegation";
}

export interface ChronicleBeat {
	readonly beat: 1 | 2 | 3;
	readonly text: string;
	readonly evidenceEventIds: readonly string[];
}

export interface ChronicleProjection {
	readonly schemaVersion: "riverhold-chronicle-v1";
	readonly visibilityPolicyVersion: typeof VISIBILITY_POLICY_VERSION;
	readonly branch:
		| "verify-reserve"
		| "accuse-publicly"
		| "follow-plan"
		| "routine";
	readonly sentences: readonly ChronicleSentence[];
	readonly beats: readonly ChronicleBeat[];
	readonly unresolvedTension: string;
	readonly storyCard: string;
}

function nameFor(id: string, names: Readonly<Record<string, string>>): string {
	return names[id] ?? "A citizen";
}

export function projectChronicle(input: {
	readonly events: readonly WorldEventEnvelope[];
	readonly viewer: Viewer;
	readonly purpose: ReadPurpose;
	readonly atRevision: number;
	readonly visibilityContext: VisibilityContext;
	readonly citizenNames: Readonly<Record<string, string>>;
}): ChronicleProjection {
	const visible = input.events.filter(
		(event) =>
			canRead(
				input.viewer,
				input.purpose,
				{ createdRevision: 0, visibility: event.visibility },
				input.atRevision,
				input.visibilityContext,
			) === "allow",
	);
	const visibleIds = new Set(visible.map((event) => event.eventId));
	const sentences: ChronicleSentence[] = [];
	let branch: ChronicleProjection["branch"] = "routine";
	for (const event of visible) {
		const payload = event.eventPayload;
		const safeParents = event.causalParents.filter((parent) =>
			visibleIds.has(parent.eventId),
		);
		const safeRelated = event.relatedEvents.filter((related) =>
			visibleIds.has(related.eventId),
		);
		switch (payload.kind) {
			case "CounselIssued":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `You advised ${nameFor(payload.citizenId, input.citizenNames)} to ${payload.intent === "verify-reserve" ? "verify the reserve" : "speak publicly"}.`,
					evidenceEventIds: [event.eventId],
					relation: "fact",
				});
				break;
			case "CounselInterpreted": {
				branch = payload.action;
				if (payload.interventionId === null) {
					sentences.push({
						sentenceId: `sentence-no-advice-${event.eventId}`,
						text: `No counsel was offered to ${nameFor(payload.citizenId, input.citizenNames)} at this decision boundary.`,
						evidenceEventIds: [event.eventId],
						relation: "fact",
					});
				}
				const actionText =
					payload.action === "verify-reserve"
						? "verify before speaking"
						: payload.action === "accuse-publicly"
							? "make the allegation now"
							: "continue the existing plan";
				const interpretationText =
					payload.disposition === "rejected"
						? `independently rejected the counsel and chose to ${actionText}`
						: payload.disposition === "reinterpreted"
							? `independently reinterpreted the counsel and chose to ${actionText}`
							: payload.disposition === "accepted"
								? `independently accepted the counsel and chose to ${actionText}`
								: `independently chose to ${actionText}`;
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.citizenId, input.citizenNames)} ${interpretationText}.`,
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
					],
					relation: safeParents.some(
						(parent) => parent.relation === "contributing",
					)
						? "contributing"
						: "fact",
				});
				break;
			}
			case "BeliefChanged":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.citizenId, input.citizenNames)} recorded a sourced belief: ${payload.proposition}`,
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
					],
					relation: "direct",
				});
				break;
			case "StatementMade":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.speakerId, input.citizenNames)} stated: “${payload.proposition}”`,
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
					],
					relation: payload.allegation ? "allegation" : "fact",
				});
				break;
			case "RelationshipChanged":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text:
						payload.reasonCode === "private-verification-trust"
							? `${nameFor(payload.fromCitizenId, input.citizenNames)}'s recorded trust in ${nameFor(payload.toCitizenId, input.citizenNames)} increased after the sourced recount.`
							: `${nameFor(payload.fromCitizenId, input.citizenNames)} and ${nameFor(payload.toCitizenId, input.citizenNames)} lost trust after the public accusation.`,
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
					],
					relation: "direct",
				});
				break;
			case "PetitionChanged":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text:
						payload.reasonCode === "independent-unresolved-ledger-interest"
							? "Six hours later, one citizen independently endorsed an audit petition while the mismatch remained unresolved."
							: "Three recorded endorsements moved the petition toward a council vote.",
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
						...safeRelated.map((related) => related.eventId),
					],
					relation:
						payload.reasonCode === "independent-unresolved-ledger-interest"
							? "fact"
							: "trigger",
				});
				break;
			case "StandingPlanChanged":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.citizenId, input.citizenNames)} kept the existing Standing Plan active.`,
					evidenceEventIds: [
						event.eventId,
						...safeParents.map((parent) => parent.eventId),
					],
					relation: "direct",
				});
				break;
			case "ExchangeCompleted":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.firstCitizenId, input.citizenNames)} and ${nameFor(payload.secondCitizenId, input.citizenNames)} completed a bilateral exchange.`,
					evidenceEventIds: [event.eventId],
					relation: "fact",
				});
				break;
			case "MillRepaired":
				sentences.push({
					sentenceId: `sentence-${event.eventId}`,
					text: `${nameFor(payload.citizenId, input.citizenNames)} used two wood to repair the mill.`,
					evidenceEventIds: [event.eventId],
					relation: "direct",
				});
				break;
			default:
				break;
		}
	}
	const advice = sentences.find(
		(sentence) =>
			sentence.text.startsWith("You advised") ||
			sentence.text.startsWith("No counsel was offered"),
	);
	const independentChoice = sentences.find((sentence) =>
		sentence.text.includes("independently"),
	);
	const outcome = sentences.find((sentence) =>
		branch === "accuse-publicly"
			? sentence.text.includes("lost trust")
			: branch === "verify-reserve"
				? sentence.text.includes("recorded trust")
				: sentence.text.includes("independently endorsed"),
	);
	const chosen = [advice, independentChoice, outcome, ...sentences]
		.filter((sentence): sentence is ChronicleSentence => sentence !== undefined)
		.filter(
			(sentence, index, candidates) =>
				candidates.findIndex(
					(candidate) => candidate.sentenceId === sentence.sentenceId,
				) === index,
		)
		.slice(0, 3);
	const beats: ChronicleBeat[] = ([0, 1, 2] as const).map((index) => {
		const sentence = chosen[index] ?? chosen.at(-1);
		return {
			beat: (index + 1) as 1 | 2 | 3,
			text:
				sentence?.text ?? "Riverhold continues without a recorded consequence.",
			evidenceEventIds: sentence?.evidenceEventIds ?? [],
		};
	});
	const unresolvedTension =
		branch === "accuse-publicly"
			? "Will Mara repair Toma's trust before the petition reaches a vote?"
			: branch === "verify-reserve"
				? "Will Mara disclose what the recount establishes, and how will Toma answer?"
				: "Will the unresolved ledger mismatch become a shortage before Mara acts?";
	const storyCardHeading = visible.some(
		(event) => event.eventPayload.kind === "CounselIssued",
	)
		? "YOU ADVISED"
		: branch === "follow-plan"
			? "NO ADVICE / MARA FOLLOWED HER PLAN"
			: "MARA ACTED";
	const storyCard = `${storyCardHeading}\n${beats.map((beat) => beat.text).join("\n")}\nUNRESOLVED: ${unresolvedTension}`;
	return {
		schemaVersion: "riverhold-chronicle-v1",
		visibilityPolicyVersion: VISIBILITY_POLICY_VERSION,
		branch,
		sentences,
		beats,
		unresolvedTension,
		storyCard,
	};
}
