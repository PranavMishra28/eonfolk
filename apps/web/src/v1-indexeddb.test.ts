import {
	type CivilizationExperimentRun,
	runCivilizationExperiment,
} from "@eonfolk/civilization";
import {
	hashAuthoritativeState,
	type JsonValue,
	RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
} from "@eonfolk/persistence";
import {
	createReleaseGenesis,
	type GeneratedWorldState,
} from "@eonfolk/protocol";
import { generateWorld } from "@eonfolk/worldgen";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	catchUpV1Checkpoint,
	createV1IndexedDbStorage,
	initializeV1Checkpoint,
	loadV1Checkpoint,
	V1CheckpointError,
	type V1CheckpointStoragePort,
	type V1PersistedCheckpoint,
} from "./v1-indexeddb";

const STORAGE_KEY = "world:v1-browser-test";

class MemoryCheckpointStorage implements V1CheckpointStoragePort {
	value: unknown | null = null;
	writes = 0;

	async load(_storageKey: string): Promise<unknown | null> {
		return this.value;
	}

	async compareAndSwap(input: {
		readonly storageKey: string;
		readonly expectedRecordHash: string | null;
		readonly next: V1PersistedCheckpoint;
	}): Promise<{ readonly idempotent: boolean }> {
		const prior = this.value as V1PersistedCheckpoint | null;
		if (prior?.recordHash === input.next.recordHash)
			return { idempotent: true };
		if ((prior?.recordHash ?? null) !== input.expectedRecordHash)
			throw new V1CheckpointError(
				"STORAGE_CONFLICT",
				"test compare-and-swap conflict",
			);
		this.value = input.next;
		this.writes += 1;
		return { idempotent: false };
	}
}

let world: GeneratedWorldState;
let dayOne: CivilizationExperimentRun;

beforeAll(async () => {
	const releaseGenesis = await createReleaseGenesis({
		releaseId: "v1-indexeddb-test",
		seedHex: "e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a",
	});
	world = await generateWorld({
		releaseGenesis,
		worldId: "v1-indexeddb-world",
		treatmentId: "standard-brain",
	});
	dayOne = await runCivilizationExperiment({ world, horizonDays: 1 });
});

