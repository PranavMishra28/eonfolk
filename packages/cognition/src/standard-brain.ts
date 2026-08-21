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

export type StandardBrainAblation =
	| "commitments"
	| "evidence"
	| "relationships"
	| "standing-plan"
	| "values";

interface ScoreOptions {
	readonly ablate?: StandardBrainAblation;
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
	options: ScoreOptions = {},
): ScoredCandidate {
	const terms: ScoreTerm[] = [];
	if (
		entry.action.kind === "FollowStandingPlan" &&
		options.ablate !== "standing-plan"
	)
		terms.push(term("plan", 2_000, [context.activeStandingPlan.planId]));
	const commitments =
		options.ablate === "commitments"
			? []
			: context.visibleRecords.filter((record) => record.kind === "commitment");
	if (entry.tags.includes("commitment") && commitments.length > 0) {
		terms.push(
			term(
				"commitment",
				800 * commitments.length,
				commitments.map((record) => record.recordId),
			),
		);
	}
	const matchingValues =
		options.ablate === "values"
			? []
			: context.values.filter((value) =>
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
	const relationship =
		entry.relationshipId === null || options.ablate === "relationships"
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
	const evidence = (
		options.ablate === "evidence" ? [] : context.visibleRecords
	).filter(
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
		// Counsel is material, but it cannot erase the citizen's existing plan,
		// commitments, relationships, evidence, values, and risk assessment.
		terms.push(term("counsel", 2_000));
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
	return chooseWithStandardBrain(context, input, {});
}

/** Evaluation-only entry point for one-field causal ablations. */
export async function standardBrainAblated(
	context: DecisionContext,
	input: { readonly proposalId: string; readonly prngState: PrngState },
	ablate: StandardBrainAblation,
): Promise<{
	readonly proposal: IntentProposal;
	readonly nextPrngState: PrngState;
}> {
	return chooseWithStandardBrain(context, input, { ablate });
}

async function chooseWithStandardBrain(
	context: DecisionContext,
	input: { readonly proposalId: string; readonly prngState: PrngState },
	options: ScoreOptions,
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
		.map((entry) => score(context, entry, options))
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
	proposal: unknown,
): Promise<"accepted" | "ACTION_UNAVAILABLE"> {
	if (!isPlainRecord(proposal)) return "ACTION_UNAVAILABLE";
	let encodedBytes: number;
	try {
		encodedBytes = new TextEncoder().encode(jcs(proposal)).byteLength;
	} catch {
		return "ACTION_UNAVAILABLE";
	}
	if (encodedBytes > context.budgets.maxBytes || !isBoundedJson(proposal))
		return "ACTION_UNAVAILABLE";
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
		!isPlainRecord(proposal.provenance) ||
		!hasExactKeys(proposal.provenance, ["cognitionKind", "cognitionVersion"]) ||
		proposal.provenance.cognitionKind !== "standard-brain" ||
		proposal.provenance.cognitionVersion !== COGNITION_VERSION ||
		proposal.planProposal !== null ||
		proposal.memoryProposal !== null ||
		typeof proposal.publicJustification !== "string" ||
		proposal.publicJustification.length > 512 ||
		!isClosedExplanation(proposal.explanation, context) ||
		proposal.explanation.selectedActionId !== proposal.actionId ||
		proposal.publicJustification !==
			renderPublicJustification(proposal.explanation as DecisionExplanation)
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
	if (typeof proposal.proposalHash !== "string") return "ACTION_UNAVAILABLE";
	const { proposalHash: claimedHash, ...withoutHash } = proposal;
	if ((await proposalHash(withoutHash)) !== claimedHash)
		return "ACTION_UNAVAILABLE";
	return "accepted";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
	value: Record<string, unknown>,
	expected: readonly string[],
): boolean {
	const keys = Object.keys(value).sort();
	const sorted = [...expected].sort();
	return (
		keys.length === sorted.length && keys.every((key, i) => key === sorted[i])
	);
}

function isBoundedJson(value: unknown, depth = 0): boolean {
	if (depth > 8) return false;
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return typeof value !== "string" || [...value].length <= 2_048;
	if (typeof value === "number") return Number.isSafeInteger(value);
	if (Array.isArray(value))
		return (
			value.length <= 128 &&
			value.every((child) => isBoundedJson(child, depth + 1))
		);
	if (!isPlainRecord(value) || Object.keys(value).length > 64) return false;
	return Object.values(value).every((child) => isBoundedJson(child, depth + 1));
}

function isStringArray(value: unknown, maximum: number): value is string[] {
	return (
		Array.isArray(value) &&
		value.length <= maximum &&
		value.every((item) => typeof item === "string")
	);
}

function isClosedExplanation(
	value: unknown,
	context: DecisionContext,
): value is DecisionExplanation {
	if (
		!isPlainRecord(value) ||
		!hasExactKeys(value, [
			"selectedActionId",
			"templateId",
			"decisiveReasonCodes",
			"visibleRecordIdsRead",
			"relationshipIdsRead",
			"valueIdsRead",
			"commitmentIdsRead",
			"scoreTerms",
			"totalScore",
			"tieBreak",
			"counselDisposition",
			"discardedCandidates",
		])
	)
		return false;
	if (
		typeof value.selectedActionId !== "string" ||
		typeof value.templateId !== "string" ||
		!value.templateId.startsWith("standard-") ||
		!isStringArray(value.decisiveReasonCodes, 3) ||
		!isStringArray(value.visibleRecordIdsRead, 128) ||
		!isStringArray(value.relationshipIdsRead, 128) ||
		!isStringArray(value.valueIdsRead, 128) ||
		!isStringArray(value.commitmentIdsRead, 128) ||
		!Number.isSafeInteger(value.totalScore) ||
		!Array.isArray(value.scoreTerms) ||
		value.scoreTerms.length > 32 ||
		!Array.isArray(value.discardedCandidates) ||
		value.discardedCandidates.length > context.actionCatalog.length ||
		!isPlainRecord(value.tieBreak) ||
		!hasExactKeys(value.tieBreak, ["used", "draw", "tiedActionIds"])
	)
		return false;
	const visibleIds = new Set(
		context.visibleRecords.map(({ recordId }) => recordId),
	);
	const relationshipIds = new Set(
		context.relationships.map(({ relationshipId }) => relationshipId),
	);
	const valueIds = new Set(context.values.map(({ valueId }) => valueId));
	const commitmentIds = new Set(
		context.visibleRecords
			.filter(({ kind }) => kind === "commitment")
			.map(({ recordId }) => recordId),
	);
	const catalogIds = new Set(
		context.actionCatalog.map(({ actionId }) => actionId),
	);
	const allowedCodes = new Set([
		"plan",
		"commitment",
		"value",
		"relationship",
		"evidence",
		"risk",
		"counsel",
	]);
	if (!value.decisiveReasonCodes.every((code) => allowedCodes.has(code)))
		return false;
	if (
		!["accepted", "rejected", "reinterpreted", "not-applicable"].includes(
			String(value.counselDisposition),
		)
	)
		return false;
	if (!value.visibleRecordIdsRead.every((id) => visibleIds.has(id)))
		return false;
	if (!value.relationshipIdsRead.every((id) => relationshipIds.has(id)))
		return false;
	if (!value.valueIdsRead.every((id) => valueIds.has(id))) return false;
	if (!value.commitmentIdsRead.every((id) => commitmentIds.has(id)))
		return false;
	const tieBreak = value.tieBreak;
	if (
		typeof tieBreak.used !== "boolean" ||
		(tieBreak.draw !== null && !Number.isSafeInteger(tieBreak.draw)) ||
		!isStringArray(tieBreak.tiedActionIds, context.actionCatalog.length) ||
		!tieBreak.tiedActionIds.every((id) => catalogIds.has(id))
	)
		return false;
	for (const termValue of value.scoreTerms) {
		if (
			!isPlainRecord(termValue) ||
			!hasExactKeys(termValue, ["code", "sourceIds", "value"]) ||
			typeof termValue.code !== "string" ||
			!allowedCodes.has(termValue.code) ||
			!Number.isSafeInteger(termValue.value) ||
			!isStringArray(termValue.sourceIds, 128)
		)
			return false;
		for (const sourceId of termValue.sourceIds) {
			if (termValue.code === "plan") {
				if (sourceId !== context.activeStandingPlan.planId) return false;
			} else if (
				!visibleIds.has(sourceId) &&
				!relationshipIds.has(sourceId) &&
				!valueIds.has(sourceId)
			)
				return false;
		}
	}
	for (const discarded of value.discardedCandidates) {
		if (
			!isPlainRecord(discarded) ||
			!hasExactKeys(discarded, ["actionId", "reasonCode"]) ||
			typeof discarded.actionId !== "string" ||
			!catalogIds.has(discarded.actionId) ||
			(discarded.reasonCode !== "LOWER_GROUNDED_SCORE" &&
				discarded.reasonCode !== "TIE_BREAK")
		)
			return false;
	}
	const total = value.scoreTerms.reduce(
		(sum, item) => sum + Number((item as Record<string, unknown>).value),
		0,
	);
	if (total !== value.totalScore) return false;
	return true;
}
