import { describe, expect, it } from "vitest";
import {
	diagnosticFingerprint,
	disabledReplayCapturePort,
	FlightRecorder,
	projectLocalObserver,
	Sentinel,
	sanitizeDiagnosticFields,
	sanitizeDiagnosticFieldsForCategory,
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

	it("uses category-specific fields and rejects arbitrary string values", () => {
		const sanitized = sanitizeDiagnosticFieldsForCategory("performance", {
			durationMs: 17,
			operation: "frame-summary",
			invariant: "must-not-cross-category",
			code: "must-not-cross-category",
			status: "Bearer-secret-token",
			chainOfThought: "must never survive",
		});
		expect(sanitized).toEqual({
			durationMs: 17,
			operation: "frame-summary",
			status: "[redacted:unsafe-string]",
		});
		expect(JSON.stringify(sanitized)).not.toContain("Bearer");
		expect(JSON.stringify(sanitized)).not.toContain("invariant");
	});

	it("records only bounded presentation mismatch diagnostics", () => {
		const sanitized = sanitizeDiagnosticFieldsForCategory("presentation", {
			mismatchCode: "action-animation-contradiction",
			actionKind: "repair",
			displayedAction: "talk",
			distanceMm: 420,
			clockTick: 91,
			actorCount: 8,
			interactionCount: 1,
			prompt: "must-not-survive",
			position: { x: 1, y: 2 },
		});
		expect(sanitized).toEqual({
			actionKind: "repair",
			actorCount: 8,
			clockTick: 91,
			displayedAction: "talk",
			distanceMm: 420,
			interactionCount: 1,
			mismatchCode: "action-animation-contradiction",
		});
	});

	it("fails closed for wrong field types, cyclic arrays, and throwing getters", () => {
		const cyclic: unknown[] = [];
		cyclic.push(cyclic);
		const fields: Record<string, unknown> = {
			durationMs: "17",
			operation: cyclic,
		};
		Object.defineProperty(fields, "status", {
			enumerable: true,
			get: () => {
				throw new Error("must not escape diagnostics");
			},
		});
		expect(() =>
			sanitizeDiagnosticFieldsForCategory("performance", fields),
		).not.toThrow();
		expect(sanitizeDiagnosticFieldsForCategory("performance", fields)).toEqual(
			{},
		);
	});

	it("keeps core mode quiet except failures and Sentinel", () => {
		const recorder = new FlightRecorder({ mode: "off", now: clock() });
		expect(recorder.snapshot().identity).toEqual({
			diagnosticSessionId: "session-unknown",
			buildSha: "unknown",
			appVersion: "unknown",
			protocolVersion: "unknown",
			experimentId: "experiment-none",
			runId: "run-unknown",
			runtimeClass: "unknown",
			viewportClass: "unknown",
			diagnosticsMode: "off",
		});
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
		recorder.setMode("alpha");
		expect(recorder.snapshot().identity.diagnosticsMode).toBe("alpha");
		expect(
			recorder.record({
				category: "ui",
				name: "consent-enabled",
				severity: "info",
				outcome: "accepted",
				scope: { component: "feedback" },
				fields: { mode: "alpha" },
			}),
		).not.toBeNull();
		const local = new FlightRecorder({ mode: "local", now: clock() });
		expect(
			local.record({
				category: "performance",
				name: "frame-summary",
				severity: "debug",
				outcome: "observed",
				scope: { component: "renderer" },
				fields: { durationMs: 17 },
			}),
		).not.toBeNull();
		expect(local.snapshot().mode).toBe("local");
		expect(local.snapshot().redactionPolicyVersion).toBe(
			"eonfolk-redaction-v2",
		);
	});

	it("carries a bounded session identity into every snapshot and observer", () => {
		const recorder = new FlightRecorder({
			mode: "local",
			now: clock(),
			identity: {
				diagnosticSessionId: "session-1234",
				buildSha: "a".repeat(40),
				appVersion: "0.0.0",
				protocolVersion: "1",
				experimentId: "founder-alpha-standard-brain",
				runId: "run_riverhold_0001",
				runtimeClass: "browser-worker-capable",
				viewportClass: "wide",
			},
		});
		const snapshot = recorder.snapshot();
		expect(snapshot.identity).toEqual({
			diagnosticSessionId: "session-1234",
			buildSha: "a".repeat(40),
			appVersion: "0.0.0",
			protocolVersion: "1",
			experimentId: "founder-alpha-standard-brain",
			runId: "run_riverhold_0001",
			runtimeClass: "browser-worker-capable",
			viewportClass: "wide",
			diagnosticsMode: "local",
		});
		expect(Object.isFrozen(snapshot.identity)).toBe(true);
		const observer = projectLocalObserver({
			snapshot,
			incidents: [],
			worldHead: null,
		});
		expect(observer.identity).toBe(snapshot.identity);
		expect(observer.identity.diagnosticsMode).toBe(observer.health.mode);
	});

	it("rejects unsafe or overly specific identity classes", () => {
		expect(
			() =>
				new FlightRecorder({
					mode: "local",
					now: clock(),
					identity: { buildSha: "https://example.invalid/?token=secret" },
				}),
		).toThrow(/buildSha/);
		expect(
			() =>
				new FlightRecorder({
					mode: "local",
					now: clock(),
					identity: { runtimeClass: "browser-safari-22" as never },
				}),
		).toThrow(/runtimeClass/);
	});

	it("keeps disabled replay capture deterministic and side-effect free", () => {
		expect(Object.isFrozen(disabledReplayCapturePort)).toBe(true);
		expect(disabledReplayCapturePort.available).toBe(false);
		expect(disabledReplayCapturePort.begin()).toBe(false);
		expect(
			disabledReplayCapturePort.freeze({
				reason: "explicit-capture",
				triggerSequence: 12,
				fingerprint: null,
			}),
		).toBeNull();
		expect(() => disabledReplayCapturePort.discard()).not.toThrow();
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
		const first = await diagnosticFingerprint("runtime-failure", event!, {
			buildSha: "a".repeat(40),
			protocolVersion: "protocol-v1",
		});
		const second = await diagnosticFingerprint(
			"runtime-failure",
			{
				...event!,
				sequence: 900,
				monotonicMs: 999,
			},
			{
				buildSha: "a".repeat(40),
				protocolVersion: "protocol-v1",
			},
		);
		expect(first).toBe(second);
		expect(
			await diagnosticFingerprint("runtime-failure", event!, {
				buildSha: "b".repeat(40),
				protocolVersion: "protocol-v1",
			}),
		).not.toBe(first);
		expect(
			await diagnosticFingerprint("runtime-failure", event!, {
				buildSha: "a".repeat(40),
				protocolVersion: "protocol-v2",
			}),
		).not.toBe(first);
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
			summaryCode: "reality-protected",
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
		expect(observer.capabilities.nativePerformance).toBe("unsupported");
		expect(observer.worldHead?.revision).toBe(4);
		const bytes = JSON.stringify(observer);
		expect(bytes).not.toContain("stateHash");
		expect(bytes).not.toContain("decisionRecord");
		expect(bytes).not.toContain("prompt");
	});

	it("projects only closed authored incident summaries", async () => {
		const recorder = new FlightRecorder({ mode: "alpha", now: clock() });
		const trigger = recorder.record({
			category: "sentinel",
			name: "invariant-violation",
			severity: "critical",
			outcome: "failed",
			scope: { component: "runtime" },
			fields: { code: "RUNTIME_FAILED", invariant: "world-head-agreement" },
		});
		const incident = await recorder.freeze({
			reason: "runtime-failure",
			trigger: trigger!,
			summaryCode: "Bearer ghp_abcdefghijklmnopqrstuvwxyz123456" as never,
			recovery: "safe-stop",
		});
		const serialized = JSON.stringify(
			projectLocalObserver({
				snapshot: recorder.snapshot(),
				incidents: [incident],
				worldHead: null,
			}),
		);
		expect(incident.safeSummary).toContain("Riverhold paused");
		expect(serialized).not.toContain("ghp_");
		expect(incident.incidentId).toMatch(/^inc_[a-f0-9]{24}$/u);
	});
});
