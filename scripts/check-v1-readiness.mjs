import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	artifactPathsForTier,
	DEEP_BENCHMARK_CONTRACT,
	validateDeepBenchmarkReport,
	verificationContractSha256,
	verificationStepsForTier,
} from "./run-verification-tier.mjs";

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
const REVIEW_ID_BY_DISCIPLINE = Object.freeze({
	"product-game": "V1-RV-PRODUCT",
	"systems-correctness": "V1-RV-SYSTEMS",
	"visual-accessibility": "V1-RV-VISUAL",
	"cognition-eval": "V1-RV-COGNITION",
	"persistence-reliability": "V1-RV-PERSISTENCE",
	"ci-security": "V1-RV-CI",
});
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
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
		rows.push({
			id: `goal-${sha256(requirement).slice(0, 16)}`,
			requirement,
			state,
		});
	}
	if (rows.length === 0) throw new Error("GOAL has no required-state rows");
	return rows;
}

export function goalRosterSha256(rows) {
	return sha256(
		JSON.stringify(rows.map(({ id, requirement }) => ({ id, requirement }))),
	);
}

function immutableGoalStructureSha256(source) {
	const normalized = source.split(/\r?\n/u).map((line) => {
		if (!line.startsWith("|")) return line;
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
		if (cells.length === 2 && ALLOWED_STATES.has(cells[1]))
			return `| ${cells[0]} | <STATE> |`;
		if (cells.length === 3 && ALLOWED_STATES.has(cells[1]))
			return `| ${cells[0]} | <STATE> | <EVIDENCE> |`;
		return line;
	});
	return sha256(normalized.join("\n"));
}

