import {
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	EMPTY_EVENT_HASH,
	type PersistenceError,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	replayAuthoritativeEvents,
	type AppendAuthorityBatchRequest,
	type AuthorityHead,
	type VersionedCrashPoint,
} from "../../../packages/persistence/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";
import {
	BrowserVersionedPersistence,
	GENERATED_AUTHORITY_STORES,
} from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	advanceGeneratedCivilization,
	replayGeneratedCivilization,
} from "../../../apps/web/src/persistence/generated-civilization.js";

declare global {
	interface Window {
		__generatedPersistenceResult?: {
			readonly error?: string;
			readonly result?: unknown;
		};
	}
}

const DATABASE = "eonfolk-generated-versioned-browser-test";
const CIVILIZATION_DATABASE = "eonfolk-generated-civilization-browser-test";
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

async function corruptSecondEvent(): Promise<void> {
	const request = indexedDB.open(DATABASE);
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
			).find((candidate) => candidate.value.sequence === 2);
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
	await deleteDatabase();
	const crash = new OneShotCrash();
	const port = await BrowserVersionedPersistence.open({
		databaseName: DATABASE,
		crashInjector: crash,
	});
	const created = await genesis();
	await port.initialize(created);
	const firstRequest = await append(created.head, 1);
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
	await corruptSecondEvent();
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
	window.__generatedPersistenceResult = {
		result: {
			civilizationDay: civilizationReplay.state.scheduler.completedDay,
			civilizationEvents: civilization.head.lastSequence,
			civilizationReplayHashMatches:
				civilizationReplay.stateHash === civilization.head.stateHash,
			corruptionCode,
			dualTabFenceCode,
			...failures,
			recoveredIdempotently: recovered.idempotent,
			restoredGenesisIdempotently: restoredGenesis.idempotent,
			replayedCount: replay.state.count,
			replayedSuffixEvents: replay.events.length,
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
