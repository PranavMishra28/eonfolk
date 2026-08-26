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

function manifestInput() {
	return {
		manifestId: "manifest-fixture",
		experimentId: "experiment-fixture",
		runId: "run-fixture",
		createdAt: "2026-08-21T12:00:00.000Z",
		source: { commit: commitA, tree: treeA, dirty: false as const },
		versions: {
			engine: "riverhold-engine-v2",
			protocol: "riverhold-protocol-v2",
			determinism: "riverhold-determinism-v2",
			replay: "riverhold-replay-v2",
			visibility: "riverhold-visibility-v1",
			catalog: "civilization-actions-v1",
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
			kind: "standard" as const,
			cognitionVersion: "riverhold-cognition-v1",
			standardBrainVersion: "riverhold-standard-brain-v1",
		},
		environment: {
			host: "MacBook M4 Max" as const,
			osVersion: "fixture-os-v1",
			runtimeVersion: "node-fixture-v1",
			totalMemoryBytes: 16 * 1024 * 1024 * 1024,
			powerMode: "normal",
			cohort: "cold" as const,
		},
		controls: {
			retries: 0 as const,
			maxRequestBytes: 16_384,
			maxOutputBytes: 16_384,
			timeoutMs: 3_000,
			networkPolicy: "not-applicable" as const,
			trustRemoteCode: false as const,
		},
	};
}

