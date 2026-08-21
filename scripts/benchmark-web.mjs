import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { preview } from "vite";

const stateDurationMs = Number(
	process.env.EONFOLK_BENCHMARK_STATE_MS ?? 30_000,
);
const stateWarmupMs = Number(process.env.EONFOLK_BENCHMARK_WARMUP_MS ?? 5_000);
const repetitions = Number(process.env.EONFOLK_BENCHMARK_REPETITIONS ?? 5);
const canonical =
	stateDurationMs === 30_000 && stateWarmupMs === 5_000 && repetitions === 5;
if (!Number.isSafeInteger(stateDurationMs) || stateDurationMs < 100)
	throw new Error("state measurement duration must be an integer >= 100 ms");
if (!Number.isSafeInteger(stateWarmupMs) || stateWarmupMs < 0)
	throw new Error("state warm-up must be a nonnegative integer");
if (!Number.isSafeInteger(repetitions) || repetitions < 1)
	throw new Error("benchmark repetitions must be a positive integer");

const profiles = [
	{
		name: "desktop",
		width: 1728,
		height: 1117,
		deviceScaleFactor: 2,
		maximumDisplayMs: 3_000,
		maximumP95FrameMs: 16.7,
		cpuSlowdown: 1,
		network: "unthrottled-local",
	},
	{
		name: "laptop",
		width: 1366,
		height: 768,
		deviceScaleFactor: 1,
		maximumDisplayMs: 3_000,
		maximumP95FrameMs: 16.7,
		cpuSlowdown: 1,
		network: "unthrottled-local",
	},
	{
		name: "mobile-emulation",
		width: 390,
		height: 844,
		deviceScaleFactor: 3,
		maximumDisplayMs: 5_000,
		maximumP95FrameMs: 33.3,
		cpuSlowdown: 4,
		network: "1.6Mbps-down-750Kbps-up-150ms-rtt",
	},
];

const percentile = (values, percentileValue) => {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
};

const summarize = (samples, frameBudgetMs) => ({
	sampleCount: samples.length,
	p50Ms: percentile(samples, 0.5),
	p95Ms: percentile(samples, 0.95),
	worstMs: Math.max(...samples),
	droppedFrameCount: samples.filter((sample) => sample > frameBudgetMs).length,
});

