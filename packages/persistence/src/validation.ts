import { assertRecordBound } from "./bounds.js";
import { canonicalJson } from "./codec.js";
import { PersistenceError } from "./errors.js";
import type {
	CatchUpOperationRecord,
	CommandReceipt,
	CommitGenesisRequest,
	CommitTransitionRequest,
	DecisionRecord,
	EventRangeRequest,
	JsonValue,
	PersistenceBounds,
	SnapshotRecord,
	WorldBatchRecord,
	WorldEventRecord,
	WorldHead,
} from "./types.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;

function containsControlCharacter(value: string): boolean {
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127))
			return true;
	}
	return false;
}

export function asJson(value: unknown): JsonValue {
	return value as JsonValue;
}

export function assertSafeU64(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} must be a non-negative safe integer`,
		);
	}
}

export function assertIdentifier(value: string, label: string): void {
	if (
		value.length < 1 ||
		value.length > 128 ||
		containsControlCharacter(value)
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} is not a bounded identifier`,
		);
	}
}

export function assertHash(value: string, label: string): void {
	if (!HASH_PATTERN.test(value)) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} must be a lowercase 64-hex hash`,
		);
	}
}

function assertScope(
	record: { readonly regionId: string; readonly runId: string },
	runId: string,
	regionId: string,
	label: string,
): void {
	if (record.runId !== runId || record.regionId !== regionId) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} has a mismatched run or region`,
		);
	}
}

export function validateHead(head: WorldHead): void {
	assertIdentifier(head.runId, "head.runId");
	assertIdentifier(head.regionId, "head.regionId");
	assertSafeU64(head.revision, "head.revision");
	assertSafeU64(head.lastSequence, "head.lastSequence");
	assertSafeU64(head.fencingToken, "head.fencingToken");
	assertHash(head.stateHash, "head.stateHash");
	assertHash(head.worldHeadHash, "head.worldHeadHash");
}

export function validateSnapshot(
	snapshot: SnapshotRecord,
	bounds: PersistenceBounds,
): number {
	assertIdentifier(snapshot.schemaVersion, "snapshot.schemaVersion");
	assertIdentifier(snapshot.runId, "snapshot.runId");
	assertIdentifier(snapshot.regionId, "snapshot.regionId");
	assertIdentifier(snapshot.snapshotId, "snapshot.snapshotId");
	assertSafeU64(snapshot.baseSequence, "snapshot.baseSequence");
	assertSafeU64(snapshot.createdAtRevision, "snapshot.createdAtRevision");
	assertHash(snapshot.stateHash, "snapshot.stateHash");
	assertHash(snapshot.baseWorldHeadHash, "snapshot.baseWorldHeadHash");
	return assertRecordBound(asJson(snapshot), bounds, "snapshot");
}

export function validateGenesis(
	request: CommitGenesisRequest,
	bounds: PersistenceBounds,
): { readonly bytes: number; readonly fingerprint: string } {
	const { manifest, head, snapshot } = request;
	assertIdentifier(manifest.schemaVersion, "manifest.schemaVersion");
	assertIdentifier(manifest.runId, "manifest.runId");
	assertIdentifier(manifest.regionId, "manifest.regionId");
	assertHash(manifest.manifestHash, "manifest.manifestHash");
	if (
		manifest.runKind !== "canonical-local-proof" ||
		manifest.parentRunId !== null
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"the local proof accepts only an unparented canonical-local-proof manifest",
		);
	}
	validateHead(head);
	const snapshotBytes = validateSnapshot(snapshot, bounds);
	assertScope(head, manifest.runId, manifest.regionId, "head");
	assertScope(snapshot, manifest.runId, manifest.regionId, "snapshot");
	if (head.revision !== 0 || head.lastSequence !== 0) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"genesis head must start at revision and sequence zero",
		);
	}
	if (snapshot.baseSequence !== 0 || snapshot.createdAtRevision !== 0) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"genesis snapshot must start at revision and sequence zero",
		);
	}
	if (
		snapshot.stateHash !== head.stateHash ||
		snapshot.baseWorldHeadHash !== head.worldHeadHash
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"genesis snapshot hashes must match the head",
		);
	}
	const manifestBytes = assertRecordBound(asJson(manifest), bounds, "manifest");
	const headBytes = assertRecordBound(asJson(head), bounds, "world head");
	return {
		bytes: manifestBytes + headBytes + snapshotBytes,
		fingerprint: canonicalJson(asJson(request)),
	};
}

