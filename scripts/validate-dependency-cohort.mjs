import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const frozenDir = new URL("../docs/research/dependency-cohort/", import.meta.url);
const frozenPackageUrl = new URL("package.json.txt", frozenDir);
const frozenLockUrl = new URL("pnpm-lock.yaml.txt", frozenDir);
const ledgerUrl = new URL("licenses.jcs.json", frozenDir);
const rootPackageUrl = new URL("../package.json", import.meta.url);
const rootLockUrl = new URL("../pnpm-lock.yaml", import.meta.url);

const EXPECTED = Object.freeze({
  package: "0592b0e14c95a31b15525970725f626148b3d4c6ba373ba70029bca784100e37",
  lock: "27272cdfbb3410698469edd9bfa3af39ce4f5bb77942671440bd486f1975be74",
  ledger: "19872aa10aed85c959d35349eac424bf267e3ef8be07675c1d5c7ff89dbf28a2",
  packageCount: 195,
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
  if (start < 0 || end < 0 || end <= start) fail("lockfile package map is not closed");
  return lockText.slice(start, end + 1);
}

function parseLockPackages(section) {
  const entries = new Map();
  let currentKey;
  for (const line of section.split("\n")) {
    const heading = line.match(/^  (\S.*):$/);
    if (heading) {
      currentKey = heading[1];
      if (currentKey.startsWith("'") && currentKey.endsWith("'")) {
        currentKey = currentKey.slice(1, -1).replaceAll("''", "'");
      }
      if (entries.has(currentKey)) fail(`duplicate package key ${currentKey}`);
      entries.set(currentKey, { integrity: undefined });
      continue;
    }
    const resolution = line.match(/^    resolution: \{integrity: ([^}]+)\}$/);
    if (resolution && currentKey) entries.get(currentKey).integrity = resolution[1];
  }
  return entries;
}

function keyFor(name, version) {
  return `${name}@${version}`;
}

const [frozenPackageBytes, frozenLockBytes, ledgerBytes, rootPackageBytes, rootLockBytes] =
  await Promise.all([
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
  if (JSON.stringify(rootPackage[field]) !== JSON.stringify(frozenPackage[field])) {
    fail(`${field} differs from the approved manifest`);
  }
}
if (rootPackage.packageManager !== frozenPackage.packageManager) {
  fail(`packageManager must remain ${frozenPackage.packageManager}`);
}

const frozenSection = packageSection(frozenLockBytes.toString("utf8"));
const rootSection = packageSection(rootLockBytes.toString("utf8"));
if (rootSection !== frozenSection) fail("external lockfile packages map differs from frozen cohort");

const lockPackages = parseLockPackages(rootSection);
const ledger = JSON.parse(ledgerBytes);
if (ledger.schemaVersion !== "eonfolk-dependency-cohort-v1") fail("unknown ledger schema");
if (ledger.registry !== "https://registry.npmjs.org") fail("unexpected package registry");
if (ledger.packages.length !== EXPECTED.packageCount) fail("canonical ledger package count changed");
if (lockPackages.size !== EXPECTED.packageCount) fail("external lock package key set changed");

const seen = new Set();
for (const record of ledger.packages) {
  const key = keyFor(record.name, record.version);
  if (seen.has(key)) fail(`duplicate ledger record ${key}`);
  seen.add(key);
  const locked = lockPackages.get(key);
  if (!locked) fail(`ledger package missing from lockfile: ${key}`);
  if (locked.integrity !== record.integrity) fail(`integrity mismatch for ${key}`);
  if (typeof record.license !== "string" || record.license.length === 0) {
    fail(`missing canonical license for ${key}`);
  }
  const scripts = Object.entries(record.lifecycleScripts ?? {});
  const expectedLifecycle = record.name === "fsevents" && ["2.3.2", "2.3.3"].includes(record.version);
  if (expectedLifecycle) {
    if (scripts.length !== 1 || scripts[0][0] !== "install" || scripts[0][1] !== "node-gyp rebuild") {
      fail(`unexpected approved lifecycle metadata for ${key}`);
    }
  } else if (scripts.length !== 0) {
    fail(`unapproved lifecycle script for ${key}`);
  }
}

for (const key of lockPackages.keys()) {
  if (!seen.has(key)) fail(`lockfile package missing from ledger: ${key}`);
}

process.stdout.write(`dependency cohort valid: ${lockPackages.size} packages, no drift\n`);
