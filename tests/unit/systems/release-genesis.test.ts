import { describe, expect, it } from "vitest";
import {
	createExperimentWorldIdentity,
	createReleaseGenesis,
} from "../../../packages/protocol/src/index.js";

const seedHex =
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";

describe("Release Genesis identity", () => {
	it("is deterministic for the same versioned input", async () => {
		const first = await createReleaseGenesis({
			releaseId: "release-genesis",
			seedHex,
		});
		const second = await createReleaseGenesis({
			releaseId: "release-genesis",
			seedHex,
		});

		expect(second).toEqual(first);
		expect(first.genesisHash).toMatch(/^[0-9a-f]{64}$/u);
	});

	it("changes identity when the generator version changes", async () => {
		const first = await createReleaseGenesis({
			releaseId: "release-genesis",
			seedHex,
		});
		const second = await createReleaseGenesis({
			releaseId: "release-genesis",
			seedHex,
			versions: { generator: "eonfolk-generator-v2" },
		});

		expect(second.genesisHash).not.toBe(first.genesisHash);
	});

	it("creates a canonical root experiment world identity", async () => {
		const release = await createReleaseGenesis({
			releaseId: "release-genesis",
			seedHex,
		});
		const identity = await createExperimentWorldIdentity({
			worldId: "world-alpha",
			releaseGenesisHash: release.genesisHash,
			treatmentId: "standard-brain",
		});

		expect(identity.parentWorldId).toBeNull();
		expect(identity.identityHash).toMatch(/^[0-9a-f]{64}$/u);
	});

	it("rejects malformed seeds and identifiers", async () => {
		await expect(
			createReleaseGenesis({ releaseId: "Release Genesis", seedHex }),
		).rejects.toThrow(/canonical lowercase identifier/u);
		await expect(
			createReleaseGenesis({ releaseId: "release-genesis", seedHex: "00" }),
		).rejects.toThrow(/expected 32 bytes/u);
	});
});
