import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePersistenceBenchmarkArguments } from "../../../scripts/benchmark-persistence.mjs";
import { verifyJarIdentity } from "../../../scripts/check-formal.mjs";
import { TLC_JAR_SHA256 } from "../../../scripts/formal-toolchain.mjs";
import {
	claimBoundaryForTier,
	runVerificationSteps,
	verificationStepsForTier,
} from "../../../scripts/run-verification-tier.mjs";
import { inspectNetlogEgress } from "../../../scripts/validate-web-network.mjs";

describe("Founder Alpha CI evidence controls", () => {
	it("keeps the canonical web benchmark on Release Genesis /world", () => {
		const source = readFileSync(resolve("scripts/benchmark-web.mjs"), "utf8");
		expect(source).toContain("await page.goto(`" + "$" + "{origin}/world`");
		expect(source).toContain('route: "/world"');
		expect(source).toContain('worldId: "eonfolk-genesis-world-v1"');
		expect(source).toContain("generated-world-canvas");
		expect(source).toContain("actorCount === 7");
		expect(source).toContain("canonicalPopulation === 8");
		expect(source).toContain("visibleInteractionCount >= 1");
		expect(source).toContain("verifyGeneratedPersistenceReload");
		expect(source).toContain(
			'world?.getAttribute("data-persistence") === "indexeddb"',
		);
		expect(source).toContain(
			'assertWorldInvariant(invariant, "after persistence reload", true)',
		);
		expect(source).toContain("stateHashStable: true");
		expect(source).not.toContain("region_riverhold");
		expect(source).not.toContain("riverhold-canvas");
	});

	it("times the operable CTA independently from the meaningful WebGL world", () => {
		const source = readFileSync(resolve("scripts/benchmark-web.mjs"), "utf8");
		const ctaStart = source.indexOf('markWhen("eonfolk-cta"');
		const worldStart = source.indexOf(
			'markWhen("eonfolk-meaningful-world"',
			ctaStart,
		);
		expect(ctaStart).toBeGreaterThan(-1);
		expect(worldStart).toBeGreaterThan(ctaStart);
		const ctaQualification = source.slice(ctaStart, worldStart);
		expect(ctaQualification).toContain("semanticToggle.tabIndex >= 0");
		expect(ctaQualification).toContain(
			"semanticToggle.getClientRects().length > 0",
		);
		expect(ctaQualification).not.toContain("canvas");
	});

	it("runs the strongest generated-world journey in Linux CI with fail-closed WebGL", () => {
		const config = readFileSync(
			resolve("apps/web/playwright.config.ts"),
			"utf8",
		);
		expect(config).toContain("linuxCi ? /@fault|@illustrated-target/u");
		expect(config).not.toContain("@fault|@generated-target");
		expect(config).not.toContain("@fault|@generated-world");

		const journey = readFileSync(
			resolve("tests/e2e/generated-world.spec.ts"),
			"utf8",
		);
		expect(journey).toContain("@generated-target");
		expect(journey).toContain(
			'await expect(canvas).toHaveAttribute("data-ready", "true"',
		);
		expect(journey).toContain("firstCheckpoint.headHash");
	});

	it("scopes semantic resident parity to canonical resident controls", () => {
		const source = readFileSync(
			resolve("scripts/run-verification-tier.mjs"),
			"utf8",
		);
		const parityFailure = source.indexOf(
			"semantic world does not preserve resident parity",
		);
		expect(parityFailure).toBeGreaterThan(-1);
		const parityCheck = source.slice(
			Math.max(0, parityFailure - 500),
			parityFailure,
		);
		expect(parityCheck).toContain(
			'.getByRole("group", { name: "Canonical residents" })',
		);
		expect(parityCheck).toContain('.getByRole("button")');
		expect(parityCheck).not.toContain('semantic.locator("button")');
	});

	it("does not misclassify macOS interface-change metadata as attempted egress", () => {
		const evidence = inspectNetlogEgress({
			constants: {
				logEventTypes: { NETWORK_MAC_OS_CONFIG_CHANGED: 458 },
			},
			events: [
				{
					type: 458,
					params: {
						old_interfaces: [{ address: "10.103.2.54" }],
						new_interfaces: [{ address: "192.168.5.71" }],
					},
				},
				{ type: 1, params: { url: "http://127.0.0.1:4174/index.html" } },
			],
		});
		expect(evidence).toEqual({ externalAttempts: [], localEvidence: 1 });
	});

	it("still rejects a real external connection field after interface filtering", () => {
		const evidence = inspectNetlogEgress({
			constants: {
				logEventTypes: { NETWORK_MAC_OS_CONFIG_CHANGED: 458 },
			},
			events: [
				{ type: 458, params: { new_interfaces: [{ address: "10.0.0.2" }] } },
				{ type: 12, params: { destination: "example.com:443" } },
			],
		});
		expect(evidence.externalAttempts).toEqual(["destination:example.com"]);
	});

	it("uses tier-specific artifact allowlists", () => {
		const describeArtifacts = (tier: "pr" | "deep" | "portable-extended") => {
			const result = spawnSync(
				process.execPath,
				["scripts/run-verification-tier.mjs", tier, "--describe-artifacts"],
				{ cwd: resolve("."), encoding: "utf8" },
			);
			expect(result.status).toBe(0);
			return JSON.parse(result.stdout);
		};
		expect(describeArtifacts("pr")).toEqual(["apps/web/dist"]);
		expect(describeArtifacts("deep")).toEqual([
			"apps/web/dist",
			"tmp/eonfolk-persistence-benchmark.json",
			"tmp/eonfolk-diagnostics-overhead.json",
			"tmp/eonfolk-diagnostics-browser-comparison.json",
			"tmp/eonfolk-canonical-performance.json",
			"tmp/eonfolk-local-model-benchmark.json",
		]);
		expect(describeArtifacts("portable-extended")).toEqual(["apps/web/dist"]);
	});

	it("keeps PR and DEEP ordering while adding one portable extended superset", () => {
		const pr = verificationStepsForTier("pr");
		const deep = verificationStepsForTier("deep");
		const portableExtended = verificationStepsForTier("portable-extended");
		expect(pr.map((entry) => entry.id)).toEqual([
			"runtime",
			"dependency-cohort",
			"architecture",
			"documentation",
			"markdown",
			"diff-check",
			"format",
			"lint",
			"typecheck",
			"unit",
			"cognition-portable",
			"property-pr",
			"indexeddb",
			"timing",
			"browser-fault",
			"browser-fault-network",
			"production-build",
			"bundle-budget",
			"browser-production",
			"browser-production-network",
			"production-audit",
			"formal",
		]);
		expect(deep.slice(0, pr.length)).toEqual(pr);
		expect(deep.slice(pr.length).map((entry) => entry.id)).toEqual([
			"targeted-mutation",
			"property-deep",
			"local-model-benchmark",
			"browser-cohort",
			"persistence-benchmark",
			"diagnostics-source-benchmark",
			"diagnostics-browser-benchmark",
			"canonical-web-performance",
		]);
		expect(new Set(deep.map((entry) => entry.id)).size).toBe(deep.length);
		expect(portableExtended.slice(0, pr.length)).toEqual(pr);
		expect(portableExtended.slice(pr.length).map((entry) => entry.id)).toEqual([
			"targeted-mutation",
			"property-deep",
		]);
		expect(new Set(portableExtended.map((entry) => entry.id)).size).toBe(
			portableExtended.length,
		);
	});

	it("marks portable extended evidence as supplementary and not readiness", () => {
		expect(claimBoundaryForTier("portable-extended", "PASS")).toBe(
			"Supplementary exact-source portable evidence only; this does not establish target-Mac DEEP acceptance or V1 readiness.",
		);
		expect(claimBoundaryForTier("pr", "PASS")).toBe(
			"Exact-tier evidence bound to one clean, unchanged source state.",
		);
	});

	it("runs and retains the portable extended runner manifest in CI", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		const extendedJob = workflow.slice(
			workflow.indexOf("  extended:"),
			workflow.indexOf("  formal:"),
		);
		expect(extendedJob).toContain("run: pnpm verify:portable-extended");
		expect(extendedJob).toContain(
			"path: tmp/eonfolk-verification-portable-extended.json",
		);
		expect(extendedJob).not.toContain("run: pnpm verify:pr");
		expect(extendedJob).not.toContain("pnpm test:mutation");
		expect(extendedJob).not.toContain("pnpm test:property:deep");
	});

	it("runs cognition and both real IndexedDB harnesses exactly through the tier", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		const packageManifest = JSON.parse(
			readFileSync(resolve("package.json"), "utf8"),
		) as { scripts: Record<string, string> };
		const cognitionSteps = verificationStepsForTier("pr").filter(
			(entry) => entry.id === "cognition-portable",
		);
		expect(cognitionSteps).toHaveLength(1);
		expect(workflow).not.toContain("run: pnpm test:cognition:portable");
		expect(packageManifest.scripts["test:indexeddb"]).toContain(
			"tests/unit/persistence/indexeddb.browser.mjs",
		);
		expect(packageManifest.scripts["test:indexeddb"]).toContain(
			"tests/unit/persistence/generated-versioned.browser.mjs",
		);
	});

	it("records individual results and fails closed without running later steps", () => {
		const steps = verificationStepsForTier("pr").slice(0, 3);
		const calls: string[] = [];
		const ticks = [0, 5, 5, 13];
		const result = runVerificationSteps(steps, {
			now: () => ticks.shift() ?? 13,
			spawn: (command, arguments_) => {
				calls.push([command, ...arguments_].join(" "));
				return { status: calls.length === 2 ? 7 : 0 };
			},
			stdio: "ignore",
		});
		expect(result.status).toBe("FAIL");
		expect(result.exitCode).toBe(7);
		expect(calls).toEqual(["pnpm runtime:check", "pnpm cohort:check"]);
		expect(result.steps).toEqual([
			{
				id: "runtime",
				command: "pnpm runtime:check",
				durationMs: 5,
				exitCode: 0,
				status: "PASS",
			},
			{
				id: "dependency-cohort",
				command: "pnpm cohort:check",
				durationMs: 8,
				exitCode: 7,
				status: "FAIL",
			},
		]);
	});

	it("keeps the pinned TLC identity in one repository constant", async () => {
		const directory = mkdtempSync(join(tmpdir(), "eonfolk-wrong-tlc-"));
		try {
			const wrongJar = join(directory, "tla2tools.jar");
			writeFileSync(wrongJar, "not the accepted TLC bytes");
			await expect(verifyJarIdentity(wrongJar)).rejects.toMatchObject({
				code: "TOOL_IDENTITY_MISMATCH",
			});
			expect(TLC_JAR_SHA256).toMatch(/^[a-f0-9]{64}$/u);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	it("rejects formal verification when no JAR is supplied", () => {
		const environment = { ...process.env };
		delete environment.TLA2TOOLS_JAR;
		const result = spawnSync(process.execPath, ["scripts/check-formal.mjs"], {
			cwd: resolve("."),
			encoding: "utf8",
			env: environment,
		});
		expect(result.status).toBe(1);
		expect(JSON.parse(result.stderr)).toMatchObject({
			status: "TOOL_UNAVAILABLE",
			verified: false,
		});
	});

	it("requires an explicit smoke-only persistence mode", () => {
		expect(parsePersistenceBenchmarkArguments([])).toEqual({
			smokeOnly: false,
			forceIndexedDbFailure: false,
			output: null,
		});
		expect(
			parsePersistenceBenchmarkArguments([
				"--smoke-only",
				"--force-indexeddb-failure",
				"--output",
				"evidence.json",
			]),
		).toEqual({
			smokeOnly: true,
			forceIndexedDbFailure: true,
			output: "evidence.json",
		});
	});

	it("fails closed when the IndexedDB benchmark harness fails", () => {
		const result = spawnSync(
			process.execPath,
			["scripts/benchmark-persistence.mjs", "--force-indexeddb-failure"],
			{ cwd: resolve("."), encoding: "utf8" },
		);
		expect(result.status).toBe(1);
		const report = JSON.parse(result.stdout);
		expect(report.status).toBe("FAIL");
		expect(report.indexedDb.available).toBe(false);
		expect(report.acceptance.assertions.indexedDbAvailable).toBe(false);
	});

	it("marks an explicit soft persistence probe as smoke-only, never PASS", () => {
		const result = spawnSync(
			process.execPath,
			[
				"scripts/benchmark-persistence.mjs",
				"--smoke-only",
				"--force-indexeddb-failure",
			],
			{ cwd: resolve("."), encoding: "utf8" },
		);
		expect(result.status).toBe(0);
		const report = JSON.parse(result.stdout);
		expect(report.status).toBe("SMOKE_ONLY");
		expect(report.acceptance.pass).toBe(false);
	});
});
