import { describe, expect, test } from "vitest";
import { analyzeAggregateMock, analyzeGate0Evidence } from "./analyze.ts";
import { generateBlankGate0Source } from "./blank.ts";
import {
	GATE0_ANALYZER_MOCKS,
	GATE0_ASSIGNMENTS,
	GATE0_OPERATIONAL_SEED,
	GATE0_OPTION_SETS,
	GATE0_SYNTHETIC_SEED,
	OPERATOR_STATEMENT,
	PRESENTATIONS,
	PRODUCT_ASSIGNMENTS,
	SYNTHETIC_PLAN_BASE,
	WILLIAMS_ROWS,
} from "./contract.ts";
import {
	deriveProductTimeline,
	gate0OptionOrders,
	optionSeedDigest,
	shuffledTokens,
	studySeed,
	validConsequenceDelivery,
} from "./prng.ts";
import {
	buildGate0StudyDefinition,
	validateGate0Evidence,
	validateGate0StudyDefinition,
	validateWilliamsDesign,
} from "./validate.ts";

const expectation = {
	studyCommit: "1".repeat(40),
	manifestHash: "2".repeat(64),
	seed: GATE0_OPERATIONAL_SEED,
};
const answerKey = {
	mara: "citizen:mara",
	activities: "activity:carry-water,activity:eat-rations,activity:gather-wood",
	interaction: "interaction:iven,toma|exchange-settled",
	autonomy: "cannot-command|standing-plan",
};
const validAttempt = () => ({ status: "valid", invalidationReason: null });

function mockEvidence() {
	const participantRecords = GATE0_ASSIGNMENTS.map((assignment, index) => {
		if (assignment.cohortRole === "visual-observer")
			return {
				studyId: assignment.studyId,
				cohortRole: assignment.cohortRole,
				eligible: true,
				affirmativeAgreement: true,
				assignment,
				protocol: { observer: validAttempt() },
				taskTimesMs: { followMaraFindMs: 5_000, observationPromptMs: 60_000 },
				choices: {},
				ratings: {},
				textResponses: {
					mara: answerKey.mara,
					activities: answerKey.activities,
					interaction: answerKey.interaction,
					autonomy: answerKey.autonomy,
				},
				rubricScores: {},
				observationNotes: null,
				abandoned: false,
			};
		const row = WILLIAMS_ROWS[PRODUCT_ASSIGNMENTS[index]!.rowId];
		const treatmentRank = {
			H: 1,
			FAM: 2,
			TRI: 3,
			FAC: 4,
			ECH: 5,
			DIR: 6,
		} as const;
		return {
			studyId: assignment.studyId,
			cohortRole: assignment.cohortRole,
			eligible: true,
			affirmativeAgreement: true,
			assignment,
			protocol: Object.fromEntries(
				PRESENTATIONS.map((p) => [p, validAttempt()]),
			),
			taskTimesMs: Object.fromEntries(
				PRESENTATIONS.map((p) => [`${p}MeaningfulActionMs`, 1_000]),
			),
			choices: Object.fromEntries(
				PRESENTATIONS.flatMap((p, ordinal) => [
					[`${p}Advice`, "verify-private"],
					[`${p}Desirable`, row[ordinal] === "H"],
					[`${p}Continue`, row[ordinal] === "H"],
					[`${p}Replay`, null],
				]),
			),
			ratings: Object.fromEntries(
				PRESENTATIONS.map((p, ordinal) => [
					`${p}Rank`,
					treatmentRank[row[ordinal]!],
				]),
			),
			textResponses: Object.fromEntries(
				PRESENTATIONS.flatMap((p) => [
					[`${p}Prediction`, "prediction"],
					[`${p}Objection`, "none"],
				]),
			),
			rubricScores: {},
			observationNotes: null,
			abandoned: false,
		};
	});
	return {
		schemaVersion: "eonfolk-human-evidence-v1",
		gateId: "gate-0",
		studyCommit: expectation.studyCommit,
		manifestHash: expectation.manifestHash,
		seed: expectation.seed,
		assignments: GATE0_ASSIGNMENTS,
		operatorFocusedMinutes: { setup: 10, facilitation: 100, analysis: 20 },
		participantRecords,
		operatorSignoff: {
			attests: true,
			role: "authorized-human-operator",
			signedAtUtc: "2026-08-20T12:00:00.000Z",
			statement: OPERATOR_STATEMENT,
		},
	};
}

