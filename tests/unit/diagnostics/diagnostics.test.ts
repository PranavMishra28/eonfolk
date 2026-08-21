import { describe, expect, it } from "vitest";
import {
	diagnosticFingerprint,
	FlightRecorder,
	projectLocalObserver,
	Sentinel,
	sanitizeDiagnosticFields,
} from "../../../packages/diagnostics/src/index.js";

function clock() {
	let value = 100;
	return () => value++;
}

describe("Founder Alpha diagnostics", () => {
	it("redacts forbidden and unknown fields before storage", () => {
		const sanitized = sanitizeDiagnosticFields({
			code: "STALE_FENCE",
			operation: "commit",
			prompt: "private prompt",
			authorization: "Bearer secret",
			url: "https://example.invalid/?token=secret",
			arbitrary: "must not survive",
		});
		expect(sanitized).toEqual({ code: "STALE_FENCE", operation: "commit" });
		expect(JSON.stringify(sanitized)).not.toContain("secret");
	});

	it("keeps core mode quiet except failures and Sentinel", () => {
		const recorder = new FlightRecorder({ mode: "off", now: clock() });
		expect(
			recorder.record({
				category: "ui",
				name: "panel-open",
				severity: "info",
				outcome: "observed",
				scope: { component: "riverhold-ui" },
			}),
		).toBeNull();
		expect(
			recorder.record({
				category: "worker",
				name: "worker-crash",
				severity: "error",
				outcome: "failed",
				scope: { component: "runtime-worker" },
				fields: { code: "WORKER_FAILED" },
			}),
		).not.toBeNull();
		expect(recorder.snapshot().events).toHaveLength(1);
	});

	it("bounds events and bytes while accounting for eviction", () => {
		const recorder = new FlightRecorder({
			mode: "local",
			now: clock(),
			maximumEvents: 2,
			maximumBytes: 2048,
		});
		for (let index = 0; index < 4; index += 1)
			recorder.record({
				category: "performance",
				name: "frame-sample",
				severity: "debug",
				outcome: "observed",
				scope: { component: "renderer" },
				fields: { durationMs: index },
			});
		const snapshot = recorder.snapshot();
		expect(snapshot.events.map((event) => event.sequence)).toEqual([2, 3]);
		expect(snapshot.droppedEvents).toBe(2);
		expect(snapshot.byteLength).toBeLessThanOrEqual(2048);
	});

	it("derives stable fingerprints without private payload content", async () => {
		const recorder = new FlightRecorder({ mode: "local", now: clock() });
		const event = recorder.record({
			category: "persistence",
			name: "commit-failed",
			severity: "error",
			outcome: "failed",
			scope: { component: "indexeddb" },
			fields: { code: "QUOTA_ABORT", operation: "commit" },
		});
		expect(event).not.toBeNull();
		const first = await diagnosticFingerprint("runtime-failure", event!);
		const second = await diagnosticFingerprint("runtime-failure", {
			...event!,
			sequence: 900,
			monotonicMs: 999,
		});
		expect(first).toBe(second);
		expect(first).toMatch(/^inc_[a-f0-9]{24}$/u);
	});

	it("protects Reality before bounded recovery and exposes only safe observer data", async () => {
		const order: string[] = [];
		const recorder = new FlightRecorder({ mode: "alpha", now: clock() });
		const sentinel = new Sentinel({
			recorder,
			protectReality: () => {
				order.push("protect");
			},
			recover: () => {
				order.push("recover");
				return false;
			},
		});
		const incident = await sentinel.check({
			invariant: "world-head-agreement",
			holds: false,
			component: "authoritative-runtime",
			code: "HEAD_MISMATCH",
			safeSummary: "Riverhold paused before showing further world state.",
		});
		expect(order).toEqual(["protect", "recover"]);
		expect(incident?.recovery).toBe("safe-stop");
		const observer = projectLocalObserver({
			snapshot: recorder.snapshot(),
			incidents: [incident!],
			worldHead: {
				runId: "run_riverhold",
				regionId: "region_riverhold",
				revision: 4,
				sequence: 12,
				simulationTime: 86400,
				status: "safe-stop",
			},
		});
		expect(observer.health.status).toBe("safe-stop");
		expect(observer.worldHead?.revision).toBe(4);
		const bytes = JSON.stringify(observer);
		expect(bytes).not.toContain("stateHash");
		expect(bytes).not.toContain("decisionRecord");
		expect(bytes).not.toContain("prompt");
	});
});
