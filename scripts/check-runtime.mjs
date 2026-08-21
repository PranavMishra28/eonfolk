const expectedNode = "22.23.1";
const expectedPnpm = "11.15.1";

const failures = [];
if (process.versions.node !== expectedNode) {
	failures.push(`Node ${expectedNode} required; found ${process.versions.node}`);
}
if (process.platform === "darwin" && process.arch !== "arm64") {
	failures.push(`native arm64 Node required on macOS; found ${process.arch}`);
}

const userAgent = process.env.npm_config_user_agent ?? "";
if (userAgent && !userAgent.startsWith(`pnpm/${expectedPnpm} `)) {
	failures.push(`pnpm ${expectedPnpm} required; found ${userAgent.split(" ")[0]}`);
}

if (failures.length > 0) {
	for (const failure of failures) {
		process.stderr.write(`${failure}\n`);
	}
	process.exitCode = 1;
} else {
	process.stdout.write(
		`runtime ok: node ${process.versions.node} ${process.arch}; pnpm ${expectedPnpm}\n`,
	);
}
