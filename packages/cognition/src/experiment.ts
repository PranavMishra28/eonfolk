import { domainHash, jcs } from "../../protocol/src/index.js";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const LOCAL_PROCESS_BRAIN_CONTRACT_VERSION =
	"eonfolk-local-process-brain-contract-v3" as const;
export const EXPERIMENT_MANIFEST_VERSION =
	"eonfolk-experiment-manifest-v4" as const;
export const EXPERIMENT_RESULT_VERSION =
	"eonfolk-experiment-result-v2" as const;

export interface LocalArtifactIdentity {
	readonly artifactId: string;
	readonly sha256: string;
	readonly byteLength: number;
	readonly version: string;
	readonly licenseId: string;
	readonly licenseTextSha256: string;
}

export interface LocalProcessBrainContract {
	readonly schemaVersion: typeof LOCAL_PROCESS_BRAIN_CONTRACT_VERSION;
	readonly adapterId: string;
	readonly adapterVersion: string;
	readonly adapterHash: string;
	readonly runtime: {
		readonly kind: "llama.cpp" | "mlx-lm" | "other-local";
		readonly sourceCommit: string;
		readonly executable: LocalArtifactIdentity;
	};
	readonly serviceRuntime: {
		readonly kind: "ollama";
		readonly sourceCommit: string;
		readonly executable: LocalArtifactIdentity;
	} | null;
	readonly model: LocalArtifactIdentity;
	readonly tokenizer: LocalArtifactIdentity;
	readonly modelConfiguration: LocalArtifactIdentity;
	readonly chatTemplate: LocalArtifactIdentity;
	readonly promptTemplateHash: string;
	readonly proposalSchemaHash: string;
	readonly transport: "length-prefixed-jcs-stdin-single-jcs-stdout";
	readonly modelSource: "preprovisioned-local";
	readonly networkPolicy: "deny-all-required" | "loopback-single-port-required";
	readonly localEndpoint: {
		readonly kind: "ollama-loopback";
		readonly host: "127.0.0.1";
		readonly port: number;
	} | null;
	readonly trustRemoteCode: false;
	readonly environmentNames: readonly string[];
	readonly generation: {
		readonly seed: number;
		readonly contextTokens: number;
		readonly maxOutputTokens: number;
		readonly temperatureBasisPoints: number;
	};
	readonly limits: {
		readonly maxRequestBytes: number;
		readonly maxStdoutBytes: number;
		readonly maxStderrBytes: number;
		readonly coldTimeoutMs: number;
		readonly warmTimeoutMs: number;
		readonly retries: 0;
	};
	readonly contractHash: string;
}

export type LocalProcessBrainContractInput = Omit<
	LocalProcessBrainContract,
	"schemaVersion" | "contractHash"
>;

export interface ExperimentInvariantResult {
	readonly invariantId: string;
	readonly passed: boolean;
}

export interface ExperimentExecutionIdentity {
	/** One-based position in the manifest's immutable execution plan. */
	readonly ordinal: number;
	readonly contextHash: string;
	readonly seed: number;
	/** One-based repetition for this exact context/seed pair. */
	readonly repetition: number;
}

export type ExperimentBrainConfiguration =
	| {
			readonly kind: "standard";
			readonly cognitionVersion: string;
			readonly standardBrainVersion: string;
	  }
	| {
			readonly kind: "planner";
			readonly plannerVersion: string;
			readonly domainHash: string;
			readonly operatorHash: string;
			readonly methodHash: string;
			readonly maxExpansions: number;
			readonly maxGeneratedNodes: number;
			readonly maxDepth: number;
	  }
	| {
			readonly kind: "local-process-model";
			readonly contractHash: string;
	  };

