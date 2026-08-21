import { readFile, readdir, stat } from "node:fs/promises";
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
	process.stderr.write("apps/web/dist is missing; run the production build first\n");
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

const isCode = (row) => [".html", ".css", ".js", ".mjs"].includes(extname(row.path));
const isRenderer = (row) => /(?:pixi|renderer|world)[-._]/i.test(row.path);
const sum = (values, key) => values.reduce((total, value) => total + value[key], 0);
const javascript = rows.filter((row) => [".js", ".mjs"].includes(extname(row.path)));
const critical = rows.filter((row) => isCode(row) && !isRenderer(row));
const assets = rows.filter((row) => !isCode(row) && !row.path.endsWith(".map"));

const result = {
	schemaVersion: "eonfolk-bundle-measurement-v1",
	criticalShellGzip: sum(critical, "gzipBytes"),
	totalJavaScriptGzip: sum(javascript, "gzipBytes"),
	worldAssetRawBytes: sum(assets, "rawBytes"),
	limits,
	files: rows,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

const failures = [];
if (result.criticalShellGzip > limits.criticalShellGzip) failures.push("critical shell gzip");
if (result.totalJavaScriptGzip > limits.totalJavaScriptGzip) failures.push("total JavaScript gzip");
if (result.worldAssetRawBytes > limits.worldAssetsMobile) failures.push("mobile world assets");

if (failures.length > 0) {
	process.stderr.write(`bundle budget failed: ${failures.join(", ")}\n`);
	process.exitCode = 1;
}
