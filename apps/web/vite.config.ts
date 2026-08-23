import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export function resolveBuildSha(
	configured: string | undefined,
	readGitHead: () => string = () =>
		execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim(),
): string {
	let candidate = configured;
	if (candidate === undefined) {
		try {
			candidate = readGitHead();
		} catch {
			return "unknown";
		}
	}
	return /^[a-f0-9]{7,64}$/iu.test(candidate)
		? candidate.toLowerCase()
		: "unknown";
}

function appVersion(): string {
	try {
		const parsed = JSON.parse(
			readFileSync(new URL("./package.json", import.meta.url), "utf8"),
		) as { readonly version?: unknown };
		return typeof parsed.version === "string" &&
			/^[a-z0-9][a-z0-9._-]{0,63}$/iu.test(parsed.version)
			? parsed.version
			: "unknown";
	} catch {
		return "unknown";
	}
}

export default defineConfig({
	plugins: [react()],
	define: {
		__EONFOLK_APP_VERSION__: JSON.stringify(appVersion()),
		__EONFOLK_BUILD_SHA__: JSON.stringify(
			resolveBuildSha(process.env.GITHUB_SHA ?? process.env.EONFOLK_BUILD_SHA),
		),
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
		manifest: true,
		reportCompressedSize: true,
	},
	server: {
		host: "127.0.0.1",
	},
	preview: {
		host: "127.0.0.1",
	},
});
