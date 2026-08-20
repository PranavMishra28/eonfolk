import { GATE0_ASSIGNMENTS, PRESENTATIONS } from "./contract.ts";

/** Deliberately not a valid human-evidence file: it contains no consent, response, or sign-off attestation. */
export function generateBlankGate0Source() {
	return {
		templateStatus: "blank-not-human-evidence" as const,
		participantRecords: GATE0_ASSIGNMENTS.map((assignment) =>
			assignment.cohortRole === "product"
				? {
						studyId: assignment.studyId,
						cohortRole: assignment.cohortRole,
						assignment,
						eligible: null,
						affirmativeAgreement: null,
						protocol: Object.fromEntries(PRESENTATIONS.map((p) => [p, null])),
						taskTimesMs: Object.fromEntries(
							PRESENTATIONS.map((p) => [`${p}MeaningfulActionMs`, null]),
						),
						choices: Object.fromEntries(
							PRESENTATIONS.flatMap((p) => [
								[`${p}Advice`, null],
								[`${p}Desirable`, null],
								[`${p}Continue`, null],
								[`${p}Replay`, null],
							]),
						),
						ratings: Object.fromEntries(
							PRESENTATIONS.map((p) => [`${p}Rank`, null]),
						),
						textResponses: Object.fromEntries(
							PRESENTATIONS.flatMap((p) => [
								[`${p}Prediction`, null],
								[`${p}Objection`, null],
							]),
						),
						rubricScores: {},
						observationNotes: null,
						abandoned: null,
					}
				: {
						studyId: assignment.studyId,
						cohortRole: assignment.cohortRole,
						assignment,
						eligible: null,
						affirmativeAgreement: null,
						protocol: { observer: null },
						taskTimesMs: { followMaraFindMs: null, observationPromptMs: null },
						choices: {},
						ratings: {},
						textResponses: {
							mara: null,
							activities: null,
							interaction: null,
							autonomy: null,
						},
						rubricScores: {},
						observationNotes: null,
						abandoned: null,
					},
		),
		operatorFocusedMinutes: { setup: null, facilitation: null, analysis: null },
		operatorSignoff: null,
	};
}