export function validateDecision(
	decision: DecisionRecord,
	runId: string,
	regionId: string,
	bounds: PersistenceBounds,
): number {
	assertScope(decision, runId, regionId, "decision");
	assertIdentifier(decision.schemaVersion, "decision.schemaVersion");
	assertIdentifier(decision.decisionId, "decision.decisionId");
	assertHash(decision.decisionRecordHash, "decision.decisionRecordHash");
	return assertRecordBound(asJson(decision), bounds, "decision");
}

export function validateReceipt(
	receipt: CommandReceipt,
	runId: string,
	regionId: string,
	bounds: PersistenceBounds,
): number {
	assertScope(receipt, runId, regionId, "receipt");
	assertIdentifier(receipt.schemaVersion, "receipt.schemaVersion");
	assertIdentifier(receipt.commandId, "receipt.commandId");
	assertHash(receipt.payloadFingerprint, "receipt.payloadFingerprint");
	assertSafeU64(receipt.observedRevision, "receipt.observedRevision");
	assertSafeU64(receipt.resultingRevision, "receipt.resultingRevision");
	assertSafeU64(receipt.fencingToken, "receipt.fencingToken");
	assertHash(receipt.resultingStateHash, "receipt.resultingStateHash");
	assertHash(receipt.resultingWorldHeadHash, "receipt.resultingWorldHeadHash");
	if (receipt.outcome === "accepted") {
		if (
			receipt.batchId === null ||
			receipt.fromSequenceInclusive === null ||
			receipt.toSequenceExclusive === null ||
			receipt.rejectionCode !== null
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"accepted receipt has an invalid result shape",
			);
		}
		assertIdentifier(receipt.batchId, "receipt.batchId");
		assertSafeU64(
			receipt.fromSequenceInclusive,
			"receipt.fromSequenceInclusive",
		);
		assertSafeU64(receipt.toSequenceExclusive, "receipt.toSequenceExclusive");
		if (receipt.fromSequenceInclusive >= receipt.toSequenceExclusive) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"accepted receipt interval must be non-empty",
			);
		}
	} else if (
		receipt.batchId !== null ||
		receipt.fromSequenceInclusive !== null ||
		receipt.toSequenceExclusive !== null ||
		receipt.rejectionCode === null
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"rejected receipt has an invalid result shape",
		);
	} else {
		assertIdentifier(receipt.rejectionCode, "receipt.rejectionCode");
	}
	return assertRecordBound(asJson(receipt), bounds, "command receipt");
}

function validateBatch(
	batch: WorldBatchRecord,
	runId: string,
	regionId: string,
	bounds: PersistenceBounds,
): number {
	assertScope(batch, runId, regionId, "batch");
	assertIdentifier(batch.schemaVersion, "batch.schemaVersion");
	assertIdentifier(batch.batchId, "batch.batchId");
	assertIdentifier(batch.commandId, "batch.commandId");
	assertHash(batch.payloadFingerprint, "batch.payloadFingerprint");
	assertHash(batch.previousWorldHeadHash, "batch.previousWorldHeadHash");
	assertHash(batch.finalStateHash, "batch.finalStateHash");
	assertHash(batch.batchHash, "batch.batchHash");
	assertSafeU64(batch.firstSequence, "batch.firstSequence");
	assertSafeU64(batch.eventCount, "batch.eventCount");
	assertSafeU64(batch.resultRevision, "batch.resultRevision");
	if (batch.eventCount < 1 || batch.eventCount > bounds.maximumEventsPerBatch) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"batch event count is outside local bounds",
		);
	}
	if (batch.eventHashes.length !== batch.eventCount) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"batch eventHashes length does not match eventCount",
		);
	}
	for (const [index, hash] of batch.eventHashes.entries())
		assertHash(hash, `batch.eventHashes[${index}]`);
	return assertRecordBound(asJson(batch), bounds, "world batch");
}

function validateEvent(
	event: WorldEventRecord,
	runId: string,
	regionId: string,
	bounds: PersistenceBounds,
): number {
	assertScope(event, runId, regionId, "event");
	assertIdentifier(event.schemaVersion, "event.schemaVersion");
	assertIdentifier(event.batchId, "event.batchId");
	assertIdentifier(event.commandId, "event.commandId");
	assertIdentifier(event.eventId, "event.eventId");
	assertSafeU64(event.sequence, "event.sequence");
	assertHash(event.preStateHash, "event.preStateHash");
	assertHash(event.postStateHash, "event.postStateHash");
	assertHash(event.eventHash, "event.eventHash");
	return assertRecordBound(asJson(event), bounds, "world event");
}

