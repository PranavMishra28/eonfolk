import { describe, expect, it, vi } from "vitest";
import {
	createCloudflareTurnstilePort,
	createGitHubAppInstallationTokenProvider,
	createGitHubIssuePort,
	FEEDBACK_GITHUB_REPOSITORY,
} from "../../../apps/feedback-worker/src/index.js";

const JSON_HEADERS = { "Content-Type": "application/json" };
const FINGERPRINT_MARKER = `<!-- eonfolk-feedback:fingerprint:${"a".repeat(64)} -->`;
const SUBMISSION_MARKER =
	"<!-- eonfolk-feedback:submission:sub_0123456789abcdef0123456789abcdef -->";
const INSTALLATION_TOKEN = `ghs_${"a".repeat(36)}`;

function jsonResponse(
	value: unknown,
	status = 200,
	headers = JSON_HEADERS,
): Response {
	return new Response(JSON.stringify(value), { status, headers });
}

function fixedTokens() {
	return { getToken: vi.fn(async () => INSTALLATION_TOKEN) };
}

function base64Pem(value: ArrayBuffer): string {
	const base64 = Buffer.from(value).toString("base64");
	const lines = base64.match(/.{1,64}/gu)?.join("\n") ?? base64;
	return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function decodeJwtPart(value: string): Uint8Array<ArrayBuffer> {
	const source = Buffer.from(value, "base64url");
	const output = new Uint8Array(new ArrayBuffer(source.byteLength));
	output.set(source);
	return output;
}

describe("Cloudflare Turnstile provider", () => {
	it("posts only to exact Siteverify with bounded form credentials and no redirect following", async () => {
		const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
		const port = createCloudflareTurnstilePort({
			secret: "server-secret",
			fetch: async (input, init) => {
				calls.push({ url: String(input), init });
				return jsonResponse({
					success: true,
					hostname: "alpha.eonfolk.test",
					action: "feedback-submit",
				});
			},
		});

		await expect(
			port.verify({
				token: "browser-proof",
				idempotencyKey: "01234567-89ab-cdef-0123-456789abcdef",
			}),
		).resolves.toEqual({
			ok: true,
			hostname: "alpha.eonfolk.test",
			action: "feedback-submit",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		);
		expect(calls[0]?.init).toMatchObject({
			method: "POST",
			redirect: "manual",
		});
		const body = calls[0]?.init?.body;
		expect(body).toBeInstanceOf(URLSearchParams);
		expect((body as URLSearchParams).get("secret")).toBe("server-secret");
		expect((body as URLSearchParams).get("response")).toBe("browser-proof");
		expect((body as URLSearchParams).get("remoteip")).toBeNull();
	});

	it("maps only the documented internal error to retryable rejection", async () => {
		const port = createCloudflareTurnstilePort({
			secret: "server-secret",
			fetch: async () =>
				jsonResponse({
					success: false,
					"error-codes": ["internal-error"],
				}),
		});
		await expect(
			port.verify({ token: "browser-proof", idempotencyKey: "idempotent" }),
		).resolves.toEqual({ ok: false, retryable: true });
	});

	it("rejects redirects, wrong MIME, oversized responses, and malformed success schemas", async () => {
		for (const response of [
			new Response(null, {
				status: 302,
				headers: { Location: "https://evil.test" },
			}),
			new Response("success", {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			}),
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					...JSON_HEADERS,
					"Content-Length": String(20_000),
				},
			}),
			jsonResponse({ success: true, hostname: 4, action: "feedback-submit" }),
			jsonResponse({ success: true }),
		]) {
			const port = createCloudflareTurnstilePort({
				secret: "server-secret",
				fetch: async () => response,
			});
			await expect(
				port.verify({ token: "browser-proof", idempotencyKey: "idempotent" }),
			).rejects.toThrow();
		}
	});
});

