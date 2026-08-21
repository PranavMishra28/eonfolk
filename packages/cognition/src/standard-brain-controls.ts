import {
	type DecisionContext,
	type PrngState,
	xoshiro128StarStar,
} from "../../protocol/src/index.js";

export type StandardBrainControlName =
	| "canonical-trajectory"
	| "reactive-nearest-need"
	| "seeded-legal-random";

export const STANDARD_BRAIN_EVALUATION_POLICIES = Object.freeze([
	"standard-brain",
	"canonical-trajectory",
	"reactive-nearest-need",
	"seeded-legal-random",
] as const);

export interface ControlDecision {
	readonly control: StandardBrainControlName;
	readonly actionId: string;
	readonly nextPrngState: PrngState;
}

function lexicographic(context: DecisionContext) {
	return [...context.actionCatalog].sort((left, right) =>
		left.actionId < right.actionId
			? -1
			: left.actionId > right.actionId
				? 1
				: 0,
	);
}

/** Named, executable controls used only for frozen comparative evaluation. */
export function chooseControlAction(input: {
	readonly control: StandardBrainControlName;
	readonly context: DecisionContext;
	readonly prngState: PrngState;
}): ControlDecision {
	if (input.context.actionCatalog.length === 0)
		throw new Error("ACTION_UNAVAILABLE");
	const ordered = lexicographic(input.context);
	if (input.control === "seeded-legal-random") {
		const draw = xoshiro128StarStar(input.prngState);
		return Object.freeze({
			control: input.control,
			actionId: ordered[draw.value % ordered.length]!.actionId,
			nextPrngState: draw.state,
		});
	}
	if (input.control === "canonical-trajectory") {
		const plan = ordered.find(
			({ action }) => action.kind === "FollowStandingPlan",
		);
		return Object.freeze({
			control: input.control,
			actionId: (plan ?? ordered[0]!).actionId,
			nextPrngState: input.prngState,
		});
	}
	// Deliberately myopic: react to counsel when available, otherwise choose the
	// lowest-risk legal action. It reads no values, commitments, or hidden facts.
	const counsel = ordered.find(
		({ counselAffinity }) => counselAffinity === input.context.counselIntent,
	);
	const selected =
		counsel ??
		[...ordered].sort(
			(left, right) =>
				left.risk - right.risk || (left.actionId < right.actionId ? -1 : 1),
		)[0]!;
	return Object.freeze({
		control: input.control,
		actionId: selected.actionId,
		nextPrngState: input.prngState,
	});
}

/** A byte-comparable terminal decision vector; it makes no world-state claim. */
export function terminalDecisionVector(input: {
	readonly context: DecisionContext;
	readonly actionId: string;
}): Readonly<{
	actorId: string;
	revision: number;
	actionId: string;
	actionKind: string;
}> {
	const entry = input.context.actionCatalog.find(
		({ actionId }) => actionId === input.actionId,
	);
	if (entry === undefined) throw new Error("ACTION_UNAVAILABLE");
	return Object.freeze({
		actorId: input.context.actorId,
		revision: input.context.revision,
		actionId: entry.actionId,
		actionKind: entry.action.kind,
	});
}
