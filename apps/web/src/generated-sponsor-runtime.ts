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
	type GeneratedWorldState,
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
	readonly expectedAuthorityStateHash?: string;
}

function sponsorFail(code: string): never {
	throw new Error(`SP:${code}`);
}

export interface GeneratedSponsorshipResult {
	readonly idempotent: boolean;
	readonly chronicleTrace: string;
	readonly authorityStateHash: string;
	readonly phase: "sponsored" | "abstained" | "counseled" | "resolved";
	readonly activeIntent: "verify-reserve" | "accuse-publicly" | null;
	readonly shareArtifact: string | null;
	readonly counselContext: GeneratedCounselContext;
	readonly nextAction: GeneratedBranchNextAction | null;
	readonly chronicleBeats: readonly {
		readonly text: string;
		readonly relation: string;
		readonly evidenceEventIds: readonly string[];
		readonly context: GeneratedChronicleEventContext | null;
	}[];
}

export interface GeneratedCounselContext {
	readonly authorityStateHash: string;
	readonly citizenName: string;
	readonly fact: string;
	readonly belief: string;
	readonly allegation: string;
	readonly values: readonly string[];
	readonly relationship: string;
	readonly standingPlan: string;
	readonly uncertainty: string;
	readonly verifyStake: string;
	readonly accuseStake: string;
	readonly abstainStake: string;
}

export interface GeneratedBranchNextAction {
	readonly id: "investigate-uncertainty" | "repair-relationship" | "observe";
	readonly label: string;
	readonly description: string;
	readonly focus:
		| { readonly kind: "citizen"; readonly citizenId: string }
		| { readonly kind: "location"; readonly locationId: string }
		| { readonly kind: "object"; readonly objectId: string };
}

export interface GeneratedChronicleEventContext {
	readonly eventId: string;
	readonly title: string;
	readonly citizenId: string;
	readonly citizenName: string;
	readonly locationId: string | null;
	readonly locationName: string | null;
	readonly objectId: string | null;
	readonly objectName: string | null;
}

type DurableEvent = Awaited<
	ReturnType<BrowserVersionedPersistence["getEventRange"]>
>[number];

function readable(value: string): string {
	return value.replaceAll(/[-_:]+/gu, " ");
}

function namedSite(world: GeneratedWorldState, siteId: string | null) {
	return siteId === null
		? null
		: (world.sites[siteId]?.value.name ?? readable(siteId));
}

function durableEventForEvidence(
	events: readonly DurableEvent[],
	eventId: string,
): DurableEvent | undefined {
	return events.find((candidate) => {
		if (candidate.eventId === eventId) return true;
		if (candidate.eventType !== "CivilizationSponsorCommandCommitted")
			return false;
		const protocolEvent = (
			candidate.payload as {
				readonly protocolEvent?: { readonly eventId?: unknown };
			}
		).protocolEvent;
		return protocolEvent?.eventId === eventId;
	});
}

function chronicleEventContext(input: {
	readonly eventId: string;
	readonly event: DurableEvent;
	readonly civilization: CivilizationState;
	readonly world: GeneratedWorldState;
}): GeneratedChronicleEventContext | null {
	const payload = input.event.payload as {
		readonly protocolEvent?: CivilizationSponsorEventEnvelope;
		readonly fact?: CivilizationCounselBoundaryFact;
	};
	const sponsorPayload = payload.protocolEvent?.eventPayload;
	const fact = payload.fact;
	const citizenId = sponsorPayload?.citizenId ?? fact?.citizenId;
	if (citizenId === undefined) return null;
	const citizen = input.civilization.citizens[citizenId];
	if (citizen === undefined) return null;
	let title: string;
	if (sponsorPayload?.kind === "SponsorshipEstablished")
		title = `${citizen.name} accepted a bounded witness covenant`;
	else if (sponsorPayload?.kind === "PatronAbstained")
		title = `No counsel was offered to ${citizen.name}`;
	else if (sponsorPayload?.kind === "CounselIssued")
		title = `Counsel was offered to ${citizen.name}`;
	else if (sponsorPayload?.kind === "CounselInterpreted")
		title = `${citizen.name} chose how to respond`;
	else title = `${citizen.name} reached the next daily boundary`;

	let locationId: string | null = citizen.siteId;
	let objectId: string | null = null;
	let objectName: string | null = null;
	if (fact?.effect.kind === "reserve-inspection") {
		const stock =
			input.civilization.stocks[
				fact.effect.stockObservations[0]?.stockId ?? ""
			];
		const storage =
			stock === undefined
				? undefined
				: input.civilization.storages[stock.storageId];
		locationId = storage?.siteId ?? locationId;
		const building = Object.values(input.world.buildings)
			.map(({ value }) => value)
			.find(({ siteId }) => siteId === locationId);
		const project = Object.values(input.civilization.projects).find(
			(candidate) => candidate.siteId === locationId,
		);
		objectId = building?.buildingId ?? project?.projectId ?? null;
		objectName =
			building?.buildingKind ??
			project?.name ??
			readable(stock?.stockId ?? "reserve");
	} else if (fact?.effect.kind === "public-allegation") {
		const target = input.civilization.citizens[fact.effect.targetCitizenId];
		objectName = `${citizen.name} and ${target?.name ?? readable(fact.effect.targetCitizenId)} relationship`;
	}
	return Object.freeze({
		eventId: input.eventId,
		title,
		citizenId,
		citizenName: citizen.name,
		locationId,
		locationName: namedSite(input.world, locationId),
		objectId,
		objectName,
	});
}

