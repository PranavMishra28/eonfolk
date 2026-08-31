/**
 * Loopback local world writer. Binds 127.0.0.1 only. Ticks Reality while this
 * process is running. Play may attach as a read client. If you stop this
 * process, catch-up is required. No cloud. ~$0.
 *
 * Usage: pnpm world:authority
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	decodeLocalWorldAuthoritySnapshot,
	encodeLocalWorldAuthoritySnapshot,
	LOCAL_WORLD_AUTHORITY_DEFAULT_PORT,
	LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION,
	type LocalWorldAuthoritySnapshot,
	localWorldAuthorityStatus,
	tickLocalWorldAuthority,
} from "../packages/civilization/src/index.ts";
import {
	createReleaseGenesis,
	type GeneratedWorldState,
} from "../packages/protocol/src/index.ts";
import { generateWorld } from "../packages/worldgen/src/index.ts";

const V1_GENESIS_RELEASE_ID = "release-genesis-browser-v1";
const V1_GENESIS_WORLD_ID = "eonfolk-genesis-world-v1";
const V1_GENESIS_SEED =
	"e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a";

export const LOCAL_WORLD_AUTHORITY_HOST = "127.0.0.1";

function applyCors(res: ServerResponse): void {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
	applyCors(res);
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(`${JSON.stringify(body)}\n`);
}

export async function loadPlayGenesisWorld(): Promise<GeneratedWorldState> {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: V1_GENESIS_RELEASE_ID,
			seedHex: V1_GENESIS_SEED,
		}),
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
}

export async function persistSnapshot(
	path: string,
	snapshot: LocalWorldAuthoritySnapshot,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, encodeLocalWorldAuthoritySnapshot(snapshot), "utf8");
}

export async function readPersistedSnapshot(
	path: string,
): Promise<LocalWorldAuthoritySnapshot | null> {
	try {
		return decodeLocalWorldAuthoritySnapshot(await readFile(path, "utf8"));
	} catch {
		return null;
	}
}

export function createLocalWorldAuthorityServer(input: {
	readonly genesisWorld: GeneratedWorldState;
	readonly statePath: string;
	readonly port?: number;
	readonly initial?: LocalWorldAuthoritySnapshot | null;
}): {
	readonly listen: () => Promise<{
		readonly origin: string;
		readonly close: () => Promise<void>;
	}>;
	tick(): Promise<LocalWorldAuthoritySnapshot>;
	snapshot(): LocalWorldAuthoritySnapshot | null;
} {
	let current: LocalWorldAuthoritySnapshot | null = input.initial ?? null;
	const port = input.port ?? LOCAL_WORLD_AUTHORITY_DEFAULT_PORT;

	const tick = async (): Promise<LocalWorldAuthoritySnapshot> => {
		current = await tickLocalWorldAuthority({
			genesisWorld: input.genesisWorld,
			current,
		});
		await persistSnapshot(input.statePath, current);
		return current;
	};

	const handle = async (
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> => {
		if (req.method === "OPTIONS") {
			applyCors(res);
			res.writeHead(204);
			res.end();
			return;
		}
		const url = new URL(req.url ?? "/", `http://${LOCAL_WORLD_AUTHORITY_HOST}`);
		if (req.method === "GET" && url.pathname === "/status") {
			writeJson(
				res,
				200,
				localWorldAuthorityStatus({
					snapshot: current,
					processReachable: true,
				}),
			);
			return;
		}
		if (req.method === "GET" && url.pathname === "/authority") {
			if (current === null) {
				writeJson(res, 404, {
					schemaVersion: LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION,
					error: "no-snapshot",
				});
				return;
			}
			writeJson(res, 200, current);
			return;
		}
		if (req.method === "POST" && url.pathname === "/tick") {
			writeJson(res, 200, await tick());
			return;
		}
		writeJson(res, 404, { error: "unknown-route" });
	};

	return {
		tick,
		snapshot: () => current,
		listen: () =>
			new Promise((resolveListen) => {
				const server = createServer((req, res) => {
					void handle(req, res);
				});
				server.listen(port, LOCAL_WORLD_AUTHORITY_HOST, () => {
					const address = server.address();
					if (address === null || typeof address === "string")
						throw new Error("local world authority did not bind a TCP port");
					resolveListen({
						origin: `http://${LOCAL_WORLD_AUTHORITY_HOST}:${String(address.port)}`,
						close: () =>
							new Promise((resolveClose) => {
								server.close(() => resolveClose());
							}),
					});
				});
			}),
	};
}

async function main(): Promise<void> {
	const statePath = resolve(
		process.env.EONFOLK_LOCAL_AUTHORITY_STATE ??
			"tmp/eonfolk-local-world-authority.json",
	);
	const dayMs = Number(process.env.EONFOLK_LOCAL_AUTHORITY_DAY_MS ?? 28_000);
	const genesisWorld = await loadPlayGenesisWorld();
	const prior = await readPersistedSnapshot(statePath);
	const requestedPort = Number(
		process.env.EONFOLK_LOCAL_AUTHORITY_PORT ??
			LOCAL_WORLD_AUTHORITY_DEFAULT_PORT,
	);
	const host = createLocalWorldAuthorityServer({
		genesisWorld,
		statePath,
		port:
			Number.isSafeInteger(requestedPort) && requestedPort >= 0
				? requestedPort
				: LOCAL_WORLD_AUTHORITY_DEFAULT_PORT,
		initial:
			prior?.worldIdentityHash === genesisWorld.identity.identityHash
				? prior
				: null,
	});
	const bound = await host.listen();
	if (host.snapshot() === null) await host.tick();
	process.stdout.write(
		`Local world authority is writing on ${bound.origin}\nState: ${statePath}\nClosing this process requires catch-up.\n`,
	);
	const interval = setInterval(
		() => {
			void host.tick();
		},
		Number.isFinite(dayMs) && dayMs >= 1_000 ? dayMs : 28_000,
	);
	const stop = () => {
		clearInterval(interval);
		void bound.close().then(() => {
			process.stdout.write(
				"Local world authority stopped. Catch-up is required.\n",
			);
			process.exit(0);
		});
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
}

function launchedAsCli(): boolean {
	const entry = process.argv[1];
	if (entry === undefined) return false;
	return fileURLToPath(import.meta.url) === resolve(entry);
}

if (launchedAsCli()) void main();
