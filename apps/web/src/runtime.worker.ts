/// <reference lib="webworker" />

import { IndexedDbPersistence } from "@eonfolk/persistence";
import { AuthoritativeRiverholdRuntime } from "./authoritative-runtime";
import type { Phase, RiverholdIntent, RiverholdProjection } from "./projection";

const DATABASE_NAME = "eonfolk-riverhold-v1";

type Request =
	| { readonly id: number; readonly kind: "initialize"; readonly phase: Phase }
	| {
			readonly id: number;
			readonly kind: "dispatch";
			readonly intent: RiverholdIntent;
	  }
	| { readonly id: number; readonly kind: "reset" };

let persistence: IndexedDbPersistence | null = null;
let runtime: AuthoritativeRiverholdRuntime | null = null;

async function open(phase: Phase): Promise<AuthoritativeRiverholdRuntime> {
	persistence = await IndexedDbPersistence.open({
		databaseName: DATABASE_NAME,
	});
	runtime = new AuthoritativeRiverholdRuntime({
		persistence,
		initialPhase: phase,
	});
	return runtime;
}

async function deleteDatabase(): Promise<void> {
	persistence?.close();
	persistence = null;
	runtime = null;
	await new Promise<void>((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DATABASE_NAME);
		request.addEventListener("success", () => resolve(), { once: true });
		request.addEventListener("error", () => reject(request.error), {
			once: true,
		});
		request.addEventListener(
			"blocked",
			() => reject(new Error("IndexedDB reset was blocked")),
			{ once: true },
		);
	});
}

self.addEventListener("message", (message: MessageEvent<Request>) => {
	void (async () => {
		try {
			const request = message.data;
			let projection: RiverholdProjection;
			if (request.kind === "initialize") {
				projection = await (await open(request.phase)).initialize();
			} else if (request.kind === "reset") {
				await deleteDatabase();
				projection = await (await open("orientation")).initialize();
			} else {
				if (runtime === null)
					throw new Error("worker runtime is not initialized");
				projection = await runtime.dispatch(request.intent);
			}
			self.postMessage({ id: request.id, ok: true, projection });
		} catch (error) {
			self.postMessage({
				id: message.data.id,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	})();
});
