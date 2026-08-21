import {
	type DiagnosticIncident,
	type DiagnosticInput,
	type DiagnosticMode,
	FlightRecorder,
	projectLocalObserver,
	Sentinel,
	type WorldHeadSummary,
} from "@eonfolk/diagnostics";

function configuredMode(): DiagnosticMode {
	if (typeof __EONFOLK_DIAGNOSTICS_MODE__ === "string") {
		return __EONFOLK_DIAGNOSTICS_MODE__;
	}
	return "off";
}

export class BrowserDiagnostics {
	readonly #recorder: FlightRecorder;
	#incidents: DiagnosticIncident[] = [];
	#worldHead: WorldHeadSummary | null = null;

	constructor(mode: DiagnosticMode = configuredMode()) {
		let fallbackTick = 0;
		this.#recorder = new FlightRecorder({
			mode,
			now: () => {
				const measured = globalThis.performance?.now();
				if (measured !== undefined) return Math.max(0, Math.floor(measured));
				return fallbackTick++;
			},
			maximumEvents: mode === "off" ? 64 : 512,
			maximumBytes: mode === "off" ? 32 * 1024 : 256 * 1024,
		});
	}

	get mode(): DiagnosticMode {
		return this.#recorder.mode;
	}

	enableAlphaCapture(): void {
		this.#recorder.setMode("alpha");
		this.record({
			category: "ui",
			name: "alpha-capture-consent",
			severity: "info",
			outcome: "accepted",
			scope: { component: "feedback" },
			fields: { mode: "alpha" },
		});
	}

	record(input: DiagnosticInput): void {
		this.#recorder.record(input);
	}

	setWorldHead(summary: WorldHeadSummary): void {
		this.#worldHead = Object.freeze({ ...summary });
	}

	async captureRuntimeFailure(input: {
		readonly code: string;
		readonly component: string;
		readonly safeSummary: string;
		readonly protectReality: () => void | Promise<void>;
	}): Promise<DiagnosticIncident> {
		const sentinel = new Sentinel({
			recorder: this.#recorder,
			protectReality: input.protectReality,
			recover: () => false,
		});
		const incident = await sentinel.check({
			invariant: "authoritative-runtime-available",
			holds: false,
			component: input.component,
			code: input.code,
			safeSummary: input.safeSummary,
		});
		if (incident === null)
			throw new Error("runtime failure did not create an incident");
		this.#incidents = [...this.#incidents, incident].slice(-16);
		if (this.#worldHead !== null) {
			this.#worldHead = Object.freeze({
				...this.#worldHead,
				status: "safe-stop",
			});
		}
		return incident;
	}

	observer() {
		return projectLocalObserver({
			snapshot: this.#recorder.snapshot(),
			incidents: this.#incidents,
			worldHead: this.#worldHead,
		});
	}
}

export const browserDiagnostics = new BrowserDiagnostics();

if (typeof window !== "undefined" && browserDiagnostics.mode === "local") {
	Object.defineProperty(window, "__EONFOLK_OBSERVER__", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: () => browserDiagnostics.observer(),
	});
}
