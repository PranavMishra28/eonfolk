import {
	FEEDBACK_CLEANUP_BATCH,
	FEEDBACK_ERROR_VERSION,
	FEEDBACK_GITHUB_REPOSITORY,
	FEEDBACK_METADATA_TTL_MS,
	FEEDBACK_RECEIPT_VERSION,
	FEEDBACK_ROUTE,
	FEEDBACK_STAGING_TTL_MS,
	type FeedbackSubmission,
	type FeedbackWorkerConfig,
	type FeedbackWorkerDependencies,
	LEASE_DURATION_MS,
	type LeaseResult,
	MAX_JSON_BYTES,
	type PersistedFeedbackPayload,
	type ReservationResult,
	type TurnstileVerification,
} from "./contracts.js";
import {
	computeFingerprint,
	computePayloadDigest,
	serializePayload,
	webCryptoDigest,
} from "./crypto.js";
import {
	commentBody,
	fingerprintMarker,
	issueBody,
	issueTitle,
	submissionMarker,
} from "./format.js";
import {
	parseFeedbackSubmission,
	persistedPayload,
	SchemaError,
} from "./schema.js";

interface ErrorOptions {
	readonly status: number;
	readonly code: string;
	readonly message: string;
	readonly retryable: boolean;
	readonly retryAfterSeconds?: number;
}

class RequestTooLargeError extends Error {}

