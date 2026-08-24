/// <reference path="../../../apps/web/src/build-globals.d.ts" />

import { sponsorGeneratedCitizen } from "../../../apps/web/src/generated-sponsor-runtime.js";
import {
	GENERATED_WORLD_STORAGE_KEY,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "../../../apps/web/src/generated-world-runtime.js";
import {
	type BrowserPersistenceBoundaryPoint,
	BrowserVersionedPersistence,
	GENERATED_AUTHORITY_STORES,
} from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	advanceGeneratedCivilization,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";
import type { CivilizationState } from "../../../packages/civilization/src/index.js";
import { createCivilizationAbstentionBoundaryAppend } from "../../../packages/persistence/src/civilization-sponsor.js";
import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	AUTHORITY_REJECTION_SCHEMA_VERSION,
	type AuthorityHead,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	EMPTY_EVENT_HASH,
	type PersistenceError,
	replayAuthoritativeEvents,
	replayCivilizationHistory,
	type VersionedCrashPoint,
	type VersionedPersistencePort,
} from "../../../packages/persistence/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

declare global {
	interface Window {
		__generatedPersistenceResult?: {
			readonly error?: string;
			readonly result?: unknown;
		};
	}
}

const DATABASE = "eonfolk-generated-versioned-browser-test";
const SESSION_DATABASE = "eonfolk-generated-versioned-session-browser-test";
const CIVILIZATION_DATABASE = "eonfolk-generated-civilization-browser-test";
const CATCH_UP_RESUME_DATABASE =
	"eonfolk-generated-catch-up-resume-browser-test";
const OPEN_FAILURE_DATABASE = "eonfolk-generated-open-failure-browser-test";
const QUOTA_DATABASE = "eonfolk-generated-quota-browser-test";
const SCOPE = { runId: "generated-browser-run", regionId: "generated-region" };
const ENGINE_VERSION = "generated-browser-engine-v1";
const STATE_VERSION = "generated-browser-state-v1";

class OneShotCrash {
	point: VersionedCrashPoint | null = null;

	hit(point: VersionedCrashPoint): void {
		if (point === this.point) {
			this.point = null;
			throw new Error(`injected ${point}`);
		}
	}
}

class OneShotBoundary {
	point: BrowserPersistenceBoundaryPoint | null = null;
	errorName: string | null = null;
	readHits = 0;

	hit(
		point: BrowserPersistenceBoundaryPoint,
		transaction?: IDBTransaction,
	): void {
		if (point === "read") this.readHits += 1;
		if (point === this.point) {
			this.point = null;
			if (point === "transaction-abort") {
				transaction?.abort();
				return;
			}
			if (this.errorName !== null) {
				const name = this.errorName;
				this.errorName = null;
				throw new DOMException(`injected ${name}`, name);
			}
			throw new Error(`injected IndexedDB ${point} boundary`);
		}
	}
}

function deleteDatabase(name = DATABASE): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.addEventListener("success", () => resolve(), { once: true });
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
}

async function genesis() {
	const snapshot = await createAuthoritySnapshot({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_VERSION,
		snapshotId: "genesis",
		revision: 0,
		baseSequence: 0,
		simulationTime: 0,
		lastEventHash: EMPTY_EVENT_HASH,
		state: { count: 0 },
	});
	const head = await createAuthorityHead({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_VERSION,
		revision: 0,
		lastSequence: 0,
		simulationTime: 0,
		stateHash: snapshot.stateHash,
		lastEventHash: EMPTY_EVENT_HASH,
		fencingToken: 1,
	});
	return {
		...SCOPE,
		schemaVersion: AUTHORITY_GENESIS_SCHEMA_VERSION,
		genesisId: "generated-browser-genesis",
		head,
		snapshot,
	};
}

async function append(
	head: AuthorityHead,
	count: number,
): Promise<AppendAuthorityBatchRequest> {
	const appendId = `append-${count}`;
	const batchId = `batch-${count}`;
	const nextState = { count };
	const nextSnapshot = await createAuthoritySnapshot({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_VERSION,
		snapshotId: `candidate-${count}`,
		revision: head.revision + 1,
		baseSequence: head.lastSequence + 1,
		simulationTime: count,
		lastEventHash: head.lastEventHash,
		state: nextState,
	});
	const event = await createAuthorityEvent({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_VERSION,
		appendId,
		batchId,
		eventId: `event-${count}`,
		sequence: head.lastSequence + 1,
		simulationTime: count,
		causalParents: [],
		visibility: { kind: "authority-only" },
		provenance: {
			mechanismId: "deterministic-browser-test",
			cognitionDecisionId: null,
			brainKind: null,
		},
		preStateHash: head.stateHash,
		postStateHash: nextSnapshot.stateHash,
		previousEventHash: head.lastEventHash,
		eventType: "CountAdvanced",
		payload: { nextState },
	});
	return {
		...SCOPE,
		schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
		appendId,
		batchId,
		expectedRevision: head.revision,
		expectedLastSequence: head.lastSequence,
		expectedStateHash: head.stateHash,
		expectedLastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
		events: [event],
	};
}

