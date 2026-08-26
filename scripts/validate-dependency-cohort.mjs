import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const frozenDir = new URL(
	"../docs/research/dependency-cohort/",
	import.meta.url,
);
const frozenPackageUrl = new URL("package.json.txt", frozenDir);
const frozenLockUrl = new URL("pnpm-lock.yaml.txt", frozenDir);
const ledgerUrl = new URL("licenses.jcs.json", frozenDir);
const rootPackageUrl = new URL("../package.json", import.meta.url);
const rootLockUrl = new URL("../pnpm-lock.yaml", import.meta.url);

const EXPECTED = Object.freeze({
	package: "32c813843cfed796fc3526e322acdefb7d35c0e013e50cd5cbba4e2a15764196",
	lock: "dec8e86d7ca019df1343633f70e4ed93dc219b29a80e918b1e4228a59ccc8c01",
	ledger: "1bedbaa5a7af5bf542f551c1925c76b2cb8f698b5ceba255ea0f526608a53ba1",
	packageCount: 224,
});

function fail(message) {
	throw new Error(`dependency cohort violation: ${message}`);
}

function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

function assertDigest(label, bytes, expected) {
	const actual = sha256(bytes);
	if (actual !== expected) fail(`${label} digest ${actual} != ${expected}`);
}

function packageSection(lockText) {
	const start = lockText.indexOf("packages:\n");
	const end = lockText.indexOf("\nsnapshots:\n");
	if (start < 0 || end < 0 || end <= start)
		fail("lockfile package map is not closed");
	return lockText.slice(start, end + 1);
}

function parseLockPackages(section) {
	const entries = new Map();
	let currentKey;
	for (const line of section.split("\n")) {
		const heading = line.match(/^ {2}(\S.*):$/);
		if (heading) {
			currentKey = heading[1];
			if (currentKey.startsWith("'") && currentKey.endsWith("'")) {
				currentKey = currentKey.slice(1, -1).replaceAll("''", "'");
			}
			if (entries.has(currentKey)) fail(`duplicate package key ${currentKey}`);
			entries.set(currentKey, { integrity: undefined });
			continue;
		}
		const resolution = line.match(/^ {4}resolution: \{integrity: ([^}]+)\}$/);
		if (resolution && currentKey)
			entries.get(currentKey).integrity = resolution[1];
	}
	return entries;
}

function keyFor(name, version) {
	return `${name}@${version}`;
}

const [
	frozenPackageBytes,
	frozenLockBytes,
	ledgerBytes,
	rootPackageBytes,
	rootLockBytes,
] = await Promise.all([
	readFile(frozenPackageUrl),
	readFile(frozenLockUrl),
	readFile(ledgerUrl),
	readFile(rootPackageUrl),
	readFile(rootLockUrl),
]);

assertDigest("frozen package manifest", frozenPackageBytes, EXPECTED.package);
assertDigest("frozen lockfile", frozenLockBytes, EXPECTED.lock);
assertDigest("canonical license ledger", ledgerBytes, EXPECTED.ledger);

const frozenPackage = JSON.parse(frozenPackageBytes);
const rootPackage = JSON.parse(rootPackageBytes);
for (const field of ["dependencies", "devDependencies"]) {
	if (
		JSON.stringify(rootPackage[field]) !== JSON.stringify(frozenPackage[field])
	) {
		fail(`${field} differs from the approved manifest`);
	}
}
if (rootPackage.packageManager !== frozenPackage.packageManager) {
	fail(`packageManager must remain ${frozenPackage.packageManager}`);
}

const frozenSection = packageSection(frozenLockBytes.toString("utf8"));
const rootSection = packageSection(rootLockBytes.toString("utf8"));
if (rootSection !== frozenSection)
	fail("external lockfile packages map differs from frozen cohort");

const lockPackages = parseLockPackages(rootSection);
const ledger = JSON.parse(ledgerBytes);
if (ledger.schemaVersion !== "eonfolk-dependency-cohort-v1")
	fail("unknown ledger schema");
if (ledger.registry !== "https://registry.npmjs.org")
	fail("unexpected package registry");
if (ledger.packages.length !== EXPECTED.packageCount)
	fail("canonical ledger package count changed");
if (lockPackages.size !== EXPECTED.packageCount)
	fail("external lock package key set changed");

const seen = new Set();
for (const record of ledger.packages) {
	const key = keyFor(record.name, record.version);
	if (seen.has(key)) fail(`duplicate ledger record ${key}`);
	seen.add(key);
	const locked = lockPackages.get(key);
	if (!locked) fail(`ledger package missing from lockfile: ${key}`);
	if (locked.integrity !== record.integrity)
		fail(`integrity mismatch for ${key}`);
	if (typeof record.license !== "string" || record.license.length === 0) {
		fail(`missing canonical license for ${key}`);
	}
	const scripts = Object.entries(record.lifecycleScripts ?? {});
	const expectedLifecycle =
		record.name === "fsevents" && ["2.3.2", "2.3.3"].includes(record.version);
	if (expectedLifecycle) {
		if (
			scripts.length !== 1 ||
			scripts[0][0] !== "install" ||
			scripts[0][1] !== "node-gyp rebuild"
		) {
			fail(`unexpected approved lifecycle metadata for ${key}`);
		}
	} else if (scripts.length !== 0) {
		fail(`unapproved lifecycle script for ${key}`);
	}
}

for (const key of lockPackages.keys()) {
	if (!seen.has(key)) fail(`lockfile package missing from ledger: ${key}`);
}

process.stdout.write(
	`dependency cohort valid: ${lockPackages.size} packages, no drift\n`,
);
