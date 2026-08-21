import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const listAccountsDocument = (): Plugin => ({
	name: "gate0-list-accounts-document",
	configurePreviewServer(server) {
		server.middlewares.use((request, response, next) => {
			if (request.url?.startsWith("/ListAccounts")) {
				// Chromium requests the current binary/base64 ListAccounts format.
				// An empty protobuf serializes and base64-encodes to an empty body.
				response.statusCode = 200;
				response.setHeader("Content-Type", "text/plain; charset=utf-8");
				response.setHeader("Cache-Control", "no-store");
				response.end();
				return;
			}
			next();
		});
	},
});

export default defineConfig({
	base: "/",
	build: {
		emptyOutDir: true,
		outDir: "../../../../tmp/gate-0-dist",
	},
	plugins: [listAccountsDocument(), react()],
	root: "tests/prototypes/gate-0/harness",
	server: {
		host: "127.0.0.1",
		port: 4173,
		strictPort: true,
	},
	preview: {
		host: "127.0.0.1",
		port: 4173,
		strictPort: true,
	},
});
