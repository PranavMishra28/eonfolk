import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/",
	build: {
		emptyOutDir: true,
		outDir: "../../../../tmp/gate-0-dist",
	},
	plugins: [react()],
	root: "tests/prototypes/gate-0/harness",
	server: {
		host: "127.0.0.1",
		port: 4173,
		strictPort: true,
	},
});