export interface ExperimentManifestV2 {
	readonly schemaVersion: typeof EXPERIMENT_MANIFEST_VERSION;
	readonly manifestId: string;
	readonly experimentId: string;
	readonly runId: string;
	readonly createdAt: string;
	readonly nonCanonical: true;
	readonly source: {
		readonly commit: string;
		readonly tree: string;
		readonly dirty: false;
	};
	readonly versions: {
		readonly engine: string;
		readonly protocol: string;
		readonly determinism: string;
		readonly replay: string;
		readonly visibility: string;
		readonly catalog: string;
		readonly cognition: string;
	};
	readonly corpus: {
		readonly corpusId: string;
		readonly corpusHash: string;
		readonly contextHashes: readonly string[];
		readonly seeds: readonly number[];
		readonly repetitions: number;
		readonly executions: readonly ExperimentExecutionIdentity[];
	};
	readonly brain: ExperimentBrainConfiguration;
	readonly environment: {
		readonly host: "MacBook M4 Pro" | "MacBook M4 Max";
		readonly osVersion: string;
		readonly runtimeVersion: string;
		readonly totalMemoryBytes: number;
		readonly powerMode: string;
		readonly cohort: "cold" | "warm";
	};
	readonly controls: {
		readonly retries: 0;
		readonly maxRequestBytes: number;
		readonly maxOutputBytes: number;
		readonly timeoutMs: number;
		readonly networkPolicy:
			| "not-applicable"
			| "deny-all-required"
			| "loopback-single-port-required";
		readonly trustRemoteCode: false;
	};
	readonly manifestHash: string;
}

export interface ExperimentResultV2 {
	readonly schemaVersion: typeof EXPERIMENT_RESULT_VERSION;
	readonly resultId: string;
	readonly manifestHash: string;
	readonly sequence: number;
	readonly recordedAt: string;
	readonly execution: ExperimentExecutionIdentity;
	readonly outcome: {
		readonly status: "completed" | "failed" | "not-run";
		readonly proposalHash: string | null;
		readonly outputHash: string | null;
		readonly terminalVectorHash: string | null;
		readonly failureCode:
			| "missing"
			| "timeout"
			| "malformed"
			| "throwing"
			| "protocol-blocked"
			| null;
		readonly latencyMicros: number | null;
		readonly peakMemoryBytes: number | null;
		readonly invariantResults: readonly ExperimentInvariantResult[];
	};
	readonly evidence: {
		readonly zeroEgressProven: boolean;
		readonly zeroEgressArtifactHash: string | null;
		readonly dependencyInventoryHash: string | null;
		readonly licenseInventoryHash: string | null;
		readonly limitations: readonly string[];
	};
	readonly resultHash: string;
}

type ExperimentCorpusInput = Omit<ExperimentManifestV2["corpus"], "executions">;

export type ExperimentManifestV2Input = Omit<
	ExperimentManifestV2,
	"schemaVersion" | "nonCanonical" | "manifestHash" | "corpus"
> & { readonly corpus: ExperimentCorpusInput };

export type ExperimentResultV2Input = Omit<
	ExperimentResultV2,
	"schemaVersion" | "resultHash"
>;

export interface ExperimentRunSummary {
	readonly manifestHash: string;
	readonly plannedExecutions: number;
	readonly recordedExecutions: number;
	readonly adapterInvocations: number;
	readonly successfulExecutions: number;
	readonly complete: boolean;
	readonly successful: boolean;
}

function assertSafeText(
	value: string,
	label: string,
	maxCodePoints = 256,
): void {
	if (value !== value.normalize("NFC"))
		throw new TypeError(`${label} must be NFC-normalized`);
	if ([...value].length === 0 || [...value].length > maxCodePoints)
		throw new RangeError(`${label} is outside its text budget`);
	for (const character of value) {
		const codePoint = character.codePointAt(0)!;
		if (codePoint < 0x20 || codePoint === 0x7f)
			throw new TypeError(`${label} contains a control character`);
	}
}

function assertSafeId(value: string, label: string): void {
	if (!SAFE_ID_PATTERN.test(value)) throw new TypeError(`${label} is invalid`);
}

function assertExactKeys(
	value: object,
	expectedKeys: readonly string[],
	label: string,
): void {
	const actual = Object.keys(value).sort();
	const expected = [...expectedKeys].sort();
	if (
		actual.length !== expected.length ||
		actual.some((key, index) => key !== expected[index])
	)
		throw new TypeError(`${label} contains unknown or missing fields`);
}

function assertSha256(value: string, label: string): void {
	if (!SHA256_PATTERN.test(value))
		throw new TypeError(`${label} must be a lowercase SHA-256 digest`);
}

