import { jcs } from "../../../packages/protocol/src/index.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	assertCivilizationInvariants,
	runGeneralizedSchedulerHorizon,
} from "../../../packages/civilization/src/index.js";
import { schedulerFixture } from "../../unit/civilization/scheduler-fixture.js";

describe("generalized scheduler properties", () => {
	it("preserves deterministic, non-negative, model-free state over bounded horizons", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 90 }), (days) => {
				const fixture = schedulerFixture();
				const left = runGeneralizedSchedulerHorizon(
					fixture.state,
					fixture.policy,
					days,
				);
				const right = runGeneralizedSchedulerHorizon(
					fixture.state,
					fixture.policy,
					days,
				);
				expect(jcs(left.state)).toBe(jcs(right.state));
				expect(left.modelInvocations).toBe(0);
				expect(
					Object.values(left.state.stocks).every(
						({ quantity }) => quantity >= 0,
					),
				).toBe(true);
				assertCivilizationInvariants(left.state);
			}),
			{ numRuns: 20 },
		);
	});
});
