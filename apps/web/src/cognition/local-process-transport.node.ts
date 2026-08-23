import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import {
	type ContractBoundModelChoiceTransport,
	type LocalArtifactIdentity,
	type LocalProcessBrainContract,
	type ModelChoiceRequest,
	verifyLocalProcessBrainContract,
} from "../../../../packages/cognition/src/index.js";
import { jcs } from "../../../../packages/protocol/src/index.js";

const MACOS_SANDBOX_EXECUTABLE = "/usr/bin/sandbox-exec";
const ZERO_EGRESS_PROFILE = "(version 1) (allow default) (deny network*)";
const MAX_ARGUMENTS = 64;
const MAX_ARGUMENT_CODE_POINTS = 4_096;
const FORCE_KILL_GRACE_MS = 25;
const CLOSE_GRACE_MS = 250;

export type LocalProcessTransportFailure =
	| "aborted"
	| "artifact-mismatch"
	| "busy"
	| "malformed-output"
	| "process-failed"
	| "request-too-large"
	| "stderr-too-large"
	| "stdout-too-large"
	| "timeout"
	| "unsupported-host";

export class LocalProcessTransportError extends Error {
	readonly code: LocalProcessTransportFailure;

	constructor(code: LocalProcessTransportFailure, message: string) {
		super(message);
		this.name = "LocalProcessTransportError";
		this.code = code;
	}
}

export interface LocalProcessArtifactPaths {
	readonly runtimeExecutable: string;
	readonly model: string;
	readonly tokenizer: string;
	readonly modelConfiguration: string;
	readonly chatTemplate: string;
}

export interface MacOsLocalProcessTransportConfiguration {
	readonly contract: LocalProcessBrainContract;
	readonly artifactPaths: LocalProcessArtifactPaths;
	/** Arguments are fixed host configuration, never model output. */
	readonly runtimeArguments: readonly string[];
	readonly environment: Readonly<Record<string, string>>;
	readonly cohort: "cold" | "warm";
}

interface InvocationEnvelope {
	readonly schemaVersion: "eonfolk-local-process-invocation-v1";
	readonly contractHash: string;
	readonly adapter: {
		readonly adapterId: string;
		readonly adapterVersion: string;
		readonly adapterHash: string;
	};
	readonly runtime: LocalProcessBrainContract["runtime"];
	readonly model: LocalArtifactIdentity;
	readonly tokenizer: LocalArtifactIdentity;
	readonly modelConfiguration: LocalArtifactIdentity;
	readonly chatTemplate: LocalArtifactIdentity;
	readonly promptTemplateHash: string;
	readonly proposalSchemaHash: string;
	readonly generation: LocalProcessBrainContract["generation"];
	readonly choiceRequest: ModelChoiceRequest;
}

function failure(
	code: LocalProcessTransportFailure,
	message: string,
): LocalProcessTransportError {
	return new LocalProcessTransportError(code, message);
}

function assertSafeAbsolutePath(value: string, label: string): void {
	if (
		!isAbsolute(value) ||
		value !== value.normalize("NFC") ||
		[...value].length > 4_096 ||
		[...value].some((character) => {
			const code = character.codePointAt(0);
			return code !== undefined && (code <= 0x1f || code === 0x7f);
		})
	)
		throw failure("artifact-mismatch", `${label} is not a safe absolute path`);
}

function assertArguments(arguments_: readonly string[]): void {
	if (arguments_.length > MAX_ARGUMENTS)
		throw new RangeError("local runtime has too many arguments");
	for (const argument of arguments_) {
		if (
			argument !== argument.normalize("NFC") ||
			[...argument].length > MAX_ARGUMENT_CODE_POINTS ||
			[...argument].some((character) => {
				const code = character.codePointAt(0);
				return code === 0 || code === 0x0a || code === 0x0d;
			})
		)
			throw new TypeError("local runtime argument violates its text budget");
	}
}

function assertEnvironment(
	contract: LocalProcessBrainContract,
	environment: Readonly<Record<string, string>>,
): void {
	const actualNames = Object.keys(environment).sort();
	const expectedNames = [...contract.environmentNames].sort();
	if (
		actualNames.length !== expectedNames.length ||
		actualNames.some((name, index) => name !== expectedNames[index])
	)
		throw new Error("local runtime environment does not match its contract");
	for (const value of Object.values(environment)) {
		if (!/^[a-zA-Z0-9._-]{1,64}$/u.test(value))
			throw new TypeError(
				"local runtime environment value is not bounded text",
			);
	}
	if (
		contract.runtime.kind === "mlx-lm" &&
		(environment.HF_HUB_OFFLINE !== "1" ||
			environment.TRANSFORMERS_OFFLINE !== "1")
	)
		throw new Error("MLX-LM offline environment guards must be enabled");
}