function assertGitCommit(value: string, label: string): void {
	if (!GIT_COMMIT_PATTERN.test(value))
		throw new TypeError(`${label} must be a full lowercase Git commit`);
}

function assertBoundedInteger(
	value: number,
	label: string,
	minimum: number,
	maximum: number,
): void {
	if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
		throw new RangeError(`${label} is outside its integer budget`);
}

function assertArtifact(artifact: LocalArtifactIdentity, label: string): void {
	assertSafeId(artifact.artifactId, `${label}.artifactId`);
	assertSha256(artifact.sha256, `${label}.sha256`);
	assertBoundedInteger(
		artifact.byteLength,
		`${label}.byteLength`,
		1,
		64 * 1024 * 1024 * 1024,
	);
	assertSafeText(artifact.version, `${label}.version`, 128);
	assertSafeText(artifact.licenseId, `${label}.licenseId`, 128);
	assertSha256(artifact.licenseTextSha256, `${label}.licenseTextSha256`);
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null || Object.isFrozen(value))
		return value;
	for (const child of Object.values(value as Record<string, unknown>))
		deepFreeze(child);
	return Object.freeze(value);
}

function canonicalClone<T>(value: T): T {
	return JSON.parse(jcs(value)) as T;
}

function assertEnvironmentNames(names: readonly string[]): void {
	if (names.length > 8) throw new RangeError("too many environment names");
	const sorted = [...new Set(names)].sort();
	if (sorted.length !== names.length)
		throw new TypeError("environment names must be unique");
	for (const name of names) {
		if (!/^[A-Z][A-Z0-9_]{0,63}$/u.test(name))
			throw new TypeError("environment name is invalid");
		if (/(?:HOME|TOKEN|KEY|SECRET|CREDENTIAL|PASSWORD|PROXY|URL)/u.test(name))
			throw new TypeError("environment name could carry authority");
	}
}

