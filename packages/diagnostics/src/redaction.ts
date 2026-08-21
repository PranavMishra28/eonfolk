import { normalizeIngressText, type RestrictedJson } from "@eonfolk/protocol";

const allowedKeys = new Set([
	"artifactKind",
	"attempt",
	"byteLength",
	"code",
	"component",
	"count",
	"durationMs",
	"eventCount",
	"fingerprint",
	"invariant",
	"method",
	"mode",
	"operation",
	"originKind",
	"phase",
	"recovery",
	"resourceType",
	"revision",
	"sequence",
	"status",
	"visibility",
]);

const forbiddenKey =
	/(?:authorization|cookie|credential|html|markdown|password|prompt|reasoning|secret|sql|token|url|body|chain.?of.?thought)/iu;

export interface RedactionLimits {
	readonly maximumFields: number;
	readonly maximumArrayItems: number;
	readonly maximumStringBytes: number;
	readonly maximumStringCodePoints: number;
}

export const defaultRedactionLimits: RedactionLimits = Object.freeze({
	maximumFields: 24,
	maximumArrayItems: 16,
	maximumStringBytes: 256,
	maximumStringCodePoints: 128,
});

function sanitizeValue(
	value: unknown,
	limits: RedactionLimits,
): RestrictedJson | undefined {
	if (value === null || typeof value === "boolean") return value;
	if (typeof value === "number")
		return Number.isSafeInteger(value) ? value : undefined;
	if (typeof value === "string") {
		try {
			return normalizeIngressText(value, {
				maxBytes: limits.maximumStringBytes,
				maxCodePoints: limits.maximumStringCodePoints,
			});
		} catch {
			return "[redacted:out-of-bounds]";
		}
	}
	if (Array.isArray(value)) {
		return value.slice(0, limits.maximumArrayItems).flatMap((item) => {
			const sanitized = sanitizeValue(item, limits);
			return sanitized === undefined ? [] : [sanitized];
		});
	}
	return undefined;
}

export function sanitizeDiagnosticFields(
	fields: Readonly<Record<string, unknown>> | undefined,
	limits: RedactionLimits = defaultRedactionLimits,
): Readonly<Record<string, RestrictedJson>> {
	if (!fields) return Object.freeze({});
	const result: Record<string, RestrictedJson> = {};
	for (const key of Object.keys(fields).sort().slice(0, limits.maximumFields)) {
		if (forbiddenKey.test(key) || !allowedKeys.has(key)) continue;
		const sanitized = sanitizeValue(fields[key], limits);
		if (sanitized !== undefined) result[key] = sanitized;
	}
	return Object.freeze(result);
}
