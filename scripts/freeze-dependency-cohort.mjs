import { readFile, writeFile } from "node:fs/promises";

const registry = "https://registry.npmjs.org";
const rootPackageUrl = new URL("../package.json", import.meta.url);
const rootLockUrl = new URL("../pnpm-lock.yaml", import.meta.url);
const evidenceDirectory = new URL(
	"../docs/research/dependency-cohort/",
	import.meta.url,
);

function packageSection(lockText) {
	const start = lockText.indexOf("packages:\n");
	const end = lockText.indexOf("\nsnapshots:\n");
	if (start < 0 || end < 0 || end <= start)
		throw new Error("lockfile package map is not closed");
	return lockText.slice(start, end + 1);
}

function parseLockPackages(section) {
	const entries = [];
	let currentKey;
	for (const line of section.split("\n")) {
		const heading = line.match(/^ {2}(\S.*):$/u);
		if (heading) {
			currentKey = heading[1];
			if (currentKey.startsWith("'") && currentKey.endsWith("'"))
				currentKey = currentKey.slice(1, -1).replaceAll("''", "'");
			entries.push({ key: currentKey, integrity: undefined });
			continue;
		}
		const resolution = line.match(/^ {4}resolution: \{integrity: ([^}]+)\}$/u);
		if (resolution && currentKey)
			entries[entries.length - 1].integrity = resolution[1];
	}
	return entries.map((entry) => {
		const separator = entry.key.lastIndexOf("@");
		if (separator <= 0 || entry.integrity === undefined)
			throw new Error(`incomplete lock record ${entry.key}`);
		return {
			...entry,
			name: entry.key.slice(0, separator),
			version: entry.key.slice(separator + 1),
		};
	});
}

function normalizedLicense(value, key) {
	if (typeof value === "string" && value.length > 0) return value;
	if (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string" &&
		value.type.length > 0
	)
		return value.type;
	throw new Error(`package ${key} has no canonical license string`);
}

async function metadataFor(entry) {
	const response = await fetch(
		`${registry}/${encodeURIComponent(entry.name)}/${encodeURIComponent(entry.version)}`,
		{ headers: { accept: "application/json" } },
	);
	if (!response.ok)
		throw new Error(`registry returned ${response.status} for ${entry.key}`);
	const metadata = await response.json();
	if (metadata.dist?.integrity !== entry.integrity)
		throw new Error(`registry integrity mismatch for ${entry.key}`);
	const lifecycleScripts = Object.fromEntries(
		["preinstall", "install", "postinstall"].flatMap((name) =>
			typeof metadata.scripts?.[name] === "string"
				? [[name, metadata.scripts[name]]]
				: [],
		),
	);
	return {
		integrity: entry.integrity,
		license: normalizedLicense(metadata.license, entry.key),
		lifecycleScripts,
		name: entry.name,
		version: entry.version,
	};
}

const [rootPackageText, rootLockText] = await Promise.all([
	readFile(rootPackageUrl, "utf8"),
	readFile(rootLockUrl, "utf8"),
]);
const rootPackage = JSON.parse(rootPackageText);
const frozenPackage = {
	private: rootPackage.private,
	packageManager: rootPackage.packageManager,
	type: rootPackage.type,
	dependencies: rootPackage.dependencies,
	devDependencies: rootPackage.devDependencies,
};
const entries = parseLockPackages(packageSection(rootLockText));
const packages = [];
for (let index = 0; index < entries.length; index += 12) {
	packages.push(
		...(await Promise.all(entries.slice(index, index + 12).map(metadataFor))),
	);
}
packages.sort((left, right) =>
	`${left.name}@${left.version}`.localeCompare(
		`${right.name}@${right.version}`,
	),
);
await Promise.all([
	writeFile(
		new URL("package.json.txt", evidenceDirectory),
		`${JSON.stringify(frozenPackage, null, 2)}\n`,
	),
	writeFile(new URL("pnpm-lock.yaml.txt", evidenceDirectory), rootLockText),
	writeFile(
		new URL("licenses.jcs.json", evidenceDirectory),
		`${JSON.stringify({ packages, registry, schemaVersion: "eonfolk-dependency-cohort-v1" })}\n`,
	),
]);
process.stdout.write(`froze ${packages.length} exact external packages\n`);
