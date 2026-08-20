import {
	ADVICE_TOKENS,
	GATE_ID,
	GATE0_ANCHORS,
	GATE0_ASSIGNMENTS,
	GATE0_OPERATIONAL_SEED,
	GATE0_OPTION_SETS,
	GATE0_QUESTIONS,
	GATE0_SCRIPT,
	GATE0_TIMERS_MS,
	type Gate0ObserverAnswerKey,
	INVALIDATION_REASONS,
	OPERATOR_FOCUSED_MINUTES_CAP,
	OPERATOR_STATEMENT,
	PRESENTATIONS,
	TREATMENTS,
	WILLIAMS_ROWS,
} from "./contract.ts";
import { gate0OptionOrders, studySeed } from "./prng.ts";

export type Validation = { ok: boolean; errors: string[] };
export type EvidenceExpectation = Readonly<{
	studyCommit: string;
	manifestHash: string;
	seed?: string;
}>;

const ownKeys = (value: unknown, keys: readonly string[]): boolean => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const actual = Object.keys(value as object).sort();
	return (
		actual.length === keys.length &&
		actual.every((key, index) => key === [...keys].sort()[index])
	);
};
const stable = (value: any): string =>
	value === null || typeof value !== "object"
		? JSON.stringify(value)
		: Array.isArray(value)
			? `[${value.map(stable).join(",")}]`
			: `{${Object.keys(value)
					.sort()
					.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
					.join(",")}}`;
const equal = (a: unknown, b: unknown) => stable(a) === stable(b);
const integer = (value: unknown, min: number, max: number) =>
	Number.isInteger(value) &&
	(value as number) >= min &&
	(value as number) <= max;
const nullable = (value: unknown, predicate: (v: unknown) => boolean) =>
	value === null || predicate(value);
const utf8Length = (value: string) => Buffer.byteLength(value, "utf8");
const sortedUtf8 = (values: string[]) =>
	[...values].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));

export function validateWilliamsDesign(): Validation {
	const errors: string[] = [];
	const rows = Object.values(WILLIAMS_ROWS);
	for (let position = 0; position < 6; position += 1) {
		const seen = rows.map((row) => row[position]);
		if (!equal([...seen].sort(), [...TREATMENTS].sort()))
			errors.push(`position ${position + 1} is unbalanced`);
	}
	const pairs = new Set<string>();
	for (const row of rows)
		for (let i = 1; i < row.length; i += 1)
			pairs.add(`${row[i - 1]}>${row[i]}`);
	for (const before of TREATMENTS)
		for (const after of TREATMENTS)
			if (before !== after && !pairs.has(`${before}>${after}`))
				errors.push(`missing predecessor ${before}>${after}`);
	if (pairs.size !== 30)
		errors.push(
			`expected 30 unique ordered predecessor pairs, got ${pairs.size}`,
		);
	return { ok: errors.length === 0, errors };
}

export function buildGate0StudyDefinition(
	planBase = "f0ec6a1e34a74d117de84c094286ec703ca7f15f",
) {
	const seed = studySeed(planBase);
	return {
		gateId: GATE_ID,
		seed,
		assignments: GATE0_ASSIGNMENTS,
		script: GATE0_SCRIPT,
		questions: GATE0_QUESTIONS,
		anchors: GATE0_ANCHORS,
		optionSets: GATE0_OPTION_SETS,
		optionOrders: gate0OptionOrders(seed),
		timersMs: GATE0_TIMERS_MS,
		operatorFocusedMinutesCap: OPERATOR_FOCUSED_MINUTES_CAP,
	};
}

export function validateGate0StudyDefinition(value: unknown): Validation {
	const errors: string[] = [];
	const expected = buildGate0StudyDefinition();
	const keys = [
		"gateId",
		"seed",
		"assignments",
		"script",
		"questions",
		"anchors",
		"optionSets",
		"optionOrders",
		"timersMs",
		"operatorFocusedMinutesCap",
	];
	if (!ownKeys(value, keys))
		errors.push("study definition keys are not closed");
	if (!equal(value, expected))
		errors.push(
			"study definition differs from the operational Gate 0 contract",
		);
	errors.push(...validateWilliamsDesign().errors);
	return { ok: errors.length === 0, errors };
}

