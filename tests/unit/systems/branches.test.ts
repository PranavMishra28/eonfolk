import { describe, expect, it } from "vitest";
import { standardBrain } from "../../../packages/cognition/src/index.js";
import {
	batchHash,
	DETERMINISM_VERSION,
	ENGINE_VERSION,
	eventHash,
	jcs,
	PROTOCOL_SCHEMA_VERSION,
	REPLAY_VERSION,
	seedPrng,
	type WorldEventEnvelope,
} from "../../../packages/protocol/src/index.js";
import {
	citizenBySlug,
	createWorldCommand,
	prepareTransition,
	projectChronicle,
	replayLedger,
} from "../../../packages/sim/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

async function branch(
	intent: "verify-reserve" | "accuse-publicly" | null,
	forcedLegalAction?: "verify-reserve" | "accuse-publicly" | "follow-plan",
) {
	const fixture = await riverholdDecisionFixture({ counselIntent: intent });
	let state = fixture.genesis.state;
	let head = fixture.genesis.genesisWorldHeadHash;
	const mara = citizenBySlug(state, "mara");
	const events: WorldEventEnvelope[] = [];
	let interventionId: string | null = null;
	if (intent !== null) {
		interventionId = `intervention-${intent}`;
		const counsel = await createWorldCommand({
			commandId: `cmd-counsel-${intent}`,
			expectedRevision: state.revision,
			principal: {
				kind: "patron",
				principalId: "principal_local_patron",
				beneficiaryCitizenId: mara.citizenId,
			},
			runId: state.runId,
			regionId: state.regionId,
			payload: {
				kind: "IssueCounsel",
				interventionId,
				citizenId: mara.citizenId,
				intent,
			},
		});
		const transition = await prepareTransition(state, head, counsel);
		expect(transition.accepted).toBe(true);
		state = transition.postState;
		head = transition.resultingWorldHeadHash;
		events.push(...transition.events);
	}
	const prng = await seedPrng(
		new Uint8Array(
			state.worldSeedHex
				.match(/../gu)!
				.map((part) => Number.parseInt(part, 16)),
		),
		"standard-brain",
		mara.citizenId,
		"branch",
	);
	const { proposal } = await standardBrain(
		{
			...fixture.context,
			revision: state.revision,
			contextId: `${fixture.context.contextId}-r${state.revision}`,
		},
		{ proposalId: `proposal-${intent ?? "abstain"}`, prngState: prng },
	);
	const action =
		forcedLegalAction ??
		(proposal.action.kind === "VerifyReserve"
			? "verify-reserve"
			: proposal.action.kind === "AccusePublicly"
				? "accuse-publicly"
				: "follow-plan");
	const resolve = await createWorldCommand({
		commandId: `cmd-resolve-${intent ?? "abstain"}`,
		expectedRevision: state.revision,
		principal: { kind: "citizen", principalId: mara.citizenId },
		runId: state.runId,
		regionId: state.regionId,
		payload: {
			kind: "ResolveCounsel",
			citizenId: mara.citizenId,
			interventionId,
			decisionId: `decision-${intent ?? "abstain"}`,
			proposalId: proposal.proposalId,
			action,
		},
	});
	const resolved = await prepareTransition(state, head, resolve);
	expect(resolved.accepted).toBe(true);
	events.push(...resolved.events);
	const citizenNames = Object.fromEntries(
		Object.values(resolved.postState.citizens).map((citizen) => [
			citizen.citizenId,
			citizen.name,
		]),
	);
	const chronicle = projectChronicle({
		events,
		viewer: { kind: "participant", principalId: "principal_local_patron" },
		purpose: "chronicle-private",
		atRevision: resolved.postState.revision,
		visibilityContext: fixture.visibilityContext,
		citizenNames,
	});
	return { ...resolved, events, proposal, chronicle };
}

