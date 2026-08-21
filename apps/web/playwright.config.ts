import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: resolve(import.meta.dirname, "../../tests/e2e"),
	outputDir: resolve(import.meta.dirname, "../../tmp/riverhold-playwright"),
	fullyParallel: false,
	retries: 0,
	reporter: "line",
	use: {
		baseURL: "http://127.0.0.1:4174",
		browserName: "chromium",
		headless: true,
		trace: "retain-on-failure",
		video: "off",
		screenshot: "only-on-failure",
		launchOptions: {
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
				"--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
				"--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
				"--gaia-url=http://127.0.0.1:4174",
				`--log-net-log=${resolve(import.meta.dirname, "../../tmp/riverhold-playwright/netlog.json")}`,
				"--metrics-recording-only",
				"--no-default-browser-check",
				"--no-first-run",
			],
		},
		serviceWorkers: "block",
	},
	webServer: {
		command:
			"EONFOLK_E2E_CRASH_HOOKS=1 ./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --port 4174 --strictPort",
		cwd: import.meta.dirname,
		port: 4174,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
