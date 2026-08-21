import { normalizeIngressText } from "@eonfolk/protocol";
import { diagnosticFingerprint } from "./fingerprint";
import { sanitizeDiagnosticFieldsForCategory } from "./redaction";
import { DiagnosticRingBuffer } from "./ring-buffer";
import {
	DIAGNOSTIC_MODE_LIMITS,
	DIAGNOSTICS_SCHEMA_VERSION,
	type DiagnosticEvent,
	type DiagnosticIdentity,
	type DiagnosticIncident,
	type DiagnosticInput,
	type DiagnosticMode,
	type DiagnosticSnapshot,
	type IncidentReason,
	REDACTION_POLICY_VERSION,
} from "./types";

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
		experimentId: safeLabel(
			input?.experimentId ?? "experiment-none",
			"experimentId",
		),
		runId: safeLabel(input?.runId ?? "run-unknown", "identity runId"),
		runtimeClass,
		viewportClass,
	});
}

export class FlightRecorder {
	#mode: DiagnosticMode;
	readonly #now: () => number;
	readonly #buffer: DiagnosticRingBuffer;
	readonly #identity: Omit<DiagnosticIdentity, "diagnosticsMode">;
	#sequence = 0;
	#frozen = false;

	constructor(input: {
		readonly mode: DiagnosticMode;
		readonly now: () => number;
		readonly maximumEvents?: number;
		readonly maximumBytes?: number;
		readonly identity?: Partial<Omit<DiagnosticIdentity, "diagnosticsMode">>;
	}) {
		this.#mode = input.mode;
		this.#now = input.now;
		this.#identity = diagnosticIdentity(input.identity);
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
		readonly safeSummary: string;
		readonly recovery: DiagnosticIncident["recovery"];
	}): Promise<DiagnosticIncident> {
		this.#frozen = true;
		const fingerprint = await diagnosticFingerprint(
			input.reason,
			input.trigger,
		);
		const summary = normalizeIngressText(input.safeSummary, {
			maxBytes: 240,
			maxCodePoints: 160,
		});
		return Object.freeze({
			schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
			incidentId: `${fingerprint}-${input.trigger.sequence}`,
			fingerprint,
			reason: input.reason,
			safeSummary: summary,
			createdAtMonotonicMs: input.trigger.monotonicMs,
			snapshot: this.snapshot(),
			recovery: input.recovery,
		});
	}
}
