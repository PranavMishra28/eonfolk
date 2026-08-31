import { createHash } from "node:crypto";
import {
	chmod,
	mkdtemp,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createMacOsLocalProcessTransport } from "../../../apps/web/src/cognition/local-process-transport.node.js";
import {
	createContractBoundModelBrain,
	createLocalProcessBrainContract,
	modelChoiceContractDigests,
	runDecisionGateway,
	standardBrain,
	validateIntentProposal,
} from "../../../packages/cognition/src/index.js";
import { jcs, seedPrng } from "../../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../../fixtures/riverhold/index.js";

const temporaryDirectories: string[] = [];
type FixtureMode = "success" | "fail" | "hang" | "late" | "network";

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true })),
	);
});

function choice(overrides: Record<string, unknown> = {}): string {
	return jcs({
		actionId: "action-verify-reserve",
		schemaVersion: "eonfolk-model-choice-v2",
		...overrides,
	});
}

async function fixtureScript(input: {
	readonly mode: FixtureMode;
	readonly output?: string;
	readonly markerPath?: string;
	readonly networkPort?: number;
}): Promise<{ readonly directory: string; readonly path: string }> {
	const directory = await mkdtemp(join(tmpdir(), "eonfolk-model-host-"));
	temporaryDirectories.push(directory);
	const path = join(directory, "fixture-runtime");
	const source = `#!${process.execPath}\nconst chunks=[];process.stdin.on("data",chunk=>chunks.push(chunk));process.stdin.on("end",()=>{const frame=Buffer.concat(chunks);if(frame.length<5||frame.readUInt32BE(0)!==frame.length-4)process.exit(41);const envelope=JSON.parse(frame.subarray(4).toString("utf8"));if(envelope.schemaVersion!=="eonfolk-local-process-invocation-v1"||!envelope.contractHash||!envelope.choiceRequest?.context?.actorId)process.exit(42);const mode=${JSON.stringify(input.mode)};if(mode==="fail")process.exit(7);if(mode==="hang")return setInterval(()=>{},1000);const emit=()=>{${input.markerPath === undefined ? "" : `require("node:fs").writeFileSync(${JSON.stringify(input.markerPath)},"late");`}process.stdout.write(Buffer.from(${JSON.stringify(input.output ?? choice())},"utf8"));};if(mode==="network"){const socket=require("node:net").connect({host:"127.0.0.1",port:${String(input.networkPort ?? 1)}},emit);socket.on("error",()=>process.exit(9));return;}if(mode==="late")setTimeout(emit,150);else emit();});\n`;
	await writeFile(path, source, { mode: 0o700 });
	await chmod(path, 0o700);
	return { directory, path };
}

async function identity(path: string) {
	const bytes = await readFile(path);
	return {
		artifactId: "fixture-artifact",
		byteLength: (await stat(path)).size,
		licenseId: "MIT",
		licenseTextSha256: "a".repeat(64),
		sha256: createHash("sha256").update(bytes).digest("hex"),
		version: "fixture-v1",
	};
}

async function harness(input: {
	readonly mode: FixtureMode;
	readonly output?: string;
	readonly markerPath?: string;
	readonly networkPort?: number;
	readonly timeoutMs?: number;
}) {
	const { context } = await riverholdDecisionFixture({
		counselIntent: "verify-reserve",
	});
	const script = await fixtureScript(input);
	const artifact = await identity(script.path);
	const digests = await modelChoiceContractDigests();
	const timeoutMs = input.timeoutMs ?? 1_000;
	const contract = await createLocalProcessBrainContract({
		adapterHash: artifact.sha256,
		adapterId: "fixture-adapter",
		adapterVersion: "fixture-v1",
		chatTemplate: artifact,
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
			maxStdoutBytes: 2_048,
			retries: 0,
			warmTimeoutMs: Math.max(timeoutMs, 1),
		},
		model: { ...artifact, artifactId: "fixture-model" },
		modelConfiguration: artifact,
		modelSource: "preprovisioned-local",
		networkPolicy: "deny-all-required",
		localEndpoint: null,
		promptTemplateHash: digests.promptTemplateHash,
		proposalSchemaHash: digests.proposalSchemaHash,
		runtime: {
			executable: artifact,
			kind: "other-local",
			sourceCommit: "b".repeat(40),
		},
		serviceRuntime: null,
		tokenizer: artifact,
		transport: "length-prefixed-jcs-stdin-single-jcs-stdout",
		trustRemoteCode: false,
	});
	const transport = await createMacOsLocalProcessTransport({
		artifactPaths: {
			chatTemplate: script.path,
			model: script.path,
			modelConfiguration: script.path,
			runtimeExecutable: script.path,
			tokenizer: script.path,
		},
		cohort: "warm",
		contract,
		environment: {},
		runtimeArguments: [],
	});
	const brain = await createContractBoundModelBrain(contract, transport);
	const prngState = await seedPrng(
		new Uint8Array(32).fill(13),
		"local-process-test",
		context.actorId,
		"fallback",
	);
	return {
		brain,
		context,
		contract,
		fallback: async () =>
			(
				await standardBrain(context, {
					proposalId: "proposal-local-process-fallback",
					prngState,
				})
			).proposal,
		transport,
	};
}

