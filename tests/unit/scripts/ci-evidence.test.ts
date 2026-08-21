import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePersistenceBenchmarkArguments } from "../../../scripts/benchmark-persistence.mjs";
import { verifyJarIdentity } from "../../../scripts/check-formal.mjs";
import { TLC_JAR_SHA256 } from "../../../scripts/formal-toolchain.mjs";

describe("Founder Alpha CI evidence controls", () => {
	it("keeps the pinned TLC identity in one repository constant", async () => {
		const directory = mkdtempSync(join(tmpdir(), "eonfolk-wrong-tlc-"));
		try {
			const wrongJar = join(directory, "tla2tools.jar");
			writeFileSync(wrongJar, "not the accepted TLC bytes");
			await expect(verifyJarIdentity(wrongJar)).rejects.toMatchObject({
				code: "TOOL_IDENTITY_MISMATCH",
			});
			expect(TLC_JAR_SHA256).toMatch(/^[a-f0-9]{64}$/u);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	it("rejects formal verification when no JAR is supplied", () => {
		const environment = { ...process.env };
		delete environment.TLA2TOOLS_JAR;
		const result = spawnSync(process.execPath, ["scripts/check-formal.mjs"], {
			cwd: resolve("."),
			encoding: "utf8",
			env: environment,
		});
		expect(result.status).toBe(1);
		expect(JSON.parse(result.stderr)).toMatchObject({
			status: "TOOL_UNAVAILABLE",
			verified: false,
		});
	});

	it("requires an explicit smoke-only persistence mode", () => {
		expect(parsePersistenceBenchmarkArguments([])).toEqual({
			smokeOnly: false,
			forceIndexedDbFailure: false,
			output: null,
		});
		expect(
			parsePersistenceBenchmarkArguments([
				"--smoke-only",
				"--force-indexeddb-failure",
				"--output",
				"evidence.json",
			]),
		).toEqual({
			smokeOnly: true,
			forceIndexedDbFailure: true,
			output: "evidence.json",
		});
	});

	it("fails closed when the IndexedDB benchmark harness fails", () => {
		const result = spawnSync(
			process.execPath,
			["scripts/benchmark-persistence.mjs", "--force-indexeddb-failure"],
			{ cwd: resolve("."), encoding: "utf8" },
		);
		expect(result.status).toBe(1);
		const report = JSON.parse(result.stdout);
		expect(report.status).toBe("FAIL");
		expect(report.indexedDb.available).toBe(false);
		expect(report.acceptance.assertions.indexedDbAvailable).toBe(false);
	});

	it("marks an explicit soft persistence probe as smoke-only, never PASS", () => {
		const result = spawnSync(
			process.execPath,
			[
				"scripts/benchmark-persistence.mjs",
				"--smoke-only",
				"--force-indexeddb-failure",
			],
			{ cwd: resolve("."), encoding: "utf8" },
		);
		expect(result.status).toBe(0);
		const report = JSON.parse(result.stdout);
		expect(report.status).toBe("SMOKE_ONLY");
		expect(report.acceptance.pass).toBe(false);
	});
});
