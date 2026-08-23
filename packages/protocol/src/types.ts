export type RunId = string;
export type RegionId = string;
export type CitizenId = string;
export type EventId = string;
export type CommandId = string;
export type DecisionId = string;
export type ProposalId = string;
export type PlanId = string;
export type ResourceKind = "food" | "water" | "wood";
export type ReturnResponseAction =
	| "publish-verified-count"
	| "observe"
	| "repair-trust"
	| "uphold-petition"
	| "ask-iven";
export type BehaviorFamily =
	| "maintain-self"
	| "acquire-resource"
	| "fulfill-plan"
	| "respond-socially";

export type AffordanceKind =
	| "exchange"
	| "gather-food"
	| "gather-water"
	| "gather-wood"
	| "repair"
	| "inspect";

export interface AuthoritativeAffordance {
	readonly affordanceId: string;
	readonly placeId: string;
	readonly kind: AffordanceKind;
	readonly capacity: number;
}

export interface TaskReservation {
	readonly taskId: string;
	readonly affordanceId: string;
	readonly citizenIds: readonly CitizenId[];
	readonly behavior: BehaviorFamily;
	readonly reservedAtSimulationTime: number;
}

export interface SemanticTravelState {
	readonly travelId: string;
	readonly originPlaceId: string;
	readonly destinationPlaceId: string;
	readonly routeId: string;
	readonly departureSimulationTime: number;
	readonly expectedArrivalSimulationTime: number;
	readonly task: BehaviorFamily;
}

export const PROTOCOL_SCHEMA_VERSION = "1" as const;
export const ENGINE_VERSION = "1" as const;
export const DETERMINISM_VERSION = "eonfolk-determinism-v2" as const;
export const REPLAY_VERSION = "eonfolk-replay-v1" as const;
export const COGNITION_VERSION = "eonfolk-cognition-v1" as const;
export const VISIBILITY_POLICY_VERSION = "riverhold-visibility-v1" as const;

export type Principal =
	| { readonly kind: "system"; readonly principalId: string }
	| {
			readonly kind: "patron";
			readonly principalId: string;
			readonly beneficiaryCitizenId: CitizenId;
	  }
	| { readonly kind: "citizen"; readonly principalId: CitizenId };

export type WorldCommandPayload =
	| { readonly kind: "Observe"; readonly targetId: string }
	| {
			readonly kind: "MoveCitizen";
			readonly citizenId: CitizenId;
			readonly toPlaceId: string;
	  }
	| {
			readonly kind: "GatherResource";
			readonly citizenId: CitizenId;
			readonly resource: ResourceKind;
			readonly quantity: number;
	  }
	| {
			readonly kind: "ConsumeResource";
			readonly citizenId: CitizenId;
			readonly resource: "food" | "water";
			readonly quantity: number;
	  }
	| {
			readonly kind: "Exchange";
			readonly firstCitizenId: CitizenId;
			readonly secondCitizenId: CitizenId;
			readonly firstGives: {
				readonly resource: ResourceKind;
				readonly quantity: number;
			};
			readonly secondGives: {
				readonly resource: ResourceKind;
				readonly quantity: number;
			};
	  }
	| { readonly kind: "RepairMill"; readonly citizenId: CitizenId }
	| {
			readonly kind: "IssueCounsel";
			readonly interventionId: string;
			readonly citizenId: CitizenId;
			readonly intent: "verify-reserve" | "accuse-publicly";
	  }
	| {
			readonly kind: "ResolveCounsel";
			readonly citizenId: CitizenId;
			readonly interventionId: string | null;
			readonly decisionId: DecisionId;
			readonly proposalId: ProposalId;
			readonly action: "verify-reserve" | "accuse-publicly" | "follow-plan";
	  }
	| {
			readonly kind: "RespondOnReturn";
			readonly responseId: string;
			readonly citizenId: CitizenId;
			readonly action: ReturnResponseAction;
			readonly priorEventId: EventId;
	  }
	| { readonly kind: "Advance"; readonly seconds: number };

export interface WorldCommand<
	P extends WorldCommandPayload = WorldCommandPayload,
> {
	readonly schemaVersion: typeof PROTOCOL_SCHEMA_VERSION;
	readonly commandId: CommandId;
	readonly payloadFingerprint: string;
	readonly expectedRevision: number;
	readonly principal: Principal;
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly payload: P;
	readonly provenanceRef?: string;
}

