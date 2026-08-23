import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	evaluateV1Readiness,
	parseRequiredStateRows,
	validateExactHeadEvidence,
} from "../../../scripts/check-v1-readiness.mjs";
import {
	checkOrWriteInventory,
	renderRepositoryInventory,
} from "../../../scripts/generate-repo-inventory.mjs";

function goal(state: string) {
	return `# Goal\n\n## Starting evidence\n\n| Requirement | State | Evidence |\n|---|---|---|\n| Baseline | IN PROGRESS | pending |\n\n## Repository and product\n\n| Requirement | State |\n|---|---|\n| First requirement | ${state} |\n\n## Generalized world\n\n| Requirement | State |\n|---|---|\n| Second requirement | VERIFIED |\n`;
}

function evidence(head: string) {
	const report = {
		schemaVersion: "eonfolk-verification-tier-v2",
		tier: "pr",
		status: "PASS",
		source: {
			start: { commit: head, clean: true },
			end: { commit: head, clean: true },
			unchanged: true,
			acceptanceEligible: true,
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
			evidence: null,
			head: "a".repeat(40),
		});
		expect(result.status).toBe("V1 INCOMPLETE");
		expect(result.exactHeadEvidence.status).toBe("NOT_REQUIRED_FOR_DRAFT");
		expect(result.claimBoundary).toContain("no V1 readiness claim");
	});

	it("fails readiness until every row is verified and evidence matches exact HEAD", () => {
		const head = "a".repeat(40);
		const incomplete = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "ready",
			evidence: evidence(head),
			head,
		});
		expect(incomplete.status).toBe("V1 INCOMPLETE");

		const wrongHead = validateExactHeadEvidence(evidence("b".repeat(40)), head);
		expect(wrongHead.ok).toBe(false);
		expect(wrongHead.failures).toContain(
			"source.start.commit is not exact HEAD",
		);

		const ready = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			evidence: evidence(head),
			head,
		});
		expect(ready.status).toBe("V1 READY");
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
