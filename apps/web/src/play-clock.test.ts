import { describe, expect, it } from "vitest";
import {
	authorityDayIntervalMs,
	dayAdvanceDue,
	FASTER_DAY_INTERVAL_MS,
	MAX_RETURN_CATCH_UP_DAYS,
	PLAY_DAY_INTERVAL_MS,
	proposedReturnCatchUpDays,
	returnCatchUpOperationId,
	visualDayProgress01,
} from "./play-clock";

describe("play clock authorization", () => {
	it("pauses live days at rate 0 and keeps Play slower than Faster", () => {
		expect(authorityDayIntervalMs(0)).toBeNull();
		expect(PLAY_DAY_INTERVAL_MS).toBeGreaterThanOrEqual(25_000);
		expect(PLAY_DAY_INTERVAL_MS).toBeLessThanOrEqual(30_000);
		expect(FASTER_DAY_INTERVAL_MS).toBeGreaterThanOrEqual(5_000);
		expect(FASTER_DAY_INTERVAL_MS).toBeLessThan(PLAY_DAY_INTERVAL_MS);
		expect(authorityDayIntervalMs(1)).toBe(PLAY_DAY_INTERVAL_MS);
		expect(authorityDayIntervalMs(3)).toBe(FASTER_DAY_INTERVAL_MS);
	});

	it("does not advance a Play day before the full wall interval has been shown", () => {
		expect(dayAdvanceDue(1_000, PLAY_DAY_INTERVAL_MS, 1_000)).toBe(false);
		expect(dayAdvanceDue(1_000, PLAY_DAY_INTERVAL_MS, 15_000)).toBe(false);
		expect(
			dayAdvanceDue(1_000, PLAY_DAY_INTERVAL_MS, 1_000 + PLAY_DAY_INTERVAL_MS),
		).toBe(true);
		expect(
			dayAdvanceDue(
				1_000,
				FASTER_DAY_INTERVAL_MS,
				1_000 + FASTER_DAY_INTERVAL_MS,
			),
		).toBe(true);
	});

	it("keeps Watch motion and In words on one wall interpolant", () => {
		expect(
			visualDayProgress01({
				displayedAtMs: 0,
				nowMs: 5_600,
				intervalMs: PLAY_DAY_INTERVAL_MS,
				playing: true,
				reducedMotion: false,
				held01: 0,
			}),
		).toBe(0.2);
		expect(
			visualDayProgress01({
				displayedAtMs: 0,
				nowMs: 40_000,
				intervalMs: PLAY_DAY_INTERVAL_MS,
				playing: false,
				reducedMotion: false,
				held01: 0.2,
			}),
		).toBe(0.2);
		expect(
			visualDayProgress01({
				displayedAtMs: 0,
				nowMs: 40_000,
				intervalMs: PLAY_DAY_INTERVAL_MS,
				playing: true,
				reducedMotion: true,
				held01: 0,
			}),
		).toBe(0.55);
	});

	it("resumes a pending return catch-up remainder instead of re-proposing the cap", () => {
		const pending = Object.freeze({
			operationId: returnCatchUpOperationId(1_700_000_000_000),
			fromDay: 1,
			toDay: 8,
			lastActiveMs: 1_700_000_000_000,
		});
		expect(
			proposedReturnCatchUpDays(Date.now(), 1_700_000_000_000, 4, pending),
		).toBe(4);
		expect(
			proposedReturnCatchUpDays(Date.now(), 1_700_000_000_000, 8, pending),
		).toBe(0);
		expect(MAX_RETURN_CATCH_UP_DAYS).toBe(7);
	});
});
