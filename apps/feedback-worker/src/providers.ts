import {
	FEEDBACK_GITHUB_REPOSITORY,
	type GitHubDeliveryMatch,
	type GitHubIssuePort,
	type TurnstilePort,
	type TurnstileVerification,
} from "./contracts.js";

const TURNSTILE_SITEVERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";
const GITHUB_API_ORIGIN = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const TURNSTILE_RESPONSE_LIMIT = 16 * 1024;
const GITHUB_RESPONSE_LIMIT = 128 * 1024;
const GITHUB_COMMENT_PAGE_LIMIT = 5;
const GITHUB_PAGE_SIZE = 100;
const MAX_GITHUB_BODY_BYTES = 64 * 1024;
const MAX_GITHUB_TITLE_SCALARS = 256;
const TOKEN_PATTERN = /^[A-Za-z0-9_]{20,512}$/u;
const NUMERIC_ID_PATTERN = /^[1-9][0-9]{0,19}$/u;
const FINGERPRINT_MARKER_PATTERN =
	/^<!-- eonfolk-feedback:fingerprint:[a-f0-9]{64} -->$/u;
const SUBMISSION_MARKER_PATTERN =
	/^<!-- eonfolk-feedback:submission:sub_[a-f0-9]{32} -->$/u;
const UTF8 = new TextEncoder();

type FetchPort = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export interface InstallationTokenProvider {
	getToken(): Promise<string>;
}

export interface CloudflareTurnstileConfig {
	readonly secret: string;
	readonly fetch?: FetchPort;
}

export interface GitHubIssueProviderConfig {
	readonly installationTokens: InstallationTokenProvider;
	readonly fetch?: FetchPort;
}

export interface GitHubAppInstallationTokenConfig {
	readonly appId: string;
	readonly installationId: string;
	readonly privateKeyPkcs8Pem: string;
	readonly fetch?: FetchPort;
	readonly crypto?: Crypto;
	readonly now?: () => number;
}

function requireCredential(value: string, label: string): string {
	if (
		value.length < 1 ||
		value.length > 16 * 1024 ||
		value.includes("\r") ||
		value.includes("\n") ||
		value.includes(String.fromCharCode(0))
	)
		throw new Error(`${label} is invalid`);
	return value;
}

function requireInstallationToken(value: string): string {
	if (!TOKEN_PATTERN.test(value))
		throw new Error("GitHub installation token has an invalid shape");
	return value;
}

function requireNumericId(value: string, label: string): string {
	if (!NUMERIC_ID_PATTERN.test(value)) throw new Error(`${label} is invalid`);
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBoundedJson(
	response: Response,
	maxBytes: number,
	label: string,
): Promise<unknown> {
	const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
	if (!contentType.startsWith("application/json"))
		throw new Error(`${label} returned a non-JSON response`);
	const contentLength = response.headers.get("Content-Length");
	if (
		contentLength !== null &&
		(/^\d+$/u.test(contentLength) === false || Number(contentLength) > maxBytes)
	)
		throw new Error(`${label} response exceeded its byte limit`);
	if (response.body === null)
		throw new Error(`${label} returned an empty response`);

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const result = await reader.read();
		if (result.done) break;
		total += result.value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw new Error(`${label} response exceeded its byte limit`);
		}
		chunks.push(result.value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error(`${label} returned invalid UTF-8`);
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new Error(`${label} returned invalid JSON`);
	}
}

function requestFetch(configured?: FetchPort): FetchPort {
	if (configured !== undefined) return configured;
	return globalThis.fetch.bind(globalThis);
}

function isRetryableTurnstileError(value: unknown): boolean {
	return (
		Array.isArray(value) && value.some((item) => item === "internal-error")
	);
}

