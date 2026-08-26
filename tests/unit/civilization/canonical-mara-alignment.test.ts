import { describe, expect, it } from "vitest";
import {
	auditCivilizationState,
	RELEASE_GENESIS_MARA_CITIZEN_ID,
	RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
	runCivilizationExperiment,
} from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";
import {
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	V1_GENESIS_WORLD_ID,
} from "../../../apps/web/src/v1-genesis-runtime.js";

async function releaseGenesisWorld() {
	return generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: V1_GENESIS_RELEASE_ID,
			seedHex: V1_GENESIS_SEED,
		}),
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
}

describe("canonical Mara alignment", () => {
	it("keeps Mara counsel-capable in the primary settlement while another citizen founds the second", async () => {
		const world = await releaseGenesisWorld();
		const first = await runCivilizationExperiment({ world, horizonDays: 365 });
		const replay = await runCivilizationExperiment({ world, horizonDays: 365 });
		const originSettlementId = first.seedConditions.originSettlementId;
		const mara = first.state.citizens[RELEASE_GENESIS_MARA_CITIZEN_ID];
		const founding = first.state.foundings["founding-second-settlement"];
		const migration = first.state.migrations["migration-founding-party"];
		const second = first.world.settlements["settlement-second"]?.value;
		const maraMind = first.state.minds[RELEASE_GENESIS_MARA_CITIZEN_ID];
		const localRelationship = maraMind?.snapshot.relationships.find(
			(relationship) => {
				const target = first.state.citizens[relationship.toCitizenId];
				return (
					target?.residenceState === "resident" &&
					target.settlementId === mara?.settlementId &&
					target.siteId === mara.siteId
				);
			},
		);

		expect(jcs(replay)).toBe(jcs(first));
		expect(auditCivilizationState(first.state).ok).toBe(true);
		expect(mara).toMatchObject({
			name: "Mara Vale",
			residenceState: "resident",
			settlementId: originSettlementId,
		});
		expect(localRelationship).toBeDefined();
		expect(founding?.state).toBe("viable");
		expect(migration?.state).toBe("arrived");
		expect(founding?.founderCitizenIds).toHaveLength(1);
		expect(founding?.founderCitizenIds).toEqual([
			RELEASE_GENESIS_SECOND_FOUNDING_CITIZEN_ID,
		]);
		expect(second?.residentCitizenIds).toEqual(founding?.founderCitizenIds);
		expect(second?.residentCitizenIds).toHaveLength(1);
		for (const stockId of migration?.carriedStockIds ?? []) {
			const owner = first.state.stocks[stockId]?.owner;
			expect(owner?.kind).toBe("citizen");
			if (owner?.kind === "citizen")
				expect(founding?.founderCitizenIds).toContain(owner.citizenId);
		}
	});
});