async function completedResult(
	manifestHash: string,
	execution: {
		readonly ordinal: number;
		readonly contextHash: string;
		readonly seed: number;
		readonly repetition: number;
	},
	resultId = `result-${execution.ordinal}`,
) {
	return createExperimentResultV2({
		resultId,
		manifestHash,
		sequence: execution.ordinal,
		recordedAt: "2026-08-21T12:05:00.000Z",
		execution,
		outcome: {
			status: "completed",
			proposalHash: digestA,
			outputHash: digestB,
			terminalVectorHash: digestC,
			failureCode: null,
			latencyMicros: 900 + execution.ordinal,
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
			serviceRuntime: null,
			model: artifact("model-fixture", digestB, 4_096),
			tokenizer: artifact("tokenizer-fixture", digestC),
			modelConfiguration: artifact("config-fixture", digestA),
			chatTemplate: artifact("chat-template-fixture", digestB),
			promptTemplateHash: digestC,
			proposalSchemaHash: digestA,
			transport: "length-prefixed-jcs-stdin-single-jcs-stdout",
			modelSource: "preprovisioned-local",
			networkPolicy: "deny-all-required",
			localEndpoint: null,
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
			serviceRuntime: null,
			model: artifact("model-fixture", digestB),
			tokenizer: artifact("tokenizer-fixture", digestC),
			modelConfiguration: artifact("config-fixture", digestA),
			chatTemplate: artifact("chat-template-fixture", digestB),
			promptTemplateHash: digestC,
			proposalSchemaHash: digestA,
			transport: "length-prefixed-jcs-stdin-single-jcs-stdout" as const,
			modelSource: "preprovisioned-local" as const,
			networkPolicy: "deny-all-required" as const,
			localEndpoint: null,
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
		await expect(
			createLocalProcessBrainContract({
				...base,
				environmentNames: ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE"],
				limits: { ...base.limits, warmTimeoutMs: 4_001 },
			}),
		).rejects.toThrow("limits.warmTimeoutMs is outside its integer budget");
		await expect(
			createLocalProcessBrainContract({
				...base,
				environmentNames: ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE"],
				networkPolicy: "loopback-single-port-required",
				localEndpoint: null,
			}),
		).rejects.toThrow("local endpoint must match the network policy");
		await expect(
			createLocalProcessBrainContract({
				...base,
				environmentNames: ["HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE"],
				networkPolicy: "loopback-single-port-required",
				localEndpoint: {
					kind: "ollama-loopback",
					host: "127.0.0.1",
					port: 70_000,
				},
			}),
		).rejects.toThrow("local endpoint is invalid");
	});

	it("binds an ordered 2 x 2 x 5 execution plan into the manifest", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		expect(manifest.schemaVersion).toBe(EXPERIMENT_MANIFEST_VERSION);
		expect(manifest.nonCanonical).toBe(true);
		expect(manifest.corpus.contextHashes).toEqual([digestC, digestB]);
		expect(manifest.corpus.seeds).toEqual([7, 3]);
		expect(manifest.corpus.executions).toHaveLength(20);
		expect(manifest.corpus.executions.slice(0, 6)).toEqual([
			{ ordinal: 1, contextHash: digestC, seed: 7, repetition: 1 },
			{ ordinal: 2, contextHash: digestC, seed: 7, repetition: 2 },
			{ ordinal: 3, contextHash: digestC, seed: 7, repetition: 3 },
			{ ordinal: 4, contextHash: digestC, seed: 7, repetition: 4 },
			{ ordinal: 5, contextHash: digestC, seed: 7, repetition: 5 },
			{ ordinal: 6, contextHash: digestC, seed: 3, repetition: 1 },
		]);
		expect(Object.isFrozen(manifest)).toBe(true);
		expect(Object.isFrozen(manifest.corpus.executions)).toBe(true);
		expect(await verifyExperimentManifestV2(manifest)).toBe(true);
		const tampered = {
			...manifest,
			controls: { ...manifest.controls, timeoutMs: 4_000 },
		};
		expect(await verifyExperimentManifestV2(tampered)).toBe(false);
		const executionTampered = {
			...manifest,
			corpus: {
				...manifest.corpus,
				executions: [
					{ ...manifest.corpus.executions[0]!, seed: 99 },
					...manifest.corpus.executions.slice(1),
				],
			},
		};
		expect(await verifyExperimentManifestV2(executionTampered)).toBe(false);

		const result = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[0]!,
			"result-fixture",
		);
		expect(result.schemaVersion).toBe(EXPERIMENT_RESULT_VERSION);
		expect(
			result.outcome.invariantResults.map(({ invariantId }) => invariantId),
		).toEqual(["a-first", "z-last"]);
		expect(await verifyExperimentResultV2(result)).toBe(true);
		const journal = new InMemoryExperimentJournal();
		await expect(journal.appendResult(result)).rejects.toThrow("not committed");
		await journal.commitManifest(manifest);
		await journal.appendResult(result);
		await expect(journal.appendResult(result)).rejects.toThrow(
			"duplicate result ID",
		);
		const duplicateExecution = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[0]!,
			"result-fixture-rewritten",
		);
		await expect(journal.appendResult(duplicateExecution)).rejects.toThrow(
			"duplicate execution result",
		);
		expect(journal.results(manifest.manifestHash)).toEqual([result]);
		const collidingManifest = await createExperimentManifestV2({
			...manifestInput(),
			controls: { ...manifest.controls, timeoutMs: 2_000 },
		});
		await expect(journal.commitManifest(collidingManifest)).rejects.toThrow(
			"manifest ID collision",
		);
	});

	it("rejects reordered, mismatched, extraneous, and tampered execution evidence", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const journal = new InMemoryExperimentJournal();
		await journal.commitManifest(manifest);
		const reordered = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[1]!,
		);
		await expect(journal.appendResult(reordered)).rejects.toThrow(
			"result sequence is not append-only",
		);
		const mismatched = await completedResult(manifest.manifestHash, {
			...manifest.corpus.executions[0]!,
			contextHash: digestA,
		});
		await expect(journal.appendResult(mismatched)).rejects.toThrow(
			"does not match",
		);
		const first = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[0]!,
		);
		const tampered = {
			...first,
			outcome: { ...first.outcome, outputHash: digestC },
		};
		expect(await verifyExperimentResultV2(tampered)).toBe(false);
		const proposalTampered = {
			...first,
			outcome: { ...first.outcome, proposalHash: digestB },
		};
		expect(await verifyExperimentResultV2(proposalTampered)).toBe(false);
		const terminalTampered = {
			...first,
			outcome: { ...first.outcome, terminalVectorHash: digestA },
		};
		expect(await verifyExperimentResultV2(terminalTampered)).toBe(false);
		for (const execution of manifest.corpus.executions)
			await journal.appendResult(
				await completedResult(manifest.manifestHash, execution),
			);
		const extraneous = await completedResult(manifest.manifestHash, {
			ordinal: 21,
			contextHash: digestC,
			seed: 7,
			repetition: 1,
		});
		await expect(journal.appendResult(extraneous)).rejects.toThrow(
			"extraneous",
		);
	});

	it("derives counts and accepts only an exact complete successful run", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const journal = new InMemoryExperimentJournal();
		await journal.commitManifest(manifest);
		expect(() => journal.assertCompletedRun(manifest.manifestHash)).toThrow(
			"missing manifest executions",
		);
		for (const execution of manifest.corpus.executions)
			await journal.appendResult(
				await completedResult(manifest.manifestHash, execution),
			);
		expect(journal.assertCompletedRun(manifest.manifestHash)).toEqual({
			manifestHash: manifest.manifestHash,
			plannedExecutions: 20,
			recordedExecutions: 20,
			adapterInvocations: 20,
			successfulExecutions: 20,
			complete: true,
			successful: true,
		});
	});

	it("does not label a fully recorded run successful when one execution failed", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const journal = new InMemoryExperimentJournal();
		await journal.commitManifest(manifest);
		for (const execution of manifest.corpus.executions) {
			if (execution.ordinal !== 7) {
				await journal.appendResult(
					await completedResult(manifest.manifestHash, execution),
				);
				continue;
			}
			await journal.appendResult(
				await createExperimentResultV2({
					resultId: "result-7",
					manifestHash: manifest.manifestHash,
					sequence: execution.ordinal,
					recordedAt: "2026-08-21T12:05:00.000Z",
					execution,
					outcome: {
						status: "failed",
						proposalHash: null,
						outputHash: null,
						terminalVectorHash: null,
						failureCode: "timeout",
						latencyMicros: 3_000_000,
						peakMemoryBytes: 1_024,
						invariantResults: [],
					},
					evidence: {
						zeroEgressProven: false,
						zeroEgressArtifactHash: null,
						dependencyInventoryHash: null,
						licenseInventoryHash: null,
						limitations: ["Timed out."],
					},
				}),
			);
		}
		expect(journal.runSummary(manifest.manifestHash)).toMatchObject({
			plannedExecutions: 20,
			recordedExecutions: 20,
			adapterInvocations: 20,
			successfulExecutions: 19,
			complete: true,
			successful: false,
		});
		expect(() => journal.assertCompletedRun(manifest.manifestHash)).toThrow(
			"unsuccessful executions",
		);
	});

	it("rejects a completed execution with a failed invariant", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const execution = manifest.corpus.executions[0]!;
		await expect(
			createExperimentResultV2({
				resultId: "result-failed-invariant",
				manifestHash: manifest.manifestHash,
				sequence: execution.ordinal,
				recordedAt: "2026-08-21T12:05:00.000Z",
				execution,
				outcome: {
					status: "completed",
					proposalHash: digestA,
					outputHash: digestB,
					terminalVectorHash: digestC,
					failureCode: null,
					latencyMicros: 900,
					peakMemoryBytes: 1_024,
					invariantResults: [
						{ invariantId: "proposal-authorized", passed: false },
					],
				},
				evidence: {
					zeroEgressProven: false,
					zeroEgressArtifactHash: null,
					dependencyInventoryHash: null,
					licenseInventoryHash: null,
					limitations: ["Synthetic fixture."],
				},
			}),
		).rejects.toThrow("passing invariants");
	});

	it("rejects missing proposal identity from completed evidence", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const result = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[0]!,
		);
		const {
			schemaVersion: _schemaVersion,
			resultHash: _resultHash,
			...input
		} = result;
		const { proposalHash: _proposalHash, ...missingProposal } = input.outcome;
		await expect(
			createExperimentResultV2({
				...input,
				outcome: missingProposal,
			} as Parameters<typeof createExperimentResultV2>[0]),
		).rejects.toThrow("experiment outcome contains unknown or missing fields");
		await expect(
			createExperimentResultV2({
				...input,
				outcome: { ...input.outcome, terminalVectorHash: null },
			}),
		).rejects.toThrow("terminal vector");
		await expect(
			createExperimentResultV2({
				...input,
				outcome: {
					...input.outcome,
					status: "failed",
					failureCode: "timeout",
					outputHash: null,
					terminalVectorHash: null,
				},
			}),
		).rejects.toThrow("only an invoked failure code");
		await expect(
			createExperimentResultV2({
				...input,
				outcome: {
					...input.outcome,
					status: "not-run",
					failureCode: "missing",
					outputHash: null,
					terminalVectorHash: null,
					latencyMicros: null,
					peakMemoryBytes: null,
					invariantResults: [],
				},
			}),
		).rejects.toThrow("pre-invocation failure");
	});

	it("rejects caller-supplied aggregate invocation counts", async () => {
		const manifest = await createExperimentManifestV2(manifestInput());
		const result = await completedResult(
			manifest.manifestHash,
			manifest.corpus.executions[0]!,
		);
		const {
			schemaVersion: _schemaVersion,
			resultHash: _resultHash,
			...input
		} = result;
		const legacyAggregate = {
			...input,
			outcome: { ...input.outcome, adapterInvocations: 20 },
		} as Parameters<typeof createExperimentResultV2>[0];
		await expect(createExperimentResultV2(legacyAggregate)).rejects.toThrow(
			"experiment outcome contains unknown or missing fields",
		);
	});

	it("requires an evidence artifact before claiming zero egress", async () => {
		const invalid = createExperimentResultV2({
			resultId: "result-invalid-egress",
			manifestHash: digestA,
			sequence: 1,
			recordedAt: "2026-08-21T12:00:00.000Z",
			execution: {
				ordinal: 1,
				contextHash: digestB,
				seed: 3,
				repetition: 1,
			},
			outcome: {
				status: "not-run",
				proposalHash: null,
				outputHash: null,
				terminalVectorHash: null,
				failureCode: "protocol-blocked",
				latencyMicros: null,
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
