import { execFileSync, spawnSync } from "node:child_process";
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
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const REQUIRED_REVIEW_DISCIPLINES = new Set([
	"product-game",
	"systems-correctness",
	"visual-accessibility",
	"cognition-eval",
	"persistence-reliability",
	"ci-security",
]);
const POST_FREEZE_ROOT_FILES = new Set([
	"GOAL.md",
	"PLAN.md",
	"README.md",
	"RESUME.md",
	"V1_HANDOFF.md",
]);

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

function verifySelfHash(report, failures) {
	const { outputSha256, ...withoutHash } = report;
	if (outputSha256 !== sha256(JSON.stringify(withoutHash)))
		failures.push("evidence output hash does not match");
}

export function validateExactHeadEvidence(
	report,
	expectedHead,
	{ requiredTier = null } = {},
) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["evidence is not an object"] };
	if (report.schemaVersion !== "eonfolk-verification-tier-v2")
		failures.push("unsupported evidence schema");
	if (report.status !== "PASS")
		failures.push("verification status is not PASS");
	if (requiredTier === null) {
		if (report.tier !== "pr" && report.tier !== "deep")
			failures.push("verification tier is not pr or deep");
	} else if (report.tier !== requiredTier) {
		failures.push(`verification tier is not ${requiredTier}`);
	}
	verifySelfHash(report, failures);
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

export function validateTargetMacDeepEvidence(report, frozenSoftwareSha) {
	const result = validateExactHeadEvidence(report, frozenSoftwareSha, {
		requiredTier: "deep",
	});
	const failures = [...result.failures];
	if (typeof report?.environment?.host !== "string") {
		failures.push("DEEP environment host is missing");
	} else {
		if (!report.environment.host.startsWith("darwin "))
			failures.push("DEEP environment is not macOS");
		if (!report.environment.host.endsWith(" arm64"))
			failures.push("DEEP environment is not Apple arm64");
	}
	return { ok: failures.length === 0, failures };
}

export function validateReviewConfirmationEvidence(report) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["review evidence is not an object"] };
	if (report.schemaVersion !== "eonfolk-v1-review-confirmation-v1")
		failures.push("unsupported review evidence schema");
	if (report.status !== "PASS") failures.push("review evidence is not PASS");
	verifySelfHash(report, failures);
	for (const field of ["initialReviewSha", "frozenSoftwareSha"]) {
		if (!SHA_PATTERN.test(report[field] ?? ""))
			failures.push(`${field} is not a full Git SHA`);
	}

	const reviews = Array.isArray(report.reviews) ? report.reviews : [];
	if (reviews.length !== REQUIRED_REVIEW_DISCIPLINES.size)
		failures.push("review evidence must contain exactly six reviews");
	const reviewIds = new Set();
	const reviewerIds = new Set();
	const disciplines = new Set();
	for (const review of reviews) {
		if (typeof review?.reviewId !== "string" || review.reviewId.length === 0)
			failures.push("review is missing reviewId");
		else reviewIds.add(review.reviewId);
		if (
			typeof review?.reviewerId !== "string" ||
			review.reviewerId.length === 0
		)
			failures.push("review is missing reviewerId");
		else reviewerIds.add(review.reviewerId);
		if (!REQUIRED_REVIEW_DISCIPLINES.has(review?.discipline))
			failures.push(`unknown review discipline ${String(review?.discipline)}`);
		else disciplines.add(review.discipline);
		if (review?.sourceSha !== report.initialReviewSha)
			failures.push("review is not bound to initialReviewSha");
		if (review?.status !== "COMPLETE")
			failures.push("review status is not COMPLETE");
	}
	if (reviewIds.size !== reviews.length)
		failures.push("review IDs are not unique");
	if (reviewerIds.size !== reviews.length)
		failures.push("reviewers are not independent");
	if (disciplines.size !== REQUIRED_REVIEW_DISCIPLINES.size)
		failures.push("required review disciplines are incomplete");
	if (report.reconciliation?.unrepairedP0 !== 0)
		failures.push("review evidence has unrepaired P0 findings");
	if (report.reconciliation?.unrepairedP1 !== 0)
		failures.push("review evidence has unrepaired P1 findings");
	if (report.reconciliation?.finalSoftwareSha !== report.frozenSoftwareSha)
		failures.push("reconciliation is not bound to frozenSoftwareSha");
	if (report.confirmation?.status !== "PASS")
		failures.push("fresh confirmation is not PASS");
	if (report.confirmation?.sourceSha !== report.frozenSoftwareSha)
		failures.push("fresh confirmation is not bound to frozenSoftwareSha");
	if (
		typeof report.confirmation?.reviewerId !== "string" ||
		report.confirmation.reviewerId.length === 0
	)
		failures.push("fresh confirmation is missing reviewerId");
	else if (reviewerIds.has(report.confirmation.reviewerId))
		failures.push("fresh confirmation reviewer is not independent");
	return {
		ok: failures.length === 0,
		failures,
		frozenSoftwareSha: report.frozenSoftwareSha ?? null,
	};
}

export function isAllowedPostFreezePath(path) {
	if (POST_FREEZE_ROOT_FILES.has(path)) return true;
	if (path === "docs/INDEX.md" || path === "docs/generated/REPO_INVENTORY.md")
		return true;
	return (
		/^docs\/exec-plans\/(active|evidence)\/.*\.(json|md)$/u.test(path) ||
		/^docs\/reviews\/.*\.(json|md)$/u.test(path)
	);
}

