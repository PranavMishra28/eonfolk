#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const host = fileURLToPath(
	new URL("./local-world-authority-host.ts", import.meta.url),
);
const register = fileURLToPath(
	new URL("./ts-source-register.mjs", import.meta.url),
);
const child = spawn(
	process.execPath,
	[
		"--experimental-strip-types",
		"--no-warnings",
		"--import",
		register,
		host,
		...process.argv.slice(2),
	],
	{ stdio: "inherit" },
);
child.on("exit", (code) => {
	process.exit(code ?? 1);
});
