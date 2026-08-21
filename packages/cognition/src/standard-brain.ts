import {
	type ActionCatalogEntry,
	COGNITION_VERSION,
	checkedInt32,
	type DecisionContext,
	type DecisionExplanation,
	type IntentProposal,
	jcs,
	type PrngState,
	proposalHash,
	type ScoreTerm,
	xoshiro128StarStar,
} from "../../protocol/src/index.js";

interface ScoredCandidate {
	readonly entry: ActionCatalogEntry;
	readonly terms: readonly ScoreTerm[];
	readonly total: number;
}

function term(
	code: ScoreTerm["code"],
	value: number,
	sourceIds: readonly string[] = [],
): ScoreTerm {
	return { code, value: checkedInt32(value), sourceIds };
}

function score(
	context: DecisionContext,
	entry: ActionCatalogEntry,
): ScoredCandidate {
	const terms: ScoreTerm[] = [];
	if (entry.action.kind === "FollowStandingPlan")
		terms.push(term("plan", 1_000, [context.activeStandingPlan.planId]));
	const commitments = context.visibleRecords.filter(
		(record) => record.kind === "commitment",
	);
	if (entry.tags.includes("commitment") && commitments.length > 0) {
		terms.push(
			term(
				"commitment",
				800 * commitments.length,
				commitments.map((record) => record.recordId),
			),
		);
	}
	const matchingValues = context.values.filter((value) =>
		entry.tags.includes(value.valueId as never),
	);
	if (matchingValues.length > 0)
		terms.push(
			term(
				"value",
				matchingValues.reduce((sum, value) => sum + value.weight, 0),
				matchingValues.map((value) => value.valueId),
			),
		);
	else if (
		entry.action.kind === "FollowStandingPlan" &&
		context.values[0] !== undefined
	) {
		terms.push(
			term("value", context.values[0].weight, [context.values[0].valueId]),
		);
	}
	const relationship =
		entry.relationshipId === null
			? undefined
			: context.relationships.find(
					(candidate) => candidate.relationshipId === entry.relationshipId,
				);
	if (relationship !== undefined) {
		const value =
			entry.action.kind === "AccusePublicly"
				? Math.trunc((10_000 - relationship.trust) / 10)
				: Math.trunc(
						relationship.trust /
							(entry.action.kind === "FollowStandingPlan" ? 10 : 4),
					);
		terms.push(term("relationship", value, [relationship.relationshipId]));
	}
	const evidence = context.visibleRecords.filter(
		(record) =>
			entry.evidenceRecordIds.includes(record.recordId) &&
			record.confidence !== null,
	);
	if (evidence.length > 0)
		terms.push(
			term(
				"evidence",
				Math.trunc(
					evidence.reduce((sum, record) => sum + (record.confidence ?? 0), 0) /
						evidence.length /
						10,
				),
				evidence.map((record) => record.recordId),
			),
		);
	else if (entry.action.kind === "FollowStandingPlan") {
		const planEvidence = context.visibleRecords.filter(
			(record) =>
				(record.kind === "observation" || record.kind === "belief") &&
				record.confidence !== null,
		);
		if (planEvidence.length > 0) {
			terms.push(
				term(
					"evidence",
					Math.trunc(
						planEvidence.reduce(
							(sum, record) => sum + (record.confidence ?? 0),
							0,
						) /
							planEvidence.length /
							20,
					),
					planEvidence.map((record) => record.recordId),
				),
			);
		}
	}
	if (entry.risk !== 0) terms.push(term("risk", -entry.risk));
	if (
		context.counselIntent !== null &&
		entry.counselAffinity === context.counselIntent
	)
		terms.push(term("counsel", 2_700));
	const total = checkedInt32(
		terms.reduce((sum, current) => checkedInt32(sum + current.value), 0),
	);
	return { entry, terms, total };
}

function disposition(
	context: DecisionContext,
	selected: ActionCatalogEntry,
): DecisionExplanation["counselDisposition"] {
	if (context.counselIntent === null) return "not-applicable";
	if (selected.counselAffinity === context.counselIntent) return "accepted";
	if (selected.action.kind === "FollowStandingPlan") return "rejected";
	return "reinterpreted";
}

export function renderPublicJustification(
	explanation: DecisionExplanation,
): string {
	const positiveReason = explanation.decisiveReasonCodes.find(
		(code) =>
			code !== "counsel" &&
			explanation.scoreTerms.some(
				(scoreTerm) => scoreTerm.code === code && scoreTerm.value > 0,
			),
	);
	const reasonCode =
		positiveReason ?? explanation.decisiveReasonCodes[0] ?? "evidence";
	const reason =
		{
			plan: "it follows my standing plan",
			commitment: "it honors a commitment I have already made",
			value: "it fits the values guiding this choice",
			relationship: "I weighed the trust this decision could change",
			evidence: "the evidence available to me supports it",
			risk: "I judged its risk against the alternatives",
			counsel: "your suggestion matches the choice I was weighing",
		}[reasonCode] ?? "the visible facts support it";
	if (explanation.counselDisposition === "accepted")
		return `Your counsel matched my judgment: ${reason}.`;
	if (explanation.counselDisposition === "rejected")
		return `I will keep my plan: ${reason}.`;
	if (explanation.counselDisposition === "reinterpreted")
		return `I changed the counsel's approach: ${reason}.`;
	return `I chose this: ${reason}.`;
}

