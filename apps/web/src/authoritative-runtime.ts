import {
	buildDecisionContext,
	createCognitiveDecisionRecord,
	riverholdCounselCatalog,
	standardBrain,
} from "@eonfolk/cognition";

import {
	type CommitGenesisResult,
	type JsonValue,
	PersistenceError,
	type PersistencePort,
	type DecisionRecord as StoredDecisionRecord,
	type WorldBatchRecord,
	type WorldEventRecord,
	type WorldHead,
} from "@eonfolk/persistence";
import {
	bytesFromHex,
	type CognitiveDecisionRecord,
	DETERMINISM_VERSION,
	type DecisionContext,
	decisionRecordHash,
	ENGINE_VERSION,
	type IntentProposal,
	jcs,
	PROTOCOL_SCHEMA_VERSION,
	proposalHash,
	REPLAY_VERSION,
	type ReplayManifest,
	type ReturnResponseAction,
	seedPrng,
	type VisibilityContext,
	type WorldBatchHeader,
	type WorldEventEnvelope,
} from "@eonfolk/protocol";
import {
	citizenBySlug,
	createRiverholdGenesis,
	createWorldCommand,
	type PreparedTransition,
	prepareTransition,
	projectChronicle,
	replayLedger,
	type WorldState,
} from "@eonfolk/sim";
import {
	type AnimationClass,
	type CanonicalActionRef,
	PRESENTATION_HZ,
	projectSpatialScene,
} from "@eonfolk/world-presentation";
import type {
	ChronicleBeatProjection,
	CounselIntent,
	EvidenceProjection,
	InterpretationProjection,
	Phase,
	RiverholdIntent,
	RiverholdProjection,
} from "./projection";

const PATRON_ID = "principal_local_patron";

const secondActions = {
	"verify-private": [
		{
			id: "publish-verified-count",
			label: "Ask Mara to publish the verified count",
			description: "Offer a next intent without inventing Toma's motive.",
		},
		{
			id: "observe",
			label: "Keep watch",
			description: "Make no further intervention and see what Mara does next.",
		},
	],
	"accuse-now": [
		{
			id: "repair-trust",
			label: "Counsel Mara to repair the trust",
			description: "Ask her to address Toma without erasing the public record.",
		},
		{
			id: "uphold-petition",
			label: "Stand by the petition",
			description: "Leave the damaged relationship unresolved for now.",
		},
	],
	abstain: [
		{
			id: "ask-iven",
			label: "Ask Mara to consult Iven",
			description: "Suggest a source who can inspect the repair reserve.",
		},
		{
			id: "observe",
			label: "Keep observing",
			description: "Let Mara continue without advice.",
		},
	],
} as const;

function baseProjection(
	phase: Phase,
	branch: CounselIntent | null,
	secondAction: string | null,
): Omit<RiverholdProjection, "spatial"> {
	const returned = ["return-pending", "return", "chronicle"].includes(phase);
	const summaryVisible = phase === "return" || phase === "chronicle";
	const strained = branch === "accuse-now";
	return {
		schemaVersion: "riverhold-view-v1",
		phase,
		day: returned ? 19 : 18,
		timeLabel: returned ? "06:40 · after one day" : "17:20 · spring count",
		headline:
			phase === "orientation"
				? "A town that remembers"
				: returned
					? "Riverhold changed while you were gone"
					: "The reserve count does not agree",
		tension:
			branch === "accuse-now"
				? "Mara's allegation moved the petition and strained Toma's trust."
				: branch === "verify-private"
					? "Mara recorded Iven's recount and her recorded trust in Toma increased; public understanding still lags."
					: "The mismatch remained unresolved, and one citizen independently endorsed an audit petition.",
		citizens: [],
		resources: { food: 0, water: 0, wood: 0 },
		worldProcesses: { millRepaired: false },
		worldNotices:
			branch === "accuse-now"
				? ["Petition gained three endorsements", "Toma's trust strained"]
				: branch === "verify-private"
					? [
							"Sourced reserve belief recorded",
							"Mara's recorded trust in Toma increased",
						]
					: [
							"Mara continued her Standing Plan",
							"One citizen independently endorsed an audit petition",
						],
		mara: {
			activity: "checking the market tally",
			values: [],
			belief:
				branch === "verify-private"
					? "Iven's recount supports the sealed public reserve."
					: branch === "accuse-now"
						? "The allegation is recorded; theft is not established."
						: "The ledger and open-bin counts differ; the reason is unverified.",
			beliefStatus:
				branch === "verify-private"
					? "verified"
					: branch === "accuse-now"
						? "disputed"
						: "uncertain",
			relationship: strained ? "Toma's trust is strained" : "Mara trusts Toma",
			relationshipBand:
				secondAction === "repair-trust"
					? "repairing"
					: strained
						? "strained"
						: "close",
			standingPlan: "Reconcile the ledger before making a public claim.",
			autonomy:
				"She acts for herself. You can advise at named boundaries; you cannot command her.",
		},
		investigation: {
			ledgerCount: 0,
			openBinCount: 0,
			mismatch: 0,
			observed: !["orientation", "following"].includes(phase),
		},
		interpretation: null,
		branch,
		consequence:
			branch === "accuse-now"
				? "Mara spoke publicly; three petition endorsements followed and Toma's trust fell."
				: branch === "verify-private"
					? "Mara recorded Iven's sourced recount; six hours later, her recorded trust in Toma increased."
					: branch === "abstain"
						? "Mara continued her existing Standing Plan; six hours later, one citizen independently endorsed an audit petition."
						: null,
		whileAway: summaryVisible
			? branch === "accuse-now"
				? [
						"The petition retained three new endorsements.",
						"Mara and Toma's recorded trust remained strained.",
						"Citizens continued their bounded routines for one simulated day.",
					]
				: branch === "verify-private"
					? [
							"Mara's recorded trust in Toma remained above its starting level after the sourced recount.",
							"The ledger mismatch remained part of Mara's plan.",
							"The town advanced without external inference.",
						]
					: [
							"The audit petition retained one independently recorded endorsement.",
							"The ledger mismatch remained part of Mara's plan.",
							"The town advanced without external inference.",
						]
			: [],
		secondActions:
			phase === "return" && branch !== null ? secondActions[branch] : [],
		chronicle: [],
		storyCard: null,
		localSaveNotice:
			"Canonical events and snapshots are saved only in this browser. Backup and recovery are not available yet.",
	};
}