export function validateCanonicalGoalRoster(
	rows,
	canonicalRows,
	{ source = null, canonicalSource = null } = {},
) {
	const failures = [];
	if (goalRosterSha256(rows) !== goalRosterSha256(canonicalRows))
		failures.push("GOAL requirement ID roster differs from the canonical base");
	if (
		typeof source === "string" &&
		typeof canonicalSource === "string" &&
		immutableGoalStructureSha256(source) !==
			immutableGoalStructureSha256(canonicalSource)
	)
		failures.push("GOAL changed outside state and evidence cells");
	return {
		failures,
		ok: failures.length === 0,
		rosterSha256: goalRosterSha256(rows),
	};
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function verifySelfHash(report, failures) {
	const { outputSha256, ...withoutHash } = report;
	if (outputSha256 !== sha256(JSON.stringify(withoutHash)))
		failures.push("evidence output hash does not match");
}

function attestablePayloadSha256(report) {
	const { outputSha256: _output, ...payload } = report;
	return sha256(JSON.stringify(payload));
}

function validateTrustedRun(expected, label, failures, context) {
	const trusted = context?.trustedRuns?.get(expected.purpose);
	if (
		trusted?.provider !== "github-actions-live-api" ||
		trusted?.sourceSha !== expected.sourceSha ||
		trusted?.initialReviewSha !== expected.initialReviewSha ||
		trusted?.frozenCandidateSha !== expected.frozenCandidateSha ||
		trusted?.evidenceSha !== expected.evidenceSha ||
		trusted?.control?.sha !== expected.frozenCandidateSha ||
		trusted?.attestationClass !== expected.attestationClass ||
		trusted?.purpose !== expected.purpose ||
		trusted?.payloadSha256 !== expected.payloadSha256 ||
		trusted?.reviewerAgentId !== (expected.reviewerAgentId ?? null) ||
		trusted?.reviewerSessionId !== (expected.reviewerSessionId ?? null) ||
		trusted?.conclusion !== "success" ||
		trusted?.event !== "workflow_dispatch" ||
		trusted?.workflowPath !== ".github/workflows/ci.yml" ||
		!SHA_PATTERN.test(trusted?.workflowSourceSha ?? "") ||
		typeof trusted?.actor !== "string" ||
		trusted.actor.length === 0 ||
		typeof trusted?.repository !== "string" ||
		(typeof context?.repository === "string" &&
			trusted.repository !== context.repository) ||
		!Number.isSafeInteger(trusted?.runId) ||
		trusted.runId <= 0 ||
		!Number.isSafeInteger(trusted?.runAttempt) ||
		trusted.runAttempt <= 0
	)
		failures.push(
			`${label} is not bound to the required live GitHub control/blob attestation`,
		);
}

function isFiniteMeasurements(value) {
	if (typeof value === "number") return Number.isFinite(value) && value >= 0;
	if (typeof value === "string") return value.length > 0;
	if (Array.isArray(value))
		return value.length > 0 && value.every(isFiniteMeasurements);
	if (value !== null && typeof value === "object") {
		const entries = Object.values(value);
		return entries.length > 0 && entries.every(isFiniteMeasurements);
	}
	return false;
}

function validateArtifactManifest(report, failures, context) {
	const files = Array.isArray(report.artifacts?.files)
		? report.artifacts.files
		: [];
	if (files.length === 0) failures.push("DEEP artifact manifest is empty");
	const paths = new Set();
	const evidencePaths = new Set();
	for (const file of files) {
		if (
			typeof file?.path !== "string" ||
			file.path.length === 0 ||
			paths.has(file.path)
		)
			failures.push("DEEP artifact paths are missing or duplicated");
		else paths.add(file.path);
		if (!Number.isSafeInteger(file?.bytes) || file.bytes <= 0)
			failures.push(`DEEP artifact ${String(file?.path)} has invalid bytes`);
		if (!HASH_PATTERN.test(file?.sha256 ?? ""))
			failures.push(`DEEP artifact ${String(file?.path)} has invalid SHA-256`);
		const expectedEvidencePath = `docs/exec-plans/evidence/003/release/deep-artifacts/${String(file?.path)}`;
		if (
			file?.evidencePath !== expectedEvidencePath ||
			evidencePaths.has(file?.evidencePath)
		)
			failures.push(
				`DEEP artifact ${String(file?.path)} evidence path is not unique and canonical`,
			);
		evidencePaths.add(file?.evidencePath);
		validateArtifactReference(
			{ bytes: file?.bytes, path: file?.evidencePath, sha256: file?.sha256 },
			`DEEP artifact ${String(file?.path)}`,
			failures,
			context,
			context.evidenceSha,
		);
	}
	const sorted = [...files].sort((left, right) =>
		left.path.localeCompare(right.path),
	);
	if (JSON.stringify(files) !== JSON.stringify(sorted))
		failures.push("DEEP artifact manifest is not canonically ordered");
	if (report.artifacts?.manifestSha256 !== sha256(JSON.stringify(files)))
		failures.push("DEEP artifact manifest hash does not match");
	for (const path of artifactPathsForTier("deep")) {
		const present =
			path === "apps/web/dist"
				? files.some((file) => file.path.startsWith("apps/web/dist/"))
				: paths.has(path);
		if (!present) failures.push(`required DEEP artifact is missing: ${path}`);
	}
	return new Map(files.map((file) => [file.path, file]));
}

function validateDeepConstituents(report, failures) {
	const expected = verificationStepsForTier("deep");
	const actual = Array.isArray(report.subcommands) ? report.subcommands : [];
	if (actual.length !== expected.length)
		failures.push("DEEP constituent count does not match the exact roster");
	for (const [index, expectedStep] of expected.entries()) {
		const actualStep = actual[index];
		const expectedCommand = [
			expectedStep.command,
			...expectedStep.arguments,
		].join(" ");
		if (actualStep?.id !== expectedStep.id)
			failures.push(`DEEP step ${index + 1} is not ${expectedStep.id}`);
		if (actualStep?.command !== expectedCommand)
			failures.push(`DEEP step ${expectedStep.id} command does not match`);
		if (actualStep?.status !== "PASS" || actualStep?.exitCode !== 0)
			failures.push(`DEEP step ${expectedStep.id} did not PASS with exit 0`);
		if (!Number.isFinite(actualStep?.durationMs) || actualStep.durationMs < 0)
			failures.push(`DEEP step ${expectedStep.id} has invalid duration`);
	}
}

function validateDeepBenchmarks(report, artifacts, failures, context) {
	const actual = Array.isArray(report.benchmarkEvidence)
		? report.benchmarkEvidence
		: [];
	if (actual.length !== DEEP_BENCHMARK_CONTRACT.length)
		failures.push("DEEP benchmark evidence count does not match the contract");
	for (const [index, contract] of DEEP_BENCHMARK_CONTRACT.entries()) {
		const benchmark = actual[index];
		if (
			benchmark?.id !== contract.id ||
			benchmark?.path !== contract.path ||
			benchmark?.schemaVersion !== contract.schemaVersion
		)
			failures.push(`DEEP benchmark ${index + 1} identity does not match`);
		if (benchmark?.status !== "PASS")
			failures.push(`DEEP benchmark ${contract.id} is not PASS`);
		if (
			!HASH_PATTERN.test(benchmark?.artifactSha256 ?? "") ||
			artifacts.get(contract.path)?.sha256 !== benchmark?.artifactSha256
		)
			failures.push(
				`DEEP benchmark ${contract.id} artifact hash does not match`,
			);
		const evidencePath = artifacts.get(contract.path)?.evidencePath;
		if (
			typeof evidencePath === "string" &&
			typeof context?.readArtifact === "function"
		) {
			try {
				const raw = JSON.parse(
					Buffer.from(
						context.readArtifact(context.evidenceSha, evidencePath),
					).toString("utf8"),
				);
				const derived = validateDeepBenchmarkReport(
					contract,
					raw,
					report.source?.start?.commit,
				);
				if (JSON.stringify(derived) !== JSON.stringify(benchmark?.measurements))
					failures.push(
						`DEEP benchmark ${contract.id} measurements were not derived from the raw artifact`,
					);
			} catch {
				failures.push(
					`DEEP benchmark ${contract.id} raw artifact or gates are invalid`,
				);
			}
		}
		if (!isFiniteMeasurements(benchmark?.measurements))
			failures.push(`DEEP benchmark ${contract.id} measurements are invalid`);
		else
			validateCanonicalMeasurements(
				contract.id,
				benchmark.measurements,
				failures,
			);
	}
}

function finiteNonnegative(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function exactNamedMeasurements(measurements, names, numericFields) {
	return (
		Array.isArray(measurements) &&
		measurements.length === names.length &&
		measurements.every(
			(entry, index) =>
				entry?.[numericFields.name] === names[index] &&
				numericFields.values.every((field) =>
					finiteNonnegative(entry?.[field]),
				),
		)
	);
}

function validateCanonicalMeasurements(id, measurements, failures) {
	let valid = false;
	switch (id) {
		case "persistence-bounded":
			valid = [
				"indexedDbAppendMedianMs",
				"indexedDbRecoveryMedianMs",
				"memoryAppendMedianMs",
				"memoryRecoveryMedianMs",
			].every((field) => finiteNonnegative(measurements?.[field]));
			break;
		case "diagnostics-source":
			valid = exactNamedMeasurements(measurements, ["off", "local", "alpha"], {
				name: "mode",
				values: ["recordCallP95Ms"],
			});
			break;
		case "diagnostics-browser":
			valid = exactNamedMeasurements(measurements, ["off", "local", "alpha"], {
				name: "mode",
				values: ["journeyMs", "maximumFrameP95Ms"],
			});
			break;
		case "release-genesis-web-performance": {
			valid = exactNamedMeasurements(
				measurements,
				["desktop", "laptop", "mobile-emulation"],
				{
					name: "profile",
					values: ["maximumMeaningfulWorldMs", "pooledFrameP95Ms"],
				},
			);
			if (valid)
				valid = measurements.every((entry) => {
					const mobile = entry.profile === "mobile-emulation";
					return (
						entry.maximumMeaningfulWorldMs <= (mobile ? 5_000 : 3_000) &&
						entry.pooledFrameP95Ms <= (mobile ? 33.3 : 16.7)
					);
				});
			break;
		}
		case "local-model-treatment":
			valid =
				measurements?.executions === 100 &&
				Number.isSafeInteger(measurements?.fallbacks) &&
				measurements.fallbacks >= 0 &&
				measurements.fallbacks <= 5 &&
				finiteNonnegative(measurements?.warmP95Ms) &&
				measurements.warmP95Ms <= 4_000;
			break;
	}
	if (!valid)
		failures.push(`DEEP benchmark ${id} canonical measurements do not match`);
}

export function validateExactHeadEvidence(
	report,
	expectedHead,
	{ requiredTier = null } = {},
) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["evidence is not an object"] };
	if (report.schemaVersion !== "eonfolk-verification-tier-v3")
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
		if (
			source?.trackedTree?.checkout !== "detached-full" ||
			!HASH_PATTERN.test(source?.trackedTree?.manifestSha256 ?? "") ||
			!Number.isSafeInteger(source?.trackedTree?.fileCount) ||
			source.trackedTree.fileCount < 1
		)
			failures.push(
				`source.${endpoint}.trackedTree is not a verified detached full checkout`,
			);
	}
	if (
		report.source?.start?.trackedTree?.manifestSha256 !==
		report.source?.end?.trackedTree?.manifestSha256
	)
		failures.push("tracked source bytes or modes changed during verification");
	if (report.source?.unchanged !== true)
		failures.push("source.unchanged is not true");
	if (report.source?.acceptanceEligible !== true)
		failures.push("source.acceptanceEligible is not true");
	return { ok: failures.length === 0, failures };
}

