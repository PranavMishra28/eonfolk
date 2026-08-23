import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { arch, platform, release } from "node:os";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { contentSha256 } from "./evidence-integrity.mjs";

const step = (id, command, arguments_ = []) =>
	Object.freeze({ id, command, arguments: Object.freeze(arguments_) });
const PR_STEPS = Object.freeze([
	step("runtime", "pnpm", ["runtime:check"]),
	step("dependency-cohort", "pnpm", ["cohort:check"]),
	step("architecture", "pnpm", ["architecture:check"]),
	step("documentation", "pnpm", ["docs:check"]),
	step("markdown", "pnpm", ["markdown:lint"]),
	step("diff-check", "pnpm", ["diff:check"]),
	step("format", "pnpm", ["format:check"]),
	step("lint", "pnpm", ["lint"]),
	step("typecheck", "pnpm", ["typecheck"]),
	step("unit", "pnpm", ["test:unit"]),
	step("cognition-portable", "pnpm", ["test:cognition:portable"]),
	step("property-pr", "pnpm", ["test:property"]),
	step("indexeddb", "pnpm", ["test:indexeddb"]),
	step("timing", "pnpm", ["test:timing"]),
	step("browser-fault", "pnpm", ["--filter", "@eonfolk/web", "test:e2e:fault"]),
	step("browser-fault-network", "node", ["scripts/validate-web-network.mjs"]),
	step("production-build", "pnpm", ["build"]),
	step("bundle-budget", "pnpm", ["budget:check"]),
	step("browser-production", "pnpm", [
		"--filter",
		"@eonfolk/web",
		"test:e2e:production",
	]),
	step("browser-production-network", "node", [
		"scripts/validate-web-network.mjs",
	]),
	step("production-audit", "pnpm", ["security:audit"]),
	step("formal", "pnpm", ["test:formal"]),
]);
const DEEP_ONLY_STEPS = Object.freeze([
	step("targeted-mutation", "pnpm", ["test:mutation"]),
	step("property-deep", "pnpm", ["test:property:deep"]),
	step("local-model-benchmark", "pnpm", ["test:model:benchmark"]),
	step("browser-cohort", "pnpm", ["browser-cohort:check"]),
	step("persistence-benchmark", "node", [
		"scripts/benchmark-persistence.mjs",
		"--output",
		"tmp/eonfolk-persistence-benchmark.json",
	]),
	step("diagnostics-source-benchmark", "pnpm", [
		"benchmark:diagnostics",
		"--output",
		"tmp/eonfolk-diagnostics-overhead.json",
	]),
	step("diagnostics-browser-benchmark", "pnpm", [
		"benchmark:diagnostics:browser",
		"--output",
		"tmp/eonfolk-diagnostics-browser-comparison.json",
	]),
	step("canonical-web-performance", "pnpm", ["test:performance"]),
]);
const PORTABLE_EXTENDED_ONLY_STEPS = Object.freeze([
	step("targeted-mutation", "pnpm", ["test:mutation"]),
	step("property-deep", "pnpm", ["test:property:deep"]),
]);
const TIER_STEPS = Object.freeze({
	pr: PR_STEPS,
	deep: Object.freeze([...PR_STEPS, ...DEEP_ONLY_STEPS]),
	"portable-extended": Object.freeze([
		...PR_STEPS,
		...PORTABLE_EXTENDED_ONLY_STEPS,
	]),
});
const ARTIFACT_PATHS_BY_TIER = Object.freeze({
	pr: Object.freeze(["apps/web/dist"]),
	deep: Object.freeze([
		"apps/web/dist",
		"tmp/eonfolk-persistence-benchmark.json",
		"tmp/eonfolk-diagnostics-overhead.json",
		"tmp/eonfolk-diagnostics-browser-comparison.json",
		"tmp/eonfolk-canonical-performance.json",
		"tmp/eonfolk-local-model-benchmark.json",
	]),
	"portable-extended": Object.freeze(["apps/web/dist"]),
});
export const DEEP_BENCHMARK_CONTRACT = Object.freeze([
	Object.freeze({
		id: "persistence-bounded",
		path: "tmp/eonfolk-persistence-benchmark.json",
		schemaVersion: "eonfolk-persistence-benchmark-v2",
	}),
	Object.freeze({
		id: "diagnostics-source",
		path: "tmp/eonfolk-diagnostics-overhead.json",
		schemaVersion: "eonfolk-diagnostics-overhead-evidence-v1",
	}),
	Object.freeze({
		id: "diagnostics-browser",
		path: "tmp/eonfolk-diagnostics-browser-comparison.json",
		schemaVersion: "eonfolk-diagnostics-browser-comparison-v1",
	}),
	Object.freeze({
		id: "release-genesis-web-performance",
		path: "tmp/eonfolk-canonical-performance.json",
		schemaVersion: "eonfolk-release-genesis-web-performance-v2",
	}),
	Object.freeze({
		id: "local-model-treatment",
		path: "tmp/eonfolk-local-model-benchmark.json",
		schemaVersion: "eonfolk-local-model-benchmark-v2",
	}),
]);
export const PRODUCTION_FAULT_SCAFFOLDING_MARKERS = Object.freeze([
	"injected browser crash after durable transition",
	"eonfolk:e2e-crash-after-transition",
	"eonfolk:e2e-generated-world-fault-v1",
	"GENERATED_MODEL_PROVIDER_UNAVAILABLE",
	"GENERATED_CHECKPOINT_REJECTED",
	"GeneratedWorldFaultBoundaryError",
	"Generated fault module is unavailable",
	"data-fault-kind",
	"data-fault-disposition",
	"generated-world-fault-status",
	"Retry without the failed local input",
	"generated-world-faults",
	"GENERATED_PERSISTENCE_UNAVAILABLE",
	"GENERATED_NAVIGATION_REJECTED",
	"GENERATED_RENDERER_UNAVAILABLE",
	"GENERATED_ASSET_REJECTED",
	"GENERATED_AUTHORITY_INVARIANT_FAILED",
	"GENERATED_AUTHORITY_PENDING",
	"model-provider",
	"renderer-webgl",
	"authoritative-invariant",
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function gitBlobObjectId(bytes, algorithm) {
	return createHash(algorithm)
		.update(`blob ${bytes.byteLength}\0`)
		.update(bytes)
		.digest("hex");
}

export function trackedTreeState({ requireDetached = true } = {}) {
	const detached =
		spawnSync("git", ["symbolic-ref", "-q", "HEAD"], { stdio: "ignore" })
			.status !== 0;
	if (requireDetached && !detached)
		throw new Error("acceptance evidence requires a detached HEAD checkout");
	const sparse = spawnSync("git", ["config", "--bool", "core.sparseCheckout"], {
		encoding: "utf8",
	});
	if (sparse.status === 0 && sparse.stdout.trim() === "true")
		throw new Error("acceptance evidence rejects sparse checkout");
	const verbose = execFileSync("git", ["ls-files", "-v", "-z"]);
	for (const entry of verbose.toString("utf8").split("\0").filter(Boolean)) {
		const tag = entry[0] ?? "";
		if (tag === "S" || /^[a-z]$/u.test(tag))
			throw new Error(
				`acceptance evidence rejects Git index flag ${tag} on ${entry.slice(2)}`,
			);
	}
	const staged = execFileSync("git", ["ls-files", "--stage", "-z"])
		.toString("utf8")
		.split("\0")
		.filter(Boolean);
	const manifest = [];
	for (const entry of staged) {
		const match = /^(\d{6}) ([a-f0-9]{40,64}) \d\t(.+)$/u.exec(entry);
		if (match === null) throw new Error(`unparseable tracked entry: ${entry}`);
		const [, mode, expectedObject, path] = match;
		const absolute = resolve(path);
		const stat = lstatSync(absolute);
		let bytes;
		if (mode === "120000") {
			if (!stat.isSymbolicLink())
				throw new Error(`tracked mode mismatch for ${path}`);
			bytes = Buffer.from(readlinkSync(absolute));
		} else if (mode === "160000") {
			if (!stat.isDirectory()) throw new Error(`submodule is missing: ${path}`);
			const actual = execFileSync(
				"git",
				["-C", absolute, "rev-parse", "HEAD"],
				{
					encoding: "utf8",
				},
			).trim();
			if (actual !== expectedObject)
				throw new Error(`submodule drift detected: ${path}`);
			manifest.push({ mode, object: actual, path });
			continue;
		} else {
			if (!stat.isFile() || stat.isSymbolicLink())
				throw new Error(`tracked file type mismatch for ${path}`);
			const executable = (stat.mode & 0o111) !== 0;
			if ((mode === "100755") !== executable)
				throw new Error(`tracked executable mode mismatch for ${path}`);
			bytes = readFileSync(absolute);
		}
		const actualObject = gitBlobObjectId(
			bytes,
			expectedObject.length === 64 ? "sha256" : "sha1",
		);
		if (actualObject !== expectedObject)
			throw new Error(`tracked byte mismatch for ${path}`);
		manifest.push({ mode, object: actualObject, path });
	}
	const submodules = spawnSync("git", ["submodule", "status", "--recursive"], {
		encoding: "utf8",
	});
	if (submodules.status !== 0 || /^(?:-|\+|U)/mu.test(submodules.stdout ?? ""))
		throw new Error("submodule state is incomplete or drifted");
	return Object.freeze({
		checkout: detached ? "detached-full" : "branch-full",
		fileCount: manifest.length,
		manifestSha256: sha256(JSON.stringify(manifest)),
	});
}

export function classifyConditionalPaths(paths) {
	const uiPattern =
		/^(apps\/web\/|packages\/|tests\/e2e\/|\.github\/workflows\/ci\.yml$|package\.json$|pnpm-lock\.yaml$|vite\..*\.ts$|playwright\..*\.ts$)/u;
	const cognitionPattern =
		/^(packages\/(cognition|protocol)\/|apps\/web\/src\/cognition\/|tests\/(manual\/local-model|property\/cognition\/|unit\/cognition\/|unit\/systems\/(cognition|visibility)\.|unit\/tooling\/local-model-loopback\.)|scripts\/ollama-bounded-adapter\.mjs$|\.github\/workflows\/ci\.yml$|package\.json$|pnpm-lock\.yaml$)/u;
	return Object.freeze({
		ui: paths.some((path) => uiPattern.test(path)),
		cognition: paths.some((path) => cognitionPattern.test(path)),
	});
}

export function verificationStepsForTier(tier) {
	if (!Object.hasOwn(TIER_STEPS, tier))
		throw new Error(
			"usage: run-verification-tier.mjs pr|deep|portable-extended",
		);
	return TIER_STEPS[tier];
}

export function artifactPathsForTier(tier) {
	if (!Object.hasOwn(ARTIFACT_PATHS_BY_TIER, tier))
		throw new Error(
			"usage: run-verification-tier.mjs pr|deep|portable-extended",
		);
	return ARTIFACT_PATHS_BY_TIER[tier];
}

export function verificationContractSha256(tier) {
	return sha256(
		JSON.stringify({
			artifacts: artifactPathsForTier(tier),
			benchmarks: tier === "deep" ? DEEP_BENCHMARK_CONTRACT : [],
			steps: verificationStepsForTier(tier),
		}),
	);
}

export function claimBoundaryForTier(tier, status) {
	if (status === "FAIL") {
		return "At least one declared constituent failed; later constituents were not run and no acceptance claim is permitted.";
	}
	if (status === "SMOKE_ONLY") {
		return "Checks passed from an unchanged but dirty source tree; this is not exact-candidate acceptance evidence.";
	}
	if (tier === "portable-extended") {
		return "Supplementary exact-source portable evidence only; this does not establish target-Mac DEEP acceptance or V1 readiness.";
	}
	return "Exact-tier evidence bound to one clean, unchanged source state.";
}

export function parsePlaywrightRoster(output) {
	const journeysByFile = {};
	for (const line of output.split("\n")) {
		const match = /^ {2}([^:]+\.spec\.ts):\d+:\d+ › /u.exec(line);
		if (match === null) continue;
		const file = match[1];
		journeysByFile[file] = (journeysByFile[file] ?? 0) + 1;
	}
	const totalMatch = /^Total: (\d+) tests? in \d+ files?$/mu.exec(output);
	if (totalMatch === null)
		throw new Error("Playwright roster did not report an exact total");
	const total = Number.parseInt(totalMatch[1], 10);
	const counted = Object.values(journeysByFile).reduce(
		(sum, count) => sum + count,
		0,
	);
	if (counted !== total)
		throw new Error(
			`Playwright roster count mismatch: listed ${counted}, reported ${total}`,
		);
	return Object.freeze({
		total,
		journeysByFile: Object.freeze(journeysByFile),
	});
}

function listPlaywrightRoster(config, environment) {
	return parsePlaywrightRoster(
		execFileSync(
			"pnpm",
			[
				"--filter",
				"@eonfolk/web",
				"exec",
				"playwright",
				"test",
				"--config",
				config,
				"--list",
			],
			{ encoding: "utf8", env: environment },
		),
	);
}

export function describeProductionBrowserCoverage({
	environment = process.env,
	listRoster = listPlaywrightRoster,
} = {}) {
	const linuxSemanticCi = environment.EONFOLK_ALLOW_LINUX_CI === "1";
	const targetMacEnvironment = {
		...environment,
		EONFOLK_ALLOW_LINUX_CI: "0",
	};
	const actual = listRoster("playwright.config.ts", environment);
	const targetMac = linuxSemanticCi
		? listRoster("playwright.config.ts", targetMacEnvironment)
		: actual;
	const fault = listRoster("playwright.fault.config.ts", environment);
	const legacyIllustratedJourneysExcluded = targetMac.total - actual.total;
	if (legacyIllustratedJourneysExcluded < 0)
		throw new Error("Linux production roster exceeds the target-Mac roster");
	return Object.freeze({
		mode: linuxSemanticCi ? "linux-semantic-ci" : "target-mac",
		productionJourneysExecuted: actual.total,
		targetMacProductionJourneysAvailable: targetMac.total,
		legacyIllustratedJourneysExcluded,
		generatedWorldJourneysExecuted:
			actual.journeysByFile["generated-world.spec.ts"] ?? 0,
		faultJourneysExecuted: fault.total,
		generatedTargetExecuted:
			(actual.journeysByFile["generated-world.spec.ts"] ?? 0) > 0,
	});
}

export function browserJourneyClaim(coverage) {
	const exclusion =
		coverage.legacyIllustratedJourneysExcluded === 0
			? "no target-Mac production journeys are excluded"
			: `${coverage.legacyIllustratedJourneysExcluded} illustrated target-Mac production journeys are excluded`;
	return `${coverage.faultJourneysExecuted} injected-fault journeys plus ${coverage.productionJourneysExecuted} production journeys, including ${coverage.generatedWorldJourneysExecuted} generated-world journeys; ${exclusion}`;
}

export function runVerificationSteps(
	steps,
	{
		spawn = spawnSync,
		now = () => performance.now(),
		environment = process.env,
		stdio = "inherit",
	} = {},
) {
	const results = [];
	for (const entry of steps) {
		const started = now();
		const result = spawn(entry.command, entry.arguments, {
			stdio,
			env: environment,
		});
		const durationMs = now() - started;
		const exitCode = result.status ?? 1;
		results.push(
			Object.freeze({
				id: entry.id,
				command: [entry.command, ...entry.arguments].join(" "),
				durationMs,
				exitCode,
				status: exitCode === 0 ? "PASS" : "FAIL",
			}),
		);
		if (exitCode !== 0)
			return Object.freeze({
				status: "FAIL",
				exitCode,
				steps: Object.freeze(results),
			});
	}
	return Object.freeze({
		status: "PASS",
		exitCode: 0,
		steps: Object.freeze(results),
	});
}

function sourceState({ requireDetached = false } = {}) {
	const trackedTree = trackedTreeState({ requireDetached });
	return Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
		trackedTree,
	});
}

