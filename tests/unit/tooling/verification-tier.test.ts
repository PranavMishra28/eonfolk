import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	classifyConditionalPaths,
	verificationStepsForTier,
} from "../../../scripts/run-verification-tier.mjs";

describe("V1 CI hardening", () => {
	it("classifies cognition separately from ordinary UI and documentation", () => {
		expect(
			classifyConditionalPaths(["apps/web/src/cognition/model-brain.ts"]),
		).toEqual({ ui: true, cognition: true });
		expect(
			classifyConditionalPaths(["apps/web/src/generated-world-canvas.tsx"]),
		).toEqual({ ui: true, cognition: false });
		expect(classifyConditionalPaths(["docs/quality/TESTING.md"])).toEqual({
			ui: false,
			cognition: false,
		});
		expect(
			classifyConditionalPaths(["tests/manual/local-model-benchmark.test.ts"]),
		).toEqual({ ui: false, cognition: true });
		expect(classifyConditionalPaths([".github/workflows/ci.yml"])).toEqual({
			ui: true,
			cognition: true,
		});
	});

	it("keeps FAST locally useful with focused properties and a production build", () => {
		const packageManifest = JSON.parse(
			readFileSync(resolve("package.json"), "utf8"),
		);
		expect(packageManifest.scripts["test:property:focused"]).toContain(
			"tests/property/persistence/generated-civilization.property.test.ts",
		);
		expect(packageManifest.scripts["verify:fast"]).toContain(
			"pnpm test:property:focused",
		);
		expect(packageManifest.scripts["verify:fast"]).toMatch(/pnpm build$/u);
	});

	it("keeps the diagnostics comparison on the canonical world", () => {
		const benchmark = readFileSync(
			resolve("scripts/benchmark-diagnostics-browser.mjs"),
			"utf8",
		);
		expect(benchmark).toMatch(
			/page\.goto\(`\$\{origin\}\/world`, \{ waitUntil: "domcontentloaded" \}\)/u,
		);
	});

	it("reveals contextual resident controls before performance selection", () => {
		const benchmark = readFileSync(
			resolve("scripts/benchmark-web.mjs"),
			"utf8",
		);
		expect(benchmark).toContain(
			'page.locator(".v1-context-panel").hover({ timeout: 5_000 })',
		);
	});

	it("runs cognition once and retains Release Genesis evidence", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		expect(workflow).not.toContain("run: pnpm test:cognition:portable");
		expect(workflow).toContain("name: v1-release-genesis-browser-${{");
		expect(workflow).toContain("retention-days: 30");
		expect(workflow).toContain("name: v1-browser-failure-${{");
		expect(workflow).toContain("retention-days: 14");
		expect(workflow).toContain("name: V1 extended verification");

		const runner = readFileSync(
			resolve("scripts/run-verification-tier.mjs"),
			"utf8",
		);
		expect(runner).toContain(
			'step("cognition-portable", "pnpm", ["test:cognition:portable"])',
		);
		expect(runner).toContain('entryRoute: "/"');
		expect(runner).toContain('worldRoute: "/world"');
		expect(runner).not.toContain('page.goto("http://127.0.0.1:4174/legacy"');
		expect(runner).toContain(
			'{ name: "desktop-1728x1117", width: 1728, height: 1117 }',
		);
		expect(runner).toContain(
			'{ name: "laptop-1366x768", width: 1366, height: 768 }',
		);
		expect(runner).toContain(
			'{ name: "mobile-390x844", width: 390, height: 844 }',
		);
		expect(runner).toContain("worldReadyMs");
		expect(runner).toContain(
			'viewport.name === "mobile-390x844" ? 5_000 : 3_000',
		);
		expect(runner).toContain("readinessBudgetMs: maximumWorldReadyMs");
		expect(runner).toContain("readinessBudgetEnforced: enforceReadinessBudget");
		expect(runner).toContain('"SUPPLEMENTARY_NOT_EVALUATED"');
		expect(runner).toContain("targetMacPerformanceEvaluated: !linuxSemanticCi");
		expect(runner).toContain('routes: { entry: "/", world: "/world" }');
		expect(workflow.match(/EONFOLK_ALLOW_LINUX_CI: "1"/gu)).toHaveLength(4);
		expect(runner).toContain(
			"const productionBrowserCoverage = describeProductionBrowserCoverage();",
		);
		expect(runner).toContain("productionJourneysExecuted: actual.total");
		expect(runner).toContain("targetOnlyJourneysExcluded");
		expect(runner).toContain(
			'actual.journeysByFile["generated-world.spec.ts"] ?? 0',
		);
		expect(runner).toContain("faultJourneysExecuted: fault.total");
		expect(runner).not.toMatch(/productionJourneysExecuted:\s*\d/u);
	});

	it("requires frozen target-Mac and review evidence only when the PR becomes ready", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		expect(workflow).toContain(
			'--deep-evidence "' + "$" + '{verified_payloads}/target-mac-deep.json"',
		);
		expect(workflow).toContain(
			"--review-evidence docs/exec-plans/evidence/003/release/review-confirmation.json",
		);
		expect(workflow).toContain("--mode draft");
		expect(workflow).not.toContain(
			"--mode ready --evidence tmp/eonfolk-verification-pr.json",
		);
		expect(workflow).toContain(
			'if [[ "' + "$" + '{V1_EVENT_NAME}" == "push" ]]',
		);
		expect(workflow).toContain('V1_READINESS_MODE="ready"');
		expect(workflow).toContain('--tested-kind "' + "$" + '{V1_TESTED_KIND}"');
		expect(workflow).toContain('--tested-head "' + "$" + '{V1_TESTED_HEAD}"');
		expect(workflow).toContain('--base-head "' + "$" + '{V1_BASE_HEAD}"');
		expect(workflow).toContain('V1_TESTED_KIND="pull-request-merge"');
		expect(workflow).toContain('V1_TESTED_KIND="main-push"');
		expect(workflow).toContain("V1_EVIDENCE_RUN_IDS_JSON");
		expect(workflow).toContain("it is not a trust assertion");
		expect(workflow).toContain(
			'--payload-dir "' + "$" + '{verified_payloads}"',
		);
		expect(workflow).toContain(
			'--trusted-attestations "' + "$" + '{verified_registry}"',
		);
		expect(workflow.match(/--tested-kind/g)).toHaveLength(2);
		expect(workflow.match(/--tested-head/g)).toHaveLength(2);
		expect(workflow.match(/--base-head/g)).toHaveLength(2);
	});

	it("keeps manual evidence lanes in CI and the DEEP roster exact", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		expect(verificationStepsForTier("deep")).toHaveLength(32);
		expect(workflow).toContain("workflow_dispatch:");
		expect(workflow).toContain("evidence_purpose:");
		expect(workflow).toContain("target-mac-intermediate");
		expect(workflow).toContain(
			"format('eonfolk-ephemeral-deep-{0}', inputs.runner_nonce)",
		);
		expect(workflow).toContain("runs-on: ubuntu-24.04");
		expect(workflow).toContain(
			"Checkout dispatch-tag target as inert evidence bytes",
		);
		expect(workflow).not.toContain("inputs.evidence_sha");
		expect(workflow).toContain("inputs.runner_probe_json_base64");
		expect(workflow).toContain(
			"Prove dedicated non-admin identity before checkout",
		);
		expect(workflow).toContain(
			"Bind actions-read job metadata and finalize inert payload",
		);
		expect(workflow).not.toContain("/actions/runners");
		expect(workflow).toContain("dseditgroup -o checkmember");
		expect(workflow).toContain("refs/tags/eonfolk-evidence-");
		expect(workflow).toContain("repository-preflight");
		expect(workflow).toContain("-attempt-" + "$" + "{{ github.run_attempt }}");
		expect(workflow).toContain("inputs.evidence_purpose || 'automatic'");
		const macJob = workflow.indexOf("  mac-deep-intermediate:");
		const identity = workflow.indexOf(
			"Prove dedicated non-admin identity before checkout",
			macJob,
		);
		const checkout = workflow.indexOf("Check out exact frozen control", macJob);
		expect(identity).toBeGreaterThan(macJob);
		expect(identity).toBeLessThan(checkout);
		expect(workflow).toContain(
			"node ../control/scripts/run-verification-tier.mjs deep",
		);
		expect(() =>
			readFileSync(resolve(".github/workflows/v1-evidence.yml"), "utf8"),
		).toThrow();
	});

	it("validates the frozen dependency graph before either dependency fetch", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		const matches = workflow.match(
			/name: Validate frozen dependency cohort before dependency fetch/g,
		);
		expect(matches).toHaveLength(2);
		for (const jobStart of [
			workflow.indexOf("  verify:"),
			workflow.indexOf("  extended:"),
		]) {
			const cohort = workflow.indexOf(
				"name: Validate frozen dependency cohort before dependency fetch",
				jobStart,
			);
			const install = workflow.indexOf("name: Install dependencies", jobStart);
			expect(cohort).toBeGreaterThan(jobStart);
			expect(cohort).toBeLessThan(install);
		}
	});

	it("binds exact candidate DEEP to the promoted local-model treatment", () => {
		const runner = readFileSync(
			resolve("scripts/run-verification-tier.mjs"),
			"utf8",
		);
		expect(runner).toMatch(
			/step\("local-model-benchmark",\s*"pnpm",\s*\[\s*"test:model:benchmark",?\s*\]\)/u,
		);
		expect(runner).toContain("tmp/eonfolk-local-model-benchmark.json");
	});
});
