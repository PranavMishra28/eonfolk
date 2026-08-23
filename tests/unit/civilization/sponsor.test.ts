import { describe, expect, it } from "vitest";
import {
	CIVILIZATION_SOCIAL_SCHEMA_VERSION,
	type CivilizationState,
	createCivilizationState,
	prepareCivilizationSponsorTransition,
	registerCitizen,
	registerRelationship,
	replayCivilizationSponsorEvents,
} from "../../../packages/civilization/src/index.js";
import {
	buildDecisionContext,
	riverholdCounselCatalog,
	standardBrain,
} from "../../../packages/cognition/src/index.js";
import {
	COGNITION_VERSION,
	type CognitionAction,
	type CommandReceipt,
	type DecisionContext,
	proposalHash as deriveProposalHash,
	type IntentProposal,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	seedPrng,
	stateHash,
	VISIBILITY_POLICY_VERSION,
	type WorldCommand,
	type WorldCommandPayload,
} from "../../../packages/protocol/src/index.js";

const RUN_ID = "run-sponsor";
const REGION_ID = "region-sponsor";
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

function stateWithPeople(withRelationship = true): CivilizationState {
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
	if (withRelationship)
		state = registerRelationship(state, {
			schemaVersion: CIVILIZATION_SOCIAL_SCHEMA_VERSION,
			relationshipId: "relationship-a-b",
			fromCitizenId: ACTOR,
			toCitizenId: TARGET,
			kind: "colleague",
			familiarityBasisPoints: 6_000,
			trustBasisPoints: 6_000,
			strainBasisPoints: 1_000,
			lastInteractionSimulationTime: 0,
			sourceEventIds: [],
		});
	return state;
}

async function command<
	P extends Extract<
		WorldCommandPayload,
		{ kind: "IssueCounsel" | "ResolveCounsel" }
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
		runId: RUN_ID,
		regionId: REGION_ID,
		payload,
	};
}

async function initialHead(): Promise<string> {
	return stateHash({ runId: RUN_ID, regionId: REGION_ID, genesis: true });
}

async function issueCounsel(
	state: CivilizationState,
	intent: "verify-reserve" | "accuse-publicly" = "verify-reserve",
) {
	const issuedCommand = await command("command-issue", state.revision, PATRON, {
		kind: "IssueCounsel" as const,
		interventionId: "intervention-one",
		citizenId: ACTOR,
		intent,
	});
	return prepareCivilizationSponsorTransition({
		state,
		runId: RUN_ID,
		regionId: REGION_ID,
		priorWorldHeadHash: await initialHead(),
		fencingToken: 1,
		command: issuedCommand,
		authoritativeHistory: [],
	});
}

function standingPlan() {
	return {
		planId: "plan-standing",
		version: 1,
		citizenId: ACTOR,
		goalType: "preserve-settlement-trust",
		targetIds: [TARGET],
		steps: [
			{
				stepId: "plan-step-one",
				kind: "Inspect",
				targetIds: [TARGET],
				status: "active" as const,
				children: [],
			},
		],
		currentStepId: "plan-step-one",
		commitmentId: null,
		sourceId: "source-plan",
		startBoundary: 0,
		expiryBoundary: 10,
		retriesRemaining: 1,
		replansRemaining: 1,
		status: "active" as const,
	};
}

