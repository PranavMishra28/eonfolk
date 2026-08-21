import type {
	FeedbackRepository,
	GitHubDeliveryMatch,
	GitHubIssuePort,
	IncidentState,
	LeaseResult,
	ReservationResult,
	SourceQuotaPort,
	StoredIncident,
	StoredSubmission,
	TurnstilePort,
	TurnstileVerification,
} from "../../../apps/feedback-worker/src/index.js";

interface MutableSubmission {
	submissionId: string;
	fingerprint: string;
	payloadDigest: string;
	payloadJson: string | null;
	state: "reserved" | "retryable" | "delivered";
	issueNumber: number | null;
	commentId: number | null;
	createdAtMs: number;
	updatedAtMs: number;
}

interface MutableIncident {
	fingerprint: string;
	state: IncidentState;
	issueNumber: number | null;
	leaseToken: string | null;
	leaseUntilMs: number | null;
	createdAtMs: number;
	updatedAtMs: number;
}

function submissionSnapshot(value: MutableSubmission): StoredSubmission {
	return Object.freeze({ ...value });
}

function incidentSnapshot(value: MutableIncident): StoredIncident {
	return Object.freeze({ ...value });
}

export class MemoryFeedbackRepository implements FeedbackRepository {
	readonly submissions = new Map<string, MutableSubmission>();
	readonly incidents = new Map<string, MutableIncident>();
	forceBusy = false;
	forceQuota = false;
	forceFailure = false;
	readonly quotas = new Map<string, { count: number; updatedAtMs: number }>();
	globalLease: {
		token: string;
		untilMs: number;
		nextMutationAtMs: number;
	} | null = null;

	async cleanup(input: {
		readonly nowMs: number;
		readonly stagingCutoffMs: number;
		readonly metadataCutoffMs: number;
		readonly limit: number;
	}): Promise<void> {
		if (this.forceFailure) throw new Error("D1 unavailable");
		let remaining = input.limit;
		for (const submission of [...this.submissions.values()].sort(
			(a, b) => a.updatedAtMs - b.updatedAtMs,
		)) {
			if (remaining <= 0) break;
			const incident = this.incidents.get(submission.fingerprint)!;
			const live =
				incident.leaseUntilMs !== null && incident.leaseUntilMs > input.nowMs;
			if (
				!live &&
				submission.payloadJson !== null &&
				submission.updatedAtMs < input.stagingCutoffMs
			) {
				submission.payloadJson = null;
				remaining -= 1;
			}
		}
		remaining = input.limit;
		for (const submission of [...this.submissions.values()].sort(
			(a, b) => a.updatedAtMs - b.updatedAtMs,
		)) {
			if (remaining <= 0) break;
			const incident = this.incidents.get(submission.fingerprint)!;
			const live =
				incident.leaseUntilMs !== null && incident.leaseUntilMs > input.nowMs;
			if (!live && submission.updatedAtMs < input.metadataCutoffMs) {
				this.submissions.delete(submission.submissionId);
				remaining -= 1;
			}
		}
		for (const incident of [...this.incidents.values()]) {
			const hasSubmission = [...this.submissions.values()].some(
				(value) => value.fingerprint === incident.fingerprint,
			);
			const live =
				incident.leaseUntilMs !== null && incident.leaseUntilMs > input.nowMs;
			if (
				!hasSubmission &&
				!live &&
				incident.updatedAtMs < input.metadataCutoffMs
			)
				this.incidents.delete(incident.fingerprint);
		}
		for (const [key, quota] of this.quotas) {
			if (quota.updatedAtMs < input.metadataCutoffMs) this.quotas.delete(key);
		}
	}