function asJson(value: unknown): JsonValue {
	return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function asObject<T>(value: JsonValue): T {
	return value as T;
}

function assertCanonicalJsonEqual(
	actual: unknown,
	expected: unknown,
	label: string,
): void {
	let equal = false;
	try {
		equal = jcs(actual) === jcs(expected);
	} catch {
		equal = false;
	}
	if (!equal)
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} outer fields and data disagree`,
		);
}

function requireJsonObject(
	value: JsonValue,
	label: string,
): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new PersistenceError(
			"INVALID_INPUT",
			`${label} data is not an object`,
		);
	return value as Record<string, unknown>;
}

function assertSupportedGenesis(
	committed: CommitGenesisResult,
	expected: Awaited<ReturnType<typeof createRiverholdGenesis>>,
): WorldState {
	const manifestData = requireJsonObject(
		committed.manifest.data,
		"experiment manifest",
	);
	if (
		committed.manifest.schemaVersion !== "eonfolk-experiment-manifest-v1" ||
		manifestData.manifestVersion !== "eonfolk-experiment-manifest-v1" ||
		manifestData.engineVersion !== ENGINE_VERSION ||
		manifestData.worldSchemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		manifestData.determinismVersion !== DETERMINISM_VERSION ||
		manifestData.replayVersion !== REPLAY_VERSION
	)
		throw new PersistenceError(
			"UNSUPPORTED_VERSION",
			"stored experiment manifest version is unsupported",
		);
	assertCanonicalJsonEqual(
		committed.manifest.data,
		expected.experimentManifest,
		"experiment manifest",
	);
	if (
		committed.manifest.runId !== expected.state.runId ||
		committed.manifest.regionId !== expected.state.regionId ||
		committed.manifest.manifestHash !== expected.experimentManifest.manifestHash
	)
		throw new PersistenceError(
			"INVALID_INPUT",
			"experiment manifest outer fields and data disagree",
		);

	const snapshotData = requireJsonObject(
		committed.snapshot.data,
		"genesis snapshot",
	);
	if (
		committed.snapshot.schemaVersion !== "riverhold-world-state-v1" ||
		snapshotData.schemaVersion !== "riverhold-world-state-v1"
	)
		throw new PersistenceError(
			"UNSUPPORTED_VERSION",
			"stored snapshot schema version is unsupported",
		);
	assertCanonicalJsonEqual(
		committed.snapshot.data,
		expected.state,
		"genesis snapshot",
	);
	if (
		committed.snapshot.runId !== expected.state.runId ||
		committed.snapshot.regionId !== expected.state.regionId ||
		committed.snapshot.snapshotId !==
			expected.experimentManifest.initialSnapshotRef.snapshotId ||
		committed.snapshot.baseSequence !== 0 ||
		committed.snapshot.createdAtRevision !== 0 ||
		committed.snapshot.stateHash !== expected.initialStateHash ||
		committed.snapshot.baseWorldHeadHash !== expected.genesisWorldHeadHash
	)
		throw new PersistenceError(
			"INVALID_INPUT",
			"snapshot outer fields and data disagree",
		);
	if (
		committed.head.runId !== expected.state.runId ||
		committed.head.regionId !== expected.state.regionId ||
		(committed.head.revision === 0 &&
			(committed.head.lastSequence !== 0 ||
				committed.head.stateHash !== committed.snapshot.stateHash ||
				committed.head.worldHeadHash !== committed.snapshot.baseWorldHeadHash))
	)
		throw new PersistenceError(
			"INVALID_INPUT",
			"durable world head does not agree with the genesis records",
		);
	return asObject<WorldState>(committed.snapshot.data);
}

function loadBatchHeader(record: WorldBatchRecord): WorldBatchHeader {
	const header = requireJsonObject(
		record.data,
		"stored batch",
	) as unknown as WorldBatchHeader;
	if (
		record.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		header.schemaVersion !== PROTOCOL_SCHEMA_VERSION
	)
		throw new PersistenceError(
			"UNSUPPORTED_VERSION",
			"stored batch schema version is unsupported",
		);
	assertCanonicalJsonEqual(
		record.data,
		{
			schemaVersion: record.schemaVersion,
			runId: record.runId,
			regionId: record.regionId,
			batchId: record.batchId,
			priorWorldHeadHash: record.previousWorldHeadHash,
			firstSequence: record.firstSequence,
			eventCount: record.eventCount,
			eventHashes: record.eventHashes,
			payloadFingerprint: record.payloadFingerprint,
			resultRevision: record.resultRevision,
			finalStateHash: record.finalStateHash,
			batchHash: record.batchHash,
		},
		"stored batch",
	);
	return header;
}

function loadEventEnvelope(record: WorldEventRecord): WorldEventEnvelope {
	const event = requireJsonObject(
		record.data,
		"stored event",
	) as unknown as WorldEventEnvelope;
	const provenance = requireJsonObject(
		event.provenance as unknown as JsonValue,
		"stored event provenance",
	);
	if (
		record.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		event.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		event.engineVersion !== ENGINE_VERSION
	)
		throw new PersistenceError(
			"UNSUPPORTED_VERSION",
			"stored event or engine version is unsupported",
		);
	if (
		event.runId !== record.runId ||
		event.regionId !== record.regionId ||
		event.batchId !== record.batchId ||
		provenance.commandId !== record.commandId ||
		event.eventId !== record.eventId ||
		event.sequence !== record.sequence ||
		event.preStateHash !== record.preStateHash ||
		event.postStateHash !== record.postStateHash ||
		event.eventHash !== record.eventHash
	)
		throw new PersistenceError(
			"INVALID_INPUT",
			"stored event outer fields and data disagree",
		);
	return event;
}

function toStoredBatch(
	header: WorldBatchHeader,
	commandId: string,
): WorldBatchRecord {
	return {
		schemaVersion: header.schemaVersion,
		runId: header.runId,
		regionId: header.regionId,
		batchId: header.batchId,
		commandId,
		payloadFingerprint: header.payloadFingerprint,
		previousWorldHeadHash: header.priorWorldHeadHash,
		firstSequence: header.firstSequence,
		eventCount: header.eventCount,
		resultRevision: header.resultRevision,
		finalStateHash: header.finalStateHash,
		batchHash: header.batchHash,
		eventHashes: header.eventHashes,
		data: asJson(header),
	};
}

function toStoredEvent(
	event: WorldEventEnvelope,
	commandId: string,
): WorldEventRecord {
	return {
		schemaVersion: event.schemaVersion,
		runId: event.runId,
		regionId: event.regionId,
		batchId: event.batchId,
		commandId,
		eventId: event.eventId,
		sequence: event.sequence,
		preStateHash: event.preStateHash,
		postStateHash: event.postStateHash,
		eventHash: event.eventHash,
		data: asJson(event),
	};
}

function actionToBranch(
	action: "verify-reserve" | "accuse-publicly" | "follow-plan",
): CounselIntent {
	return action === "verify-reserve"
		? "verify-private"
		: action === "accuse-publicly"
			? "accuse-now"
			: "abstain";
}

function requestedIntent(
	intent: CounselIntent,
): "verify-reserve" | "accuse-publicly" | null {
	return intent === "verify-private"
		? "verify-reserve"
		: intent === "accuse-now"
			? "accuse-publicly"
			: null;
}

function requestedCounselFromState(state: WorldState): CounselIntent | null {
	if (state.lastCounsel?.intent === "verify-reserve") return "verify-private";
	if (state.lastCounsel?.intent === "accuse-publicly") return "accuse-now";
	return state.selectedCounselBranch === "follow-plan" ? "abstain" : null;
}

function recoveredPhase(state: WorldState, requested: Phase): Phase {
	if (state.lastReturnResponse !== null) return "chronicle";
	if (state.simulationTime >= 86_400) return "return";
	if (state.lastCounsel !== null && state.selectedCounselBranch === null)
		return "counsel";
	if (state.selectedCounselBranch !== null) {
		return requested === "checkpoint" || requested === "return-pending"
			? requested
			: "consequence";
	}
	if (state.revision > 0)
		return requested === "counsel" ? "counsel" : "investigated";
	return requested === "following" ? "following" : "orientation";
}

function publicReasonLabel(code: string): string {
	return (
		{
			plan: "Standing Plan",
			commitment: "Existing commitment",
			value: "Personal value",
			relationship: "Trust at stake",
			evidence: "Visible evidence",
			risk: "Risk weighed",
			counsel: "Advice aligned",
		}[code] ?? code
	);
}

function counselStoryLabel(counsel: CounselIntent | null): string {
	return counsel === "verify-private"
		? "verify first"
		: counsel === "accuse-now"
			? "speak now"
			: "before leaving";
}

function returnResponseAction(actionId: string): ReturnResponseAction {
	if (
		actionId === "publish-verified-count" ||
		actionId === "observe" ||
		actionId === "repair-trust" ||
		actionId === "uphold-petition" ||
		actionId === "ask-iven"
	)
		return actionId;
	throw new Error("The return response is not in the closed action catalog");
}

function activityFor(citizen: WorldState["citizens"][string]): {
	activity: string;
	activityKind: RiverholdProjection["citizens"][number]["activityKind"];
} {
	if (citizen.travel != null)
		return {
			activity: `carrying supplies toward ${citizen.travel.destinationPlaceId}`,
			activityKind:
				citizen.slug === "sela"
					? "water"
					: citizen.slug === "neri"
						? "food"
						: "wood",
		};
	const byBehavior = {
		"maintain-self": {
			activity: "meeting an immediate need",
			activityKind: "food",
		},
		"acquire-resource": {
			activity: `gathering near ${citizen.placeId}`,
			activityKind: citizen.slug === "sela" ? "water" : "wood",
		},
		"fulfill-plan": {
			activity:
				citizen.slug === "mara"
					? "checking the market tally"
					: `working as Riverhold's ${citizen.role}`,
			activityKind: citizen.slug === "mara" ? "investigate" : "mill",
		},
		"respond-socially": {
			activity: "completing a bilateral exchange",
			activityKind: "trade",
		},
	} as const;
	return byBehavior[citizen.currentBehavior];
}

