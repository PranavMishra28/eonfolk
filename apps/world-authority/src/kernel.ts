import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
	CivilizationScheduledActivity,
	CivilizationState,
} from "@eonfolk/civilization";
import {
	PersistenceError,
	replayCivilizationHistory,
} from "@eonfolk/persistence";
import {
	createReleaseGenesis,
	type GeneratedWorldState,
} from "@eonfolk/protocol";
import { generateWorld } from "@eonfolk/worldgen";
import {
	appendLiveGeneratedCivilizationDay,
	catchUpLiveGeneratedCivilizationDays,
	GENERATED_CIVILIZATION_RUN_ID,
	persistPreparedGeneratedCivilization,
	prepareGeneratedCivilization,
} from "../../web/src/persistence/generated-civilization.js";

import { FileVersionedPersistence } from "./file-persistence.js";

export const LOCAL_WORLD_AUTHORITY_PORT = 4175;
export const LOCAL_WORLD_AUTHORITY_HOST = "127.0.0.1";

export type WorldAuthorityPlayRate = 0 | 1 | 3;

export const PLAY_DAY_INTERVAL_MS = 28_000;
export const FASTER_DAY_INTERVAL_MS = 8_000;
export const MAX_PROCESS_CATCH_UP_DAYS = 7;

const V1_GENESIS_RELEASE_ID = "release-genesis-browser-v1";
const V1_GENESIS_WORLD_ID = "eonfolk-genesis-world-v1";
const V1_GENESIS_SEED =
	"e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a";

export interface WorldAuthoritySnapshot {
	readonly world: GeneratedWorldState;
	readonly civilization: CivilizationState;
	readonly activities: readonly CivilizationScheduledActivity[];
	readonly stateHash: string;
	readonly simulationTime: number;
	readonly horizonDays: number;
	readonly previousStateHash: string;
	readonly previousHorizonDays: number;
	readonly persistenceName: string;
	readonly playRate: WorldAuthorityPlayRate;
	readonly lastCommittedWallMs: number;
}

export interface WorldAuthorityMeta {
	readonly schemaVersion: "eonfolk-world-authority-meta-v1";
	readonly playRate: WorldAuthorityPlayRate;
	readonly lastCommittedWallMs: number;
	readonly previousStateHash: string;
	readonly previousHorizonDays: number;
}

export function defaultWorldDirectory(): string {
	return join(homedir(), ".eonfolk", "worlds", "dawnmere");
}

export function authorityDayIntervalMs(
	rate: WorldAuthorityPlayRate,
): number | null {
	if (rate === 0) return null;
	return rate === 1 ? PLAY_DAY_INTERVAL_MS : FASTER_DAY_INTERVAL_MS;
}

export function proposedProcessCatchUpDays(
	lastCommittedWallMs: number,
	nowMs: number,
): number {
	if (
		!Number.isSafeInteger(lastCommittedWallMs) ||
		!Number.isSafeInteger(nowMs) ||
		nowMs <= lastCommittedWallMs
	)
		return 0;
	const elapsed = nowMs - lastCommittedWallMs;
	return Math.min(
		MAX_PROCESS_CATCH_UP_DAYS,
		Math.floor(elapsed / PLAY_DAY_INTERVAL_MS),
	);
}