export async function standardBrain(
	context: DecisionContext,
	input: { readonly proposalId: string; readonly prngState: PrngState },
): Promise<{
	readonly proposal: IntentProposal;
	readonly nextPrngState: PrngState;
}> {
	if (
		context.actionCatalog.length === 0 ||
		context.actionCatalog.length > context.budgets.maxCandidates
	)
		throw new Error("ACTION_UNAVAILABLE");
	const scored = context.actionCatalog
		.map((entry) => score(context, entry))
		.sort(
			(left, right) =>
				right.total - left.total ||
				(left.entry.actionId < right.entry.actionId ? -1 : 1),
		);
	const maximum = scored[0]!.total;
	const tied = scored.filter((candidate) => candidate.total === maximum);
	const draw = tied.length > 1 ? xoshiro128StarStar(input.prngState) : null;
	const selected = tied[draw === null ? 0 : draw.value % tied.length]!;
	const nextPrngState = draw?.state ?? input.prngState;
	const selectedDisposition = disposition(context, selected.entry);
	const decisive = [...selected.terms]
		.sort(
			(left, right) =>
				Math.abs(right.value) - Math.abs(left.value) ||
				(left.code < right.code ? -1 : 1),
		)
		.filter((scoreTerm) => scoreTerm.value !== 0)
		.slice(0, 3);
	const explanation: DecisionExplanation = {
		selectedActionId: selected.entry.actionId,
		templateId: `standard-${selected.entry.action.kind.toLowerCase()}-v1`,
		decisiveReasonCodes: decisive.map((scoreTerm) => scoreTerm.code),
		visibleRecordIdsRead: [
			...new Set(
				selected.terms
					.flatMap((scoreTerm) => scoreTerm.sourceIds)
					.filter((id) =>
						context.visibleRecords.some((record) => record.recordId === id),
					),
			),
		].sort(),
		relationshipIdsRead: [
			...new Set(
				selected.terms
					.flatMap((scoreTerm) => scoreTerm.sourceIds)
					.filter((id) =>
						context.relationships.some(
							(relationship) => relationship.relationshipId === id,
						),
					),
			),
		].sort(),
		valueIdsRead: [
			...new Set(
				selected.terms
					.flatMap((scoreTerm) => scoreTerm.sourceIds)
					.filter((id) => context.values.some((value) => value.valueId === id)),
			),
		].sort(),
		commitmentIdsRead: [
			...new Set(
				selected.terms
					.flatMap((scoreTerm) => scoreTerm.sourceIds)
					.filter((id) =>
						context.visibleRecords.some(
							(record) =>
								record.kind === "commitment" && record.recordId === id,
						),
					),
			),
		].sort(),
		scoreTerms: selected.terms,
		totalScore: selected.total,
		tieBreak: {
			used: draw !== null,
			draw: draw?.value ?? null,
			tiedActionIds: tied.map((candidate) => candidate.entry.actionId).sort(),
		},
		counselDisposition: selectedDisposition,
		discardedCandidates: scored
			.filter(
				(candidate) => candidate.entry.actionId !== selected.entry.actionId,
			)
			.map((candidate) => ({
				actionId: candidate.entry.actionId,
				reasonCode:
					candidate.total < selected.total
						? "LOWER_GROUNDED_SCORE"
						: "TIE_BREAK",
			})),
	};
	const withoutHash = {
		schemaVersion: "eonfolk-intent-proposal-v1" as const,
		proposalId: input.proposalId,
		contextId: context.contextId,
		actorId: context.actorId,
		revision: context.revision,
		actionId: selected.entry.actionId,
		action: selected.entry.action,
		planProposal: null,
		memoryProposal: null,
		provenance: {
			cognitionKind: "standard-brain" as const,
			cognitionVersion: COGNITION_VERSION,
		},
		publicJustification: renderPublicJustification(explanation),
		explanation,
	};
	const proposal: IntentProposal = {
		...withoutHash,
		proposalHash: await proposalHash(withoutHash),
	};
	if (jcs(proposal).length > context.budgets.maxBytes)
		throw new RangeError("proposal exceeds byte budget");
	return { proposal, nextPrngState };
}

export async function validateIntentProposal(
	context: DecisionContext,
	proposal: IntentProposal,
): Promise<"accepted" | "ACTION_UNAVAILABLE"> {
	const expectedKeys = [
		"schemaVersion",
		"proposalId",
		"contextId",
		"actorId",
		"revision",
		"actionId",
		"action",
		"planProposal",
		"memoryProposal",
		"provenance",
		"publicJustification",
		"explanation",
		"proposalHash",
	].sort();
	const actualKeys = Object.keys(proposal).sort();
	if (
		actualKeys.length !== expectedKeys.length ||
		actualKeys.some((key, index) => key !== expectedKeys[index])
	)
		return "ACTION_UNAVAILABLE";
	if (
		proposal.contextId !== context.contextId ||
		proposal.actorId !== context.actorId ||
		proposal.revision !== context.revision ||
		proposal.schemaVersion !== "eonfolk-intent-proposal-v1" ||
		proposal.provenance.cognitionKind !== "standard-brain" ||
		proposal.provenance.cognitionVersion !== COGNITION_VERSION ||
		proposal.planProposal !== null ||
		proposal.memoryProposal !== null ||
		proposal.publicJustification.length > 512 ||
		proposal.explanation.selectedActionId !== proposal.actionId
	)
		return "ACTION_UNAVAILABLE";
	const catalogEntry = context.actionCatalog.find(
		(entry) => entry.actionId === proposal.actionId,
	);
	if (
		catalogEntry === undefined ||
		jcs(catalogEntry.action) !== jcs(proposal.action)
	)
		return "ACTION_UNAVAILABLE";
	const { proposalHash: claimedHash, ...withoutHash } = proposal;
	if ((await proposalHash(withoutHash)) !== claimedHash)
		return "ACTION_UNAVAILABLE";
	return "accepted";
}
