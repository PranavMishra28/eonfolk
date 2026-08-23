import type { CitizenId, EventId } from "./types.js";
import type { BuildingId, SettlementId, SiteId, TerritoryId } from "./world.js";

export type HouseholdId = string;
export type InstitutionId = string;
export type ResourceTypeId = string;
export type StockId = string;
export type StorageId = string;
export type RecipeId = string;
export type ProcessId = string;
export type CapabilityId = string;
export type NeedId = string;
export type PressureId = string;
export type ProjectId = string;
export type ProjectMilestoneId = string;
export type AgreementId = string;
export type MigrationId = string;
export type FoundingId = string;

export type ResourceUnit =
	| "milliliters"
	| "grams"
	| "millimeters"
	| "count"
	| "labor-seconds";

export interface ResourceDefinition {
	readonly resourceTypeId: ResourceTypeId;
	readonly name: string;
	readonly unit: ResourceUnit;
	readonly conserved: boolean;
	readonly divisible: boolean;
	readonly decayBasisPointsPerDay: number;
}

export type StockOwner =
	| { readonly kind: "citizen"; readonly citizenId: CitizenId }
	| { readonly kind: "household"; readonly householdId: HouseholdId }
	| { readonly kind: "institution"; readonly institutionId: InstitutionId }
	| { readonly kind: "settlement"; readonly settlementId: SettlementId }
	| { readonly kind: "project"; readonly projectId: ProjectId };

export interface StockState {
	readonly stockId: StockId;
	readonly owner: StockOwner;
	readonly resourceTypeId: ResourceTypeId;
	readonly storageId: StorageId;
	readonly quantity: number;
	readonly reservedQuantity: number;
	readonly updatedAtSimulationTime: number;
}

export interface StorageState {
	readonly storageId: StorageId;
	readonly siteId: SiteId;
	readonly owner: StockOwner;
	readonly acceptedResourceTypeIds: readonly ResourceTypeId[];
	readonly capacityByResource: Readonly<Record<ResourceTypeId, number>>;
	readonly accessInstitutionId: InstitutionId | null;
}

export interface CapabilityRating {
	readonly capabilityId: CapabilityId;
	readonly levelBasisPoints: number;
	readonly sourceEventIds: readonly EventId[];
}

export interface RecipeFlow {
	readonly resourceTypeId: ResourceTypeId;
	readonly quantity: number;
}

export interface ProductionRecipe {
	readonly recipeId: RecipeId;
	readonly name: string;
	readonly durationSeconds: number;
	readonly laborSeconds: number;
	readonly requiredCapabilities: readonly CapabilityRating[];
	readonly requiredBuildingKinds: readonly string[];
	readonly inputs: readonly RecipeFlow[];
	readonly outputs: readonly RecipeFlow[];
	readonly byproducts: readonly RecipeFlow[];
}

export interface ProductionProcess {
	readonly processId: ProcessId;
	readonly recipeId: RecipeId;
	readonly siteId: SiteId;
	readonly projectId: ProjectId | null;
	readonly participantCitizenIds: readonly CitizenId[];
	readonly startedAtSimulationTime: number;
	readonly expectedCompletionSimulationTime: number;
	readonly progressBasisPoints: number;
	readonly state: "reserved" | "active" | "completed" | "failed" | "cancelled";
	readonly sourceEventIds: readonly EventId[];
}

export interface HouseholdState {
	readonly householdId: HouseholdId;
	readonly settlementId: SettlementId;
	readonly memberCitizenIds: readonly CitizenId[];
	readonly dependentCitizenIds: readonly CitizenId[];
	readonly dwellingBuildingId: BuildingId | null;
	readonly sharedStorageIds: readonly StorageId[];
	readonly commitmentIds: readonly AgreementId[];
}

export interface InstitutionRole {
	readonly roleId: string;
	readonly name: string;
	readonly authorityKinds: readonly string[];
	readonly capacity: number;
}

export interface InstitutionMembership {
	readonly citizenId: CitizenId;
	readonly roleId: string;
	readonly joinedAtSimulationTime: number;
	readonly leftAtSimulationTime: number | null;
	readonly sourceEventIds: readonly EventId[];
}