function visitArtifactFiles(paths) {
	const root = realpathSync(resolve("."));
	const files = [];
	const visit = (path) => {
		if (!existsSync(path)) return;
		const lexical = lstatSync(path);
		if (lexical.isSymbolicLink())
			throw new Error(`artifact path must not be a symlink: ${path}`);
		const real = realpathSync(path);
		const repositoryRelative = relative(root, real).split(sep).join("/");
		if (repositoryRelative === ".." || repositoryRelative.startsWith("../"))
			throw new Error(`artifact path escaped repository: ${path}`);
		const stat = statSync(real);
		if (stat.isDirectory()) {
			for (const name of readdirSync(real)) visit(resolve(real, name));
			return;
		}
		if (!stat.isFile()) return;
		files.push({
			evidencePath: `docs/exec-plans/evidence/003/release/deep-artifacts/${repositoryRelative}`,
			path: repositoryRelative,
			bytes: stat.size,
			sha256: sha256(readFileSync(real)),
		});
	};
	for (const path of paths) visit(resolve(path));
	files.sort((left, right) => left.path.localeCompare(right.path));
	return files;
}

function inspectProductionDist() {
	const files = visitArtifactFiles(["apps/web/dist"]);
	if (files.length === 0)
		throw new Error("production dist is missing or empty");
	for (const file of files) {
		const contents = readFileSync(resolve(file.path)).toString("utf8");
		if (
			PRODUCTION_FAULT_SCAFFOLDING_MARKERS.some((marker) =>
				contents.includes(marker),
			)
		)
			throw new Error(`fault-injection marker remained in ${file.path}`);
	}
	return Object.freeze({
		productionDistPresent: true,
		filesInspected: files.length,
		crashInjectionMarkersAbsent: true,
	});
}

