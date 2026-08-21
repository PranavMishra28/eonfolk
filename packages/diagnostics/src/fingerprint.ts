import { domainHash } from "@eonfolk/protocol";
import type { DiagnosticEvent, IncidentReason } from "./types";

export async function diagnosticFingerprint(
	reason: IncidentReason,
	event: DiagnosticEvent,
): Promise<string> {
	const hash = await domainHash("eonfolk-diagnostic-fingerprint-v1", {
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
