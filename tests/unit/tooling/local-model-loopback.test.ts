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
		commitmentIdsRead: [],
		counselDisposition: "accepted",
		publicJustification:
			"I will verify the reserve before making a public accusation.",
		relationshipIdsRead: ["relationship-mara-toma"],
		schemaVersion: "eonfolk-model-choice-v1",
		valueIdsRead: [],
		visibleRecordIdsRead: ["observation-ledger-mismatch"],
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
		networkPolicy: "deny-all-required",
		promptTemplateHash: digests.promptTemplateHash,
		proposalSchemaHash: digests.proposalSchemaHash,
		runtime: {
			executable: runtime,
			kind: "other-local",
			sourceCommit: "b".repeat(40),
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
) {
	const server = createServer(handler);
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

async function ollamaHarness(port: number, timeoutMs = 1_000) {
	const adapterPath = resolve("scripts/ollama-bounded-adapter.mjs");
	const contract = await contractFor(process.execPath, adapterPath, timeoutMs);
	const transport = await createMacOsLoopbackOllamaTransport({
		adapterPath,
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
		const contract = await contractFor(process.execPath, adapterPath);
		const directory = await mkdtemp(join(tmpdir(), "eonfolk-adapter-tamper-"));
		temporaryDirectories.push(directory);
		const tamperedPath = join(directory, "ollama-adapter.mjs");
		await writeFile(tamperedPath, "#!/usr/bin/env node\nprocess.exit(0);\n", {
			mode: 0o700,
		});

		await expect(
			createMacOsLoopbackOllamaTransport({
				adapterPath: tamperedPath,
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

	macIt(
		"allows only the configured local API and emits a canonical choice",
		async () => {
			let capturedPath = "";
			let capturedBody: Record<string, unknown> | undefined;
			const { port } = await startServer((request, response) => {
				capturedPath = request.url ?? "";
				const chunks: Buffer[] = [];
				request.on("data", (chunk: Buffer) => chunks.push(chunk));
				request.on("end", () => {
					capturedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
					response.writeHead(200, { "content-type": "application/json" });
					response.end(
						JSON.stringify({ done: true, response: canonicalChoice() }),
					);
				});
			});
			const test = await ollamaHarness(port);

			const proposal = await test.brain.propose(test.context);

			expect(await validateIntentProposal(test.context, proposal)).toBe(
				"accepted",
			);
			expect(capturedPath).toBe("/api/generate");
			expect(capturedBody).toMatchObject({
				model: "fixture-model",
				stream: false,
				think: false,
			});
			const format = capturedBody?.format as {
				properties?: { actionId?: { enum?: string[] } };
			};
			expect(format.properties?.actionId?.enum).toEqual([
				"action-accuse-publicly",
				"action-follow-plan",
				"action-verify-reserve",
			]);
			expect(capturedBody).not.toHaveProperty("messages");
		},
	);

	macIt.each([
		[
			"malformed choice",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(JSON.stringify({ done: true, response: "not-json" }));
			},
			"process-failed",
		],
		[
			"oversized response",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(JSON.stringify({ padding: "x".repeat(70_000) }));
			},
			"process-failed",
		],
		[
			"HTTP failure",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.statusCode = 503;
				response.end(JSON.stringify({ error: "unavailable" }));
			},
			"process-failed",
		],
		[
			"unexpected reasoning output",
			(_request: IncomingMessage, response: ServerResponse) => {
				response.setHeader("content-type", "application/json");
				response.end(
					JSON.stringify({
						done: true,
						response: canonicalChoice(),
						thinking: "private reasoning must not cross the adapter",
					}),
				);
			},
			"process-failed",
		],
	])("fails closed after %s", async (_label, handler, code) => {
		const { port } = await startServer(handler);
		const test = await ollamaHarness(port);

		await expect(test.brain.propose(test.context)).rejects.toMatchObject({
			code,
		});
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
			const contract = await contractFor(runtimePath, runtimePath, 3_000);
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
			});
			const brain = await createContractBoundModelBrain(contract, transport);
			const { context } = await decisionFixture();

			const proposal = await brain.propose(context);

			expect(loopbackConnections).toBe(1);
			expect(proposal.actionId).toBe("action-verify-reserve");
		},
	);
});
