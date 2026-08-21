export const PRESENTATION_HZ = 30;
export const PRESENTATION_STEP_MS = 1_000 / PRESENTATION_HZ;

export interface PresentationClockState {
	readonly tick: number;
	readonly accumulatorMs: number;
}

export function advancePresentationClock(
	state: PresentationClockState,
	elapsedMs: number,
	maxSteps = 5,
): PresentationClockState {
	if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
		throw new Error("elapsedMs must be finite and non-negative");
	const clamped = Math.min(elapsedMs, PRESENTATION_STEP_MS * maxSteps);
	let accumulatorMs = state.accumulatorMs + clamped;
	let tick = state.tick;
	let steps = 0;
	while (
		accumulatorMs + Number.EPSILON * 1_000 >= PRESENTATION_STEP_MS &&
		steps < maxSteps
	) {
		accumulatorMs -= PRESENTATION_STEP_MS;
		tick += 1;
		steps += 1;
	}
	return Object.freeze({ tick, accumulatorMs: Math.max(0, accumulatorMs) });
}
