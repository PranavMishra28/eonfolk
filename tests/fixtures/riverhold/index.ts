import {
	buildDecisionContext,
	civilizationCounselCatalog,
} from "../../../packages/cognition/src/index.js";
import {
	type CitizenMindSnapshot,
	type DecisionContext,
	type EpistemicRecord,
	type RelationshipState,
	seedPrng,
	VISIBILITY_POLICY_VERSION,
	type VisibilityContext,
} from "../../../packages/protocol/src/index.js";
import {
	citizenBySlug,
	createRiverholdGenesis,
	type GenesisResult,
} from "../../../packages/sim/src/index.js";

export async function riverholdFixture(): Promise<GenesisResult> {
	return createRiverholdGenesis();
}

export async function riverholdDecisionFixture(
	options: {
		readonly actorSlug?: string;
		readonly counselIntent?: "verify-reserve" | "accuse-publicly" | null;
		readonly trust?: number;
		readonly evidenceConfidence?: number;
		readonly removeCommitment?: boolean;
		readonly valueOrder?: readonly [string, string, string];
		readonly hiddenSecret?: string;
		readonly extraCommitments?: number;
	} = {},
): Promise<{
	readonly genesis: GenesisResult;
	readonly context: DecisionContext;
	readonly mind: CitizenMindSnapshot;
	readonly visibilityContext: VisibilityContext;
}> {
	const genesis = await createRiverholdGenesis();
	const state = genesis.state;
	const actorSlug = options.actorSlug ?? "mara";
	const actor = citizenBySlug(state, actorSlug);
	const toma = citizenBySlug(state, "toma");
	const maraRelationship = state.relationships["relationship-mara-toma"]!;
	const relationship: RelationshipState =
		actorSlug === "mara"
			? { ...maraRelationship, trust: options.trust ?? maraRelationship.trust }
			: {
					...maraRelationship,
					relationshipId: `relationship-${actorSlug}-toma`,
					fromCitizenId: actor.citizenId,
					trust: options.trust ?? 7_500,
					visibility: {
						kind: "citizen-private",
						subjectCitizenId: actor.citizenId,
					},
				};
	const ownSeedRecords: EpistemicRecord[] =
		actorSlug === "mara"
			? Object.values(state.epistemicRecords).filter(
					(record) => record.subjectCitizenId === actor.citizenId,
				)
			: [
					{
						recordId: `observation-${actorSlug}-market-reserve`,
						kind: "observation",
						subjectCitizenId: actor.citizenId,
						proposition: `${actor.name} observed that the public reserve count needs verification.`,
						confidence: 8_000,
						sourceIds: [`${actorSlug}-own-observation`],
						visibility: {
							kind: "citizen-private",
							subjectCitizenId: actor.citizenId,
						},
						createdRevision: 0,
					},
					{
						recordId: `commitment-${actorSlug}-role-duty`,
						kind: "commitment",
						subjectCitizenId: actor.citizenId,
						proposition: `${actor.name} promised to finish their own role duty.`,
						confidence: null,
						sourceIds: [`${actorSlug}-own-commitment`],
						visibility: {
							kind: "citizen-private",
							subjectCitizenId: actor.citizenId,
						},
						createdRevision: 0,
					},
				];
	const actorRecords: EpistemicRecord[] = ownSeedRecords
		.filter(
			(record) => !options.removeCommitment || record.kind !== "commitment",
		)
		.map((record) => ({
			...record,
			subjectCitizenId: actor.citizenId,
			confidence:
				record.kind === "belief" || record.kind === "observation"
					? (options.evidenceConfidence ?? record.confidence)
					: record.confidence,
			visibility: {
				kind: "citizen-private",
				subjectCitizenId: actor.citizenId,
			},
		}));
	actorRecords.push({
		recordId: `hidden-toma-secret-${actorSlug}`,
		kind: "private-knowledge",
		subjectCitizenId: toma.citizenId,
		proposition:
			options.hiddenSecret ??
			"Toma privately expects the mill order to be challenged.",
		confidence: 10_000,
		sourceIds: ["private-toma-source"],
		visibility: { kind: "citizen-private", subjectCitizenId: toma.citizenId },
		createdRevision: 0,
	});
	for (let index = 0; index < (options.extraCommitments ?? 0); index += 1) {
		actorRecords.push({
			recordId: `commitment-extra-${actorSlug}-${index}`,
			kind: "commitment",
			subjectCitizenId: actor.citizenId,
			proposition: `Finish prior duty ${index + 1} before changing course.`,
			confidence: null,
			sourceIds: ["riverhold-prior-duty"],
			visibility: {
				kind: "citizen-private",
				subjectCitizenId: actor.citizenId,
			},
			createdRevision: 0,
		});
	}
	const valueIds =
		options.valueOrder ??
		(actor.values.map((value) => value.valueId) as unknown as readonly [
			string,
			string,
			string,
		]);
	const values = valueIds.map((valueId, index) => ({
		valueId,
		rank: (index + 1) as 1 | 2 | 3,
		weight: [1_000, 650, 350][index]!,
	}));
	const mind: CitizenMindSnapshot = {
		citizenId: actor.citizenId,
		values,
		relationships: [relationship],
		records: actorRecords,
		standingPlan: { ...actor.standingPlan, citizenId: actor.citizenId },
	};
	const visibilityContext: VisibilityContext = {
		policyVersion: VISIBILITY_POLICY_VERSION,
		covenants: state.covenants,
		localOwnerPrincipalId: "principal_local_patron",
		nonproduction: true,
	};
	const evidenceRecordIds = actorRecords
		.filter(
			(record) => record.kind === "observation" || record.kind === "belief",
		)
		.map((record) => record.recordId);
	const context = await buildDecisionContext({
		contextId: `context-${actorSlug}-${options.counselIntent ?? "abstain"}`,
		actorMind: mind,
		runId: state.runId,
		regionId: state.regionId,
		revision: state.revision,
		simulationTime: state.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: civilizationCounselCatalog({
			actorId: actor.citizenId,
			targetCitizenId: toma.citizenId,
			planId: actor.standingPlan.planId,
			relationshipId: relationship.relationshipId,
			evidenceRecordIds,
		}),
		visibilityContext,
		counselIntent: options.counselIntent ?? null,
	});
	return { genesis, context, mind, visibilityContext };
}

export async function riverholdPrng(actorId: string) {
	const genesis = await createRiverholdGenesis();
	return seedPrng(
		new Uint8Array(
			genesis.state.worldSeedHex
				.match(/../gu)!
				.map((part) => Number.parseInt(part, 16)),
		),
		"standard-brain",
		actorId,
		"decision-boundary",
	);
}
