import type {
	CognitiveAttemptProvenance,
	DecisionContext,
	IntentProposal,
	PrimaryAttemptDisposition,
} from "../../protocol/src/index.js";
import { COGNITION_VERSION } from "../../protocol/src/index.js";
import type { BrainPort } from "./brain-port.js";

export type ProposalValidation = "accepted" | "ACTION_UNAVAILABLE";
export type PrimaryFailure = Exclude<
	PrimaryAttemptDisposition,
	"not-attempted" | "accepted"
>;

export interface PrimaryAttemptEvidence {
	readonly disposition: PrimaryAttemptDisposition;
	readonly provenance: CognitiveAttemptProvenance | null;
	readonly proposal: IntentProposal | null;
	readonly outputHash: string | null;
}

export interface DecisionGatewayResult {
	readonly proposal: IntentProposal;
	readonly selectedSource: "primary" | "deterministic-fallback";
	readonly primaryFailure: PrimaryFailure | null;
	readonly primaryAttempts: number;
	readonly primaryAttempt: PrimaryAttemptEvidence;
	readonly acceptedFallback: IntentProposal | null;
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
	/** Distinguishes an explicitly requested but unavailable provider from default play. */
	readonly primaryUnavailable?: boolean;
	readonly primaryUnavailableProvenance?: CognitiveAttemptProvenance;
	readonly signal?: AbortSignal;
}

function assertTimeout(value: number): void {
	if (!Number.isSafeInteger(value) || value < 1 || value > 120_000) {
		throw new RangeError("primary timeout is outside the bounded range");
	}
}

function failureCode(error: unknown): PrimaryFailure {
	const code =
		typeof error === "object" && error !== null && "code" in error
			? (error as { readonly code?: unknown }).code
			: null;
	if (code === "timeout") return "timeout";
	if (code === "malformed" || code === "malformed-output") return "malformed";
	if (code === "invalid") return "invalid";
	if (code === "aborted" || code === "cancelled") return "cancelled";
	if (
		code === "artifact-mismatch" ||
		code === "process-failed" ||
		code === "unsupported-host" ||
		code === "provider-unavailable"
	)
		return "provider-unavailable";
	return "threw";
}

function sanitizeAttemptProvenance(
	value: unknown,
): CognitiveAttemptProvenance | null {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return null;
	const record = value as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	if (
		record.cognitionKind === "standard-brain" &&
		keys.join(",") === "cognitionKind,cognitionVersion" &&
		record.cognitionVersion === COGNITION_VERSION
	)
		return {
			cognitionKind: "standard-brain",
			cognitionVersion: COGNITION_VERSION,
		};
	const modelKeys = [
		"artifactHash",
		"cognitionKind",
		"cognitionVersion",
		"model",
		"modelVersion",
		"promptTemplateHash",
		"proposalSchemaHash",
		"provider",
	].sort();
	const boundedLabel = (candidate: unknown): candidate is string =>
		typeof candidate === "string" &&
		candidate.length >= 1 &&
		candidate.length <= 128 &&
		candidate === candidate.normalize("NFC") &&
		![...candidate].some((character) => {
			const code = character.codePointAt(0);
			return code !== undefined && (code <= 0x1f || code === 0x7f);
		});
	const digest = (candidate: unknown): candidate is string =>
		typeof candidate === "string" && /^[0-9a-f]{64}$/u.test(candidate);
	if (
		record.cognitionKind !== "model" ||
		record.cognitionVersion !== COGNITION_VERSION ||
		keys.length !== modelKeys.length ||
		keys.some((key, index) => key !== modelKeys[index]) ||
		!boundedLabel(record.provider) ||
		!boundedLabel(record.model) ||
		!boundedLabel(record.modelVersion) ||
		!digest(record.promptTemplateHash) ||
		!digest(record.proposalSchemaHash) ||
		!(record.artifactHash === null || digest(record.artifactHash))
	)
		return null;
	return {
		cognitionKind: "model",
		cognitionVersion: COGNITION_VERSION,
		provider: record.provider,
		model: record.model,
		modelVersion: record.modelVersion,
		promptTemplateHash: record.promptTemplateHash,
		proposalSchemaHash: record.proposalSchemaHash,
		artifactHash: record.artifactHash,
	};
}

function attemptedProvenance(
	error: unknown,
): CognitiveAttemptProvenance | null {
	if (
		typeof error !== "object" ||
		error === null ||
		!("attemptedProvenance" in error)
	)
		return null;
	return sanitizeAttemptProvenance(
		(error as { readonly attemptedProvenance?: unknown }).attemptedProvenance,
	);
}

function attemptedOutputHash(error: unknown): string | null {
	if (typeof error !== "object" || error === null || !("outputHash" in error))
		return null;
	const value = (error as { readonly outputHash?: unknown }).outputHash;
	return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value)
		? value
		: null;
}