export type CausalRelation = "direct" | "trigger" | "contributing";
export type RelatedRelation = "temporal-predecessor" | "response-to";

export interface CausalParent {
	readonly eventId: EventId;
	readonly relation: CausalRelation;
	readonly mechanismId: string;
}

export interface RelatedEvent {
	readonly eventId: EventId;
	readonly relation: RelatedRelation;
}

export type Visibility =
	| { readonly kind: "public" }
	| {
			readonly kind: "participant-private";
			readonly principalIds: readonly string[];
	  }
	| { readonly kind: "citizen-private"; readonly subjectCitizenId: CitizenId }
	| {
			readonly kind: "patron-visible-through-covenant";
			readonly subjectCitizenId: CitizenId;
	  }
	| { readonly kind: "moderator-only"; readonly roleIds: readonly string[] }
	| {
			readonly kind: "implementation-only";
			readonly testRunIds: readonly string[];
	  };

export interface Provenance {
	readonly kind: "simulation" | "cognition" | "patron-intervention";
	readonly commandId: CommandId;
	readonly interventionId?: string;
	readonly decisionId?: DecisionId;
	readonly proposalId?: ProposalId;
}

export interface SponsorshipEstablishedPayload {
	readonly kind: "SponsorshipEstablished";
	readonly patronPrincipalId: string;
	readonly citizenId: CitizenId;
	readonly settlementId: string;
}

export type WorldEventPayload =
	| {
			readonly kind: "Observed";
			readonly observerId: CitizenId;
			readonly targetId: string;
	  }
	| {
			readonly kind: "CitizenMoved";
			readonly citizenId: CitizenId;
			readonly fromPlaceId: string;
			readonly toPlaceId: string;
			readonly behavior: BehaviorFamily;
	  }
	| ({
			readonly kind: "TravelStarted";
			readonly citizenId: CitizenId;
	  } & SemanticTravelState)
	| {
			readonly kind: "TravelArrived";
			readonly citizenId: CitizenId;
			readonly travelId: string;
			readonly destinationPlaceId: string;
			readonly behavior: BehaviorFamily;
	  }
	| {
			readonly kind: "ResourceGathered";
			readonly citizenId: CitizenId;
			readonly siteId: string;
			readonly resource: ResourceKind;
			readonly quantity: number;
			readonly behavior: BehaviorFamily;
	  }
	| {
			readonly kind: "ResourceConsumed";
			readonly citizenId: CitizenId;
			readonly resource: "food" | "water";
			readonly quantity: number;
			readonly need: "hunger" | "thirst";
			readonly relief: number;
			readonly behavior: BehaviorFamily;
	  }
	| {
			readonly kind: "ExchangeCompleted";
			readonly firstCitizenId: CitizenId;
			readonly secondCitizenId: CitizenId;
			readonly firstGives: {
				readonly resource: ResourceKind;
				readonly quantity: number;
			};
			readonly secondGives: {
				readonly resource: ResourceKind;
				readonly quantity: number;
			};
			readonly behavior: BehaviorFamily;
	  }
	| {
			readonly kind: "MillRepaired";
			readonly citizenId: CitizenId;
			readonly woodUsed: 2;
			readonly behavior: BehaviorFamily;
	  }
	| {
			readonly kind: "TimeAdvanced";
			readonly seconds: number;
			readonly needIncrease: number;
	  }
	| {
			readonly kind: "CounselIssued";
			readonly interventionId: string;
			readonly citizenId: CitizenId;
			readonly intent: "verify-reserve" | "accuse-publicly";
	  }
	| {
			readonly kind: "CounselInterpreted";
			readonly citizenId: CitizenId;
			readonly interventionId: string | null;
			readonly action: "verify-reserve" | "accuse-publicly" | "follow-plan";
			readonly disposition:
				| "accepted"
				| "rejected"
				| "reinterpreted"
				| "not-applicable";
			readonly planId: PlanId;
	  }
	| {
			readonly kind: "ReturnResponseRecorded";
			readonly responseId: string;
			readonly citizenId: CitizenId;
			readonly action: ReturnResponseAction;
			readonly priorEventId: EventId;
	  }
	| {
			readonly kind: "BeliefChanged";
			readonly citizenId: CitizenId;
			readonly beliefId: string;
			readonly proposition: string;
			readonly confidence: number;
			readonly sourceEventIds: readonly EventId[];
	  }
	| {
			readonly kind: "StatementMade";
			readonly speakerId: CitizenId;
			readonly recipientIds: readonly CitizenId[];
			readonly proposition: string;
			readonly allegation: boolean;
	  }
	| {
			readonly kind: "RelationshipChanged";
			readonly fromCitizenId: CitizenId;
			readonly toCitizenId: CitizenId;
			readonly trustDelta: number;
			readonly strainDelta: number;
			readonly reasonCode: string;
	  }
	| {
			readonly kind: "PetitionChanged";
			readonly endorsementDelta: number;
			readonly reasonCode: string;
	  }
	| {
			readonly kind: "StandingPlanChanged";
			readonly citizenId: CitizenId;
			readonly planId: PlanId;
			readonly status: "active" | "completed" | "blocked" | "abandoned";
			readonly currentStepId: string;
	  };