describe("fixed GitHub Issues provider", () => {
	it("rejects arbitrary repositories and malformed reconciliation markers before network access", async () => {
		const fetch = vi.fn(async () => jsonResponse({ items: [] }));
		const tokens = fixedTokens();
		const port = createGitHubIssuePort({ installationTokens: tokens, fetch });

		await expect(
			port.findSubmission({
				repository: { owner: "attacker", name: "sink" },
				issueNumber: null,
				fingerprintMarker: FINGERPRINT_MARKER,
				submissionMarker: SUBMISSION_MARKER,
			}),
		).rejects.toThrow("approved feedback destination");
		await expect(
			port.findSubmission({
				repository: FEEDBACK_GITHUB_REPOSITORY,
				issueNumber: null,
				fingerprintMarker: '" OR repo:attacker/sink',
				submissionMarker: SUBMISSION_MARKER,
			}),
		).rejects.toThrow("fingerprint marker is invalid");
		expect(fetch).not.toHaveBeenCalled();
		expect(tokens.getToken).not.toHaveBeenCalled();
	});

	it("searches the one repository and recognizes only both authoritative markers", async () => {
		const calls: Array<{ url: URL; init: RequestInit | undefined }> = [];
		const port = createGitHubIssuePort({
			installationTokens: fixedTokens(),
			fetch: async (input, init) => {
				calls.push({ url: new URL(String(input)), init });
				return jsonResponse({
					items: [
						{ number: 8, body: FINGERPRINT_MARKER },
						{
							number: 9,
							body: `${FINGERPRINT_MARKER}\n${SUBMISSION_MARKER}`,
						},
					],
				});
			},
		});
		await expect(
			port.findSubmission({
				repository: FEEDBACK_GITHUB_REPOSITORY,
				issueNumber: null,
				fingerprintMarker: FINGERPRINT_MARKER,
				submissionMarker: SUBMISSION_MARKER,
			}),
		).resolves.toEqual({ issueNumber: 9, commentId: null });
		expect(calls[0]?.url.origin).toBe("https://api.github.com");
		expect(calls[0]?.url.pathname).toBe("/search/issues");
		expect(calls[0]?.url.searchParams.get("q")).toBe(
			`repo:PranavMishra28/eonfolk type:issue "${FINGERPRINT_MARKER}"`,
		);
		expect(calls[0]?.init?.redirect).toBe("manual");
		const headers = calls[0]?.init?.headers as Headers;
		expect(headers.get("Authorization")).toBe(`Bearer ${INSTALLATION_TOKEN}`);
	});

	it("checks the known issue then bounded comment pages for a prior submission", async () => {
		const paths: string[] = [];
		const page = Array.from({ length: 100 }, (_, index) => ({
			id: index + 1,
			body: "different submission",
		}));
		const port = createGitHubIssuePort({
			installationTokens: fixedTokens(),
			fetch: async (input) => {
				const url = new URL(String(input));
				paths.push(`${url.pathname}${url.search}`);
				if (!url.pathname.endsWith("/comments"))
					return jsonResponse({ number: 41, body: FINGERPRINT_MARKER });
				if (url.searchParams.get("page") === "1") return jsonResponse(page);
				return jsonResponse([
					{ id: 404, body: `report\n${SUBMISSION_MARKER}` },
				]);
			},
		});

		await expect(
			port.findSubmission({
				repository: FEEDBACK_GITHUB_REPOSITORY,
				issueNumber: 41,
				fingerprintMarker: FINGERPRINT_MARKER,
				submissionMarker: SUBMISSION_MARKER,
			}),
		).resolves.toEqual({ issueNumber: 41, commentId: 404 });
		expect(paths).toEqual([
			"/repos/PranavMishra28/eonfolk/issues/41",
			"/repos/PranavMishra28/eonfolk/issues/41/comments?per_page=100&page=1",
			"/repos/PranavMishra28/eonfolk/issues/41/comments?per_page=100&page=2",
		]);
	});

	it("creates issues and comments only at fixed paths with bounded, schema-checked responses", async () => {
		const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
		const port = createGitHubIssuePort({
			installationTokens: fixedTokens(),
			fetch: async (input, init) => {
				requests.push({ url: String(input), init });
				return String(input).endsWith("/comments")
					? jsonResponse({ id: 99, body: "accepted" }, 201)
					: jsonResponse({ number: 42, body: "accepted" }, 201);
			},
		});
		await expect(
			port.createIssue({
				repository: FEEDBACK_GITHUB_REPOSITORY,
				title: "Founder Alpha report",
				body: `${FINGERPRINT_MARKER}\n${SUBMISSION_MARKER}`,
			}),
		).resolves.toEqual({ issueNumber: 42 });
		await expect(
			port.createComment({
				repository: FEEDBACK_GITHUB_REPOSITORY,
				issueNumber: 42,
				body: SUBMISSION_MARKER,
			}),
		).resolves.toEqual({ commentId: 99 });
		expect(requests.map(({ url }) => url)).toEqual([
			"https://api.github.com/repos/PranavMishra28/eonfolk/issues",
			"https://api.github.com/repos/PranavMishra28/eonfolk/issues/42/comments",
		]);
		for (const request of requests) {
			expect(request.init).toMatchObject({
				method: "POST",
				redirect: "manual",
			});
			expect(request.init?.body).not.toContain(INSTALLATION_TOKEN);
		}
	});

	it("rejects response redirects, oversized bodies, invalid JSON, and invalid response identifiers", async () => {
		for (const response of [
			new Response(null, {
				status: 307,
				headers: { Location: "https://evil.test" },
			}),
			new Response("x", {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			}),
			new Response("{", { status: 200, headers: JSON_HEADERS }),
			new Response("{}", {
				status: 200,
				headers: {
					...JSON_HEADERS,
					"Content-Length": String(200_000),
				},
			}),
			jsonResponse({ number: "42", body: "invalid" }, 201),
		]) {
			const port = createGitHubIssuePort({
				installationTokens: fixedTokens(),
				fetch: async () => response,
			});
			await expect(
				port.createIssue({
					repository: FEEDBACK_GITHUB_REPOSITORY,
					title: "Founder Alpha report",
					body: SUBMISSION_MARKER,
				}),
			).rejects.toThrow();
		}
	});
});

