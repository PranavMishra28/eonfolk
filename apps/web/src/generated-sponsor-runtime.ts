import type { CivilizationState } from "@eonfolk/civilization";
import {
	buildCivilizationCounselDecisionContext,
	createCivilizationSponsorSnapshotBoundary,
	prepareCivilizationSponsorTransition,
	type CivilizationSponsorEventEnvelope,
	type ValidatedStandardBrainResolution,
} from "@eonfolk/civilization/sponsor";
import {
	createCognitiveDecisionRecord,
	standardBrain,
} from "@eonfolk/cognition";
import { replayCivilizationHistory } from "@eonfolk/persistence";
import {
	createCivilizationCounselBoundaryAppend,
	createCivilizationSponsorAuthorityAppend,
	createCivilizationSponsorRejectionAppend,
	type CivilizationCounselBoundaryFact,
} from "@eonfolk/persistence/civilization-sponsor";
import {
	bytesFromHex,
	payloadFingerprint,
	PROTOCOL_SCHEMA_VERSION,
	seedPrng,
	stateHash,
	type WorldCommand,
	type WorldCommandPayload,
} from "@eonfolk/protocol";
import { projectCivilizationChronicle } from "@eonfolk/sim/civilization-chronicle";
import { BrowserVersionedPersistence } from "./persistence/browser-versioned";
import { GENERATED_CIVILIZATION_RUN_ID } from "./persistence/generated-civilization";

type SponsorPayload = Extract<
	WorldCommandPayload,
	{ kind: "EstablishSponsorship" | "IssueCounsel" | "ResolveCounsel" }
>;

export interface GeneratedSponsorshipResult {
	readonly citizenId: string;
	readonly eventIds: readonly string[];
	readonly idempotent: boolean;
	readonly chronicleTrace: string;
	readonly authorityStateHash: string;
	readonly civilizationStateHash: string;
	readonly revision: number;
	readonly phase: "sponsored" | "counseled" | "resolved";
	readonly disposition:
		| "accepted"
		| "delayed"
		| "rejected"
		| "reinterpreted"
		| null;
	readonly shareArtifact: string | null;
	readonly simulationTime: number;
	readonly chronicleBeats: readonly {
		readonly text: string;
		readonly relation: string;
		readonly evidenceEventIds: readonly string[];
		readonly citizenId: string;
	}[];
}

/**
 * Lazy canonical action path. Each step reloads the sole durable authority
 * stream. Application invokes Standard Brain; Reality reconstructs and validates
 * the context, proposal, and resulting authority transition.
 */