export interface WorldEventEnvelope<
	E extends
		| WorldEventPayload
		| SponsorshipEstablishedPayload = WorldEventPayload,
> {
	readonly schemaVersion: typeof PROTOCOL_SCHEMA_VERSION;
	readonly engineVersion: typeof ENGINE_VERSION;
	readonly eventId: EventId;
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly sequence: number;
	readonly simulationTime: number;
	readonly eventPayload: E;
	readonly causalParents: readonly CausalParent[];
	readonly relatedEvents: readonly RelatedEvent[];
	readonly visibility: Visibility;
	readonly provenance: Provenance;
	readonly preStateHash: string;
	readonly postStateHash: string;
	readonly batchId: string;
	readonly eventHash: string;
}

export interface WorldBatchHeader {
	readonly schemaVersion: typeof PROTOCOL_SCHEMA_VERSION;
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly batchId: string;
	readonly priorWorldHeadHash: string;
	readonly firstSequence: number;
	readonly eventCount: number;
	readonly eventHashes: readonly string[];
	readonly payloadFingerprint: string;
	readonly resultRevision: number;
	readonly finalStateHash: string;
	readonly batchHash: string;
}

export interface EventInterval {
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
	readonly eventIds: readonly EventId[];
}

export type CommandRejectionCode =
	| "ACTION_UNAVAILABLE"
	| "BAD_FINGERPRINT"
	| "INVALID_COMMAND"
	| "INVALID_PRINCIPAL"
	| "RUN_REGION_MISMATCH"
	| "STALE_REVISION"
	| "NO_OP";

export interface CommandReceipt {
	readonly schemaVersion: "eonfolk-command-receipt-v1";
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly commandId: CommandId;
	readonly payloadFingerprint: string;
	readonly principal: Principal;
	readonly expectedRevision: number;
	readonly actualRevision: number;
	readonly outcome: "accepted" | "rejected";
	readonly eventInterval: EventInterval | null;
	readonly rejectionCode: CommandRejectionCode | null;
	readonly resultingRevision: number;
	readonly resultingWorldHeadHash: string;
	readonly createdSimulationTime: number;
	readonly fencingToken: number;
}

export interface SnapshotRef {
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly snapshotId: string;
	readonly baseSequence: number;
	readonly stateHash: string;
	readonly baseWorldHeadHash: string;
}

export interface ReplayManifest {
	readonly schemaVersion: "eonfolk-replay-manifest-v1";
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly worldSeedHex: string;
	readonly experimentManifestHash: string;
	readonly snapshot: SnapshotRef;
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
	readonly engineVersion: typeof ENGINE_VERSION;
	readonly worldSchemaVersion: typeof PROTOCOL_SCHEMA_VERSION;
	readonly determinismVersion: typeof DETERMINISM_VERSION;
	readonly replayVersion: typeof REPLAY_VERSION;
	readonly expectedFinalStateHash: string;
	readonly expectedFinalWorldHeadHash: string;
	readonly presentation: {
		readonly title: string;
		readonly branch: string | null;
	};
}

