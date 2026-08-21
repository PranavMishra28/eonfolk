import {
	diagnosticIncidentSummary,
	type IncidentSummaryCode,
	type ObserverProjection,
} from "@eonfolk/diagnostics";
import { normalizeIngressText } from "@eonfolk/protocol";

export const FEEDBACK_SCHEMA_VERSION = "eonfolk-feedback-v1" as const;
export const LOCAL_FEEDBACK_DIAGNOSTICS_VERSION =
	"eonfolk-local-feedback-diagnostics-v1" as const;
const STORAGE_KEY = "eonfolk:founder-alpha-feedback:v1";
const MAX_REPORTS = 3;
export const FEEDBACK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
export const FEEDBACK_QUEUE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const MAX_LOCAL_DIAGNOSTICS_BYTES = 24 * 1024;
const MAX_INPUT_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_IMAGE_BYTES = 768 * 1024;
const MAX_IMAGE_EDGE = 1440;

export type FeedbackCategory = "bug" | "confusing" | "idea" | "story";

export const FEEDBACK_HAPPENED_MAX_LENGTH = 1_600;
export const FEEDBACK_EXPECTED_MAX_LENGTH = 300;

export interface SanitizedFeedbackImage {
	readonly mimeType: "image/webp" | "image/png";
	readonly width: number;
	readonly height: number;
	readonly byteLength: number;
	readonly dataUrl: string;
}

export interface LocalFeedbackReport {
	readonly schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
	readonly reportId: string;
	readonly category: FeedbackCategory;
	readonly text: string;
	readonly createdAtMs: number;
	readonly diagnostics: LocalFeedbackDiagnostics | null;
	readonly attachment: SanitizedFeedbackImage | null;
	readonly delivery: "local-only";
}

export interface LocalFeedbackDiagnostics {
	readonly schemaVersion: typeof LOCAL_FEEDBACK_DIAGNOSTICS_VERSION;
	readonly identity: Readonly<{
		readonly buildSha: string;
		readonly appVersion: string;
		readonly protocolVersion: string;
		readonly experimentId: string;
		readonly runId: string;
		readonly runtimeClass: string;
		readonly viewportClass: string;
		readonly diagnosticsMode: string;
	}>;
	readonly capabilities: ObserverProjection["capabilities"];
	readonly health: ObserverProjection["health"];
	readonly incidents: ObserverProjection["incidents"];
	readonly reproduction: ObserverProjection["reproduction"];
	readonly worldHead: ObserverProjection["worldHead"];
}

const likelySecretPatterns = [
	/\b(?:bearer\s+)[a-z0-9._~+/-]+=*/giu,
	/\bgh[oprsu]_[a-z0-9]{20,}\b/giu,
	/\b(?:sk|pk)_(?:live|test)_[a-z0-9]{12,}\b/giu,
	/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/giu,
] as const;

export function sanitizeFeedbackText(value: string): string {
	let sanitized = normalizeIngressText(value.trim(), {
		maxBytes: 8_000,
		maxCodePoints: 2_000,
	});
	for (const pattern of likelySecretPatterns)
		sanitized = sanitized.replace(pattern, "[redacted]");
	return sanitized;
}

export function composeFeedbackText(
	whatHappened: string,
	whatExpected: string,
): string {
	const happened = whatHappened.trim();
	if (happened.length === 0)
		throw new TypeError("Describe what happened before saving feedback.");
	const expected = whatExpected.trim();
	if ([...happened].length > FEEDBACK_HAPPENED_MAX_LENGTH)
		throw new RangeError("What happened exceeds the feedback length budget.");
	if ([...expected].length > FEEDBACK_EXPECTED_MAX_LENGTH)
		throw new RangeError(
			"What you expected exceeds the feedback length budget.",
		);
	return sanitizeFeedbackText(
		expected.length === 0
			? `What happened:\n${happened}`
			: `What happened:\n${happened}\n\nWhat I expected:\n${expected}`,
	);
}

