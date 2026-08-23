import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projects = [
	"tsconfig.gate0.json",
	"packages/protocol/tsconfig.json",
	"packages/sim/tsconfig.json",
	"packages/cognition/tsconfig.json",
	"packages/persistence/tsconfig.json",
	"packages/observatory/tsconfig.json",
	"packages/diagnostics/tsconfig.json",
	"packages/world-presentation/tsconfig.json",
	"packages/worldgen/tsconfig.json",
	"packages/civilization/tsconfig.json",
	"tests/unit/systems/tsconfig.json",
	"tests/unit/civilization/tsconfig.json",
	"tests/unit/persistence/tsconfig.json",
	"tests/unit/observatory/tsconfig.json",
	"tests/unit/diagnostics/tsconfig.json",
	"tests/unit/world-presentation/tsconfig.json",
	"tests/unit/worldgen/tsconfig.json",
	"tests/property/worldgen/tsconfig.json",
	"tests/property/civilization/tsconfig.json",
	"tests/property/cognition/tsconfig.json",
	"tests/manual/tsconfig.json",
	"apps/web/tsconfig.json",
];

const tsc = resolve(process.cwd(), "node_modules/.bin/tsc");
for (const project of projects) {
	const result = spawnSync(tsc, ["-p", project, "--noEmit"], {
		cwd: process.cwd(),
		encoding: "utf8",
	});
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	if (result.status !== 0) process.exit(result.status ?? 1);
}
process.stdout.write(`typecheck ok: ${projects.length} project graphs\n`);