export interface ExperimentManifest {
	readonly manifestVersion: "eonfolk-experiment-manifest-v1";
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly runKind: "canonical-local-proof";
	readonly worldSeedHex: string;
	readonly initialSnapshotRef: {
		readonly runId: RunId;
		readonly regionId: RegionId;
		readonly snapshotId: string;
		readonly baseSequence: 0;
		readonly stateHash: string;
	};
	readonly initialStateHash: string;
	readonly engineVersion: typeof ENGINE_VERSION;
	readonly worldSchemaVersion: typeof PROTOCOL_SCHEMA_VERSION;
	readonly determinismVersion: typeof DETERMINISM_VERSION;
	readonly replayVersion: typeof REPLAY_VERSION;
	readonly cognitionVersion: typeof COGNITION_VERSION;
	readonly standardBrainVersion: "riverhold-standard-brain-v1";
	readonly cognitionConfiguration: {
		readonly kind: "standard-brain";
		readonly decisionBudget: number;
	};
	readonly provider: null;
	readonly model: null;
	readonly modelVersion: null;
	readonly promptTemplateHash: null;
	readonly schemaHash: null;
	readonly artifactHash: null;
	readonly configuredInterventionProtocolIds: readonly string[];
	readonly parentRunId: null;
	readonly parentSnapshotRef: null;
	readonly manifestHash: string;
}

export type Viewer =
	| { readonly kind: "public" }
	| { readonly kind: "citizen"; readonly citizenId: CitizenId }
	| { readonly kind: "participant"; readonly principalId: string }
	| { readonly kind: "moderator"; readonly roleId: string }
	| { readonly kind: "implementation"; readonly testRunId: string };

export type ReadPurpose =
	| "decision-context"
	| "semantic-ui"
	| "patron-view"
	| "chronicle-private"
	| "chronicle-public"
	| "replay-private"
	| "export-owner"
	| "moderation"
	| "implementation-diagnostic";

export interface VisibleRecord<T = unknown> {
	readonly recordId: string;
	readonly createdRevision: number;
	readonly visibility: Visibility;
	readonly value: T;
}

export interface PatronCovenant {
	readonly patronPrincipalId: string;
	readonly beneficiaryCitizenId: CitizenId;
	readonly grantRevision: number;
	readonly revokeRevision: number | null;
}

export interface VisibilityContext {
	readonly policyVersion: typeof VISIBILITY_POLICY_VERSION;
	readonly covenants: readonly PatronCovenant[];
	readonly localOwnerPrincipalId: string;
	readonly nonproduction: boolean;
}

export interface NeedState {
	readonly hunger: number;
	readonly thirst: number;
	readonly rest: number;
}

export interface ValuePriority {
	readonly valueId: string;
	readonly rank: 1 | 2 | 3;
	readonly weight: number;
}

export interface RelationshipState {
	readonly relationshipId: string;
	readonly fromCitizenId: CitizenId;
	readonly toCitizenId: CitizenId;
	readonly familiarity: number;
	readonly trust: number;
	readonly strain: number;
	readonly lastMaterialEventId: EventId | null;
	readonly visibility: Visibility;
	readonly createdRevision: number;
}

export interface EpistemicRecord {
	readonly recordId: string;
	readonly kind:
		| "observation"
		| "private-knowledge"
		| "belief"
		| "memory"
		| "message-claim"
		| "reputation"
		| "commitment"
		| "value";
	readonly subjectCitizenId: CitizenId;
	readonly proposition: string;
	readonly confidence: number | null;
	readonly sourceIds: readonly string[];
	readonly visibility: Visibility;
	readonly createdRevision: number;
}

export interface StandingPlanStep {
	readonly stepId: string;
	readonly kind: string;
	readonly targetIds: readonly string[];
	readonly status: "pending" | "active" | "completed" | "blocked" | "abandoned";
	readonly children: readonly StandingPlanStep[];
}

export interface StandingPlan {
	readonly planId: PlanId;
	readonly version: number;
	readonly citizenId: CitizenId;
	readonly goalType: string;
	readonly targetIds: readonly string[];
	readonly steps: readonly StandingPlanStep[];
	readonly currentStepId: string;
	readonly commitmentId: string | null;
	readonly sourceId: string;
	readonly startBoundary: number;
	readonly expiryBoundary: number;
	readonly retriesRemaining: number;
	readonly replansRemaining: number;
	readonly status: "active" | "completed" | "blocked" | "abandoned";
}

