import type {
	DigestPort,
	FeedbackDiagnostics,
	FeedbackSubmission,
	PersistedFeedbackPayload,
} from "./contracts.js";

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