export function validateFeedbackAttachmentInput(
	file: Pick<File, "size" | "type">,
): void {
	if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
		throw new TypeError("Use a PNG, JPEG, or WebP image.");
	}
	if (
		!Number.isInteger(file.size) ||
		file.size < 1 ||
		file.size > MAX_INPUT_IMAGE_BYTES
	) {
		throw new RangeError("The image must be no larger than 4 MB.");
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("load", () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("sanitized image did not produce text")),
		);
		reader.addEventListener("error", () => reject(reader.error));
		reader.readAsDataURL(blob);
	});
}

export async function sanitizeFeedbackImage(
	file: File,
): Promise<SanitizedFeedbackImage> {
	validateFeedbackAttachmentInput(file);
	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(
			1,
			MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
		);
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d", { alpha: false });
		if (context === null)
			throw new Error("Image sanitization is unavailable in this browser.");
		context.fillStyle = "#f3ead6";
		context.fillRect(0, 0, width, height);
		context.drawImage(bitmap, 0, 0, width, height);
		const output = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/webp", 0.78),
		);
		if (output === null || output.size > MAX_OUTPUT_IMAGE_BYTES)
			throw new RangeError(
				"The sanitized image exceeds the 768 KB attachment budget.",
			);
		return Object.freeze({
			mimeType: output.type === "image/webp" ? "image/webp" : "image/png",
			width,
			height,
			byteLength: output.size,
			dataUrl: await blobToDataUrl(output),
		});
	} finally {
		bitmap.close();
	}
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
	value: Readonly<Record<string, unknown>>,
	keys: readonly string[],
): boolean {
	const actual = Object.keys(value).sort();
	return (
		actual.length === keys.length &&
		actual.every((key, index) => key === [...keys].sort()[index])
	);
}

function isSafeId(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length <= 96 &&
		/^[a-z0-9][a-z0-9._:-]*$/iu.test(value)
	);
}

function isBoundedInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

