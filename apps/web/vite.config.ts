import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	define: {
		__EONFOLK_DIAGNOSTICS_MODE__: JSON.stringify(
			process.env.VITE_EONFOLK_DIAGNOSTICS_MODE ?? "off",
		),
		__EONFOLK_E2E_CRASH_HOOKS__: JSON.stringify(
			process.env.EONFOLK_E2E_CRASH_HOOKS === "1",
		),
	},
	build: {
		target: "es2022",
		cssCodeSplit: true,
		reportCompressedSize: true,
	},
	server: {
		host: "127.0.0.1",
	},
	preview: {
		host: "127.0.0.1",
	},
});