function hashArtifacts(paths) {
	const files = visitArtifactFiles(paths);
	return Object.freeze({
		files,
		manifestSha256: sha256(JSON.stringify(files)),
	});
}

function finiteMeasurements(value) {
	if (typeof value === "number") return Number.isFinite(value) && value >= 0;
	if (Array.isArray(value))
		return value.length > 0 && value.every(finiteMeasurements);
	if (value !== null && typeof value === "object") {
		const entries = Object.values(value);
		return entries.length > 0 && entries.every(finiteMeasurements);
	}
	return typeof value === "string" && value.length > 0;
}

function assertArtifactSelfHash(report, hashField = "outputSha256") {
	const expected = report[hashField];
	if (typeof expected !== "string" || !/^[a-f0-9]{64}$/u.test(expected))
		throw new Error(
			`benchmark ${report.schemaVersion} has no valid ${hashField}`,
		);
	if (contentSha256(report, hashField) !== expected)
		throw new Error(
			`benchmark ${report.schemaVersion} ${hashField} is invalid`,
		);
}

function maximumFrameP95(mode) {
	return Math.max(...Object.values(mode.frames).map((frame) => frame.p95Ms));
}

function benchmarkMeasurements(contract, report) {
	switch (contract.id) {
		case "persistence-bounded":
			if (report.status !== "PASS" || report.acceptance?.pass !== true)
				throw new Error("persistence benchmark is not an accepted gating PASS");
			assertArtifactSelfHash(report);
			return {
				indexedDbAppendMedianMs: report.indexedDb?.appendMedianMilliseconds,
				indexedDbRecoveryMedianMs: report.indexedDb?.recoveryMedianMilliseconds,
				memoryAppendMedianMs: report.memory?.appendMedianMilliseconds,
				memoryRecoveryMedianMs: report.memory?.recoveryMedianMilliseconds,
			};
		case "diagnostics-source":
			if (report.status !== "PASS")
				throw new Error("source diagnostics benchmark is not PASS");
			return report.modes.map((mode) => ({
				mode: mode.mode,
				recordCallP95Ms: mode.recordCall?.p95Ms,
			}));
		case "diagnostics-browser":
			if (report.status !== "PASS")
				throw new Error("browser diagnostics benchmark is not PASS");
			assertArtifactSelfHash(report);
			return report.modes.map((mode) => ({
				journeyMs: mode.journeyMs,
				maximumFrameP95Ms: maximumFrameP95(mode),
				mode: mode.mode,
			}));
		case "release-genesis-web-performance":
			if (
				report.canonical !== true ||
				report.runtime?.power?.profileAccepted !== true ||
				report.source?.stable !== true ||
				report.source?.builtOutput?.stable !== true ||
				report.fixture?.run !== "release-genesis-generated-world" ||
				report.fixture?.route !== "/world" ||
				report.runs?.length !== 15 ||
				report.networkOracle?.externalRouteAttempts?.length !== 0 ||
				report.networkOracle?.externalNetlogAttempts?.length !== 0
			)
				throw new Error("canonical web benchmark identity or gate is invalid");
			return report.aggregates.map((profile) => ({
				maximumMeaningfulWorldMs: Math.max(
					...report.runs
						.filter((run) => run.profile === profile.profile)
						.map((run) => run.marks.meaningfulWorldMs),
				),
				pooledFrameP95Ms: profile.pooled?.p95Ms,
				profile: profile.profile,
			}));
		case "local-model-treatment": {
			const requiredGates = [
				"completeCorpus",
				"fallbackWithinFivePercent",
				"freeDiskReserve",
				"hiddenActionAgreementAtLeast98Percent",
				"memoryPressureNormal",
				"noSwapGrowth",
				"warmP95WithinFourSeconds",
			];
			const gates = report.summary?.promotionGates ?? {};
			if (
				report.source?.dirty !== false ||
				JSON.stringify(Object.keys(gates).sort()) !==
					JSON.stringify(requiredGates) ||
				!requiredGates.every((gate) => gates[gate] === true)
			)
				throw new Error("local-model benchmark promotion gates are not PASS");
			return {
				executions: report.summary?.executions,
				fallbacks: report.summary?.fallbacks,
				warmP95Ms: report.summary?.warmLatencyMs?.p95,
			};
		}
		default:
			throw new Error(`unknown DEEP benchmark ${contract.id}`);
	}
}