function eventActorIds(event: WorldEventEnvelope): readonly string[] {
	const payload = event.eventPayload;
	switch (payload.kind) {
		case "CitizenMoved":
		case "TravelStarted":
		case "TravelArrived":
		case "ResourceGathered":
		case "ResourceConsumed":
		case "MillRepaired":
		case "CounselIssued":
		case "CounselInterpreted":
		case "ReturnResponseRecorded":
		case "BeliefChanged":
		case "StandingPlanChanged":
			return [payload.citizenId];
		case "ExchangeCompleted":
			return [payload.firstCitizenId, payload.secondCitizenId];
		case "StatementMade":
			return [payload.speakerId, ...payload.recipientIds];
		case "RelationshipChanged":
			return [payload.fromCitizenId, payload.toCitizenId];
		case "Observed":
			return [payload.observerId];
		case "PetitionChanged":
		case "TimeAdvanced":
			return [];
	}
}

function animationForEvent(event: WorldEventEnvelope): AnimationClass {
	switch (event.eventPayload.kind) {
		case "CitizenMoved":
		case "TravelStarted":
			return "walk";
		case "TravelArrived":
			return "idle";
		case "ResourceGathered":
			return "react";
		case "ResourceConsumed":
			return "eat-rest";
		case "ExchangeCompleted":
			return "react";
		case "MillRepaired":
			return "react";
		case "StatementMade":
			return "talk";
		case "RelationshipChanged":
		case "CounselInterpreted":
		case "PetitionChanged":
			return "react";
		case "Observed":
		case "BeliefChanged":
		case "StandingPlanChanged":
		case "CounselIssued":
		case "ReturnResponseRecorded":
			return "inspect";
		case "TimeAdvanced":
			return "idle";
	}
}

function defaultAnimationForBehavior(
	behavior: WorldState["citizens"][string]["currentBehavior"],
): AnimationClass {
	if (behavior === "respond-socially") return "exchange";
	if (behavior === "acquire-resource") return "gather";
	if (behavior === "maintain-self") return "eat-rest";
	return "inspect";
}

function defaultAnimationForAffordance(
	affordanceId: string | null,
	behavior: WorldState["citizens"][string]["currentBehavior"],
): AnimationClass {
	if (affordanceId === "mill-repair") return "repair";
	if (
		affordanceId === "spring-water" ||
		affordanceId === "woods-wood" ||
		affordanceId === "fields-food"
	)
		return "gather";
	return defaultAnimationForBehavior(behavior);
}

function carriedPropForCitizen(
	citizen: WorldState["citizens"][string],
): "grain" | "logs" | "trade" | "water" | null {
	if (citizen.currentBehavior === "respond-socially") {
		if (citizen.inventory.wood > 0) return "logs";
		if (citizen.inventory.food > 0) return "grain";
		return "trade";
	}
	if (citizen.travel == null) return null;
	if (citizen.inventory.wood > 0) return "logs";
	if (citizen.inventory.water > 0) return "water";
	if (citizen.inventory.food > 0) return "grain";
	return null;
}

function spatialDetailsForEvent(
	event: WorldEventEnvelope,
	citizenId: string,
	currentPlaceId: string,
): Readonly<{
	originPlaceId: string;
	destinationPlaceId: string;
	targetId: string | null;
}> {
	const payload = event.eventPayload;
	switch (payload.kind) {
		case "CitizenMoved":
			return {
				originPlaceId: payload.fromPlaceId,
				destinationPlaceId: payload.toPlaceId,
				targetId: payload.toPlaceId,
			};
		case "TravelStarted":
			return {
				originPlaceId: payload.originPlaceId,
				destinationPlaceId: payload.destinationPlaceId,
				targetId: payload.destinationPlaceId,
			};
		case "TravelArrived":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: payload.destinationPlaceId,
				targetId: payload.destinationPlaceId,
			};
		case "Observed":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId: payload.targetId,
			};
		case "ResourceGathered":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId: payload.siteId,
			};
		case "ExchangeCompleted":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId:
					payload.firstCitizenId === citizenId
						? payload.secondCitizenId
						: payload.firstCitizenId,
			};
		case "StatementMade":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId: payload.recipientIds[0] ?? null,
			};
		case "RelationshipChanged":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId:
					payload.fromCitizenId === citizenId
						? payload.toCitizenId
						: payload.fromCitizenId,
			};
		case "MillRepaired":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId: "mill",
			};
		case "ResourceConsumed":
		case "CounselIssued":
		case "CounselInterpreted":
		case "ReturnResponseRecorded":
		case "BeliefChanged":
		case "PetitionChanged":
		case "StandingPlanChanged":
		case "TimeAdvanced":
			return {
				originPlaceId: currentPlaceId,
				destinationPlaceId: currentPlaceId,
				targetId: null,
			};
	}
}

