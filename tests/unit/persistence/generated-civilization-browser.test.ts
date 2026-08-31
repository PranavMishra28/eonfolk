import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	assertGeneratedSponsorBoundaryAdmission,
	generatedSponsorChronicleBaseSnapshotId,
	generatedSponsorChronicleRange,
	playerFacingSponsorFailure,
} from "../../../apps/web/src/generated-sponsor-runtime.js";
import {
	FASTER_DAY_INTERVAL_MS,
	PLAY_DAY_INTERVAL_MS,
} from "../../../apps/web/src/play-clock.js";
import { BrowserVersionedPersistence } from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	advanceGeneratedCivilization,
	appendLiveGeneratedCivilizationDay,
	catchUpLiveGeneratedCivilizationDays,
	GENERATED_CIVILIZATION_CATCH_UP_HORIZONS,
	GENERATED_CIVILIZATION_OPERATION_LIMITS,
	GENERATED_CIVILIZATION_RUN_ID,
	migrateLegacyGeneratedCheckpoint,
	persistPreparedGeneratedCivilization,
	prepareGeneratedCivilization,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";
import {
	initializeV1Checkpoint,
	type V1CheckpointStoragePort,
	type V1PersistedCheckpoint,
} from "../../../apps/web/src/v1-indexeddb.js";
import {
	assertCivilizationInvariants,
	type CivilizationState,
	continueCivilizationExperimentDay,
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	runCivilizationExperiment,
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
	createCivilizationAbstentionBoundaryAppend,
	createCivilizationCounselBoundaryAppend,
	createCivilizationSponsorAuthorityAppend,
} from "../../../packages/persistence/src/civilization-sponsor.js";
import {
	MemoryVersionedPersistence,
	persistAuthorityCatchUp,
	replayCivilizationHistory,
	type VersionedPersistencePort,
} from "../../../packages/persistence/src/index.js";
import {
	bytesFromHex,
	createReleaseGenesis,
	PROTOCOL_SCHEMA_VERSION,
	payloadFingerprint,
	seedPrng,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

class LegacyMemoryPort implements V1CheckpointStoragePort {
	value: V1PersistedCheckpoint | null = null;

	async load(): Promise<unknown | null> {
		return this.value;
	}

	async compareAndSwap(input: {
		readonly expectedRecordHash: string | null;
		readonly next: V1PersistedCheckpoint;
	}): Promise<{ readonly idempotent: boolean }> {
		if (this.value?.recordHash === input.next.recordHash)
			return { idempotent: true };
		if ((this.value?.recordHash ?? null) !== input.expectedRecordHash)
			throw new Error("legacy test CAS conflict");
		this.value = input.next;
		return { idempotent: false };
	}
}

let world: Awaited<ReturnType<typeof generateWorld>>;

beforeAll(async () => {
	const genesis = await createReleaseGenesis({
		releaseId: "generated-persistence-test",
		seedHex: "e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a",
	});
	world = await generateWorld({
		releaseGenesis: genesis,
		worldId: "generated-persistence-world",
		treatmentId: "standard-brain",
	});
});

function generatedAuthorityScope() {
	return {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: world.identity.worldId,
	};
}

async function persistGeneratedOrigin() {
	const prepared = await prepareGeneratedCivilization({
		genesisWorld: world,
		targetHorizonDays: 1,
	});
	const port = new MemoryVersionedPersistence();
	await persistPreparedGeneratedCivilization({ port, prepared });
	return port;
}

async function loadGeneratedAuthority(port: MemoryVersionedPersistence) {
	const scope = generatedAuthorityScope();
	const head = await port.loadHead(scope);
	const snapshot = await port.loadLatestSnapshot(scope);
	const replay = await replayCivilizationHistory(port, {
		...scope,
		snapshotId: snapshot.snapshotId,
		toSequenceExclusive: head.lastSequence + 1,
	});
	return { scope, head, snapshot, replay };
}

function sponsoredCivilization(replay: {
	readonly state: { readonly civilization: unknown };
}): CivilizationState {
	const civilization = replay.state.civilization as CivilizationState | null;
	if (civilization === null) throw new Error("generated civilization missing");
	assertCivilizationInvariants(civilization);
	return civilization;
}

async function appendGeneratedSponsorCommand(
	port: MemoryVersionedPersistence,
	input:
		| { readonly kind: "establish" }
		| { readonly kind: "abstain"; readonly abstentionId: string }
		| {
				readonly kind: "issue";
				readonly interventionId: string;
				readonly intent?: "verify-reserve";
		  }
		| { readonly kind: "resolve"; readonly interventionId: string },
) {
	const { scope, head, snapshot, replay } = await loadGeneratedAuthority(port);
	const state = sponsoredCivilization(replay);
	const citizenId = RELEASE_GENESIS_MARA_CITIZEN_ID;
	const citizen = state.citizens[citizenId];
	const mind = state.minds[citizenId];
	const counselCapable = mind?.snapshot.relationships.some((relationship) => {
		const target = state.citizens[relationship.toCitizenId];
		return (
			target?.residenceState === "resident" &&
			target.settlementId === citizen?.settlementId &&
			target.siteId === citizen.siteId
		);
	});
	if (citizen?.residenceState !== "resident" || !counselCapable)
		throw new Error("canonical Mara fixture is not locally counsel-capable");
	const operationId =
		input.kind === "establish"
			? citizenId
			: input.kind === "abstain"
				? input.abstentionId
				: input.interventionId;
	const decisionId = `decision:${operationId}`;
	const proposalId = `proposal:${operationId}`;
	let payload:
		| {
				readonly kind: "EstablishSponsorship";
				readonly covenantId: string;
				readonly citizenId: string;
		  }
		| {
				readonly kind: "RecordPatronAbstention";
				readonly abstentionId: string;
				readonly citizenId: string;
				readonly reason: "withhold-counsel";
		  }
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
		input.kind === "establish"
			? {
					kind: "EstablishSponsorship",
					covenantId: `covenant:${citizenId}`,
					citizenId,
				}
			: input.kind === "abstain"
				? {
						kind: "RecordPatronAbstention",
						abstentionId: input.abstentionId,
						citizenId,
						reason: "withhold-counsel",
					}
				: input.kind === "issue"
					? {
							kind: "IssueCounsel",
							interventionId: input.interventionId,
							citizenId,
							intent: input.intent ?? "verify-reserve",
						}
					: {
							kind: "ResolveCounsel",
							citizenId,
							interventionId: input.interventionId,
							decisionId,
							proposalId,
							action: "follow-plan",
						};
	let resolution: ValidatedStandardBrainResolution | undefined;
	if (input.kind === "resolve") {
		const context = await buildCivilizationCounselDecisionContext({
			state,
			runId: scope.runId,
			regionId: scope.regionId,
			citizenId,
			interventionId: input.interventionId,
			decisionId,
		});
		if (context === null) throw new Error("missing test counsel context");
		const chosen = await standardBrain(context, {
			proposalId,
			prngState: await seedPrng(
				bytesFromHex(context.contextHash, 32),
				"civilization-sponsor-test",
				citizenId,
				decisionId,
			),
		});
		payload = {
			kind: "ResolveCounsel",
			citizenId,
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
				proposedCommandId: `${input.kind}:${operationId}`,
				receiptRef: null,
				acceptedEventInterval: null,
			}),
		};
	}
	const command = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId: `${input.kind}:${operationId}`,
		payloadFingerprint: await payloadFingerprint(payload),
		expectedRevision: state.revision,
		principal:
			input.kind === "establish" ||
			input.kind === "issue" ||
			input.kind === "abstain"
				? ({
						kind: "patron" as const,
						principalId: "patron:local",
						beneficiaryCitizenId: citizenId,
					} as const)
				: ({ kind: "citizen" as const, principalId: citizenId } as const),
		runId: scope.runId,
		regionId: scope.regionId,
		payload,
	};
	const transition = await prepareCivilizationSponsorTransition({
		state,
		runId: scope.runId,
		regionId: scope.regionId,
		priorWorldHeadHash: head.lastEventHash,
		nextSequence: head.lastSequence + 1,
		snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
			snapshotId: snapshot.snapshotId,
			runId: scope.runId,
			regionId: scope.regionId,
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
	const committed = await port.appendEventBatch(append.request);
	return { transition, append, committed };
}

describe("generated sponsor Chronicle event range", () => {
	it("admits first-boundary actions only against current context and never after abstention", () => {
		expect(() =>
			assertGeneratedSponsorBoundaryAdmission({
				step: "counsel",
				expectedAuthorityStateHash: "head-a",
				actualAuthorityStateHash: "head-b",
				hasPriorAbstention: false,
			}),
		).toThrow("SP:CURRENT_CONTEXT_MISMATCH");
		expect(() =>
			assertGeneratedSponsorBoundaryAdmission({
				step: "counsel",
				expectedAuthorityStateHash: "head-b",
				actualAuthorityStateHash: "head-b",
				hasPriorAbstention: true,
			}),
		).toThrow("SP:BOUNDARY_CLOSED_AFTER_ABSTENTION");
		expect(() =>
			assertGeneratedSponsorBoundaryAdmission({
				step: "abstain",
				expectedAuthorityStateHash: "head-b",
				actualAuthorityStateHash: "head-b",
				hasPriorAbstention: false,
			}),
		).not.toThrow();
		expect(() =>
			assertGeneratedSponsorBoundaryAdmission({
				step: "advance-abstention",
				expectedAuthorityStateHash: "head-b",
				actualAuthorityStateHash: "head-b",
				hasPriorAbstention: false,
			}),
		).toThrow("SP:NO_ABSTENTION_TO_ADVANCE");
		expect(() =>
			assertGeneratedSponsorBoundaryAdmission({
				step: "advance-abstention",
				expectedAuthorityStateHash: "head-b",
				actualAuthorityStateHash: "head-b",
				hasPriorAbstention: true,
			}),
		).not.toThrow();
	});

	it("keeps engine codes off the play surface", () => {
		expect(
			playerFacingSponsorFailure(
				new Error("SP:CURRENT_CONTEXT_MISMATCH; prior state preserved"),
			),
		).toBe(
			"This choice is still open. Confirm it against the current town record.",
		);
		expect(playerFacingSponsorFailure(new Error("SP:COVENANT_MISSING"))).toBe(
			"That action could not be saved. Your previous view is unchanged.",
		);
		expect(
			playerFacingSponsorFailure(
				new Error("SP:CURRENT_CONTEXT_MISMATCH; prior state preserved"),
			),
		).not.toMatch(/SP:/u);
		expect(
			playerFacingSponsorFailure(
				new Error("authority changed during validated session"),
			),
		).toBe(
			"This choice is still open. Confirm it against the current town record.",
		);
		expect(
			playerFacingSponsorFailure(new Error("raw engine leak")),
		).not.toMatch(/raw engine leak/u);
	});

	it("anchors an authority-extension snapshot to its retained immutable base", () => {
		expect(
			generatedSponsorChronicleBaseSnapshotId(
				"civilization-day-365-authority-5604",
			),
		).toBe("civilization-day-365");
		expect(
			generatedSponsorChronicleBaseSnapshotId("civilization-day-365"),
		).toBe("civilization-day-365");
		expect(() =>
			generatedSponsorChronicleBaseSnapshotId("foreign-snapshot"),
		).toThrow("SP:INVALID_CHRONICLE_SNAPSHOT");
	});

	it("enumerates every post-snapshot sponsor and boundary event without the immutable base", () => {
		const events = [
			{ sequence: 1, kind: "base" },
			{ sequence: 5_599, kind: "base" },
			{ sequence: 5_600, kind: "base" },
			{ sequence: 5_601, kind: "sponsor" },
			{ sequence: 5_602, kind: "counsel" },
			{ sequence: 5_603, kind: "resolution" },
			{ sequence: 5_604, kind: "boundary" },
		] as const;
		const range = generatedSponsorChronicleRange({
			snapshotBaseSequence: 5_600,
			durableLastSequence: 5_604,
		});
		const enumerated = events.filter(
			(event) =>
				event.sequence >= range.fromSequenceInclusive &&
				event.sequence < range.toSequenceExclusive,
		);

		expect(range).toEqual({
			fromSequenceInclusive: 5_601,
			toSequenceExclusive: 5_605,
		});
		expect(enumerated.map(({ kind }) => kind)).toEqual([
			"sponsor",
			"counsel",
			"resolution",
			"boundary",
		]);
		expect(enumerated.some(({ kind }) => kind === "base")).toBe(false);
	});

	it.each([
		{ snapshotBaseSequence: -1, durableLastSequence: 9 },
		{ snapshotBaseSequence: 5.5, durableLastSequence: 9 },
		{ snapshotBaseSequence: 6, durableLastSequence: 5 },
		{
			snapshotBaseSequence: 5,
			durableLastSequence: Number.MAX_SAFE_INTEGER,
		},
	])("rejects an invalid authority boundary: %o", (input) => {
		expect(() => generatedSponsorChronicleRange(input)).toThrow(
			"SP:INVALID_CHRONICLE_RANGE",
		);
	});
});

describe("generated civilization versioned persistence", () => {
	it("fails with a typed result when IndexedDB is absent", async () => {
		await expect(BrowserVersionedPersistence.open()).rejects.toMatchObject({
			code: "INVALID_INPUT",
		});
	});

	it("advances only the reviewed 1/7/30/90/365 horizons without a model", async () => {
		const port = new MemoryVersionedPersistence();
		const authorityRunner = vi.fn(runCivilizationExperiment);
		const result = await advanceGeneratedCivilization({
			port,
			genesisWorld: world,
			targetHorizonDays: 365,
			authorityRunner,
		});

		expect(
			authorityRunner.mock.calls.map((call) => call[0].horizonDays),
		).toEqual(GENERATED_CIVILIZATION_CATCH_UP_HORIZONS);
		expect(result.checkpoints).toHaveLength(5);
		expect(
			result.checkpoints.every(
				(checkpoint) => checkpoint.metrics.modelInvocations === 0,
			),
		).toBe(true);
		expect(result.head.lastSequence).toBe(5);
		expect(result.snapshot.snapshotId).toBe("civilization-day-365");
		expect(result.catchUpOperation).toMatchObject({
			schemaVersion: "eonfolk-catch-up-receipt-v1",
			operationId: "generated-day-365",
			confirmationId: "confirmed-generated-day-365",
			totalChapters: 5,
			nextChapter: 5,
			status: "complete",
			finalRevision: 5,
		});
		expect(result.measurement).toMatchObject({
			chapters: 5,
			horizonDays: 365,
			runnerInvocations: 5,
			sourceSteps: 365,
		});
		expect(result.measurement.sourceEvents).toBeLessThanOrEqual(
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumSourceEvents,
		);
		expect(result.measurement.planBytes).toBeLessThanOrEqual(
			GENERATED_CIVILIZATION_OPERATION_LIMITS.maximumPlanBytes,
		);
	});

	it("resumes after the append/progress crash boundary through a fresh client", async () => {
		const durable = new MemoryVersionedPersistence();
		let crashed = false;
		const crashingClient = new Proxy(durable, {
			get(target, property) {
				if (property === "appendEventBatch")
					return async (
						...args: Parameters<typeof target.appendEventBatch>
					) => {
						const result = await target.appendEventBatch(...args);
						if (!crashed) {
							crashed = true;
							throw new Error("crash after durable chapter append");
						}
						return result;
					};
				const value = Reflect.get(target, property, target) as unknown;
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as VersionedPersistencePort;
		await expect(
			advanceGeneratedCivilization({
				port: crashingClient,
				genesisWorld: world,
				targetHorizonDays: 365,
			}),
		).rejects.toThrow("crash after durable chapter append");

		const freshClient = new Proxy(durable, {
			get(target, property) {
				const value = Reflect.get(target, property, target) as unknown;
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as VersionedPersistencePort;
		const resumed = await advanceGeneratedCivilization({
			port: freshClient,
			genesisWorld: world,
			targetHorizonDays: 365,
		});
		expect(resumed.catchUpOperation).toMatchObject({
			status: "complete",
			nextChapter: 5,
		});
		expect(resumed.head).toMatchObject({ revision: 5, lastSequence: 5 });
		expect(resumed.idempotentAppends).toBe(1);
	});

	it("durably rejects an unconfirmed operation and collides on changed identity", async () => {
		const prepared = await prepareGeneratedCivilization({
			genesisWorld: world,
			targetHorizonDays: 7,
		});
		const port = new MemoryVersionedPersistence();
		await port.initialize(prepared.plan.genesis);
		const rejected = await persistAuthorityCatchUp(port, {
			...prepared.plan.scope,
			operationId: "unconfirmed-day-7",
			confirmationId: "confirmation-declined",
			confirmed: false,
			chapters: prepared.plan.batches,
		});
		expect(rejected.receipt).toMatchObject({
			status: "rejected",
			nextChapter: 0,
			rejectionCode: "CONFIRMATION_REJECTED",
		});
		expect(rejected.head.revision).toBe(0);
		await expect(
			persistAuthorityCatchUp(port, {
				...prepared.plan.scope,
				operationId: "unconfirmed-day-7",
				confirmationId: "confirmation-declined",
				confirmed: true,
				chapters: prepared.plan.batches,
			}),
		).rejects.toMatchObject({ code: "CATCH_UP_ID_COLLISION" });
		expect((await port.loadHead(prepared.plan.scope)).revision).toBe(0);
	});

	it("fails the measured runtime cap before opening durable authority", async () => {
		let tick = 0;
		const authorityRunner = vi.fn(async (input) => {
			const result = await runCivilizationExperiment(input);
			tick += 11;
			return result;
		});
		await expect(
			prepareGeneratedCivilization({
				genesisWorld: world,
				targetHorizonDays: 7,
				authorityRunner,
				now: () => tick,
				maximumRuntimeMs: 10,
			}),
		).rejects.toThrow("preparation exceeded its cap");
	});

	it("rejects an invalid computed candidate before touching durable authority", async () => {
		const port = new MemoryVersionedPersistence();
		const initialize = vi.spyOn(port, "initialize");
		const authorityRunner = vi.fn(async (input) => {
			const run = await runCivilizationExperiment(input);
			return { ...run, finalStateHash: "0".repeat(64) };
		});
		await expect(
			advanceGeneratedCivilization({
				port,
				genesisWorld: world,
				targetHorizonDays: 365,
				authorityRunner,
			}),
		).rejects.toMatchObject({ code: "STALE_STATE" });
		expect(authorityRunner).toHaveBeenCalledTimes(5);
		expect(initialize).not.toHaveBeenCalled();
	});

	it("resumes a shorter stream idempotently and replays snapshot plus suffix", async () => {
		const port = new MemoryVersionedPersistence();
		const day30 = await advanceGeneratedCivilization({
			port,
			genesisWorld: world,
			targetHorizonDays: 30,
		});
		const day365 = await advanceGeneratedCivilization({
			port,
			genesisWorld: world,
			targetHorizonDays: 365,
		});
		const replay = await replayGeneratedCivilization({
			port,
			regionId: world.identity.worldId,
			snapshotId: day30.snapshot.snapshotId,
		});

		expect(day365.idempotentAppends).toBe(3);
		expect(replay.eventCount).toBe(2);
		expect(replay.state.scheduler.completedDay).toBe(365);
		expect(replay.stateHash).toBe(day365.head.stateHash);
		expect(replay.lastEventHash).toBe(day365.head.lastEventHash);
	});

	it("migrates the sole exact legacy fixture into an event and snapshot stream", async () => {
		const legacyPort = new LegacyMemoryPort();
		const checkpoint = await runCivilizationExperiment({
			world,
			horizonDays: 7,
		});
		const legacy = await initializeV1Checkpoint({
			storage: legacyPort,
			storageKey: "migration:fixture-v1",
			genesisWorld: world,
			checkpoint,
		});
		const port = new MemoryVersionedPersistence();
		const migrated = await migrateLegacyGeneratedCheckpoint({
			port,
			legacy: legacy.checkpoint,
		});
		const replay = await replayGeneratedCivilization({
			port,
			regionId: world.identity.worldId,
		});

		expect(migrated.migrationVersion).toBe(
			"eonfolk-legacy-checkpoint-migration-v1",
		);
		expect(migrated.sourceRecordHash).toBe(legacy.checkpoint.recordHash);
		expect(migrated.targetSnapshotId).toBe("civilization-day-7");
		expect(replay.state.scheduler.completedDay).toBe(7);
		expect(replay.stateHash).toBe(migrated.head.stateHash);
	});

	it("refuses an unreviewed legacy schema instead of guessing an upcast", async () => {
		const legacyPort = new LegacyMemoryPort();
		const checkpoint = await runCivilizationExperiment({
			world,
			horizonDays: 1,
		});
		const legacy = await initializeV1Checkpoint({
			storage: legacyPort,
			storageKey: "migration:future-fixture",
			genesisWorld: world,
			checkpoint,
		});
		const future = {
			...legacy.checkpoint,
			schemaVersion: "eonfolk-v1-browser-checkpoint-v2",
		} as unknown as V1PersistedCheckpoint;

		await expect(
			migrateLegacyGeneratedCheckpoint({
				port: new MemoryVersionedPersistence(),
				legacy: future,
			}),
		).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
	});

	it("rejects unreviewed catch-up horizons before simulation", async () => {
		const authorityRunner = vi.fn(runCivilizationExperiment);
		await expect(
			advanceGeneratedCivilization({
				port: new MemoryVersionedPersistence(),
				genesisWorld: world,
				targetHorizonDays: 14 as 30,
				authorityRunner,
			}),
		).rejects.toThrow("outside the reviewed catch-up catalog");
		expect(authorityRunner).not.toHaveBeenCalled();
	});

	it("appends a live day instead of freezing after the origin checkpoint", async () => {
		const prepared = await prepareGeneratedCivilization({
			genesisWorld: world,
			targetHorizonDays: 1,
		});
		const port = new MemoryVersionedPersistence();
		await persistPreparedGeneratedCivilization({ port, prepared });
		const first = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(first.advanced).toBe(true);
		expect(first.horizonDays).toBe(2);
		const second = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(second.advanced).toBe(true);
		expect(second.horizonDays).toBe(3);
	}, 120_000);

	it("runs Standard Brain openings on each live Play day inside the day budget", async () => {
		const source = await readFile(
			new URL(
				"../../../apps/web/src/persistence/generated-civilization.ts",
				import.meta.url,
			),
			"utf8",
		);
		const liveFn = source.slice(
			source.indexOf("async function nextLiveDayFromHead"),
			source.indexOf(
				"export async function appendLiveGeneratedCivilizationDay",
			),
		);
		expect(liveFn).toContain("continueCivilizationExperimentDay");
		expect(liveFn).toContain(
			"skipOpeningDecisions: input.skipOpeningDecisions ?? false",
		);
		expect(liveFn).not.toContain("horizonDays: nextDay");
		expect(liveFn).not.toContain("authorityRunner");

		const port = await persistGeneratedOrigin();
		const origin = await loadGeneratedAuthority(port);
		expect(origin.replay.state.phase).toBe("checkpoint");
		const originCivilization = structuredClone(
			sponsoredCivilization(origin.replay),
		);
		const originWorld = structuredClone(
			origin.replay.state.world as unknown as typeof world,
		);
		const completedDay = origin.replay.state.scheduler.completedDay;
		const eventIndexBase = origin.replay.state.sourceHistory.eventHashes.length;
		const priorEventHash =
			origin.replay.state.sourceHistory.eventHashes.at(-1) ?? null;
		const skipped = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: structuredClone(originWorld),
			state: structuredClone(originCivilization),
			completedDay,
			eventIndexBase,
			priorEventHash,
			skipOpeningDecisions: true,
		});
		const thinking = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: structuredClone(originWorld),
			state: structuredClone(originCivilization),
			completedDay,
			eventIndexBase,
			priorEventHash,
			skipOpeningDecisions: false,
		});
		expect(skipped.cognitionDecisions).toHaveLength(0);
		expect(thinking.cognitionDecisions.length).toBe(8);
		expect(thinking.finalStateHash).not.toBe(skipped.finalStateHash);

		const startedMs = performance.now();
		const first = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		const firstElapsedMs = performance.now() - startedMs;
		expect(first.advanced).toBe(true);
		expect(first.horizonDays).toBe(completedDay + 1);
		expect(firstElapsedMs).toBeLessThan(FASTER_DAY_INTERVAL_MS);
		expect(firstElapsedMs).toBeLessThan(PLAY_DAY_INTERVAL_MS);

		const after = await loadGeneratedAuthority(port);
		const afterCivilization = sponsoredCivilization(after.replay);
		expect(afterCivilization.minds).toEqual(thinking.state.minds);
		expect(afterCivilization.minds).not.toEqual(skipped.state.minds);
		expect(
			thinking.cognitionDecisions.some(
				(decision) =>
					afterCivilization.minds[decision.actorId]?.snapshot.standingPlan
						.planId === decision.planId,
			),
		).toBe(true);

		const secondStartedMs = performance.now();
		const second = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(second.advanced).toBe(true);
		expect(performance.now() - secondStartedMs).toBeLessThan(
			FASTER_DAY_INTERVAL_MS,
		);

		const thirdStartedMs = performance.now();
		const third = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(third.advanced).toBe(true);
		expect(performance.now() - thirdStartedMs).toBeLessThan(
			FASTER_DAY_INTERVAL_MS,
		);
	}, 180_000);

	it("keeps Mara's covenant valid across a live day, counsel, and the next live day", async () => {
		const port = await persistGeneratedOrigin();
		await appendGeneratedSponsorCommand(port, { kind: "establish" });
		const afterSponsor = await loadGeneratedAuthority(port);
		const sponsored = sponsoredCivilization(afterSponsor.replay);
		const covenantId = `covenant:${RELEASE_GENESIS_MARA_CITIZEN_ID}`;
		const covenant = sponsored.sponsorships[covenantId];
		expect(covenant).toBeDefined();
		expect(
			sponsored.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID]?.sourceEventIds,
		).toContain(covenant?.sourceEventId);
		const afterLiveDay = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(afterLiveDay.advanced).toBe(true);
		const replayedDay = await loadGeneratedAuthority(port);
		const continued = sponsoredCivilization(replayedDay.replay);
		expect(continued.sponsorships[covenantId]?.sourceEventId).toBe(
			covenant?.sourceEventId,
		);
		expect(
			continued.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID]?.sourceEventIds,
		).toContain(covenant?.sourceEventId);
		const interventionId = `intervention:${RELEASE_GENESIS_MARA_CITIZEN_ID}:verify-reserve`;
		const issued = await appendGeneratedSponsorCommand(port, {
			kind: "issue",
			interventionId,
			intent: "verify-reserve",
		});
		expect(issued.transition.events[0]?.eventPayload.kind).toBe(
			"CounselIssued",
		);
		await appendGeneratedSponsorCommand(port, {
			kind: "resolve",
			interventionId,
		});
		const resolved = await loadGeneratedAuthority(port);
		const boundary = await createCivilizationCounselBoundaryAppend({
			state: resolved.replay.state,
			head: resolved.head,
			citizenId: RELEASE_GENESIS_MARA_CITIZEN_ID,
			interventionId,
		});
		await port.appendEventBatch(boundary.request);
		const afterBoundary = await loadGeneratedAuthority(port);
		expect(afterBoundary.replay.state.scheduler.completedDay).toBe(
			resolved.replay.state.scheduler.completedDay + 1,
		);
		expect(afterBoundary.replay.state.phase).toBe("active");
		const laterDay = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(laterDay.advanced).toBe(true);
		const finalReplay = await loadGeneratedAuthority(port);
		const finalCivilization = sponsoredCivilization(finalReplay.replay);
		expect(finalCivilization.sponsorships[covenantId]).toBeDefined();
		expect(
			Object.keys(finalCivilization.counselOutcomes).length,
		).toBeGreaterThan(0);
	}, 180_000);

	it("lets another live day append after an abstention boundary", async () => {
		const port = await persistGeneratedOrigin();
		await appendGeneratedSponsorCommand(port, { kind: "establish" });
		const abstentionId = `abstention:${RELEASE_GENESIS_MARA_CITIZEN_ID}:1`;
		await appendGeneratedSponsorCommand(port, {
			kind: "abstain",
			abstentionId,
		});
		const abstained = await loadGeneratedAuthority(port);
		const boundary = await createCivilizationAbstentionBoundaryAppend({
			state: abstained.replay.state,
			head: abstained.head,
			citizenId: RELEASE_GENESIS_MARA_CITIZEN_ID,
			abstentionId,
		});
		await port.appendEventBatch(boundary.request);
		const laterDay = await appendLiveGeneratedCivilizationDay({
			port,
			genesisWorld: world,
		});
		expect(laterDay.advanced).toBe(true);
		const replayed = await loadGeneratedAuthority(port);
		expect(
			sponsoredCivilization(replayed.replay).patronAbstentions[abstentionId],
		).toBeDefined();
	}, 180_000);

	it("runs Standard Brain openings on player-authorized return catch-up days", async () => {
		const source = await readFile(
			new URL(
				"../../../apps/web/src/persistence/generated-civilization.ts",
				import.meta.url,
			),
			"utf8",
		);
		const catchUpFn = source.slice(
			source.indexOf(
				"export async function catchUpLiveGeneratedCivilizationDays",
			),
			source.indexOf(
				"export async function persistPreparedGeneratedCivilization",
			),
		);
		expect(catchUpFn).toContain("skipOpeningDecisions: false");
		expect(catchUpFn).not.toContain("skipOpeningDecisions: true");

		const port = await persistGeneratedOrigin();
		await appendGeneratedSponsorCommand(port, { kind: "establish" });
		const origin = await loadGeneratedAuthority(port);
		expect(origin.replay.state.phase).toBe("active");
		const originCivilization = structuredClone(
			sponsoredCivilization(origin.replay),
		);
		const originWorld = structuredClone(
			origin.replay.state.world as unknown as typeof world,
		);
		const completedDay = origin.replay.state.scheduler.completedDay;
		const eventIndexBase = origin.replay.state.sourceHistory.eventHashes.length;
		const priorEventHash =
			origin.replay.state.sourceHistory.eventHashes.at(-1) ?? null;
		const skipped = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: structuredClone(originWorld),
			state: structuredClone(originCivilization),
			completedDay,
			eventIndexBase,
			priorEventHash,
			skipOpeningDecisions: true,
		});
		const thinking = await continueCivilizationExperimentDay({
			genesisWorld: world,
			world: structuredClone(originWorld),
			state: structuredClone(originCivilization),
			completedDay,
			eventIndexBase,
			priorEventHash,
			skipOpeningDecisions: false,
		});
		expect(skipped.cognitionDecisions).toHaveLength(0);
		expect(thinking.cognitionDecisions.length).toBeGreaterThan(0);
		expect(thinking.finalStateHash).not.toBe(skipped.finalStateHash);

		const caughtUp = await catchUpLiveGeneratedCivilizationDays({
			port,
			genesisWorld: world,
			operationId: "rl-test-catch-up-thinking",
			additionalDays: 1,
		});
		expect(caughtUp.advancedDays).toBe(1);
		expect(caughtUp.horizonDays).toBe(2);

		const after = await loadGeneratedAuthority(port);
		const afterCivilization = sponsoredCivilization(after.replay);
		expect(afterCivilization.minds).toEqual(thinking.state.minds);
		expect(afterCivilization.minds).not.toEqual(skipped.state.minds);
		const openingConsequence =
			thinking.cognitionDecisions.some(
				(decision) => decision.selectedActionId.length > 0,
			) ||
			Object.values(afterCivilization.minds).some((mind) =>
				mind.snapshot.records.some((record) => record.kind === "message-claim"),
			) ||
			Object.values(afterCivilization.projects).some(
				(project) => project.sponsor.kind === "citizen",
			) ||
			thinking.cognitionDecisions.some(
				(decision) =>
					decision.planTransition !== "continued" ||
					decision.planVersionAfter !== decision.planVersionBefore,
			);
		expect(openingConsequence).toBe(true);
		expect(
			thinking.cognitionDecisions.some(
				(decision) =>
					afterCivilization.minds[decision.actorId]?.snapshot.standingPlan
						.planId === decision.planId,
			),
		).toBe(true);
	}, 180_000);

	it("resumes return catch-up without double-advancing after a crash", async () => {
		const prepared = await prepareGeneratedCivilization({
			genesisWorld: world,
			targetHorizonDays: 1,
		});
		const durable = new MemoryVersionedPersistence();
		await persistPreparedGeneratedCivilization({ port: durable, prepared });
		let liveDayAppends = 0;
		const crashingClient = new Proxy(durable, {
			get(target, property) {
				if (property === "appendEventBatch")
					return async (
						...args: Parameters<typeof target.appendEventBatch>
					) => {
						const result = await target.appendEventBatch(...args);
						const appendId = args[0]?.appendId ?? "";
						if (
							typeof appendId === "string" &&
							appendId.startsWith("civilization-live-day-")
						) {
							liveDayAppends += 1;
							if (liveDayAppends === 3)
								throw new Error("crash after durable live catch-up chapter");
						}
						return result;
					};
				const value = Reflect.get(target, property, target) as unknown;
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as VersionedPersistencePort;
		await expect(
			catchUpLiveGeneratedCivilizationDays({
				port: crashingClient,
				genesisWorld: world,
				operationId: "rl-test-return",
				additionalDays: 7,
			}),
		).rejects.toThrow("crash after durable live catch-up chapter");
		const crashed = await replayGeneratedCivilization({
			port: durable,
			regionId: world.identity.worldId,
		});
		expect(crashed.state.scheduler.completedDay).toBe(4);
		const resumed = await catchUpLiveGeneratedCivilizationDays({
			port: durable,
			genesisWorld: world,
			operationId: "rl-test-return",
			additionalDays: 7,
		});
		expect(resumed.horizonDays).toBe(8);
		expect(resumed.catchUpOperation.status).toBe("complete");
		const replayed = await replayGeneratedCivilization({
			port: durable,
			regionId: world.identity.worldId,
		});
		expect(replayed.state.scheduler.completedDay).toBe(8);
	}, 180_000);
});
