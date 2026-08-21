import { normalizeIngressText, type RestrictedJson } from "@eonfolk/protocol";
import type { DiagnosticCategory } from "./types";

const allAllowedKeys = new Set([
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

const categoryAllowedKeys: Readonly<
	Record<DiagnosticCategory, ReadonlySet<string>>
> = Object.freeze({
	command: new Set([
		"attempt",
		"code",
		"operation",
		"phase",
		"revision",
		"sequence",
		"status",
	]),
	worker: new Set([
		"attempt",
		"code",
		"operation",
		"phase",
		"revision",
		"sequence",
		"status",
	]),
	persistence: new Set([
		"attempt",
		"byteLength",
		"code",
		"count",
		"operation",
		"phase",
		"revision",
		"sequence",
		"status",
	]),
	cognition: new Set([
		"attempt",
		"code",
		"count",
		"operation",
		"phase",
		"status",
	]),
	chronicle: new Set([
		"code",
		"count",
		"eventCount",
		"operation",
		"phase",
		"revision",
		"sequence",
		"status",
		"visibility",
	]),
	network: new Set([
		"byteLength",
		"code",
		"durationMs",
		"method",
		"operation",
		"originKind",
		"resourceType",
		"status",
	]),
	performance: new Set([
		"count",
		"durationMs",
		"eventCount",
		"operation",
		"phase",
		"resourceType",
		"status",
	]),
	ui: new Set(["code", "mode", "operation", "phase", "status", "visibility"]),
	sentinel: new Set([
		"attempt",
		"code",
		"fingerprint",
		"invariant",
		"phase",
		"recovery",
		"status",
	]),
});

const forbiddenKey =
	/(?:authorization|cookie|credential|html|markdown|password|prompt|reasoning|secret|sql|token|url|body|chain.?of.?thought)/iu;

const safeValue = /^[a-z0-9][a-z0-9._:-]*$/iu;
const forbiddenValue =
	/(?:authorization|bearer|cookie|credential|password|prompt|reasoning|secret|sql|token|https?:|file:|chain.?of.?thought)/iu;

const numericKeys = new Set([
	"attempt",
	"byteLength",
	"count",
	"durationMs",
	"eventCount",
	"revision",
	"sequence",
]);

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
	seen: WeakSet<object> = new WeakSet(),
	depth = 0,
): RestrictedJson | undefined {
	if (value === null || typeof value === "boolean") return value;
	if (typeof value === "number")
		return Number.isSafeInteger(value) ? value : undefined;
	if (typeof value === "string") {
		try {
			const normalized = normalizeIngressText(value, {
				maxBytes: limits.maximumStringBytes,
				maxCodePoints: limits.maximumStringCodePoints,
			});
			return safeValue.test(normalized) && !forbiddenValue.test(normalized)
				? normalized
				: "[redacted:unsafe-string]";
		} catch {
			return "[redacted:out-of-bounds]";
		}
	}
	if (Array.isArray(value)) {
		if (depth >= 1 || seen.has(value)) return undefined;
		seen.add(value);
		return value.slice(0, limits.maximumArrayItems).flatMap((item) => {
			const sanitized = sanitizeValue(item, limits, seen, depth + 1);
			return sanitized === undefined ? [] : [sanitized];
		});
	}
	return undefined;
}

function sanitizeFields(
	fields: Readonly<Record<string, unknown>> | undefined,
	allowedKeys: ReadonlySet<string>,
	limits: RedactionLimits,
	enforceFieldTypes = false,
): Readonly<Record<string, RestrictedJson>> {
	if (!fields) return Object.freeze({});
	const result: Record<string, RestrictedJson> = {};
	let keys: string[];
	try {
		keys = Object.keys(fields).sort().slice(0, limits.maximumFields);
	} catch {
		return Object.freeze({});
	}
	for (const key of keys) {
		if (forbiddenKey.test(key) || !allowedKeys.has(key)) continue;
		let sanitized: RestrictedJson | undefined;
		try {
			sanitized = sanitizeValue(fields[key], limits);
		} catch {
			continue;
		}
		if (
			enforceFieldTypes &&
			(numericKeys.has(key)
				? typeof sanitized !== "number"
				: typeof sanitized !== "string")
		)
			continue;
		if (sanitized !== undefined) result[key] = sanitized;
	}
	return Object.freeze(result);
}

export function sanitizeDiagnosticFields(
	fields: Readonly<Record<string, unknown>> | undefined,
	limits: RedactionLimits = defaultRedactionLimits,
): Readonly<Record<string, RestrictedJson>> {
	return sanitizeFields(fields, allAllowedKeys, limits);
}

export function sanitizeDiagnosticFieldsForCategory(
	category: DiagnosticCategory,
	fields: Readonly<Record<string, unknown>> | undefined,
	limits: RedactionLimits = defaultRedactionLimits,
): Readonly<Record<string, RestrictedJson>> {
	return sanitizeFields(fields, categoryAllowedKeys[category], limits, true);
}
