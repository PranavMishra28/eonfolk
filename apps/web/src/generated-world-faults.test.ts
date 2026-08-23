import { describe, expect, it, vi } from "vitest";
import {
	applyGeneratedWorldAuthorityFault,
	clearGeneratedWorldFault,
	GENERATED_WORLD_FAULT_KINDS,
	GENERATED_WORLD_FAULT_STORAGE_KEY,
	GeneratedWorldFaultBoundaryError,
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

	it("maps persistence failure only to the deterministic non-persistent adapter", () => {
		const fault = parseGeneratedWorldFault("persistence");
		expect(generatedWorldBuildOptionsForFault(fault)).toEqual({
			indexedDbFactory: null,
		});
		expect(
			generatedWorldBuildOptionsForFault(
				parseGeneratedWorldFault("model-provider"),
			),
		).toEqual({});
	});

	it("fails closed for checkpoint and authoritative invariant failures", async () => {
		for (const kind of ["checkpoint", "authoritative-invariant"] as const) {
			const fault = parseGeneratedWorldFault(kind);
			await expect(
				applyGeneratedWorldAuthorityFault(Promise.resolve("world"), fault, 0),
			).rejects.toMatchObject({
				name: "GeneratedWorldFaultBoundaryError",
				fault: { kind, disposition: "fail-closed" },
			});
		}
	});

	it("holds latency without converting pending data into facts", async () => {
		vi.useFakeTimers();
		const pending = applyGeneratedWorldAuthorityFault(
			Promise.resolve("canonical"),
			parseGeneratedWorldFault("latency"),
			500,
		);
		let settled = false;
		void pending.then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(499);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await expect(pending).resolves.toBe("canonical");
		vi.useRealTimers();
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

	it("exposes a typed public error without hidden diagnostic state", () => {
		const fault = parseGeneratedWorldFault("checkpoint");
		if (fault === null) throw new Error("expected checkpoint fault");
		const error = new GeneratedWorldFaultBoundaryError(fault);
		expect(error.message).toBe(fault.message);
		expect(error.fault).toEqual(fault);
		expect(error).not.toHaveProperty("reasoning");
	});
});
