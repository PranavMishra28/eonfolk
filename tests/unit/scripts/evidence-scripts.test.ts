import { describe, expect, it } from "vitest";
import {
	compactProductionErrorDetails,
	resolveBuildSha,
} from "../../../apps/web/vite.config";
import { summarizeDurations } from "../../../scripts/benchmark-diagnostics.mjs";
import {
	summarizePhysicalObservation,
	validatePhysicalObservation,
} from "../../../scripts/record-physical-device-evidence.mjs";

function observation() {
	return {
		schemaVersion: "eonfolk-physical-device-observation-v1",
		runId: "physical-001",
		buildManifestSha256: "a".repeat(64),
		device: {
			model: "Test Phone",
			os: "Test OS 1",
			browser: "Test Browser 1",
			screenWidth: 390,
			screenHeight: 844,
			devicePixelRatio: 3,
		},
		origin: "http://192.168.1.10:4173/",
		startedAt: "2026-08-21T10:00:00.000Z",
		endedAt: "2026-08-21T10:03:00.000Z",
		meaningfulWorldMs: 2_000,
		frameDeltasMs: {
			arrival: Array.from({ length: 120 }, () => 16),
			"busy-market": Array.from({ length: 120 }, () => 17),
			chronicle: Array.from({ length: 120 }, () => 18),
		},
		journey: {
			citizenSelection: true,
			identityReview: true,
			counsel: true,
			returnSummary: true,
			chronicleNavigation: true,
			replayControls: true,
			reducedMotion: true,
			semanticFallback: true,
		},
		externalRequestCount: 0,
		thermal: { support: false, start: "unsupported", end: "unsupported" },
	};
}

describe("evidence scripts", () => {
	it("compacts only static repository runtime error detail in production", () => {
		const source = [
			'fail("RANGE_GAP", "private durable detail");',
			'new PersistenceError("STALE_STATE", "private hash detail");',
			'throw new Error("private browser detail");',
			'fail("private projection detail");',
		].join("\n");
		expect(
			compactProductionErrorDetails(
				source,
				"/repo/packages/persistence/src/example.ts",
			),
		).toBe(
			[
				'fail("RANGE_GAP", "RANGE_GAP");',
				'new PersistenceError("STALE_STATE", "STALE_STATE");',
				'throw new Error("LOCAL_RUNTIME_FAILURE");',
				'fail("invalid");',
			].join("\n"),
		);
		expect(
			compactProductionErrorDetails(source, "/repo/tests/unit/example.test.ts"),
		).toBe(source);
	});
	it("uses explicit build identity and fails safely without Git metadata", () => {
		expect(resolveBuildSha("a".repeat(40), () => "ignored")).toBe(
			"a".repeat(40),
		);
		expect(
			resolveBuildSha(undefined, () => {
				throw new Error("git unavailable");
			}),
		).toBe("unknown");
		expect(resolveBuildSha("not a sha", () => "ignored")).toBe("unknown");
	});

	it("uses nearest-rank percentiles for diagnostic durations", () => {
		expect(summarizeDurations([4, 1, 3, 2, 5])).toEqual({
			count: 5,
			p50Ms: 3,
			p95Ms: 5,
			worstMs: 5,
		});
	});

	it("accepts a bounded RFC1918 physical observation and derives gates", () => {
		const input = observation();
		expect(validatePhysicalObservation(input)).toBe(input);
		const result = summarizePhysicalObservation(input);
		expect(result.pass).toBe(true);
		expect(result.frames["busy-market"].p95Ms).toBe(17);
	});

	it("rejects public origins, insufficient raw samples, and unknown fields", () => {
		expect(() =>
			validatePhysicalObservation({
				...observation(),
				origin: "https://example.com:4173/",
			}),
		).toThrow(/RFC1918/);
		expect(() =>
			validatePhysicalObservation({
				...observation(),
				frameDeltasMs: {
					...observation().frameDeltasMs,
					arrival: [16],
				},
			}),
		).toThrow(/120–20000/);
		expect(() =>
			validatePhysicalObservation({ ...observation(), note: "unbounded" }),
		).toThrow(/keys must be exactly/);
	});

	it("fails a physical record when a raw p95 exceeds the mobile budget", () => {
		const input = observation();
		const result = summarizePhysicalObservation({
			...input,
			frameDeltasMs: {
				...input.frameDeltasMs,
				chronicle: Array.from({ length: 120 }, () => 34),
			},
		});
		expect(result.pass).toBe(false);
		expect(result.assertions.frames.pass).toBe(false);
	});
});