export function validateDeepBenchmarkReport(contract, report, sourceCommit) {
	if (
		contract === null ||
		!DEEP_BENCHMARK_CONTRACT.some(
			(entry) =>
				entry.id === contract.id &&
				entry.path === contract.path &&
				entry.schemaVersion === contract.schemaVersion,
		)
	)
		throw new Error("unknown DEEP benchmark contract");
	if (report?.schemaVersion !== contract.schemaVersion)
		throw new Error(`benchmark ${contract.id} schema is invalid`);
	const reportSourceSha =
		contract.id === "diagnostics-source" ||
		contract.id === "local-model-treatment" ||
		contract.id === "release-genesis-web-performance"
			? report.source?.commit
			: report.source?.start?.commit;
	if (reportSourceSha !== sourceCommit)
		throw new Error(`benchmark ${contract.id} is not bound to exact HEAD`);
	const measurements = benchmarkMeasurements(contract, report);
	if (!finiteMeasurements(measurements))
		throw new Error(`benchmark ${contract.id} measurements are invalid`);
	return measurements;
}

function inspectDeepBenchmarkEvidence(sourceCommit, artifactManifest) {
	const artifactHashes = new Map(
		artifactManifest.files.map((file) => [file.path, file.sha256]),
	);
	return DEEP_BENCHMARK_CONTRACT.map((contract) => {
		const report = JSON.parse(readFileSync(resolve(contract.path), "utf8"));
		const measurements = validateDeepBenchmarkReport(
			contract,
			report,
			sourceCommit,
		);
		const artifactSha256 = artifactHashes.get(contract.path);
		if (!/^[a-f0-9]{64}$/u.test(artifactSha256 ?? ""))
			throw new Error(
				`benchmark ${contract.id} is absent from artifact manifest`,
			);
		return Object.freeze({
			artifactSha256,
			id: contract.id,
			measurements,
			path: contract.path,
			schemaVersion: contract.schemaVersion,
			status: "PASS",
		});
	});
}

