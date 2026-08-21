import type {
	DecisionContext,
	IntentProposal,
	PrngState,
} from "../../protocol/src/index.js";
import type { LocalProcessBrainContract } from "./experiment.js";
import { standardBrain, validateIntentProposal } from "./standard-brain.js";

export interface BrainPort {
	propose(context: DecisionContext): Promise<unknown>;
}

/** Contract-only seam. No subprocess, model, download, or network is provided. */
export interface LocalProcessBrainPort extends BrainPort {
	readonly kind: "local-process-model";
	readonly contract: LocalProcessBrainContract;
}

export type AdapterFailure = "missing" | "timeout" | "malformed" | "throwing";

export async function decideWithDeterministicFallback(input: {
	readonly context: DecisionContext;
	readonly proposalId: string;
	readonly prngState: PrngState;
	readonly optionalBrain?: BrainPort;
	readonly forcedFailure?: "timeout";
}): Promise<{
	readonly proposal: IntentProposal;
	readonly nextPrngState: PrngState;
	readonly fallbackReason: AdapterFailure | null;
	readonly adapterInvocations: 0 | 1;
}> {
	if (input.optionalBrain === undefined) {
		const result = await standardBrain(input.context, {
			proposalId: input.proposalId,
			prngState: input.prngState,
		});
		return { ...result, fallbackReason: "missing", adapterInvocations: 0 };
	}
	if (input.forcedFailure === "timeout") {
		const result = await standardBrain(input.context, {
			proposalId: input.proposalId,
			prngState: input.prngState,
		});
		return { ...result, fallbackReason: "timeout", adapterInvocations: 0 };
	}
	try {
		const candidate = await input.optionalBrain.propose(input.context);
		if (
			typeof candidate === "object" &&
			candidate !== null &&
			(await validateIntentProposal(
				input.context,
				candidate as IntentProposal,
			)) === "accepted"
		) {
			return {
				proposal: candidate as IntentProposal,
				nextPrngState: input.prngState,
				fallbackReason: null,
				adapterInvocations: 1,
			};
		}
		const result = await standardBrain(input.context, {
			proposalId: input.proposalId,
			prngState: input.prngState,
		});
		return { ...result, fallbackReason: "malformed", adapterInvocations: 1 };
	} catch {
		const result = await standardBrain(input.context, {
			proposalId: input.proposalId,
			prngState: input.prngState,
		});
		return { ...result, fallbackReason: "throwing", adapterInvocations: 1 };
	}
}