function counselContext(
	civilization: CivilizationState,
	citizenId: string,
	authorityStateHash: string,
): GeneratedCounselContext {
	const citizen = civilization.citizens[citizenId];
	const mind = civilization.minds[citizenId]?.snapshot;
	if (citizen === undefined || mind === undefined)
		sponsorFail("NO_COUNSEL_CONTEXT");
	const toma = Object.values(civilization.citizens).find(
		(candidate) => candidate.name === "Toma Reed",
	);
	const maraToma = Object.values(civilization.relationships).find(
		(relationship) =>
			toma !== undefined &&
			((relationship.fromCitizenId === citizenId &&
				relationship.toCitizenId === toma.citizenId) ||
				(relationship.toCitizenId === citizenId &&
					relationship.fromCitizenId === toma.citizenId)),
	);
	const evidence = mind.records.filter(
		(record) => record.kind !== "message-claim",
	);
	const allegation = mind.records.find(
		(record) => record.kind === "message-claim",
	);
	const planStep = mind.standingPlan.steps.find(
		(step) => step.stepId === mind.standingPlan.currentStepId,
	);
	const settlementStocks = Object.values(civilization.stocks).filter(
		(stock) =>
			stock.owner.kind === "settlement" &&
			stock.owner.settlementId === citizen.settlementId,
	);
	const recordedUnits = settlementStocks.reduce(
		(total, stock) => total + stock.quantity,
		0,
	);
	return Object.freeze({
		authorityStateHash,
		citizenName: citizen.name,
		fact: `Reality records ${String(recordedUnits)} resource units across ${String(settlementStocks.length)} settlement-owned stocks; it does not record theft.`,
		belief:
			evidence[0]?.proposition ??
			`${citizen.name} has no recorded reserve-mismatch observation or belief in the current authoritative Mind.`,
		allegation:
			allegation?.proposition ??
			`No allegation against ${toma?.name ?? "Toma"} is recorded at this boundary.`,
		values: mind.values.map(({ valueId }) => readable(valueId)),
		relationship:
			maraToma === undefined
				? `Current Reality records no direct ${citizen.name}–${toma?.name ?? "Toma"} relationship.`
				: `${citizen.name} and ${toma?.name ?? "Toma"}: trust ${String(maraToma.trustBasisPoints)} / 10,000; strain ${String(maraToma.strainBasisPoints)} / 10,000.`,
		standingPlan: `${readable(mind.standingPlan.goalType)} — ${readable(planStep?.kind ?? mind.standingPlan.currentStepId)} (${mind.standingPlan.status}).`,
		uncertainty:
			evidence.length === 0
				? "The current record does not establish a ledger mismatch, a sealed-reserve motive, or wrongdoing."
				: "The recorded evidence does not establish another citizen's motive or wrongdoing.",
		verifyStake:
			"A private inspection can add sourced reserve evidence, but it delays a public conclusion.",
		accuseStake:
			"A public allegation can prompt scrutiny, but it can strain the relationship and remains an allegation until verified.",
		abstainStake:
			"No counsel enters Mara's decision. Her active Standing Plan continues without sponsor causal credit.",
	});
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
		sponsorFail("INVALID_CHRONICLE_RANGE");
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
	if (baseSnapshotId === undefined) sponsorFail("INVALID_CHRONICLE_SNAPSHOT");
	return baseSnapshotId;
}

