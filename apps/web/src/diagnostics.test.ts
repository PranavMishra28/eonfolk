import { describe, expect, it } from "vitest";
import { BrowserDiagnostics, routeIdentity } from "./diagnostics.js";

describe("browser diagnostics boundary", () => {
	it("binds every public route to Release Genesis", () => {
		for (const path of [
			"/",
			"/genesis",
			"/world",
			"/research",
			"/developer",
			"/unknown",
		])
			expect(routeIdentity(path).worldId).toBe("eonfolk-genesis-world-v1");
		expect(routeIdentity("/world")).toMatchObject({
			rendererVersion: "playcanvas-generated-civilization-v1",
			persistenceVersion: "versioned-browser-authority-v1",
		});
	});

	it("keeps the local observer read-only and bounded", () => {
		const diagnostics = new BrowserDiagnostics("local");
		diagnostics.setWorldHead({
			runId: "run_riverhold",
			regionId: "region_riverhold",
			revision: 2,
			sequence: 7,
			simulationTime: 60,
			status: "healthy",
		});
		diagnostics.record({
			category: "performance",
			name: "meaningful-world",
			severity: "info",
			outcome: "observed",
			scope: { component: "riverhold-app" },
			fields: { durationMs: 1200, prompt: "must not survive" },
		});
		const observer = diagnostics.observer();
		expect(observer.health.status).toBe("healthy");
		expect(observer.performance).toHaveLength(1);
		expect(observer.nativePerformance).not.toBeNull();
		expect(observer.nativePerformance?.summary.schemaVersion).toBe(
			"eonfolk-performance-summary-v1",
		);
		expect(observer.worldHead?.revision).toBe(2);
		expect(JSON.stringify(observer)).not.toContain("prompt");
	});

	it("freezes a safe incident after protecting Reality", async () => {
		const diagnostics = new BrowserDiagnostics("off");
		const order: string[] = [];
		const incident = await diagnostics.captureRuntimeFailure({
			code: "STALE_FENCE",
			component: "runtime-bridge",
			protectReality: () => {
				order.push("protected");
			},
		});
		expect(order).toEqual(["protected"]);
		expect(incident.recovery).toBe("safe-stop");
		expect(diagnostics.observer().health.status).toBe("safe-stop");
		expect(diagnostics.observer().nativePerformance).toBeNull();
		expect(diagnostics.observer().capabilities.nativePerformance).toBe(
			"disabled",
		);
		expect(diagnostics.observer().capabilities.localObserver).toBe("disabled");
		expect(diagnostics.observer().capabilities.replayCapture).toBe(
			"unsupported",
		);
	});
});