export function validateTargetMacDeepEvidence(
	report,
	frozenSoftwareSha,
	context = {},
) {
	const result = validateExactHeadEvidence(report, frozenSoftwareSha, {
		requiredTier: "deep",
	});
	const failures = [...result.failures];
	if (
		!exactKeys(report, [
			"artifactAssertions",
			"artifacts",
			"benchmarkEvidence",
			"claimBoundary",
			"environment",
			"inputs",
			"integrityClaim",
			"outputSha256",
			"recordedAt",
			"schemaVersion",
			"source",
			"status",
			"subcommands",
			"tier",
			"verificationContractSha256",
		])
	)
		failures.push("DEEP evidence does not match the exact v3 envelope");
	if (typeof report?.environment?.host !== "string") {
		failures.push("DEEP environment host is missing");
	} else {
		if (!report.environment.host.startsWith("darwin "))
			failures.push("DEEP environment is not macOS");
		if (!report.environment.host.endsWith(" arm64"))
			failures.push("DEEP environment is not Apple arm64");
	}
	if (report?.verificationContractSha256 !== verificationContractSha256("deep"))
		failures.push("DEEP verification contract hash does not match");
	if (report?.integrityClaim !== "REPOSITORY_COMPUTABLE_INTEGRITY_ONLY")
		failures.push("DEEP evidence integrity boundary is missing or overstated");
	if (report !== null && typeof report === "object")
		validateTrustedRun(
			{
				attestationClass: context.attestationClass,
				evidenceSha: context.evidenceSha,
				frozenCandidateSha: frozenSoftwareSha,
				initialReviewSha: context.initialReviewSha,
				payloadSha256: attestablePayloadSha256(report),
				purpose: "target-mac-deep",
				sourceSha: frozenSoftwareSha,
			},
			"DEEP evidence",
			failures,
			context,
		);
	validateDeepConstituents(report ?? {}, failures);
	const artifacts = validateArtifactManifest(report ?? {}, failures, context);
	if (
		report?.artifactAssertions?.productionDistPresent !== true ||
		report?.artifactAssertions?.crashInjectionMarkersAbsent !== true ||
		!Number.isSafeInteger(report?.artifactAssertions?.filesInspected) ||
		report.artifactAssertions.filesInspected < 1
	)
		failures.push("DEEP production artifact assertions are incomplete");
	validateDeepBenchmarks(report ?? {}, artifacts, failures, context);
	return { ok: failures.length === 0, failures };
}

function validateEvidencePath(path) {
	return (
		typeof path === "string" &&
		!isAbsolute(path) &&
		!path.includes("\\") &&
		!path.split("/").includes("..") &&
		(path.startsWith("docs/exec-plans/evidence/003/release/deep-artifacts/") ||
			((path.startsWith("docs/reviews/") ||
				path.startsWith("docs/exec-plans/evidence/003/release/")) &&
				/\.(json|md|txt)$/u.test(path)))
	);
}

function validateArtifactReference(
	reference,
	label,
	failures,
	context,
	evidenceSha,
) {
	if (!validateEvidencePath(reference?.path)) {
		failures.push(`${label} artifact path is invalid`);
		return null;
	}
	if (!HASH_PATTERN.test(reference?.sha256 ?? ""))
		failures.push(`${label} artifact SHA-256 is invalid`);
	if (!Number.isSafeInteger(reference?.bytes) || reference.bytes <= 0)
		failures.push(`${label} artifact byte count is invalid`);
	if (typeof context?.readArtifact !== "function") {
		failures.push(`${label} artifact existence was not verified`);
		return null;
	}
	try {
		const bytes = context.readArtifact(evidenceSha, reference.path);
		if (!(bytes instanceof Uint8Array))
			throw new Error("artifact reader did not return bytes");
		if (bytes.byteLength !== reference.bytes)
			failures.push(`${label} artifact byte count does not match`);
		if (sha256(bytes) !== reference.sha256)
			failures.push(`${label} artifact hash does not match`);
		return Buffer.from(bytes).toString("utf8");
	} catch {
		failures.push(`${label} artifact is missing or unreadable`);
		return null;
	}
}

function parseJsonArtifact(contents, label, failures) {
	if (contents === null) return null;
	try {
		const parsed = JSON.parse(contents);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
			throw new Error("not object");
		return parsed;
	} catch {
		failures.push(`${label} artifact is not structured JSON`);
		return null;
	}
}

function exactKeys(value, keys) {
	return (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		JSON.stringify(Object.keys(value).sort()) ===
			JSON.stringify([...keys].sort())
	);
}

