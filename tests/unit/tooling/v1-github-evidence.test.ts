import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
	CONTROL_PATHS,
	parseRunIdConfiguration,
	purposeSlug,
	REQUIRED_EVIDENCE_PURPOSES,
	verifyGithubEvidenceRuns,
} from "../../../scripts/v1-github-evidence.mjs";

const hash = (value: string | Uint8Array) =>
	createHash("sha256").update(value).digest("hex");
const repository = "owner/repo";
const initialReviewSha = "a".repeat(40);
const frozenCandidateSha = "b".repeat(40);
const evidenceSha = "c".repeat(40);
const runnerNonce = "fixture01";
const runnerName = `eonfolk-deep-${runnerNonce}`;
const runnerLabels = [
	"ARM64",
	`eonfolk-ephemeral-deep-${runnerNonce}`,
	"macOS",
	"self-hosted",
];
const evidenceTag = "refs/tags/eonfolk-evidence-fixture01";
const intermediateTag = "refs/tags/eonfolk-evidence-intermediate01";
const controlFiles = CONTROL_PATHS.map((path, index) => ({
	path,
	mode: "100644",
	blobSha: String(index + 1).repeat(40),
}));

function payloadFor(purpose: string, index: number) {
	if (purpose === "target-mac-deep")
		return {
			bytes: Buffer.from(
				JSON.stringify({
					schemaVersion: "eonfolk-verification-tier-v3",
					tier: "deep",
					status: "PASS",
					source: {
						start: { commit: frozenCandidateSha },
						end: { commit: frozenCandidateSha },
					},
				}),
			),
			reviewerAgentId: null,
			reviewerSessionId: null,
		};
	const reviewerAgentId = `codex-review-agent-${index}`;
	const reviewerSessionId = `codex-review-session-${index}`;
	if (purpose === "final-confirmation")
		return {
			bytes: Buffer.from(
				JSON.stringify({
					schemaVersion: "eonfolk-v1-final-confirmation-v3",
					status: "PASS",
					sourceSha: frozenCandidateSha,
					reviewerAgentId,
					reviewerSessionId,
				}),
			),
			reviewerAgentId,
			reviewerSessionId,
		};
	const reviewId = purpose.slice("review:".length);
	return {
		bytes: Buffer.from(
			JSON.stringify({
				schemaVersion: "eonfolk-v1-structured-review-v3",
				reviewId,
				sourceSha: initialReviewSha,
				reviewerAgentId,
				reviewerSessionId,
			}),
		),
		reviewerAgentId,
		reviewerSessionId,
	};
}

type Mutation = Readonly<{
	readonly autoDeleteBranches?: boolean;
	readonly duplicateReviewerSessions?: boolean;
	readonly postMergeWorkflowSource?: boolean;
	readonly wrongControlBlob?: boolean;
	readonly badExternalProbe?: boolean;
	readonly run?: (value: Record<string, any>) => void;
	readonly workflow?: (value: Record<string, any>) => void;
	readonly receipt?: (value: Record<string, any>) => void;
	readonly artifact?: (value: Record<string, any>) => void;
}>;

