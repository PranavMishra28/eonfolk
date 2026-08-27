import { describe, expect, it } from "vitest";
import {
	authorityDayIntervalMs,
	FASTER_DAY_INTERVAL_MS,
	MAX_RETURN_CATCH_UP_DAYS,
	PLAY_DAY_INTERVAL_MS,
	proposedReturnCatchUpDays,
	returnCatchUpOperationId,
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