function safeEvidenceDirectory(path) {
	const root = resolve(".");
	const output = resolve(path);
	const repositoryRelative = relative(root, output).split(sep).join("/");
	if (
		repositoryRelative === "tmp" ||
		!repositoryRelative.startsWith("tmp/") ||
		repositoryRelative.includes("../")
	)
		throw new Error(
			"browser evidence output must be a child of repository tmp/",
		);
	return output;
}

const wait = (milliseconds) =>
	new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function stopProcess(process) {
	if (process.exitCode !== null || process.signalCode !== null) return;
	process.kill("SIGTERM");
	await Promise.race([
		new Promise((resolveExit) => process.once("exit", resolveExit)),
		wait(5_000),
	]);
	if (process.exitCode === null && process.signalCode === null)
		process.kill("SIGKILL");
}

async function waitForPreview(process) {
	for (let attempt = 1; attempt <= 80; attempt += 1) {
		if (process.exitCode !== null)
			throw new Error(`production preview exited with ${process.exitCode}`);
		try {
			const response = await fetch("http://127.0.0.1:4174/");
			if (response.ok) return;
		} catch {
			// The bounded retry below owns preview startup readiness.
		}
		await wait(250);
	}
	throw new Error("production preview did not become ready within 20 seconds");
}

async function deleteGeneratedAuthority(page) {
	await page.goto("http://127.0.0.1:4174/outside-canon", {
		waitUntil: "domcontentloaded",
	});
	await page.evaluate(
		() =>
			new Promise((resolveDelete, rejectDelete) => {
				const request = indexedDB.deleteDatabase("eonfolk-generated-authority");
				request.addEventListener("success", () => resolveDelete(), {
					once: true,
				});
				request.addEventListener("error", () => rejectDelete(request.error), {
					once: true,
				});
			}),
	);
}

function observePage(page) {
	const externalAttempts = [];
	const pageErrors = [];
	page.on("console", (message) => {
		if (message.type() === "error") pageErrors.push(message.text());
	});
	page.on("pageerror", (error) => pageErrors.push(error.message));
	return { externalAttempts, pageErrors };
}

async function isolateNetwork(page, externalAttempts) {
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else {
			externalAttempts.push(route.request().url());
			await route.abort("blockedbyclient");
		}
	});
}

