import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	lstatSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const WORKFLOW_PATH = ".github/workflows/ci.yml";
const WORKFLOW_NAME = "CI";
const MAC_LABELS = Object.freeze([
	"self-hosted",
	"macOS",
	"ARM64",
	"eonfolk-ephemeral-deep",
]);
export const CONTROL_PATHS = Object.freeze([
	WORKFLOW_PATH,
	"scripts/v1-github-evidence.mjs",
	"scripts/check-v1-readiness.mjs",
	"scripts/run-verification-tier.mjs",
	"scripts/validate-dependency-cohort.mjs",
	"scripts/formal-toolchain.mjs",
	"scripts/check-formal.mjs",
]);
const REVIEW_PURPOSES = Object.freeze([
	"review:V1-RV-PRODUCT",
	"review:V1-RV-SYSTEMS",
	"review:V1-RV-VISUAL",
	"review:V1-RV-COGNITION",
	"review:V1-RV-PERSISTENCE",
	"review:V1-RV-CI",
]);
export const REQUIRED_EVIDENCE_PURPOSES = Object.freeze([
	"target-mac-deep",
	...REVIEW_PURPOSES,
	"final-confirmation",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

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
}

function validateLifecycle(lifecycle, frozenCandidateSha, controlSha) {
	if (
		!exactKeys(lifecycle, [
			"controlSha",
			"finalizedAt",
			"frozenCandidateSha",
			"intermediateRunId",
			"intermediateWorkflowSourceSha",
			"nonAdminUser",
			"payloadSha256",
			"preflight",
			"runnerName",
			"runnerUser",
			"schemaVersion",
			"teardown",
		]) ||
		lifecycle.schemaVersion !== "eonfolk-v1-mac-lifecycle-v1" ||
		lifecycle.controlSha !== controlSha ||
		lifecycle.frozenCandidateSha !== frozenCandidateSha ||
		!positiveInteger(lifecycle.intermediateRunId) ||
		!SHA_PATTERN.test(lifecycle.intermediateWorkflowSourceSha ?? "") ||
		!nonemptyIdentity(lifecycle.runnerName) ||
		!nonemptyIdentity(lifecycle.runnerUser) ||
		lifecycle.nonAdminUser !== true ||
		lifecycle.preflight !== "AVAILABLE_IDLE_EXACT_LABELS" ||
		lifecycle.teardown !== "RUNNER_DEREGISTERED_AFTER_JOB" ||
		!HASH_PATTERN.test(lifecycle.payloadSha256 ?? "") ||
		!Number.isFinite(Date.parse(lifecycle.finalizedAt ?? ""))
	)
		throw new Error("target-Mac lifecycle evidence is invalid");
}

function validateReceipt(receipt) {
	if (
		!exactKeys(receipt, [
			"control",
			"evidenceSha",
			"frozenCandidateSha",
			"identityBoundary",
			"initialReviewSha",
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
	if (receipt.purpose === "target-mac-deep")
		validateLifecycle(
			receipt.macLifecycle,
			receipt.frozenCandidateSha,
			receipt.control.sha,
		);
	else if (receipt.macLifecycle !== null)
		throw new Error("non-Mac evidence cannot assert a Mac lifecycle");
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
		!nonemptyIdentity(run?.actor?.login)
	)
		throw new Error(`run ${runId} actor, source, or attempt is invalid`);
}

async function downloadSingleArtifact(client, repository, runId, artifactName) {
	const listed = await client.json(
		`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
	);
	const matches = (
		Array.isArray(listed?.artifacts) ? listed.artifacts : []
	).filter(({ name }) => name === artifactName);
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

async function runnerIsRegistered(client, repository, runnerName) {
	const response = await client.json(
		`/repos/${repository}/actions/runners?per_page=100`,
	);
	return (Array.isArray(response?.runners) ? response.runners : []).find(
		({ name }) => name === runnerName,
	);
}

async function verifyMacLifecycle(client, repository, lifecycle, control) {
	const run = await client.json(
		`/repos/${repository}/actions/runs/${lifecycle.intermediateRunId}`,
	);
	validateRun(run, repository, lifecycle.intermediateRunId);
	if (run.head_sha !== lifecycle.intermediateWorkflowSourceSha)
		throw new Error(
			"Mac lifecycle workflow source does not match its live run",
		);
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
	for (const name of [
		"Mac runner availability preflight",
		"Target-Mac exact 30-step DEEP intermediate",
		"Clean hosted Mac evidence finalizer",
	])
		if (
			entries.filter((job) => job.name === name && job.conclusion === "success")
				.length !== 1
		)
			throw new Error(`Mac lifecycle job ${name} is absent or unsuccessful`);
	const macJob = entries.find(
		({ name }) => name === "Target-Mac exact 30-step DEEP intermediate",
	);
	if (
		macJob?.runner_name !== lifecycle.runnerName ||
		!MAC_LABELS.every((label) => macJob?.labels?.includes(label))
	)
		throw new Error("Mac lifecycle runner identity or labels do not match");
	if (
		(await runnerIsRegistered(client, repository, lifecycle.runnerName)) !==
		undefined
	)
		throw new Error("ephemeral Mac runner remains registered after its job");
}

export async function verifyGithubEvidenceRuns({
	runIds,
	repository,
	expectedEvidenceSha,
	client,
	archiveReader = defaultArchiveReader,
	now = () => new Date().toISOString(),
	onPayload = () => {},
}) {
	if (!Array.isArray(runIds) || runIds.length === 0)
		throw new Error("no evidence producer runs were configured");
	if (typeof repository !== "string" || !/^[^/]+\/[^/]+$/u.test(repository))
		throw new Error("repository identity is invalid");
	if (!SHA_PATTERN.test(expectedEvidenceSha ?? ""))
		throw new Error("expected evidence SHA is invalid");
	const main = await client.json(`/repos/${repository}/branches/main`);
	if (
		main?.name !== "main" ||
		main?.protected !== true ||
		!SHA_PATTERN.test(main?.commit?.sha ?? "")
	)
		throw new Error("main is not API-verified as protected");
	const records = [];
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
			files.size !== 2 ||
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
		if (
			!(payloadBytes instanceof Uint8Array) ||
			receipt.runId !== runId ||
			receipt.runAttempt !== run.run_attempt ||
			receipt.repository !== repository ||
			receipt.operatorActor !== run.actor.login ||
			receipt.workflowSourceSha !== run.head_sha ||
			receipt.evidenceSha !== expectedEvidenceSha ||
			receipt.payload.bytes !== payloadBytes.byteLength ||
			receipt.payload.sha256 !== sha256(payloadBytes) ||
			finalArtifacts[0].name !==
				`v1-evidence-${purposeSlug(receipt.purpose)}-${runId}`
		)
			throw new Error(
				`run ${runId} receipt does not match live GitHub metadata`,
			);
		const identity = inspectPayload(receipt.purpose, payloadBytes);
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
				receipt.control,
			);
		const mainComparison = await client.json(
			`/repos/${repository}/compare/${receipt.evidenceSha}...${main.commit.sha}`,
		);
		const inProtectedMain =
			receipt.evidenceSha === main.commit.sha ||
			(["ahead", "identical"].includes(mainComparison?.status) &&
				mainComparison?.merge_base_commit?.sha === receipt.evidenceSha);
		const attestationClass =
			run.head_branch === "main" && inProtectedMain
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
				macLifecycle: receipt.macLifecycle,
				payloadSha256: receipt.payload.sha256,
				provider: "github-actions-live-api",
				purpose: receipt.purpose,
				repository,
				reviewerAgentId: receipt.reviewerAgentId,
				reviewerSessionId: receipt.reviewerSessionId,
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
			record.attestationClass !== first.attestationClass
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
		schemaVersion: "eonfolk-live-verified-github-runs-v2",
		trustBoundary:
			"LIVE_GITHUB_AND_CONTROL_BLOB_VERIFICATION; PREMERGE_CLASS_IS_CANDIDATE_CONTROLLED; REVIEWER_AGENT_IDENTITY_IS_SELF_REPORTED",
		verifiedAt: now(),
	});
	return Object.freeze({
		...unsigned,
		outputSha256: sha256(JSON.stringify(unsigned)),
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

async function runnerPreflight() {
	const repository = requiredArgument("--repository");
	const runnerName = requiredArgument("--runner-name");
	const runner = await runnerIsRegistered(
		githubClient(process.env.GITHUB_TOKEN),
		repository,
		runnerName,
	);
	if (
		runner === undefined ||
		runner.status !== "online" ||
		runner.busy !== false ||
		!MAC_LABELS.every((label) =>
			runner.labels?.some(({ name }) => name === label),
		)
	)
		throw new Error(
			"exact ephemeral Mac runner is not online, idle, and fully labeled",
		);
}

async function finalizeMacIntermediate() {
	const repository = requiredArgument("--repository");
	const runId = Number(requiredArgument("--run-id"));
	const runnerName = requiredArgument("--runner-name");
	const output = resolve(requiredArgument("--output"));
	const client = githubClient(process.env.GITHUB_TOKEN);
	const downloaded = await downloadSingleArtifact(
		client,
		repository,
		runId,
		`v1-mac-raw-${runId}`,
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
			"nonAdminUser",
			"runnerName",
			"runnerUser",
			"schemaVersion",
		]) ||
		runner.schemaVersion !== "eonfolk-v1-mac-runner-v1" ||
		runner.controlSha !== controlSha ||
		runner.frozenCandidateSha !== frozenCandidateSha ||
		runner.runnerName !== runnerName ||
		runner.nonAdminUser !== true ||
		!nonemptyIdentity(runner.runnerUser)
	)
		throw new Error(
			"Mac runner record does not prove the required non-admin identity",
		);
	inspectPayload("target-mac-deep", payloadBytes);
	let remainingRunner;
	for (let attempt = 0; attempt < 10; attempt += 1) {
		remainingRunner = await runnerIsRegistered(client, repository, runnerName);
		if (remainingRunner === undefined) break;
		await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
	}
	if (remainingRunner !== undefined)
		throw new Error("ephemeral Mac runner is still registered after its job");
	mkdirSync(output, { recursive: false });
	writeFileSync(join(output, "payload.json"), payloadBytes);
	writeFileSync(
		join(output, "lifecycle.json"),
		`${JSON.stringify(
			{
				schemaVersion: "eonfolk-v1-mac-lifecycle-v1",
				controlSha,
				frozenCandidateSha,
				intermediateRunId: runId,
				intermediateWorkflowSourceSha: process.env.GITHUB_SHA,
				runnerName,
				runnerUser: runner.runnerUser,
				nonAdminUser: true,
				preflight: "AVAILABLE_IDLE_EXACT_LABELS",
				teardown: "RUNNER_DEREGISTERED_AFTER_JOB",
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
	const evidenceSha = requiredArgument("--evidence-sha");
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
	if (purpose === "target-mac-deep") {
		const intermediateRunId = Number(requiredArgument("--intermediate-run-id"));
		const downloaded = await downloadSingleArtifact(
			githubClient(process.env.GITHUB_TOKEN),
			process.env.GITHUB_REPOSITORY,
			intermediateRunId,
			`v1-mac-finalized-${intermediateRunId}`,
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
		if (macLifecycle.payloadSha256 !== sha256(payload))
			throw new Error("Mac lifecycle payload hash does not match");
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
	const registry = await verifyGithubEvidenceRuns({
		runIds: parseRunIdConfiguration(readFileSync(configPath, "utf8")),
		repository: requiredArgument("--repository"),
		expectedEvidenceSha: requiredArgument("--expected-evidence-sha"),
		client: githubClient(process.env.GITHUB_TOKEN),
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
		case "runner-preflight":
			await runnerPreflight();
			break;
		case "finalize-mac":
			await finalizeMacIntermediate();
			break;
		case "prepare":
			await prepareEvidenceBundle();
			break;
		case "verify":
			await verifyConfiguredEvidence();
			break;
		case "purpose-slug":
			process.stdout.write(`${purposeSlug(requiredArgument("--purpose"))}\n`);
			break;
		default:
			throw new Error(
				"usage: v1-github-evidence.mjs compare-controls|runner-preflight|finalize-mac|prepare|verify|purpose-slug [options]",
			);
	}
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""))
	await main();
