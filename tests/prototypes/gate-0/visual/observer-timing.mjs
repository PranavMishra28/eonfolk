import { CITIZENS, FIXTURE_ID } from "./fixture.mjs";

const REQUIRED_IDS = new Set(CITIZENS.map(({ id }) => id));

function containsAll(values, required) {
	const actual = new Set(values);
	return (
		actual.size === required.size &&
		[...required].every((value) => actual.has(value))
	);
}

export function isObserverReady(facts) {
	return (
		facts?.fixtureId === FIXTURE_ID &&
		facts.maraPainted === true &&
		containsAll(facts.paintedCitizenIds ?? [], REQUIRED_IDS) &&
		(facts.paintedActivityIds?.length ?? 0) === CITIZENS.length &&
		containsAll(facts.semanticRowCitizenIds ?? [], REQUIRED_IDS) &&
		facts.interactionCuePainted === true &&
		facts.followMara?.enabled === true &&
		facts.followMara?.focusable === true &&
		facts.followMara?.accessibleName === "Follow Mara"
	);
}

export function createObserverClock() {
	return Object.freeze({
		originMs: null,
		followMaraFindMs: null,
		followMaraLocked: false,
		observationPromptMs: null,
		promptDue: false,
		invalidationReason: null,
	});
}

export function processObserverFrame(clock, nowMs, facts) {
	if (!Number.isFinite(nowMs) || nowMs < 0)
		throw new TypeError("nowMs must be a nonnegative finite number");
	if (clock.invalidationReason) return clock;
	if (clock.originMs === null) {
		return isObserverReady(facts)
			? Object.freeze({ ...clock, originMs: nowMs })
			: clock;
	}
	if (nowMs < clock.originMs)
		return Object.freeze({ ...clock, invalidationReason: "clock-reset" });

	const rawElapsedMs = nowMs - clock.originMs;
	if (rawElapsedMs < 60_000 || clock.observationPromptMs !== null) return clock;
	if (rawElapsedMs > 61_000)
		return Object.freeze({
			...clock,
			promptDue: false,
			invalidationReason: "timer-delivery-overrun",
		});
	return Object.freeze({
		...clock,
		promptDue: true,
		observationPromptMs: Math.ceil(Math.max(0, rawElapsedMs)),
	});
}

export function recordFollowMara(clock, nowMs) {
	if (
		clock.invalidationReason ||
		clock.originMs === null ||
		clock.followMaraFindMs !== null ||
		clock.followMaraLocked
	)
		return clock;
	if (!Number.isFinite(nowMs) || nowMs < clock.originMs)
		return Object.freeze({ ...clock, invalidationReason: "clock-reset" });
	const rawElapsedMs = nowMs - clock.originMs;
	if (rawElapsedMs > 10_000)
		return Object.freeze({
			...clock,
			followMaraWithinTarget: false,
			followMaraLocked: true,
		});
	return Object.freeze({
		...clock,
		followMaraFindMs: Math.ceil(Math.max(0, rawElapsedMs)),
		followMaraWithinTarget: true,
		followMaraLocked: true,
	});
}

export function invalidateObserver(clock, reason) {
	const allowed = new Set([
		"focus-loss",
		"visibility-loss",
		"navigation",
		"reload",
		"clock-reset",
		"fixture-mismatch",
		"operator-pause",
		"timer-delivery-overrun",
	]);
	if (!allowed.has(reason))
		throw new TypeError("unknown observer invalidation reason");
	return Object.freeze({
		...clock,
		promptDue: false,
		invalidationReason: reason,
	});
}

export function isObserverEndpointDurable(record) {
	const followTimerIsClosed =
		record?.followMaraFindMs === null ||
		(Number.isInteger(record?.followMaraFindMs) &&
			record.followMaraFindMs >= 0 &&
			record.followMaraFindMs <= 10_000);
	return (
		record?.durablyPersisted === true &&
		followTimerIsClosed &&
		Number.isInteger(record.observationPromptMs) &&
		record.observationPromptMs >= 60_000 &&
		record.observationPromptMs <= 61_000 &&
		["mara", "activities", "interaction", "autonomy"].every(
			(key) =>
				typeof record.responses?.[key] === "string" &&
				record.responses[key].length > 0,
		)
	);
}
