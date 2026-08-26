import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import productionConfig from "./playwright.config";

export default defineConfig({
	...productionConfig,
	grep: /@synthetic/u,
	grepInvert: undefined,
	outputDir: resolve(import.meta.dirname, "../../tmp/synthetic-evaluation"),
});