export function validatePostFreezeDelta({ ancestor, paths }) {
	const failures = [];
	if (!ancestor)
		failures.push("frozen software SHA is not an ancestor of HEAD");
	const disallowed = paths.filter((path) => !isAllowedPostFreezePath(path));
	if (disallowed.length > 0)
		failures.push(
			`post-freeze delta contains software or unapproved files: ${disallowed.join(", ")}`,
		);
	return { ok: failures.length === 0, failures, paths };
}

export function evaluateV1Readiness({
	rows,
	mode,
	deepEvidence = null,
	reviewEvidence = null,
	head,
	postFreeze = { ancestor: false, paths: [] },
}) {
	if (mode !== "draft" && mode !== "ready")
		throw new Error("mode must be draft or ready");
	const incomplete = rows.filter((row) => row.state !== "VERIFIED");
	const counts = Object.fromEntries(
		[...ALLOWED_STATES].map((state) => [
			state,
			rows.filter((row) => row.state === state).length,
		]),
	);
	if (mode === "draft") {
		return {
			schemaVersion: "eonfolk-v1-readiness-v2",
			status: "V1 INCOMPLETE",
			mode,
			head,
			requiredRows: rows.length,
			stateCounts: counts,
			incomplete: incomplete.map((row) => row.requirement),
			releaseEvidence: { status: "NOT_REQUIRED_FOR_DRAFT", eligible: false },
			claimBoundary:
				"Draft CI may pass while work remains, but it makes no V1 readiness claim.",
		};
	}

	const reviewResult = validateReviewConfirmationEvidence(reviewEvidence);
	const frozenSoftwareSha = reviewResult.frozenSoftwareSha;
	const deepResult = SHA_PATTERN.test(frozenSoftwareSha ?? "")
		? validateTargetMacDeepEvidence(deepEvidence, frozenSoftwareSha)
		: {
				ok: false,
				failures: ["review evidence has no valid frozenSoftwareSha"],
			};
	const deltaResult = validatePostFreezeDelta(postFreeze);
	const evidenceFailures = [
		...reviewResult.failures,
		...deepResult.failures,
		...deltaResult.failures,
	];
	const ready = incomplete.length === 0 && evidenceFailures.length === 0;
	return {
		schemaVersion: "eonfolk-v1-readiness-v2",
		status: ready ? "V1 READY" : "V1 INCOMPLETE",
		mode,
		head,
		frozenSoftwareSha,
		requiredRows: rows.length,
		stateCounts: counts,
		incomplete: incomplete.map((row) => row.requirement),
		releaseEvidence: {
			status: ready ? "VALID" : "INVALID",
			eligible: ready,
			failures: evidenceFailures,
			postFreezePaths: deltaResult.paths,
		},
		claimBoundary: ready
			? "Every required GOAL row is VERIFIED; six frozen-SHA reviews, P0/P1 reconciliation, fresh confirmation, and clean target-Mac DEEP evidence bind the frozen software candidate; HEAD differs only by approved evidence and handoff documentation."
			: "A non-draft PR is blocked until every required GOAL row and every frozen-candidate release proof is valid.",
	};
}

function argument(name) {
	const index = process.argv.indexOf(name);
	return index < 0 ? null : (process.argv[index + 1] ?? null);
}

function readJson(path) {
	return path === null ? null : JSON.parse(readFileSync(resolve(path), "utf8"));
}

function inspectPostFreeze(frozenSoftwareSha, head) {
	if (!SHA_PATTERN.test(frozenSoftwareSha ?? ""))
		return { ancestor: false, paths: [] };
	const ancestor =
		spawnSync("git", ["merge-base", "--is-ancestor", frozenSoftwareSha, head], {
			stdio: "ignore",
		}).status === 0;
	if (!ancestor) return { ancestor: false, paths: [] };
	const output = execFileSync(
		"git",
		["diff", "--name-only", `${frozenSoftwareSha}..${head}`],
		{ encoding: "utf8" },
	).trim();
	return {
		ancestor: true,
		paths: output.length === 0 ? [] : output.split("\n"),
	};
}

function main() {
	const mode = argument("--mode");
	if (mode !== "draft" && mode !== "ready")
		throw new Error(
			"usage: check-v1-readiness.mjs --mode draft|ready [--deep-evidence path --review-evidence path --head sha]",
		);
	const goalPath = resolve(argument("--goal") ?? "GOAL.md");
	const head =
		argument("--head") ??
		execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const rows = parseRequiredStateRows(readFileSync(goalPath, "utf8"));
	const deepEvidence =
		mode === "ready" ? readJson(argument("--deep-evidence")) : null;
	const reviewEvidence =
		mode === "ready" ? readJson(argument("--review-evidence")) : null;
	const postFreeze =
		mode === "ready"
			? inspectPostFreeze(reviewEvidence?.frozenSoftwareSha, head)
			: { ancestor: false, paths: [] };
	const result = evaluateV1Readiness({
		rows,
		mode,
		deepEvidence,
		reviewEvidence,
		head,
		postFreeze,
	});
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	if (mode === "ready" && result.status !== "V1 READY") process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
