import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	artifactPathsForTier,
	DEEP_BENCHMARK_CONTRACT,
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

function validateArtifactManifest(report, failures) {
	const files = Array.isArray(report.artifacts?.files)
		? report.artifacts.files
		: [];
	if (files.length === 0) failures.push("DEEP artifact manifest is empty");
	const paths = new Set();
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
	return new Map(files.map((file) => [file.path, file.sha256]));
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

function validateDeepBenchmarks(report, artifactHashes, failures) {
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
			artifactHashes.get(contract.path) !== benchmark?.artifactSha256
		)
			failures.push(
				`DEEP benchmark ${contract.id} artifact hash does not match`,
			);
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
	if (report?.verificationContractSha256 !== verificationContractSha256("deep"))
		failures.push("DEEP verification contract hash does not match");
	validateDeepConstituents(report ?? {}, failures);
	const artifactHashes = validateArtifactManifest(report ?? {}, failures);
	if (
		report?.artifactAssertions?.productionDistPresent !== true ||
		report?.artifactAssertions?.crashInjectionMarkersAbsent !== true ||
		!Number.isSafeInteger(report?.artifactAssertions?.filesInspected) ||
		report.artifactAssertions.filesInspected < 1
	)
		failures.push("DEEP production artifact assertions are incomplete");
	validateDeepBenchmarks(report ?? {}, artifactHashes, failures);
	return { ok: failures.length === 0, failures };
}

function validateEvidencePath(path) {
	return (
		typeof path === "string" &&
		!isAbsolute(path) &&
		!path.includes("\\") &&
		!path.split("/").includes("..") &&
		(path.startsWith("docs/reviews/") ||
			path.startsWith("docs/exec-plans/evidence/003/release/"))
	);
}

