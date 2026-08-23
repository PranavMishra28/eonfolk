import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	AUTHORITY_EVENT_SCHEMA_VERSION,
	type AuthorityEventRecord,
	CIVILIZATION_PERSISTENCE_MIGRATION_POLICY,
	type CivilizationExperimentCheckpoint,
	createAuthorityEvent,
	createCivilizationPersistencePlan,
	MemoryVersionedPersistence,
	persistCivilizationHistory,
	reduceCivilizationAuthorityEvent,
	replayCivilizationHistory,
	type VersionedCrashPoint,
} from "../../../packages/persistence/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const PROGRESSION_SEED =
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";
const STAGNATION_SEED = "0e".padStart(64, "0");

class OneShotCrash {
	point: VersionedCrashPoint | null = null;

	hit(point: VersionedCrashPoint): void {
		if (point === this.point) {
			this.point = null;
			throw new Error(`injected crash at ${point}`);
		}
	}
}

async function fixture(
	seedHex: string,
	runId: string,
	horizons: readonly number[] = [30, 90, 365],
) {
	const release = await createReleaseGenesis({
		releaseId: "persistence-civilization",
		seedHex,
	});
	const world = await generateWorld({ releaseGenesis: release });
	const checkpoints = await Promise.all(
		horizons.map((horizonDays) =>
			runCivilizationExperiment({ world, horizonDays }),
		),
	);
	return {
		runId,
		regionId: Object.keys(world.regions).sort()[0] ?? "missing-region",
		genesisId: `genesis-${runId}`,
		genesisWorld: world,
		checkpoints,
		snapshotId: `snapshot-${runId}`,
	} as const;
}

