import { describe, expect, it } from "vitest";
import {
	composeFeedbackText,
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
			/code-point budget/u,
		);
	});

	it("keeps observed and expected behavior distinct in relay-compatible text", () => {
		expect(composeFeedbackText("The mill stopped.", "A warning first.")).toBe(
			"What happened:\nThe mill stopped.\n\nWhat I expected:\nA warning first.",
		);
		expect(composeFeedbackText("The mill stopped.", "  ")).toBe(
			"What happened:\nThe mill stopped.",
		);
		expect(() => composeFeedbackText(" ", "A warning first.")).toThrow(
			/what happened/u,
		);
		expect(() => composeFeedbackText("x".repeat(1_601), "")).toThrow(
			/length budget/u,
		);
		expect(() => composeFeedbackText("Observed", "x".repeat(301))).toThrow(
			/length budget/u,
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
		const queue = new LocalFeedbackQueue(new MemoryStorage(), () => 3);
		for (let index = 0; index < 4; index += 1) {
			queue.save(
				createLocalFeedbackReport({
					category: "bug",
					whatHappened: `report ${index}`,
					whatExpected: "",
					diagnostics: null,
					attachment: null,
					reportId: `alpha_report_${index}`,
					createdAtMs: index,
				}),
			);
		}
		expect(queue.list().map((report) => report.text)).toEqual([
			"What happened:\nreport 1",
			"What happened:\nreport 2",
			"What happened:\nreport 3",
		]);
		expect(
			queue.remove("alpha_report_2").map((report) => report.reportId),
		).toEqual(["alpha_report_1", "alpha_report_3"]);
		queue.clear();
		expect(queue.list()).toEqual([]);
	});

	it("prunes reports after seven days using an injected local clock", () => {
		const storage = new MemoryStorage();
		let now = 10_000;
		const queue = new LocalFeedbackQueue(storage, () => now);
		queue.save(
			createLocalFeedbackReport({
				category: "confusing",
				whatHappened: "old report",
				whatExpected: "",
				diagnostics: null,
				attachment: null,
				reportId: "alpha_report_old",
				createdAtMs: now,
			}),
		);
		now += 7 * 24 * 60 * 60 * 1_000 + 1;
		expect(queue.list()).toEqual([]);
	});
});
