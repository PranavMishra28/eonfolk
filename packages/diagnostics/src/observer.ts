import type {
	DiagnosticIncident,
	DiagnosticSnapshot,
	ObserverProjection,
	WorldHeadSummary,
} from "./types";
import type { PerformanceSummary, PerformanceSupport } from "./performance";

export function projectLocalObserver(input: {
	readonly snapshot: DiagnosticSnapshot;
	readonly incidents: readonly DiagnosticIncident[];
	readonly worldHead: WorldHeadSummary | null;
	readonly nativePerformance?: Readonly<{
		readonly support: PerformanceSupport;
		readonly summary: PerformanceSummary;
	}> | null;
}): ObserverProjection {
	const lastIncident = input.incidents.at(-1);
	const status =
		lastIncident?.recovery === "safe-stop"
			? "safe-stop"
			: input.incidents.length > 0
				? "degraded"
				: "healthy";
	const first = input.snapshot.events.at(0)?.sequence ?? null;
	const last = input.snapshot.events.at(-1)?.sequence ?? null;
	return Object.freeze({
		schemaVersion: "eonfolk-observer-v1",
		health: Object.freeze({
			mode: input.snapshot.mode,
			status,
			incidentCount: input.incidents.length,
			droppedEvents: input.snapshot.droppedEvents,
		}),
		incidents: Object.freeze(
			input.incidents.map((incident) =>
				Object.freeze({
					incidentId: incident.incidentId,
					fingerprint: incident.fingerprint,
					reason: incident.reason,
					safeSummary: incident.safeSummary,
					recovery: incident.recovery,
				}),
			),
		),
		trace: input.snapshot.events,
		performance: Object.freeze(
			input.snapshot.events.filter((event) => event.category === "performance"),
		),
		nativePerformance: input.nativePerformance ?? null,
		network: Object.freeze(
			input.snapshot.events.filter((event) => event.category === "network"),
		),
		reproduction: Object.freeze({
			startSequence: first,
			endSequence: last,
			mode: input.snapshot.mode,
		}),
		artifacts: Object.freeze([
			Object.freeze({
				kind: "structured-diagnostics" as const,
				eventCount: input.snapshot.events.length,
				byteLength: input.snapshot.byteLength,
			}),
		]),
		worldHead: input.worldHead,
	});
}
