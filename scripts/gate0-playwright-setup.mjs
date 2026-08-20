import { mkdirSync, rmSync } from "node:fs";

export default function gate0PlaywrightSetup() {
	const output = "tmp/gate-0-playwright";
	rmSync(output, { force: true, recursive: true });
	mkdirSync(output, { recursive: true });
}