export function assertGeneratedSponsorBoundaryAdmission(input: {
	readonly step: GeneratedSponsorInput["step"];
	readonly expectedAuthorityStateHash?: string;
	readonly actualAuthorityStateHash: string;
	readonly hasPriorAbstention: boolean;
}): void {
	if (
		input.step !== "establish" &&
		input.step !== "resolve" &&
		input.expectedAuthorityStateHash !== input.actualAuthorityStateHash
	)
		sponsorFail("CURRENT_CONTEXT_MISMATCH");
	if (
		input.hasPriorAbstention &&
		(input.step === "counsel" || input.step === "resolve")
	)
		sponsorFail("BOUNDARY_CLOSED_AFTER_ABSTENTION");
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
		factory: input.indexedDbFactory,
		databaseName: input.databaseName,
	});
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	try {
		return await port.session(scope, async () =>
			sponsorGeneratedCitizenInValidatedSession(input, port, scope),
		);
	} finally {
		port.close();
	}
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
	if (initialReplay.state.civilization === null) sponsorFail("NO_CIVILIZATION");
	const initialCivilization = initialReplay.state
		.civilization as unknown as CivilizationState;
	const priorAbstention = Object.values(
		initialCivilization.patronAbstentions,
	).find((abstention) => abstention.citizenId === input.citizenId);
	assertGeneratedSponsorBoundaryAdmission({
		step: input.step,
		...(input.expectedAuthorityStateHash === undefined
			? {}
			: { expectedAuthorityStateHash: input.expectedAuthorityStateHash }),
		actualAuthorityStateHash: initialReplay.stateHash,
		hasPriorAbstention: priorAbstention !== undefined,
	});
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
		sponsorFail("UNRESOLVED_COUNSEL_MISMATCH");
	const intent = unresolved?.intent ?? input.intent ?? "verify-reserve";
	const interventionId = `intervention:${input.citizenId}:${intent}`;
	if (input.step === "resolve" && unresolved?.interventionId !== interventionId)
		sponsorFail("NO_UNRESOLVED_COUNSEL");
	const decisionId = `decision:${scope.runId}:${input.regionId}:${interventionId}`;
	const proposalId = `proposal:${scope.runId}:${input.regionId}:${interventionId}`;
	let allIdempotent = true;

	const commit = async (
		commandId: string,
		payloadInput:
			| Exclude<SponsorPayload, { readonly kind: "ResolveCounsel" }>
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
		if (replay.state.civilization === null) sponsorFail("NO_CIVILIZATION");
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
				sponsorFail("IDEMPOTENCY_COLLISION");
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
			if (context === null) sponsorFail("NO_DECISION_CONTEXT");
			const chosen = await standardBrain(context, {
				proposalId: payloadInput.proposalId,
				prngState: await seedPrng(
					bytesFromHex(context.contextHash, 32),
					"civilization-sponsor",
					payloadInput.citizenId,
					payloadInput.decisionId,
				),
			});
			const action:
				| "verify-reserve"
				| "accuse-publicly"
				| "follow-plan"
				| null =
				chosen.proposal.action.kind === "VerifyReserve"
					? "verify-reserve"
					: chosen.proposal.action.kind === "AccusePublicly"
						? "accuse-publicly"
						: chosen.proposal.action.kind === "FollowStandingPlan"
							? "follow-plan"
							: null;
			if (action === null) sponsorFail("UNSUPPORTED_BRAIN_ACTION");
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
			principal:
				payloadInput.kind === "derive-resolution"
					? { kind: "citizen", principalId: payloadInput.citizenId }
					: {
							kind: "patron",
							principalId: "patron:local",
							beneficiaryCitizenId: input.citizenId,
						},
			runId: scope.runId,
			regionId: scope.regionId,
			payload,
		};
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
			resolution,
		});
		if (!transition.accepted || transition.events[0] === undefined) {
			const rejection = await createCivilizationSponsorRejectionAppend({
				state: replay.state,
				head,
				commandReceipt: transition.receipt,
				decisionRecord: transition.committedDecisionRecord,
			});
			await port.recordRejectedCommand(rejection.request);
			sponsorFail(
				`COMMAND_REJECTED:${String(transition.receipt.rejectionCode)}`,
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
		return transition.postState;
	};

	{
		let finalCivilization = await commit(`sponsor:${input.citizenId}`, {
			kind: "EstablishSponsorship",
			covenantId,
			citizenId: input.citizenId,
		});
		if (input.step === "abstain") {
			const day = String(initialReplay.state.scheduler.completedDay);
			const abstentionId = `abstention:${input.citizenId}:${day}`;
			finalCivilization = await commit(`abstain:${input.citizenId}:${day}`, {
				kind: "RecordPatronAbstention",
				abstentionId,
				citizenId: input.citizenId,
				reason: "withhold-counsel",
			});
		}
		if (input.step === "counsel" || input.step === "resolve") {
			finalCivilization = await commit(`counsel:${input.citizenId}:${intent}`, {
				kind: "IssueCounsel",
				interventionId,
				citizenId: input.citizenId,
				intent,
			});
		}
		if (input.step === "resolve") {
			finalCivilization = await commit(
				`resolve:${input.citizenId}:${intent}:1`,
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
		if (covenant === undefined) sponsorFail("COVENANT_MISSING");
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
			sponsorFail("REPLAY_STATE_MISMATCH");
		const durableSponsorEvents: CivilizationSponsorEventEnvelope[] = [];
		const durableOuterEvents: DurableEvent[] = [];
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
			durableOuterEvents.push(outer);
			if (outer.eventType === "CivilizationCounselBoundaryCommitted") {
				const payload = outer.payload as {
					readonly fact?: CivilizationCounselBoundaryFact;
				};
				const fact = payload.fact;
				const interpretationLink =
					fact?.causalRelation === "contributing-condition"
						? outer.causalParents.find(
								(parent) =>
									parent.eventId === fact.interpretationEventId &&
									parent.relation === "contributing" &&
									parent.mechanismId ===
										"civilization.scheduler.counsel-boundary.v1",
							)
						: outer.relatedEvents.find(
								(related) =>
									related.eventId === fact?.interpretationEventId &&
									related.relation === "temporal-predecessor",
							);
				if (fact === undefined || interpretationLink === undefined)
					sponsorFail("BOUNDARY_CAUSAL_BINDING");
				const stored = await port.getAppendReceipt(scope, outer.appendId);
				if (stored === null) sponsorFail("BOUNDARY_RECEIPT_MISSING");
				durableBoundaries.push({
					eventId: outer.eventId,
					parentEventIds: [
						...outer.causalParents.map(({ eventId }) => eventId),
						...outer.relatedEvents.map(({ eventId }) => eventId),
					],
					createdRevision: stored.revision,
					visibility:
						outer.visibility as CivilizationSponsorEventEnvelope["visibility"],
					fact,
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
				sponsorFail("SPONSOR_RECEIPT_REVISION");
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
		const hasDurableAbstention = Object.values(
			finalCivilization.patronAbstentions,
		).some((abstention) => abstention.citizenId === input.citizenId);
		const phase = activeUnresolved
			? ("counseled" as const)
			: resolution != null
				? ("resolved" as const)
				: hasDurableAbstention
					? ("abstained" as const)
					: ("sponsored" as const);
		const context = counselContext(
			finalCivilization,
			input.citizenId,
			finalReplay.stateHash,
		);
		const eventAuthorityStates = new Map<
			string,
			Readonly<{
				event: DurableEvent;
				civilization: CivilizationState;
				world: GeneratedWorldState;
			}>
		>();
		await Promise.all(
			durableOuterEvents.map(async (event) => {
				const replay = await replayCivilizationHistory(port, {
					...scope,
					snapshotId: chronicleBaseSnapshot.snapshotId,
					toSequenceExclusive: event.sequence + 1,
				});
				if (replay.state.civilization === null)
					sponsorFail("EVENT_CONTEXT_CIVILIZATION");
				const authority = Object.freeze({
					event,
					civilization: replay.state
						.civilization as unknown as CivilizationState,
					world: replay.state.world as unknown as GeneratedWorldState,
				});
				eventAuthorityStates.set(event.eventId, authority);
				if (event.eventType === "CivilizationSponsorCommandCommitted") {
					const protocolEvent = (
						event.payload as {
							readonly protocolEvent?: CivilizationSponsorEventEnvelope;
						}
					).protocolEvent;
					if (protocolEvent !== undefined)
						eventAuthorityStates.set(protocolEvent.eventId, authority);
				}
			}),
		);
		const chronicleBeats = chronicle.beats.map((beat) => ({
			...beat,
			context:
				beat.evidenceEventIds
					.map((eventId) => {
						const authority = eventAuthorityStates.get(eventId);
						return authority === undefined
							? null
							: chronicleEventContext({ eventId, ...authority });
					})
					.find((candidate) => candidate !== null) ?? null,
		}));
		const latestBoundary = [...durableBoundaries].sort(
			(left, right) => right.createdRevision - left.createdRevision,
		)[0]?.fact;
		const focalCitizen = finalCivilization.citizens[input.citizenId]!;
		const targetCitizenId =
			latestBoundary?.effect.kind === "public-allegation"
				? latestBoundary.effect.targetCitizenId
				: null;
		const eventContext = [...chronicleBeats]
			.reverse()
			.find(({ context: beatContext }) => beatContext !== null)?.context;
		const nextAction: GeneratedBranchNextAction | null =
			phase === "abstained"
				? {
						id: "observe",
						label: "Observe Mara's independent plan",
						description:
							"Return to Mara without adding counsel to the closed boundary.",
						focus: { kind: "citizen", citizenId: input.citizenId },
					}
				: phase !== "resolved"
					? null
					: latestBoundary?.effect.kind === "public-allegation" &&
							targetCitizenId !== null
						? {
								id: "repair-relationship",
								label: `Return to ${finalCivilization.citizens[targetCitizenId]?.name ?? readable(targetCitizenId)} after the allegation`,
								description:
									"The public allegation strained this recorded relationship; the opposite first-boundary counsel is no longer available.",
								focus: { kind: "citizen", citizenId: targetCitizenId },
							}
						: latestBoundary?.effect.kind === "reserve-inspection" &&
								eventContext?.objectId !== null &&
								eventContext?.objectId !== undefined
							? {
									id: "investigate-uncertainty",
									label: "Inspect the verified reserve context",
									description:
										"The reserve count is recorded; motive and wrongdoing remain unproven.",
									focus: {
										kind: "object",
										objectId: eventContext.objectId,
									},
								}
							: {
									id: "observe",
									label: "Observe the consequence in Mara's context",
									description:
										"No second first-boundary counsel is legal after this history.",
									focus:
										eventContext?.locationId === null ||
										eventContext?.locationId === undefined
											? {
													kind: "citizen",
													citizenId: focalCitizen.citizenId,
												}
											: {
													kind: "location",
													locationId: eventContext.locationId,
												},
								};
		return {
			idempotent: allIdempotent,
			chronicleTrace:
				chronicle.storyCard ||
				(input.step !== "establish"
					? "Counsel already recorded."
					: "Sponsorship already recorded."),
			authorityStateHash: finalReplay.stateHash,
			phase,
			activeIntent: activeUnresolved?.intent ?? selectedCounsel?.intent ?? null,
			shareArtifact:
				phase === "resolved" || phase === "abstained"
					? chronicle.storyCard
					: null,
			counselContext: context,
			nextAction,
			chronicleBeats,
		};
	}
}

/** Resolves an event-only URL against accepted local authority without writes. */
export async function loadGeneratedChronicleEventFocus(input: {
	readonly eventId: string;
	readonly regionId: string;
	readonly databaseName: string;
	readonly indexedDbFactory?: IDBFactory;
}): Promise<GeneratedChronicleEventContext | null> {
	const port = await BrowserVersionedPersistence.open({
		factory: input.indexedDbFactory,
		databaseName: input.databaseName,
	});
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	try {
		return await port.session(scope, async () => {
			const [head, snapshot] = await Promise.all([
				port.loadHead(scope),
				port.loadLatestSnapshot(scope),
			]);
			const baseId = generatedSponsorChronicleBaseSnapshotId(
				snapshot.snapshotId,
			);
			const base =
				baseId === snapshot.snapshotId
					? snapshot
					: await port.loadSnapshot(scope, baseId);
			const events = await port.getEventRange({
				...scope,
				...generatedSponsorChronicleRange({
					snapshotBaseSequence: base.baseSequence,
					durableLastSequence: head.lastSequence,
				}),
			});
			const event = durableEventForEvidence(events, input.eventId);
			if (event === undefined) return null;
			const replay = await replayCivilizationHistory(port, {
				...scope,
				snapshotId: base.snapshotId,
				toSequenceExclusive: event.sequence + 1,
			});
			if (replay.state.civilization === null) return null;
			return chronicleEventContext({
				eventId: input.eventId,
				event,
				civilization: replay.state.civilization as unknown as CivilizationState,
				world: replay.state.world as unknown as GeneratedWorldState,
			});
		});
	} finally {
		port.close();
	}
}
