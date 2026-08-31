import { describe, expect, it } from "vitest";
import { tickLocalWorldAuthority } from "../../../packages/civilization/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

describe("local world authority prototype", () => {
	it("advances a file-free snapshot only when ticked, and does not claim Play attach", async () => {
		const genesisWorld = await generateWorld({
			releaseGenesis: await createReleaseGenesis({
				releaseId: "local-world-authority-prototype",
				seedHex:
					"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f",
			}),
		});
		const idle = null;
		expect(idle).toBeNull();
		const first = await tickLocalWorldAuthority({
			genesisWorld,
			current: idle,
		});
		expect(first.completedDay).toBe(1);
		expect(first.schemaVersion).toBe("eonfolk-local-world-authority-v1");
		const second = await tickLocalWorldAuthority({
			genesisWorld,
			current: first,
		});
		expect(second.completedDay).toBe(2);
		expect(first.completedDay).toBe(1);
	});
});
