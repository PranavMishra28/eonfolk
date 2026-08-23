import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	evaluateV1Readiness,
	isAllowedPostFreezePath,
	parseRequiredStateRows,
	validateExactHeadEvidence,
	validateReviewConfirmationEvidence,
	validateTargetMacDeepEvidence,
} from "../../../scripts/check-v1-readiness.mjs";
import {
	checkOrWriteInventory,
	renderRepositoryInventory,
} from "../../../scripts/generate-repo-inventory.mjs";

function goal(state: string) {
	return `# Goal\n\n## Starting evidence\n\n| Requirement | State | Evidence |\n|---|---|---|\n| Baseline | IN PROGRESS | pending |\n\n## Repository and product\n\n| Requirement | State |\n|---|---|\n| First requirement | ${state} |\n\n## Generalized world\n\n| Requirement | State |\n|---|---|\n| Second requirement | VERIFIED |\n`;
}

function evidence(head: string, tier: "pr" | "deep" = "deep") {
	const report = {
		schemaVersion: "eonfolk-verification-tier-v2",
		tier,
		status: "PASS",
		source: {
			start: { commit: head, clean: true },
			end: { commit: head, clean: true },
			unchanged: true,
			acceptanceEligible: true,
		},
		environment: { host: "darwin 25.6.0 arm64" },
	};
	return {
		...report,
		outputSha256: createHash("sha256")
			.update(JSON.stringify(report))
			.digest("hex"),
	};
}

const disciplines = [
	"product-game",
	"systems-correctness",
	"visual-accessibility",
	"cognition-eval",
	"persistence-reliability",
	"ci-security",
] as const;

function reviewEvidence(initialReviewSha: string, frozenSoftwareSha: string) {
	const report = {
		schemaVersion: "eonfolk-v1-review-confirmation-v1",
		status: "PASS",
		initialReviewSha,
		frozenSoftwareSha,
		reviews: disciplines.map((discipline, index) => ({
			reviewId: `RV-${index + 1}`,
			reviewerId: `agent-${index + 1}`,
			discipline,
			sourceSha: initialReviewSha,
			status: "COMPLETE",
		})),
		reconciliation: {
			unrepairedP0: 0,
			unrepairedP1: 0,
			finalSoftwareSha: frozenSoftwareSha,
		},
		confirmation: {
			status: "PASS",
			sourceSha: frozenSoftwareSha,
			reviewerId: "agent-confirmation",
		},
	};
	return {
		...report,
		outputSha256: createHash("sha256")
			.update(JSON.stringify(report))
			.digest("hex"),
	};
}

