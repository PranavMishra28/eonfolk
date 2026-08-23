import { describe, expect, it } from "vitest";
import {
	advanceGeneralizedScheduler,
	deriveCivilizationSchedulerPolicy,
	projectCivilizationScheduledActivities,
	runCivilizationExperiment,
	type CivilizationState,
} from "../../../packages/civilization/src/index.js";
import {
	buildCivilizationCounselDecisionContext,
	createCivilizationSponsorSnapshotBoundary,
	prepareCivilizationSponsorTransition,
	type ValidatedStandardBrainResolution,
} from "../../../packages/civilization/src/sponsor.js";
import {
	createCognitiveDecisionRecord,
	standardBrain,
} from "../../../packages/cognition/src/index.js";
import {
	createAuthorityEvent,
	hashAuthoritativeState,
	MemoryVersionedPersistence,
	persistCivilizationHistory,
	reduceCivilizationAuthorityEvent,
	replayCivilizationHistory,
	type VersionedCrashPoint,
} from "../../../packages/persistence/src/index.js";
import {
	createCivilizationCounselBoundaryAppend,
	createCivilizationSponsorAuthorityAppend,
	createCivilizationSponsorRejectionAppend,
} from "../../../packages/persistence/src/civilization-sponsor.js";
import {
	createReleaseGenesis,
	bytesFromHex,
	decisionRecordHash,
	type GeneratedWorldState,
	payloadFingerprint,
	PROTOCOL_SCHEMA_VERSION,
	seedPrng,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const seed = "64".repeat(32);

class OneShotCrash {
	point: VersionedCrashPoint | null = null;
	hit(point: VersionedCrashPoint): void {
		if (point !== this.point) return;
		this.point = null;
		throw new Error(`crash:${point}`);
	}
}

async function fixture(crash?: OneShotCrash) {
	const release = await createReleaseGenesis({
		releaseId: "sponsor-authority",
		seedHex: seed,
	});
	const world = await generateWorld({ releaseGenesis: release });
	const checkpoint = await runCivilizationExperiment({ world, horizonDays: 1 });
	const runId = "sponsor-authority-run";
	const regionId = Object.keys(world.regions).sort()[0]!;
	const port = new MemoryVersionedPersistence(
		crash === undefined ? {} : { crashInjector: crash },
	);
	const persisted = await persistCivilizationHistory(port, {
		runId,
		regionId,
		genesisId: "sponsor-authority-genesis",
		genesisWorld: world,
		checkpoints: [checkpoint],
		snapshotId: "sponsor-authority",
	});
	const replay = await replayCivilizationHistory(port, {
		runId,
		regionId,
		snapshotId: persisted.snapshot.snapshotId,
		toSequenceExclusive: persisted.head.lastSequence + 1,
	});
	const civilization = replay.state
		.civilization as unknown as CivilizationState;
	const citizenId = Object.values(civilization.minds)
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
		.find((mind) => {
			const citizen = civilization.citizens[mind.citizenId];
			return mind.snapshot.relationships.some(
				(relationship) =>
					civilization.citizens[relationship.toCitizenId]?.residenceState ===
						"resident" &&
					civilization.citizens[relationship.toCitizenId]?.settlementId ===
						citizen?.settlementId &&
					civilization.citizens[relationship.toCitizenId]?.siteId ===
						citizen?.siteId,
			);
		})?.citizenId;
	if (citizenId === undefined)
		throw new Error("fixture has no locally counsel-capable citizen");
	const payload = {
		kind: "EstablishSponsorship" as const,
		covenantId: `covenant:${citizenId}`,
		citizenId,
	};
	const command = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId: `sponsor:${citizenId}`,
		payloadFingerprint: await payloadFingerprint(payload),
		expectedRevision: civilization.revision,
		principal: {
			kind: "patron" as const,
			principalId: "patron:local",
			beneficiaryCitizenId: citizenId,
		},
		runId,
		regionId,
		payload,
	};
	const transition = await prepareCivilizationSponsorTransition({
		state: civilization,
		runId,
		regionId,
		priorWorldHeadHash: persisted.head.lastEventHash,
		nextSequence: persisted.head.lastSequence + 1,
		snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
			snapshotId: persisted.snapshot.snapshotId,
			runId,
			regionId,
			stateHash: await stateHash(civilization),
			revision: civilization.revision,
			simulationTime: civilization.simulationTime,
			nextSequence: persisted.head.lastSequence + 1,
			baseWorldHeadHash: persisted.head.lastEventHash,
		}),
		authoritativeHeaders: [],
		fencingToken: persisted.head.fencingToken,
		command,
		authoritativeHistory: [],
	});
	if (!transition.accepted || transition.events[0] === undefined)
		throw new Error("fixture sponsorship rejected");
	const append = await createCivilizationSponsorAuthorityAppend({
		state: replay.state,
		head: persisted.head,
		protocolEvent: transition.events[0],
		commandReceipt: transition.receipt,
		decisionRecord: transition.committedDecisionRecord,
	});
	return { port, persisted, append, citizenId, transition, runId, regionId };
}

