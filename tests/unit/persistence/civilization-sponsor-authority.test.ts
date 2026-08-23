import { describe, expect, it } from "vitest";
import {
	runCivilizationExperiment,
	type CivilizationState,
} from "../../../packages/civilization/src/index.js";
import {
	createCivilizationSponsorSnapshotBoundary,
	prepareCivilizationSponsorTransition,
} from "../../../packages/civilization/src/sponsor.js";
import {
	MemoryVersionedPersistence,
	persistCivilizationHistory,
	replayCivilizationHistory,
	type VersionedCrashPoint,
} from "../../../packages/persistence/src/index.js";
import {
	createCivilizationSponsorAuthorityAppend,
	createCivilizationSponsorRejectionAppend,
} from "../../../packages/persistence/src/civilization-sponsor.js";
import {
	createReleaseGenesis,
	payloadFingerprint,
	PROTOCOL_SCHEMA_VERSION,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const seed = "64".repeat(32);

class OneShotCrash {
	point: VersionedCrashPoint | null = null;
	hit(point: VersionedCrashPoint): void {
		if (point !== this.point) return;
		this.point = null;
		throw new Error(`crash:${point}`);
	}
}

async function fixture(crash?: OneShotCrash) {
	const release = await createReleaseGenesis({
		releaseId: "sponsor-authority",
		seedHex: seed,
	});
	const world = await generateWorld({ releaseGenesis: release });
	const checkpoint = await runCivilizationExperiment({ world, horizonDays: 1 });
	const runId = "sponsor-authority-run";
	const regionId = Object.keys(world.regions).sort()[0]!;
	const port = new MemoryVersionedPersistence(
		crash === undefined ? {} : { crashInjector: crash },
	);
	const persisted = await persistCivilizationHistory(port, {
		runId,
		regionId,
		genesisId: "sponsor-authority-genesis",
		genesisWorld: world,
		checkpoints: [checkpoint],
		snapshotId: "sponsor-authority",
	});
	const replay = await replayCivilizationHistory(port, {
		runId,
		regionId,
		snapshotId: persisted.snapshot.snapshotId,
		toSequenceExclusive: persisted.head.lastSequence + 1,
	});
	const civilization = replay.state
		.civilization as unknown as CivilizationState;
	const citizenId = Object.keys(civilization.citizens).sort()[0]!;
	const payload = {
		kind: "EstablishSponsorship" as const,
		covenantId: `covenant:${citizenId}`,
		citizenId,
	};
	const command = {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId: `sponsor:${citizenId}`,
		payloadFingerprint: await payloadFingerprint(payload),
		expectedRevision: civilization.revision,
		principal: {
			kind: "patron" as const,
			principalId: "patron:local",
			beneficiaryCitizenId: citizenId,
		},
		runId,
		regionId,
		payload,
	};
	const transition = await prepareCivilizationSponsorTransition({
		state: civilization,
		runId,
		regionId,
		priorWorldHeadHash: persisted.head.lastEventHash,
		nextSequence: persisted.head.lastSequence + 1,
		snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
			snapshotId: persisted.snapshot.snapshotId,
			runId,
			regionId,
			stateHash: await stateHash(civilization),
			revision: civilization.revision,
			simulationTime: civilization.simulationTime,
			nextSequence: persisted.head.lastSequence + 1,
			baseWorldHeadHash: persisted.head.lastEventHash,
		}),
		authoritativeHeaders: [],
		fencingToken: persisted.head.fencingToken,
		command,
		authoritativeHistory: [],
	});
	if (!transition.accepted || transition.events[0] === undefined)
		throw new Error("fixture sponsorship rejected");
	const append = await createCivilizationSponsorAuthorityAppend({
		state: replay.state,
		head: persisted.head,
		protocolEvent: transition.events[0],
		commandReceipt: transition.receipt,
		decisionRecord: transition.committedDecisionRecord,
		postCivilization: transition.postState,
	});
	return { port, persisted, append, citizenId, transition, runId, regionId };
}