describe("V1 browser civilization checkpoint persistence", () => {
	it("returns a typed unavailable result when the browser lacks IndexedDB", () => {
		expect(createV1IndexedDbStorage(null)).toEqual({
			available: false,
			reason: "indexeddb-unavailable",
		});
	});

	it("persists, reloads, and idempotently replays one exact checkpoint write", async () => {
		const storage = new MemoryCheckpointStorage();
		const first = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const retry = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const reloaded = await loadV1Checkpoint(storage, STORAGE_KEY);

		expect(first.idempotent).toBe(false);
		expect(retry.idempotent).toBe(true);
		expect(storage.writes).toBe(1);
		expect(reloaded?.recordHash).toBe(first.checkpoint.recordHash);
		expect(reloaded?.checkpoint.finalStateHash).toBe(dayOne.finalStateHash);
		expect(reloaded?.checkpoint.events).toEqual(dayOne.events);
		expect(reloaded).toMatchObject({
			persistenceEngineVersion: RELEASE_GENESIS_CIVILIZATION_ENGINE_VERSION,
			persistenceStateVersion: RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
			persistenceTransitionVersion:
				RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			checkpointSchemaVersion: dayOne.schemaVersion,
			runnerVersion: dayOne.runnerVersion,
			initializedHorizonDays: 1,
			horizonDays: 1,
			initialStateHash: dayOne.initialStateHash,
			finalEventHash: dayOne.finalEventHash,
			eventCount: dayOne.events.length,
			stepCount: dayOne.steps.length,
			catchUpReceipts: [],
		});
	});

	it("delegates catch-up to the deterministic authority and persists its exact event suffix", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const authorityRunner = vi.fn(runCivilizationExperiment);
		const result = await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:day-45",
			targetHorizonDays: 45,
			authorityRunner,
		});
		const reloaded = await loadV1Checkpoint(storage, STORAGE_KEY);

		expect(authorityRunner).toHaveBeenCalledOnce();
		expect(authorityRunner).toHaveBeenCalledWith({ world, horizonDays: 45 });
		expect(result.receipt).toEqual({
			requestId: "catchup:day-45",
			fromHorizonDays: 1,
			toHorizonDays: 45,
			resultingStateHash: result.checkpoint.finalStateHash,
		});
		expect(result.appendedEvents).toEqual(
			result.checkpoint.checkpoint.events.slice(dayOne.events.length),
		);
		expect(result.checkpoint.checkpoint.metrics.modelInvocations).toBe(0);
		expect(reloaded?.recordHash).toBe(result.checkpoint.recordHash);
		expect(reloaded?.horizonDays).toBe(45);
		expect(reloaded?.catchUpReceipts).toEqual([result.receipt]);
	});

	it("makes any retained catch-up receipt idempotent without rerunning authority", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:day-2",
			targetHorizonDays: 2,
		});
		await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:day-3",
			targetHorizonDays: 3,
		});
		const authorityRunner = vi.fn(runCivilizationExperiment);
		const retry = await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:day-2",
			targetHorizonDays: 2,
			authorityRunner,
		});

		expect(retry.idempotent).toBe(true);
		expect(retry.appendedEvents).toEqual([]);
		expect(authorityRunner).not.toHaveBeenCalled();
		expect(retry.checkpoint.horizonDays).toBe(3);
		expect(storage.writes).toBe(3);
	});

	it("advances exact one-day, seven-day, and long-absence boundaries", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const boundaries = [
			{ requestId: "catchup:plus-1", target: 2, elapsed: 1 },
			{ requestId: "catchup:plus-7", target: 9, elapsed: 7 },
			{ requestId: "catchup:plus-90", target: 99, elapsed: 90 },
		] as const;
		for (const boundary of boundaries) {
			const result = await catchUpV1Checkpoint({
				storage,
				storageKey: STORAGE_KEY,
				requestId: boundary.requestId,
				targetHorizonDays: boundary.target,
			});
			expect(
				result.receipt.toHorizonDays - result.receipt.fromHorizonDays,
			).toBe(boundary.elapsed);
			expect(result.checkpoint.horizonDays).toBe(boundary.target);
		}
		const reloaded = await loadV1Checkpoint(storage, STORAGE_KEY);
		expect(reloaded?.horizonDays).toBe(99);
		expect(reloaded?.catchUpReceipts).toHaveLength(3);
	});

	it("rejects request-ID reuse with different catch-up bounds", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:bounded",
			targetHorizonDays: 2,
		});

		await expect(
			catchUpV1Checkpoint({
				storage,
				storageKey: STORAGE_KEY,
				requestId: "catchup:bounded",
				targetHorizonDays: 3,
			}),
		).rejects.toMatchObject({ code: "INVALID_REQUEST" });
	});

	it("fails closed on unknown versions before using their payload", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		storage.value = {
			...initialized.checkpoint,
			schemaVersion: "eonfolk-v1-browser-checkpoint-v999",
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "UNSUPPORTED_VERSION",
		});
	});

	it("fails closed on an unsupported persistence contract version", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const { recordHash: _priorHash, ...body } = initialized.checkpoint;
		const damaged = {
			...body,
			persistenceEngineVersion: "future-engine",
		};
		storage.value = {
			...damaged,
			recordHash: await hashAuthoritativeState(damaged as unknown as JsonValue),
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "UNSUPPORTED_VERSION",
		});
	});

	it("fails closed when stored checkpoint bytes are corrupted", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const damaged = JSON.parse(
			JSON.stringify(initialized.checkpoint),
		) as V1PersistedCheckpoint;
		(damaged.checkpoint.metrics as { simulationTime: number }).simulationTime +=
			1;
		storage.value = damaged;

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "CORRUPT_RECORD",
		});
	});

	it("rejects unversioned top-level fields even when canonical bytes still hash", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		storage.value = {
			...initialized.checkpoint,
			unversionedProjection: "must-not-enter-authority",
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "CORRUPT_RECORD",
		});
	});

	it("rejects an invalid authority chain even after its outer hash is recomputed", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const damaged = JSON.parse(
			JSON.stringify(initialized.checkpoint),
		) as V1PersistedCheckpoint;
		const firstStep = damaged.checkpoint.steps[0] as unknown as {
			stepHash: string;
		};
		firstStep.stepHash = "f".repeat(64);
		const { recordHash: _priorHash, ...body } = damaged;
		storage.value = {
			...damaged,
			recordHash: await hashAuthoritativeState(body as unknown as JsonValue),
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "CORRUPT_RECORD",
		});
	});

	it("fails closed when identity metadata no longer matches the world", async () => {
		const storage = new MemoryCheckpointStorage();
		const initialized = await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		storage.value = {
			...initialized.checkpoint,
			worldId: "another-world",
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "IDENTITY_MISMATCH",
		});
	});

	it("fails closed on a malformed receipt history even with a valid outer hash", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const caughtUp = await catchUpV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			requestId: "catchup:receipt-integrity",
			targetHorizonDays: 2,
		});
		const { recordHash: _priorHash, ...body } = caughtUp.checkpoint;
		const damaged = {
			...body,
			catchUpReceipts: body.catchUpReceipts.map((receipt) => ({
				...receipt,
				fromHorizonDays: 0,
			})),
		};
		storage.value = {
			...damaged,
			recordHash: await hashAuthoritativeState(damaged as unknown as JsonValue),
		};

		await expect(loadV1Checkpoint(storage, STORAGE_KEY)).rejects.toMatchObject({
			code: "CORRUPT_RECORD",
		});
	});

	it("does not commit when the deterministic catch-up authority fails or returns a non-prefix", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		await expect(
			catchUpV1Checkpoint({
				storage,
				storageKey: STORAGE_KEY,
				requestId: "catchup:runner-throw",
				targetHorizonDays: 2,
				authorityRunner: async () => {
					throw new Error("injected runner failure");
				},
			}),
		).rejects.toMatchObject({ code: "AUTHORITY_FAILURE" });
		await expect(
			catchUpV1Checkpoint({
				storage,
				storageKey: STORAGE_KEY,
				requestId: "catchup:runner-stale",
				targetHorizonDays: 2,
				authorityRunner: async () => dayOne,
			}),
		).rejects.toMatchObject({ code: "AUTHORITY_FAILURE" });
		expect(storage.writes).toBe(1);
		expect((await loadV1Checkpoint(storage, STORAGE_KEY))?.horizonDays).toBe(1);
	});

	it("keeps the prior checkpoint intact when the atomic commit fails", async () => {
		const storage = new MemoryCheckpointStorage();
		await initializeV1Checkpoint({
			storage,
			storageKey: STORAGE_KEY,
			genesisWorld: world,
			checkpoint: dayOne,
		});
		const prior = storage.value;
		const failingStorage: V1CheckpointStoragePort = {
			load: (key) => storage.load(key),
			compareAndSwap: async () => {
				throw new Error("injected transaction abort");
			},
		};

		await expect(
			catchUpV1Checkpoint({
				storage: failingStorage,
				storageKey: STORAGE_KEY,
				requestId: "catchup:aborted",
				targetHorizonDays: 2,
			}),
		).rejects.toMatchObject({ code: "STORAGE_FAILURE" });
		expect(storage.value).toBe(prior);
		const reloaded = await loadV1Checkpoint(storage, STORAGE_KEY);
		expect(reloaded?.horizonDays).toBe(1);
	});

	it("normalizes untyped port failures and IndexedDB version errors", async () => {
		const untypedFailure: V1CheckpointStoragePort = {
			load: async () => {
				throw new Error("injected load failure");
			},
			compareAndSwap: async () => ({ idempotent: false }),
		};
		await expect(
			loadV1Checkpoint(untypedFailure, STORAGE_KEY),
		).rejects.toMatchObject({ code: "STORAGE_FAILURE" });

		const unavailableVersion = createV1IndexedDbStorage({
			open: () => {
				throw new DOMException("newer database", "VersionError");
			},
		} as unknown as IDBFactory);
		expect(unavailableVersion.available).toBe(true);
		if (!unavailableVersion.available) throw new Error("unreachable");
		await expect(
			unavailableVersion.port.load(STORAGE_KEY),
		).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
	});
});