function validTimestamp(value) {
	return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function validateReviewConfirmationEvidence(report, context = {}) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["review evidence is not an object"] };
	if (report.schemaVersion !== "eonfolk-v1-review-confirmation-v5")
		failures.push("unsupported review evidence schema");
	if (
		!exactKeys(report, [
			"confirmation",
			"evidenceSha",
			"frozenCandidateSha",
			"initialReviewSha",
			"integrityClaim",
			"outputSha256",
			"reconciliation",
			"reviews",
			"schemaVersion",
			"status",
		])
	)
		failures.push("review evidence does not match the exact v5 envelope");
	if (report.status !== "PASS") failures.push("review evidence is not PASS");
	if (
		report.integrityClaim !==
		"REPOSITORY_COMPUTABLE_PLUS_LIVE_GITHUB_RECEIPTS; REVIEWER_AGENT_IDENTITY_SELF_REPORTED"
	)
		failures.push(
			"review evidence integrity boundary is missing or overstated",
		);
	verifySelfHash(report, failures);
	for (const field of ["initialReviewSha", "frozenCandidateSha", "evidenceSha"])
		if (!SHA_PATTERN.test(report[field] ?? ""))
			failures.push(`${field} is not a full Git SHA`);
	if (
		new Set([
			report.initialReviewSha,
			report.frozenCandidateSha,
			report.evidenceSha,
		]).size !== 3
	)
		failures.push(
			"initialReviewSha, frozenCandidateSha, and evidenceSha must be pairwise distinct",
		);
	if (typeof context?.isAncestor !== "function")
		failures.push("review ancestry was not verified");
	else if (
		!context.isAncestor(report.initialReviewSha, report.frozenCandidateSha) ||
		!context.isAncestor(report.frozenCandidateSha, report.evidenceSha)
	)
		failures.push(
			"initialReviewSha -> frozenCandidateSha -> evidenceSha ancestry is invalid",
		);

	const reviews = Array.isArray(report.reviews) ? report.reviews : [];
	if (reviews.length !== REQUIRED_REVIEW_DISCIPLINES.size)
		failures.push("review evidence must contain exactly six reviews");
	const reviewIds = new Set();
	const disciplines = new Set();
	const artifactPaths = new Set();
	const artifactHashes = new Set();
	const reviewerAgentIds = new Set();
	const reviewerSessionIds = new Set();
	const allFindings = [];
	const reviewTimes = [];
	for (const review of reviews) {
		const label = `review ${String(review?.reviewId)}`;
		if (
			!exactKeys(review, [
				"artifact",
				"discipline",
				"findings",
				"reviewerAgentId",
				"reviewerSessionId",
				"reviewId",
				"sourceSha",
				"status",
			])
		)
			failures.push(`${label} declaration has unknown or missing fields`);
		if (review?.reviewId !== REVIEW_ID_BY_DISCIPLINE[review?.discipline])
			failures.push("review is missing exact discipline reviewId");
		else reviewIds.add(review.reviewId);
		if (!REQUIRED_REVIEW_DISCIPLINES.has(review?.discipline))
			failures.push(`unknown review discipline ${String(review?.discipline)}`);
		else disciplines.add(review.discipline);
		if (review?.sourceSha !== report.initialReviewSha)
			failures.push("review is not bound to initialReviewSha");
		if (review?.status !== "COMPLETE")
			failures.push("review status is not COMPLETE");
		if (
			artifactPaths.has(review?.artifact?.path) ||
			artifactHashes.has(review?.artifact?.sha256)
		)
			failures.push("review artifacts are duplicated");
		artifactPaths.add(review?.artifact?.path);
		artifactHashes.add(review?.artifact?.sha256);
		if (
			typeof review?.reviewerAgentId !== "string" ||
			review.reviewerAgentId.length < 3 ||
			reviewerAgentIds.has(review.reviewerAgentId)
		)
			failures.push("reviewer agent identities are missing or duplicated");
		else reviewerAgentIds.add(review.reviewerAgentId);
		if (
			typeof review?.reviewerSessionId !== "string" ||
			review.reviewerSessionId.length < 3 ||
			reviewerSessionIds.has(review.reviewerSessionId)
		)
			failures.push("reviewer sessions are missing or duplicated");
		else reviewerSessionIds.add(review.reviewerSessionId);
		const contents = validateArtifactReference(
			review?.artifact,
			label,
			failures,
			context,
			report.evidenceSha,
		);
		const artifact = parseJsonArtifact(contents, label, failures);
		const p0 = Array.isArray(review?.findings?.p0) ? review.findings.p0 : [];
		const p1 = Array.isArray(review?.findings?.p1) ? review.findings.p1 : [];
		const findings = [...p0, ...p1];
		if (
			!Array.isArray(review?.findings?.p0) ||
			!Array.isArray(review?.findings?.p1)
		)
			failures.push("review P0/P1 finding lists are missing");
		for (const [severity, entries] of [
			["P0", p0],
			["P1", p1],
		])
			for (const finding of entries) {
				if (
					!exactKeys(finding, ["id", "narrative", "title"]) ||
					!new RegExp(`^${review?.reviewId}-${severity}-\\d{3}$`, "u").test(
						finding?.id ?? "",
					) ||
					typeof finding?.title !== "string" ||
					finding.title.trim().length < 8 ||
					typeof finding?.narrative !== "string" ||
					finding.narrative.trim().length < 24 ||
					allFindings.some((entry) => entry.id === finding?.id)
				)
					failures.push(`review finding is invalid: ${String(finding?.id)}`);
				else allFindings.push({ ...finding, severity });
			}
		const expectedConclusion = findings.length === 0 ? "NO_P0_P1" : "FINDINGS";
		if (
			!exactKeys(artifact, [
				"completedAt",
				"conclusion",
				"discipline",
				"findings",
				"reviewerAgentId",
				"reviewerSessionId",
				"reviewId",
				"schemaVersion",
				"sourceSha",
			]) ||
			artifact?.schemaVersion !== "eonfolk-v1-structured-review-v3" ||
			artifact?.reviewId !== review?.reviewId ||
			artifact?.reviewerAgentId !== review?.reviewerAgentId ||
			artifact?.reviewerSessionId !== review?.reviewerSessionId ||
			artifact?.discipline !== review?.discipline ||
			artifact?.sourceSha !== report.initialReviewSha ||
			artifact?.conclusion !== expectedConclusion ||
			JSON.stringify(artifact?.findings) !== JSON.stringify(review?.findings) ||
			!validTimestamp(artifact?.completedAt)
		)
			failures.push(
				`${label} structured content does not match its declaration`,
			);
		else reviewTimes.push(Date.parse(artifact.completedAt));
		validateTrustedRun(
			{
				attestationClass: context.attestationClass,
				evidenceSha: report.evidenceSha,
				frozenCandidateSha: report.frozenCandidateSha,
				initialReviewSha: report.initialReviewSha,
				payloadSha256: review?.artifact?.sha256,
				purpose: `review:${review?.reviewId}`,
				reviewerAgentId: review?.reviewerAgentId,
				reviewerSessionId: review?.reviewerSessionId,
				sourceSha: report.initialReviewSha,
			},
			label,
			failures,
			context,
		);
	}
	if (reviewIds.size !== reviews.length)
		failures.push("review IDs are not unique");
	if (disciplines.size !== REQUIRED_REVIEW_DISCIPLINES.size)
		failures.push("required review disciplines are incomplete");
	if (
		reviewerAgentIds.size !== REQUIRED_REVIEW_DISCIPLINES.size ||
		reviewerSessionIds.size !== REQUIRED_REVIEW_DISCIPLINES.size
	)
		failures.push(
			"six independent reviewer agent/session identities are required",
		);

	const dispositions = Array.isArray(report.reconciliation?.dispositions)
		? report.reconciliation.dispositions
		: [];
	const findingIds = allFindings.map(({ id }) => id);
	if (dispositions.length !== findingIds.length)
		failures.push("P0/P1 dispositions do not exactly cover review findings");
	const dispositionIds = new Set();
	for (const disposition of dispositions) {
		if (
			!exactKeys(disposition, [
				"affectedScope",
				"disposition",
				"evidenceRefs",
				"findingId",
				"rationale",
				"remediationOrFalsification",
				"status",
				"validatingEvidence",
			]) ||
			!findingIds.includes(disposition?.findingId) ||
			dispositionIds.has(disposition?.findingId)
		)
			failures.push("finding disposition is unknown, duplicated, or malformed");
		dispositionIds.add(disposition?.findingId);
		if (
			!["ACCEPT", "PARTIALLY_ACCEPT", "REJECT"].includes(
				disposition?.disposition,
			) ||
			disposition?.status !== "CLOSED"
		)
			failures.push("finding disposition is not a valid CLOSED decision");
		for (const field of [
			"affectedScope",
			"rationale",
			"remediationOrFalsification",
			"validatingEvidence",
		])
			if (
				typeof disposition?.[field] !== "string" ||
				disposition[field].trim().length < 16
			)
				failures.push(`finding disposition ${field} is not substantive`);
		if (
			!Array.isArray(disposition?.evidenceRefs) ||
			disposition.evidenceRefs.length === 0
		)
			failures.push("P0/P1 disposition has no evidence references");
		for (const reference of disposition?.evidenceRefs ?? []) {
			if (
				reference?.kind === "git-commit" &&
				exactKeys(reference, ["kind", "sha"])
			) {
				if (
					!SHA_PATTERN.test(reference.sha) ||
					!context?.commitExists?.(reference.sha) ||
					!context?.isAncestor?.(reference.sha, report.frozenCandidateSha)
				)
					failures.push(
						"disposition Git evidence is not in the frozen history",
					);
			} else if (
				reference?.kind === "artifact" &&
				exactKeys(reference, ["artifact", "kind"])
			)
				validateArtifactReference(
					reference.artifact,
					"disposition evidence",
					failures,
					context,
					report.evidenceSha,
				);
			else failures.push("disposition evidence reference is malformed");
		}
	}
	if (dispositionIds.size !== findingIds.length)
		failures.push("P0/P1 dispositions are incomplete");
	if (
		!exactKeys(report.reconciliation, [
			"artifact",
			"completedAt",
			"dispositions",
			"finalDiff",
			"finalSoftwareSha",
			"sourceSha",
			"unrepairedP0",
			"unrepairedP1",
		]) ||
		report.reconciliation?.unrepairedP0 !== 0 ||
		report.reconciliation?.unrepairedP1 !== 0
	)
		failures.push("review evidence has unrepaired P0/P1 findings");
	if (
		report.reconciliation?.sourceSha !== report.initialReviewSha ||
		report.reconciliation?.finalSoftwareSha !== report.frozenCandidateSha
	)
		failures.push("reconciliation SHA binding is invalid");
	const reconciliationContents = validateArtifactReference(
		report.reconciliation?.artifact,
		"reconciliation",
		failures,
		context,
		report.evidenceSha,
	);
	const reconciliationArtifact = parseJsonArtifact(
		reconciliationContents,
		"reconciliation",
		failures,
	);
	if (
		!exactKeys(reconciliationArtifact, [
			"completedAt",
			"dispositions",
			"frozenCandidateSha",
			"initialReviewSha",
			"schemaVersion",
		]) ||
		reconciliationArtifact?.schemaVersion !== "eonfolk-v1-reconciliation-v2" ||
		!validTimestamp(report.reconciliation?.completedAt) ||
		JSON.stringify(reconciliationArtifact?.dispositions) !==
			JSON.stringify(dispositions) ||
		reconciliationArtifact?.initialReviewSha !== report.initialReviewSha ||
		reconciliationArtifact?.frozenCandidateSha !== report.frozenCandidateSha
	)
		failures.push("structured reconciliation does not match its declaration");

	const finalDiff = report.reconciliation?.finalDiff;
	if (!exactKeys(finalDiff, ["artifact", "binding"]))
		failures.push("final diff declaration has unknown or missing fields");
	let computedDiff = null;
	try {
		computedDiff = {
			baseSha: report.initialReviewSha,
			baseTreeSha: context.treeSha(report.initialReviewSha),
			diffSha256: context.fullDiffSha256(
				report.initialReviewSha,
				report.frozenCandidateSha,
			),
			headSha: report.frozenCandidateSha,
			headTreeSha: context.treeSha(report.frozenCandidateSha),
		};
	} catch {
		failures.push("full final diff could not be independently inspected");
	}
	if (JSON.stringify(finalDiff?.binding) !== JSON.stringify(computedDiff))
		failures.push("final diff tree/content binding does not match Git");
	const finalDiffContents = validateArtifactReference(
		finalDiff?.artifact,
		"final diff",
		failures,
		context,
		report.evidenceSha,
	);
	const finalDiffArtifact = parseJsonArtifact(
		finalDiffContents,
		"final diff",
		failures,
	);
	if (
		!exactKeys(finalDiffArtifact, ["binding", "schemaVersion"]) ||
		finalDiffArtifact?.schemaVersion !== "eonfolk-v1-final-diff-v1" ||
		JSON.stringify(finalDiffArtifact?.binding) !== JSON.stringify(computedDiff)
	)
		failures.push("structured final diff artifact does not match Git");

	const confirmationContents = validateArtifactReference(
		report.confirmation?.artifact,
		"fresh confirmation",
		failures,
		context,
		report.evidenceSha,
	);
	const confirmation = parseJsonArtifact(
		confirmationContents,
		"fresh confirmation",
		failures,
	);
	if (
		!exactKeys(report.confirmation, [
			"artifact",
			"reviewerAgentId",
			"reviewerSessionId",
		]) ||
		!exactKeys(confirmation, [
			"completedAt",
			"deepEvidenceOutputSha256",
			"finalDiffSha256",
			"reconciliationSha256",
			"reviewerAgentId",
			"reviewerSessionId",
			"schemaVersion",
			"sourceSha",
			"status",
		]) ||
		confirmation?.schemaVersion !== "eonfolk-v1-final-confirmation-v3" ||
		confirmation?.status !== "PASS" ||
		confirmation?.reviewerAgentId !== report.confirmation?.reviewerAgentId ||
		confirmation?.reviewerSessionId !==
			report.confirmation?.reviewerSessionId ||
		confirmation?.sourceSha !== report.frozenCandidateSha ||
		confirmation?.deepEvidenceOutputSha256 !==
			context.deepEvidenceOutputSha256 ||
		confirmation?.reconciliationSha256 !==
			report.reconciliation?.artifact?.sha256 ||
		confirmation?.finalDiffSha256 !== finalDiff?.artifact?.sha256 ||
		!validTimestamp(confirmation?.completedAt) ||
		Date.parse(confirmation?.completedAt) <=
			Math.max(
				0,
				...reviewTimes,
				Date.parse(report.reconciliation?.completedAt ?? ""),
			)
	)
		failures.push(
			"fresh confirmation structure, binding, or ordering is invalid",
		);
	if (
		reviewerAgentIds.has(report.confirmation?.reviewerAgentId) ||
		reviewerSessionIds.has(report.confirmation?.reviewerSessionId) ||
		typeof report.confirmation?.reviewerAgentId !== "string" ||
		report.confirmation.reviewerAgentId.length < 3 ||
		typeof report.confirmation?.reviewerSessionId !== "string" ||
		report.confirmation.reviewerSessionId.length < 3
	)
		failures.push(
			"fresh confirmation reviewer agent/session is not independent",
		);
	validateTrustedRun(
		{
			attestationClass: context.attestationClass,
			evidenceSha: report.evidenceSha,
			frozenCandidateSha: report.frozenCandidateSha,
			initialReviewSha: report.initialReviewSha,
			payloadSha256: report.confirmation?.artifact?.sha256,
			purpose: "final-confirmation",
			reviewerAgentId: report.confirmation?.reviewerAgentId,
			reviewerSessionId: report.confirmation?.reviewerSessionId,
			sourceSha: report.frozenCandidateSha,
		},
		"fresh confirmation",
		failures,
		context,
	);
	return {
		ok: failures.length === 0,
		failures,
		frozenSoftwareSha: report.frozenCandidateSha ?? null,
		evidenceSha: report.evidenceSha ?? null,
	};
}