function canonicalActionForCitizen(input: {
	readonly citizenId: string;
	readonly placeId: string;
	readonly affordanceId: string | null;
	readonly affordanceSlotIndex: number | null;
	readonly taskTargetId: string | null;
	readonly currentBehavior: WorldState["citizens"][string]["currentBehavior"];
	readonly travel: WorldState["citizens"][string]["travel"];
	readonly hasCarriedResource: boolean;
	readonly simulationTime: number;
	readonly revision: number;
	readonly events: readonly WorldEventEnvelope[];
}): CanonicalActionRef {
	if (input.travel != null) {
		return Object.freeze({
			actionId: input.travel.travelId,
			sourceKind: "current-behavior",
			eventId: null,
			eventSequence: null,
			status: "in-progress",
			kind: input.hasCarriedResource ? "carry" : "walk",
			originPlaceId: input.travel.originPlaceId,
			destinationPlaceId: input.travel.destinationPlaceId,
			affordanceId: null,
			affordanceSlotIndex: null,
			targetId: input.travel.destinationPlaceId,
			simulationStart: input.travel.departureSimulationTime,
			simulationEnd: input.travel.expectedArrivalSimulationTime,
			resultEventId: null,
		});
	}
	const event = [...input.events]
		.reverse()
		.find((candidate) => eventActorIds(candidate).includes(input.citizenId));
	if (
		event !== undefined &&
		event.simulationTime === input.simulationTime &&
		input.affordanceId === null
	) {
		const spatial = spatialDetailsForEvent(
			event,
			input.citizenId,
			input.placeId,
		);
		const resultAffordance =
			event.eventPayload.kind === "ExchangeCompleted"
				? "market-exchange"
				: event.eventPayload.kind === "ResourceGathered"
					? `${event.eventPayload.siteId}-${event.eventPayload.resource}`
					: event.eventPayload.kind === "MillRepaired"
						? "mill-repair"
						: input.affordanceId;
		const resultSlot =
			event.eventPayload.kind === "ExchangeCompleted"
				? event.eventPayload.secondCitizenId === input.citizenId
					? 0
					: 1
				: resultAffordance === null
					? input.affordanceSlotIndex
					: 0;
		return Object.freeze({
			actionId:
				event.eventPayload.kind === "ExchangeCompleted"
					? `exchange:${event.eventId}`
					: `event:${event.eventId}`,
			sourceKind: "world-event",
			eventId: event.eventId,
			eventSequence: event.sequence,
			status: "committed",
			kind: animationForEvent(event),
			originPlaceId: spatial.originPlaceId,
			destinationPlaceId: spatial.destinationPlaceId,
			affordanceId: resultAffordance,
			affordanceSlotIndex: resultSlot,
			targetId: spatial.targetId,
			simulationStart: event.simulationTime,
			simulationEnd: event.simulationTime,
			resultEventId: event.eventId,
		});
	}
	return Object.freeze({
		actionId: `behavior:${input.citizenId}:${input.revision}`,
		sourceKind: "current-behavior",
		eventId: null,
		eventSequence: null,
		status: "in-progress",
		kind: defaultAnimationForAffordance(
			input.affordanceId,
			input.currentBehavior,
		),
		originPlaceId: input.placeId,
		destinationPlaceId: input.placeId,
		affordanceId: input.affordanceId,
		affordanceSlotIndex: input.affordanceSlotIndex,
		targetId: input.taskTargetId,
		simulationStart: input.simulationTime,
		simulationEnd: null,
		resultEventId: null,
	});
}

function relationForEvent(
	event: WorldEventEnvelope,
	fallback: EvidenceProjection["relation"],
): EvidenceProjection["relation"] {
	if (
		event.eventPayload.kind === "StatementMade" &&
		event.eventPayload.allegation
	)
		return "allegation";
	return event.causalParents[0]?.relation ?? fallback;
}

export interface AuthoritativeRuntimeOptions {
	readonly persistence: PersistencePort;
	readonly initialPhase?: Phase;
}

export class AuthoritativeRiverholdRuntime {
	readonly #persistence: PersistencePort;
	#phase: Phase;
	#state: WorldState | null = null;
	#head: WorldHead | null = null;
	#events: WorldEventEnvelope[] = [];
	#genesisPlaceByCitizen: Readonly<Record<string, string>> = Object.freeze({});
	#interpretation: InterpretationProjection | null = null;
	#requestedCounsel: CounselIntent | null = null;
	#secondAction: string | null = null;
	#safeStop: PersistenceError | null = null;

	constructor(options: AuthoritativeRuntimeOptions) {
		this.#persistence = options.persistence;
		this.#phase = options.initialPhase ?? "orientation";
	}

