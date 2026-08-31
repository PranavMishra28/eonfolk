#!/usr/bin/env node
/**
 * Process-presence placeholder. Holds a local process and writes a status
 * file. It does not tick Reality. The tested stepper is
 * tickLocalWorldAuthority. Play does not attach. If you stop this process,
 * catch-up remains the honest path. No cloud. ~$0.
 *
 * Usage: node scripts/local-world-authority.mjs
 * Optional: EONFOLK_LOCAL_AUTHORITY_STATE=./tmp/local-world-authority.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const statePath = resolve(
	process.env.EONFOLK_LOCAL_AUTHORITY_STATE ??
		"tmp/eonfolk-local-world-authority.json",
);

await mkdir(dirname(statePath), { recursive: true });
await writeFile(
	statePath,
	`${JSON.stringify(
		{
			schemaVersion: "eonfolk-local-world-authority-v1",
			status: "process-started",
			note: "Play is not attached. Closing this process stops the clock.",
			startedAtMs: Date.now(),
		},
		null,
		2,
	)}\n`,
	"utf8",
);
process.stdout.write(
	`Local world authority prototype is running. State: ${statePath}\nPlay remains Worker-in-tab until attach exists. Ctrl+C stops the clock.\n`,
);

const keepAlive = setInterval(() => {
	/* process holds the writer fence while the user wants continuity */
}, 28_000);
process.on("SIGINT", () => {
	clearInterval(keepAlive);
	process.stdout.write("Local world authority stopped. Catch-up is required.\n");
	process.exit(0);
});
