import { describe, expect, it } from "vitest";
import {
	DETERMINISM_VERSION,
	ENGINE_VERSION,
	jcs,
	PROTOCOL_SCHEMA_VERSION,
	REPLAY_VERSION,
} from "../../../packages/protocol/src/index.js";
import {
	citizenBySlug,
	createWorldCommand,
	prepareTransition,
	reducePayload,
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
		expect(Object.keys(genesis.state.taskReservations)).toHaveLength(4);
		expect(
			Object.values(genesis.state.taskReservations).flatMap(
				(reservation) => reservation.citizenIds,
			),
		).toHaveLength(5);
		expect(
			["sela", "rowan", "neri"].map((slug) => {
				const citizen = citizenBySlug(genesis.state, slug);
				return {
					slug,
					activeTaskId: citizen.activeTaskId,
					origin: citizen.placeId,
					destination: citizen.travel?.destinationPlaceId,
				};
			}),
		).toEqual([
			{
				slug: "sela",
				activeTaskId: null,
				origin: "market",
				destination: "spring",
			},
			{
				slug: "rowan",
				activeTaskId: null,
				origin: "mill",
				destination: "woods",
			},
			{
				slug: "neri",
				activeTaskId: null,
				origin: "granary",
				destination: "fields",
			},
		]);
	});

	it("keeps origin authoritative until deterministic arrival and replays the travel boundary", async () => {
		const genesis = await riverholdFixture();
		const mara = citizenBySlug(genesis.state, "mara");
		const moveCommand = await command(genesis.state, "cmd_truthful_travel", {
			kind: "MoveCitizen",
			citizenId: mara.citizenId,
			toPlaceId: "granary",
		});
		const started = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			moveCommand,
		);
		const repeated = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			moveCommand,
		);
		expect(jcs(repeated)).toBe(jcs(started));
		expect(started.events.map((event) => event.eventPayload.kind)).toEqual([
			"TravelStarted",
		]);
		expect(started.postState.citizens[mara.citizenId]).toMatchObject({
			placeId: "market",
			activeTaskId: null,
			travel: {
				originPlaceId: "market",
				destinationPlaceId: "granary",
				routeId: "market>granary",
				departureSimulationTime: 0,
				expectedArrivalSimulationTime: 90,
			},
		});
		expect(
			Object.values(started.postState.taskReservations).some((reservation) =>
				reservation.citizenIds.includes(mara.citizenId),
			),
		).toBe(false);

		const inProgress = await prepareTransition(
			started.postState,
			started.resultingWorldHeadHash,
			await command(started.postState, "cmd_truthful_travel_89", {
				kind: "Advance",
				seconds: 89,
			}),
		);
		expect(inProgress.postState.citizens[mara.citizenId]).toMatchObject({
			placeId: "market",
			travel: { expectedArrivalSimulationTime: 90 },
		});
		expect(
			inProgress.events.some(
				(event) =>
					event.eventPayload.kind === "TravelArrived" &&
					event.eventPayload.citizenId === mara.citizenId,
			),
		).toBe(false);

		const arrived = await prepareTransition(
			inProgress.postState,
			inProgress.resultingWorldHeadHash,
			await command(inProgress.postState, "cmd_truthful_travel_90", {
				kind: "Advance",
				seconds: 1,
			}),
		);
		expect(arrived.postState.citizens[mara.citizenId]).toMatchObject({
			placeId: "granary",
			travel: null,
			activeTaskId: null,
		});
		expect(
			arrived.events.some(
				(event) =>
					event.eventPayload.kind === "TravelArrived" &&
					event.eventPayload.citizenId === mara.citizenId,
			),
		).toBe(true);

		const allEvents = [
			...started.events,
			...inProgress.events,
			...arrived.events,
		];
		const replay = await replayLedger({
			snapshotState: genesis.state,
			snapshotStateHash: genesis.initialStateHash,
			baseWorldHeadHash: genesis.genesisWorldHeadHash,
			headers: [
				started.batchHeader!,
				inProgress.batchHeader!,
				arrived.batchHeader!,
			],
			events: allEvents,
			manifest: {
				schemaVersion: "eonfolk-replay-manifest-v1",
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				worldSeedHex: genesis.state.worldSeedHex,
				experimentManifestHash: genesis.experimentManifest.manifestHash,
				snapshot: {
					runId: genesis.state.runId,
					regionId: genesis.state.regionId,
					snapshotId: "snapshot_travel_genesis",
					baseSequence: 0,
					stateHash: genesis.initialStateHash,
					baseWorldHeadHash: genesis.genesisWorldHeadHash,
				},
				fromSequenceInclusive: 1,
				toSequenceExclusive: 1 + allEvents.length,
				engineVersion: ENGINE_VERSION,
				worldSchemaVersion: PROTOCOL_SCHEMA_VERSION,
				determinismVersion: DETERMINISM_VERSION,
				replayVersion: REPLAY_VERSION,
				expectedFinalStateHash: arrived.finalStateHash,
				expectedFinalWorldHeadHash: arrived.resultingWorldHeadHash,
				presentation: { title: "travel boundary replay", branch: null },
			},
		});
		expect(jcs(replay.state)).toBe(jcs(arrived.postState));
		expect(replay.stateHash).toBe(arrived.finalStateHash);
	});

	it("owns work slots in Reality and rejects a conflicting reassignment", async () => {
		const genesis = await riverholdFixture();
		const toma = citizenBySlug(genesis.state, "toma");
		const iven = citizenBySlug(genesis.state, "iven");
		const mara = citizenBySlug(genesis.state, "mara");
		const exchangeReservation = Object.values(
			genesis.state.taskReservations,
		).find((reservation) => reservation.affordanceId === "market-exchange");
		expect(exchangeReservation?.citizenIds).toEqual([
			toma.citizenId,
			iven.citizenId,
		]);
		expect(toma.activeTaskId).toBe(exchangeReservation?.taskId);
		expect(iven.activeTaskId).toBe(exchangeReservation?.taskId);

		const conflict = await prepareTransition(
			genesis.state,
			genesis.genesisWorldHeadHash,
			await command(genesis.state, "cmd_conflicting_exchange", {
				kind: "Exchange",
				firstCitizenId: mara.citizenId,
				secondCitizenId: toma.citizenId,
				firstGives: { resource: "water", quantity: 1 },
				secondGives: { resource: "food", quantity: 1 },
			}),
		);
		expect(conflict.accepted).toBe(false);
		expect(conflict.receipt.rejectionCode).toBe("ACTION_UNAVAILABLE");
		expect(conflict.postState).toBe(genesis.state);
		expect(conflict.events).toEqual([]);
	});

	it("accepts the legacy atomic movement event while clearing obsolete occupancy", async () => {
		const genesis = await riverholdFixture();
		const mara = citizenBySlug(genesis.state, "mara");
		const migrated = reducePayload(
			genesis.state,
			{
				kind: "CitizenMoved",
				citizenId: mara.citizenId,
				fromPlaceId: "market",
				toPlaceId: "granary",
				behavior: "fulfill-plan",
			},
			{ eventId: "legacy-move-event", sequence: 1, finalRevision: 1 },
		);
		expect(migrated.citizens[mara.citizenId]).toMatchObject({
			placeId: "granary",
			travel: null,
			activeTaskId: null,
		});
		expect(
			Object.values(migrated.taskReservations).some((reservation) =>
				reservation.citizenIds.includes(mara.citizenId),
			),
		).toBe(false);
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
		const arrived = await prepareTransition(
			moved.postState,
			moved.resultingWorldHeadHash,
			await command(moved.postState, "cmd_arrive_iven", {
				kind: "Advance",
				seconds: 120,
			}),
		);
		const repaired = await prepareTransition(
			arrived.postState,
			arrived.resultingWorldHeadHash,
			await command(arrived.postState, "cmd_repair", {
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
			manifest: {
				schemaVersion: "eonfolk-replay-manifest-v1",
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				worldSeedHex: genesis.state.worldSeedHex,
				experimentManifestHash: genesis.experimentManifest.manifestHash,
				snapshot: {
					runId: genesis.state.runId,
					regionId: genesis.state.regionId,
					snapshotId: "snapshot_genesis",
					baseSequence: 0,
					stateHash: genesis.initialStateHash,
					baseWorldHeadHash: genesis.genesisWorldHeadHash,
				},
				fromSequenceInclusive: 1,
				toSequenceExclusive: 1 + first.events.length + counsel.events.length,
				engineVersion: ENGINE_VERSION,
				worldSchemaVersion: PROTOCOL_SCHEMA_VERSION,
				determinismVersion: DETERMINISM_VERSION,
				replayVersion: REPLAY_VERSION,
				expectedFinalStateHash: counsel.finalStateHash,
				expectedFinalWorldHeadHash: counsel.resultingWorldHeadHash,
				presentation: { title: "test replay", branch: null },
			},
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
