import { assertCivilizationInvariants } from "@eonfolk/civilization";
import type { CivilizationState } from "@eonfolk/civilization";
import { parseCivilizationSponsorEvent } from "@eonfolk/civilization/sponsor";
import { canonicalJson, cloneValue } from "./codec.js";
import {
	RELEASE_GENESIS_CIVILIZATION_STATE_VERSION,
	RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
	type CivilizationJsonPatchOperation,
	type ReleaseGenesisCivilizationState,
} from "./civilization.js";
import { PersistenceError } from "./errors.js";
import type { JsonValue } from "./types.js";
import { createAuthorityEvent, hashAuthoritativeState } from "./versioned.js";
import {
	type AppendAuthorityBatchRequest,
	AUTHORITY_APPEND_SCHEMA_VERSION,
	type AuthorityHead,
} from "./versioned-types.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;

export interface CivilizationSponsorAuthorityAppend {
	readonly state: ReleaseGenesisCivilizationState;
	readonly request: AppendAuthorityBatchRequest;
}

function fail(
	code: "INVALID_INPUT" | "STALE_STATE" | "UNSUPPORTED_VERSION",
	message: string,
): never {
	throw new PersistenceError(code, message);
}

function record(
	value: unknown,
	label: string,
): Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail("INVALID_INPUT", `${label} must be a record`);
	return value as Readonly<Record<string, unknown>>;
}

function string(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length < 1)
		fail("INVALID_INPUT", `${label} must be a non-empty string`);
	return value;
}

function integer(value: unknown, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0)
		fail("INVALID_INPUT", `${label} must be a non-negative safe integer`);
	return value as number;
}

function array(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) fail("INVALID_INPUT", `${label} must be an array`);
	return value;
}

function exactKeys(
	value: Readonly<Record<string, unknown>>,
	expected: readonly string[],
): boolean {
	const keys = Object.keys(value).sort();
	return (
		keys.length === expected.length &&
		keys.every((key, index) => key === [...expected].sort()[index])
	);
}

function validPrincipal(value: unknown): boolean {
	const principal = record(value, "sponsor receipt principal");
	return principal.kind === "citizen"
		? exactKeys(principal, ["kind", "principalId"]) &&
				typeof principal.principalId === "string"
		: principal.kind === "patron" &&
				exactKeys(principal, ["kind", "principalId", "beneficiaryCitizenId"]) &&
				typeof principal.principalId === "string" &&
				typeof principal.beneficiaryCitizenId === "string";
}

function validateReceipt(
	value: unknown,
	current: ReleaseGenesisCivilizationState,
	head: AuthorityHead,
): Readonly<Record<string, unknown>> {
	const receipt = record(value, "sponsor command receipt");
	const civilization = current.civilization as unknown as CivilizationState;
	integer(receipt.expectedRevision, "sponsor expectedRevision");
	if (
		!exactKeys(receipt, [
			"schemaVersion",
			"runId",
			"regionId",
			"commandId",
			"payloadFingerprint",
			"principal",
			"expectedRevision",
			"actualRevision",
			"outcome",
			"eventInterval",
			"rejectionCode",
			"resultingRevision",
			"resultingWorldHeadHash",
			"createdSimulationTime",
			"fencingToken",
		]) ||
		receipt.schemaVersion !== "eonfolk-command-receipt-v1" ||
		receipt.runId !== head.runId ||
		receipt.regionId !== head.regionId ||
		typeof receipt.commandId !== "string" ||
		(receipt.commandId as string).length === 0 ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint) ||
		!validPrincipal(receipt.principal) ||
		integer(receipt.actualRevision, "sponsor actualRevision") !==
			civilization.revision ||
		integer(receipt.createdSimulationTime, "sponsor receipt time") !==
			civilization.simulationTime ||
		integer(receipt.fencingToken, "sponsor receipt fence") !==
			head.fencingToken ||
		typeof receipt.resultingWorldHeadHash !== "string" ||
		!HASH_PATTERN.test(receipt.resultingWorldHeadHash)
	)
		fail("INVALID_INPUT", "sponsor command receipt schema is invalid");
	return receipt;
}

function json(value: unknown, label: string): JsonValue {
	try {
		canonicalJson(value as JsonValue);
	} catch {
		fail("INVALID_INPUT", `${label} is not JSON-safe`);
	}
	return cloneValue(value as JsonValue);
}

function validateState(value: ReleaseGenesisCivilizationState) {
	const state = record(value, "release civilization state");
	if (state.schemaVersion !== RELEASE_GENESIS_CIVILIZATION_STATE_VERSION)
		fail(
			"UNSUPPORTED_VERSION",
			"release civilization state version is unsupported",
		);
	if (state.phase !== "checkpoint" && state.phase !== "active")
		fail("INVALID_INPUT", "sponsor command requires a civilization checkpoint");
	if (state.civilization === null)
		fail("INVALID_INPUT", "sponsor command requires a civilization state");
	const scheduler = record(state.scheduler, "release civilization scheduler");
	integer(scheduler.simulationTime, "release civilization simulationTime");
	return value;
}

