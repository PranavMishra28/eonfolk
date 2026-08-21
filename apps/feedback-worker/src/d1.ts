import type {
	FeedbackRepository,
	IncidentState,
	LeaseResult,
	ReservationResult,
	StoredIncident,
	StoredSubmission,
	SubmissionState,
} from "./contracts.js";

export interface D1PreparedStatement {
	bind(...values: readonly unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface JoinedRow {
	submission_id: string;
	fingerprint: string;
	payload_digest: string;
	payload_json: string | null;
	submission_state: SubmissionState;
	submission_issue_number: number | null;
	comment_id: number | null;
	submission_created_at_ms: number;
	submission_updated_at_ms: number;
	incident_state: IncidentState;
	incident_issue_number: number | null;
	lease_token: string | null;
	lease_until_ms: number | null;
	incident_created_at_ms: number;
	incident_updated_at_ms: number;
}

interface IncidentRow {
	fingerprint: string;
	state: IncidentState;
	issue_number: number | null;
	lease_token: string | null;
	lease_until_ms: number | null;
	created_at_ms: number;
	updated_at_ms: number;
}

interface SubmissionRow {
	submission_id: string;
	fingerprint: string;
	payload_digest: string;
	payload_json: string | null;
	state: SubmissionState;
	issue_number: number | null;
	comment_id: number | null;
	created_at_ms: number;
	updated_at_ms: number;
}

const RESERVE_SQL = `
INSERT INTO feedback_submissions (
  submission_id, fingerprint, payload_digest, payload_json, state,
  issue_number, comment_id, day_bucket, created_at_ms, updated_at_ms
)
SELECT ?, ?, ?, ?, 'reserved', NULL, NULL, ?, ?, ?
WHERE NOT EXISTS (
  SELECT 1 FROM feedback_submissions WHERE submission_id = ?
)
RETURNING submission_id
`;

const READ_SQL = `
SELECT
  s.submission_id,
  s.fingerprint,
  s.payload_digest,
  s.payload_json,
  s.state AS submission_state,
  s.issue_number AS submission_issue_number,
  s.comment_id,
  s.created_at_ms AS submission_created_at_ms,
  s.updated_at_ms AS submission_updated_at_ms,
  i.state AS incident_state,
  i.issue_number AS incident_issue_number,
  i.lease_token,
  i.lease_until_ms,
  i.created_at_ms AS incident_created_at_ms,
  i.updated_at_ms AS incident_updated_at_ms
FROM feedback_submissions s
JOIN feedback_incidents i ON i.fingerprint = s.fingerprint
WHERE s.submission_id = ?
`;

const ACQUIRE_LEASE_SQL = `
UPDATE feedback_incidents
SET state = 'creating', lease_token = ?, lease_until_ms = ?, updated_at_ms = ?
WHERE fingerprint = ?
  AND (lease_until_ms IS NULL OR lease_until_ms <= ?)
RETURNING *
`;

const DELIVER_SQL = `
UPDATE feedback_submissions
SET state = 'delivered', payload_json = NULL, issue_number = ?, comment_id = ?, updated_at_ms = ?
WHERE submission_id = ?
  AND EXISTS (
    SELECT 1 FROM feedback_incidents i
    WHERE i.fingerprint = feedback_submissions.fingerprint
      AND i.lease_token = ?
      AND i.lease_until_ms >= ?
  )
  AND EXISTS (
    SELECT 1 FROM feedback_delivery_lock l
    WHERE l.singleton = 1 AND l.lease_token = ? AND l.lease_until_ms >= ?
  )
RETURNING *
`;

const RETRYABLE_SQL = `
UPDATE feedback_submissions
SET state = 'retryable', updated_at_ms = ?
WHERE submission_id = ?
  AND EXISTS (
    SELECT 1 FROM feedback_incidents i
    WHERE i.fingerprint = feedback_submissions.fingerprint
      AND i.lease_token = ?
      AND i.lease_until_ms >= ?
  )
  AND EXISTS (
    SELECT 1 FROM feedback_delivery_lock l
    WHERE l.singleton = 1 AND l.lease_token = ? AND l.lease_until_ms >= ?
  )
RETURNING submission_id
`;

function mapSubmission(row: SubmissionRow | JoinedRow): StoredSubmission {
	const joined = "submission_state" in row ? row : null;
	const plain = "state" in row ? row : null;
	return Object.freeze({
		submissionId: row.submission_id,
		fingerprint: row.fingerprint,
		payloadDigest: row.payload_digest,
		payloadJson: row.payload_json,
		state: joined?.submission_state ?? plain!.state,
		issueNumber:
			joined === null ? plain!.issue_number : joined.submission_issue_number,
		commentId: row.comment_id,
		createdAtMs: joined?.submission_created_at_ms ?? plain!.created_at_ms,
		updatedAtMs: joined?.submission_updated_at_ms ?? plain!.updated_at_ms,
	});
}

function mapIncident(row: IncidentRow | JoinedRow): StoredIncident {
	const joined = "incident_state" in row ? row : null;
	const plain = "state" in row ? row : null;
	return Object.freeze({
		fingerprint: row.fingerprint,
		state: joined?.incident_state ?? plain!.state,
		issueNumber:
			joined === null ? plain!.issue_number : joined.incident_issue_number,
		leaseToken: row.lease_token,
		leaseUntilMs: row.lease_until_ms,
		createdAtMs: joined?.incident_created_at_ms ?? plain!.created_at_ms,
		updatedAtMs: joined?.incident_updated_at_ms ?? plain!.updated_at_ms,
	});
}

function quotaScope(error: unknown): string | null {
	const message = error instanceof Error ? error.message : String(error);
	const match = /quota:([a-z-]+)/u.exec(message);
	return match?.[1] ?? null;
}

export class D1FeedbackRepository implements FeedbackRepository {
	readonly #database: D1Database;

	constructor(database: D1Database) {
		this.#database = database;
	}

	async reserve(input: {
		readonly submissionId: string;
		readonly fingerprint: string;
		readonly payloadDigest: string;
		readonly payloadJson: string;
		readonly nowMs: number;
	}): Promise<ReservationResult> {
		const dayBucket = Math.floor(input.nowMs / 86_400_000);
		let inserted = false;
		try {
			const result = await this.#database
				.prepare(RESERVE_SQL)
				.bind(
					input.submissionId,
					input.fingerprint,
					input.payloadDigest,
					input.payloadJson,
					dayBucket,
					input.nowMs,
					input.nowMs,
					input.submissionId,
				)
				.first<{ submission_id: string }>();
			inserted = result !== null;
		} catch (error) {
			const scope = quotaScope(error);
			if (scope !== null) return { kind: "quota", scope };
			throw error;
		}
		const row = await this.#database
			.prepare(READ_SQL)
			.bind(input.submissionId)
			.first<JoinedRow>();
		if (row === null)
			throw new Error("D1 reservation did not produce a readable submission");
		if (
			row.fingerprint !== input.fingerprint ||
			row.payload_digest !== input.payloadDigest
		)
			return { kind: "conflict" };
		return {
			kind: inserted ? "reserved" : "duplicate",
			submission: mapSubmission(row),
			incident: mapIncident(row),
		};
	}

	async acquireLease(input: {
		readonly fingerprint: string;
		readonly leaseToken: string;
		readonly nowMs: number;
		readonly leaseUntilMs: number;
	}): Promise<LeaseResult> {
		let row: IncidentRow | null;
		try {
			row = await this.#database
				.prepare(ACQUIRE_LEASE_SQL)
				.bind(
					input.leaseToken,
					input.leaseUntilMs,
					input.nowMs,
					input.fingerprint,
					input.nowMs,
				)
				.first<IncidentRow>();
		} catch (error) {
			if (error instanceof Error && error.message.includes("lease:busy"))
				return { kind: "busy", retryAfterSeconds: 1 };
			throw error;
		}
		if (row !== null) return { kind: "acquired", incident: mapIncident(row) };
		return {
			kind: "busy",
			retryAfterSeconds: Math.max(
				1,
				Math.ceil((input.leaseUntilMs - input.nowMs) / 1_000),
			),
		};
	}

	async markDelivered(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly issueNumber: number;
		readonly commentId: number | null;
		readonly nowMs: number;
	}): Promise<StoredSubmission> {
		const row = await this.#database
			.prepare(DELIVER_SQL)
			.bind(
				input.issueNumber,
				input.commentId,
				input.nowMs,
				input.submissionId,
				input.leaseToken,
				input.nowMs,
				input.leaseToken,
				input.nowMs,
			)
			.first<SubmissionRow>();
		if (row === null) throw new Error("D1 delivery lease is stale");
		return mapSubmission(row);
	}

	async markRetryable(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly nowMs: number;
	}): Promise<void> {
		const row = await this.#database
			.prepare(RETRYABLE_SQL)
			.bind(
				input.nowMs,
				input.submissionId,
				input.leaseToken,
				input.nowMs,
				input.leaseToken,
				input.nowMs,
			)
			.first<{ submission_id: string }>();
		if (row === null) throw new Error("D1 retry lease is stale");
	}
}