async function corruptEvent(
	databaseName = DATABASE,
	sequence = 2,
): Promise<void> {
	const request = indexedDB.open(databaseName);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(
			GENERATED_AUTHORITY_STORES.events,
			"readwrite",
		);
		const store = transaction.objectStore(GENERATED_AUTHORITY_STORES.events);
		const rows = store.getAll();
		rows.addEventListener("success", () => {
			const row = (
				rows.result as Array<{ value: { sequence: number; payload: unknown } }>
			).find((candidate) => candidate.value.sequence === sequence);
			if (row === undefined) {
				transaction.abort();
				return;
			}
			store.put({
				...row,
				value: { ...row.value, payload: { nextState: { count: 999 } } },
			});
		});
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener(
			"abort",
			() => reject(new Error("event corruption fixture aborted")),
			{ once: true },
		);
		transaction.addEventListener("error", () => reject(transaction.error), {
			once: true,
		});
	});
	database.close();
}

async function verifyValidatedAuthoritySession(): Promise<
	Readonly<{
		readonly fullValidationReads: number;
		readonly preCommitFailureCaught: boolean;
		readonly revisionAfterPreCommitFailure: number;
		readonly postCommitFailureCaught: boolean;
		readonly revisionAfterPostCommitFailure: number;
		readonly persistedRevision: number;
		readonly persistedEvents: number;
		readonly persistedReceipt: boolean;
		readonly activeSessionCloseCode: string | null;
		readonly concurrentWriteCode: string | null;
		readonly concurrentChangeCode: string | null;
		readonly postConcurrentFencingToken: number;
		readonly corruptionCode: string | null;
		readonly corruptionWriteCode: string | null;
		readonly corruptionWriteAtomic: boolean;
		readonly postSessionCorruptionCode: string | null;
	}>
