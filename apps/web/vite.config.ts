import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
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

const REPOSITORY_RUNTIME_SOURCE =
	/\/(?:apps\/web\/src|packages\/[^/]+\/src)\/.*\.tsx?$/u;

export function compactProductionErrorDetails(
	source: string,
	id: string,
): string {
	if (!REPOSITORY_RUNTIME_SOURCE.test(id) || id.includes(".test."))
		return source;
	return source
		.replace(
			/((?:fail|new PersistenceError)\(\s*("[A-Z_]+")\s*,\s*)"(?:[^"\\]|\\.)*"/gu,
			(_match, prefix: string, code: string) => `${prefix}${code}`,
		)
		.replace(
			/new (Error|RangeError)\(\s*"(?:[^"\\]|\\.)*"\s*\)/gu,
			(_match, constructorName: string) =>
				`new ${constructorName}("LOCAL_RUNTIME_FAILURE")`,
		)
		.replace(/fail\(\s*"(?:[^"\\]|\\.)*"\s*\)/gu, 'fail("invalid")');
}

export default defineConfig({
	plugins: [
		react(),
		{
			name: "compact-production-error-details",
			apply: "build",
			transform(source, id) {
				const code = compactProductionErrorDetails(source, id);
				return code === source ? null : { code, map: null };
			},
		},
	],
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
