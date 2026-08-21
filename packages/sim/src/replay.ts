import {
	batchHash,
	bytesFromHex,
	eventHash,
	type ReplayManifest,
	stableId,
	stateHash,
	type WorldBatchHeader,
	type WorldEventEnvelope,
} from "../../protocol/src/index.js";
import { assertWorldInvariants } from "./invariants.js";
import { reduceEnvelope } from "./reducer.js";
import type { WorldState } from "./state.js";

export interface ReplayResult {
	readonly state: WorldState;
	readonly stateHash: string;
	readonly worldHeadHash: string;
	readonly appliedEvents: number;
}

function withoutEventHash(
	event: WorldEventEnvelope,
): Omit<WorldEventEnvelope, "eventHash"> {
	const { eventHash: _ignored, ...without } = event;
	return without;
}

export async function replayLedger(input: {
	readonly snapshotState: WorldState;
	readonly snapshotStateHash: string;
	readonly baseWorldHeadHash: string;
	readonly headers: readonly WorldBatchHeader[];
	readonly events: readonly WorldEventEnvelope[];
	readonly manifest?: ReplayManifest;
}): Promise<ReplayResult> {
	assertWorldInvariants(input.snapshotState);
	if ((await stateHash(input.snapshotState)) !== input.snapshotStateHash)
		throw new Error("snapshot state hash mismatch");
	if (input.manifest !== undefined) {
		const manifest = input.manifest;
		if (
			manifest.runId !== input.snapshotState.runId ||
			manifest.regionId !== input.snapshotState.regionId ||
			manifest.engineVersion !== "1" ||
			manifest.worldSchemaVersion !== "1" ||
			manifest.determinismVersion !== "eonfolk-determinism-v2" ||
			manifest.replayVersion !== "eonfolk-replay-v1" ||
			manifest.fromSequenceInclusive !== input.snapshotState.nextSequence ||
			manifest.toSequenceExclusive !==
				input.snapshotState.nextSequence + input.events.length
		)
			throw new Error("replay manifest mismatch");
	}
	let state = input.snapshotState;
	let currentStateHash = input.snapshotStateHash;
	let worldHeadHash = input.baseWorldHeadHash;
	let eventCursor = 0;
	const worldSeed = bytesFromHex(state.worldSeedHex, 32);
	for (const header of input.headers) {
		if (
			header.runId !== state.runId ||
			header.regionId !== state.regionId ||
			header.priorWorldHeadHash !== worldHeadHash ||
			header.firstSequence !== state.nextSequence ||
			header.eventCount < 1 ||
			header.eventCount > 32
		)
			throw new Error("batch header chain mismatch");
		const batchEvents = input.events.slice(
			eventCursor,
			eventCursor + header.eventCount,
		);
		if (batchEvents.length !== header.eventCount)
			throw new Error("event range ends inside a batch");
		for (let index = 0; index < batchEvents.length; index += 1) {
			const event = batchEvents[index]!;
			if (
				event.batchId !== header.batchId ||
				event.sequence !== state.nextSequence ||
				event.preStateHash !== currentStateHash ||
				event.eventHash !== header.eventHashes[index]
			)
				throw new Error("event chain mismatch");
			const expectedEventId = await stableId(
				"event",
				worldSeed,
				state.nextCreationSequence,
			);
			if (event.eventId !== expectedEventId)
				throw new Error("event ID is not the next stable ID");
			if ((await eventHash(withoutEventHash(event))) !== event.eventHash)
				throw new Error("event hash mismatch");
			const knownIds = new Set(
				input.events
					.slice(0, eventCursor + index)
					.map((candidate) => candidate.eventId),
			);
			for (const parent of event.causalParents) {
				if (!knownIds.has(parent.eventId))
					throw new Error("causal parent does not precede child");
				if (!parent.mechanismId) throw new Error("causal mechanism missing");
			}
			const isFinal = index === batchEvents.length - 1;
			state = reduceEnvelope(
				state,
				event,
				isFinal ? header.resultRevision : null,
			);
			currentStateHash = await stateHash(state);
			if (currentStateHash !== event.postStateHash)
				throw new Error("event post-state hash mismatch");
			if (!isFinal && state.revision !== header.resultRevision - 1)
				throw new Error("non-final event changed revision");
		}
		if (
			currentStateHash !== header.finalStateHash ||
			state.revision !== header.resultRevision
		)
			throw new Error("batch final state mismatch");
		const digest = await batchHash({
			runId: header.runId,
			regionId: header.regionId,
			batchId: header.batchId,
			priorWorldHeadHash: header.priorWorldHeadHash,
			firstSequence: header.firstSequence,
			eventHashes: header.eventHashes,
			payloadFingerprint: header.payloadFingerprint,
			resultRevision: header.resultRevision,
			finalStateHash: header.finalStateHash,
		});
		if (digest !== header.batchHash) throw new Error("batch hash mismatch");
		worldHeadHash = digest;
		eventCursor += header.eventCount;
	}
	if (eventCursor !== input.events.length)
		throw new Error("event range contains unheaded events");
	if (input.manifest !== undefined) {
		if (
			currentStateHash !== input.manifest.expectedFinalStateHash ||
			worldHeadHash !== input.manifest.expectedFinalWorldHeadHash
		) {
			throw new Error("replay result mismatch");
		}
	}
	return {
		state,
		stateHash: currentStateHash,
		worldHeadHash,
		appliedEvents: eventCursor,
	};
}
