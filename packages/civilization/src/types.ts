import type {
	AgreementState,
	CapabilityId,
	CitizenId,
	CitizenMindSnapshot,
	CivilizationEventProvenance,
	FoundingId,
	HouseholdState,
	InstitutionState,
	MigrationId,
	MigrationState,
	ProductionProcess,
	ProductionRecipe,
	ProjectId,
	ProjectState,
	ResourceDefinition,
	ResourceTypeId,
	SettlementFoundingState,
	StockState,
	StorageState,
} from "@eonfolk/protocol";

export const CIVILIZATION_SOCIAL_SCHEMA_VERSION =
	"eonfolk-civilization-social-v1" as const;

export type CitizenResidenceState = "resident" | "travelling" | "departed";

/** Canonical person state. Names and generated-seed labels are deliberately absent. */
export interface CivilizationCitizenState {
	readonly schemaVersion: typeof CIVILIZATION_SOCIAL_SCHEMA_VERSION;
	readonly citizenId: CitizenId;
	readonly name: string;
	readonly valueIds: readonly string[];
	readonly settlementId: string;
	readonly siteId: string;
	readonly householdId: string | null;
	readonly primaryRoleId: string | null;
	readonly residenceState: CitizenResidenceState;
	readonly arrivedAtSimulationTime: number;
	readonly departedAtSimulationTime: number | null;
	readonly foodRequiredUnitsPerDay: number;
	readonly waterRequiredUnitsPerDay: number;
	readonly laborCapacitySecondsPerDay: number;
	readonly committedLaborSecondsPerDay: number;
	readonly lastSocialSimulationTime: number;
	readonly sourceEventIds: readonly string[];
}

export interface CivilizationRelationshipState {
	readonly schemaVersion: typeof CIVILIZATION_SOCIAL_SCHEMA_VERSION;
	readonly relationshipId: string;
	readonly fromCitizenId: CitizenId;
	readonly toCitizenId: CitizenId;
	readonly kind: "kin" | "household" | "friend" | "colleague" | "rival";
	readonly familiarityBasisPoints: number;
	readonly trustBasisPoints: number;
	readonly strainBasisPoints: number;
	readonly lastInteractionSimulationTime: number;
	readonly sourceEventIds: readonly string[];
}

export interface CivilizationSponsorshipState {
	readonly schemaVersion: "eonfolk-civilization-sponsorship-v1";
	readonly covenantId: string;
	readonly patronPrincipalId: string;
	readonly beneficiaryCitizenId: CitizenId;
	readonly settlementId: string;
	readonly establishedAtSimulationTime: number;
	readonly establishedAtRevision: number;
	readonly sourceEventId: string;
}

export interface CivilizationPatronAbstentionState {
	readonly schemaVersion: "eonfolk-civilization-patron-abstention-v1";
	readonly abstentionId: string;
	readonly covenantId: string;
	readonly patronPrincipalId: string;
	readonly citizenId: CitizenId;
	readonly reason: "withhold-counsel";
	readonly recordedAtSimulationTime: number;
	readonly recordedAtRevision: number;
	readonly sourceEventId: string;
}

/** Persisted typed Mind state. Reality may authorize against it but never invent it. */
export interface CivilizationMindState {
	readonly schemaVersion: "eonfolk-civilization-mind-v1";
	readonly citizenId: CitizenId;
	readonly snapshot: CitizenMindSnapshot;
	readonly committedAtRevision: number;
	readonly committedAtSimulationTime: number;
}

export interface CivilizationCounselState {
	readonly schemaVersion: "eonfolk-civilization-counsel-v1";
	readonly interventionId: string;
	readonly covenantId: string;
	readonly citizenId: CitizenId;
	readonly intent: "verify-reserve" | "accuse-publicly";
	readonly sourceEventId: string;
	readonly issuedAtSimulationTime: number;
	readonly resolution: {
		readonly sourceEventId: string;
		readonly decisionId: string;
		readonly proposalId: string;
		readonly action: "verify-reserve" | "accuse-publicly" | "follow-plan";
		readonly disposition: "accepted" | "delayed" | "rejected" | "reinterpreted";
	} | null;
}

