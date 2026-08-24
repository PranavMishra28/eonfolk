import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { arch, homedir, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const outputIndex = process.argv.indexOf("--output");
const output = outputIndex < 0 ? null : process.argv[outputIndex + 1];
const requireClean = process.argv.includes("--require-clean");
const server = await createServer({
	root: process.cwd(),
	logLevel: "silent",
	server: { host: "127.0.0.1", port: 0, strictPort: false },
});
let browser;
try {
	await server.listen();
	const address = server.httpServer?.address();
	if (address === null || address === undefined || typeof address === "string")
		throw new Error("stress server did not expose a port");
	// Headless Chromium throttles requestAnimationFrame by pixel area and makes
	// frame-budget evidence incomparable with the canonical headful benchmark.
	const targetMacExecutable = join(
		homedir(),
		"Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
	);
	const executablePath = existsSync(targetMacExecutable)
		? targetMacExecutable
		: chromium.executablePath();
	browser = await chromium.launch({ executablePath, headless: false });
	const measurements = [];
	for (const viewport of [
		{
			name: "desktop",
			width: 1728,
			height: 1117,
			deviceScaleFactor: 2,
			budget: 16.7,
			practicalBudget: 25,
		},
		{
			name: "laptop",
			width: 1366,
			height: 768,
			deviceScaleFactor: 1,
			budget: 16.7,
			practicalBudget: 25,
		},
		{
			name: "mobile",
			width: 390,
			height: 844,
			deviceScaleFactor: 3,
			budget: 33.3,
			practicalBudget: 33.3,
		},
	]) {
		const samples = {};
		for (const actorCount of [7, 12]) {
			const page = await browser.newPage({
				viewport: { width: viewport.width, height: viewport.height },
				deviceScaleFactor: viewport.deviceScaleFactor,
			});
			await page.goto(
				`http://127.0.0.1:${address.port}/tests/e2e/generated-world-stress-harness.html?actors=${actorCount}`,
			);
			await page.waitForFunction(
				() => window.__eonfolkPresentationStress !== undefined,
				undefined,
				{ timeout: 30_000 },
			);
			const result = await page.evaluate(
				() => window.__eonfolkPresentationStress,
			);
			await page.close();
			if (result?.error)
				throw new Error(`${viewport.name}/${actorCount}: ${result.error}`);
			samples[actorCount] = result;
		}
		const p95Ratio =
			samples[12].p95FrameMilliseconds / samples[7].p95FrameMilliseconds;
		measurements.push({
			...viewport,
			baseline: samples[7],
			twelve: samples[12],
			p95Ratio,
			pass:
				samples[12].p95FrameMilliseconds <= viewport.practicalBudget &&
				p95Ratio <= 1.25,
		});
	}
	const sourceClean =
		execFileSync("git", ["status", "--porcelain"], {
			encoding: "utf8",
		}).trim() === "";
	const measurementsPass = measurements.every(({ pass }) => pass);
	const report = {
		schemaVersion: "eonfolk-twelve-actor-presentation-stress-v1",
		status: !measurementsPass ? "FAIL" : sourceClean ? "PASS" : "SMOKE_ONLY",
		recordedAt: new Date().toISOString(),
		sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim(),
		sourceClean,
		environment: {
			node: process.version,
			host: `${platform()} ${release()} ${arch()}`,
			browser: await browser.version(),
			executablePath,
		},
		claimBoundary:
			"Non-authoritative measurement-only fixture comparing seven and twelve presentation actors over the same real generated PlayCanvas scene. The authoritative eight-citizen production benchmark retains its 16.7/33.3 ms budgets. This separate twelve-actor practicality gate requires no more than 25 ms desktop/laptop or 33.3 ms mobile p95 and no more than 25% overhead versus the identical seven-actor fixture. It does not add citizens to Reality or claim population gameplay depth.",
		measurements,
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	if (output === null) process.stdout.write(serialized);
	else {
		const resolvedOutput = resolve(output);
		mkdirSync(dirname(resolvedOutput), { recursive: true });
		writeFileSync(resolvedOutput, serialized);
	}
	if (report.status === "FAIL" || (requireClean && !sourceClean))
		process.exitCode = 1;
} finally {
	await browser?.close();
	await server.close();
}
