export const PLAN_BASE = "f0ec6a1e34a74d117de84c094286ec703ca7f15f";
export const SYNTHETIC_PLAN_BASE = "0".repeat(64);
export const GATE_ID = "gate-0";
export const GATE0_OPERATIONAL_SEED =
	"5a9fda2968af9b50cf98bef59439ae13517567f67bbeadc478bc95fb1df0fcbb";
export const GATE0_SYNTHETIC_SEED =
	"47bae548150f2ca338f1128264b676a5841c448d1af75eb3cca4bad4bfd32bec";

export const TREATMENTS = ["H", "FAM", "TRI", "FAC", "ECH", "DIR"] as const;
export type Treatment = (typeof TREATMENTS)[number];

export const WILLIAMS_ROWS = {
	R0: ["H", "FAM", "DIR", "TRI", "ECH", "FAC"],
	R1: ["FAM", "TRI", "H", "FAC", "DIR", "ECH"],
	R2: ["TRI", "FAC", "FAM", "ECH", "H", "DIR"],
	R3: ["FAC", "ECH", "TRI", "DIR", "FAM", "H"],
	R4: ["ECH", "DIR", "FAC", "H", "TRI", "FAM"],
	R5: ["DIR", "H", "ECH", "FAM", "FAC", "TRI"],
} as const;

export const PRODUCT_ASSIGNMENTS = Object.keys(WILLIAMS_ROWS).map(
	(rowId, index) => ({
		studyId: `P0${index + 1}`,
		cohortRole: "product" as const,
		rowId: rowId as keyof typeof WILLIAMS_ROWS,
	}),
);
export const VISUAL_ASSIGNMENTS = Array.from({ length: 5 }, (_, index) => ({
	studyId: `V0${index + 1}`,
	cohortRole: "visual-observer" as const,
	fixtureId: "gate0-visual-v1" as const,
}));
export const GATE0_ASSIGNMENTS = [
	...PRODUCT_ASSIGNMENTS,
	...VISUAL_ASSIGNMENTS,
] as const;

export const CONSENT =
	"This is a voluntary unpaid prototype study. We record only an anonymous study ID, task timing, choices, ratings, comments, and written screen-observation notes; no name or contact details, audio, or video. You may skip or stop at any time without consequence. Do you agree to participate and to this anonymous data collection?";
export const GATE0_SCRIPT = [
	CONSENT,
	"Product participants: You will review six unbranded versions in your assigned order. Begin the next assigned version. Choose one available action within 90 seconds without outside explanation.",
	"Answer the four immediate questions. Watch until the fixed consequence appears, then answer Replay. The 60-second neutral reset follows.",
	"After all six versions, rank all six with no ties.",
	"Visual observers: First activate Follow Mara as soon as you find it. Then watch silently until the 60-second prompt; do not open or use a raw event log, and do not ask for narration.",
	"At the prompt, answer only from what you observed, including the autonomy question.",
] as const;

export const GATE0_QUESTIONS = [
	{
		id: "desirable",
		prompt:
			"Desirable: Would you choose to keep playing this version now? [Yes/No]",
		responseType: "boolean",
	},
	{
		id: "continue",
		prompt:
			"Continue: Do you want to see what happens after this decision? [Yes/No]",
		responseType: "boolean",
	},
	{
		id: "prediction",
		prompt: "What consequence do you predict?",
		responseType: "string",
	},
	{
		id: "objection",
		prompt: "What was confusing or objectionable?",
		responseType: "string",
	},
	{
		id: "replay",
		prompt: "Replay: Would you replay this consequence now? [Yes/No]",
		responseType: "boolean",
	},
	{
		id: "final-rank",
		prompt:
			"Rank all six from 1 (most want to continue) to 6 (least), no ties.",
		responseType: "integer",
	},
	{ id: "point-mara", prompt: "Point to Mara.", responseType: "string" },
	{
		id: "activities",
		prompt: "Name what three citizens were doing.",
		responseType: "string",
	},
	{
		id: "interaction-change",
		prompt: "Which two interacted, and what changed?",
		responseType: "string",
	},
	{
		id: "autonomy",
		prompt: "Can you directly command Mara's movement or work? Why?",
		responseType: "string",
	},
] as const;
export const GATE0_ANCHORS = [
	{
		questionId: "final-rank",
		min: 1,
		max: 6,
		minLabel: "most want to continue",
		maxLabel: "least want to continue",
	},
] as const;
export const GATE0_TIMERS_MS = {
	variantDecision: 90_000,
	consequenceDelay: 45_000,
	consequenceView: 15_000,
	replayResponse: 15_000,
	neutralReset: 60_000,
	totalVariantSlot: 225_000,
	followFind: 10_000,
	observerPrompt: 60_000,
} as const;
export const OPERATOR_FOCUSED_MINUTES_CAP = 165;

