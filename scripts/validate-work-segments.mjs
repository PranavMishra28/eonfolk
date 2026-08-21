import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const PLAN_BASE = "f0ec6a1e34a74d117de84c094286ec703ca7f15f";
const path = new URL(
	"../docs/exec-plans/evidence/001/work-segments.jsonl",
	import.meta.url,
);
const expectedKeys = [
	"evidenceRef",
	"localOrdinal",
	"ownerId",
	"ownerKind",
	"productiveSeconds",
	"schemaVersion",
	"segmentId",
	"taskId",
];

function digest(input) {
	return createHash("sha256").update(input, "utf8").digest("hex");
}

function assert(condition, message) {
	if (!condition) throw new Error(`work segment violation: ${message}`);
}

const raw = await readFile(path, "utf8");
assert(raw.endsWith("\n"), "file must end with LF");
const lines = raw.slice(0, -1).split("\n");
assert(lines.length > 0 && lines.every(Boolean), "blank lines are not allowed");
const unique = new Map();

for (const [index, line] of lines.entries()) {
	const record = JSON.parse(line);
	const keys = Object.keys(record).sort();
	assert(
		JSON.stringify(keys) === JSON.stringify(expectedKeys),
		`line ${index + 1} has open shape`,
	);
	assert(
		record.schemaVersion === "eonfolk-work-segment-v1",
		`line ${index + 1} schema`,
	);
	assert(
		["coordinator", "child", "reviewer", "operator"].includes(record.ownerKind),
		`line ${index + 1} ownerKind`,
	);
	assert(
		typeof record.ownerId === "string" &&
			record.ownerId === record.ownerId.normalize("NFC"),
		`line ${index + 1} ownerId`,
	);
	assert(
		/^T(?:0[1-9]|1[0-8])$/.test(record.taskId),
		`line ${index + 1} taskId`,
	);
	assert(
		Number.isInteger(record.localOrdinal) && record.localOrdinal > 0,
		`line ${index + 1} localOrdinal`,
	);
	assert(
		Number.isInteger(record.productiveSeconds) && record.productiveSeconds >= 0,
		`line ${index + 1} productiveSeconds`,
	);
	assert(
		typeof record.evidenceRef === "string" &&
			record.evidenceRef === record.evidenceRef.normalize("NFC"),
		`line ${index + 1} evidenceRef`,
	);
	const expectedId = digest(
		`EONFOLK-WORK-v1\n${PLAN_BASE}\n${record.ownerId}\n${record.localOrdinal}`,
	);
	assert(record.segmentId === expectedId, `line ${index + 1} segmentId`);
	const canonical = JSON.stringify(record, Object.keys(record).sort());
	assert(line === canonical, `line ${index + 1} is not canonical JSON`);
	const prior = unique.get(record.segmentId);
	assert(
		prior === undefined || prior === line,
		`line ${index + 1} conflicting duplicate`,
	);
	unique.set(record.segmentId, line);
}

const seconds = [...unique.values()].reduce(
	(sum, line) => sum + JSON.parse(line).productiveSeconds,
	0,
);
assert(seconds <= 216_000, "global 60-hour ceiling exceeded");
process.stdout.write(
	`work segments valid: ${unique.size} unique, ${seconds} seconds\n`,
);
