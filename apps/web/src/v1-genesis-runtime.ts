import { createReleaseGenesis } from "@eonfolk/protocol";
import {
	projectGeneratedSettlementLocal,
	projectGeneratedWorldOverview,
	type GeneratedSettlementLocalProjection,
	type GeneratedWorldOverviewProjection,
} from "@eonfolk/world-presentation";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

export const V1_GENESIS_RELEASE_ID = "release-genesis-browser-v1";
export const V1_GENESIS_WORLD_ID = "eonfolk-genesis-world-v1";
export const V1_GENESIS_SEED =
	"e0f0c1a55eed2026a11d8e4b709ca37f4d2b68f019a7c35e84b16d0f2c9e674a";

export interface V1GenesisExperience {
	readonly overview: GeneratedWorldOverviewProjection;
	readonly settlement: GeneratedSettlementLocalProjection;
}

let pendingExperience: Promise<V1GenesisExperience> | undefined;

async function buildExperience(): Promise<V1GenesisExperience> {
	const releaseGenesis = await createReleaseGenesis({
		releaseId: V1_GENESIS_RELEASE_ID,
		seedHex: V1_GENESIS_SEED,
	});
	const generatedWorld = await generateWorld({
		releaseGenesis,
		worldId: V1_GENESIS_WORLD_ID,
		treatmentId: "standard-brain",
	});
	const overview = projectGeneratedWorldOverview(generatedWorld);
	const settlementAnchor = overview.settlementAnchors[0];
	if (settlementAnchor === undefined)
		throw new Error("Release Genesis generated no settlement anchor");
	return Object.freeze({
		overview,
		settlement: projectGeneratedSettlementLocal(
			generatedWorld,
			settlementAnchor.settlementId,
		),
	});
}

/** One immutable, memoized projection for every browser view of this release. */
export function loadV1GenesisExperience(): Promise<V1GenesisExperience> {
	pendingExperience ??= buildExperience();
	return pendingExperience;
}
