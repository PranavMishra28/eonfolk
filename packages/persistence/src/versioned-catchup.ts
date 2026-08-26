import { canonicalJson, cloneValue } from "./codec.js";
import { PersistenceError } from "./errors.js";
import type { CatchUpOperationRecord, JsonValue } from "./types.js";
import type {
	AppendAuthorityBatchRequest,
	AuthorityAppendReceipt,
	AuthorityHead,
	AuthorityScope,
	VersionedPersistencePort,
} from "./versioned-types.js";
import {
	AUTHORITY_CATCH_UP_RECEIPT_SCHEMA_VERSION,
	AUTHORITY_REJECTION_SCHEMA_VERSION,
} from "./versioned-types.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const textEncoder = new TextEncoder();
const MARKER_SCHEMA_VERSION = "eonfolk-authority-catch-up-marker-v1" as const;

export interface AuthorityCatchUpPlan extends AuthorityScope {
	readonly operationId: string;
	readonly confirmationId: string;
	readonly confirmed: boolean;
	readonly rejectionCode?: string;
	readonly chapters: readonly AppendAuthorityBatchRequest[];
}

export interface AuthorityCatchUpResult {
	readonly receipt: CatchUpOperationRecord;
	readonly head: AuthorityHead;
	readonly chapterReceipts: readonly AuthorityAppendReceipt[];
	readonly idempotentChapters: number;
}

function fail(
	code: "CATCH_UP_ID_COLLISION" | "INVALID_INPUT" | "RANGE_GAP" | "STALE_STATE",
	message: string,
): never {
	throw new PersistenceError(code, message);
}

function identifier(value: string, label: string): string {
	const hasControlCharacter = [...value].some((character) => {
		const codePoint = character.codePointAt(0);
		return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
	});
	if (value.length < 1 || value.length > 80 || hasControlCharacter)
		fail("INVALID_INPUT", `${label} is not a bounded identifier`);
	return value;
}

