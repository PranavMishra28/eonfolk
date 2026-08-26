import { describe, expect, it, vi } from "vitest";
import { BrowserDiagnostics, browserDiagnostics } from "./diagnostics";
import {
	clearGeneratedWorldFault,
	GENERATED_WORLD_FAULT_KINDS,
	GENERATED_WORLD_FAULT_STORAGE_KEY,
	generatedPersistenceBoundaryFailure,
	generatedWorldAssetFetcherForFault,
	generatedWorldBuildOptionsForFault,
	generatedWorldFaultDiagnosticInput,
	generatedWorldPresentationFault,
	parseGeneratedWorldFault,
	readGeneratedWorldFault,
	recordGeneratedWorldFaultOutcome,
} from "./generated-world-faults";

describe("generated-world fault boundary", () => {
	it("accepts only the closed fault vocabulary behind an explicit build gate", () => {
		for (const kind of GENERATED_WORLD_FAULT_KINDS) {
			const storage = { getItem: () => kind };
			expect(readGeneratedWorldFault(storage, true)?.kind).toBe(kind);
			expect(readGeneratedWorldFault(storage, false)).toBeNull();
		}
		expect(parseGeneratedWorldFault("unknown-fault")).toBeNull();
		expect(parseGeneratedWorldFault({ kind: "asset" })).toBeNull();
	});

	it("injects persistence failures at each real browser boundary", () => {
		const fault = parseGeneratedWorldFault("persistence");
		const options = generatedWorldBuildOptionsForFault(fault);
		expect(options.persistenceBoundaryInjector).toBeDefined();
		for (const point of [
			"open",
			"upgrade",
			"read",
			"write",
			"transaction-abort",
		] as const) {
			const injector = generatedPersistenceBoundaryFailure(point);
			for (const candidate of [
				"open",
				"upgrade",
				"read",
				"write",
				"transaction-abort",
			] as const) {
				if (candidate === point)
					expect(() => injector.hit(candidate)).toThrow(point);
				else expect(() => injector.hit(candidate)).not.toThrow();
			}
		}
	});

	it("corrupts checkpoint admission and trips the pre-commit invariant", async () => {
		const checkpointFault = parseGeneratedWorldFault("checkpoint");
		const checkpointOptions =
			generatedWorldBuildOptionsForFault(checkpointFault);
		const checkpoint = { finalStateHash: "a".repeat(64) } as never;
		expect(checkpointOptions.checkpointTransform?.(checkpoint)).toMatchObject({
			finalStateHash: "0".repeat(64),
		});
		expect(checkpointOptions).not.toHaveProperty("mapAuthorityFailure");

		const invariantFault = parseGeneratedWorldFault("authoritative-invariant");
		const invariantOptions = generatedWorldBuildOptionsForFault(invariantFault);
		expect(
			invariantOptions.checkpointTransform?.({
				...(checkpoint as object),
				metrics: { invariantIssues: [] },
			} as never),
		).toMatchObject({
			metrics: {
				invariantIssues: ["injected-pre-commit-authority-invariant"],
			},
		});
	});

	it("holds the authority start gate before work begins", async () => {
		vi.useFakeTimers();
		const gate = generatedWorldBuildOptionsForFault(
			parseGeneratedWorldFault("latency"),
		).beforeAuthorityAdvance;
		if (gate === undefined) throw new Error("latency gate is missing");
		const pending = Promise.resolve(gate());
		let settled = false;
		void pending.then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(1_199);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await expect(pending).resolves.toBeUndefined();
		vi.useRealTimers();
	});

	it("runs asset corruption through the supplied fetch boundary", async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const fetcher = vi.fn(async () => new Response(bytes));
		const injected = generatedWorldAssetFetcherForFault(
			parseGeneratedWorldFault("asset"),
			fetcher as typeof fetch,
		);
		const response = await injected("/assets/generated/eonfolk-folk-proxy.glb");
		expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
			0, 2, 3,
		]);
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it("provides the real bounded decision gateway only for the provider fault", () => {
		const options = generatedWorldBuildOptionsForFault(
			parseGeneratedWorldFault("model-provider"),
		);
		expect(options.cognition?.decisionGateway).toBeTypeOf("function");
	});

	it("classifies presentation failures without mutating a supplied value", () => {
		const authority = Object.freeze({ stateHash: "authoritative-hash" });
		for (const kind of ["asset", "renderer-webgl", "navigation"] as const) {
			expect(
				generatedWorldPresentationFault(parseGeneratedWorldFault(kind), kind),
			).toBe(true);
			expect(authority).toEqual({ stateHash: "authoritative-hash" });
		}
	});

	it("clears only its own session-scoped injection key", () => {
		const removed: string[] = [];
		clearGeneratedWorldFault({ removeItem: (key) => removed.push(key) });
		expect(removed).toEqual([GENERATED_WORLD_FAULT_STORAGE_KEY]);
	});

	it("emits closed fault outcomes without accepting exception or state payloads", () => {
		const expected = {
			"model-provider": {
				category: "cognition",
				code: "GENERATED_MODEL_PROVIDER_UNAVAILABLE",
				phase: "head-preserved",
				status: "standard-brain-fallback",
			},
			persistence: {
				category: "persistence",
				code: "GENERATED_PERSISTENCE_UNAVAILABLE",
				phase: "head-preserved",
				status: "admitted-deterministic-view",
			},
			checkpoint: {
				category: "sentinel",
				code: "GENERATED_CHECKPOINT_REJECTED",
				phase: "head-preserved",
				status: "candidate-rejected",
			},
			"renderer-webgl": {
				category: "sentinel",
				code: "GENERATED_RENDERER_UNAVAILABLE",
				phase: "head-preserved",
				status: "renderer-unavailable",
			},
			asset: {
				category: "sentinel",
				code: "GENERATED_ASSET_REJECTED",
				phase: "head-preserved",
				status: "reference-rejected",
			},
			navigation: {
				category: "ui",
				code: "GENERATED_NAVIGATION_REJECTED",
				phase: "pre-dispatch",
				status: "candidate-rejected",
			},
			"authoritative-invariant": {
				category: "sentinel",
				code: "GENERATED_AUTHORITY_INVARIANT_FAILED",
				phase: "head-preserved",
				status: "candidate-rejected",
			},
			latency: {
				category: "performance",
				code: null,
				phase: "committed-after-wait",
				status: "completed",
			},
		} as const;
		for (const [boundary, outcome] of Object.entries(expected)) {
			const project = generatedWorldFaultDiagnosticInput as (
				boundary: keyof typeof expected,
				unsafe?: unknown,
			) => ReturnType<typeof generatedWorldFaultDiagnosticInput>;
			const input = project(boundary as keyof typeof expected, {
				error: new Error("Injected IndexedDB secret state"),
				prompt: "private model prompt",
				stateHash: "f".repeat(64),
			});
			const diagnostics = new BrowserDiagnostics("local");
			diagnostics.setWorldHead({
				runId: "run_release_genesis",
				regionId: "region_release_genesis",
				revision: 9,
				sequence: 41,
				simulationTime: 365,
				status: "healthy",
			});
			diagnostics.record(input);
			const observer = diagnostics.observer();
			const event = observer.trace.find(
				(candidate) => candidate.name === "generated-fault-outcome",
			);
			expect(event).toMatchObject({
				category: outcome.category,
				fields: { phase: outcome.phase, status: outcome.status },
			});
			expect(event?.fields.code ?? null).toBe(outcome.code);
			const recovery =
				boundary === "checkpoint" || boundary === "authoritative-invariant"
					? "safe-stop"
					: boundary === "renderer-webgl" || boundary === "asset"
						? "semantic-fallback"
						: null;
			expect(event?.fields.recovery ?? null).toBe(recovery);
			if (boundary === "renderer-webgl")
				expect(event?.fields).toMatchObject({
					domain: "render",
					invariant: "render-reality-noninterference",
				});
			if (boundary === "asset")
				expect(event?.fields).toMatchObject({ domain: "integrity" });
			expect(observer.worldHead).toMatchObject({ revision: 9, sequence: 41 });
			const serialized = JSON.stringify(observer);
			expect(serialized).not.toContain("Injected IndexedDB");
			expect(serialized).not.toContain("private model prompt");
			expect(serialized).not.toContain("stateHash");
			expect(serialized).not.toContain("f".repeat(64));
		}
	});

	it("keeps diagnostic recorder failure non-authoritative", () => {
		const recorder = vi
			.spyOn(browserDiagnostics, "record")
			.mockImplementationOnce(() => {
				throw new Error("Injected diagnostic recorder failure");
			});
		expect(() =>
			recordGeneratedWorldFaultOutcome("authoritative-invariant"),
		).not.toThrow();
		recorder.mockRestore();
	});
});
