import {
	buildDecisionContext,
	createCognitiveDecisionRecord,
	riverholdCounselCatalog,
	standardBrain,
} from "@eonfolk/cognition";
import type {
	JsonValue,
	PersistencePort,
	DecisionRecord as StoredDecisionRecord,
	WorldBatchRecord,
	WorldEventRecord,
	WorldHead,
} from "@eonfolk/persistence";
import {
	bytesFromHex,
	type CognitiveDecisionRecord,
	type DecisionContext,
	type IntentProposal,
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
): RiverholdProjection {
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
					? "Mara recorded Iven's recount; public understanding still lags."
					: "The public ledger and open-bin count still differ.",
		citizens: [],
		resources: { food: 0, water: 0, wood: 0 },
		worldNotices:
			branch === "accuse-now"
				? ["Petition gained three endorsements", "Toma's trust strained"]
				: branch === "verify-private"
					? ["Sourced reserve belief recorded", "Public count unresolved"]
					: ["Eight citizens act on Standing Plans", "Ledger mismatch remains"],
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
					? "Mara recorded a sourced belief that Iven's recount confirmed the reserve."
					: branch === "abstain"
						? "Mara continued her existing Standing Plan; the mismatch remained unresolved."
						: null,
		whileAway: summaryVisible
			? branch === "accuse-now"
				? [
						"The petition retained three new endorsements.",
						"Mara and Toma's recorded trust remained strained.",
						"Citizens continued their bounded routines for one simulated day.",
					]
				: [
						"Citizens continued their bounded routines for one simulated day.",
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

const citizenPositions: Readonly<
	Record<string, { readonly x: number; readonly y: number }>
> = {
	mara: { x: 45, y: 45 },
	toma: { x: 60, y: 50 },
	iven: { x: 70, y: 44 },
	sela: { x: 28, y: 62 },
	rowan: { x: 17, y: 37 },
	neri: { x: 37, y: 73 },
	odo: { x: 80, y: 67 },
	els: { x: 87, y: 34 },
};

function positions(slug: string): { x: number; y: number } {
	return citizenPositions[slug] ?? { x: 50, y: 50 };
}

function activityFor(citizen: WorldState["citizens"][string]): {
	activity: string;
	activityKind: RiverholdProjection["citizens"][number]["activityKind"];
} {
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
	#interpretation: InterpretationProjection | null = null;
	#requestedCounsel: CounselIntent | null = null;
	#secondAction: string | null = null;

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
		this.#head = committed.head;
		if (committed.head.revision === 0) {
			this.#state = genesis.state;
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
		this.#events = events.map((event) =>
			asObject<WorldEventEnvelope>(event.data),
		);
		const replay = await replayLedger({
			snapshotState: genesis.state,
			snapshotStateHash: genesis.initialStateHash,
			baseWorldHeadHash: genesis.genesisWorldHeadHash,
			headers: batches.map((batch) => asObject<WorldBatchHeader>(batch.data)),
			events: this.#events,
		});
		if (
			replay.stateHash !== committed.head.stateHash ||
			replay.worldHeadHash !== committed.head.worldHeadHash
		)
			throw new Error("durable world head does not match deterministic replay");
		this.#state = replay.state;
		return this.#project();
	}

	async #commit(
		prepared: PreparedTransition,
		decision: CognitiveDecisionRecord | null = null,
	): Promise<void> {
		if (!prepared.accepted || prepared.batchHeader === null)
			throw new Error(prepared.receipt.rejectionCode ?? "command rejected");
		const head = this.#requireHead();
		const interval = prepared.receipt.eventInterval;
		if (interval === null)
			throw new Error("accepted command has no event interval");
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
		const postHead: WorldHead = {
			runId: prepared.postState.runId,
			regionId: prepared.postState.regionId,
			revision: prepared.postState.revision,
			lastSequence: prepared.postState.nextSequence - 1,
			stateHash: prepared.finalStateHash,
			worldHeadHash: prepared.resultingWorldHeadHash,
			fencingToken: head.fencingToken,
		};
		await this.#persistence.commitTransition({
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
			receipt: {
				schemaVersion: prepared.receipt.schemaVersion,
				runId: prepared.receipt.runId,
				regionId: prepared.receipt.regionId,
				commandId: prepared.receipt.commandId,
				payloadFingerprint: prepared.receipt.payloadFingerprint,
				outcome: "accepted",
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
			},
			decision: storedDecision,
			postHead,
		});
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
		return prepareTransition(state, this.#requireHead().worldHeadHash, command);
	}

	async #resolveCounsel(counsel: CounselIntent): Promise<void> {
		let state = this.#requireState();
		const mara = citizenBySlug(state, "mara");
		const intent = requestedIntent(counsel);
		let interventionId: string | null = null;
		if (intent !== null) {
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
			decisiveTerms: proposal.explanation.decisiveReasonCodes,
		};
	}

	async dispatch(intent: RiverholdIntent): Promise<RiverholdProjection> {
		switch (intent.kind) {
			case "follow-mara":
				this.#phase = "following";
				break;
			case "investigate-count":
				this.#phase = "investigated";
				break;
			case "open-counsel":
				this.#phase = "counsel";
				break;
			case "offer-counsel":
				await this.#resolveCounsel(intent.counsel);
				this.#phase = "consequence";
				break;
			case "leave-checkpoint":
				if (this.#requireState().selectedCounselBranch === null)
					throw new Error("A resolved branch is required before checkpointing");
				this.#phase = "checkpoint";
				break;
			case "confirm-advance": {
				const transition = await this.#worldCommand("catch-up-day", {
					kind: "Advance",
					seconds: 86_400,
				});
				await this.#commit(transition);
				this.#phase = "return";
				break;
			}
			case "take-second-action":
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
				this.#secondAction = intent.actionId;
				this.#phase = "chronicle";
				break;
			case "reset-local-proof":
				throw new Error("RESET_REQUIRES_DATABASE_REOPEN");
		}
		return this.#project();
	}

	#project(): RiverholdProjection {
		const state = this.#requireState();
		const branch =
			state.selectedCounselBranch === null
				? null
				: actionToBranch(state.selectedCounselBranch);
		const base = baseProjection(this.#phase, branch, this.#secondAction);
		const citizens = Object.values(state.citizens).map((citizen) => ({
			id: citizen.citizenId,
			name: citizen.name,
			role: citizen.role,
			...activityFor(citizen),
			...positions(citizen.slug),
			...(citizen.slug === "mara" ? { focal: true as const } : {}),
		}));
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
		const chronicle = this.#chronicle(branch);
		const story =
			this.#phase === "chronicle" && chronicle.length > 0
				? {
						heading:
							this.#requestedCounsel === "abstain"
								? "YOU OFFERED NO ADVICE"
								: `YOU ADVISED: ${this.#requestedCounsel ?? "before leaving"}`,
						choice: chronicle[0]?.title ?? "Mara chose for herself",
						followed: chronicle[1]?.title ?? "Riverhold responded",
						unresolved:
							chronicle[2]?.title ?? "UNRESOLVED: Riverhold continues",
					}
				: null;
		return Object.freeze({
			...base,
			day: Math.floor(state.simulationTime / 86_400) + 18,
			citizens: Object.freeze(citizens),
			resources: Object.freeze({ ...state.settlementInventory }),
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

	#chronicle(branch: CounselIntent | null): ChronicleBeatProjection[] {
		if (branch === null) return [];
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
		return projected.beats.map((beat, index) => {
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
			return {
				id: `beat:${index + 1}`,
				timeLabel: `0${index}:${index * 6}`,
				eyebrow: sentence?.relation.toUpperCase() ?? "FACT",
				title: beat.text,
				body:
					index === 2
						? projected.unresolvedTension
						: sentence?.relation === "allegation"
							? "This is an in-world allegation, not proof. The attributed statement and its effects remain distinct."
							: "This sentence is derived from the authorized events listed below.",
				evidence,
			};
		});
	}

	#requireState(): WorldState {
		if (this.#state === null) throw new Error("runtime is not initialized");
		return this.#state;
	}

	#requireHead(): WorldHead {
		if (this.#head === null) throw new Error("runtime is not initialized");
		return this.#head;
	}
}
