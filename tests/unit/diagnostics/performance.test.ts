import { describe, expect, it } from "vitest";
import {
	BoundedPerformanceSummary,
	NativePerformanceMonitor,
	type PerformanceEntryListLike,
} from "../../../packages/diagnostics/src/index.js";

describe("bounded native performance diagnostics", () => {
	it("degrades to an inert capability result without browser globals", () => {
		const summary = new BoundedPerformanceSummary({
			maximumSamples: 4,
			allowedNames: ["world-start", "world-ready"],
		});
		const monitor = new NativePerformanceMonitor({ summary, environment: {} });
		expect(monitor.support).toEqual({
			clock: false,
			marks: false,
			observer: false,
			entryTypes: {
				mark: false,
				measure: false,
				longtask: false,
				event: false,
			},
		});
		expect(monitor.now()).toBeNull();
		expect(monitor.mark("world-start")).toBe(false);
		expect(monitor.measure("world-ready", "world-start")).toBe(false);
		expect(() => {
			monitor.disconnect();
			monitor.disconnect();
		}).not.toThrow();
		expect(summary.snapshot().acceptedSamples).toBe(0);
	});

	it("feature-detects native entries and keeps only bounded summaries", () => {
		let emit: ((entries: PerformanceEntryListLike) => void) | null = null;
		const observed: string[] = [];
		let disconnects = 0;
		class FakeObserver {
			static readonly supportedEntryTypes = [
				"measure",
				"longtask",
				"event",
				"resource",
			];

			constructor(callback: (entries: PerformanceEntryListLike) => void) {
				emit = callback;
			}

			observe(options: { readonly type: string }): void {
				if (options.type === "event") throw new Error("unsupported in profile");
				observed.push(options.type);
			}

			disconnect(): void {
				disconnects += 1;
			}
		}

		const marks: string[] = [];
		const measures: string[] = [];
		const summary = new BoundedPerformanceSummary({
			maximumSamples: 2,
			allowedNames: ["world-start", "world-ready", "self", "click"],
		});
		const monitor = new NativePerformanceMonitor({
			summary,
			environment: {
				performance: {
					now: () => 12.6,
					mark: (name) => marks.push(name),
					measure: (name) => measures.push(name),
				},
				PerformanceObserver: FakeObserver,
			},
		});

		expect(monitor.support).toEqual({
			clock: true,
			marks: true,
			observer: true,
			entryTypes: {
				mark: false,
				measure: true,
				longtask: true,
				event: false,
			},
		});
		expect(observed).toEqual(["measure", "longtask"]);
		expect(monitor.now()).toBe(13);
		expect(monitor.mark("world-start")).toBe(true);
		expect(monitor.mark("unknown-metric")).toBe(false);
		expect(monitor.measure("world-ready", "world-start")).toBe(true);
		expect(marks).toEqual(["world-start"]);
		expect(measures).toEqual(["world-ready"]);

		expect(emit).not.toBeNull();
		const dispatch = emit as unknown as (
			entries: PerformanceEntryListLike,
		) => void;
		dispatch({
			getEntries: () => [
				{
					entryType: "measure",
					name: "world-ready",
					startTime: 0,
					duration: 16.6,
				},
				{
					entryType: "longtask",
					name: "self",
					startTime: 17,
					duration: 55,
				},
				{
					entryType: "event",
					name: "click",
					startTime: 72,
					duration: 120,
				},
				{
					entryType: "resource",
					name: "https://secret.invalid/?token=never-store",
					startTime: 1,
					duration: 1,
				},
				{
					entryType: "measure",
					name: "unknown-name",
					startTime: 1,
					duration: 1,
				},
			],
		});

		const result = summary.snapshot();
		expect(result.acceptedSamples).toBe(2);
		expect(result.droppedSamples).toBe(1);
		expect(result.invalidSamples).toBe(2);
		expect(result.byType).toEqual({
			mark: 0,
			measure: 1,
			longtask: 1,
			event: 0,
		});
		expect(result.byName).toEqual({ self: 1, "world-ready": 1 });
		expect(result.maximumDurationMs).toBe(55);
		expect(result.totalDurationMs).toBe(72);
		expect(result.p50UpperBoundMs).toBe(17);
		expect(result.p95UpperBoundMs).toBe(100);
		expect(JSON.stringify(result)).not.toContain("secret.invalid");
		monitor.disconnect();
		monitor.disconnect();
		expect(disconnects).toBe(1);
	});

	it("rejects unbounded or unsafe metric catalogs and invalid samples", () => {
		expect(
			() =>
				new BoundedPerformanceSummary({
					maximumSamples: 1,
					allowedNames: ["https://unsafe.invalid"],
				}),
		).toThrow(/safe identifiers/u);
		const summary = new BoundedPerformanceSummary({
			maximumSamples: 1,
			allowedNames: ["frame-summary"],
		});
		expect(
			summary.observe({
				entryType: "measure",
				name: "frame-summary",
				startTime: 0,
				duration: Number.NaN,
			}),
		).toBe(false);
		expect(summary.snapshot().invalidSamples).toBe(1);
		const throwingMonitor = new NativePerformanceMonitor({
			summary,
			environment: {
				performance: {
					now: () => {
						throw new Error("clock unavailable");
					},
				},
			},
		});
		expect(throwingMonitor.now()).toBeNull();
	});
});