function cloneLocalDiagnostics(
	value: unknown,
): LocalFeedbackDiagnostics | null {
	if (!isRecord(value)) return null;
	if (
		!hasExactKeys(value, [
			"schemaVersion",
			"identity",
			"capabilities",
			"health",
			"incidents",
			"reproduction",
			"worldHead",
		]) ||
		value.schemaVersion !== LOCAL_FEEDBACK_DIAGNOSTICS_VERSION ||
		!isRecord(value.identity) ||
		!hasExactKeys(value.identity, [
			"buildSha",
			"appVersion",
			"protocolVersion",
			"experimentId",
			"runId",
			"runtimeClass",
			"viewportClass",
			"diagnosticsMode",
		]) ||
		Object.values(value.identity).some((item) => !isSafeId(item)) ||
		!isRecord(value.capabilities) ||
		!hasExactKeys(value.capabilities, [
			"nativePerformance",
			"localObserver",
			"feedbackDiagnostics",
			"replayCapture",
			"workerRuntime",
			"networkRelay",
		])
	)
		return null;
	const capabilityStates = new Set([
		"disabled",
		"unsupported",
		"available",
		"active",
	]);
	if (
		Object.values(value.capabilities).some(
			(item) => !capabilityStates.has(item as string),
		)
	)
		return null;
	if (
		!isRecord(value.health) ||
		!hasExactKeys(value.health, [
			"mode",
			"status",
			"incidentCount",
			"droppedEvents",
		]) ||
		!["off", "local", "alpha"].includes(value.health.mode as string) ||
		!["healthy", "degraded", "safe-stop"].includes(
			value.health.status as string,
		) ||
		!isBoundedInteger(value.health.incidentCount) ||
		!isBoundedInteger(value.health.droppedEvents)
	)
		return null;
	if (!Array.isArray(value.incidents) || value.incidents.length > 16)
		return null;
	const incidents = value.incidents.map((item) => {
		if (
			!isRecord(item) ||
			!hasExactKeys(item, [
				"incidentId",
				"fingerprint",
				"reason",
				"summaryCode",
				"safeSummary",
				"recovery",
			])
		)
			return null;
		if (
			!/^inc_[a-f0-9]{24}$/u.test(String(item.incidentId)) ||
			!/^inc_[a-f0-9]{24}$/u.test(String(item.fingerprint)) ||
			![
				"invariant",
				"runtime-failure",
				"feedback",
				"explicit-capture",
			].includes(item.reason as string) ||
			![
				"reality-protected",
				"write-authority-transferred",
				"diagnostic-capture",
			].includes(item.summaryCode as string) ||
			!["not-attempted", "recovered", "safe-stop"].includes(
				item.recovery as string,
			)
		)
			return null;
		const summaryCode = item.summaryCode as IncidentSummaryCode;
		return Object.freeze({
			incidentId: item.incidentId as string,
			fingerprint: item.fingerprint as string,
			reason:
				item.reason as LocalFeedbackDiagnostics["incidents"][number]["reason"],
			summaryCode,
			safeSummary: diagnosticIncidentSummary(summaryCode),
			recovery:
				item.recovery as LocalFeedbackDiagnostics["incidents"][number]["recovery"],
		}) as LocalFeedbackDiagnostics["incidents"][number];
	});
	if (incidents.some((item) => item === null)) return null;
	if (
		!isRecord(value.reproduction) ||
		!hasExactKeys(value.reproduction, [
			"startSequence",
			"endSequence",
			"mode",
		]) ||
		!(
			(value.reproduction.startSequence === null ||
				isBoundedInteger(value.reproduction.startSequence)) &&
			(value.reproduction.endSequence === null ||
				isBoundedInteger(value.reproduction.endSequence))
		) ||
		!["off", "local", "alpha"].includes(value.reproduction.mode as string)
	)
		return null;
	let worldHead: LocalFeedbackDiagnostics["worldHead"] = null;
	if (value.worldHead !== null) {
		if (
			!isRecord(value.worldHead) ||
			!hasExactKeys(value.worldHead, [
				"runId",
				"regionId",
				"revision",
				"sequence",
				"simulationTime",
				"status",
			])
		)
			return null;
		if (
			!isSafeId(value.worldHead.runId) ||
			!isSafeId(value.worldHead.regionId) ||
			!isBoundedInteger(value.worldHead.revision) ||
			!isBoundedInteger(value.worldHead.sequence) ||
			!isBoundedInteger(value.worldHead.simulationTime) ||
			!["healthy", "safe-stop"].includes(value.worldHead.status as string)
		)
			return null;
		worldHead = Object.freeze({ ...value.worldHead }) as unknown as NonNullable<
			LocalFeedbackDiagnostics["worldHead"]
		>;
	}
	const result: LocalFeedbackDiagnostics = Object.freeze({
		schemaVersion: LOCAL_FEEDBACK_DIAGNOSTICS_VERSION,
		identity: Object.freeze({
			...value.identity,
		}) as LocalFeedbackDiagnostics["identity"],
		capabilities: Object.freeze({
			...value.capabilities,
		}) as unknown as LocalFeedbackDiagnostics["capabilities"],
		health: Object.freeze({
			...value.health,
		}) as LocalFeedbackDiagnostics["health"],
		incidents: Object.freeze(
			incidents as LocalFeedbackDiagnostics["incidents"],
		),
		reproduction: Object.freeze({
			...value.reproduction,
		}) as LocalFeedbackDiagnostics["reproduction"],
		worldHead,
	});
	return new TextEncoder().encode(JSON.stringify(result)).byteLength <=
		MAX_LOCAL_DIAGNOSTICS_BYTES
		? result
		: null;
}