export async function sponsorGeneratedCitizen(input: {
	readonly citizenId: string;
	readonly regionId: string;
	readonly databaseName: string;
	readonly indexedDbFactory?: IDBFactory;
	readonly step: "establish" | "counsel" | "resolve";
	readonly intent?: "verify-reserve" | "accuse-publicly";
}): Promise<GeneratedSponsorshipResult> {
	const port = await BrowserVersionedPersistence.open({
		factory: input.indexedDbFactory,
		databaseName: input.databaseName,
	});
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	const covenantId = `covenant:${input.citizenId}`;
	const intent = input.intent ?? "verify-reserve";
	const interventionId = `intervention:${input.citizenId}:${intent}`;
	const decisionId = `decision:${scope.runId}:${input.regionId}:${interventionId}`;
	const proposalId = `proposal:${scope.runId}:${input.regionId}:${interventionId}`;
	const committedEvents: CivilizationSponsorEventEnvelope[] = [];
	const eventRevisions: Record<string, number> = {};
	let allIdempotent = true;

	const commit = async (
		commandId: string,
		principal: WorldCommand["principal"],
		payloadInput:
			| SponsorPayload
			| {
					readonly kind: "derive-resolution";
					readonly citizenId: string;
					readonly interventionId: string;
					readonly decisionId: string;
					readonly proposalId: string;
			  },
	): Promise<CivilizationState> => {
		const prior = await port.getAppendReceipt(scope, commandId);
		if (prior === null) allIdempotent = false;

		let [head, snapshot] = await Promise.all([
			port.loadHead(scope),
			port.loadLatestSnapshot(scope),
		]);
		if (prior === null) {
			head = await port.acquireWriterFence(scope, head.fencingToken);
			snapshot = await port.loadLatestSnapshot(scope);
		}
		const replay = await replayCivilizationHistory(port, {
			...scope,
			snapshotId: snapshot.snapshotId,
			toSequenceExclusive: head.lastSequence + 1,
		});
		if (replay.state.civilization === null)
			throw new Error("SP:NO_CIVILIZATION");
		const civilization = replay.state
			.civilization as unknown as CivilizationState;
		if (prior !== null) {
			const receipt = prior.commandReceipt as {
				readonly commandId?: unknown;
				readonly outcome?: unknown;
				readonly payloadFingerprint?: unknown;
			} | null;
			const retryPayload: SponsorPayload | null =
				payloadInput.kind === "derive-resolution"
					? (() => {
							const resolved =
								civilization.counsels[payloadInput.interventionId]?.resolution;
							return resolved?.decisionId === payloadInput.decisionId &&
								resolved.proposalId === payloadInput.proposalId
								? {
										kind: "ResolveCounsel" as const,
										citizenId: payloadInput.citizenId,
										interventionId: payloadInput.interventionId,
										decisionId: payloadInput.decisionId,
										proposalId: payloadInput.proposalId,
										action: resolved.action,
									}
								: null;
						})()
					: payloadInput;
			if (
				retryPayload === null ||
				receipt?.commandId !== commandId ||
				receipt.outcome !== "accepted" ||
				receipt.payloadFingerprint !== (await payloadFingerprint(retryPayload))
			)
				throw new Error("SP:IDEMPOTENCY_COLLISION");
			return civilization;
		}

		let resolution: ValidatedStandardBrainResolution | undefined;
		let payload: SponsorPayload;
		if (payloadInput.kind === "derive-resolution") {
			const context = await buildCivilizationCounselDecisionContext({
				state: civilization,
				runId: scope.runId,
				regionId: scope.regionId,
				citizenId: payloadInput.citizenId,
				interventionId: payloadInput.interventionId,
				decisionId: payloadInput.decisionId,
			});
			if (context === null) throw new Error("SP:NO_DECISION_CONTEXT");
			const chosen = await standardBrain(context, {
				proposalId: payloadInput.proposalId,
				prngState: await seedPrng(
					bytesFromHex(context.contextHash, 32),
					"civilization-sponsor",
					payloadInput.citizenId,
					payloadInput.decisionId,
				),
			});
			const action =
				chosen.proposal.action.kind === "VerifyReserve"
					? "verify-reserve"
					: chosen.proposal.action.kind === "AccusePublicly"
						? "accuse-publicly"
						: chosen.proposal.action.kind === "FollowStandingPlan"
							? "follow-plan"
							: null;
			if (action === null) throw new Error("SP:UNSUPPORTED_BRAIN_ACTION");
			payload = {
				kind: "ResolveCounsel",
				citizenId: payloadInput.citizenId,
				interventionId: payloadInput.interventionId,
				decisionId: payloadInput.decisionId,
				proposalId: payloadInput.proposalId,
				action,
			};
			resolution = {
				decisionId: payloadInput.decisionId,
				context,
				proposal: chosen.proposal,
				decisionRecord: await createCognitiveDecisionRecord({
					decisionId: payloadInput.decisionId,
					decisionBoundaryId: `boundary:${payloadInput.decisionId}`,
					wholePreStateHash: await stateHash(civilization),
					context,
					proposal: chosen.proposal,
					failureCode: null,
					validator: {
						stage: "authorization",
						outcome: "accepted",
						reason: "Application validated deterministic Brain proposal",
					},
					proposedCommandId: commandId,
					receiptRef: null,
					acceptedEventInterval: null,
				}),
			};
		} else {
			payload = payloadInput;
		}
		const fingerprint = await payloadFingerprint(payload);

		const command: WorldCommand<SponsorPayload> = {
			schemaVersion: PROTOCOL_SCHEMA_VERSION,
			commandId,
			payloadFingerprint: fingerprint,
			expectedRevision: civilization.revision,
			principal,
			runId: scope.runId,
			regionId: scope.regionId,
			payload,
		};
		if (payload.kind === "ResolveCounsel" && resolution === undefined) {
			const context = await buildCivilizationCounselDecisionContext({
				state: civilization,
				runId: scope.runId,
				regionId: scope.regionId,
				citizenId: payload.citizenId,
				interventionId: payload.interventionId ?? "",
				decisionId: payload.decisionId,
			});
			if (context === null) throw new Error("SP:CONTEXT_REBUILD_FAILED");
			const chosen = await standardBrain(context, {
				proposalId: payload.proposalId,
				prngState: await seedPrng(
					bytesFromHex(context.contextHash, 32),
					"civilization-sponsor",
					payload.citizenId,
					payload.decisionId,
				),
			});
			const expectedAction =
				chosen.proposal.action.kind === "VerifyReserve"
					? "verify-reserve"
					: chosen.proposal.action.kind === "AccusePublicly"
						? "accuse-publicly"
						: chosen.proposal.action.kind === "FollowStandingPlan"
							? "follow-plan"
							: null;
			if (expectedAction === null || expectedAction !== payload.action)
				throw new Error("SP:DECISION_BINDING_FAILED");
			resolution = {
				decisionId: payload.decisionId,
				context,
				proposal: chosen.proposal,
				decisionRecord: await createCognitiveDecisionRecord({
					decisionId: payload.decisionId,
					decisionBoundaryId: `boundary:${payload.decisionId}`,
					wholePreStateHash: await stateHash(civilization),
					context,
					proposal: chosen.proposal,
					failureCode: null,
					validator: {
						stage: "authorization",
						outcome: "accepted",
						reason: "Application validated deterministic Brain proposal",
					},
					proposedCommandId: commandId,
					receiptRef: null,
					acceptedEventInterval: null,
				}),
			};
		}
		const transition = await prepareCivilizationSponsorTransition({
			state: civilization,
			runId: scope.runId,
			regionId: scope.regionId,
			priorWorldHeadHash: head.lastEventHash,
			nextSequence: head.lastSequence + 1,
			snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
				snapshotId: `runtime:${String(head.revision)}`,
				runId: scope.runId,
				regionId: scope.regionId,
				stateHash: await stateHash(civilization),
				revision: civilization.revision,
				simulationTime: civilization.simulationTime,
				nextSequence: head.lastSequence + 1,
				baseWorldHeadHash: head.lastEventHash,
			}),
			authoritativeHeaders: [],
			fencingToken: head.fencingToken,
			command,
			authoritativeHistory: [],
			...(resolution === undefined ? {} : { resolution }),
		});
		if (!transition.accepted || transition.events[0] === undefined) {
			const rejection = await createCivilizationSponsorRejectionAppend({
				state: replay.state,
				head,
				commandReceipt: transition.receipt,
				decisionRecord: transition.committedDecisionRecord,
			});
			await port.recordRejectedCommand(rejection.request);
			throw new Error(
				`SP:COMMAND_REJECTED:${String(transition.receipt.rejectionCode)}`,
			);
		}
		const event = transition.events[0];
		const append = await createCivilizationSponsorAuthorityAppend({
			state: replay.state,
			head,
			protocolEvent: event,
			commandReceipt: transition.receipt,
			decisionRecord: transition.committedDecisionRecord,
		});
		await port.appendEventBatch(append.request);
		committedEvents.push(event);
		eventRevisions[event.eventId] = transition.postState.revision;
		return transition.postState;
	};

	try {
		let finalCivilization = await commit(
			`sponsor:${input.citizenId}`,
			{
				kind: "patron",
				principalId: "patron:local",
				beneficiaryCitizenId: input.citizenId,
			},
			{
				kind: "EstablishSponsorship",
				covenantId,
				citizenId: input.citizenId,
			},
		);
		if (input.step === "counsel" || input.step === "resolve") {
			finalCivilization = await commit(
				`counsel:${input.citizenId}:${intent}`,
				{
					kind: "patron",
					principalId: "patron:local",
					beneficiaryCitizenId: input.citizenId,
				},
				{
					kind: "IssueCounsel",
					interventionId,
					citizenId: input.citizenId,
					intent,
				},
			);
		}
		if (input.step === "resolve") {
			finalCivilization = await commit(
				`resolve:${input.citizenId}:${intent}:1`,
				{ kind: "citizen", principalId: input.citizenId },
				{
					kind: "derive-resolution",
					citizenId: input.citizenId,
					interventionId,
					decisionId,
					proposalId,
				},
			);
			const boundaryAppendId = `boundary:${interventionId}:1`;
			const priorBoundary = await port.getAppendReceipt(
				scope,
				boundaryAppendId,
			);
			if (priorBoundary === null) {
				let boundaryHead = await port.loadHead(scope);
				boundaryHead = await port.acquireWriterFence(
					scope,
					boundaryHead.fencingToken,
				);
				const boundarySnapshot = await port.loadLatestSnapshot(scope);
				const boundaryReplay = await replayCivilizationHistory(port, {
					...scope,
					snapshotId: boundarySnapshot.snapshotId,
					toSequenceExclusive: boundaryHead.lastSequence + 1,
				});
				const boundary = await createCivilizationCounselBoundaryAppend({
					state: boundaryReplay.state,
					head: boundaryHead,
					citizenId: input.citizenId,
					interventionId,
				});
				await port.appendEventBatch(boundary.request);
				finalCivilization = boundary.state
					.civilization as unknown as CivilizationState;
				allIdempotent = false;
			}
		}
		const covenant = finalCivilization.sponsorships[covenantId];
		if (covenant === undefined) throw new Error("SP:COVENANT_MISSING");
		const finalHead = await port.loadHead(scope);
		const finalSnapshot = await port.loadLatestSnapshot(scope);
		const finalReplay = await replayCivilizationHistory(port, {
			...scope,
			snapshotId: finalSnapshot.snapshotId,
			toSequenceExclusive: finalHead.lastSequence + 1,
		});
		const replayedCivilization = finalReplay.state
			.civilization as unknown as CivilizationState;
		if (
			(await stateHash(replayedCivilization)) !==
			(await stateHash(finalCivilization))
		)
			throw new Error("SP:REPLAY_STATE_MISMATCH");
		const durableSponsorEvents: CivilizationSponsorEventEnvelope[] = [];
		const durableEventRevisions: Record<string, number> = {};
		const durableBoundaries: Array<{
			readonly eventId: string;
			readonly parentEventId: string;
			readonly createdRevision: number;
			readonly visibility: CivilizationSponsorEventEnvelope["visibility"];
			readonly fact: CivilizationCounselBoundaryFact;
		}> = [];
		for (const outer of await port.getEventRange({
			...scope,
			fromSequenceInclusive: 1,
			toSequenceExclusive: finalHead.lastSequence + 1,
		})) {
			if (outer.eventType === "CivilizationCounselBoundaryCommitted") {
				const payload = outer.payload as {
					readonly fact?: CivilizationCounselBoundaryFact;
				};
				const parent = outer.causalParents[0];
				if (
					payload.fact === undefined ||
					parent === undefined ||
					parent.relation !== payload.fact.causalRelation
				)
					throw new Error("SP:BOUNDARY_CAUSAL_BINDING");
				const stored = await port.getAppendReceipt(scope, outer.appendId);
				if (stored === null) throw new Error("SP:BOUNDARY_RECEIPT_MISSING");
				durableBoundaries.push({
					eventId: outer.eventId,
					parentEventId: parent.eventId,
					createdRevision: stored.revision,
					visibility:
						outer.visibility as CivilizationSponsorEventEnvelope["visibility"],
					fact: payload.fact,
				});
				continue;
			}
			if (outer.eventType !== "CivilizationSponsorCommandCommitted") continue;
			const protocolEvent = (
				outer.payload as {
					readonly protocolEvent?: CivilizationSponsorEventEnvelope;
				}
			).protocolEvent;
			if (protocolEvent === undefined) continue;
			const stored = await port.getAppendReceipt(scope, outer.appendId);
			const resultingRevision = (
				stored?.commandReceipt as {
					readonly resultingRevision?: unknown;
				} | null
			)?.resultingRevision;
			if (!Number.isSafeInteger(resultingRevision))
				throw new Error("SP:SPONSOR_RECEIPT_REVISION");
			durableSponsorEvents.push(protocolEvent);
			durableEventRevisions[protocolEvent.eventId] =
				resultingRevision as number;
		}
		const chronicle = projectCivilizationChronicle({
			events: durableSponsorEvents,
			eventRevisions: durableEventRevisions,
			viewer: { kind: "participant", principalId: "patron:local" },
			purpose: "chronicle-private",
			atRevision: finalCivilization.revision,
			visibilityContext: {
				policyVersion: "riverhold-visibility-v1",
				localOwnerPrincipalId: "patron:local",
				nonproduction: false,
				covenants: [
					{
						patronPrincipalId: covenant.patronPrincipalId,
						beneficiaryCitizenId: covenant.beneficiaryCitizenId,
						grantRevision: covenant.establishedAtRevision,
						revokeRevision: null,
					},
				],
			},
			citizenNames: Object.fromEntries(
				Object.values(finalCivilization.citizens).map(({ citizenId, name }) => [
					citizenId,
					name,
				]),
			),
			boundaries: durableBoundaries,
		});
		const resolution = finalCivilization.counsels[interventionId]?.resolution;
		const phase =
			resolution !== null && resolution !== undefined
				? ("resolved" as const)
				: finalCivilization.counsels[interventionId] !== undefined
					? ("counseled" as const)
					: ("sponsored" as const);
		const shareArtifact = phase === "resolved" ? chronicle.storyCard : null;
		return {
			citizenId: input.citizenId,
			eventIds: committedEvents.map(({ eventId }) => eventId),
			idempotent: allIdempotent,
			chronicleTrace:
				chronicle.storyCard ||
				(input.step !== "establish"
					? "Counsel already recorded."
					: "Sponsorship already recorded."),
			authorityStateHash: finalReplay.stateHash,
			civilizationStateHash: await stateHash(replayedCivilization),
			revision: replayedCivilization.revision,
			phase,
			disposition: resolution?.disposition ?? null,
			shareArtifact,
			simulationTime: finalReplay.state.scheduler.simulationTime,
			chronicleBeats: chronicle.beats.map((beat) => ({
				text: beat.text,
				relation: beat.relation,
				evidenceEventIds: beat.evidenceEventIds,
				citizenId: input.citizenId,
			})),
		};
	} finally {
		port.close();
	}
}
