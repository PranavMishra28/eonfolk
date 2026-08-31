import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileVersionedPersistence } from "../../../apps/world-authority/src/file-persistence.js";
import {
	LocalWorldAuthority,
	PLAY_DAY_INTERVAL_MS,
	proposedProcessCatchUpDays,
} from "../../../apps/world-authority/src/kernel.js";
import {
	FILE_AUTHORITY_STORES_VERSION,
	MemoryVersionedPersistence,
} from "../../../packages/persistence/src/index.js";

const directories: string[] = [];

async function isolatedDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "eonfolk-world-authority-"));
	directories.push(directory);
	return directory;
}

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("local world authority continuity", () => {
	it("maps elapsed wall time to a capped honest catch-up request", () => {
		expect(proposedProcessCatchUpDays(1_000, 1_000)).toBe(0);
		expect(
			proposedProcessCatchUpDays(1_000, 1_000 + PLAY_DAY_INTERVAL_MS * 3),
		).toBe(3);
		expect(
			proposedProcessCatchUpDays(1_000, 1_000 + PLAY_DAY_INTERVAL_MS * 40),
		).toBe(7);
	});

	it("round-trips versioned authority stores through an atomic file", async () => {
		const directory = await isolatedDirectory();
		const path = join(directory, "authority-stores.json");
		const first = await FileVersionedPersistence.open(path);
		const memory = new MemoryVersionedPersistence();
		expect(first.portVersion).toBe(memory.portVersion);
		expect(FILE_AUTHORITY_STORES_VERSION).toBe(
			"eonfolk-file-authority-stores-v1",
		);
		const second = await FileVersionedPersistence.open(path);
		expect(second.portVersion).toBe(first.portVersion);
	});

	it("keeps simulating after the client is gone and restores from disk", async () => {
		const directory = await isolatedDirectory();
		let nowMs = 1_000;
		const first = new LocalWorldAuthority(directory, () => nowMs);
		const opened = await first.start();
		expect(opened.horizonDays).toBe(1);
		first.setPlayRate(0);
		const advanced = await first.advanceDay();
		expect(advanced.horizonDays).toBe(2);
		first.stop();

		const restored = new LocalWorldAuthority(directory, () => nowMs);
		const again = await restored.start();
		expect(again.horizonDays).toBe(2);
		expect(again.stateHash).toBe(advanced.stateHash);
		restored.stop();

		nowMs = 1_000 + PLAY_DAY_INTERVAL_MS * 2;
		const caughtUp = new LocalWorldAuthority(directory, () => nowMs);
		const later = await caughtUp.start();
		expect(later.horizonDays).toBe(4);
		expect(later.stateHash).not.toBe(advanced.stateHash);
		caughtUp.stop();
	}, 180_000);
});
