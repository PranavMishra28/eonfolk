import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePersistenceBenchmarkArguments } from "../../../scripts/benchmark-persistence.mjs";
import { verifyJarIdentity } from "../../../scripts/check-formal.mjs";
import { TLC_JAR_SHA256 } from "../../../scripts/formal-toolchain.mjs";
import {
	runVerificationSteps,
	verificationStepsForTier,
} from "../../../scripts/run-verification-tier.mjs";
import { inspectNetlogEgress } from "../../../scripts/validate-web-network.mjs";

describe("Founder Alpha CI evidence controls", () => {
	it("keeps every DEEP browser journey on the current counsel phase contract", () => {
		for (const script of [
			"scripts/benchmark-diagnostics-browser.mjs",
			"scripts/benchmark-web.mjs",
		]) {
			const source = readFileSync(resolve(script), "utf8");
			expect(source).toContain("Review Mara's choices");
			expect(source).not.toContain("Reach the counsel boundary");
		}
	});

	it("times the operable CTA independently from the meaningful WebGL world", () => {
		const source = readFileSync(resolve("scripts/benchmark-web.mjs"), "utf8");
		const ctaStart = source.indexOf('markWhen("eonfolk-cta"');
		const worldStart = source.indexOf(
			'markWhen("eonfolk-meaningful-world"',
			ctaStart,
		);
		expect(ctaStart).toBeGreaterThan(-1);
		expect(worldStart).toBeGreaterThan(ctaStart);
		const ctaQualification = source.slice(ctaStart, worldStart);
		expect(ctaQualification).toContain("follow.tabIndex >= 0");
		expect(ctaQualification).toContain("follow.getClientRects().length > 0");
		expect(ctaQualification).not.toContain("canvas");
	});

	it("does not misclassify macOS interface-change metadata as attempted egress", () => {
		const evidence = inspectNetlogEgress({
			constants: {
				logEventTypes: { NETWORK_MAC_OS_CONFIG_CHANGED: 458 },
			},
			events: [
				{
					type: 458,
					params: {
						old_interfaces: [{ address: "10.103.2.54" }],
						new_interfaces: [{ address: "192.168.5.71" }],
					},
				},
				{ type: 1, params: { url: "http://127.0.0.1:4174/index.html" } },
			],
		});
		expect(evidence).toEqual({ externalAttempts: [], localEvidence: 1 });
	});

	it("still rejects a real external connection field after interface filtering", () => {
		const evidence = inspectNetlogEgress({
			constants: {
				logEventTypes: { NETWORK_MAC_OS_CONFIG_CHANGED: 458 },
			},
			events: [
				{ type: 458, params: { new_interfaces: [{ address: "10.0.0.2" }] } },
				{ type: 12, params: { destination: "example.com:443" } },
			],
		});
		expect(evidence.externalAttempts).toEqual(["destination:example.com"]);
	});

	it("uses tier-specific artifact allowlists", () => {
		const describeArtifacts = (tier: "pr" | "deep") => {
			const result = spawnSync(
				process.execPath,
				["scripts/run-verification-tier.mjs", tier, "--describe-artifacts"],
				{ cwd: resolve("."), encoding: "utf8" },
			);
			expect(result.status).toBe(0);
			return JSON.parse(result.stdout);
		};
		expect(describeArtifacts("pr")).toEqual(["apps/web/dist"]);
		expect(describeArtifacts("deep")).toEqual([
			"apps/web/dist",
			"tmp/eonfolk-persistence-benchmark.json",
			"tmp/eonfolk-diagnostics-overhead.json",
			"tmp/eonfolk-diagnostics-browser-comparison.json",
			"tmp/eonfolk-canonical-performance.json",
		]);
	});

	it("declares every PR constituent once and makes DEEP a strict ordered superset", () => {
		const pr = verificationStepsForTier("pr");
		const deep = verificationStepsForTier("deep");
		expect(pr.map((entry) => entry.id)).toEqual([
			"runtime",
			"dependency-cohort",
			"architecture",
			"documentation",
			"format",
			"lint",
			"typecheck",
			"unit",
			"property-pr",
			"indexeddb",
			"timing",
			"browser-fault",
			"browser-fault-network",
			"production-build",
			"bundle-budget",
			"browser-production",
			"browser-production-network",
			"production-audit",
			"formal",
		]);
		expect(deep.slice(0, pr.length)).toEqual(pr);
		expect(deep.slice(pr.length).map((entry) => entry.id)).toEqual([
			"targeted-mutation",
			"property-deep",
			"browser-cohort",
			"persistence-benchmark",
			"diagnostics-source-benchmark",
			"diagnostics-browser-benchmark",
			"canonical-web-performance",
		]);
		expect(new Set(deep.map((entry) => entry.id)).size).toBe(deep.length);
	});

	it("records individual results and fails closed without running later steps", () => {
		const steps = verificationStepsForTier("pr").slice(0, 3);
		const calls: string[] = [];
		const ticks = [0, 5, 5, 13];
		const result = runVerificationSteps(steps, {
			now: () => ticks.shift() ?? 13,
			spawn: (command, arguments_) => {
				calls.push([command, ...arguments_].join(" "));
				return { status: calls.length === 2 ? 7 : 0 };
			},
			stdio: "ignore",
		});
		expect(result.status).toBe("FAIL");
		expect(result.exitCode).toBe(7);
		expect(calls).toEqual(["pnpm runtime:check", "pnpm cohort:check"]);
		expect(result.steps).toEqual([
			{
				id: "runtime",
				command: "pnpm runtime:check",
				durationMs: 5,
				exitCode: 0,
				status: "PASS",
			},
			{
				id: "dependency-cohort",
				command: "pnpm cohort:check",
				durationMs: 8,
				exitCode: 7,
				status: "FAIL",
			},
		]);
	});

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
