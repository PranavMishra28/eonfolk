import { describe, expect, it, vi } from "vitest";
import {
	clearGeneratedWorldFault,
	GENERATED_WORLD_FAULT_KINDS,
	GENERATED_WORLD_FAULT_STORAGE_KEY,
	generatedPersistenceBoundaryFailure,
	generatedWorldAssetFetcherForFault,
	generatedWorldBuildOptionsForFault,
	generatedWorldPresentationFault,
	parseGeneratedWorldFault,
	readGeneratedWorldFault,
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
});
