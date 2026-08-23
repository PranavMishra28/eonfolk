import { normalizeIngressText } from "@eonfolk/protocol";
import { diagnosticFingerprint } from "./fingerprint";
import { sanitizeDiagnosticFieldsForCategory } from "./redaction";
import { DiagnosticRingBuffer } from "./ring-buffer";
import {
	DIAGNOSTIC_MODE_LIMITS,
	DIAGNOSTICS_SCHEMA_VERSION,
	type DiagnosticCapabilities,
	type DiagnosticEvent,
	type DiagnosticIdentity,
	type DiagnosticIncident,
	type DiagnosticInput,
	type DiagnosticMode,
	type DiagnosticSnapshot,
	type IncidentReason,
	type IncidentSummaryCode,
	REDACTION_POLICY_VERSION,
} from "./types";

const incidentSummaries: Readonly<Record<IncidentSummaryCode, string>> =
	Object.freeze({
		"reality-protected":
			"The world paused before showing further state. Your durable local record was not replaced.",
		"write-authority-transferred":
			"This tab paused because another tab holds write authority. Your durable local record was not replaced.",
		"diagnostic-capture":
			"A bounded diagnostic snapshot was captured without changing the world.",
	});

const defaultCapabilities: DiagnosticCapabilities = Object.freeze({
	nativePerformance: "unsupported",
	localObserver: "disabled",
	feedbackDiagnostics: "available",
	replayCapture: "unsupported",
	workerRuntime: "unsupported",
	networkRelay: "unsupported",
});

function checkedCapabilities(
	input: DiagnosticCapabilities | undefined,
): DiagnosticCapabilities {
	const allowed = new Set(["disabled", "unsupported", "available", "active"]);
	const candidate = input ?? defaultCapabilities;
	const expectedKeys = Object.keys(defaultCapabilities).sort();
	const actualKeys = Object.keys(candidate).sort();
	if (
		actualKeys.length !== expectedKeys.length ||
		actualKeys.some((key, index) => key !== expectedKeys[index])
	)
		throw new TypeError("diagnostic capabilities must use the closed schema");
	for (const value of Object.values(candidate)) {
		if (!allowed.has(value))
			throw new TypeError("diagnostic capability state is unsupported");
	}
	return Object.freeze({ ...candidate });
}

function checkedSummaryCode(code: IncidentSummaryCode): IncidentSummaryCode {
	return Object.hasOwn(incidentSummaries, code) ? code : "reality-protected";
}

export function diagnosticIncidentSummary(code: IncidentSummaryCode): string {
	return incidentSummaries[checkedSummaryCode(code)];
}

const runtimeClasses = new Set<DiagnosticIdentity["runtimeClass"]>([
	"browser-worker-capable",
	"browser-main-thread",
	"node",
	"unknown",
]);
const viewportClasses = new Set<DiagnosticIdentity["viewportClass"]>([
	"compact",
	"medium",
	"wide",
	"non-visual",
	"unknown",
]);

function safeLabel(value: string, label: string): string {
	const normalized = normalizeIngressText(value, {
		maxBytes: 96,
		maxCodePoints: 64,
	});
	if (!/^[a-z0-9][a-z0-9._:-]*$/u.test(normalized))
		throw new TypeError(`${label} must be a safe identifier`);
	return normalized;
}

function modeAllows(mode: DiagnosticMode, input: DiagnosticInput): boolean {
	if (mode !== "off") return true;
	return (
		input.severity === "error" ||
		input.severity === "critical" ||
		input.category === "sentinel"
	);
}

function diagnosticIdentity(
	input: Partial<Omit<DiagnosticIdentity, "diagnosticsMode">> | undefined,
): Omit<DiagnosticIdentity, "diagnosticsMode"> {
	const runtimeClass = input?.runtimeClass ?? "unknown";
	const viewportClass = input?.viewportClass ?? "unknown";
	if (!runtimeClasses.has(runtimeClass))
		throw new TypeError("runtimeClass must be a supported coarse class");
	if (!viewportClasses.has(viewportClass))
		throw new TypeError("viewportClass must be a supported coarse class");
	return Object.freeze({
		diagnosticSessionId: safeLabel(
			input?.diagnosticSessionId ?? "session-unknown",
			"diagnosticSessionId",
		),
		buildSha: safeLabel(input?.buildSha ?? "unknown", "buildSha"),
		appVersion: safeLabel(input?.appVersion ?? "unknown", "appVersion"),
		protocolVersion: safeLabel(
			input?.protocolVersion ?? "unknown",
			"protocolVersion",
		),
		genesisId: safeLabel(input?.genesisId ?? "genesis-unknown", "genesisId"),
		worldId: safeLabel(input?.worldId ?? "world-unknown", "worldId"),
		experimentId: safeLabel(
			input?.experimentId ?? "experiment-none",
			"experimentId",
		),
		runId: safeLabel(input?.runId ?? "run-unknown", "identity runId"),
		cognitionTreatmentId: safeLabel(
			input?.cognitionTreatmentId ?? "cognition-standard-v1",
			"cognitionTreatmentId",
		),
		rendererVersion: safeLabel(
			input?.rendererVersion ?? "renderer-unknown",
			"rendererVersion",
		),
		persistenceVersion: safeLabel(
			input?.persistenceVersion ?? "persistence-unknown",
			"persistenceVersion",
		),
		runtimeClass,
		viewportClass,
	});
}