async function sha256File(path: string): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk);
	return hash.digest("hex");
}

async function verifyArtifact(
	path: string,
	identity: LocalArtifactIdentity,
	label: string,
): Promise<string> {
	assertSafeAbsolutePath(path, label);
	const canonicalPath = await realpath(path);
	const metadata = await stat(canonicalPath);
	if (!metadata.isFile() || metadata.size !== identity.byteLength)
		throw failure("artifact-mismatch", `${label} byte identity does not match`);
	if ((await sha256File(canonicalPath)) !== identity.sha256)
		throw failure("artifact-mismatch", `${label} digest does not match`);
	return canonicalPath;
}

function frameRequest(envelope: InvocationEnvelope, maximum: number): Buffer {
	const body = Buffer.from(jcs(envelope), "utf8");
	if (body.byteLength > maximum)
		throw failure(
			"request-too-large",
			"local model request exceeds its budget",
		);
	const prefix = Buffer.allocUnsafe(4);
	prefix.writeUInt32BE(body.byteLength, 0);
	return Buffer.concat([prefix, body]);
}

function decodeCanonicalOutput(chunks: readonly Buffer[]): string {
	const bytes = Buffer.concat(chunks);
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw failure("malformed-output", "local model output is not UTF-8");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw failure(
			"malformed-output",
			"local model output is not one JSON value",
		);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		throw failure(
			"malformed-output",
			"local model output is not one JSON object",
		);
	if (jcs(parsed) !== text)
		throw failure(
			"malformed-output",
			"local model output is not canonical JSON",
		);
	return text;
}

function terminateProcess(child: ChildProcessWithoutNullStreams): void {
	if (child.pid === undefined) return;
	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		child.kill("SIGTERM");
	}
	setTimeout(() => {
		if (child.exitCode !== null || child.signalCode !== null) return;
		try {
			process.kill(-child.pid!, "SIGKILL");
		} catch {
			child.kill("SIGKILL");
		}
	}, FORCE_KILL_GRACE_MS).unref();
}

