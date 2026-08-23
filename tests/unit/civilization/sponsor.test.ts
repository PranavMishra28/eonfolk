import { describe, expect, it } from "vitest";
import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	type CivilizationState,
	createCivilizationSponsorSnapshotBoundary,
	createCivilizationState,
	evolve,
	prepareCivilizationSponsorTransition,
	registerCitizen,
	registerCivilizationMind,
	registerRelationship,
	replayCivilizationSponsorEvents,
} from "../../../packages/civilization/src/index.js";
import {
	buildDecisionContext,
	civilizationCounselCatalog,
	createCognitiveDecisionRecord,
	standardBrain,
} from "../../../packages/cognition/src/index.js";
import {
	type CitizenMindSnapshot,
	type CognitionAction,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	seedPrng,
	stateHash,
	VISIBILITY_POLICY_VERSION,
	type WorldCommand,
	type WorldCommandPayload,
} from "../../../packages/protocol/src/index.js";
import { projectChronicle } from "../../../packages/sim/src/index.js";

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

function person(citizenId: string, settlementId: string, siteId: string) {
	return {
		schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
		citizenId,
		name: `Person ${citizenId}`,
		valueIds: ["care", "candor"],
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
): CitizenMindSnapshot {
	return {
		citizenId: ACTOR,
		values: [
			{ valueId: "care", rank: 1, weight: 700 },
			{ valueId: "candor", rank: 2, weight: 500 },
		],
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
): CivilizationState {
	let state = createCivilizationState({
		citizenIds: [ACTOR, TARGET, NONLOCAL],
		settlementIds: [SETTLEMENT_A, SETTLEMENT_B],
		territoryIds: ["territory-a", "territory-b"],
		siteIds: [SITE_A, SITE_B],
		buildingKindsBySite: { [SITE_A]: [], [SITE_B]: [] },
		capabilitiesByCitizen: { [ACTOR]: {}, [TARGET]: {}, [NONLOCAL]: {} },
	});
	state = registerCitizen(state, person(ACTOR, SETTLEMENT_A, SITE_A));
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
		snapshot: mind(undefined, trust, evidenceConfidence),
		committedAtRevision: state.revision,
		committedAtSimulationTime: state.simulationTime,
	});
}