export interface InstitutionState {
	readonly institutionId: InstitutionId;
	readonly settlementId: SettlementId;
	readonly name: string;
	readonly kind: string;
	readonly roles: readonly InstitutionRole[];
	readonly memberships: readonly InstitutionMembership[];
	readonly storageIds: readonly StorageId[];
	readonly projectIds: readonly ProjectId[];
	readonly agreementIds: readonly AgreementId[];
	readonly normIds: readonly string[];
	readonly foundedAtSimulationTime: number;
	readonly dissolvedAtSimulationTime: number | null;
}

export interface NeedMeasurement {
	readonly needId: NeedId;
	readonly subjectKind: "citizen" | "household" | "settlement";
	readonly subjectId: string;
	readonly severityBasisPoints: number;
	readonly observedAtSimulationTime: number;
	readonly directEvidenceEventIds: readonly EventId[];
}

export interface PressureProjection {
	readonly dataClass: "derived";
	readonly pressureId: PressureId;
	readonly subjectId: string;
	readonly kind: "scarcity" | "shelter" | "safety" | "health" | "social";
	readonly severityBasisPoints: number;
	readonly derivedFromEventIds: readonly EventId[];
	readonly projectionVersion: string;
}

export interface ProjectResourceRequirement extends RecipeFlow {
	readonly deliveredQuantity: number;
	readonly consumedQuantity: number;
}

export interface ProjectLaborRequirement {
	readonly capabilityId: CapabilityId;
	readonly requiredLaborSeconds: number;
	readonly completedLaborSeconds: number;
}

export interface ProjectMilestone {
	readonly milestoneId: ProjectMilestoneId;
	readonly name: string;
	readonly dependencyMilestoneIds: readonly ProjectMilestoneId[];
	readonly resources: readonly ProjectResourceRequirement[];
	readonly labor: readonly ProjectLaborRequirement[];
	readonly progressBasisPoints: number;
	readonly state: "blocked" | "ready" | "active" | "completed" | "failed";
}

export type ProjectStateKind =
	| "proposed"
	| "approved"
	| "resourcing"
	| "active"
	| "paused"
	| "completed"
	| "failed"
	| "abandoned";

export interface ProjectState {
	readonly projectId: ProjectId;
	readonly kind: string;
	readonly name: string;
	readonly settlementId: SettlementId;
	readonly siteId: SiteId | null;
	readonly sponsor:
		| { readonly kind: "citizen"; readonly citizenId: CitizenId }
		| { readonly kind: "institution"; readonly institutionId: InstitutionId };
	readonly state: ProjectStateKind;
	readonly dependencyProjectIds: readonly ProjectId[];
	readonly milestones: readonly ProjectMilestone[];
	readonly participantCitizenIds: readonly CitizenId[];
	readonly storageId: StorageId;
	readonly startedAtSimulationTime: number | null;
	readonly endedAtSimulationTime: number | null;
	readonly failureReason: string | null;
	readonly sourceEventIds: readonly EventId[];
}

export interface AgreementState {
	readonly agreementId: AgreementId;
	readonly parties: readonly StockOwner[];
	readonly kind: "exchange" | "access" | "labor" | "allocation" | "policy";
	readonly commitments: readonly string[];
	readonly authorityInstitutionId: InstitutionId | null;
	readonly effectiveFromSimulationTime: number;
	readonly expiresAtSimulationTime: number | null;
	readonly state: "proposed" | "active" | "fulfilled" | "breached" | "expired";
	readonly sourceEventIds: readonly EventId[];
}

export interface MigrationState {
	readonly migrationId: MigrationId;
	readonly citizenIds: readonly CitizenId[];
	readonly originSettlementId: SettlementId;
	readonly destinationTerritoryId: TerritoryId;
	readonly destinationSettlementId: SettlementId | null;
	readonly carriedStockIds: readonly StockId[];
	readonly departureSimulationTime: number;
	readonly expectedArrivalSimulationTime: number;
	readonly state: "planned" | "travelling" | "arrived" | "abandoned" | "failed";
	readonly sourceEventIds: readonly EventId[];
}

