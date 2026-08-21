import { createHash } from "node:crypto";
import { lstat, readdir, readFile, readlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const ROOT =
	"/Users/pranav/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app";
const LAUNCHER = join(ROOT, "Contents/MacOS/Google Chrome for Testing");
const FRAMEWORK = join(
	ROOT,
	"Contents/Frameworks/Google Chrome for Testing Framework.framework/Versions/151.0.7922.34/Google Chrome for Testing Framework",
);
const EXPECTED = Object.freeze({
	manifestBytes: 62_239,
	manifestHash:
		"25995bc88bf20b6de47b46eb3571b250989846a797c0b8924b8794627b6175fc",
	files: 326,
	links: 5,
	totalBytes: 372_002_382,
	launcherHash:
		"a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
	frameworkBytes: 237_813_488,
	frameworkHash:
		"269114cf695f1c50b54e0816a1442e41dc468d28672e2dedc2036105fb5a8dbe",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (message) => {
	throw new Error(`browser cohort violation: ${message}`);
};
const safe = (value) =>
	!/[\t\n\r]/.test(value) && !value.split("/").includes("..");
const mode = (stat) => (stat.mode & 0o7777).toString(8).padStart(4, "0");

const entries = [];
async function walk(path) {
	for (const name of await readdir(path)) {
		const absolute = join(path, name);
		const stat = await lstat(absolute);
		const rel = relative(ROOT, absolute).split(sep).join("/");
		if (!safe(rel)) fail(`unsafe relative path ${rel}`);
		if (stat.isDirectory()) await walk(absolute);
		else if (stat.isFile()) entries.push({ kind: "F", absolute, rel, stat });
		else if (stat.isSymbolicLink()) {
			const target = await readlink(absolute);
			if (!safe(target)) fail(`unsafe symlink target ${rel}`);
			entries.push({ kind: "L", absolute, rel, stat, target });
		} else fail(`unsupported object ${rel}`);
	}
}

await walk(ROOT);
entries.sort((a, b) => Buffer.compare(Buffer.from(a.rel), Buffer.from(b.rel)));
let files = 0;
let links = 0;
let totalBytes = 0;
const lines = [];
for (const entry of entries) {
	if (entry.kind === "F") {
		const bytes = await readFile(entry.absolute);
		files += 1;
		totalBytes += bytes.byteLength;
		lines.push(
			`F\t${entry.rel}\t${mode(entry.stat)}\t${bytes.byteLength}\t${sha256(bytes)}\n`,
		);
	} else {
		links += 1;
		lines.push(`L\t${entry.rel}\t${mode(entry.stat)}\t${entry.target}\n`);
	}
}
const manifest = Buffer.from(lines.join(""));
const launcher = await readFile(LAUNCHER);
const framework = await readFile(FRAMEWORK);
const actual = {
	manifestBytes: manifest.byteLength,
	manifestHash: sha256(manifest),
	files,
	links,
	totalBytes,
	launcherHash: sha256(launcher),
	frameworkBytes: framework.byteLength,
	frameworkHash: sha256(framework),
};
for (const [key, value] of Object.entries(EXPECTED))
	if (actual[key] !== value) fail(`${key} ${actual[key]} != ${value}`);
process.stdout.write(
	`browser cohort valid: ${files} files, ${links} links, ${totalBytes} bytes\n`,
);