export async function createLocalProcessBrainContract(
	input: LocalProcessBrainContractInput,
): Promise<LocalProcessBrainContract> {
	if (
		input.runtime.kind !== "llama.cpp" &&
		input.runtime.kind !== "mlx-lm" &&
		input.runtime.kind !== "other-local"
	)
		throw new TypeError("runtime kind is unsupported");
	if (
		input.transport !== "length-prefixed-jcs-stdin-single-jcs-stdout" ||
		input.modelSource !== "preprovisioned-local" ||
		(input.networkPolicy !== "deny-all-required" &&
			input.networkPolicy !== "loopback-single-port-required") ||
		input.trustRemoteCode !== false ||
		input.limits.retries !== 0
	)
		throw new Error("local process contract weakens a required safety control");
	if (
		(input.networkPolicy === "deny-all-required") !==
		(input.localEndpoint === null)
	)
		throw new Error("local endpoint must match the network policy");
	if (input.localEndpoint !== null) {
		if (
			input.localEndpoint.kind !== "ollama-loopback" ||
			input.localEndpoint.host !== "127.0.0.1" ||
			!Number.isSafeInteger(input.localEndpoint.port) ||
			input.localEndpoint.port < 1 ||
			input.localEndpoint.port > 65_535
		)
			throw new Error("local endpoint is invalid");
	}
	assertSafeId(input.adapterId, "adapterId");
	assertSafeText(input.adapterVersion, "adapterVersion", 128);
	assertSha256(input.adapterHash, "adapterHash");
	assertGitCommit(input.runtime.sourceCommit, "runtime.sourceCommit");
	assertArtifact(input.runtime.executable, "runtime.executable");
	if (
		(input.networkPolicy === "loopback-single-port-required") !==
		(input.serviceRuntime !== null)
	)
		throw new Error("service runtime must match the network policy");
	if (input.serviceRuntime !== null) {
		if (input.serviceRuntime.kind !== "ollama")
			throw new TypeError("service runtime kind is unsupported");
		assertGitCommit(
			input.serviceRuntime.sourceCommit,
			"serviceRuntime.sourceCommit",
		);
		assertArtifact(
			input.serviceRuntime.executable,
			"serviceRuntime.executable",
		);
	}
	assertArtifact(input.model, "model");
	assertArtifact(input.tokenizer, "tokenizer");
	assertArtifact(input.modelConfiguration, "modelConfiguration");
	assertArtifact(input.chatTemplate, "chatTemplate");
	assertSha256(input.promptTemplateHash, "promptTemplateHash");
	assertSha256(input.proposalSchemaHash, "proposalSchemaHash");
	assertEnvironmentNames(input.environmentNames);
	if (
		input.runtime.kind === "mlx-lm" &&
		(!input.environmentNames.includes("HF_HUB_OFFLINE") ||
			!input.environmentNames.includes("TRANSFORMERS_OFFLINE"))
	)
		throw new Error("MLX-LM contract requires both offline environment guards");
	assertBoundedInteger(
		input.generation.seed,
		"generation.seed",
		0,
		0xffff_ffff,
	);
	assertBoundedInteger(
		input.generation.contextTokens,
		"generation.contextTokens",
		1,
		32_768,
	);
	assertBoundedInteger(
		input.generation.maxOutputTokens,
		"generation.maxOutputTokens",
		1,
		512,
	);
	assertBoundedInteger(
		input.generation.temperatureBasisPoints,
		"generation.temperatureBasisPoints",
		0,
		10_000,
	);
	for (const [label, value] of [
		["maxRequestBytes", input.limits.maxRequestBytes],
		["maxStdoutBytes", input.limits.maxStdoutBytes],
		["maxStderrBytes", input.limits.maxStderrBytes],
	] as const) {
		assertBoundedInteger(value, `limits.${label}`, 1, 16_384);
	}
	assertBoundedInteger(
		input.limits.coldTimeoutMs,
		"limits.coldTimeoutMs",
		1,
		15_000,
	);
	assertBoundedInteger(
		input.limits.warmTimeoutMs,
		"limits.warmTimeoutMs",
		1,
		4_000,
	);
	if (input.limits.warmTimeoutMs > input.limits.coldTimeoutMs)
		throw new RangeError("warm timeout cannot exceed cold timeout");
	const withoutHash = canonicalClone({
		schemaVersion: LOCAL_PROCESS_BRAIN_CONTRACT_VERSION,
		adapterId: input.adapterId,
		adapterVersion: input.adapterVersion,
		adapterHash: input.adapterHash,
		runtime: input.runtime,
		serviceRuntime: input.serviceRuntime,
		model: input.model,
		tokenizer: input.tokenizer,
		modelConfiguration: input.modelConfiguration,
		chatTemplate: input.chatTemplate,
		promptTemplateHash: input.promptTemplateHash,
		proposalSchemaHash: input.proposalSchemaHash,
		transport: input.transport,
		modelSource: input.modelSource,
		networkPolicy: input.networkPolicy,
		localEndpoint: input.localEndpoint,
		trustRemoteCode: input.trustRemoteCode,
		environmentNames: [...input.environmentNames].sort(),
		generation: input.generation,
		limits: input.limits,
	});
	const contract = {
		...withoutHash,
		contractHash: await domainHash(
			"EONFOLK:LOCAL-PROCESS-BRAIN-CONTRACT:v3",
			withoutHash,
		),
	} as LocalProcessBrainContract;
	return deepFreeze(contract);
}

export async function verifyLocalProcessBrainContract(
	contract: LocalProcessBrainContract,
): Promise<boolean> {
	try {
		const { schemaVersion, contractHash, ...input } = contract;
		if (schemaVersion !== LOCAL_PROCESS_BRAIN_CONTRACT_VERSION) return false;
		const rebuilt = await createLocalProcessBrainContract(input);
		return rebuilt.contractHash === contractHash;
	} catch {
		return false;
	}
}

function assertBrainConfiguration(brain: ExperimentBrainConfiguration): void {
	switch (brain.kind) {
		case "standard":
			assertSafeText(brain.cognitionVersion, "brain.cognitionVersion", 128);
			assertSafeText(
				brain.standardBrainVersion,
				"brain.standardBrainVersion",
				128,
			);
			break;
		case "planner":
			assertSafeText(brain.plannerVersion, "brain.plannerVersion", 128);
			assertSha256(brain.domainHash, "brain.domainHash");
			assertSha256(brain.operatorHash, "brain.operatorHash");
			assertSha256(brain.methodHash, "brain.methodHash");
			assertBoundedInteger(brain.maxExpansions, "brain.maxExpansions", 1, 64);
			assertBoundedInteger(
				brain.maxGeneratedNodes,
				"brain.maxGeneratedNodes",
				1,
				128,
			);
			assertBoundedInteger(brain.maxDepth, "brain.maxDepth", 1, 4);
			break;
		case "local-process-model":
			assertSha256(brain.contractHash, "brain.contractHash");
			break;
		default:
			throw new TypeError("brain kind is unsupported");
	}
}