export interface SettlementFoundingState {
	readonly foundingId: FoundingId;
	readonly migrationId: MigrationId;
	readonly proposedSettlementId: SettlementId;
	readonly territoryId: TerritoryId;
	readonly founderCitizenIds: readonly CitizenId[];
	readonly requiredProjectIds: readonly ProjectId[];
	readonly requiredStockIds: readonly StockId[];
	readonly state:
		| "proposed"
		| "preparing"
		| "travelling"
		| "establishing"
		| "viable"
		| "failed";
	readonly viabilityEvidenceEventIds: readonly EventId[];
}

export interface CivilizationEventProvenance {
	readonly eventId: EventId;
	readonly mechanismId: string;
	readonly causeEventIds: readonly EventId[];
	readonly actorVisibleSourceEventIds: readonly EventId[];
	readonly modelDecisionId: string | null;
}

/** The two bounded, high-level interventions in the Release Genesis proof. */
export type GeneratedSponsorCounsel =
	| "verify-reserve"
	| "raise-allegation-publicly";

/**
 * A Chronicle relation is a claim about evidence, not a license to infer cause.
 * `in-world-allegation` is deliberately disjoint from every factual relation.
 */
export type GeneratedChronicleRelation =
	| "direct-cause"
	| "trigger"
	| "contributing-condition"
	| "temporal-predecessor"
	| "in-world-allegation";

export type GeneratedSponsorEventKind =
	| "SponsorshipEstablished"
	| "CounselOffered"
	| "CounselInterpreted"
	| "AllegationRaised"
	| "InstitutionCommitmentRecorded";

export interface GeneratedSponsorCausalParent {
	readonly eventId: EventId;
	readonly relation: GeneratedChronicleRelation;
}

export type GeneratedSponsorEffect =
	| {
			readonly kind: "patron-covenant";
			readonly patronPrincipalId: string;
			readonly beneficiaryCitizenId: CitizenId;
			readonly state: "active";
	  }
	| {
			readonly kind: "counsel";
			readonly counsel: GeneratedSponsorCounsel;
	  }
	| {
			readonly kind: "independent-decision";
			readonly actionKind:
				| "VerifyReserve"
				| "AccusePublicly"
				| "FollowStandingPlan";
			readonly disposition:
				| "accepted"
				| "rejected"
				| "delayed"
				| "reinterpreted";
	  }
	| {
			readonly kind: "allegation";
			readonly subjectCitizenId: CitizenId;
			readonly truthStatus: "in-world-allegation";
	  }
	| {
			readonly kind: "institution-commitment";
			readonly institutionName: string;
			readonly commitmentKind:
				| "witnessed-reserve-check"
				| "allocation-review"
				| "existing-allocation-scheduled-review";
			readonly state: "active";
			readonly effectiveSimulationTime: number;
	  };

/** Append-only authority fact produced by the validated sponsor gateway. */
export interface GeneratedSponsorEvent {
	readonly schemaVersion: "eonfolk-generated-sponsor-event-v1";
	readonly eventId: EventId;
	readonly sequence: number;
	readonly simulationTime: number;
	readonly kind: GeneratedSponsorEventKind;
	readonly citizenId: CitizenId;
	readonly counterpartyCitizenId: CitizenId | null;
	readonly settlementId: SettlementId;
	readonly effect: GeneratedSponsorEffect;
	readonly publicFact: string;
	readonly causalParents: readonly GeneratedSponsorCausalParent[];
	readonly mechanismId: string;
	readonly decisionId: string | null;
	readonly preStateHash: string;
	readonly postStateHash: string;
}

export interface GeneratedChronicleSentence {
	readonly sentenceId: string;
	readonly text: string;
	readonly relation: GeneratedChronicleRelation;
	readonly evidenceEventIds: readonly EventId[];
	readonly focus: {
		readonly settlementId: SettlementId;
		readonly citizenId: CitizenId | null;
	};
}

export interface GeneratedShareArtifact {
	readonly schemaVersion: "eonfolk-generated-share-artifact-v1";
	readonly durationSeconds: 15;
	readonly headline: string;
	readonly beats: readonly [
		GeneratedChronicleSentence,
		GeneratedChronicleSentence,
		GeneratedChronicleSentence,
	];
	readonly unresolvedTension: string;
	readonly canonicalPath: "/world";
}
