import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_STATES = new Set([
	"NOT STARTED",
	"IN PROGRESS",
	"VERIFIED",
	"BLOCKED EXTERNALLY",
]);
const REQUIRED_START_HEADING = "## Repository and product";

export function parseRequiredStateRows(source) {
	const lines = source.split(/\r?\n/u);
	const start = lines.findIndex(
		(line) => line.trim() === REQUIRED_START_HEADING,
	);
	if (start < 0) throw new Error(`GOAL is missing ${REQUIRED_START_HEADING}`);
	const rows = [];
	for (const line of lines.slice(start + 1)) {
		if (!line.startsWith("|")) continue;
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
		if (cells.length !== 2)
			throw new Error(`malformed GOAL table row: ${line}`);
		if (cells[0] === "Requirement" || /^-+$/u.test(cells[0] ?? "")) continue;
		const [requirement, state] = cells;
		if (
			requirement === undefined ||
			requirement.length === 0 ||
			state === undefined
		)
			throw new Error(`malformed GOAL row: ${line}`);
		if (!ALLOWED_STATES.has(state))
			throw new Error(
				`invalid GOAL state ${JSON.stringify(state)} for ${requirement}`,
			);
		rows.push({ requirement, state });
	}
	if (rows.length === 0) throw new Error("GOAL has no required-state rows");
	return rows;
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

export function validateExactHeadEvidence(report, expectedHead) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["evidence is not an object"] };
	const { outputSha256, ...withoutHash } = report;
	if (report.schemaVersion !== "eonfolk-verification-tier-v2")
		failures.push("unsupported evidence schema");
	if (report.status !== "PASS")
		failures.push("verification status is not PASS");
	if (report.tier !== "pr" && report.tier !== "deep")
		failures.push("verification tier is not pr or deep");
	if (outputSha256 !== sha256(JSON.stringify(withoutHash)))
		failures.push("verification output hash does not match");
	for (const endpoint of ["start", "end"]) {
		const source = report.source?.[endpoint];
		if (source?.commit !== expectedHead)
			failures.push(`source.${endpoint}.commit is not exact HEAD`);
		if (source?.clean !== true)
			failures.push(`source.${endpoint}.clean is not true`);
	}
	if (report.source?.unchanged !== true)
		failures.push("source.unchanged is not true");
	if (report.source?.acceptanceEligible !== true)
		failures.push("source.acceptanceEligible is not true");
	return { ok: failures.length === 0, failures };
}

export function evaluateV1Readiness({ rows, mode, evidence, head }) {
	if (mode !== "draft" && mode !== "ready")
		throw new Error("mode must be draft or ready");
	const incomplete = rows.filter((row) => row.state !== "VERIFIED");
	const counts = Object.fromEntries(
		[...ALLOWED_STATES].map((state) => [
			state,
			rows.filter((row) => row.state === state).length,
		]),
	);
	const evidenceResult =
		evidence === null
			? { ok: false, failures: ["exact-HEAD verification evidence is missing"] }
			: validateExactHeadEvidence(evidence, head);
	const ready =
		mode === "ready" && incomplete.length === 0 && evidenceResult.ok;
	return {
		schemaVersion: "eonfolk-v1-readiness-v1",
		status: ready ? "V1 READY" : "V1 INCOMPLETE",
		mode,
		head,
		requiredRows: rows.length,
		stateCounts: counts,
		incomplete: incomplete.map((row) => row.requirement),
		exactHeadEvidence:
			mode === "draft"
				? { status: "NOT_REQUIRED_FOR_DRAFT", eligible: false }
				: {
						status: evidenceResult.ok ? "VALID" : "INVALID",
						eligible: evidenceResult.ok,
						failures: evidenceResult.failures,
					},
		claimBoundary: ready
			? "Every required GOAL row is VERIFIED and one clean verification manifest is bound to the checked-out HEAD."
			: mode === "draft"
				? "Draft CI may pass while work remains, but it makes no V1 readiness claim."
				: "A non-draft PR is blocked until every required GOAL row is VERIFIED and exact-HEAD evidence is valid.",
	};
}

function argument(name) {
	const index = process.argv.indexOf(name);
	return index < 0 ? null : (process.argv[index + 1] ?? null);
}

function main() {
	const mode = argument("--mode");
	if (mode !== "draft" && mode !== "ready")
		throw new Error(
			"usage: check-v1-readiness.mjs --mode draft|ready [--evidence path]",
		);
	const goalPath = resolve(argument("--goal") ?? "GOAL.md");
	const evidencePath = argument("--evidence");
	const head =
		argument("--head") ??
		execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const rows = parseRequiredStateRows(readFileSync(goalPath, "utf8"));
	const evidence =
		evidencePath === null
			? null
			: JSON.parse(readFileSync(resolve(evidencePath), "utf8"));
	const result = evaluateV1Readiness({ rows, mode, evidence, head });
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	if (mode === "ready" && result.status !== "V1 READY") process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