async function releaseGenesisViewportEvidence(
	browser,
	root,
	viewport,
	{ enforceReadinessBudget },
) {
	const context = await browser.newContext({
		colorScheme: "light",
		deviceScaleFactor: 1,
		reducedMotion: "reduce",
		viewport,
	});
	await context.tracing.start({
		screenshots: true,
		snapshots: true,
		sources: true,
	});
	const page = await context.newPage();
	const observed = observePage(page);
	await isolateNetwork(page, observed.externalAttempts);
	try {
		await deleteGeneratedAuthority(page);
		const entryNavigationStartedAt = performance.now();
		await page.goto("http://127.0.0.1:4174/", { waitUntil: "networkidle" });
		const entry = page.locator("main.v1-genesis-entry");
		await entry.waitFor({ state: "visible", timeout: 20_000 });
		const entryWorldId = await entry.getAttribute("data-world-id");
		const entryHeading = await page.locator("h1").first().textContent();
		const entryLink = page.getByRole("link", {
			name: "Enter the living world",
		});
		if (entryWorldId !== "eonfolk-genesis-world-v1")
			throw new Error(`entry world identity is ${String(entryWorldId)}`);
		if (entryHeading?.trim() !== "A civilization has already begun.")
			throw new Error(`unexpected entry heading ${String(entryHeading)}`);
		const entryReadyMs = performance.now() - entryNavigationStartedAt;
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
			path: resolve(root, `${viewport.name}-entry.png`),
			scale: "css",
		});

		const worldNavigationStartedAt = performance.now();
		await entryLink.click();
		await page.waitForURL(/\/world$/u, { timeout: 20_000 });
		const world = page.locator("main.v1-world");
		await world.waitFor({ state: "visible", timeout: 20_000 });
		const canvas = page.getByTestId("generated-world-canvas");
		await canvas.waitFor({ state: "visible", timeout: 20_000 });
		await page.waitForFunction(
			() =>
				document
					.querySelector('[data-testid="generated-world-canvas"]')
					?.getAttribute("data-ready") === "true",
			undefined,
			{ timeout: 20_000 },
		);
		const worldReadyMs = performance.now() - worldNavigationStartedAt;
		const maximumWorldReadyMs =
			viewport.name === "mobile-390x844" ? 5_000 : 3_000;
		if (enforceReadinessBudget && worldReadyMs > maximumWorldReadyMs)
			throw new Error(
				`${viewport.name}: /world readiness ${worldReadyMs.toFixed(1)}ms exceeds ${maximumWorldReadyMs}ms`,
			);
		const probe = await canvas.evaluate((host) => {
			const renderer = host.querySelector("canvas");
			return {
				actorCount: Number(host.dataset.actorCount),
				animationClasses: (host.dataset.animationClasses ?? "")
					.split(",")
					.filter(Boolean),
				canvasHeight: renderer?.clientHeight ?? 0,
				canvasWidth: renderer?.clientWidth ?? 0,
				deviceType: host.dataset.deviceType,
				engine: host.dataset.engine,
				hostHeight: host.clientHeight,
				hostWidth: host.clientWidth,
				pixelRatio:
					renderer === null
						? 0
						: renderer.width / Math.max(1, host.clientWidth),
				ready: host.dataset.ready,
				stateHash: host.dataset.stateHash,
				worldId: document
					.querySelector("main.v1-world")
					?.getAttribute("data-world-id"),
			};
		});
		const failures = [];
		if (probe.ready !== "true")
			failures.push("generated renderer is not ready");
		if (probe.engine !== "playcanvas")
			failures.push("renderer is not PlayCanvas");
		if (probe.worldId !== "eonfolk-genesis-world-v1")
			failures.push("world route does not retain Release Genesis identity");
		if (!/^[a-f0-9]{64}$/u.test(probe.stateHash ?? ""))
			failures.push("world state hash is missing or malformed");
		if (probe.actorCount < 1)
			failures.push("no canonical residents are rendered");
		if (probe.animationClasses.length < 1)
			failures.push("no canonical activity classes are rendered");
		if (
			probe.canvasWidth !== probe.hostWidth ||
			probe.canvasHeight !== probe.hostHeight ||
			probe.hostWidth <= 0 ||
			probe.hostHeight <= 0
		)
			failures.push("generated canvas does not fill its visible host");
		if (probe.pixelRatio <= 0 || probe.pixelRatio > 1.51)
			failures.push(`pixel ratio ${probe.pixelRatio} is outside (0, 1.51]`);
		const residentButtons = page.locator("ul.v1-presence-roster button");
		if ((await residentButtons.count()) !== probe.actorCount)
			failures.push(
				"visible resident controls do not match rendered residents",
			);
		if (
			(await page
				.getByRole("navigation", { name: "Settlements" })
				.getByRole("button")
				.count()) < 2
		)
			failures.push(
				"generated civilization exposes fewer than two settlements",
			);
		await page.getByRole("button", { name: "World in words" }).click();
		const semantic = page.getByTestId("generated-semantic-world");
		await semantic.waitFor({ state: "visible" });
		const semanticResidents = semantic
			.getByRole("group", { name: "Canonical residents" })
			.getByRole("button");
		if ((await semanticResidents.count()) !== probe.actorCount)
			failures.push("semantic world does not preserve resident parity");
		await page.getByRole("button", { name: "Embodied" }).click();
		await canvas.waitFor({ state: "visible" });
		await page.waitForFunction(
			() =>
				document
					.querySelector('[data-testid="generated-world-canvas"]')
					?.getAttribute("data-ready") === "true",
			undefined,
			{ timeout: 20_000 },
		);
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: false,
			path: resolve(root, `${viewport.name}-world.png`),
			scale: "css",
		});
		if (observed.externalAttempts.length > 0)
			failures.push(
				`external requests: ${observed.externalAttempts.join(", ")}`,
			);
		if (observed.pageErrors.length > 0)
			failures.push(`browser errors: ${observed.pageErrors.join(" | ")}`);
		if (failures.length > 0)
			throw new Error(`${viewport.name}: ${failures.join("; ")}`);
		await context.tracing.stop();
		return {
			entry: `${viewport.name}-entry.png`,
			entryReadyMs,
			externalAttempts: observed.externalAttempts.length,
			pageErrors: observed.pageErrors.length,
			probe,
			readinessBudgetEnforced: enforceReadinessBudget,
			readinessBudgetMs: maximumWorldReadyMs,
			readinessBudgetStatus: enforceReadinessBudget
				? "PASS"
				: "SUPPLEMENTARY_NOT_EVALUATED",
			routes: { entry: "/", world: "/world" },
			world: `${viewport.name}-world.png`,
			worldReadyMs,
			viewport,
		};
	} catch (error) {
		await page
			.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: true,
				path: resolve(root, `${viewport.name}-failure.png`),
				scale: "css",
			})
			.catch(() => {});
		await context.tracing
			.stop({ path: resolve(root, `${viewport.name}-failure-trace.zip`) })
			.catch(() => {});
		throw error;
	} finally {
		await context.close();
	}
}

