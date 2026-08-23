import type { FlightRecorder } from "./recorder";
import type { DiagnosticIncident, IncidentSummaryCode } from "./types";

export type SentinelDomain =
	| "integrity"
	| "privacy"
	| "cognition"
	| "navigation"
	| "render"
	| "network"
	| "persistence";

export const SENTINEL_INVARIANTS = Object.freeze({
	"authoritative-runtime-available": "integrity",
	"world-head-agreement": "integrity",
	"diagnostic-redaction-bounded": "privacy",
	"actor-visible-cognition-only": "cognition",
	"navigation-reality-noninterference": "navigation",
	"render-reality-noninterference": "render",
	"network-egress-policy": "network",
	"persistence-head-continuity": "persistence",
} as const satisfies Readonly<Record<string, SentinelDomain>>);

export type SentinelInvariant = keyof typeof SENTINEL_INVARIANTS;

export interface SentinelCheck {
	readonly invariant: SentinelInvariant;
	readonly holds: boolean;
	readonly component: string;
	readonly code: string;
	readonly summaryCode: IncidentSummaryCode;
}

export class Sentinel {
	readonly #recorder: FlightRecorder;
	readonly #protectReality: () => void | Promise<void>;
	readonly #recover: (check: SentinelCheck) => boolean | Promise<boolean>;

	constructor(input: {
		readonly recorder: FlightRecorder;
		readonly protectReality: () => void | Promise<void>;
		readonly recover: (check: SentinelCheck) => boolean | Promise<boolean>;
	}) {
		this.#recorder = input.recorder;
		this.#protectReality = input.protectReality;
		this.#recover = input.recover;
	}

	async check(check: SentinelCheck): Promise<DiagnosticIncident | null> {
		if (!Object.hasOwn(SENTINEL_INVARIANTS, check.invariant))
			throw new TypeError("Sentinel invariant must use the closed catalog");
		if (check.holds) return null;
		const domain = SENTINEL_INVARIANTS[check.invariant];
		const trigger = this.#recorder.record({
			category: "sentinel",
			name: "invariant-violation",
			severity: "critical",
			outcome: "failed",
			scope: { component: check.component },
			fields: { code: check.code, domain, invariant: check.invariant },
		});
		if (!trigger)
			throw new Error(
				"Sentinel events must be retained in every diagnostics mode",
			);
		await this.#protectReality();
		let recovered = false;
		try {
			recovered = await this.#recover(check);
		} catch {
			recovered = false;
		}
		this.#recorder.record({
			category: "sentinel",
			name: "bounded-recovery",
			severity: recovered ? "warning" : "critical",
			outcome: recovered ? "recovered" : "failed",
			scope: { component: check.component },
			fields: {
				code: check.code,
				domain,
				invariant: check.invariant,
				recovery: recovered ? "recovered" : "safe-stop",
			},
		});
		return this.#recorder.freeze({
			reason: "invariant",
			trigger,
			summaryCode: check.summaryCode,
			recovery: recovered ? "recovered" : "safe-stop",
		});
	}
}
