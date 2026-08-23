import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { relative, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";
import { preview } from "vite";
import { contentSha256 } from "./evidence-integrity.mjs";

const MODES = Object.freeze(["off", "local", "alpha"]);
const FRAME_SAMPLE_MS = 1_000;
const MAXIMUM_P95_FRAME_MS = 33.3;
const MAXIMUM_RELATIVE_JOURNEY_FACTOR = 1.75;
const MAXIMUM_RELATIVE_JOURNEY_ALLOWANCE_MS = 750;
const EXPECTED_BROWSER = Object.freeze({
	version: "Google Chrome for Testing 151.0.7922.34",
	launcherSha256:
		"a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function percentile(values, fraction) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? null;
}

function builtOutputHash() {
	const root = resolve("apps/web/dist");
	const entries = [];
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = resolve(directory, entry.name);
			if (entry.isDirectory()) walk(absolute);
			else if (entry.isFile())
				entries.push({
					path: relative(root, absolute).split(sep).join("/"),
					bytes: statSync(absolute).size,
					sha256: sha256(readFileSync(absolute)),
				});
		}
	};
	walk(root);
	entries.sort((left, right) => left.path.localeCompare(right.path));
	return Object.freeze({
		files: entries.length,
		totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
		manifestSha256: sha256(JSON.stringify(entries)),
	});
}

async function sampleFrames(page) {
	const samples = await page.evaluate(
		(durationMs) =>
			new Promise((resolveSamples) => {
				const values = [];
				let started;
				let prior;
				const frame = (time) => {
					started ??= time;
					if (prior !== undefined) values.push(time - prior);
					prior = time;
					if (time - started >= durationMs) resolveSamples(values);
					else requestAnimationFrame(frame);
				};
				requestAnimationFrame(frame);
			}),
		FRAME_SAMPLE_MS,
	);
	return Object.freeze({
		count: samples.length,
		p50Ms: percentile(samples, 0.5),
		p95Ms: percentile(samples, 0.95),
		worstMs: Math.max(...samples),
	});
}

