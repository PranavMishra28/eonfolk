import {
	COGNITION_VERSION,
	type CognitiveDecisionRecord,
	canRead,
	type DecisionContext,
	type DecisionTraceProjection,
	decisionRecordHash,
	type EventInterval,
	proposalHash as hashProposal,
	type IntentProposal,
	jcs,
	type ReadPurpose,
	type RelationshipState,
	VISIBILITY_POLICY_VERSION,
	type Viewer,
	type VisibilityContext,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null || Object.isFrozen(value))
		return value;
	for (const child of Object.values(value as Record<string, unknown>))
		deepFreeze(child);
	return Object.freeze(value);
}

export async function createCognitiveDecisionRecord(input: {
	readonly decisionId: string;
	readonly decisionBoundaryId: string;
	readonly wholePreStateHash: string;
	readonly context: DecisionContext;
	readonly proposal: IntentProposal | null;
	readonly failureCode: "missing" | "timeout" | "malformed" | null;
	readonly validator: CognitiveDecisionRecord["validator"];
	readonly proposedCommandId: string | null;
	readonly receiptRef: string | null;
	readonly acceptedEventInterval: EventInterval | null;
}): Promise<CognitiveDecisionRecord> {
	if ((input.proposal === null) === (input.failureCode === null)) {
		throw new Error(
			"a decision record requires exactly one proposal or failure",
		);
	}
	if (input.proposal !== null) {
		const { proposalHash, ...withoutProposalHash } = input.proposal;
		if ((await hashProposal(withoutProposalHash)) !== proposalHash)
			throw new Error("proposal hash mismatch");
	}
	const explanation = input.proposal?.explanation ?? null;
	const modelProvenance =
		input.proposal?.provenance.cognitionKind === "model"
			? input.proposal.provenance
			: null;
	const withoutHash = {
		schemaVersion: "eonfolk-cognitive-decision-record-v1" as const,
		recordVersion: "1" as const,
		decisionId: input.decisionId,
		decisionBoundaryId: input.decisionBoundaryId,
		actorId: input.context.actorId,
		runId: input.context.runId,
		regionId: input.context.regionId,
		revision: input.context.revision,
		simulationTime: input.context.simulationTime,
		wholePreStateHash: input.wholePreStateHash,
		decisionReason: input.context.decisionReason,
		activeStandingPlanId: input.context.activeStandingPlan.planId,
		activeStandingPlanVersion: input.context.activeStandingPlan.version,
		suppliedRecordIds: input.context.visibleRecords.map(
			(record) => record.recordId,
		),
		readRecordIds: explanation?.visibleRecordIdsRead ?? [],
		relationshipIds: explanation?.relationshipIdsRead ?? [],
		valueIds: explanation?.valueIdsRead ?? [],
		commitmentIds: explanation?.commitmentIdsRead ?? [],
		contextHash: input.context.contextHash,
		actionCatalogHash: input.context.catalogHash,
		actionCatalogVersion: input.context.actionCatalogVersion,
		budgets: input.context.budgets,
		cognitionConfigurationVersion: COGNITION_VERSION,
		cognitionKind: input.proposal?.provenance.cognitionKind ?? "standard-brain",
		provider: modelProvenance?.provider ?? null,
		model: modelProvenance?.model ?? null,
		modelVersion: modelProvenance?.modelVersion ?? null,
		promptTemplateHash: modelProvenance?.promptTemplateHash ?? null,
		proposalSchemaHash: modelProvenance?.proposalSchemaHash ?? null,
		artifactHash: modelProvenance?.artifactHash ?? null,
		proposalCanonicalBytes:
			input.proposal === null ? null : jcs(input.proposal),
		proposalHash: input.proposal?.proposalHash ?? null,
		explanation,
		failureCode: input.failureCode,
		validator: input.validator,
		proposedCommandId: input.proposedCommandId,
		receiptRef: input.receiptRef,
		acceptedEventInterval: input.acceptedEventInterval,
		rationaleTemplateId:
			input.proposal?.explanation.templateId ?? "standard-brain-failure-v1",
		subjectCitizenId: input.context.actorId,
		sensitivity: "citizen-private-audit" as const,
		provenance: { kind: "cognition-audit" as const, version: "1" as const },
	};
	return {
		...withoutHash,
		decisionRecordHash: await decisionRecordHash(withoutHash),
	};
}

