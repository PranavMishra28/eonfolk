#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mode = process.argv[2] === "prod" ? "prod" : "dev";
const webCommand =
	mode === "prod"
		? [
				"--filter",
				"@eonfolk/web",
				"preview",
				"--host",
				"127.0.0.1",
				"--port",
				"4174",
				"--strictPort",
			]
		: ["--filter", "@eonfolk/web", "dev"];

const children = [];
const start = (args, extraEnv = {}) => {
	const child = spawn("corepack", ["pnpm", ...args], {
		cwd: root,
		stdio: "inherit",
		env: { ...process.env, ...extraEnv },
	});
	children.push(child);
	child.on("exit", (code) => {
		for (const other of children) {
			if (other !== child && other.exitCode === null) other.kill("SIGTERM");
		}
		if (code !== 0 && code !== null) process.exitCode = code;
	});
	return child;
};

if (mode === "prod") {
	const build = spawn("corepack", ["pnpm", "build"], {
		cwd: root,
		stdio: "inherit",
	});
	await new Promise((resolvePromise, reject) => {
		build.on("exit", (code) => {
			if (code === 0) resolvePromise();
			else reject(new Error(`build exited ${String(code)}`));
		});
	});
}

start(["--filter", "@eonfolk/world-authority", "start"]);

const deadline = Date.now() + 20_000;
while (Date.now() < deadline) {
	try {
		const response = await fetch("http://127.0.0.1:4175/health");
		if (response.ok) {
			const body = await response.json();
			if (body?.ok === true && body?.ready === true) break;
		}
	} catch {
		// Authority is still booting; the web client can fall back to IndexedDB.
	}
	await new Promise((resolveWait) => setTimeout(resolveWait, 250));
}

start(webCommand);

const stop = () => {
	for (const child of children) child.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