async function invokeProcess(input: {
	readonly runtimeExecutable: string;
	readonly runtimeArguments: readonly string[];
	readonly environment: Readonly<Record<string, string>>;
	readonly frame: Buffer;
	readonly maxStdoutBytes: number;
	readonly maxStderrBytes: number;
	readonly timeoutMs: number;
	readonly signal?: AbortSignal;
}): Promise<string> {
	if (input.signal?.aborted)
		throw failure("aborted", "local model invocation was cancelled");
	return new Promise<string>((resolve, reject) => {
		const child = spawn(
			MACOS_SANDBOX_EXECUTABLE,
			[
				"-p",
				ZERO_EGRESS_PROFILE,
				input.runtimeExecutable,
				...input.runtimeArguments,
			],
			{
				cwd: "/",
				detached: true,
				env: { LANG: "C", LC_ALL: "C", ...input.environment },
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		const stdout: Buffer[] = [];
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let pendingFailure: LocalProcessTransportError | null = null;
		let completed = false;

		const settle = (error?: Error): void => {
			if (completed) return;
			completed = true;
			clearTimeout(timeout);
			clearTimeout(closeDeadline);
			input.signal?.removeEventListener("abort", abort);
			if (error !== undefined) reject(error);
			else {
				try {
					resolve(decodeCanonicalOutput(stdout));
				} catch (decodeError) {
					reject(decodeError);
				}
			}
		};
		const stop = (error: LocalProcessTransportError): void => {
			if (pendingFailure !== null) return;
			pendingFailure = error;
			terminateProcess(child);
			closeDeadline = setTimeout(() => settle(error), CLOSE_GRACE_MS);
			closeDeadline.unref();
		};
		const abort = (): void =>
			stop(failure("aborted", "local model invocation was cancelled"));
		const timeout = setTimeout(
			() => stop(failure("timeout", "local model invocation timed out")),
			input.timeoutMs,
		);
		timeout.unref();
		let closeDeadline: ReturnType<typeof setTimeout> | undefined;

		input.signal?.addEventListener("abort", abort, { once: true });
		child.stdout.on("data", (chunk: Buffer) => {
			stdoutBytes += chunk.byteLength;
			if (stdoutBytes > input.maxStdoutBytes) {
				stop(
					failure("stdout-too-large", "local model stdout exceeded its budget"),
				);
				return;
			}
			stdout.push(chunk);
		});
		child.stderr.on("data", (chunk: Buffer) => {
			stderrBytes += chunk.byteLength;
			if (stderrBytes > input.maxStderrBytes)
				stop(
					failure("stderr-too-large", "local model stderr exceeded its budget"),
				);
		});
		child.once("error", () => {
			settle(failure("process-failed", "local model process could not start"));
		});
		child.once("close", (code, signal) => {
			if (pendingFailure !== null) {
				settle(pendingFailure);
				return;
			}
			if (code !== 0 || signal !== null) {
				settle(failure("process-failed", "local model process failed"));
				return;
			}
			settle();
		});
		child.stdin.once("error", () => {
			stop(
				failure("process-failed", "local model process rejected its request"),
			);
		});
		child.stdin.end(input.frame);
	});
}

/**
 * Creates the only executable model seam. It is macOS-only because this
 * implementation depends on sandbox-exec's kernel-enforced network denial.
 * Artifacts must already exist locally and are verified before first use.
 */
export async function createMacOsLocalProcessTransport(
	configuration: MacOsLocalProcessTransportConfiguration,
): Promise<ContractBoundModelChoiceTransport> {
	if (process.platform !== "darwin")
		throw failure(
			"unsupported-host",
			"the local model transport requires the macOS sandbox executable",
		);
	try {
		if (!(await stat(MACOS_SANDBOX_EXECUTABLE)).isFile())
			throw new Error("not a regular file");
	} catch {
		throw failure(
			"unsupported-host",
			"the local model transport requires the macOS sandbox executable",
		);
	}
	if (!(await verifyLocalProcessBrainContract(configuration.contract)))
		throw failure("artifact-mismatch", "local model contract hash is invalid");
	assertArguments(configuration.runtimeArguments);
	assertEnvironment(configuration.contract, configuration.environment);

	const checks = [
		[
			configuration.artifactPaths.runtimeExecutable,
			configuration.contract.runtime.executable,
			"runtime",
		],
		[configuration.artifactPaths.model, configuration.contract.model, "model"],
		[
			configuration.artifactPaths.tokenizer,
			configuration.contract.tokenizer,
			"tokenizer",
		],
		[
			configuration.artifactPaths.modelConfiguration,
			configuration.contract.modelConfiguration,
			"model configuration",
		],
		[
			configuration.artifactPaths.chatTemplate,
			configuration.contract.chatTemplate,
			"chat template",
		],
	] as const;
	const verifiedByIdentity = new Map<string, Promise<string>>();
	const verifiedPaths = await Promise.all(
		checks.map(([path, identity, label]) => {
			const key = `${path}\0${identity.byteLength}\0${identity.sha256}`;
			let verification = verifiedByIdentity.get(key);
			if (verification === undefined) {
				verification = verifyArtifact(path, identity, label);
				verifiedByIdentity.set(key, verification);
			}
			return verification;
		}),
	);
	const runtimeExecutable = verifiedPaths[0]!;
	const timeoutMs =
		configuration.cohort === "cold"
			? configuration.contract.limits.coldTimeoutMs
			: configuration.contract.limits.warmTimeoutMs;
	let busy = false;

	return {
		contractHash: configuration.contract.contractHash,
		async invoke(request, signal): Promise<string> {
			if (busy)
				throw failure("busy", "local model transport is already active");
			busy = true;
			try {
				const envelope: InvocationEnvelope = {
					schemaVersion: "eonfolk-local-process-invocation-v1",
					contractHash: configuration.contract.contractHash,
					adapter: {
						adapterId: configuration.contract.adapterId,
						adapterVersion: configuration.contract.adapterVersion,
						adapterHash: configuration.contract.adapterHash,
					},
					runtime: configuration.contract.runtime,
					model: configuration.contract.model,
					tokenizer: configuration.contract.tokenizer,
					modelConfiguration: configuration.contract.modelConfiguration,
					chatTemplate: configuration.contract.chatTemplate,
					promptTemplateHash: configuration.contract.promptTemplateHash,
					proposalSchemaHash: configuration.contract.proposalSchemaHash,
					generation: configuration.contract.generation,
					choiceRequest: request,
				};
				return await invokeProcess({
					runtimeExecutable,
					runtimeArguments: configuration.runtimeArguments,
					environment: configuration.environment,
					frame: frameRequest(
						envelope,
						configuration.contract.limits.maxRequestBytes,
					),
					maxStdoutBytes: configuration.contract.limits.maxStdoutBytes,
					maxStderrBytes: configuration.contract.limits.maxStderrBytes,
					timeoutMs,
					...(signal === undefined ? {} : { signal }),
				});
			} finally {
				busy = false;
			}
		},
	};
}