function assertManifestInput(input: ExperimentManifestV2Input): void {
	assertExactKeys(
		input,
		[
			"manifestId",
			"experimentId",
			"runId",
			"createdAt",
			"source",
			"versions",
			"corpus",
			"brain",
			"environment",
			"controls",
		],
		"experiment manifest",
	);
	assertExactKeys(
		input.corpus,
		["corpusId", "corpusHash", "contextHashes", "seeds", "repetitions"],
		"experiment corpus",
	);
	assertSafeId(input.manifestId, "manifestId");
	assertSafeId(input.experimentId, "experimentId");
	assertSafeId(input.runId, "runId");
	if (!ISO_INSTANT_PATTERN.test(input.createdAt))
		throw new TypeError("createdAt must be a millisecond UTC instant");
	if (new Date(input.createdAt).toISOString() !== input.createdAt)
		throw new TypeError("createdAt is not a valid UTC instant");
	if (input.source.dirty !== false)
		throw new Error("comparable experiment source must be clean");
	assertGitCommit(input.source.commit, "source.commit");
	assertGitCommit(input.source.tree, "source.tree");
	for (const [name, version] of Object.entries(input.versions))
		assertSafeText(version, `versions.${name}`, 128);
	assertSafeId(input.corpus.corpusId, "corpus.corpusId");
	assertSha256(input.corpus.corpusHash, "corpus.corpusHash");
	if (
		input.corpus.contextHashes.length === 0 ||
		input.corpus.contextHashes.length > 512
	)
		throw new RangeError("context hash count is outside its budget");
	for (const hash of input.corpus.contextHashes)
		assertSha256(hash, "corpus.contextHashes entry");
	if (
		new Set(input.corpus.contextHashes).size !==
		input.corpus.contextHashes.length
	)
		throw new TypeError("context hashes must be unique");
	if (input.corpus.seeds.length === 0 || input.corpus.seeds.length > 64)
		throw new RangeError("seed count is outside its budget");
	for (const seed of input.corpus.seeds)
		assertBoundedInteger(seed, "corpus seed", 0, 0xffff_ffff);
	if (new Set(input.corpus.seeds).size !== input.corpus.seeds.length)
		throw new TypeError("seeds must be unique");
	assertBoundedInteger(input.corpus.repetitions, "corpus.repetitions", 1, 100);
	const executionCount =
		input.corpus.contextHashes.length *
		input.corpus.seeds.length *
		input.corpus.repetitions;
	assertBoundedInteger(executionCount, "corpus execution count", 1, 100_000);
	assertBrainConfiguration(input.brain);
	assertSafeText(input.environment.osVersion, "environment.osVersion", 128);
	assertSafeText(
		input.environment.runtimeVersion,
		"environment.runtimeVersion",
		128,
	);
	assertBoundedInteger(
		input.environment.totalMemoryBytes,
		"environment.totalMemoryBytes",
		1,
		128 * 1024 * 1024 * 1024,
	);
	assertSafeText(input.environment.powerMode, "environment.powerMode", 128);
	if (
		input.environment.host !== "MacBook M4 Pro" &&
		input.environment.host !== "MacBook M4 Max"
	)
		throw new Error("experiment host is outside the Founder Alpha target");
	if (
		input.environment.cohort !== "cold" &&
		input.environment.cohort !== "warm"
	)
		throw new TypeError("environment cohort is unsupported");
	if (input.controls.retries !== 0 || input.controls.trustRemoteCode !== false)
		throw new Error("experiment controls weaken a required safety control");
	if (
		(input.brain.kind === "local-process-model") !==
		(input.controls.networkPolicy === "deny-all-required" ||
			input.controls.networkPolicy === "loopback-single-port-required")
	)
		throw new Error("network policy must match the selected brain kind");
	assertBoundedInteger(
		input.controls.maxRequestBytes,
		"controls.maxRequestBytes",
		1,
		16_384,
	);
	assertBoundedInteger(
		input.controls.maxOutputBytes,
		"controls.maxOutputBytes",
		1,
		16_384,
	);
	assertBoundedInteger(
		input.controls.timeoutMs,
		"controls.timeoutMs",
		1,
		15_000,
	);
}

