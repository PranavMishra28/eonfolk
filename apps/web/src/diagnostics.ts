import {
	BoundedPerformanceSummary,
	type DiagnosticCapabilities,
	type DiagnosticIncident,
	type DiagnosticInput,
	type DiagnosticMode,
	FlightRecorder,
	NativePerformanceMonitor,
	projectLocalObserver,
	Sentinel,
	type WorldHeadSummary,
} from "@eonfolk/diagnostics";
import { PROTOCOL_SCHEMA_VERSION } from "@eonfolk/protocol";

function configuredMode(): DiagnosticMode {
	if (typeof __EONFOLK_DIAGNOSTICS_MODE__ === "string") {
		return __EONFOLK_DIAGNOSTICS_MODE__;
	}
	return "off";
}

function diagnosticSessionId(): string {
	try {
		return `session-${globalThis.crypto.randomUUID()}`;
	} catch {
		return "session-unavailable";
	}
}

function runtimeClass() {
	if (typeof window === "undefined") return "node" as const;
	return typeof Worker === "undefined"
		? ("browser-main-thread" as const)
		: ("browser-worker-capable" as const);
}

function viewportClass() {
	if (typeof window === "undefined") return "non-visual" as const;
	if (!Number.isFinite(window.innerWidth) || window.innerWidth <= 0)
		return "unknown" as const;
	if (window.innerWidth < 600) return "compact" as const;
	if (window.innerWidth < 1_200) return "medium" as const;
	return "wide" as const;
}

export class BrowserDiagnostics {
	readonly #recorder: FlightRecorder;
	#performance: NativePerformanceMonitor | null;
	#performanceSummary: BoundedPerformanceSummary | null;
	#incidents: DiagnosticIncident[] = [];
	#worldHead: WorldHeadSummary | null = null;
	#worldReadyMarked = false;
	#capabilities: DiagnosticCapabilities;

	constructor(mode: DiagnosticMode = configuredMode()) {
		let fallbackTick = 0;
		const workerAvailable =
			typeof window !== "undefined" && typeof Worker !== "undefined";
		const performanceAvailable =
			typeof globalThis.performance?.now === "function";
		this.#capabilities = Object.freeze({
			nativePerformance:
				mode === "off"
					? "disabled"
					: performanceAvailable
						? "active"
						: "unsupported",
			localObserver: mode === "local" ? "active" : "disabled",
			feedbackDiagnostics: mode === "alpha" ? "active" : "available",
			replayCapture: "unsupported",
			workerRuntime: workerAvailable ? "active" : "unsupported",
			networkRelay: "unsupported",
		});
		this.#recorder = new FlightRecorder({
			mode,
			capabilities: this.#capabilities,
			identity: {
				diagnosticSessionId: diagnosticSessionId(),
				buildSha:
					typeof __EONFOLK_BUILD_SHA__ === "string"
						? __EONFOLK_BUILD_SHA__
						: "unknown",
				appVersion:
					typeof __EONFOLK_APP_VERSION__ === "string"
						? __EONFOLK_APP_VERSION__
						: "unknown",
				protocolVersion: PROTOCOL_SCHEMA_VERSION,
				experimentId: "founder-alpha-standard-brain",
				runId: "run_riverhold_0001",
				runtimeClass: runtimeClass(),
				viewportClass: viewportClass(),
			},
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
		this.#capabilities = Object.freeze({
			...this.#capabilities,
			nativePerformance: this.#performance === null ? "unsupported" : "active",
			feedbackDiagnostics: "active",
		});
		this.#recorder.setCapabilities(this.#capabilities);
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
			summaryCode:
				input.code === "STALE_FENCE"
					? "write-authority-transferred"
					: "reality-protected",
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
		configurable: true,
		enumerable: false,
		writable: false,
		value: () => browserDiagnostics.observer(),
	});
}
