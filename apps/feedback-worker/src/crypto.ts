import type {
	DigestPort,
	FeedbackDiagnostics,
	FeedbackSubmission,
	PersistedFeedbackPayload,
	SourceQuotaPort,
} from "./contracts.js";

function bytesToHex(bytes: Uint8Array): string {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createHmacSourceQuotaPort(input: {
	readonly secret: CryptoKey;
	readonly sourceHeader?: string;
}): SourceQuotaPort {
	const sourceHeader = input.sourceHeader ?? "CF-Connecting-IP";
	if (!/^[A-Za-z0-9-]{1,64}$/u.test(sourceHeader))
		throw new TypeError("source quota header name is invalid");
	if (input.secret.type !== "secret" || input.secret.algorithm.name !== "HMAC")
		throw new TypeError("source quota secret must be an HMAC CryptoKey");
	return Object.freeze({
		async bucketKeys({
			request,
			nowMs,
		}: {
			readonly request: Request;
			readonly nowMs: number;
		}) {
			const source = request.headers.get(sourceHeader);
			if (
				source === null ||
				source.length < 1 ||
				source.length > 128 ||
				!/^[A-Fa-f0-9:.]+$/u.test(source)
			)
				throw new TypeError("source quota identity is unavailable");
			const hour = Math.floor(nowMs / 3_600_000);
			const day = Math.floor(nowMs / 86_400_000);
			const sign = async (scope: "hour" | "day", bucket: number) => {
				const signature = await crypto.subtle.sign(
					"HMAC",
					input.secret,
					new TextEncoder().encode(
						`eonfolk-feedback-source-v1\u0000${scope}\u0000${bucket}\u0000${source}`,
					),
				);
				return bytesToHex(new Uint8Array(signature));
			};
			const [hourKey, dayKey] = await Promise.all([
				sign("hour", hour),
				sign("day", day),
			]);
			return Object.freeze({ hourKey, dayKey });
		},
	});
}

function canonicalize(value: unknown): string {
	if (value === null || typeof value === "boolean" || typeof value === "number")
		return JSON.stringify(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
	if (typeof value === "object") {
		const record = value as Readonly<Record<string, unknown>>;
		return `{${Object.keys(record)
			.sort()
			.filter((key) => record[key] !== undefined)
			.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
			.join(",")}}`;
	}
	throw new TypeError("value is not canonical JSON");
}

export const webCryptoDigest: DigestPort = Object.freeze({
	async digestHex(value: string): Promise<string> {
		const bytes = new TextEncoder().encode(value);
		const digest = await crypto.subtle.digest("SHA-256", bytes);
		return [...new Uint8Array(digest)]
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
	},
});

function stableDiagnostics(
	diagnostics: FeedbackDiagnostics | undefined,
): FeedbackDiagnostics | null {
	return diagnostics ?? null;
}

export async function computeFingerprint(
	submission: FeedbackSubmission,
	digest: DigestPort,
): Promise<string> {
	return digest.digestHex(
		canonicalize({
			schemaVersion: submission.schemaVersion,
			category: submission.category,
			diagnostics: stableDiagnostics(submission.diagnostics),
		}),
	);
}

export async function computePayloadDigest(
	payload: PersistedFeedbackPayload,
	digest: DigestPort,
): Promise<string> {
	return digest.digestHex(canonicalize(payload));
}

export function serializePayload(payload: PersistedFeedbackPayload): string {
	return canonicalize(payload);
}