describe("counsel divergence and factual Chronicle", () => {
	it("reaches three materially different terminal world vectors", async () => {
		const verify = await branch("verify-reserve");
		const accuse = await branch("accuse-publicly", "accuse-publicly");
		const abstain = await branch(null);
		expect(
			new Set([
				verify.finalStateHash,
				accuse.finalStateHash,
				abstain.finalStateHash,
			]).size,
		).toBe(3);
		expect(
			Object.values(verify.postState.epistemicRecords).some((record) =>
				record.recordId.startsWith("belief-verified"),
			),
		).toBe(true);
		expect(
			verify.postState.relationships["relationship-mara-toma"],
		).toMatchObject({ trust: 8_000, strain: 500 });
		const verifyBelief = verify.events.find(
			(event) => event.eventPayload.kind === "BeliefChanged",
		)!;
		const verifyRelationship = verify.events.find(
			(event) =>
				event.eventPayload.kind === "RelationshipChanged" &&
				event.eventPayload.reasonCode === "private-verification-trust",
		)!;
		expect(verifyRelationship.causalParents).toContainEqual({
			eventId: verifyBelief.eventId,
			relation: "direct",
			mechanismId: "riverhold-sourced-recount-trust-v1",
		});
		expect(
			accuse.postState.relationships["relationship-mara-toma"],
		).toMatchObject({ trust: 5_000, strain: 3_300 });
		expect(accuse.postState.petitionEndorsements).toBe(3);
		const accusation = accuse.events.find(
			(event) => event.eventPayload.kind === "StatementMade",
		)!;
		for (const effect of accuse.events.filter(
			(event) =>
				event.eventPayload.kind === "RelationshipChanged" ||
				event.eventPayload.kind === "PetitionChanged",
		)) {
			expect(effect.causalParents[0]?.eventId).toBe(accusation.eventId);
		}
		expect(abstain.postState.selectedCounselBranch).toBe("follow-plan");
		expect(abstain.postState.petitionEndorsements).toBe(1);
		for (const result of [verify, accuse, abstain]) {
			expect(result.postState.simulationTime).toBe(21_600);
			const delayedAt = result.events.findIndex(
				(event) => event.eventPayload.kind === "TimeAdvanced",
			);
			expect(delayedAt).toBeGreaterThanOrEqual(1);
			expect(
				result.events
					.slice(delayedAt + 1)
					.every((event) => event.simulationTime === 21_600),
			).toBe(true);
			expect(result.events.at(-1)?.simulationTime).toBe(21_600);
		}
		const independentPetition = abstain.events.at(-1)!;
		expect(independentPetition.eventPayload).toMatchObject({
			kind: "PetitionChanged",
			reasonCode: "independent-unresolved-ledger-interest",
		});
		expect(independentPetition.causalParents).toEqual([]);
		expect(independentPetition.relatedEvents).toHaveLength(2);
	});

	it("derives three-beat branch Chronicles only from accepted event evidence", async () => {
		const verify = await branch("verify-reserve");
		const accuse = await branch("accuse-publicly", "accuse-publicly");
		const abstain = await branch(null);
		for (const result of [verify, accuse, abstain]) {
			const acceptedIds = new Set(result.events.map((event) => event.eventId));
			expect(result.chronicle.beats).toHaveLength(3);
			expect(
				new Set(result.chronicle.beats.map((beat) => beat.text)).size,
			).toBe(3);
			expect(
				result.chronicle.beats
					.flatMap((beat) => beat.evidenceEventIds)
					.every((eventId) => acceptedIds.has(eventId)),
			).toBe(true);
			expect(jcs(result.chronicle)).not.toContain(result.finalStateHash);
		}
		expect(verify.chronicle.branch).toBe("verify-reserve");
		expect(accuse.chronicle.storyCard).toContain("allegation");
		expect(abstain.chronicle.branch).toBe("follow-plan");
		expect(abstain.chronicle.storyCard).toContain("NO ADVICE");
		expect(abstain.chronicle.storyCard).toContain("independently endorsed");
	});

	it("does not expose a private causal parent in a public child projection", async () => {
		const accuse = await branch("accuse-publicly", "accuse-publicly");
		const publicChronicle = projectChronicle({
			events: accuse.events,
			viewer: { kind: "public" },
			purpose: "chronicle-public",
			atRevision: accuse.postState.revision,
			visibilityContext: {
				policyVersion: "riverhold-visibility-v1",
				covenants: [],
				localOwnerPrincipalId: "owner",
				nonproduction: false,
			},
			citizenNames: Object.fromEntries(
				Object.values(accuse.postState.citizens).map((citizen) => [
					citizen.citizenId,
					citizen.name,
				]),
			),
		});
		const interpreted = accuse.events.find(
			(event) => event.eventPayload.kind === "CounselInterpreted",
		)!;
		expect(jcs(publicChronicle)).not.toContain(interpreted.eventId);
		expect(publicChronicle.storyCard).not.toContain("YOU ADVISED");
		expect(
			publicChronicle.sentences.some(
				(sentence) => sentence.relation === "allegation",
			),
		).toBe(true);
	});

	it("accepts only one canonical return response", async () => {
		const result = await branch("verify-reserve");
		const mara = citizenBySlug(result.postState, "mara");
		const priorEventId = result.events.find(
			(event) =>
				event.eventPayload.kind === "RelationshipChanged" &&
				event.eventPayload.reasonCode === "private-verification-trust",
		)!.eventId;
		const firstCommand = await createWorldCommand({
			commandId: "cmd-return-response-first",
			expectedRevision: result.postState.revision,
			principal: {
				kind: "patron",
				principalId: "principal_local_patron",
				beneficiaryCitizenId: mara.citizenId,
			},
			runId: result.postState.runId,
			regionId: result.postState.regionId,
			payload: {
				kind: "RespondOnReturn",
				responseId: "response-first",
				citizenId: mara.citizenId,
				action: "publish-verified-count",
				priorEventId,
			},
		});
		const first = await prepareTransition(
			result.postState,
			result.resultingWorldHeadHash,
			firstCommand,
			result.events,
		);
		expect(first.accepted).toBe(true);
		expect(first.postState.lastReturnResponse?.responseId).toBe(
			"response-first",
		);
		const duplicate = await prepareTransition(
			first.postState,
			first.resultingWorldHeadHash,
			await createWorldCommand({
				...firstCommand,
				commandId: "cmd-return-response-second",
				expectedRevision: first.postState.revision,
				payload: { ...firstCommand.payload, responseId: "response-second" },
			}),
			[...result.events, ...first.events],
		);
		expect(duplicate.accepted).toBe(false);
		expect(duplicate.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(duplicate.postState).toBe(first.postState);
		expect(duplicate.resultingWorldHeadHash).toBe(first.resultingWorldHeadHash);
	});

	it("rejects dangling, future, cross-run, and wrong-branch return references", async () => {
		const result = await branch("verify-reserve");
		const mara = citizenBySlug(result.postState, "mara");
		const legal = result.events.find(
			(event) =>
				event.eventPayload.kind === "RelationshipChanged" &&
				event.eventPayload.reasonCode === "private-verification-trust",
		)!;
		const wrongBranch = result.events.find(
			(event) => event.eventPayload.kind === "CounselInterpreted",
		)!;
		const cases = [
			{
				label: "missing",
				priorEventId: "event_missing",
				history: result.events,
			},
			{
				label: "future",
				priorEventId: "event_future",
				history: [
					...result.events,
					{
						...legal,
						eventId: "event_future",
						sequence: result.postState.nextSequence,
					},
				],
			},
			{
				label: "cross-run",
				priorEventId: "event_cross_run",
				history: [
					...result.events,
					{ ...legal, eventId: "event_cross_run", runId: "run_other" },
				],
			},
			{
				label: "wrong-reason",
				priorEventId: "event_wrong_reason",
				history: [
					...result.events,
					{
						...legal,
						eventId: "event_wrong_reason",
						eventPayload: {
							...legal.eventPayload,
							reasonCode: "public-accusation",
						},
					},
				],
			},
			{
				label: "wrong-branch",
				priorEventId: wrongBranch.eventId,
				history: result.events,
			},
		] as const;
		for (const candidate of cases) {
			const command = await createWorldCommand({
				commandId: `cmd-return-${candidate.label}`,
				expectedRevision: result.postState.revision,
				principal: {
					kind: "patron",
					principalId: "principal_local_patron",
					beneficiaryCitizenId: mara.citizenId,
				},
				runId: result.postState.runId,
				regionId: result.postState.regionId,
				payload: {
					kind: "RespondOnReturn",
					responseId: `response-${candidate.label}`,
					citizenId: mara.citizenId,
					action: "publish-verified-count",
					priorEventId: candidate.priorEventId,
				},
			});
			const rejected = await prepareTransition(
				result.postState,
				result.resultingWorldHeadHash,
				command,
				candidate.history,
			);
			expect(rejected.receipt.rejectionCode, candidate.label).toBe(
				"INVALID_COMMAND",
			);
			expect(rejected.postState, candidate.label).toBe(result.postState);
			expect(rejected.events, candidate.label).toEqual([]);
			expect(rejected.resultingWorldHeadHash, candidate.label).toBe(
				result.resultingWorldHeadHash,
			);
		}
	});

	it("fails replay before reduction when a response relation dangles", async () => {
		const result = await branch("verify-reserve");
		const mara = citizenBySlug(result.postState, "mara");
		const response = await prepareTransition(
			result.postState,
			result.resultingWorldHeadHash,
			await createWorldCommand({
				commandId: "cmd-dangling-replay",
				expectedRevision: result.postState.revision,
				principal: {
					kind: "patron",
					principalId: "principal_local_patron",
					beneficiaryCitizenId: mara.citizenId,
				},
				runId: result.postState.runId,
				regionId: result.postState.regionId,
				payload: {
					kind: "RespondOnReturn",
					responseId: "response-dangling-replay",
					citizenId: mara.citizenId,
					action: "publish-verified-count",
					priorEventId: result.events.find(
						(event) =>
							event.eventPayload.kind === "RelationshipChanged" &&
							event.eventPayload.reasonCode === "private-verification-trust",
					)!.eventId,
				},
			}),
			result.events,
		);
		const original = response.events[0]!;
		const { eventHash: _oldHash, ...withoutHash } = original;
		const mutatedWithoutHash = {
			...withoutHash,
			relatedEvents: [
				{ eventId: "event_missing", relation: "response-to" },
			] as const,
		};
		const mutatedEvent = {
			...mutatedWithoutHash,
			eventHash: await eventHash(mutatedWithoutHash),
		};
		const originalHeader = response.batchHeader!;
		const headerWithoutHash = {
			runId: originalHeader.runId,
			regionId: originalHeader.regionId,
			batchId: originalHeader.batchId,
			priorWorldHeadHash: originalHeader.priorWorldHeadHash,
			firstSequence: originalHeader.firstSequence,
			eventHashes: [mutatedEvent.eventHash],
			payloadFingerprint: originalHeader.payloadFingerprint,
			resultRevision: originalHeader.resultRevision,
			finalStateHash: originalHeader.finalStateHash,
		};
		const mutatedHeader = {
			...originalHeader,
			eventHashes: headerWithoutHash.eventHashes,
			batchHash: await batchHash(headerWithoutHash),
		};
		await expect(
			replayLedger({
				snapshotState: result.postState,
				snapshotStateHash: result.finalStateHash,
				baseWorldHeadHash: result.resultingWorldHeadHash,
				headers: [mutatedHeader],
				events: [mutatedEvent],
				manifest: {
					schemaVersion: "eonfolk-replay-manifest-v1",
					runId: result.postState.runId,
					regionId: result.postState.regionId,
					worldSeedHex: result.postState.worldSeedHex,
					experimentManifestHash: "a".repeat(64),
					snapshot: {
						runId: result.postState.runId,
						regionId: result.postState.regionId,
						snapshotId: "snapshot-branch",
						baseSequence: result.postState.nextSequence - 1,
						stateHash: result.finalStateHash,
						baseWorldHeadHash: result.resultingWorldHeadHash,
					},
					fromSequenceInclusive: result.postState.nextSequence,
					toSequenceExclusive: result.postState.nextSequence + 1,
					engineVersion: ENGINE_VERSION,
					worldSchemaVersion: PROTOCOL_SCHEMA_VERSION,
					determinismVersion: DETERMINISM_VERSION,
					replayVersion: REPLAY_VERSION,
					expectedFinalStateHash: response.finalStateHash,
					expectedFinalWorldHeadHash: mutatedHeader.batchHash,
					presentation: { title: "dangling replay", branch: "verify" },
				},
			}),
		).rejects.toThrow("related event does not precede child");
	});
});