async function sha256(value: string): Promise<string> {
	if (globalThis.crypto?.subtle === undefined)
		fail("INVALID_INPUT", "WebCrypto SHA-256 is unavailable");
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		textEncoder.encode(value),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function domainHash(domain: string, value: JsonValue): Promise<string> {
	return await sha256(`${domain}\u0000${canonicalJson(value)}`);
}

function markerId(operationId: string, chapter: number | "start"): string {
	return `catch-up:${identifier(operationId, "catch-up.operationId")}:${String(chapter)}`;
}

function marker(record: CatchUpOperationRecord): JsonValue {
	return {
		schemaVersion: MARKER_SCHEMA_VERSION,
		outcome: "rejected",
		rejectionCode: "NON_REALITY_OPERATION_RECORDED",
		catchUpOperation: cloneValue(record as unknown as JsonValue),
	};
}

function receiptFromMarker(
	receipt: AuthorityAppendReceipt | null,
): CatchUpOperationRecord | null {
	if (receipt === null) return null;
	const value = receipt.commandReceipt;
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail("STALE_STATE", "catch-up marker is malformed");
	const valueRecord = value as { readonly [key: string]: JsonValue };
	if (
		valueRecord.schemaVersion !== MARKER_SCHEMA_VERSION ||
		valueRecord.outcome !== "rejected" ||
		valueRecord.rejectionCode !== "NON_REALITY_OPERATION_RECORDED" ||
		valueRecord.catchUpOperation === null ||
		typeof valueRecord.catchUpOperation !== "object" ||
		Array.isArray(valueRecord.catchUpOperation) ||
		Object.keys(valueRecord).length !== 4
	)
		fail("STALE_STATE", "catch-up marker is malformed");
	return cloneValue(
		valueRecord.catchUpOperation as unknown as CatchUpOperationRecord,
	);
}

function validateRecord(
	record: CatchUpOperationRecord,
	plan: AuthorityCatchUpPlan,
	planHash: string,
): void {
	const expectedKeys = [
		"schemaVersion",
		"runId",
		"regionId",
		"operationId",
		"confirmationId",
		"planHash",
		"totalChapters",
		"nextChapter",
		"status",
		"initialRevision",
		"currentRevision",
		"initialStateHash",
		"currentStateHash",
		"initialWorldHeadHash",
		"currentWorldHeadHash",
		"finalRevision",
		"finalStateHash",
		"finalWorldHeadHash",
		"rejectionCode",
	].sort();
	if (
		Object.keys(record).sort().join("\u0000") !== expectedKeys.join("\u0000") ||
		record.schemaVersion !== AUTHORITY_CATCH_UP_RECEIPT_SCHEMA_VERSION ||
		record.runId !== plan.runId ||
		record.regionId !== plan.regionId ||
		record.operationId !== plan.operationId ||
		record.confirmationId !== plan.confirmationId ||
		record.planHash !== planHash ||
		record.totalChapters !== plan.chapters.length ||
		!Number.isSafeInteger(record.nextChapter) ||
		record.nextChapter < 0 ||
		record.nextChapter > record.totalChapters ||
		!Number.isSafeInteger(record.initialRevision) ||
		record.initialRevision < 0 ||
		!Number.isSafeInteger(record.currentRevision) ||
		record.currentRevision < record.initialRevision ||
		!HASH_PATTERN.test(record.initialStateHash) ||
		!HASH_PATTERN.test(record.currentStateHash) ||
		!HASH_PATTERN.test(record.initialWorldHeadHash) ||
		!HASH_PATTERN.test(record.currentWorldHeadHash) ||
		(record.finalRevision !== null &&
			(!Number.isSafeInteger(record.finalRevision) ||
				record.finalRevision < record.initialRevision)) ||
		(record.finalStateHash !== null &&
			!HASH_PATTERN.test(record.finalStateHash)) ||
		(record.finalWorldHeadHash !== null &&
			!HASH_PATTERN.test(record.finalWorldHeadHash))
	)
		fail("STALE_STATE", "catch-up receipt is malformed");
	if (record.status === "rejected") {
		if (
			record.nextChapter !== 0 ||
			record.currentRevision !== record.initialRevision ||
			record.currentStateHash !== record.initialStateHash ||
			record.currentWorldHeadHash !== record.initialWorldHeadHash ||
			record.finalRevision !== null ||
			record.finalStateHash !== null ||
			record.finalWorldHeadHash !== null ||
			typeof record.rejectionCode !== "string"
		)
			fail("STALE_STATE", "rejected catch-up receipt is malformed");
		return;
	}
	if (record.rejectionCode !== null)
		fail("STALE_STATE", "accepted catch-up receipt has a rejection");
	if (record.status === "in-progress") {
		if (
			record.nextChapter >= record.totalChapters ||
			record.finalRevision !== null ||
			record.finalStateHash !== null ||
			record.finalWorldHeadHash !== null
		)
			fail("STALE_STATE", "in-progress catch-up receipt is malformed");
		return;
	}
	if (
		record.status !== "complete" ||
		record.nextChapter !== record.totalChapters ||
		record.finalRevision !== record.currentRevision ||
		record.finalStateHash !== record.currentStateHash ||
		record.finalWorldHeadHash !== record.currentWorldHeadHash
	)
		fail("STALE_STATE", "complete catch-up receipt is malformed");
}

async function planHash(plan: AuthorityCatchUpPlan): Promise<string> {
	return await domainHash("eonfolk-authority-catch-up-plan-v1", {
		runId: plan.runId,
		regionId: plan.regionId,
		operationId: plan.operationId,
		confirmationId: plan.confirmationId,
		confirmed: plan.confirmed,
		rejectionCode: plan.rejectionCode ?? null,
		chapters: plan.chapters as unknown as JsonValue,
	});
}

async function appendHash(
	chapter: AppendAuthorityBatchRequest,
): Promise<string> {
	return await domainHash(
		"eonfolk-authority-append-v2",
		chapter as unknown as JsonValue,
	);
}

async function recordMarker(
	port: VersionedPersistencePort,
	head: AuthorityHead,
	record: CatchUpOperationRecord,
	chapter: number | "start",
): Promise<void> {
	await port.recordRejectedCommand({
		schemaVersion: AUTHORITY_REJECTION_SCHEMA_VERSION,
		runId: record.runId,
		regionId: record.regionId,
		appendId: markerId(record.operationId, chapter),
		expectedRevision: head.revision,
		expectedLastSequence: head.lastSequence,
		expectedStateHash: head.stateHash,
		expectedLastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
		commandReceipt: marker(record),
		decisionRecord: null,
	});
}

/**
 * Runs a bounded chapter plan using only the versioned port's durable,
 * receipt-only metadata and atomic chapter appends. A crash after a chapter
 * append but before its progress marker is recovered by the exact append retry.
 */
export async function persistAuthorityCatchUp(
	port: VersionedPersistencePort,
	plan: AuthorityCatchUpPlan,
): Promise<AuthorityCatchUpResult> {
	if (plan.chapters.length < 1 || plan.chapters.length > 50_000)
		fail("INVALID_INPUT", "catch-up chapter count is outside bounds");
	identifier(plan.confirmationId, "catch-up.confirmationId");
	if (plan.confirmed && plan.rejectionCode !== undefined)
		fail("INVALID_INPUT", "confirmed catch-up cannot have a rejection code");
	if (plan.rejectionCode !== undefined)
		identifier(plan.rejectionCode, "catch-up.rejectionCode");
	const appendIds = new Set<string>();
	for (const chapter of plan.chapters) {
		if (chapter.runId !== plan.runId || chapter.regionId !== plan.regionId)
			fail("INVALID_INPUT", "catch-up chapter has a different authority scope");
		if (appendIds.has(chapter.appendId))
			fail("INVALID_INPUT", "catch-up chapter append IDs must be unique");
		appendIds.add(chapter.appendId);
	}
	const digest = await planHash(plan);
	const startId = markerId(plan.operationId, "start");
	let current = receiptFromMarker(await port.getAppendReceipt(plan, startId));
	let head = await port.loadHead(plan);
	if (current === null) {
		let committedPrefix = 0;
		for (const chapter of plan.chapters) {
			const existing = await port.getAppendReceipt(plan, chapter.appendId);
			if (existing === null) break;
			if (existing.appendHash !== (await appendHash(chapter)))
				fail("CATCH_UP_ID_COLLISION", "catch-up chapter bytes differ");
			committedPrefix += 1;
		}
		for (const chapter of plan.chapters.slice(committedPrefix))
			if ((await port.getAppendReceipt(plan, chapter.appendId)) !== null)
				fail("RANGE_GAP", "catch-up chapter receipts contain a gap");
		const complete = plan.confirmed && committedPrefix === plan.chapters.length;
		current = {
			schemaVersion: AUTHORITY_CATCH_UP_RECEIPT_SCHEMA_VERSION,
			runId: plan.runId,
			regionId: plan.regionId,
			operationId: plan.operationId,
			confirmationId: plan.confirmationId,
			planHash: digest,
			totalChapters: plan.chapters.length,
			nextChapter: plan.confirmed ? committedPrefix : 0,
			status: !plan.confirmed
				? "rejected"
				: complete
					? "complete"
					: "in-progress",
			initialRevision: head.revision,
			currentRevision: head.revision,
			initialStateHash: head.stateHash,
			currentStateHash: head.stateHash,
			initialWorldHeadHash: head.lastEventHash,
			currentWorldHeadHash: head.lastEventHash,
			finalRevision: complete ? head.revision : null,
			finalStateHash: complete ? head.stateHash : null,
			finalWorldHeadHash: complete ? head.lastEventHash : null,
			rejectionCode: plan.confirmed
				? null
				: (plan.rejectionCode ?? "CONFIRMATION_REJECTED"),
		};
		validateRecord(current, plan, digest);
		await recordMarker(port, head, current, "start");
	} else {
		if (
			current.runId !== plan.runId ||
			current.regionId !== plan.regionId ||
			current.operationId !== plan.operationId ||
			current.confirmationId !== plan.confirmationId ||
			current.planHash !== digest
		)
			fail("CATCH_UP_ID_COLLISION", "catch-up operation has a different plan");
		validateRecord(current, plan, digest);
		for (
			let ordinal = current.nextChapter;
			ordinal < current.totalChapters;
			ordinal += 1
		) {
			const progress = receiptFromMarker(
				await port.getAppendReceipt(plan, markerId(plan.operationId, ordinal)),
			);
			if (progress === null) break;
			validateRecord(progress, plan, digest);
			if (progress.nextChapter !== ordinal + 1)
				fail("RANGE_GAP", "catch-up progress marker is out of order");
			current = progress;
		}
	}
	if (current.status !== "in-progress")
		return {
			receipt: cloneValue(current),
			head,
			chapterReceipts: [],
			idempotentChapters: 0,
		};
	const chapterReceipts: AuthorityAppendReceipt[] = [];
	let idempotentChapters = 0;
	for (
		let ordinal = current.nextChapter;
		ordinal < plan.chapters.length;
		ordinal += 1
	) {
		const chapter = plan.chapters[ordinal];
		if (chapter === undefined) fail("RANGE_GAP", "catch-up chapter is missing");
		const committed = await port.appendEventBatch(chapter);
		head = committed.head;
		chapterReceipts.push(committed.receipt);
		if (committed.idempotent) idempotentChapters += 1;
		const complete = ordinal + 1 === plan.chapters.length;
		current = {
			...current,
			nextChapter: ordinal + 1,
			status: complete ? "complete" : "in-progress",
			currentRevision: head.revision,
			currentStateHash: head.stateHash,
			currentWorldHeadHash: head.lastEventHash,
			finalRevision: complete ? head.revision : null,
			finalStateHash: complete ? head.stateHash : null,
			finalWorldHeadHash: complete ? head.lastEventHash : null,
		};
		validateRecord(current, plan, digest);
		await recordMarker(port, head, current, ordinal);
	}
	return {
		receipt: cloneValue(current),
		head,
		chapterReceipts,
		idempotentChapters,
	};
}
