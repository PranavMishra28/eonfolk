import type {
	CatchUpOperationRecord,
	CommitGenesisRequest,
	CommitTransitionRequest,
	WorldHead,
} from "../../../packages/persistence/src/index.js";

export const RUN_ID = "run-riverhold";
export const REGION_ID = "region-riverhold";

export function hash(number: number): string {
	return number.toString(16).padStart(64, "0");
}

export function genesis(fencingToken = 1): CommitGenesisRequest {
	const stateHash = hash(1);
	const worldHeadHash = hash(2);
	return {
		manifest: {
			schemaVersion: "manifest-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			runKind: "canonical-local-proof",
			manifestHash: hash(3),
			parentRunId: null,
			data: { seed: "riverhold-v1", configuredInterventions: ["counsel"] },
		},
		head: {
			runId: RUN_ID,
			regionId: REGION_ID,
			revision: 0,
			lastSequence: 0,
			stateHash,
			worldHeadHash,
			fencingToken,
		},
		snapshot: {
			schemaVersion: "snapshot-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			snapshotId: "snapshot-genesis",
			baseSequence: 0,
			createdAtRevision: 0,
			stateHash,
			baseWorldHeadHash: worldHeadHash,
			data: { citizens: 8, food: 80, water: 80, wood: 40 },
		},
	};
}

export function transition(
	head: WorldHead,
	ordinal: number,
	eventCount = 1,
): CommitTransitionRequest {
	const commandId = `command-${ordinal}`;
	const batchId = `batch-${ordinal}`;
	const payloadFingerprint = hash(10_000 + ordinal);
	const events = Array.from({ length: eventCount }, (_, index) => {
		const sequence = head.lastSequence + index + 1;
		return {
			schemaVersion: "event-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			batchId,
			commandId,
			eventId: `event-${sequence}`,
			sequence,
			preStateHash:
				index === 0 ? head.stateHash : hash(20_000 + ordinal * 32 + index - 1),
			postStateHash: hash(20_000 + ordinal * 32 + index),
			eventHash: hash(30_000 + ordinal * 32 + index),
			data: { kind: "fixture", amount: ordinal + index },
		};
	});
	const finalEvent = events.at(-1);
	if (finalEvent === undefined)
		throw new Error("fixture requires at least one event");
	const postHead: WorldHead = {
		...head,
		revision: head.revision + 1,
		lastSequence: head.lastSequence + eventCount,
		stateHash: finalEvent.postStateHash,
		worldHeadHash: hash(40_000 + ordinal),
	};
	return {
		runId: RUN_ID,
		regionId: REGION_ID,
		expectedRevision: head.revision,
		expectedStateHash: head.stateHash,
		expectedWorldHeadHash: head.worldHeadHash,
		fencingToken: head.fencingToken,
		batch: {
			schemaVersion: "batch-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			batchId,
			commandId,
			payloadFingerprint,
			previousWorldHeadHash: head.worldHeadHash,
			firstSequence: head.lastSequence + 1,
			eventCount,
			resultRevision: head.revision + 1,
			finalStateHash: finalEvent.postStateHash,
			batchHash: hash(50_000 + ordinal),
			eventHashes: events.map((event) => event.eventHash),
			data: { fixtureOrdinal: ordinal },
		},
		events,
		receipt: {
			schemaVersion: "receipt-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			commandId,
			payloadFingerprint,
			outcome: "accepted",
			observedRevision: head.revision,
			resultingRevision: postHead.revision,
			resultingStateHash: postHead.stateHash,
			resultingWorldHeadHash: postHead.worldHeadHash,
			fencingToken: head.fencingToken,
			batchId,
			fromSequenceInclusive: head.lastSequence + 1,
			toSequenceExclusive: postHead.lastSequence + 1,
			rejectionCode: null,
			data: { source: "fixture" },
		},
		decision: {
			schemaVersion: "decision-v1",
			runId: RUN_ID,
			regionId: REGION_ID,
			decisionId: `decision-${ordinal}`,
			decisionRecordHash: hash(60_000 + ordinal),
			data: { action: "fixture", justification: "bounded test proposal" },
		},
		postHead,
	};
}

export function catchUp(
	head: WorldHead,
	totalChapters = 2,
): CatchUpOperationRecord {
	return {
		schemaVersion: "eonfolk-catch-up-receipt-v1",
		runId: RUN_ID,
		regionId: REGION_ID,
		operationId: "catch-up-1",
		confirmationId: "confirmation-1",
		planHash: hash(70_001),
		totalChapters,
		nextChapter: 0,
		status: "in-progress",
		initialRevision: head.revision,
		currentRevision: head.revision,
		initialStateHash: head.stateHash,
		currentStateHash: head.stateHash,
		initialWorldHeadHash: head.worldHeadHash,
		currentWorldHeadHash: head.worldHeadHash,
		finalRevision: null,
		finalStateHash: null,
		finalWorldHeadHash: null,
		rejectionCode: null,
	};
}