async function standardResolution(
	state: CivilizationState,
	action: CognitionAction,
	counselIntent: "verify-reserve" | "accuse-publicly",
): Promise<{
	readonly decisionId: string;
	readonly context: DecisionContext;
	readonly proposal: IntentProposal;
}> {
	const selected = riverholdCounselCatalog({
		actorId: ACTOR,
		targetCitizenId:
			action.kind === "VerifyReserve" || action.kind === "AccusePublicly"
				? action.targetCitizenId
				: TARGET,
		planId: standingPlan().planId,
		relationshipId: "relationship-a-b",
		evidenceRecordIds: ["record-visible-reserve"],
	}).find((entry) => entry.action.kind === action.kind)!;
	const context = await buildDecisionContext({
		contextId: `context-${action.kind.toLowerCase()}`,
		actorMind: {
			citizenId: ACTOR,
			values: [{ valueId: "care", rank: 1, weight: 700 }],
			relationships: [
				{
					relationshipId: "relationship-a-b",
					fromCitizenId: ACTOR,
					toCitizenId: TARGET,
					familiarity: 6_000,
					trust: 6_000,
					strain: 1_000,
					lastMaterialEventId: null,
					visibility: { kind: "citizen-private", subjectCitizenId: ACTOR },
					createdRevision: 0,
				},
			],
			records: [
				{
					recordId: "record-visible-reserve",
					kind: "observation",
					subjectCitizenId: ACTOR,
					proposition: "The public reserve ledger and visible count differ.",
					confidence: 7_000,
					sourceIds: ["event-visible-count"],
					visibility: { kind: "citizen-private", subjectCitizenId: ACTOR },
					createdRevision: 0,
				},
			],
			standingPlan: standingPlan(),
		},
		runId: RUN_ID,
		regionId: REGION_ID,
		revision: state.revision,
		simulationTime: state.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: [selected],
		visibilityContext: {
			policyVersion: VISIBILITY_POLICY_VERSION,
			covenants: [],
			localOwnerPrincipalId: "local-owner",
			nonproduction: false,
		},
		counselIntent,
	});
	const chosen = await standardBrain(context, {
		proposalId: `proposal-${action.kind.toLowerCase()}`,
		prngState: await seedPrng(
			new Uint8Array(32).fill(7),
			"sponsor-test",
			ACTOR,
			action.kind,
		),
	});
	expect(chosen.proposal.action).toEqual(action);
	expect(chosen.proposal.provenance).toEqual({
		cognitionKind: "standard-brain",
		cognitionVersion: COGNITION_VERSION,
	});
	return {
		decisionId: `decision-${action.kind.toLowerCase()}`,
		context,
		proposal: chosen.proposal,
	};
}

async function resolveCounsel(
	issued: Awaited<ReturnType<typeof issueCounsel>>,
	action: CognitionAction,
	commandAction: "verify-reserve" | "accuse-publicly" | "follow-plan",
	priorReceipts: readonly CommandReceipt[] = [issued.receipt],
) {
	const counselEvent = issued.events.find(
		({ eventPayload }) => eventPayload.kind === "CounselIssued",
	);
	if (counselEvent?.eventPayload.kind !== "CounselIssued")
		throw new Error("test fixture did not issue counsel");
	const resolution = await standardResolution(
		issued.postState,
		action,
		counselEvent.eventPayload.intent,
	);
	const resolveCommand = await command(
		`command-resolve-${commandAction}`,
		issued.postState.revision,
		{ kind: "citizen", principalId: ACTOR },
		{
			kind: "ResolveCounsel" as const,
			citizenId: ACTOR,
			interventionId: "intervention-one",
			decisionId: resolution.decisionId,
			proposalId: resolution.proposal.proposalId,
			action: commandAction,
		},
	);
	return prepareCivilizationSponsorTransition({
		state: issued.postState,
		runId: RUN_ID,
		regionId: REGION_ID,
		priorWorldHeadHash: issued.resultingWorldHeadHash,
		fencingToken: 1,
		command: resolveCommand,
		authoritativeHistory: issued.events,
		priorReceipts,
		resolution,
	});
}