describe("unified civilization sponsor authority", () => {
	it("atomically appends, reloads, replays, and exactly retries a sponsor command", async () => {
		const value = await fixture();
		const committed = await value.port.appendEventBatch(value.append.request);
		expect(committed.head.lastSequence).toBe(
			value.persisted.head.lastSequence + 1,
		);
		expect(committed.receipt.commandReceipt).toMatchObject({
			...value.transition.receipt,
			resultingWorldHeadHash: committed.head.lastEventHash,
		});
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		const state = replay.state.civilization as unknown as CivilizationState;
		expect(state.sponsorships[`covenant:${value.citizenId}`]).toBeDefined();
		expect(
			(await value.port.appendEventBatch(value.append.request)).idempotent,
		).toBe(true);
		await expect(
			value.port.appendEventBatch({
				...value.append.request,
				commandReceipt: {
					...(value.transition.receipt as unknown as Record<string, unknown>),
					payloadFingerprint: "f".repeat(64),
				} as never,
			}),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_COLLISION" });
	});

	it("atomically persists a rejected command without changing civilization", async () => {
		const value = await fixture();
		const rejectedReceipt = {
			...value.transition.receipt,
			commandId: "rejected:stale",
			outcome: "rejected" as const,
			eventInterval: null,
			rejectionCode: "STALE_REVISION" as const,
			resultingRevision: value.transition.priorState.revision,
			resultingWorldHeadHash: value.persisted.head.lastEventHash,
		};
		const append = await createCivilizationSponsorRejectionAppend({
			state: value.persisted.plan.finalState,
			head: value.persisted.head,
			commandReceipt: rejectedReceipt,
			decisionRecord: null,
		});
		const committed = await value.port.appendEventBatch(append.request);
		expect(committed.receipt.commandReceipt).toMatchObject({
			...rejectedReceipt,
			resultingWorldHeadHash: committed.head.lastEventHash,
		});
		const replay = await replayCivilizationHistory(value.port, {
			runId: value.runId,
			regionId: value.regionId,
			snapshotId: value.persisted.snapshot.snapshotId,
			toSequenceExclusive: committed.head.lastSequence + 1,
		});
		expect(replay.state.civilization).toEqual(
			value.persisted.plan.finalState.civilization,
		);
	});

	it("survives an after-commit crash without duplicating authority", async () => {
		const crash = new OneShotCrash();
		const value = await fixture(crash);
		crash.point = "authority-append:after-commit";
		await expect(
			value.port.appendEventBatch(value.append.request),
		).rejects.toThrow(/crash/u);
		const retried = await value.port.appendEventBatch(value.append.request);
		expect(retried.idempotent).toBe(true);
		expect(retried.head.lastSequence).toBe(
			value.persisted.head.lastSequence + 1,
		);
	});

	it("rejects an invalid civilization before it can enter the durable stream", async () => {
		const value = await fixture();
		await expect(
			createCivilizationSponsorAuthorityAppend({
				state: value.persisted.plan.finalState,
				head: value.persisted.head,
				protocolEvent: value.transition.events[0],
				commandReceipt: value.transition.receipt,
				decisionRecord: value.transition.committedDecisionRecord,
				postCivilization: { ...value.transition.postState, revision: -1 },
			}),
		).rejects.toThrow(/invariant/u);
	});

	it("rejects a sponsor envelope with an extra payload field before persistence", async () => {
		const value = await fixture();
		const event = value.transition.events[0]!;
		await expect(
			createCivilizationSponsorAuthorityAppend({
				state: value.persisted.plan.finalState,
				head: value.persisted.head,
				protocolEvent: {
					...event,
					eventPayload: { ...event.eventPayload, injected: true },
				},
				commandReceipt: value.transition.receipt,
				decisionRecord: value.transition.committedDecisionRecord,
				postCivilization: value.transition.postState,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});

	it("rejects a schema-inexact command receipt before persistence", async () => {
		const value = await fixture();
		await expect(
			createCivilizationSponsorAuthorityAppend({
				state: value.persisted.plan.finalState,
				head: value.persisted.head,
				protocolEvent: value.transition.events[0],
				commandReceipt: { ...value.transition.receipt, injected: true },
				decisionRecord: null,
				postCivilization: value.transition.postState,
			}),
		).rejects.toMatchObject({ code: "INVALID_INPUT" });
	});
});
