import { domainHash } from "@eonfolk/protocol";
import type { DiagnosticEvent, IncidentReason } from "./types";
import { DIAGNOSTICS_SCHEMA_VERSION } from "./types";

export interface DiagnosticFingerprintContext {
	readonly buildSha: string;
	readonly protocolVersion: string;
}

export async function diagnosticFingerprint(
	reason: IncidentReason,
	event: DiagnosticEvent,
	context: DiagnosticFingerprintContext,
): Promise<string> {
	const hash = await domainHash("eonfolk-diagnostic-fingerprint-v1", {
		diagnosticsSchemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
		buildSha: context.buildSha,
		protocolVersion: context.protocolVersion,
		reason,
		category: event.category,
		name: event.name,
		outcome: event.outcome,
		component: event.scope.component,
		code: event.fields.code ?? null,
		invariant: event.fields.invariant ?? null,
	});
	return `inc_${hash.slice(0, 24)}`;
}
