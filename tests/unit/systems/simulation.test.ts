import { describe, expect, it } from "vitest";
import { jcs } from "../../../packages/protocol/src/index.js";
import {
	citizenBySlug,
	createWorldCommand,
	prepareTransition,
	replayLedger,
	resourceTotals,
} from "../../../packages/sim/src/index.js";
import { riverholdFixture } from "../../fixtures/riverhold/index.js";

async function command(
	state: Awaited<ReturnType<typeof riverholdFixture>>["state"],
	commandId: string,
	payload: Parameters<typeof createWorldCommand>[0]["payload"],
	principal: Parameters<typeof createWorldCommand>[0]["principal"] = {
		kind: "system",
		principalId: "system_scheduler",
	},
) {
	return createWorldCommand({
		commandId,
		expectedRevision: state.revision,
		principal,
		runId: state.runId,
		regionId: state.regionId,
		payload,
	});
}

describe("Riverhold deterministic Reality", () => {
	it("creates exactly eight citizens and preserves explicit world invariants", async () => {
		const genesis = await riverholdFixture();
		expect(Object.values(genesis.state.citizens)).toHaveLength(8);
		expect(
			Object.values(genesis.state.citizens)
				.map((citizen) => citizen.slug)
				.sort(),
		).toEqual(["els", "iven", "mara", "neri", "odo", "rowan", "sela", "toma"]);
		expect(resourceTotals(genesis.state)).toEqual(
			genesis.state.conservation.baseline,
		);
		expect(
			citizenBySlug(genesis.state, "mara").standingPlan.steps[0]?.children,
		).toHaveLength(2);
		expect(genesis.experimentManifest.provider).toBeNull();
		expect(genesis.experimentManifest.runKind).toBe("canonical-local-proof");
	});

	it("advances eight citizens through four legible behavior families without creating resources", async () => {
		const genesis = await riverholdFixture();
		const first = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_advance_1", {
				kind: "Advance",
				seconds: 600,
			}),
		);
		expect(first.accepted).toBe(true);
		expect(first.events.length).toBeGreaterThanOrEqual(7);
		const second = await prepareTransition(
			first.postState,
			first.resultingWorldHeadHash,
			await command(first.postState, "cmd_advance_2", {
				kind: "Advance",
				seconds: 604_800,
			}),
		);
		const families = new Set(
			[...first.events, ...second.events].flatMap((event) =>
				"behavior" in event.eventPayload ? [event.eventPayload.behavior] : [],
			),
		);
		expect(families).toEqual(
			new Set([
				"maintain-self",
				"acquire-resource",
				"fulfill-plan",
				"respond-socially",
			]),
		);
		expect(resourceTotals(second.postState)).toEqual(
			genesis.state.conservation.baseline,
		);
		expect(
			first.events.some(
				(event) => event.eventPayload.kind === "ExchangeCompleted",
			),
		).toBe(true);
	});

	it("settles exchange atomically and rejects an impossible retry without mutation", async () => {
		const genesis = await riverholdFixture();
		const iven = citizenBySlug(genesis.state, "iven");
		const toma = citizenBySlug(genesis.state, "toma");
		const exchange = await command(genesis.state, "cmd_exchange", {
			kind: "Exchange",
			firstCitizenId: iven.citizenId,
			secondCitizenId: toma.citizenId,
			firstGives: { resource: "wood", quantity: 1 },
			secondGives: { resource: "food", quantity: 1 },
		});
		const accepted = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			exchange,
		);
		expect(
			accepted.postState.citizens[iven.citizenId]?.inventory,
		).toMatchObject({ food: 2, wood: 3 });
		expect(
			accepted.postState.citizens[toma.citizenId]?.inventory,
		).toMatchObject({ food: 7, wood: 1 });
		const impossible = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_bad_exchange", {
				kind: "Exchange",
				firstCitizenId: iven.citizenId,
				secondCitizenId: toma.citizenId,
				firstGives: { resource: "wood", quantity: 999 },
				secondGives: { resource: "food", quantity: 1 },
			}),
		);
		expect(impossible.accepted).toBe(false);
		expect(impossible.events).toEqual([]);
		expect(impossible.postState).toBe(genesis.state);
		expect(impossible.resultingWorldHeadHash).toBe(
			genesis.genesisWorldHeadHash,
		);
	});

	it("uses exactly two wood in the authored repair recipe", async () => {
		const genesis = await riverholdFixture();
		const iven = citizenBySlug(genesis.state, "iven");
		const moved = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_move_iven", {
				kind: "MoveCitizen",
				citizenId: iven.citizenId,
				toPlaceId: "mill",
			}),
		);
		const repaired = await prepareTransition(
			moved.postState,
			moved.resultingWorldHeadHash,
			await command(moved.postState, "cmd_repair", {
				kind: "RepairMill",
				citizenId: iven.citizenId,
			}),
		);
		expect(repaired.accepted).toBe(true);
		expect(repaired.postState.mill).toMatchObject({
			repaired: true,
			woodConsumed: 2,
		});
		expect(resourceTotals(repaired.postState)).toEqual(
			genesis.state.conservation.baseline,
		);
	});

	it("replays accepted batches with cognition absent to identical state and world head", async () => {
		const genesis = await riverholdFixture();
		const first = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_replay_a", {
				kind: "Advance",
				seconds: 600,
			}),
		);
		const mara = citizenBySlug(first.postState, "mara");
		const counsel = await prepareTransition(
			first.postState,
			first.resultingWorldHeadHash,
			await command(
				first.postState,
				"cmd_replay_b",
				{
					kind: "IssueCounsel",
					interventionId: "intervention_replay",
					citizenId: mara.citizenId,
					intent: "verify-reserve",
				},
				{
					kind: "patron",
					principalId: "principal_local_patron",
					beneficiaryCitizenId: mara.citizenId,
				},
			),
		);
		const replay = await replayLedger({
			snapshotState: genesis.state,
			snapshotStateHash: genesis.initialStateHash,
			baseWorldHeadHash: genesis.genesisWorldHeadHash,
			headers: [first.batchHeader!, counsel.batchHeader!],
			events: [...first.events, ...counsel.events],
		});
		expect(jcs(replay.state)).toBe(jcs(counsel.postState));
		expect(replay.stateHash).toBe(counsel.finalStateHash);
		expect(replay.worldHeadHash).toBe(counsel.resultingWorldHeadHash);
	});

	it("rejects stale revision and tampered payload fingerprints without state, event, or head change", async () => {
		const genesis = await riverholdFixture();
		const stale = {
			...(await command(genesis.state, "cmd_stale", {
				kind: "Advance",
				seconds: 60,
			})),
			expectedRevision: 1,
		};
		const staleResult = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			stale,
		);
		expect(staleResult.receipt.rejectionCode).toBe("STALE_REVISION");
		const bad = {
			...(await command(genesis.state, "cmd_bad_hash", {
				kind: "Advance",
				seconds: 60,
			})),
			payloadFingerprint: "0".repeat(64),
		};
		const badResult = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			bad,
		);
		expect(badResult.receipt.rejectionCode).toBe("BAD_FINGERPRINT");
		expect(badResult.finalStateHash).toBe(genesis.initialStateHash);
		expect(badResult.events).toHaveLength(0);
	});

	it("rejects consumption quantities whose derived relief would overflow", async () => {
		const genesis = await riverholdFixture();
		const mara = citizenBySlug(genesis.state, "mara");
		const result = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_overflow_consume", {
				kind: "ConsumeResource",
				citizenId: mara.citizenId,
				resource: "food",
				quantity: Math.floor(0x7fff_ffff / 3_000) + 1,
			}),
		);
		expect(result.accepted).toBe(false);
		expect(result.receipt.rejectionCode).toBe("INVALID_COMMAND");
		expect(result.postState).toBe(genesis.state);
		expect(result.events).toEqual([]);
		expect(result.resultingWorldHeadHash).toBe(genesis.genesisWorldHeadHash);
	});

	it("is byte-deterministic for repeated seeds and command histories", async () => {
		const left = await riverholdFixture();
		const right = await riverholdFixture();
		const leftResult = await prepareTransition(
			left.state,
			left.genesisWorldHeadHash,
			await command(left.state, "cmd_repeat", {
				kind: "Advance",
				seconds: 3_600,
			}),
		);
		const rightResult = await prepareTransition(
			right.state,
			right.genesisWorldHeadHash,
			await command(right.state, "cmd_repeat", {
				kind: "Advance",
				seconds: 3_600,
			}),
		);
		expect(jcs(leftResult)).toBe(jcs(rightResult));
	});
});