function validateAttempt(value: any, path: string, errors: string[]) {
	if (!ownKeys(value, ["status", "invalidationReason"]))
		return errors.push(`${path} attempt keys`);
	if (!(["valid", "invalid"] as const).includes(value.status))
		errors.push(`${path}.status`);
	if (value.status === "valid" && value.invalidationReason !== null)
		errors.push(`${path} valid reason must be null`);
	if (
		value.status === "invalid" &&
		!INVALIDATION_REASONS.includes(value.invalidationReason)
	)
		errors.push(`${path} invalid reason`);
}

function validateText(value: unknown, path: string, errors: string[]) {
	if (value !== null && (typeof value !== "string" || utf8Length(value) > 512))
		errors.push(`${path} must be null or <=512 UTF-8 bytes`);
}

const productKeys = {
	protocol: PRESENTATIONS,
	taskTimesMs: PRESENTATIONS.map((p) => `${p}MeaningfulActionMs`),
	choices: PRESENTATIONS.flatMap((p) => [
		`${p}Advice`,
		`${p}Desirable`,
		`${p}Continue`,
		`${p}Replay`,
	]),
	ratings: PRESENTATIONS.map((p) => `${p}Rank`),
	textResponses: PRESENTATIONS.flatMap((p) => [
		`${p}Prediction`,
		`${p}Objection`,
	]),
};

function validateProduct(record: any, errors: string[]) {
	for (const [map, keys] of Object.entries(productKeys))
		if (!ownKeys(record[map], keys))
			errors.push(`${record.studyId}.${map} keys`);
	if (!ownKeys(record.rubricScores, []))
		errors.push(`${record.studyId}.rubricScores must be empty`);
	if (
		![
			record.protocol,
			record.taskTimesMs,
			record.choices,
			record.ratings,
			record.textResponses,
		].every((map) => map && typeof map === "object" && !Array.isArray(map))
	)
		return;
	for (const presentation of PRESENTATIONS) {
		validateAttempt(
			record.protocol[presentation],
			`${record.studyId}.${presentation}`,
			errors,
		);
		if (
			!nullable(record.taskTimesMs[`${presentation}MeaningfulActionMs`], (v) =>
				integer(v, 0, 90_000),
			)
		)
			errors.push(`${record.studyId}.${presentation} meaningful action`);
		if (
			!nullable(record.choices[`${presentation}Advice`], (v) =>
				ADVICE_TOKENS.includes(v as any),
			)
		)
			errors.push(`${record.studyId}.${presentation} advice`);
		for (const suffix of ["Desirable", "Continue", "Replay"])
			if (
				!nullable(
					record.choices[`${presentation}${suffix}`],
					(v) => typeof v === "boolean",
				)
			)
				errors.push(`${record.studyId}.${presentation}${suffix}`);
		if (
			!nullable(record.ratings[`${presentation}Rank`], (v) => integer(v, 1, 6))
		)
			errors.push(`${record.studyId}.${presentation} rank`);
		validateText(
			record.textResponses[`${presentation}Prediction`],
			`${record.studyId}.${presentation}Prediction`,
			errors,
		);
		validateText(
			record.textResponses[`${presentation}Objection`],
			`${record.studyId}.${presentation}Objection`,
			errors,
		);
	}
	const ranks = PRESENTATIONS.map((p) => record.ratings[`${p}Rank`]);
	const invalidAttempt = PRESENTATIONS.some(
		(p) => record.protocol[p]?.status === "invalid",
	);
	if (
		!record.abandoned &&
		!invalidAttempt &&
		!equal([...ranks].sort(), [1, 2, 3, 4, 5, 6])
	)
		errors.push(`${record.studyId} ranks are not a permutation`);
}

