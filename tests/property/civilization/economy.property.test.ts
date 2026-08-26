import { jcs } from "../../../packages/protocol/src/index.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
	auditCivilizationState,
	transferResources,
} from "../../../packages/civilization/src/index.js";
import { stateWithCitizenStocks } from "../../unit/civilization/fixtures.js";

const grainStocks = [
	"grain-citizen-a",
	"grain-citizen-b",
	"grain-citizen-c",
] as const;

describe("bounded civilization economy properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("conserves resources and is deterministic across bounded transfer sequences", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						from: fc.integer({ min: 0, max: 2 }),
						to: fc.integer({ min: 0, max: 2 }),
						requested: fc.integer({ min: 1, max: 12 }),
					}),
					{ maxLength: deep ? 160 : 40 },
				),
				(commands) => {
					const run = () => {
						let state = stateWithCitizenStocks();
						let time = 0;
						for (const command of commands) {
							const fromStockId = grainStocks[command.from];
							const toStockId = grainStocks[command.to];
							if (
								fromStockId === undefined ||
								toStockId === undefined ||
								fromStockId === toStockId
							)
								continue;
							const available = state.stocks[fromStockId]?.quantity ?? 0;
							if (available === 0) continue;
							time += 1;
							state = transferResources(
								state,
								[
									{
										fromStockId,
										toStockId,
										quantity: Math.min(available, command.requested),
									},
								],
								time,
							);
						}
						return state;
					};
					const first = run();
					const second = run();
					expect(jcs(first)).toBe(jcs(second));
					const audit = auditCivilizationState(first);
					expect(audit.ok).toBe(true);
					expect(audit.stockTotalsByResource.grain).toBe(70);
				},
			),
			{ numRuns: deep ? 500 : 100, seed: 0x0e0f_0201 },
		);
	});

	it("leaves state byte-identical after any overdrawn atomic batch", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10_000 }), (extra) => {
				const state = stateWithCitizenStocks();
				const before = jcs(state);
				expect(() =>
					transferResources(
						state,
						[
							{
								fromStockId: "grain-citizen-a",
								toStockId: "grain-citizen-b",
								quantity: 1,
							},
							{
								fromStockId: "grain-citizen-a",
								toStockId: "grain-citizen-c",
								quantity: 40 + extra,
							},
						],
						1,
					),
				).toThrow();
				expect(jcs(state)).toBe(before);
			}),
			{ numRuns: deep ? 500 : 100, seed: 0x0e0f_0202 },
		);
	});
});
