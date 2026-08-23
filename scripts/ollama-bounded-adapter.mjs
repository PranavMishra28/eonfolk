#!/usr/bin/env node

import { request as httpRequest } from "node:http";

const MAX_FRAME_BYTES = 16_384;
const MAX_OLLAMA_BODY_BYTES = 65_536;
const MAX_OLLAMA_RESPONSE_BYTES = 65_536;
const MAX_CHOICE_BYTES = 16_384;
const OLLAMA_PATH = "/api/chat";
const CHOICE_KEYS = [
	"actionId",
	"commitmentIdsRead",
	"counselDisposition",
	"publicJustification",
	"relationshipIdsRead",
	"schemaVersion",
	"valueIdsRead",
	"visibleRecordIdsRead",
].sort();
const TELEMETRY_SCHEMA_VERSION = "eonfolk-local-model-telemetry-v1";

function fail(message) {
	throw new Error(message);
}

function canonicalJson(value) {
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value)) fail("non-finite JSON number");
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value !== "object") fail("unsupported JSON value");
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

function uniqueSubset(value, allowed, maximum) {
	return (
		Array.isArray(value) &&
		value.length <= maximum &&
		new Set(value).size === value.length &&
		value.every((item) => safeString(item, 256) && allowed.has(item))
	);
}

function metric(value) {
	return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parsePort(arguments_) {
	if (arguments_.length !== 1) fail("adapter requires one port argument");
	const match = /^--ollama-port=([1-9][0-9]{0,4})$/u.exec(arguments_[0]);
	if (match === null) fail("adapter port argument is invalid");
	const port = Number(match[1]);
	if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
		fail("adapter port is outside the TCP range");
	return port;
}

async function readInvocation() {
	const chunks = [];
	let byteLength = 0;
	for await (const chunk of process.stdin) {
		byteLength += chunk.byteLength;
		if (byteLength > MAX_FRAME_BYTES + 4) fail("invocation frame is oversized");
		chunks.push(chunk);
	}
	const frame = Buffer.concat(chunks);
	if (frame.byteLength < 5 || frame.readUInt32BE(0) !== frame.byteLength - 4)
		fail("invocation frame length is invalid");
	let frameText;
	let envelope;
	try {
		frameText = new TextDecoder("utf-8", { fatal: true }).decode(
			frame.subarray(4),
		);
		envelope = JSON.parse(frameText);
	} catch {
		fail("invocation frame is not UTF-8 JSON");
	}
	if (
		canonicalJson(envelope) !== frameText ||
		typeof envelope !== "object" ||
		envelope === null ||
		Array.isArray(envelope) ||
		envelope.schemaVersion !== "eonfolk-local-process-invocation-v1" ||
		!safeString(envelope.contractHash, 128) ||
		!safeString(envelope.model?.artifactId, 128) ||
		typeof envelope.choiceRequest !== "object" ||
		envelope.choiceRequest === null ||
		Array.isArray(envelope.choiceRequest) ||
		envelope.choiceRequest.schemaVersion !== "eonfolk-model-choice-request-v1"
	)
		fail("invocation envelope is invalid");
	return envelope;
}

function arraySchema(ids, maximum) {
	return {
		type: "array",
		items: ids.length === 0 ? { type: "string" } : { enum: ids },
		maxItems: Math.min(maximum, ids.length),
		uniqueItems: true,
	};
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
		fail("choice context is invalid");
	const actionIds = context.actionCatalog.map((entry) => entry?.actionId);
	if (
		actionIds.some((id) => !safeString(id, 128)) ||
		new Set(actionIds).size !== actionIds.length
	)
		fail("action catalog is not a closed unique set");
	const visibleRecordIds = context.visibleRecords.map(
		(record) => record?.recordId,
	);
	const relationshipIds = context.relationships.map(
		(relationship) => relationship?.relationshipId,
	);
	const valueIds = context.values.map((value) => value?.valueId);
	for (const ids of [visibleRecordIds, relationshipIds, valueIds]) {
		if (
			ids.some((id) => !safeString(id, 256)) ||
			new Set(ids).size !== ids.length
		)
			fail("context reference IDs are invalid");
	}
	const commitmentId = context.activeStandingPlan?.commitmentId;
	if (commitmentId !== null && !safeString(commitmentId, 256))
		fail("standing-plan commitment ID is invalid");
	const commitmentIds = commitmentId === null ? [] : [commitmentId];
	const schema = {
		type: "object",
		additionalProperties: false,
		required: CHOICE_KEYS,
		properties: {
			schemaVersion: { const: "eonfolk-model-choice-v1" },
			actionId: { enum: actionIds },
			publicJustification: {
				type: "string",
				minLength: 8,
				maxLength: 180,
				pattern: "[.!?…]$",
			},
			visibleRecordIdsRead: arraySchema(visibleRecordIds, 32),
			relationshipIdsRead: arraySchema(relationshipIds, 128),
			valueIdsRead: arraySchema(valueIds, 128),
			commitmentIdsRead: arraySchema(commitmentIds, 32),
			counselDisposition: {
				enum: ["accepted", "rejected", "reinterpreted", "not-applicable"],
			},
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
		fail("Ollama request body is oversized");
	return {
		actionIds: new Set(actionIds),
		commitmentIds: new Set(commitmentIds),
		relationshipIds: new Set(relationshipIds),
		requestBody,
		valueIds: new Set(valueIds),
		visibleRecordIds: new Set(visibleRecordIds),
	};
}

async function invokeOllama(port, requestBody) {
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
				path: OLLAMA_PATH,
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
					if (
						response.statusCode !== 200 ||
						typeof contentType !== "string" ||
						!/^application\/json(?:\s*;|$)/iu.test(contentType)
					) {
						reject(new Error("Ollama returned a non-success status"));
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
						reject(new Error("Ollama response is not UTF-8 JSON"));
					}
				});
			},
		);
		request.once("error", reject);
		request.end(requestBody);
	});
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
		fail("Ollama response envelope is invalid");
	let choice;
	try {
		choice = JSON.parse(ollamaResponse.message.content);
	} catch {
		fail("Ollama choice is not JSON");
	}
	if (
		typeof choice !== "object" ||
		choice === null ||
		Array.isArray(choice) ||
		!exactKeys(choice, CHOICE_KEYS) ||
		choice.schemaVersion !== "eonfolk-model-choice-v1" ||
		!references.actionIds.has(choice.actionId) ||
		!safeString(choice.publicJustification, 180) ||
		[...choice.publicJustification].length < 8 ||
		!/[.!?…]$/u.test(choice.publicJustification) ||
		!uniqueSubset(
			choice.visibleRecordIdsRead,
			references.visibleRecordIds,
			32,
		) ||
		!uniqueSubset(
			choice.relationshipIdsRead,
			references.relationshipIds,
			128,
		) ||
		!uniqueSubset(choice.valueIdsRead, references.valueIds, 128) ||
		!uniqueSubset(choice.commitmentIdsRead, references.commitmentIds, 32) ||
		!["accepted", "rejected", "reinterpreted", "not-applicable"].includes(
			choice.counselDisposition,
		)
	)
		fail("Ollama choice violates the closed schema");
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
	const ollamaResponse = await invokeOllama(port, prepared.requestBody);
	const validated = validateChoice(ollamaResponse, prepared);
	process.stderr.write(validated.telemetry);
	process.stdout.write(validated.choice);
}

main().catch(() => {
	process.stderr.write("bounded Ollama adapter failed closed\n");
	process.exitCode = 1;
});
