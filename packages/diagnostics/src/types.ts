import type { RestrictedJson } from "@eonfolk/protocol";
import type { PerformanceSummary, PerformanceSupport } from "./performance";

export const DIAGNOSTICS_SCHEMA_VERSION = "eonfolk-diagnostics-v1" as const;
export const REDACTION_POLICY_VERSION = "eonfolk-redaction-v2" as const;

export type DiagnosticMode = "off" | "local" | "alpha";

export type DiagnosticCapabilityState =
	| "disabled"
	| "unsupported"
	| "available"
	| "active";

export interface DiagnosticCapabilities {
	readonly nativePerformance: DiagnosticCapabilityState;
	readonly localObserver: DiagnosticCapabilityState;
	readonly feedbackDiagnostics: DiagnosticCapabilityState;
	readonly replayCapture: DiagnosticCapabilityState;
	readonly workerRuntime: DiagnosticCapabilityState;
	readonly networkRelay: DiagnosticCapabilityState;
}

export type DiagnosticRuntimeClass =
	| "browser-worker-capable"
	| "browser-main-thread"
	| "node"
	| "unknown";

export type DiagnosticViewportClass =
	| "compact"
	| "medium"
	| "wide"
	| "non-visual"
	| "unknown";

export interface DiagnosticIdentity {
	readonly diagnosticSessionId: string;
	readonly buildSha: string;
	readonly appVersion: string;
	readonly protocolVersion: string;
	readonly experimentId: string;
	readonly runId: string;
	readonly runtimeClass: DiagnosticRuntimeClass;
	readonly viewportClass: DiagnosticViewportClass;
	readonly diagnosticsMode: DiagnosticMode;
}

export interface DiagnosticModeLimits {
	readonly maximumEvents: number;
	readonly maximumBytes: number;
}

export const DIAGNOSTIC_MODE_LIMITS: Readonly<
	Record<DiagnosticMode, DiagnosticModeLimits>
> = Object.freeze({
	off: Object.freeze({ maximumEvents: 128, maximumBytes: 128 * 1024 }),
	local: Object.freeze({ maximumEvents: 2_048, maximumBytes: 2 * 1024 * 1024 }),
	alpha: Object.freeze({ maximumEvents: 512, maximumBytes: 512 * 1024 }),
});
export type DiagnosticSeverity =
	| "debug"
	| "info"
	| "warning"
	| "error"
	| "critical";
export type DiagnosticOutcome =
	| "started"
	| "accepted"
	| "rejected"
	| "failed"
	| "recovered"
	| "observed";
export type DiagnosticCategory =
	| "command"
	| "worker"
	| "persistence"
	| "cognition"
	| "chronicle"
	| "network"
	| "performance"
	| "presentation"
	| "ui"
	| "sentinel";

export interface DiagnosticScope {
	readonly component: string;
	readonly runId?: string;
	readonly regionId?: string;
}

export interface DiagnosticInput {
	readonly category: DiagnosticCategory;
	readonly name: string;
	readonly severity: DiagnosticSeverity;
	readonly outcome: DiagnosticOutcome;
	readonly scope: DiagnosticScope;
	readonly fields?: Readonly<Record<string, unknown>>;
}

export interface DiagnosticEvent {
	readonly schemaVersion: typeof DIAGNOSTICS_SCHEMA_VERSION;
	readonly sequence: number;
	readonly monotonicMs: number;
	readonly category: DiagnosticCategory;
	readonly name: string;
	readonly severity: DiagnosticSeverity;
	readonly outcome: DiagnosticOutcome;
	readonly scope: DiagnosticScope;
	readonly fields: Readonly<Record<string, RestrictedJson>>;
}

export type IncidentReason =
	| "invariant"
	| "runtime-failure"
	| "feedback"
	| "explicit-capture";

export type IncidentSummaryCode =
	| "reality-protected"
	| "write-authority-transferred"
	| "diagnostic-capture";

export interface DiagnosticSnapshot {
	readonly schemaVersion: typeof DIAGNOSTICS_SCHEMA_VERSION;
	readonly mode: DiagnosticMode;
	readonly identity: DiagnosticIdentity;
	readonly capabilities: DiagnosticCapabilities;
	readonly redactionPolicyVersion: typeof REDACTION_POLICY_VERSION;
	readonly frozen: boolean;
	readonly droppedEvents: number;
	readonly byteLength: number;
	readonly events: readonly DiagnosticEvent[];
}

export interface DiagnosticIncident {
	readonly schemaVersion: typeof DIAGNOSTICS_SCHEMA_VERSION;
	readonly incidentId: string;
	readonly fingerprint: string;
	readonly reason: IncidentReason;
	readonly summaryCode: IncidentSummaryCode;
	readonly safeSummary: string;
	readonly createdAtMonotonicMs: number;
	readonly snapshot: DiagnosticSnapshot;
	readonly recovery: "not-attempted" | "recovered" | "safe-stop";
}

export interface WorldHeadSummary {
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly sequence: number;
	readonly simulationTime: number;
	readonly status: "healthy" | "safe-stop";
}

export interface ObserverProjection {
	readonly schemaVersion: "eonfolk-observer-v1";
	readonly identity: DiagnosticIdentity;
	readonly capabilities: DiagnosticCapabilities;
	readonly health: Readonly<{
		readonly mode: DiagnosticMode;
		readonly status: "healthy" | "degraded" | "safe-stop";
		readonly incidentCount: number;
		readonly droppedEvents: number;
	}>;
	readonly incidents: readonly Readonly<{
		readonly incidentId: string;
		readonly fingerprint: string;
		readonly reason: IncidentReason;
		readonly summaryCode: IncidentSummaryCode;
		readonly safeSummary: string;
		readonly recovery: DiagnosticIncident["recovery"];
	}>[];
	readonly trace: readonly DiagnosticEvent[];
	readonly performance: readonly DiagnosticEvent[];
	readonly nativePerformance: Readonly<{
		readonly support: PerformanceSupport;
		readonly summary: PerformanceSummary;
	}> | null;
	readonly network: readonly DiagnosticEvent[];
	readonly reproduction: Readonly<{
		readonly startSequence: number | null;
		readonly endSequence: number | null;
		readonly mode: DiagnosticMode;
	}>;
	readonly artifacts: readonly Readonly<{
		readonly kind: "structured-diagnostics";
		readonly eventCount: number;
		readonly byteLength: number;
	}>[];
	readonly worldHead: WorldHeadSummary | null;
}