export function createCloudflareTurnstilePort(
	config: CloudflareTurnstileConfig,
): TurnstilePort {
	const secret = requireCredential(config.secret, "Turnstile secret");
	const performFetch = requestFetch(config.fetch);
	return Object.freeze({
		async verify(input: {
			readonly token: string;
			readonly idempotencyKey: string;
		}): Promise<TurnstileVerification> {
			const body = new URLSearchParams({
				secret,
				response: requireCredential(input.token, "Turnstile token"),
				idempotency_key: requireCredential(
					input.idempotencyKey,
					"Turnstile idempotency key",
				),
			});
			const response = await performFetch(TURNSTILE_SITEVERIFY_URL, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
				},
				body,
				redirect: "manual",
			});
			if (!response.ok)
				throw new Error(`Turnstile Siteverify failed with ${response.status}`);
			const value = await readBoundedJson(
				response,
				TURNSTILE_RESPONSE_LIMIT,
				"Turnstile Siteverify",
			);
			if (!isRecord(value) || typeof value.success !== "boolean")
				throw new Error("Turnstile Siteverify returned an invalid schema");
			if (value.hostname !== undefined && typeof value.hostname !== "string")
				throw new Error("Turnstile Siteverify returned an invalid hostname");
			if (value.action !== undefined && typeof value.action !== "string")
				throw new Error("Turnstile Siteverify returned an invalid action");
			if (
				value.success &&
				(typeof value.hostname !== "string" || typeof value.action !== "string")
			)
				throw new Error("Turnstile Siteverify omitted verified binding data");
			return Object.freeze({
				ok: value.success,
				...(typeof value.hostname === "string"
					? { hostname: value.hostname }
					: {}),
				...(typeof value.action === "string" ? { action: value.action } : {}),
				...(isRetryableTurnstileError(value["error-codes"])
					? { retryable: true }
					: {}),
			});
		},
	});
}

function githubPath(path: string, query?: URLSearchParams): string {
	const url = new URL(path, GITHUB_API_ORIGIN);
	if (url.origin !== GITHUB_API_ORIGIN || url.pathname !== path)
		throw new Error("GitHub API path is invalid");
	if (query !== undefined) url.search = query.toString();
	return url.href;
}

function assertFixedRepository(
	repository: Readonly<{ owner: string; name: string }>,
): void {
	if (
		repository.owner !== FEEDBACK_GITHUB_REPOSITORY.owner ||
		repository.name !== FEEDBACK_GITHUB_REPOSITORY.name
	)
		throw new Error(
			"GitHub repository is not the approved feedback destination",
		);
}

function requirePositiveInteger(value: unknown, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 1)
		throw new Error(`${label} is invalid`);
	return value as number;
}

function requireIssueBody(value: unknown): string {
	if (typeof value !== "string")
		throw new Error("GitHub issue body is invalid");
	return value;
}

function parseIssue(value: unknown): { number: number; body: string } {
	if (!isRecord(value)) throw new Error("GitHub issue response is invalid");
	return {
		number: requirePositiveInteger(value.number, "GitHub issue number"),
		body: requireIssueBody(value.body),
	};
}

function parseComment(value: unknown): { id: number; body: string } {
	if (!isRecord(value)) throw new Error("GitHub comment response is invalid");
	return {
		id: requirePositiveInteger(value.id, "GitHub comment id"),
		body: requireIssueBody(value.body),
	};
}

function requireGitHubText(
	value: string,
	label: string,
	maxBytes: number,
): string {
	if (value.length < 1 || UTF8.encode(value).byteLength > maxBytes)
		throw new Error(`${label} is invalid`);
	return value;
}

function requireMarker(value: string, pattern: RegExp, label: string): string {
	if (!pattern.test(value)) throw new Error(`${label} is invalid`);
	return value;
}

function requireIssueNumber(value: number): number {
	return requirePositiveInteger(value, "GitHub issue number");
}

function githubHeaders(token: string, hasBody = false): Headers {
	const headers = new Headers({
		Accept: "application/vnd.github+json",
		Authorization: `Bearer ${requireInstallationToken(token)}`,
		"X-GitHub-Api-Version": GITHUB_API_VERSION,
	});
	if (hasBody) headers.set("Content-Type", "application/json");
	return headers;
}

async function githubJson(
	performFetch: FetchPort,
	tokens: InstallationTokenProvider,
	url: string,
	init: RequestInit = {},
): Promise<unknown> {
	const parsedUrl = new URL(url);
	if (parsedUrl.origin !== GITHUB_API_ORIGIN)
		throw new Error("GitHub API origin is invalid");
	const token = await tokens.getToken();
	const response = await performFetch(url, {
		...init,
		headers: githubHeaders(token, init.body !== undefined),
		redirect: "manual",
	});
	if (!response.ok)
		throw new Error(`GitHub API request failed with ${response.status}`);
	return readBoundedJson(response, GITHUB_RESPONSE_LIMIT, "GitHub API");
}