async function appendCounselCommand(
	value: Awaited<ReturnType<typeof fixture>>,
	input:
		| { readonly kind: "issue"; readonly interventionId: string }
		| { readonly kind: "resolve"; readonly interventionId: string },
) {
	const head = await value.port.loadHead({
		runId: value.runId,
		regionId: value.regionId,
	});
	const replay = await replayCivilizationHistory(value.port, {
		runId: value.runId,
		regionId: value.regionId,
		snapshotId: value.persisted.snapshot.snapshotId,
		toSequenceExclusive: head.lastSequence + 1,
	});
	const state = replay.state.civilization as unknown as CivilizationState;
	const decisionId = `decision:${input.interventionId}`;
	const proposalId = `proposal:${input.interventionId}`;
	let payload:
		| {
				readonly kind: "IssueCounsel";
				readonly interventionId: string;
				readonly citizenId: string;
				readonly intent: "verify-reserve";
		  }
		| {
				readonly kind: "ResolveCounsel";
				readonly citizenId: string;
				readonly interventionId: string;
				readonly decisionId: string;
				readonly proposalId: string;
				readonly action: "verify-reserve" | "accuse-publicly" | "follow-plan";
		  } =
		input.kind === "issue"
			? ({
					kind: "IssueCounsel",
					interventionId: input.interventionId,
					citizenId: value.citizenId,
					intent: "verify-reserve",
				} as const)
			: ({
					kind: "ResolveCounsel",
					citizenId: value.citizenId,
					interventionId: input.interventionId,
					decisionId,
					proposalId,
					action: "follow-plan",
				} as const);
	const commandId = `${input.kind}:${input.interventionId}`;
	let resolution: ValidatedStandardBrainResolution | undefined;
	if (input.kind === "resolve") {
		const context = await buildCivilizationCounselDecisionContext({
			state,
			runId: value.runId,
			regionId: value.regionId,
			citizenId: value.citizenId,
			interventionId: input.interventionId,
			decisionId,
		});
		if (context === null) throw new Error("missing test counsel context");
		const chosen = await standardBrain(context, {
			proposalId,
			prngState: await seedPrng(
				bytesFromHex(context.contextHash, 32),
				"civilization-sponsor-test",
				value.citizenId,
				decisionId,
			),
		});
		payload = {
			kind: "ResolveCounsel",
			citizenId: value.citizenId,
			interventionId: input.interventionId,
			decisionId,
			proposalId,
			action:
				chosen.proposal.action.kind === "VerifyReserve"
					? "verify-reserve"
					: chosen.proposal.action.kind === "AccusePublicly"
						? "accuse-publicly"
						: "follow-plan",
		};
		resolution = {
			decisionId,
			context,
			proposal: chosen.proposal,
			decisionRecord: await createCognitiveDecisionRecord({
				decisionId,
				decisionBoundaryId: `boundary:${decisionId}`,
				wholePreStateHash: await stateHash(state),
				context,
				proposal: chosen.proposal,
				failureCode: null,
				validator: {
					stage: "authorization",
					outcome: "accepted",
					reason: "test Application validated Standard Brain",
				},
				proposedCommandId: commandId,
				receiptRef: null,
				acceptedEventInterval: null,
			}),
		};
	}
	const command = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId,
		payloadFingerprint: await payloadFingerprint(payload),
		expectedRevision: state.revision,
		principal:
			input.kind === "issue"
				? ({
						kind: "patron",
						principalId: "patron:local",
						beneficiaryCitizenId: value.citizenId,
					} as const)
				: ({ kind: "citizen", principalId: value.citizenId } as const),
		runId: value.runId,
		regionId: value.regionId,
		payload,
	};
	const transition = await prepareCivilizationSponsorTransition({
		state,
		runId: value.runId,
		regionId: value.regionId,
		priorWorldHeadHash: head.lastEventHash,
		nextSequence: head.lastSequence + 1,
		snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
			snapshotId: value.persisted.snapshot.snapshotId,
			runId: value.runId,
			regionId: value.regionId,
			stateHash: await stateHash(state),
			revision: state.revision,
			simulationTime: state.simulationTime,
			nextSequence: head.lastSequence + 1,
			baseWorldHeadHash: head.lastEventHash,
		}),
		authoritativeHeaders: [],
		fencingToken: head.fencingToken,
		command,
		authoritativeHistory: [],
		...(resolution === undefined ? {} : { resolution }),
	});
	if (!transition.accepted || transition.events[0] === undefined)
		throw new Error(`${input.kind} transition rejected`);
	const append = await createCivilizationSponsorAuthorityAppend({
		state: replay.state,
		head,
		protocolEvent: transition.events[0],
		commandReceipt: transition.receipt,
		decisionRecord: transition.committedDecisionRecord,
	});
	const committed = await value.port.appendEventBatch(append.request);
	return { transition, append, committed };
}

