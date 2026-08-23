import {
	type ActionCatalogEntry,
	type CitizenMindSnapshot,
	canRead,
	catalogHash,
	contextHash,
	type DecisionBudgets,
	type DecisionContext,
	type DecisionReason,
	VISIBILITY_POLICY_VERSION,
	type VisibilityContext,
} from "../../protocol/src/index.js";

const defaultBudgets: DecisionBudgets = {
	maxRecords: 32,
	maxBytes: 16_384,
	maxCandidates: 8,
	maxPlanDepth: 4,
	retries: 0,
};

function compareId(
	left: {
		readonly recordId?: string;
		readonly relationshipId?: string;
		readonly valueId?: string;
	},
	right: typeof left,
): number {
	const leftId = left.recordId ?? left.relationshipId ?? left.valueId ?? "";
	const rightId = right.recordId ?? right.relationshipId ?? right.valueId ?? "";
	return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

export async function buildDecisionContext(input: {
	readonly contextId: string;
	readonly actorMind: CitizenMindSnapshot;
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly decisionReason: DecisionReason;
	readonly actionCatalog: readonly ActionCatalogEntry[];
	readonly visibilityContext: VisibilityContext;
	readonly counselIntent: "verify-reserve" | "accuse-publicly" | null;
	readonly budgets?: DecisionBudgets;
}): Promise<DecisionContext> {
	if (input.visibilityContext.policyVersion !== VISIBILITY_POLICY_VERSION)
		throw new Error("unknown visibility policy");
	const budgets = input.budgets ?? defaultBudgets;
	if (input.actionCatalog.length > budgets.maxCandidates)
		throw new RangeError("action catalog exceeds candidate budget");
	const viewer = {
		kind: "citizen" as const,
		citizenId: input.actorMind.citizenId,
	};
	const visibleRecords = input.actorMind.records
		.filter(
			(record) =>
				canRead(
					viewer,
					"decision-context",
					{
						createdRevision: record.createdRevision,
						visibility: record.visibility,
					},
					input.revision,
					input.visibilityContext,
				) === "allow",
		)
		.sort(compareId)
		.slice(0, budgets.maxRecords);
	const relationships = input.actorMind.relationships
		.filter(
			(relationship) =>
				canRead(
					viewer,
					"decision-context",
					{
						createdRevision: relationship.createdRevision,
						visibility: relationship.visibility,
					},
					input.revision,
					input.visibilityContext,
				) === "allow",
		)
		.sort(compareId);
	const values = [...input.actorMind.values].sort(
		(left, right) => left.rank - right.rank || compareId(left, right),
	);
	const actionCatalog = [...input.actionCatalog].sort((left, right) =>
		left.actionId < right.actionId
			? -1
			: left.actionId > right.actionId
				? 1
				: 0,
	);
	const catalogDigest = await catalogHash({
		version: "civilization-actions-v1",
		entries: actionCatalog,
	});
	const withoutHash = {
		schemaVersion: "eonfolk-decision-context-v1" as const,
		contextId: input.contextId,
		contextVersion: "1" as const,
		actorId: input.actorMind.citizenId,
		runId: input.runId,
		regionId: input.regionId,
		revision: input.revision,
		simulationTime: input.simulationTime,
		decisionReason: input.decisionReason,
		visibleRecords,
		values,
		relationships,
		activeStandingPlan: input.actorMind.standingPlan,
		actionCatalogVersion: "civilization-actions-v1" as const,
		actionCatalog,
		budgets,
		counselIntent: input.counselIntent,
		catalogHash: catalogDigest,
	};
	const context: DecisionContext = {
		...withoutHash,
		contextHash: await contextHash(withoutHash),
	};
	if (
		new TextEncoder().encode(JSON.stringify(context)).byteLength >
		budgets.maxBytes
	)
		throw new RangeError("decision context exceeds byte budget");
	return context;
}

/** Frozen Riverhold fixture catalog. Canonical civilization code must not call it. */
export function civilizationCounselCatalog(input: {
	readonly actorId: string;
	readonly targetCitizenId: string;
	readonly planId: string;
	readonly relationshipId: string;
	readonly evidenceRecordIds: readonly string[];
}): readonly ActionCatalogEntry[] {
	const evidenceActions: readonly ActionCatalogEntry[] =
		input.evidenceRecordIds.length === 0
			? []
			: [
					{
						actionId: "action-verify-reserve",
						action: {
							kind: "VerifyReserve",
							targetCitizenId: input.targetCitizenId,
						},
						publicPreconditions: ["at least one readable source record exists"],
						publicStakes: [
							"delays a public conclusion",
							"may gather stronger evidence",
						],
						tags: ["caution", "evidence", "relationship", "counsel"],
						evidenceRecordIds: input.evidenceRecordIds,
						relationshipId: input.relationshipId,
						risk: 200,
						counselAffinity: "verify-reserve",
					},
					{
						actionId: "action-accuse-publicly",
						action: {
							kind: "AccusePublicly",
							targetCitizenId: input.targetCitizenId,
						},
						publicPreconditions: ["at least one readable source record exists"],
						publicStakes: [
							"records an allegation, not a fact",
							"risks relationship strain",
						],
						tags: ["candor", "evidence", "risk", "counsel"],
						evidenceRecordIds: input.evidenceRecordIds,
						relationshipId: input.relationshipId,
						risk: 500,
						counselAffinity: "accuse-publicly",
					},
				];
	return [
		...evidenceActions,
		{
			actionId: "action-follow-plan",
			action: { kind: "FollowStandingPlan", planId: input.planId },
			publicPreconditions: ["standing plan remains possible"],
			publicStakes: [
				"preserves current commitments",
				"defers the counsel until another decision boundary",
			],
			tags: ["commitment", "relationship"],
			evidenceRecordIds: [],
			relationshipId: input.relationshipId,
			risk: 100,
			counselAffinity: "neutral",
		},
	];
}

/** Evidence-gated legal affordances for one typed civilization counsel. */
export function civilizationCounselAffordances(input: {
	readonly targetCitizenId: string;
	readonly planId: string;
	readonly relationshipId: string;
	readonly evidenceRecordIds: readonly string[];
	readonly counselIntent: "verify-reserve" | "accuse-publicly";
}): readonly ActionCatalogEntry[] {
	const evidenceAction: ActionCatalogEntry | null =
		input.evidenceRecordIds.length === 0
			? null
			: input.counselIntent === "verify-reserve"
				? {
						actionId: "action-verify-reserve",
						action: {
							kind: "VerifyReserve",
							targetCitizenId: input.targetCitizenId,
						},
						publicPreconditions: ["a readable typed source record exists"],
						publicStakes: [
							"delays a conclusion",
							"may gather stronger evidence",
						],
						tags: ["caution", "evidence", "relationship", "counsel"],
						evidenceRecordIds: input.evidenceRecordIds,
						relationshipId: input.relationshipId,
						risk: 200,
						counselAffinity: "verify-reserve",
					}
				: {
						actionId: "action-accuse-publicly",
						action: {
							kind: "AccusePublicly",
							targetCitizenId: input.targetCitizenId,
						},
						publicPreconditions: ["a readable typed source record exists"],
						publicStakes: [
							"records a statement as an allegation",
							"risks relationship strain",
						],
						tags: ["candor", "evidence", "risk", "counsel"],
						evidenceRecordIds: input.evidenceRecordIds,
						relationshipId: input.relationshipId,
						risk: 500,
						counselAffinity: "accuse-publicly",
					};
	return [
		...(evidenceAction === null ? [] : [evidenceAction]),
		{
			actionId: "action-follow-plan",
			action: { kind: "FollowStandingPlan", planId: input.planId },
			publicPreconditions: ["standing plan remains possible"],
			publicStakes: [
				"preserves current commitments",
				"defers counsel until another decision boundary",
			],
			tags: ["commitment", "relationship", "delay"],
			evidenceRecordIds: [],
			relationshipId: input.relationshipId,
			risk: 100,
			counselAffinity: "neutral",
		},
	];
}
