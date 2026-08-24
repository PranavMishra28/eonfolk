import type { CivilizationState } from "@eonfolk/civilization";
import {
	buildCivilizationCounselDecisionContext,
	type CivilizationSponsorEventEnvelope,
	createCivilizationSponsorSnapshotBoundary,
	prepareCivilizationSponsorTransition,
	type ValidatedStandardBrainResolution,
} from "@eonfolk/civilization/sponsor";
import {
	createCognitiveDecisionRecord,
	standardBrain,
} from "@eonfolk/cognition";
import { replayCivilizationHistory } from "@eonfolk/persistence";
import {
	type CivilizationCounselBoundaryFact,
	createCivilizationCounselBoundaryAppend,
	createCivilizationSponsorAuthorityAppend,
	createCivilizationSponsorRejectionAppend,
} from "@eonfolk/persistence/civilization-sponsor";
import {
	bytesFromHex,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
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
	{
		kind:
			| "EstablishSponsorship"
			| "RecordPatronAbstention"
			| "IssueCounsel"
			| "ResolveCounsel";
	}
>;

interface GeneratedSponsorInput {
	readonly citizenId: string;
	readonly regionId: string;
	readonly databaseName: string;
	readonly indexedDbFactory?: IDBFactory;
	readonly step: "establish" | "abstain" | "counsel" | "resolve";
	readonly intent?: "verify-reserve" | "accuse-publicly";
}

export interface GeneratedSponsorshipResult {
	readonly citizenId: string;
	readonly eventIds: readonly string[];
	readonly idempotent: boolean;
	readonly chronicleTrace: string;
	readonly authorityStateHash: string;
	readonly civilizationStateHash: string;
	readonly revision: number;
	readonly phase: "sponsored" | "abstained" | "counseled" | "resolved";
	readonly activeIntent: "verify-reserve" | "accuse-publicly" | null;
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

export function generatedSponsorChronicleRange(input: {
	readonly snapshotBaseSequence: number;
	readonly durableLastSequence: number;
}): Readonly<{
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
}> {
	if (
		!Number.isSafeInteger(input.snapshotBaseSequence) ||
		!Number.isSafeInteger(input.durableLastSequence) ||
		input.snapshotBaseSequence < 0 ||
		input.durableLastSequence < input.snapshotBaseSequence ||
		input.durableLastSequence === Number.MAX_SAFE_INTEGER
	)
		throw new Error("SP:INVALID_CHRONICLE_RANGE");
	return Object.freeze({
		fromSequenceInclusive: input.snapshotBaseSequence + 1,
		toSequenceExclusive: input.durableLastSequence + 1,
	});
}

export function generatedSponsorChronicleBaseSnapshotId(
	latestSnapshotId: string,
): string {
	const match = /^(civilization-day-[1-9]\d*)(?:-authority-\d+)?$/u.exec(
		latestSnapshotId,
	);
	const baseSnapshotId = match?.[1];
	if (baseSnapshotId === undefined)
		throw new Error("SP:INVALID_CHRONICLE_SNAPSHOT");
	return baseSnapshotId;
}

/**
 * Lazy canonical action path. Each step reloads the sole durable authority
 * stream. Application invokes Standard Brain; Reality reconstructs and validates
 * the context, proposal, and resulting authority transition.
 */
export async function sponsorGeneratedCitizen(
	input: GeneratedSponsorInput,
): Promise<GeneratedSponsorshipResult> {
	const port = await BrowserVersionedPersistence.open({
		...(input.indexedDbFactory === undefined
			? {}
			: { factory: input.indexedDbFactory }),
		databaseName: input.databaseName,
	});
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	let sessionStarted = false;
	let bodyFailed = false;
	let bodyError: unknown;
	let result: GeneratedSponsorshipResult | null = null;
	try {
		await port.beginValidatedAuthoritySession(scope);
		sessionStarted = true;
		result = await sponsorGeneratedCitizenInValidatedSession(
			input,
			port,
			scope,
		);
	} catch (error) {
		bodyFailed = true;
		bodyError = error;
	}
	let finalizationError: unknown;
	try {
		if (sessionStarted) await port.endValidatedAuthoritySession(scope);
	} catch (error) {
		finalizationError = error;
	}
	try {
		port.close();
	} catch (error) {
		finalizationError =
			finalizationError === undefined
				? error
				: new AggregateError(
						[finalizationError, error],
						"SP:SESSION_FINALIZATION_FAILED",
					);
	}
	if (bodyFailed) {
		if (finalizationError !== undefined)
			throw new AggregateError(
				[bodyError, finalizationError],
				"SP:BODY_AND_SESSION_FINALIZATION_FAILED",
			);
		throw bodyError;
	}
	if (finalizationError !== undefined) throw finalizationError;
	if (result === null) throw new Error("SP:SPONSOR_RESULT_MISSING");
	return result;
}

async function sponsorGeneratedCitizenInValidatedSession(
	input: GeneratedSponsorInput,
	port: BrowserVersionedPersistence,
	scope: Readonly<{ runId: string; regionId: string }>,
): Promise<GeneratedSponsorshipResult> {
	const covenantId = `covenant:${input.citizenId}`;
	const initialHead = await port.loadHead(scope);
	const initialSnapshot = await port.loadLatestSnapshot(scope);
	const initialReplay = await replayCivilizationHistory(port, {
		...scope,
		snapshotId: initialSnapshot.snapshotId,
		toSequenceExclusive: initialHead.lastSequence + 1,
	});
	if (initialReplay.state.civilization === null)
		throw new Error("SP:NO_CIVILIZATION");
	const initialCivilization = initialReplay.state
		.civilization as unknown as CivilizationState;
	const unresolved = Object.values(initialCivilization.counsels)
		.filter(
			(counsel) =>
				counsel.citizenId === input.citizenId && counsel.resolution === null,
		)
		.sort((left, right) =>
			left.sourceEventId.localeCompare(right.sourceEventId),
		)[0];
	if (
		input.step === "resolve" &&
		input.intent !== undefined &&
		unresolved?.intent !== input.intent
	)
		throw new Error("SP:UNRESOLVED_COUNSEL_MISMATCH");
	const intent = unresolved?.intent ?? input.intent ?? "verify-reserve";
	const interventionId = `intervention:${input.citizenId}:${intent}`;
	if (input.step === "resolve" && unresolved?.interventionId !== interventionId)
		throw new Error("SP:NO_UNRESOLVED_COUNSEL");
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

	{
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
		if (input.step === "abstain") {
			const abstentionId = `abstention:${input.citizenId}:${String(initialReplay.state.scheduler.completedDay)}`;
			finalCivilization = await commit(
				`abstain:${input.citizenId}:${String(initialReplay.state.scheduler.completedDay)}`,
				{
					kind: "patron",
					principalId: "patron:local",
					beneficiaryCitizenId: input.citizenId,
				},
				{
					kind: "RecordPatronAbstention",
					abstentionId,
					citizenId: input.citizenId,
					reason: "withhold-counsel",
				},
			);
		}
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
			readonly parentEventIds: readonly string[];
			readonly createdRevision: number;
			readonly visibility: CivilizationSponsorEventEnvelope["visibility"];
			readonly fact: CivilizationCounselBoundaryFact;
		}> = [];
		const chronicleBaseSnapshotId = generatedSponsorChronicleBaseSnapshotId(
			finalSnapshot.snapshotId,
		);
		const chronicleBaseSnapshot =
			chronicleBaseSnapshotId === finalSnapshot.snapshotId
				? finalSnapshot
				: await port.loadSnapshot(scope, chronicleBaseSnapshotId);
		const chronicleRange = generatedSponsorChronicleRange({
			snapshotBaseSequence: chronicleBaseSnapshot.baseSequence,
			durableLastSequence: finalHead.lastSequence,
		});
		for (const outer of await port.getEventRange({
			...scope,
			...chronicleRange,
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
					parentEventIds: outer.causalParents.map(({ eventId }) => eventId),
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
		const activeUnresolved = Object.values(finalCivilization.counsels).find(
			(counsel) =>
				counsel.citizenId === input.citizenId && counsel.resolution === null,
		);
		const selectedCounsel =
			activeUnresolved ??
			Object.values(finalCivilization.counsels)
				.filter((counsel) => counsel.citizenId === input.citizenId)
				.sort(
					(left, right) =>
						right.issuedAtSimulationTime - left.issuedAtSimulationTime ||
						right.sourceEventId.localeCompare(left.sourceEventId),
				)[0];
		const resolution = selectedCounsel?.resolution;
		const phase =
			activeUnresolved !== undefined
				? ("counseled" as const)
				: resolution !== null && resolution !== undefined
					? ("resolved" as const)
					: input.step === "abstain"
						? ("abstained" as const)
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
			activeIntent: activeUnresolved?.intent ?? selectedCounsel?.intent ?? null,
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
	}
}
