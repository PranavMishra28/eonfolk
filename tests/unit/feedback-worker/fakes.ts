import type {
	FeedbackRepository,
	GitHubDeliveryMatch,
	GitHubIssuePort,
	IncidentState,
	LeaseResult,
	ReservationResult,
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

	async reserve(input: {
		readonly submissionId: string;
		readonly fingerprint: string;
		readonly payloadDigest: string;
		readonly payloadJson: string;
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
			(incident.leaseUntilMs !== null && incident.leaseUntilMs > input.nowMs)
		)
			return { kind: "busy", retryAfterSeconds: 1 };
		incident.state = "creating";
		incident.leaseToken = input.leaseToken;
		incident.leaseUntilMs = input.leaseUntilMs;
		incident.updatedAtMs = input.nowMs;
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
		if (incident.leaseToken !== input.leaseToken)
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
		if (incident.leaseToken !== input.leaseToken)
			throw new Error("stale lease");
		submission.state = "retryable";
		submission.updatedAtMs = input.nowMs;
		incident.state = incident.issueNumber === null ? "retryable" : "open";
		incident.leaseToken = null;
		incident.leaseUntilMs = null;
		incident.updatedAtMs = input.nowMs;
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
