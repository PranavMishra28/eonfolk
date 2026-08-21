import { domainHash, jcs } from "../../protocol/src/index.js";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const LOCAL_PROCESS_BRAIN_CONTRACT_VERSION =
	"eonfolk-local-process-brain-contract-v1" as const;
export const EXPERIMENT_MANIFEST_VERSION =
	"eonfolk-experiment-manifest-v2" as const;

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
	readonly model: LocalArtifactIdentity;
	readonly tokenizer: LocalArtifactIdentity;
	readonly modelConfiguration: LocalArtifactIdentity;
	readonly chatTemplate: LocalArtifactIdentity;
	readonly promptTemplateHash: string;
	readonly proposalSchemaHash: string;
	readonly transport: "length-prefixed-jcs-stdin-single-jcs-stdout";
	readonly modelSource: "preprovisioned-local";
	readonly networkPolicy: "deny-all-required";
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
	};
	readonly brain: ExperimentBrainConfiguration;
	readonly environment: {
		readonly host: "MacBook M4 Pro";
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
		readonly networkPolicy: "not-applicable" | "deny-all-required";
		readonly trustRemoteCode: false;
	};
	readonly result: {
		readonly status: "completed" | "failed" | "not-run";
		readonly adapterInvocations: number;
		readonly outputHash: string | null;
		readonly failureCode:
			| "missing"
			| "timeout"
			| "malformed"
			| "throwing"
			| "protocol-blocked"
			| null;
		readonly latencyMicros: readonly number[];
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
	readonly manifestHash: string;
}

export type ExperimentManifestV2Input = Omit<
	ExperimentManifestV2,
	"schemaVersion" | "nonCanonical" | "manifestHash"
>;

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
		input.networkPolicy !== "deny-all-required" ||
		input.trustRemoteCode !== false ||
		input.limits.retries !== 0
	)
		throw new Error("local process contract weakens a required safety control");
	assertSafeId(input.adapterId, "adapterId");
	assertSafeText(input.adapterVersion, "adapterVersion", 128);
	assertSha256(input.adapterHash, "adapterHash");
	assertGitCommit(input.runtime.sourceCommit, "runtime.sourceCommit");
	assertArtifact(input.runtime.executable, "runtime.executable");
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
		3_000,
	);
	if (input.limits.warmTimeoutMs > input.limits.coldTimeoutMs)
		throw new RangeError("warm timeout cannot exceed cold timeout");
	const withoutHash = canonicalClone({
		schemaVersion: LOCAL_PROCESS_BRAIN_CONTRACT_VERSION,
		adapterId: input.adapterId,
		adapterVersion: input.adapterVersion,
		adapterHash: input.adapterHash,
		runtime: input.runtime,
		model: input.model,
		tokenizer: input.tokenizer,
		modelConfiguration: input.modelConfiguration,
		chatTemplate: input.chatTemplate,
		promptTemplateHash: input.promptTemplateHash,
		proposalSchemaHash: input.proposalSchemaHash,
		transport: input.transport,
		modelSource: input.modelSource,
		networkPolicy: input.networkPolicy,
		trustRemoteCode: input.trustRemoteCode,
		environmentNames: [...input.environmentNames].sort(),
		generation: input.generation,
		limits: input.limits,
	});
	const contract = {
		...withoutHash,
		contractHash: await domainHash(
			"EONFOLK:LOCAL-PROCESS-BRAIN-CONTRACT:v1",
			withoutHash,
		),
	} as LocalProcessBrainContract;
	return deepFreeze(contract);
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
	if (input.environment.host !== "MacBook M4 Pro")
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
		(input.controls.networkPolicy === "deny-all-required")
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
	assertBoundedInteger(
		input.result.adapterInvocations,
		"result.adapterInvocations",
		0,
		1,
	);
	if (input.result.status === "completed") {
		if (input.result.failureCode !== null || input.result.outputHash === null)
			throw new Error("completed result requires output and no failure");
	} else if (input.result.failureCode === null) {
		throw new Error("non-completed result requires a failure code");
	}
	if (
		input.result.status === "not-run" &&
		input.result.adapterInvocations !== 0
	)
		throw new Error("not-run result cannot invoke an adapter");
	if (input.result.outputHash !== null)
		assertSha256(input.result.outputHash, "result.outputHash");
	if (input.result.latencyMicros.length > 512)
		throw new RangeError("too many latency samples");
	for (const latency of input.result.latencyMicros)
		assertBoundedInteger(latency, "result latency", 0, 60_000_000);
	if (input.result.peakMemoryBytes !== null)
		assertBoundedInteger(
			input.result.peakMemoryBytes,
			"result.peakMemoryBytes",
			0,
			128 * 1024 * 1024 * 1024,
		);
	if (input.result.invariantResults.length > 128)
		throw new RangeError("too many invariant results");
	for (const result of input.result.invariantResults)
		assertSafeId(result.invariantId, "invariantId");
	for (const hash of [
		input.evidence.zeroEgressArtifactHash,
		input.evidence.dependencyInventoryHash,
		input.evidence.licenseInventoryHash,
	]) {
		if (hash !== null) assertSha256(hash, "evidence hash");
	}
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

export async function createExperimentManifestV2(
	input: ExperimentManifestV2Input,
): Promise<ExperimentManifestV2> {
	assertManifestInput(input);
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
			contextHashes: [...input.corpus.contextHashes].sort(),
			seeds: [...input.corpus.seeds].sort((left, right) => left - right),
		},
		brain: input.brain,
		environment: input.environment,
		controls: input.controls,
		result: {
			...input.result,
			invariantResults: [...input.result.invariantResults].sort(
				(left, right) =>
					left.invariantId < right.invariantId
						? -1
						: left.invariantId > right.invariantId
							? 1
							: 0,
			),
		},
		evidence: {
			...input.evidence,
			limitations: [...input.evidence.limitations].sort(),
		},
	});
	const manifest = {
		...withoutHash,
		manifestHash: await domainHash(
			"EONFOLK:EXPERIMENT-MANIFEST:v2",
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
		...input
	} = manifest;
	if (nonCanonical !== true) return false;
	if (!SHA256_PATTERN.test(manifestHash)) return false;
	try {
		assertManifestInput(input);
		const recreated = await createExperimentManifestV2(input);
		return jcs(manifest) === jcs(recreated);
	} catch {
		return false;
	}
}
