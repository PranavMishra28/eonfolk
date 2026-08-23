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
import { fileURLToPath } from "node:url";

const step = (id, command, arguments_ = []) =>
	Object.freeze({ id, command, arguments: Object.freeze(arguments_) });
const PR_STEPS = Object.freeze([
	step("runtime", "pnpm", ["runtime:check"]),
	step("dependency-cohort", "pnpm", ["cohort:check"]),
	step("architecture", "pnpm", ["architecture:check"]),
	step("documentation", "pnpm", ["docs:check"]),
	step("format", "pnpm", ["format:check"]),
	step("lint", "pnpm", ["lint"]),
	step("typecheck", "pnpm", ["typecheck"]),
	step("unit", "pnpm", ["test:unit"]),
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
	]),
	"portable-extended": Object.freeze(["apps/web/dist"]),
});
const PRODUCTION_CRASH_MARKERS = Object.freeze([
	"injected browser crash after durable transition",
	"eonfolk:e2e-crash-after-transition",
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

export function verificationStepsForTier(tier) {
	if (!Object.hasOwn(TIER_STEPS, tier))
		throw new Error(
			"usage: run-verification-tier.mjs pr|deep|portable-extended",
		);
	return TIER_STEPS[tier];
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

function main() {
	const tier = process.argv[2];
	const steps = verificationStepsForTier(tier);
	if (process.argv.includes("--describe-artifacts")) {
		process.stdout.write(`${JSON.stringify(ARTIFACT_PATHS_BY_TIER[tier])}\n`);
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

	const start = sourceState();
	const execution = runVerificationSteps(steps);
	const end = sourceState();
	const sourceUnchanged =
		start.commit === end.commit && start.lockfileSha256 === end.lockfileSha256;
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
	const reportWithoutHash = {
		schemaVersion: "eonfolk-verification-tier-v2",
		tier,
		status,
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
						propertyProfile: "deep: 500/320 deterministic runs",
						diagnosticsModes: ["off", "local", "alpha"],
						persistenceMode: "gating",
						canonicalWebProfile: "5 repetitions x 3 states x 3 viewports",
					}
				: tier === "portable-extended"
					? {
							formalToolIdentity: "repository-pinned TLC SHA-256",
							propertyProfile: "deep portable deterministic properties",
							browserJourney:
								"two semantic injected-fault journeys plus fourteen semantic production journeys on Linux CI",
							readinessEvidence: false,
							targetMacDeepEvidence: false,
						}
					: {
							formalToolIdentity: "repository-pinned TLC SHA-256",
							propertyProfile: "PR: 50/32 deterministic runs",
							browserJourney:
								process.env.EONFOLK_ALLOW_LINUX_CI === "1"
									? "two semantic injected-fault journeys plus fourteen semantic production journeys; relevant UI changes additionally require a three-viewport PlayCanvas/WebGL2 renderer smoke"
									: "two semantic injected-fault journeys plus sixteen illustrated production journeys, including target-renderer lifecycle and spatial picking",
						},
		subcommands: execution.steps,
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
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