async function command<
	P extends Extract<
		WorldCommandPayload,
		{
			kind: "EstablishSponsorship" | "IssueCounsel" | "ResolveCounsel";
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
	intent: "verify-reserve" | "accuse-publicly",
	action: CognitionAction,
	commandId: string,
	actorMind = state.minds[ACTOR]!.snapshot,
) {
	const catalog = civilizationCounselCatalog({
		actorId: ACTOR,
		targetCitizenId:
			action.kind === "VerifyReserve" || action.kind === "AccusePublicly"
				? action.targetCitizenId
				: TARGET,
		planId: plan().planId,
		relationshipId: "relationship-a-b",
		evidenceRecordIds: actorMind.records.map(({ recordId }) => recordId),
	});
	const context = await buildDecisionContext({
		contextId: `context-${commandId}`,
		actorMind,
		runId: RUN,
		regionId: REGION,
		revision: state.revision,
		simulationTime: state.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: catalog,
		visibilityContext: {
			policyVersion: VISIBILITY_POLICY_VERSION,
			covenants: [
				{
					patronPrincipalId: PATRON.principalId,
					beneficiaryCitizenId: ACTOR,
					grantRevision:
						state.sponsorships["covenant-one"]!.establishedAtRevision,
					revokeRevision: null,
				},
			],
			localOwnerPrincipalId: PATRON.principalId,
			nonproduction: false,
		},
		counselIntent: intent,
	});
	const chosen = await standardBrain(context, {
		proposalId: `proposal-${commandId}`,
		prngState: await seedPrng(
			new Uint8Array(32).fill(7),
			"sponsor",
			ACTOR,
			commandId,
		),
	});
	expect(chosen.proposal.action).toEqual(action);
	const decisionId = `decision-${commandId}`;
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

	it("projects sponsorship as a visibility-filtered factual Chronicle sentence", async () => {
		const followed = await establish(fixture());
		const projection = projectChronicle({
			events: followed.events,
			viewer: { kind: "public" },
			purpose: "chronicle-public",
			atRevision: followed.postState.revision,
			visibilityContext: {
				policyVersion: VISIBILITY_POLICY_VERSION,
				covenants: [],
				localOwnerPrincipalId: PATRON.principalId,
				nonproduction: false,
			},
			citizenNames: { [ACTOR]: "Mara" },
		});
		expect(projection.sentences[0]).toMatchObject({
			text: "Mara entered a sponsorship covenant.",
			relation: "fact",
			evidenceEventIds: [followed.events[0]!.eventId],
		});
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
			).rejects.toThrow(/invalid sponsor event chain/u);
		}
		await expect(
			replayCivilizationSponsorEvents({
				snapshotState: initial,
				snapshotBoundary: await boundary(initial, await head(), 0),
				headers: [followed.batchHeader!],
				events: [{ ...followed.events[0]!, simulationTime: 1 }],
				expectedFinalWorldHeadHash: followed.resultingWorldHeadHash,
			}),
		).rejects.toThrow(/invalid sponsor event chain/u);
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

	it("continues exactly from a compacted snapshot", async () => {
		const followed = await establish(fixture(6_000, true, 0));
		const snapshot = structuredClone(followed.postState);
		const counsel = await issue(
			{ ...followed, postState: snapshot },
			"accuse-publicly",
		);
		const interpreted = await resolve(
			counsel,
			{ kind: "FollowStandingPlan", planId: "plan-standing" },
			"follow-plan",
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

	it("accepts three terminal interpretations but fabricates no consequence", async () => {
		for (const [trust, confidence, intent, action, commandAction] of [
			[
				6_000,
				8_000,
				"verify-reserve",
				{ kind: "VerifyReserve", targetCitizenId: TARGET },
				"verify-reserve",
			],
			[
				0,
				8_000,
				"accuse-publicly",
				{ kind: "AccusePublicly", targetCitizenId: TARGET },
				"accuse-publicly",
			],
			[
				6_000,
				0,
				"accuse-publicly",
				{ kind: "FollowStandingPlan", planId: "plan-standing" },
				"follow-plan",
			],
		] as const) {
			const interpreted = await resolve(
				await issue(await establish(fixture(trust, true, confidence)), intent),
				action,
				commandAction,
			);
			expect(interpreted.accepted).toBe(true);
			expect(interpreted.events).toHaveLength(1);
			expect(interpreted.events[0]!.eventPayload.kind).toBe(
				"CounselInterpreted",
			);
			expect(
				interpreted.events.some(({ eventPayload }) =>
					["StatementMade", "BeliefChanged", "RelationshipChanged"].includes(
						eventPayload.kind,
					),
				),
			).toBe(false);
		}
	});

	it("rejects a perfectly rehashed context with a non-authoritative source", async () => {
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
		expect(rejected.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(rejected.postState).toBe(issued.postState);
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
		const unavailable = await resolve(
			issued,
			{ kind: "VerifyReserve", targetCitizenId: NONLOCAL },
			"verify-reserve",
		);
		expect(unavailable.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(unavailable.events).toEqual([]);
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
			priorCommitments: [
				{
					receipt: followed.receipt,
					batchHeader: followed.batchHeader!,
					events: followed.events,
				},
			],
		});
		expect(retried.duplicate).toBe(true);
		expect(retried.receipt).toBe(followed.receipt);
		expect(retried.resultingWorldHeadHash).toBe(issued.resultingWorldHeadHash);
	});

	it("rejects a fabricated duplicate receipt without a durable commitment", async () => {
		const initial = fixture();
		const followed = await establish(initial);
		const result = await prepareCivilizationSponsorTransition({
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
			command: await command("command-establish", initial.revision, PATRON, {
				kind: "EstablishSponsorship",
				covenantId: "covenant-one",
				citizenId: ACTOR,
			}),
			authoritativeHistory: [],
			priorCommitments: [
				{
					receipt: { ...followed.receipt, eventInterval: null },
					batchHeader: followed.batchHeader!,
					events: followed.events,
				},
			],
		});
		expect(result.receipt.rejectionCode).toBe("INVALID_COMMAND");
		expect(result.duplicate).toBe(false);
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