describe("GitHub App installation-token authority", () => {
	it("signs a bounded RS256 JWT, uses the exact installation path, and caches the short-lived token", async () => {
		const keys = (await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256",
			},
			true,
			["sign", "verify"],
		)) as CryptoKeyPair;
		const pem = base64Pem(
			await crypto.subtle.exportKey("pkcs8", keys.privateKey),
		);
		const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
		const nowMs = Date.parse("2026-08-21T12:00:00.000Z");
		const provider = createGitHubAppInstallationTokenProvider({
			appId: "12345",
			installationId: "67890",
			privateKeyPkcs8Pem: pem,
			now: () => nowMs,
			fetch: async (input, init) => {
				calls.push({ url: String(input), init });
				return jsonResponse({
					token: INSTALLATION_TOKEN,
					expires_at: "2026-08-21T13:00:00.000Z",
				});
			},
		});

		await expect(provider.getToken()).resolves.toBe(INSTALLATION_TOKEN);
		await expect(provider.getToken()).resolves.toBe(INSTALLATION_TOKEN);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(
			"https://api.github.com/app/installations/67890/access_tokens",
		);
		expect(calls[0]?.init).toMatchObject({
			method: "POST",
			redirect: "manual",
		});
		expect(calls[0]?.init?.body).toBeUndefined();
		const headers = calls[0]?.init?.headers as Record<string, string>;
		const jwt = headers.Authorization?.replace("Bearer ", "") ?? "";
		const parts = jwt.split(".");
		expect(parts).toHaveLength(3);
		expect(
			JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")),
		).toEqual({
			iat: Math.floor(nowMs / 1000) - 60,
			exp: Math.floor(nowMs / 1000) - 60 + 540,
			iss: "12345",
		});
		await expect(
			crypto.subtle.verify(
				{ name: "RSASSA-PKCS1-v1_5" },
				keys.publicKey,
				decodeJwtPart(parts[2]!),
				new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
			),
		).resolves.toBe(true);
	});

	it("rejects invalid IDs, encrypted/invalid keys, token schemas, expiries, and redirects", async () => {
		expect(() =>
			createGitHubAppInstallationTokenProvider({
				appId: "../../other",
				installationId: "1",
				privateKeyPkcs8Pem: "not-a-key",
			}),
		).toThrow("App ID");
		expect(() =>
			createGitHubAppInstallationTokenProvider({
				appId: "1",
				installationId: "2",
				privateKeyPkcs8Pem:
					"-----BEGIN ENCRYPTED PRIVATE KEY-----\nAAAA\n-----END ENCRYPTED PRIVATE KEY-----",
			}),
		).toThrow("unencrypted PKCS#8");

		const keys = (await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256",
			},
			true,
			["sign", "verify"],
		)) as CryptoKeyPair;
		const pem = base64Pem(
			await crypto.subtle.exportKey("pkcs8", keys.privateKey),
		);
		for (const response of [
			new Response(null, {
				status: 302,
				headers: { Location: "https://evil.test" },
			}),
			jsonResponse({
				token: "header\r\ninjection",
				expires_at: "2099-01-01T00:00:00Z",
			}),
			jsonResponse({ token: INSTALLATION_TOKEN, expires_at: "invalid" }),
			jsonResponse({
				token: INSTALLATION_TOKEN,
				expires_at: "2026-08-21T12:00:30Z",
			}),
		]) {
			const provider = createGitHubAppInstallationTokenProvider({
				appId: "1",
				installationId: "2",
				privateKeyPkcs8Pem: pem,
				now: () => Date.parse("2026-08-21T12:00:00Z"),
				fetch: async () => response,
			});
			await expect(provider.getToken()).rejects.toThrow();
		}
	});
});
