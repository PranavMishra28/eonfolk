import {
	batchHash,
	bytesFromHex,
	type CausalParent,
	type CommandReceipt,
	type CommandRejectionCode,
	batchId as deriveBatchId,
	eventHash as deriveEventHash,
	payloadFingerprint as derivePayloadFingerprint,
	ENGINE_VERSION,
	PROTOCOL_SCHEMA_VERSION,
	type RelatedEvent,
	stableId,
	stateHash,
	type Visibility,
	type WorldBatchHeader,
	type WorldCommand,
	type WorldEventEnvelope,
	type WorldEventPayload,
} from "../../protocol/src/index.js";
import { assertWorldInvariants } from "./invariants.js";
import { reducePayload } from "./reducer.js";
import { scheduleAutonomousActions } from "./scheduler.js";
import { citizenBySlug, type WorldState } from "./state.js";

interface PendingEvent {
	readonly payload: WorldEventPayload;
	readonly visibility: Visibility;
	readonly parentIndexes: readonly {
		readonly index: number;
		readonly relation: "direct" | "trigger" | "contributing";
		readonly mechanismId: string;
	}[];
	readonly externalParents: readonly CausalParent[];
	readonly relatedEvents: readonly RelatedEvent[];
}

export interface PreparedTransition {
	readonly accepted: boolean;
	readonly priorState: WorldState;
	readonly postState: WorldState;
	readonly priorStateHash: string;
	readonly finalStateHash: string;
	readonly priorWorldHeadHash: string;
	readonly resultingWorldHeadHash: string;
	readonly command: WorldCommand;
	readonly events: readonly WorldEventEnvelope[];
	readonly batchHeader: WorldBatchHeader | null;
	readonly receipt: CommandReceipt;
}

function exactKeys(value: object, keys: readonly string[]): boolean {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
}

function validPayload(payload: unknown): payload is WorldCommand["payload"] {
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("kind" in payload) ||
		typeof payload.kind !== "string"
	)
		return false;
	const record = payload as Record<string, unknown>;
	const keyMap: Record<string, readonly string[]> = {
		Observe: ["kind", "targetId"],
		MoveCitizen: ["kind", "citizenId", "toPlaceId"],
		GatherResource: ["kind", "citizenId", "resource", "quantity"],
		ConsumeResource: ["kind", "citizenId", "resource", "quantity"],
		Exchange: [
			"kind",
			"firstCitizenId",
			"secondCitizenId",
			"firstGives",
			"secondGives",
		],
		RepairMill: ["kind", "citizenId"],
		IssueCounsel: ["kind", "interventionId", "citizenId", "intent"],
		ResolveCounsel: [
			"kind",
			"citizenId",
			"interventionId",
			"decisionId",
			"proposalId",
			"action",
		],
		RespondOnReturn: [
			"kind",
			"responseId",
			"citizenId",
			"action",
			"priorEventId",
		],
		Advance: ["kind", "seconds"],
	};
	const keys = keyMap[payload.kind];
	if (keys === undefined || !exactKeys(payload, keys)) return false;
	const nonempty = (value: unknown): value is string =>
		typeof value === "string" && value.length > 0 && value.length <= 160;
	const quantity = (value: unknown): value is number =>
		Number.isInteger(value) &&
		Number(value) > 0 &&
		Number(value) <= 0x7fff_ffff;
	const resource = (value: unknown): value is "food" | "water" | "wood" =>
		value === "food" || value === "water" || value === "wood";
	switch (payload.kind) {
		case "Observe":
			return nonempty(record.targetId);
		case "MoveCitizen":
			return nonempty(record.citizenId) && nonempty(record.toPlaceId);
		case "GatherResource":
			return (
				nonempty(record.citizenId) &&
				resource(record.resource) &&
				quantity(record.quantity)
			);
		case "ConsumeResource":
			return (
				nonempty(record.citizenId) &&
				(record.resource === "food" || record.resource === "water") &&
				quantity(record.quantity) &&
				Number(record.quantity) <= Math.floor(0x7fff_ffff / 3_000)
			);
		case "Exchange": {
			const first = record.firstGives;
			const second = record.secondGives;
			if (
				typeof first !== "object" ||
				first === null ||
				typeof second !== "object" ||
				second === null
			)
				return false;
			if (
				!exactKeys(first, ["resource", "quantity"]) ||
				!exactKeys(second, ["resource", "quantity"])
			)
				return false;
			const firstRecord = first as Record<string, unknown>;
			const secondRecord = second as Record<string, unknown>;
			return (
				nonempty(record.firstCitizenId) &&
				nonempty(record.secondCitizenId) &&
				record.firstCitizenId !== record.secondCitizenId &&
				resource(firstRecord.resource) &&
				quantity(firstRecord.quantity) &&
				resource(secondRecord.resource) &&
				quantity(secondRecord.quantity)
			);
		}
		case "RepairMill":
			return nonempty(record.citizenId);
		case "IssueCounsel":
			return (
				nonempty(record.interventionId) &&
				nonempty(record.citizenId) &&
				(record.intent === "verify-reserve" ||
					record.intent === "accuse-publicly")
			);
		case "ResolveCounsel":
			return (
				nonempty(record.citizenId) &&
				(record.interventionId === null || nonempty(record.interventionId)) &&
				nonempty(record.decisionId) &&
				nonempty(record.proposalId) &&
				(record.action === "verify-reserve" ||
					record.action === "accuse-publicly" ||
					record.action === "follow-plan")
			);
		case "RespondOnReturn":
			return (
				nonempty(record.responseId) &&
				nonempty(record.citizenId) &&
				nonempty(record.priorEventId) &&
				(record.action === "publish-verified-count" ||
					record.action === "observe" ||
					record.action === "repair-trust" ||
					record.action === "uphold-petition" ||
					record.action === "ask-iven")
			);
		case "Advance":
			return (
				Number.isSafeInteger(record.seconds) &&
				Number(record.seconds) > 0 &&
				Number(record.seconds) <= 604_800
			);
	}
	return false;
}