async function legacyRegressionEvidence(browser, root) {
	const context = await browser.newContext({
		colorScheme: "light",
		deviceScaleFactor: 1,
		reducedMotion: "reduce",
		viewport: { width: 1366, height: 768 },
	});
	const page = await context.newPage();
	const observed = observePage(page);
	await isolateNetwork(page, observed.externalAttempts);
	try {
		await page.goto("http://127.0.0.1:4174/legacy", {
			waitUntil: "networkidle",
		});
		const canvas = page.getByTestId("riverhold-canvas");
		await canvas.waitFor({ state: "visible", timeout: 15_000 });
		await page.waitForFunction(
			() =>
				document
					.querySelector('[data-testid="riverhold-canvas"]')
					?.getAttribute("data-ready") === "true",
			undefined,
			{ timeout: 15_000 },
		);
		if ((await canvas.getAttribute("data-engine")) !== "playcanvas")
			throw new Error("legacy regression renderer is not PlayCanvas");
		if (observed.externalAttempts.length > 0 || observed.pageErrors.length > 0)
			throw new Error(
				"legacy regression emitted browser errors or external requests",
			);
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
			path: resolve(root, "legacy-laptop.png"),
			scale: "css",
		});
		return {
			claimBoundary:
				"Frozen Founder Alpha/Riverhold regression only; INELIGIBLE FOR V1 READINESS.",
			externalAttempts: 0,
			pageErrors: 0,
			route: "/legacy",
			screenshot: "legacy-laptop.png",
			status: "PASS",
		};
	} finally {
		await context.close();
	}
}

export async function captureV1BrowserEvidence({ outputDirectory }) {
	const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
	const output = safeEvidenceDirectory(outputDirectory);
	rmSync(output, { force: true, recursive: true });
	const source = sourceState();
	const v1Root = resolve(output, "release-genesis");
	const legacyRoot = resolve(output, "legacy-regression");
	mkdirSync(v1Root, { recursive: true });
	mkdirSync(legacyRoot, { recursive: true });
	const previewLog = resolve(output, "preview.log");
	const previewLogDescriptor = openSync(previewLog, "w");
	const preview = spawn(
		"pnpm",
		[
			"--filter",
			"@eonfolk/web",
			"preview",
			"--host",
			"127.0.0.1",
			"--port",
			"4174",
			"--strictPort",
		],
		{ stdio: ["ignore", previewLogDescriptor, previewLogDescriptor] },
	);
	try {
		await waitForPreview(preview);
		const { chromium } = await import("@playwright/test");
		const browser = await chromium.launch({
			args: [
				"--disable-background-networking",
				"--dns-prefetch-disable",
				"--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
			],
		});
		try {
			const evidence = [];
			for (const viewport of [
				{ name: "desktop-1728x1117", width: 1728, height: 1117 },
				{ name: "laptop-1366x768", width: 1366, height: 768 },
				{ name: "mobile-390x844", width: 390, height: 844 },
			])
				evidence.push(
					await releaseGenesisViewportEvidence(browser, v1Root, viewport, {
						enforceReadinessBudget: !linuxSemanticCi,
					}),
				);
			const legacy = await legacyRegressionEvidence(browser, legacyRoot);
			const v1Report = {
				schemaVersion: "eonfolk-v1-release-genesis-browser-evidence-v1",
				status: "PASS",
				claimBoundary: linuxSemanticCi
					? "Supplementary Linux software-renderer entry-to-world evidence for the exact built candidate; target-Mac performance budgets are not evaluated and target-Mac DEEP remains required."
					: "Release Genesis entry-to-world browser evidence for the exact built candidate with target-Mac readiness budgets enforced; independent review remains a separate release gate.",
				entryRoute: "/",
				worldRoute: "/world",
				source,
				targetMacPerformanceEvaluated: !linuxSemanticCi,
				evidence,
			};
			writeFileSync(
				resolve(v1Root, "browser-evidence.json"),
				`${JSON.stringify(v1Report, null, 2)}\n`,
			);
			writeFileSync(
				resolve(legacyRoot, "browser-evidence.json"),
				`${JSON.stringify(legacy, null, 2)}\n`,
			);
			return { legacy, releaseGenesis: v1Report };
		} finally {
			await browser.close();
		}
	} finally {
		await stopProcess(preview);
		closeSync(previewLogDescriptor);
	}
}

