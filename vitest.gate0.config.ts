import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/prototypes/gate-0/**/*.test.{ts,tsx}"],
		passWithNoTests: false,
		reporters: ["default"],
	},
});
