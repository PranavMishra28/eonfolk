import type { FlightRecorder } from "./recorder";
import type { DiagnosticIncident } from "./types";

export interface SentinelCheck {
	readonly invariant: string;
	readonly holds: boolean;
	readonly component: string;
	readonly code: string;
	readonly safeSummary: string;
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
		if (check.holds) return null;
		const trigger = this.#recorder.record({
			category: "sentinel",
			name: "invariant-violation",
			severity: "critical",
			outcome: "failed",
			scope: { component: check.component },
			fields: { code: check.code, invariant: check.invariant },
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
				invariant: check.invariant,
				recovery: recovered ? "recovered" : "safe-stop",
			},
		});
		return this.#recorder.freeze({
			reason: "invariant",
			trigger,
			safeSummary: check.safeSummary,
			recovery: recovered ? "recovered" : "safe-stop",
		});
	}
}
