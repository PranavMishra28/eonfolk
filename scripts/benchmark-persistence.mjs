import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

export const PERSISTENCE_BENCHMARK_VERSION = "eonfolk-persistence-benchmark-v2";
const REPETITIONS = 5;
const TRANSITIONS = 128;
const WORKLOAD = Object.freeze({
	eventCountByOrdinal: "1 + (ordinal mod 4)",
	repetitions: REPETITIONS,
	seed: PERSISTENCE_BENCHMARK_VERSION,
	transitionsPerRepetition: TRANSITIONS,
});
const EXPECTED_BROWSER = Object.freeze({
	version: "Google Chrome for Testing 151.0.7922.34",
	launcherSha256:
		"a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
});
const SOURCE_FILES = Object.freeze([
	"package.json",
	"pnpm-lock.yaml",
	"scripts/benchmark-persistence.mjs",
	"packages/persistence/src/index.ts",
	"packages/persistence/src/bounds.ts",
	"packages/persistence/src/codec.ts",
	"packages/persistence/src/errors.ts",
	"packages/persistence/src/memory.ts",
	"packages/persistence/src/indexeddb.ts",
	"packages/persistence/src/types.ts",
	"packages/persistence/src/validation.ts",
	"tests/unit/persistence/fixtures.ts",
	"tests/unit/persistence/indexeddb-harness.html",
	"tests/unit/persistence/indexeddb-harness.ts",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function sourceState() {
	const sourceManifest = SOURCE_FILES.map((path) => ({
		path,
		sha256: sha256(readFileSync(resolve(path))),
	}));
	return Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
		sourceManifest,
		sourceManifestSha256: sha256(JSON.stringify(sourceManifest)),
	});
}

export function parsePersistenceBenchmarkArguments(argv) {
	let smokeOnly = false;
	let forceIndexedDbFailure = false;
	let output = null;
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--") continue;
		if (argument === "--smoke-only") smokeOnly = true;
		else if (argument === "--force-indexeddb-failure")
			forceIndexedDbFailure = true;
		else if (argument === "--output") {
			output = argv[index + 1] ?? null;
			index += 1;
		} else throw new Error(`unknown argument: ${argument}`);
	}
	return Object.freeze({ smokeOnly, forceIndexedDbFailure, output });
}

function median(values) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.floor(sorted.length / 2)] ?? null;
}

function summarize(samples) {
	return Object.freeze({
		appendMedianMilliseconds: median(
			samples.map((sample) => sample.appendMilliseconds),
		),
		recoveryMedianMilliseconds: median(
			samples.map((sample) => sample.recoveryMilliseconds),
		),
		samples,
	});
}

function validSamples(samples) {
	return (
		samples.length === REPETITIONS &&
		samples.every(
			(sample) =>
				Number.isFinite(sample.appendMilliseconds) &&
				sample.appendMilliseconds >= 0 &&
				Number.isFinite(sample.recoveryMilliseconds) &&
				sample.recoveryMilliseconds >= 0,
		)
	);
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

async function indexedDbSamples(forceFailure) {
	if (forceFailure) throw new Error("forced IndexedDB harness failure");
	const server = await createServer({
		root: process.cwd(),
		logLevel: "silent",
		server: { host: "127.0.0.1", port: 0, strictPort: false },
	});
	let browser = null;
	try {
		await server.listen();
		const address = server.httpServer?.address();
		if (
			address === null ||
			address === undefined ||
			typeof address === "string"
		)
			throw new Error("Vite did not expose a benchmark port");
		browser = await chromium.launch({ headless: true });
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
		await browser?.close();
		await server.close();
	}
}

async function run() {
	const arguments_ = parsePersistenceBenchmarkArguments(process.argv.slice(2));
	const start = sourceState();
	const browserExecutable = chromium.executablePath();
	const browserVersion = execFileSync(browserExecutable, ["--version"], {
		encoding: "utf8",
	}).trim();
	const browserLauncherSha256 = sha256(readFileSync(browserExecutable));
	const browserAccepted =
		browserVersion === EXPECTED_BROWSER.version &&
		browserLauncherSha256 === EXPECTED_BROWSER.launcherSha256;
	const memory = await memorySamples(await loadTypeScriptModules());
	let indexedDb;
	try {
		indexedDb = {
			available: true,
			samples: await indexedDbSamples(arguments_.forceIndexedDbFailure),
		};
	} catch (error) {
		indexedDb = {
			available: false,
			reason: error instanceof Error ? error.message : String(error),
			samples: [],
		};
	}
	const end = sourceState();
	const sourceStable =
		start.commit === end.commit &&
		start.lockfileSha256 === end.lockfileSha256 &&
		start.sourceManifestSha256 === end.sourceManifestSha256;
	const acceptanceAssertions = Object.freeze({
		cleanSource: start.clean && end.clean,
		sourceStable,
		browserCohort: browserAccepted,
		memorySamples: validSamples(memory),
		indexedDbAvailable: indexedDb.available,
		indexedDbSamples: indexedDb.available && validSamples(indexedDb.samples),
	});
	const gatesPass = Object.values(acceptanceAssertions).every(Boolean);
	const status = arguments_.smokeOnly
		? "SMOKE_ONLY"
		: gatesPass
			? "PASS"
			: "FAIL";
	const reportWithoutHash = {
		schemaVersion: PERSISTENCE_BENCHMARK_VERSION,
		status,
		claimBoundary: arguments_.smokeOnly
			? "Explicit smoke-only run; it cannot satisfy DEEP acceptance."
			: "Fail-closed DEEP acceptance for the bounded Memory/IndexedDB workload; timing values are informational.",
		recordedAt: new Date().toISOString(),
		source: { start, end, stable: sourceStable },
		runtime: {
			node: process.version,
			host: `${platform()} ${release()} ${arch()}`,
			chromium: {
				executablePath: browserExecutable,
				version: browserVersion,
				launcherSha256: browserLauncherSha256,
				expected: EXPECTED_BROWSER,
				accepted: browserAccepted,
			},
		},
		workload: WORKLOAD,
		memory: summarize(memory),
		indexedDb: indexedDb.available
			? { available: true, ...summarize(indexedDb.samples) }
			: indexedDb,
		acceptance: {
			mode: arguments_.smokeOnly ? "smoke-only" : "gating",
			assertions: acceptanceAssertions,
			pass: !arguments_.smokeOnly && gatesPass,
		},
		sqliteOpfs: {
			decision: "DEFER",
			measured: false,
			reason:
				"No SQLite dependency is authorized. OPFS needs a later measured spike.",
		},
	};
	const outputSha256 = sha256(JSON.stringify(reportWithoutHash));
	const report = Object.freeze({ ...reportWithoutHash, outputSha256 });
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	if (arguments_.output === null) process.stdout.write(serialized);
	else writeFileSync(resolve(arguments_.output), serialized, { flag: "w" });
	if (status === "FAIL") process.exitCode = 1;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) await run();