export type CivilizationCounselOutcomeEffect =
	| {
			readonly kind: "reserve-inspection";
			readonly observationRecordId: string;
			readonly stockObservations: readonly {
				readonly stockId: string;
				readonly resourceTypeId: string;
				readonly quantity: number;
			}[];
	  }
	| {
			readonly kind: "public-allegation";
			readonly statementRecordId: string;
			readonly targetCitizenId: CitizenId;
			readonly relationshipId: string;
			readonly trustDeltaBasisPoints: number;
			readonly strainDeltaBasisPoints: number;
	  }
	| {
			readonly kind: "plan-continuation";
			readonly planId: string;
	  };

export interface CivilizationCounselOutcomeState {
	readonly schemaVersion: "eonfolk-civilization-counsel-outcome-v1";
	readonly outcomeId: string;
	readonly interventionId: string;
	readonly citizenId: CitizenId;
	readonly interpretationEventId: string;
	readonly recordedAtSimulationTime: number;
	readonly recordedAtRevision: number;
	readonly sourceEventId: string;
	readonly effect: CivilizationCounselOutcomeEffect;
}

export interface GroundedPressureState {
	readonly schemaVersion: "eonfolk-grounded-pressure-v1";
	readonly dataClass: "canonical-derived" | "actor-estimate";
	readonly subjectCitizenId: CitizenId;
	readonly kind: "food" | "water" | "housing" | "labor" | "travel" | "social";
	readonly severityBasisPoints: number;
	readonly observedAtSimulationTime: number;
	readonly sourceStockIds: readonly string[];
	readonly sourceReferenceIds: readonly string[];
	readonly provenanceVersion: "grounded-pressure-v1";
}

export interface ActorStockObservation {
	readonly stockId: string;
	readonly estimatedQuantity: number;
	readonly observedAtSimulationTime: number;
	readonly sourceEventIds: readonly string[];
}

export interface PressureDerivationPolicy {
	readonly foodResourceTypeIds: readonly string[];
	readonly waterResourceTypeIds: readonly string[];
	readonly habitableBuildingIds: readonly string[];
	readonly quantityObservationGranularity: number;
	readonly socialIntervalSeconds: number;
}

export interface CollectiveProjectAffordance {
	readonly actionId: string;
	readonly actorCitizenId: CitizenId;
	readonly institutionId: string;
	readonly projectId: string;
	readonly milestoneId: string;
	readonly siteId: string;
	readonly authorityRoleId: string;
	readonly policyAgreementId: string;
	readonly evidenceSourceEventIds: readonly string[];
}

export interface CivilizationReferences {
	readonly citizenIds: readonly string[];
	readonly settlementIds: readonly string[];
	readonly territoryIds: readonly string[];
	readonly siteIds: readonly string[];
	readonly buildingKindsBySite: Readonly<Record<string, readonly string[]>>;
	readonly capabilitiesByCitizen: Readonly<
		Record<string, Readonly<Record<CapabilityId, number>>>
	>;
}

export type AccountingKind =
	| "stock-created"
	| "transfer"
	| "transport"
	| "recipe-input"
	| "recipe-output"
	| "project-consumption"
	| "need-consumption";

export interface StockDelta {
	readonly stockId: string;
	readonly quantityDelta: number;
}

export interface AccountingEntry {
	readonly entryId: string;
	readonly kind: AccountingKind;
	readonly simulationTime: number;
	readonly stockDeltas: readonly StockDelta[];
	readonly recipeId: string | null;
	readonly projectId: string | null;
	/** Present only for a person's authoritative daily need consumption. */
	readonly subjectCitizenId?: CitizenId;
}

/** Persisted fact of what a resident could actually consume during one scheduler step. */
export interface DailyNeedOutcome {
	readonly outcomeId: string;
	readonly citizenId: CitizenId;
	readonly evaluatedAtSimulationTime: number;
	readonly foodRequiredUnits: number;
	readonly foodConsumedUnits: number;
	readonly foodResourceTypeIds: readonly ResourceTypeId[];
	readonly waterRequiredUnits: number;
	readonly waterConsumedUnits: number;
	readonly waterResourceTypeIds: readonly ResourceTypeId[];
	readonly sourceStockIds: readonly string[];
}

/** A completed project's canonical physical consequence, separate from presentation. */
export interface PhysicalProjectMaterialization {
	readonly projectId: ProjectId;
	readonly siteId: string;
	readonly buildingKind: string;
	readonly materializedAtSimulationTime: number;
}

export interface ProcessBinding {
	readonly inputStockIds: Readonly<Record<ResourceTypeId, string>>;
	readonly outputStockIds: Readonly<Record<ResourceTypeId, string>>;
}