function validateVisual(record: any, errors: string[]) {
	if (!ownKeys(record.protocol, ["observer"]))
		errors.push(`${record.studyId}.protocol keys`);
	else
		validateAttempt(
			record.protocol.observer,
			`${record.studyId}.observer`,
			errors,
		);
	if (!ownKeys(record.taskTimesMs, ["followMaraFindMs", "observationPromptMs"]))
		errors.push(`${record.studyId}.taskTimesMs keys`);
	if (
		![
			record.protocol,
			record.taskTimesMs,
			record.choices,
			record.ratings,
			record.textResponses,
			record.rubricScores,
		].every((map) => map && typeof map === "object" && !Array.isArray(map))
	)
		return;
	if (
		!nullable(record.taskTimesMs.followMaraFindMs, (v) => integer(v, 0, 10_000))
	)
		errors.push(`${record.studyId}.followMaraFindMs`);
	if (
		!nullable(record.taskTimesMs.observationPromptMs, (v) =>
			integer(v, 60_000, 61_000),
		)
	)
		errors.push(`${record.studyId}.observationPromptMs`);
	for (const map of ["choices", "ratings", "rubricScores"])
		if (!ownKeys(record[map], []))
			errors.push(`${record.studyId}.${map} must be empty`);
	if (
		!ownKeys(record.textResponses, [
			"mara",
			"activities",
			"interaction",
			"autonomy",
		])
	)
		errors.push(`${record.studyId}.textResponses keys`);
	for (const key of ["mara", "activities", "interaction", "autonomy"])
		validateText(record.textResponses[key], `${record.studyId}.${key}`, errors);
	const sets = Object.fromEntries(
		GATE0_OPTION_SETS.map((set) => [
			set.questionId,
			set.options.map((o) => o.token),
		]),
	);
	if (
		record.textResponses.mara !== null &&
		!sets["point-mara"].includes(record.textResponses.mara)
	)
		errors.push(`${record.studyId}.mara token`);
	if (
		record.textResponses.interaction !== null &&
		!sets["interaction-change"].includes(record.textResponses.interaction)
	)
		errors.push(`${record.studyId}.interaction token`);
	if (
		record.textResponses.autonomy !== null &&
		!sets.autonomy.includes(record.textResponses.autonomy)
	)
		errors.push(`${record.studyId}.autonomy token`);
	if (record.textResponses.activities !== null) {
		const selected = record.textResponses.activities.split(",");
		if (
			selected.length !== 3 ||
			new Set(selected).size !== 3 ||
			!equal(selected, sortedUtf8(selected)) ||
			selected.some((token: string) => !sets.activities.includes(token))
		)
			errors.push(
				`${record.studyId}.activities must be exactly three canonical UTF-8-sorted tokens`,
			);
	}
}

export function validateObserverAnswerKey(
	key: Gate0ObserverAnswerKey,
): Validation {
	const errors: string[] = [];
	if (!ownKeys(key, ["mara", "activities", "interaction", "autonomy"]))
		errors.push("answer key keys");
	if (key.mara !== "citizen:mara") errors.push("answer key Mara token");
	if (key.interaction !== "interaction:iven,toma|exchange-settled")
		errors.push("answer key interaction token");
	if (key.autonomy !== "cannot-command|standing-plan")
		errors.push("answer key autonomy token");
	const valid = GATE0_OPTION_SETS.find(
		(s) => s.questionId === "activities",
	)!.options.map((o) => o.token);
	const activities = key.activities.split(",");
	if (
		activities.length !== 3 ||
		new Set(activities).size !== 3 ||
		!equal(activities, sortedUtf8(activities)) ||
		activities.some((v) => !valid.includes(v as any))
	)
		errors.push("answer key activities token triple");
	return { ok: errors.length === 0, errors };
}