export function createGitHubIssuePort(
	config: GitHubIssueProviderConfig,
): GitHubIssuePort {
	const performFetch = requestFetch(config.fetch);
	const repositoryPath = `/repos/${FEEDBACK_GITHUB_REPOSITORY.owner}/${FEEDBACK_GITHUB_REPOSITORY.name}`;
	return Object.freeze({
		async findSubmission(input: {
			readonly repository: Readonly<{ owner: string; name: string }>;
			readonly issueNumber: number | null;
			readonly fingerprintMarker: string;
			readonly submissionMarker: string;
		}): Promise<GitHubDeliveryMatch | null> {
			assertFixedRepository(input.repository);
			const fingerprintMarker = requireMarker(
				input.fingerprintMarker,
				FINGERPRINT_MARKER_PATTERN,
				"fingerprint marker",
			);
			const submissionMarker = requireMarker(
				input.submissionMarker,
				SUBMISSION_MARKER_PATTERN,
				"submission marker",
			);
			if (input.issueNumber === null) {
				const query = new URLSearchParams({
					q: `repo:${FEEDBACK_GITHUB_REPOSITORY.owner}/${FEEDBACK_GITHUB_REPOSITORY.name} type:issue "${fingerprintMarker}"`,
					per_page: "10",
				});
				const value = await githubJson(
					performFetch,
					config.installationTokens,
					githubPath("/search/issues", query),
				);
				if (!isRecord(value) || !Array.isArray(value.items))
					throw new Error("GitHub issue search returned an invalid schema");
				for (const candidate of value.items) {
					const issue = parseIssue(candidate);
					if (
						issue.body.includes(fingerprintMarker) &&
						issue.body.includes(submissionMarker)
					)
						return { issueNumber: issue.number, commentId: null };
				}
				return null;
			}

			const issueNumber = requireIssueNumber(input.issueNumber);
			const issue = parseIssue(
				await githubJson(
					performFetch,
					config.installationTokens,
					githubPath(`${repositoryPath}/issues/${issueNumber}`),
				),
			);
			if (
				issue.body.includes(fingerprintMarker) &&
				issue.body.includes(submissionMarker)
			)
				return { issueNumber, commentId: null };

			for (let page = 1; page <= GITHUB_COMMENT_PAGE_LIMIT; page += 1) {
				const query = new URLSearchParams({
					per_page: String(GITHUB_PAGE_SIZE),
					page: String(page),
				});
				const value = await githubJson(
					performFetch,
					config.installationTokens,
					githubPath(`${repositoryPath}/issues/${issueNumber}/comments`, query),
				);
				if (!Array.isArray(value))
					throw new Error("GitHub comments response is invalid");
				for (const candidate of value) {
					const comment = parseComment(candidate);
					if (comment.body.includes(submissionMarker))
						return { issueNumber, commentId: comment.id };
				}
				if (value.length < GITHUB_PAGE_SIZE) break;
			}
			return null;
		},

		async createIssue(input: {
			readonly repository: Readonly<{ owner: string; name: string }>;
			readonly title: string;
			readonly body: string;
		}): Promise<{ readonly issueNumber: number }> {
			assertFixedRepository(input.repository);
			const title = requireGitHubText(input.title, "GitHub issue title", 1024);
			if ([...title].length > MAX_GITHUB_TITLE_SCALARS)
				throw new Error("GitHub issue title is too long");
			const body = requireGitHubText(
				input.body,
				"GitHub issue body",
				MAX_GITHUB_BODY_BYTES,
			);
			const value = await githubJson(
				performFetch,
				config.installationTokens,
				githubPath(`${repositoryPath}/issues`),
				{ method: "POST", body: JSON.stringify({ title, body }) },
			);
			return { issueNumber: parseIssue(value).number };
		},

		async createComment(input: {
			readonly repository: Readonly<{ owner: string; name: string }>;
			readonly issueNumber: number;
			readonly body: string;
		}): Promise<{ readonly commentId: number }> {
			assertFixedRepository(input.repository);
			const issueNumber = requireIssueNumber(input.issueNumber);
			const body = requireGitHubText(
				input.body,
				"GitHub comment body",
				MAX_GITHUB_BODY_BYTES,
			);
			const value = await githubJson(
				performFetch,
				config.installationTokens,
				githubPath(`${repositoryPath}/issues/${issueNumber}/comments`),
				{ method: "POST", body: JSON.stringify({ body }) },
			);
			return { commentId: parseComment(value).id };
		},
	});
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const normalized = value.replace(/\s/gu, "");
	if (
		normalized.length === 0 ||
		normalized.length % 4 !== 0 ||
		/^[A-Za-z0-9+/]+={0,2}$/u.test(normalized) === false
	)
		throw new Error("GitHub App private key is not valid base64");
	const outputLength =
		(normalized.length / 4) * 3 -
		(normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0);
	const output = new Uint8Array(new ArrayBuffer(outputLength));
	let outputIndex = 0;
	for (let index = 0; index < normalized.length; index += 4) {
		const first = alphabet.indexOf(normalized[index]!);
		const second = alphabet.indexOf(normalized[index + 1]!);
		const third =
			normalized[index + 2] === "="
				? 0
				: alphabet.indexOf(normalized[index + 2]!);
		const fourth =
			normalized[index + 3] === "="
				? 0
				: alphabet.indexOf(normalized[index + 3]!);
		if (first < 0 || second < 0 || third < 0 || fourth < 0)
			throw new Error("GitHub App private key is not valid base64");
		const bits = (first << 18) | (second << 12) | (third << 6) | fourth;
		if (outputIndex < output.length) output[outputIndex++] = bits >> 16;
		if (outputIndex < output.length) output[outputIndex++] = (bits >> 8) & 255;
		if (outputIndex < output.length) output[outputIndex++] = bits & 255;
	}
	return output;
}

