import {
	CRITERION_KEYS,
	type GATE0_ANALYZER_MOCKS,
	type Gate0ObserverAnswerKey,
	PRESENTATIONS,
	PRODUCT_ASSIGNMENTS,
	TREATMENTS,
	type Treatment,
	WILLIAMS_ROWS,
} from "./contract.ts";
import {
	type EvidenceExpectation,
	validateGate0Evidence,
	validateObserverAnswerKey,
} from "./validate.ts";

type Counts = Record<Treatment, number>;
const emptyCounts = (): Counts =>
	Object.fromEntries(TREATMENTS.map((id) => [id, 0])) as Counts;
const validAttempt = (attempt: any) =>
	attempt?.status === "valid" && attempt.invalidationReason === null;
const permutation = (values: unknown[]) =>
	JSON.stringify([...values].sort()) === JSON.stringify([1, 2, 3, 4, 5, 6]);

export function analyzeAggregateMock(
	mock: (typeof GATE0_ANALYZER_MOCKS)[keyof typeof GATE0_ANALYZER_MOCKS],
) {
	const hUnique =
		Object.entries(mock.rankSums)
			.filter(([, sum]) => sum === Math.min(...Object.values(mock.rankSums)))
			.map(([id]) => id)
			.join() === "H";
	const desirableFloor = mock.desirableCounts.H >= 4;
	const continueFloor = mock.continueCounts.H >= 4;
	const desirableLead = TREATMENTS.filter((id) => id !== "H").every(
		(id) => mock.desirableCounts[id] <= mock.desirableCounts.H + 1,
	);
	const continueLead = TREATMENTS.filter((id) => id !== "H").every(
		(id) => mock.continueCounts[id] <= mock.continueCounts.H + 1,
	);
	return hUnique &&
		desirableFloor &&
		continueFloor &&
		desirableLead &&
		continueLead
		? "PASS"
		: "FAIL";
}

export function analyzeGate0Evidence(
	raw: string | Uint8Array,
	expected: EvidenceExpectation,
	answerKey: Gate0ObserverAnswerKey,
) {
	const keyValidation = validateObserverAnswerKey(answerKey);
	if (!keyValidation.ok) throw new Error(keyValidation.errors.join("; "));
	const validation = validateGate0Evidence(raw, expected);
	if (!validation.ok) throw new Error(validation.errors.join("; "));
	const records = validation.value.participantRecords as any[];
	const products = records.slice(0, 6);
	const observers = records.slice(6);
	const rankSums = emptyCounts();
	const desirableCounts = emptyCounts();
	const continueCounts = emptyCounts();
	let recordsComplete = true;
	for (let index = 0; index < products.length; index += 1) {
		const record = products[index]!;
		const row = WILLIAMS_ROWS[PRODUCT_ASSIGNMENTS[index]!.rowId];
		const ranks = PRESENTATIONS.map((p) => record.ratings[`${p}Rank`]);
		if (record.abandoned || !permutation(ranks)) recordsComplete = false;
		for (let ordinal = 0; ordinal < PRESENTATIONS.length; ordinal += 1) {
			const presentation = PRESENTATIONS[ordinal]!;
			const treatment = row[ordinal]!;
			if (!validAttempt(record.protocol[presentation])) recordsComplete = false;
			if (
				[
					record.choices[`${presentation}Advice`],
					record.choices[`${presentation}Desirable`],
					record.choices[`${presentation}Continue`],
					record.textResponses[`${presentation}Prediction`],
					record.textResponses[`${presentation}Objection`],
				].some((v) => v === null)
			)
				recordsComplete = false;
			rankSums[treatment] +=
				typeof ranks[ordinal] === "number" ? ranks[ordinal] : 0;
			if (record.choices[`${presentation}Desirable`] === true)
				desirableCounts[treatment] += 1;
			if (record.choices[`${presentation}Continue`] === true)
				continueCounts[treatment] += 1;
		}
	}
	for (const observer of observers) {
		if (observer.abandoned || !validAttempt(observer.protocol.observer))
			recordsComplete = false;
		if (observer.taskTimesMs.observationPromptMs === null)
			recordsComplete = false;
		if (
			[
				observer.textResponses.mara,
				observer.textResponses.activities,
				observer.textResponses.interaction,
				observer.textResponses.autonomy,
			].some((value) => value === null)
		)
			recordsComplete = false;
	}
	const minimum = Math.min(...Object.values(rankSums));
	const hUnique =
		rankSums.H === minimum &&
		Object.values(rankSums).filter((sum) => sum === minimum).length === 1;
	const completeObservation = observers.filter(
		(record) =>
			validAttempt(record.protocol.observer) &&
			record.taskTimesMs.observationPromptMs !== null &&
			record.textResponses.mara === answerKey.mara &&
			record.textResponses.activities === answerKey.activities &&
			record.textResponses.interaction === answerKey.interaction,
	).length;
	const autonomous = observers.filter(
		(record) =>
			validAttempt(record.protocol.observer) &&
			record.taskTimesMs.followMaraFindMs !== null &&
			record.taskTimesMs.followMaraFindMs <= 10_000 &&
			record.textResponses.autonomy === answerKey.autonomy,
	).length;
	const criterionResults = {
		"records-complete": recordsComplete,
		"h-unique-rank": hUnique,
		"h-desirable-4of6": desirableCounts.H >= 4,
		"h-continue-4of6": continueCounts.H >= 4,
		"no-desirable-lead-20pp": TREATMENTS.filter((id) => id !== "H").every(
			(id) => desirableCounts[id] <= desirableCounts.H + 1,
		),
		"no-continue-lead-20pp": TREATMENTS.filter((id) => id !== "H").every(
			(id) => continueCounts[id] <= continueCounts.H + 1,
		),
		"observer-activity-interaction-3of5": completeObservation >= 3,
		"observer-autonomy-4of5": autonomous >= 4,
	};
	if (
		JSON.stringify(Object.keys(criterionResults)) !==
		JSON.stringify(CRITERION_KEYS)
	)
		throw new Error("criterion key order changed");
	return {
		outcome: Object.values(criterionResults).every(Boolean)
			? ("PASS" as const)
			: ("FAIL" as const),
		criterionResults,
		diagnostics: {
			rankSums,
			desirableCounts,
			continueCounts,
			replay: "diagnostic-only" as const,
		},
	};
}
