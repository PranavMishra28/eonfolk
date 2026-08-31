import { afterEach, describe, expect, it, vi } from "vitest";

class FakeWorker {
	static instances: FakeWorker[] = [];
	readonly requests: Array<{
		id: number;
		kind: "load" | "refresh";
		skipAuthorityProbe?: true;
	}> = [];
	onmessage: ((message: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(request: {
		id: number;
		kind: "load" | "refresh";
		skipAuthorityProbe?: true;
	}) {
		this.requests.push(request);
	}
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
	FakeWorker.instances = [];
});

describe("generated world worker client", () => {
	it("starts one eager load and reuses it until an explicit refresh", async () => {
		vi.stubGlobal("Worker", FakeWorker);
		const client = await import("./generated-world-client");
		const worker = FakeWorker.instances[0];
		expect(worker?.requests).toEqual([{ id: 1, kind: "load" }]);

		const first = client.loadGeneratedWorldExperience();
		worker?.onmessage?.({
			data: { id: 1, ok: true, experience: { worldId: "world" } },
		} as MessageEvent);
		await expect(first).resolves.toMatchObject({ worldId: "world" });
		expect(worker?.requests).toHaveLength(1);

		const refreshed = client.refreshGeneratedWorldExperience();
		expect(worker?.requests.at(-1)).toEqual({ id: 2, kind: "refresh" });
		worker?.onmessage?.({
			data: { id: 2, ok: true, experience: { worldId: "world-refreshed" } },
		} as MessageEvent);
		await expect(refreshed).resolves.toMatchObject({
			worldId: "world-refreshed",
		});
	});

	it("tells the Worker not to probe when the page is WebDriver", async () => {
		vi.stubGlobal("Worker", FakeWorker);
		vi.stubGlobal("navigator", { webdriver: true });
		await import("./generated-world-client");
		expect(FakeWorker.instances[0]?.requests).toEqual([
			{ id: 1, kind: "load", skipAuthorityProbe: true },
		]);
	});

	it("rejects pending authority requests if the worker fails", async () => {
		vi.stubGlobal("Worker", FakeWorker);
		const client = await import("./generated-world-client");
		const pending = client.loadGeneratedWorldExperience();
		FakeWorker.instances[0]?.onerror?.();
		await expect(pending).rejects.toThrow("WORLD_WORKER_FAILED");
	});

	it("fails closed when the worker rejects authority construction", async () => {
		vi.stubGlobal("Worker", FakeWorker);
		const client = await import("./generated-world-client");
		const pending = client.loadGeneratedWorldExperience();
		FakeWorker.instances[0]?.onmessage?.({
			data: { id: 1, ok: false },
		} as MessageEvent);
		await expect(pending).rejects.toThrow("WORLD_WORKER_FAILED");
	});
});
