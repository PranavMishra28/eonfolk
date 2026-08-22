import { beforeEach, describe, expect, it } from "vitest";
import {
	ATTACHMENTS_ENABLED,
	createFeedbackWorker,
	createHmacSourceQuotaPort,
	FEEDBACK_ERROR_VERSION,
	FEEDBACK_RECEIPT_VERSION,
	FEEDBACK_SCHEMA_VERSION,
} from "../../../apps/feedback-worker/src/index.js";
import {
	FakeGitHub,
	FakeSourceQuota,
	FakeTurnstile,
	MemoryFeedbackRepository,
} from "./fakes.js";

const ORIGIN = "https://alpha.eonfolk.test";
const ROUTE = "https://relay.invalid/v1/feedback";

function submissionId(value: number): string {
	return `sub_${value.toString(16).padStart(32, "0")}`;
}

function payload(id = 1): Record<string, unknown> {
	return {
		schemaVersion: FEEDBACK_SCHEMA_VERSION,
		submissionId: submissionId(id),
		category: "bug",
		text: "The gate stopped responding.",
		diagnosticsConsent: true,
		diagnostics: {
			errorCode: "E_GATE_STOPPED",
			routeId: "riverhold.gate",
			buildVersion: "alpha.1",
			invariantId: "gate-open-state",
			stackFrames: [
				{ functionName: "openGate", source: "runtime/gate.ts", line: 42 },
			],
		},
		turnstileToken: `turnstile-${id}`,
	};
}

function request(
	body: unknown,
	options: {
		readonly origin?: string | null;
		readonly method?: string;
		readonly url?: string;
		readonly contentType?: string;
		readonly headers?: Readonly<Record<string, string>>;
	} = {},
): Request {
	const headers = new Headers(options.headers);
	if (options.origin !== null) headers.set("Origin", options.origin ?? ORIGIN);
	if (options.contentType !== "")
		headers.set("Content-Type", options.contentType ?? "application/json");
	const method = options.method ?? "POST";
	return new Request(options.url ?? ROUTE, {
		method,
		headers,
		...(method === "GET" || method === "OPTIONS"
			? {}
			: { body: typeof body === "string" ? body : JSON.stringify(body) }),
	});
}

async function responseBody(
	response: Response,
): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

