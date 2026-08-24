import { createHash } from "node:crypto";
import {
	chmod,
	mkdtemp,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
	createMacOsLocalProcessTransport,
	createMacOsLoopbackOllamaTransport,
	type LocalProcessInvocationTelemetry,
} from "../../../apps/web/src/cognition/local-process-transport.node.js";
import {
	createContractBoundModelBrain,
	createLocalProcessBrainContract,
	modelChoiceContractDigests,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import { jcs } from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

const temporaryDirectories: string[] = [];
const openServers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
	for (const server of openServers.splice(0)) {
		server.closeAllConnections();
		await new Promise<void>((resolveClose) =>
			server.close(() => resolveClose()),
		);
	}
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true })),
	);
});

function canonicalChoice(overrides: Record<string, unknown> = {}): string {
	return jcs({
		actionId: "action-verify-reserve",
		schemaVersion: "eonfolk-model-choice-v2",
		...overrides,
	});
}

async function artifactIdentity(path: string, artifactId: string) {
	const bytes = await readFile(path);
	return {
		artifactId,
		byteLength: (await stat(path)).size,
		licenseId: "MIT",
		licenseTextSha256: "a".repeat(64),
		sha256: createHash("sha256").update(bytes).digest("hex"),
		version: "fixture-v1",
	};
}

async function contractFor(
	runtimePath: string,
	adapterPath = runtimePath,
	timeoutMs = 1_000,
	ollamaPort?: number,
) {
	const runtime = await artifactIdentity(runtimePath, "bounded-ollama-adapter");
	const adapter = await artifactIdentity(adapterPath, "bounded-ollama-adapter");
	const digests = await modelChoiceContractDigests();
	return createLocalProcessBrainContract({
		adapterHash: adapter.sha256,
		adapterId: "bounded-ollama-adapter",
		adapterVersion: "fixture-v1",
		chatTemplate: { ...adapter, artifactId: "fixture-chat-template" },
		environmentNames: [],
		generation: {
			contextTokens: 2_048,
			maxOutputTokens: 128,
			seed: 7,
			temperatureBasisPoints: 0,
		},
		limits: {
			coldTimeoutMs: Math.max(timeoutMs, 1),
			maxRequestBytes: 16_384,
			maxStderrBytes: 2_048,
			maxStdoutBytes: 16_384,
			retries: 0,
			warmTimeoutMs: Math.max(timeoutMs, 1),
		},
		model: { ...adapter, artifactId: "fixture-model" },
		modelConfiguration: {
			...adapter,
			artifactId: "fixture-model-configuration",
		},
		modelSource: "preprovisioned-local",
		networkPolicy:
			ollamaPort === undefined
				? "deny-all-required"
				: "loopback-single-port-required",
		localEndpoint:
			ollamaPort === undefined
				? null
				: {
						kind: "ollama-loopback",
						host: "127.0.0.1",
						port: ollamaPort,
					},
		promptTemplateHash: digests.promptTemplateHash,
		proposalSchemaHash: digests.proposalSchemaHash,
		runtime: {
			executable: runtime,
			kind: "other-local",
			sourceCommit: "b".repeat(40),
		},
		serviceRuntime:
			ollamaPort === undefined
				? null
				: {
						kind: "ollama" as const,
						sourceCommit: "b".repeat(40),
						executable: runtime,
					},
		tokenizer: { ...adapter, artifactId: "fixture-tokenizer" },
		transport: "length-prefixed-jcs-stdin-single-jcs-stdout",
		trustRemoteCode: false,
	});
}

async function decisionFixture() {
	return riverholdDecisionFixture({ counselIntent: "verify-reserve" });
}