	async reserve(input: {
		readonly submissionId: string;
		readonly fingerprint: string;
		readonly payloadDigest: string;
		readonly payloadJson: string;
		readonly sourceHourKey: string;
		readonly sourceDayKey: string;
		readonly nowMs: number;
	}): Promise<ReservationResult> {
		if (this.forceFailure) throw new Error("D1 unavailable");
		if (this.forceQuota) return { kind: "quota", scope: "global-day" };
		const existing = this.submissions.get(input.submissionId);
		if (existing !== undefined) {
			if (
				existing.fingerprint !== input.fingerprint ||
				existing.payloadDigest !== input.payloadDigest
			)
				return { kind: "conflict" };
			return {
				kind: "duplicate",
				submission: submissionSnapshot(existing),
				incident: incidentSnapshot(this.incidents.get(existing.fingerprint)!),
			};
		}
		const hourBucket = Math.floor(input.nowMs / 3_600_000);
		const dayBucket = Math.floor(input.nowMs / 86_400_000);
		for (const [scope, key, bucket, maximum] of [
			["source-hour", input.sourceHourKey, hourBucket, 5],
			["source-day", input.sourceDayKey, dayBucket, 10],
		] as const) {
			const quotaKey = `${scope}:${key}:${bucket}`;
			const quota = this.quotas.get(quotaKey);
			if ((quota?.count ?? 0) >= maximum) return { kind: "quota", scope };
		}
		for (const [scope, key, bucket] of [
			["source-hour", input.sourceHourKey, hourBucket],
			["source-day", input.sourceDayKey, dayBucket],
		] as const) {
			const quotaKey = `${scope}:${key}:${bucket}`;
			const quota = this.quotas.get(quotaKey);
			this.quotas.set(quotaKey, {
				count: (quota?.count ?? 0) + 1,
				updatedAtMs: input.nowMs,
			});
		}
		const submission: MutableSubmission = {
			submissionId: input.submissionId,
			fingerprint: input.fingerprint,
			payloadDigest: input.payloadDigest,
			payloadJson: input.payloadJson,
			state: "reserved",
			issueNumber: null,
			commentId: null,
			createdAtMs: input.nowMs,
			updatedAtMs: input.nowMs,
		};
		let incident = this.incidents.get(input.fingerprint);
		if (incident === undefined) {
			incident = {
				fingerprint: input.fingerprint,
				state: "reserved",
				issueNumber: null,
				leaseToken: null,
				leaseUntilMs: null,
				createdAtMs: input.nowMs,
				updatedAtMs: input.nowMs,
			};
			this.incidents.set(input.fingerprint, incident);
		}
		this.submissions.set(input.submissionId, submission);
		return {
			kind: "reserved",
			submission: submissionSnapshot(submission),
			incident: incidentSnapshot(incident),
		};
	}

	async acquireLease(input: {
		readonly fingerprint: string;
		readonly leaseToken: string;
		readonly nowMs: number;
		readonly leaseUntilMs: number;
	}): Promise<LeaseResult> {
		if (this.forceFailure) throw new Error("D1 unavailable");
		const incident = this.incidents.get(input.fingerprint)!;
		if (
			this.forceBusy ||
			(incident.leaseUntilMs !== null && incident.leaseUntilMs > input.nowMs) ||
			(this.globalLease !== null &&
				(this.globalLease.untilMs > input.nowMs ||
					this.globalLease.nextMutationAtMs > input.nowMs))
		)
			return { kind: "busy", retryAfterSeconds: 1 };
		incident.state = "creating";
		incident.leaseToken = input.leaseToken;
		incident.leaseUntilMs = input.leaseUntilMs;
		incident.updatedAtMs = input.nowMs;
		this.globalLease = {
			token: input.leaseToken,
			untilMs: input.leaseUntilMs,
			nextMutationAtMs: 0,
		};
		return { kind: "acquired", incident: incidentSnapshot(incident) };
	}

	async markDelivered(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly issueNumber: number;
		readonly commentId: number | null;
		readonly nowMs: number;
	}): Promise<StoredSubmission> {
		if (this.forceFailure) throw new Error("D1 unavailable");
		const submission = this.submissions.get(input.submissionId)!;
		const incident = this.incidents.get(submission.fingerprint)!;
		if (
			incident.leaseToken !== input.leaseToken ||
			this.globalLease?.token !== input.leaseToken
		)
			throw new Error("stale lease");
		submission.state = "delivered";
		submission.payloadJson = null;
		submission.issueNumber = input.issueNumber;
		submission.commentId = input.commentId;
		submission.updatedAtMs = input.nowMs;
		incident.state = "open";
		incident.issueNumber = input.issueNumber;
		incident.leaseToken = null;
		incident.leaseUntilMs = null;
		incident.updatedAtMs = input.nowMs;
		this.globalLease = {
			token: "",
			untilMs: 0,
			nextMutationAtMs: input.nowMs + 1_000,
		};
		return submissionSnapshot(submission);
	}

	async markRetryable(input: {
		readonly submissionId: string;
		readonly leaseToken: string;
		readonly nowMs: number;
	}): Promise<void> {
		if (this.forceFailure) throw new Error("D1 unavailable");
		const submission = this.submissions.get(input.submissionId)!;
		const incident = this.incidents.get(submission.fingerprint)!;
		if (
			incident.leaseToken !== input.leaseToken ||
			this.globalLease?.token !== input.leaseToken
		)
			throw new Error("stale lease");
		submission.state = "retryable";
		submission.updatedAtMs = input.nowMs;
		incident.state = incident.issueNumber === null ? "retryable" : "open";
		incident.leaseToken = null;
		incident.leaseUntilMs = null;
		incident.updatedAtMs = input.nowMs;
		this.globalLease = {
			token: "",
			untilMs: 0,
			nextMutationAtMs: input.nowMs + 1_000,
		};
	}
}