function checkedConfig(config: FeedbackWorkerConfig): Readonly<{
	allowedOrigins: ReadonlySet<string>;
	turnstileHostname: string;
	turnstileAction: string;
	leaseDurationMs: number;
}> {
	if (config.allowedOrigins.length === 0)
		throw new TypeError("at least one exact Origin is required");
	const origins = new Set<string>();
	for (const origin of config.allowedOrigins) {
		let url: URL;
		try {
			url = new URL(origin);
		} catch {
			throw new TypeError(`invalid allowed Origin: ${origin}`);
		}
		if (
			url.origin !== origin ||
			url.username !== "" ||
			url.password !== "" ||
			(url.protocol !== "https:" &&
				!(
					url.protocol === "http:" &&
					["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
				))
		)
			throw new TypeError(
				`allowed Origin must be an exact HTTPS or loopback origin: ${origin}`,
			);
		origins.add(origin);
	}
	if (!/^[a-z0-9.-]{1,253}$/u.test(config.turnstileHostname))
		throw new TypeError("turnstileHostname must be a bare hostname");
	if (!/^[A-Za-z0-9._:-]{1,64}$/u.test(config.turnstileAction))
		throw new TypeError("turnstileAction must be a bounded identifier");
	const leaseDurationMs = config.leaseDurationMs ?? LEASE_DURATION_MS;
	if (
		!Number.isSafeInteger(leaseDurationMs) ||
		leaseDurationMs < 1_000 ||
		leaseDurationMs > 60_000
	)
		throw new RangeError("leaseDurationMs must be between 1 and 60 seconds");
	return Object.freeze({
		allowedOrigins: origins,
		turnstileHostname: config.turnstileHostname,
		turnstileAction: config.turnstileAction,
		leaseDurationMs,
	});
}

function corsHeaders(origin: string): Headers {
	const headers = new Headers({
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "600",
		Vary: "Origin",
	});
	return headers;
}

function jsonResponse(
	body: unknown,
	status: number,
	origin: string | null,
	extraHeaders?: Readonly<Record<string, string>>,
): Response {
	const headers = origin === null ? new Headers() : corsHeaders(origin);
	headers.set("Content-Type", "application/json; charset=utf-8");
	headers.set("Cache-Control", "no-store");
	for (const [key, value] of Object.entries(extraHeaders ?? {}))
		headers.set(key, value);
	return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(options: ErrorOptions, origin: string | null): Response {
	const body: {
		schemaVersion: typeof FEEDBACK_ERROR_VERSION;
		code: string;
		message: string;
		retryable: boolean;
		retryAfterSeconds?: number;
	} = {
		schemaVersion: FEEDBACK_ERROR_VERSION,
		code: options.code,
		message: options.message,
		retryable: options.retryable,
	};
	const headers: Record<string, string> = {};
	if (options.retryAfterSeconds !== undefined) {
		body.retryAfterSeconds = options.retryAfterSeconds;
		headers["Retry-After"] = String(options.retryAfterSeconds);
	}
	return jsonResponse(body, options.status, origin, headers);
}

async function readBoundedBody(request: Request): Promise<string> {
	const contentLength = request.headers.get("content-length");
	if (contentLength !== null) {
		if (!/^\d+$/u.test(contentLength))
			throw new SchemaError(
				"invalid-content-length",
				"Content-Length is invalid",
			);
		if (Number(contentLength) > MAX_JSON_BYTES)
			throw new RequestTooLargeError();
	}
	if (request.body === null) return "";
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		length += value.byteLength;
		if (length > MAX_JSON_BYTES) {
			await reader.cancel();
			throw new RequestTooLargeError();
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new SchemaError(
			"invalid-encoding",
			"request body must be valid UTF-8",
		);
	}
}

function asTurnstileIdempotencyKey(submissionId: string): string {
	const value = submissionId.slice(4);
	return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20)}`;
}

function receipt(input: {
	readonly submissionId: string;
	readonly issueNumber: number;
	readonly delivery:
		| "issue-created"
		| "comment-created"
		| "reconciled"
		| "duplicate";
	readonly status: number;
	readonly origin: string;
}): Response {
	return jsonResponse(
		{
			schemaVersion: FEEDBACK_RECEIPT_VERSION,
			submissionId: input.submissionId,
			state: "delivered",
			delivery: input.delivery,
			issueNumber: input.issueNumber,
			retryable: false,
		},
		input.status,
		input.origin,
	);
}

export function createFeedbackWorker(
	config: FeedbackWorkerConfig,
	dependencies: FeedbackWorkerDependencies,
): Readonly<{ fetch(request: Request): Promise<Response> }> {
	const settings = checkedConfig(config);
	const digest = dependencies.digest ?? webCryptoDigest;
	const now = dependencies.now ?? Date.now;
	const randomId =
		dependencies.randomId ?? (() => crypto.randomUUID().replaceAll("-", ""));

	return Object.freeze({
		async fetch(request: Request): Promise<Response> {
			const origin = request.headers.get("Origin");
			if (origin === null || !settings.allowedOrigins.has(origin))
				return errorResponse(
					{
						status: 403,
						code: "origin-denied",
						message: "Origin is not allowed.",
						retryable: false,
					},
					null,
				);
			const url = new URL(request.url);
			if (url.pathname !== FEEDBACK_ROUTE || url.search !== "")
				return errorResponse(
					{
						status: 404,
						code: "route-not-found",
						message: "Feedback route not found.",
						retryable: false,
					},
					origin,
				);
			if (request.method === "OPTIONS")
				return new Response(null, {
					status: 204,
					headers: corsHeaders(origin),
				});
			if (request.method !== "POST")
				return errorResponse(
					{
						status: 405,
						code: "method-not-allowed",
						message: "Only POST is supported.",
						retryable: false,
					},
					origin,
				);
			const contentType = request.headers
				.get("content-type")
				?.split(";", 1)[0]
				?.trim()
				.toLowerCase();
			if (contentType !== "application/json")
				return errorResponse(
					{
						status: 415,
						code: "unsupported-content-type",
						message: "Content-Type must be application/json.",
						retryable: false,
					},
					origin,
				);

			let bodyText: string;
			try {
				bodyText = await readBoundedBody(request);
			} catch (error) {
				if (error instanceof RequestTooLargeError)
					return errorResponse(
						{
							status: 413,
							code: "request-too-large",
							message: "Feedback request exceeds 32 KiB.",
							retryable: false,
						},
						origin,
					);
				if (error instanceof SchemaError)
					return errorResponse(
						{
							status: 400,
							code: error.code,
							message: error.message,
							retryable: false,
						},
						origin,
					);
				throw error;
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(bodyText) as unknown;
			} catch {
				return errorResponse(
					{
						status: 400,
						code: "invalid-json",
						message: "Request body is not valid JSON.",
						retryable: false,
					},
					origin,
				);
			}

			let submission: FeedbackSubmission;
			try {
				submission = parseFeedbackSubmission(parsed);
			} catch (error) {
				if (error instanceof SchemaError)
					return errorResponse(
						{
							status: 422,
							code: error.code,
							message: error.message,
							retryable: false,
						},
						origin,
					);
				throw error;
			}

			let verification: TurnstileVerification;
			try {
				verification = await dependencies.turnstile.verify({
					token: submission.turnstileToken,
					idempotencyKey: asTurnstileIdempotencyKey(submission.submissionId),
				});
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "turnstile-unavailable",
						message: "Feedback verification is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
			if (
				!verification.ok ||
				verification.hostname !== settings.turnstileHostname ||
				verification.action !== settings.turnstileAction
			)
				return errorResponse(
					{
						status: verification.retryable === true ? 503 : 403,
						code: "turnstile-rejected",
						message: "Feedback verification was rejected.",
						retryable: verification.retryable === true,
						...(verification.retryable === true
							? { retryAfterSeconds: 30 }
							: {}),
					},
					origin,
				);

			const payload: PersistedFeedbackPayload = persistedPayload(submission);
			let fingerprint: string;
			let payloadDigest: string;
			try {
				[fingerprint, payloadDigest] = await Promise.all([
					computeFingerprint(submission, digest),
					computePayloadDigest(payload, digest),
				]);
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "hashing-unavailable",
						message: "Feedback processing is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}

			const timestamp = now();
			let sourceQuotaKeys: Awaited<
				ReturnType<typeof dependencies.sourceQuota.bucketKeys>
			>;
			try {
				sourceQuotaKeys = await dependencies.sourceQuota.bucketKeys({
					request,
					nowMs: timestamp,
				});
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "source-quota-unavailable",
						message: "Feedback abuse protection is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
			try {
				await dependencies.repository.cleanup({
					nowMs: timestamp,
					stagingCutoffMs: Math.max(0, timestamp - FEEDBACK_STAGING_TTL_MS),
					metadataCutoffMs: Math.max(0, timestamp - FEEDBACK_METADATA_TTL_MS),
					limit: FEEDBACK_CLEANUP_BATCH,
				});
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "repository-cleanup-unavailable",
						message: "Feedback retention cleanup is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
			let reservation: ReservationResult;
			try {
				reservation = await dependencies.repository.reserve({
					submissionId: submission.submissionId,
					fingerprint,
					payloadDigest,
					payloadJson: serializePayload(payload),
					sourceHourKey: sourceQuotaKeys.hourKey,
					sourceDayKey: sourceQuotaKeys.dayKey,
					nowMs: timestamp,
				});
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "repository-unavailable",
						message: "Feedback storage is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
			if (reservation.kind === "conflict")
				return errorResponse(
					{
						status: 409,
						code: "submission-conflict",
						message: "submissionId was already used for different feedback.",
						retryable: false,
					},
					origin,
				);
			if (reservation.kind === "quota")
				return errorResponse(
					{
						status: 429,
						code: "feedback-quota-reached",
						message: "The bounded feedback quota is currently full.",
						retryable: true,
						retryAfterSeconds: 3_600,
					},
					origin,
				);
			if (reservation.submission.state === "delivered") {
				if (reservation.submission.issueNumber === null)
					return errorResponse(
						{
							status: 503,
							code: "repository-inconsistent",
							message: "Feedback state is temporarily unavailable.",
							retryable: true,
							retryAfterSeconds: 30,
						},
						origin,
					);
				return receipt({
					submissionId: submission.submissionId,
					issueNumber: reservation.submission.issueNumber,
					delivery: "duplicate",
					status: 200,
					origin,
				});
			}

			const leaseToken = `lease_${randomId()}`;
			let lease: LeaseResult;
			try {
				lease = await dependencies.repository.acquireLease({
					fingerprint,
					leaseToken,
					nowMs: timestamp,
					leaseUntilMs: timestamp + settings.leaseDurationMs,
				});
			} catch {
				return errorResponse(
					{
						status: 503,
						code: "repository-unavailable",
						message: "Feedback storage is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
			if (lease.kind === "busy")
				return errorResponse(
					{
						status: 503,
						code: "delivery-busy",
						message: "Feedback delivery is already in progress.",
						retryable: true,
						retryAfterSeconds: lease.retryAfterSeconds,
					},
					origin,
				);

			try {
				const reconciled = await dependencies.github.findSubmission({
					repository: FEEDBACK_GITHUB_REPOSITORY,
					issueNumber: lease.incident.issueNumber,
					fingerprintMarker: fingerprintMarker(fingerprint),
					submissionMarker: submissionMarker(submission.submissionId),
				});
				if (reconciled !== null) {
					await dependencies.repository.markDelivered({
						submissionId: submission.submissionId,
						leaseToken,
						issueNumber: reconciled.issueNumber,
						commentId: reconciled.commentId,
						nowMs: now(),
					});
					return receipt({
						submissionId: submission.submissionId,
						issueNumber: reconciled.issueNumber,
						delivery: "reconciled",
						status: 200,
						origin,
					});
				}

				if (lease.incident.issueNumber === null) {
					const created = await dependencies.github.createIssue({
						repository: FEEDBACK_GITHUB_REPOSITORY,
						title: issueTitle(payload),
						body: issueBody(payload, fingerprint),
					});
					await dependencies.repository.markDelivered({
						submissionId: submission.submissionId,
						leaseToken,
						issueNumber: created.issueNumber,
						commentId: null,
						nowMs: now(),
					});
					return receipt({
						submissionId: submission.submissionId,
						issueNumber: created.issueNumber,
						delivery: "issue-created",
						status: 201,
						origin,
					});
				}

				const created = await dependencies.github.createComment({
					repository: FEEDBACK_GITHUB_REPOSITORY,
					issueNumber: lease.incident.issueNumber,
					body: commentBody(payload),
				});
				await dependencies.repository.markDelivered({
					submissionId: submission.submissionId,
					leaseToken,
					issueNumber: lease.incident.issueNumber,
					commentId: created.commentId,
					nowMs: now(),
				});
				return receipt({
					submissionId: submission.submissionId,
					issueNumber: lease.incident.issueNumber,
					delivery: "comment-created",
					status: 201,
					origin,
				});
			} catch {
				try {
					await dependencies.repository.markRetryable({
						submissionId: submission.submissionId,
						leaseToken,
						nowMs: now(),
					});
				} catch {
					// A failed state write is still a retryable outage. The bounded lease expires.
				}
				return errorResponse(
					{
						status: 503,
						code: "github-delivery-unavailable",
						message:
							"Feedback remains queued because delivery is temporarily unavailable.",
						retryable: true,
						retryAfterSeconds: 30,
					},
					origin,
				);
			}
		},
	});
}
