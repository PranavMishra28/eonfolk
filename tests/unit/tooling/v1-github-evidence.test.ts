import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
	parseRunIdConfiguration,
	purposeSlug,
	REQUIRED_EVIDENCE_PURPOSES,
	verifyGithubEvidenceRuns,
} from "../../../scripts/v1-github-evidence.mjs";

const hash = (value: string | Uint8Array) =>
	createHash("sha256").update(value).digest("hex");
const repository = "owner/repo";
const sourceSha = "a".repeat(40);
const workflowSha = "b".repeat(40);

function payloadFor(purpose: string, index: number) {
	if (purpose === "target-mac-deep")
		return {
			bytes: Buffer.from(
				JSON.stringify({
					schemaVersion: "eonfolk-verification-tier-v3",
					tier: "deep",
					status: "PASS",
					source: {
						start: { commit: sourceSha },
						end: { commit: sourceSha },
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
					schemaVersion: "eonfolk-v1-final-confirmation-v2",
					status: "PASS",
					sourceSha,
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
				schemaVersion: "eonfolk-v1-structured-review-v2",
				reviewId,
				sourceSha,
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
	readonly run?: (value: Record<string, any>) => void;
	readonly workflow?: (value: Record<string, any>) => void;
	readonly receipt?: (value: Record<string, any>) => void;
	readonly artifact?: (value: Record<string, any>) => void;
}>;

function fixture(mutation: Mutation = {}) {
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
			schemaVersion: "eonfolk-v1-github-evidence-receipt-v1",
			identityBoundary:
				"GITHUB_OPERATOR_AND_RUN_VERIFIED_REVIEWER_AGENT_ID_SELF_REPORTED",
			purpose,
			sourceSha,
			candidateSha: sourceSha,
			workflowSourceSha: workflowSha,
			workflowPath: ".github/workflows/v1-evidence.yml",
			workflowRef: "refs/heads/main",
			repository,
			operatorActor: "release-operator",
			runId,
			runAttempt: 1,
			reviewerAgentId: payload.reviewerAgentId,
			reviewerSessionId: payload.reviewerSessionId,
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
			head_branch: "main",
			head_sha: workflowSha,
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
		path: ".github/workflows/v1-evidence.yml",
		name: "V1 release evidence",
		state: "active",
	};
	mutation.workflow?.(workflow);
	const client = {
		async json(path: string) {
			if (path === `/repos/${repository}/branches/main`)
				return { name: "main", protected: true, commit: { sha: workflowSha } };
			const runMatch = /\/actions\/runs\/(\d+)$/u.exec(path);
			if (runMatch !== null) {
				const run = runs.get(Number(runMatch[1]));
				if (run === undefined) throw new Error("not found");
				return run;
			}
			if (path.endsWith("/actions/workflows/42")) return workflow;
			const jobsMatch = /\/actions\/runs\/(\d+)\/jobs/u.exec(path);
			if (jobsMatch !== null) {
				const runId = Number(jobsMatch[1]);
				return {
					jobs: [
						{
							conclusion: "success",
							name:
								runId === 1
									? "Target-Mac exact 30-step DEEP"
									: "Review or confirmation receipt",
							runner_name: runId === 1 ? "ephemeral-mac-1" : "GitHub Actions 1",
							labels:
								runId === 1
									? ["self-hosted", "macOS", "ARM64", "eonfolk-ephemeral-deep"]
									: ["ubuntu-24.04"],
						},
					],
				};
			}
			const artifactMatch = /\/actions\/runs\/(\d+)\/artifacts/u.exec(path);
			if (artifactMatch !== null)
				return { artifacts: [artifacts.get(Number(artifactMatch[1]))] };
			if (path.includes("/compare/"))
				return {
					status: path.includes(`${workflowSha}...${workflowSha}`)
						? "identical"
						: "identical",
					merge_base_commit: {
						sha: path.includes(`${workflowSha}...`) ? workflowSha : sourceSha,
					},
				};
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
			client: built.client,
			archiveReader: built.archiveReader,
			now: () => "2026-08-23T00:00:00.000Z",
		});
		expect(registry.runs).toHaveLength(8);
		expect(registry.trustBoundary).toContain("LIVE_GITHUB_API_METADATA");
		expect(registry.trustBoundary).toContain("SELF_REPORTED");
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
					(workflow.path = ".github/workflows/ci.yml"),
			},
		],
		[
			"wrong source",
			{ receipt: (receipt: any) => (receipt.sourceSha = "c".repeat(40)) },
		],
		[
			"wrong candidate binding",
			{ receipt: (receipt: any) => (receipt.candidateSha = "c".repeat(40)) },
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
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow();
	});

	it("rejects a fabricated or absent producer run ID", async () => {
		const built = fixture();
		await expect(
			verifyGithubEvidenceRuns({
				runIds: [1, 2, 3, 4, 5, 6, 7, 99],
				repository,
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
				client: built.client,
				archiveReader: built.archiveReader,
			}),
		).rejects.toThrow();
	});
});
