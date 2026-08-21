import {
	BoundedPerformanceSummary,
	type DiagnosticIncident,
	type DiagnosticInput,
	type DiagnosticMode,
	FlightRecorder,
	NativePerformanceMonitor,
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
	#performance: NativePerformanceMonitor | null;
	#performanceSummary: BoundedPerformanceSummary | null;
	#incidents: DiagnosticIncident[] = [];
	#worldHead: WorldHeadSummary | null = null;
	#worldReadyMarked = false;

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
		const performance = this.#createPerformanceMonitor(mode);
		this.#performanceSummary = performance?.summary ?? null;
		this.#performance = performance?.monitor ?? null;
		this.#performance?.mark("app-start");
	}

	#createPerformanceMonitor(mode: DiagnosticMode): Readonly<{
		readonly summary: BoundedPerformanceSummary;
		readonly monitor: NativePerformanceMonitor;
	}> | null {
		if (mode === "off") return null;
		const summary = new BoundedPerformanceSummary({
			maximumSamples: mode === "local" ? 2_048 : 512,
			allowedNames: [
				"app-start",
				"world-ready",
				"meaningful-world",
				"feedback-freeze",
				"self",
			],
		});
		return Object.freeze({
			summary,
			monitor: new NativePerformanceMonitor({ summary }),
		});
	}

	get mode(): DiagnosticMode {
		return this.#recorder.mode;
	}

	enableAlphaCapture(): void {
		if (this.#recorder.mode === "alpha") return;
		this.#recorder.setMode("alpha");
		if (this.#performance === null) {
			const performance = this.#createPerformanceMonitor("alpha");
			this.#performanceSummary = performance?.summary ?? null;
			this.#performance = performance?.monitor ?? null;
		}
		this.record({
			category: "ui",
			name: "alpha-capture-consent",
			severity: "info",
			outcome: "accepted",
			scope: { component: "feedback" },
			fields: { mode: "alpha" },
		});
	}

	markPerformance(name: "feedback-freeze"): void {
		this.#performance?.mark(name);
	}

	record(input: DiagnosticInput): void {
		this.#recorder.record(input);
	}

	setWorldHead(summary: WorldHeadSummary): void {
		this.#worldHead = Object.freeze({ ...summary });
		if (!this.#worldReadyMarked) {
			this.#worldReadyMarked = true;
			this.#performance?.mark("world-ready");
			this.#performance?.measure(
				"meaningful-world",
				"app-start",
				"world-ready",
			);
		}
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
			nativePerformance:
				this.#performance === null || this.#performanceSummary === null
					? null
					: Object.freeze({
							support: this.#performance.support,
							summary: this.#performanceSummary.snapshot(),
						}),
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
