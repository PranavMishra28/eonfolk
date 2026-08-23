import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	copyFileSync,
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
const WORKFLOW_PATH = ".github/workflows/v1-evidence.yml";
const WORKFLOW_NAME = "V1 release evidence";
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
			!SHA_PATTERN.test(payload.source?.start?.commit ?? "")
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
			payload.schemaVersion !== "eonfolk-v1-final-confirmation-v2" ||
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
		payload.schemaVersion !== "eonfolk-v1-structured-review-v2" ||
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

function validateReceipt(receipt) {
	if (
		!exactKeys(receipt, [
			"candidateSha",
			"identityBoundary",
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
		receipt.schemaVersion !== "eonfolk-v1-github-evidence-receipt-v1" ||
		receipt.identityBoundary !==
			"GITHUB_OPERATOR_AND_RUN_VERIFIED_REVIEWER_AGENT_ID_SELF_REPORTED" ||
		!REQUIRED_EVIDENCE_PURPOSES.includes(receipt.purpose) ||
		!SHA_PATTERN.test(receipt.sourceSha ?? "") ||
		!SHA_PATTERN.test(receipt.candidateSha ?? "") ||
		!SHA_PATTERN.test(receipt.workflowSourceSha ?? "") ||
		receipt.workflowPath !== WORKFLOW_PATH ||
		receipt.workflowRef !== "refs/heads/main" ||
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
	const reviewerRequired = receipt.purpose !== "target-mac-deep";
	if (
		reviewerRequired !==
			(nonemptyIdentity(receipt.reviewerAgentId) &&
				nonemptyIdentity(receipt.reviewerSessionId)) ||
		(!reviewerRequired &&
			(receipt.reviewerAgentId !== null || receipt.reviewerSessionId !== null))
	)
		throw new Error("evidence receipt reviewer identity is invalid");
}

function validateRun(run, repository, runId) {
	if (run?.id !== runId) throw new Error(`run ${runId} identity is fabricated`);
	if (run?.repository?.full_name !== repository)
		throw new Error(`run ${runId} repository does not match`);
	if (run?.status !== "completed" || run?.conclusion !== "success")
		throw new Error(`run ${runId} did not complete successfully`);
	if (run?.event !== "workflow_dispatch")
		throw new Error(`run ${runId} was not manually dispatched`);
	if (run?.head_branch !== "main" || !SHA_PATTERN.test(run?.head_sha ?? ""))
		throw new Error(`run ${runId} did not execute from main`);
	if (
		!positiveInteger(run?.run_attempt) ||
		!nonemptyIdentity(run?.actor?.login)
	)
		throw new Error(`run ${runId} actor or attempt is invalid`);
}

function validateWorkflow(workflow, runId, workflowId) {
	if (
		workflow?.id !== workflowId ||
		workflow?.path !== WORKFLOW_PATH ||
		workflow?.name !== WORKFLOW_NAME ||
		workflow?.state !== "active"
	)
		throw new Error(`run ${runId} used the wrong workflow identity`);
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
		if (
			names.length !== 2 ||
			new Set(names).size !== names.length ||
			!names.includes("receipt.json") ||
			!names.includes("payload.json")
		)
			throw new Error("evidence artifact has unexpected archive entries");
		return new Map(
			names.map((name) => [name, execFileSync("unzip", ["-p", archive, name])]),
		);
	} finally {
		rmSync(scratch, { force: true, recursive: true });
	}
}

async function verifyCommitRelationship(client, repository, source, candidate) {
	await client.json(`/repos/${repository}/commits/${source}`);
	await client.json(`/repos/${repository}/commits/${candidate}`);
	const comparison = await client.json(
		`/repos/${repository}/compare/${source}...${candidate}`,
	);
	if (
		!["ahead", "identical"].includes(comparison?.status) ||
		comparison?.merge_base_commit?.sha !== source
	)
		throw new Error("evidence source is not an ancestor of its candidate");
}

export async function verifyGithubEvidenceRuns({
	runIds,
	repository,
	client,
	archiveReader = defaultArchiveReader,
	now = () => new Date().toISOString(),
}) {
	if (!Array.isArray(runIds) || runIds.length === 0)
		throw new Error("no evidence producer runs were configured");
	if (typeof repository !== "string" || !/^[^/]+\/[^/]+$/u.test(repository))
		throw new Error("repository identity is invalid");
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
		validateWorkflow(workflow, runId, run.workflow_id);
		const jobsResponse = await client.json(
			`/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
		);
		const successfulJobs = Array.isArray(jobsResponse?.jobs)
			? jobsResponse.jobs.filter((job) => job?.conclusion === "success")
			: [];
		const expectedJobName =
			successfulJobs.find(
				({ name }) =>
					name === "Target-Mac exact 30-step DEEP" ||
					name === "Review or confirmation receipt",
			) ?? null;
		if (successfulJobs.length !== 1 || expectedJobName === null)
			throw new Error(
				`run ${runId} has no unique successful evidence producer`,
			);
		const mainComparison = await client.json(
			`/repos/${repository}/compare/${run.head_sha}...${main.commit.sha}`,
		);
		if (
			!["ahead", "identical"].includes(mainComparison?.status) ||
			mainComparison?.merge_base_commit?.sha !== run.head_sha
		)
			throw new Error(`run ${runId} workflow source is not in protected main`);
		const listed = await client.json(
			`/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
		);
		const artifacts = Array.isArray(listed?.artifacts) ? listed.artifacts : [];
		if (artifacts.length !== 1)
			throw new Error(`run ${runId} must expose exactly one evidence artifact`);
		const artifact = artifacts[0];
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
		const files = archiveReader(archiveBytes);
		if (!(files instanceof Map))
			throw new Error(`run ${runId} archive reader returned an invalid result`);
		const receipt = parseJson(
			files.get("receipt.json"),
			`run ${runId} receipt`,
		);
		const payloadBytes = files.get("payload.json");
		if (!(payloadBytes instanceof Uint8Array))
			throw new Error(`run ${runId} payload is missing`);
		validateReceipt(receipt);
		if (
			receipt.runId !== runId ||
			receipt.runAttempt !== run.run_attempt ||
			receipt.repository !== repository ||
			receipt.operatorActor !== run.actor.login ||
			receipt.workflowSourceSha !== run.head_sha ||
			receipt.payload.bytes !== payloadBytes.byteLength ||
			receipt.payload.sha256 !== sha256(payloadBytes) ||
			artifact.name !== `v1-evidence-${purposeSlug(receipt.purpose)}-${runId}`
		)
			throw new Error(
				`run ${runId} receipt does not match live GitHub metadata`,
			);
		const payloadIdentity = inspectPayload(receipt.purpose, payloadBytes);
		const requiredJobName =
			receipt.purpose === "target-mac-deep"
				? "Target-Mac exact 30-step DEEP"
				: "Review or confirmation receipt";
		if (expectedJobName.name !== requiredJobName)
			throw new Error(`run ${runId} purpose used the wrong producer job`);
		const runnerLabels = Array.isArray(expectedJobName.labels)
			? expectedJobName.labels
			: [];
		const expectedLabels =
			receipt.purpose === "target-mac-deep"
				? ["self-hosted", "macOS", "ARM64", "eonfolk-ephemeral-deep"]
				: ["ubuntu-24.04"];
		if (
			!expectedLabels.every((label) => runnerLabels.includes(label)) ||
			(receipt.purpose !== "target-mac-deep" &&
				runnerLabels.includes("self-hosted")) ||
			typeof expectedJobName.runner_name !== "string" ||
			expectedJobName.runner_name.trim().length === 0
		)
			throw new Error(`run ${runId} executed on the wrong producer runner`);
		if (
			payloadIdentity.sourceSha !== receipt.sourceSha ||
			payloadIdentity.reviewerAgentId !== receipt.reviewerAgentId ||
			payloadIdentity.reviewerSessionId !== receipt.reviewerSessionId
		)
			throw new Error(
				`run ${runId} payload identity does not match its receipt`,
			);
		if (
			(receipt.purpose === "target-mac-deep" ||
				receipt.purpose === "final-confirmation") &&
			receipt.sourceSha !== receipt.candidateSha
		)
			throw new Error(`run ${runId} did not bind the final candidate directly`);
		await verifyCommitRelationship(
			client,
			repository,
			receipt.sourceSha,
			receipt.candidateSha,
		);
		records.push(
			Object.freeze({
				actor: run.actor.login,
				artifactArchiveSha256: archiveSha256,
				artifactId: artifact.id,
				artifactName: artifact.name,
				candidateSha: receipt.candidateSha,
				conclusion: run.conclusion,
				event: run.event,
				payloadSha256: receipt.payload.sha256,
				provider: "github-actions-live-api",
				purpose: receipt.purpose,
				repository,
				reviewerAgentId: receipt.reviewerAgentId,
				reviewerSessionId: receipt.reviewerSessionId,
				runnerLabels: [...runnerLabels].sort(),
				runnerName: expectedJobName.runner_name,
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
		schemaVersion: "eonfolk-live-verified-github-runs-v1",
		trustBoundary:
			"LIVE_GITHUB_API_METADATA_AND_DOWNLOADED_ARTIFACT_BYTES; REVIEWER_AGENT_IDENTITY_IS_SELF_REPORTED",
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
		throw new Error("evidence payload escaped the candidate checkout");
	return real;
}

function prepareEvidenceBundle() {
	const purpose = requiredArgument("--purpose");
	const candidateRoot = requiredArgument("--candidate-root");
	const candidateSha = requiredArgument("--candidate-sha");
	const payloadPath = requiredArgument("--payload");
	const output = resolve(requiredArgument("--output"));
	if (!REQUIRED_EVIDENCE_PURPOSES.includes(purpose))
		throw new Error("unsupported evidence purpose");
	if (!SHA_PATTERN.test(candidateSha))
		throw new Error("candidate SHA is invalid");
	const checkoutSha = execFileSync(
		"git",
		["-C", resolve(candidateRoot), "rev-parse", "HEAD"],
		{ encoding: "utf8" },
	).trim();
	if (checkoutSha !== candidateSha)
		throw new Error("candidate checkout does not match the requested SHA");
	if (
		process.env.GITHUB_REF !== "refs/heads/main" ||
		process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
		process.env.GITHUB_WORKFLOW !== WORKFLOW_NAME ||
		!process.env.GITHUB_WORKFLOW_REF?.includes(
			`${WORKFLOW_PATH}@refs/heads/main`,
		)
	)
		throw new Error("evidence producer did not execute from the main workflow");
	const payload = safePayload(candidateRoot, payloadPath);
	const payloadBytes = readFileSync(payload);
	const payloadIdentity = inspectPayload(purpose, payloadBytes);
	const reviewerAgentId = argument("--reviewer-agent-id");
	const reviewerSessionId = argument("--reviewer-session-id");
	if (
		payloadIdentity.reviewerAgentId !== reviewerAgentId ||
		payloadIdentity.reviewerSessionId !== reviewerSessionId
	)
		throw new Error("workflow reviewer identity does not match the payload");
	const runId = Number(process.env.GITHUB_RUN_ID);
	const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
	const workflowSourceSha = process.env.GITHUB_SHA;
	if (!positiveInteger(runId) || !positiveInteger(runAttempt))
		throw new Error("GitHub run identity is invalid");
	if (!SHA_PATTERN.test(workflowSourceSha ?? ""))
		throw new Error("workflow source SHA is invalid");
	mkdirSync(output, { recursive: false });
	copyFileSync(payload, join(output, "payload.json"));
	const receipt = {
		schemaVersion: "eonfolk-v1-github-evidence-receipt-v1",
		identityBoundary:
			"GITHUB_OPERATOR_AND_RUN_VERIFIED_REVIEWER_AGENT_ID_SELF_REPORTED",
		purpose,
		sourceSha: payloadIdentity.sourceSha,
		candidateSha,
		workflowSourceSha,
		workflowPath: WORKFLOW_PATH,
		workflowRef: "refs/heads/main",
		repository: process.env.GITHUB_REPOSITORY,
		operatorActor: process.env.GITHUB_ACTOR,
		runId,
		runAttempt,
		reviewerAgentId,
		reviewerSessionId,
		payload: {
			path: "payload.json",
			bytes: payloadBytes.byteLength,
			sha256: sha256(payloadBytes),
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
	) => {
		const response = await fetch(
			url.startsWith("https://") ? url : `https://api.github.com${url}`,
			{
				headers: authenticated
					? {
							Accept: "application/vnd.github+json",
							Authorization: `Bearer ${token}`,
							"X-GitHub-Api-Version": "2022-11-28",
						}
					: {},
				redirect,
			},
		);
		return response;
	};
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
	if (!isAbsolute(configPath) || lstatSync(configPath).isSymbolicLink())
		throw new Error(
			"run ID configuration must be an absolute non-symlink file",
		);
	const runIds = parseRunIdConfiguration(readFileSync(configPath, "utf8"));
	const registry = await verifyGithubEvidenceRuns({
		runIds,
		repository: requiredArgument("--repository"),
		client: githubClient(process.env.GITHUB_TOKEN),
	});
	writeFileSync(output, `${JSON.stringify(registry, null, 2)}\n`, {
		flag: "wx",
	});
}

async function main() {
	switch (process.argv[2]) {
		case "prepare":
			prepareEvidenceBundle();
			break;
		case "verify":
			await verifyConfiguredEvidence();
			break;
		case "purpose-slug":
			process.stdout.write(`${purposeSlug(requiredArgument("--purpose"))}\n`);
			break;
		default:
			throw new Error(
				"usage: v1-github-evidence.mjs prepare|verify|purpose-slug [options]",
			);
	}
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""))
	await main();