export function validateGate0Evidence(
	raw: string | Uint8Array,
	expected: EvidenceExpectation,
): Validation & { value?: any } {
	const errors: string[] = [];
	const bytes =
		typeof raw === "string" ? Buffer.from(raw, "utf8") : Buffer.from(raw);
	if (bytes.byteLength > 262_144)
		errors.push("ingress exceeds 262144 raw bytes");
	if (bytes.byteLength > 204_800)
		errors.push("evidence exceeds 204800-byte schema budget");
	let text = "";
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		errors.push("invalid UTF-8");
	}
	let value: any;
	try {
		value = JSON.parse(text);
	} catch {
		errors.push("invalid JSON");
		return { ok: false, errors };
	}
	const top = [
		"schemaVersion",
		"gateId",
		"studyCommit",
		"manifestHash",
		"seed",
		"assignments",
		"operatorFocusedMinutes",
		"participantRecords",
		"operatorSignoff",
	];
	if (!ownKeys(value, top))
		errors.push("evidence top-level keys are not closed");
	if (
		value.schemaVersion !== "eonfolk-human-evidence-v1" ||
		value.gateId !== GATE_ID
	)
		errors.push("evidence identity");
	if (
		value.studyCommit !== expected.studyCommit ||
		!/^[0-9a-f]{40}$/.test(value.studyCommit)
	)
		errors.push("studyCommit");
	if (
		value.manifestHash !== expected.manifestHash ||
		!/^[0-9a-f]{64}$/.test(value.manifestHash)
	)
		errors.push("manifestHash");
	if (
		value.seed !== (expected.seed ?? GATE0_OPERATIONAL_SEED) ||
		!/^[0-9a-f]{64}$/.test(value.seed)
	)
		errors.push("seed");
	if (!equal(value.assignments, GATE0_ASSIGNMENTS)) errors.push("assignments");
	const minutes = value.operatorFocusedMinutes;
	if (
		!ownKeys(minutes, ["setup", "facilitation", "analysis"]) ||
		![minutes?.setup, minutes?.facilitation, minutes?.analysis].every((v) =>
			integer(v, 0, OPERATOR_FOCUSED_MINUTES_CAP),
		) ||
		minutes.setup + minutes.facilitation + minutes.analysis >
			OPERATOR_FOCUSED_MINUTES_CAP
	)
		errors.push("operatorFocusedMinutes");
	if (
		!Array.isArray(value.participantRecords) ||
		value.participantRecords.length !== 11
	)
		errors.push("participantRecords cardinality");
	else
		value.participantRecords.forEach((record: any, index: number) => {
			const assignment = GATE0_ASSIGNMENTS[index];
			const recordKeys = [
				"studyId",
				"cohortRole",
				"eligible",
				"affirmativeAgreement",
				"assignment",
				"protocol",
				"taskTimesMs",
				"choices",
				"ratings",
				"textResponses",
				"rubricScores",
				"observationNotes",
				"abandoned",
			];
			if (!ownKeys(record, recordKeys)) errors.push(`record ${index} keys`);
			if (!record || typeof record !== "object" || Array.isArray(record))
				return;
			if (
				!assignment ||
				record.studyId !== assignment.studyId ||
				record.cohortRole !== assignment.cohortRole ||
				!equal(record.assignment, assignment)
			)
				errors.push(`record ${index} assignment`);
			if (
				record.eligible !== true ||
				record.affirmativeAgreement !== true ||
				typeof record.abandoned !== "boolean"
			)
				errors.push(`record ${index} enrollment/abandonment`);
			validateText(
				record.observationNotes,
				`${record.studyId}.observationNotes`,
				errors,
			);
			if (record.cohortRole === "product") validateProduct(record, errors);
			else if (record.cohortRole === "visual-observer")
				validateVisual(record, errors);
		});
	const signoff = value.operatorSignoff;
	if (
		!ownKeys(signoff, ["attests", "role", "signedAtUtc", "statement"]) ||
		signoff?.attests !== true ||
		signoff?.role !== "authorized-human-operator" ||
		signoff?.statement !== OPERATOR_STATEMENT
	)
		errors.push("operatorSignoff");
	const utc = signoff?.signedAtUtc;
	if (
		typeof utc !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(utc) ||
		Number.isNaN(Date.parse(utc)) ||
		new Date(utc).toISOString() !== utc
	)
		errors.push("operatorSignoff.signedAtUtc");
	return { ok: errors.length === 0, errors, value };
}