function acceptedPatch(
	current: ReleaseGenesisCivilizationState,
	postCivilization: JsonValue,
): readonly CivilizationJsonPatchOperation[] {
	const patch: CivilizationJsonPatchOperation[] = [
		{ op: "set", path: ["civilization"], value: postCivilization },
	];
	if (current.phase !== "active")
		patch.push({ op: "set", path: ["phase"], value: "active" });
	return patch;
}

function decisionJson(value: unknown | null): JsonValue | null {
	return value === null ? null : json(value, "sponsor decision record");
}

export async function createCivilizationSponsorRejectionAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly commandReceipt: unknown;
	readonly decisionRecord: unknown | null;
}): Promise<CivilizationSponsorAuthorityAppend> {
	const current = validateState(input.state);
	if (input.decisionRecord !== null)
		fail("INVALID_INPUT", "rejected sponsor command cannot commit cognition");
	assertCivilizationInvariants(
		current.civilization as unknown as CivilizationState,
	);
	if ((await hashAuthoritativeState(current)) !== input.head.stateHash)
		fail("STALE_STATE", "rejected sponsor command used stale authority state");
	const receipt = validateReceipt(input.commandReceipt, current, input.head);
	if (
		receipt.outcome !== "rejected" ||
		receipt.eventInterval !== null ||
		typeof receipt.rejectionCode !== "string" ||
		receipt.resultingRevision !==
			(current.civilization as unknown as CivilizationState).revision ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint)
	)
		fail("INVALID_INPUT", "rejected sponsor receipt semantics are invalid");
	const appendId = string(receipt.commandId, "sponsor commandId");
	const batchId = `rejected:${appendId}`;
	const event = await createAuthorityEvent({
		...input.head,
		appendId,
		batchId,
		eventId: batchId,
		sequence: input.head.lastSequence + 1,
		eventType: "CivilizationSponsorCommandRejected",
		causalParents: [],
		visibility: { kind: "authority-only" },
		provenance: {
			mechanismId: "sponsor.command.rejected.v1",
			cognitionDecisionId: null,
			brainKind: null,
		},
		preStateHash: input.head.stateHash,
		postStateHash: input.head.stateHash,
		previousEventHash: input.head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "sponsor-rejected",
			patch: [],
		},
	});
	const durableReceipt = json(
		{ ...receipt, resultingWorldHeadHash: event.eventHash },
		"durable rejected sponsor receipt",
	);
	return {
		state: current,
		request: {
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			runId: input.head.runId,
			regionId: input.head.regionId,
			appendId,
			batchId,
			expectedRevision: input.head.revision,
			expectedLastSequence: input.head.lastSequence,
			expectedStateHash: input.head.stateHash,
			expectedLastEventHash: input.head.lastEventHash,
			fencingToken: input.head.fencingToken,
			events: [event],
			commandReceipt: durableReceipt,
			decisionRecord: decisionJson(input.decisionRecord),
		},
	};
}

