import { afterEach, describe, expect, it, vi } from "vitest";

class FakeWorker {
	static instances: FakeWorker[] = [];
	readonly requests: Array<{ id: number; kind: "load" | "refresh" }> = [];
	onmessage: ((message: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(request: { id: number; kind: "load" | "refresh" }) {
		this.requests.push(request);
	}
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
	FakeWorker.instances = [];
});

function withoutAuthority() {
	vi.stubGlobal("Worker", FakeWorker);
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("no local world authority");
		}),
	);
}

describe("generated world worker client", () => {
	it("starts one load after the local authority probe fails and reuses it until an explicit refresh", async () => {
		withoutAuthority();
		const client = await import("./generated-world-client");
		expect(FakeWorker.instances).toHaveLength(0);

		const first = client.loadGeneratedWorldExperience();
		await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
		const worker = FakeWorker.instances[0];
		expect(worker?.requests).toEqual([{ id: 1, kind: "load" }]);

		worker?.onmessage?.({
			data: { id: 1, ok: true, experience: { worldId: "world" } },
		} as MessageEvent);
		await expect(first).resolves.toMatchObject({ worldId: "world" });
		expect(worker?.requests).toHaveLength(1);

		const refreshed = client.refreshGeneratedWorldExperience();
		await vi.waitFor(() =>
			expect(worker?.requests.at(-1)).toEqual({ id: 2, kind: "refresh" }),
		);
		worker?.onmessage?.({
			data: { id: 2, ok: true, experience: { worldId: "world-refreshed" } },
		} as MessageEvent);
		await expect(refreshed).resolves.toMatchObject({
			worldId: "world-refreshed",
		});
	});

	it("rejects pending authority requests if the worker fails", async () => {
		withoutAuthority();
		const client = await import("./generated-world-client");
		const pending = client.loadGeneratedWorldExperience();
		await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
		FakeWorker.instances[0]?.onerror?.();
		await expect(pending).rejects.toThrow("WORLD_WORKER_FAILED");
	});

	it("fails closed when the worker rejects authority construction", async () => {
		withoutAuthority();
		const client = await import("./generated-world-client");
		const pending = client.loadGeneratedWorldExperience();
		await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
		FakeWorker.instances[0]?.onmessage?.({
			data: { id: 1, ok: false },
		} as MessageEvent);
		await expect(pending).rejects.toThrow("WORLD_WORKER_FAILED");
	});
});
