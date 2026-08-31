import { describe, expect, it } from "vitest";
import {
	decodeLocalWorldAuthoritySnapshot,
	encodeLocalWorldAuthoritySnapshot,
	localWorldAuthorityStatus,
	tickLocalWorldAuthority,
} from "../../../packages/civilization/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

describe("local world authority", () => {
	it("advances a snapshot only when ticked, and catch-up is required when the process is down", async () => {
		const genesisWorld = await generateWorld({
			releaseGenesis: await createReleaseGenesis({
				releaseId: "local-world-authority-prototype",
				seedHex:
					"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f",
			}),
		});
		const first = await tickLocalWorldAuthority({
			genesisWorld,
			current: null,
		});
		expect(first.completedDay).toBe(1);
		expect(first.schemaVersion).toBe("eonfolk-local-world-authority-v1");
		expect(first.stateHash).toMatch(/^[0-9a-f]{64}$/u);
		const second = await tickLocalWorldAuthority({
			genesisWorld,
			current: first,
		});
		expect(second.completedDay).toBe(2);
		expect(first.completedDay).toBe(1);
		const roundTrip = decodeLocalWorldAuthoritySnapshot(
			encodeLocalWorldAuthoritySnapshot(second),
		);
		expect(roundTrip.completedDay).toBe(2);
		expect(roundTrip.stateHash).toBe(second.stateHash);
		expect(
			localWorldAuthorityStatus({
				snapshot: second,
				processReachable: true,
			}).catchUpRequired,
		).toBe(false);
		expect(
			localWorldAuthorityStatus({
				snapshot: second,
				processReachable: false,
			}).catchUpRequired,
		).toBe(true);
	});
});