function validateArtifactReference(reference, label, failures, context) {
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
		const bytes = context.readArtifact(reference.path);
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

function requireArtifactTokens(contents, tokens, label, failures) {
	if (contents === null) return;
	for (const token of tokens) {
		if (!contents.includes(token))
			failures.push(`${label} artifact does not bind ${token}`);
	}
}

export function validateReviewConfirmationEvidence(report, context = {}) {
	const failures = [];
	if (report === null || typeof report !== "object" || Array.isArray(report))
		return { ok: false, failures: ["review evidence is not an object"] };
	if (report.schemaVersion !== "eonfolk-v1-review-confirmation-v2")
		failures.push("unsupported review evidence schema");
	if (report.status !== "PASS") failures.push("review evidence is not PASS");
	verifySelfHash(report, failures);
	for (const field of ["initialReviewSha", "frozenSoftwareSha"]) {
		if (!SHA_PATTERN.test(report[field] ?? ""))
			failures.push(`${field} is not a full Git SHA`);
	}
	if (
		SHA_PATTERN.test(report.initialReviewSha ?? "") &&
		SHA_PATTERN.test(report.frozenSoftwareSha ?? "")
	) {
		if (typeof context?.isAncestor !== "function")
			failures.push("review ancestry was not verified");
		else if (
			!context.isAncestor(report.initialReviewSha, report.frozenSoftwareSha)
		)
			failures.push("initialReviewSha is not an ancestor of frozenSoftwareSha");
	}

	const reviews = Array.isArray(report.reviews) ? report.reviews : [];
	if (reviews.length !== REQUIRED_REVIEW_DISCIPLINES.size)
		failures.push("review evidence must contain exactly six reviews");
	const reviewIds = new Set();
	const reviewerIds = new Set();
	const disciplines = new Set();
	const allFindingIds = new Set();
	for (const review of reviews) {
		if (review?.reviewId !== REVIEW_ID_BY_DISCIPLINE[review?.discipline])
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
		const p0Findings = Array.isArray(review?.findings?.p0)
			? review.findings.p0
			: [];
		const p1Findings = Array.isArray(review?.findings?.p1)
			? review.findings.p1
			: [];
		const findings = [...p0Findings, ...p1Findings];
		if (
			!Array.isArray(review?.findings?.p0) ||
			!Array.isArray(review?.findings?.p1)
		)
			failures.push("review P0/P1 finding lists are missing");
		for (const finding of findings) {
			if (
				typeof finding !== "string" ||
				!finding.startsWith(`${review?.reviewId}-`) ||
				!/-(P0|P1)-\d{3}$/u.test(finding)
			)
				failures.push(`review finding ID is invalid: ${String(finding)}`);
			if (allFindingIds.has(finding))
				failures.push(`review finding ID is duplicated: ${String(finding)}`);
			else allFindingIds.add(finding);
		}
		if (p0Findings.some((finding) => !/-P0-\d{3}$/u.test(finding)))
			failures.push("review P0 list contains a non-P0 finding ID");
		if (p1Findings.some((finding) => !/-P1-\d{3}$/u.test(finding)))
			failures.push("review P1 list contains a non-P1 finding ID");
		const artifactContents = validateArtifactReference(
			review?.artifact,
			`review ${String(review?.reviewId)}`,
			failures,
			context,
		);
		requireArtifactTokens(
			artifactContents,
			[
				report.initialReviewSha,
				String(review?.reviewId),
				String(review?.reviewerId),
				...findings,
			],
			`review ${String(review?.reviewId)}`,
			failures,
		);
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
	if (report.reconciliation?.sourceSha !== report.initialReviewSha)
		failures.push("reconciliation is not bound to initialReviewSha");
	const reviewFindingIds = reviews.flatMap((review) => [
		...(Array.isArray(review?.findings?.p0) ? review.findings.p0 : []),
		...(Array.isArray(review?.findings?.p1) ? review.findings.p1 : []),
	]);
	const dispositions = Array.isArray(report.reconciliation?.dispositions)
		? report.reconciliation.dispositions
		: [];
	const dispositionIds = new Set();
	for (const disposition of dispositions) {
		if (!reviewFindingIds.includes(disposition?.findingId))
			failures.push(
				`disposition has unknown finding ${String(disposition?.findingId)}`,
			);
		else dispositionIds.add(disposition.findingId);
		if (
			!["ACCEPT", "PARTIALLY ACCEPT", "REJECT"].includes(
				disposition?.disposition,
			)
		)
			failures.push("finding disposition is invalid");
		if (disposition?.status !== "CLOSED")
			failures.push("P0/P1 disposition is not CLOSED");
		if (
			!Array.isArray(disposition?.evidenceRefs) ||
			disposition.evidenceRefs.length === 0
		)
			failures.push("P0/P1 disposition has no evidence references");
	}
	if (
		dispositionIds.size !== reviewFindingIds.length ||
		reviewFindingIds.some((findingId) => !dispositionIds.has(findingId))
	)
		failures.push("P0/P1 dispositions do not exactly cover review findings");
	const reconciliationContents = validateArtifactReference(
		report.reconciliation?.artifact,
		"reconciliation",
		failures,
		context,
	);
	requireArtifactTokens(
		reconciliationContents,
		[report.initialReviewSha, report.frozenSoftwareSha, ...reviewFindingIds],
		"reconciliation",
		failures,
	);
	if (
		report.reconciliation?.finalDiff?.baseSha !== report.initialReviewSha ||
		report.reconciliation?.finalDiff?.headSha !== report.frozenSoftwareSha
	)
		failures.push("final diff evidence is not bound to the review range");
	let finalDiffPathsSha256 = null;
	if (typeof context?.diffPaths !== "function")
		failures.push("final diff paths were not independently inspected");
	else {
		try {
			const paths = context.diffPaths(
				report.initialReviewSha,
				report.frozenSoftwareSha,
			);
			finalDiffPathsSha256 = sha256(JSON.stringify(paths));
			if (report.reconciliation?.finalDiff?.pathCount !== paths.length)
				failures.push("final diff path count does not match Git");
			if (
				report.reconciliation?.finalDiff?.pathsSha256 !== finalDiffPathsSha256
			)
				failures.push("final diff path hash does not match Git");
		} catch {
			failures.push("final diff paths could not be inspected");
		}
	}
	const finalDiffContents = validateArtifactReference(
		report.reconciliation?.finalDiff?.artifact,
		"final diff",
		failures,
		context,
	);
	requireArtifactTokens(
		finalDiffContents,
		[
			report.initialReviewSha,
			report.frozenSoftwareSha,
			String(finalDiffPathsSha256),
		],
		"final diff",
		failures,
	);
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
	const confirmationContents = validateArtifactReference(
		report.confirmation?.artifact,
		"fresh confirmation",
		failures,
		context,
	);
	requireArtifactTokens(
		confirmationContents,
		[report.frozenSoftwareSha, String(report.confirmation?.reviewerId), "PASS"],
		"fresh confirmation",
		failures,
	);
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

export function validatePostFreezeDelta({
	ancestor,
	paths,
	frozenSha = null,
	head = null,
}) {
	const failures = [];
	if (!ancestor)
		failures.push("frozen software SHA is not an ancestor of HEAD");
	const disallowed = paths.filter((path) => !isAllowedPostFreezePath(path));
	if (disallowed.length > 0)
		failures.push(
			`post-freeze delta contains software or unapproved files: ${disallowed.join(", ")}`,
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
	}
	if (testedKind === "pull-request-merge") {
		if (testedSha === candidateSha)
			failures.push(
				"pull-request merge-ref is indistinguishable from candidateSha",
			);
		if (typeof context.parents !== "function")
			failures.push("pull-request merge-ref parents were not inspected");
		else {
			const parents = context.parents(testedSha);
			if (
				parents.length !== 2 ||
				!parents.includes(baseSha) ||
				!parents.includes(candidateSha)
			)
				failures.push(
					"tested merge-ref parents are not exact base and candidate",
				);
		}
	} else if (testedKind === "candidate") {
		if (testedSha !== candidateSha)
			failures.push(
				"candidate verification did not test candidateSha directly",
			);
	} else failures.push("testedKind is not pull-request-merge or candidate");
	return { ok: failures.length === 0, failures };
}

export function evaluateV1Readiness({
	rows,
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
	if (mode === "draft") {
		return {
			schemaVersion: "eonfolk-v1-readiness-v2",
			status: "V1 INCOMPLETE",
			mode,
			head,
			testedIdentity,
			requiredRows: rows.length,
			stateCounts: counts,
			incomplete: incomplete.map((row) => row.requirement),
			releaseEvidence: { status: "NOT_REQUIRED_FOR_DRAFT", eligible: false },
			claimBoundary:
				"Draft CI may pass while work remains, but it makes no V1 readiness claim.",
		};
	}

	const reviewResult = validateReviewConfirmationEvidence(
		reviewEvidence,
		reviewValidationContext,
	);
	const frozenSoftwareSha = reviewResult.frozenSoftwareSha;
	const deepResult = SHA_PATTERN.test(frozenSoftwareSha ?? "")
		? validateTargetMacDeepEvidence(deepEvidence, frozenSoftwareSha)
		: {
				ok: false,
				failures: ["review evidence has no valid frozenSoftwareSha"],
			};
	const deltaResult = validatePostFreezeDelta({
		...postFreeze,
		frozenSha: frozenSoftwareSha,
		head,
	});
	const testedIdentityResult = validateTestedIdentity(
		testedIdentity ?? {},
		reviewValidationContext,
	);
	const evidenceFailures = [
		...reviewResult.failures,
		...deepResult.failures,
		...deltaResult.failures,
		...testedIdentityResult.failures,
	];
	const ready = incomplete.length === 0 && evidenceFailures.length === 0;
	return {
		schemaVersion: "eonfolk-v1-readiness-v2",
		status: ready ? "V1 READY" : "V1 INCOMPLETE",
		mode,
		head,
		testedIdentity,
		frozenSoftwareSha,
		requiredRows: rows.length,
		stateCounts: counts,
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

function reviewValidationContext() {
	const root = resolve(".");
	return {
		currentHead: execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim(),
		isAncestor: (ancestor, descendant) =>
			spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
				stdio: "ignore",
			}).status === 0,
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
		readArtifact: (path) => {
			if (!validateEvidencePath(path)) throw new Error("invalid evidence path");
			const absolute = resolve(root, path);
			const repositoryRelative = relative(root, absolute).split(sep).join("/");
			if (repositoryRelative !== path)
				throw new Error("evidence path escaped root");
			return readFileSync(absolute);
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
		reviewValidationContext: reviewValidationContext(),
		head,
		testedIdentity,
		postFreeze,
	});
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	if (mode === "ready" && result.status !== "V1 READY") process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
