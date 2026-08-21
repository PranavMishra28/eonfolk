const OBSERVABLE_ENTRY_TYPES = [
	"mark",
	"measure",
	"longtask",
	"event",
] as const;

const DURATION_BUCKETS_MS = [8, 17, 34, 50, 100, 250, 1_000] as const;
const SAFE_METRIC = /^[a-z0-9][a-z0-9._:-]*$/u;
const MAXIMUM_METRIC_NAMES = 32;

export type ObservablePerformanceEntryType =
	(typeof OBSERVABLE_ENTRY_TYPES)[number];

export interface PerformanceEntryLike {
	readonly entryType: string;
	readonly name: string;
	readonly startTime: number;
	readonly duration: number;
}

export interface PerformanceEntryListLike {
	getEntries(): readonly PerformanceEntryLike[];
}

export interface PerformanceObserverLike {
	observe(options: {
		readonly type: string;
		readonly buffered?: boolean;
	}): void;
	disconnect(): void;
}

export interface PerformanceObserverConstructorLike {
	readonly supportedEntryTypes?: readonly string[];
	new (
		callback: (entries: PerformanceEntryListLike) => void,
	): PerformanceObserverLike;
}

export interface PerformanceTimelineLike {
	now(): number;
	mark?(name: string): unknown;
	measure?(name: string, startMark?: string, endMark?: string): unknown;
}

export interface NativePerformanceEnvironment {
	readonly performance?: PerformanceTimelineLike;
	readonly PerformanceObserver?: PerformanceObserverConstructorLike;
}

export interface PerformanceSupport {
	readonly clock: boolean;
	readonly marks: boolean;
	readonly observer: boolean;
	readonly entryTypes: Readonly<
		Record<ObservablePerformanceEntryType, boolean>
	>;
}

export interface PerformanceDurationBucket {
	readonly upperBoundMs: number | null;
	readonly count: number;
}

export interface PerformanceSummary {
	readonly schemaVersion: "eonfolk-performance-summary-v1";
	readonly acceptedSamples: number;
	readonly droppedSamples: number;
	readonly invalidSamples: number;
	readonly byType: Readonly<Record<ObservablePerformanceEntryType, number>>;
	readonly byName: Readonly<Record<string, number>>;
	readonly durationBuckets: readonly PerformanceDurationBucket[];
	readonly maximumDurationMs: number | null;
	readonly totalDurationMs: number;
	readonly p50UpperBoundMs: number | "overflow" | null;
	readonly p95UpperBoundMs: number | "overflow" | null;
}

function isObservableType(
	value: string,
): value is ObservablePerformanceEntryType {
	return (OBSERVABLE_ENTRY_TYPES as readonly string[]).includes(value);
}

function safeMetric(value: string): boolean {
	return value.length <= 64 && SAFE_METRIC.test(value);
}

function increment(value: number): number {
	return value < Number.MAX_SAFE_INTEGER ? value + 1 : value;
}

function addSafe(left: number, right: number): number {
	return left <= Number.MAX_SAFE_INTEGER - right
		? left + right
		: Number.MAX_SAFE_INTEGER;
}

function percentileUpperBound(
	buckets: readonly number[],
	total: number,
	percentile: number,
): number | "overflow" | null {
	if (total === 0) return null;
	const target = Math.max(1, Math.ceil(total * percentile));
	let seen = 0;
	for (let index = 0; index < buckets.length; index += 1) {
		seen += buckets[index] ?? 0;
		if (seen >= target)
			return index < DURATION_BUCKETS_MS.length
				? (DURATION_BUCKETS_MS[index] ?? "overflow")
				: "overflow";
	}
	return "overflow";
}

