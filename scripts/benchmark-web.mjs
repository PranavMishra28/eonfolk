import { chromium } from "@playwright/test";
import { preview } from "vite";

const profiles = [
	{
		name: "desktop",
		width: 1728,
		height: 1117,
		maximumDisplayMs: 3_000,
		maximumP95FrameMs: 16.7,
	},
	{
		name: "laptop",
		width: 1366,
		height: 768,
		maximumDisplayMs: 3_000,
		maximumP95FrameMs: 16.7,
	},
	{
		name: "mobile-emulation",
		width: 390,
		height: 844,
		maximumDisplayMs: 5_000,
		maximumP95FrameMs: 33.3,
	},
];

const server = await preview({
	root: "apps/web",
	logLevel: "silent",
	preview: { host: "127.0.0.1", port: 0, strictPort: false },
});
const address = server.httpServer.address();
if (address === null || typeof address === "string")
	throw new Error("Vite preview did not expose a local port");
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
	for (const profile of profiles) {
		const page = await browser.newPage({
			viewport: { width: profile.width, height: profile.height },
			reducedMotion: "no-preference",
		});
		await page.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin === origin) await route.continue();
			else await route.abort("blockedbyclient");
		});
		const started = performance.now();
		await page.goto(origin, { waitUntil: "domcontentloaded" });
		await page
			.getByTestId("riverhold-canvas")
			.waitFor({ state: "attached", timeout: profile.maximumDisplayMs });
		await page.waitForFunction(
			() =>
				document.querySelector("[data-testid='riverhold-canvas']")?.dataset
					.ready === "true",
			undefined,
			{ timeout: profile.maximumDisplayMs },
		);
		const meaningfulWorldDisplayMs = performance.now() - started;
		const frameDurations = await page.evaluate(
			() =>
				new Promise((resolve) => {
					const samples = [];
					let prior = null;
					let warmupFrames = 60;
					const sample = (time) => {
						if (warmupFrames > 0) {
							warmupFrames -= 1;
							prior = time;
							requestAnimationFrame(sample);
							return;
						}
						if (prior !== null) samples.push(time - prior);
						prior = time;
						if (samples.length >= 120) resolve(samples);
						else requestAnimationFrame(sample);
					};
					requestAnimationFrame(sample);
				}),
		);
		const sorted = [...frameDurations].sort((left, right) => left - right);
		const p95FrameMs =
			sorted[Math.floor(sorted.length * 0.95)] ?? Number.POSITIVE_INFINITY;
		const semanticCitizens = await page
			.getByRole("list", { name: /Eight Riverhold citizens/i })
			.getByRole("listitem")
			.count();
		results.push({
			profile: profile.name,
			viewport: { width: profile.width, height: profile.height },
			meaningfulWorldDisplayMs,
			p95FrameMs,
			semanticCitizens,
			budgets: {
				maximumDisplayMs: profile.maximumDisplayMs,
				maximumP95FrameMs: profile.maximumP95FrameMs,
			},
		});
		await page.close();
	}
} finally {
	await browser.close();
	await new Promise((resolve, reject) => {
		server.httpServer.close((error) => (error ? reject(error) : resolve()));
	});
}

const report = {
	schemaVersion: "eonfolk-web-benchmark-v1",
	runtime: {
		node: process.version,
		chromium: chromium.executablePath(),
		profileClass: "local-headless-synthetic",
	},
	results,
	limitations: [
		"Mobile is viewport emulation on the target Mac, not a physical mid-tier phone.",
		"Localhost timing does not represent 4G transfer latency.",
		"Headless requestAnimationFrame is a smoke measurement, not a field percentile.",
	],
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (
	results.some(
		(result) =>
			result.semanticCitizens !== 8 ||
			result.meaningfulWorldDisplayMs > result.budgets.maximumDisplayMs ||
			result.p95FrameMs > result.budgets.maximumP95FrameMs + 0.15,
	)
)
	process.exitCode = 1;
