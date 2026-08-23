import type {
	AgreementState,
	CapabilityId,
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
	| "recipe-input"
	| "recipe-output"
	| "project-consumption";

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
	readonly schemaVersion: "eonfolk-civilization-kernel-v2";
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
