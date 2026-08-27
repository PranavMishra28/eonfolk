import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePersistenceBenchmarkArguments } from "../../../scripts/benchmark-persistence.mjs";
import { verifyJarIdentity } from "../../../scripts/check-formal.mjs";
import { TLC_JAR_SHA256 } from "../../../scripts/formal-toolchain.mjs";
import {
	artifactPathsForTier,
	browserJourneyClaim,
	claimBoundaryForTier,
	DEEP_BENCHMARK_CONTRACT,
	describeProductionBrowserCoverage,
	PRODUCTION_FAULT_SCAFFOLDING_MARKERS,
	parsePlaywrightRoster,
	runVerificationSteps,
	verificationContractSha256,
	verificationStepsForTier,
} from "../../../scripts/run-verification-tier.mjs";
import { inspectNetlogEgress } from "../../../scripts/validate-web-network.mjs";

describe("Founder Alpha CI evidence controls", () => {
	it("derives browser coverage from the exact Playwright roster", () => {
		const roster = (counts: Record<string, number>) => {
			const lines = Object.entries(counts).flatMap(([file, count]) =>
				Array.from(
					{ length: count },
					(_, index) => `  ${file}:${index + 1}:1 › journey ${index + 1}`,
				),
			);
			const total = Object.values(counts).reduce(
				(sum, count) => sum + count,
				0,
			);
			return parsePlaywrightRoster(
				[`Listing tests:`, ...lines, `Total: ${total} tests in 3 files`].join(
					"\n",
				),
			);
		};
		const coverage = describeProductionBrowserCoverage({
			environment: { EONFOLK_ALLOW_LINUX_CI: "1" },
			listRoster: (config, environment) => {
				if (config === "playwright.fault.config.ts")
					return roster({
						"generated-world-faults.spec.ts": 11,
						"riverhold.spec.ts": 2,
					});
				return environment.EONFOLK_ALLOW_LINUX_CI === "1"
					? roster({
							"generated-world.spec.ts": 38,
							"riverhold.spec.ts": 14,
							"v1-routes.spec.ts": 4,
						})
					: roster({
							"generated-world.spec.ts": 38,
							"riverhold.spec.ts": 16,
							"v1-routes.spec.ts": 4,
						});
			},
		});
		expect(coverage).toEqual({
			mode: "linux-semantic-ci",
			productionJourneysExecuted: 56,
			targetMacProductionJourneysAvailable: 58,
			targetOnlyJourneysExcluded: 2,
			generatedWorldJourneysExecuted: 38,
			faultJourneysExecuted: 13,
			generatedTargetExecuted: true,
		});
		expect(browserJourneyClaim(coverage)).toBe(
			"13 injected-fault journeys plus 56 production journeys, including 38 generated-world journeys; 2 target-Mac production journeys are excluded",
		);
	});

	it("rejects incomplete Playwright roster output", () => {
		expect(() =>
			parsePlaywrightRoster(
				"Listing tests:\n  generated-world.spec.ts:1:1 › one\nTotal: 2 tests in 1 file",
			),
		).toThrow(/count mismatch/);
	});

	it("rejects the closed fault-scaffolding marker set from production output", () => {
		expect(PRODUCTION_FAULT_SCAFFOLDING_MARKERS).toEqual([
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
	});

	it("keeps the web benchmark on Dawnmere /world", () => {
		const source = readFileSync(resolve("scripts/benchmark-web.mjs"), "utf8");
		expect(source).toContain("await page.goto(`" + "$" + "{origin}/world`");
		expect(source).toContain('route: "/world"');
		expect(source).toContain('worldId: "eonfolk-genesis-world-v1"');
		expect(source).toContain("generated-world-canvas");
		expect(source).toContain("actorCount === 8");
		expect(source).toContain(
			"canonicalPopulation === 0 || canonicalPopulation === 8",
		);
		expect(source).not.toContain("visibleInteractionCount >= 1");
		expect(source).toContain(
			'page.locator("ul.v1-presence-roster button").first()',
		);
		expect(source).toContain(
			'.getByRole("button", { name: "Back to settlement" })',
		);
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
		expect(config).toContain("/@fault|@illustrated-target|@synthetic/u");
		expect(config).toContain("/@fault|@synthetic/u");
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
		expect(source).toContain('page.locator("ul.v1-presence-roster button")');
		expect(source).toContain(
			'"visible resident controls do not match rendered residents"',
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
			'.getByRole("group", { name: "People here" })',
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
			"tmp/eonfolk-presentation-stress.json",
			"tmp/eonfolk-canonical-performance.json",
			"tmp/eonfolk-local-model-benchmark.json",
		]);
		expect(describeArtifacts("portable-extended")).toEqual(["apps/web/dist"]);
	});

	it("cryptographically binds the exact DEEP roster, artifacts, and benchmark identities", () => {
		expect(verificationContractSha256("deep")).toMatch(/^[a-f0-9]{64}$/u);
		expect(verificationContractSha256("deep")).not.toBe(
			verificationContractSha256("pr"),
		);
		expect(DEEP_BENCHMARK_CONTRACT.map((entry) => entry.id)).toEqual([
			"persistence-bounded",
			"diagnostics-source",
			"diagnostics-browser",
			"presentation-stress",
			"release-genesis-web-performance",
			"local-model-treatment",
		]);
		for (const benchmark of DEEP_BENCHMARK_CONTRACT)
			expect(artifactPathsForTier("deep")).toContain(benchmark.path);
	});

	it("keeps PR relative ordering while running the DEEP model gate before heat-intensive checks", () => {
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
			"production-licenses",
			"formal",
		]);
		expect(
			deep
				.filter((entry) => entry.id !== "local-model-benchmark")
				.slice(0, pr.length),
		).toEqual(pr);
		expect(
			deep.findIndex((entry) => entry.id === "local-model-benchmark"),
		).toBe(pr.findIndex((entry) => entry.id === "timing"));
		expect(deep.slice(pr.length + 1).map((entry) => entry.id)).toEqual([
			"targeted-mutation",
			"property-deep",
			"browser-cohort",
			"persistence-benchmark",
			"diagnostics-source-benchmark",
			"diagnostics-browser-benchmark",
			"presentation-stress-benchmark",
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

	it("runs cognition and the canonical real IndexedDB harness exactly through the tier", () => {
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
