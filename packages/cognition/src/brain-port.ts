import type {
	CognitiveAttemptProvenance,
	DecisionContext,
	IntentProposal,
} from "../../protocol/src/index.js";
import type { LocalProcessBrainContract } from "./experiment.js";

/** Provider-neutral proposal source; process authority remains outside cognition. */
export interface BrainPort {
	propose(context: DecisionContext, signal?: AbortSignal): Promise<unknown>;
	/** Provider identity available even when an invocation times out or cancels. */
	describeAttempt?(): Promise<CognitiveAttemptProvenance>;
}

/** Safe audit metadata attached to a failed provider attempt. */
export interface BrainAttemptFailure extends Error {
	readonly code: string;
	readonly attemptedProvenance?: CognitiveAttemptProvenance | undefined;
	readonly outputHash?: string | null | undefined;
}

export interface IntentProposalBrainPort extends BrainPort {
	propose(
		context: DecisionContext,
		signal?: AbortSignal,
	): Promise<IntentProposal>;
}

/** Contract-bearing seam. The host owns any optional executable transport. */
export interface LocalProcessBrainPort extends BrainPort {
	readonly kind: "local-process-model";
	readonly contract: LocalProcessBrainContract;
}
