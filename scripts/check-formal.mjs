import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TLC_JAR_SHA256, TLC_VERSION } from "./formal-toolchain.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spec = path.join(root, "formal", "Persistence.tla");
const config = path.join(root, "formal", "Persistence.cfg");

async function executable(candidate) {
	if (candidate === undefined) return null;
	try {
		await access(candidate, constants.X_OK);
		return candidate;
	} catch {
		return null;
	}
}

function fromPath(name) {
	const result = spawnSync("/usr/bin/env", ["sh", "-c", `command -v ${name}`], {
		encoding: "utf8",
	});
	return result.status === 0 ? result.stdout.trim() : null;
}

async function existingFile(candidate) {
	if (candidate === undefined) return null;
	try {
		await access(candidate, constants.R_OK);
		return candidate;
	} catch {
		return null;
	}
}

export async function verifyJarIdentity(jar) {
	const jarBytes = await readFile(jar);
	const actualSha256 = createHash("sha256").update(jarBytes).digest("hex");
	if (actualSha256 !== TLC_JAR_SHA256) {
		const error = new Error(
			`TLC JAR identity mismatch: ${actualSha256} != ${TLC_JAR_SHA256}`,
		);
		error.code = "TOOL_IDENTITY_MISMATCH";
		error.actualSha256 = actualSha256;
		throw error;
	}
	return actualSha256;
}

async function run() {
	await access(spec, constants.R_OK);
	await access(config, constants.R_OK);

	const java =
		(await executable(
			process.env.JAVA_HOME === undefined
				? undefined
				: path.join(process.env.JAVA_HOME, "bin", "java"),
		)) ??
		(await executable("/opt/homebrew/opt/openjdk@21/bin/java")) ??
		fromPath("java");
	const jar = await existingFile(process.env.TLA2TOOLS_JAR);

	if (java === null || jar === null) {
		process.stderr.write(
			`${JSON.stringify(
				{
					status: "TOOL_UNAVAILABLE",
					verified: false,
					reason:
						"TLC requires both a Java executable and an explicitly supplied readable tla2tools.jar",
					java,
					jar,
					spec: path.relative(root, spec),
					config: path.relative(root, config),
				},
				null,
				2,
			)}\n`,
		);
		process.exit(1);
	}

	let jarSha256;
	try {
		jarSha256 = await verifyJarIdentity(jar);
	} catch (error) {
		process.stderr.write(
			`${JSON.stringify(
				{
					status: "TOOL_IDENTITY_MISMATCH",
					verified: false,
					expectedVersion: TLC_VERSION,
					expectedSha256: TLC_JAR_SHA256,
					actualSha256:
						typeof error === "object" && error !== null
							? (error.actualSha256 ?? null)
							: null,
					jar,
				},
				null,
				2,
			)}\n`,
		);
		process.exit(1);
	}
	const result = spawnSync(
		java,
		[
			"-cp",
			jar,
			"tlc2.TLC",
			"-cleanup",
			"-workers",
			"1",
			"-config",
			config,
			spec,
		],
		{ cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
	);
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);

	const output = `${result.stdout}\n${result.stderr}`;
	const stateMatch = output.match(
		/([0-9,]+) states generated, ([0-9,]+) distinct states found/u,
	);
	const depthMatch = output.match(
		/[Tt]he depth of (?:the complete state graph search is )?([0-9,]+)/u,
	);
	const summary = {
		status:
			result.status === 0
				? "BOUNDED_MODEL_CHECK_PASSED"
				: "BOUNDED_MODEL_CHECK_FAILED",
		verified: result.status === 0,
		coverage: {
			commands: 4,
			maximumCatchUpChapters: 2,
			maximumFencingToken: 3,
			maximumRevisions: 4,
		},
		distinctStates:
			stateMatch === null ? null : Number(stateMatch[2].replaceAll(",", "")),
		generatedStates:
			stateMatch === null ? null : Number(stateMatch[1].replaceAll(",", "")),
		searchDepth: depthMatch === null ? null : Number(depthMatch[1]),
		invariants: [
			"TypeInvariant",
			"AtomicGenesis",
			"LedgerHeadAgreement",
			"CatchUpProgress",
			"CrashPreservesDurableShape",
		],
		tool: { java, jar, jarSha256, expectedVersion: TLC_VERSION },
	};
	process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
	process.exit(result.status ?? 1);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) await run();
