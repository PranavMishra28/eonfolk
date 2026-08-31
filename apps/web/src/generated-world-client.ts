import type {
	CivilizationScheduledActivity,
	CivilizationState,
} from "@eonfolk/civilization";
import type { GeneratedWorldState } from "@eonfolk/protocol";
import { withAuthorityWriter } from "./authority-writer";
import type {
	GeneratedWorldBuildOptions,
	GeneratedWorldExperience,
} from "./generated-world-runtime";
import { hydrateGeneratedWorldExperience } from "./generated-world-runtime";
import type { PlayRate } from "./play-clock";

export type { GeneratedWorldExperience } from "./generated-world-runtime";
export { GENERATED_WORLD_STORAGE_KEY } from "./generated-world-runtime";

const generatedFaultHooks =
	typeof __EONFOLK_E2E_CRASH_HOOKS__ !== "undefined" &&
	__EONFOLK_E2E_CRASH_HOOKS__;

export const LOCAL_WORLD_AUTHORITY_URL = "http://127.0.0.1:4175";

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

interface AuthoritySnapshotPayload {
	readonly world: GeneratedWorldState;
	readonly civilization: CivilizationState;
	readonly activities: readonly CivilizationScheduledActivity[];
	readonly stateHash: string;
	readonly simulationTime: number;
	readonly horizonDays: number;
	readonly previousStateHash: string;
	readonly previousHorizonDays: number;
	readonly persistenceName: string;
	readonly playRate: PlayRate;
}

let worker: Worker | undefined;
let nextRequestId = 1;
let initialExperience: Promise<GeneratedWorldExperience> | undefined;
let authorityAvailable: boolean | null = null;
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

function playwrightBrowserWorld(): boolean {
	return typeof navigator !== "undefined" && navigator.webdriver === true;
}

async function probeAuthority(): Promise<boolean> {
	if (playwrightBrowserWorld()) return false;
	if (authorityAvailable === true) return true;
	try {
		const response = await fetch(`${LOCAL_WORLD_AUTHORITY_URL}/health`, {
			signal: AbortSignal.timeout(400),
		});
		if (!response.ok) return false;
		const body = (await response.json()) as {
			readonly ok?: unknown;
			readonly ready?: unknown;
		};
		authorityAvailable = body.ok === true && body.ready === true;
		return authorityAvailable;
	} catch {
		return false;
	}
}

function experienceFromAuthoritySnapshot(
	snapshot: AuthoritySnapshotPayload,
): GeneratedWorldExperience {
	return hydrateGeneratedWorldExperience({
		world: snapshot.world,
		civilization: snapshot.civilization,
		activities: snapshot.activities,
		stateHash: snapshot.stateHash,
		simulationTime: snapshot.simulationTime,
		horizonDays: snapshot.horizonDays,
		previousStateHash: snapshot.previousStateHash,
		previousHorizonDays: snapshot.previousHorizonDays,
		persistenceName: snapshot.persistenceName,
		persistence: {
			kind: "file",
			claim: "durable-authority",
			failureCode: null,
			restored: true,
			catchUpReceipts: 0,
		},
	});
}

async function authoritySnapshot(
	path: "/v1/snapshot" | "/v1/advance-day",
	method: "GET" | "POST" = path === "/v1/snapshot" ? "GET" : "POST",
): Promise<GeneratedWorldExperience> {
	const response = await fetch(`${LOCAL_WORLD_AUTHORITY_URL}${path}`, {
		method,
	});
	if (!response.ok) throw new Error("WORLD_AUTHORITY_FAILED");
	const snapshot = (await response.json()) as AuthoritySnapshotPayload;
	return experienceFromAuthoritySnapshot(snapshot);
}

export async function setGeneratedWorldPlayRate(
	playRate: PlayRate,
): Promise<void> {
	if (!(await probeAuthority())) return;
	await fetch(`${LOCAL_WORLD_AUTHORITY_URL}/v1/clock`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ playRate }),
	});
}

export function loadGeneratedWorldExperience(
	options?: GeneratedWorldBuildOptions,
): Promise<GeneratedWorldExperience> {
	if (generatedFaultHooks || typeof Worker === "undefined")
		return directRequest("load", options);
	initialExperience ??= (async () => {
		if (await probeAuthority()) return await authoritySnapshot("/v1/snapshot");
		return await workerRequest("load");
	})();
	return initialExperience;
}

export function refreshGeneratedWorldExperience(): Promise<GeneratedWorldExperience> {
	if (generatedFaultHooks || typeof Worker === "undefined")
		return directRequest("refresh");
	initialExperience = (async () => {
		if (await probeAuthority()) return await authoritySnapshot("/v1/snapshot");
		return await workerRequest("refresh");
	})();
	return initialExperience;
}

export function advanceGeneratedWorldLiveDay(): Promise<GeneratedWorldExperience> {
	return withAuthorityWriter(async () => {
		if (generatedFaultHooks || typeof Worker === "undefined")
			return await directRequest("advance-day");
		if (await probeAuthority()) {
			initialExperience = authoritySnapshot("/v1/snapshot");
			return await initialExperience;
		}
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
		if (await probeAuthority()) {
			initialExperience = authoritySnapshot("/v1/snapshot");
			return await initialExperience;
		}
		initialExperience = workerRequest("catch-up", input);
		return await initialExperience;
	});
}