/**
 * Rehydrates the exact accepted proposal recorded at the original decision
 * boundary. Replay has no BrainPort parameter and therefore cannot rerun model
 * inference or substitute a contemporary model response.
 */
export async function restoreRecordedIntentProposal(input: {
	readonly context: DecisionContext;
	readonly record: CognitiveDecisionRecord;
	readonly validate: (
		context: DecisionContext,
		proposal: unknown,
	) => Promise<"accepted" | "ACTION_UNAVAILABLE">;
}): Promise<IntentProposal> {
	const { decisionRecordHash: recordedDecisionHash, ...recordWithoutHash } =
		input.record;
	if ((await decisionRecordHash(recordWithoutHash)) !== recordedDecisionHash)
		throw new Error("recorded cognitive decision hash mismatch");
	if (
		input.record.proposalCanonicalBytes === null ||
		input.record.proposalHash === null ||
		input.record.failureCode !== null
	)
		throw new Error("recorded cognitive decision has no accepted proposal");
	if (
		input.record.contextHash !== input.context.contextHash ||
		input.record.actorId !== input.context.actorId ||
		input.record.revision !== input.context.revision
	)
		throw new Error("recorded cognitive decision context mismatch");
	if (
		new TextEncoder().encode(input.record.proposalCanonicalBytes).byteLength >
		64 * 1_024
	)
		throw new RangeError("recorded proposal exceeds its replay byte budget");
	let parsed: unknown;
	try {
		parsed = JSON.parse(input.record.proposalCanonicalBytes);
	} catch {
		throw new TypeError("recorded proposal is not JSON");
	}
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		Array.isArray(parsed) ||
		jcs(parsed) !== input.record.proposalCanonicalBytes
	)
		throw new TypeError("recorded proposal is not canonical JSON");
	const proposal = parsed as IntentProposal;
	const { proposalHash, ...proposalWithoutHash } = proposal;
	if (
		proposalHash !== input.record.proposalHash ||
		(await hashProposal(proposalWithoutHash)) !== proposalHash
	)
		throw new Error("recorded proposal hash mismatch");
	if ((await input.validate(input.context, proposal)) !== "accepted")
		throw new Error(
			"recorded proposal violates the current authority contract",
		);
	return deepFreeze(proposal);
}

export interface DecisionTraceInput {
	readonly record: CognitiveDecisionRecord;
	readonly proposal: IntentProposal | null;
	readonly recordsById: Readonly<
		Record<string, DecisionContext["visibleRecords"][number]>
	>;
	readonly relationshipsById: Readonly<Record<string, RelationshipState>>;
	readonly eventsById: Readonly<Record<string, WorldEventEnvelope>>;
	readonly viewer: Viewer;
	readonly purpose: ReadPurpose;
	readonly atRevision: number;
	readonly visibilityContext: VisibilityContext;
}

export type DecisionTraceRelease =
	| {
			readonly outcome: "allowed";
			readonly projection: DecisionTraceProjection;
	  }
	| { readonly outcome: "denied"; readonly error: "ACTION_UNAVAILABLE" };