export function validateTransition(
	request: CommitTransitionRequest,
	head: WorldHead,
	bounds: PersistenceBounds,
): number {
	assertIdentifier(request.runId, "request.runId");
	assertIdentifier(request.regionId, "request.regionId");
	assertSafeU64(request.expectedRevision, "request.expectedRevision");
	assertHash(request.expectedStateHash, "request.expectedStateHash");
	assertHash(request.expectedWorldHeadHash, "request.expectedWorldHeadHash");
	assertSafeU64(request.fencingToken, "request.fencingToken");
	if (request.expectedRevision !== head.revision) {
		throw new PersistenceError(
			"STALE_REVISION",
			"transition expected a stale revision",
		);
	}
	if (request.expectedStateHash !== head.stateHash) {
		throw new PersistenceError(
			"STALE_STATE",
			"transition expected a stale state hash",
		);
	}
	if (request.expectedWorldHeadHash !== head.worldHeadHash) {
		throw new PersistenceError(
			"STALE_WORLD_HEAD",
			"transition expected a stale world-head hash",
		);
	}
	if (request.fencingToken !== head.fencingToken) {
		throw new PersistenceError(
			"STALE_FENCE",
			"transition used a stale fencing token",
		);
	}
	assertScope(request.postHead, request.runId, request.regionId, "postHead");
	validateHead(request.postHead);
	if (
		request.postHead.revision !== head.revision + 1 ||
		request.postHead.lastSequence !==
			head.lastSequence + request.events.length ||
		request.postHead.fencingToken !== head.fencingToken ||
		request.postHead.worldHeadHash === head.worldHeadHash
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"post head must advance one revision and one world-head link",
		);
	}
	const batchBytes = validateBatch(
		request.batch,
		request.runId,
		request.regionId,
		bounds,
	);
	const receiptBytes = validateReceipt(
		request.receipt,
		request.runId,
		request.regionId,
		bounds,
	);
	if (request.receipt.outcome !== "accepted") {
		throw new PersistenceError(
			"INVALID_INPUT",
			"a transition requires an accepted receipt",
		);
	}
	if (request.events.length !== request.batch.eventCount) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"transition event count does not match its batch",
		);
	}
	if (
		request.batch.firstSequence !== head.lastSequence + 1 ||
		request.batch.resultRevision !== request.postHead.revision ||
		request.batch.previousWorldHeadHash !== head.worldHeadHash ||
		request.batch.finalStateHash !== request.postHead.stateHash ||
		request.batch.commandId !== request.receipt.commandId ||
		request.batch.payloadFingerprint !== request.receipt.payloadFingerprint ||
		request.receipt.batchId !== request.batch.batchId ||
		request.receipt.observedRevision !== head.revision ||
		request.receipt.resultingRevision !== request.postHead.revision ||
		request.receipt.resultingStateHash !== request.postHead.stateHash ||
		request.receipt.resultingWorldHeadHash !== request.postHead.worldHeadHash ||
		request.receipt.fencingToken !== head.fencingToken ||
		request.receipt.fromSequenceInclusive !== request.batch.firstSequence ||
		request.receipt.toSequenceExclusive !== request.postHead.lastSequence + 1
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"batch, receipt, and post head do not agree",
		);
	}
	let previousStateHash = head.stateHash;
	let eventBytes = 0;
	for (const [index, event] of request.events.entries()) {
		eventBytes += validateEvent(event, request.runId, request.regionId, bounds);
		if (
			event.sequence !== request.batch.firstSequence + index ||
			event.batchId !== request.batch.batchId ||
			event.commandId !== request.batch.commandId ||
			event.preStateHash !== previousStateHash ||
			event.eventHash !== request.batch.eventHashes[index]
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				`event ${index} breaks batch ordering or hashes`,
			);
		}
		previousStateHash = event.postStateHash;
	}
	if (previousStateHash !== request.postHead.stateHash) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"final event does not reach the post-state hash",
		);
	}
	let decisionBytes = 0;
	if (request.decision !== null) {
		decisionBytes = validateDecision(
			request.decision,
			request.runId,
			request.regionId,
			bounds,
		);
	}
	return (
		batchBytes +
		eventBytes +
		receiptBytes +
		decisionBytes +
		assertRecordBound(asJson(request.postHead), bounds, "post head")
	);
}

