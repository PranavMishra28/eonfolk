import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const executable = process.env.GITLEAKS_BIN ?? "gitleaks";
const directory = mkdtempSync(join(tmpdir(), "eonfolk-gitleaks-neighbor-"));
try {
	const fixtureDirectory = join(directory, "tests/unit/security-neighbor");
	mkdirSync(fixtureDirectory, { recursive: true });
	const syntheticPat = [
		"eonfolk",
		"-neighbor-",
		"a9Qx7Lm2Vw8Kd4Rt6Yp3Nc5Hs1Zb0FgE",
	].join("");
	writeFileSync(
		join(fixtureDirectory, "credential-neighbor.test.ts"),
		`const apiKey = ${JSON.stringify(syntheticPat)};\n`,
	);
	const result = spawnSync(
		executable,
		[
			"dir",
			"--no-banner",
			"--redact",
			"--exit-code",
			"17",
			"--config",
			resolve(".gitleaks.toml"),
			directory,
		],
		{ encoding: "utf8" },
	);
	if (result.status !== 17) {
		process.stderr.write(result.stdout);
		process.stderr.write(result.stderr);
		throw new Error(
			`neighboring synthetic credential must be detected; exit=${result.status}`,
		);
	}
	process.stdout.write("GITLEAKS_NEIGHBOR_SECRET_REJECTED\n");
} finally {
	rmSync(directory, { recursive: true, force: true });
}
