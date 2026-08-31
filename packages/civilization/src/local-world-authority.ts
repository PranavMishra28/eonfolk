import type { GeneratedWorldState } from "@eonfolk/protocol";

import {
	continueCivilizationExperimentDay,
	runCivilizationExperiment,
} from "./experiment.js";
import type { CivilizationState } from "./types.js";

export const LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION =
	"eonfolk-local-world-authority-v1" as const;

export interface LocalWorldAuthoritySnapshot {
	readonly schemaVersion: typeof LOCAL_WORLD_AUTHORITY_SCHEMA_VERSION;
	readonly completedDay: number;
	readonly worldIdentityHash: string;
	readonly world: GeneratedWorldState;
	readonly state: CivilizationState;
}

/**
 * One file-backed live day. Play does not attach; if this is not called, the
 * snapshot does not advance and catch-up remains the honest path.
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
			world: run.world,
			state: run.state,
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
		world: continued.world,
		state: continued.state,
	});
}
