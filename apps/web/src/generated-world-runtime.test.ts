import { readFile } from "node:fs/promises";
import { tickLocalWorldAuthority } from "@eonfolk/civilization";
import { createReleaseGenesis } from "@eonfolk/protocol";
import { generateWorld } from "@eonfolk/worldgen";
import { describe, expect, it } from "vitest";
import {
	buildGeneratedWorldExperience,
	GENERATED_WORLD_STORAGE_KEY,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";
import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "./v1-genesis-runtime";

describe("canonical generated-world browser experience", () => {
	it("memoizes one identity-bound first-day civilization", async () => {
		const first = await loadGeneratedWorldExperience();
		const second = await loadGeneratedWorldExperience();

		expect(second).toBe(first);
		expect(first.worldId).toBe(V1_GENESIS_WORLD_ID);
		expect(first.horizonDays).toBe(1);
		expect(first.simulationTime).toBe(86_400);
		expect(first.worldIdentityHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.stateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousStateHash).toMatch(/^[0-9a-f]{64}$/u);
		expect(first.previousHorizonDays).toBe(1);
		expect(first.persistence).toEqual({
			kind: "unavailable",
			claim: "admitted-deterministic-view",
			failureCode: "INDEXEDDB_UNAVAILABLE",
			restored: false,
			catchUpReceipts: 0,
		});
		expect(GENERATED_WORLD_STORAGE_KEY).toBe("eonfolk-generated-authority-v8");
	});

	it("refreshes from the immutable default base without changing admitted authority", async () => {
		const first = await loadGeneratedWorldExperience();
		const refreshed = await refreshGeneratedWorldExperience();

		expect(refreshed).not.toBe(first);
		expect(refreshed).toEqual(first);
	});

	it("projects every actual resident exactly once across founded settlements", async () => {
		const experience = await buildGeneratedWorldExperience();
		const actors = experience.projections.flatMap(
			(projection) => projection.spatial.actors,
		);

		expect(experience.population).toBe(8);
		expect(experience.settlementCount).toBe(1);
		expect(actors).toHaveLength(8);
		expect(new Set(actors.map(({ citizenId }) => citizenId)).size).toBe(8);
		expect(
			experience.projections.map(({ spatial }) => spatial.actors.length).sort(),
		).toEqual([8]);
		const foundingTimes = experience.projections.map(
			({ local }) => local.settlement.foundedAtSimulationTime,
		);
		expect(foundingTimes[0]).toBe(0);
		expect(
			experience.projections.every(
				({ availability }) => availability.status === "available",
			),
		).toBe(true);
		expect(experience.embodiments).toHaveLength(1);
		expect(experience.embodiments.flatMap(({ actors }) => actors)).toHaveLength(
			8,
		);
		expect(
			experience.embodiments.every(
				(embodiment, index) =>
					embodiment.settlementId ===
						experience.projections[index]?.local.settlement.settlementId &&
					embodiment.source.stateHash === experience.stateHash,
			),
		).toBe(true);
	});

	it("degrades a production IndexedDB SecurityError without exposing its detail", async () => {
		const factory = {
			open: () => {
				throw new DOMException("secret browser denial", "SecurityError");
			},
		} as unknown as IDBFactory;
		const experience = await buildGeneratedWorldExperience({
			indexedDbFactory: factory,
		});
		expect(experience.persistence).toEqual({
			kind: "unavailable",
			claim: "admitted-deterministic-view",
			failureCode: "SecurityError",
			restored: false,
			catchUpReceipts: 0,
		});
		expect(JSON.stringify(experience)).not.toContain("secret browser denial");
	});

	it("exposes only scheduler-owned actions and grounded settlement sources", async () => {
		const experience = await buildGeneratedWorldExperience();

		for (const projection of experience.projections) {
			expect(projection.spatial.source.runId).toBe(experience.worldId);
			expect(projection.spatial.source.stateHash).toBe(experience.stateHash);
			expect(projection.spatial.contradictionCount).toBe(0);
			expect(projection.spatial.teleportCount).toBe(0);
			for (const actor of projection.spatial.actors) {
				expect(actor.action.sourceKind).toBe("current-behavior");
				expect(actor.action.status).toBe("in-progress");
				expect(actor.action.eventId).toBeNull();
				expect(
					projection.local.sites.some(
						({ siteId }) => siteId === actor.action.destinationPlaceId,
					),
				).toBe(true);
			}
		}
		for (const embodiment of experience.embodiments)
			for (const actor of embodiment.actors) {
				const projected = experience.projections
					.flatMap(({ spatial }) => spatial.actors)
					.find(({ citizenId }) => citizenId === actor.citizenId);
				expect(projected?.action.actionId).toBe(actor.actionId);
				expect(projected?.positionMm).toEqual(actor.positionMm);
			}
	});

	it("projects a local-process snapshot as a client, not a Worker writer", async () => {
		const genesisWorld = await generateWorld({
			releaseGenesis: await createReleaseGenesis({
				releaseId: V1_GENESIS_RELEASE_ID,
				seedHex: V1_GENESIS_SEED,
			}),
			worldId: V1_GENESIS_WORLD_ID,
			treatmentId: "standard-brain",
		});
		const first = await tickLocalWorldAuthority({
			genesisWorld,
			current: null,
		});
		const second = await tickLocalWorldAuthority({
			genesisWorld,
			current: first,
		});
		const experience = await buildGeneratedWorldExperience({
			localAuthority: second,
			indexedDbFactory: null,
		});
		expect(experience.persistence).toEqual({
			kind: "local-process",
			claim: "local-process-client",
			failureCode: null,
			restored: true,
			catchUpReceipts: 0,
		});
		expect(experience.horizonDays).toBe(2);
		expect(experience.stateHash).toBe(second.stateHash);
		expect(experience.worldId).toBe(V1_GENESIS_WORLD_ID);
	});

	it("lets a Worker probe the local process without a window handle", async () => {
		const runtime = await readFile(
			new URL("./generated-world-runtime.ts", import.meta.url),
			"utf8",
		);
		expect(runtime).toContain("shouldProbeLocalAuthority");
		expect(runtime).toContain("rememberSkipLocalAuthorityProbe");
		expect(runtime).not.toContain("typeof window ===");
		expect(runtime).toContain("process.env.VITEST");
		expect(runtime).toContain("navigator.webdriver");
		const worker = await readFile(
			new URL("./generated-world-runtime.worker.ts", import.meta.url),
			"utf8",
		);
		expect(worker).toContain("rememberSkipLocalAuthorityProbe");
		expect(worker).toContain("skipAuthorityProbe");
		const client = await readFile(
			new URL("./generated-world-client.ts", import.meta.url),
			"utf8",
		);
		expect(client).toContain("withWebdriverProbeSkip");
		expect(client).toContain("navigator.webdriver");
	});

	it("attaches as a client when the process is up and does not write IndexedDB", async () => {
		const genesisWorld = await generateWorld({
			releaseGenesis: await createReleaseGenesis({
				releaseId: V1_GENESIS_RELEASE_ID,
				seedHex: V1_GENESIS_SEED,
			}),
			worldId: V1_GENESIS_WORLD_ID,
			treatmentId: "standard-brain",
		});
		const processWorld = await tickLocalWorldAuthority({
			genesisWorld,
			current: null,
		});
		let opened = 0;
		const factory = {
			open: () => {
				opened += 1;
				throw new Error(
					"IndexedDB must not be opened while the process writes",
				);
			},
		} as unknown as IDBFactory;
		const experience = await buildGeneratedWorldExperience({
			localAuthority: processWorld,
			localDurableSnapshot: null,
			indexedDbFactory: factory,
		});
		expect(opened).toBe(0);
		expect(experience.persistence).toEqual({
			kind: "local-process",
			claim: "local-process-client",
			failureCode: null,
			restored: true,
			catchUpReceipts: 0,
		});
		expect(experience.stateHash).toBe(processWorld.stateHash);
	});

	it("keeps the IndexedDB catch-up path when the process is down", async () => {
		const experience = await buildGeneratedWorldExperience({
			localAuthority: false,
			indexedDbFactory: null,
		});
		expect(experience.persistence).toEqual({
			kind: "unavailable",
			claim: "admitted-deterministic-view",
			failureCode: "INDEXEDDB_UNAVAILABLE",
			restored: false,
			catchUpReceipts: 0,
		});
		expect(experience.horizonDays).toBe(1);
	});

	it("does not silently merge a conflicting process snapshot with IndexedDB", async () => {
		const genesisWorld = await generateWorld({
			releaseGenesis: await createReleaseGenesis({
				releaseId: V1_GENESIS_RELEASE_ID,
				seedHex: V1_GENESIS_SEED,
			}),
			worldId: V1_GENESIS_WORLD_ID,
			treatmentId: "standard-brain",
		});
		const first = await tickLocalWorldAuthority({
			genesisWorld,
			current: null,
		});
		const processWorld = await tickLocalWorldAuthority({
			genesisWorld,
			current: first,
		});
		const conflict = await buildGeneratedWorldExperience({
			localAuthority: processWorld,
			localDurableSnapshot: {
				worldIdentityHash: first.worldIdentityHash,
				stateHash: first.stateHash,
			},
			indexedDbFactory: null,
		});
		expect(conflict.persistence.kind).toBe("authority-conflict");
		expect(conflict.persistence.claim).toBe("unmerged-authorities");
		expect(conflict.stateHash).not.toBe(processWorld.stateHash);
		const adopted = await buildGeneratedWorldExperience({
			localAuthority: processWorld,
			localDurableSnapshot: {
				worldIdentityHash: first.worldIdentityHash,
				stateHash: first.stateHash,
			},
			authorityFenceChoice: "adopt-process",
			indexedDbFactory: null,
		});
		expect(adopted.persistence.kind).toBe("local-process");
		expect(adopted.stateHash).toBe(processWorld.stateHash);
		const stayed = await buildGeneratedWorldExperience({
			localAuthority: processWorld,
			localDurableSnapshot: {
				worldIdentityHash: first.worldIdentityHash,
				stateHash: first.stateHash,
			},
			authorityFenceChoice: "stay-local",
			indexedDbFactory: null,
		});
		expect(stayed.persistence.kind).not.toBe("local-process");
		expect(stayed.stateHash).not.toBe(processWorld.stateHash);
	});

	it("surfaces counsel as a happening without reviewer-facing roster copy", async () => {
		const runtime = await readFile(
			new URL("./generated-world-runtime.ts", import.meta.url),
			"utf8",
		);
		expect(runtime).not.toContain(
			"This is a named beat, not a silent roster change",
		);
		expect(runtime).toContain("checked the stores");
		expect(runtime).toContain("recorded observation, not a rumor");
		expect(runtime).toContain("recorded speech, not a proven fact");
		expect(runtime).toContain("recorded choice");
	});
});