function projectLocalDiagnostics(
	observer: ObserverProjection | null,
): LocalFeedbackDiagnostics | null {
	if (observer === null) return null;
	return cloneLocalDiagnostics({
		schemaVersion: LOCAL_FEEDBACK_DIAGNOSTICS_VERSION,
		identity: {
			buildSha: observer.identity.buildSha,
			appVersion: observer.identity.appVersion,
			protocolVersion: observer.identity.protocolVersion,
			experimentId: observer.identity.experimentId,
			runId: observer.identity.runId,
			runtimeClass: observer.identity.runtimeClass,
			viewportClass: observer.identity.viewportClass,
			diagnosticsMode: observer.identity.diagnosticsMode,
		},
		capabilities: observer.capabilities,
		health: observer.health,
		incidents: observer.incidents,
		reproduction: observer.reproduction,
		worldHead: observer.worldHead,
	});
}

function cloneAttachment(value: unknown): SanitizedFeedbackImage | null {
	if (
		!isRecord(value) ||
		!hasExactKeys(value, [
			"mimeType",
			"width",
			"height",
			"byteLength",
			"dataUrl",
		])
	)
		return null;
	if (
		!(["image/webp", "image/png"] as readonly unknown[]).includes(
			value.mimeType,
		)
	)
		return null;
	if (
		!isBoundedInteger(value.width) ||
		value.width < 1 ||
		value.width > MAX_IMAGE_EDGE ||
		!isBoundedInteger(value.height) ||
		value.height < 1 ||
		value.height > MAX_IMAGE_EDGE ||
		!isBoundedInteger(value.byteLength) ||
		value.byteLength < 1 ||
		value.byteLength > MAX_OUTPUT_IMAGE_BYTES ||
		typeof value.dataUrl !== "string"
	)
		return null;
	const prefix = `data:${value.mimeType};base64,`;
	if (!value.dataUrl.startsWith(prefix)) return null;
	const encoded = value.dataUrl.slice(prefix.length);
	if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded))
		return null;
	const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
	if (Math.floor((encoded.length * 3) / 4) - padding !== value.byteLength)
		return null;
	return Object.freeze({ ...value }) as unknown as SanitizedFeedbackImage;
}

function cloneReport(
	value: unknown,
	nowMs: number,
): LocalFeedbackReport | null {
	if (
		!isRecord(value) ||
		!hasExactKeys(value, [
			"schemaVersion",
			"reportId",
			"category",
			"text",
			"createdAtMs",
			"diagnostics",
			"attachment",
			"delivery",
		])
	)
		return null;
	if (
		value.schemaVersion !== FEEDBACK_SCHEMA_VERSION ||
		typeof value.reportId !== "string" ||
		!/^[a-z0-9][a-z0-9_-]{7,63}$/u.test(value.reportId) ||
		!["bug", "confusing", "idea", "story"].includes(value.category as string) ||
		typeof value.text !== "string" ||
		!isBoundedInteger(value.createdAtMs) ||
		value.createdAtMs > nowMs + MAX_FUTURE_CLOCK_SKEW_MS ||
		value.createdAtMs < Math.max(0, nowMs - FEEDBACK_MAX_AGE_MS) ||
		value.delivery !== "local-only"
	)
		return null;
	let text: string;
	try {
		text = sanitizeFeedbackText(value.text);
		if (text.length === 0) return null;
	} catch {
		return null;
	}
	const diagnostics =
		value.diagnostics === null
			? null
			: cloneLocalDiagnostics(value.diagnostics);
	if (value.diagnostics !== null && diagnostics === null) return null;
	const attachment =
		value.attachment === null ? null : cloneAttachment(value.attachment);
	if (value.attachment !== null && attachment === null) return null;
	return Object.freeze({
		schemaVersion: FEEDBACK_SCHEMA_VERSION,
		reportId: value.reportId,
		category: value.category as FeedbackCategory,
		text,
		createdAtMs: value.createdAtMs,
		diagnostics,
		attachment,
		delivery: "local-only",
	});
}

