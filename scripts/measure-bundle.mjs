import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve(process.cwd(), "apps/web/dist");
const limits = {
	criticalShellGzip: 200 * 1024,
	totalJavaScriptGzip: 650 * 1024,
	worldAssetsDesktop: 6 * 1024 * 1024,
	worldAssetsMobile: 4 * 1024 * 1024,
};

async function walk(directory) {
	const output = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) output.push(...(await walk(path)));
		else if (entry.isFile()) output.push(path);
	}
	return output;
}

try {
	await stat(dist);
} catch {
	process.stderr.write(
		"apps/web/dist is missing; run the production build first\n",
	);
	process.exit(1);
}

const rows = [];
for (const path of (await walk(dist)).sort()) {
	const bytes = await readFile(path);
	rows.push({
		path: relative(dist, path),
		rawBytes: bytes.byteLength,
		gzipBytes: gzipSync(bytes, { level: 9, mtime: 0 }).byteLength,
	});
}

const manifestPath = resolve(dist, ".vite/manifest.json");
let manifest;
try {
	manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
	process.stderr.write("Vite build manifest is missing or malformed\n");
	process.exit(1);
}

const isCode = (row) =>
	[".html", ".css", ".js", ".mjs"].includes(extname(row.path));
const sum = (values, key) =>
	values.reduce((total, value) => total + value[key], 0);
const javascript = rows.filter((row) =>
	[".js", ".mjs"].includes(extname(row.path)),
);
const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry);
const worldRouteKey = "src/V1GenesisApp.tsx";
if (entryKey === undefined || manifest[worldRouteKey] === undefined) {
	process.stderr.write(
		"Vite manifest does not declare the app and world entries\n",
	);
	process.exit(1);
}

function collectStatic(key, output) {
	if (output.has(key)) return;
	const record = manifest[key];
	if (record === undefined)
		throw new Error(`Vite manifest import ${key} is unresolved`);
	output.add(key);
	for (const imported of record.imports ?? []) collectStatic(imported, output);
}

function collectRoute(key, output) {
	collectStatic(key, output);
	const record = manifest[key];
	for (const imported of record.dynamicImports ?? []) {
		// Player-triggered authority tools are not fetched for initial world display.
		// Keep them lazy without excluding the world renderer or route-owned panels.
		if (imported === "src/generated-sponsor-runtime.ts") continue;
		collectRoute(imported, output);
	}
}

function filesFor(keys) {
	const files = new Set();
	for (const key of keys) {
		const record = manifest[key];
		files.add(record.file);
		for (const css of record.css ?? []) files.add(css);
	}
	return files;
}

const criticalKeys = new Set();
collectStatic(entryKey, criticalKeys);
const criticalFiles = filesFor(criticalKeys);
criticalFiles.add("index.html");
const worldRouteKeys = new Set();
collectRoute(worldRouteKey, worldRouteKeys);
const initialWorldFiles = new Set([
	...criticalFiles,
	...filesFor(worldRouteKeys),
]);
const byPath = new Map(rows.map((row) => [row.path, row]));
const requiredRows = (files, label) =>
	[...files].map((path) => {
		const row = byPath.get(path);
		if (row === undefined) throw new Error(`${label} file ${path} is missing`);
		return row;
	});
const critical = requiredRows(criticalFiles, "critical shell");
const initialWorldJavaScript = requiredRows(
	initialWorldFiles,
	"initial world route",
).filter((row) => [".js", ".mjs"].includes(extname(row.path)));
const assets = rows.filter(
	(row) =>
		!isCode(row) &&
		!row.path.endsWith(".map") &&
		!row.path.startsWith(".vite/"),
);

const result = {
	schemaVersion: "eonfolk-bundle-measurement-v2",
	criticalShellGzip: sum(critical, "gzipBytes"),
	totalJavaScriptGzip: sum(initialWorldJavaScript, "gzipBytes"),
	allBuildJavaScriptGzip: sum(javascript, "gzipBytes"),
	worldAssetRawBytes: sum(assets, "rawBytes"),
	measuredFiles: {
		criticalShell: [...criticalFiles].sort(),
		initialWorldJavaScript: initialWorldJavaScript
			.map(({ path }) => path)
			.sort(),
	},
	limits,
	files: rows,
};

const evidenceDirectory = resolve(process.cwd(), "tmp");
await mkdir(evidenceDirectory, { recursive: true });
await writeFile(
	resolve(evidenceDirectory, "eonfolk-bundle-measurement.json"),
	`${JSON.stringify(result, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

const failures = [];
if (result.criticalShellGzip > limits.criticalShellGzip)
	failures.push("critical shell gzip");
if (result.totalJavaScriptGzip > limits.totalJavaScriptGzip)
	failures.push("total JavaScript gzip");
if (result.worldAssetRawBytes > limits.worldAssetsMobile)
	failures.push("mobile world assets");

if (failures.length > 0) {
	process.stderr.write(`bundle budget failed: ${failures.join(", ")}\n`);
	process.exitCode = 1;
}
