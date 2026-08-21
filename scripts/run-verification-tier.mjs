import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { arch, platform, release } from "node:os";
import { relative, resolve, sep } from "node:path";

const TIER_COMMANDS = Object.freeze({
	pr: Object.freeze(["pnpm", ["verify:pr:checks"]]),
	deep: Object.freeze(["pnpm", ["verify:deep:checks"]]),
});
const ARTIFACT_PATHS_BY_TIER = Object.freeze({
	pr: Object.freeze(["apps/web/dist"]),
	deep: Object.freeze([
		"apps/web/dist",
		"tmp/eonfolk-persistence-benchmark.json",
		"tmp/eonfolk-diagnostics-overhead.json",
		"tmp/eonfolk-diagnostics-browser-comparison.json",
		"tmp/eonfolk-canonical-performance.json",
	]),
});
const PRODUCTION_CRASH_MARKERS = Object.freeze([
	"injected browser crash after durable transition",
	"eonfolk:e2e-crash-after-transition",
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function sourceState() {
	return Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
	});
}

function visitArtifactFiles(paths) {
	const files = [];
	const visit = (path) => {
		if (!existsSync(path)) return;
		const stat = statSync(path);
		if (stat.isDirectory()) {
			for (const name of readdirSync(path)) visit(resolve(path, name));
			return;
		}
		if (!stat.isFile()) return;
		files.push({
			path: relative(resolve("."), path).split(sep).join("/"),
			bytes: stat.size,
			sha256: sha256(readFileSync(path)),
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
		if (PRODUCTION_CRASH_MARKERS.some((marker) => contents.includes(marker)))
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

const tier = process.argv[2];
if (!(tier in TIER_COMMANDS))
	throw new Error("usage: run-verification-tier.mjs pr|deep");
if (process.argv.includes("--describe-artifacts")) {
	process.stdout.write(`${JSON.stringify(ARTIFACT_PATHS_BY_TIER[tier])}\n`);
	process.exit(0);
}
const start = sourceState();
const [command, arguments_] = TIER_COMMANDS[tier];
const started = performance.now();
const result = spawnSync(command, arguments_, {
	stdio: "inherit",
	env: process.env,
});
const durationMs = performance.now() - started;
const end = sourceState();
const exitCode = result.status ?? 1;
const sourceUnchanged =
	start.commit === end.commit && start.lockfileSha256 === end.lockfileSha256;
const acceptanceEligible = sourceUnchanged && start.clean && end.clean;
const status =
	exitCode !== 0 ? "FAIL" : acceptanceEligible ? "PASS" : "SMOKE_ONLY";
const wrapperExitCode = exitCode !== 0 ? exitCode : acceptanceEligible ? 0 : 1;
const artifactAssertions =
	exitCode === 0
		? inspectProductionDist()
		: Object.freeze({
				productionDistPresent: false,
				filesInspected: 0,
				crashInjectionMarkersAbsent: false,
			});
const reportWithoutHash = {
	schemaVersion: "eonfolk-verification-tier-v1",
	tier,
	status,
	claimBoundary:
		status === "SMOKE_ONLY"
			? "Checks passed from an unchanged but dirty source tree; this is not exact-candidate acceptance evidence."
			: "Exact-tier evidence bound to one clean, unchanged source state.",
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
	subcommands: [
		{
			command: [command, ...arguments_].join(" "),
			inputs:
				tier === "deep"
					? {
							propertyProfile: "deep: 500/320 deterministic runs",
							diagnosticsModes: ["off", "local", "alpha"],
							persistenceMode: "gating",
							canonicalWebProfile: "5 repetitions x 3 states x 3 viewports",
						}
					: {
							formalToolIdentity: "repository-pinned TLC SHA-256",
							propertyProfile: "PR: 50/32 deterministic runs",
							browserJourney: "sixteen headed Playwright journeys",
						},
			durationMs,
			exitCode,
		},
	],
	artifactAssertions,
	artifacts: hashArtifacts(ARTIFACT_PATHS_BY_TIER[tier]),
};
const report = {
	...reportWithoutHash,
	outputSha256: sha256(JSON.stringify(reportWithoutHash)),
};
mkdirSync(resolve("tmp"), { recursive: true });
const output = resolve("tmp", `eonfolk-verification-${tier}.json`);
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = wrapperExitCode;
