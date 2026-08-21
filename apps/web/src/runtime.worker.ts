/// <reference lib="webworker" />

import { type CrashPoint, IndexedDbPersistence } from "@eonfolk/persistence";
import { AuthoritativeRiverholdRuntime } from "./authoritative-runtime";
import type { Phase, RiverholdIntent, RiverholdProjection } from "./projection";

const DATABASE_NAME = "eonfolk-riverhold-v1";

type Request =
	| { readonly id: number; readonly kind: "initialize"; readonly phase: Phase }
	| {
			readonly id: number;
			readonly kind: "dispatch";
			readonly intent: RiverholdIntent;
			readonly testCrashAfterTransition?: 1 | 2;
	  };

class E2eCrashController {
	#remaining: number | null = null;

	arm(afterTransition: 1 | 2 | undefined): void {
		this.#remaining = afterTransition ?? null;
	}

	hit(point: CrashPoint): void {
		if (point !== "transition:after-commit" || this.#remaining === null) return;
		this.#remaining -= 1;
		if (this.#remaining === 0) {
			this.#remaining = null;
			throw new Error("injected browser crash after durable transition");
		}
	}
}

let persistence: IndexedDbPersistence | null = null;
let runtime: AuthoritativeRiverholdRuntime | null = null;
let requestQueue: Promise<void> = Promise.resolve();
const e2eCrashController = __EONFOLK_E2E_CRASH_HOOKS__
	? new E2eCrashController()
	: null;

async function open(phase: Phase): Promise<AuthoritativeRiverholdRuntime> {
	persistence = await IndexedDbPersistence.open({
		databaseName: DATABASE_NAME,
		...(e2eCrashController === null
			? {}
			: { crashInjector: e2eCrashController }),
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
				e2eCrashController?.arm(request.testCrashAfterTransition);
				projection = await runtime.dispatch(request.intent);
			}
			self.postMessage({
				id: request.id,
				ok: true,
				projection,
				worldHead: runtime?.diagnosticWorldHead(),
			});
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
