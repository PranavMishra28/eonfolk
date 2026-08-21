import {
	batchHash,
	bytesFromHex,
	DETERMINISM_VERSION,
	ENGINE_VERSION,
	eventHash,
	PROTOCOL_SCHEMA_VERSION,
	REPLAY_VERSION,
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
	readonly manifest: ReplayManifest;
}): Promise<ReplayResult> {
	if (input.snapshotState.schemaVersion !== "riverhold-world-state-v1")
		throw new Error("snapshot schema version is unsupported");
	assertWorldInvariants(input.snapshotState);
	if ((await stateHash(input.snapshotState)) !== input.snapshotStateHash)
		throw new Error("snapshot state hash mismatch");
	const manifest = input.manifest;
	if (
		manifest.schemaVersion !== "eonfolk-replay-manifest-v1" ||
		manifest.runId !== input.snapshotState.runId ||
		manifest.regionId !== input.snapshotState.regionId ||
		manifest.worldSeedHex !== input.snapshotState.worldSeedHex ||
		!/^[0-9a-f]{64}$/u.test(manifest.experimentManifestHash) ||
		manifest.snapshot.runId !== input.snapshotState.runId ||
		manifest.snapshot.regionId !== input.snapshotState.regionId ||
		manifest.snapshot.baseSequence + 1 !== input.snapshotState.nextSequence ||
		manifest.snapshot.stateHash !== input.snapshotStateHash ||
		manifest.snapshot.baseWorldHeadHash !== input.baseWorldHeadHash ||
		manifest.engineVersion !== ENGINE_VERSION ||
		manifest.worldSchemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		manifest.determinismVersion !== DETERMINISM_VERSION ||
		manifest.replayVersion !== REPLAY_VERSION ||
		manifest.fromSequenceInclusive !== input.snapshotState.nextSequence ||
		manifest.toSequenceExclusive !==
			input.snapshotState.nextSequence + input.events.length
	)
		throw new Error("replay manifest mismatch");
	let state = input.snapshotState;
	let currentStateHash = input.snapshotStateHash;
	let worldHeadHash = input.baseWorldHeadHash;
	let eventCursor = 0;
	const worldSeed = bytesFromHex(state.worldSeedHex, 32);
	const knownEvents = new Map<string, WorldEventEnvelope>();
	for (const header of input.headers) {
		if (
			header.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
			header.runId !== state.runId ||
			header.regionId !== state.regionId ||
			header.priorWorldHeadHash !== worldHeadHash ||
			header.firstSequence !== state.nextSequence ||
			header.eventCount < 1 ||
			header.eventCount > 32 ||
			header.eventHashes.length !== header.eventCount
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
				event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
				event.engineVersion !== ENGINE_VERSION ||
				event.runId !== state.runId ||
				event.regionId !== state.regionId ||
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
			for (const parent of event.causalParents) {
				if (!knownEvents.has(parent.eventId))
					throw new Error("causal parent does not precede child");
				if (
					!parent.mechanismId ||
					!(["direct", "trigger", "contributing"] as const).includes(
						parent.relation,
					)
				)
					throw new Error("causal relation is invalid");
			}
			if (
				new Set(event.relatedEvents.map((related) => related.eventId)).size !==
				event.relatedEvents.length
			)
				throw new Error("duplicate related event");
			for (const related of event.relatedEvents) {
				const target = knownEvents.get(related.eventId);
				if (target === undefined)
					throw new Error("related event does not precede child");
				if (
					related.relation !== "response-to" &&
					related.relation !== "temporal-predecessor"
				)
					throw new Error("related event relation is invalid");
				if (related.relation === "response-to") {
					const expectedKind =
						state.selectedCounselBranch === "verify-reserve"
							? "BeliefChanged"
							: state.selectedCounselBranch === "accuse-publicly"
								? "PetitionChanged"
								: state.selectedCounselBranch === "follow-plan"
									? "StandingPlanChanged"
									: null;
					if (
						event.eventPayload.kind !== "ReturnResponseRecorded" ||
						event.eventPayload.priorEventId !== related.eventId ||
						target.provenance.kind !== "cognition" ||
						target.eventPayload.kind !== expectedKind
					)
						throw new Error("response-to target is not a legal branch event");
				}
			}
			if (
				event.eventPayload.kind === "ReturnResponseRecorded" &&
				(event.relatedEvents.length !== 1 ||
					event.relatedEvents[0]?.relation !== "response-to")
			)
				throw new Error("return response requires one response-to relation");
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
			knownEvents.set(event.eventId, event);
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
	if (
		currentStateHash !== manifest.expectedFinalStateHash ||
		worldHeadHash !== manifest.expectedFinalWorldHeadHash
	) {
		throw new Error("replay result mismatch");
	}
	return {
		state,
		stateHash: currentStateHash,
		worldHeadHash,
		appliedEvents: eventCursor,
	};
}
