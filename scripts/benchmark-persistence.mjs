import { chromium } from "@playwright/test";
import { createServer } from "vite";

const REPETITIONS = 5;
const TRANSITIONS = 128;
const WORKLOAD = Object.freeze({
	eventCountByOrdinal: "1 + (ordinal mod 4)",
	repetitions: REPETITIONS,
	seed: "eonfolk-persistence-benchmark-v1",
	transitionsPerRepetition: TRANSITIONS,
});

function median(values) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.floor(sorted.length / 2)];
}

async function loadTypeScriptModules() {
	const loader = await createServer({
		root: process.cwd(),
		appType: "custom",
		logLevel: "silent",
		server: { middlewareMode: true },
	});
	try {
		const persistence = await loader.ssrLoadModule(
			"/packages/persistence/src/index.ts",
		);
		const fixtures = await loader.ssrLoadModule(
			"/tests/unit/persistence/fixtures.ts",
		);
		return {
			MemoryPersistence: persistence.MemoryPersistence,
			genesis: fixtures.genesis,
			REGION_ID: fixtures.REGION_ID,
			RUN_ID: fixtures.RUN_ID,
			transition: fixtures.transition,
		};
	} finally {
		await loader.close();
	}
}

async function memorySamples(modules) {
	const { MemoryPersistence, genesis, REGION_ID, RUN_ID, transition } = modules;
	const samples = [];
	for (let repetition = 0; repetition < REPETITIONS; repetition += 1) {
		const persistence = new MemoryPersistence();
		await persistence.commitGenesis(genesis());
		const appendStart = performance.now();
		for (let ordinal = 1; ordinal <= TRANSITIONS; ordinal += 1) {
			const head = await persistence.getHead(RUN_ID, REGION_ID);
			await persistence.commitTransition(
				transition(head, ordinal, 1 + (ordinal % 4)),
			);
		}
		const appendMilliseconds = performance.now() - appendStart;
		const head = await persistence.getHead(RUN_ID, REGION_ID);
		const recoveryStart = performance.now();
		await persistence.getEventRange({
			runId: RUN_ID,
			regionId: REGION_ID,
			fromSequenceInclusive: 1,
			toSequenceExclusive: head.lastSequence + 1,
		});
		const recoveryMilliseconds = performance.now() - recoveryStart;
		samples.push({ appendMilliseconds, recoveryMilliseconds });
	}
	return samples;
}

async function indexedDbSamples() {
	const server = await createServer({
		root: process.cwd(),
		logLevel: "silent",
		server: { host: "127.0.0.1", port: 0, strictPort: false },
	});
	await server.listen();
	const address = server.httpServer?.address();
	if (
		address === null ||
		address === undefined ||
		typeof address === "string"
	) {
		await server.close();
		throw new Error("Vite did not expose a benchmark port");
	}
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(
			`http://127.0.0.1:${address.port}/tests/unit/persistence/indexeddb-harness.html?benchmark=1`,
		);
		await page.waitForFunction(
			() => window.__idbResult !== undefined,
			undefined,
			{ timeout: 30_000 },
		);
		const result = await page.evaluate(() => window.__idbResult);
		if (result?.error !== undefined) throw new Error(result.error);
		return result?.result?.samples ?? [];
	} finally {
		await browser.close();
		await server.close();
	}
}

const memory = await memorySamples(await loadTypeScriptModules());
let indexedDb;
try {
	indexedDb = { available: true, samples: await indexedDbSamples() };
} catch (error) {
	indexedDb = {
		available: false,
		reason: error instanceof Error ? error.message : String(error),
		samples: [],
	};
}

const summarize = (samples) => ({
	appendMedianMilliseconds: median(
		samples.map((sample) => sample.appendMilliseconds),
	),
	recoveryMedianMilliseconds: median(
		samples.map((sample) => sample.recoveryMilliseconds),
	),
	samples,
});

const report = {
	schemaVersion: "eonfolk-persistence-benchmark-v1",
	runtime: { node: process.version, chromium: chromium.executablePath() },
	workload: WORKLOAD,
	memory: summarize(memory),
	indexedDb: indexedDb.available
		? { available: true, ...summarize(indexedDb.samples) }
		: indexedDb,
	sqliteOpfs: {
		decision: "DEFER",
		measured: false,
		reason:
			"No SQLite dependency is authorized. OPFS has browser/worker and durability tradeoffs that need a separate, measured spike after product gates.",
		officialReferences: [
			"https://sqlite.org/wasm/doc/trunk/persistence.md",
			"https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system",
		],
	},
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
