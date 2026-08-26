#!/usr/bin/env node

import { request as httpRequest } from "node:http";

const MAX_FRAME_BYTES = 16_384;
const MAX_OLLAMA_BODY_BYTES = 65_536;
// /api/show for gpt-oss includes tensor metadata (~70 KiB). Choice content stays
// capped separately at MAX_CHOICE_BYTES.
const MAX_OLLAMA_RESPONSE_BYTES = 262_144;
const MAX_CHOICE_BYTES = 16_384;
const OLLAMA_PATH = "/api/chat";
const OLLAMA_SHOW_PATH = "/api/show";
const CHOICE_KEYS = ["actionId", "schemaVersion"].sort();
const TELEMETRY_SCHEMA_VERSION = "eonfolk-local-model-telemetry-v1";
const ERROR_SCHEMA_VERSION = "eonfolk-local-model-error-v1";

class AdapterFailure extends Error {
	constructor(code) {
		super(code);
		this.name = "AdapterFailure";
		this.code = code;
	}
}

function fail(code) {
	throw new AdapterFailure(code);
}

function canonicalJson(value) {
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value)) fail("internal");
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value !== "object") fail("internal");
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
		.join(",")}}`;
}

function exactKeys(value, expected) {
	const actual = Object.keys(value).sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
}

function safeString(value, maximum = 256) {
	return (
		typeof value === "string" &&
		value === value.normalize("NFC") &&
		[...value].length <= maximum &&
		![...value].some((character) => {
			const code = character.codePointAt(0);
			return code <= 0x1f || code === 0x7f;
		})
	);
}

function metric(value) {
	return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parsePort(arguments_) {
	if (arguments_.length !== 1) fail("adapter-configuration-invalid");
	const match = /^--ollama-port=([1-9][0-9]{0,4})$/u.exec(arguments_[0]);
	if (match === null) fail("adapter-configuration-invalid");
	const port = Number(match[1]);
	if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
		fail("adapter-configuration-invalid");
	return port;
}

async function readInvocation() {
	const chunks = [];
	let byteLength = 0;
	for await (const chunk of process.stdin) {
		byteLength += chunk.byteLength;
		if (byteLength > MAX_FRAME_BYTES + 4) fail("invocation-oversized");
		chunks.push(chunk);
	}
	const frame = Buffer.concat(chunks);
	if (frame.byteLength < 5 || frame.readUInt32BE(0) !== frame.byteLength - 4)
		fail("invocation-invalid");
	let frameText;
	let envelope;
	try {
		frameText = new TextDecoder("utf-8", { fatal: true }).decode(
			frame.subarray(4),
		);
		envelope = JSON.parse(frameText);
	} catch {
		fail("invocation-invalid");
	}
	if (
		canonicalJson(envelope) !== frameText ||
		typeof envelope !== "object" ||
		envelope === null ||
		Array.isArray(envelope) ||
		envelope.schemaVersion !== "eonfolk-local-process-invocation-v1" ||
		!safeString(envelope.contractHash, 128) ||
		!safeString(envelope.model?.artifactId, 128) ||
		!/^[0-9a-f]{64}$/u.test(envelope.model?.sha256) ||
		typeof envelope.choiceRequest !== "object" ||
		envelope.choiceRequest === null ||
		Array.isArray(envelope.choiceRequest) ||
		envelope.choiceRequest.schemaVersion !== "eonfolk-model-choice-request-v1"
	)
		fail("invocation-invalid");
	return envelope;
}

function prepareOllamaRequest(envelope) {
	const choiceRequest = envelope.choiceRequest;
	const context = choiceRequest.context;
	if (
		typeof context !== "object" ||
		context === null ||
		Array.isArray(context) ||
		!Array.isArray(context.actionCatalog) ||
		context.actionCatalog.length < 1 ||
		context.actionCatalog.length > 32 ||
		!Array.isArray(context.visibleRecords) ||
		!Array.isArray(context.relationships) ||
		!Array.isArray(context.values)
	)
		fail("request-invalid");
	const actionIds = context.actionCatalog.map((entry) => entry?.actionId);
	if (
		actionIds.some((id) => !safeString(id, 128)) ||
		new Set(actionIds).size !== actionIds.length
	)
		fail("request-invalid");
	const schema = {
		type: "object",
		additionalProperties: false,
		required: CHOICE_KEYS,
		properties: {
			schemaVersion: { enum: ["eonfolk-model-choice-v2"] },
			actionId: { enum: actionIds },
		},
	};
	const contextPrompt = [
		"The authoritative closed response schema is:",
		canonicalJson(schema),
		"The complete visible decision context is:",
		canonicalJson(context),
	].join("\n");
	const requestBody = canonicalJson({
		format: schema,
		messages: [
			{ content: choiceRequest.prompt, role: "system" },
			{ content: contextPrompt, role: "user" },
		],
		model: envelope.model.artifactId,
		options: {
			num_ctx: envelope.generation?.contextTokens,
			num_predict: envelope.generation?.maxOutputTokens,
			seed: envelope.generation?.seed,
			temperature: (envelope.generation?.temperatureBasisPoints ?? 0) / 10_000,
		},
		stream: false,
		think: "low",
	});
	if (Buffer.byteLength(requestBody, "utf8") > MAX_OLLAMA_BODY_BYTES)
		fail("request-oversized");
	return {
		actionIds: new Set(actionIds),
		attestationBody: canonicalJson({ model: envelope.model.artifactId }),
		expectedModelSha256: envelope.model.sha256,
		requestedModelTag: envelope.model.artifactId,
		requestBody,
	};
}

async function invokeOllama(port, path, requestBody) {
	return new Promise((resolve, reject) => {
		const request = httpRequest(
			{
				agent: false,
				headers: {
					"content-length": Buffer.byteLength(requestBody, "utf8"),
					"content-type": "application/json",
				},
				host: "127.0.0.1",
				method: "POST",
				path,
				port,
			},
			(response) => {
				const chunks = [];
				let byteLength = 0;
				const contentType = response.headers["content-type"];
				response.on("data", (chunk) => {
					byteLength += chunk.byteLength;
					if (byteLength > MAX_OLLAMA_RESPONSE_BYTES) {
						response.destroy(new Error("Ollama response is oversized"));
						return;
					}
					chunks.push(chunk);
				});
				response.once("error", reject);
				response.once("end", () => {
					if (response.statusCode !== 200) {
						reject(new Error("Ollama returned a non-success status"));
						return;
					}
					if (
						typeof contentType !== "string" ||
						!/^application\/json(?:\s*;|$)/iu.test(contentType)
					) {
						reject(new AdapterFailure("response-envelope-invalid"));
						return;
					}
					try {
						resolve(
							JSON.parse(
								new TextDecoder("utf-8", { fatal: true }).decode(
									Buffer.concat(chunks),
								),
							),
						);
					} catch {
						reject(new AdapterFailure("response-envelope-invalid"));
					}
				});
			},
		);
		request.once("error", reject);
		request.end(requestBody);
	});
}

function validateModelAttestation(response, references) {
	if (
		typeof response !== "object" ||
		response === null ||
		Array.isArray(response) ||
		typeof response.modelfile !== "string" ||
		!safeString(references.requestedModelTag, 128) ||
		!/^[0-9a-f]{64}$/u.test(references.expectedModelSha256)
	)
		fail("model-attestation-failed");
	const fromLines = response.modelfile
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => /^FROM\s+/u.test(line));
	if (fromLines.length !== 1) fail("model-attestation-failed");
	const match = /^FROM\s+(?:.*[/\\])?sha256[-:]([0-9a-f]{64})$/u.exec(
		fromLines[0],
	);
	if (match?.[1] !== references.expectedModelSha256)
		fail("model-attestation-failed");
}

function validateChoice(ollamaResponse, references) {
	if (
		typeof ollamaResponse !== "object" ||
		ollamaResponse === null ||
		Array.isArray(ollamaResponse) ||
		typeof ollamaResponse.message !== "object" ||
		ollamaResponse.message === null ||
		Array.isArray(ollamaResponse.message) ||
		ollamaResponse.message.role !== "assistant" ||
		typeof ollamaResponse.message.content !== "string" ||
		ollamaResponse.done !== true ||
		Buffer.byteLength(ollamaResponse.message.content, "utf8") > MAX_CHOICE_BYTES
	)
		fail("response-envelope-invalid");
	let choice;
	try {
		choice = JSON.parse(ollamaResponse.message.content);
	} catch {
		fail("choice-json-invalid");
	}
	if (
		typeof choice !== "object" ||
		choice === null ||
		Array.isArray(choice) ||
		!exactKeys(choice, CHOICE_KEYS) ||
		choice.schemaVersion !== "eonfolk-model-choice-v2"
	)
		fail("choice-shape-invalid");
	if (!references.actionIds.has(choice.actionId)) fail("choice-action-invalid");
	return {
		choice: canonicalJson(choice),
		telemetry: canonicalJson({
			doneReason: safeString(ollamaResponse.done_reason, 64)
				? ollamaResponse.done_reason
				: null,
			evalCount: metric(ollamaResponse.eval_count),
			evalDurationNs: metric(ollamaResponse.eval_duration),
			loadDurationNs: metric(ollamaResponse.load_duration),
			promptEvalCount: metric(ollamaResponse.prompt_eval_count),
			promptEvalDurationNs: metric(ollamaResponse.prompt_eval_duration),
			schemaVersion: TELEMETRY_SCHEMA_VERSION,
			totalDurationNs: metric(ollamaResponse.total_duration),
		}),
	};
}

async function main() {
	const port = parsePort(process.argv.slice(2));
	const envelope = await readInvocation();
	const prepared = prepareOllamaRequest(envelope);
	const attestation = await invokeOllama(
		port,
		OLLAMA_SHOW_PATH,
		prepared.attestationBody,
	);
	validateModelAttestation(attestation, prepared);
	const ollamaResponse = await invokeOllama(
		port,
		OLLAMA_PATH,
		prepared.requestBody,
	);
	const validated = validateChoice(ollamaResponse, prepared);
	process.stderr.write(validated.telemetry);
	process.stdout.write(validated.choice);
}

main().catch((error) => {
	const code =
		error instanceof AdapterFailure
			? error.code
			: error instanceof Error &&
					error.message === "Ollama returned a non-success status"
				? "ollama-http-failure"
				: error instanceof Error &&
						error.message === "Ollama response is oversized"
					? "response-oversized"
					: "ollama-transport-failure";
	process.stderr.write(
		canonicalJson({ code, schemaVersion: ERROR_SCHEMA_VERSION }),
	);
	process.exitCode = 1;
});
