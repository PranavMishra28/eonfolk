import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import productionConfig from "./playwright.config";

export default defineConfig({
	...productionConfig,
	grep: /@fault/u,
	grepInvert: undefined,
	outputDir: resolve(import.meta.dirname, "../../tmp/riverhold-playwright"),
	webServer: {
		command:
			"EONFOLK_E2E_CRASH_HOOKS=1 ./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --port 4174 --strictPort",
		cwd: import.meta.dirname,
		port: 4174,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