export function validateRejectedReceiptAgainstHead(
	receipt: CommandReceipt,
	head: WorldHead,
	bounds: PersistenceBounds,
): number {
	const bytes = validateReceipt(receipt, head.runId, head.regionId, bounds);
	if (
		receipt.outcome !== "rejected" ||
		receipt.observedRevision !== head.revision ||
		receipt.resultingRevision !== head.revision ||
		receipt.resultingStateHash !== head.stateHash ||
		receipt.resultingWorldHeadHash !== head.worldHeadHash ||
		receipt.fencingToken !== head.fencingToken
	) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"rejected receipt must preserve the current head",
		);
	}
	return bytes;
}

export function validateCatchUp(
	record: CatchUpOperationRecord,
	head: WorldHead,
	bounds: PersistenceBounds,
): number {
	assertScope(record, head.runId, head.regionId, "catch-up receipt");
	assertIdentifier(record.operationId, "catch-up.operationId");
	assertIdentifier(record.confirmationId, "catch-up.confirmationId");
	assertHash(record.planHash, "catch-up.planHash");
	assertSafeU64(record.totalChapters, "catch-up.totalChapters");
	assertSafeU64(record.nextChapter, "catch-up.nextChapter");
	assertSafeU64(record.initialRevision, "catch-up.initialRevision");
	assertSafeU64(record.currentRevision, "catch-up.currentRevision");
	assertHash(record.initialStateHash, "catch-up.initialStateHash");
	assertHash(record.currentStateHash, "catch-up.currentStateHash");
	assertHash(record.initialWorldHeadHash, "catch-up.initialWorldHeadHash");
	assertHash(record.currentWorldHeadHash, "catch-up.currentWorldHeadHash");
	if (
		record.initialRevision !== head.revision ||
		record.currentRevision !== head.revision ||
		record.initialStateHash !== head.stateHash ||
		record.currentStateHash !== head.stateHash ||
		record.initialWorldHeadHash !== head.worldHeadHash ||
		record.currentWorldHeadHash !== head.worldHeadHash
	) {
		throw new PersistenceError(
			"STALE_WORLD_HEAD",
			"catch-up preflight does not match the head",
		);
	}
	if (record.status === "rejected") {
		if (
			record.totalChapters !== 0 ||
			record.nextChapter !== 0 ||
			record.finalRevision !== null ||
			record.finalStateHash !== null ||
			record.finalWorldHeadHash !== null ||
			record.rejectionCode === null
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"rejected catch-up receipt has invalid fields",
			);
		}
		assertIdentifier(record.rejectionCode, "catch-up.rejectionCode");
	} else {
		if (
			record.status !== "in-progress" ||
			record.totalChapters < 1 ||
			record.totalChapters > bounds.maximumCatchUpChapters ||
			record.nextChapter !== 0 ||
			record.finalRevision !== null ||
			record.finalStateHash !== null ||
			record.finalWorldHeadHash !== null ||
			record.rejectionCode !== null
		) {
			throw new PersistenceError(
				"INVALID_INPUT",
				"new catch-up receipt must be valid in-progress state",
			);
		}
	}
	return assertRecordBound(asJson(record), bounds, "catch-up receipt");
}

export function nextCatchUpRecord(
	record: CatchUpOperationRecord,
	postHead: WorldHead,
): CatchUpOperationRecord {
	const nextChapter = record.nextChapter + 1;
	const complete = nextChapter === record.totalChapters;
	return {
		...record,
		status: complete ? "complete" : "in-progress",
		nextChapter,
		currentRevision: postHead.revision,
		currentStateHash: postHead.stateHash,
		currentWorldHeadHash: postHead.worldHeadHash,
		finalRevision: complete ? postHead.revision : null,
		finalStateHash: complete ? postHead.stateHash : null,
		finalWorldHeadHash: complete ? postHead.worldHeadHash : null,
	};
}

export function validateRange(
	request: EventRangeRequest,
	maximumLength: number,
	label: string,
): void {
	assertIdentifier(request.runId, `${label}.runId`);
	assertIdentifier(request.regionId, `${label}.regionId`);
	assertSafeU64(request.fromSequenceInclusive, `${label}.fromInclusive`);
	assertSafeU64(request.toSequenceExclusive, `${label}.toExclusive`);
	const length = request.toSequenceExclusive - request.fromSequenceInclusive;
	if (length < 0 || length > maximumLength) {
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} exceeds its bounded interval`,
		);
	}
}