export function isAllowedPostFreezePath(path) {
	if (POST_FREEZE_ROOT_FILES.has(path)) return true;
	if (path === "docs/INDEX.md" || path === "docs/generated/REPO_INVENTORY.md")
		return true;
	if (path.startsWith("docs/exec-plans/evidence/003/release/deep-artifacts/"))
		return true;
	return (
		/^docs\/exec-plans\/(active|evidence)\/.*\.(json|md|txt)$/u.test(path) ||
		/^docs\/reviews\/.*\.(json|md|txt)$/u.test(path)
	);
}

export function validatePostFreezeDelta({
	ancestor,
	ancestryRequired = true,
	paths,
	symlinkPaths = [],
	frozenSha = null,
	head = null,
}) {
	const failures = [];
	if (ancestryRequired && !ancestor)
		failures.push("frozen software SHA is not an ancestor of HEAD");
	const disallowed = paths.filter((path) => !isAllowedPostFreezePath(path));
	if (disallowed.length > 0)
		failures.push(
			`post-freeze delta contains software or unapproved files: ${disallowed.join(", ")}`,
		);
	if (symlinkPaths.length > 0)
		failures.push(
			`post-freeze evidence paths must not be symlinks: ${symlinkPaths.join(", ")}`,
		);
	return {
		ok: failures.length === 0,
		failures,
		paths,
		audit: {
			frozenSha,
			head,
			pathsSha256: sha256(JSON.stringify(paths)),
		},
	};
}