describe("V1 readiness and generated inventory tooling", () => {
	it("parses only required software rows and rejects unknown states", () => {
		expect(parseRequiredStateRows(goal("IN PROGRESS"))).toEqual([
			{ requirement: "First requirement", state: "IN PROGRESS" },
			{ requirement: "Second requirement", state: "VERIFIED" },
		]);
		expect(() => parseRequiredStateRows(goal("DONE"))).toThrow(
			/invalid GOAL state/,
		);
		expect(() =>
			parseRequiredStateRows(
				goal("VERIFIED").replace(
					"| Second requirement | VERIFIED |",
					"| Second requirement | VERIFIED | invented evidence |",
				),
			),
		).toThrow(/malformed GOAL table row/);
	});

	it("keeps incomplete draft CI non-claiming and green", () => {
		const result = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "draft",
			head: "a".repeat(40),
		});
		expect(result.status).toBe("V1 INCOMPLETE");
		expect(result.releaseEvidence.status).toBe("NOT_REQUIRED_FOR_DRAFT");
		expect(result.claimBoundary).toContain("no V1 readiness claim");
	});

	it("requires frozen target-Mac DEEP, six reviews, reconciliation, and confirmation", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const head = "c".repeat(40);
		const deep = evidence(frozenSoftwareSha);
		const reviews = reviewEvidence(initialReviewSha, frozenSoftwareSha);
		const incomplete = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "ready",
			deepEvidence: deep,
			reviewEvidence: reviews,
			head,
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(incomplete.status).toBe("V1 INCOMPLETE");

		const wrongHead = validateExactHeadEvidence(
			evidence(frozenSoftwareSha),
			head,
		);
		expect(wrongHead.ok).toBe(false);
		expect(wrongHead.failures).toContain(
			"source.start.commit is not exact HEAD",
		);

		const ready = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: deep,
			reviewEvidence: reviews,
			head,
			postFreeze: {
				ancestor: true,
				paths: [
					"GOAL.md",
					"docs/reviews/V1_CONFIRMATION.md",
					"docs/exec-plans/evidence/003/release/target-mac-deep.json",
				],
			},
		});
		expect(ready.status).toBe("V1 READY");
		expect(ready.frozenSoftwareSha).toBe(frozenSoftwareSha);
	});

	it("rejects PR-tier, non-Mac, duplicate-reviewer, and software-delta substitutions", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const pr = evidence(frozenSoftwareSha, "pr");
		expect(validateTargetMacDeepEvidence(pr, frozenSoftwareSha)).toMatchObject({
			ok: false,
		});
		const linux = evidence(frozenSoftwareSha);
		linux.environment.host = "linux 6.0.0 x64";
		const { outputSha256: _oldHash, ...linuxWithoutHash } = linux;
		linux.outputSha256 = createHash("sha256")
			.update(JSON.stringify(linuxWithoutHash))
			.digest("hex");
		expect(
			validateTargetMacDeepEvidence(linux, frozenSoftwareSha).failures,
		).toContain("DEEP environment is not macOS");

		const duplicate = reviewEvidence(initialReviewSha, frozenSoftwareSha);
		duplicate.reviews[1].reviewerId = duplicate.reviews[0].reviewerId;
		const { outputSha256: _reviewHash, ...duplicateWithoutHash } = duplicate;
		duplicate.outputSha256 = createHash("sha256")
			.update(JSON.stringify(duplicateWithoutHash))
			.digest("hex");
		expect(validateReviewConfirmationEvidence(duplicate).failures).toContain(
			"reviewers are not independent",
		);

		expect(isAllowedPostFreezePath("docs/reviews/V1.md")).toBe(true);
		expect(isAllowedPostFreezePath("packages/sim/src/index.ts")).toBe(false);
		const result = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: evidence(frozenSoftwareSha),
			reviewEvidence: reviewEvidence(initialReviewSha, frozenSoftwareSha),
			head: "c".repeat(40),
			postFreeze: {
				ancestor: true,
				paths: ["packages/sim/src/index.ts"],
			},
		});
		expect(result.status).toBe("V1 INCOMPLETE");
		expect(result.releaseEvidence.failures[0]).toContain("software");
	});

	it("renders inventory deterministically from sorted file paths", () => {
		const files = [
			"tests/unit/example.test.ts",
			"apps/web/src/main.ts",
			"apps/web/package.json",
			"GOAL.md",
		];
		const readRoot = process.cwd();
		const first = renderRepositoryInventory(files, readRoot);
		const second = renderRepositoryInventory([...files].reverse(), readRoot);
		expect(first).toBe(second);
		expect(first).toContain("Founder Alpha regression boundary");
		expect(first).toContain("INELIGIBLE FOR V1 READINESS");
	});

	it("writes a reproducible inventory and detects a changed file set", () => {
		const root = mkdtempSync(join(tmpdir(), "eonfolk-inventory-"));
		try {
			execFileSync("git", ["init", "--quiet"], { cwd: root });
			mkdirSync(join(root, "docs/generated"), { recursive: true });
			writeFileSync(join(root, "GOAL.md"), "# Goal\n");
			expect(checkOrWriteInventory({ root, mode: "write" }).ok).toBe(true);
			expect(checkOrWriteInventory({ root, mode: "check" }).ok).toBe(true);
			writeFileSync(join(root, "new-file.txt"), "new\n");
			expect(checkOrWriteInventory({ root, mode: "check" })).toMatchObject({
				ok: false,
			});
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