async function main() {
	const tier = process.argv[2];
	if (tier === "v1-browser-evidence") {
		const outputIndex = process.argv.indexOf("--output-dir");
		const outputDirectory =
			outputIndex < 0
				? "tmp/v1-browser-evidence"
				: process.argv[outputIndex + 1];
		if (outputDirectory === undefined)
			throw new Error("--output-dir requires a path");
		await captureV1BrowserEvidence({ outputDirectory });
		return;
	}
	const steps = verificationStepsForTier(tier);
	if (process.argv.includes("--describe-artifacts")) {
		process.stdout.write(`${JSON.stringify(artifactPathsForTier(tier))}\n`);
		return;
	}
	if (process.argv.includes("--describe-steps")) {
		process.stdout.write(`${JSON.stringify(steps)}\n`);
		return;
	}
	if (process.argv.includes("--checks-only")) {
		process.exitCode = runVerificationSteps(steps).exitCode;
		return;
	}

	const start = sourceState({ requireDetached: tier === "deep" });
	const execution = runVerificationSteps(steps);
	const end = sourceState({ requireDetached: tier === "deep" });
	const sourceUnchanged =
		start.commit === end.commit &&
		start.lockfileSha256 === end.lockfileSha256 &&
		start.trackedTree.manifestSha256 === end.trackedTree.manifestSha256;
	const acceptanceEligible = sourceUnchanged && start.clean && end.clean;
	const status =
		execution.exitCode !== 0
			? "FAIL"
			: acceptanceEligible
				? "PASS"
				: "SMOKE_ONLY";
	const wrapperExitCode =
		execution.exitCode !== 0 ? execution.exitCode : acceptanceEligible ? 0 : 1;
	const artifactAssertions =
		execution.exitCode === 0
			? inspectProductionDist()
			: Object.freeze({
					productionDistPresent: false,
					filesInspected: 0,
					crashInjectionMarkersAbsent: false,
				});
	const productionBrowserCoverage = describeProductionBrowserCoverage();
	const artifacts = hashArtifacts(artifactPathsForTier(tier));
	const benchmarkEvidence =
		tier === "deep" && execution.exitCode === 0
			? inspectDeepBenchmarkEvidence(start.commit, artifacts)
			: [];
	const reportWithoutHash = {
		schemaVersion: "eonfolk-verification-tier-v3",
		tier,
		status,
		integrityClaim: "REPOSITORY_COMPUTABLE_INTEGRITY_ONLY",
		verificationContractSha256: verificationContractSha256(tier),
		claimBoundary: claimBoundaryForTier(tier, status),
		recordedAt: new Date().toISOString(),
		source: {
			start,
			end,
			unchanged: sourceUnchanged,
			acceptanceEligible,
		},
		environment: {
			node: process.version,
			pnpm: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(),
			host: `${platform()} ${release()} ${arch()}`,
			ci: process.env.CI === "true",
		},
		inputs:
			tier === "deep"
				? {
						productionBrowserCoverage,
						propertyProfile: "deep: 500/320 deterministic runs",
						localModelTreatment:
							"exact 100-decision promoted treatment with deterministic fallback",
						diagnosticsModes: ["off", "local", "alpha"],
						persistenceMode: "gating",
						canonicalWebProfile: "5 repetitions x 3 states x 3 viewports",
					}
				: tier === "portable-extended"
					? {
							productionBrowserCoverage,
							formalToolIdentity: "repository-pinned TLC SHA-256",
							propertyProfile: "deep portable deterministic properties",
							browserJourney: browserJourneyClaim(productionBrowserCoverage),
							readinessEvidence: false,
							targetMacDeepEvidence: false,
						}
					: {
							productionBrowserCoverage,
							formalToolIdentity: "repository-pinned TLC SHA-256",
							propertyProfile: "PR: 50/32 deterministic runs",
							browserJourney: `${browserJourneyClaim(
								productionBrowserCoverage,
							)}; relevant UI changes additionally require three-viewport PlayCanvas/WebGL2 evidence`,
						},
		subcommands: execution.steps,
		artifactAssertions,
		artifacts,
		benchmarkEvidence,
	};
	const report = {
		...reportWithoutHash,
		outputSha256: contentSha256(reportWithoutHash),
	};
	mkdirSync(resolve("tmp"), { recursive: true });
	const output = resolve("tmp", `eonfolk-verification-${tier}.json`);
	writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	process.exitCode = wrapperExitCode;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""))
	await main();