function validCommandShape(command: WorldCommand): boolean {
	const required = [
		"schemaVersion",
		"commandId",
		"payloadFingerprint",
		"expectedRevision",
		"principal",
		"runId",
		"regionId",
		"payload",
	];
	const allowed =
		command.provenanceRef === undefined
			? required
			: [...required, "provenanceRef"];
	if (!exactKeys(command, allowed)) return false;
	if (
		command.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
		typeof command.commandId !== "string" ||
		command.commandId.length === 0 ||
		command.commandId.length > 160 ||
		!/^[0-9a-f]{64}$/u.test(command.payloadFingerprint) ||
		!Number.isSafeInteger(command.expectedRevision) ||
		command.expectedRevision < 0 ||
		typeof command.runId !== "string" ||
		command.runId.length === 0 ||
		typeof command.regionId !== "string" ||
		command.regionId.length === 0 ||
		(command.provenanceRef !== undefined &&
			(typeof command.provenanceRef !== "string" ||
				command.provenanceRef.length > 160))
	)
		return false;
	const principal = command.principal;
	if (
		typeof principal !== "object" ||
		principal === null ||
		!("kind" in principal)
	)
		return false;
	if (principal.kind === "system" || principal.kind === "citizen") {
		return (
			exactKeys(principal, ["kind", "principalId"]) &&
			typeof principal.principalId === "string" &&
			principal.principalId.length > 0
		);
	}
	if (principal.kind === "patron") {
		return (
			exactKeys(principal, ["kind", "principalId", "beneficiaryCitizenId"]) &&
			typeof principal.principalId === "string" &&
			principal.principalId.length > 0 &&
			typeof principal.beneficiaryCitizenId === "string" &&
			principal.beneficiaryCitizenId.length > 0
		);
	}
	return false;
}