export function validateTestedIdentity(
	{ baseSha, candidateSha, testedKind, testedSha },
	context = {},
) {
	const failures = [];
	for (const [label, sha] of [
		["baseSha", baseSha],
		["candidateSha", candidateSha],
		["testedSha", testedSha],
	])
		if (!SHA_PATTERN.test(sha ?? ""))
			failures.push(`${label} is not a full Git SHA`);
	if (context.currentHead !== testedSha)
		failures.push("testedSha is not the checked-out verification HEAD");
	if (typeof context.isAncestor !== "function")
		failures.push("tested identity ancestry was not verified");
	else if (
		SHA_PATTERN.test(baseSha ?? "") &&
		SHA_PATTERN.test(candidateSha ?? "")
	) {
		if (!context.isAncestor(baseSha, testedSha))
			failures.push("baseSha is not an ancestor of testedSha");
		if (!context.isAncestor(candidateSha, testedSha))
			failures.push("candidateSha is not an ancestor of testedSha");
		if (!context.isAncestor(baseSha, candidateSha))
			failures.push("baseSha is not an ancestor of candidateSha");
	}
	if (testedKind === "pull-request-merge") {
		if (testedSha === candidateSha)
			failures.push(
				"pull-request merge-ref is indistinguishable from candidateSha",
			);
		if (typeof context.parents !== "function")
			failures.push("pull-request merge-ref parents were not inspected");
		else {
			try {
				const parents = context.parents(testedSha);
				if (
					parents.length !== 2 ||
					!parents.includes(baseSha) ||
					!parents.includes(candidateSha)
				)
					failures.push(
						"tested merge-ref parents are not exact base and candidate",
					);
			} catch {
				failures.push("tested merge-ref parents could not be inspected");
			}
		}
		if (typeof context.treeSha !== "function")
			failures.push("candidate and tested trees were not inspected");
		else
			try {
				if (context.treeSha(candidateSha) !== context.treeSha(testedSha))
					failures.push("tested merge-ref tree differs from candidate tree");
			} catch {
				failures.push("candidate and tested trees could not be inspected");
			}
	} else if (testedKind === "candidate" || testedKind === "main-push") {
		if (testedSha !== candidateSha)
			failures.push(
				"candidate verification did not test candidateSha directly",
			);
	} else
		failures.push(
			"testedKind is not pull-request-merge, candidate, or main-push",
		);
	return { ok: failures.length === 0, failures };
}

