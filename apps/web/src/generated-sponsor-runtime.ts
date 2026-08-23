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
	const interventionId = `intervention:${input.citizenId}:standing-plan`;
	const decisionId = `decision:${scope.runId}:${input.regionId}:${interventionId}`;
	const proposalId = `proposal:${scope.runId}:${input.regionId}:${interventionId}`;
	const committedEvents: CivilizationSponsorEventEnvelope[] = [];
	const eventRevisions: Record<string, number> = {};
	let allIdempotent = true;

	const commit = async (
		commandId: string,
		principal: WorldCommand["principal"],
		payload: SponsorPayload,
	): Promise<CivilizationState> => {
		const fingerprint = await payloadFingerprint(payload);
		const prior = await port.getAppendReceipt(scope, commandId);
		if (prior !== null) {
			const receipt = prior.commandReceipt as {
				readonly payloadFingerprint?: unknown;
				readonly outcome?: unknown;
				readonly rejectionCode?: unknown;
			} | null;
			if (
				receipt?.payloadFingerprint !== fingerprint ||
				(receipt.outcome !== "accepted" && receipt.outcome !== "rejected")
			)
				throw new Error("SP");
			if (receipt.outcome === "rejected") throw new Error("SP");
		} else allIdempotent = false;

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
		if (replay.state.civilization === null) throw new Error("SP");
		const civilization = replay.state
			.civilization as unknown as CivilizationState;
		if (prior !== null) return civilization;

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
		let resolution: ValidatedStandardBrainResolution | undefined;
		if (payload.kind === "ResolveCounsel") {
			const context = await buildCivilizationCounselDecisionContext({
				state: civilization,
				runId: scope.runId,
				regionId: scope.regionId,
				citizenId: payload.citizenId,
				interventionId: payload.interventionId ?? "",
				decisionId: payload.decisionId,
			});
			if (context === null) throw new Error("SP");
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
				throw new Error("SP");
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
			await port.appendEventBatch(rejection.request);
			throw new Error("SP");
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
				`counsel:${input.citizenId}:standing-plan`,
				{
					kind: "patron",
					principalId: "patron:local",
					beneficiaryCitizenId: input.citizenId,
				},
				{
					kind: "IssueCounsel",
					interventionId,
					citizenId: input.citizenId,
					intent: "verify-reserve",
				},
			);
		}
		if (input.step === "resolve") {
			finalCivilization = await commit(
				`resolve:${input.citizenId}:standing-plan:1`,
				{ kind: "citizen", principalId: input.citizenId },
				{
					kind: "ResolveCounsel",
					citizenId: input.citizenId,
					interventionId,
					decisionId,
					proposalId,
					action: "follow-plan",
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
		if (covenant === undefined) throw new Error("SP");
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
			throw new Error("SP");
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
					parent.relation !== "contributing-condition"
				)
					throw new Error("SP");
				const stored = await port.getAppendReceipt(scope, outer.appendId);
				if (stored === null) throw new Error("SP");
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
			if (!Number.isSafeInteger(resultingRevision)) throw new Error("SP");
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
		};
	} finally {
		port.close();
	}
}