const option = (token: string, label: string) => ({ token, label });
export const GATE0_OPTION_SETS = [
	{
		questionId: "point-mara",
		selection: "one",
		options: [
			option("citizen:mara", "Mara"),
			option("citizen:toma", "Toma"),
			option("citizen:iven", "Iven"),
			option("citizen:sera", "Sera"),
			option("citizen:nadi", "Nadi"),
			option("citizen:owen", "Owen"),
			option("citizen:bela", "Bela"),
			option("citizen:corin", "Corin"),
		],
	},
	{
		questionId: "activities",
		selection: "exactly-three",
		options: [
			option("activity:carry-water", "carrying water"),
			option("activity:eat-rations", "eating rations"),
			option("activity:gather-wood", "gathering wood"),
			option("activity:count-grain", "counting grain"),
			option("activity:repair-mill", "repairing the mill"),
			option("activity:exchange-rations", "exchanging wood and rations"),
			option("activity:check-ledger", "checking the public ledger"),
			option("activity:rest", "resting"),
		],
	},
	{
		questionId: "interaction-change",
		selection: "one",
		options: [
			option(
				"interaction:iven,toma|exchange-settled",
				"Iven and Toma exchanged wood and rations",
			),
			option(
				"interaction:iven,mara|reserve-verified",
				"Iven and Mara verified a reserve",
			),
			option(
				"interaction:mara,toma|trust-strained",
				"Mara and Toma's trust became strained",
			),
			option(
				"interaction:bela,corin|water-delivered",
				"Bela delivered water to Corin",
			),
			option("interaction:nadi,owen|wood-stored", "Nadi and Owen stored wood"),
			option(
				"interaction:sera,toma|rations-counted",
				"Sera and Toma counted rations",
			),
		],
	},
	{
		questionId: "autonomy",
		selection: "one",
		options: [
			option(
				"cannot-command|standing-plan",
				"No; she follows her visible Standing Plan and reasons",
			),
			option("cannot-command|random-system", "No; the system chooses randomly"),
			option("can-command|follow-button", "Yes; Follow Mara commands her"),
			option("can-command|citizen-card", "Yes; her citizen card commands her"),
		],
	},
] as const;

export const ADVICE_TOKENS = [
	"verify-private",
	"accuse-now",
	"abstain",
] as const;
export const INVALIDATION_REASONS = [
	"focus-loss",
	"visibility-loss",
	"navigation",
	"reload",
	"clock-reset",
	"fixture-mismatch",
	"operator-pause",
	"timer-delivery-overrun",
] as const;
export const OPERATOR_STATEMENT =
	"I attest eligibility, affirmative agreement, faithful administration, raw response and protocol-status entry, withdrawals, focused-minute categories excluding participant response and scheduling wait, and no replacement, scoring, PII, or recording.";
export const PRESENTATIONS = ["V1", "V2", "V3", "V4", "V5", "V6"] as const;

export type Gate0ObserverAnswerKey = Readonly<{
	mara: string;
	activities: string;
	interaction: string;
	autonomy: string;
}>;

export const CRITERION_KEYS = [
	"records-complete",
	"h-unique-rank",
	"h-desirable-4of6",
	"h-continue-4of6",
	"no-desirable-lead-20pp",
	"no-continue-lead-20pp",
	"observer-activity-interaction-3of5",
	"observer-autonomy-4of5",
] as const;

export const GATE0_ANALYZER_MOCKS = {
	keep: {
		rankSums: { H: 6, FAM: 12, TRI: 18, FAC: 24, ECH: 30, DIR: 36 },
		desirableCounts: { H: 4, FAM: 3, TRI: 3, FAC: 3, ECH: 3, DIR: 3 },
		continueCounts: { H: 4, FAM: 3, TRI: 3, FAC: 3, ECH: 3, DIR: 3 },
		expected: "PASS",
	},
	"all-zero-absolute-floor": {
		rankSums: { H: 6, FAM: 12, TRI: 18, FAC: 24, ECH: 30, DIR: 36 },
		desirableCounts: { H: 0, FAM: 0, TRI: 0, FAC: 0, ECH: 0, DIR: 0 },
		continueCounts: { H: 0, FAM: 0, TRI: 0, FAC: 0, ECH: 0, DIR: 0 },
		expected: "FAIL",
	},
	"comparative-reopen": {
		rankSums: { H: 6, FAM: 12, TRI: 18, FAC: 24, ECH: 30, DIR: 36 },
		desirableCounts: { H: 4, FAM: 6, TRI: 3, FAC: 3, ECH: 3, DIR: 3 },
		continueCounts: { H: 4, FAM: 3, TRI: 3, FAC: 3, ECH: 3, DIR: 3 },
		expected: "FAIL",
	},
} as const;