const macIt = process.platform === "darwin" ? it : it.skip;

describe("macOS zero-egress local process transport", () => {
	macIt(
		"accepts one framed canonical choice with contract provenance",
		async () => {
			const test = await harness({ mode: "success" });
			const proposal = await test.brain.propose(test.context);

			expect(await validateIntentProposal(test.context, proposal)).toBe(
				"accepted",
			);
			expect(proposal.provenance).toMatchObject({
				cognitionKind: "model",
				model: "fixture-model",
				modelVersion: `sha256:${test.contract.model.sha256}`,
				provider: `local-process-contract:${test.contract.contractHash}`,
			});
		},
	);

	macIt.each([
		[
			"malformed",
			{ mode: "success" as const, output: "not-json" },
			"malformed",
		],
		["process failure", { mode: "fail" as const }, "provider-unavailable"],
		["timeout", { mode: "hang" as const, timeoutMs: 10 }, "timeout"],
	])("falls back after %s", async (_label, input, primaryFailure) => {
		const test = await harness(input);
		const result = await runDecisionGateway({
			context: test.context,
			deterministicFallback: test.fallback,
			primary: test.brain,
			primaryTimeoutMilliseconds: 4_000,
			validate: validateIntentProposal,
		});

		expect(result.selectedSource).toBe("deterministic-fallback");
		expect(result.primaryFailure).toBe(primaryFailure);
		expect(result.proposal.action.kind).toBe("VerifyReserve");
	});

	macIt("kills a late process before it can publish late output", async () => {
		const directory = await mkdtemp(join(tmpdir(), "eonfolk-model-marker-"));
		temporaryDirectories.push(directory);
		const markerPath = join(directory, "late-output");
		const test = await harness({
			markerPath,
			mode: "late",
			timeoutMs: 10,
		});

		await expect(test.brain.propose(test.context)).rejects.toMatchObject({
			code: "timeout",
		});
		await new Promise((resolve) => setTimeout(resolve, 220));
		await expect(stat(markerPath)).rejects.toMatchObject({ code: "ENOENT" });
	});

	macIt(
		"rejects attempted hidden-fact fields at the closed parser",
		async () => {
			const test = await harness({
				mode: "success",
				output: choice({
					visibleRecordIdsRead: ["hidden-toma-secret-mara"],
				}),
			});
			const result = await runDecisionGateway({
				context: test.context,
				deterministicFallback: test.fallback,
				primary: test.brain,
				primaryTimeoutMilliseconds: 1_000,
				validate: validateIntentProposal,
			});

			expect(result.primaryFailure).toBe("malformed");
			expect(result.selectedSource).toBe("deterministic-fallback");
		},
	);

	macIt("forwards cancellation and terminates the active process", async () => {
		const test = await harness({ mode: "hang", timeoutMs: 1_000 });
		const controller = new AbortController();
		const pending = test.brain.propose(test.context, controller.signal);
		controller.abort("test-cancel");

		await expect(pending).rejects.toMatchObject({ code: "aborted" });
	});

	macIt("denies loopback egress in the child sandbox", async () => {
		let acceptedConnection = false;
		const server = createServer(() => {
			acceptedConnection = true;
		});
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", resolve);
		});
		try {
			const address = server.address();
			if (address === null || typeof address === "string")
				throw new Error("test server did not bind an internet port");
			const test = await harness({
				mode: "network",
				networkPort: address.port,
			});
			await expect(test.brain.propose(test.context)).rejects.toMatchObject({
				code: "process-failed",
			});
			expect(acceptedConnection).toBe(false);
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) =>
					error === undefined ? resolve() : reject(error),
				);
			});
		}
	});

	macIt(
		"rejects concurrent invocation instead of sharing process state",
		async () => {
			const test = await harness({ mode: "hang", timeoutMs: 50 });
			const first = test.brain.propose(test.context);
			await expect(test.brain.propose(test.context)).rejects.toMatchObject({
				code: "busy",
			});
			await expect(first).rejects.toMatchObject({ code: "timeout" });
		},
	);
});
