import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	generatedSponsorChronicleBaseSnapshotId,
	generatedSponsorChronicleRange,
} from "../../../apps/web/src/generated-sponsor-runtime.js";
import { BrowserVersionedPersistence } from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	advanceGeneratedCivilization,
	GENERATED_CIVILIZATION_CATCH_UP_HORIZONS,
	migrateLegacyGeneratedCheckpoint,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";
import {
	initializeV1Checkpoint,
	type V1CheckpointStoragePort,
	type V1PersistedCheckpoint,
} from "../../../apps/web/src/v1-indexeddb.js";
import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import { MemoryVersionedPersistence } from "../../../packages/persistence/src/index.js";
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
});