export function evaluateV1Readiness({
	rows,
	canonicalRows = rows,
	goalSource = null,
	canonicalGoalSource = null,
	mode,
	deepEvidence = null,
	reviewEvidence = null,
	reviewValidationContext = {},
	head,
	testedIdentity = null,
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
	const goalRosterResult = validateCanonicalGoalRoster(rows, canonicalRows, {
		canonicalSource: canonicalGoalSource,
		source: goalSource,
	});
	if (mode === "draft") {
		return {
			schemaVersion: "eonfolk-v1-readiness-v3",
			status: "V1 INCOMPLETE",
			mode,
			head,
			testedIdentity,
			requiredRows: rows.length,
			stateCounts: counts,
			goalRosterSha256: goalRosterResult.rosterSha256,
			incomplete: incomplete.map((row) => row.requirement),
			releaseEvidence: {
				status: goalRosterResult.ok ? "NOT_REQUIRED_FOR_DRAFT" : "INVALID",
				eligible: false,
				failures: goalRosterResult.failures,
			},
			claimBoundary:
				"Draft CI may pass while work remains, but it makes no V1 readiness claim.",
		};
	}

	const releaseContext = {
		...reviewValidationContext,
		attestationClass:
			testedIdentity?.testedKind === "main-push"
				? "POSTMERGE_PROTECTED_MAIN"
				: "PREMERGE_CANDIDATE_CONTROL",
		deepEvidenceOutputSha256: deepEvidence?.outputSha256,
		evidenceSha: reviewEvidence?.evidenceSha,
		initialReviewSha: reviewEvidence?.initialReviewSha,
	};
	const reviewResult = validateReviewConfirmationEvidence(
		reviewEvidence,
		releaseContext,
	);
	const frozenSoftwareSha = reviewResult.frozenSoftwareSha;
	const deepResult = SHA_PATTERN.test(frozenSoftwareSha ?? "")
		? validateTargetMacDeepEvidence(
				deepEvidence,
				frozenSoftwareSha,
				releaseContext,
			)
		: {
				ok: false,
				failures: ["review evidence has no valid frozenSoftwareSha"],
			};
	const deltaResult = validatePostFreezeDelta({
		...postFreeze,
		ancestryRequired: testedIdentity?.testedKind !== "main-push",
		frozenSha: frozenSoftwareSha,
		head,
	});
	const testedIdentityResult = validateTestedIdentity(
		testedIdentity ?? {},
		reviewValidationContext,
	);
	const evidenceFailures = [
		...goalRosterResult.failures,
		...reviewResult.failures,
		...deepResult.failures,
		...deltaResult.failures,
		...testedIdentityResult.failures,
	];
	const ready = incomplete.length === 0 && evidenceFailures.length === 0;
	return {
		schemaVersion: "eonfolk-v1-readiness-v3",
		status: ready ? "V1 READY" : "V1 INCOMPLETE",
		mode,
		head,
		testedIdentity,
		frozenSoftwareSha,
		requiredRows: rows.length,
		stateCounts: counts,
		goalRosterSha256: goalRosterResult.rosterSha256,
		incomplete: incomplete.map((row) => row.requirement),
		releaseEvidence: {
			status: ready ? "VALID" : "INVALID",
			eligible: ready,
			failures: evidenceFailures,
			postFreezePaths: deltaResult.paths,
			postFreezeAudit: deltaResult.audit,
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
	const output = execFileSync(
		"git",
		["diff", "--name-only", `${frozenSoftwareSha}..${head}`],
		{ encoding: "utf8" },
	).trim();
	const paths = output.length === 0 ? [] : output.split("\n");
	const symlinkPaths = paths.filter((path) =>
		execFileSync("git", ["ls-tree", head, "--", path], {
			encoding: "utf8",
		}).startsWith("120000 "),
	);
	return {
		ancestor,
		paths,
		symlinkPaths,
	};
}

function loadTrustedRuns(path) {
	if (path === null)
		throw new Error(
			"ready mode requires --trusted-attestations from live GitHub verification",
		);
	const root = realpathSync(resolve("."));
	const absolute = resolve(path);
	if (!isAbsolute(path) || lstatSync(absolute).isSymbolicLink())
		throw new Error(
			"trusted attestations must be a non-symlink absolute file outside the repository",
		);
	const real = realpathSync(absolute);
	const repositoryRelative = relative(root, real).split(sep).join("/");
	if (repositoryRelative !== ".." && !repositoryRelative.startsWith("../"))
		throw new Error(
			"trusted attestations must come from outside the repository checkout",
		);
	const registry = JSON.parse(readFileSync(real, "utf8"));
	if (
		!exactKeys(registry, [
			"outputSha256",
			"runs",
			"schemaVersion",
			"trustBoundary",
			"verifiedAt",
		]) ||
		registry?.schemaVersion !== "eonfolk-live-verified-github-runs-v2" ||
		registry?.trustBoundary !==
			"LIVE_GITHUB_AND_CONTROL_BLOB_VERIFICATION; MAC_RUNNER_ABSENCE_IS_PROCEDURAL; PREMERGE_CLASS_IS_CANDIDATE_CONTROLLED; REVIEWER_AGENT_IDENTITY_IS_SELF_REPORTED" ||
		!validTimestamp(registry?.verifiedAt) ||
		!Array.isArray(registry?.runs)
	)
		throw new Error("trusted GitHub run registry schema is invalid");
	const { outputSha256, ...unsigned } = registry;
	if (outputSha256 !== sha256(JSON.stringify(unsigned)))
		throw new Error("trusted GitHub run registry hash is invalid");
	const runs = new Map();
	for (const run of registry.runs) {
		if (
			!exactKeys(run, [
				"actor",
				"artifactArchiveSha256",
				"artifactId",
				"artifactName",
				"attestationClass",
				"control",
				"conclusion",
				"event",
				"evidenceSha",
				"frozenCandidateSha",
				"initialReviewSha",
				"macExternalProbe",
				"macLifecycle",
				"payloadSha256",
				"provider",
				"purpose",
				"repository",
				"reviewerAgentId",
				"reviewerSessionId",
				"runnerLabels",
				"runnerName",
				"runAttempt",
				"runId",
				"sourceSha",
				"workflowId",
				"workflowPath",
				"workflowSourceSha",
			]) ||
			!Number.isSafeInteger(run?.runId) ||
			run.runId <= 0 ||
			runs.has(run.purpose)
		)
			throw new Error("trusted GitHub run IDs are missing or duplicated");
		runs.set(run.purpose, run);
	}
	if (runs.size !== 8)
		throw new Error("trusted GitHub run registry must contain eight runs");
	return {
		attestationClass: registry.runs[0]?.attestationClass,
		evidenceSha: registry.runs[0]?.evidenceSha,
		frozenCandidateSha: registry.runs[0]?.frozenCandidateSha,
		initialReviewSha: registry.runs[0]?.initialReviewSha,
		runs,
	};
}

export function readRepositoryArtifact(rootPath, path) {
	if (!validateEvidencePath(path)) throw new Error("invalid evidence path");
	const root = realpathSync(resolve(rootPath));
	const absolute = resolve(root, path);
	const repositoryRelative = relative(root, absolute).split(sep).join("/");
	if (repositoryRelative !== path)
		throw new Error("evidence path escaped root");
	if (lstatSync(absolute).isSymbolicLink())
		throw new Error("evidence path must not be a symlink");
	const real = realpathSync(absolute);
	const realRelative = relative(root, real).split(sep).join("/");
	if (realRelative !== path) throw new Error("evidence realpath escaped root");
	return readFileSync(real);
}

function reviewValidationContext(trusted = { runs: new Map() }) {
	return {
		currentHead: execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim(),
		isAncestor: (ancestor, descendant) =>
			spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
				stdio: "ignore",
			}).status === 0,
		commitExists: (commit) =>
			spawnSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
				stdio: "ignore",
			}).status === 0,
		treeSha: (commit) =>
			execFileSync("git", ["rev-parse", `${commit}^{tree}`], {
				encoding: "utf8",
			}).trim(),
		fullDiffSha256: (base, head) =>
			sha256(
				execFileSync("git", [
					"diff",
					"--binary",
					"--full-index",
					"--no-ext-diff",
					"--no-textconv",
					"--no-renames",
					`${base}..${head}`,
				]),
			),
		attestationClass: trusted.attestationClass,
		evidenceSha: trusted.evidenceSha,
		initialReviewSha: trusted.initialReviewSha,
		trustedRuns: trusted.runs,
		repository: process.env.GITHUB_REPOSITORY,
		diffPaths: (base, head) => {
			const output = execFileSync(
				"git",
				["diff", "--name-only", `${base}..${head}`],
				{ encoding: "utf8" },
			).trim();
			return output.length === 0 ? [] : output.split("\n");
		},
		parents: (commit) =>
			execFileSync("git", ["show", "-s", "--format=%P", commit], {
				encoding: "utf8",
			})
				.trim()
				.split(/\s+/u)
				.filter(Boolean),
		readArtifact: (commit, path) => {
			if (!SHA_PATTERN.test(commit ?? "") || !validateEvidencePath(path))
				throw new Error("invalid evidence commit or path");
			const entry = execFileSync("git", ["ls-tree", commit, "--", path], {
				encoding: "utf8",
			});
			if (!entry.startsWith("100644 blob "))
				throw new Error("evidence artifact is missing or not a regular blob");
			return execFileSync("git", ["show", `${commit}:${path}`]);
		},
	};
}