function authorize(
	state: WorldState,
	command: WorldCommand,
): CommandRejectionCode | null {
	const principal = command.principal;
	const payload = command.payload;
	if (principal.kind === "system") {
		return payload.kind === "IssueCounsel" ||
			payload.kind === "ResolveCounsel" ||
			payload.kind === "RespondOnReturn"
			? "INVALID_PRINCIPAL"
			: null;
	}
	if (principal.kind === "patron") {
		return (payload.kind === "IssueCounsel" ||
			payload.kind === "RespondOnReturn") &&
			payload.citizenId === principal.beneficiaryCitizenId &&
			state.covenants.some(
				(covenant) =>
					covenant.patronPrincipalId === principal.principalId &&
					covenant.beneficiaryCitizenId === payload.citizenId &&
					covenant.grantRevision <= state.revision &&
					(covenant.revokeRevision === null ||
						state.revision < covenant.revokeRevision),
			)
			? null
			: "INVALID_PRINCIPAL";
	}
	const actor = "citizenId" in payload ? payload.citizenId : null;
	return actor === principal.principalId ? null : "INVALID_PRINCIPAL";
}

function publicEvent(payload: WorldEventPayload): Visibility {
	return payload.kind === "CounselIssued" ||
		payload.kind === "CounselInterpreted" ||
		payload.kind === "ReturnResponseRecorded" ||
		payload.kind === "BeliefChanged" ||
		payload.kind === "RelationshipChanged" ||
		payload.kind === "StandingPlanChanged"
		? {
				kind: "patron-visible-through-covenant",
				subjectCitizenId:
					"citizenId" in payload ? payload.citizenId : payload.fromCitizenId,
			}
		: { kind: "public" };
}

function pending(
	payload: WorldEventPayload,
	options: Partial<Omit<PendingEvent, "payload">> = {},
): PendingEvent {
	return {
		payload,
		visibility: options.visibility ?? publicEvent(payload),
		parentIndexes: options.parentIndexes ?? [],
		externalParents: options.externalParents ?? [],
		relatedEvents: options.relatedEvents ?? [],
	};
}