describe("immutable Gate 0 contract", () => {
	test("uses all six Williams rows and balances positions and predecessors", () => {
		expect(validateWilliamsDesign()).toEqual({ ok: true, errors: [] });
		expect(GATE0_ASSIGNMENTS).toHaveLength(11);
		expect(
			GATE0_ASSIGNMENTS.slice(0, 6).map((a: any) => `${a.studyId}:${a.rowId}`),
		).toEqual(["P01:R0", "P02:R1", "P03:R2", "P04:R3", "P05:R4", "P06:R5"]);
	});

	test("recomputes operational and synthetic seeds and the closed definition", () => {
		expect(studySeed(SYNTHETIC_PLAN_BASE)).toBe(GATE0_SYNTHETIC_SEED);
		expect(studySeed("f0ec6a1e34a74d117de84c094286ec703ca7f15f")).toBe(
			GATE0_OPERATIONAL_SEED,
		);
		expect(validateGate0StudyDefinition(buildGate0StudyDefinition())).toEqual({
			ok: true,
			errors: [],
		});
		expect(gate0OptionOrders(GATE0_OPERATIONAL_SEED)).toHaveLength(20);
	});

	test("reproduces both V2 option-order sentinels", () => {
		const canonical = GATE0_OPTION_SETS[0].options.map((o) => o.token);
		const vectors = [
			[
				"989acf8b324a94eea94f329b69d531b4f9858f39d0bde06bd8acfc59f0e060c5",
				"55dbdcedb82c5b9474936f59e44cc46939ec8094301da988056523d8ef5065de",
				[
					"036e3002",
					"6cd77562",
					"cadd12e5",
					"7dbf2134",
					"120055ff",
					"7216d0c6",
					"62a4b8b2",
				],
				[
					"citizen:nadi",
					"citizen:mara",
					"citizen:corin",
					"citizen:sera",
					"citizen:bela",
					"citizen:toma",
					"citizen:owen",
					"citizen:iven",
				],
			],
			[
				"02984ccce263f44914bb3cbdec719f9f6c3f472cd0e493c9aabc332ec56eee82",
				"e572b98be08d90d65746cedaadd9dbc8d71065ab359844046bacf3c286ca530f",
				[
					"b47830d8",
					"ddc9b7eb",
					"abedd826",
					"1198e900",
					"c69a6114",
					"fe58066f",
					"41a3e480",
				],
				[
					"citizen:bela",
					"citizen:nadi",
					"citizen:sera",
					"citizen:corin",
					"citizen:owen",
					"citizen:iven",
					"citizen:toma",
					"citizen:mara",
				],
			],
		] as const;
		for (const [seed, digest, drawsHex, order] of vectors) {
			const draws: number[] = [];
			expect(optionSeedDigest(seed, "A01", "observer", "point-mara")).toBe(
				digest,
			);
			expect(
				shuffledTokens(seed, "A01", "observer", "point-mara", canonical, draws),
			).toEqual(order);
			expect(draws.map((v) => v.toString(16).padStart(8, "0"))).toEqual(
				drawsHex,
			);
		}
	});

	test("enforces equality timeout and exact fixed schedule", () => {
		const timeline = deriveProductTimeline(1_000, 91_000);
		expect(timeline.timedOut).toBe(true);
		expect(timeline.decisionAt).toBe(91_000);
		expect(timeline.slotEndsAt).toBe(226_000);
		expect(
			validConsequenceDelivery(
				timeline.decisionAt,
				timeline.decisionAt + 46_000,
			),
		).toBe(true);
		expect(
			validConsequenceDelivery(
				timeline.decisionAt,
				timeline.decisionAt + 46_001,
			),
		).toBe(false);
	});
});

describe("closed evidence and analyzer", () => {
	test("accepts a complete synthetic keep mock; Replay remains diagnostic", () => {
		const raw = JSON.stringify(mockEvidence());
		expect(validateGate0Evidence(raw, expectation).ok).toBe(true);
		const result = analyzeGate0Evidence(raw, expectation, answerKey);
		expect(result.outcome).toBe("PASS");
		expect(result.diagnostics.replay).toBe("diagnostic-only");
	});

	test("implements all required aggregate mock dispositions", () => {
		expect(analyzeAggregateMock(GATE0_ANALYZER_MOCKS.keep)).toBe("PASS");
		expect(
			analyzeAggregateMock(GATE0_ANALYZER_MOCKS["all-zero-absolute-floor"]),
		).toBe("FAIL");
		expect(
			analyzeAggregateMock(GATE0_ANALYZER_MOCKS["comparative-reopen"]),
		).toBe("FAIL");
	});

	test("scores a missing observer timer or response as incomplete", () => {
		const evidence: any = mockEvidence();
		evidence.participantRecords[6].taskTimesMs.followMaraFindMs = null;
		evidence.participantRecords[6].textResponses.autonomy = null;
		const result = analyzeGate0Evidence(
			JSON.stringify(evidence),
			expectation,
			answerKey,
		);
		expect(result.outcome).toBe("FAIL");
		expect(result.criterionResults["records-complete"]).toBe(false);
	});

	test("rejects extra PII-shaped fields and oversized response text", () => {
		const evidence: any = mockEvidence();
		evidence.participantRecords[0].email = "not-allowed@example.test";
		expect(
			validateGate0Evidence(JSON.stringify(evidence), expectation).ok,
		).toBe(false);
		delete evidence.participantRecords[0].email;
		evidence.participantRecords[0].textResponses.V1Prediction = "é".repeat(257);
		expect(
			validateGate0Evidence(JSON.stringify(evidence), expectation).errors.some(
				(e) => e.includes("512 UTF-8 bytes"),
			),
		).toBe(true);
	});

	test("blank generator cannot be mistaken for signed human evidence", () => {
		const blank = generateBlankGate0Source();
		expect(blank.templateStatus).toBe("blank-not-human-evidence");
		expect(validateGate0Evidence(JSON.stringify(blank), expectation).ok).toBe(
			false,
		);
	});
});
