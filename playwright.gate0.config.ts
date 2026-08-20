import { defineConfig } from "@playwright/test";

const chromiumExecutable =
	"/Users/pranav/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

export default defineConfig({
	expect: { timeout: 5_000 },
	forbidOnly: true,
	fullyParallel: false,
	outputDir: "tmp/gate-0-playwright",
	preserveOutput: "failures-only",
	reporter: [["list"]],
	retries: 0,
	testDir: "tests/prototypes/gate-0/e2e",
	timeout: 30_000,
	use: {
		baseURL: "http://127.0.0.1:4173",
		browserName: "chromium",
		headless: false,
		launchOptions: { executablePath: chromiumExecutable },
		screenshot: "only-on-failure",
		serviceWorkers: "block",
		trace: "retain-on-failure",
		video: "off",
	},
	webServer: {
		command: "pnpm gate0:dev",
		reuseExistingServer: false,
		stderr: "pipe",
		stdout: "pipe",
		timeout: 30_000,
		url: "http://127.0.0.1:4173/health.html",
	},
});
