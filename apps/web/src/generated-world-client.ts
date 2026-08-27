import { withAuthorityWriter } from "./authority-writer";
import type {
	GeneratedWorldBuildOptions,
	GeneratedWorldExperience,
} from "./generated-world-runtime";

export type { GeneratedWorldExperience } from "./generated-world-runtime";
export { GENERATED_WORLD_STORAGE_KEY } from "./generated-world-runtime";

const generatedFaultHooks =
	typeof __EONFOLK_E2E_CRASH_HOOKS__ !== "undefined" &&
	__EONFOLK_E2E_CRASH_HOOKS__;

type WorkerRequest =
	| Readonly<{
			readonly id: number;
			readonly kind: "load" | "refresh" | "advance-day";
	  }>
	| Readonly<{
			readonly id: number;
			readonly kind: "catch-up";
			readonly operationId: string;
			readonly additionalDays: number;
	  }>;

type WorkerResponse = Readonly<{
	id: number;
	ok: boolean;
	experience?: GeneratedWorldExperience;
}>;

let worker: Worker | undefined;
let nextRequestId = 1;
let initialExperience: Promise<GeneratedWorldExperience> | undefined;
const pending = new Map<
	number,
	Readonly<{
		resolve: (experience: GeneratedWorldExperience) => void;
		reject: (error: Error) => void;
	}>
>();

function workerRequest(
	kind: WorkerRequest["kind"],
	catchUp?: Readonly<{
		readonly operationId: string;
		readonly additionalDays: number;
	}>,
) {
	worker ??= new Worker(
		new URL("./generated-world-runtime.worker.ts", import.meta.url),
		{ type: "module" },
	);
	worker.onmessage ??= (message: MessageEvent<WorkerResponse>) => {
		const request = pending.get(message.data.id);
		if (request === undefined) return;
		pending.delete(message.data.id);
		if (message.data.ok && message.data.experience !== undefined)
			request.resolve(message.data.experience);
		else request.reject(new Error("WORLD_WORKER_FAILED"));
	};
	worker.onerror ??= () => {
		for (const request of pending.values())
			request.reject(new Error("WORLD_WORKER_FAILED"));
		pending.clear();
	};
	const id = nextRequestId++;
	const payload: WorkerRequest =
		kind === "catch-up" && catchUp !== undefined
			? {
					id,
					kind: "catch-up",
					operationId: catchUp.operationId,
					additionalDays: catchUp.additionalDays,
				}
			: { id, kind: kind === "catch-up" ? "load" : kind };
	return new Promise<GeneratedWorldExperience>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		worker!.postMessage(payload);
	});
}

/** Fault injection stays on the instrumented direct path; production owns one worker. */
async function directRequest(
	kind: WorkerRequest["kind"],
	options?: GeneratedWorldBuildOptions,
	catchUp?: Readonly<{
		readonly operationId: string;
		readonly additionalDays: number;
	}>,
) {
	const runtime = await import("./generated-world-runtime");
	if (options !== undefined)
		return await runtime.buildGeneratedWorldExperience(options);
	if (kind === "advance-day")
		return await runtime.advanceGeneratedWorldLiveDay();
	if (kind === "catch-up" && catchUp !== undefined)
		return await runtime.catchUpGeneratedWorldReturnDays(catchUp);
	return kind === "refresh"
		? await runtime.refreshGeneratedWorldExperience()
		: await runtime.loadGeneratedWorldExperience();
}

export function loadGeneratedWorldExperience(
	options?: GeneratedWorldBuildOptions,
): Promise<GeneratedWorldExperience> {
	if (generatedFaultHooks || typeof Worker === "undefined")
		return directRequest("load", options);
	initialExperience ??= workerRequest("load");
	return initialExperience;
}

export function refreshGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	if (generatedFaultHooks || typeof Worker === "undefined")
		return directRequest("refresh");
	initialExperience = workerRequest("refresh");
	return initialExperience;
}

export function advanceGeneratedWorldLiveDay(): Promise<GeneratedWorldExperience> {
	return withAuthorityWriter(async () => {
		if (generatedFaultHooks || typeof Worker === "undefined")
			return await directRequest("advance-day");
		initialExperience = workerRequest("advance-day");
		return await initialExperience;
	});
}

export function catchUpGeneratedWorldReturnDays(input: {
	readonly operationId: string;
	readonly additionalDays: number;
}): Promise<GeneratedWorldExperience> {
	return withAuthorityWriter(async () => {
		if (generatedFaultHooks || typeof Worker === "undefined")
			return await directRequest("catch-up", undefined, input);
		initialExperience = workerRequest("catch-up", input);
		return await initialExperience;
	});
}

if (!generatedFaultHooks && typeof Worker !== "undefined")
	initialExperience = workerRequest("load");
