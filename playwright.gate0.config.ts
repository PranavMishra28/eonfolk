import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const chromiumExecutable =
	"/Users/pranav/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

export default defineConfig({
	expect: { timeout: 5_000 },
	forbidOnly: true,
	fullyParallel: false,
	globalSetup: "./scripts/gate0-playwright-setup.mjs",
	outputDir: "tmp/gate-0-playwright",
	preserveOutput: "failures-only",
	reporter: [["list"]],
	retries: 0,
	workers: 1,
	testDir: "tests/prototypes/gate-0/e2e",
	timeout: 30_000,
	use: {
		baseURL: "http://127.0.0.1:4173",
		browserName: "chromium",
		headless: false,
		launchOptions: {
			executablePath: chromiumExecutable,
			args: [
				"--disable-background-networking",
				"--disable-client-side-phishing-detection",
				"--disable-component-update",
				"--disable-component-extensions-with-background-pages",
				"--disable-default-apps",
				"--disable-domain-reliability",
				"--disable-features=AccountConsistency,AimEnabled,AutofillServerCommunication,CertificateTransparencyComponentUpdater,DialMediaRouteProvider,MediaRouter,NetworkTimeServiceQuerying,OptimizationGuide,OptimizationGuideModelDownloading,OptimizationHints,PreconnectFromKeyedService,PreconnectToSearch,PrivacySandboxSettings4,Signin,Sync",
				"--disable-search-engine-choice-screen",
				"--disable-signin-scoped-device-id",
				"--disable-sync",
				"--dns-prefetch-disable",
				"--enable-features=AvoidAutoTriggerListAccountsOnStale",
				"--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
				"--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
				"--gaia-url=http://127.0.0.1:4173",
				`--log-net-log=${resolve("tmp/gate-0-playwright/netlog.json")}`,
				"--metrics-recording-only",
				"--no-default-browser-check",
				"--no-first-run",
			],
		},
		screenshot: "only-on-failure",
		serviceWorkers: "block",
		trace: "retain-on-failure",
		video: "off",
	},
	webServer: {
		command: "pnpm gate0:preview",
		reuseExistingServer: false,
		stderr: "pipe",
		stdout: "pipe",
		timeout: 30_000,
		url: "http://127.0.0.1:4173/health.html",
	},
});