export async function createExperimentManifestV2(
	input: ExperimentManifestV2Input,
): Promise<ExperimentManifestV2> {
	assertManifestInput(input);
	const executions: ExperimentExecutionIdentity[] = [];
	for (const contextHash of input.corpus.contextHashes) {
		for (const seed of input.corpus.seeds) {
			for (
				let repetition = 1;
				repetition <= input.corpus.repetitions;
				repetition += 1
			) {
				executions.push({
					ordinal: executions.length + 1,
					contextHash,
					seed,
					repetition,
				});
			}
		}
	}
	const withoutHash = canonicalClone({
		schemaVersion: EXPERIMENT_MANIFEST_VERSION,
		manifestId: input.manifestId,
		experimentId: input.experimentId,
		runId: input.runId,
		createdAt: input.createdAt,
		nonCanonical: true as const,
		source: input.source,
		versions: input.versions,
		corpus: {
			...input.corpus,
			contextHashes: [...input.corpus.contextHashes],
			seeds: [...input.corpus.seeds],
			executions,
		},
		brain: input.brain,
		environment: input.environment,
		controls: input.controls,
	});
	const manifest = {
		...withoutHash,
		manifestHash: await domainHash(
			"EONFOLK:EXPERIMENT-MANIFEST:v4",
			withoutHash,
		),
	} as ExperimentManifestV2;
	return deepFreeze(manifest);
}

export async function verifyExperimentManifestV2(
	manifest: ExperimentManifestV2,
): Promise<boolean> {
	if (manifest.schemaVersion !== EXPERIMENT_MANIFEST_VERSION) return false;
	const {
		manifestHash,
		schemaVersion: _schemaVersion,
		nonCanonical,
		corpus,
		...rest
	} = manifest;
	if (nonCanonical !== true) return false;
	if (!SHA256_PATTERN.test(manifestHash)) return false;
	try {
		const { executions: _executions, ...corpusInput } = corpus;
		const input: ExperimentManifestV2Input = { ...rest, corpus: corpusInput };
		assertManifestInput(input);
		const recreated = await createExperimentManifestV2(input);
		return jcs(manifest) === jcs(recreated);
	} catch {
		return false;
	}
}

