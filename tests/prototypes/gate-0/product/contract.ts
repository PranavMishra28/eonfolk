export const TREATMENT_IDS = ["H", "FAM", "TRI", "FAC", "ECH", "DIR"] as const;
export type TreatmentId = (typeof TREATMENT_IDS)[number];

export const ACTION_IDS = ["verify-private", "accuse-now", "abstain"] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export const CITIZENS = [
	"Mara",
	"Toma",
	"Iven",
	"Sera",
	"Nadi",
	"Owen",
	"Bela",
	"Corin",
] as const;
export type CitizenName = (typeof CITIZENS)[number];
export type ChooserName = Exclude<CitizenName, "Bela" | "Corin">;

export const GATE_ZERO_TIMING = Object.freeze({
	decisionWindowMs: 90_000,
	consequenceDelayMs: 45_000,
	consequenceViewMs: 15_000,
	replayWindowMs: 15_000,
	neutralResetMs: 60_000,
	totalSlotMs: 225_000,
});

export const VISIBLE_FIXTURE = Object.freeze({
	place: "Riverhold market square",
	cast: CITIZENS,
	ledgerCount: 48,
	openBinCount: 36,
	reserveMismatch: 12,
	relationship: "Mara trusts Toma, who signed the latest reserve count.",
	publicJustification:
		"The public ledger and open reserve bin differ by 12 units, and Mara weighs accuracy against her trust in Toma.",
	facts: [
		"The public ledger lists 48 units in the reserve.",
		"The open reserve bin contains 36 units.",
		"Toma signed the latest reserve count.",
		"Mara trusts Toma.",
	],
});

export const ACTION_LABELS: Readonly<Record<ActionId, string>> = Object.freeze({
	"verify-private": "Ask Mara to verify the count privately",
	"accuse-now": "Ask Mara to accuse Toma now",
	abstain: "Offer no advice",
});

export type ScoreVector = readonly [
	verifyPrivate: number,
	accuseNow: number,
	abstain: number,
];

const SCORE_TABLE: Readonly<
	Record<ActionId, Readonly<Record<ChooserName, ScoreVector>>>
> = {
	"verify-private": {
		Mara: [9, 4, 3],
		Toma: [5, 2, 8],
		Iven: [8, 4, 5],
		Sera: [4, 9, 3],
		Nadi: [7, 5, 4],
		Owen: [3, 8, 4],
	},
	"accuse-now": {
		Mara: [8, 7, 3],
		Toma: [4, 9, 2],
		Iven: [4, 3, 8],
		Sera: [3, 8, 4],
		Nadi: [3, 4, 9],
		Owen: [9, 5, 3],
	},
	abstain: {
		Mara: [6, 2, 9],
		Toma: [8, 4, 5],
		Iven: [4, 3, 8],
		Sera: [9, 5, 4],
		Nadi: [3, 9, 5],
		Owen: [4, 8, 3],
	},
};

export type VotingRule =
	| "individual"
	| "family"
	| "trio"
	| "faction"
	| "direct";

export interface TreatmentDefinition {
	readonly id: TreatmentId;
	readonly participantFocus: string;
	readonly authorityDescription: string;
	readonly voters: readonly ChooserName[];
	readonly rule: VotingRule;
	readonly decisionOwner: "mara" | "household" | "trio" | "faction" | "player";
	readonly historyOwner: "mara" | "household" | "trio" | "faction" | "player";
	readonly postChoiceFocus: "Mara" | "Iven";
	readonly covenantCreated: false;
	readonly playerAuthorityAfter: "advice-only" | "direct";
}

