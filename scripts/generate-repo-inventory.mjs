import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const INVENTORY_PATH = "docs/generated/REPO_INVENTORY.md";
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function repositoryFiles(root = ROOT) {
	const output = execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
		{ cwd: root, encoding: "utf8" },
	);
	return output
		.split("\0")
		.filter((path) => path.length > 0 && path !== INVENTORY_PATH)
		.sort(compareText);
}

function areaFor(path) {
	if (path.startsWith("apps/")) return "Application code";
	if (path.startsWith("packages/")) return "Packages";
	if (path.startsWith("tests/")) return "Tests and fixtures";
	if (path.startsWith("scripts/")) return "Repository tooling";
	if (path.startsWith(".github/")) return "GitHub automation";
	if (path.startsWith("docs/exec-plans/evidence/"))
		return "Frozen execution evidence";
	if (path.startsWith("docs/research/") || path.startsWith("docs/reviews/"))
		return "Research and reviews";
	if (path.startsWith("docs/")) return "Documentation";
	if (!path.includes("/")) return "Root controls and configuration";
	return "Other tracked assets";
}

function packageRows(files, root) {
	return files
		.filter((path) => /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(path))
		.map((path) => {
			const directory = path.slice(0, -"/package.json".length);
			const manifest = JSON.parse(readFileSync(resolve(root, path), "utf8"));
			const sourceCount = files.filter((candidate) =>
				candidate.startsWith(`${directory}/src/`),
			).length;
			return { directory, name: manifest.name ?? "(unnamed)", sourceCount };
		})
		.sort((left, right) => compareText(left.directory, right.directory));
}

export function renderRepositoryInventory(files, root = ROOT) {
	const normalized = [...files].sort(compareText);
	const digest = createHash("sha256")
		.update(`${normalized.join("\n")}\n`)
		.digest("hex");
	const counts = new Map();
	for (const path of normalized)
		counts.set(areaFor(path), (counts.get(areaFor(path)) ?? 0) + 1);
	const rootFiles = normalized.filter((path) => !path.includes("/"));
	const riverholdPaths = normalized.filter((path) =>
		/(?:riverhold|founder-alpha)/iu.test(path),
	);
	const testsByCohort = new Map();
	for (const path of normalized.filter((candidate) =>
		candidate.startsWith("tests/"),
	)) {
		const cohort = path.split("/", 2).join("/");
		testsByCohort.set(cohort, (testsByCohort.get(cohort) ?? 0) + 1);
	}

	const lines = [
		"# Generated repository inventory",
		"",
		"**Purpose:** Deterministically report the repository file topology used by V1 CI.",
		"",
		"**Status:** GENERATED — `pnpm inventory:check` fails when this file differs from the repository file set.",
		"",
		"**Authority boundary:** This file inventories paths; it does not decide product readiness. [GOAL.md](../../GOAL.md) owns required-state decisions.",
		"",
		`**File-set identity:** ${normalized.length} files excluding this generated file; SHA-256 \`${digest}\`.`,
		"",
		"## Tracked topology",
		"",
		"| Area | Files |",
		"|---|---:|",
		...[...counts.entries()]
			.sort(([left], [right]) => compareText(left, right))
			.map(([area, count]) => `| ${area} | ${count} |`),
		"",
		"## Workspaces",
		"",
		"| Directory | Package | Source files |",
		"|---|---|---:|",
		...packageRows(normalized, root).map(
			(row) =>
				`| \`${row.directory}\` | \`${row.name}\` | ${row.sourceCount} |`,
		),
		"",
		"## Test cohorts",
		"",
		"| Cohort | Files |",
		"|---|---:|",
		...[...testsByCohort.entries()]
			.sort(([left], [right]) => compareText(left, right))
			.map(([cohort, count]) => `| \`${cohort}\` | ${count} |`),
		"",
		"## Root controls and configuration",
		"",
		...rootFiles.map((path) => `- \`${path}\``),
		"",
		"## Historical naming boundary",
		"",
		`The private tree contains ${riverholdPaths.length} path names containing \`Riverhold\` or \`Founder Alpha\`. Current application paths may use Riverhold as the canonical settlement name; Founder Alpha review records are historical evidence and cannot satisfy a current V1 row in [GOAL.md](../../GOAL.md).`,
		"",
		"The removed Founder Alpha browser application is preserved only in the private archive tag and external bundle; no production route or CI capture executes it.",
		"",
		"## Regeneration contract",
		"",
		"- Run `pnpm inventory:generate` after adding, removing, or moving repository files.",
		"- Run `pnpm inventory:check` in CI and before integration.",
		"- The generator sorts all paths and emits no wall-clock value or mutable branch label.",
		"- A clean check proves this inventory matches the repository file set; it does not prove any implementation requirement.",
		"",
	];
	return lines.join("\n");
}

export function checkOrWriteInventory({ root = ROOT, mode }) {
	const expected = renderRepositoryInventory(repositoryFiles(root), root);
	const target = resolve(root, INVENTORY_PATH);
	if (mode === "write") {
		writeFileSync(target, expected);
		return { ok: true, message: `wrote ${INVENTORY_PATH}` };
	}
	if (mode !== "check") throw new Error("mode must be check or write");
	const actual = readFileSync(target, "utf8");
	return actual === expected
		? { ok: true, message: `repository inventory current: ${INVENTORY_PATH}` }
		: {
				ok: false,
				message: `repository inventory is stale: run pnpm inventory:generate and inspect ${INVENTORY_PATH}`,
			};
}

function main() {
	const mode = process.argv.includes("--write")
		? "write"
		: process.argv.includes("--check")
			? "check"
			: null;
	if (mode === null)
		throw new Error("usage: generate-repo-inventory.mjs --write|--check");
	const result = checkOrWriteInventory({ mode });
	process[result.ok ? "stdout" : "stderr"].write(`${result.message}\n`);
	if (!result.ok) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
