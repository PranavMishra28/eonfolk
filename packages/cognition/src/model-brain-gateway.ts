import type { CivilizationSchedulerDecisionGateway } from "./civilization-scheduler-brain.js";
import { runDecisionGateway } from "./decision-gateway.js";
import { validateIntentProposal } from "./standard-brain.js";

/**
 * Product-path Model Brain gate: try a host primary when one exists, otherwise
 * Standard Brain. Never writes Reality. Replay must use recorded decisions.
 */
export function standardFallbackModelGateway(): CivilizationSchedulerDecisionGateway {
	return async ({ context, deterministicFallback }) =>
		runDecisionGateway({
			context,
			primary: null,
			primaryUnavailable: true,
			deterministicFallback,
			validate: async (decisionContext, proposal) =>
				validateIntentProposal(decisionContext, proposal),
			primaryTimeoutMilliseconds: 1_000,
		});
}