function main() {
	const mode = argument("--mode");
	if (mode !== "draft" && mode !== "ready")
		throw new Error(
			"usage: check-v1-readiness.mjs --mode draft|ready [--head candidate-sha --base-head sha --tested-head sha --tested-kind candidate|pull-request-merge --deep-evidence path --review-evidence path]",
		);
	const goalPath = resolve(argument("--goal") ?? "GOAL.md");
	const head =
		argument("--head") ??
		execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const testedHead =
		argument("--tested-head") ??
		execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();
	const testedIdentity = {
		baseSha:
			argument("--base-head") ??
			execFileSync("git", ["rev-parse", `${testedHead}^`], {
				encoding: "utf8",
			}).trim(),
		candidateSha: head,
		testedKind: argument("--tested-kind") ?? "candidate",
		testedSha: testedHead,
	};
	const goalSource = readFileSync(goalPath, "utf8");
	const rows = parseRequiredStateRows(goalSource);
	const canonicalGoalSource = execFileSync(
		"git",
		["show", `${testedIdentity.baseSha}:GOAL.md`],
		{ encoding: "utf8" },
	);
	const canonicalRows = parseRequiredStateRows(canonicalGoalSource);
	const trustedRuns =
		mode === "ready"
			? loadTrustedRuns(argument("--trusted-attestations"))
			: { runs: new Map() };
	const deepEvidence =
		mode === "ready" ? readJson(argument("--deep-evidence")) : null;
	const reviewEvidence =
		mode === "ready"
			? JSON.parse(
					execFileSync(
						"git",
						[
							"show",
							`${trustedRuns.evidenceSha}:${argument("--review-evidence")}`,
						],
						{ encoding: "utf8" },
					),
				)
			: null;
	const postFreeze =
		mode === "ready"
			? inspectPostFreeze(reviewEvidence?.frozenCandidateSha, head)
			: { ancestor: false, paths: [] };
	const result = evaluateV1Readiness({
		rows,
		canonicalRows,
		canonicalGoalSource,
		goalSource,
		mode,
		deepEvidence,
		reviewEvidence,
		reviewValidationContext: reviewValidationContext(trustedRuns),
		head,
		testedIdentity,
		postFreeze,
	});
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	if (
		(mode === "ready" && result.status !== "V1 READY") ||
		(mode === "draft" && result.releaseEvidence.status === "INVALID")
	)
		process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