> {
	await deleteDatabase(SESSION_DATABASE);
	const boundary = new OneShotBoundary();
	const crash = new OneShotCrash();
	const port = await BrowserVersionedPersistence.open({
		databaseName: SESSION_DATABASE,
		boundaryInjector: boundary,
		crashInjector: crash,
	});
	const created = await genesis();
	await port.initialize(created);
	const readsBefore = boundary.readHits;
	const firstRequest = await append(created.head, 1);
	let preCommitFailureCaught = false;
	let postCommitFailureCaught = false;
	let revisionAfterPreCommitFailure = -1;
	let revisionAfterPostCommitFailure = -1;
	const sessionEvents = await port.session(SCOPE, async () => {
		await port.loadHead(SCOPE);
		await port.loadLatestSnapshot(SCOPE);
		await port.getEventRange({
			...SCOPE,
			fromSequenceInclusive: 1,
			toSequenceExclusive: 1,
		});
		boundary.point = "transaction-abort";
		try {
			await port.appendEventBatch(firstRequest);
		} catch {
			preCommitFailureCaught = true;
		}
		revisionAfterPreCommitFailure = (await port.loadHead(SCOPE)).revision;
		crash.point = "authority-append:after-commit";
		try {
			await port.appendEventBatch(firstRequest);
		} catch {
			postCommitFailureCaught = true;
		}
		const headAfterPostCommitFailure = await port.loadHead(SCOPE);
		revisionAfterPostCommitFailure = headAfterPostCommitFailure.revision;
		await port.appendEventBatch(await append(headAfterPostCommitFailure, 2));
		await port.getAppendReceipt(SCOPE, firstRequest.appendId);
		return await port.getEventRange({
			...SCOPE,
			fromSequenceInclusive: 1,
			toSequenceExclusive: 3,
		});
	});
	const fullValidationReads = boundary.readHits - readsBefore;
	port.close();

	const reopened = await BrowserVersionedPersistence.open({
		databaseName: SESSION_DATABASE,
	});
	const persistedHead = await reopened.loadHead(SCOPE);
	const persistedEvents = await reopened.getEventRange({
		...SCOPE,
		fromSequenceInclusive: 1,
		toSequenceExclusive: 3,
	});
	const persistedReceipt =
		(await reopened.getAppendReceipt(SCOPE, firstRequest.appendId)) !== null;
	reopened.close();

	const sessionPort = await BrowserVersionedPersistence.open({
		databaseName: SESSION_DATABASE,
	});
	let activeSessionCloseCode: string | null = null;
	let concurrentWriteCode: string | null = null;
	let concurrentChangeCode: string | null = null;
	let secondTabFencingToken = -1;
	try {
		await sessionPort.session(SCOPE, async () => {
			try {
				sessionPort.close();
			} catch (error) {
				activeSessionCloseCode = (error as PersistenceError).code;
			}
			const secondTab = await BrowserVersionedPersistence.open({
				databaseName: SESSION_DATABASE,
			});
			const secondTabHead = await secondTab.loadHead(SCOPE);
			secondTabFencingToken = (
				await secondTab.acquireWriterFence(SCOPE, secondTabHead.fencingToken)
			).fencingToken;
			secondTab.close();
			try {
				const sessionHead = await sessionPort.loadHead(SCOPE);
				await sessionPort.appendEventBatch(await append(sessionHead, 3));
			} catch (error) {
				concurrentWriteCode = (error as PersistenceError).code;
			}
		});
	} catch (error) {
		concurrentChangeCode = (error as PersistenceError).code;
	}
	const postConcurrentFencingToken = (await sessionPort.loadHead(SCOPE))
		.fencingToken;
	sessionPort.close();

	const corruptionPort = await BrowserVersionedPersistence.open({
		databaseName: SESSION_DATABASE,
	});
	let corruptionWriteCode: string | null = null;
	let corruptedMaterialBeforeWrite = "";
	let corruptedMaterialAfterWrite = "different";
	let corruptionCode: string | null = null;
	try {
		await corruptionPort.session(SCOPE, async () => {
			await corruptEvent(SESSION_DATABASE, 1);
			corruptedMaterialBeforeWrite =
				await inspectDatabaseMaterial(SESSION_DATABASE);
			try {
				const corruptionHead = await corruptionPort.loadHead(SCOPE);
				await corruptionPort.appendEventBatch(await append(corruptionHead, 3));
			} catch (error) {
				corruptionWriteCode = (error as PersistenceError).code;
			}
			corruptedMaterialAfterWrite =
				await inspectDatabaseMaterial(SESSION_DATABASE);
		});
	} catch (error) {
		corruptionCode = (error as PersistenceError).code;
	}
	let postSessionCorruptionCode: string | null = null;
	try {
		await corruptionPort.loadHead(SCOPE);
	} catch (error) {
		postSessionCorruptionCode = (error as PersistenceError).code;
	}
	corruptionPort.close();
	await deleteDatabase(SESSION_DATABASE);
	return {
		fullValidationReads,
		preCommitFailureCaught,
		revisionAfterPreCommitFailure,
		postCommitFailureCaught,
		revisionAfterPostCommitFailure,
		persistedRevision: persistedHead.revision,
		persistedEvents:
			persistedEvents.length === sessionEvents.length
				? persistedEvents.length
				: -1,
		persistedReceipt,
		activeSessionCloseCode,
		concurrentWriteCode,
		concurrentChangeCode,
		postConcurrentFencingToken:
			postConcurrentFencingToken === secondTabFencingToken
				? postConcurrentFencingToken
				: -1,
		corruptionCode,
		corruptionWriteCode,
		corruptionWriteAtomic:
			corruptedMaterialBeforeWrite === corruptedMaterialAfterWrite,
		postSessionCorruptionCode,
	};
}

async function corruptGeneratedAuthorityHead(): Promise<void> {
	const request = indexedDB.open(GENERATED_WORLD_STORAGE_KEY);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(
			GENERATED_AUTHORITY_STORES.streams,
			"readwrite",
		);
		const store = transaction.objectStore(GENERATED_AUTHORITY_STORES.streams);
		const rows = store.getAll();
		rows.addEventListener("success", () => {
			const row = (
				rows.result as Array<{
					readonly key: string;
					readonly genesis: unknown;
					readonly head: Readonly<Record<string, unknown>>;
					readonly operationCount: number;
				}>
			).at(0);
			if (row === undefined) {
				transaction.abort();
				return;
			}
			store.put({
				...row,
				head: { ...row.head, stateHash: "0".repeat(64) },
			});
		});
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener(
			"abort",
			() => reject(new Error("generated authority corruption fixture aborted")),
			{ once: true },
		);
		transaction.addEventListener("error", () => reject(transaction.error), {
			once: true,
		});
	});
	database.close();
}

