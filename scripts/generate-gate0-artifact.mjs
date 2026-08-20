import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
	TREATMENT_SNAPSHOT,
	TREATMENTS,
	VISIBLE_FIXTURE,
} from "../tests/prototypes/gate-0/product/contract.ts";
import {
	GATE0_ANCHORS,
	GATE0_OPERATIONAL_SEED,
	GATE0_OPTION_SETS,
	GATE0_QUESTIONS,
	GATE0_SCRIPT,
	GATE0_TIMERS_MS,
} from "../tests/prototypes/gate-0/study/contract.ts";
import { gate0OptionOrders } from "../tests/prototypes/gate-0/study/prng.ts";
import { buildGate0StudyDefinition } from "../tests/prototypes/gate-0/study/validate.ts";
import {
	ANSWER_KEY,
	CHRONICLE_BEAT,
	FIXTURE,
} from "../tests/prototypes/gate-0/visual/fixture.mjs";
import {
	LOGICAL_TIMELINE,
	READY_PREDICATE_CONTRACT,
	RESPONSE_SURFACE,
} from "../tests/prototypes/gate-0/visual/oracle-input.mjs";
import { createSemanticTree } from "../tests/prototypes/gate-0/visual/semantic.mjs";

const out = new URL(
	"../docs/exec-plans/evidence/001/studies/gate-0/",
	import.meta.url,
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (value) => {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
		.join(",")}}`;
};
const hashObject = (value) => sha256(Buffer.from(canonical(value)));
const optionOrders = gate0OptionOrders(GATE0_OPERATIONAL_SEED);
const viewportPngHashes = {};
for (const id of ["desktop-1728x1117", "laptop-1366x768", "mobile-390x844"])
	viewportPngHashes[id] = sha256(
		await readFile(new URL(`viewports/${id}.png`, out)),
	);
const productTimeline = Object.freeze([
	{
		atMs: 0,
		kind: "product-ready-origin",
		requires: [
			"three-choices-painted",
			"first-world-state-painted",
			"choices-enabled",
			"choices-focusable",
			"variant-asserted",
		],
	},
	{
		atMs: 90_000,
		kind: "decision-timeout",
		comparison: "input-before-timeout-only",
	},
	{
		offsetFromDecisionMs: 45_000,
		kind: "immediate-lock-and-consequence",
		deliveryLatestMs: 46_000,
	},
	{ offsetFromDecisionMs: 60_000, kind: "replay-start" },
	{ offsetFromDecisionMs: 75_000, kind: "replay-lock" },
	{ offsetFromDecisionMs: 135_000, kind: "neutral-reset-end" },
	{ atMs: 225_000, kind: "fixed-slot-boundary" },
	{
		kind: "v6-endpoint",
		requires: ["slot-boundary", "six-rank-permutation", "durably-persisted"],
	},
]);
const productReady = {
	origin: "first-painted-enabled-focusable-frame",
	required: ["three-choices", "first-world-state", "correct-variant-id"],
};
const oracleInputs = {
	acceptedTreatment: TREATMENTS.H,
	anchors: GATE0_ANCHORS,
	comparisonContract: TREATMENT_SNAPSHOT,
	fixture: { product: VISIBLE_FIXTURE, visual: FIXTURE },
	logicalTimeline: { observer: LOGICAL_TIMELINE, product: productTimeline },
	optionOrders,
	optionSets: GATE0_OPTION_SETS,
	questions: GATE0_QUESTIONS,
	readyPredicate: { observer: READY_PREDICATE_CONTRACT, product: productReady },
	responseSurface: {
		observer: RESPONSE_SURFACE,
		productQuestions: GATE0_QUESTIONS.slice(0, 6),
	},
	script: GATE0_SCRIPT,
	semanticDom: createSemanticTree(),
	timers: GATE0_TIMERS_MS,
};
const segmentsRaw = await readFile(
	new URL(
		"../docs/exec-plans/evidence/001/work-segments.jsonl",
		import.meta.url,
	),
	"utf8",
);
const segments = segmentsRaw.trim().split("\n").filter(Boolean).map(JSON.parse);
const recordedNonOperatorSeconds = [
	...new Map(segments.map((value) => [value.segmentId, value])).values(),
]
	.filter((value) => value.ownerKind !== "operator")
	.reduce((sum, value) => sum + value.productiveSeconds, 0);
const stateHash = hashObject(FIXTURE.region);
const snapshot = {
	answerKey: ANSWER_KEY,
	browserCohort: {
		chromeVersion: "151.0.7922.34",
		launcherSha256:
			"a596b1cfc6353e987fcec8d71a23a28cd6a9e7a6b4e20b908e4c4fcffe51158e",
		manifestSha256:
			"25995bc88bf20b6de47b46eb3571b250989846a797c0b8924b8794627b6175fc",
		playwrightVersion: "1.62.1",
	},
	buildFixture: {
		observerRoute: "/observer/:studyId",
		productRoute: "/product/:studyId",
		captureQuery: "capture=1",
		rendererMode: "pixi-semantic",
	},
	displayOptionTokens: GATE0_OPTION_SETS.map(({ questionId, options }) => ({
		questionId,
		tokens: options.map(({ token }) => token),
	})),
	expectedStateHash: stateHash,
	gateId: "gate-0",
	laborAdmission: {
		mappedBudgetSeconds: 19_800,
		openOperatorReservationSeconds: 9_900,
		protectedGlobalHighSeconds: 0,
		protectedMappedHighSeconds: 0,
		protectedTaskIds: [],
		recordedNonOperatorSeconds,
	},
	oracleInputs,
	orchestrationPromptBlob: "a5e30353d3bee951ff25a85758f9accf22aea30a",
	planBase: "f0ec6a1e34a74d117de84c094286ec703ca7f15f",
	region: FIXTURE.region,
	schemaVersion: "eonfolk-gate0-snapshot-v1",
	studyDefinition: buildGate0StudyDefinition(),
	treatmentContractVersion: "gate-0-treatments-v1",
	treatmentSnapshot: TREATMENT_SNAPSHOT,
	visualFixture: FIXTURE,
};
const oracle = {
	acceptedTreatmentHash: hashObject(oracleInputs.acceptedTreatment),
	acceptedTreatmentId: "H",
	anchorsHash: hashObject(oracleInputs.anchors),
	chronicleHash: hashObject(CHRONICLE_BEAT),
	comparisonContractHash: hashObject(oracleInputs.comparisonContract),
	eventIntervalHash: null,
	fixtureHash: hashObject(oracleInputs.fixture),
	gateId: "gate-0",
	logicalTimelineHash: hashObject(oracleInputs.logicalTimeline),
	optionOrdersHash: hashObject(oracleInputs.optionOrders),
	optionSetsHash: hashObject(oracleInputs.optionSets),
	questionsHash: hashObject(oracleInputs.questions),
	readyPredicateHash: hashObject(oracleInputs.readyPredicate),
	receiptHash: null,
	rendererMode: "pixi-semantic",
	responseSurfaceHash: hashObject(oracleInputs.responseSurface),
	routeId: "gate-0-combined-study",
	routeParams: {
		observer: { capture: "1", fixtureId: "gate0-visual-v1", studyId: "V01" },
		product: { studyId: "P01" },
	},
	schemaVersion: "eonfolk-observable-gate-v1",
	scriptHash: hashObject(oracleInputs.script),
	semanticDomHash: hashObject(oracleInputs.semanticDom),
	stateHash,
	storyCardHash: null,
	timersHash: hashObject(oracleInputs.timers),
	viewportPngHashes,
};
await mkdir(out, { recursive: true });
await writeFile(new URL("snapshot.jcs.json", out), `${canonical(snapshot)}\n`);
await writeFile(
	new URL("observable-gate.jcs.json", out),
	`${canonical(oracle)}\n`,
);
process.stdout.write(
	`gate-0 artifact generated: snapshot ${sha256(Buffer.from(`${canonical(snapshot)}\n`))}, oracle ${sha256(Buffer.from(`${canonical(oracle)}\n`))}\n`,
);
