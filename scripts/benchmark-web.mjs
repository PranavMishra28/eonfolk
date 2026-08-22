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
			const canvas = document.querySelector("[data-testid='riverhold-canvas']");
			const citizens = [
				...document.querySelectorAll(
					"[aria-label='Eight Riverhold citizens and their current activities'] li",
				),
			];
			const interaction = [
				...document.querySelectorAll(".semantic-summary div"),
			]
				.find((entry) =>
					/(?:visible interaction|named interaction)/iu.test(
						entry.querySelector("dt")?.textContent ?? "",
					),
				)
				?.querySelector("dd")
				?.textContent?.trim();
			const citizenNames = citizens.map(
				(citizen) => citizen.querySelector("strong")?.textContent?.trim() ?? "",
			);
			return {
				markName,
				readyState: document.readyState,
				canvasReady: canvas?.dataset.ready ?? null,
				canvasInteractions: canvas?.dataset.interactions ?? null,
				citizenCount: citizens.length,
				citizenNames,
				interaction: interaction ?? null,
				interactionCitizenCount:
					typeof interaction === "string"
						? citizenNames.filter(
								(name) => name.length > 0 && interaction.includes(name),
							).length
						: 0,
				illustratedInteraction:
					document.querySelector(".world-notice")?.textContent?.trim() ?? null,
				runtimeError:
					document.querySelector(".runtime-error")?.textContent?.trim() ?? null,
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

async function captureArrivalInvariant(page) {
	return page.evaluate(() => {
		const buttons = [...document.querySelectorAll("button")];
		const decisionPanel = document.querySelector(
			'[aria-label="Current Riverhold decision"]',
		);
		const followButtons = [
			...(decisionPanel?.querySelectorAll("button") ?? []),
		].filter((button) => button.textContent?.trim().startsWith("Follow Mara"));
		return {
			arrivalPanelCount: document.querySelectorAll(".phase-panel--arrival")
				.length,
			followButtonCount: followButtons.length,
			followButtonEnabled:
				followButtons.length === 1 && !followButtons[0].disabled,
			runtimeErrorCount: document.querySelectorAll(".runtime-error").length,
			visibleButtonNames: buttons
				.filter((button) => button.getClientRects().length > 0)
				.map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
				.filter((name) => name.length > 0),
		};
	});
}

function assertArrivalInvariant(invariant, boundary) {
	if (
		invariant.arrivalPanelCount !== 1 ||
		invariant.followButtonCount !== 1 ||
		!invariant.followButtonEnabled ||
		invariant.runtimeErrorCount !== 0
	)
		throw new Error(
			`arrival invariant failed ${boundary}: ${JSON.stringify(invariant)}`,
		);
}

async function reachBusyMarket(page) {
	await page
		.getByLabel("Current Riverhold decision")
		.getByRole("button", { name: "Follow Mara", exact: true })
		.click({ timeout: 5_000 });
	const started = performance.now();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByText("OBSERVED", { exact: true }).waitFor();
	return performance.now() - started;
}

async function reachChronicle(page) {
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
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
								const loading = document.querySelector(".runtime-loading");
								const factSurfaces = document.querySelectorAll(
									"[data-testid='riverhold-canvas'], .semantic-world, .world-notice, [data-testid='story-card']",
								);
								return loading !== null && factSurfaces.length === 0
									? {
											factFreeAuthorityShell: true,
											factSurfaceCount: factSurfaces.length,
											loadingHeading:
												document.querySelector(".runtime-loading h1")
													?.textContent ?? "",
										}
									: null;
							});
							const follow = document
								.querySelector('[aria-label="Current Riverhold decision"]')
								?.querySelector("button.primary-action");
							const canvas = document.querySelector(
								"[data-testid='riverhold-canvas']",
							);
							const citizens = [
								...document.querySelectorAll(
									"[aria-label='Eight Riverhold citizens and their current activities'] li",
								),
							];
							markWhen("eonfolk-cta", () =>
								follow instanceof HTMLButtonElement &&
								!follow.disabled &&
								canvas?.dataset.ready === "true" &&
								citizens.length === 8
									? {
											authorityReady: true,
											followEnabled: true,
											semanticCitizenCount: citizens.length,
										}
									: null,
							);
							markWhen("eonfolk-meaningful-world", () => {
								const activityTexts = citizens.map(
									(citizen) =>
										citizen.querySelector("button")?.textContent?.trim() ?? "",
								);
								const citizenNames = citizens.map(
									(citizen) =>
										citizen.querySelector("strong")?.textContent?.trim() ?? "",
								);
								const maraCount = citizens.filter((citizen) =>
									citizen
										.querySelector("strong")
										?.textContent?.includes("Mara"),
								).length;
								const interaction = [
									...document.querySelectorAll(".semantic-summary div"),
								]
									.find((entry) =>
										/(?:visible interaction|named interaction)/iu.test(
											entry.querySelector("dt")?.textContent ?? "",
										),
									)
									?.querySelector("dd")
									?.textContent?.trim();
								const illustratedInteraction = document
									.querySelector(".world-notice")
									?.textContent?.trim();
								const interactionCitizenCount =
									typeof interaction === "string"
										? citizenNames.filter(
												(name) => name.length > 0 && interaction.includes(name),
											).length
										: 0;
								const illustratedInteractionCount = Number(
									canvas?.dataset.interactions ?? "0",
								);
								return canvas?.dataset.ready === "true" &&
									citizens.length === 8 &&
									activityTexts.every((text) => text.length > 0) &&
									maraCount === 1 &&
									typeof interaction === "string" &&
									interaction.length > 0 &&
									interactionCitizenCount >= 2 &&
									/(?:exchange|confer|compare|tally)/i.test(interaction) &&
									illustratedInteractionCount >= 1 &&
									typeof illustratedInteraction === "string" &&
									illustratedInteraction.length > 0
									? {
											canvasPainted: true,
											semanticCitizenCount: citizens.length,
											activityCount: activityTexts.length,
											maraCount,
											interactionCue: interaction,
											interactionCitizenCount,
											illustratedInteractionCount,
											semanticIllustratedParity: true,
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
				await page.goto(origin, { waitUntil: "domcontentloaded" });
				const shell = await waitForQualificationMark(
					page,
					"eonfolk-shell",
					2_000,
				);
				const follow = page
					.getByLabel("Current Riverhold decision")
					.getByRole("button", { name: "Follow Mara", exact: true });
				await follow.waitFor({ timeout: profile.maximumDisplayMs });
				if (!(await follow.isEnabled()))
					throw new Error("Follow Mara is visible but not operable");
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
				const arrivalBeforeSample = await captureArrivalInvariant(page);
				assertArrivalInvariant(arrivalBeforeSample, "before sample");
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
				const arrivalAfterSample = await captureArrivalInvariant(page);
				assertArrivalInvariant(arrivalAfterSample, "after sample");
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
					arrivalInvariant: {
						beforeSample: arrivalBeforeSample,
						afterSample: arrivalAfterSample,
					},
					investigationLatencyMs,
					catchUpMs,
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
			run.markEvidence.cta.followEnabled !== true ||
			run.markEvidence.cta.semanticCitizenCount !== 8 ||
			run.markEvidence.meaningfulWorld.canvasPainted !== true ||
			run.markEvidence.meaningfulWorld.semanticCitizenCount !== 8 ||
			run.markEvidence.meaningfulWorld.activityCount !== 8 ||
			run.markEvidence.meaningfulWorld.maraCount !== 1 ||
			run.markEvidence.meaningfulWorld.interactionCitizenCount < 2 ||
			run.markEvidence.meaningfulWorld.semanticIllustratedParity !== true ||
			run.states.some((state) => state.p95Ms > profile.maximumP95FrameMs)
		);
	});
const report = {
	schemaVersion: "eonfolk-canonical-web-performance-v1",
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
		run: "canonical-local-proof",
		region: "region_riverhold",
		citizens: 8,
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
		netlogRuns: parsedNetlogRuns,
	},
	limitations: [
		"Mobile is canonical throttled emulation on the target Mac, not a physical phone.",
		"Memory is reported only when Chromium exposes performance.memory.",
		"This is a local pre-release measurement, not field telemetry or a human gate.",
	],
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failed) process.exitCode = 1;