	async initialize(): Promise<RiverholdProjection> {
		const genesis = await createRiverholdGenesis();
		const committed = await this.#persistence.commitGenesis({
			manifest: {
				schemaVersion: genesis.experimentManifest.manifestVersion,
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				runKind: "canonical-local-proof",
				manifestHash: genesis.experimentManifest.manifestHash,
				parentRunId: null,
				data: asJson(genesis.experimentManifest),
			},
			head: {
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				revision: 0,
				lastSequence: 0,
				stateHash: genesis.initialStateHash,
				worldHeadHash: genesis.genesisWorldHeadHash,
				fencingToken: 1,
			},
			snapshot: {
				schemaVersion: genesis.state.schemaVersion,
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				snapshotId: genesis.experimentManifest.initialSnapshotRef.snapshotId,
				baseSequence: 0,
				createdAtRevision: 0,
				stateHash: genesis.initialStateHash,
				baseWorldHeadHash: genesis.genesisWorldHeadHash,
				data: asJson(genesis.state),
			},
		});
		const snapshotState = assertSupportedGenesis(committed, genesis);
		this.#genesisPlaceByCitizen = Object.freeze(
			Object.fromEntries(
				Object.values(snapshotState.citizens).map((citizen) => [
					citizen.citizenId,
					citizen.placeId,
				]),
			),
		);
		if (committed.head.revision === 0) {
			this.#head = await this.#persistence.acquireFencingToken(
				genesis.state.runId,
				genesis.state.regionId,
				committed.head.fencingToken,
			);
			this.#state = snapshotState;
			this.#phase = recoveredPhase(snapshotState, this.#phase);
			return this.#project();
		}
		const [batches, events] = await Promise.all([
			this.#persistence.getBatchRange({
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				fromRevisionInclusive: 1,
				toRevisionExclusive: committed.head.revision + 1,
			}),
			this.#persistence.getEventRange({
				runId: genesis.state.runId,
				regionId: genesis.state.regionId,
				fromSequenceInclusive: 1,
				toSequenceExclusive: committed.head.lastSequence + 1,
			}),
		]);
		this.#events = events.map(loadEventEnvelope);
		const replayManifest: ReplayManifest = {
			schemaVersion: "eonfolk-replay-manifest-v1",
			runId: snapshotState.runId,
			regionId: snapshotState.regionId,
			worldSeedHex: snapshotState.worldSeedHex,
			experimentManifestHash: committed.manifest.manifestHash,
			snapshot: {
				runId: committed.snapshot.runId,
				regionId: committed.snapshot.regionId,
				snapshotId: committed.snapshot.snapshotId,
				baseSequence: committed.snapshot.baseSequence,
				stateHash: committed.snapshot.stateHash,
				baseWorldHeadHash: committed.snapshot.baseWorldHeadHash,
			},
			fromSequenceInclusive: snapshotState.nextSequence,
			toSequenceExclusive: committed.head.lastSequence + 1,
			engineVersion: ENGINE_VERSION,
			worldSchemaVersion: PROTOCOL_SCHEMA_VERSION,
			determinismVersion: DETERMINISM_VERSION,
			replayVersion: REPLAY_VERSION,
			expectedFinalStateHash: committed.head.stateHash,
			expectedFinalWorldHeadHash: committed.head.worldHeadHash,
			presentation: { title: "Riverhold local proof", branch: null },
		};
		const replay = await replayLedger({
			snapshotState,
			snapshotStateHash: committed.snapshot.stateHash,
			baseWorldHeadHash: committed.snapshot.baseWorldHeadHash,
			headers: batches.map(loadBatchHeader),
			events: this.#events,
			manifest: replayManifest,
		});
		if (
			replay.stateHash !== committed.head.stateHash ||
			replay.worldHeadHash !== committed.head.worldHeadHash
		)
			throw new Error("durable world head does not match deterministic replay");
		this.#head = await this.#persistence.acquireFencingToken(
			genesis.state.runId,
			genesis.state.regionId,
			committed.head.fencingToken,
		);
		this.#state = replay.state;
		this.#phase = recoveredPhase(replay.state, this.#phase);
		this.#requestedCounsel = requestedCounselFromState(replay.state);
		await this.#recoverInterpretation();
		const recoveredResponse = [...this.#events]
			.reverse()
			.find((event) => event.eventPayload.kind === "ReturnResponseRecorded");
		this.#secondAction =
			recoveredResponse?.eventPayload.kind === "ReturnResponseRecorded"
				? recoveredResponse.eventPayload.action
				: null;
		return this.#project();
	}

	async #commit(
		prepared: PreparedTransition,
		decision: CognitiveDecisionRecord | null = null,
	): Promise<void> {
		const head = this.#requireHead();
		const storedDecision: StoredDecisionRecord | null =
			decision === null
				? null
				: {
						schemaVersion: decision.schemaVersion,
						runId: decision.runId,
						regionId: decision.regionId,
						decisionId: decision.decisionId,
						decisionRecordHash: decision.decisionRecordHash,
						data: asJson(decision),
					};
		if (!prepared.accepted || prepared.batchHeader === null) {
			const expectedRejectedReceipt = {
				schemaVersion: prepared.receipt.schemaVersion,
				runId: prepared.receipt.runId,
				regionId: prepared.receipt.regionId,
				commandId: prepared.receipt.commandId,
				payloadFingerprint: prepared.receipt.payloadFingerprint,
				outcome: "rejected" as const,
				observedRevision: head.revision,
				resultingRevision: head.revision,
				resultingStateHash: head.stateHash,
				resultingWorldHeadHash: head.worldHeadHash,
				fencingToken: head.fencingToken,
				batchId: null,
				fromSequenceInclusive: null,
				toSequenceExclusive: null,
				rejectionCode: prepared.receipt.rejectionCode ?? "INVALID_COMMAND",
				data: asJson(prepared.receipt),
			};
			const durableReceipt = await this.#persistence.commitRejectedCommand({
				runId: prepared.command.runId,
				regionId: prepared.command.regionId,
				fencingToken: head.fencingToken,
				receipt: expectedRejectedReceipt,
				decision: storedDecision,
			});
			const durableHead = await this.#persistence.getHead(
				prepared.command.runId,
				prepared.command.regionId,
			);
			if (jcs(durableHead) !== jcs(head))
				this.#failClosed(
					"STALE_WORLD_HEAD",
					"rejected command resolved at a different durable world head",
				);
			if (jcs(durableReceipt) !== jcs(expectedRejectedReceipt))
				this.#failClosed(
					"INVALID_INPUT",
					"durable rejected receipt differs from prepared rejection",
				);
			throw new Error(prepared.receipt.rejectionCode ?? "command rejected");
		}
		const interval = prepared.receipt.eventInterval;
		if (interval === null)
			throw new Error("accepted command has no event interval");
		const postHead: WorldHead = {
			runId: prepared.postState.runId,
			regionId: prepared.postState.regionId,
			revision: prepared.postState.revision,
			lastSequence: prepared.postState.nextSequence - 1,
			stateHash: prepared.finalStateHash,
			worldHeadHash: prepared.resultingWorldHeadHash,
			fencingToken: head.fencingToken,
		};
		const expectedReceipt = {
			schemaVersion: prepared.receipt.schemaVersion,
			runId: prepared.receipt.runId,
			regionId: prepared.receipt.regionId,
			commandId: prepared.receipt.commandId,
			payloadFingerprint: prepared.receipt.payloadFingerprint,
			outcome: "accepted" as const,
			observedRevision: prepared.receipt.actualRevision,
			resultingRevision: prepared.receipt.resultingRevision,
			resultingStateHash: prepared.finalStateHash,
			resultingWorldHeadHash: prepared.resultingWorldHeadHash,
			fencingToken: head.fencingToken,
			batchId: prepared.batchHeader.batchId,
			fromSequenceInclusive: interval.fromSequenceInclusive,
			toSequenceExclusive: interval.toSequenceExclusive,
			rejectionCode: null,
			data: asJson(prepared.receipt),
		};
		const result = await this.#persistence.commitTransition({
			runId: prepared.postState.runId,
			regionId: prepared.postState.regionId,
			expectedRevision: head.revision,
			expectedStateHash: head.stateHash,
			expectedWorldHeadHash: head.worldHeadHash,
			fencingToken: head.fencingToken,
			batch: toStoredBatch(prepared.batchHeader, prepared.command.commandId),
			events: prepared.events.map((event) =>
				toStoredEvent(event, prepared.command.commandId),
			),
			receipt: expectedReceipt,
			decision: storedDecision,
			postHead,
		});
		if (jcs(result.head) !== jcs(postHead))
			this.#failClosed(
				result.idempotent ? "STALE_WORLD_HEAD" : "INVALID_INPUT",
				result.idempotent
					? "idempotent command resolved at a different durable world head"
					: "durable world head differs from prepared transition",
			);
		if (jcs(result.receipt) !== jcs(expectedReceipt))
			this.#failClosed(
				"INVALID_INPUT",
				"durable command receipt differs from prepared transition",
			);
		this.#state = prepared.postState;
		this.#head = postHead;
		this.#events.push(...prepared.events);
	}

	async #worldCommand(
		kind: string,
		payload: Parameters<typeof createWorldCommand>[0]["payload"],
		principal: Parameters<typeof createWorldCommand>[0]["principal"] = {
			kind: "system",
			principalId: "riverhold_local_scheduler",
		},
	): Promise<PreparedTransition> {
		const state = this.#requireState();
		const command = await createWorldCommand({
			commandId: `cmd_${state.revision}_${kind}`,
			expectedRevision: state.revision,
			principal,
			runId: state.runId,
			regionId: state.regionId,
			payload,
		});
		return prepareTransition(
			state,
			this.#requireHead().worldHeadHash,
			command,
			this.#events,
		);
	}

	async #resolveCounsel(counsel: CounselIntent): Promise<void> {
		let state = this.#requireState();
		const mara = citizenBySlug(state, "mara");
		const pendingCounsel =
			state.lastCounsel !== null && state.selectedCounselBranch === null
				? requestedCounselFromState(state)
				: null;
		if (pendingCounsel !== null && pendingCounsel !== counsel)
			throw new Error("A different counsel intent is already durably pending");
		const resolvedCounsel = pendingCounsel ?? counsel;
		const intent = requestedIntent(resolvedCounsel);
		let interventionId: string | null = null;
		if (pendingCounsel !== null) {
			interventionId = state.lastCounsel?.interventionId ?? null;
		} else if (intent !== null) {
			interventionId = `intervention_${state.revision}_${intent}`;
			const counselTransition = await this.#worldCommand(
				"counsel",
				{
					kind: "IssueCounsel",
					interventionId,
					citizenId: mara.citizenId,
					intent,
				},
				{
					kind: "patron",
					principalId: PATRON_ID,
					beneficiaryCitizenId: mara.citizenId,
				},
			);
			await this.#commit(counselTransition);
			state = this.#requireState();
		}
		const relationship = state.relationships["relationship-mara-toma"];
		if (relationship === undefined)
			throw new Error("Mara relationship missing");
		const mind = {
			citizenId: mara.citizenId,
			values: mara.values,
			relationships: [relationship],
			records: Object.values(state.epistemicRecords),
			standingPlan: mara.standingPlan,
		};
		const visibilityContext: VisibilityContext = {
			policyVersion: "riverhold-visibility-v1",
			covenants: state.covenants,
			localOwnerPrincipalId: PATRON_ID,
			nonproduction: true,
		};
		const evidenceRecordIds = Object.values(state.epistemicRecords)
			.filter(
				(record) =>
					record.subjectCitizenId === mara.citizenId &&
					(record.kind === "observation" || record.kind === "belief"),
			)
			.map((record) => record.recordId);
		const context: DecisionContext = await buildDecisionContext({
			contextId: `context_${state.revision}_counsel`,
			actorMind: mind,
			runId: state.runId,
			regionId: state.regionId,
			revision: state.revision,
			simulationTime: state.simulationTime,
			decisionReason: "sponsor-counsel",
			actionCatalog: riverholdCounselCatalog({
				actorId: mara.citizenId,
				targetCitizenId: citizenBySlug(state, "toma").citizenId,
				planId: mara.standingPlan.planId,
				relationshipId: relationship.relationshipId,
				evidenceRecordIds,
			}),
			visibilityContext,
			counselIntent: intent,
		});
		const prngState = await seedPrng(
			bytesFromHex(state.worldSeedHex, 32),
			"standard-brain",
			mara.citizenId,
			`decision-${state.revision}`,
		);
		const decisionId = `decision_${state.revision}_counsel`;
		const proposalId = `proposal_${state.revision}_counsel`;
		const { proposal } = await standardBrain(context, {
			proposalId,
			prngState,
		});
		const action =
			proposal.action.kind === "VerifyReserve"
				? "verify-reserve"
				: proposal.action.kind === "AccusePublicly"
					? "accuse-publicly"
					: "follow-plan";
		const resolved = await this.#worldCommand(
			"resolve-counsel",
			{
				kind: "ResolveCounsel",
				citizenId: mara.citizenId,
				interventionId,
				decisionId,
				proposalId,
				action,
			},
			{ kind: "citizen", principalId: mara.citizenId },
		);
		const decision = await createCognitiveDecisionRecord({
			decisionId,
			decisionBoundaryId: `boundary_${state.revision}_counsel`,
			wholePreStateHash: resolved.priorStateHash,
			context,
			proposal,
			failureCode: null,
			validator: {
				stage: "committed",
				outcome: "accepted",
				reason: "accepted",
			},
			proposedCommandId: resolved.command.commandId,
			receiptRef: resolved.command.commandId,
			acceptedEventInterval: resolved.receipt.eventInterval,
		});
		await this.#commit(resolved, decision);
		this.#requestedCounsel = resolvedCounsel;
		this.#interpretation = this.#interpretationFrom(proposal, resolvedCounsel);
	}

	async #recoverInterpretation(): Promise<void> {
		const state = this.#requireState();
		if (state.selectedCounselBranch === null) {
			this.#interpretation = null;
			return;
		}
		const resolvedEvent = [...this.#events]
			.reverse()
			.find(
				(event) =>
					event.eventPayload.kind === "CounselInterpreted" &&
					event.provenance.kind === "cognition",
			);
		if (
			resolvedEvent === undefined ||
			resolvedEvent.provenance.kind !== "cognition" ||
			resolvedEvent.eventPayload.kind !== "CounselInterpreted" ||
			typeof resolvedEvent.provenance.decisionId !== "string" ||
			typeof resolvedEvent.provenance.proposalId !== "string"
		)
			throw new Error("resolved counsel is missing cognition provenance");
		const stored = await this.#persistence.getDecisionRecord(
			state.runId,
			state.regionId,
			resolvedEvent.provenance.decisionId,
		);
		if (stored === null)
			throw new Error(
				"resolved counsel is missing its durable decision record",
			);
		const record = asObject<CognitiveDecisionRecord>(stored.data);
		if (
			record.schemaVersion !== "eonfolk-cognitive-decision-record-v1" ||
			record.decisionId !== stored.decisionId ||
			record.decisionId !== resolvedEvent.provenance.decisionId ||
			record.runId !== stored.runId ||
			record.regionId !== stored.regionId ||
			record.decisionRecordHash !== stored.decisionRecordHash ||
			record.proposedCommandId !== resolvedEvent.provenance.commandId ||
			record.acceptedEventInterval === null ||
			!record.acceptedEventInterval.eventIds.includes(resolvedEvent.eventId)
		)
			throw new Error("durable counsel decision linkage is invalid");
		const { decisionRecordHash: claimedRecordHash, ...recordWithoutHash } =
			record;
		if ((await decisionRecordHash(recordWithoutHash)) !== claimedRecordHash)
			throw new Error("durable counsel decision hash is invalid");
		if (record.proposalCanonicalBytes === null || record.proposalHash === null)
			throw new Error("durable counsel proposal is missing");
		let parsed: unknown;
		try {
			parsed = JSON.parse(record.proposalCanonicalBytes);
		} catch {
			throw new Error("durable counsel proposal is not valid JSON");
		}
		const proposal = parsed as IntentProposal;
		if (
			typeof proposal !== "object" ||
			proposal === null ||
			proposal.proposalId !== resolvedEvent.provenance.proposalId ||
			proposal.proposalHash !== record.proposalHash ||
			jcs(proposal) !== record.proposalCanonicalBytes
		)
			throw new Error("durable counsel proposal linkage is invalid");
		const { proposalHash: claimedProposalHash, ...proposalWithoutHash } =
			proposal;
		if ((await proposalHash(proposalWithoutHash)) !== claimedProposalHash)
			throw new Error("durable counsel proposal hash is invalid");
		const action =
			proposal.action.kind === "VerifyReserve"
				? "verify-reserve"
				: proposal.action.kind === "AccusePublicly"
					? "accuse-publicly"
					: proposal.action.kind === "FollowStandingPlan"
						? "follow-plan"
						: null;
		if (
			action === null ||
			action !== state.selectedCounselBranch ||
			action !== resolvedEvent.eventPayload.action
		)
			throw new Error("durable counsel proposal does not match Reality");
		const counsel = requestedCounselFromState(state);
		if (counsel === null)
			throw new Error("resolved counsel intent cannot be recovered");
		this.#requestedCounsel = counsel;
		this.#interpretation = this.#interpretationFrom(proposal, counsel);
	}

	#interpretationFrom(
		proposal: IntentProposal,
		counsel: CounselIntent,
	): InterpretationProjection {
		const chosenAction =
			proposal.action.kind === "VerifyReserve"
				? "verify-private"
				: proposal.action.kind === "AccusePublicly"
					? "accuse-now"
					: "abstain";
		return {
			counsel,
			chosenAction,
			disposition: proposal.explanation.counselDisposition,
			publicReason: proposal.publicJustification,
			decisiveTerms:
				proposal.explanation.decisiveReasonCodes.map(publicReasonLabel),
		};
	}

	async dispatch(intent: RiverholdIntent): Promise<RiverholdProjection> {
		this.#assertRunning();
		switch (intent.kind) {
			case "follow-mara":
				this.#requirePhase("orientation");
				this.#phase = "following";
				break;
			case "investigate-count": {
				this.#requirePhase("following");
				const transition = await this.#worldCommand("investigate-minute", {
					kind: "Advance",
					seconds: 60,
				});
				await this.#commit(transition);
				this.#phase = "investigated";
				break;
			}
			case "open-counsel":
				this.#requirePhase("investigated");
				this.#phase = "counsel";
				break;
			case "offer-counsel":
				this.#requirePhase("counsel");
				await this.#resolveCounsel(intent.counsel);
				this.#phase = "consequence";
				break;
			case "leave-checkpoint":
				this.#requirePhase("consequence");
				if (this.#requireState().selectedCounselBranch === null)
					throw new Error("A resolved branch is required before checkpointing");
				this.#phase = "checkpoint";
				break;
			case "return-to-checkpoint":
				this.#requirePhase("checkpoint");
				this.#phase = "return-pending";
				break;
			case "confirm-advance": {
				this.#requirePhase("return-pending");
				const transition = await this.#worldCommand("catch-up-day", {
					kind: "Advance",
					seconds: 86_400,
				});
				await this.#commit(transition);
				this.#phase = "return";
				break;
			}
			case "take-second-action": {
				this.#requirePhase("return");
				if (
					!baseProjection(
						"return",
						actionToBranch(
							this.#requireState().selectedCounselBranch ?? "follow-plan",
						),
						null,
					).secondActions.some((action) => action.id === intent.actionId)
				)
					throw new Error("The action is not available in this branch");
				const selectedBranch =
					this.#requireState().selectedCounselBranch ?? "follow-plan";
				const expectedPriorKind =
					selectedBranch === "verify-reserve"
						? "RelationshipChanged"
						: "PetitionChanged";
				const expectedReasonCode =
					selectedBranch === "verify-reserve"
						? "private-verification-trust"
						: selectedBranch === "accuse-publicly"
							? "public-statement-endorsements"
							: "independent-unresolved-ledger-interest";
				const priorEvent = [...this.#events]
					.reverse()
					.find(
						(event) =>
							event.provenance.kind === "cognition" &&
							event.eventPayload.kind === expectedPriorKind &&
							"reasonCode" in event.eventPayload &&
							event.eventPayload.reasonCode === expectedReasonCode,
					);
				if (priorEvent === undefined)
					throw new Error("The return response has no canonical prior event");
				const mara = citizenBySlug(this.#requireState(), "mara");
				const transition = await this.#worldCommand(
					"return-response",
					{
						kind: "RespondOnReturn",
						responseId: `return_response_${this.#requireState().revision}`,
						citizenId: mara.citizenId,
						action: returnResponseAction(intent.actionId),
						priorEventId: priorEvent.eventId,
					},
					{
						kind: "patron",
						principalId: PATRON_ID,
						beneficiaryCitizenId: mara.citizenId,
					},
				);
				await this.#commit(transition);
				this.#secondAction = intent.actionId;
				this.#phase = "chronicle";
				break;
			}
		}
		return this.#project();
	}

	async advanceWatchedWorld(
		seconds: number,
	): Promise<RiverholdProjection | null> {
		this.#assertRunning();
		if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 300)
			throw new Error(
				"watched-world cadence must be between 1 and 300 seconds",
			);
		if (this.#phase === "checkpoint" || this.#phase === "return-pending")
			return null;
		const transition = await this.#worldCommand("watched-cadence", {
			kind: "Advance",
			seconds,
		});
		await this.#commit(transition);
		return this.#project();
	}

	diagnosticWorldHead() {
		this.#assertRunning();
		const state = this.#requireState();
		const head = this.#requireHead();
		return Object.freeze({
			runId: state.runId,
			regionId: state.regionId,
			revision: head.revision,
			sequence: head.lastSequence,
			simulationTime: state.simulationTime,
			status: "healthy" as const,
		});
	}

	#project(): RiverholdProjection {
		const state = this.#requireState();
		const head = this.#requireHead();
		const branch =
			state.selectedCounselBranch === null
				? null
				: actionToBranch(state.selectedCounselBranch);
		const base = baseProjection(this.#phase, branch, this.#secondAction);
		const citizens = Object.values(state.citizens).map((citizen) => {
			const reservation =
				citizen.activeTaskId === null
					? undefined
					: state.taskReservations[citizen.activeTaskId];
			const slotIndex =
				reservation?.citizenIds.indexOf(citizen.citizenId) ?? -1;
			const taskTargetId =
				reservation?.citizenIds.find(
					(participantId) => participantId !== citizen.citizenId,
				) ?? null;
			return {
				id: citizen.citizenId,
				slug: citizen.slug,
				name: citizen.name,
				role: citizen.role,
				placeId: citizen.placeId,
				place: state.places[citizen.placeId]?.name ?? citizen.placeId,
				...activityFor(citizen),
				carriedProp: carriedPropForCitizen(citizen),
				canonicalAction: canonicalActionForCitizen({
					citizenId: citizen.citizenId,
					placeId: citizen.placeId,
					affordanceId: reservation?.affordanceId ?? null,
					affordanceSlotIndex: slotIndex < 0 ? null : slotIndex,
					taskTargetId,
					currentBehavior: citizen.currentBehavior,
					travel: citizen.travel,
					hasCarriedResource:
						citizen.inventory.food > 0 ||
						citizen.inventory.water > 0 ||
						citizen.inventory.wood > 0,
					simulationTime: state.simulationTime,
					revision: state.revision,
					events: this.#events,
				}),
				...(citizen.slug === "mara" ? { focal: true as const } : {}),
			};
		});
		const presentationTick = state.simulationTime * PRESENTATION_HZ;
		const spatial = projectSpatialScene({
			source: {
				runId: state.runId,
				regionId: state.regionId,
				revision: state.revision,
				throughSequence: head.lastSequence,
				stateHash: head.stateHash,
			},
			citizens: citizens.map((citizen) => ({
				citizenId: citizen.id,
				slug: citizen.slug,
				name: citizen.name,
				role: citizen.role,
				placeId: citizen.placeId,
				activity: citizen.activity,
				activityKind: citizen.activityKind,
				focal: citizen.focal === true,
				carriedProp: citizen.carriedProp,
				canonicalAction: citizen.canonicalAction,
			})),
			presentationTick,
		});
		const mara = citizenBySlug(state, "mara");
		const relationship = state.relationships["relationship-mara-toma"];
		if (relationship === undefined)
			throw new Error("Mara relationship missing");
		const relationshipBand =
			relationship.strain >= 2_000
				? "strained"
				: this.#secondAction === "repair-trust"
					? "repairing"
					: "close";
		const chronicleProjection = this.#chronicle(branch);
		const chronicle = chronicleProjection.beats;
		const exchange = this.#events.find(
			(event) => event.eventPayload.kind === "ExchangeCompleted",
		);
		const activeTraders = citizens
			.filter((citizen) => citizen.activityKind === "trade")
			.map((citizen) => citizen.name)
			.sort();
		const worldNotices =
			branch === null && exchange?.eventPayload.kind === "ExchangeCompleted"
				? [
						"Iven Holt gave 1 wood to Toma Reed for 1 food",
						"The bilateral exchange settled in canonical Reality",
					]
				: branch === null && activeTraders.length >= 2
					? [
							`${activeTraders[0]} and ${activeTraders[1]} are completing a bilateral exchange`,
							"The exchange is visibly in progress; settlement is not yet claimed",
						]
					: branch === null
						? [
								"Mara Vale and Toma Reed compare the signed market tally; the concern remains unresolved",
								"Relationship cue only — no authoritative change is claimed",
							]
						: base.worldNotices;
		const story =
			this.#phase === "chronicle" && chronicle.length > 0
				? {
						heading:
							this.#requestedCounsel === "abstain"
								? "YOU OFFERED NO ADVICE"
								: `YOU ADVISED: ${counselStoryLabel(this.#requestedCounsel)}`,
						choice: chronicle[1]?.title ?? "Mara chose for herself",
						followed: chronicle[2]?.title ?? "Riverhold responded",
						unresolved: `UNRESOLVED: ${chronicleProjection.unresolvedTension}`,
					}
				: null;
		return Object.freeze({
			...base,
			day: Math.floor(state.simulationTime / 86_400) + 18,
			citizens: Object.freeze(citizens),
			spatial,
			resources: Object.freeze({ ...state.settlementInventory }),
			worldProcesses: Object.freeze({ millRepaired: state.mill.repaired }),
			worldNotices: Object.freeze(worldNotices),
			mara: Object.freeze({
				...base.mara,
				values: Object.freeze(mara.values.map((value) => value.valueId)),
				standingPlan: `${mara.standingPlan.goalType}: ${mara.standingPlan.currentStepId}`,
				relationship:
					relationshipBand === "strained"
						? "Toma's trust is strained"
						: relationshipBand === "repairing"
							? "Mara and Toma have begun a careful repair"
							: "Mara trusts Toma",
				relationshipBand,
			}),
			investigation: Object.freeze({
				ledgerCount: state.publicLedgerFood,
				openBinCount: state.settlementInventory.food,
				mismatch: state.publicLedgerFood - state.settlementInventory.food,
				observed: !["orientation", "following"].includes(this.#phase),
			}),
			interpretation: this.#interpretation,
			chronicle: Object.freeze(this.#phase === "chronicle" ? chronicle : []),
			storyCard: story,
		});
	}

	#chronicle(branch: CounselIntent | null): {
		readonly beats: ChronicleBeatProjection[];
		readonly unresolvedTension: string;
	} {
		if (branch === null)
			return { beats: [], unresolvedTension: "Riverhold continues." };
		const state = this.#requireState();
		const visibilityContext: VisibilityContext = {
			policyVersion: "riverhold-visibility-v1",
			covenants: state.covenants,
			localOwnerPrincipalId: PATRON_ID,
			nonproduction: true,
		};
		const projected = projectChronicle({
			events: this.#events,
			viewer: { kind: "participant", principalId: PATRON_ID },
			purpose: "chronicle-private",
			atRevision: state.revision,
			visibilityContext,
			citizenNames: Object.fromEntries(
				Object.values(state.citizens).map((citizen) => [
					citizen.citizenId,
					citizen.name,
				]),
			),
		});
		const eventsById = new Map(
			this.#events.map((event) => [event.eventId, event]),
		);
		const beats = projected.beats.map((beat, index) => {
			const sentence = projected.sentences.find(
				(candidate) => candidate.text === beat.text,
			);
			const evidence = beat.evidenceEventIds.flatMap((eventId) => {
				const event = eventsById.get(eventId);
				if (event === undefined) return [];
				return [
					{
						eventId,
						label: event.eventPayload.kind,
						relation: relationForEvent(
							event,
							sentence?.relation === "fact"
								? "temporal-predecessor"
								: (sentence?.relation ?? "temporal-predecessor"),
						),
						mechanism:
							event.causalParents[0]?.mechanismId ?? "world-event-envelope-v1",
						visibility:
							event.visibility.kind === "public" ? "public" : "patron",
					} satisfies EvidenceProjection,
				];
			});
			const focusEvents = beat.evidenceEventIds.flatMap((eventId) => {
				const event = eventsById.get(eventId);
				return event === undefined ? [] : [event];
			});
			const participantIds = [...new Set(focusEvents.flatMap(eventActorIds))];
			const firstFocusEvent = focusEvents[0];
			const firstParticipant =
				firstFocusEvent === undefined
					? undefined
					: eventActorIds(firstFocusEvent)[0];
			const placeId =
				firstFocusEvent === undefined || firstParticipant === undefined
					? "market"
					: this.#placeAtEvent(firstParticipant, firstFocusEvent.sequence);
			const targetIds = [
				...new Set(
					focusEvents.flatMap((event) => {
						const actorId = eventActorIds(event)[0] ?? "";
						const eventPlaceId =
							actorId === ""
								? placeId
								: this.#placeAtEvent(actorId, event.sequence);
						return [
							spatialDetailsForEvent(event, actorId, eventPlaceId).targetId,
						].filter((value): value is string => value !== null);
					}),
				),
			];
			return {
				id: `beat:${index + 1}`,
				timeLabel: `00:${String(index * 6).padStart(2, "0")}`,
				eyebrow: sentence?.relation.toUpperCase() ?? "FACT",
				title: beat.text,
				body:
					index === 2
						? projected.unresolvedTension
						: sentence?.relation === "allegation"
							? "This is an in-world allegation, not proof. The attributed statement and its effects remain distinct."
							: "This sentence is derived from the authorized events listed below.",
				evidence,
				spatialFocus: Object.freeze({
					placeId,
					participantIds: Object.freeze(participantIds),
					targetIds: Object.freeze(targetIds),
					sourceEventIds: Object.freeze([...beat.evidenceEventIds]),
				}),
			};
		});
		return { beats, unresolvedTension: projected.unresolvedTension };
	}

	#placeAtEvent(citizenId: string, throughSequence: number): string {
		let placeId = this.#genesisPlaceByCitizen[citizenId] ?? "market";
		for (const event of this.#events) {
			if (event.sequence > throughSequence) break;
			const payload = event.eventPayload;
			if (payload.kind === "CitizenMoved" && payload.citizenId === citizenId)
				placeId = payload.toPlaceId;
			else if (
				payload.kind === "TravelArrived" &&
				payload.citizenId === citizenId
			)
				placeId = payload.destinationPlaceId;
		}
		return placeId;
	}

	#requireState(): WorldState {
		this.#assertRunning();
		if (this.#state === null) throw new Error("runtime is not initialized");
		return this.#state;
	}

	#requireHead(): WorldHead {
		this.#assertRunning();
		if (this.#head === null) throw new Error("runtime is not initialized");
		return this.#head;
	}

	#requirePhase(expected: Phase): void {
		if (this.#phase !== expected)
			throw new Error(
				`Action requires phase ${expected}; found ${this.#phase}`,
			);
	}

	#assertRunning(): void {
		if (this.#safeStop !== null) throw this.#safeStop;
	}

	#failClosed(
		code: "INVALID_INPUT" | "STALE_WORLD_HEAD",
		message: string,
	): never {
		const error = new PersistenceError(code, message);
		this.#safeStop = error;
		throw error;
	}
}
