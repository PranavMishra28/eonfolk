import type { GeneratedWorldState } from "@eonfolk/protocol";

import {
	type CivilizationScheduledActivity,
	continueCivilizationExperimentDay,
	runCivilizationExperiment,
} from "./experiment.js";
import type { CivilizationState } from "./types.js";

export const LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION =
	"eonfolk-local-world-authority-v1" as const;
export const LOCAL_WORLD_AUTHORITY_DEFAULT_PORT = 18_765;
export const LOCAL_WORLD_AUTHORITY_DEFAULT_ORIGIN =
	`http://127.0.0.1:${String(LOCAL_WORLD_AUTHORITY_DEFAULT_PORT)}` as const;

export interface LocalWorldAuthoritySnapshot {
	readonly schemaVersion: typeof LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION;
	readonly completedDay: number;
	readonly worldIdentityHash: string;
	readonly stateHash: string;
	readonly world: GeneratedWorldState;
	readonly state: CivilizationState;
	readonly activities: readonly CivilizationScheduledActivity[];
}

export interface LocalWorldAuthorityStatus {
	readonly schemaVersion: typeof LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION;
	readonly writer: "local-process";
	readonly completedDay: number;
	readonly worldIdentityHash: string;
	readonly processReachable: boolean;
	readonly catchUpRequired: boolean;
}

export type LocalWorldAuthorityFenceChoice =
	| "adopt-process"
	| "stay-local"
	| "fresh-local";

export interface LocalWorldAuthorityFenceSnapshot {
	readonly worldIdentityHash: string;
	readonly stateHash: string;
}

export type LocalWorldAuthorityFence =
	| {
			readonly writer: "local-process";
			readonly browserMustNotWrite: true;
			readonly conflict: false;
			readonly catchUpRequired: false;
	  }
	| {
			readonly writer: "indexeddb";
			readonly browserMustNotWrite: false;
			readonly conflict: false;
			readonly catchUpRequired: boolean;
	  }
	| {
			readonly writer: "none";
			readonly browserMustNotWrite: true;
			readonly conflict: true;
			readonly catchUpRequired: false;
	  };

function snapshotsDiverge(
	left: LocalWorldAuthorityFenceSnapshot,
	right: LocalWorldAuthorityFenceSnapshot,
): boolean {
	return (
		left.worldIdentityHash !== right.worldIdentityHash ||
		left.stateHash !== right.stateHash
	);
}

/**
 * One live writer at a time. Reachable process owns Reality; IndexedDB writes
 * only when the process is down or the player explicitly keeps the browser
 * town. Divergent snapshots are never merged.
 */
export function resolveLocalWorldAuthorityFence(input: {
	readonly processSnapshot: LocalWorldAuthorityFenceSnapshot | null;
	readonly localSnapshot: LocalWorldAuthorityFenceSnapshot | null;
	readonly playerChoice?: LocalWorldAuthorityFenceChoice | null;
}): LocalWorldAuthorityFence {
	const processSnapshot = input.processSnapshot;
	if (processSnapshot === null)
		return Object.freeze({
			writer: "indexeddb",
			browserMustNotWrite: false,
			conflict: false,
			catchUpRequired: true,
		});
	const choice = input.playerChoice ?? null;
	if (choice === "stay-local" || choice === "fresh-local")
		return Object.freeze({
			writer: "indexeddb",
			browserMustNotWrite: false,
			conflict: false,
			catchUpRequired: false,
		});
	if (choice === "adopt-process")
		return Object.freeze({
			writer: "local-process",
			browserMustNotWrite: true,
			conflict: false,
			catchUpRequired: false,
		});
	const localSnapshot = input.localSnapshot;
	if (
		localSnapshot === null ||
		!snapshotsDiverge(localSnapshot, processSnapshot)
	)
		return Object.freeze({
			writer: "local-process",
			browserMustNotWrite: true,
			conflict: false,
			catchUpRequired: false,
		});
	return Object.freeze({
		writer: "none",
		browserMustNotWrite: true,
		conflict: true,
		catchUpRequired: false,
	});
}

/**
 * One live day owned by the local process. The browser is a client of the
 * resulting snapshot. If this is not called, catch-up remains the honest path.
 */
export async function tickLocalWorldAuthority(input: {
	readonly genesisWorld: GeneratedWorldState;
	readonly current: LocalWorldAuthoritySnapshot | null;
}): Promise<LocalWorldAuthoritySnapshot> {
	if (input.current === null) {
		const run = await runCivilizationExperiment({
			world: input.genesisWorld,
			horizonDays: 1,
		});
		return Object.freeze({
			schemaVersion: LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION,
			completedDay: 1,
			worldIdentityHash: input.genesisWorld.identity.identityHash,
			stateHash: run.finalStateHash,
			world: run.world,
			state: run.state,
			activities: run.activities,
		});
	}
	const continued = await continueCivilizationExperimentDay({
		genesisWorld: input.genesisWorld,
		world: input.current.world,
		state: input.current.state,
		completedDay: input.current.completedDay,
		skipOpeningDecisions: false,
	});
	return Object.freeze({
		schemaVersion: LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION,
		completedDay: input.current.completedDay + 1,
		worldIdentityHash: input.genesisWorld.identity.identityHash,
		stateHash: continued.finalStateHash,
		world: continued.world,
		state: continued.state,
		activities: continued.activities,
	});
}

export function encodeLocalWorldAuthoritySnapshot(
	snapshot: LocalWorldAuthoritySnapshot,
): string {
	return `${JSON.stringify(snapshot)}\n`;
}

export function decodeLocalWorldAuthoritySnapshot(
	raw: string,
): LocalWorldAuthoritySnapshot {
	const parsed = JSON.parse(raw) as LocalWorldAuthoritySnapshot;
	if (
		parsed.schemaVersion !== LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION ||
		!Number.isSafeInteger(parsed.completedDay) ||
		parsed.completedDay < 1 ||
		typeof parsed.worldIdentityHash !== "string" ||
		typeof parsed.stateHash !== "string" ||
		parsed.world === undefined ||
		parsed.state === undefined
	)
		throw new Error("local world authority snapshot is not canonical");
	return Object.freeze({
		...parsed,
		activities: parsed.activities ?? [],
	});
}

export function localWorldAuthorityStatus(input: {
	readonly snapshot: LocalWorldAuthoritySnapshot | null;
	readonly processReachable: boolean;
}): LocalWorldAuthorityStatus {
	return Object.freeze({
		schemaVersion: LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION,
		writer: "local-process",
		completedDay: input.snapshot?.completedDay ?? 0,
		worldIdentityHash: input.snapshot?.worldIdentityHash ?? "",
		processReachable: input.processReachable,
		catchUpRequired: !input.processReachable,
	});
}
