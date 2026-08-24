import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

const root = process.cwd();

async function markdownFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if ([".git", "node_modules", "dist", "tmp"].includes(entry.name)) continue;
		const path = resolve(directory, entry.name);
		if (relative(root, path).startsWith("config/public")) continue;
		if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
		else if (entry.isFile() && extname(entry.name) === ".md") files.push(path);
	}
	return files;
}

function slug(text) {
	return text
		.trim()
		.toLowerCase()
		.replace(/[`*_~]/g, "")
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.replace(/\s/g, "-");
}

const files = await markdownFiles(root);
const headingCache = new Map();

async function headings(file) {
	if (headingCache.has(file)) return headingCache.get(file);
	const source = await readFile(file, "utf8");
	const counts = new Map();
	const values = new Set();
	for (const line of source.split("\n")) {
		const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
		if (!match) continue;
		const base = slug(match[2]);
		const count = counts.get(base) ?? 0;
		values.add(count === 0 ? base : `${base}-${count}`);
		counts.set(base, count + 1);
	}
	headingCache.set(file, values);
	return values;
}

const failures = [];
let checked = 0;
for (const file of files) {
	const source = await readFile(file, "utf8");
	for (const match of source.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
		let target = match[1].trim();
		if (target.startsWith("<") && target.endsWith(">"))
			target = target.slice(1, -1);
		if (/^(?:https?:|mailto:|#)/.test(target)) continue;
		const [rawPath, rawAnchor] = target.split("#", 2);
		const path = resolve(dirname(file), decodeURIComponent(rawPath));
		try {
			await access(path);
		} catch {
			failures.push(`${relative(root, file)}: missing ${target}`);
			continue;
		}
		checked += 1;
		if (rawAnchor && extname(path) === ".md") {
			const available = await headings(path);
			if (!available.has(decodeURIComponent(rawAnchor).toLowerCase())) {
				failures.push(`${relative(root, file)}: missing anchor ${target}`);
			}
		}
	}
}

if (failures.length > 0) {
	process.stderr.write(`${failures.join("\n")}\n`);
	process.exitCode = 1;
} else {
	process.stdout.write(
		`documentation links ok: ${files.length} files, ${checked} local links\n`,
	);
}