export function projectDecisionTrace(
	input: DecisionTraceInput,
): DecisionTraceProjection {
	const visibleRecords = input.record.readRecordIds
		.map((id) => input.recordsById[id])
		.filter(
			(candidate): candidate is NonNullable<typeof candidate> =>
				candidate !== undefined,
		)
		.filter(
			(candidate) =>
				canRead(
					input.viewer,
					input.purpose,
					{
						createdRevision: candidate.createdRevision,
						visibility: candidate.visibility,
					},
					input.atRevision,
					input.visibilityContext,
				) === "allow",
		)
		.map((candidate) => ({
			recordId: candidate.recordId,
			kind: candidate.kind,
			proposition: candidate.proposition,
		}))
		.sort((left, right) =>
			left.recordId < right.recordId
				? -1
				: left.recordId > right.recordId
					? 1
					: 0,
		);
	const visibleRelationships = input.record.relationshipIds
		.map((id) => input.relationshipsById[id])
		.filter(
			(candidate): candidate is NonNullable<typeof candidate> =>
				candidate !== undefined,
		)
		.filter(
			(candidate) =>
				canRead(
					input.viewer,
					input.purpose,
					{
						createdRevision: candidate.createdRevision,
						visibility: candidate.visibility,
					},
					input.atRevision,
					input.visibilityContext,
				) === "allow",
		)
		.map((candidate) => ({
			relationshipId: candidate.relationshipId,
			trust: candidate.trust,
			strain: candidate.strain,
		}))
		.sort((left, right) =>
			left.relationshipId < right.relationshipId
				? -1
				: left.relationshipId > right.relationshipId
					? 1
					: 0,
		);
	const visibleEventIds = (input.record.acceptedEventInterval?.eventIds ?? [])
		.map((id) => input.eventsById[id])
		.filter(
			(candidate): candidate is NonNullable<typeof candidate> =>
				candidate !== undefined,
		)
		.filter(
			(candidate) =>
				canRead(
					input.viewer,
					input.purpose,
					{
						createdRevision: input.record.revision + 1,
						visibility: candidate.visibility,
					},
					input.atRevision,
					input.visibilityContext,
				) === "allow",
		)
		.map((candidate) => candidate.eventId)
		.sort();
	const traceVisibility = {
		kind: "patron-visible-through-covenant" as const,
		subjectCitizenId: input.record.actorId,
	};
	const authorized =
		canRead(
			input.viewer,
			input.purpose,
			{ createdRevision: input.record.revision, visibility: traceVisibility },
			input.atRevision,
			input.visibilityContext,
		) === "allow" ||
		(input.viewer.kind === "public" &&
			input.purpose === "chronicle-public" &&
			visibleEventIds.length > 0) ||
		(input.viewer.kind === "implementation" &&
			input.purpose === "implementation-diagnostic" &&
			input.visibilityContext.nonproduction);
	if (!authorized) throw new Error("ACTION_UNAVAILABLE");
	return {
		schemaVersion: "eonfolk-decision-trace-projection-v1",
		decisionId: input.record.decisionId,
		viewer: input.viewer,
		purpose: input.purpose,
		atRevision: input.atRevision,
		visibilityPolicyVersion: VISIBILITY_POLICY_VERSION,
		actorId: input.record.actorId,
		decisionReason: input.record.decisionReason,
		publicJustification: input.proposal?.publicJustification ?? null,
		counselDisposition: input.record.explanation?.counselDisposition ?? null,
		visibleRecords,
		visibleRelationships,
		acceptedEventIds: visibleEventIds,
	};
}

export async function releaseDecisionTrace(
	input: DecisionTraceInput,
	options: { readonly minimumReleaseMs?: number } = {},
): Promise<DecisionTraceRelease> {
	const minimumReleaseMs = options.minimumReleaseMs ?? 50;
	if (!Number.isFinite(minimumReleaseMs) || minimumReleaseMs < 0)
		throw new Error("minimum release time must be finite and nonnegative");
	const started = globalThis.performance.now();
	let release: DecisionTraceRelease;
	try {
		release = { outcome: "allowed", projection: projectDecisionTrace(input) };
	} catch (error) {
		if (!(error instanceof Error) || error.message !== "ACTION_UNAVAILABLE")
			throw error;
		release = { outcome: "denied", error: "ACTION_UNAVAILABLE" };
	}
	while (globalThis.performance.now() - started < minimumReleaseMs) {
		const remaining =
			minimumReleaseMs - (globalThis.performance.now() - started);
		await new Promise<void>((resolve) =>
			setTimeout(resolve, Math.max(1, Math.ceil(remaining))),
		);
	}
	return release;
}
