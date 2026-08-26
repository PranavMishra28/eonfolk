import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { arch, platform, release } from "node:os";
import { relative, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";
import { preview } from "vite";
import { inspectNetlogEgress } from "./validate-web-network.mjs";

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

const expectedBrowserCohort = Object.freeze({
	revision: 1234,
	version: "Google Chrome for Testing 151.0.7922.34",
	manifestBytes: 62_239,
	manifestSha256:
		"25995bc88bf20b6de47b46eb3571b250989846a797c0b8924b8794627b6175fc",
	files: 326,
	links: 5,
	totalBytes: 372_002_382,
	launcherSha256:
		"a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
	frameworkBytes: 237_813_488,
	frameworkSha256:
		"269114cf695f1c50b54e0816a1442e41dc468d28672e2dedc2036105fb5a8dbe",
});

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

function captureSourceState() {
	return {
		commit: execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim(),
		workingTreeDirty:
			execFileSync("git", ["status", "--porcelain"], {
				encoding: "utf8",
			}).trim().length > 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
	};
}

function hashBuiltOutput(root) {
	const entries = [];
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = resolve(directory, entry.name);
			if (entry.isDirectory()) walk(absolute);
			else if (entry.isFile()) {
				const bytes = readFileSync(absolute);
				entries.push({
					path: relative(root, absolute).split(sep).join("/"),
					bytes: statSync(absolute).size,
					sha256: sha256(bytes),
				});
			} else throw new Error(`unsupported built output entry: ${absolute}`);
		}
	};
	walk(root);
	entries.sort((left, right) =>
		Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
	);
	const manifest = entries
		.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}\n`)
		.join("");
	return {
		root,
		files: entries.length,
		totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
		manifestSha256: sha256(Buffer.from(manifest)),
		entries,
	};
}

const profiles = [
	{
		name: "desktop",
		width: 1728,
		height: 1117,
		deviceScaleFactor: 2,
		maximumDisplayMs: 3_000,
		maximumInteractionLatencyMs: 250,
		maximumP95FrameMs: 16.7,
		maximumPersistenceReloadMs: 3_000,
		maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
		cpuSlowdown: 1,
		network: "unthrottled-local",
	},
	{
		name: "laptop",
		width: 1366,
		height: 768,
		deviceScaleFactor: 1,
		maximumDisplayMs: 3_000,
		maximumInteractionLatencyMs: 250,
		maximumP95FrameMs: 16.7,
		maximumPersistenceReloadMs: 3_000,
		maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
		cpuSlowdown: 1,
		network: "unthrottled-local",
	},
	{
		name: "mobile-emulation",
		width: 390,
		height: 844,
		deviceScaleFactor: 3,
		maximumDisplayMs: 5_000,
		maximumInteractionLatencyMs: 500,
		maximumP95FrameMs: 33.3,
		maximumPersistenceReloadMs: 5_000,
		maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
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

function readPowerProfile() {
	const batteryStatus = execFileSync("pmset", ["-g", "batt"], {
		encoding: "utf8",
	}).trim();
	const settings = execFileSync("pmset", ["-g", "custom"], {
		encoding: "utf8",
	}).trim();
	const source = batteryStatus.includes("AC Power")
		? "AC Power"
		: batteryStatus.includes("Battery Power")
			? "Battery Power"
			: "unknown";
	const percentageMatch = batteryStatus.match(/(\d+)%/);
	const percentage =
		percentageMatch === null ? null : Number(percentageMatch[1]);
	const sectionMatch = settings.match(
		new RegExp(
			`(?:^|\\n)${source.replace(" ", "\\s+")}:([\\s\\S]*?)(?=\\n(?:AC|Battery)\\s+Power:|$)`,
		),
	);
	const powerModeMatch = sectionMatch?.[1]?.match(/powermode\s+(\d+)/);
	const powerMode =
		powerModeMatch === undefined ? null : Number(powerModeMatch[1]);
	const accepted =
		powerMode === 0 &&
		(source === "AC Power" ||
			(source === "Battery Power" && percentage !== null && percentage >= 50));
	return { source, percentage, powerMode, accepted, batteryStatus };
}

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

async function waitForQualificationMark(page, name, timeout) {
	try {
		await page.waitForFunction(
			(markName) => performance.getEntriesByName(markName).length === 1,
			name,
			{ timeout },
		);
	} catch (error) {
		const diagnostics = await page.evaluate((markName) => {
			const world = document.querySelector("main.v1-world");
			const canvas = document.querySelector(
				"[data-testid='generated-world-canvas']",
			);
			const residents = document.querySelectorAll(
				"ul.v1-presence-roster button",
			);
			const canonicalPopulation = [
				...document.querySelectorAll("[aria-label='Settlements'] button small"),
			].reduce((total, entry) => {
				const count = Number.parseInt(entry.textContent ?? "", 10);
				return total + (Number.isFinite(count) ? count : 0);
			}, 0);
			return {
				markName,
				readyState: document.readyState,
				canvasReady: canvas?.dataset.ready ?? null,
				actorCount: canvas?.dataset.actorCount ?? null,
				canonicalPopulation,
				visibleInteractionCount: canvas?.dataset.interactionCount ?? null,
				residentControlCount: residents.length,
				worldId: world?.getAttribute("data-world-id") ?? null,
				stateHash: world?.getAttribute("data-state-hash") ?? null,
				assetIntegrity: world?.getAttribute("data-asset-integrity") ?? null,
				persistence: world?.getAttribute("data-persistence") ?? null,
				persistenceRestored:
					world?.getAttribute("data-persistence-restored") ?? null,
				worldError:
					document.querySelector("#v1-error-title")?.textContent?.trim() ??
					null,
				marks: performance.getEntriesByType("mark").map((mark) => mark.name),
			};
		}, name);
		throw new Error(
			`qualification mark ${name} missed ${timeout}ms: ${JSON.stringify(diagnostics)}`,
			{ cause: error },
		);
	}
	return page.evaluate((markName) => {
		const mark = performance.getEntriesByName(markName)[0];
		const evidence = window.__eonfolkMarkEvidence?.[markName];
		if (mark === undefined || evidence === undefined)
			throw new Error(`qualification mark ${markName} lacks evidence`);
		return { timeMs: mark.startTime, evidence };
	}, name);
}

async function captureWorldInvariant(page) {
	return page.evaluate(() => {
		const world = document.querySelector("main.v1-world");
		const canvas = document.querySelector(
			"[data-testid='generated-world-canvas']",
		);
		const residentButtons = [
			...document.querySelectorAll("ul.v1-presence-roster button"),
		];
		const canonicalPopulation = [
			...document.querySelectorAll("[aria-label='Settlements'] button small"),
		].reduce((total, entry) => {
			const count = Number.parseInt(entry.textContent ?? "", 10);
			return total + (Number.isFinite(count) ? count : 0);
		}, 0);
		return {
			actorCount: Number(canvas?.dataset.actorCount ?? "0"),
			assetIntegrity: world?.getAttribute("data-asset-integrity") ?? null,
			canvasReady: canvas?.dataset.ready ?? null,
			canonicalActionIds: canvas?.dataset.canonicalActionIds ?? "",
			canonicalPopulation,
			contradictionCount: Number(canvas?.dataset.contradictionCount ?? "-1"),
			persistenceRestored:
				world?.getAttribute("data-persistence-restored") ?? null,
			persistence: world?.getAttribute("data-persistence") ?? null,
			residentControlCount: residentButtons.length,
			routeSegmentCount: Number(canvas?.dataset.routeSegmentCount ?? "0"),
			stateHash: world?.getAttribute("data-state-hash") ?? null,
			teleportCount: Number(canvas?.dataset.teleportCount ?? "-1"),
			worldId: world?.getAttribute("data-world-id") ?? null,
		};
	});
}

function assertWorldInvariant(invariant, boundary, requireRestored = false) {
	if (
		invariant.worldId !== "eonfolk-genesis-world-v1" ||
		!/^[a-f0-9]{64}$/u.test(invariant.stateHash ?? "") ||
		invariant.assetIntegrity !== "verified" ||
		invariant.persistence !== "indexeddb" ||
		(requireRestored && invariant.persistenceRestored !== "true") ||
		invariant.canvasReady !== "true" ||
		invariant.actorCount !== 7 ||
		invariant.canonicalPopulation !== 8 ||
		invariant.residentControlCount !== invariant.actorCount ||
		invariant.canonicalActionIds.length === 0 ||
		invariant.routeSegmentCount < 1 ||
		invariant.teleportCount !== 0 ||
		invariant.contradictionCount !== 0
	)
		throw new Error(
			`generated-world invariant failed ${boundary}: ${JSON.stringify(invariant)}`,
		);
}

async function focusCanonicalResident(page) {
	const started = performance.now();
	await page.locator(".v1-context-panel").hover({ timeout: 5_000 });
	const resident = page.locator("ul.v1-presence-roster button").first();
	await resident.click({ timeout: 5_000 });
	await page
		.getByTestId("generated-world-canvas")
		.waitFor({ state: "visible", timeout: 5_000 });
	await page.waitForFunction(
		() =>
			document
				.querySelector('[data-testid="generated-world-canvas"]')
				?.getAttribute("data-focus-kind") === "citizen",
		undefined,
		{ timeout: 5_000 },
	);
	return performance.now() - started;
}

async function openSettlementOverview(page) {
	const started = performance.now();
	await page.locator(".v1-context-panel").hover({ timeout: 5_000 });
	await page
		.getByRole("button", { name: "Back to settlement" })
		.click({ timeout: 5_000 });
	await page.waitForFunction(
		() =>
			document
				.querySelector('[data-testid="generated-world-canvas"]')
				?.getAttribute("data-focus-kind") === "overview",
		undefined,
		{ timeout: 5_000 },
	);
	return performance.now() - started;
}

async function verifyGeneratedPersistenceReload(page, expectedStateHash) {
	const started = performance.now();
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForFunction(
		() =>
			document
				.querySelector('[data-testid="generated-world-canvas"]')
				?.getAttribute("data-ready") === "true",
		undefined,
		{ timeout: 20_000 },
	);
	const invariant = await captureWorldInvariant(page);
	assertWorldInvariant(invariant, "after persistence reload", true);
	if (invariant.stateHash !== expectedStateHash)
		throw new Error(
			`generated-world state hash changed across reload: ${String(expectedStateHash)} -> ${String(invariant.stateHash)}`,
		);
	return {
		latencyMs: performance.now() - started,
		persistenceRestored: invariant.persistenceRestored,
		route: new URL(page.url()).pathname,
		stateHash: invariant.stateHash,
		stateHashStable: true,
	};
}

const outputDirectory = resolve("tmp");
const reportPath = resolve(
	outputDirectory,
	"eonfolk-canonical-performance.json",
);
mkdirSync(outputDirectory, { recursive: true });
const sourceStart = captureSourceState();
if (sourceStart.workingTreeDirty)
	throw new Error(
		"canonical performance requires a clean source tree at start",
	);
const browserCohortCommands = [
	{
		command: "node scripts/validate-browser-cohort.mjs",
		output: execFileSync(
			process.execPath,
			["scripts/validate-browser-cohort.mjs"],
			{
				encoding: "utf8",
			},
		).trim(),
	},
	{
		command: "ruby scripts/validate-browser-cohort.rb",
		output: execFileSync("ruby", ["scripts/validate-browser-cohort.rb"], {
			encoding: "utf8",
		}).trim(),
	},
];
const browserExecutablePath = chromium.executablePath();
const browserVersion = execFileSync(browserExecutablePath, ["--version"], {
	encoding: "utf8",
}).trim();
const launcherSha256 = sha256(readFileSync(browserExecutablePath));
if (
	browserVersion !== expectedBrowserCohort.version ||
	launcherSha256 !== expectedBrowserCohort.launcherSha256
)
	throw new Error(
		"browser version or launcher hash changed after cohort validation",
	);
execFileSync("pnpm", ["--filter", "@eonfolk/web", "build"], {
	stdio: "inherit",
});
const builtOutputStart = hashBuiltOutput(resolve("apps/web/dist"));
const startPowerProfile = readPowerProfile();
const server = await preview({
	root: "apps/web",
	logLevel: "silent",
	preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const origin = "http://127.0.0.1:4173";
const routeAttempts = [];
const netlogRuns = [];
const browserLaunchOptions = (netlogPath) => ({
	executablePath: browserExecutablePath,
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
			const netlogPath = resolve(
				outputDirectory,
				`eonfolk-canonical-performance-netlog-${profile.name}-${repetition}.json`,
			);
			netlogRuns.push({ profile: profile.name, repetition, path: netlogPath });
			const browser = await chromium.launch(browserLaunchOptions(netlogPath));
			try {
				const context = await browser.newContext({
					viewport: { width: profile.width, height: profile.height },
					deviceScaleFactor: profile.deviceScaleFactor,
					reducedMotion: "no-preference",
					serviceWorkers: "block",
				});
				const page = await context.newPage();
				await page.addInitScript(() => {
					window.__eonfolkLongTasks = [];
					window.__eonfolkMarkEvidence = {};
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
					const installQualificationObserver = () => {
						const scheduled = new Set();
						const markWhen = (name, qualify) => {
							if (
								performance.getEntriesByName(name).length > 0 ||
								scheduled.has(name)
							)
								return;
							const evidence = qualify();
							if (evidence === null) return;
							scheduled.add(name);
							requestAnimationFrame(() => {
								scheduled.delete(name);
								const paintedEvidence = qualify();
								if (paintedEvidence === null) return;
								window.__eonfolkMarkEvidence[name] = paintedEvidence;
								performance.mark(name);
							});
						};
						const check = () => {
							markWhen("eonfolk-shell", () => {
								const loading = document.querySelector(".v1-genesis-loading");
								const factSurfaces = document.querySelectorAll(
									"main.v1-world, [data-testid='generated-world-canvas'], [data-testid='generated-semantic-world'], [data-testid='generated-world-overview']",
								);
								return loading !== null && factSurfaces.length === 0
									? {
											factFreeAuthorityShell: true,
											factSurfaceCount: factSurfaces.length,
											loadingHeading:
												document.querySelector(".v1-genesis-loading h1")
													?.textContent ?? "",
										}
									: null;
							});
							const world = document.querySelector("main.v1-world");
							const canvas = document.querySelector(
								"[data-testid='generated-world-canvas']",
							);
							const residents = [
								...document.querySelectorAll("ul.v1-presence-roster button"),
							];
							const canonicalPopulation = [
								...document.querySelectorAll(
									"[aria-label='Settlements'] button small",
								),
							].reduce((total, entry) => {
								const count = Number.parseInt(entry.textContent ?? "", 10);
								return total + (Number.isFinite(count) ? count : 0);
							}, 0);
							const semanticToggle = [
								...document.querySelectorAll("button"),
							].find(
								(button) => button.textContent?.trim() === "World in words",
							);
							markWhen("eonfolk-cta", () =>
								semanticToggle instanceof HTMLButtonElement &&
								!semanticToggle.disabled &&
								semanticToggle.tabIndex >= 0 &&
								semanticToggle.getClientRects().length > 0 &&
								world?.getAttribute("data-world-id") ===
									"eonfolk-genesis-world-v1"
									? {
											authorityReady: true,
											controlEnabled: true,
											controlFocusable: true,
											route: window.location.pathname,
										}
									: null,
							);
							markWhen("eonfolk-meaningful-world", () => {
								const actorCount = Number(canvas?.dataset.actorCount ?? "0");
								const renderer = canvas?.querySelector("canvas");
								const stateHash = world?.getAttribute("data-state-hash") ?? "";
								const routeSegmentCount = Number(
									canvas?.dataset.routeSegmentCount ?? "0",
								);
								const visibleInteractionCount = Number(
									canvas?.dataset.interactionCount ?? "0",
								);
								return canvas?.dataset.ready === "true" &&
									actorCount === 7 &&
									residents.length === actorCount &&
									canonicalPopulation === 8 &&
									routeSegmentCount >= 1 &&
									visibleInteractionCount >= 1 &&
									(canvas?.dataset.canonicalActionIds ?? "").length > 0 &&
									canvas?.dataset.teleportCount === "0" &&
									canvas?.dataset.contradictionCount === "0" &&
									world?.getAttribute("data-asset-integrity") === "verified" &&
									world?.getAttribute("data-persistence") === "indexeddb" &&
									/^[a-f0-9]{64}$/.test(stateHash) &&
									renderer instanceof HTMLCanvasElement &&
									renderer.width > 0 &&
									renderer.height > 0
									? {
											canvasPainted: true,
											actorCount,
											assetIntegrityVerified: true,
											canonicalPopulation,
											canonicalActivityGrounded: true,
											persistenceEstablished: true,
											residentControlCount: residents.length,
											route: window.location.pathname,
											routeSegmentCount,
											stateHash,
											visibleInteractionCount,
											worldId: world?.getAttribute("data-world-id"),
										}
									: null;
							});
						};
						new MutationObserver(check).observe(document.documentElement, {
							attributes: true,
							childList: true,
							characterData: true,
							subtree: true,
						});
						check();
					};
					if (document.documentElement) installQualificationObserver();
					else
						document.addEventListener(
							"DOMContentLoaded",
							installQualificationObserver,
							{ once: true },
						);
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
				await page.goto(`${origin}/world`, { waitUntil: "domcontentloaded" });
				const shell = await waitForQualificationMark(
					page,
					"eonfolk-shell",
					2_000,
				);
				const worldInWords = page.getByRole("button", {
					name: "World in words",
				});
				await worldInWords.waitFor({ timeout: profile.maximumDisplayMs });
				if (!(await worldInWords.isEnabled()))
					throw new Error("World in words is visible but not operable");
				const cta = await waitForQualificationMark(
					page,
					"eonfolk-cta",
					profile.maximumDisplayMs,
				);
				const meaningfulWorld = await waitForQualificationMark(
					page,
					"eonfolk-meaningful-world",
					profile.maximumDisplayMs,
				);
				await cdp.send("Network.emulateNetworkConditions", {
					offline: true,
					latency: 0,
					downloadThroughput: 0,
					uploadThroughput: 0,
				});
				const states = [];
				const worldBeforeSample = await captureWorldInvariant(page);
				assertWorldInvariant(worldBeforeSample, "before sample");
				for (const stateName of ["world-arrival"]) {
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
				const worldAfterSample = await captureWorldInvariant(page);
				assertWorldInvariant(worldAfterSample, "after sample");
				const residentFocusLatencyMs = await focusCanonicalResident(page);
				const citizenFocus = await frameState(
					page,
					"citizen-focus",
					profile.maximumP95FrameMs,
				);
				states.push(citizenFocus.summary);
				pooledFrameSamples.set(`${profile.name}:citizen-focus`, [
					...(pooledFrameSamples.get(`${profile.name}:citizen-focus`) ?? []),
					...citizenFocus.samples,
				]);
				const overviewLatencyMs = await openSettlementOverview(page);
				const overview = await frameState(
					page,
					"settlement-overview",
					profile.maximumP95FrameMs,
				);
				states.push(overview.summary);
				pooledFrameSamples.set(`${profile.name}:settlement-overview`, [
					...(pooledFrameSamples.get(`${profile.name}:settlement-overview`) ??
						[]),
					...overview.samples,
				]);
				await cdp.send("Network.emulateNetworkConditions", {
					offline: false,
					latency: 0,
					downloadThroughput: -1,
					uploadThroughput: -1,
				});
				const persistenceReload = await verifyGeneratedPersistenceReload(
					page,
					worldAfterSample.stateHash,
				);
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
					marks: {
						shellMs: shell.timeMs,
						ctaMs: cta.timeMs,
						meaningfulWorldMs: meaningfulWorld.timeMs,
					},
					markEvidence: {
						shell: shell.evidence,
						cta: cta.evidence,
						meaningfulWorld: meaningfulWorld.evidence,
					},
					worldInvariant: {
						beforeSample: worldBeforeSample,
						afterSample: worldAfterSample,
					},
					residentFocusLatencyMs,
					overviewLatencyMs,
					persistenceReload,
					states,
					diagnostics,
				});
				await context.close();
			} finally {
				await browser.close();
			}
		}
	}
} finally {
	await new Promise((resolveClose, rejectClose) => {
		server.httpServer.close((error) =>
			error ? rejectClose(error) : resolveClose(),
		);
	});
}

const externalRoutes = routeAttempts.filter((attempt) => !attempt.allowed);
const parsedNetlogRuns = netlogRuns.map((run) => ({
	profile: run.profile,
	repetition: run.repetition,
	path: relative(resolve("."), run.path).split(sep).join("/"),
	externalAttempts: inspectNetlogEgress(
		JSON.parse(readFileSync(run.path, "utf8")),
	).externalAttempts,
}));
const externalNetlogAttempts = [
	...new Set(parsedNetlogRuns.flatMap((run) => run.externalAttempts)),
].sort();
const aggregates = profiles.map((profile) => {
	const states = ["world-arrival", "citizen-focus", "settlement-overview"].map(
		(state) => {
			const samples = pooledFrameSamples.get(`${profile.name}:${state}`) ?? [];
			return { state, ...summarize(samples, profile.maximumP95FrameMs) };
		},
	);
	const allSamples = states.flatMap(
		(state) => pooledFrameSamples.get(`${profile.name}:${state.state}`) ?? [],
	);
	return {
		profile: profile.name,
		states,
		pooled: summarize(allSamples, profile.maximumP95FrameMs),
	};
});
const sourceEnd = captureSourceState();
const sourceStable =
	sourceStart.commit === sourceEnd.commit &&
	sourceStart.lockfileSha256 === sourceEnd.lockfileSha256 &&
	!sourceStart.workingTreeDirty &&
	!sourceEnd.workingTreeDirty;
const builtOutputEnd = hashBuiltOutput(resolve("apps/web/dist"));
const builtOutputStable =
	builtOutputStart.manifestSha256 === builtOutputEnd.manifestSha256;
const endPowerProfile = readPowerProfile();
const powerProfileAccepted =
	startPowerProfile.accepted &&
	endPowerProfile.accepted &&
	startPowerProfile.source === endPowerProfile.source;
const failed =
	!canonical ||
	!sourceStable ||
	!builtOutputStable ||
	!powerProfileAccepted ||
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
			run.markEvidence.shell.factFreeAuthorityShell !== true ||
			run.markEvidence.shell.factSurfaceCount !== 0 ||
			run.markEvidence.cta.authorityReady !== true ||
			run.markEvidence.cta.controlEnabled !== true ||
			run.markEvidence.cta.controlFocusable !== true ||
			run.markEvidence.cta.route !== "/world" ||
			run.markEvidence.meaningfulWorld.canvasPainted !== true ||
			run.markEvidence.meaningfulWorld.actorCount !== 7 ||
			run.markEvidence.meaningfulWorld.assetIntegrityVerified !== true ||
			run.markEvidence.meaningfulWorld.canonicalPopulation !== 8 ||
			run.markEvidence.meaningfulWorld.canonicalActivityGrounded !== true ||
			run.markEvidence.meaningfulWorld.persistenceEstablished !== true ||
			run.markEvidence.meaningfulWorld.residentControlCount !==
				run.markEvidence.meaningfulWorld.actorCount ||
			run.markEvidence.meaningfulWorld.route !== "/world" ||
			run.markEvidence.meaningfulWorld.routeSegmentCount < 1 ||
			run.markEvidence.meaningfulWorld.visibleInteractionCount < 1 ||
			run.markEvidence.meaningfulWorld.worldId !== "eonfolk-genesis-world-v1" ||
			run.residentFocusLatencyMs > profile.maximumInteractionLatencyMs ||
			run.overviewLatencyMs > profile.maximumInteractionLatencyMs ||
			run.persistenceReload.latencyMs > profile.maximumPersistenceReloadMs ||
			run.persistenceReload.persistenceRestored !== "true" ||
			run.persistenceReload.route !== "/world" ||
			run.persistenceReload.stateHashStable !== true ||
			typeof run.diagnostics.usedJsHeapBytes !== "number" ||
			run.diagnostics.usedJsHeapBytes > profile.maximumUsedJsHeapBytes ||
			run.states.some((state) => state.p95Ms > profile.maximumP95FrameMs)
		);
	});
const report = {
	schemaVersion: "eonfolk-release-genesis-web-performance-v3",
	measuredAt: new Date().toISOString(),
	canonical,
	runtime: {
		node: process.version,
		host: `${platform()} ${release()} ${arch()}`,
		chromium: {
			executablePath: browserExecutablePath,
			version: browserVersion,
			launcherSha256,
			cohort: expectedBrowserCohort,
			validators: browserCohortCommands,
		},
		headed: true,
		previewOrigin: origin,
		power: {
			start: startPowerProfile,
			end: endPowerProfile,
			profileAccepted: powerProfileAccepted,
			acceptanceRule:
				"stable AC or stable Battery >=50%, with macOS powermode 0; numerical budgets never change",
		},
	},
	source: {
		commit: sourceEnd.commit,
		workingTreeDirty: sourceEnd.workingTreeDirty,
		lockfileSha256: sourceEnd.lockfileSha256,
		start: sourceStart,
		end: sourceEnd,
		stable: sourceStable,
		commands: [
			{
				command: "pnpm --filter @eonfolk/web build",
				exitCode: 0,
			},
			{ command: "pnpm benchmark:web", exitCode: failed ? 1 : 0 },
		],
		builtOutput: {
			start: builtOutputStart,
			end: builtOutputEnd,
			stable: builtOutputStable,
		},
	},
	fixture: {
		run: "release-genesis-generated-world",
		route: "/world",
		worldId: "eonfolk-genesis-world-v1",
		population: 8,
		visibleSettlementResidents: 7,
		motion: "no-preference",
		quality: "default",
		focus: "foreground",
	},
	procedure: {
		repetitions,
		freshBrowserPerRun: true,
		coldContextPerRun: true,
		cacheDisabled: true,
		serviceWorkersBlocked: true,
		persistenceReload: "required same-route reload with stable state hash",
		stateWarmupMs,
		stateMeasurementMs: stateDurationMs,
		states: ["world-arrival", "citizen-focus", "settlement-overview"],
	},
	budgets: profiles.map((profile) => ({
		profile: profile.name,
		maximumDisplayMs: profile.maximumDisplayMs,
		maximumInteractionLatencyMs: profile.maximumInteractionLatencyMs,
		maximumP95FrameMs: profile.maximumP95FrameMs,
		maximumPersistenceReloadMs: profile.maximumPersistenceReloadMs,
		maximumUsedJsHeapBytes: profile.maximumUsedJsHeapBytes,
	})),
	runs,
	aggregates,
	networkOracle: {
		routeRequestCount: routeAttempts.length,
		externalRouteAttempts: externalRoutes,
		externalNetlogAttempts,
		netlogRuns: parsedNetlogRuns,
	},
	limitations: [
		"Mobile is canonical throttled emulation on the target Mac, not a physical phone.",
		"Memory is reported only when Chromium exposes performance.memory.",
		"This is a local pre-release measurement, not field telemetry or a human gate.",
		"The persisted-authority claim is limited to an actual warm /world reload with the same state hash; it does not claim server durability.",
	],
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failed) process.exitCode = 1;
