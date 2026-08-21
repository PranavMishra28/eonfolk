import {
	FEEDBACK_SCHEMA_VERSION,
	type FeedbackCategory,
	type FeedbackDiagnostics,
	type FeedbackStackFrame,
	type FeedbackSubmission,
	MAX_DIAGNOSTICS_BYTES,
	MAX_PROSE_SCALARS,
	type PersistedFeedbackPayload,
} from "./contracts.js";

const SUBMISSION_ID = /^sub_[a-f0-9]{32}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const SAFE_FUNCTION = /^[A-Za-z0-9_$<>.[\](): -]{1,96}$/u;
const SAFE_SOURCE = /^[A-Za-z0-9_./-]{1,128}$/u;
const CATEGORIES = new Set<FeedbackCategory>([
	"bug",
	"confusing",
	"idea",
	"story",
]);
const SENSITIVE_TEXT = [
	/\b(?:bearer\s+)[a-z0-9._~+/-]+=*/giu,
	/\bgh[oprsu]_[a-z0-9]{20,}\b/giu,
	/\b(?:sk|pk)_(?:live|test)_[a-z0-9]{12,}\b/giu,
	/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/giu,
] as const;
const URL_TEXT = /\bhttps?:\/\/[^\s<>]+/giu;

export class SchemaError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "SchemaError";
		this.code = code;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(
	record: Readonly<Record<string, unknown>>,
	allowed: ReadonlySet<string>,
	label: string,
): void {
	for (const key of Object.keys(record)) {
		if (!allowed.has(key))
			throw new SchemaError("unknown-field", `${label}.${key} is not allowed`);
	}
}

function hasUnpairedSurrogate(value: string): boolean {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next < 0xdc00 || next > 0xdfff) return true;
			index += 1;
		} else if (code >= 0xdc00 && code <= 0xdfff) return true;
	}
	return false;
}

function sanitizedText(value: unknown): string {
	if (typeof value !== "string")
		throw new SchemaError("invalid-text", "text must be a string");
	if (hasUnpairedSurrogate(value))
		throw new SchemaError("invalid-text", "text contains invalid Unicode");
	let normalized = value.normalize("NFC").trim();
	if (normalized.length === 0)
		throw new SchemaError("invalid-text", "text must not be empty");
	if ([...normalized].length > MAX_PROSE_SCALARS)
		throw new SchemaError(
			"invalid-text",
			"text exceeds the scalar-value limit",
		);
	if (/[\p{Cc}\p{Cf}]/u.test(normalized.replace(/[\n\t]/gu, "")))
		throw new SchemaError("invalid-text", "text contains control characters");
	for (const pattern of SENSITIVE_TEXT)
		normalized = normalized.replace(pattern, "[redacted]");
	normalized = normalized.replace(URL_TEXT, "[redacted-url]");
	return normalized;
}

function safeId(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !SAFE_ID.test(value))
		throw new SchemaError(
			"invalid-diagnostics",
			`${field} is not a safe identifier`,
		);
	return value;
}

function positiveInteger(value: unknown, field: string): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || (value as number) < 0)
		throw new SchemaError(
			"invalid-diagnostics",
			`${field} must be a non-negative integer`,
		);
	return value as number;
}

function parseStackFrame(value: unknown): FeedbackStackFrame {
	if (!isRecord(value))
		throw new SchemaError(
			"invalid-diagnostics",
			"stack frame must be an object",
		);
	requireExactKeys(
		value,
		new Set(["functionName", "source", "line", "column"]),
		"diagnostics.stackFrames[]",
	);
	const functionName = value.functionName;
	if (
		functionName !== undefined &&
		(typeof functionName !== "string" || !SAFE_FUNCTION.test(functionName))
	)
		throw new SchemaError(
			"invalid-diagnostics",
			"functionName is not normalized",
		);
	const source = value.source;
	if (
		source !== undefined &&
		(typeof source !== "string" ||
			!SAFE_SOURCE.test(source) ||
			source.startsWith("/") ||
			source.includes("..") ||
			source.includes("://"))
	)
		throw new SchemaError(
			"invalid-diagnostics",
			"source is not an approved route-relative path",
		);
	const frame: {
		functionName?: string;
		source?: string;
		line?: number;
		column?: number;
	} = {};
	if (typeof functionName === "string") frame.functionName = functionName;
	if (typeof source === "string") frame.source = source;
	const line = positiveInteger(value.line, "line");
	if (line !== undefined) frame.line = line;
	const column = positiveInteger(value.column, "column");
	if (column !== undefined) frame.column = column;
	if (Object.keys(frame).length === 0)
		throw new SchemaError(
			"invalid-diagnostics",
			"stack frame must not be empty",
		);
	return Object.freeze(frame);
}