async function startServer(
	handler: (request: IncomingMessage, response: ServerResponse) => void,
	attestedModelSha256?: string,
) {
	const defaultModelSha256 = createHash("sha256")
		.update(await readFile(resolve("scripts/ollama-bounded-adapter.mjs")))
		.digest("hex");
	const server = createServer((request, response) => {
		if (request.url !== "/api/show") {
			handler(request, response);
			return;
		}
		request.resume();
		request.once("end", () => {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					modelfile: `# exact local fixture\nFROM /fixture/blobs/sha256-${attestedModelSha256 ?? defaultModelSha256}`,
				}),
			);
		});
	});
	openServers.push(server);
	await new Promise<void>((resolveListen, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolveListen);
	});
	const address = server.address();
	if (address === null || typeof address === "string")
		throw new Error("test server did not bind a TCP port");
	return { port: address.port, server };
}

async function ollamaHarness(
	port: number,
	timeoutMs = 1_000,
	onTelemetry?: (telemetry: LocalProcessInvocationTelemetry) => void,
) {
	const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
	const contract = await contractFor(
		process.execPath,
		adapterPath,
		timeoutMs,
		port,
	);
	const transport = await createMacOsLoopbackOllamaTransport({
		adapterPath,
		ollamaExecutablePath: process.execPath,
		artifactPaths: {
			chatTemplate: adapterPath,
			model: adapterPath,
			modelConfiguration: adapterPath,
			runtimeExecutable: process.execPath,
			tokenizer: adapterPath,
		},
		cohort: "warm",
		contract,
		environment: {},
		...(onTelemetry === undefined ? {} : { onTelemetry }),
		ollamaPort: port,
	});
	return {
		brain: await createContractBoundModelBrain(contract, transport),
		context: (await decisionFixture()).context,
	};
}

const macIt = process.platform === "darwin" ? it : it.skip;