async function runMode(mode, browserExecutable) {
	execFileSync("pnpm", ["--filter", "@eonfolk/web", "build"], {
		stdio: "inherit",
		env: { ...process.env, VITE_EONFOLK_DIAGNOSTICS_MODE: mode },
	});
	const builtOutput = builtOutputHash();
	const server = await preview({
		root: "apps/web",
		logLevel: "silent",
		preview: { host: "127.0.0.1", port: 4173, strictPort: true },
	});
	const origin = "http://127.0.0.1:4173";
	const externalRequests = [];
	const consoleProblems = [];
	let browser = null;
	try {
		browser = await chromium.launch({
			executablePath: browserExecutable,
			headless: true,
			args: [
				"--disable-background-networking",
				"--dns-prefetch-disable",
				"--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
			],
		});
		const context = await browser.newContext({
			viewport: { width: 1366, height: 768 },
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
		const page = await context.newPage();
		page.on("console", (message) => {
			if (["error", "warning"].includes(message.type()))
				consoleProblems.push(`${message.type()}:${message.text()}`);
		});
		page.on("pageerror", (error) =>
			consoleProblems.push(`page:${error.message}`),
		);
		await page.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin === origin) await route.continue();
			else {
				externalRequests.push(url.hostname);
				await route.abort("blockedbyclient");
			}
		});
		const journeyStarted = performance.now();
		await page.goto(origin, { waitUntil: "domcontentloaded" });
		await page
			.getByLabel("Current Riverhold decision")
			.getByRole("button", { name: "Follow Mara", exact: true })
			.click();
		const arrival = await sampleFrames(page);
		await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
		await page.getByText("OBSERVED", { exact: true }).waitFor();
		const busyMarket = await sampleFrames(page);
		await page.getByRole("button", { name: /Review Mara's choices/i }).click();
		await page.getByText("Verify the count privately", { exact: true }).click();
		await page.getByRole("button", { name: "Offer counsel" }).click();
		await page
			.getByRole("button", { name: /Leave Riverhold at checkpoint/i })
			.click();
		await page.getByRole("button", { name: /Return to Riverhold/i }).click();
		await page.getByRole("button", { name: /Advance Riverhold/i }).click();
		await page.getByText(/WHILE YOU WERE AWAY/i).waitFor();
		await page
			.getByRole("button", { name: /Ask Mara to publish the verified count/i })
			.click();
		await page
			.getByRole("heading", { name: /What entered the record/i })
			.waitFor();
		const chronicle = await sampleFrames(page);
		const journeyMs = performance.now() - journeyStarted;
		const observerMode = await page.evaluate(() => {
			const observer = window.__EONFOLK_OBSERVER__;
			return typeof observer === "function"
				? observer().health.mode
				: "not-exposed";
		});
		await context.close();
		return Object.freeze({
			mode,
			configuredAtBuild: true,
			observerMode,
			builtOutput,
			journeyMs,
			frames: { arrival, busyMarket, chronicle },
			externalRequests: [...new Set(externalRequests)].sort(),
			consoleProblems,
		});
	} finally {
		await browser?.close();
		await new Promise((resolveClose, rejectClose) => {
			server.httpServer.close((error) =>
				error ? rejectClose(error) : resolveClose(),
			);
		});
	}
}

async function run() {
	let output = null;
	let smokeOnly = false;
	for (let index = 2; index < process.argv.length; index += 1) {
		const argument = process.argv[index];
		if (argument === "--smoke-only") smokeOnly = true;
		else if (argument === "--output") {
			output = process.argv[index + 1] ?? null;
			index += 1;
		} else throw new Error(`unknown argument: ${argument}`);
	}
	const start = Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
	});
	if (!start.clean && !smokeOnly)
		throw new Error(
			"comparative browser diagnostics require a clean source tree",
		);
	execFileSync("node", ["scripts/validate-browser-cohort.mjs"], {
		stdio: "inherit",
	});
	const browserExecutable = chromium.executablePath();
	const browserVersion = execFileSync(browserExecutable, ["--version"], {
		encoding: "utf8",
	}).trim();
	const browserLauncherSha256 = sha256(readFileSync(browserExecutable));
	if (
		browserVersion !== EXPECTED_BROWSER.version ||
		browserLauncherSha256 !== EXPECTED_BROWSER.launcherSha256
	)
		throw new Error("browser identity changed after cohort validation");
	const modes = [];
	for (const mode of MODES) modes.push(await runMode(mode, browserExecutable));
	const end = Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
	});
	const sourceUnchanged =
		start.commit === end.commit && start.lockfileSha256 === end.lockfileSha256;
	const sourceStable = sourceUnchanged && start.clean && end.clean;
	const offJourneyMs = modes.find((mode) => mode.mode === "off").journeyMs;
	const assertions = modes.map((mode) => {
		const frames = Object.values(mode.frames);
		return Object.freeze({
			mode: mode.mode,
			frameBudget:
				frames.every((frame) => frame.p95Ms <= MAXIMUM_P95_FRAME_MS) &&
				frames.every((frame) => frame.count >= 30),
			journeyComparison:
				mode.mode === "off" ||
				mode.journeyMs <=
					offJourneyMs * MAXIMUM_RELATIVE_JOURNEY_FACTOR +
						MAXIMUM_RELATIVE_JOURNEY_ALLOWANCE_MS,
			zeroEgress: mode.externalRequests.length === 0,
			cleanConsole: mode.consoleProblems.length === 0,
			modeEvidence:
				mode.mode === "local"
					? mode.observerMode === "local"
					: mode.observerMode === "not-exposed",
		});
	});
	const functionalPass = assertions.every((entry) =>
		Object.entries(entry)
			.filter(([key]) => key !== "mode")
			.every(([, value]) => value === true),
	);
	const pass = sourceStable && functionalPass;
	const status = smokeOnly
		? functionalPass
			? "SMOKE_ONLY"
			: "FAIL"
		: pass
			? "PASS"
			: "FAIL";
	const reportWithoutHash = {
		schemaVersion: "eonfolk-diagnostics-browser-comparison-v1",
		status,
		claimBoundary: smokeOnly
			? "Explicit smoke-only headless comparison; it cannot satisfy DEEP acceptance."
			: "Headless reduced-motion comparison of one identical bounded journey across compile-time OFF, LOCAL, and ALPHA modes; not the canonical headed absolute performance or physical-device gate.",
		recordedAt: new Date().toISOString(),
		source: { start, end, unchanged: sourceUnchanged, stable: sourceStable },
		runtime: {
			node: process.version,
			host: `${platform()} ${release()} ${arch()}`,
			chromium: {
				executablePath: browserExecutable,
				version: browserVersion,
				launcherSha256: browserLauncherSha256,
			},
		},
		workload: {
			modes: MODES,
			viewport: "1366x768",
			reducedMotion: true,
			frameSampleMsPerState: FRAME_SAMPLE_MS,
			states: ["arrival", "busy-market", "chronicle"],
			journey:
				"arrival -> follow -> investigate -> counsel -> leave/return -> catch-up -> Chronicle",
		},
		gates: {
			maximumP95FrameMs: MAXIMUM_P95_FRAME_MS,
			maximumRelativeJourneyFactor: MAXIMUM_RELATIVE_JOURNEY_FACTOR,
			maximumRelativeJourneyAllowanceMs: MAXIMUM_RELATIVE_JOURNEY_ALLOWANCE_MS,
			assertions,
		},
		modes,
	};
	const report = {
		...reportWithoutHash,
		outputSha256: contentSha256(reportWithoutHash),
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	if (output === null || output === undefined) process.stdout.write(serialized);
	else writeFileSync(resolve(output), serialized, { flag: "w" });
	if (status === "FAIL") process.exitCode = 1;
}

await run();