function parseDiagnostics(value: unknown): FeedbackDiagnostics {
	if (!isRecord(value))
		throw new SchemaError(
			"invalid-diagnostics",
			"diagnostics must be an object",
		);
	requireExactKeys(
		value,
		new Set([
			"errorCode",
			"routeId",
			"buildVersion",
			"invariantId",
			"stackFrames",
		]),
		"diagnostics",
	);
	const diagnostics: {
		errorCode?: string;
		routeId?: string;
		buildVersion?: string;
		invariantId?: string;
		stackFrames?: readonly FeedbackStackFrame[];
	} = {};
	for (const field of [
		"errorCode",
		"routeId",
		"buildVersion",
		"invariantId",
	] as const) {
		const parsed = safeId(value[field], field);
		if (parsed !== undefined) diagnostics[field] = parsed;
	}
	if (value.stackFrames !== undefined) {
		if (!Array.isArray(value.stackFrames) || value.stackFrames.length > 8)
			throw new SchemaError(
				"invalid-diagnostics",
				"stackFrames must contain at most eight frames",
			);
		diagnostics.stackFrames = Object.freeze(
			value.stackFrames.map(parseStackFrame),
		);
	}
	if (Object.keys(diagnostics).length === 0)
		throw new SchemaError(
			"invalid-diagnostics",
			"diagnostics must not be empty",
		);
	if (
		new TextEncoder().encode(JSON.stringify(diagnostics)).byteLength >
		MAX_DIAGNOSTICS_BYTES
	)
		throw new SchemaError(
			"invalid-diagnostics",
			"diagnostics exceeds the byte limit",
		);
	return Object.freeze(diagnostics);
}

export function parseFeedbackSubmission(value: unknown): FeedbackSubmission {
	if (!isRecord(value))
		throw new SchemaError("invalid-envelope", "request body must be an object");
	requireExactKeys(
		value,
		new Set([
			"schemaVersion",
			"submissionId",
			"category",
			"text",
			"diagnosticsConsent",
			"diagnostics",
			"turnstileToken",
		]),
		"feedback",
	);
	if (value.schemaVersion !== FEEDBACK_SCHEMA_VERSION)
		throw new SchemaError(
			"unsupported-schema",
			"schemaVersion is not supported",
		);
	if (
		typeof value.submissionId !== "string" ||
		!SUBMISSION_ID.test(value.submissionId)
	)
		throw new SchemaError(
			"invalid-submission-id",
			"submissionId must contain 128 random bits as lowercase hex",
		);
	if (
		typeof value.category !== "string" ||
		!CATEGORIES.has(value.category as FeedbackCategory)
	)
		throw new SchemaError("invalid-category", "category is not supported");
	if (typeof value.diagnosticsConsent !== "boolean")
		throw new SchemaError(
			"invalid-consent",
			"diagnosticsConsent must be boolean",
		);
	if (
		typeof value.turnstileToken !== "string" ||
		value.turnstileToken.length < 1 ||
		value.turnstileToken.length > 2_048
	)
		throw new SchemaError(
			"invalid-turnstile-token",
			"turnstileToken is invalid",
		);
	if (value.diagnostics !== undefined && value.diagnosticsConsent !== true)
		throw new SchemaError(
			"invalid-consent",
			"diagnostics requires explicit consent",
		);
	const submission: {
		schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
		submissionId: string;
		category: FeedbackCategory;
		text: string;
		diagnosticsConsent: boolean;
		diagnostics?: FeedbackDiagnostics;
		turnstileToken: string;
	} = {
		schemaVersion: FEEDBACK_SCHEMA_VERSION,
		submissionId: value.submissionId,
		category: value.category as FeedbackCategory,
		text: sanitizedText(value.text),
		diagnosticsConsent: value.diagnosticsConsent,
		turnstileToken: value.turnstileToken,
	};
	if (value.diagnostics !== undefined)
		submission.diagnostics = parseDiagnostics(value.diagnostics);
	return Object.freeze(submission);
}

export function persistedPayload(
	submission: FeedbackSubmission,
): PersistedFeedbackPayload {
	const payload: {
		schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
		submissionId: string;
		category: FeedbackCategory;
		text: string;
		diagnosticsConsent: boolean;
		diagnostics?: FeedbackDiagnostics;
	} = {
		schemaVersion: submission.schemaVersion,
		submissionId: submission.submissionId,
		category: submission.category,
		text: submission.text,
		diagnosticsConsent: submission.diagnosticsConsent,
	};
	if (submission.diagnostics !== undefined)
		payload.diagnostics = submission.diagnostics;
	return Object.freeze(payload);
}