describe("bounded Ollama loopback adapter", () => {
	it("rejects an adapter whose bytes do not match the contract", async () => {
		const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
		const contract = await contractFor(
			process.execPath,
			adapterPath,
			1_000,
			11_434,
		);
		const directory = await mkdtemp(join(tmpdir(), "eonfolk-adapter-tamper-"));
		temporaryDirectories.push(directory);
		const tamperedPath = join(directory, "ollama-adapter.mjs");
		await writeFile(tamperedPath, "#!/usr/bin/env node\nprocess.exit(0);\n", {
			mode: 0o700,
		});

		await expect(
			createMacOsLoopbackOllamaTransport({
				adapterPath: tamperedPath,
				ollamaExecutablePath: process.execPath,
				artifactPaths: {
					chatTemplate: adapterPath,
					model: adapterPath,
					modelConfiguration: adapterPath,
					runtimeExecutable: process.execPath,
					tokenizer: adapterPath,
				},
				cohort: "warm",
				contract,
				environment: {},
				ollamaPort: 11_434,
			}),
		).rejects.toMatchObject({ code: "artifact-mismatch" });
	});

	it("rejects an Ollama port not bound into contract provenance", async () => {
		const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
		const contract = await contractFor(
			process.execPath,
			adapterPath,
			1_000,
			11_434,
		);
		await expect(
			createMacOsLoopbackOllamaTransport({
				adapterPath,
				ollamaExecutablePath: process.execPath,
				artifactPaths: {
					chatTemplate: adapterPath,
					model: adapterPath,
					modelConfiguration: adapterPath,
					runtimeExecutable: process.execPath,
					tokenizer: adapterPath,
				},
				cohort: "warm",
				contract,
				environment: {},
				ollamaPort: 11_435,
			}),
		).rejects.toMatchObject({ code: "artifact-mismatch" });
	});

	macIt(
		"rejects service runtime bytes not bound into contract provenance",
		async () => {
			const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
			const contract = await contractFor(
				process.execPath,
				adapterPath,
				1_000,
				11_434,
			);
			await expect(
				createMacOsLoopbackOllamaTransport({
					adapterPath,
					ollamaExecutablePath: adapterPath,
					artifactPaths: {
						chatTemplate: adapterPath,
						model: adapterPath,
						modelConfiguration: adapterPath,
						runtimeExecutable: process.execPath,
						tokenizer: adapterPath,
					},
					cohort: "warm",
					contract,
					environment: {},
					ollamaPort: 11_434,
				}),
			).rejects.toMatchObject({ code: "artifact-mismatch" });
		},
	);

	macIt(
		"allows only the configured local API and emits a canonical choice",
		async () => {
			let capturedPath = "";
			let capturedBody: Record<string, unknown> | undefined;
			const telemetry: LocalProcessInvocationTelemetry[] = [];
			const { port } = await startServer((request, response) => {
				capturedPath = request.url ?? "";
				const chunks: Buffer[] = [];
				request.on("data", (chunk: Buffer) => chunks.push(chunk));
				request.on("end", () => {
					capturedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
					response.writeHead(200, { "content-type": "application/json" });
					response.end(
						JSON.stringify({
							done: true,
							done_reason: "stop",
							eval_count: 41,
							eval_duration: 820_000_000,
							load_duration: 12_000_000,
							prompt_eval_count: 301,
							prompt_eval_duration: 602_000_000,
							message: {
								role: "assistant",
								content: canonicalChoice(),
								thinking: "discarded private working text",
							},
							total_duration: 1_500_000_000,
						}),
					);
				});
			});
			const test = await ollamaHarness(port, 1_000, (value) => {
				telemetry.push(value);
				throw new Error("telemetry observer failure must not affect cognition");
			});

			const proposal = await test.brain.propose(test.context);

			expect(await validateIntentProposal(test.context, proposal)).toBe(
				"accepted",
			);
			expect(capturedPath).toBe("/api/chat");
			expect(capturedBody).toMatchObject({
				model: "fixture-model",
				stream: false,
				think: "low",
			});
			const format = capturedBody?.format as {
				properties?: {
					actionId?: { enum?: string[] };
				};
			};
			expect(format.properties?.actionId?.enum).toEqual([
				"action-accuse-publicly",
				"action-follow-plan",
				"action-verify-reserve",
			]);
			expect(capturedBody?.messages).toEqual([
				expect.objectContaining({ role: "system" }),
				expect.objectContaining({ role: "user" }),
			]);
			expect(JSON.stringify(proposal)).not.toContain(
				"discarded private working text",
			);
			expect(telemetry).toEqual([
				expect.objectContaining({
					doneReason: "stop",
					evalCount: 41,
					evalDurationNs: 820_000_000,
					promptEvalCount: 301,
					totalDurationNs: 1_500_000_000,
				}),
			]);
		},
	);

	macIt(
		"fails closed before inference when the requested tag is not attested to the contracted model hash",
		async () => {
			let chatRequests = 0;
			const { port } = await startServer((_request, response) => {
				chatRequests += 1;
				response.end("unexpected");
			}, "f".repeat(64));
			const test = await ollamaHarness(port);

			const received = await test.brain
				.propose(test.context)
				.catch((error) => error);
			expect(received).toMatchObject({ code: "process-failed" });
			expect(received.message).toBe(
				"local model adapter failed: model-attestation-failed",
			);
			expect(chatRequests).toBe(0);
		},
	);

	macIt.each([
		[
			"unexpected model field",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(
					JSON.stringify({
						done: true,
						message: {
							role: "assistant",
							content: canonicalChoice({
								publicJustification: "untrusted copy",
							}),
						},
					}),
				);
			},
			"choice-shape-invalid",
		],
		[
			"malformed choice",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(
					JSON.stringify({
						done: true,
						message: { role: "assistant", content: "not-json" },
					}),
				);
			},
			"choice-json-invalid",
		],
		[
			"oversized response",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(JSON.stringify({ padding: "x".repeat(70_000) }));
			},
			"response-oversized",
		],
		[
			"HTTP failure",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.statusCode = 503;
				response.end(JSON.stringify({ error: "unavailable" }));
			},
			"ollama-http-failure",
		],
	])("fails closed after %s", async (_label, handler, adapterCode) => {
		const { port } = await startServer(handler);
		const test = await ollamaHarness(port);

		const received = await test.brain
			.propose(test.context)
			.catch((error) => error);
		expect(received).toMatchObject({ code: "process-failed" });
		expect(received.message).toBe(`local model adapter failed: ${adapterCode}`);
	});

	macIt("terminates a hung local API at the contract timeout", async () => {
		const { port } = await startServer(() => undefined);
		const test = await ollamaHarness(port, 25);

		await expect(test.brain.propose(test.context)).rejects.toMatchObject({
			code: "timeout",
		});
	});

	macIt(
		"keeps loopback denied when the opt-in helper is not used",
		async () => {
			let requests = 0;
			const { port } = await startServer((_request, response) => {
				requests += 1;
				response.end(
					JSON.stringify({ done: true, response: canonicalChoice() }),
				);
			});
			const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
			const contract = await contractFor(process.execPath, adapterPath);
			const transport = await createMacOsLocalProcessTransport({
				artifactPaths: {
					chatTemplate: adapterPath,
					model: adapterPath,
					modelConfiguration: adapterPath,
					runtimeExecutable: process.execPath,
					tokenizer: adapterPath,
				},
				cohort: "warm",
				contract,
				environment: {},
				runtimeArguments: [adapterPath, `--ollama-port=${port}`],
			});
			const brain = await createContractBoundModelBrain(contract, transport);
			const { context } = await decisionFixture();

			await expect(brain.propose(context)).rejects.toMatchObject({
				code: "process-failed",
			});
			expect(requests).toBe(0);
		},
	);

	macIt(
		"allows the selected loopback port while kernel-denying external egress",
		async () => {
			let loopbackConnections = 0;
			const { port } = await startServer((_request, response) => {
				loopbackConnections += 1;
				response.end("ok");
			});
			const directory = await mkdtemp(join(tmpdir(), "eonfolk-egress-proof-"));
			temporaryDirectories.push(directory);
			const runtimePath = join(directory, "egress-proof");
			const script = `#!${process.execPath}\nconst http=require("node:http");const chunks=[];process.stdin.on("data",c=>chunks.push(c));process.stdin.on("end",()=>{const local=http.request({host:"127.0.0.1",port:${port},path:"/",method:"GET"},res=>{res.resume();res.on("end",()=>{const external=require("node:net").connect({host:"1.1.1.1",port:80});const timer=setTimeout(()=>process.exit(51),500);external.on("connect",()=>{clearTimeout(timer);process.stdout.write(${JSON.stringify(canonicalChoice({ actionId: "external-egress-breach" }))});external.destroy();});external.on("error",()=>{clearTimeout(timer);process.stdout.write(${JSON.stringify(canonicalChoice())});});});});local.on("error",()=>process.exit(50));local.end();});\n`;
			await writeFile(runtimePath, script, { mode: 0o700 });
			await chmod(runtimePath, 0o700);
			const contract = await contractFor(runtimePath, runtimePath, 3_000, port);
			const transport = await createMacOsLocalProcessTransport({
				artifactPaths: {
					chatTemplate: runtimePath,
					model: runtimePath,
					modelConfiguration: runtimePath,
					runtimeExecutable: runtimePath,
					tokenizer: runtimePath,
				},
				cohort: "warm",
				contract,
				environment: {},
				localEndpoint: { kind: "ollama-loopback", port },
				runtimeArguments: [],
				serviceRuntimeExecutable: runtimePath,
			});
			const brain = await createContractBoundModelBrain(contract, transport);
			const { context } = await decisionFixture();

			const proposal = await brain.propose(context);

			expect(loopbackConnections).toBe(1);
			expect(proposal.actionId).toBe("action-verify-reserve");
		},
	);
});