function commandEvents(
	state: WorldState,
	command: WorldCommand,
	eventIds: readonly string[],
	authoritativeHistory: readonly WorldEventEnvelope[],
): readonly PendingEvent[] {
	const payload = command.payload;
	switch (payload.kind) {
		case "Observe":
			return [
				pending({
					kind: "Observed",
					observerId:
						command.principal.kind === "citizen"
							? command.principal.principalId
							: citizenBySlug(state, "mara").citizenId,
					targetId: payload.targetId,
				}),
			];
		case "MoveCitizen": {
			const citizen = state.citizens[payload.citizenId];
			if (!citizen) throw new Error("ACTION_UNAVAILABLE");
			return [
				pending({
					kind: "CitizenMoved",
					citizenId: citizen.citizenId,
					fromPlaceId: citizen.placeId,
					toPlaceId: payload.toPlaceId,
					behavior: "fulfill-plan",
				}),
			];
		}
		case "GatherResource":
			return [
				pending({
					kind: "ResourceGathered",
					citizenId: payload.citizenId,
					siteId:
						payload.resource === "food"
							? "fields"
							: payload.resource === "water"
								? "spring"
								: "woods",
					resource: payload.resource,
					quantity: payload.quantity,
					behavior: "acquire-resource",
				}),
			];
		case "ConsumeResource":
			return [
				pending({
					kind: "ResourceConsumed",
					citizenId: payload.citizenId,
					resource: payload.resource,
					quantity: payload.quantity,
					need: payload.resource === "food" ? "hunger" : "thirst",
					relief: payload.quantity * 3_000,
					behavior: "maintain-self",
				}),
			];
		case "Exchange":
			return [
				pending({
					kind: "ExchangeCompleted",
					firstCitizenId: payload.firstCitizenId,
					secondCitizenId: payload.secondCitizenId,
					firstGives: payload.firstGives,
					secondGives: payload.secondGives,
					behavior: "respond-socially",
				}),
			];
		case "RepairMill":
			return [
				pending({
					kind: "MillRepaired",
					citizenId: payload.citizenId,
					woodUsed: 2,
					behavior: "fulfill-plan",
				}),
			];
		case "IssueCounsel":
			return [
				pending({
					kind: "CounselIssued",
					interventionId: payload.interventionId,
					citizenId: payload.citizenId,
					intent: payload.intent,
				}),
			];
		case "ResolveCounsel": {
			const citizen = state.citizens[payload.citizenId];
			if (!citizen) throw new Error("ACTION_UNAVAILABLE");
			if (
				payload.interventionId !== null &&
				state.lastCounsel?.interventionId !== payload.interventionId
			)
				throw new Error("ACTION_UNAVAILABLE");
			const externalParents: CausalParent[] =
				state.lastCounsel === null || payload.interventionId === null
					? []
					: [
							{
								eventId: state.lastCounsel.eventId,
								relation: "contributing",
								mechanismId: "riverhold-counsel-term-v1",
							},
						];
			const disposition =
				payload.interventionId === null
					? "not-applicable"
					: state.lastCounsel?.intent === payload.action
						? "accepted"
						: payload.action === "follow-plan"
							? "rejected"
							: "reinterpreted";
			const events: PendingEvent[] = [
				pending(
					{
						kind: "CounselInterpreted",
						citizenId: payload.citizenId,
						interventionId: payload.interventionId,
						action: payload.action,
						disposition,
						planId: citizen.standingPlan.planId,
					},
					{ externalParents },
				),
				pending(
					{
						kind: "TimeAdvanced",
						seconds: 21_600,
						needIncrease: 0,
					},
					{
						parentIndexes: [
							{
								index: 0,
								relation: "direct",
								mechanismId: "riverhold-delayed-resolution-v1",
							},
						],
					},
				),
			];
			if (payload.action === "verify-reserve") {
				events.push(
					pending(
						{
							kind: "BeliefChanged",
							citizenId: payload.citizenId,
							beliefId: `belief-verified-${eventIds[0]}`,
							proposition:
								"Iven's recount confirms a sealed public reserve for mill repair.",
							confidence: 9_500,
							sourceEventIds: [eventIds[0]!],
						},
						{
							parentIndexes: [
								{
									index: 0,
									relation: "direct",
									mechanismId: "riverhold-private-verification-v1",
								},
							],
							relatedEvents: [
								{
									eventId: eventIds[1]!,
									relation: "temporal-predecessor",
								},
							],
						},
					),
					pending(
						{
							kind: "RelationshipChanged",
							fromCitizenId: payload.citizenId,
							toCitizenId: citizenBySlug(state, "toma").citizenId,
							trustDelta: 500,
							strainDelta: -300,
							reasonCode: "private-verification-trust",
						},
						{
							parentIndexes: [
								{
									index: 2,
									relation: "direct",
									mechanismId: "riverhold-sourced-recount-trust-v1",
								},
							],
						},
					),
				);
			} else if (payload.action === "accuse-publicly") {
				const toma = citizenBySlug(state, "toma");
				events.push(
					pending(
						{
							kind: "StatementMade",
							speakerId: payload.citizenId,
							recipientIds: Object.keys(state.citizens),
							proposition:
								"Toma sealed public grain from view; the ledger is wrong.",
							allegation: true,
						},
						{
							visibility: { kind: "public" },
							parentIndexes: [
								{
									index: 0,
									relation: "direct",
									mechanismId: "riverhold-public-disclosure-v1",
								},
							],
						},
					),
					pending(
						{
							kind: "RelationshipChanged",
							fromCitizenId: payload.citizenId,
							toCitizenId: toma.citizenId,
							trustDelta: -2_500,
							strainDelta: 2_500,
							reasonCode: "public-accusation",
						},
						{
							parentIndexes: [
								{
									index: 2,
									relation: "direct",
									mechanismId: "riverhold-public-accusation-trust-v1",
								},
							],
						},
					),
					pending(
						{
							kind: "PetitionChanged",
							endorsementDelta: 3,
							reasonCode: "public-statement-endorsements",
						},
						{
							visibility: { kind: "public" },
							parentIndexes: [
								{
									index: 2,
									relation: "trigger",
									mechanismId: "riverhold-petition-threshold-v1",
								},
							],
						},
					),
				);
			} else {
				events.push(
					pending(
						{
							kind: "StandingPlanChanged",
							citizenId: payload.citizenId,
							planId: citizen.standingPlan.planId,
							status: "active",
							currentStepId: citizen.standingPlan.currentStepId,
						},
						{
							parentIndexes: [
								{
									index: 0,
									relation: "direct",
									mechanismId: "riverhold-follow-standing-plan-v1",
								},
							],
						},
					),
					pending(
						{
							kind: "PetitionChanged",
							endorsementDelta: 1,
							reasonCode: "independent-unresolved-ledger-interest",
						},
						{
							visibility: { kind: "public" },
							relatedEvents: [
								{
									eventId: eventIds[1]!,
									relation: "temporal-predecessor",
								},
								{
									eventId: eventIds[2]!,
									relation: "temporal-predecessor",
								},
							],
						},
					),
				);
			}
			return events;
		}
		case "RespondOnReturn":
			if (state.lastReturnResponse !== null)
				throw new Error("ACTION_UNAVAILABLE");
			{
				const prior = authoritativeHistory.find(
					(event) => event.eventId === payload.priorEventId,
				);
				const expectedKind =
					state.selectedCounselBranch === "verify-reserve"
						? "RelationshipChanged"
						: state.selectedCounselBranch === "accuse-publicly"
							? "PetitionChanged"
							: state.selectedCounselBranch === "follow-plan"
								? "PetitionChanged"
								: null;
				const expectedReasonCode =
					state.selectedCounselBranch === "verify-reserve"
						? "private-verification-trust"
						: state.selectedCounselBranch === "accuse-publicly"
							? "public-statement-endorsements"
							: state.selectedCounselBranch === "follow-plan"
								? "independent-unresolved-ledger-interest"
								: null;
				if (
					prior === undefined ||
					expectedKind === null ||
					prior.runId !== state.runId ||
					prior.regionId !== state.regionId ||
					prior.sequence >= state.nextSequence ||
					prior.provenance.kind !== "cognition" ||
					prior.eventPayload.kind !== expectedKind ||
					!("reasonCode" in prior.eventPayload) ||
					prior.eventPayload.reasonCode !== expectedReasonCode
				)
					throw new Error("INVALID_COMMAND");
			}
			return [
				pending(
					{
						kind: "ReturnResponseRecorded",
						responseId: payload.responseId,
						citizenId: payload.citizenId,
						action: payload.action,
						priorEventId: payload.priorEventId,
					},
					{
						relatedEvents: [
							{
								eventId: payload.priorEventId,
								relation: "response-to",
							},
						],
					},
				),
			];
		case "Advance": {
			const needIncrease = Math.min(10_000, Math.trunc(payload.seconds / 60));
			const events: PendingEvent[] = [
				pending({
					kind: "TimeAdvanced",
					seconds: payload.seconds,
					needIncrease,
				}),
			];
			const scheduledState: WorldState = {
				...state,
				simulationTime: state.simulationTime + payload.seconds,
				citizens: Object.fromEntries(
					Object.values(state.citizens).map((citizen) => [
						citizen.citizenId,
						{
							...citizen,
							needs: {
								hunger: Math.min(10_000, citizen.needs.hunger + needIncrease),
								thirst: Math.min(10_000, citizen.needs.thirst + needIncrease),
								rest: Math.min(
									10_000,
									citizen.needs.rest + Math.trunc(needIncrease / 2),
								),
							},
						},
					]),
				),
			};
			for (const scheduled of scheduleAutonomousActions(
				scheduledState,
				state.simulationTime + payload.seconds,
			)) {
				events.push(
					pending(scheduled.payload, {
						parentIndexes: [
							{
								index: 0,
								relation: "trigger",
								mechanismId: "riverhold-scheduled-boundary-v1",
							},
						],
					}),
				);
			}
			return events;
		}
	}
}