export class LocalFeedbackQueue {
	readonly #storage: Storage;
	readonly #now: () => number;

	constructor(storage: Storage, now: () => number = () => Date.now()) {
		this.#storage = storage;
		this.#now = now;
	}

	list(): readonly LocalFeedbackReport[] {
		try {
			const raw = this.#storage.getItem(STORAGE_KEY) ?? "[]";
			if (new TextEncoder().encode(raw).byteLength > FEEDBACK_QUEUE_MAX_BYTES) {
				this.#storage.removeItem(STORAGE_KEY);
				return [];
			}
			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) {
				this.#storage.removeItem(STORAGE_KEY);
				return [];
			}
			const nowMs = this.#now();
			const reports = parsed
				.flatMap((value) => {
					const report = cloneReport(value, nowMs);
					return report === null ? [] : [report];
				})
				.slice(-MAX_REPORTS);
			const serialized = JSON.stringify(reports);
			if (serialized !== raw) {
				if (reports.length === 0) this.#storage.removeItem(STORAGE_KEY);
				else this.#storage.setItem(STORAGE_KEY, serialized);
			}
			return Object.freeze(reports);
		} catch {
			try {
				this.#storage.removeItem(STORAGE_KEY);
			} catch {
				/* unavailable storage stays non-authoritative */
			}
			return [];
		}
	}

	save(report: LocalFeedbackReport): readonly LocalFeedbackReport[] {
		const checked = cloneReport(report, this.#now());
		if (checked === null) throw new TypeError("Feedback report is malformed.");
		const reports = [...this.list(), checked].slice(-MAX_REPORTS);
		let serialized = JSON.stringify(reports);
		while (
			new TextEncoder().encode(serialized).byteLength >
				FEEDBACK_QUEUE_MAX_BYTES &&
			reports.length > 1
		) {
			reports.shift();
			serialized = JSON.stringify(reports);
		}
		if (
			new TextEncoder().encode(serialized).byteLength > FEEDBACK_QUEUE_MAX_BYTES
		)
			throw new RangeError("Feedback exceeds the local queue byte budget.");
		this.#storage.setItem(STORAGE_KEY, serialized);
		return Object.freeze(reports);
	}

	clear(): void {
		this.#storage.removeItem(STORAGE_KEY);
	}

	remove(reportId: string): readonly LocalFeedbackReport[] {
		const reports = this.list().filter(
			(report) => report.reportId !== reportId,
		);
		if (reports.length === 0) this.#storage.removeItem(STORAGE_KEY);
		else this.#storage.setItem(STORAGE_KEY, JSON.stringify(reports));
		return Object.freeze(reports);
	}
}

export function createLocalFeedbackReport(input: {
	readonly category: FeedbackCategory;
	readonly whatHappened: string;
	readonly whatExpected: string;
	readonly diagnostics: ObserverProjection | null;
	readonly attachment: SanitizedFeedbackImage | null;
	readonly reportId: string;
	readonly createdAtMs: number;
}): LocalFeedbackReport {
	if (!/^[a-z0-9][a-z0-9_-]{7,63}$/u.test(input.reportId))
		throw new TypeError("reportId must be a safe bounded identifier");
	if (!Number.isSafeInteger(input.createdAtMs) || input.createdAtMs < 0)
		throw new RangeError("createdAtMs must be a non-negative safe integer");
	return Object.freeze({
		schemaVersion: FEEDBACK_SCHEMA_VERSION,
		reportId: input.reportId,
		category: input.category,
		text: composeFeedbackText(input.whatHappened, input.whatExpected),
		createdAtMs: input.createdAtMs,
		diagnostics: projectLocalDiagnostics(input.diagnostics),
		attachment: input.attachment,
		delivery: "local-only",
	});
}
