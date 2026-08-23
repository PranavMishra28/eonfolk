import type { DecisionContext } from "../../protocol/src/index.js";
import type { LocalProcessBrainContract } from "./experiment.js";

/** Future proposal-source shape only; Founder Alpha ships no executable adapter. */
export interface BrainPort {
	propose(context: DecisionContext, signal?: AbortSignal): Promise<unknown>;
}

/** Contract-only seam. No subprocess, model, download, or network is provided. */
export interface LocalProcessBrainPort extends BrainPort {
	readonly kind: "local-process-model";
	readonly contract: LocalProcessBrainContract;
}