export interface PhysicalResourceRequirement {
	readonly resourceTypeId: ResourceTypeId;
	readonly quantity: number;
}

export interface MigrationJourneyState {
	readonly migrationId: MigrationId;
	readonly routeCellIds: readonly string[];
	readonly traversalUnitsByLeg: readonly number[];
	readonly currentLegIndex: number;
	readonly currentLegProgressUnits: number;
	readonly completedTraversalUnits: number;
	readonly totalTraversalUnits: number;
}

export interface CivilizationState {
	readonly schemaVersion: "eonfolk-civilization-kernel-v5";
	readonly revision: number;
	readonly simulationTime: number;
	readonly references: CivilizationReferences;
	readonly resourceDefinitions: Readonly<
		Record<ResourceTypeId, ResourceDefinition>
	>;
	readonly storages: Readonly<Record<string, StorageState>>;
	readonly stocks: Readonly<Record<string, StockState>>;
	readonly recipes: Readonly<Record<string, ProductionRecipe>>;
	readonly processes: Readonly<Record<string, ProductionProcess>>;
	readonly processBindings: Readonly<Record<string, ProcessBinding>>;
	readonly projects: Readonly<Record<ProjectId, ProjectState>>;
	readonly citizens: Readonly<Record<CitizenId, CivilizationCitizenState>>;
	readonly relationships: Readonly<
		Record<string, CivilizationRelationshipState>
	>;
	readonly sponsorships: Readonly<Record<string, CivilizationSponsorshipState>>;
	readonly patronAbstentions: Readonly<
		Record<string, CivilizationPatronAbstentionState>
	>;
	readonly minds: Readonly<Record<CitizenId, CivilizationMindState>>;
	readonly counsels: Readonly<Record<string, CivilizationCounselState>>;
	readonly counselOutcomes: Readonly<
		Record<string, CivilizationCounselOutcomeState>
	>;
	readonly households: Readonly<Record<string, HouseholdState>>;
	readonly institutions: Readonly<Record<string, InstitutionState>>;
	readonly agreements: Readonly<Record<string, AgreementState>>;
	readonly migrations: Readonly<Record<MigrationId, MigrationState>>;
	readonly migrationJourneys: Readonly<
		Record<MigrationId, MigrationJourneyState>
	>;
	readonly migrationRequirements: Readonly<
		Record<MigrationId, readonly PhysicalResourceRequirement[]>
	>;
	readonly foundings: Readonly<Record<FoundingId, SettlementFoundingState>>;
	readonly materializedFoundings: Readonly<Record<FoundingId, string>>;
	readonly foundingRequirements: Readonly<
		Record<FoundingId, readonly PhysicalResourceRequirement[]>
	>;
	readonly accountingCheckpoint: {
		readonly simulationTime: number;
		readonly stockQuantities: Readonly<Record<string, number>>;
		readonly consumedByProjectResource: Readonly<Record<string, number>>;
	} | null;
	readonly schedulerTotals: {
		readonly completedProductionRuns: number;
		readonly consumedNeedUnits: number;
		readonly transportedResourceUnits: number;
		readonly groundedNeedOutcomes: number;
		readonly unmetNeedUnits: number;
	};
	readonly needOutcomes: readonly DailyNeedOutcome[];
	readonly materializedProjects: Readonly<
		Record<ProjectId, PhysicalProjectMaterialization>
	>;
	readonly provenance: readonly CivilizationEventProvenance[];
	readonly accounting: readonly AccountingEntry[];
}

export interface TransferLine {
	readonly fromStockId: string;
	readonly toStockId: string;
	readonly quantity: number;
}

export interface AccountingAudit {
	readonly ok: boolean;
	readonly issues: readonly string[];
	readonly stockTotalsByResource: Readonly<Record<ResourceTypeId, number>>;
	readonly reconstructedStockQuantities: Readonly<Record<string, number>>;
}

export type CivilizationErrorCode =
	| "ALREADY_EXISTS"
	| "INVALID_INPUT"
	| "INVALID_REFERENCE"
	| "INVALID_STATE"
	| "INSUFFICIENT_RESOURCE"
	| "CAPACITY_EXCEEDED"
	| "PREREQUISITE_UNMET";

export class CivilizationError extends Error {
	readonly code: CivilizationErrorCode;

	constructor(code: CivilizationErrorCode, message: string) {
		super(message);
		this.name = "CivilizationError";
		this.code = code;
	}
}
