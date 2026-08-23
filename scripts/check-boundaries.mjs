import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = process.cwd();

async function filesBelow(directory) {
	const absolute = resolve(root, directory);
	const output = [];
	let entries;
	try {
		entries = await readdir(absolute, { withFileTypes: true });
	} catch (error) {
		if (error?.code === "ENOENT") return output;
		throw error;
	}
	for (const entry of entries) {
		const path = resolve(absolute, entry.name);
		if (entry.isDirectory())
			output.push(...(await filesBelow(relative(root, path))));
		else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) output.push(path);
	}
	return output;
}

const rules = [
	{
		directories: ["packages/protocol", "packages/sim"],
		patterns: [
			[
				/from\s+["'](?:react|react-dom|pixi\.js|motion|@base-ui)/,
				"presentation dependency",
			],
			[
				/from\s+["'][^"']*(?:persistence|apps\/web)/,
				"application/persistence dependency",
			],
			[/\bDate\.now\s*\(/, "wall-clock authority"],
			[/\bMath\.random\s*\(/, "ambient randomness"],
			[
				/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
				"network authority",
			],
		],
	},
	{
		directories: ["packages/cognition"],
		patterns: [
			[
				/from\s+["'](?:openai|@anthropic-ai|ollama|@huggingface)/,
				"provider SDK",
			],
			[
				/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
				"network authority",
			],
			[
				/\b(?:child_process|node:fs|node:net|node:http|node:https)\b/,
				"host authority",
			],
		],
	},
	{
		directories: ["packages/diagnostics"],
		patterns: [
			[
				/from\s+["'][^"']*(?:packages\/(?:sim|cognition|persistence)|apps\/web|@eonfolk\/(?:sim|cognition|persistence))/,
				"world/application authority",
			],
			[
				/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
				"network authority",
			],
			[
				/\b(?:child_process|node:fs|node:net|node:http|node:https)\b/,
				"host authority",
			],
			[/\bDate\.now\s*\(/, "ambient wall clock"],
		],
	},
	{
		directories: ["packages/world-presentation"],
		patterns: [
			[
				/from\s+["'](?:react|react-dom|pixi\.js|playcanvas|@playcanvas)/,
				"renderer dependency",
			],
			[
				/from\s+["'][^"']*(?:apps\/web|persistence|cognition)/,
				"application authority",
			],
			[
				/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
				"network authority",
			],
			[/\bDate\.now\s*\(/, "ambient wall clock"],
			[/\bMath\.random\s*\(/, "ambient randomness"],
		],
	},
	{
		directories: ["packages/worldgen"],
		patterns: [
			[
				/from\s+["'](?:react|react-dom|pixi\.js|playcanvas|@playcanvas|motion|@base-ui)/,
				"presentation dependency",
			],
			[
				/from\s+["'][^"']*(?:apps\/web|sim|persistence|cognition|diagnostics)/,
				"runtime authority dependency",
			],
			[/\bDate\.now\s*\(/, "wall-clock authority"],
			[/\bMath\.random\s*\(/, "ambient randomness"],
			[
				/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
				"network authority",
			],
		],
	},
];

const failures = [];
for (const rule of rules) {
	for (const directory of rule.directories) {
		for (const file of await filesBelow(directory)) {
			const source = await readFile(file, "utf8");
			for (const [pattern, label] of rule.patterns) {
				if (pattern.test(source))
					failures.push(`${relative(root, file)}: ${label}`);
			}
		}
	}
}

if (failures.length > 0) {
	process.stderr.write(`${failures.join("\n")}\n`);
	process.exitCode = 1;
} else {
	process.stdout.write("architecture boundaries ok\n");
}