export interface CitizenMindSnapshot {
	readonly citizenId: CitizenId;
	readonly values: readonly ValuePriority[];
	readonly relationships: readonly RelationshipState[];
	readonly records: readonly EpistemicRecord[];
	readonly standingPlan: StandingPlan;
}

export type DecisionReason =
	| "need-threshold"
	| "plan-boundary"
	| "important-offer"
	| "relationship-rupture"
	| "resource-shock"
	| "sponsor-counsel"
	| "scheduled-review";

export type CognitionAction =
	| { readonly kind: "VerifyReserve"; readonly targetCitizenId: CitizenId }
	| { readonly kind: "AccusePublicly"; readonly targetCitizenId: CitizenId }
	| { readonly kind: "FollowStandingPlan"; readonly planId: PlanId }
	| { readonly kind: "Move"; readonly toPlaceId: string }
	| {
			readonly kind: "Gather";
			readonly resource: ResourceKind;
			readonly siteId: string;
	  }
	| { readonly kind: "Consume"; readonly resource: "food" | "water" }
	| { readonly kind: "Exchange"; readonly counterpartyId: CitizenId }
	| { readonly kind: "RepairMill"; readonly millId: string }
	| {
			readonly kind: "TransportResource";
			readonly resourceTypeId: string;
			readonly quantity: number;
			readonly fromStorageId: string;
			readonly toStorageId: string;
	  }
	| {
			readonly kind: "WorkProject";
			readonly projectId: string;
			readonly milestoneId: string;
			readonly siteId: string;
	  }
	| {
			readonly kind: "ProposeProject";
			readonly projectKind: string;
			readonly settlementId: string;
			readonly siteId: string;
	  }
	| { readonly kind: "JoinMigration"; readonly migrationId: string };

export interface ActionCatalogEntry {
	readonly actionId: string;
	readonly action: CognitionAction;
	readonly publicPreconditions: readonly string[];
	readonly publicStakes: readonly string[];
	readonly tags: readonly (
		| "need"
		| "commitment"
		| "caution"
		| "candor"
		| "relationship"
		| "evidence"
		| "risk"
		| "counsel"
	)[];
	readonly evidenceRecordIds: readonly string[];
	readonly relationshipId: string | null;
	readonly risk: number;
	readonly counselAffinity: "verify-reserve" | "accuse-publicly" | "neutral";
}

export interface DecisionBudgets {
	readonly maxRecords: number;
	readonly maxBytes: number;
	readonly maxCandidates: number;
	readonly maxPlanDepth: number;
	readonly retries: 0;
}

export interface DecisionContext {
	readonly schemaVersion: "eonfolk-decision-context-v1";
	readonly contextId: string;
	readonly contextVersion: "1";
	readonly actorId: CitizenId;
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly revision: number;
	readonly simulationTime: number;
	readonly decisionReason: DecisionReason;
	readonly visibleRecords: readonly EpistemicRecord[];
	readonly values: readonly ValuePriority[];
	readonly relationships: readonly RelationshipState[];
	readonly activeStandingPlan: StandingPlan;
	readonly actionCatalogVersion: "riverhold-actions-v1";
	readonly actionCatalog: readonly ActionCatalogEntry[];
	readonly budgets: DecisionBudgets;
	readonly counselIntent: "verify-reserve" | "accuse-publicly" | null;
	readonly contextHash: string;
	readonly catalogHash: string;
}

export interface ScoreTerm {
	readonly code:
		| "plan"
		| "need"
		| "commitment"
		| "value"
		| "relationship"
		| "evidence"
		| "risk"
		| "counsel";
	readonly value: number;
	readonly sourceIds: readonly string[];
}

export interface DecisionExplanation {
	readonly selectedActionId: string;
	readonly templateId: string;
	readonly decisiveReasonCodes: readonly string[];
	readonly visibleRecordIdsRead: readonly string[];
	readonly relationshipIdsRead: readonly string[];
	readonly valueIdsRead: readonly string[];
	readonly commitmentIdsRead: readonly string[];
	readonly scoreTerms: readonly ScoreTerm[];
	readonly totalScore: number;
	readonly tieBreak: {
		readonly used: boolean;
		readonly draw: number | null;
		readonly tiedActionIds: readonly string[];
	};
	readonly counselDisposition:
		| "accepted"
		| "rejected"
		| "delayed"
		| "reinterpreted"
		| "not-applicable";
	readonly discardedCandidates: readonly {
		readonly actionId: string;
		readonly reasonCode: string;
	}[];
}

