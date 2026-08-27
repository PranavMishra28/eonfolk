/** Non-authoritative play clock. Wall time may propose; Play authorizes steps. */
export const LAST_ACTIVE_STORAGE_KEY = "eonfolk:play:last-active-wall-ms:v1";
export const MAX_RETURN_CATCH_UP_DAYS = 7;

export type PlayRate = 0 | 1 | 3;

export function presentationIntervalMs(rate: PlayRate): number | null {
	if (rate === 0) return null;
	return rate === 1 ? 125 : 42;
}

export function authorityDayIntervalMs(rate: PlayRate): number | null {
	if (rate === 0) return null;
	return rate === 1 ? 8_000 : 2_500;
}

export function readLastActiveWallMs(): number | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = window.localStorage.getItem(LAST_ACTIVE_STORAGE_KEY);
		if (stored === null) return null;
		const value = Number.parseInt(stored, 10);
		return Number.isSafeInteger(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

export function writeLastActiveWallMs(nowMs = Date.now()): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, String(nowMs));
	} catch {
		// Session play continues; return catch-up simply will not be proposed.
	}
}

export function proposedReturnCatchUpDays(
	nowMs = Date.now(),
	lastActiveMs = readLastActiveWallMs(),
): number {
	if (lastActiveMs === null || nowMs <= lastActiveMs) return 0;
	const elapsedDays = Math.floor((nowMs - lastActiveMs) / 86_400_000);
	if (elapsedDays < 1) return 0;
	return Math.min(MAX_RETURN_CATCH_UP_DAYS, elapsedDays);
}
