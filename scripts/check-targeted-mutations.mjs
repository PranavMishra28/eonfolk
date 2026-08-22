import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const mutants = [
	{
		name: "diagnostic field allowlist bypass",
		file: "packages/diagnostics/src/redaction.ts",
		from: "if (forbiddenKey.test(key) || !allowedKeys.has(key)) continue;",
		to: "if (false) continue;",
		tests: ["tests/unit/diagnostics", "apps/web/src/diagnostics.test.ts"],
	},
	{
		name: "diagnostic unsafe-value bypass",
		file: "packages/diagnostics/src/redaction.ts",
		from: "safeValue.test(normalized) && !forbiddenValue.test(normalized)",
		to: "safeValue.test(normalized)",
		tests: ["tests/unit/diagnostics"],
	},
	{
		name: "Sentinel skips Reality protection",
		file: "packages/diagnostics/src/sentinel.ts",
		from: "await this.#protectReality();",
		to: "void this.#protectReality;",
		tests: ["tests/unit/diagnostics", "apps/web/src/diagnostics.test.ts"],
	},
	{
		name: "feedback relay bypasses exact Origin authorization",
		file: "apps/feedback-worker/src/worker.ts",
		from: "if (origin === null || !settings.allowedOrigins.has(origin))",
		to: "if (false)",
		tests: ["tests/unit/feedback-worker/worker.test.ts"],
	},
	{
		name: "feedback relay accepts diagnostics without consent",
		file: "apps/feedback-worker/src/schema.ts",
		from: "value.diagnostics !== undefined && value.diagnosticsConsent !== true",
		to: "false",
		tests: ["tests/unit/feedback-worker/worker.test.ts"],
	},
	{
		name: "visibility default allows unknown reads",
		file: "packages/protocol/src/visibility.ts",
		from: '\n\treturn "deny";\n}',
		to: '\n\treturn "allow";\n}',
		fromLast: true,
		tests: ["tests/unit/systems/visibility.test.ts"],
	},
	{
		name: "persistence accepts an empty event interval",
		file: "packages/persistence/src/validation.ts",
		from: "receipt.fromSequenceInclusive >= receipt.toSequenceExclusive",
		to: "receipt.fromSequenceInclusive > receipt.toSequenceExclusive",
		tests: ["tests/unit/persistence"],
	},
	{
		name: "simulation ignores resource conservation",
		file: "packages/sim/src/invariants.ts",
		from: "if (conserved !== state.conservation.baseline[resource])",
		to: "if (false)",
		tests: ["tests/unit/systems/properties.test.ts"],
	},
];

function targetIsClean(file) {
	const result = spawnSync("git", ["diff", "--quiet", "--", file], {
		cwd: root,
		stdio: "ignore",
	});
	return result.status === 0;
}

for (const mutant of mutants) {
	if (!targetIsClean(mutant.file)) {
		throw new Error(
			`refusing to mutate a locally changed target: ${mutant.file}`,
		);
	}
}

const killed = [];
for (const mutant of mutants) {
	const path = resolve(root, mutant.file);
	const original = readFileSync(path, "utf8");
	const index = mutant.fromLast
		? original.lastIndexOf(mutant.from)
		: original.indexOf(mutant.from);
	if (index < 0) throw new Error(`mutation anchor missing: ${mutant.name}`);
	const second = original.indexOf(mutant.from, index + mutant.from.length);
	if (!mutant.fromLast && second >= 0)
		throw new Error(`mutation anchor is ambiguous: ${mutant.name}`);
	const changed = `${original.slice(0, index)}${mutant.to}${original.slice(index + mutant.from.length)}`;
	try {
		writeFileSync(path, changed);
		const result = spawnSync(
			"pnpm",
			["exec", "vitest", "run", ...mutant.tests, "--reporter=dot"],
			{ cwd: root, encoding: "utf8" },
		);
		if (result.status === 0) {
			throw new Error(`SURVIVED: ${mutant.name}`);
		}
		killed.push(mutant.name);
	} finally {
		writeFileSync(path, original);
	}
}

execFileSync(
	"pnpm",
	[
		"exec",
		"vitest",
		"run",
		"tests/unit/diagnostics",
		"tests/unit/feedback-worker",
		"tests/unit/systems/visibility.test.ts",
		"tests/unit/persistence",
		"tests/unit/systems/properties.test.ts",
		"apps/web/src/diagnostics.test.ts",
		"--reporter=dot",
	],
	{ cwd: root, stdio: "inherit" },
);

console.log(
	`targeted mutation gate passed: ${killed.length}/${mutants.length} killed`,
);
for (const name of killed) console.log(`- KILLED: ${name}`);