export const TREATMENTS: Readonly<Record<TreatmentId, TreatmentDefinition>> = {
	H: {
		id: "H",
		participantFocus: "Follow Mara",
		authorityDescription: "Mara weighs the advice and chooses for herself.",
		voters: ["Mara"],
		rule: "individual",
		decisionOwner: "mara",
		historyOwner: "mara",
		postChoiceFocus: "Mara",
		covenantCreated: false,
		playerAuthorityAfter: "advice-only",
	},
	FAM: {
		id: "FAM",
		participantFocus: "Follow the household",
		authorityDescription: "Mara, Toma, Iven, and Sera choose as a household.",
		voters: ["Mara", "Toma", "Iven", "Sera"],
		rule: "family",
		decisionOwner: "household",
		historyOwner: "household",
		postChoiceFocus: "Mara",
		covenantCreated: false,
		playerAuthorityAfter: "advice-only",
	},
	TRI: {
		id: "TRI",
		participantFocus: "Follow the trio",
		authorityDescription:
			"Mara, Toma, and Iven choose as a three-person circle.",
		voters: ["Mara", "Toma", "Iven"],
		rule: "trio",
		decisionOwner: "trio",
		historyOwner: "trio",
		postChoiceFocus: "Mara",
		covenantCreated: false,
		playerAuthorityAfter: "advice-only",
	},
	FAC: {
		id: "FAC",
		participantFocus: "Follow the market group",
		authorityDescription: "Six citizens choose together by plurality.",
		voters: ["Mara", "Toma", "Iven", "Sera", "Nadi", "Owen"],
		rule: "faction",
		decisionOwner: "faction",
		historyOwner: "faction",
		postChoiceFocus: "Mara",
		covenantCreated: false,
		playerAuthorityAfter: "advice-only",
	},
	ECH: {
		id: "ECH",
		participantFocus: "Follow the current witness",
		authorityDescription:
			"Current lead Mara chooses; attention rotates to Iven afterward.",
		voters: ["Mara"],
		rule: "individual",
		decisionOwner: "mara",
		historyOwner: "mara",
		postChoiceFocus: "Iven",
		covenantCreated: false,
		playerAuthorityAfter: "advice-only",
	},
	DIR: {
		id: "DIR",
		participantFocus: "Guide Mara directly",
		authorityDescription:
			"The selected instruction is executed as a direct command.",
		voters: [],
		rule: "direct",
		decisionOwner: "player",
		historyOwner: "player",
		postChoiceFocus: "Mara",
		covenantCreated: false,
		playerAuthorityAfter: "direct",
	},
};

export const WILLIAMS_ROWS = [
	["H", "FAM", "DIR", "TRI", "ECH", "FAC"],
	["FAM", "TRI", "H", "FAC", "DIR", "ECH"],
	["TRI", "FAC", "FAM", "ECH", "H", "DIR"],
	["FAC", "ECH", "TRI", "DIR", "FAM", "H"],
	["ECH", "DIR", "FAC", "H", "TRI", "FAM"],
	["DIR", "H", "ECH", "FAM", "FAC", "TRI"],
] as const satisfies readonly (readonly TreatmentId[])[];

export const PARTICIPANT_ASSIGNMENTS = Object.freeze({
	P01: WILLIAMS_ROWS[0],
	P02: WILLIAMS_ROWS[1],
	P03: WILLIAMS_ROWS[2],
	P04: WILLIAMS_ROWS[3],
	P05: WILLIAMS_ROWS[4],
	P06: WILLIAMS_ROWS[5],
});

export interface TerminalState {
	readonly allocation: string;
	readonly chosenAction: ActionId;
	readonly ledgerStatus: string;
	readonly relationship: string;
	readonly verifiedBelief: string;
}

export interface TerminalOutcome {
	readonly state: TerminalState;
	readonly stateHash: string;
	readonly consequenceKey: string;
	readonly renderedConsequence: string;
}

export const TERMINAL_OUTCOMES: Readonly<Record<ActionId, TerminalOutcome>> = {
	"verify-private": {
		state: {
			allocation: "reserve-held",
			chosenAction: "verify-private",
			ledgerStatus: "reserve-verified",
			relationship: "mara-toma-trust-holds",
			verifiedBelief: "belief:reserve-verified",
		},
		stateHash:
			"326a92fb814dc8d5741da241ba019fe4f8d3be73c1f864614b5b3d344555fae3",
		consequenceKey: "gate-0.consequence.verify-private",
		renderedConsequence:
			"Mara and Iven recount privately. The reserve is verified, and Mara's trust in Toma holds.",
	},
	"accuse-now": {
		state: {
			allocation: "reserve-held-for-audit",
			chosenAction: "accuse-now",
			ledgerStatus: "public-audit-open",
			relationship: "mara-toma-strained",
			verifiedBelief: "belief:reserve-disputed",
		},
		stateHash:
			"5293876c21e45ee9c7fa987d42a66cc82609acd38d3c711f233505d695f67179",
		consequenceKey: "gate-0.consequence.accuse-now",
		renderedConsequence:
			"Mara accuses Toma in public. An audit opens, the reserve is held, and their relationship strains.",
	},
	abstain: {
		state: {
			allocation: "reserve-unchanged",
			chosenAction: "abstain",
			ledgerStatus: "ledger-uncertainty-remains",
			relationship: "mara-toma-trust-holds",
			verifiedBelief: "belief:reserve-unverified",
		},
		stateHash:
			"c36f5a776b521801571a9cda62a3060b2636ea1319d3e5e0d353956732b75b8a",
		consequenceKey: "gate-0.consequence.abstain",
		renderedConsequence:
			"Mara takes no public action. The reserve stays unchanged, trust holds, and the mismatch remains unresolved.",
	},
};

