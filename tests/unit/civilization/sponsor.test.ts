import { describe, expect, it } from "vitest";
import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	type CivilizationState,
	createCivilizationState,
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
	type CommandReceipt,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	seedPrng,
	stateHash,
	VISIBILITY_POLICY_VERSION,
	type WorldCommand,
	type WorldCommandPayload,
} from "../../../packages/protocol/src/index.js";

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
	records: CitizenMindSnapshot["records"] = [],
	trust = 6_000,
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
		records,
		standingPlan: plan(),
	};
}

function fixture(trust = 6_000, withMind = true): CivilizationState {
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
	if (!withMind) return state;
	return registerCivilizationMind(state, {
		schemaVersion: "eonfolk-civilization-mind-v1",
		citizenId: ACTOR,
		snapshot: mind([], trust),
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

async function establish(state: CivilizationState, nextSequence = 0) {
	return prepareCivilizationSponsorTransition({
		state,
		runId: RUN,
		regionId: REGION,
		priorWorldHeadHash: await head(),
		nextSequence,
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
		priorReceipts: [established.receipt],
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
		evidenceRecordIds: [],
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
		const counselOnly = await prepareCivilizationSponsorTransition({
			state,
			runId: RUN,
			regionId: REGION,
			priorWorldHeadHash: await head(),
			nextSequence: 0,
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
			snapshotStateHash: await stateHash(initial),
			runId: RUN,
			regionId: REGION,
			nextSequence: 0,
			events: all,
		});
		expect(replayed.stateHash).toBe(interpreted.finalStateHash);
		expect(
			interpreted.postState.provenance.every(
				(item) => item.modelDecisionId === null,
			),
		).toBe(true);
	});

	it("continues exactly from a compacted snapshot", async () => {
		const followed = await establish(fixture());
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
			snapshotStateHash: await stateHash(snapshot),
			runId: RUN,
			regionId: REGION,
			nextSequence: 1,
			events: [...counsel.events, ...interpreted.events],
		});
		expect(replayed.stateHash).toBe(interpreted.finalStateHash);
	});

	it("accepts three terminal interpretations but fabricates no consequence", async () => {
		for (const [trust, intent, action, commandAction] of [
			[
				6_000,
				"verify-reserve",
				{ kind: "VerifyReserve", targetCitizenId: TARGET },
				"verify-reserve",
			],
			[
				0,
				"accuse-publicly",
				{ kind: "AccusePublicly", targetCitizenId: TARGET },
				"accuse-publicly",
			],
			[
				6_000,
				"accuse-publicly",
				{ kind: "FollowStandingPlan", planId: "plan-standing" },
				"follow-plan",
			],
		] as const) {
			const interpreted = await resolve(
				await issue(await establish(fixture(trust)), intent),
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
			fencingToken: 1,
			command: await command("command-establish", initial.revision, PATRON, {
				kind: "EstablishSponsorship",
				covenantId: "covenant-one",
				citizenId: ACTOR,
			}),
			authoritativeHistory: [],
			priorReceipts: [
				followed.receipt,
				issued.receipt,
			] satisfies readonly CommandReceipt[],
		});
		expect(retried.duplicate).toBe(true);
		expect(retried.receipt).toBe(followed.receipt);
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