function fixture(mutation: Mutation = {}) {
	const workflowSourceSha = mutation.postMergeWorkflowSource
		? "d".repeat(40)
		: evidenceSha;
	const mainSha = mutation.postMergeWorkflowSource
		? workflowSourceSha
		: "f".repeat(40);
	const archives = new Map<number, ReadonlyMap<string, Uint8Array>>();
	const archiveBytes = new Map<number, Uint8Array>();
	const runs = new Map<number, Record<string, any>>();
	const artifacts = new Map<number, Record<string, any>>();
	for (const [index, purpose] of REQUIRED_EVIDENCE_PURPOSES.entries()) {
		const runId = index + 1;
		let payload = payloadFor(purpose, index);
		if (
			mutation.duplicateReviewerSessions === true &&
			purpose !== "target-mac-deep"
		) {
			const parsed = JSON.parse(payload.bytes.toString("utf8"));
			parsed.reviewerSessionId = "codex-review-session-duplicate";
			payload = {
				...payload,
				bytes: Buffer.from(JSON.stringify(parsed)),
				reviewerSessionId: parsed.reviewerSessionId,
			};
		}
		const receipt: Record<string, any> = {
			schemaVersion: "eonfolk-v1-github-evidence-receipt-v2",
			identityBoundary:
				"CONTROL_BLOBS_AND_GITHUB_RUN_VERIFIED; REVIEWER_AGENT_ID_SELF_REPORTED",
			purpose,
			sourceSha: purpose.startsWith("review:")
				? initialReviewSha
				: frozenCandidateSha,
			initialReviewSha,
			frozenCandidateSha,
			evidenceSha,
			control: { sha: frozenCandidateSha, files: controlFiles },
			workflowSourceSha,
			workflowPath: ".github/workflows/ci.yml",
			workflowRef: evidenceTag,
			repository,
			operatorActor: "release-operator",
			runId,
			runAttempt: 1,
			reviewerAgentId: payload.reviewerAgentId,
			reviewerSessionId: payload.reviewerSessionId,
			macLifecycle:
				purpose === "target-mac-deep"
					? {
							schemaVersion: "eonfolk-v1-mac-lifecycle-v2",
							controlSha: frozenCandidateSha,
							frozenCandidateSha,
							intermediateRunId: 99,
							intermediateRunAttempt: 1,
							intermediateWorkflowRef: intermediateTag,
							intermediateWorkflowSourceSha: frozenCandidateSha,
							runnerId: 501,
							runnerLabels,
							runnerName,
							runnerNonce,
							runnerUser: "eonfolk-ci-user",
							nonAdminCheckOutput:
								"user eonfolk-ci-user is NOT a member of group admin",
							nonAdminUser: true,
							preflight: "JOB_ASSIGNED_EXACT_NONCE_RUNNER",
							teardown: "EXTERNAL_COORDINATOR_PROBE_REQUIRED",
							payloadSha256: hash(payload.bytes),
							finalizedAt: "2026-08-23T00:00:00.000Z",
						}
					: null,
			macExternalProbe: null,
			payload: {
				path: "payload.json",
				bytes: payload.bytes.byteLength,
				sha256: hash(payload.bytes),
			},
		};
		if (purpose === "target-mac-deep") {
			const probeUnsigned = {
				schemaVersion: "eonfolk-v1-mac-external-probe-v1",
				boundary: "COORDINATOR_RECORDED_GH_API_OBSERVATION_NOT_CRYPTOGRAPHIC",
				probeMethod: "GH_API_REPOSITORY_RUNNERS",
				repository,
				intermediateRunId: 99,
				intermediateRunAttempt: 1,
				runnerId: 501,
				runnerName,
				runnerNonce,
				beforeRegistration: {
					observedAt: "2026-08-23T00:00:00.000Z",
					operatorActor: "release-operator",
					runnerCount: mutation.badExternalProbe === true ? 1 : 0,
				},
				afterRun: {
					observedAt: "2026-08-23T01:00:00.000Z",
					operatorActor: "release-operator",
					runnerAbsent: true,
				},
			};
			receipt.macExternalProbe = {
				...probeUnsigned,
				outputSha256: hash(JSON.stringify(probeUnsigned)),
			};
		}
		mutation.receipt?.(receipt);
		archives.set(
			runId,
			new Map([
				["receipt.json", Buffer.from(JSON.stringify(receipt))],
				["payload.json", payload.bytes],
			]),
		);
		const zipped = Buffer.from(`archive-${runId}`);
		archiveBytes.set(runId, zipped);
		const run: Record<string, any> = {
			id: runId,
			repository: { full_name: repository },
			status: "completed",
			conclusion: "success",
			event: "workflow_dispatch",
			head_branch: "eonfolk-evidence-fixture01",
			head_sha: workflowSourceSha,
			run_attempt: 1,
			actor: { login: "release-operator" },
			workflow_id: 42,
		};
		if (runId === 1) mutation.run?.(run);
		runs.set(runId, run);
		const artifact: Record<string, any> = {
			id: 100 + runId,
			name: `v1-evidence-${purposeSlug(purpose)}-${runId}-attempt-1`,
			expired: false,
			archive_download_url: `https://api.github.com/artifacts/${runId}`,
			digest: `sha256:${hash(zipped)}`,
		};
		if (runId === 1) mutation.artifact?.(artifact);
		artifacts.set(runId, artifact);
	}
	const workflow: Record<string, any> = {
		id: 42,
		path: ".github/workflows/ci.yml",
		name: "CI",
		state: "active",
	};
	mutation.workflow?.(workflow);
	const client = {
		async json(path: string) {
			if (path === `/repos/${repository}`)
				return {
					full_name: repository,
					owner: { login: "owner" },
					delete_branch_on_merge: mutation.autoDeleteBranches === true,
					allow_merge_commit: true,
					allow_squash_merge: false,
					allow_rebase_merge: false,
				};
			if (path === `/repos/${repository}/branches/main`)
				return {
					name: "main",
					protected: true,
					commit: { sha: mainSha },
				};
			if (
				path === `/repos/${repository}/git/ref/tags/eonfolk-evidence-fixture01`
			)
				return {
					ref: evidenceTag,
					object: { type: "commit", sha: workflowSourceSha },
				};
			if (
				path ===
				`/repos/${repository}/git/ref/tags/eonfolk-evidence-intermediate01`
			)
				return {
					ref: intermediateTag,
					object: { type: "commit", sha: frozenCandidateSha },
				};
			const runMatch = /\/actions\/runs\/(\d+)$/u.exec(path);
			if (runMatch !== null) {
				const run = runs.get(Number(runMatch[1]));
				if (Number(runMatch[1]) === 99)
					return {
						id: 99,
						repository: { full_name: repository },
						status: "completed",
						conclusion: "success",
						event: "workflow_dispatch",
						head_sha: frozenCandidateSha,
						run_attempt: 1,
						actor: { login: "release-operator" },
					};
				if (run === undefined) throw new Error("not found");
				return run;
			}
			if (path.endsWith("/actions/workflows/42")) return workflow;
			const jobsMatch = /\/actions\/runs\/(\d+)\/jobs/u.exec(path);
			if (jobsMatch !== null) {
				const runId = Number(jobsMatch[1]);
				return {
					jobs:
						runId === 99
							? [
									{
										name: "Mac immutable control preflight",
										conclusion: "success",
									},
									{
										name: "Target-Mac exact 30-step DEEP intermediate",
										conclusion: "success",
										runner_id: 501,
										runner_name: runnerName,
										labels: runnerLabels,
									},
									{
										name: "Clean hosted Mac evidence finalizer",
										conclusion: "success",
									},
								]
							: [
									{
										conclusion: "success",
										name: "Release evidence finalizer",
										runner_name: "GitHub Actions 1",
										labels: ["ubuntu-24.04"],
									},
								],
				};
			}
			if (path.includes("/git/trees/"))
				return {
					truncated: false,
					tree: controlFiles.map(({ path, mode, blobSha }, index) => ({
						path,
						mode,
						sha:
							mutation.wrongControlBlob === true && index === 0
								? "0".repeat(40)
								: blobSha,
						type: "blob",
					})),
				};
			const artifactMatch = /\/actions\/runs\/(\d+)\/artifacts/u.exec(path);
			if (artifactMatch !== null)
				return { artifacts: [artifacts.get(Number(artifactMatch[1]))] };
			if (path.includes("/compare/")) {
				const pair = path.split("/compare/")[1];
				const [ancestor, descendant] = pair.split("...");
				if (
					mutation.postMergeWorkflowSource !== true &&
					ancestor === evidenceSha &&
					descendant === mainSha
				)
					return {
						status: "diverged",
						merge_base_commit: { sha: "0".repeat(40) },
					};
				return { status: "ahead", merge_base_commit: { sha: ancestor } };
			}
			if (path.includes("/commits/")) return { sha: path.split("/").at(-1) };
			throw new Error(`unexpected path ${path}`);
		},
		async bytes(url: string) {
			const runId = Number(url.split("/").at(-1));
			const bytes = archiveBytes.get(runId);
			if (bytes === undefined) throw new Error("not found");
			return bytes;
		},
	};
	return {
		client,
		archiveReader: (bytes: Uint8Array) => {
			const runId = Number(
				Buffer.from(bytes).toString("utf8").split("-").at(-1),
			);
			return archives.get(runId) as ReadonlyMap<string, Uint8Array>;
		},
	};
}

