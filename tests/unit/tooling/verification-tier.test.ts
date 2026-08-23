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

	it("gates cognition and retains Release Genesis evidence without promoting legacy", () => {
		const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
		expect(workflow).toContain("steps.classify.outputs.cognition == 'true'");
		expect(workflow).toContain("run: pnpm test:cognition:portable");
		expect(workflow).toContain("name: v1-release-genesis-browser-${{");
		expect(workflow).toContain("retention-days: 30");
		expect(workflow).toContain("name: v1-browser-failure-${{");
		expect(workflow).toContain("retention-days: 14");
		expect(workflow).toContain("name: V1 extended verification");

		const runner = readFileSync(
			resolve("scripts/run-verification-tier.mjs"),
			"utf8",
		);
		expect(runner).toContain('entryRoute: "/"');
		expect(runner).toContain('worldRoute: "/world"');
		expect(runner).toContain('page.goto("http://127.0.0.1:4174/legacy"');
		expect(runner).toContain("INELIGIBLE FOR V1 READINESS");
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
});
