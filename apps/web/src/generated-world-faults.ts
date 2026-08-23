import type { CivilizationExperimentRun } from "@eonfolk/civilization";
import {
	type CivilizationSchedulerDecisionGateway,
	runDecisionGateway,
	validateIntentProposal,
} from "@eonfolk/cognition";
import { GENERATED_FOLK_BINARY_ASSET } from "./generated-presentation/assets";
import type { GeneratedWorldBuildOptions } from "./generated-world-runtime";
import type { BrowserPersistenceBoundaryPoint } from "./persistence/browser-versioned";

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
			"The proxy reference failed byte and manifest integrity checks. Canonical actions do not depend on that reference.",
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

export function injectGeneratedRendererContextLoss(): () => void {
	let frame = 0;
	let cancelled = false;
	const attempt = () => {
		if (cancelled) return;
		const canvas = document.querySelector<HTMLCanvasElement>(
			".generated-world-canvas canvas",
		);
		if (canvas === null) {
			frame = requestAnimationFrame(attempt);
			return;
		}
		frame = requestAnimationFrame(() => {
			if (cancelled) return;
			const extension = canvas
				.getContext("webgl2")
				?.getExtension("WEBGL_lose_context");
			extension?.loseContext();
			canvas.dispatchEvent(
				new Event("webglcontextlost", { bubbles: false, cancelable: true }),
			);
		});
	};
	frame = requestAnimationFrame(attempt);
	return () => {
		cancelled = true;
		cancelAnimationFrame(frame);
	};
}

export function generatedWorldBuildOptionsForFault(
	fault: GeneratedWorldFaultSpec | null,
): GeneratedWorldBuildOptions {
	if (fault === null) return Object.freeze({});
	switch (fault.kind) {
		case "model-provider": {
			let firstAttempt = true;
			const primary = Object.freeze({
				propose: (_context: unknown, signal?: AbortSignal) => {
					if (!firstAttempt)
						return Promise.reject(
							new Error("Injected cognition provider unavailable"),
						);
					firstAttempt = false;
					return new Promise((resolve) => {
						const late = globalThis.setTimeout(
							() => resolve(Object.freeze({ late: true })),
							150,
						);
						signal?.addEventListener(
							"abort",
							() => {
								// The gateway must discard this late result without mutation.
								void late;
							},
							{ once: true },
						);
					});
				},
			});
			let attempts = 0;
			let fallbacks = 0;
			let actorVisible = 0;
			let hiddenLeaks = 0;
			const failures: string[] = [];
			const kinds: string[] = [];
			const decisionGateway: CivilizationSchedulerDecisionGateway = async ({
				context,
				deterministicFallback,
			}) => {
				const boundary = await runDecisionGateway({
					context,
					primary,
					deterministicFallback,
					validate: validateIntentProposal,
					primaryTimeoutMilliseconds: 20,
				});
				attempts += boundary.primaryAttempts;
				if (boundary.selectedSource === "deterministic-fallback")
					fallbacks += 1;
				if (boundary.primaryFailure !== null)
					failures.push(boundary.primaryFailure);
				kinds.push(boundary.proposal.provenance.cognitionKind);
				if (
					context.visibleRecords.every(
						(record) => record.subjectCitizenId === context.actorId,
					)
				)
					actorVisible += 1;
				if ("hiddenRecords" in (context as object)) hiddenLeaks += 1;
				const dataset = globalThis.document?.documentElement.dataset;
				if (dataset !== undefined) {
					dataset.faultCognitionProviderAttempts = String(attempts);
					dataset.faultCognitionFallbacks = String(fallbacks);
					dataset.faultCognitionPrimaryFailures = failures.join(",");
					dataset.faultCognitionKinds = kinds.join(",");
					dataset.faultCognitionActorVisibleContexts = String(actorVisible);
					dataset.faultCognitionHiddenFieldLeaks = String(hiddenLeaks);
				}
				return boundary;
			};
			return Object.freeze({
				cognition: Object.freeze({
					decisionGateway,
				}),
			});
		}
		case "persistence":
			return Object.freeze({
				persistenceBoundaryInjector:
					generatedPersistenceBoundaryFailure("open"),
			});
		case "checkpoint":
			return Object.freeze({
				checkpointTransform: (checkpoint: CivilizationExperimentRun) => {
					recordCandidateCheckpoint();
					return Object.freeze({
						...checkpoint,
						finalStateHash: "0".repeat(64),
					});
				},
			});
		case "authoritative-invariant":
			return Object.freeze({
				checkpointTransform: (checkpoint: CivilizationExperimentRun) => {
					recordCandidateCheckpoint();
					return Object.freeze({
						...checkpoint,
						metrics: Object.freeze({
							...checkpoint.metrics,
							invariantIssues: Object.freeze([
								"injected-pre-commit-authority-invariant",
							]),
						}),
					});
				},
			});
		case "latency":
			return Object.freeze({
				beforeAuthorityAdvance: () =>
					new Promise<void>((resolve) => globalThis.setTimeout(resolve, 1_200)),
			});
		case "asset":
		case "navigation":
		case "renderer-webgl":
			return Object.freeze({});
	}
}

function recordCandidateCheckpoint(): void {
	const dataset = globalThis.document?.documentElement.dataset;
	if (dataset === undefined) return;
	dataset.faultCandidateCheckpoints = String(
		Number(dataset.faultCandidateCheckpoints ?? "0") + 1,
	);
}

export function generatedPersistenceBoundaryFailure(
	point: BrowserPersistenceBoundaryPoint,
): Readonly<{ hit(candidate: BrowserPersistenceBoundaryPoint): void }> {
	return Object.freeze({
		hit(candidate: BrowserPersistenceBoundaryPoint) {
			if (candidate === point)
				throw new Error(`Injected IndexedDB ${point} boundary failure`);
		},
	});
}

export function generatedWorldAssetFetcherForFault(
	fault: GeneratedWorldFaultSpec | null,
	fetcher: typeof fetch = globalThis.fetch,
): typeof fetch {
	if (fault?.kind !== "asset") return fetcher;
	return async (input, init) => {
		const response = await fetcher(input, init);
		if (!String(input).endsWith(GENERATED_FOLK_BINARY_ASSET.url))
			return response;
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (bytes.length > 0) bytes[0] = (bytes[0] ?? 0) ^ 1;
		return new Response(bytes, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
}

export function generatedWorldPresentationFault(
	fault: GeneratedWorldFaultSpec | null,
	kind: "asset" | "renderer-webgl" | "navigation",
): boolean {
	return fault?.kind === kind;
}
