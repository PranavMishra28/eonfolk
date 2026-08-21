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
	  };

let persistence: IndexedDbPersistence | null = null;
let runtime: AuthoritativeRiverholdRuntime | null = null;
let requestQueue: Promise<void> = Promise.resolve();

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

self.addEventListener("message", (message: MessageEvent<Request>) => {
	requestQueue = requestQueue.then(async () => {
		try {
			const request = message.data;
			let projection: RiverholdProjection;
			if (request.kind === "initialize") {
				projection = await (await open(request.phase)).initialize();
			} else {
				if (runtime === null)
					throw new Error("worker runtime is not initialized");
				projection = await runtime.dispatch(request.intent);
			}
			self.postMessage({ id: request.id, ok: true, projection });
		} catch (error) {
			const code =
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				typeof error.code === "string"
					? error.code
					: null;
			self.postMessage({
				id: message.data.id,
				ok: false,
				code,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});
});