async function inspectStores(): Promise<readonly string[]> {
	const request = indexedDB.open(DATABASE);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	const stores = [...database.objectStoreNames].sort();
	database.close();
	return stores;
}

async function inspectDatabaseMaterial(databaseName: string): Promise<string> {
	const request = indexedDB.open(databaseName);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	const stores = [...database.objectStoreNames].sort();
	const transaction = database.transaction(stores, "readonly");
	const done = new Promise<void>((resolve, reject) => {
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener("abort", () => reject(transaction.error), {
			once: true,
		});
		transaction.addEventListener("error", () => reject(transaction.error), {
			once: true,
		});
	});
	const rows = await Promise.all(
		stores.map(
			(store) =>
				new Promise<unknown[]>((resolve, reject) => {
					const all = transaction.objectStore(store).getAll();
					all.addEventListener("success", () => resolve(all.result), {
						once: true,
					});
					all.addEventListener("error", () => reject(all.error), {
						once: true,
					});
				}),
		),
	);
	await done;
	database.close();
	return JSON.stringify(rows);
}

async function inspectStoreCounts(): Promise<Readonly<Record<string, number>>> {
	const request = indexedDB.open(DATABASE);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	const stores = [...database.objectStoreNames].sort();
	const transaction = database.transaction(stores, "readonly");
	const done = new Promise<void>((resolve, reject) => {
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener("abort", () => reject(transaction.error), {
			once: true,
		});
		transaction.addEventListener("error", () => reject(transaction.error), {
			once: true,
		});
	});
	const entries = await Promise.all(
		stores.map(
			(store) =>
				new Promise<readonly [string, number]>((resolve, reject) => {
					const count = transaction.objectStore(store).count();
					count.addEventListener(
						"success",
						() => resolve([store, count.result]),
						{ once: true },
					);
					count.addEventListener("error", () => reject(count.error), {
						once: true,
					});
				}),
		),
	);
	await done;
	database.close();
	return Object.freeze(Object.fromEntries(entries));
}

