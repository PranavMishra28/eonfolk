import { describe, expect, it } from "vitest";
import {
	createExperimentManifestV2,
	createExperimentResultV2,
	createLocalProcessBrainContract,
	EXPERIMENT_MANIFEST_VERSION,
	EXPERIMENT_RESULT_VERSION,
	InMemoryExperimentJournal,
	LOCAL_PROCESS_BRAIN_CONTRACT_VERSION,
	verifyExperimentManifestV2,
	verifyExperimentResultV2,
} from "../../../packages/cognition/src/index.js";

const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const digestC = "c".repeat(64);
const commitA = "d".repeat(40);
const treeA = "e".repeat(40);

function artifact(artifactId: string, sha256: string, byteLength = 1_024) {
	return {
		artifactId,
		sha256,
		byteLength,
		version: "fixture-v1",
		licenseId: "MIT",
		licenseTextSha256: digestA,
	};
}

describe("BrainPort experiment contracts", () => {
	it("creates a deeply immutable, offline local-process descriptor", async () => {
		const contract = await createLocalProcessBrainContract({
			adapterId: "adapter-fixture",
			adapterVersion: "local-process-brain-v1",
			adapterHash: digestA,
			runtime: {
				kind: "llama.cpp",
				sourceCommit: commitA,
				executable: artifact("runtime-fixture", digestA),
			},
			model: artifact("model-fixture", digestB, 4_096),
			tokenizer: artifact("tokenizer-fixture", digestC),
			modelConfiguration: artifact("config-fixture", digestA),
			chatTemplate: artifact("chat-template-fixture", digestB),
			promptTemplateHash: digestC,
			proposalSchemaHash: digestA,
			transport: "length-prefixed-jcs-stdin-single-jcs-stdout",
			modelSource: "preprovisioned-local",
			networkPolicy: "deny-all-required",
			trustRemoteCode: false,
			environmentNames: [],
			generation: {
				seed: 7,
				contextTokens: 2_048,
				maxOutputTokens: 128,
				temperatureBasisPoints: 0,
			},
			limits: {
				maxRequestBytes: 16_384,
				maxStdoutBytes: 16_384,
				maxStderrBytes: 16_384,
				coldTimeoutMs: 15_000,
				warmTimeoutMs: 3_000,
				retries: 0,
			},
		});
		expect(contract.schemaVersion).toBe(LOCAL_PROCESS_BRAIN_CONTRACT_VERSION);
		expect(contract.contractHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(Object.isFrozen(contract)).toBe(true);
		expect(Object.isFrozen(contract.runtime)).toBe(true);
		expect(Object.isFrozen(contract.model)).toBe(true);
		expect(JSON.stringify(contract)).not.toContain("chainOfThought");
		expect(JSON.stringify(contract)).not.toContain("/Users/");
	});

	it("rejects authority-bearing environment names and unbounded process limits", async () => {
		const base = {
			adapterId: "adapter-fixture",
			adapterVersion: "local-process-brain-v1",
			adapterHash: digestA,
			runtime: {
				kind: "mlx-lm" as const,
				sourceCommit: commitA,
				executable: artifact("runtime-fixture", digestA),
			},
			model: artifact("model-fixture", digestB),
			tokenizer: artifact("tokenizer-fixture", digestC),
			modelConfiguration: artifact("config-fixture", digestA),
			chatTemplate: artifact("chat-template-fixture", digestB),
			promptTemplateHash: digestC,
			proposalSchemaHash: digestA,
			transport: "length-prefixed-jcs-stdin-single-jcs-stdout" as const,
			modelSource: "preprovisioned-local" as const,
			networkPolicy: "deny-all-required" as const,
			trustRemoteCode: false as const,
			environmentNames: ["API_KEY"],
			generation: {
				seed: 0,
				contextTokens: 2_048,
				maxOutputTokens: 128,
				temperatureBasisPoints: 0,
			},
			limits: {
				maxRequestBytes: 16_384,
				maxStdoutBytes: 16_384,
				maxStderrBytes: 16_384,
				coldTimeoutMs: 15_000,
				warmTimeoutMs: 3_000,
				retries: 0 as const,
			},
		};
		await expect(createLocalProcessBrainContract(base)).rejects.toThrow(
			"environment name could carry authority",
		);
		await expect(
			createLocalProcessBrainContract({
				...base,
				environmentNames: ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE"],
				limits: { ...base.limits, maxStdoutBytes: 16_385 },
			}),
		).rejects.toThrow("limits.maxStdoutBytes is outside its integer budget");
	});

	it("hashes, sorts, freezes, and verifies a noncanonical V2 manifest", async () => {
		const manifest = await createExperimentManifestV2({
			manifestId: "manifest-fixture",
			experimentId: "experiment-fixture",
			runId: "run-fixture",
			createdAt: "2026-08-21T12:00:00.000Z",
			source: { commit: commitA, tree: treeA, dirty: false },
			versions: {
				engine: "riverhold-engine-v2",
				protocol: "riverhold-protocol-v2",
				determinism: "riverhold-determinism-v2",
				replay: "riverhold-replay-v2",
				visibility: "riverhold-visibility-v1",
				catalog: "riverhold-actions-v1",
				cognition: "riverhold-cognition-v1",
			},
			corpus: {
				corpusId: "corpus-fixture",
				corpusHash: digestA,
				contextHashes: [digestC, digestB],
				seeds: [7, 3],
				repetitions: 5,
			},
			brain: {
				kind: "standard",
				cognitionVersion: "riverhold-cognition-v1",
				standardBrainVersion: "riverhold-standard-brain-v1",
			},
			environment: {
				host: "MacBook M4 Pro",
				osVersion: "fixture-os-v1",
				runtimeVersion: "node-fixture-v1",
				totalMemoryBytes: 16 * 1024 * 1024 * 1024,
				powerMode: "normal",
				cohort: "cold",
			},
			controls: {
				retries: 0,
				maxRequestBytes: 16_384,
				maxOutputBytes: 16_384,
				timeoutMs: 3_000,
				networkPolicy: "not-applicable",
				trustRemoteCode: false,
			},
		});
		expect(manifest.schemaVersion).toBe(EXPERIMENT_MANIFEST_VERSION);
		expect(manifest.nonCanonical).toBe(true);
		expect(manifest.corpus.contextHashes).toEqual([digestB, digestC]);
		expect(manifest.corpus.seeds).toEqual([3, 7]);
		expect(Object.isFrozen(manifest)).toBe(true);
		expect(await verifyExperimentManifestV2(manifest)).toBe(true);
		const tampered = {
			...manifest,
			controls: { ...manifest.controls, timeoutMs: 4_000 },
		};
		expect(await verifyExperimentManifestV2(tampered)).toBe(false);

		const result = await createExperimentResultV2({
			resultId: "result-fixture",
			manifestHash: manifest.manifestHash,
			sequence: 1,
			recordedAt: "2026-08-21T12:05:00.000Z",
			outcome: {
				status: "completed",
				adapterInvocations: 640,
				outputHash: digestB,
				failureCode: null,
				latencyMicros: [900, 800],
				peakMemoryBytes: 1_024,
				invariantResults: [
					{ invariantId: "z-last", passed: true },
					{ invariantId: "a-first", passed: true },
				],
			},
			evidence: {
				zeroEgressProven: false,
				zeroEgressArtifactHash: null,
				dependencyInventoryHash: digestC,
				licenseInventoryHash: digestA,
				limitations: ["Synthetic fixture.", "No human evidence."],
			},
		});
		expect(result.schemaVersion).toBe(EXPERIMENT_RESULT_VERSION);
		expect(
			result.outcome.invariantResults.map(({ invariantId }) => invariantId),
		).toEqual(["a-first", "z-last"]);
		expect(await verifyExperimentResultV2(result)).toBe(true);
		const journal = new InMemoryExperimentJournal();
		await expect(journal.appendResult(result)).rejects.toThrow("not committed");
		await journal.commitManifest(manifest);
		await journal.appendResult(result);
		await journal.appendResult(result); // idempotent crash retry
		expect(journal.results(manifest.manifestHash)).toEqual([result]);
		const collidingManifest = await createExperimentManifestV2({
			...(Object.fromEntries(
				Object.entries(manifest).filter(
					([key]) =>
						!["schemaVersion", "nonCanonical", "manifestHash"].includes(key),
				),
			) as Parameters<typeof createExperimentManifestV2>[0]),
			controls: { ...manifest.controls, timeoutMs: 2_000 },
		});
		await expect(journal.commitManifest(collidingManifest)).rejects.toThrow(
			"manifest ID collision",
		);
	});

	it("requires an evidence artifact before claiming zero egress", async () => {
		const invalid = createExperimentResultV2({
			resultId: "result-invalid-egress",
			manifestHash: digestA,
			sequence: 1,
			recordedAt: "2026-08-21T12:00:00.000Z",
			outcome: {
				status: "not-run",
				adapterInvocations: 0,
				outputHash: null,
				failureCode: "protocol-blocked",
				latencyMicros: [],
				peakMemoryBytes: null,
				invariantResults: [],
			},
			evidence: {
				zeroEgressProven: true,
				zeroEgressArtifactHash: null,
				dependencyInventoryHash: null,
				licenseInventoryHash: null,
				limitations: ["Not run."],
			},
		});
		await expect(invalid).rejects.toThrow(
			"zero-egress status and evidence hash must agree",
		);
	});
});