describe("live GitHub V1 evidence verification", () => {
	it("accepts configuration that enumerates only the exact run-ID roster", () => {
		expect(
			parseRunIdConfiguration({
				schemaVersion: "eonfolk-v1-evidence-run-ids-v1",
				configurationBoundary: "RUN_IDS_ONLY_NOT_TRUST",
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
			}),
		).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(() =>
			parseRunIdConfiguration({
				schemaVersion: "eonfolk-v1-evidence-run-ids-v1",
				configurationBoundary: "RUN_IDS_ONLY_NOT_TRUST",
				runIds: [],
				purpose: "target-mac-deep",
			}),
		).toThrow(/run IDs and no trust assertions/u);
	});

	it("derives the complete registry from live metadata and downloaded bytes", async () => {
		const built = fixture();
		const registry = await verifyGithubEvidenceRuns({
			runIds: [1, 2, 3, 4, 5, 6, 7, 8],
			repository,
			expectedEvidenceSha: evidenceSha,
			expectedOwner: "owner",
			expectedOperator: "release-operator",
			client: built.client,
			archiveReader: built.archiveReader,
			now: () => "2026-08-23T00:00:00.000Z",
		});
		expect(registry.runs).toHaveLength(8);
		expect(registry.trustBoundary).toContain("CONTROL_BLOB_VERIFICATION");
		expect(registry.trustBoundary).toContain("SELF_REPORTED");
		expect(
			registry.runs.every(
				({ attestationClass }) =>
					attestationClass === "PREMERGE_CANDIDATE_CONTROL",
			),
		).toBe(true);
	});

	it("supports protected-main re-attestation without rewriting evidence bytes", async () => {
		const built = fixture({ postMergeWorkflowSource: true });
		const registry = await verifyGithubEvidenceRuns({
			runIds: [1, 2, 3, 4, 5, 6, 7, 8],
			repository,
			expectedEvidenceSha: evidenceSha,
			expectedOwner: "owner",
			expectedOperator: "release-operator",
			client: built.client,
			archiveReader: built.archiveReader,
		});
		expect(
			registry.runs.every(({ evidenceSha: sha }) => sha === evidenceSha),
		).toBe(true);
		expect(
			registry.runs.every(
				({ workflowSourceSha: sha }) => sha === "d".repeat(40),
			),
		).toBe(true);
		expect(
			registry.runs.every(
				({ attestationClass }) =>
					attestationClass === "POSTMERGE_PROTECTED_MAIN",
			),
		).toBe(true);
	});

	it.each([
		["wrong conclusion", { run: (run: any) => (run.conclusion = "failure") }],
		[
			"wrong repository",
			{ run: (run: any) => (run.repository.full_name = "attacker/repo") },
		],
		[
			"wrong operator actor",
			{ receipt: (receipt: any) => (receipt.operatorActor = "other-actor") },
		],
		[
			"wrong workflow",
			{
				workflow: (workflow: any) =>
					(workflow.path = ".github/workflows/attacker.yml"),
			},
		],
		[
			"wrong source",
			{ receipt: (receipt: any) => (receipt.sourceSha = "c".repeat(40)) },
		],
		[
			"wrong evidence binding",
			{ receipt: (receipt: any) => (receipt.evidenceSha = "d".repeat(40)) },
		],
		[
			"non-distinct SHA chain",
			{
				receipt: (receipt: any) =>
					(receipt.initialReviewSha = receipt.frozenCandidateSha),
			},
		],
		["wrong run attempt", { run: (run: any) => (run.run_attempt = 2) }],
		[
			"wrong artifact digest",
			{
				artifact: (artifact: any) =>
					(artifact.digest = `sha256:${"0".repeat(64)}`),
			},
		],
	] as const)("rejects %s", async (_label, mutation) => {
		const built = fixture(mutation);
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow();
	});

	it("rejects a fabricated or absent producer run ID", async () => {
		const built = fixture();
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 999],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/does not exist/u);
	});

	it("rejects duplicated reviewer sessions even across distinct runs", async () => {
		const built = fixture({ duplicateReviewerSessions: true });
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow();
	});

	it("rejects a changed immutable control blob", async () => {
		const built = fixture({ wrongControlBlob: true });
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/control blob changed/u);
	});

	it("rejects automatic branch deletion before evidence cleanup", async () => {
		const built = fixture({ autoDeleteBranches: true });
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/delete-branch-on-merge/u);
	});

	it("rejects a procedural probe that did not observe zero prior runners", async () => {
		const built = fixture({ badExternalProbe: true });
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				expectedOwner: "owner",
				expectedOperator: "release-operator",
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/probe is malformed/u);
	});
});
