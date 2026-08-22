import type { IncidentReason } from "./types";

export interface ReplayCaptureRequest {
	readonly reason: IncidentReason;
	readonly triggerSequence: number;
	readonly fingerprint: string | null;
}

export interface ReplayCaptureArtifact {
	readonly schemaVersion: "eonfolk-replay-capture-v1";
	readonly kind: "session-replay";
	readonly byteLength: number;
	readonly eventCount: number;
	readonly truncated: boolean;
}

/**
 * Optional session replay boundary. Implementations observe presentation only;
 * they cannot write Reality or replace structured diagnostic evidence.
 */
export interface ReplayCapturePort {
	readonly available: boolean;
	begin(): boolean;
	freeze(request: ReplayCaptureRequest): ReplayCaptureArtifact | null;
	discard(): void;
}

export const disabledReplayCapturePort: ReplayCapturePort = Object.freeze({
	available: false,
	begin: () => false,
	freeze: (_request: ReplayCaptureRequest) => null,
	discard: () => undefined,
});