function assertResultInput(input: ExperimentResultV2Input): void {
	assertExactKeys(
		input,
		[
			"resultId",
			"manifestHash",
			"sequence",
			"recordedAt",
			"execution",
			"outcome",
			"evidence",
		],
		"experiment result",
	);
	assertExactKeys(
		input.execution,
		["ordinal", "contextHash", "seed", "repetition"],
		"experiment execution identity",
	);
	assertExactKeys(
		input.outcome,
		[
			"status",
			"proposalHash",
			"outputHash",
			"terminalVectorHash",
			"failureCode",
			"latencyMicros",
			"peakMemoryBytes",
			"invariantResults",
		],
		"experiment outcome",
	);
	assertExactKeys(
		input.evidence,
		[
			"zeroEgressProven",
			"zeroEgressArtifactHash",
			"dependencyInventoryHash",
			"licenseInventoryHash",
			"limitations",
		],
		"experiment evidence",
	);
	assertSafeId(input.resultId, "resultId");
	assertSha256(input.manifestHash, "manifestHash");
	assertBoundedInteger(input.sequence, "sequence", 1, 100_000);
	assertBoundedInteger(
		input.execution.ordinal,
		"execution.ordinal",
		1,
		100_000,
	);
	assertSha256(input.execution.contextHash, "execution.contextHash");
	assertBoundedInteger(input.execution.seed, "execution.seed", 0, 0xffff_ffff);
	assertBoundedInteger(
		input.execution.repetition,
		"execution.repetition",
		1,
		100,
	);
	if (input.sequence !== input.execution.ordinal)
		throw new Error(
			"result sequence must equal its manifest execution ordinal",
		);
	if (
		!ISO_INSTANT_PATTERN.test(input.recordedAt) ||
		new Date(input.recordedAt).toISOString() !== input.recordedAt
	)
		throw new TypeError("recordedAt must be a valid millisecond UTC instant");
	if (input.outcome.status === "completed") {
		if (
			input.outcome.failureCode !== null ||
			input.outcome.proposalHash === null ||
			input.outcome.outputHash === null ||
			input.outcome.terminalVectorHash === null ||
			input.outcome.latencyMicros === null ||
			input.outcome.invariantResults.length === 0 ||
			input.outcome.invariantResults.some(({ passed }) => !passed)
		)
			throw new Error(
				"completed execution requires proposal, output, terminal vector, latency, passing invariants, and no failure",
			);
	} else if (input.outcome.status === "failed") {
		if (
			input.outcome.failureCode === null ||
			input.outcome.failureCode === "missing" ||
			input.outcome.failureCode === "protocol-blocked" ||
			input.outcome.latencyMicros === null ||
			input.outcome.proposalHash !== null ||
			input.outcome.outputHash !== null ||
			input.outcome.terminalVectorHash !== null
		)
			throw new Error(
				"failed execution requires only an invoked failure code and latency evidence",
			);
	} else if (
		(input.outcome.failureCode !== "missing" &&
			input.outcome.failureCode !== "protocol-blocked") ||
		input.outcome.proposalHash !== null ||
		input.outcome.outputHash !== null ||
		input.outcome.terminalVectorHash !== null
	) {
		throw new Error("not-run execution requires a pre-invocation failure");
	}
	if (
		input.outcome.status === "not-run" &&
		(input.outcome.latencyMicros !== null ||
			input.outcome.peakMemoryBytes !== null ||
			input.outcome.invariantResults.length !== 0)
	)
		throw new Error("not-run execution cannot claim runtime evidence");
	for (const [label, hash] of [
		["proposalHash", input.outcome.proposalHash],
		["outputHash", input.outcome.outputHash],
		["terminalVectorHash", input.outcome.terminalVectorHash],
	] as const)
		if (hash !== null) assertSha256(hash, `outcome.${label}`);
	if (input.outcome.latencyMicros !== null)
		assertBoundedInteger(
			input.outcome.latencyMicros,
			"outcome latency",
			0,
			60_000_000,
		);
	if (input.outcome.peakMemoryBytes !== null)
		assertBoundedInteger(
			input.outcome.peakMemoryBytes,
			"outcome.peakMemoryBytes",
			0,
			128 * 1024 * 1024 * 1024,
		);
	if (input.outcome.invariantResults.length > 512)
		throw new RangeError("too many invariant results");
	for (const result of input.outcome.invariantResults) {
		assertExactKeys(result, ["invariantId", "passed"], "invariant result");
		assertSafeId(result.invariantId, "invariantId");
	}
	if (
		new Set(
			input.outcome.invariantResults.map(({ invariantId }) => invariantId),
		).size !== input.outcome.invariantResults.length
	)
		throw new TypeError("invariant results must be unique");
	for (const hash of [
		input.evidence.zeroEgressArtifactHash,
		input.evidence.dependencyInventoryHash,
		input.evidence.licenseInventoryHash,
	])
		if (hash !== null) assertSha256(hash, "evidence hash");
	if (
		input.evidence.zeroEgressProven !==
		(input.evidence.zeroEgressArtifactHash !== null)
	)
		throw new Error("zero-egress status and evidence hash must agree");
	if (input.evidence.limitations.length > 32)
		throw new RangeError("too many limitations");
	for (const limitation of input.evidence.limitations)
		assertSafeText(limitation, "limitation", 512);
}

export async function createExperimentResultV2(
	input: ExperimentResultV2Input,
): Promise<ExperimentResultV2> {
	assertResultInput(input);
	const withoutHash = canonicalClone({
		schemaVersion: EXPERIMENT_RESULT_VERSION,
		resultId: input.resultId,
		manifestHash: input.manifestHash,
		sequence: input.sequence,
		recordedAt: input.recordedAt,
		execution: input.execution,
		outcome: {
			...input.outcome,
			invariantResults: [...input.outcome.invariantResults].sort((a, b) =>
				a.invariantId.localeCompare(b.invariantId),
			),
		},
		evidence: {
			...input.evidence,
			limitations: [...input.evidence.limitations].sort(),
		},
	});
	return deepFreeze({
		...withoutHash,
		resultHash: await domainHash("EONFOLK:EXPERIMENT-RESULT:v2", withoutHash),
	} as ExperimentResultV2);
}

