import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	decodeLocalWorldAuthoritySnapshot,
	localWorldAuthorityStatus,
} from "../../../packages/civilization/src/index.js";

const hostPath = fileURLToPath(
	new URL("../../../scripts/local-world-authority-host.ts", import.meta.url),
);

describe("local world authority host continuity", () => {
	it("ticks Reality in a Node process without a browser, then requires catch-up when stopped", async () => {
		const statePath = join(
			await mkdtemp(join(tmpdir(), "eonfolk-local-authority-")),
			"authority.json",
		);
		const registerPath = fileURLToPath(
			new URL("../../../scripts/ts-source-register.mjs", import.meta.url),
		);
		const child = spawn(
			process.execPath,
			[
				"--experimental-strip-types",
				"--no-warnings",
				"--import",
				registerPath,
				hostPath,
			],
			{
				env: {
					...process.env,
					EONFOLK_LOCAL_AUTHORITY_STATE: statePath,
					EONFOLK_LOCAL_AUTHORITY_PORT: "0",
					EONFOLK_LOCAL_AUTHORITY_DAY_MS: "86400000",
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		const origin = await new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("local world authority host did not bind"));
			}, 45_000);
			let stdout = "";
			child.stdout?.on("data", (chunk: Buffer) => {
				stdout += chunk.toString("utf8");
				const match = /writing on (http:\/\/127\.0\.0\.1:\d+)/u.exec(stdout);
				if (match?.[1] !== undefined) {
					clearTimeout(timer);
					resolve(match[1]);
				}
			});
			child.stderr?.on("data", (chunk: Buffer) => {
				stdout += chunk.toString("utf8");
			});
			child.on("error", (error) => {
				clearTimeout(timer);
				reject(error);
			});
			child.on("exit", (code) => {
				clearTimeout(timer);
				reject(
					new Error(
						`local world authority host exited before bind (${String(code)}): ${stdout}`,
					),
				);
			});
		});
		try {
			const firstTick = await fetch(`${origin}/tick`, { method: "POST" });
			expect(firstTick.ok).toBe(true);
			const snapshot = decodeLocalWorldAuthoritySnapshot(
				await (await fetch(`${origin}/authority`)).text(),
			);
			expect(snapshot.completedDay).toBeGreaterThanOrEqual(2);
			expect(snapshot.stateHash).toMatch(/^[0-9a-f]{64}$/u);
			expect(
				localWorldAuthorityStatus({
					snapshot,
					processReachable: true,
				}).catchUpRequired,
			).toBe(false);
			expect(
				localWorldAuthorityStatus({
					snapshot,
					processReachable: false,
				}).catchUpRequired,
			).toBe(true);
		} finally {
			child.kill("SIGTERM");
			await new Promise<void>((resolve) => {
				child.once("exit", () => resolve());
				setTimeout(resolve, 2_000);
			});
		}
	}, 60_000);
});