export type AdviceDisposition =
	| "accepted"
	| "delayed"
	| "rejected"
	| "reinterpreted"
	| "commanded";

export interface ChooserScore {
	readonly chooser: ChooserName;
	readonly scores: ScoreVector;
	readonly preferredAction: ActionId;
}

export interface TreatmentVector {
	readonly treatmentId: TreatmentId;
	readonly adviceInput: ActionId;
	readonly chooserScores: readonly ChooserScore[];
	readonly voteTotals: Readonly<Record<ActionId, number>>;
	readonly chosenAction: ActionId;
	readonly disposition: AdviceDisposition;
	readonly terminalState: TerminalState;
	readonly terminalStateHash: string;
	readonly renderedConsequenceKey: string;
}

export function terminalStateBytes(state: TerminalState): string {
	return JSON.stringify({
		allocation: state.allocation,
		chosenAction: state.chosenAction,
		ledgerStatus: state.ledgerStatus,
		relationship: state.relationship,
		verifiedBelief: state.verifiedBelief,
	});
}

function preferredAction(scores: ScoreVector): ActionId {
	let bestIndex = 0;
	for (let index = 1; index < scores.length; index += 1) {
		if (scores[index] > scores[bestIndex]) bestIndex = index;
	}
	return ACTION_IDS[bestIndex];
}

function breakWithMara(
	tied: readonly ActionId[],
	maraScores: ScoreVector,
): ActionId {
	return tied.reduce((best, candidate) => {
		const candidateScore = maraScores[ACTION_IDS.indexOf(candidate)];
		const bestScore = maraScores[ACTION_IDS.indexOf(best)];
		return candidateScore > bestScore ? candidate : best;
	});
}

function resolveVotes(
	treatment: TreatmentDefinition,
	adviceInput: ActionId,
	scores: readonly ChooserScore[],
	voteTotals: Readonly<Record<ActionId, number>>,
): ActionId {
	if (treatment.rule === "direct") return adviceInput;
	if (treatment.rule === "individual") return scores[0].preferredAction;

	const maximum = Math.max(...ACTION_IDS.map((action) => voteTotals[action]));
	const tied = ACTION_IDS.filter((action) => voteTotals[action] === maximum);
	if (tied.length === 1) return tied[0];
	if (treatment.rule === "trio") return tied[0];

	const mara = scores.find((score) => score.chooser === "Mara");
	if (!mara)
		throw new Error("Mara must participate in every collective treatment");
	return breakWithMara(tied, mara.scores);
}

function dispositionFor(
	adviceInput: ActionId,
	chosenAction: ActionId,
	direct: boolean,
): AdviceDisposition {
	if (direct) return "commanded";
	if (adviceInput === chosenAction) return "accepted";
	if (chosenAction === "abstain") return "delayed";
	if (adviceInput === "abstain") return "rejected";
	return "reinterpreted";
}

export function resolveTreatment(
	treatmentId: TreatmentId,
	adviceInput: ActionId,
): TreatmentVector {
	const treatment = TREATMENTS[treatmentId];
	const chooserScores = treatment.voters.map((chooser) => {
		const scores = SCORE_TABLE[adviceInput][chooser];
		return { chooser, scores, preferredAction: preferredAction(scores) };
	});
	const voteTotals = Object.fromEntries(
		ACTION_IDS.map((action) => [
			action,
			chooserScores.filter((score) => score.preferredAction === action).length,
		]),
	) as Record<ActionId, number>;
	const chosenAction = resolveVotes(
		treatment,
		adviceInput,
		chooserScores,
		voteTotals,
	);
	const terminal = TERMINAL_OUTCOMES[chosenAction];

	return {
		treatmentId,
		adviceInput,
		chooserScores,
		voteTotals,
		chosenAction,
		disposition: dispositionFor(
			adviceInput,
			chosenAction,
			treatment.rule === "direct",
		),
		terminalState: terminal.state,
		terminalStateHash: terminal.stateHash,
		renderedConsequenceKey: terminal.consequenceKey,
	};
}

export const TREATMENT_VECTORS = TREATMENT_IDS.flatMap((treatmentId) =>
	ACTION_IDS.map((adviceInput) => resolveTreatment(treatmentId, adviceInput)),
);

export const TREATMENT_SNAPSHOT = Object.freeze({
	treatmentContractVersion: "gate-0-treatments-v1",
	visibleFixture: VISIBLE_FIXTURE,
	timing: GATE_ZERO_TIMING,
	treatmentOrder: TREATMENT_IDS,
	counterbalance: WILLIAMS_ROWS,
	participantAssignments: PARTICIPANT_ASSIGNMENTS,
	treatments: TREATMENTS,
	vectors: TREATMENT_VECTORS,
});