describe("Founder Alpha feedback Worker", () => {
	let repository: MemoryFeedbackRepository;
	let turnstile: FakeTurnstile;
	let github: FakeGitHub;
	let sourceQuota: FakeSourceQuota;
	let clock: number;
	let worker: ReturnType<typeof createFeedbackWorker>;

	beforeEach(() => {
		repository = new MemoryFeedbackRepository();
		turnstile = new FakeTurnstile();
		github = new FakeGitHub();
		sourceQuota = new FakeSourceQuota();
		clock = 1_800_000_000_000;
		worker = createFeedbackWorker(
			{
				allowedOrigins: [ORIGIN, "http://127.0.0.1:4173"],
				turnstileHostname: "alpha.eonfolk.test",
				turnstileAction: "feedback-submit",
			},
			{
				repository,
				turnstile,
				github,
				sourceQuota,
				now: () => clock,
				randomId: () => "0123456789abcdef0123456789abcdef",
			},
		);
	});

	it("uses exact Origin CORS and a fixed route/method surface", async () => {
		const denied = await worker.fetch(
			request(payload(), {
				origin: "https://alpha.eonfolk.test.attacker.invalid",
			}),
		);
		expect(denied.status).toBe(403);
		expect(denied.headers.has("Access-Control-Allow-Origin")).toBe(false);

		const missing = await worker.fetch(request(payload(), { origin: null }));
		expect(missing.status).toBe(403);

		const preflight = await worker.fetch(
			request(null, { method: "OPTIONS", origin: ORIGIN }),
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
		expect(preflight.headers.get("Access-Control-Allow-Methods")).toBe(
			"POST, OPTIONS",
		);

		expect(
			(await worker.fetch(request(payload(), { method: "GET" }))).status,
		).toBe(405);
		expect(
			(
				await worker.fetch(
					request(payload(), { url: `${ROUTE}?repository=elsewhere` }),
				)
			).status,
		).toBe(404);
	});

	it("rejects MIME, byte, Unicode, unknown-field, attachment, and consent violations before verification", async () => {
		expect(
			(await worker.fetch(request(payload(), { contentType: "text/plain" })))
				.status,
		).toBe(415);

		const oversized = JSON.stringify({
			...payload(),
			padding: "x".repeat(33_000),
		});
		const tooLarge = await worker.fetch(request(oversized));
		expect(tooLarge.status).toBe(413);
		expect(await responseBody(tooLarge)).toMatchObject({
			schemaVersion: FEEDBACK_ERROR_VERSION,
			code: "request-too-large",
			retryable: false,
		});

		for (const invalid of [
			{ ...payload(), attachment: { dataUrl: "data:image/png;base64,AAAA" } },
			{ ...payload(), repository: "attacker/elsewhere" },
			{ ...payload(), rawReality: { world: "private" } },
			{ ...payload(), diagnosticsConsent: false },
			{ ...payload(), text: "x".repeat(2_001) },
			{ ...payload(), text: "bad\u0000control" },
			{
				...payload(),
				diagnostics: {
					...((payload().diagnostics as Record<string, unknown>) ?? {}),
					stackFrames: [
						{ source: "https://private.invalid/path?token=secret", line: 1 },
					],
				},
			},
		]) {
			const response = await worker.fetch(request(invalid));
			expect(response.status).toBe(422);
		}
		expect(turnstile.inputs).toHaveLength(0);
		expect(ATTACHMENTS_ENABLED).toBe(false);
	});

	it("validates Turnstile success, hostname, and action through the server port", async () => {
		turnstile.result = {
			ok: true,
			hostname: "attacker.invalid",
			action: "feedback-submit",
		};
		const wrongHost = await worker.fetch(request(payload()));
		expect(wrongHost.status).toBe(403);
		expect(await responseBody(wrongHost)).toMatchObject({
			code: "turnstile-rejected",
			retryable: false,
		});

		turnstile.result = {
			ok: true,
			hostname: "alpha.eonfolk.test",
			action: "wrong-action",
		};
		expect((await worker.fetch(request(payload(2)))).status).toBe(403);

		turnstile.throwNext = true;
		const outage = await worker.fetch(request(payload(3)));
		expect(outage.status).toBe(503);
		expect(await responseBody(outage)).toMatchObject({
			code: "turnstile-unavailable",
			retryable: true,
		});
		expect(turnstile.inputs[0]?.idempotencyKey).toMatch(
			/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/u,
		);
	});

	it("creates one issue in the fixed repository and strips secrets, URLs, mentions, and the Turnstile token", async () => {
		const body = payload();
		body.text =
			"Ping @founder at player@example.com with Bearer alpha-test-token-value or https://private.invalid/repro";
		const response = await worker.fetch(request(body));
		expect(response.status).toBe(201);
		expect(await responseBody(response)).toMatchObject({
			schemaVersion: FEEDBACK_RECEIPT_VERSION,
			state: "delivered",
			delivery: "issue-created",
			issueNumber: 1,
			retryable: false,
		});
		expect(github.repositories).toEqual([
			{ owner: "PranavMishra28", name: "eonfolk" },
			{ owner: "PranavMishra28", name: "eonfolk" },
		]);
		const issue = github.issues[0]!;
		expect(issue.body).toContain("@\u200bfounder");
		expect(issue.body).toContain("[redacted]");
		expect(issue.body).toContain("[redacted-url]");
		expect(issue.body).not.toContain("player@example.com");
		expect(issue.body).not.toContain("alpha-test-token-value");
		expect(issue.body).not.toContain("private.invalid");
		expect(issue.body).not.toContain("turnstile-1");
		expect(issue.body).toContain("eonfolk-feedback:fingerprint:");
		expect(issue.body).toContain(
			`eonfolk-feedback:submission:${submissionId(1)}`,
		);
		expect(repository.submissions.get(submissionId(1))?.payloadJson).toBeNull();
	});

	it("deduplicates identical retries and comments on a stable incident fingerprint", async () => {
		const first = await worker.fetch(request(payload(1)));
		expect(first.status).toBe(201);
		const duplicate = await worker.fetch(request(payload(1)));
		expect(duplicate.status).toBe(200);
		expect(await responseBody(duplicate)).toMatchObject({
			delivery: "duplicate",
		});
		expect(github.issues).toHaveLength(1);

		const secondPayload = payload(2);
		secondPayload.text = "A different report with the same stable diagnostics.";
		secondPayload.turnstileToken = "fresh-single-use-token";
		clock += 1_000;
		const second = await worker.fetch(request(secondPayload));
		expect(second.status).toBe(201);
		expect(await responseBody(second)).toMatchObject({
			delivery: "comment-created",
			issueNumber: 1,
		});
		expect(github.issues).toHaveLength(1);
		expect(github.issues[0]?.comments).toHaveLength(1);

		const distinctIncident = payload(3);
		distinctIncident.diagnostics = {
			...((distinctIncident.diagnostics as Record<string, unknown>) ?? {}),
			errorCode: "E_DIFFERENT_INCIDENT",
		};
		clock += 1_000;
		expect((await worker.fetch(request(distinctIncident))).status).toBe(201);
		expect(github.issues).toHaveLength(2);
	});

	it("rejects reuse of a submission ID with different content", async () => {
		expect((await worker.fetch(request(payload(1)))).status).toBe(201);
		const changed = payload(1);
		changed.text = "Changed payload under the same ID.";
		const response = await worker.fetch(request(changed));
		expect(response.status).toBe(409);
		expect(await responseBody(response)).toMatchObject({
			code: "submission-conflict",
			retryable: false,
		});
		expect(github.issues).toHaveLength(1);
	});

	it("reconciles an issue marker after a lost create response", async () => {
		github.failAfterIssueOnce = true;
		const first = await worker.fetch(request(payload(1)));
		expect(first.status).toBe(503);
		expect(await responseBody(first)).toMatchObject({
			code: "github-delivery-unavailable",
			retryable: true,
		});
		expect(github.issues).toHaveLength(1);

		clock += 1_000;
		const retry = await worker.fetch(request(payload(1)));
		expect(retry.status).toBe(200);
		expect(await responseBody(retry)).toMatchObject({
			delivery: "reconciled",
			issueNumber: 1,
		});
		expect(github.issues).toHaveLength(1);
	});

	it("reconciles a comment marker after a lost comment response", async () => {
		expect((await worker.fetch(request(payload(1)))).status).toBe(201);
		clock += 1_000;
		github.failAfterCommentOnce = true;
		const second = payload(2);
		second.text = "Same incident, second report.";
		expect((await worker.fetch(request(second))).status).toBe(503);
		expect(github.issues[0]?.comments).toHaveLength(1);

		clock += 1_000;
		const retry = await worker.fetch(request(second));
		expect(retry.status).toBe(200);
		expect(await responseBody(retry)).toMatchObject({ delivery: "reconciled" });
		expect(github.issues[0]?.comments).toHaveLength(1);
	});

	it("returns typed retryable responses for quota, lease, repository, and GitHub failures", async () => {
		repository.forceQuota = true;
		let response = await worker.fetch(request(payload(1)));
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("3600");

		repository.forceQuota = false;
		repository.forceBusy = true;
		response = await worker.fetch(request(payload(2)));
		expect(response.status).toBe(503);
		expect(await responseBody(response)).toMatchObject({
			code: "delivery-busy",
			retryable: true,
		});

		repository.forceBusy = false;
		github.failBeforeMutation = true;
		response = await worker.fetch(request(payload(3)));
		expect(response.status).toBe(503);
		expect(repository.submissions.get(submissionId(3))?.state).toBe(
			"retryable",
		);
		const staged = repository.submissions.get(submissionId(3))?.payloadJson;
		expect(staged).not.toBeNull();
		expect(staged).not.toContain("turnstile-3");

		repository.forceFailure = true;
		response = await worker.fetch(request(payload(4)));
		expect(response.status).toBe(503);
		expect(await responseBody(response)).toMatchObject({
			code: "repository-cleanup-unavailable",
			retryable: true,
		});
	});

	it("blocks a sixth keyed-source report in one hour before GitHub mutation", async () => {
		for (let value = 1; value <= 5; value += 1) {
			const body = payload(value);
			body.diagnostics = {
				...((body.diagnostics as Record<string, unknown>) ?? {}),
				errorCode: `E_DISTINCT_${value}`,
			};
			expect((await worker.fetch(request(body))).status).toBe(201);
			clock += 1_000;
		}
		const blocked = await worker.fetch(request(payload(6)));
		expect(blocked.status).toBe(429);
		expect(await responseBody(blocked)).toMatchObject({
			code: "feedback-quota-reached",
		});
		expect(github.issues).toHaveLength(5);

		sourceQuota.hourKey = "c".repeat(64);
		sourceQuota.dayKey = "d".repeat(64);
		const otherSource = payload(7);
		otherSource.diagnostics = {
			...((otherSource.diagnostics as Record<string, unknown>) ?? {}),
			errorCode: "E_OTHER_SOURCE",
		};
		expect((await worker.fetch(request(otherSource))).status).toBe(201);
	});

	it("rotates privacy-preserving HMAC quota keys at exact UTC boundaries", async () => {
		const secret = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode("test-only-source-quota-secret"),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const quota = createHmacSourceQuotaPort({ secret });
		const source = "203.0.113.7";
		const sourceRequest = new Request(ROUTE, {
			headers: { "CF-Connecting-IP": source },
		});
		const initial = await quota.bucketKeys({
			request: sourceRequest,
			nowMs: 0,
		});
		const sameHour = await quota.bucketKeys({
			request: sourceRequest,
			nowMs: 3_599_999,
		});
		const nextHour = await quota.bucketKeys({
			request: sourceRequest,
			nowMs: 3_600_000,
		});
		const nextDay = await quota.bucketKeys({
			request: sourceRequest,
			nowMs: 86_400_000,
		});
		expect(sameHour).toEqual(initial);
		expect(nextHour.hourKey).not.toBe(initial.hourKey);
		expect(nextHour.dayKey).toBe(initial.dayKey);
		expect(nextDay.hourKey).not.toBe(nextHour.hourKey);
		expect(nextDay.dayKey).not.toBe(initial.dayKey);
		expect(JSON.stringify([initial, nextHour, nextDay])).not.toContain(source);
		await expect(
			quota.bucketKeys({ request: new Request(ROUTE), nowMs: 0 }),
		).rejects.toThrow(/unavailable/u);
	});
});
