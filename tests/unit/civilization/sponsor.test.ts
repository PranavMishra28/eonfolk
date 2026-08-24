import { describe, expect, it } from "vitest";
import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	type CivilizationState,
	createCivilizationState,
	evolve,
	registerCitizen,
	registerCivilizationMind,
	registerRelationship,
} from "../../../packages/civilization/src/index.js";
import {
	buildCivilizationCounselDecisionContext,
	createCivilizationSponsorSnapshotBoundary,
	parseCivilizationSponsorCommand,
	prepareCivilizationSponsorTransition,
	replayCivilizationSponsorEvents,
} from "../../../packages/civilization/src/sponsor.js";
import {
	buildDecisionContext,
	civilizationCounselCatalog,
	createCognitiveDecisionRecord,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import {
	batchHash,
	bytesFromHex,
	type CitizenMindSnapshot,
	type CognitionAction,
	eventHash,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	proposalHash,
	seedPrng,
	stateHash,
	VISIBILITY_POLICY_VERSION,
	type WorldCommand,
	type WorldCommandPayload,
} from "../../../packages/protocol/src/index.js";
import { projectCivilizationChronicle } from "../../../packages/sim/src/civilization-chronicle.js";

const RUN = "run-sponsor";
const REGION = "region-sponsor";
const SETTLEMENT_A = "settlement-a";
const SETTLEMENT_B = "settlement-b";
const SITE_A = "site-a";
const SITE_B = "site-b";
const ACTOR = "citizen-a";
const TARGET = "citizen-b";
const NONLOCAL = "citizen-c";
const PATRON = {
	kind: "patron" as const,
	principalId: "patron-local",
	beneficiaryCitizenId: ACTOR,
};

function person(
	citizenId: string,
	settlementId: string,
	siteId: string,
	valueIds: readonly string[] = ["care", "candor"],
) {
	return {
		schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
		citizenId,
		name: `Person ${citizenId}`,
		valueIds,
		settlementId,
		siteId,
		householdId: null,
		primaryRoleId: "resident",
		residenceState: "resident" as const,
		arrivedAtSimulationTime: 0,
		departedAtSimulationTime: null,
		foodRequiredUnitsPerDay: 2,
		waterRequiredUnitsPerDay: 2,
		laborCapacitySecondsPerDay: 20_000,
		committedLaborSecondsPerDay: 5_000,
		lastSocialSimulationTime: 0,
		sourceEventIds: [],
	};
}

function plan() {
	return {
		planId: "plan-standing",
		version: 1,
		citizenId: ACTOR,
		goalType: "preserve-settlement-trust",
		targetIds: [TARGET],
		steps: [
			{
				stepId: "step-one",
				kind: "Inspect",
				targetIds: [TARGET],
				status: "active" as const,
				children: [],
			},
		],
		currentStepId: "step-one",
		commitmentId: null,
		sourceId: "plan-source",
		startBoundary: 0,
		expiryBoundary: 10,
		retriesRemaining: 1,
		replansRemaining: 1,
		status: "active" as const,
	};
}

function mind(
	records: CitizenMindSnapshot["records"] | undefined = undefined,
	trust = 6_000,
	evidenceConfidence = 8_000,
	valueIds: readonly string[] = ["care", "candor"],
): CitizenMindSnapshot {
	return {
		citizenId: ACTOR,
		values: valueIds.map((valueId, index) => ({
			valueId,
			rank: (index + 1) as 1 | 2 | 3,
			weight: index === 0 ? 700 : 500,
		})),
		relationships: [
			{
				relationshipId: "relationship-a-b",
				fromCitizenId: ACTOR,
				toCitizenId: TARGET,
				familiarity: 6_000,
				trust,
				strain: 1_000,
				lastMaterialEventId: null,
				visibility: { kind: "citizen-private", subjectCitizenId: ACTOR },
				createdRevision: 0,
			},
		],
		records: records ?? [
			{
				recordId: "record-visible-reserve",
				kind: "observation",
				subjectCitizenId: ACTOR,
				proposition: "A sourced settlement resource claim needs review.",
				confidence: evidenceConfidence,
				sourceIds: ["event-visible-source"],
				visibility: { kind: "citizen-private", subjectCitizenId: ACTOR },
				createdRevision: 0,
			},
		],
		standingPlan: plan(),
	};
}

function fixture(
	trust = 6_000,
	withMind = true,
	evidenceConfidence = 8_000,
	actorValueIds: readonly string[] = ["care", "candor"],
	withEvidence = true,
): CivilizationState {
	let state = createCivilizationState({
		citizenIds: [ACTOR, TARGET, NONLOCAL],
		settlementIds: [SETTLEMENT_A, SETTLEMENT_B],
		territoryIds: ["territory-a", "territory-b"],
		siteIds: [SITE_A, SITE_B],
		buildingKindsBySite: { [SITE_A]: [], [SITE_B]: [] },
		capabilitiesByCitizen: { [ACTOR]: {}, [TARGET]: {}, [NONLOCAL]: {} },
	});
	state = registerCitizen(
		state,
		person(ACTOR, SETTLEMENT_A, SITE_A, actorValueIds),
	);
	state = registerCitizen(state, person(TARGET, SETTLEMENT_A, SITE_A));
	state = registerCitizen(state, person(NONLOCAL, SETTLEMENT_B, SITE_B));
	state = registerRelationship(state, {
		schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
		relationshipId: "relationship-a-b",
		fromCitizenId: ACTOR,
		toCitizenId: TARGET,
		kind: "colleague",
		familiarityBasisPoints: 6_000,
		trustBasisPoints: trust,
		strainBasisPoints: 1_000,
		lastInteractionSimulationTime: 0,
		sourceEventIds: [],
	});
	state = evolve(state, {
		citizens: {
			...state.citizens,
			[ACTOR]: {
				...state.citizens[ACTOR]!,
				sourceEventIds: ["event-visible-source"],
			},
		},
		provenance: [
			{
				eventId: "event-visible-source",
				mechanismId: "observation.recorded.v1",
				causeEventIds: [],
				actorVisibleSourceEventIds: [],
				modelDecisionId: null,
			},
		],
	});
	if (!withMind) return state;
	return registerCivilizationMind(state, {
		schemaVersion: "eonfolk-civilization-mind-v1",
		citizenId: ACTOR,
		snapshot: mind(
			withEvidence ? undefined : [],
			trust,
			evidenceConfidence,
			actorValueIds,
		),
		committedAtRevision: state.revision,
		committedAtSimulationTime: state.simulationTime,
	});
}

async function command<
	P extends Extract<
		WorldCommandPayload,
		{
			kind:
				| "EstablishSponsorship"
				| "RecordPatronAbstention"
				| "IssueCounsel"
				| "ResolveCounsel";
		}
	>,
>(
	commandId: string,
	expectedRevision: number,
	principal: WorldCommand["principal"],
	payload: P,
): Promise<WorldCommand<P>> {
	return {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId,
		payloadFingerprint: await payloadFingerprint(payload),
		expectedRevision,
		principal,
		runId: RUN,
		regionId: REGION,
		payload,
	};
}

const head = () => stateHash({ runId: RUN, regionId: REGION, genesis: true });

async function boundary(
	state: CivilizationState,
	worldHead: string,
	nextSequence: number,
) {
	return createCivilizationSponsorSnapshotBoundary({
		snapshotId: `snapshot-${nextSequence}`,
		runId: RUN,
		regionId: REGION,
		stateHash: await stateHash(state),
		revision: state.revision,
		simulationTime: state.simulationTime,
		nextSequence,
		baseWorldHeadHash: worldHead,
	});
}

async function establish(state: CivilizationState, nextSequence = 0) {
	const worldHead = await head();
	return prepareCivilizationSponsorTransition({
		state,
		runId: RUN,
		regionId: REGION,
		priorWorldHeadHash: worldHead,
		nextSequence,
		snapshotBoundary: await boundary(state, worldHead, nextSequence),
		authoritativeHeaders: [],
		fencingToken: 1,
		command: await command("command-establish", state.revision, PATRON, {
			kind: "EstablishSponsorship",
			covenantId: "covenant-one",
			citizenId: ACTOR,
		}),
		authoritativeHistory: [],
	});
}

async function issue(
	established: Awaited<ReturnType<typeof establish>>,
	intent: "verify-reserve" | "accuse-publicly" = "verify-reserve",
) {
	return prepareCivilizationSponsorTransition({
		state: established.postState,
		runId: RUN,
		regionId: REGION,
		priorWorldHeadHash: established.resultingWorldHeadHash,
		nextSequence: 1,
		snapshotBoundary: await boundary(
			established.postState,
			established.resultingWorldHeadHash,
			1,
		),
		authoritativeHeaders: [],
		fencingToken: 1,
		command: await command(
			"command-issue",
			established.postState.revision,
			PATRON,
			{
				kind: "IssueCounsel",
				interventionId: "intervention-one",
				citizenId: ACTOR,
				intent,
			},
		),
		// Proves the persisted covenant, not ancient history, owns current authority.
		authoritativeHistory: [],
	});
}

async function resolution(
	state: CivilizationState,
	_intent: "verify-reserve" | "accuse-publicly",
	action: CognitionAction,
	commandId: string,
	_actorMind = state.minds[ACTOR]!.snapshot,
) {
	const decisionId = `decision-${commandId}`;
	const canonicalMind = state.minds[ACTOR]!.snapshot;
	const context =
		_actorMind === canonicalMind
			? await buildCivilizationCounselDecisionContext({
					state,
					runId: RUN,
					regionId: REGION,
					citizenId: ACTOR,
					interventionId: "intervention-one",
					decisionId,
				})
			: await buildDecisionContext({
					contextId: `context:${decisionId}`,
					actorMind: _actorMind,
					runId: RUN,
					regionId: REGION,
					revision: state.revision,
					simulationTime: state.simulationTime,
					decisionReason: "sponsor-counsel",
					actionCatalog: civilizationCounselCatalog({
						actorId: ACTOR,
						targetCitizenId:
							action.kind === "VerifyReserve" ||
							action.kind === "AccusePublicly"
								? action.targetCitizenId
								: TARGET,
						planId: _actorMind.standingPlan.planId,
						relationshipId: "relationship-a-b",
						evidenceRecordIds: _actorMind.records.map(
							({ recordId }) => recordId,
						),
					}),
					visibilityContext: {
						policyVersion: VISIBILITY_POLICY_VERSION,
						covenants: [],
						localOwnerPrincipalId: PATRON.principalId,
						nonproduction: false,
					},
					counselIntent: _intent,
				});
	if (context === null) throw new Error("test counsel context unavailable");
	const chosen = await standardBrain(context, {
		proposalId: `proposal-${commandId}`,
		prngState: await seedPrng(
			bytesFromHex(context.contextHash, 32),
			"civilization-sponsor",
			ACTOR,
			decisionId,
		),
	});
	expect(chosen.proposal.action).toEqual(action);
	const record = await createCognitiveDecisionRecord({
		decisionId,
		decisionBoundaryId: `boundary-${commandId}`,
		wholePreStateHash: await stateHash(state),
		context,
		proposal: chosen.proposal,
		failureCode: null,
		validator: {
			stage: "authorization",
			outcome: "accepted",
			reason: "validated",
		},
		proposedCommandId: commandId,
		receiptRef: null,
		acceptedEventInterval: null,
	});
	return {
		decisionId,
		context,
		proposal: chosen.proposal,
		decisionRecord: record,
	};
}

async function resolve(
	issued: Awaited<ReturnType<typeof issue>>,
	action: CognitionAction,
	commandAction: "verify-reserve" | "accuse-publicly" | "follow-plan",
) {
	const commandId = `command-resolve-${commandAction}`;
	const counsel = issued.postState.counsels["intervention-one"]!;
	const resolved = await resolution(
		issued.postState,
		counsel.intent,
		action,
		commandId,
	);
	return prepareCivilizationSponsorTransition({
		state: issued.postState,
		runId: RUN,
		regionId: REGION,
		priorWorldHeadHash: issued.resultingWorldHeadHash,
		nextSequence: 2,
		snapshotBoundary: await boundary(
			issued.postState,
			issued.resultingWorldHeadHash,
			2,
		),
		authoritativeHeaders: [],
		fencingToken: 1,
		command: await command(
			commandId,
			issued.postState.revision,
			{ kind: "citizen", principalId: ACTOR },
			{
				kind: "ResolveCounsel",
				citizenId: ACTOR,
				interventionId: "intervention-one",
				decisionId: resolved.decisionId,
				proposalId: resolved.proposal.proposalId,
				action: commandAction,
			},
		),
		// Counsel and covenant both survive compaction in the snapshot.
		authoritativeHistory: [],
		resolution: resolved,
	});
}

describe("canonical civilization sponsor reducer", () => {
	it("requires a separate persisted Follow covenant before counsel", async () => {
		const state = fixture();
		const startHead = await head();
		const counselOnly = await prepareCivilizationSponsorTransition({
			state,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: startHead,
			nextSequence: 0,
			snapshotBoundary: await boundary(state, startHead, 0),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command("issue-too-early", state.revision, PATRON, {
				kind: "IssueCounsel",
				interventionId: "early",
				citizenId: ACTOR,
				intent: "verify-reserve",
			}),
			authoritativeHistory: [],
		});
		expect(counselOnly.receipt.rejectionCode).toBe("INVALID_PRINCIPAL");
		expect(counselOnly.postState).toBe(state);

		const followed = await establish(state);
		expect(
			followed.events.map(({ eventPayload }) => eventPayload.kind),
		).toEqual(["SponsorshipEstablished"]);
		expect(followed.postState.sponsorships["covenant-one"]).toMatchObject({
			patronPrincipalId: PATRON.principalId,
			beneficiaryCitizenId: ACTOR,
			sourceEventId: followed.events[0]!.eventId,
		});
		const counsel = await issue(followed);
		expect(counsel.events.map(({ eventPayload }) => eventPayload.kind)).toEqual(
			["CounselIssued"],
		);
		expect(counsel.events[0]!.causalParents[0]).toMatchObject({
			eventId: followed.events[0]!.eventId,
			mechanismId: "sponsor.covenant.authorizes-counsel.v1",
		});
	});

	it("allows only one unresolved counsel for a citizen", async () => {
		const established = await establish(fixture());
		const first = await issue(established, "verify-reserve");
		const secondPayload = {
			kind: "IssueCounsel" as const,
			interventionId: "intervention-two",
			citizenId: ACTOR,
			intent: "accuse-publicly" as const,
		};
		const second = await prepareCivilizationSponsorTransition({
			state: first.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: first.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				first.postState,
				first.resultingWorldHeadHash,
				2,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command(
				"command-issue-two",
				first.postState.revision,
				PATRON,
				secondPayload,
			),
			authoritativeHistory: [],
		});
		expect(second.accepted).toBe(false);
		expect(second.receipt.rejectionCode).toBe("NO_OP");
		expect(second.events).toEqual([]);
		expect(second.postState).toBe(first.postState);
	});

	it("records patron abstention as durable authority with a factual Chronicle beat", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const abstention = await prepareCivilizationSponsorTransition({
			state: followed.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: followed.resultingWorldHeadHash,
			nextSequence: 1,
			snapshotBoundary: await boundary(
				followed.postState,
				followed.resultingWorldHeadHash,
				1,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command(
				"command-abstain",
				followed.postState.revision,
				PATRON,
				{
					kind: "RecordPatronAbstention",
					abstentionId: "abstention-one",
					citizenId: ACTOR,
					reason: "withhold-counsel",
				},
			),
			authoritativeHistory: [],
		});
		expect(abstention.accepted).toBe(true);
		expect(abstention.events[0]?.eventPayload.kind).toBe("PatronAbstained");
		expect(abstention.events[0]?.causalParents).toEqual([
			{
				eventId: followed.events[0]!.eventId,
				relation: "direct",
				mechanismId: "sponsor.covenant.authorizes-abstention.v1",
			},
		]);
		expect(
			abstention.postState.patronAbstentions["abstention-one"],
		).toMatchObject({
			citizenId: ACTOR,
			patronPrincipalId: PATRON.principalId,
			sourceEventId: abstention.events[0]!.eventId,
		});
		const chronicle = projectCivilizationChronicle({
			events: [...followed.events, ...abstention.events],
			eventRevisions: {
				[followed.events[0]!.eventId]: followed.postState.revision,
				[abstention.events[0]!.eventId]: abstention.postState.revision,
			},
			viewer: { kind: "participant", principalId: PATRON.principalId },
			purpose: "chronicle-private",
			atRevision: abstention.postState.revision + 1,
			visibilityContext: {
				policyVersion: VISIBILITY_POLICY_VERSION,
				covenants: [
					{
						patronPrincipalId: PATRON.principalId,
						beneficiaryCitizenId: ACTOR,
						grantRevision: followed.postState.revision,
						revokeRevision: null,
					},
				],
				localOwnerPrincipalId: PATRON.principalId,
				nonproduction: false,
			},
			citizenNames: { [ACTOR]: "Iri" },
			abstentionBoundaries: [
				{
					eventId: "event-abstention-boundary-one",
					relatedEventIds: [abstention.events[0]!.eventId],
					createdRevision: abstention.postState.revision + 1,
					visibility: abstention.events[0]!.visibility,
					fact: {
						schemaVersion: "eonfolk-abstention-boundary-fact-v1",
						citizenId: ACTOR,
						abstentionEventId: abstention.events[0]!.eventId,
						planId: "plan-actor",
						planStepId: "step-actor",
						consequenceKind: "standing-plan-continued-after-patron-abstention",
						routineKind: "social-maintenance",
						routineSubjectId: TARGET,
						simulationTime: 86_400,
						requiredNeedUnits: 4,
						consumedNeedUnits: 3,
						unmetNeedUnits: 1,
					},
				},
			],
		});
		expect(chronicle.storyCard).toContain(
			"NO ADVICE / IRI CHOSE INDEPENDENTLY",
		);
		expect(chronicle.storyCard).toContain(
			"boundary closed without sponsor input",
		);
		expect(chronicle.storyCard).toContain(
			"independently continued the active Standing Plan",
		);
		expect(chronicle.storyCard).toContain(
			"Abstention preceded this outcome but is not recorded as its cause",
		);
		expect(chronicle.storyCard).not.toMatch(/you advised|your counsel/iu);
	});

	it("persists establish -> issue -> resolve and replays without cognition", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const counsel = await issue(followed);
		const interpreted = await resolve(
			counsel,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		expect(interpreted.accepted).toBe(true);
		expect(interpreted.committedDecisionRecord).toMatchObject({
			validator: { stage: "committed", outcome: "accepted" },
			receiptRef: interpreted.receipt.commandId,
			acceptedEventInterval: interpreted.receipt.eventInterval,
		});
		expect(
			interpreted.events.map(({ eventPayload }) => eventPayload.kind),
		).toEqual(["CounselInterpreted"]);
		expect(interpreted.finalStateHash).not.toBe(interpreted.priorStateHash);
		expect(
			interpreted.postState.counsels["intervention-one"]?.resolution,
		).toMatchObject({ action: "verify-reserve" });
		const all = [...followed.events, ...counsel.events, ...interpreted.events];
		const replayed = await replayCivilizationSponsorEvents({
			snapshotState: initial,
			snapshotBoundary: await boundary(initial, await head(), 0),
			headers: [
				followed.batchHeader!,
				counsel.batchHeader!,
				interpreted.batchHeader!,
			],
			events: all,
			expectedFinalWorldHeadHash: interpreted.resultingWorldHeadHash,
		});
		expect(replayed.stateHash).toBe(interpreted.finalStateHash);
		expect(
			interpreted.postState.provenance.every(
				(item) => item.modelDecisionId === null,
			),
		).toBe(true);
	});

	it("rejects a hash-valid counsel event whose known causal parent is semantically wrong", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const counsel = await issue(followed);
		const interpreted = await resolve(
			counsel,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		const original = interpreted.events[0]!;
		const { eventHash: _digest, ...forgedWithoutHash } = {
			...original,
			causalParents: [
				{
					eventId: followed.events[0]!.eventId,
					relation: "contributing" as const,
					mechanismId: "counsel.considered-at-decision-boundary.v1",
				},
			],
		};
		const forged = {
			...forgedWithoutHash,
			eventHash: await eventHash(forgedWithoutHash),
		};
		const originalHeader = interpreted.batchHeader!;
		const forgedHead = await batchHash({
			runId: forged.runId,
			regionId: forged.regionId,
			batchId: forged.batchId,
			priorWorldHeadHash: counsel.resultingWorldHeadHash,
			firstSequence: forged.sequence,
			eventHashes: [forged.eventHash],
			payloadFingerprint: originalHeader.payloadFingerprint,
			resultRevision: originalHeader.resultRevision,
			finalStateHash: forged.postStateHash,
		});
		const forgedHeader = {
			...originalHeader,
			eventHashes: [forged.eventHash],
			batchHash: forgedHead,
		};
		await expect(
			replayCivilizationSponsorEvents({
				snapshotState: counsel.postState,
				snapshotBoundary: await boundary(
					counsel.postState,
					counsel.resultingWorldHeadHash,
					2,
				),
				headers: [forgedHeader],
				events: [forged],
				expectedFinalWorldHeadHash: forgedHead,
			}),
		).rejects.toThrow(/ACTION_UNAVAILABLE/u);
	});

	it("requires a pre-existing canonical Mind and never invents one at counsel", async () => {
		const followed = await establish(fixture(6_000, false));
		const counsel = await issue(followed);
		expect(counsel.accepted).toBe(false);
		expect(counsel.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(counsel.events).toEqual([]);
		expect(counsel.postState).toBe(followed.postState);
		expect(counsel.postState.minds[ACTOR]).toBeUndefined();
	});

	it("offers no evidence action when canonical Mind has no evidence", () => {
		const catalog = civilizationCounselCatalog({
			actorId: ACTOR,
			targetCitizenId: TARGET,
			planId: "plan-standing",
			relationshipId: "relationship-a-b",
			evidenceRecordIds: [],
		});
		expect(catalog.map(({ action }) => action.kind)).toEqual([
			"FollowStandingPlan",
		]);
		expect(JSON.stringify(catalog)).not.toMatch(/ledger|market|recount/u);
	});

	it("projects generic Chronicle facts at their real revisions and honors covenant revocation", async () => {
		const followed = await establish(fixture());
		const issued = await issue(followed);
		const events = [...followed.events, ...issued.events];
		const eventRevisions = {
			[followed.events[0]!.eventId]: followed.postState.revision,
			[issued.events[0]!.eventId]: issued.postState.revision,
		};
		const context = {
			policyVersion: VISIBILITY_POLICY_VERSION,
			covenants: [
				{
					patronPrincipalId: PATRON.principalId,
					beneficiaryCitizenId: ACTOR,
					grantRevision: followed.postState.revision,
					revokeRevision: null,
				},
			],
			localOwnerPrincipalId: PATRON.principalId,
			nonproduction: false,
		} as const;
		const beforeCreation = projectCivilizationChronicle({
			events,
			eventRevisions,
			viewer: { kind: "participant", principalId: PATRON.principalId },
			purpose: "chronicle-private",
			atRevision: 0,
			visibilityContext: context,
			citizenNames: { [ACTOR]: "Iri" },
		});
		expect(beforeCreation.beats).toEqual([]);

		const projection = projectCivilizationChronicle({
			events,
			eventRevisions,
			viewer: { kind: "participant", principalId: PATRON.principalId },
			purpose: "chronicle-private",
			atRevision: issued.postState.revision,
			visibilityContext: context,
			citizenNames: { [ACTOR]: "Iri" },
		});
		expect(projection.beats).toHaveLength(2);
		expect(projection.beats[0]).toMatchObject({
			text: "Iri entered a sponsorship covenant with you.",
			relation: "fact",
			evidenceEventIds: [followed.events[0]!.eventId],
		});
		expect(projection.storyCard).not.toContain(PATRON.principalId);

		const afterRevocation = projectCivilizationChronicle({
			events,
			eventRevisions,
			viewer: { kind: "participant", principalId: PATRON.principalId },
			purpose: "chronicle-private",
			atRevision: issued.postState.revision,
			visibilityContext: {
				...context,
				covenants: [{ ...context.covenants[0]!, revokeRevision: 2 }],
			},
			citizenNames: { [ACTOR]: "Iri" },
		});
		expect(afterRevocation.beats).toHaveLength(1);
		expect(afterRevocation.storyCard).not.toContain("received counsel");
	});

	it("rejects malformed sponsor envelopes and a false final world head", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const issued = await issue(followed);
		const interpreted = await resolve(
			issued,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		for (const [snapshotState, baseHead, nextSequence, transition] of [
			[initial, await head(), 0, followed],
			[followed.postState, followed.resultingWorldHeadHash, 1, issued],
			[issued.postState, issued.resultingWorldHeadHash, 2, interpreted],
		] as const) {
			const source = transition.events[0]!;
			const injectedPayload = {
				...source.eventPayload,
				injected: true,
			} as unknown as typeof source.eventPayload;
			await expect(
				replayCivilizationSponsorEvents({
					snapshotState,
					snapshotBoundary: await boundary(
						snapshotState,
						baseHead,
						nextSequence,
					),
					headers: [transition.batchHeader!],
					events: [
						{
							...source,
							eventPayload: injectedPayload,
						},
					],
					expectedFinalWorldHeadHash: transition.resultingWorldHeadHash,
				}),
			).rejects.toThrow(/invalid sponsor event|hash mismatch/u);
		}
		await expect(
			replayCivilizationSponsorEvents({
				snapshotState: initial,
				snapshotBoundary: await boundary(initial, await head(), 0),
				headers: [followed.batchHeader!],
				events: [{ ...followed.events[0]!, simulationTime: 1 }],
				expectedFinalWorldHeadHash: followed.resultingWorldHeadHash,
			}),
		).rejects.toThrow(/invalid sponsor event|hash mismatch/u);
		await expect(
			replayCivilizationSponsorEvents({
				snapshotState: initial,
				snapshotBoundary: await boundary(initial, await head(), 0),
				headers: [followed.batchHeader!],
				events: followed.events,
				expectedFinalWorldHeadHash: "0".repeat(64),
			}),
		).rejects.toThrow(/final world head/u);
	});

	it("fails closed on legacy commands and an injected counsel intent", async () => {
		const initial = fixture();
		const worldHead = await head();
		const validEstablish = await command(
			"legacy-establish",
			initial.revision,
			PATRON,
			{
				kind: "EstablishSponsorship",
				covenantId: "legacy-covenant",
				citizenId: ACTOR,
			},
		);
		const common = {
			state: initial,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: worldHead,
			nextSequence: 0,
			snapshotBoundary: await boundary(initial, worldHead, 0),
			authoritativeHeaders: [],
			fencingToken: 1,
			authoritativeHistory: [],
		};
		const legacy = await prepareCivilizationSponsorTransition({
			...common,
			command: {
				...validEstablish,
				schemaVersion: "1" as typeof PROTOCOL_SCHEMA_VERSION,
			},
		});
		expect(legacy.receipt.rejectionCode).toBe("INVALID_COMMAND");
		expect(legacy.postState).toBe(initial);

		const malformedPayload = {
			kind: "IssueCounsel" as const,
			interventionId: "injected-intent",
			citizenId: ACTOR,
			intent: "invented" as "verify-reserve",
		};
		const validIssue = await command(
			"injected-intent",
			initial.revision,
			PATRON,
			malformedPayload,
		);
		const malformed = await prepareCivilizationSponsorTransition({
			...common,
			command: validIssue,
		});
		expect(malformed.receipt.rejectionCode).toBe("INVALID_COMMAND");
		expect(malformed.events).toEqual([]);
	});

	it("defensively rejects unknown command bytes and provenance references", async () => {
		const valid = await command("parse-valid", fixture().revision, PATRON, {
			kind: "EstablishSponsorship",
			covenantId: "parse-covenant",
			citizenId: ACTOR,
		});
		expect(parseCivilizationSponsorCommand(null)).toBeNull();
		expect(parseCivilizationSponsorCommand({ payload: null })).toBeNull();
		expect(
			parseCivilizationSponsorCommand({
				...valid,
				provenanceRef: "caller-asserted-authority",
			}),
		).toBeNull();
		expect(parseCivilizationSponsorCommand(valid)).toEqual(valid);
	});

	it("continues exactly from a compacted snapshot", async () => {
		const followed = await establish(
			fixture(0, true, 8_000, ["curiosity", "fairness"], true),
		);
		const snapshot = structuredClone(followed.postState);
		const counsel = await issue(
			{ ...followed, postState: snapshot },
			"accuse-publicly",
		);
		const interpreted = await resolve(
			counsel,
			{ kind: "AccusePublicly", targetCitizenId: TARGET },
			"accuse-publicly",
		);
		const replayed = await replayCivilizationSponsorEvents({
			snapshotState: snapshot,
			snapshotBoundary: await boundary(
				snapshot,
				followed.resultingWorldHeadHash,
				1,
			),
			headers: [counsel.batchHeader!, interpreted.batchHeader!],
			events: [...counsel.events, ...interpreted.events],
			expectedFinalWorldHeadHash: interpreted.resultingWorldHeadHash,
		});
		expect(replayed.stateHash).toBe(interpreted.finalStateHash);
	});

	it("derives accept, reject, delay, and reinterpret outcomes from canonical Mind", async () => {
		for (const [
			trust,
			confidence,
			values,
			intent,
			action,
			commandAction,
			disposition,
			withEvidence,
		] of [
			[
				6_000,
				8_000,
				["care", "candor"],
				"verify-reserve",
				{ kind: "VerifyReserve", targetCitizenId: TARGET },
				"verify-reserve",
				"accepted",
				true,
			],
			[
				0,
				8_000,
				["curiosity", "fairness"],
				"accuse-publicly",
				{ kind: "AccusePublicly", targetCitizenId: TARGET },
				"accuse-publicly",
				"accepted",
				true,
			],
			[
				6_000,
				0,
				["continuity"],
				"accuse-publicly",
				{ kind: "FollowStandingPlan", planId: "plan-standing" },
				"follow-plan",
				"delayed",
				false,
			],
			[
				6_000,
				0,
				["care", "candor"],
				"accuse-publicly",
				{ kind: "FollowStandingPlan", planId: "plan-standing" },
				"follow-plan",
				"rejected",
				false,
			],
			[
				0,
				8_000,
				["curiosity", "fairness", "solidarity"],
				"verify-reserve",
				{ kind: "AccusePublicly", targetCitizenId: TARGET },
				"accuse-publicly",
				"reinterpreted",
				true,
			],
		] as const) {
			const interpreted = await resolve(
				await issue(
					await establish(
						fixture(trust, true, confidence, values, withEvidence),
					),
					intent,
				),
				action,
				commandAction,
			);
			expect(interpreted.accepted).toBe(true);
			expect(interpreted.events).toHaveLength(1);
			expect(interpreted.events[0]!.eventPayload.kind).toBe(
				"CounselInterpreted",
			);
			expect(interpreted.events[0]!.eventPayload).toMatchObject({
				disposition,
			});
			expect(
				interpreted.events.some(({ eventPayload }) =>
					["StatementMade", "BeliefChanged", "RelationshipChanged"].includes(
						eventPayload.kind,
					),
				),
			).toBe(false);
		}
	});

	it("keeps hidden Reality bytes out of visible Standard Brain choices across seeds", async () => {
		const outputs = [];
		for (const suffix of ["alpha", "beta", "gamma"]) {
			const base = fixture();
			const hiddenEventId = `event-hidden-${suffix}`;
			const hidden = evolve(base, {
				citizens: {
					...base.citizens,
					[NONLOCAL]: {
						...base.citizens[NONLOCAL]!,
						sourceEventIds: [hiddenEventId],
					},
				},
				provenance: [
					...base.provenance,
					{
						eventId: hiddenEventId,
						mechanismId: "nonlocal.private-observation.v1",
						causeEventIds: [],
						actorVisibleSourceEventIds: [],
						modelDecisionId: null,
					},
				],
			});
			const interpreted = await resolve(
				await issue(await establish(hidden)),
				{ kind: "VerifyReserve", targetCitizenId: TARGET },
				"verify-reserve",
			);
			outputs.push({
				contextHash: interpreted.committedDecisionRecord!.contextHash,
				actionCatalogHash:
					interpreted.committedDecisionRecord!.actionCatalogHash,
				proposalCanonicalBytes:
					interpreted.committedDecisionRecord!.proposalCanonicalBytes,
				payload: interpreted.events[0]!.eventPayload,
				wholePreStateHash:
					interpreted.committedDecisionRecord!.wholePreStateHash,
			});
		}
		expect(new Set(outputs.map(({ contextHash }) => contextHash)).size).toBe(1);
		expect(
			new Set(outputs.map(({ actionCatalogHash }) => actionCatalogHash)).size,
		).toBe(1);
		expect(
			new Set(
				outputs.map(({ proposalCanonicalBytes }) => proposalCanonicalBytes),
			).size,
		).toBe(1);
		expect(
			new Set(outputs.map(({ payload }) => JSON.stringify(payload))).size,
		).toBe(1);
		expect(
			new Set(outputs.map(({ wholePreStateHash }) => wholePreStateHash)).size,
		).toBe(3);
	});

	it("ignores a caller-rehashed context with a non-authoritative source", async () => {
		const issued = await issue(await establish(fixture()));
		const forgedMind = mind([
			{
				recordId: "record-forged",
				kind: "observation",
				subjectCitizenId: ACTOR,
				proposition: "A private claim has no canonical source.",
				confidence: 8_000,
				sourceIds: ["event-not-authoritative"],
				visibility: { kind: "citizen-private", subjectCitizenId: ACTOR },
				createdRevision: 0,
			},
		]);
		const commandId = "command-forged";
		const forged = await resolution(
			issued.postState,
			"verify-reserve",
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			commandId,
			forgedMind,
		);
		const resolveCommand = await command(
			commandId,
			issued.postState.revision,
			{ kind: "citizen", principalId: ACTOR },
			{
				kind: "ResolveCounsel",
				citizenId: ACTOR,
				interventionId: "intervention-one",
				decisionId: forged.decisionId,
				proposalId: forged.proposal.proposalId,
				action: "verify-reserve",
			},
		);
		const rejected = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				issued.postState,
				issued.resultingWorldHeadHash,
				2,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: resolveCommand,
			authoritativeHistory: [],
			resolution: forged,
		});
		expect(rejected.accepted).toBe(false);
		expect(rejected.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(rejected.events).toEqual([]);
	});

	it("rejects forged typed Mind state at its registration boundary", () => {
		const canonical = mind();
		const variants: readonly CitizenMindSnapshot[] = [
			{
				...canonical,
				records: [
					{
						recordId: "forged",
						kind: "observation",
						subjectCitizenId: ACTOR,
						proposition: "Unsupported",
						confidence: 10_000,
						sourceIds: ["missing-event"],
						visibility: {
							kind: "citizen-private",
							subjectCitizenId: ACTOR,
						},
						createdRevision: 0,
					},
				],
			},
			{
				...canonical,
				relationships: [{ ...canonical.relationships[0]!, trust: 6_001 }],
			},
			{
				...canonical,
				values: [{ ...canonical.values[0]!, weight: -1 }, canonical.values[1]!],
			},
			{
				...canonical,
				standingPlan: { ...canonical.standingPlan, status: "completed" },
			},
		];
		for (const snapshot of variants) {
			const state = fixture(6_000, false);
			expect(() =>
				registerCivilizationMind(state, {
					schemaVersion: "eonfolk-civilization-mind-v1",
					citizenId: ACTOR,
					snapshot,
					committedAtRevision: state.revision,
					committedAtSimulationTime: state.simulationTime,
				}),
			).toThrow();
		}
	});

	it("fails closed for authority and a rehashed injected action catalog", async () => {
		const followed = await establish(fixture());
		const wrongPatron = await prepareCivilizationSponsorTransition({
			state: followed.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: followed.resultingWorldHeadHash,
			nextSequence: 1,
			snapshotBoundary: await boundary(
				followed.postState,
				followed.resultingWorldHeadHash,
				1,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command(
				"wrong-patron",
				followed.postState.revision,
				{
					kind: "patron",
					principalId: "other",
					beneficiaryCitizenId: ACTOR,
				},
				{
					kind: "IssueCounsel",
					interventionId: "wrong",
					citizenId: ACTOR,
					intent: "verify-reserve",
				},
			),
			authoritativeHistory: [],
		});
		expect(wrongPatron.receipt.rejectionCode).toBe("INVALID_PRINCIPAL");
		const issued = await issue(followed);
		const commandId = "command-injected-catalog";
		const forged = await resolution(
			issued.postState,
			"verify-reserve",
			{ kind: "VerifyReserve", targetCitizenId: NONLOCAL },
			commandId,
			structuredClone(issued.postState.minds[ACTOR]!.snapshot),
		);
		const unavailable = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				issued.postState,
				issued.resultingWorldHeadHash,
				2,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command(
				commandId,
				issued.postState.revision,
				{ kind: "citizen", principalId: ACTOR },
				{
					kind: "ResolveCounsel",
					citizenId: ACTOR,
					interventionId: "intervention-one",
					decisionId: forged.decisionId,
					proposalId: forged.proposal.proposalId,
					action: "verify-reserve",
				},
			),
			authoritativeHistory: [],
			resolution: forged,
		});
		expect(unavailable.accepted).toBe(false);
		expect(unavailable.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(unavailable.events).toEqual([]);
	});

	it("rejects a rehashed legal but unselected Standard Brain action", async () => {
		const issued = await issue(await establish(fixture()));
		const commandId = "command-forged-legal-alternative";
		const legitimate = await resolution(
			issued.postState,
			"verify-reserve",
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			commandId,
		);
		const alternative = legitimate.context.actionCatalog.find(
			({ action }) => action.kind === "FollowStandingPlan",
		);
		if (alternative === undefined) throw new Error("missing legal alternative");
		const { proposalHash: _legitimateHash, ...legitimateWithoutHash } =
			legitimate.proposal;
		const forgedWithoutHash = {
			...legitimateWithoutHash,
			actionId: alternative.actionId,
			action: alternative.action,
			explanation: {
				...legitimate.proposal.explanation,
				selectedActionId: alternative.actionId,
			},
		};
		const forgedProposal = {
			...forgedWithoutHash,
			proposalHash: await proposalHash(forgedWithoutHash),
		};
		// The generic closed-schema gate accepts this rehashed legal alternative;
		// sponsor authority must additionally reproduce the Standard Brain choice.
		expect(
			await validateIntentProposal(legitimate.context, forgedProposal),
		).toBe("accepted");
		const forgedResolution = {
			...legitimate,
			proposal: forgedProposal,
			decisionRecord: await createCognitiveDecisionRecord({
				decisionId: legitimate.decisionId,
				decisionBoundaryId: `boundary-${commandId}`,
				wholePreStateHash: await stateHash(issued.postState),
				context: legitimate.context,
				proposal: forgedProposal,
				failureCode: null,
				validator: {
					stage: "authorization",
					outcome: "accepted",
					reason: "forged",
				},
				proposedCommandId: commandId,
				receiptRef: null,
				acceptedEventInterval: null,
			}),
		};
		const rejected = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				issued.postState,
				issued.resultingWorldHeadHash,
				2,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command(
				commandId,
				issued.postState.revision,
				{ kind: "citizen", principalId: ACTOR },
				{
					kind: "ResolveCounsel",
					citizenId: ACTOR,
					interventionId: "intervention-one",
					decisionId: legitimate.decisionId,
					proposalId: forgedProposal.proposalId,
					action: "follow-plan",
				},
			),
			authoritativeHistory: [],
			resolution: forgedResolution,
		});

		expect(rejected.accepted).toBe(false);
		expect(rejected.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(rejected.events).toEqual([]);
	});

	it("returns the original receipt on a delayed exact retry", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const issued = await issue(followed);
		const retried = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				issued.postState,
				issued.resultingWorldHeadHash,
				2,
			),
			authoritativeHeaders: [],
			fencingToken: 1,
			command: await command("command-establish", initial.revision, PATRON, {
				kind: "EstablishSponsorship",
				covenantId: "covenant-one",
				citizenId: ACTOR,
			}),
			authoritativeHistory: [],
		});
		expect(retried.duplicate).toBe(false);
		expect(retried.receipt.rejectionCode).toBe("STALE_REVISION");
		expect(retried.resultingWorldHeadHash).toBe(issued.resultingWorldHeadHash);
	});

	it("rejects broken history continuity atomically", async () => {
		const followed = await establish(fixture());
		const issued = await issue(followed);
		const result = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			nextSequence: 2,
			snapshotBoundary: await boundary(
				followed.postState,
				followed.resultingWorldHeadHash,
				1,
			),
			authoritativeHeaders: [issued.batchHeader!],
			fencingToken: 1,
			command: await command("new-counsel", issued.postState.revision, PATRON, {
				kind: "IssueCounsel",
				interventionId: "two",
				citizenId: ACTOR,
				intent: "verify-reserve",
			}),
			authoritativeHistory: [
				{ ...issued.events[0]!, engineVersion: "wrong" as "1" },
			],
		});
		expect(result.receipt.rejectionCode).toBe("INVALID_COMMAND");
		expect(result.postState).toBe(issued.postState);
	});
});
