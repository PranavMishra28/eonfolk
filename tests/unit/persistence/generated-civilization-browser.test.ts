import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	assertGeneratedSponsorBoundaryAdmission,
	generatedSponsorChronicleBaseSnapshotId,
	generatedSponsorChronicleRange,
} from "../../../apps/web/src/generated-sponsor-runtime.js";
import { BrowserVersionedPersistence } from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	advanceGeneratedCivilization,
	appendLiveGeneratedCivilizationDay,
	catchUpLiveGeneratedCivilizationDays,
	GENERATED_CIVILIZATION_CATCH_UP_HORIZONS,
	GENERATED_CIVILIZATION_OPERATION_LIMITS,
	migrateLegacyGeneratedCheckpoint,
	persistPreparedGeneratedCivilization,
	prepareGeneratedCivilization,
	preservePlayerAuthority,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";
import {
	initializeV1Checkpoint,
	type V1CheckpointStoragePort,
	type V1PersistedCheckpoint,
} from "../../../apps/web/src/v1-indexeddb.js";
import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	MemoryVersionedPersistence,
	persistAuthorityCatchUp,
	type VersionedPersistencePort,
} from "../../../packages/persistence/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
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

	it("overlays sponsorship maps onto the next live checkpoint without freezing", () => {
		const next = {
			citizens: {},
			sponsorships: {},
			counsels: {},
			patronAbstentions: {},
		};
		const current = {
			citizens: {},
			sponsorships: {
				"covenant:citizen-01": {
					covenantId: "covenant:citizen-01",
					beneficiaryCitizenId: "citizen-01",
				},
			},
			counsels: { "counsel:1": { counselId: "counsel:1" } },
			patronAbstentions: {},
		};
		expect(preservePlayerAuthority(next, current)).toMatchObject({
			sponsorships: current.sponsorships,
			counsels: current.counsels,
		});
	});

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