export interface IntentProposal {
	readonly schemaVersion: "eonfolk-intent-proposal-v1";
	readonly proposalId: ProposalId;
	readonly contextId: string;
	readonly actorId: CitizenId;
	readonly revision: number;
	readonly actionId: string;
	readonly action: CognitionAction;
	readonly planProposal: StandingPlan | null;
	readonly memoryProposal: {
		readonly summaryKey: string;
		readonly sourceIds: readonly string[];
	} | null;
	readonly provenance:
		| {
				readonly cognitionKind: "standard-brain";
				readonly cognitionVersion: typeof COGNITION_VERSION;
		  }
		| {
				readonly cognitionKind: "model";
				readonly cognitionVersion: typeof COGNITION_VERSION;
				readonly provider: string;
				readonly model: string;
				readonly modelVersion: string;
				readonly promptTemplateHash: string;
				readonly proposalSchemaHash: string;
				readonly artifactHash: string;
		  };
	readonly publicJustification: string;
	readonly explanation: DecisionExplanation;
	readonly proposalHash: string;
}

export interface CognitiveDecisionRecord {
	readonly schemaVersion: "eonfolk-cognitive-decision-record-v1";
	readonly recordVersion: "1";
	readonly decisionId: DecisionId;
	readonly decisionBoundaryId: string;
	readonly actorId: CitizenId;
	readonly runId: RunId;
	readonly regionId: RegionId;
	readonly revision: number;
	readonly simulationTime: number;
	readonly wholePreStateHash: string;
	readonly decisionReason: DecisionReason;
	readonly activeStandingPlanId: PlanId;
	readonly activeStandingPlanVersion: number;
	readonly suppliedRecordIds: readonly string[];
	readonly readRecordIds: readonly string[];
	readonly relationshipIds: readonly string[];
	readonly valueIds: readonly string[];
	readonly commitmentIds: readonly string[];
	readonly contextHash: string;
	readonly actionCatalogHash: string;
	readonly actionCatalogVersion: string;
	readonly budgets: DecisionBudgets;
	readonly cognitionConfigurationVersion: typeof COGNITION_VERSION;
	readonly cognitionKind: "standard-brain" | "model";
	readonly provider: string | null;
	readonly model: string | null;
	readonly modelVersion: string | null;
	readonly promptTemplateHash: string | null;
	readonly proposalSchemaHash: string | null;
	readonly artifactHash: string | null;
	readonly proposalCanonicalBytes: string | null;
	readonly proposalHash: string | null;
	readonly explanation: DecisionExplanation | null;
	readonly failureCode: "missing" | "timeout" | "malformed" | null;
	readonly validator: {
		readonly stage: "schema" | "authorization" | "domain" | "committed";
		readonly outcome: "accepted" | "rejected";
		readonly reason: string;
	};
	readonly proposedCommandId: CommandId | null;
	readonly receiptRef: CommandId | null;
	readonly acceptedEventInterval: EventInterval | null;
	readonly rationaleTemplateId: string;
	readonly subjectCitizenId: CitizenId;
	readonly sensitivity: "citizen-private-audit";
	readonly provenance: {
		readonly kind: "cognition-audit";
		readonly version: "1";
	};
	readonly decisionRecordHash: string;
}

export interface DecisionTraceProjection {
	readonly schemaVersion: "eonfolk-decision-trace-projection-v1";
	readonly decisionId: DecisionId;
	readonly viewer: Viewer;
	readonly purpose: ReadPurpose;
	readonly atRevision: number;
	readonly visibilityPolicyVersion: typeof VISIBILITY_POLICY_VERSION;
	readonly actorId: CitizenId;
	readonly decisionReason: DecisionReason;
	readonly publicJustification: string | null;
	readonly counselDisposition: DecisionExplanation["counselDisposition"] | null;
	readonly visibleRecords: readonly {
		readonly recordId: string;
		readonly kind: EpistemicRecord["kind"];
		readonly proposition: string;
	}[];
	readonly visibleRelationships: readonly {
		readonly relationshipId: string;
		readonly trust: number;
		readonly strain: number;
	}[];
	readonly acceptedEventIds: readonly EventId[];
}