export class FlightRecorder {
	#mode: DiagnosticMode;
	readonly #now: () => number;
	readonly #buffer: DiagnosticRingBuffer;
	readonly #identity: Omit<DiagnosticIdentity, "diagnosticsMode">;
	#capabilities: DiagnosticCapabilities;
	#sequence = 0;
	#frozen = false;

	constructor(input: {
		readonly mode: DiagnosticMode;
		readonly now: () => number;
		readonly maximumEvents?: number;
		readonly maximumBytes?: number;
		readonly identity?: Partial<Omit<DiagnosticIdentity, "diagnosticsMode">>;
		readonly capabilities?: DiagnosticCapabilities;
	}) {
		this.#mode = input.mode;
		this.#now = input.now;
		this.#identity = diagnosticIdentity(input.identity);
		this.#capabilities = checkedCapabilities(input.capabilities);
		const defaultLimits = DIAGNOSTIC_MODE_LIMITS[input.mode];
		this.#buffer = new DiagnosticRingBuffer({
			maximumEvents: input.maximumEvents ?? defaultLimits.maximumEvents,
			maximumBytes: input.maximumBytes ?? defaultLimits.maximumBytes,
		});
	}

	get mode(): DiagnosticMode {
		return this.#mode;
	}

	setMode(mode: DiagnosticMode): void {
		this.#mode = mode;
	}

	setCapabilities(capabilities: DiagnosticCapabilities): void {
		this.#capabilities = checkedCapabilities(capabilities);
	}

	record(input: DiagnosticInput): DiagnosticEvent | null {
		if (!modeAllows(this.#mode, input)) return null;
		const monotonicMs = this.#now();
		if (!Number.isSafeInteger(monotonicMs) || monotonicMs < 0)
			throw new RangeError(
				"diagnostic clock must return a non-negative safe integer",
			);
		const event: DiagnosticEvent = Object.freeze({
			schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
			sequence: this.#sequence,
			monotonicMs,
			category: input.category,
			name: safeLabel(input.name, "diagnostic name"),
			severity: input.severity,
			outcome: input.outcome,
			scope: Object.freeze({
				component: safeLabel(input.scope.component, "diagnostic component"),
				...(input.scope.runId
					? { runId: safeLabel(input.scope.runId, "runId") }
					: {}),
				...(input.scope.regionId
					? { regionId: safeLabel(input.scope.regionId, "regionId") }
					: {}),
			}),
			fields: sanitizeDiagnosticFieldsForCategory(input.category, input.fields),
		});
		this.#sequence += 1;
		this.#buffer.push(event);
		return event;
	}

	snapshot(): DiagnosticSnapshot {
		const snapshot = this.#buffer.snapshot();
		return Object.freeze({
			schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
			mode: this.#mode,
			identity: Object.freeze({
				...this.#identity,
				diagnosticsMode: this.#mode,
			}),
			capabilities: this.#capabilities,
			redactionPolicyVersion: REDACTION_POLICY_VERSION,
			frozen: this.#frozen,
			droppedEvents: snapshot.droppedEvents,
			byteLength: snapshot.byteLength,
			events: snapshot.events,
		});
	}

	async freeze(input: {
		readonly reason: IncidentReason;
		readonly trigger: DiagnosticEvent;
		readonly summaryCode: IncidentSummaryCode;
		readonly recovery: DiagnosticIncident["recovery"];
	}): Promise<DiagnosticIncident> {
		this.#frozen = true;
		const fingerprint = await diagnosticFingerprint(
			input.reason,
			input.trigger,
			{
				buildSha: this.#identity.buildSha,
				protocolVersion: this.#identity.protocolVersion,
			},
		);
		const summaryCode = checkedSummaryCode(input.summaryCode);
		const summary = diagnosticIncidentSummary(summaryCode);
		return Object.freeze({
			schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
			incidentId: fingerprint,
			fingerprint,
			reason: input.reason,
			summaryCode,
			safeSummary: summary,
			createdAtMonotonicMs: input.trigger.monotonicMs,
			snapshot: this.snapshot(),
			recovery: input.recovery,
		});
	}
}