async function proposeWithinTimeout(
	brain: BrainPort,
	context: DecisionContext,
	timeoutMilliseconds: number,
	externalSignal?: AbortSignal,
): Promise<
	| { readonly kind: "proposal"; readonly value: unknown }
	| { readonly kind: "timeout" }
	| { readonly kind: "cancelled" }
> {
	const controller = new AbortController();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	let removeExternalAbort: (() => void) | undefined;
	try {
		const races: Array<
			Promise<
				| { readonly kind: "proposal"; readonly value: unknown }
				| { readonly kind: "timeout" }
				| { readonly kind: "cancelled" }
			>
		> = [
			brain
				.propose(context, controller.signal)
				.then((value) => ({ kind: "proposal" as const, value })),
			new Promise<{ readonly kind: "timeout" }>((resolve) => {
				timeout = setTimeout(() => {
					controller.abort("decision-timeout");
					resolve({ kind: "timeout" });
				}, timeoutMilliseconds);
			}),
		];
		if (externalSignal !== undefined) {
			races.push(
				new Promise<{ readonly kind: "cancelled" }>((resolve) => {
					const abort = () => {
						controller.abort("decision-cancelled");
						resolve({ kind: "cancelled" });
					};
					if (externalSignal.aborted) abort();
					else {
						externalSignal.addEventListener("abort", abort, { once: true });
						removeExternalAbort = () =>
							externalSignal.removeEventListener("abort", abort);
					}
				}),
			);
		}
		return await Promise.race(races);
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
		removeExternalAbort?.();
	}
}

function proposalProvenance(value: unknown): CognitiveAttemptProvenance | null {
	if (typeof value !== "object" || value === null || !("provenance" in value))
		return null;
	const provenance = (value as { readonly provenance?: unknown }).provenance;
	return sanitizeAttemptProvenance(provenance);
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

async function declaredAttemptProvenance(
	brain: BrainPort,
): Promise<CognitiveAttemptProvenance | null> {
	if (brain.describeAttempt === undefined) return null;
	try {
		return sanitizeAttemptProvenance(await brain.describeAttempt());
	} catch {
		return null;
	}
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
		const proposal = await validatedFallback(input);
		const disposition = input.primaryUnavailable
			? "provider-unavailable"
			: "not-attempted";
		return {
			proposal,
			selectedSource: "deterministic-fallback",
			primaryFailure:
				disposition === "provider-unavailable" ? disposition : null,
			primaryAttempts: 0,
			primaryAttempt: {
				disposition,
				provenance: sanitizeAttemptProvenance(
					input.primaryUnavailableProvenance,
				),
				proposal: null,
				outputHash: null,
			},
			acceptedFallback: proposal,
		};
	}

	let proposed:
		| { readonly kind: "proposal"; readonly value: unknown }
		| { readonly kind: "timeout" }
		| { readonly kind: "cancelled" };
	const declaredProvenance = await declaredAttemptProvenance(input.primary);
	try {
		proposed = await proposeWithinTimeout(
			input.primary,
			input.context,
			input.primaryTimeoutMilliseconds,
			input.signal,
		);
	} catch (error) {
		const proposal = await validatedFallback(input);
		const disposition = failureCode(error);
		return {
			proposal,
			selectedSource: "deterministic-fallback",
			primaryFailure: disposition,
			primaryAttempts: 1,
			primaryAttempt: {
				disposition,
				provenance: attemptedProvenance(error) ?? declaredProvenance,
				proposal: null,
				outputHash: attemptedOutputHash(error),
			},
			acceptedFallback: proposal,
		};
	}
	if (proposed.kind === "timeout" || proposed.kind === "cancelled") {
		const proposal = await validatedFallback(input);
		const disposition = proposed.kind;
		return {
			proposal,
			selectedSource: "deterministic-fallback",
			primaryFailure: disposition,
			primaryAttempts: 1,
			primaryAttempt: {
				disposition,
				provenance: declaredProvenance,
				proposal: null,
				outputHash: null,
			},
			acceptedFallback: proposal,
		};
	}
	if ((await input.validate(input.context, proposed.value)) !== "accepted") {
		const proposal = await validatedFallback(input);
		return {
			proposal,
			selectedSource: "deterministic-fallback",
			primaryFailure: "invalid",
			primaryAttempts: 1,
			primaryAttempt: {
				disposition: "invalid",
				provenance: proposalProvenance(proposed.value) ?? declaredProvenance,
				proposal: null,
				outputHash: null,
			},
			acceptedFallback: proposal,
		};
	}
	const proposal = proposed.value as IntentProposal;
	return {
		proposal,
		selectedSource: "primary",
		primaryFailure: null,
		primaryAttempts: 1,
		primaryAttempt: {
			disposition: "accepted",
			provenance: proposal.provenance,
			proposal,
			outputHash:
				proposal.provenance.cognitionKind === "model"
					? proposal.provenance.artifactHash
					: null,
		},
		acceptedFallback: null,
	};
}