async function genesisWorld(): Promise<GeneratedWorldState> {
	const releaseGenesis = await createReleaseGenesis({
		releaseId: V1_GENESIS_RELEASE_ID,
		seedHex: V1_GENESIS_SEED,
	});
	return await generateWorld({
		releaseGenesis,
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
}

function scopeFor(world: GeneratedWorldState) {
	return {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: world.identity.worldId,
	};
}

function snapshotFromReplay(
	replayed: Awaited<ReturnType<typeof replayCivilizationHistory>>,
	meta: WorldAuthorityMeta,
	persistenceName: string,
): WorldAuthoritySnapshot {
	const state = replayed.state;
	if (state.civilization === null)
		throw new Error("local world authority has no civilization");
	return {
		world: state.world as unknown as GeneratedWorldState,
		civilization: state.civilization as unknown as CivilizationState,
		activities: state.scheduler
			.activities as unknown as readonly CivilizationScheduledActivity[],
		stateHash: replayed.stateHash,
		simulationTime: state.scheduler.simulationTime,
		horizonDays: state.scheduler.completedDay,
		previousStateHash: meta.previousStateHash,
		previousHorizonDays: meta.previousHorizonDays,
		persistenceName,
		playRate: meta.playRate,
		lastCommittedWallMs: meta.lastCommittedWallMs,
	};
}

export class LocalWorldAuthority {
	readonly directory: string;
	#port: FileVersionedPersistence | null = null;
	#world: GeneratedWorldState | null = null;
	#meta: WorldAuthorityMeta;
	#wake: Promise<void> = Promise.resolve();
	#signal: (() => void) | null = null;
	#stopping = false;
	#ready = false;
	readonly #nowMs: () => number;

	constructor(
		directory: string,
		nowMs: () => number = Date.now,
		initialMeta?: Partial<WorldAuthorityMeta>,
	) {
		this.directory = directory;
		this.#nowMs = nowMs;
		this.#meta = {
			schemaVersion: "eonfolk-world-authority-meta-v1",
			playRate: initialMeta?.playRate ?? 1,
			lastCommittedWallMs: initialMeta?.lastCommittedWallMs ?? nowMs(),
			previousStateHash: initialMeta?.previousStateHash ?? "0".repeat(64),
			previousHorizonDays: initialMeta?.previousHorizonDays ?? 0,
		};
	}

	get playRate(): WorldAuthorityPlayRate {
		return this.#meta.playRate;
	}

	get ready(): boolean {
		return this.#ready;
	}

	storesPath(): string {
		return join(this.directory, "authority-stores.json");
	}

	metaPath(): string {
		return join(this.directory, "authority-meta.json");
	}

	async start(): Promise<WorldAuthoritySnapshot> {
		await mkdir(this.directory, { recursive: true });
		this.#meta = await this.#loadMeta();
		this.#port = await FileVersionedPersistence.open(this.storesPath());
		this.#world = await genesisWorld();
		const opened = await this.#ensureGenesis();
		const catchUpDays = proposedProcessCatchUpDays(
			this.#meta.lastCommittedWallMs,
			this.#nowMs(),
		);
		if (catchUpDays > 0) {
			await catchUpLiveGeneratedCivilizationDays({
				port: this.#port,
				genesisWorld: this.#world,
				operationId: `process-catch-up-${String(this.#meta.lastCommittedWallMs)}`,
				additionalDays: catchUpDays,
			});
		}
		const snapshot = await this.#commitSnapshot(
			opened.horizonDays,
			opened.stateHash,
		);
		this.#ready = true;
		return snapshot;
	}

	async snapshot(): Promise<WorldAuthoritySnapshot> {
		return await this.#readSnapshot();
	}

	setPlayRate(rate: WorldAuthorityPlayRate): void {
		this.#meta = { ...this.#meta, playRate: rate };
		void this.#writeMeta();
		this.#wakeWaiter();
	}

	async advanceDay(): Promise<WorldAuthoritySnapshot> {
		if (this.#port === null || this.#world === null)
			throw new Error("local world authority is not started");
		const before = await this.#readSnapshot();
		const advanced = await appendLiveGeneratedCivilizationDay({
			port: this.#port,
			genesisWorld: this.#world,
		});
		if (!advanced.advanced) return before;
		return await this.#commitSnapshot(before.horizonDays, before.stateHash);
	}

	async runUntilStopped(): Promise<void> {
		while (!this.#stopping) {
			const interval = authorityDayIntervalMs(this.#meta.playRate);
			if (interval === null) {
				await this.#waitForSignal();
				continue;
			}
			const woke = await this.#sleep(interval);
			if (this.#stopping) return;
			if (!woke && this.#meta.playRate !== 0) await this.advanceDay();
		}
	}

	stop(): void {
		this.#stopping = true;
		this.#ready = false;
		this.#wakeWaiter();
	}

	async #ensureGenesis(): Promise<{
		readonly horizonDays: number;
		readonly stateHash: string;
	}> {
		if (this.#port === null || this.#world === null)
			throw new Error("local world authority is not started");
		const scope = scopeFor(this.#world);
		try {
			const head = await this.#port.loadHead(scope);
			const latest = await this.#port.loadLatestSnapshot(scope);
			const replayed = await replayCivilizationHistory(this.#port, {
				...scope,
				snapshotId: latest.snapshotId,
				toSequenceExclusive: head.lastSequence + 1,
			});
			return {
				horizonDays: replayed.state.scheduler.completedDay,
				stateHash: replayed.stateHash,
			};
		} catch (error) {
			if (error instanceof PersistenceError && error.code === "NOT_FOUND") {
				const prepared = await prepareGeneratedCivilization({
					genesisWorld: this.#world,
					targetHorizonDays: 1,
				});
				const persisted = await persistPreparedGeneratedCivilization({
					port: this.#port,
					prepared,
					confirmationId: "local-world-authority-genesis",
				});
				return {
					horizonDays: persisted.targetHorizonDays,
					stateHash: persisted.snapshot.stateHash,
				};
			}
			throw error;
		}
	}

	async #readSnapshot(): Promise<WorldAuthoritySnapshot> {
		if (this.#port === null || this.#world === null)
			throw new Error("local world authority is not started");
		const scope = scopeFor(this.#world);
		const head = await this.#port.loadHead(scope);
		const latest = await this.#port.loadLatestSnapshot(scope);
		const replayed = await replayCivilizationHistory(this.#port, {
			...scope,
			snapshotId: latest.snapshotId,
			toSequenceExclusive: head.lastSequence + 1,
		});
		return snapshotFromReplay(replayed, this.#meta, this.storesPath());
	}

	async #commitSnapshot(
		previousHorizonDays: number,
		previousStateHash: string,
	): Promise<WorldAuthoritySnapshot> {
		this.#meta = {
			...this.#meta,
			lastCommittedWallMs: this.#nowMs(),
			previousHorizonDays,
			previousStateHash,
		};
		await this.#writeMeta();
		return await this.#readSnapshot();
	}

	async #loadMeta(): Promise<WorldAuthorityMeta> {
		try {
			const raw = await readFile(this.metaPath(), "utf8");
			const parsed = JSON.parse(raw) as Partial<WorldAuthorityMeta>;
			if (
				parsed.schemaVersion !== "eonfolk-world-authority-meta-v1" ||
				(parsed.playRate !== 0 &&
					parsed.playRate !== 1 &&
					parsed.playRate !== 3) ||
				!Number.isSafeInteger(parsed.lastCommittedWallMs) ||
				typeof parsed.previousStateHash !== "string" ||
				!Number.isSafeInteger(parsed.previousHorizonDays)
			)
				return this.#meta;
			const lastCommittedWallMs = parsed.lastCommittedWallMs;
			const previousHorizonDays = parsed.previousHorizonDays;
			if (
				lastCommittedWallMs === undefined ||
				previousHorizonDays === undefined
			)
				return this.#meta;
			return {
				schemaVersion: "eonfolk-world-authority-meta-v1",
				playRate: parsed.playRate,
				lastCommittedWallMs,
				previousStateHash: parsed.previousStateHash,
				previousHorizonDays,
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return this.#meta;
			throw error;
		}
	}

	async #writeMeta(): Promise<void> {
		await mkdir(this.directory, { recursive: true });
		await writeFile(this.metaPath(), `${JSON.stringify(this.#meta)}\n`, "utf8");
	}

	#wakeWaiter(): void {
		this.#signal?.();
	}

	#waitForSignal(): Promise<void> {
		this.#wake = new Promise((resolve) => {
			this.#signal = () => {
				this.#signal = null;
				resolve();
			};
		});
		return this.#wake;
	}

	#sleep(ms: number): Promise<boolean> {
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.#signal = null;
				resolve(false);
			}, ms);
			this.#signal = () => {
				clearTimeout(timer);
				this.#signal = null;
				resolve(true);
			};
		});
	}
}