describe("Release Genesis civilization persistence", () => {
	it("publishes an exact-only civilization migration policy", () => {
		expect(CIVILIZATION_PERSISTENCE_MIGRATION_POLICY).toEqual({
			mode: "exact-only",
			engineVersion: "eonfolk-release-genesis-civilization-engine-v7",
			stateVersion: "eonfolk-release-genesis-civilization-state-v6",
			transitionVersion: "eonfolk-release-genesis-civilization-transition-v5",
		});
	});

	it("persists and replays 30/90/365-day authority without cognition or a final snapshot dependency", async () => {
		const input = await fixture(PROGRESSION_SEED, "progression-history");
		const plan = await createCivilizationPersistencePlan(input);
		const port = new MemoryVersionedPersistence();
		await port.initialize(plan.genesis);
		for (const batch of plan.batches) await port.appendEventBatch(batch);

		const replay = await replayCivilizationHistory(port, {
			...plan.scope,
			snapshotId: plan.genesis.snapshot.snapshotId,
			toSequenceExclusive: plan.finalSnapshot.baseSequence + 1,
			rangeSize: 1,
		});
		const finalCheckpoint = input.checkpoints.at(-1);
		if (finalCheckpoint === undefined)
			throw new Error("missing final checkpoint");
		expect(replay.events).toHaveLength(3);
		expect(replay.state.scheduler).toEqual({
			completedDay: 365,
			simulationTime: 365 * 86_400,
			modelInvocations: 0,
			activities: finalCheckpoint.activities,
		});
		expect(jcs(replay.state.world)).toBe(jcs(finalCheckpoint.world));
		expect(jcs(replay.state.civilization)).toBe(jcs(finalCheckpoint.state));
		expect(replay.state.finalExperimentStateHash).toBe(
			finalCheckpoint.finalStateHash,
		);
		expect(replay.state.sourceHistory.stepHashes).toHaveLength(365);
		expect(replay.state.sourceHistory.eventHashes).toEqual(
			finalCheckpoint.events.map((event) => event.eventHash),
		);
		expect(replay.stateHash).toBe((await port.loadHead(plan.scope)).stateHash);
		expect(replay.lastEventHash).toBe(
			(await port.loadHead(plan.scope)).lastEventHash,
		);
		await expect(
			port.loadSnapshot(plan.scope, plan.finalSnapshot.snapshotId),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("round-trips multiple seeds at each required horizon", async () => {
		for (const [seedIndex, seed] of [
			PROGRESSION_SEED,
			STAGNATION_SEED,
		].entries()) {
			for (const horizonDays of [30, 90, 365]) {
				const input = await fixture(seed, `seed-${seedIndex}-${horizonDays}`, [
					horizonDays,
				]);
				const port = new MemoryVersionedPersistence();
				const persisted = await persistCivilizationHistory(port, input);
				const replay = await replayCivilizationHistory(port, {
					...persisted.plan.scope,
					snapshotId: persisted.plan.genesis.snapshot.snapshotId,
					toSequenceExclusive: 2,
				});
				const source = input.checkpoints[0];
				if (source === undefined) throw new Error("missing source checkpoint");
				expect(jcs(replay.state.world)).toBe(jcs(source.world));
				expect(jcs(replay.state.civilization)).toBe(jcs(source.state));
				expect(replay.state.finalExperimentStateHash).toBe(
					source.finalStateHash,
				);
				expect(persisted.snapshot.stateHash).toBe(persisted.head.stateHash);
				expect(persisted.receipts).toHaveLength(1);
			}
		}
	});

	it("recovers exact retries across append and snapshot crash boundaries", async () => {
		const input = await fixture(PROGRESSION_SEED, "crash-recovery", [30]);
		for (const point of [
			"authority-append:before-commit",
			"authority-append:after-commit",
			"authority-snapshot:before-commit",
			"authority-snapshot:after-commit",
		] as const) {
			const crash = new OneShotCrash();
			const port = new MemoryVersionedPersistence({ crashInjector: crash });
			crash.point = point;
			await expect(persistCivilizationHistory(port, input)).rejects.toThrow(
				`injected crash at ${point}`,
			);
			const recovered = await persistCivilizationHistory(port, input);
			const replay = await replayCivilizationHistory(port, {
				...recovered.plan.scope,
				snapshotId: recovered.plan.genesis.snapshot.snapshotId,
				toSequenceExclusive: 2,
			});
			expect(replay.state).toEqual(recovered.plan.finalState);
			expect((await port.loadHead(recovered.plan.scope)).revision).toBe(1);
		}
	});

	it("rejects stale ownership, gaps, corruption, and unknown versions fail closed", async () => {
		const input = await fixture(PROGRESSION_SEED, "failure-cases", [30, 90]);
		const plan = await createCivilizationPersistencePlan({
			...input,
			batchSize: 1,
		});
		const staleFencePort = new MemoryVersionedPersistence();
		await staleFencePort.initialize(plan.genesis);
		await staleFencePort.acquireWriterFence(plan.scope, 1);
		await expect(
			staleFencePort.appendEventBatch(plan.batches[0]!),
		).rejects.toMatchObject({ code: "STALE_FENCE" });

		const staleRevisionPort = new MemoryVersionedPersistence();
		await staleRevisionPort.initialize(plan.genesis);
		await expect(
			staleRevisionPort.appendEventBatch({
				...plan.batches[0]!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({ code: "STALE_REVISION" });

		const changedStep = {
			...input.checkpoints[1]!,
			steps: input.checkpoints[1]!.steps.slice(1),
		};
		await expect(
			createCivilizationPersistencePlan({
				...input,
				checkpoints: [input.checkpoints[0]!, changedStep],
			}),
		).rejects.toMatchObject({ code: "RANGE_GAP" });

		await expect(
			createCivilizationPersistencePlan({
				...input,
				checkpoints: [
					{
						...input.checkpoints[0]!,
						schemaVersion: "future-civilization-v3",
					} as CivilizationExperimentCheckpoint,
				],
			}),
		).rejects.toMatchObject({ code: "UNSUPPORTED_VERSION" });
		const firstSourceEvent = input.checkpoints[0]?.events[0];
		if (firstSourceEvent === undefined) throw new Error("missing source event");
		await expect(
			createCivilizationPersistencePlan({
				...input,
				checkpoints: [
					{
						...input.checkpoints[0]!,
						events: [
							{
								...firstSourceEvent,
								details: { corrupted: true },
							},
							...input.checkpoints[0]!.events.slice(1),
						],
					},
				],
			}),
		).rejects.toMatchObject({ code: "STALE_STATE" });

		const event = plan.batches[0]?.events[0];
		if (event === undefined) throw new Error("missing authority event");
		const eventPayload = event.payload as {
			readonly sourceEvents: readonly Record<string, unknown>[];
		};
		const payloadSourceEvent = eventPayload.sourceEvents[0];
		if (payloadSourceEvent === undefined)
			throw new Error("missing payload source event");
		const {
			eventHash: _eventHash,
			schemaVersion: _schemaVersion,
			...unsigned
		} = event;
		const forgedEvent = await createAuthorityEvent({
			...unsigned,
			payload: {
				...(event.payload as Record<string, unknown>),
				sourceEvents: [
					{ ...payloadSourceEvent, details: { forged: true } },
					...eventPayload.sourceEvents.slice(1),
				],
			} as never,
		});
		const forgedPort = new MemoryVersionedPersistence();
		await forgedPort.initialize(plan.genesis);
		await forgedPort.appendEventBatch({
			...plan.batches[0]!,
			events: [forgedEvent],
		});
		await expect(
			replayCivilizationHistory(forgedPort, {
				...plan.scope,
				snapshotId: plan.genesis.snapshot.snapshotId,
				toSequenceExclusive: 2,
			}),
		).rejects.toMatchObject({ code: "STALE_STATE" });

		await expect(
			reduceCivilizationAuthorityEvent(
				plan.genesis.snapshot.state as never,
				{
					...event,
					schemaVersion: AUTHORITY_EVENT_SCHEMA_VERSION,
					payload: {
						...(event.payload as Record<string, unknown>),
						schemaVersion: "future-transition-v2",
					} as never,
				} as AuthorityEventRecord,
			),
		).rejects.toThrowError(/version is unsupported/u);
	});
});