function receipt(
	state: WorldState,
	command: WorldCommand,
	head: string,
	outcome: "accepted" | "rejected",
	rejectionCode: CommandRejectionCode | null,
	events: readonly WorldEventEnvelope[],
	resultingRevision: number,
): CommandReceipt {
	return {
		schemaVersion: "eonfolk-command-receipt-v1",
		runId: state.runId,
		regionId: state.regionId,
		commandId: command.commandId,
		payloadFingerprint: command.payloadFingerprint,
		principal: command.principal,
		expectedRevision: command.expectedRevision,
		actualRevision: state.revision,
		outcome,
		eventInterval:
			events.length === 0
				? null
				: {
						fromSequenceInclusive: events[0]!.sequence,
						toSequenceExclusive: events.at(-1)!.sequence + 1,
						eventIds: events.map((event) => event.eventId),
					},
		rejectionCode,
		resultingRevision,
		resultingWorldHeadHash: head,
		createdSimulationTime: state.simulationTime,
		fencingToken: 0,
	};
}

function rejected(
	state: WorldState,
	command: WorldCommand,
	priorStateHash: string,
	priorWorldHeadHash: string,
	code: CommandRejectionCode,
): PreparedTransition {
	return {
		accepted: false,
		priorState: state,
		postState: state,
		priorStateHash,
		finalStateHash: priorStateHash,
		priorWorldHeadHash,
		resultingWorldHeadHash: priorWorldHeadHash,
		command,
		events: [],
		batchHeader: null,
		receipt: receipt(
			state,
			command,
			priorWorldHeadHash,
			"rejected",
			code,
			[],
			state.revision,
		),
	};
}

