import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	hexFromBytes,
	jcs,
	tuple,
	utf8,
} from "../../../packages/protocol/src/index.js";
import {
	assertWorldInvariants,
	createWorldCommand,
	prepareTransition,
	replayLedger,
	resourceTotals,
	type WorldState,
} from "../../../packages/sim/src/index.js";
import { riverholdFixture } from "../../fixtures/riverhold/index.js";

async function advance(
	state: WorldState,
	head: string,
	commandId: string,
	seconds: number,
) {
	const command = await createWorldCommand({
		commandId,
		expectedRevision: state.revision,
		principal: { kind: "system", principalId: "system_scheduler" },
		runId: state.runId,
		regionId: state.regionId,
		payload: { kind: "Advance", seconds },
	});
	return prepareTransition(state, head, command);
}

describe("bounded deterministic properties", () => {
	it("rejects a state whose resource baseline no longer conserves", async () => {
		const genesis = await riverholdFixture();
		const corrupted: WorldState = {
			...genesis.state,
			conservation: {
				...genesis.state.conservation,
				baseline: {
					...genesis.state.conservation.baseline,
					food: genesis.state.conservation.baseline.food + 1,
				},
			},
		};
		expect(() => assertWorldInvariants(corrupted)).toThrow(
			/food conservation failed/u,
		);
	});

	it("tuple framing remains injective over former delimiter-ambiguous string pairs", () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 16 }),
				fc.string({ maxLength: 16 }),
				fc.string({ maxLength: 16 }),
				(a, b, c) => {
					fc.pre(a !== `${a}${b}` || c !== "");
					const left = hexFromBytes(
						tuple("property", [utf8(a), utf8(`${b}${c}`)]),
					);
					const right = hexFromBytes(
						tuple("property", [utf8(`${a}${b}`), utf8(c)]),
					);
					return a === `${a}${b}` && `${b}${c}` === c
						? left === right
						: left !== right;
				},
			),
			{ numRuns: 200 },
		);
	});

	it("random legal advances repeat byte-for-byte and preserve conservation", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(fc.integer({ min: 1, max: 604_800 }), {
					minLength: 1,
					maxLength: 8,
				}),
				async (secondsList) => {
					const leftGenesis = await riverholdFixture();
					const rightGenesis = await riverholdFixture();
					let left = {
						state: leftGenesis.state,
						head: leftGenesis.genesisWorldHeadHash,
					};
					let right = {
						state: rightGenesis.state,
						head: rightGenesis.genesisWorldHeadHash,
					};
					for (const [index, seconds] of secondsList.entries()) {
						const leftTransition = await advance(
							left.state,
							left.head,
							`cmd-property-${index}`,
							seconds,
						);
						const rightTransition = await advance(
							right.state,
							right.head,
							`cmd-property-${index}`,
							seconds,
						);
						if (
							!leftTransition.accepted ||
							!rightTransition.accepted ||
							jcs(leftTransition) !== jcs(rightTransition)
						)
							return false;
						left = {
							state: leftTransition.postState,
							head: leftTransition.resultingWorldHeadHash,
						};
						right = {
							state: rightTransition.postState,
							head: rightTransition.resultingWorldHeadHash,
						};
					}
					return (
						jcs(resourceTotals(left.state)) ===
						jcs(leftGenesis.state.conservation.baseline)
					);
				},
			),
			{ numRuns: 25 },
		);
	});

	it.each([30, 90, 365])(
		"advances and replays exactly %i days without an early pause",
		async (days) => {
			const genesis = await riverholdFixture();
			let state = genesis.state;
			let head = genesis.genesisWorldHeadHash;
			const headers = [];
			const events = [];
			let remaining = days * 86_400;
			let ordinal = 0;
			while (remaining > 0) {
				const seconds = Math.min(604_800, remaining);
				const transition = await advance(
					state,
					head,
					`cmd-horizon-${days}-${ordinal}`,
					seconds,
				);
				expect(transition.accepted).toBe(true);
				headers.push(transition.batchHeader!);
				events.push(...transition.events);
				state = transition.postState;
				head = transition.resultingWorldHeadHash;
				remaining -= seconds;
				ordinal += 1;
			}
			expect(state.simulationTime).toBe(days * 86_400);
			expect(resourceTotals(state)).toEqual(
				genesis.state.conservation.baseline,
			);
			const replay = await replayLedger({
				snapshotState: genesis.state,
				snapshotStateHash: genesis.initialStateHash,
				baseWorldHeadHash: genesis.genesisWorldHeadHash,
				headers,
				events,
			});
			expect(replay.stateHash).toBe(
				await import("../../../packages/protocol/src/index.js").then(
					({ stateHash }) => stateHash(state),
				),
			);
			expect(replay.worldHeadHash).toBe(head);
		},
	);
});
