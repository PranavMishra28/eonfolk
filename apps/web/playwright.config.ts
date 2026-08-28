import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const linuxCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const captureMedia = process.env.EONFOLK_CAPTURE_MEDIA === "1";
const playwrightOutputDir = resolve(
	import.meta.dirname,
	"../../tmp/dawnmere-playwright",
);

export default defineConfig({
	testDir: resolve(import.meta.dirname, "../../tests/e2e"),
	outputDir: playwrightOutputDir,
	grepInvert: linuxCi
		? /@fault|@illustrated-target|@synthetic/u
		: /@fault|@synthetic/u,
	// Linux CI production e2e is independent per Playwright context (IndexedDB /
	// localStorage) and per worker browser profile. The preview server is static,
	// so workers share 127.0.0.1:4174. Chromium --log-net-log is browser-scoped
	// and is attached in the eonfolk fixture from TEST_WORKER_INDEX so the parent
	// config process cannot bake netlog-w0.json into every worker.
	// Four hosted Chromium+PlayCanvas workers timed out 24/68 production journeys
	// on ubuntu-24.04; two workers stay parallel without starving the world.
	fullyParallel: linuxCi,
	workers: linuxCi ? 2 : 1,
	retries: 0,
	reporter: "line",
	use: {
		baseURL: "http://127.0.0.1:4174",
		browserName: "chromium",
		headless: true,
		// The embodied world renders continuously. Capturing a JPEG on every trace
		// frame produced 2,614 images (141 MiB across four failed traces) on the
		// hosted Ubuntu run and starved the authoritative sponsor transitions that
		// the tests were observing. Keep DOM snapshots, sources, and the separately
		// configured failure screenshot, but do not record redundant trace filmstrips.
		trace: {
			mode: "retain-on-failure",
			screenshots: false,
			snapshots: true,
			sources: true,
		},
		video: captureMedia
			? { mode: "on", size: { width: 960, height: 540 } }
			: "off",
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
				"--metrics-recording-only",
				"--no-default-browser-check",
				"--no-first-run",
			],
		},
		serviceWorkers: "block",
	},
	webServer: {
		command: "./node_modules/.bin/vite preview --port 4174 --strictPort",
		cwd: import.meta.dirname,
		port: 4174,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