export class BoundedPerformanceSummary {
	readonly #maximumSamples: number;
	readonly #allowedNames: ReadonlySet<string>;
	readonly #byType: Record<ObservablePerformanceEntryType, number> = {
		mark: 0,
		measure: 0,
		longtask: 0,
		event: 0,
	};
	readonly #byName = new Map<string, number>();
	readonly #buckets = Array.from(
		{ length: DURATION_BUCKETS_MS.length + 1 },
		() => 0,
	);
	#accepted = 0;
	#dropped = 0;
	#invalid = 0;
	#maximumDurationMs: number | null = null;
	#totalDurationMs = 0;

	constructor(input: {
		readonly maximumSamples: number;
		readonly allowedNames: readonly string[];
	}) {
		if (!Number.isSafeInteger(input.maximumSamples) || input.maximumSamples < 1)
			throw new RangeError("maximumSamples must be a positive safe integer");
		if (input.allowedNames.length > MAXIMUM_METRIC_NAMES)
			throw new RangeError(
				`allowedNames cannot exceed ${MAXIMUM_METRIC_NAMES} entries`,
			);
		if (input.allowedNames.some((name) => !safeMetric(name)))
			throw new TypeError("performance metric names must be safe identifiers");
		this.#maximumSamples = input.maximumSamples;
		this.#allowedNames = new Set(input.allowedNames);
	}

	acceptsName(name: string): boolean {
		return this.#allowedNames.has(name);
	}

	observe(entry: PerformanceEntryLike): boolean {
		if (
			!isObservableType(entry.entryType) ||
			!this.#allowedNames.has(entry.name) ||
			!Number.isFinite(entry.startTime) ||
			entry.startTime < 0 ||
			!Number.isFinite(entry.duration) ||
			entry.duration < 0
		) {
			this.#invalid = increment(this.#invalid);
			return false;
		}
		if (this.#accepted >= this.#maximumSamples) {
			this.#dropped = increment(this.#dropped);
			return false;
		}
		const durationMs = Math.min(
			Number.MAX_SAFE_INTEGER,
			Math.round(entry.duration),
		);
		const bucket = DURATION_BUCKETS_MS.findIndex(
			(upperBound) => durationMs <= upperBound,
		);
		const bucketIndex = bucket === -1 ? DURATION_BUCKETS_MS.length : bucket;
		this.#buckets[bucketIndex] = increment(this.#buckets[bucketIndex] ?? 0);
		this.#accepted = increment(this.#accepted);
		this.#byType[entry.entryType] = increment(this.#byType[entry.entryType]);
		this.#byName.set(entry.name, increment(this.#byName.get(entry.name) ?? 0));
		this.#maximumDurationMs = Math.max(
			this.#maximumDurationMs ?? 0,
			durationMs,
		);
		this.#totalDurationMs = addSafe(this.#totalDurationMs, durationMs);
		return true;
	}

	snapshot(): PerformanceSummary {
		const buckets = Object.freeze(
			this.#buckets.map((count, index) =>
				Object.freeze({
					upperBoundMs: DURATION_BUCKETS_MS[index] ?? null,
					count,
				}),
			),
		);
		return Object.freeze({
			schemaVersion: "eonfolk-performance-summary-v1",
			acceptedSamples: this.#accepted,
			droppedSamples: this.#dropped,
			invalidSamples: this.#invalid,
			byType: Object.freeze({ ...this.#byType }),
			byName: Object.freeze(
				Object.fromEntries(
					[...this.#byName.entries()].sort(([left], [right]) =>
						left < right ? -1 : left > right ? 1 : 0,
					),
				),
			),
			durationBuckets: buckets,
			maximumDurationMs: this.#maximumDurationMs,
			totalDurationMs: this.#totalDurationMs,
			p50UpperBoundMs: percentileUpperBound(this.#buckets, this.#accepted, 0.5),
			p95UpperBoundMs: percentileUpperBound(
				this.#buckets,
				this.#accepted,
				0.95,
			),
		});
	}
}

function absentSupport(): PerformanceSupport {
	return Object.freeze({
		clock: false,
		marks: false,
		observer: false,
		entryTypes: Object.freeze({
			mark: false,
			measure: false,
			longtask: false,
			event: false,
		}),
	});
}

function defaultEnvironment(): NativePerformanceEnvironment {
	const source = globalThis as unknown as NativePerformanceEnvironment;
	return {
		...(source.performance === undefined
			? {}
			: { performance: source.performance }),
		...(source.PerformanceObserver === undefined
			? {}
			: { PerformanceObserver: source.PerformanceObserver }),
	};
}

export class NativePerformanceMonitor {
	readonly #environment: NativePerformanceEnvironment;
	readonly #summary: BoundedPerformanceSummary;
	readonly #observer: PerformanceObserverLike | null;
	readonly support: PerformanceSupport;
	#disconnected = false;

	constructor(input: {
		readonly summary: BoundedPerformanceSummary;
		readonly environment?: NativePerformanceEnvironment;
	}) {
		this.#summary = input.summary;
		this.#environment = input.environment ?? defaultEnvironment();
		const timeline = this.#environment.performance;
		const Observer = this.#environment.PerformanceObserver;
		if (Observer === undefined) {
			this.#observer = null;
			this.support = Object.freeze({
				...absentSupport(),
				clock: typeof timeline?.now === "function",
				marks:
					typeof timeline?.mark === "function" &&
					typeof timeline?.measure === "function",
			});
			return;
		}

		const advertised = new Set(Observer.supportedEntryTypes ?? []);
		const observed = {
			mark: false,
			measure: false,
			longtask: false,
			event: false,
		};
		let observer: PerformanceObserverLike | null = null;
		try {
			observer = new Observer((list) => {
				try {
					for (const entry of list.getEntries()) this.#summary.observe(entry);
				} catch {
					// A broken observer source cannot become application authority.
				}
			});
			for (const type of OBSERVABLE_ENTRY_TYPES) {
				if (!advertised.has(type)) continue;
				try {
					observer.observe({ type, buffered: true });
					observed[type] = true;
				} catch {
					observed[type] = false;
				}
			}
		} catch {
			observer = null;
		}
		this.#observer = observer;
		this.support = Object.freeze({
			clock: typeof timeline?.now === "function",
			marks:
				typeof timeline?.mark === "function" &&
				typeof timeline?.measure === "function",
			observer: observer !== null,
			entryTypes: Object.freeze(observed),
		});
	}

	now(): number | null {
		try {
			const measured = this.#environment.performance?.now();
			return measured !== undefined &&
				Number.isFinite(measured) &&
				measured >= 0
				? Math.round(measured)
				: null;
		} catch {
			return null;
		}
	}

	mark(name: string): boolean {
		if (!this.#summary.acceptsName(name)) return false;
		try {
			this.#environment.performance?.mark?.(name);
			return this.support.marks;
		} catch {
			return false;
		}
	}

	measure(name: string, startMark?: string, endMark?: string): boolean {
		if (
			!this.#summary.acceptsName(name) ||
			(startMark !== undefined && !this.#summary.acceptsName(startMark)) ||
			(endMark !== undefined && !this.#summary.acceptsName(endMark))
		)
			return false;
		try {
			this.#environment.performance?.measure?.(name, startMark, endMark);
			return this.support.marks;
		} catch {
			return false;
		}
	}

	disconnect(): void {
		if (this.#disconnected) return;
		this.#disconnected = true;
		try {
			this.#observer?.disconnect();
		} catch {
			// Diagnostics teardown is never application authority.
		}
	}
}