export async function verifyExperimentResultV2(
	result: ExperimentResultV2,
): Promise<boolean> {
	if (
		result.schemaVersion !== EXPERIMENT_RESULT_VERSION ||
		!SHA256_PATTERN.test(result.resultHash)
	)
		return false;
	const { resultHash, schemaVersion: _schemaVersion, ...input } = result;
	try {
		return jcs(result) === jcs(await createExperimentResultV2(input));
	} catch {
		return false;
	}
}

/** Noncanonical append-only journal. It exposes no reducer or Reality port. */
export class InMemoryExperimentJournal {
	readonly #manifests = new Map<string, ExperimentManifestV2>();
	readonly #results = new Map<string, readonly ExperimentResultV2[]>();

	async commitManifest(manifest: ExperimentManifestV2): Promise<void> {
		if (!(await verifyExperimentManifestV2(manifest)))
			throw new Error("invalid experiment manifest");
		const existing = this.#manifests.get(manifest.manifestId);
		if (
			existing !== undefined &&
			existing.manifestHash !== manifest.manifestHash
		)
			throw new Error("manifest ID collision");
		this.#manifests.set(manifest.manifestId, manifest);
	}

	async appendResult(result: ExperimentResultV2): Promise<void> {
		if (!(await verifyExperimentResultV2(result)))
			throw new Error("invalid experiment result");
		const manifest = [...this.#manifests.values()].find(
			({ manifestHash }) => manifestHash === result.manifestHash,
		);
		if (manifest === undefined)
			throw new Error("result manifest is not committed");
		const prior = this.#results.get(result.manifestHash) ?? [];
		if (prior.some(({ resultId }) => resultId === result.resultId))
			throw new Error("duplicate result ID");
		if (
			prior.some(
				({ execution }) => execution.ordinal === result.execution.ordinal,
			)
		)
			throw new Error("duplicate execution result");
		if (result.sequence !== prior.length + 1)
			throw new Error("result sequence is not append-only");
		const planned = manifest.corpus.executions[prior.length];
		if (planned === undefined)
			throw new Error("result is extraneous to the manifest execution plan");
		if (jcs(result.execution) !== jcs(planned))
			throw new Error("result does not match the next manifest execution");
		this.#results.set(result.manifestHash, Object.freeze([...prior, result]));
	}

	results(manifestHash: string): readonly ExperimentResultV2[] {
		return this.#results.get(manifestHash) ?? Object.freeze([]);
	}

	runSummary(manifestHash: string): ExperimentRunSummary {
		const manifest = [...this.#manifests.values()].find(
			(candidate) => candidate.manifestHash === manifestHash,
		);
		if (manifest === undefined) throw new Error("manifest is not committed");
		const results = this.results(manifestHash);
		const adapterInvocations = results.filter(
			({ outcome }) =>
				outcome.status === "completed" ||
				(outcome.status === "failed" &&
					outcome.failureCode !== "missing" &&
					outcome.failureCode !== "protocol-blocked"),
		).length;
		const successfulExecutions = results.filter(
			({ outcome }) => outcome.status === "completed",
		).length;
		return deepFreeze({
			manifestHash,
			plannedExecutions: manifest.corpus.executions.length,
			recordedExecutions: results.length,
			adapterInvocations,
			successfulExecutions,
			complete: results.length === manifest.corpus.executions.length,
			successful:
				results.length === manifest.corpus.executions.length &&
				successfulExecutions === manifest.corpus.executions.length,
		});
	}

	assertCompletedRun(manifestHash: string): ExperimentRunSummary {
		const summary = this.runSummary(manifestHash);
		if (!summary.complete)
			throw new Error("completed run is missing manifest executions");
		if (!summary.successful)
			throw new Error("completed run contains unsuccessful executions");
		return summary;
	}
}
