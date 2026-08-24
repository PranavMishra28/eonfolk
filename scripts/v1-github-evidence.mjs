import { execFileSync } from "node:child_process";
import {
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { contentSha256, sha256Bytes } from "./evidence-integrity.mjs";

const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const WORKFLOW_PATH = ".github/workflows/ci.yml";
const WORKFLOW_NAME = "CI";
const MAC_BASE_LABELS = Object.freeze(["self-hosted", "macOS", "ARM64"]);
const NONCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/u;
const EVIDENCE_TAG_PATTERN =
	/^refs\/tags\/eonfolk-evidence-[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/u;
export const CONTROL_PATHS = Object.freeze([
	WORKFLOW_PATH,
	"scripts/v1-github-evidence.mjs",
	"scripts/evidence-integrity.mjs",
	"scripts/check-v1-readiness.mjs",
	"scripts/run-verification-tier.mjs",
	"scripts/benchmark-persistence.mjs",
	"scripts/benchmark-diagnostics-browser.mjs",
	"scripts/validate-dependency-cohort.mjs",
	"scripts/formal-toolchain.mjs",
	"scripts/check-formal.mjs",
]);
const REVIEW_PURPOSES = Object.freeze([
	"review:V1-RV-PRODUCT",
	"review:V1-RV-SYSTEMS",
	"review:V1-RV-VISUAL",
	"review:V1-RV-COGNITION",
	"review:V1-RV-SECURITY-CI",
	"review:V1-RV-REPOSITORY-READINESS",
]);
export const REQUIRED_EVIDENCE_PURPOSES = Object.freeze([
	"target-mac-deep",
	...REVIEW_PURPOSES,
	"final-confirmation",
]);

const sha256 = (value) => sha256Bytes(value);

function exactKeys(value, keys) {
	return (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		JSON.stringify(Object.keys(value).sort()) ===
			JSON.stringify([...keys].sort())
	);
}

function positiveInteger(value) {
	return Number.isSafeInteger(value) && value > 0;
}

function macRunnerName(nonce) {
	if (!NONCE_PATTERN.test(nonce ?? ""))
		throw new Error("runner nonce is invalid");
	return `eonfolk-deep-${nonce}`;
}

function macLabels(nonce) {
	return [...MAC_BASE_LABELS, `eonfolk-ephemeral-deep-${nonce}`].sort();
}

function nonemptyIdentity(value) {
	return typeof value === "string" && ID_PATTERN.test(value);
}

function parseJson(bytes, label) {
	let value;
	try {
		value = JSON.parse(Buffer.from(bytes).toString("utf8"));
	} catch {
		throw new Error(`${label} is not JSON`);
	}
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new Error(`${label} is not an object`);
	return value;
}

export function parseRunIdConfiguration(source) {
	const config = typeof source === "string" ? JSON.parse(source) : source;
	if (
		!exactKeys(config, ["configurationBoundary", "runIds", "schemaVersion"]) ||
		config.schemaVersion !== "eonfolk-v1-evidence-run-ids-v1" ||
		config.configurationBoundary !== "RUN_IDS_ONLY_NOT_TRUST" ||
		!Array.isArray(config.runIds) ||
		config.runIds.length !== REQUIRED_EVIDENCE_PURPOSES.length ||
		!config.runIds.every(positiveInteger) ||
		new Set(config.runIds).size !== config.runIds.length
	)
		throw new Error(
			"evidence configuration must contain exactly eight unique positive run IDs and no trust assertions",
		);
	return Object.freeze([...config.runIds]);
}

export function purposeSlug(purpose) {
	if (!REQUIRED_EVIDENCE_PURPOSES.includes(purpose))
		throw new Error(`unsupported evidence purpose ${String(purpose)}`);
	return purpose.toLowerCase().replaceAll(":", "-");
}

function inspectPayload(purpose, bytes) {
	const payload = parseJson(bytes, `${purpose} payload`);
	if (purpose === "target-mac-deep") {
		if (
			payload.schemaVersion !== "eonfolk-verification-tier-v3" ||
			payload.tier !== "deep" ||
			payload.status !== "PASS" ||
			payload.source?.start?.commit !== payload.source?.end?.commit ||
			!SHA_PATTERN.test(payload.source?.start?.commit ?? "") ||
			Object.hasOwn(payload, "trustedRun")
		)
			throw new Error("target-Mac DEEP payload is not an exact-source PASS");
		return Object.freeze({
			sourceSha: payload.source.start.commit,
			reviewerAgentId: null,
			reviewerSessionId: null,
			observedAt: payload.recordedAt,
		});
	}
	if (purpose === "final-confirmation") {
		if (
			payload.schemaVersion !== "eonfolk-v1-final-confirmation-v3" ||
			payload.status !== "PASS" ||
			!SHA_PATTERN.test(payload.sourceSha ?? "") ||
			!nonemptyIdentity(payload.reviewerAgentId) ||
			!nonemptyIdentity(payload.reviewerSessionId)
		)
			throw new Error("final confirmation payload is malformed");
		return Object.freeze({
			sourceSha: payload.sourceSha,
			reviewerAgentId: payload.reviewerAgentId,
			reviewerSessionId: payload.reviewerSessionId,
			observedAt: payload.completedAt,
		});
	}
	const reviewId = purpose.slice("review:".length);
	if (
		payload.schemaVersion !== "eonfolk-v1-structured-review-v3" ||
		payload.reviewId !== reviewId ||
		!SHA_PATTERN.test(payload.sourceSha ?? "") ||
		!nonemptyIdentity(payload.reviewerAgentId) ||
		!nonemptyIdentity(payload.reviewerSessionId)
	)
		throw new Error(`${purpose} payload is malformed`);
	return Object.freeze({
		sourceSha: payload.sourceSha,
		reviewerAgentId: payload.reviewerAgentId,
		reviewerSessionId: payload.reviewerSessionId,
		observedAt: payload.completedAt,
	});
}

function parseLsTree(line, path) {
	const match = /^(\d{6}) blob ([a-f0-9]{40})\t(.+)$/u.exec(line.trim());
	if (match === null || match[3] !== path || match[1] !== "100644")
		throw new Error(`control path ${path} is missing, mutable, or executable`);
	return Object.freeze({ blobSha: match[2], mode: match[1], path });
}

export function controlManifest(rootPath, controlSha) {
	if (!SHA_PATTERN.test(controlSha)) throw new Error("control SHA is invalid");
	const root = realpathSync(resolve(rootPath));
	const checkoutSha = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
	if (checkoutSha !== controlSha)
		throw new Error("control checkout is not the exact control SHA");
	const files = CONTROL_PATHS.map((path) =>
		parseLsTree(
			execFileSync("git", ["-C", root, "ls-tree", controlSha, "--", path], {
				encoding: "utf8",
			}),
			path,
		),
	);
	return Object.freeze({ files, sha: controlSha });
}

export function assertMatchingControlManifests(
	controlRoot,
	controlSha,
	otherRoot,
	otherSha,
) {
	const control = controlManifest(controlRoot, controlSha);
	const other = controlManifest(otherRoot, otherSha);
	if (JSON.stringify(control.files) !== JSON.stringify(other.files))
		throw new Error("immutable control blobs or file modes do not match");
	return control;
}

function validateControlShape(control) {
	if (
		!exactKeys(control, ["files", "sha"]) ||
		!SHA_PATTERN.test(control.sha ?? "") ||
		!Array.isArray(control.files) ||
		control.files.length !== CONTROL_PATHS.length
	)
		throw new Error("control binding is malformed");
	for (const [index, file] of control.files.entries())
		if (
			!exactKeys(file, ["blobSha", "mode", "path"]) ||
			file.path !== CONTROL_PATHS[index] ||
			file.mode !== "100644" ||
			!SHA_PATTERN.test(file.blobSha ?? "")
		)
			throw new Error("control blob binding is malformed or incomplete");
}

function validateShaChain(initialReviewSha, frozenCandidateSha, evidenceSha) {
	for (const value of [initialReviewSha, frozenCandidateSha, evidenceSha])
		if (!SHA_PATTERN.test(value))
			throw new Error("evidence SHA chain is invalid");
	if (new Set([initialReviewSha, frozenCandidateSha, evidenceSha]).size !== 3)
		throw new Error(
			"initial review, frozen candidate, and evidence SHAs differ",
		);
}

function validateLifecycle(lifecycle, frozenCandidateSha, controlSha) {
	if (
		!exactKeys(lifecycle, [
			"controlSha",
			"finalizedAt",
			"frozenCandidateSha",
			"intermediateRunId",
			"intermediateRunAttempt",
			"intermediateWorkflowRef",
			"intermediateWorkflowSourceSha",
			"nonAdminCheckOutput",
			"nonAdminUser",
			"payloadSha256",
			"preflight",
			"runnerId",
			"runnerLabels",
			"runnerName",
			"runnerNonce",
			"runnerUser",
			"schemaVersion",
			"teardown",
		]) ||
		lifecycle.schemaVersion !== "eonfolk-v1-mac-lifecycle-v2" ||
		lifecycle.controlSha !== controlSha ||
		lifecycle.frozenCandidateSha !== frozenCandidateSha ||
		!positiveInteger(lifecycle.intermediateRunId) ||
		!positiveInteger(lifecycle.intermediateRunAttempt) ||
		!EVIDENCE_TAG_PATTERN.test(lifecycle.intermediateWorkflowRef ?? "") ||
		!SHA_PATTERN.test(lifecycle.intermediateWorkflowSourceSha ?? "") ||
		!positiveInteger(lifecycle.runnerId) ||
		!NONCE_PATTERN.test(lifecycle.runnerNonce ?? "") ||
		lifecycle.runnerName !== macRunnerName(lifecycle.runnerNonce) ||
		JSON.stringify([...(lifecycle.runnerLabels ?? [])].sort()) !==
			JSON.stringify(macLabels(lifecycle.runnerNonce)) ||
		!nonemptyIdentity(lifecycle.runnerName) ||
		!nonemptyIdentity(lifecycle.runnerUser) ||
		typeof lifecycle.nonAdminCheckOutput !== "string" ||
		!/ is NOT a member of group admin$/u.test(lifecycle.nonAdminCheckOutput) ||
		lifecycle.nonAdminUser !== true ||
		lifecycle.preflight !== "JOB_ASSIGNED_EXACT_NONCE_RUNNER" ||
		lifecycle.teardown !== "EXTERNAL_COORDINATOR_PROBE_REQUIRED" ||
		!HASH_PATTERN.test(lifecycle.payloadSha256 ?? "") ||
		!Number.isFinite(Date.parse(lifecycle.finalizedAt ?? ""))
	)
		throw new Error("target-Mac lifecycle evidence is invalid");
}

function validateExternalMacProbe(probe, lifecycle, repository) {
	if (
		!exactKeys(probe, [
			"afterRun",
			"beforeRegistration",
			"boundary",
			"intermediateRunAttempt",
			"intermediateRunId",
			"outputSha256",
			"probeMethod",
			"repository",
			"runnerId",
			"runnerName",
			"runnerNonce",
			"schemaVersion",
		]) ||
		probe.schemaVersion !== "eonfolk-v1-mac-external-probe-v1" ||
		probe.boundary !==
			"COORDINATOR_RECORDED_GH_API_OBSERVATION_NOT_CRYPTOGRAPHIC" ||
		probe.probeMethod !== "GH_API_REPOSITORY_RUNNERS" ||
		probe.repository !== repository ||
		probe.intermediateRunId !== lifecycle.intermediateRunId ||
		probe.intermediateRunAttempt !== lifecycle.intermediateRunAttempt ||
		probe.runnerId !== lifecycle.runnerId ||
		probe.runnerName !== lifecycle.runnerName ||
		probe.runnerNonce !== lifecycle.runnerNonce ||
		!exactKeys(probe.beforeRegistration, [
			"observedAt",
			"operatorActor",
			"runnerCount",
		]) ||
		probe.beforeRegistration.runnerCount !== 0 ||
		!exactKeys(probe.afterRun, [
			"observedAt",
			"operatorActor",
			"runnerAbsent",
		]) ||
		probe.afterRun.runnerAbsent !== true ||
		probe.beforeRegistration.operatorActor !== probe.afterRun.operatorActor ||
		!nonemptyIdentity(probe.beforeRegistration.operatorActor) ||
		!Number.isFinite(Date.parse(probe.beforeRegistration.observedAt ?? "")) ||
		!Number.isFinite(Date.parse(probe.afterRun.observedAt ?? ""))
	)
		throw new Error("external Mac runner probe is malformed or mismatched");
	if (probe.outputSha256 !== contentSha256(probe))
		throw new Error("external Mac runner probe self-hash does not match");
}

function decodeExternalProbeBase64(source) {
	if (
		typeof source !== "string" ||
		source.length < 128 ||
		source.length > 12_288
	)
		throw new Error("external Mac runner probe input size is invalid");
	const bytes = Buffer.from(source, "base64");
	if (
		bytes.byteLength < 96 ||
		bytes.byteLength > 8_192 ||
		bytes.toString("base64") !== source
	)
		throw new Error("external Mac runner probe input is not canonical base64");
	return bytes;
}

function validateReceipt(receipt) {
	if (
		!exactKeys(receipt, [
			"control",
			"evidenceSha",
			"frozenCandidateSha",
			"identityBoundary",
			"initialReviewSha",
			"macExternalProbe",
			"macLifecycle",
			"operatorActor",
			"payload",
			"purpose",
			"repository",
			"reviewerAgentId",
			"reviewerSessionId",
			"runAttempt",
			"runId",
			"schemaVersion",
			"sourceSha",
			"workflowPath",
			"workflowRef",
			"workflowSourceSha",
		]) ||
		receipt.schemaVersion !== "eonfolk-v1-github-evidence-receipt-v2" ||
		receipt.identityBoundary !==
			"CONTROL_BLOBS_AND_GITHUB_RUN_VERIFIED; REVIEWER_AGENT_ID_SELF_REPORTED" ||
		!REQUIRED_EVIDENCE_PURPOSES.includes(receipt.purpose) ||
		!SHA_PATTERN.test(receipt.sourceSha ?? "") ||
		!SHA_PATTERN.test(receipt.workflowSourceSha ?? "") ||
		!EVIDENCE_TAG_PATTERN.test(receipt.workflowRef ?? "") ||
		receipt.workflowPath !== WORKFLOW_PATH ||
		!positiveInteger(receipt.runId) ||
		!positiveInteger(receipt.runAttempt) ||
		!nonemptyIdentity(receipt.operatorActor) ||
		typeof receipt.repository !== "string" ||
		!exactKeys(receipt.payload, ["bytes", "path", "sha256"]) ||
		receipt.payload.path !== "payload.json" ||
		!positiveInteger(receipt.payload.bytes) ||
		!HASH_PATTERN.test(receipt.payload.sha256 ?? "")
	)
		throw new Error("evidence receipt schema or boundary is invalid");
	validateShaChain(
		receipt.initialReviewSha,
		receipt.frozenCandidateSha,
		receipt.evidenceSha,
	);
	validateControlShape(receipt.control);
	if (receipt.control.sha !== receipt.frozenCandidateSha)
		throw new Error("control SHA must equal frozenCandidateSha");
	const reviewerRequired = receipt.purpose !== "target-mac-deep";
	if (
		reviewerRequired !==
			(nonemptyIdentity(receipt.reviewerAgentId) &&
				nonemptyIdentity(receipt.reviewerSessionId)) ||
		(!reviewerRequired &&
			(receipt.reviewerAgentId !== null || receipt.reviewerSessionId !== null))
	)
		throw new Error("evidence receipt reviewer identity is invalid");
	if (receipt.purpose === "target-mac-deep") {
		validateLifecycle(
			receipt.macLifecycle,
			receipt.frozenCandidateSha,
			receipt.control.sha,
		);
		if (
			!exactKeys(receipt.macExternalProbe, ["bytes", "path", "sha256"]) ||
			receipt.macExternalProbe.path !== "mac-external-probe.json" ||
			!positiveInteger(receipt.macExternalProbe.bytes) ||
			!HASH_PATTERN.test(receipt.macExternalProbe.sha256 ?? "")
		)
			throw new Error("external Mac runner probe reference is invalid");
	} else if (receipt.macLifecycle !== null || receipt.macExternalProbe !== null)
		throw new Error("non-Mac evidence cannot assert Mac lifecycle evidence");
}

function defaultArchiveReader(archiveBytes) {
	const scratch = mkdtempSync(join(tmpdir(), "eonfolk-v1-evidence-"));
	const archive = join(scratch, "artifact.zip");
	try {
		writeFileSync(archive, archiveBytes);
		const names = execFileSync("unzip", ["-Z1", archive], {
			encoding: "utf8",
		})
			.split(/\r?\n/u)
			.filter(Boolean);
		if (names.length !== new Set(names).size)
			throw new Error("evidence archive has duplicate entries");
		return new Map(
			names.map((name) => [name, execFileSync("unzip", ["-p", archive, name])]),
		);
	} finally {
		rmSync(scratch, { force: true, recursive: true });
	}
}

async function verifyAncestry(client, repository, ancestor, descendant, label) {
	await client.json(`/repos/${repository}/commits/${ancestor}`);
	await client.json(`/repos/${repository}/commits/${descendant}`);
	const comparison = await client.json(
		`/repos/${repository}/compare/${ancestor}...${descendant}`,
	);
	if (
		!["ahead", "identical"].includes(comparison?.status) ||
		comparison?.merge_base_commit?.sha !== ancestor
	)
		throw new Error(`${label} ancestry is invalid`);
}

async function verifyControlTrees(client, repository, control, shas) {
	validateControlShape(control);
	for (const sha of [...new Set([control.sha, ...shas])]) {
		const tree = await client.json(
			`/repos/${repository}/git/trees/${sha}?recursive=1`,
		);
		if (tree?.truncated === true || !Array.isArray(tree?.tree))
			throw new Error("control Git tree could not be verified completely");
		for (const expected of control.files) {
			const actual = tree.tree.find(({ path }) => path === expected.path);
			if (
				actual?.type !== "blob" ||
				actual?.mode !== expected.mode ||
				actual?.sha !== expected.blobSha
			)
				throw new Error(`control blob changed at ${sha}:${expected.path}`);
		}
	}
}

async function verifyControlBinding(
	client,
	repository,
	control,
	evidenceSha,
	workflowSourceSha,
) {
	await verifyAncestry(
		client,
		repository,
		control.sha,
		evidenceSha,
		"control-to-evidence",
	);
	await verifyAncestry(
		client,
		repository,
		evidenceSha,
		workflowSourceSha,
		"evidence-to-workflow-source",
	);
	await verifyControlTrees(client, repository, control, [
		evidenceSha,
		workflowSourceSha,
	]);
}

function validateRun(run, repository, runId) {
	if (run?.id !== runId) throw new Error(`run ${runId} identity is fabricated`);
	if (run?.repository?.full_name !== repository)
		throw new Error(`run ${runId} repository does not match`);
	if (run?.status !== "completed" || run?.conclusion !== "success")
		throw new Error(`run ${runId} did not complete successfully`);
	if (run?.event !== "workflow_dispatch")
		throw new Error(`run ${runId} was not manually dispatched`);
	if (
		!SHA_PATTERN.test(run?.head_sha ?? "") ||
		!positiveInteger(run?.run_attempt) ||
		!nonemptyIdentity(run?.actor?.login) ||
		![run?.created_at, run?.run_started_at, run?.updated_at].every((value) =>
			Number.isFinite(Date.parse(value ?? "")),
		) ||
		Date.parse(run.created_at) > Date.parse(run.run_started_at) ||
		Date.parse(run.run_started_at) > Date.parse(run.updated_at)
	)
		throw new Error(`run ${runId} actor, source, or attempt is invalid`);
}

async function validatePostmergeAttestation(
	client,
	repository,
	mainSha,
	evidenceSha,
	attestationRun,
	expectedOperator,
	producerRunIds,
) {
	if (attestationRun === null) return null;
	if (
		attestationRun?.repository?.full_name !== repository ||
		attestationRun?.event !== "push" ||
		attestationRun?.head_branch !== "main" ||
		attestationRun?.head_sha !== mainSha ||
		attestationRun?.actor?.login !== expectedOperator ||
		attestationRun?.status !== "in_progress" ||
		attestationRun?.conclusion !== null ||
		!positiveInteger(attestationRun?.id) ||
		producerRunIds.includes(attestationRun.id) ||
		!positiveInteger(attestationRun?.run_attempt) ||
		!positiveInteger(attestationRun?.workflow_id) ||
		!Number.isFinite(Date.parse(attestationRun?.created_at ?? "")) ||
		!Number.isFinite(Date.parse(attestationRun?.run_started_at ?? ""))
	)
		throw new Error("postmerge attestation is not a live push-to-main run");
	const merge = await client.json(`/repos/${repository}/commits/${mainSha}`);
	const workflow = await client.json(
		`/repos/${repository}/actions/workflows/${attestationRun.workflow_id}`,
	);
	const parents = Array.isArray(merge?.parents)
		? merge.parents.map(({ sha }) => sha)
		: [];
	const mergeAt = Date.parse(merge?.commit?.committer?.date ?? "");
	if (
		merge?.sha !== mainSha ||
		parents.length !== 2 ||
		!parents.includes(evidenceSha) ||
		!Number.isFinite(mergeAt) ||
		workflow?.path !== WORKFLOW_PATH ||
		workflow?.name !== WORKFLOW_NAME ||
		workflow?.state !== "active" ||
		Date.parse(attestationRun.created_at) < mergeAt ||
		Date.parse(attestationRun.run_started_at) < mergeAt
	)
		throw new Error(
			"postmerge push run does not bind the actual protected merge commit and time",
		);
	return Object.freeze({
		event: "push",
		headSha: mainSha,
		mergeCommittedAt: new Date(mergeAt).toISOString(),
		runAttempt: attestationRun.run_attempt,
		runId: attestationRun.id,
		runStartedAt: new Date(attestationRun.run_started_at).toISOString(),
	});
}

async function downloadSingleArtifact(client, repository, runId, artifactName) {
	const listed = await client.json(
		`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
	);
	const matches = (
		Array.isArray(listed?.artifacts) ? listed.artifacts : []
	).filter(({ name }) => name === artifactName);
	if (
		!Number.isSafeInteger(listed?.total_count) ||
		listed.total_count !== (listed.artifacts?.length ?? -1)
	)
		throw new Error(`run ${runId} artifact listing is incomplete or paginated`);
	if (matches.length !== 1)
		throw new Error(`run ${runId} has no unique ${artifactName} artifact`);
	const artifact = matches[0];
	if (
		artifact?.expired !== false ||
		!positiveInteger(artifact?.id) ||
		typeof artifact?.archive_download_url !== "string" ||
		new URL(artifact.archive_download_url).origin !==
			"https://api.github.com" ||
		!/^sha256:[a-f0-9]{64}$/u.test(artifact?.digest ?? "")
	)
		throw new Error(`run ${runId} artifact metadata is invalid or expired`);
	const archiveBytes = await client.bytes(artifact.archive_download_url);
	const archiveSha256 = sha256(archiveBytes);
	if (artifact.digest !== `sha256:${archiveSha256}`)
		throw new Error(`run ${runId} artifact archive digest does not match`);
	return { archiveBytes, archiveSha256, artifact };
}

async function verifyMacLifecycle(
	client,
	repository,
	lifecycle,
	probe,
	control,
) {
	const run = await client.json(
		`/repos/${repository}/actions/runs/${lifecycle.intermediateRunId}`,
	);
	validateRun(run, repository, lifecycle.intermediateRunId);
	if (
		run.head_sha !== lifecycle.intermediateWorkflowSourceSha ||
		run.run_attempt !== lifecycle.intermediateRunAttempt
	)
		throw new Error(
			"Mac lifecycle workflow source does not match its live run",
		);
	const intermediateTag = await client.json(
		`/repos/${repository}/git/ref/tags/${lifecycle.intermediateWorkflowRef.slice("refs/tags/".length)}`,
	);
	if (
		intermediateTag?.ref !== lifecycle.intermediateWorkflowRef ||
		intermediateTag?.object?.type !== "commit" ||
		intermediateTag?.object?.sha !== run.head_sha
	)
		throw new Error("Mac intermediate tag does not bind its workflow source");
	await verifyAncestry(
		client,
		repository,
		control.sha,
		lifecycle.intermediateWorkflowSourceSha,
		"control-to-Mac-workflow-source",
	);
	await verifyControlTrees(client, repository, control, [
		lifecycle.intermediateWorkflowSourceSha,
	]);
	const jobs = await client.json(
		`/repos/${repository}/actions/runs/${lifecycle.intermediateRunId}/jobs?per_page=100`,
	);
	const entries = Array.isArray(jobs?.jobs) ? jobs.jobs : [];
	if (
		!Number.isSafeInteger(jobs?.total_count) ||
		jobs.total_count !== entries.length
	)
		throw new Error("Mac lifecycle job listing is incomplete or paginated");
	for (const name of [
		"Mac immutable control preflight",
		"Target-Mac exact 31-step DEEP intermediate",
		"Clean hosted Mac evidence finalizer",
	])
		if (
			entries.filter((job) => job.name === name && job.conclusion === "success")
				.length !== 1
		)
			throw new Error(`Mac lifecycle job ${name} is absent or unsuccessful`);
	const macJob = entries.find(
		({ name }) => name === "Target-Mac exact 31-step DEEP intermediate",
	);
	if (
		macJob?.runner_id !== lifecycle.runnerId ||
		macJob?.runner_name !== lifecycle.runnerName ||
		JSON.stringify([...(macJob?.labels ?? [])].sort()) !==
			JSON.stringify(macLabels(lifecycle.runnerNonce))
	)
		throw new Error("Mac lifecycle runner identity or labels do not match");
	if (
		!Number.isFinite(Date.parse(macJob?.started_at ?? "")) ||
		!Number.isFinite(Date.parse(macJob?.completed_at ?? "")) ||
		Date.parse(macJob.started_at) < Date.parse(run.run_started_at) ||
		Date.parse(macJob.completed_at) < Date.parse(macJob.started_at) ||
		Date.parse(lifecycle.finalizedAt) < Date.parse(macJob.completed_at) ||
		Date.parse(lifecycle.finalizedAt) > Date.parse(run.updated_at) ||
		Date.parse(probe.beforeRegistration.observedAt) >=
			Date.parse(run.created_at) ||
		Date.parse(probe.afterRun.observedAt) <= Date.parse(run.updated_at) ||
		Date.parse(probe.afterRun.observedAt) <= Date.parse(lifecycle.finalizedAt)
	)
		throw new Error("Mac lifecycle/probe/run timestamp ordering is invalid");
}

export async function verifyGithubEvidenceRuns({
	runIds,
	repository,
	expectedEvidenceSha,
	expectedOwner,
	expectedOperator,
	client,
	archiveReader = defaultArchiveReader,
	now = () => new Date().toISOString(),
	onPayload = () => {},
	attestationRun = null,
}) {
	if (!Array.isArray(runIds) || runIds.length === 0)
		throw new Error("no evidence producer runs were configured");
	if (typeof repository !== "string" || !/^[^/]+\/[^/]+$/u.test(repository))
		throw new Error("repository identity is invalid");
	if (!SHA_PATTERN.test(expectedEvidenceSha ?? ""))
		throw new Error("expected evidence SHA is invalid");
	if (!nonemptyIdentity(expectedOwner) || !nonemptyIdentity(expectedOperator))
		throw new Error("expected owner/operator identity is invalid");
	if (repository.split("/")[0] !== expectedOwner)
		throw new Error("repository owner is not the expected owner");
	const repositoryMetadata = await client.json(`/repos/${repository}`);
	if (
		repositoryMetadata?.full_name !== repository ||
		repositoryMetadata?.owner?.login !== expectedOwner ||
		repositoryMetadata?.delete_branch_on_merge !== false ||
		repositoryMetadata?.allow_merge_commit !== true ||
		repositoryMetadata?.allow_squash_merge !== false ||
		repositoryMetadata?.allow_rebase_merge !== false
	)
		throw new Error(
			"repository owner, merge mode, or delete-branch-on-merge control is invalid",
		);
	const main = await client.json(`/repos/${repository}/branches/main`);
	if (
		main?.name !== "main" ||
		main?.protected !== true ||
		!SHA_PATTERN.test(main?.commit?.sha ?? "")
	)
		throw new Error("main is not API-verified as protected");
	const records = [];
	const postmergeAttestation = await validatePostmergeAttestation(
		client,
		repository,
		main.commit.sha,
		expectedEvidenceSha,
		attestationRun,
		expectedOperator,
		runIds,
	);
	for (const runId of runIds) {
		let run;
		try {
			run = await client.json(`/repos/${repository}/actions/runs/${runId}`);
		} catch {
			throw new Error(
				`configured evidence producer run ${runId} does not exist`,
			);
		}
		validateRun(run, repository, runId);
		if (run.actor.login !== expectedOperator)
			throw new Error(`run ${runId} actor is not the expected operator`);
		const workflow = await client.json(
			`/repos/${repository}/actions/workflows/${run.workflow_id}`,
		);
		if (
			workflow?.id !== run.workflow_id ||
			workflow?.path !== WORKFLOW_PATH ||
			workflow?.name !== WORKFLOW_NAME ||
			workflow?.state !== "active"
		)
			throw new Error(`run ${runId} used the wrong workflow identity`);
		const jobs = await client.json(
			`/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
		);
		const finalizers = (Array.isArray(jobs?.jobs) ? jobs.jobs : []).filter(
			(job) =>
				job.name === "Release evidence finalizer" &&
				job.conclusion === "success",
		);
		if (
			!Number.isSafeInteger(jobs?.total_count) ||
			jobs.total_count !== (jobs.jobs?.length ?? -1)
		)
			throw new Error(`run ${runId} job listing is incomplete or paginated`);
		if (
			finalizers.length !== 1 ||
			finalizers[0].labels?.includes("self-hosted")
		)
			throw new Error(`run ${runId} has no unique clean hosted finalizer`);
		const listed = await client.json(
			`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
		);
		const finalArtifacts = (
			Array.isArray(listed?.artifacts) ? listed.artifacts : []
		).filter(({ name }) => name?.startsWith("v1-evidence-"));
		if (
			!Number.isSafeInteger(listed?.total_count) ||
			listed.total_count !== (listed.artifacts?.length ?? -1)
		)
			throw new Error(
				`run ${runId} artifact listing is incomplete or paginated`,
			);
		if (finalArtifacts.length !== 1)
			throw new Error(
				`run ${runId} must expose exactly one final evidence artifact`,
			);
		const downloaded = await downloadSingleArtifact(
			client,
			repository,
			runId,
			finalArtifacts[0].name,
		);
		const files = archiveReader(downloaded.archiveBytes);
		if (
			!(files instanceof Map) ||
			!files.has("receipt.json") ||
			!files.has("payload.json")
		)
			throw new Error(`run ${runId} final artifact entries are invalid`);
		const receipt = parseJson(
			files.get("receipt.json"),
			`run ${runId} receipt`,
		);
		const payloadBytes = files.get("payload.json");
		validateReceipt(receipt);
		const expectedEntries =
			receipt.purpose === "target-mac-deep"
				? ["mac-external-probe.json", "payload.json", "receipt.json"]
				: ["payload.json", "receipt.json"];
		if (
			JSON.stringify([...files.keys()].sort()) !==
			JSON.stringify(expectedEntries)
		)
			throw new Error(`run ${runId} final artifact entries are invalid`);
		let externalProbe = null;
		if (receipt.purpose === "target-mac-deep") {
			const probeBytes = files.get("mac-external-probe.json");
			if (
				!(probeBytes instanceof Uint8Array) ||
				probeBytes.byteLength !== receipt.macExternalProbe.bytes ||
				sha256(probeBytes) !== receipt.macExternalProbe.sha256
			)
				throw new Error(
					"external Mac runner probe raw bytes do not match receipt",
				);
			externalProbe = parseJson(probeBytes, "external Mac runner probe");
			validateExternalMacProbe(externalProbe, receipt.macLifecycle, repository);
		}
		if (
			receipt.purpose === "target-mac-deep" &&
			externalProbe.beforeRegistration.operatorActor !== expectedOperator
		)
			throw new Error(
				"external Mac probe operator is not the expected operator",
			);
		const evidenceTag = receipt.workflowRef.slice("refs/tags/".length);
		const tag = await client.json(
			`/repos/${repository}/git/ref/tags/${evidenceTag}`,
		);
		if (
			!(payloadBytes instanceof Uint8Array) ||
			receipt.runId !== runId ||
			receipt.runAttempt !== run.run_attempt ||
			receipt.repository !== repository ||
			receipt.operatorActor !== run.actor.login ||
			receipt.workflowSourceSha !== run.head_sha ||
			tag?.ref !== receipt.workflowRef ||
			tag?.object?.type !== "commit" ||
			tag?.object?.sha !== run.head_sha ||
			receipt.evidenceSha !== expectedEvidenceSha ||
			receipt.payload.bytes !== payloadBytes.byteLength ||
			receipt.payload.sha256 !== sha256(payloadBytes) ||
			finalArtifacts[0].name !==
				`v1-evidence-${purposeSlug(receipt.purpose)}-${runId}-attempt-${run.run_attempt}`
		)
			throw new Error(
				`run ${runId} receipt does not match live GitHub metadata`,
			);
		const identity = inspectPayload(receipt.purpose, payloadBytes);
		if (
			!Number.isFinite(Date.parse(identity.observedAt ?? "")) ||
			Date.parse(identity.observedAt) > Date.parse(run.created_at) ||
			(receipt.purpose === "target-mac-deep" &&
				Date.parse(externalProbe.afterRun.observedAt) >=
					Date.parse(run.created_at))
		)
			throw new Error(
				"evidence payload/probe/run timestamp ordering is invalid",
			);
		const expectedSource = receipt.purpose.startsWith("review:")
			? receipt.initialReviewSha
			: receipt.frozenCandidateSha;
		if (
			identity.sourceSha !== expectedSource ||
			identity.sourceSha !== receipt.sourceSha ||
			identity.reviewerAgentId !== receipt.reviewerAgentId ||
			identity.reviewerSessionId !== receipt.reviewerSessionId
		)
			throw new Error(
				`run ${runId} payload identity does not match its receipt`,
			);
		await verifyAncestry(
			client,
			repository,
			receipt.initialReviewSha,
			receipt.frozenCandidateSha,
			"initial-review-to-frozen-candidate",
		);
		await verifyAncestry(
			client,
			repository,
			receipt.frozenCandidateSha,
			receipt.evidenceSha,
			"frozen-candidate-to-evidence",
		);
		await verifyControlBinding(
			client,
			repository,
			receipt.control,
			receipt.evidenceSha,
			receipt.workflowSourceSha,
		);
		if (receipt.purpose === "target-mac-deep")
			await verifyMacLifecycle(
				client,
				repository,
				receipt.macLifecycle,
				externalProbe,
				receipt.control,
			);
		const attestationClass =
			postmergeAttestation !== null
				? "POSTMERGE_PROTECTED_MAIN"
				: "PREMERGE_CANDIDATE_CONTROL";
		onPayload(receipt.purpose, payloadBytes);
		records.push(
			Object.freeze({
				actor: run.actor.login,
				artifactArchiveSha256: downloaded.archiveSha256,
				artifactId: downloaded.artifact.id,
				artifactName: downloaded.artifact.name,
				attestationClass,
				control: receipt.control,
				conclusion: run.conclusion,
				event: run.event,
				evidenceSha: receipt.evidenceSha,
				frozenCandidateSha: receipt.frozenCandidateSha,
				initialReviewSha: receipt.initialReviewSha,
				macExternalProbe: externalProbe,
				macLifecycle: receipt.macLifecycle,
				payloadSha256: receipt.payload.sha256,
				provider: "github-actions-live-api",
				purpose: receipt.purpose,
				repository,
				reviewerAgentId: receipt.reviewerAgentId,
				reviewerSessionId: receipt.reviewerSessionId,
				phaseAttestation: postmergeAttestation,
				runnerLabels: [...(finalizers[0].labels ?? [])].sort(),
				runnerName: finalizers[0].runner_name,
				runAttempt: run.run_attempt,
				runId,
				sourceSha: receipt.sourceSha,
				workflowId: workflow.id,
				workflowPath: workflow.path,
				workflowSourceSha: run.head_sha,
			}),
		);
	}
	const purposes = records.map(({ purpose }) => purpose).sort();
	if (
		JSON.stringify(purposes) !==
		JSON.stringify([...REQUIRED_EVIDENCE_PURPOSES].sort())
	)
		throw new Error(
			"verified runs do not cover the exact evidence producer roster",
		);
	const first = records[0];
	for (const record of records)
		if (
			record.initialReviewSha !== first.initialReviewSha ||
			record.frozenCandidateSha !== first.frozenCandidateSha ||
			record.evidenceSha !== first.evidenceSha ||
			record.control.sha !== first.control.sha ||
			record.workflowSourceSha !== first.workflowSourceSha ||
			record.attestationClass !== first.attestationClass ||
			JSON.stringify(record.phaseAttestation) !==
				JSON.stringify(first.phaseAttestation)
		)
			throw new Error(
				"evidence runs do not bind one immutable candidate chain",
			);
	const reviewers = records.filter(
		({ reviewerAgentId }) => reviewerAgentId !== null,
	);
	if (
		new Set(reviewers.map(({ reviewerAgentId }) => reviewerAgentId)).size !==
			7 ||
		new Set(reviewers.map(({ reviewerSessionId }) => reviewerSessionId))
			.size !== 7
	)
		throw new Error(
			"reviewer agent identities and sessions are not independent",
		);
	const unsigned = Object.freeze({
		runs: records.sort((left, right) =>
			left.purpose.localeCompare(right.purpose),
		),
		schemaVersion: "eonfolk-live-verified-github-runs-v3",
		trustBoundary:
			"LIVE_GITHUB_AND_CONTROL_BLOB_VERIFICATION; MAC_RUNNER_ABSENCE_IS_PROCEDURAL; PREMERGE_CLASS_IS_CANDIDATE_CONTROLLED; REVIEWER_AGENT_IDENTITY_IS_SELF_REPORTED",
		verifiedAt: now(),
	});
	return Object.freeze({
		...unsigned,
		outputSha256: contentSha256(unsigned),
	});
}

function argument(name) {
	const index = process.argv.indexOf(name);
	return index < 0 ? null : (process.argv[index + 1] ?? null);
}

function requiredArgument(name) {
	const value = argument(name);
	if (value === null) throw new Error(`${name} is required`);
	return value;
}

function safePayload(rootPath, payloadPath) {
	const root = realpathSync(resolve(rootPath));
	const absolute = resolve(root, payloadPath);
	if (lstatSync(absolute).isSymbolicLink())
		throw new Error("evidence payload must not be a symlink");
	const real = realpathSync(absolute);
	const relativePath = relative(root, real).split(sep).join("/");
	if (relativePath !== payloadPath || relativePath.startsWith("../"))
		throw new Error("evidence payload escaped its exact checkout");
	return real;
}

function assertLocalAncestry(root, ancestor, descendant, label) {
	if (
		execFileSync("git", ["-C", root, "merge-base", ancestor, descendant], {
			encoding: "utf8",
		}).trim() !== ancestor
	)
		throw new Error(`${label} local ancestry is invalid`);
}

async function repositoryPreflight() {
	const repository = requiredArgument("--repository");
	const expectedOwner = requiredArgument("--expected-owner");
	const expectedOperator = requiredArgument("--expected-operator");
	const metadata = await githubClient(process.env.GITHUB_TOKEN).json(
		`/repos/${repository}`,
	);
	if (
		repository.split("/")[0] !== expectedOwner ||
		metadata?.full_name !== repository ||
		metadata?.owner?.login !== expectedOwner ||
		metadata?.delete_branch_on_merge !== false ||
		metadata?.allow_merge_commit !== true ||
		metadata?.allow_squash_merge !== false ||
		metadata?.allow_rebase_merge !== false ||
		process.env.GITHUB_ACTOR !== expectedOperator
	)
		throw new Error(
			"repository owner/operator, merge mode, or delete-branch-on-merge preflight failed",
		);
}

async function finalizeMacIntermediate() {
	const repository = requiredArgument("--repository");
	const runId = Number(requiredArgument("--run-id"));
	const runAttempt = Number(requiredArgument("--run-attempt"));
	const runnerNonce = requiredArgument("--runner-nonce");
	const runnerName = macRunnerName(runnerNonce);
	const output = resolve(requiredArgument("--output"));
	const client = githubClient(process.env.GITHUB_TOKEN);
	const run = await client.json(`/repos/${repository}/actions/runs/${runId}`);
	if (
		run?.id !== runId ||
		run?.repository?.full_name !== repository ||
		run?.event !== "workflow_dispatch" ||
		run?.head_sha !== process.env.GITHUB_SHA ||
		run?.run_attempt !== runAttempt
	)
		throw new Error(
			"Mac intermediate run identity does not match live metadata",
		);
	const downloaded = await downloadSingleArtifact(
		client,
		repository,
		runId,
		`v1-mac-raw-${runId}-attempt-${runAttempt}`,
	);
	const files = defaultArchiveReader(downloaded.archiveBytes);
	if (
		files.size !== 2 ||
		!files.has("payload.json") ||
		!files.has("runner.json")
	)
		throw new Error("raw Mac artifact entries are invalid");
	const payloadBytes = files.get("payload.json");
	const runner = parseJson(files.get("runner.json"), "Mac runner record");
	const controlSha = requiredArgument("--control-sha");
	const frozenCandidateSha = requiredArgument("--frozen-candidate-sha");
	if (
		!exactKeys(runner, [
			"controlSha",
			"frozenCandidateSha",
			"nonAdminCheckOutput",
			"nonAdminUser",
			"runnerName",
			"runnerNonce",
			"runnerUser",
			"schemaVersion",
		]) ||
		runner.schemaVersion !== "eonfolk-v1-mac-runner-v2" ||
		runner.controlSha !== controlSha ||
		runner.frozenCandidateSha !== frozenCandidateSha ||
		runner.runnerName !== runnerName ||
		runner.runnerNonce !== runnerNonce ||
		runner.nonAdminUser !== true ||
		typeof runner.nonAdminCheckOutput !== "string" ||
		!/ is NOT a member of group admin$/u.test(runner.nonAdminCheckOutput) ||
		!nonemptyIdentity(runner.runnerUser)
	)
		throw new Error(
			"Mac runner record does not prove the required non-admin identity",
		);
	inspectPayload("target-mac-deep", payloadBytes);
	const jobs = await client.json(
		`/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
	);
	const macJobs = (Array.isArray(jobs?.jobs) ? jobs.jobs : []).filter(
		({ name, conclusion }) =>
			name === "Target-Mac exact 31-step DEEP intermediate" &&
			conclusion === "success",
	);
	if (
		!Number.isSafeInteger(jobs?.total_count) ||
		jobs.total_count !== (jobs.jobs?.length ?? -1)
	)
		throw new Error("Mac finalizer job listing is incomplete or paginated");
	if (
		macJobs.length !== 1 ||
		!positiveInteger(macJobs[0].runner_id) ||
		macJobs[0].runner_name !== runnerName ||
		JSON.stringify([...(macJobs[0].labels ?? [])].sort()) !==
			JSON.stringify(macLabels(runnerNonce))
	)
		throw new Error("Mac job metadata does not bind the exact nonce runner");
	mkdirSync(output, { recursive: false });
	writeFileSync(join(output, "payload.json"), payloadBytes);
	writeFileSync(
		join(output, "lifecycle.json"),
		`${JSON.stringify(
			{
				schemaVersion: "eonfolk-v1-mac-lifecycle-v2",
				controlSha,
				frozenCandidateSha,
				intermediateRunId: runId,
				intermediateRunAttempt: runAttempt,
				intermediateWorkflowRef: process.env.GITHUB_REF,
				intermediateWorkflowSourceSha: process.env.GITHUB_SHA,
				runnerId: macJobs[0].runner_id,
				runnerLabels: macLabels(runnerNonce),
				runnerName,
				runnerNonce,
				runnerUser: runner.runnerUser,
				nonAdminCheckOutput: runner.nonAdminCheckOutput,
				nonAdminUser: true,
				preflight: "JOB_ASSIGNED_EXACT_NONCE_RUNNER",
				teardown: "EXTERNAL_COORDINATOR_PROBE_REQUIRED",
				payloadSha256: sha256(payloadBytes),
				finalizedAt: new Date().toISOString(),
			},
			null,
			2,
		)}\n`,
	);
}

async function prepareEvidenceBundle() {
	const purpose = requiredArgument("--purpose");
	const controlRoot = requiredArgument("--control-root");
	const evidenceRoot = requiredArgument("--evidence-root");
	const workflowRoot = requiredArgument("--workflow-root");
	const initialReviewSha = requiredArgument("--initial-review-sha");
	const frozenCandidateSha = requiredArgument("--frozen-candidate-sha");
	const evidenceSha = process.env.GITHUB_SHA;
	if (!SHA_PATTERN.test(evidenceSha ?? ""))
		throw new Error("trusted workflow evidence SHA is invalid");
	const output = resolve(requiredArgument("--output"));
	validateShaChain(initialReviewSha, frozenCandidateSha, evidenceSha);
	const workflowSourceSha = process.env.GITHUB_SHA;
	if (!SHA_PATTERN.test(workflowSourceSha ?? ""))
		throw new Error("workflow source SHA is invalid");
	const control = assertMatchingControlManifests(
		controlRoot,
		frozenCandidateSha,
		evidenceRoot,
		evidenceSha,
	);
	assertMatchingControlManifests(
		controlRoot,
		frozenCandidateSha,
		workflowRoot,
		workflowSourceSha,
	);
	const evidenceCheckoutSha = execFileSync(
		"git",
		["-C", resolve(evidenceRoot), "rev-parse", "HEAD"],
		{ encoding: "utf8" },
	).trim();
	if (evidenceCheckoutSha !== evidenceSha)
		throw new Error("evidence checkout is not exact evidenceSha");
	assertLocalAncestry(
		workflowRoot,
		initialReviewSha,
		frozenCandidateSha,
		"initial-to-frozen",
	);
	assertLocalAncestry(
		workflowRoot,
		frozenCandidateSha,
		evidenceSha,
		"frozen-to-evidence",
	);
	assertLocalAncestry(
		workflowRoot,
		evidenceSha,
		workflowSourceSha,
		"evidence-to-workflow-source",
	);
	let payload;
	let macLifecycle = null;
	let macExternalProbe = null;
	let macExternalProbeBytes = null;
	if (purpose === "target-mac-deep") {
		const intermediateRunId = Number(requiredArgument("--intermediate-run-id"));
		const intermediateRunAttempt = Number(
			requiredArgument("--intermediate-run-attempt"),
		);
		const downloaded = await downloadSingleArtifact(
			githubClient(process.env.GITHUB_TOKEN),
			process.env.GITHUB_REPOSITORY,
			intermediateRunId,
			`v1-mac-finalized-${intermediateRunId}-attempt-${intermediateRunAttempt}`,
		);
		const files = defaultArchiveReader(downloaded.archiveBytes);
		if (
			files.size !== 2 ||
			!files.has("payload.json") ||
			!files.has("lifecycle.json")
		)
			throw new Error("finalized Mac intermediate artifact is malformed");
		payload = files.get("payload.json");
		macLifecycle = parseJson(files.get("lifecycle.json"), "Mac lifecycle");
		validateLifecycle(macLifecycle, frozenCandidateSha, control.sha);
		if (macLifecycle.intermediateRunAttempt !== intermediateRunAttempt)
			throw new Error("Mac intermediate run attempt does not match");
		if (macLifecycle.payloadSha256 !== sha256(payload))
			throw new Error("Mac lifecycle payload hash does not match");
		macExternalProbeBytes = decodeExternalProbeBase64(
			requiredArgument("--runner-probe-base64"),
		);
		macExternalProbe = parseJson(
			macExternalProbeBytes,
			"external Mac runner probe",
		);
		validateExternalMacProbe(
			macExternalProbe,
			macLifecycle,
			process.env.GITHUB_REPOSITORY,
		);
		macExternalProbe = {
			path: "mac-external-probe.json",
			bytes: macExternalProbeBytes.byteLength,
			sha256: sha256(macExternalProbeBytes),
		};
	} else {
		payload = readFileSync(
			safePayload(evidenceRoot, requiredArgument("--payload")),
		);
	}
	const payloadIdentity = inspectPayload(purpose, payload);
	const reviewerAgentId = argument("--reviewer-agent-id");
	const reviewerSessionId = argument("--reviewer-session-id");
	if (
		payloadIdentity.reviewerAgentId !== reviewerAgentId ||
		payloadIdentity.reviewerSessionId !== reviewerSessionId
	)
		throw new Error("workflow reviewer identity does not match the payload");
	const expectedSource = purpose.startsWith("review:")
		? initialReviewSha
		: frozenCandidateSha;
	if (payloadIdentity.sourceSha !== expectedSource)
		throw new Error("payload source is not bound to the declared SHA chain");
	const runId = Number(process.env.GITHUB_RUN_ID);
	const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
	if (
		process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
		process.env.GITHUB_WORKFLOW !== WORKFLOW_NAME ||
		!process.env.GITHUB_WORKFLOW_REF?.includes(WORKFLOW_PATH) ||
		!positiveInteger(runId) ||
		!positiveInteger(runAttempt)
	)
		throw new Error(
			"finalizer is not the exact manually dispatched evidence workflow",
		);
	mkdirSync(output, { recursive: false });
	writeFileSync(join(output, "payload.json"), payload);
	if (macExternalProbeBytes !== null)
		writeFileSync(
			join(output, "mac-external-probe.json"),
			macExternalProbeBytes,
		);
	const receipt = {
		schemaVersion: "eonfolk-v1-github-evidence-receipt-v2",
		identityBoundary:
			"CONTROL_BLOBS_AND_GITHUB_RUN_VERIFIED; REVIEWER_AGENT_ID_SELF_REPORTED",
		purpose,
		sourceSha: payloadIdentity.sourceSha,
		initialReviewSha,
		frozenCandidateSha,
		evidenceSha,
		control,
		workflowSourceSha,
		workflowPath: WORKFLOW_PATH,
		workflowRef: process.env.GITHUB_REF,
		repository: process.env.GITHUB_REPOSITORY,
		operatorActor: process.env.GITHUB_ACTOR,
		runId,
		runAttempt,
		reviewerAgentId,
		reviewerSessionId,
		macLifecycle,
		macExternalProbe,
		payload: {
			path: "payload.json",
			bytes: payload.byteLength,
			sha256: sha256(payload),
		},
	};
	validateReceipt(receipt);
	writeFileSync(
		join(output, "receipt.json"),
		`${JSON.stringify(receipt, null, 2)}\n`,
	);
}

function githubClient(token) {
	if (typeof token !== "string" || token.length < 1)
		throw new Error("GitHub token is required for live evidence verification");
	const request = async (
		url,
		{ authenticated = true, redirect = "follow" } = {},
	) =>
		fetch(url.startsWith("https://") ? url : `https://api.github.com${url}`, {
			headers: authenticated
				? {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${token}`,
						"X-GitHub-Api-Version": "2022-11-28",
					}
				: {},
			redirect,
		});
	return {
		async json(path) {
			const response = await request(path);
			if (!response.ok)
				throw new Error(`GitHub API ${path} returned ${response.status}`);
			return response.json();
		},
		async bytes(url) {
			if (new URL(url).origin !== "https://api.github.com")
				throw new Error("GitHub artifact API URL is outside api.github.com");
			const first = await request(url, { redirect: "manual" });
			if (![301, 302, 303, 307, 308].includes(first.status))
				throw new Error(`GitHub artifact download returned ${first.status}`);
			const location = first.headers.get("location");
			if (location === null || !location.startsWith("https://"))
				throw new Error("GitHub artifact redirect is invalid");
			const second = await request(location, {
				authenticated: false,
				redirect: "error",
			});
			if (!second.ok)
				throw new Error(`GitHub artifact bytes returned ${second.status}`);
			return new Uint8Array(await second.arrayBuffer());
		},
	};
}

async function verifyConfiguredEvidence() {
	const configPath = requiredArgument("--run-ids-config");
	const output = resolve(requiredArgument("--output"));
	const payloadDir = resolve(requiredArgument("--payload-dir"));
	if (!isAbsolute(configPath) || lstatSync(configPath).isSymbolicLink())
		throw new Error(
			"run ID configuration must be an absolute non-symlink file",
		);
	mkdirSync(payloadDir, { recursive: false });
	const client = githubClient(process.env.GITHUB_TOKEN);
	let attestationRun = null;
	if (process.env.GITHUB_EVENT_NAME === "push") {
		const currentRunId = Number(process.env.GITHUB_RUN_ID);
		if (!positiveInteger(currentRunId))
			throw new Error("postmerge push run ID is invalid");
		attestationRun = await client.json(
			`/repos/${requiredArgument("--repository")}/actions/runs/${currentRunId}`,
		);
	}
	const registry = await verifyGithubEvidenceRuns({
		runIds: parseRunIdConfiguration(readFileSync(configPath, "utf8")),
		repository: requiredArgument("--repository"),
		expectedEvidenceSha: requiredArgument("--expected-evidence-sha"),
		expectedOwner: requiredArgument("--expected-owner"),
		expectedOperator: requiredArgument("--expected-operator"),
		client,
		attestationRun,
		onPayload: (purpose, bytes) =>
			writeFileSync(join(payloadDir, `${purposeSlug(purpose)}.json`), bytes, {
				flag: "wx",
			}),
	});
	writeFileSync(output, `${JSON.stringify(registry, null, 2)}\n`, {
		flag: "wx",
	});
}

async function main() {
	switch (process.argv[2]) {
		case "compare-controls":
			assertMatchingControlManifests(
				requiredArgument("--control-root"),
				requiredArgument("--control-sha"),
				requiredArgument("--other-root"),
				requiredArgument("--other-sha"),
			);
			break;
		case "finalize-mac":
			await finalizeMacIntermediate();
			break;
		case "prepare":
			await prepareEvidenceBundle();
			break;
		case "repository-preflight":
			await repositoryPreflight();
			break;
		case "verify":
			await verifyConfiguredEvidence();
			break;
		case "purpose-slug":
			process.stdout.write(`${purposeSlug(requiredArgument("--purpose"))}\n`);
			break;
		default:
			throw new Error(
				"usage: v1-github-evidence.mjs compare-controls|finalize-mac|prepare|repository-preflight|verify|purpose-slug [options]",
			);
	}
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""))
	await main();
