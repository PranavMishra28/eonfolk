import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_FIELDS = Object.freeze(["title", "year", "url"]);
const unfinished = /\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b/iu;

function parseEntries(source) {
	const entries = [];
	let cursor = 0;
	while (cursor < source.length) {
		const start = source.indexOf("@", cursor);
		if (start < 0) break;
		const header = /^@([a-z]+)\{([^,\s]+),/iu.exec(source.slice(start));
		if (header === null)
			throw new Error(`invalid BibTeX entry near byte ${start}`);
		let depth = 0;
		let end = -1;
		for (let index = start; index < source.length; index += 1) {
			const character = source[index];
			if (character === "{") depth += 1;
			else if (character === "}") {
				depth -= 1;
				if (depth < 0) throw new Error(`unbalanced brace near byte ${index}`);
				if (depth === 0) {
					end = index + 1;
					break;
				}
			}
		}
		if (end < 0) throw new Error(`unterminated BibTeX entry ${header[2]}`);
		entries.push(
			Object.freeze({
				type: header[1].toLowerCase(),
				key: header[2],
				body: source.slice(start, end),
			}),
		);
		cursor = end;
	}
	return entries;
}

function declaredKeys(researchSource) {
	const match = /<!--\s*bibliography-keys:\s*([^>]+?)\s*-->/u.exec(
		researchSource,
	);
	if (match === null)
		throw new Error("docs/RESEARCH.md lacks bibliography-keys");
	return match[1]
		.split(/\s+/u)
		.map((value) => value.trim())
		.filter(Boolean);
}

export function validateBibliography(source, researchSource) {
	if (unfinished.test(source))
		throw new Error("references.bib contains an unfinished-work marker");
	const entries = parseEntries(source);
	if (entries.length === 0) throw new Error("references.bib is empty");
	const keys = new Set();
	for (const entry of entries) {
		if (keys.has(entry.key))
			throw new Error(`duplicate BibTeX key ${entry.key}`);
		keys.add(entry.key);
		for (const field of REQUIRED_FIELDS) {
			const pattern = new RegExp(`^\\s*${field}\\s*=`, "imu");
			if (!pattern.test(entry.body))
				throw new Error(`${entry.key} lacks required field ${field}`);
		}
		if (entry.type === "online" && !/^\s*urldate\s*=/imu.test(entry.body))
			throw new Error(`${entry.key} lacks required online field urldate`);
	}
	const required = declaredKeys(researchSource);
	for (const key of required)
		if (!keys.has(key))
			throw new Error(`docs/RESEARCH.md references missing BibTeX key ${key}`);
	return Object.freeze({ entries: entries.length, required: required.length });
}

async function main() {
	const [source, researchSource] = await Promise.all([
		readFile(resolve("references.bib"), "utf8"),
		readFile(resolve("docs/RESEARCH.md"), "utf8"),
	]);
	const result = validateBibliography(source, researchSource);
	process.stdout.write(
		`bibliography ok: ${result.entries} entries, ${result.required} research-spine keys\n`,
	);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""))
	await main();