async function frameState(page, name, frameBudgetMs) {
	await page.waitForTimeout(stateWarmupMs);
	const samples = await page.evaluate(
		({ durationMs }) =>
			new Promise((resolveFrameState) => {
				const deltas = [];
				let prior = null;
				let started = null;
				const sample = (time) => {
					started ??= time;
					if (prior !== null) deltas.push(time - prior);
					prior = time;
					if (time - started >= durationMs) resolveFrameState(deltas);
					else requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			}),
		{ durationMs: stateDurationMs },
	);
	return {
		samples,
		summary: { state: name, ...summarize(samples, frameBudgetMs) },
	};
}

async function markOnNextFrame(page, name) {
	return page.evaluate(
		(markName) =>
			new Promise((resolveMark) => {
				requestAnimationFrame(() => {
					performance.mark(markName);
					resolveMark(performance.getEntriesByName(markName)[0]?.startTime);
				});
			}),
		name,
	);
}

async function reachBusyMarket(page) {
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	const started = performance.now();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByText("OBSERVED", { exact: true }).waitFor();
	return performance.now() - started;
}

async function reachChronicle(page) {
	await page
		.getByRole("button", { name: /Reach the counsel boundary/i })
		.click();
	await page.getByText("Verify the count privately", { exact: true }).click();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await page
		.getByRole("button", { name: /Leave Riverhold at checkpoint/i })
		.click();
	await page.getByRole("button", { name: /Return to Riverhold/i }).click();
	const catchUpStarted = performance.now();
	await page.getByRole("button", { name: /Advance Riverhold/i }).click();
	await page.getByText(/WHILE YOU WERE AWAY/i).waitFor();
	const catchUpMs = performance.now() - catchUpStarted;
	await page
		.getByRole("button", { name: /Ask Mara to publish the verified count/i })
		.click();
	await page
		.getByRole("heading", { name: /What entered the record/i })
		.waitFor();
	return catchUpMs;
}

function netlogExternalAttempts(netlogPath) {
	const netlog = JSON.parse(readFileSync(netlogPath, "utf8"));
	const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
	const external = new Set();
	const inspect = (value, key = "") => {
		if (Array.isArray(value)) {
			for (const item of value) inspect(item, key);
			return;
		}
		if (value && typeof value === "object") {
			for (const [childKey, child] of Object.entries(value))
				inspect(child, childKey);
			return;
		}
		if (typeof value !== "string") return;
		if (
			!/^(?:url|destination|logical_destination|host|hostname|address|endpoint)$/i.test(
				key,
			)
		)
			return;
		for (const match of value.matchAll(/(?:https?|wss?):\/\/[^\s"'<>]+/g)) {
			try {
				const url = new URL(match[0]);
				if (!localHosts.has(url.hostname))
					external.add(`${key}:${url.hostname}`);
			} catch {
				external.add(`${key}:${match[0]}`);
			}
		}
		if (/host|hostname|address|endpoint|destination/i.test(key)) {
			const candidate = value
				.replace(/^\[/, "")
				.replace(/\]$/, "")
				.replace(/:\d+$/, "");
			if (candidate === "~notfound") return;
			if (
				/^[A-Za-z0-9.-]+$/.test(candidate) &&
				candidate.includes(".") &&
				!localHosts.has(candidate)
			)
				external.add(`${key}:${candidate}`);
		}
	};
	for (const event of netlog.events ?? []) inspect(event.params ?? {});
	return [...external].sort();
}

const outputDirectory = resolve("tmp");
const netlogPath = resolve(
	outputDirectory,
	"eonfolk-canonical-performance-netlog.json",
);
const reportPath = resolve(
	outputDirectory,
	"eonfolk-canonical-performance.json",
);
mkdirSync(outputDirectory, { recursive: true });
const server = await preview({
	root: "apps/web",
	logLevel: "silent",
	preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const origin = "http://127.0.0.1:4173";
const routeAttempts = [];
const browser = await chromium.launch({
	headless: false,
	args: [
		"--disable-background-networking",
		"--disable-client-side-phishing-detection",
		"--disable-component-update",
		"--disable-component-extensions-with-background-pages",
		"--disable-default-apps",
		"--disable-domain-reliability",
		"--disable-features=AccountConsistency,AimEnabled,AutofillServerCommunication,CertificateTransparencyComponentUpdater,DialMediaRouteProvider,DnsOverHttps,DnsOverHttpsUpgrade,MediaRouter,NetworkTimeServiceQuerying,OptimizationGuide,OptimizationGuideModelDownloading,OptimizationHints,PreconnectFromKeyedService,PreconnectToSearch,PrivacySandboxSettings4,Signin,Sync,UseDnsHttpsSvcb",
		"--disable-search-engine-choice-screen",
		"--disable-signin-scoped-device-id",
		"--disable-sync",
		"--dns-prefetch-disable",
		"--dns-over-https-mode=off",
		"--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
		`--gaia-url=${origin}`,
		`--gcm-checkin-url=${origin}/__browser-gcm-checkin`,
		`--gcm-mcs-endpoint=${origin}`,
		`--gcm-registration-url=${origin}/__browser-gcm-register`,
		"--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
		`--log-net-log=${netlogPath}`,
		"--metrics-recording-only",
		"--no-default-browser-check",
		"--no-first-run",
	],
});
const runs = [];
const pooledFrameSamples = new Map();
try {
	for (const profile of profiles) {
		for (let repetition = 1; repetition <= repetitions; repetition += 1) {
			process.stderr.write(
				`benchmark ${profile.name} ${repetition}/${repetitions}\n`,
			);
			const context = await browser.newContext({
				viewport: { width: profile.width, height: profile.height },
				deviceScaleFactor: profile.deviceScaleFactor,
				reducedMotion: "no-preference",
				serviceWorkers: "block",
			});
			const page = await context.newPage();
			await page.addInitScript(() => {
				window.__eonfolkLongTasks = [];
				if (typeof PerformanceObserver === "function") {
					const observer = new PerformanceObserver((list) => {
						for (const entry of list.getEntries())
							window.__eonfolkLongTasks.push(entry.duration);
					});
					try {
						observer.observe({ type: "longtask", buffered: true });
					} catch {
						// The metric remains an empty unsupported sample.
					}
				}
			});
			await page.route("**/*", async (route) => {
				const url = new URL(route.request().url());
				const allowed = url.origin === origin;
				routeAttempts.push({
					profile: profile.name,
					repetition,
					allowed,
					url: route.request().url(),
				});
				if (allowed) await route.continue();
				else await route.abort("blockedbyclient");
			});
			const cdp = await context.newCDPSession(page);
			await cdp.send("Network.enable");
			await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
			await cdp.send("Emulation.setCPUThrottlingRate", {
				rate: profile.cpuSlowdown,
			});
			if (profile.cpuSlowdown > 1)
				await cdp.send("Network.emulateNetworkConditions", {
					offline: false,
					latency: 150,
					downloadThroughput: (1.6 * 1_000_000) / 8,
					uploadThroughput: (750 * 1_000) / 8,
					connectionType: "cellular4g",
				});
			await page.bringToFront();
			await page.goto(origin, { waitUntil: "domcontentloaded" });
			const shellMs = await markOnNextFrame(page, "eonfolk-shell");
			const follow = page.getByRole("button", { name: /Follow Mara/ });
			await follow.waitFor({ timeout: profile.maximumDisplayMs });
			if (!(await follow.isEnabled()))
				throw new Error("Follow Mara is visible but not operable");
			await page.waitForFunction(
				() =>
					document.querySelector("[data-testid='riverhold-canvas']")?.dataset
						.ready === "true" &&
					document.querySelectorAll(
						"[aria-label='Eight Riverhold citizens and their current activities'] li",
					).length === 8,
				undefined,
				{ timeout: profile.maximumDisplayMs },
			);
			const ctaMs = await markOnNextFrame(page, "eonfolk-cta");
			const meaningfulWorldMs = await markOnNextFrame(
				page,
				"eonfolk-meaningful-world",
			);
			await cdp.send("Network.emulateNetworkConditions", {
				offline: true,
				latency: 0,
				downloadThroughput: 0,
				uploadThroughput: 0,
			});
			const states = [];
			for (const stateName of ["arrival"]) {
				const measured = await frameState(
					page,
					stateName,
					profile.maximumP95FrameMs,
				);
				states.push(measured.summary);
				pooledFrameSamples.set(`${profile.name}:${stateName}`, [
					...(pooledFrameSamples.get(`${profile.name}:${stateName}`) ?? []),
					...measured.samples,
				]);
			}
			const investigationLatencyMs = await reachBusyMarket(page);
			const busyMarket = await frameState(
				page,
				"busy-market",
				profile.maximumP95FrameMs,
			);
			states.push(busyMarket.summary);
			pooledFrameSamples.set(`${profile.name}:busy-market`, [
				...(pooledFrameSamples.get(`${profile.name}:busy-market`) ?? []),
				...busyMarket.samples,
			]);
			const catchUpMs = await reachChronicle(page);
			const chronicle = await frameState(
				page,
				"chronicle",
				profile.maximumP95FrameMs,
			);
			states.push(chronicle.summary);
			pooledFrameSamples.set(`${profile.name}:chronicle`, [
				...(pooledFrameSamples.get(`${profile.name}:chronicle`) ?? []),
				...chronicle.samples,
			]);
			const diagnostics = await page.evaluate(() => ({
				longTasksMs: window.__eonfolkLongTasks,
				usedJsHeapBytes: performance.memory?.usedJSHeapSize ?? "unsupported",
			}));
			runs.push({
				profile: profile.name,
				repetition,
				viewport: `${profile.width}x${profile.height}`,
				deviceScaleFactor: profile.deviceScaleFactor,
				cpuSlowdown: profile.cpuSlowdown,
				network: profile.network,
				marks: { shellMs, ctaMs, meaningfulWorldMs },
				investigationLatencyMs,
				catchUpMs,
				states,
				diagnostics,
			});
			await context.close();
		}
	}
} finally {
	await browser.close();
	await new Promise((resolveClose, rejectClose) => {
		server.httpServer.close((error) =>
			error ? rejectClose(error) : resolveClose(),
		);
	});
}

const externalRoutes = routeAttempts.filter((attempt) => !attempt.allowed);
const externalNetlogAttempts = netlogExternalAttempts(netlogPath);
const aggregates = profiles.map((profile) => {
	const states = ["arrival", "busy-market", "chronicle"].map((state) => {
		const samples = pooledFrameSamples.get(`${profile.name}:${state}`) ?? [];
		return { state, ...summarize(samples, profile.maximumP95FrameMs) };
	});
	const allSamples = states.flatMap(
		(state) => pooledFrameSamples.get(`${profile.name}:${state.state}`) ?? [],
	);
	return {
		profile: profile.name,
		states,
		pooled: summarize(allSamples, profile.maximumP95FrameMs),
	};
});
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
	encoding: "utf8",
}).trim();
const workingTreeDirty =
	execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
		.length > 0;
const lockfileSha256 = createHash("sha256")
	.update(readFileSync(resolve("pnpm-lock.yaml")))
	.digest("hex");
const power = execFileSync("pmset", ["-g", "batt"], {
	encoding: "utf8",
}).trim();
const report = {
	schemaVersion: "eonfolk-canonical-web-performance-v1",
	measuredAt: new Date().toISOString(),
	canonical,
	runtime: {
		node: process.version,
		host: `${platform()} ${release()} ${arch()}`,
		chromium: chromium.executablePath(),
		headed: true,
		previewOrigin: origin,
		power,
	},
	source: { commit: sourceCommit, workingTreeDirty, lockfileSha256 },
	fixture: {
		run: "canonical-local-proof",
		region: "region_riverhold",
		citizens: 8,
		motion: "no-preference",
		quality: "default",
		focus: "foreground",
	},
	procedure: {
		repetitions,
		coldContextPerRun: true,
		cacheDisabled: true,
		serviceWorkersBlocked: true,
		stateWarmupMs,
		stateMeasurementMs: stateDurationMs,
		states: ["arrival", "busy-market", "chronicle"],
	},
	runs,
	aggregates,
	networkOracle: {
		routeRequestCount: routeAttempts.length,
		externalRouteAttempts: externalRoutes,
		externalNetlogAttempts,
	},
	limitations: [
		"Mobile is canonical throttled emulation on the target Mac, not a physical phone.",
		"Memory is reported only when Chromium exposes performance.memory.",
		"This is a local pre-release measurement, not field telemetry or a human gate.",
	],
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const failed =
	!canonical ||
	workingTreeDirty ||
	!power.includes("AC Power") ||
	externalRoutes.length > 0 ||
	externalNetlogAttempts.length > 0 ||
	aggregates.some((aggregate) => {
		const profile = profiles.find(
			(candidate) => candidate.name === aggregate.profile,
		);
		return (
			profile === undefined ||
			aggregate.pooled.p95Ms > profile.maximumP95FrameMs ||
			aggregate.states.some((state) => state.p95Ms > profile.maximumP95FrameMs)
		);
	}) ||
	runs.some((run) => {
		const profile = profiles.find(
			(candidate) => candidate.name === run.profile,
		);
		return (
			profile === undefined ||
			run.marks.shellMs > 2_000 ||
			run.marks.ctaMs > 3_000 ||
			run.marks.meaningfulWorldMs > profile.maximumDisplayMs ||
			run.states.some((state) => state.p95Ms > profile.maximumP95FrameMs)
		);
	});
if (failed) process.exitCode = 1;
