import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { classifyConditionalPaths } from "../../../scripts/run-verification-tier.mjs";

describe("V1 CI hardening", () => {
	it("classifies cognition separately from ordinary UI and documentation", () => {
		expect(
			classifyConditionalPaths(["apps/web/src/cognition/model-brain.ts"]),
		).toEqual({ ui: true, cognition: true });
		expect(
			classifyConditionalPaths(["apps/web/src/components/StoryCard.tsx"]),
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

	it("runs cognition once and retains Release Genesis evidence without promoting legacy", () => {
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
		expect(runner).toContain('page.goto("http://127.0.0.1:4174/legacy"');
		expect(runner).toContain("INELIGIBLE FOR V1 READINESS");
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
		expect(runner).toContain('routes: { entry: "/", world: "/world" }');
		expect(runner).toContain(
			"productionJourneysExecuted: linuxSemanticCi ? 26 : 28",
		);
		expect(runner).toContain(
			"legacyIllustratedJourneysExcluded: linuxSemanticCi ? 2 : 0",
		);
		expect(runner).toContain("generatedWorldJourneysExecuted: 10");
		expect(runner).toContain("generatedTargetExecuted: true");
	});

	it("requires frozen target-Mac and review evidence only when the PR becomes ready", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		expect(workflow).toContain(
			"--deep-evidence docs/exec-plans/evidence/003/release/target-mac-deep.json",
		);
		expect(workflow).toContain(
			"--review-evidence docs/exec-plans/evidence/003/release/review-confirmation.json",
		);
		expect(workflow).toContain("--mode draft --head");
		expect(workflow).not.toContain(
			"--mode ready --evidence tmp/eonfolk-verification-pr.json",
		);
	});

	it("binds exact candidate DEEP to the promoted local-model treatment", () => {
		const runner = readFileSync(
			resolve("scripts/run-verification-tier.mjs"),
			"utf8",
		);
		expect(runner).toContain(
			'step("local-model-benchmark", "pnpm", ["test:model:benchmark"])',
		);
		expect(runner).toContain("tmp/eonfolk-local-model-benchmark.json");
	});
});
