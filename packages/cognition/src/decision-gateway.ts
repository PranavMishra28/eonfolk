import type {
	DecisionContext,
	IntentProposal,
} from "../../protocol/src/index.js";
import type { BrainPort } from "./brain-port.js";

export type ProposalValidation = "accepted" | "ACTION_UNAVAILABLE";
export type PrimaryFailure = "timeout" | "threw" | "invalid";

export interface DecisionGatewayResult {
	readonly proposal: IntentProposal;
	readonly selectedSource: "primary" | "deterministic-fallback";
	readonly primaryFailure: PrimaryFailure | null;
	readonly primaryAttempts: number;
}

export interface DecisionGatewayInput {
	readonly context: DecisionContext;
	readonly primary: BrainPort | null;
	readonly deterministicFallback: () => Promise<IntentProposal>;
	readonly validate: (
		context: DecisionContext,
		proposal: unknown,
	) => Promise<ProposalValidation>;
	readonly primaryTimeoutMilliseconds: number;
}

function assertTimeout(value: number): void {
	if (!Number.isSafeInteger(value) || value < 1 || value > 120_000) {
		throw new RangeError("primary timeout is outside the bounded range");
	}
}

function thrownFailure(error: unknown): PrimaryFailure {
	return typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { readonly code?: unknown }).code === "timeout"
		? "timeout"
		: "threw";
}

async function proposeWithinTimeout(
	brain: BrainPort,
	context: DecisionContext,
	timeoutMilliseconds: number,
): Promise<
	| { readonly kind: "proposal"; readonly value: unknown }
	| { readonly kind: "timeout" }
> {
	const controller = new AbortController();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			brain
				.propose(context, controller.signal)
				.then((value) => ({ kind: "proposal" as const, value })),
			new Promise<{ readonly kind: "timeout" }>((resolve) => {
				timeout = setTimeout(() => {
					controller.abort("decision-timeout");
					resolve({ kind: "timeout" });
				}, timeoutMilliseconds);
			}),
		]);
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
	}
}

async function validatedFallback(
	input: DecisionGatewayInput,
): Promise<IntentProposal> {
	const proposal = await input.deterministicFallback();
	if ((await input.validate(input.context, proposal)) !== "accepted") {
		throw new Error("deterministic fallback violated the proposal contract");
	}
	return proposal;
}

/**
 * The sole post-cognition authority gate. An untrusted primary may propose one
 * bounded action, but only an accepted typed proposal can escape. Any timeout,
 * throw, or validation failure selects the deterministic fallback.
 */
export async function runDecisionGateway(
	input: DecisionGatewayInput,
): Promise<DecisionGatewayResult> {
	assertTimeout(input.primaryTimeoutMilliseconds);
	if (input.primary === null) {
		return {
			proposal: await validatedFallback(input),
			selectedSource: "deterministic-fallback",
			primaryFailure: null,
			primaryAttempts: 0,
		};
	}

	let proposed:
		| { readonly kind: "proposal"; readonly value: unknown }
		| { readonly kind: "timeout" };
	try {
		proposed = await proposeWithinTimeout(
			input.primary,
			input.context,
			input.primaryTimeoutMilliseconds,
		);
	} catch (error) {
		return {
			proposal: await validatedFallback(input),
			selectedSource: "deterministic-fallback",
			primaryFailure: thrownFailure(error),
			primaryAttempts: 1,
		};
	}
	if (proposed.kind === "timeout") {
		return {
			proposal: await validatedFallback(input),
			selectedSource: "deterministic-fallback",
			primaryFailure: "timeout",
			primaryAttempts: 1,
		};
	}
	if ((await input.validate(input.context, proposed.value)) !== "accepted") {
		return {
			proposal: await validatedFallback(input),
			selectedSource: "deterministic-fallback",
			primaryFailure: "invalid",
			primaryAttempts: 1,
		};
	}
	return {
		proposal: proposed.value as IntentProposal,
		selectedSource: "primary",
		primaryFailure: null,
		primaryAttempts: 1,
	};
}