describe("unified civilization sponsor authority", () => {
	it("atomically appends, reloads, replays, and exactly retries a sponsor command", async () => {
		const value = await fixture();
		const committed = await value.port.appendEventBatch(value.append.request);
		expect(committed.head.lastSequence).toBe(
			value.persisted.head.lastSequence + 1,
		);
		expect(committed.receipt.commandReceipt).toMatchObject({
			...value.transition.receipt,
			resultingWorldHeadHash: committed.head.lastEventHash,
		});
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		const state = replay.state.civilization as unknown as CivilizationState;
		expect(state.sponsorships[`covenant:${value.citizenId}`]).toBeDefined();
		expect(
			(await value.port.appendEventBatch(value.append.request)).idempotent,
		).toBe(true);
		await expect(
			value.port.appendEventBatch({
				...value.append.request,
				commandReceipt: {
					...(value.transition.receipt as unknown as Record<string, unknown>),
					payloadFingerprint: "f".repeat(64),
				} as never,
			}),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_COLLISION" });
	});

	it("atomically persists a rejected command without changing civilization", async () => {
		const value = await fixture();
		const rejectedReceipt = {
			...value.transition.receipt,
			commandId: "rejected:stale",
			outcome: "rejected" as const,
			eventInterval: null,
			rejectionCode: "STALE_REVISION" as const,
			resultingRevision: value.transition.priorState.revision,
			resultingWorldHeadHash: value.persisted.head.lastEventHash,
		};
		const append = await createCivilizationSponsorRejectionAppend({
			state: value.persisted.plan.finalState,
			head: value.persisted.head,
			commandReceipt: rejectedReceipt,
			decisionRecord: null,
		});
		const committed = await value.port.recordRejectedCommand(append.request);
		expect(committed.head).toEqual(value.persisted.head);
		expect(committed.receipt.fromSequenceInclusive).toBe(
			committed.receipt.toSequenceExclusive,
		);
		expect(committed.receipt.commandReceipt).toMatchObject({
			...rejectedReceipt,
			resultingWorldHeadHash: committed.head.lastEventHash,
		});
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		expect(replay.state.civilization).toEqual(
			value.persisted.plan.finalState.civilization,
		);
	});

	it("survives an after-commit crash without duplicating authority", async () => {
		const crash = new OneShotCrash();
		const value = await fixture(crash);
		crash.point = "authority-append:after-commit";
		await expect(
			value.port.appendEventBatch(value.append.request),
		).rejects.toThrow(/crash/u);
		const retried = await value.port.appendEventBatch(value.append.request);
		expect(retried.idempotent).toBe(true);
		expect(retried.head.lastSequence).toBe(
			value.persisted.head.lastSequence + 1,
		);
	});

	it("ignores a caller-forged post-state and derives authority from the event", async () => {
		const value = await fixture();
		const forged = {
			...value.transition.postState,
			citizens: {
				...value.transition.postState.citizens,
				[value.citizenId]: {
					...value.transition.postState.citizens[value.citizenId]!,
					name: "Forged name",
				},
			},
		};
		const append = await createCivilizationSponsorAuthorityAppend({
			state: value.persisted.plan.finalState,
			head: value.persisted.head,
			protocolEvent: value.transition.events[0],
			commandReceipt: value.transition.receipt,
			decisionRecord: value.transition.committedDecisionRecord,
			postCivilization: forged,
		} as Parameters<typeof createCivilizationSponsorAuthorityAppend>[0] & {
			postCivilization: CivilizationState;
		});
		expect(
			(append.state.civilization as unknown as CivilizationState).citizens[
				value.citizenId
			]?.name,
		).toBe(value.transition.priorState.citizens[value.citizenId]?.name);
		const committed = await value.port.appendEventBatch(append.request);
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		expect(
			(replay.state.civilization as unknown as CivilizationState).citizens[
				value.citizenId
			]?.name,
		).toBe(value.transition.priorState.citizens[value.citizenId]?.name);
	});

	it("rejects a hash-consistent forged sponsor patch through the generic authority port", async () => {
		const value = await fixture();
		const original = value.append.request.events[0]!;
		const canonicalPost = value.append.state
			.civilization as unknown as CivilizationState;
		const forgedCivilization = {
			...canonicalPost,
			citizens: {
				...canonicalPost.citizens,
				[value.citizenId]: {
					...canonicalPost.citizens[value.citizenId]!,
					name: "Hash-consistent forged name",
				},
			},
		};
		const forgedState = {
			...value.append.state,
			civilization: forgedCivilization,
		};
		const { eventHash: _eventHash, ...eventWithoutHash } = original;
		const forgedEvent = await createAuthorityEvent({
			...eventWithoutHash,
			postStateHash: await hashAuthoritativeState(forgedState as never),
			payload: {
				...(original.payload as Record<string, unknown>),
				patch: [
					{ op: "set", path: ["civilization"], value: forgedCivilization },
					{ op: "set", path: ["phase"], value: "active" },
				],
			} as never,
		});
		const request = {
			...value.append.request,
			events: [forgedEvent],
			commandReceipt: {
				...(value.append.request.commandReceipt as Record<string, unknown>),
				resultingWorldHeadHash: forgedEvent.eventHash,
			},
		};
		const committed = await value.port.appendEventBatch(request as never);
		await expect(
			replayCivilizationHistory(value.port, {
				runId: value.runId,
				regionId: value.regionId,
				snapshotId: value.persisted.snapshot.snapshotId,
				toSequenceExclusive: committed.head.lastSequence + 1,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});

	it("rejects a sponsor envelope with an extra payload field before persistence", async () => {
		const value = await fixture();
		const event = value.transition.events[0]!;
		await expect(
			createCivilizationSponsorAuthorityAppend({
				state: value.persisted.plan.finalState,
				head: value.persisted.head,
				protocolEvent: {
					...event,
					eventPayload: { ...event.eventPayload, injected: true },
				},
				commandReceipt: value.transition.receipt,
				decisionRecord: value.transition.committedDecisionRecord,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});

	it("rejects a schema-inexact command receipt before persistence", async () => {
		const value = await fixture();
		await expect(
			createCivilizationSponsorAuthorityAppend({
				state: value.persisted.plan.finalState,
				head: value.persisted.head,
				protocolEvent: value.transition.events[0],
				commandReceipt: { ...value.transition.receipt, injected: true },
				decisionRecord: null,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});

	it("executes, binds, and replays a counsel-caused routine reassignment at a later scheduler boundary", async () => {
		const value = await fixture();
		await value.port.appendEventBatch(value.append.request);
		const interventionId = `intervention:${value.citizenId}:needs`;
		await appendCounselCommand(value, { kind: "issue", interventionId });
		const resolved = await appendCounselCommand(value, {
			kind: "resolve",
			interventionId,
		});
		const head = resolved.committed.head;
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: head.lastSequence + 1,
		});
		const boundary = await createCivilizationCounselBoundaryAppend({
			state: replay.state,
			head,
			citizenId: value.citizenId,
			interventionId,
		});
		const beforeBoundary = replay.state
			.civilization as unknown as CivilizationState;
		const activePlan =
			beforeBoundary.minds[value.citizenId]?.snapshot.standingPlan;
		expect(activePlan).toMatchObject({
			citizenId: value.citizenId,
			goalType: "routine:transport",
			status: "active",
			targetIds: ["lane-building-timber"],
		});
		expect(activePlan!.startBoundary).toBeLessThanOrEqual(
			beforeBoundary.simulationTime,
		);
		expect(activePlan!.expiryBoundary).toBeGreaterThanOrEqual(
			beforeBoundary.simulationTime,
		);
		const abstention = advanceGeneralizedScheduler(
			beforeBoundary,
			deriveCivilizationSchedulerPolicy(
				replay.state.world as unknown as GeneratedWorldState,
			),
			[],
		);
		const selected = boundary.state
			.civilization as unknown as CivilizationState;
		const selectedActivities = boundary.state.scheduler
			.activities as unknown as readonly {
			readonly citizenId: string;
			readonly routine: { readonly kind: string };
		}[];
		const abstentionActivities = projectCivilizationScheduledActivities({
			state: abstention.state,
			world: replay.state.world as unknown as GeneratedWorldState,
			routines: abstention.routines,
		});
		expect(resolved.transition.events[0]!.eventPayload).toMatchObject({
			action: "verify-reserve",
			disposition: "accepted",
		});
		expect(boundary.fact).toMatchObject({
			causalRelation: "contributing-condition",
			consequenceKind: "routine-reassigned",
			planRoutineKind: "transport",
			planRoutineSubjectId: "lane-building-timber",
			routineKind: "social-maintenance",
		});
		expect(
			selectedActivities.find(
				(activity) => activity.citizenId === value.citizenId,
			)?.routine.kind,
		).toBe("social-maintenance");
		expect(
			abstentionActivities.find(
				(activity) => activity.citizenId === value.citizenId,
			)?.routine.kind,
		).toBe("transport");
		expect(selected.stocks["stock-source-standing-timber"]?.quantity).toBe(512);
		expect(
			abstention.state.stocks["stock-source-standing-timber"]?.quantity,
		).toBe(504);
		expect(
			Object.values(selected.processes).some(
				(process) =>
					process.processId === "scheduled:job-building-timber:172800",
			),
		).toBe(false);
		expect(
			Object.values(abstention.state.processes).some(
				(process) =>
					process.processId === "scheduled:job-building-timber:172800",
			),
		).toBe(true);
		expect(boundary.fact).toMatchObject({
			citizenId: value.citizenId,
			interpretationEventId: resolved.transition.events[0]!.eventId,
			requiredNeedUnits: 7,
		});
		const original = boundary.request.events[0]!;
		const { eventHash: _eventHash, ...eventWithoutHash } = original;
		const swapped = await createAuthorityEvent({
			...eventWithoutHash,
			causalParents: [
				{
					eventId: value.transition.events[0]!.eventId,
					relation: "contributing-condition",
				},
			],
		});
		await expect(
			reduceCivilizationAuthorityEvent(replay.state, swapped),
		).rejects.toThrow(/CIVP/u);
		const committed = await value.port.appendEventBatch(boundary.request);
		expect(committed.head.simulationTime).toBe(2 * 86_400);
		const reloaded = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		expect(
			(reloaded.state.civilization as unknown as CivilizationState)
				.simulationTime,
		).toBe(2 * 86_400);
		expect(
			(await value.port.appendEventBatch(boundary.request)).idempotent,
		).toBe(true);
	});

	it("rejects a rehashed substituted cognition record during authority replay", async () => {
		const value = await fixture();
		await value.port.appendEventBatch(value.append.request);
		const interventionId = `intervention:${value.citizenId}:tamper`;
		await appendCounselCommand(value, { kind: "issue", interventionId });
		const resolved = await appendCounselCommand(value, {
			kind: "resolve",
			interventionId,
		});
		const record = resolved.transition.committedDecisionRecord!;
		const { decisionRecordHash: _recordHash, ...recordBody } = record;
		const tamperedBody = {
			...recordBody,
			explanation: {
				...record.explanation!,
				templateId: "forged-explanation-template",
			},
		};
		const tamperedRecord = {
			...tamperedBody,
			decisionRecordHash: await decisionRecordHash(tamperedBody),
		};
		const original = resolved.append.request.events[0]!;
		const { eventHash: _eventHash, ...eventWithoutHash } = original;
		const tamperedEvent = await createAuthorityEvent({
			...eventWithoutHash,
			payload: {
				...(original.payload as Record<string, unknown>),
				decisionRecord: tamperedRecord,
			} as never,
		});
		const preState = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: original.sequence,
		});
		await expect(
			reduceCivilizationAuthorityEvent(preState.state, tamperedEvent),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});
});
