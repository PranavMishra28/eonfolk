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
				"--disable-component-update",
				"--disable-domain-reliability",
				"--disable-sync",
				"--no-first-run",
			],
		},
	},
	webServer: {
		command:
			"./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --port 4174 --strictPort",
		cwd: import.meta.dirname,
		port: 4174,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
