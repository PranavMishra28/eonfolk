import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";

import {
	LOCAL_WORLD_AUTHORITY_HOST,
	LOCAL_WORLD_AUTHORITY_PORT,
	type LocalWorldAuthority,
	type WorldAuthorityPlayRate,
} from "./kernel.js";

const MAX_BODY_BYTES = 4_096;

export type WorldAuthorityHttpApi = Pick<
	LocalWorldAuthority,
	"playRate" | "ready" | "snapshot" | "advanceDay" | "setPlayRate"
>;

function allowedOrigin(origin: string | undefined): string | null {
	if (origin === undefined) return null;
	try {
		const url = new URL(origin);
		if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
			return null;
		return origin;
	} catch {
		return null;
	}
}

export function worldAuthorityHostIsLoopback(
	hostHeader: string | undefined,
): boolean {
	if (hostHeader === undefined) return false;
	const host = hostHeader.split(":")[0] ?? "";
	return host === "127.0.0.1" || host === "localhost";
}

function json(
	response: ServerResponse,
	status: number,
	body: unknown,
	origin: string | null,
): void {
	response.statusCode = status;
	response.setHeader("content-type", "application/json; charset=utf-8");
	response.setHeader("cache-control", "no-store");
	if (origin !== null) {
		response.setHeader("access-control-allow-origin", origin);
		response.setHeader("vary", "origin");
		response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
		response.setHeader("access-control-allow-headers", "content-type");
	}
	response.end(`${JSON.stringify(body)}\n`);
}

async function readBody(request: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += part.byteLength;
		if (size > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
		chunks.push(part);
	}
	return Buffer.concat(chunks).toString("utf8");
}

function parsePlayRate(value: unknown): WorldAuthorityPlayRate | null {
	return value === 0 || value === 1 || value === 3 ? value : null;
}

export function createWorldAuthorityServer(authority: WorldAuthorityHttpApi) {
	const writer: Promise<unknown>[] = [Promise.resolve()];
	const enqueue = async <T>(work: () => Promise<T>): Promise<T> => {
		const run = writer[writer.length - 1]!.then(work, work);
		writer.push(run);
		return await run;
	};

	return createServer((request, response) => {
		const origin = allowedOrigin(request.headers.origin);
		if (!worldAuthorityHostIsLoopback(request.headers.host)) {
			json(response, 403, { error: "loopback-only" }, origin);
			return;
		}
		if (request.method === "OPTIONS") {
			json(response, 204, {}, origin);
			return;
		}
		const url = new URL(
			request.url ?? "/",
			`http://${LOCAL_WORLD_AUTHORITY_HOST}:${String(LOCAL_WORLD_AUTHORITY_PORT)}`,
		);
		void (async () => {
			if (request.method === "GET" && url.pathname === "/health") {
				json(
					response,
					200,
					{
						ok: true,
						kind: "eonfolk-local-world-authority",
						playRate: authority.playRate,
						ready: authority.ready,
					},
					origin,
				);
				return;
			}
			if (request.method === "GET" && url.pathname === "/v1/snapshot") {
				if (!authority.ready) {
					json(response, 503, { error: "not-ready" }, origin);
					return;
				}
				const snapshot = await enqueue(() => authority.snapshot());
				json(response, 200, snapshot, origin);
				return;
			}
			if (request.method === "POST" && url.pathname === "/v1/advance-day") {
				if (!authority.ready) {
					json(response, 503, { error: "not-ready" }, origin);
					return;
				}
				const snapshot = await enqueue(() => authority.advanceDay());
				json(response, 200, snapshot, origin);
				return;
			}
			if (request.method === "POST" && url.pathname === "/v1/clock") {
				if (!authority.ready) {
					json(response, 503, { error: "not-ready" }, origin);
					return;
				}
				const body = JSON.parse(await readBody(request)) as {
					readonly playRate?: unknown;
				};
				const rate = parsePlayRate(body.playRate);
				if (rate === null) {
					json(response, 400, { error: "invalid-play-rate" }, origin);
					return;
				}
				authority.setPlayRate(rate);
				const snapshot = await enqueue(() => authority.snapshot());
				json(response, 200, snapshot, origin);
				return;
			}
			json(response, 404, { error: "not-found" }, origin);
		})().catch((error: unknown) => {
			json(
				response,
				500,
				{
					error: "authority-failed",
					detail: error instanceof Error ? error.message : "unknown",
				},
				origin,
			);
		});
	});
}