export async function createWorldCommand<
	P extends WorldCommand["payload"],
>(input: {
	readonly commandId: string;
	readonly expectedRevision: number;
	readonly principal: WorldCommand["principal"];
	readonly runId: string;
	readonly regionId: string;
	readonly payload: P;
	readonly provenanceRef?: string;
}): Promise<WorldCommand<P>> {
	return {
		schemaVersion: PROTOCOL_SCHEMA_VERSION,
		commandId: input.commandId,
		payloadFingerprint: await derivePayloadFingerprint(input.payload),
		expectedRevision: input.expectedRevision,
		principal: input.principal,
		runId: input.runId,
		regionId: input.regionId,
		payload: input.payload,
		...(input.provenanceRef === undefined
			? {}
			: { provenanceRef: input.provenanceRef }),
	};
}

export async function prepareTransition(
	state: WorldState,
	priorWorldHeadHash: string,
	command: WorldCommand,
	authoritativeHistory: readonly WorldEventEnvelope[] = [],
): Promise<PreparedTransition> {
	assertWorldInvariants(state);
	const priorStateHash = await stateHash(state);
	if (command.runId !== state.runId || command.regionId !== state.regionId)
		return rejected(
			state,
			command,
			priorStateHash,
			priorWorldHeadHash,
			"RUN_REGION_MISMATCH",
		);
	if (!validCommandShape(command) || !validPayload(command.payload))
		return rejected(
			state,
			command,
			priorStateHash,
			priorWorldHeadHash,
			"INVALID_COMMAND",
		);
	if (command.expectedRevision !== state.revision)
		return rejected(
			state,
			command,
			priorStateHash,
			priorWorldHeadHash,
			"STALE_REVISION",
		);
	if (
		(await derivePayloadFingerprint(command.payload)) !==
		command.payloadFingerprint
	)
		return rejected(
			state,
			command,
			priorStateHash,
			priorWorldHeadHash,
			"BAD_FINGERPRINT",
		);
	const authorization = authorize(state, command);
	if (authorization !== null)
		return rejected(
			state,
			command,
			priorStateHash,
			priorWorldHeadHash,
			authorization,
		);

	try {
		const provisionalCount =
			command.payload.kind === "ResolveCounsel" &&
			command.payload.action === "accuse-publicly"
				? 5
				: command.payload.kind === "ResolveCounsel"
					? 4
					: command.payload.kind === "Advance"
						? 9
						: 1;
		const worldSeed = bytesFromHex(state.worldSeedHex, 32);
		const eventIds = await Promise.all(
			Array.from({ length: provisionalCount }, (_, offset) =>
				stableId("event", worldSeed, state.nextCreationSequence + offset),
			),
		);
		const pendingEvents = commandEvents(
			state,
			command,
			eventIds,
			authoritativeHistory,
		);
		if (pendingEvents.length < 1 || pendingEvents.length > 32)
			throw new Error("INVALID_COMMAND");
		if (pendingEvents.length !== eventIds.length) {
			eventIds.splice(pendingEvents.length);
			while (eventIds.length < pendingEvents.length) {
				eventIds.push(
					await stableId(
						"event",
						worldSeed,
						state.nextCreationSequence + eventIds.length,
					),
				);
			}
		}
		const batchId = await deriveBatchId(
			state.runId,
			state.regionId,
			state.revision,
			command.commandId,
		);
		let current = state;
		let preHash = priorStateHash;
		const events: WorldEventEnvelope[] = [];
		for (let index = 0; index < pendingEvents.length; index += 1) {
			const specification = pendingEvents[index]!;
			const isFinal = index === pendingEvents.length - 1;
			const eventId = eventIds[index]!;
			const causalParents: CausalParent[] = [
				...specification.externalParents,
				...specification.parentIndexes.map((parent) => {
					if (parent.index >= index)
						throw new Error("causal parent must precede child");
					return {
						eventId: eventIds[parent.index]!,
						relation: parent.relation,
						mechanismId: parent.mechanismId,
					};
				}),
			];
			if (
				new Set(causalParents.map((parent) => parent.eventId)).size !==
				causalParents.length
			)
				throw new Error("duplicate causal parent");
			const sequence = current.nextSequence;
			const postState = reducePayload(current, specification.payload, {
				eventId,
				sequence,
				finalRevision: isFinal ? state.revision + 1 : null,
			});
			const postHash = await stateHash(postState);
			const provenance =
				command.payload.kind === "IssueCounsel" ||
				command.payload.kind === "RespondOnReturn"
					? {
							kind: "patron-intervention" as const,
							commandId: command.commandId,
							interventionId:
								command.payload.kind === "IssueCounsel"
									? command.payload.interventionId
									: command.payload.responseId,
						}
					: command.payload.kind === "ResolveCounsel"
						? {
								kind: "cognition" as const,
								commandId: command.commandId,
								...(command.payload.interventionId === null
									? {}
									: { interventionId: command.payload.interventionId }),
								decisionId: command.payload.decisionId,
								proposalId: command.payload.proposalId,
							}
						: { kind: "simulation" as const, commandId: command.commandId };
			const withoutHash = {
				schemaVersion: PROTOCOL_SCHEMA_VERSION,
				engineVersion: ENGINE_VERSION,
				eventId,
				runId: state.runId,
				regionId: state.regionId,
				sequence,
				simulationTime: postState.simulationTime,
				eventPayload: specification.payload,
				causalParents,
				relatedEvents: specification.relatedEvents,
				visibility: specification.visibility,
				provenance,
				preStateHash: preHash,
				postStateHash: postHash,
				batchId,
			};
			const envelope: WorldEventEnvelope = {
				...withoutHash,
				eventHash: await deriveEventHash(withoutHash),
			};
			events.push(envelope);
			current = postState;
			preHash = postHash;
		}
		const finalStateHash = preHash;
		const digest = await batchHash({
			runId: state.runId,
			regionId: state.regionId,
			batchId,
			priorWorldHeadHash,
			firstSequence: events[0]!.sequence,
			eventHashes: events.map((event) => event.eventHash),
			payloadFingerprint: command.payloadFingerprint,
			resultRevision: current.revision,
			finalStateHash,
		});
		const batchHeader: WorldBatchHeader = {
			schemaVersion: PROTOCOL_SCHEMA_VERSION,
			runId: state.runId,
			regionId: state.regionId,
			batchId,
			priorWorldHeadHash,
			firstSequence: events[0]!.sequence,
			eventCount: events.length,
			eventHashes: events.map((event) => event.eventHash),
			payloadFingerprint: command.payloadFingerprint,
			resultRevision: current.revision,
			finalStateHash,
			batchHash: digest,
		};
		return {
			accepted: true,
			priorState: state,
			postState: current,
			priorStateHash,
			finalStateHash,
			priorWorldHeadHash,
			resultingWorldHeadHash: digest,
			command,
			events,
			batchHeader,
			receipt: receipt(
				state,
				command,
				digest,
				"accepted",
				null,
				events,
				current.revision,
			),
		};
	} catch (error) {
		if (
			error instanceof Error &&
			["ACTION_UNAVAILABLE", "INVALID_COMMAND"].includes(error.message)
		) {
			return rejected(
				state,
				command,
				priorStateHash,
				priorWorldHeadHash,
				error.message as CommandRejectionCode,
			);
		}
		throw error;
	}
}