function encodeBase64Url(value: Uint8Array): string {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let output = "";
	for (let index = 0; index < value.length; index += 3) {
		const first = value[index]!;
		const second = value[index + 1];
		const third = value[index + 2];
		output += alphabet[first >> 2];
		output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
		if (second !== undefined)
			output += alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
		if (third !== undefined) output += alphabet[third & 63];
	}
	return output;
}

function parsePkcs8Pem(value: string): Uint8Array<ArrayBuffer> {
	const match =
		/^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+)\s+-----END PRIVATE KEY-----$/u.exec(
			value.trim(),
		);
	if (match?.[1] === undefined)
		throw new Error("GitHub App private key must be unencrypted PKCS#8 PEM");
	return decodeBase64(match[1]);
}

async function createGitHubAppJwt(
	appId: string,
	privateKey: CryptoKey,
	cryptoPort: Crypto,
	nowMs: number,
): Promise<string> {
	const issuedAt = Math.floor(nowMs / 1000) - 60;
	const header = encodeBase64Url(
		UTF8.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
	);
	const payload = encodeBase64Url(
		UTF8.encode(
			JSON.stringify({ iat: issuedAt, exp: issuedAt + 540, iss: appId }),
		),
	);
	const signingInput = `${header}.${payload}`;
	const signature = await cryptoPort.subtle.sign(
		{ name: "RSASSA-PKCS1-v1_5" },
		privateKey,
		UTF8.encode(signingInput),
	);
	return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export function createGitHubAppInstallationTokenProvider(
	config: GitHubAppInstallationTokenConfig,
): InstallationTokenProvider {
	const appId = requireNumericId(config.appId, "GitHub App ID");
	const installationId = requireNumericId(
		config.installationId,
		"GitHub App installation ID",
	);
	const privateKeyBytes = parsePkcs8Pem(config.privateKeyPkcs8Pem);
	const performFetch = requestFetch(config.fetch);
	const cryptoPort = config.crypto ?? globalThis.crypto;
	const now = config.now ?? Date.now;
	let importedKey: Promise<CryptoKey> | undefined;
	let cached: { token: string; expiresAtMs: number } | undefined;

	return Object.freeze({
		async getToken(): Promise<string> {
			const currentTime = now();
			if (cached !== undefined && cached.expiresAtMs - currentTime > 60_000)
				return cached.token;
			importedKey ??= cryptoPort.subtle.importKey(
				"pkcs8",
				privateKeyBytes,
				{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
				false,
				["sign"],
			);
			const jwt = await createGitHubAppJwt(
				appId,
				await importedKey,
				cryptoPort,
				currentTime,
			);
			const url = githubPath(
				`/app/installations/${installationId}/access_tokens`,
			);
			const response = await performFetch(url, {
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${jwt}`,
					"X-GitHub-Api-Version": GITHUB_API_VERSION,
				},
				redirect: "manual",
			});
			if (!response.ok)
				throw new Error(
					`GitHub App token exchange failed with ${response.status}`,
				);
			const value = await readBoundedJson(
				response,
				GITHUB_RESPONSE_LIMIT,
				"GitHub App token exchange",
			);
			if (
				!isRecord(value) ||
				typeof value.token !== "string" ||
				typeof value.expires_at !== "string"
			)
				throw new Error("GitHub App token exchange returned an invalid schema");
			const token = requireInstallationToken(value.token);
			const expiresAtMs = Date.parse(value.expires_at);
			if (!Number.isFinite(expiresAtMs) || expiresAtMs <= currentTime + 60_000)
				throw new Error("GitHub App token expiry is invalid");
			cached = { token, expiresAtMs };
			return token;
		},
	});
}
