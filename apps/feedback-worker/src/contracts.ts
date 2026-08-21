export const FEEDBACK_SCHEMA_VERSION = "eonfolk-feedback-v1" as const;
export const FEEDBACK_RECEIPT_VERSION = "eonfolk-feedback-receipt-v1" as const;
export const FEEDBACK_ERROR_VERSION = "eonfolk-feedback-error-v1" as const;
export const FEEDBACK_ROUTE = "/v1/feedback" as const;
export const ATTACHMENTS_ENABLED = false as const;
export const MAX_JSON_BYTES = 32 * 1024;
export const MAX_PROSE_SCALARS = 2_000;
export const MAX_DIAGNOSTICS_BYTES = 24 * 1024;
export const LEASE_DURATION_MS = 30_000;
export const FEEDBACK_STAGING_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
export const FEEDBACK_METADATA_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const FEEDBACK_CLEANUP_BATCH = 100;
export const FEEDBACK_GITHUB_REPOSITORY = Object.freeze({
	owner: "PranavMishra28",
	name: "eonfolk",
});

export type FeedbackCategory = "bug" | "confusing" | "idea" | "story";

export interface FeedbackStackFrame {
	readonly functionName?: string;
	readonly source?: string;
	readonly line?: number;
	readonly column?: number;
}

export interface FeedbackDiagnostics {
	readonly errorCode?: string;
	readonly routeId?: string;
	readonly buildVersion?: string;
	readonly invariantId?: string;
	readonly stackFrames?: readonly FeedbackStackFrame[];
}

export interface FeedbackSubmission {
	readonly schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
	readonly submissionId: string;
	readonly category: FeedbackCategory;
	readonly text: string;
	readonly diagnosticsConsent: boolean;
	readonly diagnostics?: FeedbackDiagnostics;
	readonly turnstileToken: string;
}

export interface PersistedFeedbackPayload {
	readonly schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
	readonly submissionId: string;
	readonly category: FeedbackCategory;
	readonly text: string;
	readonly diagnosticsConsent: boolean;
	readonly diagnostics?: FeedbackDiagnostics;
}

export interface TurnstileVerification {
	readonly ok: boolean;
	readonly hostname?: string;
	readonly action?: string;
	readonly retryable?: boolean;
}

export interface TurnstilePort {
	verify(input: {
		readonly token: string;
		readonly idempotencyKey: string;
	}): Promise<TurnstileVerification>;
}

export interface SourceQuotaKeys {
	readonly hourKey: string;
	readonly dayKey: string;
}

export interface SourceQuotaPort {
	bucketKeys(input: {
		readonly request: Request;
		readonly nowMs: number;
	}): Promise<SourceQuotaKeys>;
}

export type SubmissionState = "reserved" | "retryable" | "delivered";
export type IncidentState = "reserved" | "creating" | "open" | "retryable";

export interface StoredSubmission {
	readonly submissionId: string;
	readonly fingerprint: string;
	readonly payloadDigest: string;
	readonly payloadJson: string | null;
	readonly state: SubmissionState;
	readonly issueNumber: number | null;
	readonly commentId: number | null;
	readonly createdAtMs: number;
	readonly updatedAtMs: number;
}

export interface StoredIncident {
	readonly fingerprint: string;
	readonly state: IncidentState;
	readonly issueNumber: number | null;
	readonly leaseToken: string | null;
	readonly leaseUntilMs: number | null;
	readonly createdAtMs: number;
	readonly updatedAtMs: number;
}

export type ReservationResult =
	| {
			readonly kind: "reserved" | "duplicate";
			readonly submission: StoredSubmission;
			readonly incident: StoredIncident;
	  }
	| { readonly kind: "conflict" }
	| { readonly kind: "quota"; readonly scope: string };

export type LeaseResult =
	| { readonly kind: "acquired"; readonly incident: StoredIncident }
	| { readonly kind: "busy"; readonly retryAfterSeconds: number };

export interface FeedbackRepository {
	cleanup(input: {
		readonly nowMs: number;
		readonly stagingCutoffMs: number;
		readonly metadataCutoffMs: number;
		readonly limit: number;
	}): Promise<void>;
	reserve(input: {
		readonly submissionId: string;
		readonly fingerprint: string;
		readonly payloadDigest: string;
		readonly payloadJson: string;
		readonly sourceHourKey: string;
		readonly sourceDayKey: string;
		readonly nowMs: number;
	}): Promise<ReservationResult>;
	acquireLease(input: {
		readonly fingerprint: string;
		readonly leaseToken: string;
		readonly nowMs: number;
		readonly leaseUntilMs: number;
	}): Promise<LeaseResult>;
	markDelivered(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly issueNumber: number;
		readonly commentId: number | null;
		readonly nowMs: number;
	}): Promise<StoredSubmission>;
	markRetryable(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly nowMs: number;
	}): Promise<void>;
}

export interface GitHubDeliveryMatch {
	readonly issueNumber: number;
	readonly commentId: number | null;
}

export interface GitHubIssuePort {
	findSubmission(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly issueNumber: number | null;
		readonly fingerprintMarker: string;
		readonly submissionMarker: string;
	}): Promise<GitHubDeliveryMatch | null>;
	createIssue(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly title: string;
		readonly body: string;
	}): Promise<{ readonly issueNumber: number }>;
	createComment(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly issueNumber: number;
		readonly body: string;
	}): Promise<{ readonly commentId: number }>;
}

export interface DigestPort {
	digestHex(value: string): Promise<string>;
}

export interface FeedbackWorkerDependencies {
	readonly repository: FeedbackRepository;
	readonly turnstile: TurnstilePort;
	readonly github: GitHubIssuePort;
	readonly sourceQuota: SourceQuotaPort;
	readonly digest?: DigestPort;
	readonly now?: () => number;
	readonly randomId?: () => string;
}

export interface FeedbackWorkerConfig {
	readonly allowedOrigins: readonly string[];
	readonly turnstileHostname: string;
	readonly turnstileAction: string;
	readonly leaseDurationMs?: number;
}
