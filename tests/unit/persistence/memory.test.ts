import { describe, expect, it } from "vitest";

import {
	type CrashPoint,
	DEFAULT_PERSISTENCE_BOUNDS,
	MemoryPersistence,
	PersistenceError,
	validateReceipt,
} from "../../../packages/persistence/src/index.js";
import {
	catchUp,
	genesis,
	hash,
	REGION_ID,
	RUN_ID,
	transition,
} from "./fixtures.js";

class OneShotCrash {
	point: CrashPoint | null = null;

	hit(point: CrashPoint): void {
		if (point === this.point) {
			this.point = null;
			throw new Error(`injected crash at ${point}`);
		}
	}
}

describe("MemoryPersistence", () => {
	it("rejects an empty interval on an accepted receipt", () => {
		const head = genesis().head;
		const receipt = transition(head, 1).receipt;
		expect(() =>
			validateReceipt(
				{
					...receipt,
					toSequenceExclusive: receipt.fromSequenceInclusive,
				},
				RUN_ID,
				REGION_ID,
				DEFAULT_PERSISTENCE_BOUNDS,
			),
		).toThrow(/interval must be non-empty/u);
	});

	it("atomically creates one local genesis and detects run collisions", async () => {
		const crash = new OneShotCrash();
		const persistence = new MemoryPersistence({ crashInjector: crash });
		crash.point = "genesis:before-commit";
		await expect(persistence.commitGenesis(genesis())).rejects.toThrow(
			"injected crash",
		);
		await expect(persistence.getHead(RUN_ID, REGION_ID)).rejects.toMatchObject({
			code: "NOT_FOUND",
		});

		const first = await persistence.commitGenesis(genesis());
		expect(first.idempotent).toBe(false);
		expect((await persistence.commitGenesis(genesis())).idempotent).toBe(true);

		const collision = genesis();
		await expect(
			persistence.commitGenesis({
				...collision,
				manifest: { ...collision.manifest, manifestHash: hash(99) },
			}),
		).rejects.toMatchObject({ code: "RUN_ID_COLLISION" });

		const other = genesis();
		await expect(
			persistence.commitGenesis({
				...other,
				manifest: { ...other.manifest, runId: "other-run" },
				head: { ...other.head, runId: "other-run" },
				snapshot: { ...other.snapshot, runId: "other-run" },
			}),
		).rejects.toMatchObject({ code: "LOCAL_WORLD_LIMIT" });
	});

	it("recovers exact transition retries before and after commit", async () => {
		const crash = new OneShotCrash();
		const persistence = new MemoryPersistence({ crashInjector: crash });
		await persistence.commitGenesis(genesis());
		const candidate = transition(
			await persistence.getHead(RUN_ID, REGION_ID),
			1,
			2,
		);

		crash.point = "transition:before-commit";
		await expect(persistence.commitTransition(candidate)).rejects.toThrow(
			"injected crash",
		);
		expect((await persistence.getHead(RUN_ID, REGION_ID)).revision).toBe(0);
		expect(
			await persistence.getCommandReceipt(
				RUN_ID,
				REGION_ID,
				candidate.receipt.commandId,
			),
		).toBeNull();

		crash.point = "transition:after-commit";
		await expect(persistence.commitTransition(candidate)).rejects.toThrow(
			"injected crash",
		);
		expect((await persistence.getHead(RUN_ID, REGION_ID)).revision).toBe(1);
		const recovered = await persistence.commitTransition(candidate);
		expect(recovered.idempotent).toBe(true);
		expect(recovered.receipt).toEqual(candidate.receipt);
		expect(
			await persistence.getEventRange({
				runId: RUN_ID,
				regionId: REGION_ID,
				fromSequenceInclusive: 1,
				toSequenceExclusive: 3,
			}),
		).toEqual(candidate.events);
	});

	it("makes command collisions durable and does not re-evaluate retries", async () => {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		const candidate = transition(
			await persistence.getHead(RUN_ID, REGION_ID),
			1,
		);
		await persistence.commitTransition(candidate);
		const collision = {
			...candidate,
			receipt: { ...candidate.receipt, payloadFingerprint: hash(88) },
		};
		await expect(persistence.commitTransition(collision)).rejects.toMatchObject(
			{
				code: "IDEMPOTENCY_COLLISION",
			},
		);
		expect((await persistence.getHead(RUN_ID, REGION_ID)).revision).toBe(1);
	});

	it("keeps a rejected receipt stable after the world advances", async () => {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		const initial = await persistence.getHead(RUN_ID, REGION_ID);
		const receipt = {
			schemaVersion: "receipt-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			commandId: "command-rejected",
			payloadFingerprint: hash(101),
			outcome: "rejected",
			observedRevision: initial.revision,
			resultingRevision: initial.revision,
			resultingStateHash: initial.stateHash,
			resultingWorldHeadHash: initial.worldHeadHash,
			fencingToken: initial.fencingToken,
			batchId: null,
			fromSequenceInclusive: null,
			toSequenceExclusive: null,
			rejectionCode: "STALE_EXPECTED_REVISION",
			data: { source: "fixture" },
		} as const;
		await persistence.commitRejectedCommand({
			runId: RUN_ID,
			regionId: REGION_ID,
			fencingToken: initial.fencingToken,
			receipt,
			decision: null,
		});
		await persistence.commitTransition(transition(initial, 1));
		expect(
			await persistence.commitRejectedCommand({
				runId: RUN_ID,
				regionId: REGION_ID,
				fencingToken: initial.fencingToken,
				receipt,
				decision: null,
			}),
		).toEqual(receipt);
		expect((await persistence.getHead(RUN_ID, REGION_ID)).revision).toBe(1);
		await expect(
			persistence.commitRejectedCommand({
				runId: RUN_ID,
				regionId: REGION_ID,
				fencingToken: initial.fencingToken,
				receipt: { ...receipt, payloadFingerprint: hash(102) },
				decision: null,
			}),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_COLLISION" });
	});

	it("fences suspended writers without changing canonical hashes", async () => {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		const oldHead = await persistence.getHead(RUN_ID, REGION_ID);
		const transferred = await persistence.acquireFencingToken(
			RUN_ID,
			REGION_ID,
			1,
		);
		expect(transferred.fencingToken).toBe(2);
		expect(transferred.stateHash).toBe(oldHead.stateHash);
		expect(transferred.worldHeadHash).toBe(oldHead.worldHeadHash);
		await expect(
			persistence.commitTransition(transition(oldHead, 1)),
		).rejects.toMatchObject({
			code: "STALE_FENCE",
		});
		await persistence.commitTransition(transition(transferred, 1));
	});

	it("keeps rejected decisions separate from canonical history", async () => {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		const before = await persistence.getHead(RUN_ID, REGION_ID);
		const decision = {
			schemaVersion: "decision-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			decisionId: "decision-rejected",
			decisionRecordHash: hash(77),
			data: { validation: "unknown-action" },
		} as const;
		await persistence.appendRejectedDecision({
			runId: RUN_ID,
			regionId: REGION_ID,
			fencingToken: before.fencingToken,
			decision,
		});
		expect(
			await persistence.getDecisionRecord(
				RUN_ID,
				REGION_ID,
				decision.decisionId,
			),
		).toEqual(decision);
		expect(await persistence.getHead(RUN_ID, REGION_ID)).toEqual(before);
		await expect(
			persistence.appendRejectedDecision({
				runId: RUN_ID,
				regionId: REGION_ID,
				fencingToken: before.fencingToken,
				decision: { ...decision, decisionRecordHash: hash(78) },
			}),
		).rejects.toMatchObject({ code: "DECISION_ID_COLLISION" });
	});

	it("returns verified half-open replay primitives", async () => {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		let head = await persistence.getHead(RUN_ID, REGION_ID);
		await persistence.commitTransition(transition(head, 1, 2));
		head = await persistence.getHead(RUN_ID, REGION_ID);
		await persistence.commitTransition(transition(head, 2, 1));

		const range = await persistence.getReplayRange({
			runId: RUN_ID,
			regionId: REGION_ID,
			snapshotId: "snapshot-genesis",
			fromSequenceInclusive: 1,
			toSequenceExclusive: 4,
		});
		expect(range.events.map((event) => event.sequence)).toEqual([1, 2, 3]);
		expect(range.batches.map((batch) => batch.resultRevision)).toEqual([1, 2]);
		const finalHead = await persistence.getHead(RUN_ID, REGION_ID);
		const finalSnapshot = {
			schemaVersion: "snapshot-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			snapshotId: "snapshot-final",
			baseSequence: finalHead.lastSequence,
			createdAtRevision: finalHead.revision,
			stateHash: finalHead.stateHash,
			baseWorldHeadHash: finalHead.worldHeadHash,
			data: { fixture: "reconstructed-state" },
		} as const;
		await persistence.saveSnapshot({
			snapshot: finalSnapshot,
			fencingToken: finalHead.fencingToken,
		});
		const zeroEventReplay = await persistence.getReplayRange({
			runId: RUN_ID,
			regionId: REGION_ID,
			snapshotId: finalSnapshot.snapshotId,
			fromSequenceInclusive: finalHead.lastSequence + 1,
			toSequenceExclusive: finalHead.lastSequence + 1,
		});
		expect(zeroEventReplay.events).toEqual([]);
		expect(zeroEventReplay.batches).toEqual([]);
		await expect(
			persistence.getReplayRange({
				runId: RUN_ID,
				regionId: REGION_ID,
				snapshotId: "snapshot-genesis",
				fromSequenceInclusive: 2,
				toSequenceExclusive: 4,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});

	it("atomically advances exact catch-up chapters and resumes retries", async () => {
		const crash = new OneShotCrash();
		const persistence = new MemoryPersistence({ crashInjector: crash });
		await persistence.commitGenesis(genesis());
		let head = await persistence.getHead(RUN_ID, REGION_ID);
		const operation = catchUp(head, 2);
		await persistence.beginCatchUpOperation({
			record: operation,
			fencingToken: head.fencingToken,
		});

		const first = transition(head, 1);
		crash.point = "catch-up-chapter:after-commit";
		await expect(
			persistence.commitCatchUpChapter({
				operationId: operation.operationId,
				planHash: operation.planHash,
				chapterOrdinal: 0,
				transition: first,
			}),
		).rejects.toThrow("injected crash");
		const resumed = await persistence.commitCatchUpChapter({
			operationId: operation.operationId,
			planHash: operation.planHash,
			chapterOrdinal: 0,
			transition: first,
		});
		expect(resumed.nextChapter).toBe(1);

		head = await persistence.getHead(RUN_ID, REGION_ID);
		const complete = await persistence.commitCatchUpChapter({
			operationId: operation.operationId,
			planHash: operation.planHash,
			chapterOrdinal: 1,
			transition: transition(head, 2),
		});
		expect(complete.status).toBe("complete");
		expect(complete.nextChapter).toBe(2);
		expect(complete.finalRevision).toBe(2);
	});

	it("uses typed errors for persistence failures", () => {
		const error = new PersistenceError("STORAGE_LIMIT", "bounded");
		expect(error.name).toBe("PersistenceError");
		expect(error.code).toBe("STORAGE_LIMIT");
	});
});
