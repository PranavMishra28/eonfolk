import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { TREATMENT_SNAPSHOT } from "../../../../../../tests/prototypes/gate-0/product/contract.ts";
import {
	GATE0_ANCHORS,
	GATE0_ASSIGNMENTS,
	GATE0_OPERATIONAL_SEED,
	GATE0_OPTION_SETS,
	GATE0_QUESTIONS,
	GATE0_SCRIPT,
	GATE0_TIMERS_MS,
	OPERATOR_FOCUSED_MINUTES_CAP,
} from "../../../../../../tests/prototypes/gate-0/study/contract.ts";
import { gate0OptionOrders } from "../../../../../../tests/prototypes/gate-0/study/prng.ts";
import {
	buildGate0StudyDefinition,
	validateGate0Evidence,
	validateGate0StudyDefinition,
	validateObserverAnswerKey,
} from "../../../../../../tests/prototypes/gate-0/study/validate.ts";
import {
	ANSWER_KEY,
	CHRONICLE_BEAT,
	FIXTURE,
} from "../../../../../../tests/prototypes/gate-0/visual/fixture.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (value) =>
	value === null || typeof value !== "object"
		? JSON.stringify(value)
		: Array.isArray(value)
			? `[${value.map(canonical).join(",")}]`
			: `{${Object.keys(value)
					.sort()
					.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
					.join(",")}}`;
const hashObject = (value) => sha256(Buffer.from(canonical(value)));
const equal = (a, b) => canonical(a) === canonical(b);
const assert = (condition, message) => {
	if (!condition) throw new Error(`gate-0 artifact violation: ${message}`);
};
const dir = new URL("./", import.meta.url);
const readCanonical = async (name) => {
	const raw = await readFile(new URL(name, dir));
	const value = JSON.parse(raw);
	assert(
		raw.equals(Buffer.from(`${canonical(value)}\n`)),
		`${name} is not RFC8785+LF`,
	);
	return { raw, value };
};

export async function validateArtifact() {
	const { value: snapshot } = await readCanonical("snapshot.jcs.json");
	const { value: oracle } = await readCanonical("observable-gate.jcs.json");
	assert(
		snapshot.schemaVersion === "eonfolk-gate0-snapshot-v1" &&
			snapshot.gateId === "gate-0",
		"snapshot identity",
	);
	assert(
		validateGate0StudyDefinition(snapshot.studyDefinition).ok &&
			equal(snapshot.studyDefinition, buildGate0StudyDefinition()),
		"study definition",
	);
	assert(
		validateObserverAnswerKey(snapshot.answerKey).ok &&
			equal(snapshot.answerKey, ANSWER_KEY),
		"answer key",
	);
	assert(
		equal(snapshot.treatmentSnapshot, TREATMENT_SNAPSHOT),
		"treatment snapshot",
	);
	assert(equal(snapshot.visualFixture, FIXTURE), "visual fixture");
	assert(
		snapshot.laborAdmission.recordedNonOperatorSeconds +
			snapshot.laborAdmission.openOperatorReservationSeconds +
			snapshot.laborAdmission.protectedMappedHighSeconds <=
			snapshot.laborAdmission.mappedBudgetSeconds,
		"labor admission",
	);
	const inputs = snapshot.oracleInputs;
	assert(
		equal(inputs.optionOrders, gate0OptionOrders(GATE0_OPERATIONAL_SEED)),
		"option orders",
	);
	assert(
		equal(inputs.optionSets, GATE0_OPTION_SETS) &&
			equal(inputs.script, GATE0_SCRIPT) &&
			equal(inputs.questions, GATE0_QUESTIONS) &&
			equal(inputs.anchors, GATE0_ANCHORS) &&
			equal(inputs.timers, GATE0_TIMERS_MS),
		"instrument inputs",
	);
	const viewportPngHashes = {};
	for (const id of ["desktop-1728x1117", "laptop-1366x768", "mobile-390x844"])
		viewportPngHashes[id] = sha256(
			await readFile(new URL(`viewports/${id}.png`, dir)),
		);
	const expected = {
		acceptedTreatmentHash: hashObject(inputs.acceptedTreatment),
		acceptedTreatmentId: "H",
		anchorsHash: hashObject(inputs.anchors),
		chronicleHash: hashObject(CHRONICLE_BEAT),
		comparisonContractHash: hashObject(inputs.comparisonContract),
		eventIntervalHash: null,
		fixtureHash: hashObject(inputs.fixture),
		gateId: "gate-0",
		logicalTimelineHash: hashObject(inputs.logicalTimeline),
		optionOrdersHash: hashObject(inputs.optionOrders),
		optionSetsHash: hashObject(inputs.optionSets),
		questionsHash: hashObject(inputs.questions),
		readyPredicateHash: hashObject(inputs.readyPredicate),
		receiptHash: null,
		rendererMode: "pixi-semantic",
		responseSurfaceHash: hashObject(inputs.responseSurface),
		routeId: "gate-0-combined-study",
		routeParams: {
			observer: { capture: "1", fixtureId: "gate0-visual-v1", studyId: "V01" },
			product: { studyId: "P01" },
		},
		schemaVersion: "eonfolk-observable-gate-v1",
		scriptHash: hashObject(inputs.script),
		semanticDomHash: hashObject(inputs.semanticDom),
		stateHash: hashObject(FIXTURE.region),
		storyCardHash: null,
		timersHash: hashObject(inputs.timers),
		viewportPngHashes,
	};
	assert(equal(oracle, expected), "observable oracle");
	return {
		snapshotHash: sha256(await readFile(new URL("snapshot.jcs.json", dir))),
		observableGateHash: sha256(
			await readFile(new URL("observable-gate.jcs.json", dir)),
		),
		assignments: GATE0_ASSIGNMENTS.length,
		operatorFocusedMinutesCap: OPERATOR_FOCUSED_MINUTES_CAP,
	};
}

export async function validateEvidence(path, studyCommit, manifestHash) {
	const result = validateGate0Evidence(await readFile(path), {
		studyCommit,
		manifestHash,
	});
	assert(result.ok, result.errors.join("; "));
	return result;
}

if (process.argv[1] === new URL(import.meta.url).pathname)
	process.stdout.write(`${JSON.stringify(await validateArtifact())}\n`);
