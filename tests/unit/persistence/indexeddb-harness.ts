import {
	type CrashPoint,
	IndexedDbPersistence,
	PERSISTENCE_STORE_NAMES,
	type PersistenceError,
} from "../../../packages/persistence/src/index.js";
import { genesis, hash, REGION_ID, RUN_ID, transition } from "./fixtures.js";

declare global {
	interface Window {
		__idbResult?: { readonly error?: string; readonly result?: unknown };
	}
}

function deleteDatabase(name: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(name);
		request.addEventListener("success", () => resolve(), { once: true });
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
}

function inspectStores(name: string): Promise<readonly string[]> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name);
		request.addEventListener(
			"success",
			() => {
				const stores = [...request.result.objectStoreNames];
				request.result.close();
				resolve(stores);
			},
			{ once: true },
		);
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
}

class OneShotBrowserCrash {
	point: CrashPoint | null = null;

	hit(point: CrashPoint): void {
		if (point === this.point) {
			this.point = null;
			throw new Error(`injected browser crash at ${point}`);
		}
	}
}

async function run(): Promise<void> {
	const databaseName = "eonfolk-indexeddb-contract-test";
	await deleteDatabase(databaseName);
	const crash = new OneShotBrowserCrash();
	const persistence = await IndexedDbPersistence.open({
		databaseName,
		crashInjector: crash,
	});
	await persistence.commitGenesis(genesis());
	const candidate = transition(
		await persistence.getHead(RUN_ID, REGION_ID),
		1,
		2,
	);
	await persistence.commitTransition(candidate);
	persistence.close();

	const reopened = await IndexedDbPersistence.open({ databaseName });
	const retry = await reopened.commitTransition(candidate);
	let collisionCode: string | null = null;
	try {
		await reopened.commitTransition({
			...candidate,
			receipt: { ...candidate.receipt, payloadFingerprint: hash(91_001) },
		});
	} catch (error) {
		collisionCode = (error as PersistenceError).code;
	}
	const head = await reopened.getHead(RUN_ID, REGION_ID);
	const second = transition(head, 2);
	crash.point = "transition:before-commit";
	const crashable = await IndexedDbPersistence.open({
		databaseName,
		crashInjector: crash,
	});
	try {
		await crashable.commitTransition(second);
	} catch {
		// The durable head and receipt checks below distinguish an injected abort.
	}
	const revisionAfterAbort = (await crashable.getHead(RUN_ID, REGION_ID))
		.revision;
	const receiptAfterAbort = await crashable.getCommandReceipt(
		RUN_ID,
		REGION_ID,
		second.receipt.commandId,
	);
	crash.point = "transition:after-commit";
	try {
		await crashable.commitTransition(second);
	} catch {
		// A retry must discover the transaction that completed before this crash.
	}
	const recovered = await crashable.commitTransition(second);
	const finalHead = await crashable.getHead(RUN_ID, REGION_ID);
	crashable.close();
	const events = await reopened.getEventRange({
		runId: RUN_ID,
		regionId: REGION_ID,
		fromSequenceInclusive: 1,
		toSequenceExclusive: 4,
	});
	reopened.close();
	const stores = await inspectStores(databaseName);
	await deleteDatabase(databaseName);
	window.__idbResult = {
		result: {
			collisionCode,
			eventSequences: events.map((event) => event.sequence),
			receiptAfterAbort,
			recoveredAfterCommitCrash: recovered.idempotent,
			revisionAfterAbort,
			retryIdempotent: retry.idempotent,
			revision: finalHead.revision,
			stores,
			expectedStores: Object.values(PERSISTENCE_STORE_NAMES),
		},
	};
}

async function runBenchmark(): Promise<void> {
	const samples: Array<{
		appendMilliseconds: number;
		recoveryMilliseconds: number;
	}> = [];
	const repetitions = 5;
	const transitions = 128;
	for (let repetition = 0; repetition < repetitions; repetition += 1) {
		const databaseName = `eonfolk-indexeddb-benchmark-${repetition}`;
		await deleteDatabase(databaseName);
		const persistence = await IndexedDbPersistence.open({ databaseName });
		await persistence.commitGenesis(genesis());
		const appendStart = performance.now();
		for (let ordinal = 1; ordinal <= transitions; ordinal += 1) {
			const head = await persistence.getHead(RUN_ID, REGION_ID);
			await persistence.commitTransition(
				transition(head, ordinal, 1 + (ordinal % 4)),
			);
		}
		const appendMilliseconds = performance.now() - appendStart;
		const finalHead = await persistence.getHead(RUN_ID, REGION_ID);
		persistence.close();
		const recoveryStart = performance.now();
		const reopened = await IndexedDbPersistence.open({ databaseName });
		await reopened.getEventRange({
			runId: RUN_ID,
			regionId: REGION_ID,
			fromSequenceInclusive: 1,
			toSequenceExclusive: finalHead.lastSequence + 1,
		});
		const recoveryMilliseconds = performance.now() - recoveryStart;
		reopened.close();
		await deleteDatabase(databaseName);
		samples.push({ appendMilliseconds, recoveryMilliseconds });
	}
	window.__idbResult = { result: { repetitions, transitions, samples } };
}

const selectedRun = new URL(location.href).searchParams.has("benchmark")
	? runBenchmark
	: run;

void selectedRun().catch((error: unknown) => {
	window.__idbResult = {
		error:
			error instanceof Error ? (error.stack ?? error.message) : String(error),
	};
});
