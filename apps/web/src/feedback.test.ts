import { describe, expect, it } from "vitest";
import {
	createLocalFeedbackReport,
	LocalFeedbackQueue,
	sanitizeFeedbackText,
	validateFeedbackAttachmentInput,
} from "./feedback.js";

class MemoryStorage implements Storage {
	readonly #values = new Map<string, string>();
	get length() {
		return this.#values.size;
	}
	clear() {
		this.#values.clear();
	}
	getItem(key: string) {
		return this.#values.get(key) ?? null;
	}
	key(index: number) {
		return [...this.#values.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.#values.delete(key);
	}
	setItem(key: string, value: string) {
		this.#values.set(key, value);
	}
}

describe("Founder Alpha feedback", () => {
	it("bounds text and redacts likely credentials and contact details", () => {
		expect(
			sanitizeFeedbackText(
				"Email me at player@example.com with ghp_abcdefghijklmnopqrstuvwxyz123456",
			),
		).toBe("Email me at [redacted] with [redacted]");
		expect(() => sanitizeFeedbackText("x".repeat(2_001))).toThrow(
			/byte budget/u,
		);
	});

	it("rejects unsupported or oversized attachments before decoding", () => {
		expect(() =>
			validateFeedbackAttachmentInput({ type: "image/svg+xml", size: 100 }),
		).toThrow(/PNG/u);
		expect(() =>
			validateFeedbackAttachmentInput({
				type: "image/png",
				size: 4 * 1024 * 1024 + 1,
			}),
		).toThrow(/4 MB/u);
	});

	it("keeps only three local reports and supports explicit deletion", () => {
		const queue = new LocalFeedbackQueue(new MemoryStorage());
		for (let index = 0; index < 4; index += 1) {
			queue.save(
				createLocalFeedbackReport({
					category: "bug",
					text: `report ${index}`,
					diagnostics: null,
					attachment: null,
					reportId: `alpha_report_${index}`,
					createdAtMs: index,
				}),
			);
		}
		expect(queue.list().map((report) => report.text)).toEqual([
			"report 1",
			"report 2",
			"report 3",
		]);
		queue.clear();
		expect(queue.list()).toEqual([]);
	});
});