describe("canonical civilization sponsor reducer", () => {
	it("establishes sponsorship and counsel as one atomic command with truthful hashes", async () => {
		const before = stateWithPeople();
		const result = await issueCounsel(before);
		expect(result.accepted).toBe(true);
		expect(result.events.map(({ eventPayload }) => eventPayload.kind)).toEqual([
			"SponsorshipEstablished",
			"CounselIssued",
		]);
		expect(result.postState).not.toBe(before);
		expect(result.postState.revision).toBe(before.revision + 1);
		expect(result.finalStateHash).not.toBe(result.priorStateHash);
		expect(await stateHash(result.postState)).toBe(result.finalStateHash);
		expect(result.events[0]?.preStateHash).toBe(result.priorStateHash);
		expect(result.events.at(-1)?.postStateHash).toBe(result.finalStateHash);
		expect(result.events[1]?.causalParents).toEqual([
			{
				eventId: result.events[0]?.eventId,
				relation: "direct",
				mechanismId: "sponsor.covenant.authorizes-counsel.v1",
			},
		]);
		expect(result.receipt.eventInterval?.eventIds).toEqual(
			result.events.map(({ eventId }) => eventId),
		);
	});

	it("rejects invalid authority and stale commands atomically", async () => {
		const state = stateWithPeople();
		const badPrincipalCommand = await command(
			"command-bad-principal",
			state.revision,
			{
				kind: "patron",
				principalId: "patron-wrong",
				beneficiaryCitizenId: TARGET,
			},
			{
				kind: "IssueCounsel" as const,
				interventionId: "intervention-bad",
				citizenId: ACTOR,
				intent: "verify-reserve" as const,
			},
		);
		const rejected = await prepareCivilizationSponsorTransition({
			state,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: await initialHead(),
			fencingToken: 1,
			command: badPrincipalCommand,
			authoritativeHistory: [],
		});
		expect(rejected.receipt.rejectionCode).toBe("INVALID_PRINCIPAL");
		expect(rejected.postState).toBe(state);
		expect(rejected.events).toEqual([]);

		const stale = await prepareCivilizationSponsorTransition({
			state,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: await initialHead(),
			fencingToken: 1,
			command: {
				...badPrincipalCommand,
				principal: PATRON,
				expectedRevision: 0,
			},
			authoritativeHistory: [],
		});
		expect(stale.receipt.rejectionCode).toBe("STALE_REVISION");
		expect(stale.postState).toBe(state);

		const wrongRegion = await prepareCivilizationSponsorTransition({
			state,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: await initialHead(),
			fencingToken: 1,
			command: {
				...badPrincipalCommand,
				principal: PATRON,
				regionId: "region-other",
			},
			authoritativeHistory: [],
		});
		expect(wrongRegion.receipt.rejectionCode).toBe("RUN_REGION_MISMATCH");
		expect(wrongRegion.postState).toBe(state);
	});

	it("returns the original receipt on an exact idempotent retry", async () => {
		const initial = stateWithPeople();
		const first = await issueCounsel(initial);
		const retryCommand = await command(
			"command-issue",
			initial.revision,
			PATRON,
			{
				kind: "IssueCounsel" as const,
				interventionId: "intervention-one",
				citizenId: ACTOR,
				intent: "verify-reserve" as const,
			},
		);
		const duplicate = await prepareCivilizationSponsorTransition({
			state: first.postState,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: first.resultingWorldHeadHash,
			fencingToken: 1,
			command: retryCommand,
			authoritativeHistory: first.events,
			priorReceipts: [first.receipt],
		});
		expect(duplicate.accepted).toBe(true);
		expect(duplicate.duplicate).toBe(true);
		expect(duplicate.events).toEqual([]);
		expect(duplicate.postState).toBe(first.postState);
		expect(duplicate.receipt).toBe(first.receipt);
	});

	it("accepts verify, accuse, and follow-plan terminal vectors without a model", async () => {
		const verifyIssued = await issueCounsel(stateWithPeople());
		const verified = await resolveCounsel(
			verifyIssued,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		expect(verified.accepted).toBe(true);
		expect(
			verified.events.map(({ eventPayload }) => eventPayload.kind),
		).toEqual(["CounselInterpreted", "BeliefChanged", "RelationshipChanged"]);

		const accuseIssued = await issueCounsel(
			stateWithPeople(),
			"accuse-publicly",
		);
		const accused = await resolveCounsel(
			accuseIssued,
			{ kind: "AccusePublicly", targetCitizenId: TARGET },
			"accuse-publicly",
		);
		expect(accused.accepted).toBe(true);
		expect(accused.events.map(({ eventPayload }) => eventPayload.kind)).toEqual(
			["CounselInterpreted", "StatementMade", "RelationshipChanged"],
		);

		const followIssued = await issueCounsel(stateWithPeople());
		const followed = await resolveCounsel(
			followIssued,
			{ kind: "FollowStandingPlan", planId: "plan-standing" },
			"follow-plan",
		);
		expect(followed.accepted).toBe(true);
		expect(followed.events).toHaveLength(1);
		expect(followed.events[0]?.eventPayload).toMatchObject({
			kind: "CounselInterpreted",
			action: "follow-plan",
			disposition: "rejected",
		});
		for (const result of [verified, accused, followed]) {
			expect(
				result.postState.provenance.every(
					(provenance) => provenance.modelDecisionId === null,
				),
			).toBe(true);
		}
	});

	it("fails closed for non-local or canonically unavailable actions", async () => {
		const issued = await issueCounsel(stateWithPeople());
		const nonlocal = await resolveCounsel(
			issued,
			{ kind: "VerifyReserve", targetCitizenId: NONLOCAL },
			"verify-reserve",
		);
		expect(nonlocal.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(nonlocal.postState).toBe(issued.postState);

		const noRelationshipIssued = await issueCounsel(
			stateWithPeople(false),
			"accuse-publicly",
		);
		const unavailable = await resolveCounsel(
			noRelationshipIssued,
			{ kind: "AccusePublicly", targetCitizenId: TARGET },
			"accuse-publicly",
		);
		expect(unavailable.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(unavailable.events).toEqual([]);
	});

	it("rejects a proposal that claims to read a hidden record", async () => {
		const issued = await issueCounsel(stateWithPeople());
		const resolution = await standardResolution(
			issued.postState,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		const { proposalHash: _priorHash, ...proposalWithoutHash } = {
			...resolution.proposal,
			explanation: {
				...resolution.proposal.explanation,
				visibleRecordIdsRead: ["record-hidden-from-actor"],
			},
		};
		const hiddenProposal: IntentProposal = {
			...proposalWithoutHash,
			proposalHash: await deriveProposalHash(proposalWithoutHash),
		};
		const resolveCommand = await command(
			"command-hidden-record",
			issued.postState.revision,
			{ kind: "citizen", principalId: ACTOR },
			{
				kind: "ResolveCounsel" as const,
				citizenId: ACTOR,
				interventionId: "intervention-one",
				decisionId: resolution.decisionId,
				proposalId: hiddenProposal.proposalId,
				action: "verify-reserve" as const,
			},
		);
		const rejected = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			fencingToken: 1,
			command: resolveCommand,
			authoritativeHistory: issued.events,
			resolution: { ...resolution, proposal: hiddenProposal },
		});
		expect(rejected.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(rejected.postState).toBe(issued.postState);
	});

	it("keeps an accusation typed as an allegation rather than a world fact", async () => {
		const issued = await issueCounsel(stateWithPeople(), "accuse-publicly");
		const result = await resolveCounsel(
			issued,
			{ kind: "AccusePublicly", targetCitizenId: TARGET },
			"accuse-publicly",
		);
		const statement = result.events.find(
			(event) => event.eventPayload.kind === "StatementMade",
		);
		expect(statement?.eventPayload).toMatchObject({
			kind: "StatementMade",
			allegation: true,
		});
		expect(
			result.events.some(
				(event) => event.eventPayload.kind === "BeliefChanged",
			),
		).toBe(false);
		expect(result.postState.citizens[TARGET]?.sourceEventIds).toEqual([]);
	});

	it("replays accepted sponsor events without cognition and preserves causal hashes", async () => {
		const initial = stateWithPeople();
		const issued = await issueCounsel(initial);
		const resolved = await resolveCounsel(
			issued,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		const allEvents = [...issued.events, ...resolved.events];
		const replayed = await replayCivilizationSponsorEvents({
			snapshotState: initial,
			snapshotStateHash: await stateHash(initial),
			runId: RUN_ID,
			regionId: REGION_ID,
			events: allEvents,
		});
		expect(replayed.stateHash).toBe(resolved.finalStateHash);
		expect(await stateHash(replayed.state)).toBe(
			await stateHash(resolved.postState),
		);
		await expect(
			replayCivilizationSponsorEvents({
				snapshotState: initial,
				snapshotStateHash: await stateHash(initial),
				runId: RUN_ID,
				regionId: REGION_ID,
				events: [
					{ ...allEvents[0]!, eventHash: "0".repeat(64) },
					...allEvents.slice(1),
				],
			}),
		).rejects.toThrow(/event hash mismatch/u);
		for (const event of resolved.events) {
			expect(
				event.causalParents.every(({ mechanismId }) => mechanismId.length > 0),
			).toBe(true);
			expect(event.preStateHash).not.toBe(event.postStateHash);
		}
	});

	it("rejects a model-origin proposal even when its action shape is known", async () => {
		const issued = await issueCounsel(stateWithPeople());
		const resolution = await standardResolution(
			issued.postState,
			{ kind: "VerifyReserve", targetCitizenId: TARGET },
			"verify-reserve",
		);
		const modelProposal = {
			...resolution.proposal,
			provenance: {
				cognitionKind: "model" as const,
				cognitionVersion: COGNITION_VERSION,
				provider: "provider",
				model: "model",
				modelVersion: "version",
				promptTemplateHash: "0".repeat(64),
				proposalSchemaHash: "1".repeat(64),
				artifactHash: "2".repeat(64),
			},
		};
		const resolveCommand = await command(
			"command-model",
			issued.postState.revision,
			{ kind: "citizen", principalId: ACTOR },
			{
				kind: "ResolveCounsel" as const,
				citizenId: ACTOR,
				interventionId: "intervention-one",
				decisionId: resolution.decisionId,
				proposalId: resolution.proposal.proposalId,
				action: "verify-reserve" as const,
			},
		);
		const rejected = await prepareCivilizationSponsorTransition({
			state: issued.postState,
			runId: RUN_ID,
			regionId: REGION_ID,
			priorWorldHeadHash: issued.resultingWorldHeadHash,
			fencingToken: 1,
			command: resolveCommand,
			authoritativeHistory: issued.events,
			resolution: { ...resolution, proposal: modelProposal },
		});
		expect(rejected.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(rejected.postState).toBe(issued.postState);
	});
});
