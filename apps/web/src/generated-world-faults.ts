import type { GeneratedWorldBuildOptions } from "./generated-world-runtime";

export const GENERATED_WORLD_FAULT_STORAGE_KEY =
	"eonfolk:e2e-generated-world-fault-v1";

export const GENERATED_WORLD_FAULT_KINDS = Object.freeze([
	"model-provider",
	"persistence",
	"checkpoint",
	"renderer-webgl",
	"asset",
	"navigation",
	"authoritative-invariant",
	"latency",
] as const);

export type GeneratedWorldFaultKind =
	(typeof GENERATED_WORLD_FAULT_KINDS)[number];

export interface GeneratedWorldFaultSpec {
	readonly kind: GeneratedWorldFaultKind;
	readonly code: string;
	readonly disposition: "degraded" | "fail-closed" | "pending" | "rejected";
	readonly message: string;
}

const FAULT_SPECS: Readonly<
	Record<GeneratedWorldFaultKind, GeneratedWorldFaultSpec>
> = Object.freeze({
	"model-provider": Object.freeze({
		kind: "model-provider",
		code: "GENERATED_MODEL_PROVIDER_UNAVAILABLE",
		disposition: "degraded",
		message:
			"External cognition is unavailable. The deterministic Standard Brain remains authoritative.",
	}),
	persistence: Object.freeze({
		kind: "persistence",
		code: "GENERATED_PERSISTENCE_UNAVAILABLE",
		disposition: "degraded",
		message:
			"Local persistence is unavailable. This deterministic view is usable, but this session will not save a checkpoint.",
	}),
	checkpoint: Object.freeze({
		kind: "checkpoint",
		code: "GENERATED_CHECKPOINT_REJECTED",
		disposition: "fail-closed",
		message:
			"The local checkpoint did not pass verification. No checkpoint-derived facts are being shown.",
	}),
	"renderer-webgl": Object.freeze({
		kind: "renderer-webgl",
		code: "GENERATED_RENDERER_UNAVAILABLE",
		disposition: "degraded",
		message:
			"The embodied renderer is unavailable. The same canonical world remains usable in semantic form.",
	}),
	asset: Object.freeze({
		kind: "asset",
		code: "GENERATED_ASSET_REJECTED",
		disposition: "degraded",
		message:
			"The generated proxy asset was rejected. Canonical world actions remain usable without it.",
	}),
	navigation: Object.freeze({
		kind: "navigation",
		code: "GENERATED_NAVIGATION_REJECTED",
		disposition: "rejected",
		message:
			"A malformed navigation intent was rejected. World authority and the current view were not changed.",
	}),
	"authoritative-invariant": Object.freeze({
		kind: "authoritative-invariant",
		code: "GENERATED_AUTHORITY_INVARIANT_FAILED",
		disposition: "fail-closed",
		message:
			"An authoritative invariant failed. No incomplete world is being shown as fact.",
	}),
	latency: Object.freeze({
		kind: "latency",
		code: "GENERATED_AUTHORITY_PENDING",
		disposition: "pending",
		message:
			"Canonical reality is still advancing. World facts remain hidden until the authoritative result is complete.",
	}),
});

export class GeneratedWorldFaultBoundaryError extends Error {
	readonly fault: GeneratedWorldFaultSpec;

	constructor(fault: GeneratedWorldFaultSpec) {
		super(fault.message);
		this.name = "GeneratedWorldFaultBoundaryError";
		this.fault = fault;
	}
}

export function parseGeneratedWorldFault(
	value: unknown,
): GeneratedWorldFaultSpec | null {
	if (
		typeof value !== "string" ||
		!GENERATED_WORLD_FAULT_KINDS.includes(value as GeneratedWorldFaultKind)
	)
		return null;
	return FAULT_SPECS[value as GeneratedWorldFaultKind];
}

function hooksEnabled(): boolean {
	return (
		typeof __EONFOLK_E2E_CRASH_HOOKS__ !== "undefined" &&
		__EONFOLK_E2E_CRASH_HOOKS__
	);
}

export function readGeneratedWorldFault(
	storage?: Pick<Storage, "getItem"> | null,
	enabled = hooksEnabled(),
): GeneratedWorldFaultSpec | null {
	if (!enabled) return null;
	try {
		const source =
			storage === undefined
				? typeof window === "undefined"
					? null
					: window.sessionStorage
				: storage;
		if (source === null) return null;
		return parseGeneratedWorldFault(
			source.getItem(GENERATED_WORLD_FAULT_STORAGE_KEY),
		);
	} catch {
		return null;
	}
}

export function clearGeneratedWorldFault(
	storage?: Pick<Storage, "removeItem"> | null,
): void {
	try {
		const target =
			storage === undefined
				? typeof window === "undefined"
					? null
					: window.sessionStorage
				: storage;
		target?.removeItem(GENERATED_WORLD_FAULT_STORAGE_KEY);
	} catch {
		// A blocked storage API cannot weaken the fail-closed boundary.
	}
}

export function generatedWorldBuildOptionsForFault(
	fault: GeneratedWorldFaultSpec | null,
): GeneratedWorldBuildOptions {
	return fault?.kind === "persistence"
		? Object.freeze({ indexedDbFactory: null })
		: Object.freeze({});
}

export async function applyGeneratedWorldAuthorityFault<T>(
	promise: Promise<T>,
	fault: GeneratedWorldFaultSpec | null,
	latencyMs = 1_200,
): Promise<T> {
	if (fault?.kind === "latency")
		await new Promise<void>((resolve) =>
			globalThis.setTimeout(resolve, latencyMs),
		);
	const value = await promise;
	if (fault?.kind === "checkpoint" || fault?.kind === "authoritative-invariant")
		throw new GeneratedWorldFaultBoundaryError(fault);
	return value;
}

export function generatedWorldPresentationFault(
	fault: GeneratedWorldFaultSpec | null,
	kind: "asset" | "renderer-webgl" | "navigation",
): boolean {
	return fault?.kind === kind;
}
