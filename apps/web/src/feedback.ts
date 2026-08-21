import type { ObserverProjection } from "@eonfolk/diagnostics";
import { normalizeIngressText } from "@eonfolk/protocol";

export const FEEDBACK_SCHEMA_VERSION = "eonfolk-feedback-v1" as const;
const STORAGE_KEY = "eonfolk:founder-alpha-feedback:v1";
const MAX_REPORTS = 3;
const MAX_INPUT_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_IMAGE_BYTES = 768 * 1024;
const MAX_IMAGE_EDGE = 1440;

export type FeedbackCategory = "bug" | "confusing" | "idea" | "story";

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
	readonly diagnostics: ObserverProjection | null;
	readonly attachment: SanitizedFeedbackImage | null;
	readonly delivery: "local-only";
}

const likelySecretPatterns = [
	/\b(?:bearer\s+)[a-z0-9._~+/-]+=*/giu,
	/\bgh[oprsu]_[a-z0-9]{20,}\b/giu,
	/\b(?:sk|pk)_(?:live|test)_[a-z0-9]{12,}\b/giu,
	/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/giu,
] as const;

export function sanitizeFeedbackText(value: string): string {
	let sanitized = normalizeIngressText(value.trim(), {
		maxBytes: 2_000,
		maxCodePoints: 1_200,
	});
	for (const pattern of likelySecretPatterns)
		sanitized = sanitized.replace(pattern, "[redacted]");
	return sanitized;
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

function isReport(value: unknown): value is LocalFeedbackReport {
	if (typeof value !== "object" || value === null) return false;
	const report = value as Partial<LocalFeedbackReport>;
	return (
		report.schemaVersion === FEEDBACK_SCHEMA_VERSION &&
		typeof report.reportId === "string" &&
		["bug", "confusing", "idea", "story"].includes(report.category ?? "") &&
		typeof report.text === "string" &&
		Number.isSafeInteger(report.createdAtMs) &&
		report.delivery === "local-only"
	);
}

export class LocalFeedbackQueue {
	readonly #storage: Storage;

	constructor(storage: Storage) {
		this.#storage = storage;
	}

	list(): readonly LocalFeedbackReport[] {
		try {
			const parsed = JSON.parse(
				this.#storage.getItem(STORAGE_KEY) ?? "[]",
			) as unknown;
			if (!Array.isArray(parsed)) return [];
			return Object.freeze(parsed.filter(isReport).slice(-MAX_REPORTS));
		} catch {
			return [];
		}
	}

	save(report: LocalFeedbackReport): readonly LocalFeedbackReport[] {
		if (!isReport(report)) throw new TypeError("Feedback report is malformed.");
		const reports = [...this.list(), report].slice(-MAX_REPORTS);
		this.#storage.setItem(STORAGE_KEY, JSON.stringify(reports));
		return Object.freeze(reports);
	}

	clear(): void {
		this.#storage.removeItem(STORAGE_KEY);
	}
}

export function createLocalFeedbackReport(input: {
	readonly category: FeedbackCategory;
	readonly text: string;
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
		text: sanitizeFeedbackText(input.text),
		createdAtMs: input.createdAtMs,
		diagnostics: input.diagnostics,
		attachment: input.attachment,
		delivery: "local-only",
	});
}
