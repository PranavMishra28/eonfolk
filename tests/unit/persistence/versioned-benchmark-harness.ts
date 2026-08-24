import { BrowserVersionedPersistence } from "../../../apps/web/src/persistence/browser-versioned.js";
import {
	AUTHORITY_APPEND_SCHEMA_VERSION,
	AUTHORITY_GENESIS_SCHEMA_VERSION,
	type AuthorityHead,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	EMPTY_EVENT_HASH,
} from "../../../packages/persistence/src/index.js";

declare global {
	interface Window {
		__versionedPersistenceBenchmark?: {
			readonly error?: string;
			readonly result?: { readonly samples: readonly BenchmarkSample[] };
		};
	}
}

interface BenchmarkSample {
	readonly appendMilliseconds: number;
	readonly recoveryMilliseconds: number;
}

const repetitions = 5;
const transitions = 128;
const scope = Object.freeze({
	runId: "versioned-benchmark-run",
	regionId: "versioned-benchmark-region",
});
const engineVersion = "versioned-benchmark-engine-v1";
const stateSchemaVersion = "versioned-benchmark-state-v1";

function deleteDatabase(databaseName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(databaseName);
		request.addEventListener("success", () => resolve(), { once: true });
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
	});
}

async function createGenesis() {
	const snapshot = await createAuthoritySnapshot({
		...scope,
		engineVersion,
		stateSchemaVersion,
		snapshotId: "genesis",
		revision: 0,
		baseSequence: 0,
		simulationTime: 0,
		lastEventHash: EMPTY_EVENT_HASH,
		state: { count: 0 },
	});
	const head = await createAuthorityHead({
		...scope,
		engineVersion,
		stateSchemaVersion,
		revision: 0,
		lastSequence: 0,
		simulationTime: 0,
		stateHash: snapshot.stateHash,
		lastEventHash: EMPTY_EVENT_HASH,
		fencingToken: 1,
	});
	return Object.freeze({
		...scope,
		schemaVersion: AUTHORITY_GENESIS_SCHEMA_VERSION,
		genesisId: "versioned-benchmark-genesis",
		head,
		snapshot,
	});
}

async function createAppend(head: AuthorityHead, count: number) {
	const appendId = `append-${count}`;
	const batchId = `batch-${count}`;
	const candidate = await createAuthoritySnapshot({
		...scope,
		engineVersion,
		stateSchemaVersion,
		snapshotId: `candidate-${count}`,
		revision: head.revision + 1,
		baseSequence: head.lastSequence + 1,
		simulationTime: count,
		lastEventHash: head.lastEventHash,
		state: { count },
	});
	const event = await createAuthorityEvent({
		...scope,
		engineVersion,
		stateSchemaVersion,
		appendId,
		batchId,
		eventId: `event-${count}`,
		sequence: head.lastSequence + 1,
		simulationTime: count,
		causalParents: [],
		visibility: { kind: "authority-only" },
		provenance: {
			mechanismId: "versioned-browser-benchmark",
			cognitionDecisionId: null,
			brainKind: null,
		},
		preStateHash: head.stateHash,
		postStateHash: candidate.stateHash,
		previousEventHash: head.lastEventHash,
		eventType: "CountAdvanced",
		payload: { nextState: { count } },
	});
	return Object.freeze({
		...scope,
		schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
		appendId,
		batchId,
		expectedRevision: head.revision,
		expectedLastSequence: head.lastSequence,
		expectedStateHash: head.stateHash,
		expectedLastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
		events: [event],
	});
}

async function runBenchmark(): Promise<readonly BenchmarkSample[]> {
	const samples: BenchmarkSample[] = [];
	for (let repetition = 0; repetition < repetitions; repetition += 1) {
		const databaseName = `eonfolk-versioned-benchmark-${repetition}`;
		await deleteDatabase(databaseName);
		const port = await BrowserVersionedPersistence.open({ databaseName });
		const genesis = await createGenesis();
		await port.initialize(genesis);
		let head = genesis.head;
		const appendStarted = performance.now();
		for (let count = 1; count <= transitions; count += 1) {
			const result = await port.appendEventBatch(
				await createAppend(head, count),
			);
			head = result.head;
		}
		const appendMilliseconds = performance.now() - appendStarted;
		port.close();

		const reopened = await BrowserVersionedPersistence.open({ databaseName });
		const recoveryStarted = performance.now();
		const events = await reopened.getEventRange({
			...scope,
			fromSequenceInclusive: 1,
			toSequenceExclusive: transitions + 1,
		});
		const recoveryMilliseconds = performance.now() - recoveryStarted;
		if (events.length !== transitions)
			throw new Error(
				"versioned persistence benchmark recovered a partial range",
			);
		reopened.close();
		await deleteDatabase(databaseName);
		samples.push({ appendMilliseconds, recoveryMilliseconds });
	}
	return samples;
}

try {
	window.__versionedPersistenceBenchmark = {
		result: { samples: await runBenchmark() },
	};
} catch (error) {
	window.__versionedPersistenceBenchmark = {
		error:
			error instanceof Error
				? `${error.name}: ${error.message}`
				: String(error),
	};
}
