import type { RestrictedJson } from "@eonfolk/protocol";

export const DIAGNOSTICS_SCHEMA_VERSION = "eonfolk-diagnostics-v1" as const;
export const REDACTION_POLICY_VERSION = "eonfolk-redaction-v1" as const;

export type DiagnosticMode = "off" | "local" | "alpha";
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

export interface DiagnosticSnapshot {
	readonly schemaVersion: typeof DIAGNOSTICS_SCHEMA_VERSION;
	readonly mode: DiagnosticMode;
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
		readonly safeSummary: string;
		readonly recovery: DiagnosticIncident["recovery"];
	}>[];
	readonly trace: readonly DiagnosticEvent[];
	readonly performance: readonly DiagnosticEvent[];
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
