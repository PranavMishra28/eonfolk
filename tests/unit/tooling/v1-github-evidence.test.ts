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
	readonly duplicateReviewerSessions?: boolean;
	readonly postMergeWorkflowSource?: boolean;
	readonly wrongControlBlob?: boolean;
	readonly runnerStillRegistered?: boolean;
	readonly run?: (value: Record<string, any>) => void;
	readonly workflow?: (value: Record<string, any>) => void;
	readonly receipt?: (value: Record<string, any>) => void;
	readonly artifact?: (value: Record<string, any>) => void;
}>;

function fixture(mutation: Mutation = {}) {
	const workflowSourceSha = mutation.postMergeWorkflowSource
		? "d".repeat(40)
		: evidenceSha;
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
			workflowRef:
				mutation.postMergeWorkflowSource === true
					? "refs/heads/main"
					: "refs/heads/feat/v1-civilization",
			repository,
			operatorActor: "release-operator",
			runId,
			runAttempt: 1,
			reviewerAgentId: payload.reviewerAgentId,
			reviewerSessionId: payload.reviewerSessionId,
			macLifecycle:
				purpose === "target-mac-deep"
					? {
							schemaVersion: "eonfolk-v1-mac-lifecycle-v1",
							controlSha: frozenCandidateSha,
							frozenCandidateSha,
							intermediateRunId: 99,
							intermediateWorkflowSourceSha: frozenCandidateSha,
							runnerName: "eonfolk-deep-fixture",
							runnerUser: "eonfolk-ci-user",
							nonAdminUser: true,
							preflight: "AVAILABLE_IDLE_EXACT_LABELS",
							teardown: "RUNNER_DEREGISTERED_AFTER_JOB",
							payloadSha256: hash(payload.bytes),
							finalizedAt: "2026-08-23T00:00:00.000Z",
						}
					: null,
			payload: {
				path: "payload.json",
				bytes: payload.bytes.byteLength,
				sha256: hash(payload.bytes),
			},
		};
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
			head_branch:
				mutation.postMergeWorkflowSource === true
					? "main"
					: "feat/v1-civilization",
			head_sha: workflowSourceSha,
			run_attempt: 1,
			actor: { login: "release-operator" },
			workflow_id: 42,
		};
		if (runId === 1) mutation.run?.(run);
		runs.set(runId, run);
		const artifact: Record<string, any> = {
			id: 100 + runId,
			name: `v1-evidence-${purposeSlug(purpose)}-${runId}`,
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
			if (path === `/repos/${repository}/branches/main`)
				return {
					name: "main",
					protected: true,
					commit: { sha: workflowSourceSha },
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
										name: "Mac runner availability preflight",
										conclusion: "success",
									},
									{
										name: "Target-Mac exact 30-step DEEP intermediate",
										conclusion: "success",
										runner_name: "eonfolk-deep-fixture",
										labels: [
											"self-hosted",
											"macOS",
											"ARM64",
											"eonfolk-ephemeral-deep",
										],
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
			if (path.endsWith("/actions/runners?per_page=100"))
				return {
					runners:
						mutation.runnerStillRegistered === true
							? [{ name: "eonfolk-deep-fixture" }]
							: [],
				};
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
				const [ancestor] = pair.split("...");
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
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/control blob changed/u);
	});

	it("rejects target-Mac evidence while its runner remains registered", async () => {
		const built = fixture({ runnerStillRegistered: true });
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 8],
				repository,
				expectedEvidenceSha: evidenceSha,
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow(/remains registered/u);
	});
});