export class FakeSourceQuota implements SourceQuotaPort {
	hourKey = "a".repeat(64);
	dayKey = "b".repeat(64);
	throwNext = false;

	async bucketKeys(): Promise<{
		readonly hourKey: string;
		readonly dayKey: string;
	}> {
		if (this.throwNext) {
			this.throwNext = false;
			throw new Error("source unavailable");
		}
		return { hourKey: this.hourKey, dayKey: this.dayKey };
	}
}

export class FakeTurnstile implements TurnstilePort {
	result: TurnstileVerification = {
		ok: true,
		hostname: "alpha.eonfolk.test",
		action: "feedback-submit",
	};
	throwNext = false;
	readonly inputs: Array<{ token: string; idempotencyKey: string }> = [];

	async verify(input: {
		readonly token: string;
		readonly idempotencyKey: string;
	}): Promise<TurnstileVerification> {
		this.inputs.push({ ...input });
		if (this.throwNext) {
			this.throwNext = false;
			throw new Error("Siteverify unavailable");
		}
		return this.result;
	}
}

interface FakeComment {
	id: number;
	body: string;
}

interface FakeIssue {
	number: number;
	title: string;
	body: string;
	comments: FakeComment[];
}

export class FakeGitHub implements GitHubIssuePort {
	readonly issues: FakeIssue[] = [];
	readonly repositories: Array<{ owner: string; name: string }> = [];
	failAfterIssueOnce = false;
	failAfterCommentOnce = false;
	failBeforeMutation = false;

	async findSubmission(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly issueNumber: number | null;
		readonly fingerprintMarker: string;
		readonly submissionMarker: string;
	}): Promise<GitHubDeliveryMatch | null> {
		this.repositories.push({ ...input.repository });
		if (this.failBeforeMutation) throw new Error("GitHub unavailable");
		const candidates =
			input.issueNumber === null
				? this.issues.filter((issue) =>
						issue.body.includes(input.fingerprintMarker),
					)
				: this.issues.filter((issue) => issue.number === input.issueNumber);
		for (const issue of candidates) {
			if (issue.body.includes(input.submissionMarker))
				return { issueNumber: issue.number, commentId: null };
			const comment = issue.comments.find((value) =>
				value.body.includes(input.submissionMarker),
			);
			if (comment !== undefined)
				return { issueNumber: issue.number, commentId: comment.id };
		}
		return null;
	}

	async createIssue(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly title: string;
		readonly body: string;
	}): Promise<{ readonly issueNumber: number }> {
		this.repositories.push({ ...input.repository });
		if (this.failBeforeMutation) throw new Error("GitHub unavailable");
		const issue: FakeIssue = {
			number: this.issues.length + 1,
			title: input.title,
			body: input.body,
			comments: [],
		};
		this.issues.push(issue);
		if (this.failAfterIssueOnce) {
			this.failAfterIssueOnce = false;
			throw new Error("response lost after issue creation");
		}
		return { issueNumber: issue.number };
	}

	async createComment(input: {
		readonly repository: Readonly<{ owner: string; name: string }>;
		readonly issueNumber: number;
		readonly body: string;
	}): Promise<{ readonly commentId: number }> {
		this.repositories.push({ ...input.repository });
		if (this.failBeforeMutation) throw new Error("GitHub unavailable");
		const issue = this.issues.find(
			(value) => value.number === input.issueNumber,
		)!;
		const comment = { id: issue.comments.length + 10, body: input.body };
		issue.comments.push(comment);
		if (this.failAfterCommentOnce) {
			this.failAfterCommentOnce = false;
			throw new Error("response lost after comment creation");
		}
		return { commentId: comment.id };
	}
}