/** Maps one already-validated sponsor transition onto the sole civilization stream. */
export async function createCivilizationSponsorAuthorityAppend(input: {
	readonly state: ReleaseGenesisCivilizationState;
	readonly head: AuthorityHead;
	readonly protocolEvent: unknown;
	readonly commandReceipt: unknown;
	readonly decisionRecord: unknown | null;
	readonly postCivilization: unknown;
}): Promise<CivilizationSponsorAuthorityAppend> {
	const current = validateState(input.state);
	assertCivilizationInvariants(
		current.civilization as unknown as CivilizationState,
	);
	if (
		(await hashAuthoritativeState(current)) !== input.head.stateHash ||
		current.scheduler.simulationTime !== input.head.simulationTime
	)
		fail(
			"STALE_STATE",
			"sponsor command did not load the authority head state",
		);
	const protocolEvent = await parseCivilizationSponsorEvent(
		input.protocolEvent,
		current.scheduler.simulationTime,
	);
	if (protocolEvent === null)
		fail("INVALID_INPUT", "protocol sponsor event schema is invalid");
	const receipt = validateReceipt(input.commandReceipt, current, input.head);
	const interval = record(
		receipt.eventInterval,
		"accepted sponsor receipt interval",
	);
	const eventId = string(protocolEvent.eventId, "sponsor eventId");
	const eventIds = array(interval.eventIds, "accepted sponsor eventIds");
	if (
		receipt.outcome !== "accepted" ||
		receipt.expectedRevision !==
			(current.civilization as unknown as CivilizationState).revision ||
		receipt.rejectionCode !== null ||
		!exactKeys(interval, [
			"fromSequenceInclusive",
			"toSequenceExclusive",
			"eventIds",
		]) ||
		typeof receipt.payloadFingerprint !== "string" ||
		!HASH_PATTERN.test(receipt.payloadFingerprint) ||
		eventIds.length !== 1 ||
		eventIds[0] !== eventId ||
		integer(
			interval.fromSequenceInclusive,
			"accepted sponsor interval start",
		) !== integer(protocolEvent.sequence, "sponsor sequence") ||
		integer(interval.toSequenceExclusive, "accepted sponsor interval end") !==
			(protocolEvent.sequence as number) + 1
	)
		fail("INVALID_INPUT", "accepted sponsor receipt semantics are invalid");
	const eventPayload = protocolEvent.eventPayload;
	const kind = eventPayload.kind;
	const provenance = protocolEvent.provenance;
	if (provenance.kind === "cognition") {
		const decision = record(input.decisionRecord, "committed sponsor decision");
		if (
			decision.schemaVersion !== "eonfolk-cognitive-decision-record-v1" ||
			decision.recordVersion !== "1" ||
			decision.decisionId !== provenance.decisionId ||
			decision.wholePreStateHash !== protocolEvent.preStateHash ||
			decision.proposedCommandId !== receipt.commandId ||
			decision.receiptRef !== receipt.commandId ||
			canonicalJson(decision.acceptedEventInterval as JsonValue) !==
				canonicalJson(receipt.eventInterval as JsonValue) ||
			record(decision.validator, "committed sponsor decision validator")
				.stage !== "committed" ||
			record(decision.validator, "committed sponsor decision validator")
				.outcome !== "accepted"
		)
			fail("INVALID_INPUT", "committed sponsor decision linkage is invalid");
		const proposal = record(
			JSON.parse(
				string(decision.proposalCanonicalBytes, "committed proposal bytes"),
			),
			"committed sponsor proposal",
		);
		if (proposal.proposalId !== provenance.proposalId)
			fail("INVALID_INPUT", "committed sponsor proposal linkage is invalid");
	} else if (input.decisionRecord !== null) {
		fail(
			"INVALID_INPUT",
			"patron sponsor events cannot carry a cognition record",
		);
	}
	const postCivilization = json(
		input.postCivilization,
		"sponsor post civilization",
	);
	assertCivilizationInvariants(
		postCivilization as unknown as CivilizationState,
	);
	if (
		receipt.resultingRevision !==
		(postCivilization as unknown as CivilizationState).revision
	)
		fail("INVALID_INPUT", "sponsor receipt result revision is invalid");
	const next: ReleaseGenesisCivilizationState = {
		...current,
		phase: "active",
		civilization: postCivilization,
	};
	const parents = array(protocolEvent.causalParents, "sponsor causalParents");
	const relation = (value: unknown) => {
		if (value === "direct") return "direct-cause" as const;
		if (value === "trigger") return "trigger" as const;
		if (value === "contributing") return "contributing-condition" as const;
		fail("INVALID_INPUT", "sponsor causal relation is unsupported");
	};
	const appendId = string(receipt.commandId, "sponsor commandId");
	const batchId = string(protocolEvent.batchId, "sponsor batchId");
	const event = await createAuthorityEvent({
		runId: input.head.runId,
		regionId: input.head.regionId,
		engineVersion: input.head.engineVersion,
		stateSchemaVersion: input.head.stateSchemaVersion,
		appendId,
		batchId,
		eventId,
		sequence: input.head.lastSequence + 1,
		simulationTime: integer(
			protocolEvent.simulationTime,
			"sponsor simulationTime",
		),
		eventType: "CivilizationSponsorCommandCommitted",
		causalParents: parents.map((value, index) => {
			const parent = record(value, `sponsor causal parent ${index}`);
			return {
				eventId: string(
					parent.eventId,
					`sponsor causal parent ${index}.eventId`,
				),
				relation: relation(parent.relation),
			};
		}),
		visibility: json(protocolEvent.visibility, "sponsor visibility"),
		provenance: {
			mechanismId:
				parents.length > 0
					? string(
							record(parents[0], "first sponsor causal parent").mechanismId,
							"first sponsor mechanismId",
						)
					: `sponsor.${kind}.v1`,
			cognitionDecisionId:
				provenance.kind === "cognition"
					? string(provenance.decisionId, "sponsor decisionId")
					: null,
			brainKind: provenance.kind === "cognition" ? "standard" : null,
		},
		preStateHash: input.head.stateHash,
		postStateHash: await hashAuthoritativeState(next),
		previousEventHash: input.head.lastEventHash,
		payload: {
			schemaVersion: RELEASE_GENESIS_CIVILIZATION_TRANSITION_VERSION,
			transitionKind: "sponsor",
			protocolEvent: json(input.protocolEvent, "protocol sponsor event"),
			patch: acceptedPatch(current, postCivilization),
		},
	});
	const durableReceipt = json(
		{ ...receipt, resultingWorldHeadHash: event.eventHash },
		"durable accepted sponsor receipt",
	);
	return {
		state: next,
		request: {
			schemaVersion: AUTHORITY_APPEND_SCHEMA_VERSION,
			runId: input.head.runId,
			regionId: input.head.regionId,
			appendId,
			batchId,
			expectedRevision: input.head.revision,
			expectedLastSequence: input.head.lastSequence,
			expectedStateHash: input.head.stateHash,
			expectedLastEventHash: input.head.lastEventHash,
			fencingToken: input.head.fencingToken,
			events: [event],
			commandReceipt: durableReceipt,
			decisionRecord: decisionJson(input.decisionRecord),
		},
	};
}