async function verifyOpenAndQuotaFailures(): Promise<{
	readonly openFailureName: string | null;
	readonly quotaFailureName: string | null;
	readonly quotaAtomic: boolean;
}> {
	await deleteDatabase(OPEN_FAILURE_DATABASE);
	const future = indexedDB.open(OPEN_FAILURE_DATABASE, 2);
	const futureDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
		future.addEventListener("upgradeneeded", () => undefined, { once: true });
		future.addEventListener("success", () => resolve(future.result), {
			once: true,
		});
		future.addEventListener("error", () => reject(future.error), {
			once: true,
		});
	});
	futureDatabase.close();
	let openFailureName: string | null = null;
	try {
		await BrowserVersionedPersistence.open({
			databaseName: OPEN_FAILURE_DATABASE,
		});
	} catch (error) {
		openFailureName = (error as DOMException).name;
	}
	await deleteDatabase(OPEN_FAILURE_DATABASE);

	await deleteDatabase(QUOTA_DATABASE);
	const quotaPort = await BrowserVersionedPersistence.open({
		databaseName: QUOTA_DATABASE,
	});
	const originalPut = IDBObjectStore.prototype.put;
	let quotaFailureName: string | null = null;
	try {
		IDBObjectStore.prototype.put = function forcedQuotaFailure(): IDBRequest {
			throw new DOMException("forced quota boundary", "QuotaExceededError");
		};
		await quotaPort.initialize(await genesis());
	} catch (error) {
		quotaFailureName = (error as DOMException).name;
	} finally {
		IDBObjectStore.prototype.put = originalPut;
		quotaPort.close();
	}
	const raw = indexedDB.open(QUOTA_DATABASE);
	const database = await new Promise<IDBDatabase>((resolve, reject) => {
		raw.addEventListener("success", () => resolve(raw.result), { once: true });
		raw.addEventListener("error", () => reject(raw.error), { once: true });
	});
	const transaction = database.transaction(
		GENERATED_AUTHORITY_STORES.streams,
		"readonly",
	);
	const count = await new Promise<number>((resolve, reject) => {
		const request = transaction
			.objectStore(GENERATED_AUTHORITY_STORES.streams)
			.count();
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
	database.close();
	await deleteDatabase(QUOTA_DATABASE);
	return { openFailureName, quotaFailureName, quotaAtomic: count === 0 };
}

async function run(): Promise<void> {
	const failures = await verifyOpenAndQuotaFailures();
	const validatedSession = await verifyValidatedAuthoritySession();
	await deleteDatabase();
	const crash = new OneShotCrash();
	const boundary = new OneShotBoundary();
	boundary.point = "open";
	boundary.errorName = "SecurityError";
	let openBoundaryFailed = false;
	try {
		await BrowserVersionedPersistence.open({
			databaseName: DATABASE,
			boundaryInjector: boundary,
		});
	} catch {
		openBoundaryFailed = true;
	}
	boundary.point = "upgrade";
	boundary.errorName = "AbortError";
	let upgradeBoundaryFailed = false;
	try {
		await BrowserVersionedPersistence.open({
			databaseName: DATABASE,
			boundaryInjector: boundary,
		});
	} catch {
		upgradeBoundaryFailed = true;
	}
	await deleteDatabase();
	const port = await BrowserVersionedPersistence.open({
		databaseName: DATABASE,
		crashInjector: crash,
		boundaryInjector: boundary,
	});
	const created = await genesis();
	boundary.point = "read";
	boundary.errorName = "NotReadableError";
	let readBoundaryFailed = false;
	try {
		await port.initialize(created);
	} catch {
		readBoundaryFailed = true;
	}
	await port.initialize(created);
	const countsAfterGenesis = await inspectStoreCounts();
	const firstRequest = await append(created.head, 1);
	boundary.point = "write";
	boundary.errorName = "UnknownError";
	let writeBoundaryFailed = false;
	try {
		await port.appendEventBatch(firstRequest);
	} catch {
		writeBoundaryFailed = true;
	}
	const headAfterWriteBoundary = await port.loadHead(SCOPE);
	const countsAfterWriteBoundary = await inspectStoreCounts();
	boundary.point = "write";
	boundary.errorName = "QuotaExceededError";
	let quotaFailed = false;
	try {
		await port.appendEventBatch(firstRequest);
	} catch {
		quotaFailed = true;
	}
	const headAfterQuota = await port.loadHead(SCOPE);
	const countsAfterQuota = await inspectStoreCounts();
	boundary.point = "transaction-abort";
	let transactionAbortFailed = false;
	try {
		await port.appendEventBatch(firstRequest);
	} catch {
		transactionAbortFailed = true;
	}
	const headAfterTransactionAbort = await port.loadHead(SCOPE);
	const countsAfterTransactionAbort = await inspectStoreCounts();
	await port.appendEventBatch(firstRequest);
	const retry = await port.appendEventBatch(firstRequest);
	const preFence = await port.loadHead(SCOPE);
	const secondTab = await BrowserVersionedPersistence.open({
		databaseName: DATABASE,
	});
	const secondTabHead = await secondTab.loadHead(SCOPE);
	const fenced = await port.acquireWriterFence(SCOPE, preFence.fencingToken);
	let dualTabFenceCode: string | null = null;
	try {
		await secondTab.acquireWriterFence(SCOPE, secondTabHead.fencingToken);
	} catch (error) {
		dualTabFenceCode = (error as PersistenceError).code;
	}
	secondTab.close();
	let staleFenceCode: string | null = null;
	try {
		await port.appendEventBatch(await append(preFence, 2));
	} catch (error) {
		staleFenceCode = (error as PersistenceError).code;
	}
	const secondRequest = await append(fenced, 2);
	await port.appendEventBatch(secondRequest);
	const secondHead = await port.loadHead(SCOPE);
	const dayTwoSnapshot = await createAuthoritySnapshot({
		...SCOPE,
		engineVersion: ENGINE_VERSION,
		stateSchemaVersion: STATE_VERSION,
		snapshotId: "day-two",
		revision: secondHead.revision,
		baseSequence: secondHead.lastSequence,
		simulationTime: secondHead.simulationTime,
		lastEventHash: secondHead.lastEventHash,
		state: { count: 2 },
	});
	await port.saveSnapshot({
		snapshot: dayTwoSnapshot,
		fencingToken: secondHead.fencingToken,
	});
	const rejectionRequest = {
		...SCOPE,
		schemaVersion: AUTHORITY_REJECTION_SCHEMA_VERSION,
		appendId: "rejected-browser-command",
		expectedRevision: secondHead.revision,
		expectedLastSequence: secondHead.lastSequence,
		expectedStateHash: secondHead.stateHash,
		expectedLastEventHash: secondHead.lastEventHash,
		fencingToken: secondHead.fencingToken,
		commandReceipt: { outcome: "rejected" },
	} as const;
	crash.point = "authority-rejection:before-commit";
	try {
		await port.recordRejectedCommand(rejectionRequest);
	} catch {
		/* expected abort */
	}
	const rejectionHeadAfterAbort = await port.loadHead(SCOPE);
	crash.point = "authority-rejection:after-commit";
	try {
		await port.recordRejectedCommand(rejectionRequest);
	} catch {
		/* committed before crash */
	}
	const rejectionRetry = await port.recordRejectedCommand(rejectionRequest);
	const rejectionHeadAfterRetry = await port.loadHead(SCOPE);

	const thirdRequest = await append(secondHead, 3);
	crash.point = "authority-append:before-commit";
	try {
		await port.appendEventBatch(thirdRequest);
	} catch {
		/* expected abort */
	}
	const revisionAfterAbort = (await port.loadHead(SCOPE)).revision;
	crash.point = "authority-append:after-commit";
	try {
		await port.appendEventBatch(thirdRequest);
	} catch {
		/* committed before crash */
	}
	const recovered = await port.appendEventBatch(thirdRequest);
	port.close();

	const reopened = await BrowserVersionedPersistence.open({
		databaseName: DATABASE,
	});
	const restoredGenesis = await reopened.initialize(created);
	const replay = await replayAuthoritativeEvents<{ readonly count: number }>(
		reopened,
		{ ...SCOPE, snapshotId: "day-two", toSequenceExclusive: 4 },
		(_state, event) =>
			(event.payload as { readonly nextState: { readonly count: number } })
				.nextState,
	);
	await corruptEvent();
	let corruptionCode: string | null = null;
	try {
		await reopened.getEventRange({
			...SCOPE,
			fromSequenceInclusive: 1,
			toSequenceExclusive: 4,
		});
	} catch (error) {
		corruptionCode = (error as PersistenceError).code;
	}
	const stores = await inspectStores();
	reopened.close();
	await deleteDatabase();

	await deleteDatabase(CIVILIZATION_DATABASE);
	const releaseGenesis = await createReleaseGenesis({
		releaseId: "generated-browser-civilization",
		seedHex: "e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a",
	});
	const world = await generateWorld({
		releaseGenesis,
		worldId: "generated-browser-civilization-world",
		treatmentId: "standard-brain",
	});
	const civilizationPort = await BrowserVersionedPersistence.open({
		databaseName: CIVILIZATION_DATABASE,
	});
	const civilization = await advanceGeneratedCivilization({
		port: civilizationPort,
		genesisWorld: world,
		targetHorizonDays: 365,
	});
	civilizationPort.close();
	const restoredCivilizationPort = await BrowserVersionedPersistence.open({
		databaseName: CIVILIZATION_DATABASE,
	});
	const civilizationReplay = await replayGeneratedCivilization({
		port: restoredCivilizationPort,
		regionId: world.identity.worldId,
	});
	restoredCivilizationPort.close();
	await deleteDatabase(CIVILIZATION_DATABASE);

	await deleteDatabase(CATCH_UP_RESUME_DATABASE);
	const crashBoundaryPort = await BrowserVersionedPersistence.open({
		databaseName: CATCH_UP_RESUME_DATABASE,
	});
	let catchUpBoundaryThrown = false;
	let catchUpAppendCommitted = false;
	const crashBoundaryClient = new Proxy(crashBoundaryPort, {
		get(target, property) {
			if (property === "appendEventBatch")
				return async (
					request: Parameters<typeof target.appendEventBatch>[0],
				) => {
					const result = await target.appendEventBatch(request);
					if (!catchUpAppendCommitted) {
						catchUpAppendCommitted = true;
						throw new Error("crash after durable catch-up chapter");
					}
					return result;
				};
			const value = Reflect.get(target, property, target) as unknown;
			return typeof value === "function" ? value.bind(target) : value;
		},
	}) as VersionedPersistencePort;
	try {
		await advanceGeneratedCivilization({
			port: crashBoundaryClient,
			genesisWorld: world,
			targetHorizonDays: 365,
		});
	} catch {
		catchUpBoundaryThrown = true;
	}
	const catchUpCrashHead = await crashBoundaryPort.loadHead({
		runId: "v1-generated-civilization",
		regionId: world.identity.worldId,
	});
	crashBoundaryPort.close();
	const freshCatchUpPort = await BrowserVersionedPersistence.open({
		databaseName: CATCH_UP_RESUME_DATABASE,
	});
	const freshCatchUp = await advanceGeneratedCivilization({
		port: freshCatchUpPort,
		genesisWorld: world,
		targetHorizonDays: 365,
	});
	freshCatchUpPort.close();
	await deleteDatabase(CATCH_UP_RESUME_DATABASE);

	await deleteDatabase(GENERATED_WORLD_STORAGE_KEY);
	const originalAppend = BrowserVersionedPersistence.prototype.appendEventBatch;
	let generatedAppendCalls = 0;
	BrowserVersionedPersistence.prototype.appendEventBatch = async function (
		request,
	) {
		generatedAppendCalls += 1;
		return await originalAppend.call(this, request);
	};
	let generatedFirstLoadAppendCalls = 0;
	let generatedRefreshAppendCalls = 0;
	let generatedFirstLoadPersisted = false;
	let generatedRefreshObservedSponsor = false;
	let generatedAbstentionBoundaryIdempotent = false;
	let generatedAbstentionBoundaryReloaded = false;
	let generatedAbstentionBoundaryRelatedOnly = false;
	let generatedInvalidRefreshFailedClosed = false;
	try {
		const initial = await loadGeneratedWorldExperience();
		generatedFirstLoadAppendCalls = generatedAppendCalls;
		generatedFirstLoadPersisted =
			initial.persistence.kind === "indexeddb" &&
			initial.persistence.catchUpReceipts === 5;
		const sponsored = await sponsorGeneratedCitizen({
			citizenId: initial.sponsorCitizenId,
			regionId: initial.authorityRegionId,
			databaseName: initial.authorityDatabaseName,
			step: "establish",
		});
		const appendCallsBeforeRefresh = generatedAppendCalls;
		const refreshed = await refreshGeneratedWorldExperience();
		generatedRefreshAppendCalls =
			generatedAppendCalls - appendCallsBeforeRefresh;
		generatedRefreshObservedSponsor =
			refreshed.sponsorPhase === "sponsored" &&
			refreshed.stateHash === sponsored.authorityStateHash;
		await sponsorGeneratedCitizen({
			citizenId: initial.sponsorCitizenId,
			regionId: initial.authorityRegionId,
			databaseName: initial.authorityDatabaseName,
			step: "abstain",
			expectedAuthorityStateHash: refreshed.stateHash,
		});
		const boundaryPort = await BrowserVersionedPersistence.open({
			databaseName: initial.authorityDatabaseName,
		});
		const boundaryScope = {
			runId: "v1-generated-civilization",
			regionId: initial.authorityRegionId,
		};
		const boundaryHead = await boundaryPort.loadHead(boundaryScope);
		const boundarySnapshot =
			await boundaryPort.loadLatestSnapshot(boundaryScope);
		const boundaryReplay = await replayCivilizationHistory(boundaryPort, {
			...boundaryScope,
			snapshotId: boundarySnapshot.snapshotId,
			toSequenceExclusive: boundaryHead.lastSequence + 1,
		});
		const boundaryCivilization = boundaryReplay.state
			.civilization as unknown as CivilizationState;
		const abstention = Object.values(boundaryCivilization.patronAbstentions)
			.filter(({ citizenId }) => citizenId === initial.sponsorCitizenId)
			.sort(
				(left, right) => right.recordedAtRevision - left.recordedAtRevision,
			)[0];
		if (abstention === undefined)
			throw new Error("durable browser abstention missing");
		const abstentionBoundary = await createCivilizationAbstentionBoundaryAppend(
			{
				state: boundaryReplay.state,
				head: boundaryHead,
				citizenId: initial.sponsorCitizenId,
				abstentionId: abstention.abstentionId,
			},
		);
		const boundaryCommitted = await boundaryPort.appendEventBatch(
			abstentionBoundary.request,
		);
		generatedAbstentionBoundaryIdempotent = (
			await boundaryPort.appendEventBatch(abstentionBoundary.request)
		).idempotent;
		generatedAbstentionBoundaryRelatedOnly =
			abstentionBoundary.request.events[0]?.causalParents.length === 0 &&
			abstentionBoundary.request.events[0]?.relatedEvents[0]?.eventId ===
				abstention.sourceEventId;
		boundaryPort.close();
		const reloadedBoundaryPort = await BrowserVersionedPersistence.open({
			databaseName: initial.authorityDatabaseName,
		});
		const reloadedBoundary = await replayCivilizationHistory(
			reloadedBoundaryPort,
			{
				...boundaryScope,
				snapshotId: boundarySnapshot.snapshotId,
				toSequenceExclusive: boundaryCommitted.head.lastSequence + 1,
			},
		);
		generatedAbstentionBoundaryReloaded =
			reloadedBoundary.stateHash === boundaryCommitted.head.stateHash &&
			reloadedBoundary.state.scheduler.completedDay ===
				boundaryReplay.state.scheduler.completedDay + 1;
		reloadedBoundaryPort.close();
		await corruptGeneratedAuthorityHead();
		const quarantined = await refreshGeneratedWorldExperience();
		generatedInvalidRefreshFailedClosed =
			quarantined.persistence.kind === "quarantined" &&
			quarantined.persistence.failureCode === "STALE_STATE" &&
			quarantined.stateHash !== "0".repeat(64);
	} finally {
		BrowserVersionedPersistence.prototype.appendEventBatch = originalAppend;
		await deleteDatabase(GENERATED_WORLD_STORAGE_KEY);
	}
	window.__generatedPersistenceResult = {
		result: {
			validatedSession,
			boundaryFailures: {
				open: openBoundaryFailed,
				read: readBoundaryFailed,
				upgrade: upgradeBoundaryFailed,
				write: writeBoundaryFailed,
				quota: quotaFailed,
				transactionAbort: transactionAbortFailed,
			},
			writeBoundaryHeadUnchanged:
				headAfterWriteBoundary.revision === 0 &&
				headAfterWriteBoundary.stateHash === created.head.stateHash,
			writeBoundaryStoreCountsUnchanged:
				JSON.stringify(countsAfterWriteBoundary) ===
				JSON.stringify(countsAfterGenesis),
			quotaHeadUnchanged:
				headAfterQuota.revision === 0 &&
				headAfterQuota.stateHash === created.head.stateHash,
			quotaStoreCountsUnchanged:
				JSON.stringify(countsAfterQuota) === JSON.stringify(countsAfterGenesis),
			transactionAbortHeadUnchanged:
				headAfterTransactionAbort.revision === 0 &&
				headAfterTransactionAbort.stateHash === created.head.stateHash,
			transactionAbortStoreCountsUnchanged:
				JSON.stringify(countsAfterTransactionAbort) ===
				JSON.stringify(countsAfterGenesis),
			civilizationDay: civilizationReplay.state.scheduler.completedDay,
			civilizationEvents: civilization.head.lastSequence,
			civilizationReplayHashMatches:
				civilizationReplay.stateHash === civilization.head.stateHash,
			catchUpBoundaryThrown,
			catchUpCrashRevision: catchUpCrashHead.revision,
			catchUpFreshProcessComplete:
				freshCatchUp.catchUpOperation.status === "complete" &&
				freshCatchUp.catchUpOperation.nextChapter === 5,
			catchUpFreshProcessRevision: freshCatchUp.head.revision,
			corruptionCode,
			generatedAbstentionBoundaryIdempotent,
			generatedAbstentionBoundaryReloaded,
			generatedAbstentionBoundaryRelatedOnly,
			generatedFirstLoadAppendCalls,
			generatedFirstLoadPersisted,
			generatedInvalidRefreshFailedClosed,
			generatedRefreshAppendCalls,
			generatedRefreshObservedSponsor,
			dualTabFenceCode,
			...failures,
			recoveredIdempotently: recovered.idempotent,
			restoredGenesisIdempotently: restoredGenesis.idempotent,
			replayedCount: replay.state.count,
			replayedSuffixEvents: replay.events.length,
			rejectionHeadUnchanged:
				rejectionHeadAfterAbort.headHash === secondHead.headHash &&
				rejectionHeadAfterRetry.headHash === secondHead.headHash,
			rejectionRetryIdempotent: rejectionRetry.idempotent,
			retryIdempotent: retry.idempotent,
			revisionAfterAbort,
			staleFenceCode,
			stores,
		},
	};
}

void run().catch((error: unknown) => {
	window.__generatedPersistenceResult = {
		error:
			error instanceof Error
				? `${error.name}: ${error.message}`
				: String(error),
	};
});
