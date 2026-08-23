import type { ExperimentWorldIdentity } from "./release.js";

export type WorldId = string;
export type TerritoryId = string;
export type CellId = string;
export type LocalSpaceId = string;
export type SettlementId = string;
export type SiteId = string;
export type PlaceId = string;
export type BuildingId = string;
export type RouteId = string;
export type InteractionSlotId = string;

export type DataClass = "canonical" | "subjective" | "derived" | "research";

export interface TemporalValidity {
	readonly validFromSimulationTime: number;
	readonly validUntilSimulationTime: number | null;
}

export interface CanonicalProvenance {
	readonly sourceKind: "genesis" | "world-event" | "migration";
	readonly sourceId: string;
	readonly schemaVersion: string;
}

export interface CanonicalRecord<T> {
	readonly dataClass: "canonical";
	readonly validity: TemporalValidity;
	readonly provenance: CanonicalProvenance;
	readonly value: T;
}

export interface MetricPosition {
	readonly xMillimeters: number;
	readonly yMillimeters: number;
	readonly elevationMillimeters: number;
}

export interface MetricBounds {
	readonly minimum: MetricPosition;
	readonly maximum: MetricPosition;
}

export type TerrainKind =
	| "water"
	| "wetland"
	| "plain"
	| "woodland"
	| "rock"
	| "highland";

export interface WorldCell {
	readonly cellId: CellId;
	readonly regionId: string;
	readonly territoryId: TerritoryId;
	readonly gridX: number;
	readonly gridY: number;
	readonly terrain: TerrainKind;
	readonly elevationMillimeters: number;
	readonly slopeBasisPoints: number;
	readonly waterAvailabilityBasisPoints: number;
	readonly productivityBasisPoints: number;
	readonly timberBasisPoints: number;
	readonly materialBasisPoints: number;
	readonly travelFrictionBasisPoints: number;
	readonly settlementSuitabilityBasisPoints: number;
}

export interface RegionState {
	readonly regionId: string;
	readonly name: string;
	readonly cellIds: readonly CellId[];
	readonly territoryIds: readonly TerritoryId[];
	readonly neighboringRegionIds: readonly string[];
}

export interface TerritoryState {
	readonly territoryId: TerritoryId;
	readonly regionId: string;
	readonly cellIds: readonly CellId[];
	readonly controllingInstitutionId: string | null;
}

export interface LocalSpaceState {
	readonly localSpaceId: LocalSpaceId;
	readonly settlementId: SettlementId;
	readonly bounds: MetricBounds;
	readonly siteIds: readonly SiteId[];
	readonly routeIds: readonly RouteId[];
}

export interface SettlementState {
	readonly settlementId: SettlementId;
	readonly name: string;
	readonly territoryId: TerritoryId;
	readonly anchorCellId: CellId;
	readonly localSpaceId: LocalSpaceId;
	readonly foundedAtSimulationTime: number;
	readonly founderCitizenIds: readonly string[];
	readonly residentCitizenIds: readonly string[];
	readonly householdIds: readonly string[];
	readonly institutionIds: readonly string[];
	readonly siteIds: readonly SiteId[];
}

export interface SiteState {
	readonly siteId: SiteId;
	readonly localSpaceId: LocalSpaceId;
	readonly cellId: CellId;
	readonly name: string;
	readonly kind:
		| "residential"
		| "resource"
		| "production"
		| "civic"
		| "storage"
		| "undeveloped";
	readonly bounds: MetricBounds;
	readonly placeIds: readonly PlaceId[];
	readonly buildingIds: readonly BuildingId[];
	readonly interactionSlotIds: readonly InteractionSlotId[];
}

export interface InteractionSlotState {
	readonly interactionSlotId: InteractionSlotId;
	readonly siteId: SiteId;
	readonly position: MetricPosition;
	readonly facingMilliDegrees: number;
	readonly activityKinds: readonly string[];
	readonly capacity: number;
}

export interface BuildingState {
	readonly buildingId: BuildingId;
	readonly siteId: SiteId;
	readonly buildingKind: string;
	readonly position: MetricPosition;
	readonly entranceSlotId: InteractionSlotId;
	readonly conditionBasisPoints: number;
	readonly capacity: number;
}

export interface RouteState {
	readonly routeId: RouteId;
	readonly localSpaceId: LocalSpaceId;
	readonly fromSiteId: SiteId;
	readonly toSiteId: SiteId;
	readonly waypoints: readonly MetricPosition[];
	readonly distanceMillimeters: number;
	readonly travelFrictionBasisPoints: number;
}

export interface GeneratedWorldState {
	readonly identity: ExperimentWorldIdentity;
	readonly generatedAtSimulationTime: 0;
	readonly regions: Readonly<Record<string, CanonicalRecord<RegionState>>>;
	readonly territories: Readonly<
		Record<string, CanonicalRecord<TerritoryState>>
	>;
	readonly cells: Readonly<Record<string, CanonicalRecord<WorldCell>>>;
	readonly localSpaces: Readonly<
		Record<string, CanonicalRecord<LocalSpaceState>>
	>;
	readonly settlements: Readonly<
		Record<string, CanonicalRecord<SettlementState>>
	>;
	readonly sites: Readonly<Record<string, CanonicalRecord<SiteState>>>;
	readonly buildings: Readonly<Record<string, CanonicalRecord<BuildingState>>>;
	readonly routes: Readonly<Record<string, CanonicalRecord<RouteState>>>;
	readonly interactionSlots: Readonly<
		Record<string, CanonicalRecord<InteractionSlotState>>
	>;
}
