/** Non-authoritative play clock. Wall time may propose; Play authorizes steps. */
export const LAST_ACTIVE_STORAGE_KEY = "eonfolk:play:last-active-wall-ms:v1";
export const PENDING_RETURN_CATCH_UP_STORAGE_KEY =
	"eonfolk:play:pending-return-catch-up-v1";
export const MAX_RETURN_CATCH_UP_DAYS = 7;
/** Play: ~28s/day so the first week is watchable. Faster is quicker, not 1 day/s. */
export const PLAY_DAY_INTERVAL_MS = 28_000;
export const FASTER_DAY_INTERVAL_MS = 8_000;

export type PlayRate = 0 | 1 | 3;

export interface PendingReturnCatchUp {
	readonly operationId: string;
	readonly fromDay: number;
	readonly toDay: number;
	readonly lastActiveMs: number;
}

export function presentationIntervalMs(rate: PlayRate): number | null {
	if (rate === 0) return null;
	return rate === 1 ? 125 : 42;
}

export function authorityDayIntervalMs(rate: PlayRate): number | null {
	if (rate === 0) return null;
	return rate === 1 ? PLAY_DAY_INTERVAL_MS : FASTER_DAY_INTERVAL_MS;
}

export function returnCatchUpOperationId(lastActiveMs: number): string {
	return `rl-${String(lastActiveMs)}`;
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

export function readPendingReturnCatchUp(): PendingReturnCatchUp | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = window.localStorage.getItem(
			PENDING_RETURN_CATCH_UP_STORAGE_KEY,
		);
		if (stored === null) return null;
		const value = JSON.parse(stored) as Partial<PendingReturnCatchUp>;
		if (
			typeof value.operationId !== "string" ||
			value.operationId.length === 0 ||
			!Number.isSafeInteger(value.fromDay) ||
			!Number.isSafeInteger(value.toDay) ||
			!Number.isSafeInteger(value.lastActiveMs) ||
			(value.fromDay ?? 0) < 1 ||
			(value.toDay ?? 0) <= (value.fromDay ?? 0) ||
			(value.lastActiveMs ?? 0) <= 0
		)
			return null;
		return Object.freeze({
			operationId: value.operationId,
			fromDay: value.fromDay as number,
			toDay: value.toDay as number,
			lastActiveMs: value.lastActiveMs as number,
		});
	} catch {
		return null;
	}
}

export function writePendingReturnCatchUp(pending: PendingReturnCatchUp): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			PENDING_RETURN_CATCH_UP_STORAGE_KEY,
			JSON.stringify(pending),
		);
	} catch {
		// Durable receipts still make retry idempotent; the banner may not resume.
	}
}

export function clearPendingReturnCatchUp(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(PENDING_RETURN_CATCH_UP_STORAGE_KEY);
	} catch {
		// Ignoring storage denial leaves a stale banner at worst.
	}
}

export function proposedReturnCatchUpDays(
	nowMs = Date.now(),
	lastActiveMs = readLastActiveWallMs(),
	currentHorizonDays?: number,
	pending = readPendingReturnCatchUp(),
): number {
	if (
		pending !== null &&
		currentHorizonDays !== undefined &&
		Number.isSafeInteger(currentHorizonDays)
	) {
		if (currentHorizonDays >= pending.toDay) return 0;
		return Math.min(
			MAX_RETURN_CATCH_UP_DAYS,
			pending.toDay - currentHorizonDays,
		);
	}
	if (lastActiveMs === null || nowMs <= lastActiveMs) return 0;
	const elapsedDays = Math.floor((nowMs - lastActiveMs) / 86_400_000);
	if (elapsedDays < 1) return 0;
	return Math.min(MAX_RETURN_CATCH_UP_DAYS, elapsedDays);
}
