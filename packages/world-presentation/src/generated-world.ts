type TerrainKind =
	| "water"
	| "wetland"
	| "plain"
	| "woodland"
	| "rock"
	| "highland";

interface CanonicalRecord<T> {
	readonly value: T;
}

interface MetricPosition {
	readonly xMillimeters: number;
	readonly yMillimeters: number;
	readonly elevationMillimeters: number;
}

interface MetricBounds {
	readonly minimum: MetricPosition;
	readonly maximum: MetricPosition;
}

interface WorldCell {
	readonly cellId: string;
	readonly regionId: string;
	readonly chunkId: string;
	readonly territoryId: string;
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

interface RegionState {
	readonly regionId: string;
	readonly name: string;
	readonly cellIds: readonly string[];
	readonly chunkIds: readonly string[];
	readonly territoryIds: readonly string[];
	readonly neighboringRegionIds: readonly string[];
}

interface ChunkState {
	readonly chunkId: string;
	readonly regionId: string;
	readonly gridMinimumX: number;
	readonly gridMinimumY: number;
	readonly gridMaximumX: number;
	readonly gridMaximumY: number;
	readonly cellIds: readonly string[];
	readonly territoryIds: readonly string[];
}

interface TerritoryState {
	readonly territoryId: string;
	readonly regionId: string;
	readonly cellIds: readonly string[];
	readonly controllingInstitutionId: string | null;
}

interface LocalSpaceState {
	readonly localSpaceId: string;
	readonly settlementId: string;
	readonly bounds: MetricBounds;
	readonly siteIds: readonly string[];
	readonly routeIds: readonly string[];
}

interface SettlementState {
	readonly settlementId: string;
	readonly name: string;
	readonly territoryId: string;
	readonly anchorCellId: string;
	readonly localSpaceId: string;
	readonly foundedAtSimulationTime: number;
	readonly founderCitizenIds: readonly string[];
	readonly residentCitizenIds: readonly string[];
	readonly householdIds: readonly string[];
	readonly institutionIds: readonly string[];
	readonly siteIds: readonly string[];
}

interface SiteState {
	readonly siteId: string;
	readonly localSpaceId: string;
	readonly cellId: string;
	readonly name: string;
	readonly kind:
		| "residential"
		| "resource"
		| "production"
		| "civic"
		| "storage"
		| "undeveloped";
	readonly bounds: MetricBounds;
	readonly placeIds: readonly string[];
	readonly buildingIds: readonly string[];
	readonly interactionSlotIds: readonly string[];
}

interface PlaceState {
	readonly placeId: string;
	readonly siteId: string;
	readonly name: string;
	readonly kind: "meeting" | "dwelling" | "storage" | "work" | "resource";
	readonly position: MetricPosition;
	readonly interactionSlotIds: readonly string[];
}

interface InteractionSlotState {
	readonly interactionSlotId: string;
	readonly siteId: string;
	readonly position: MetricPosition;
	readonly facingMilliDegrees: number;
	readonly activityKinds: readonly string[];
	readonly capacity: number;
}

interface BuildingState {
	readonly buildingId: string;
	readonly siteId: string;
	readonly buildingKind: string;
	readonly position: MetricPosition;
	readonly entranceSlotId: string;
	readonly conditionBasisPoints: number;
	readonly capacity: number;
}

interface RouteState {
	readonly routeId: string;
	readonly localSpaceId: string;
	readonly fromSiteId: string;
	readonly toSiteId: string;
	readonly waypoints: readonly MetricPosition[];
	readonly distanceMillimeters: number;
	readonly travelFrictionBasisPoints: number;
}

/** Dependency-free structural read view of protocol GeneratedWorldState. */
interface GeneratedWorldStateInput {
	readonly identity: Readonly<{
		readonly worldId: string;
		readonly releaseGenesisHash: string;
		readonly parentWorldId: string | null;
		readonly treatmentId: string;
		readonly identityHash: string;
	}>;
	readonly generatedAtSimulationTime: 0;
	readonly regions: Readonly<Record<string, CanonicalRecord<RegionState>>>;
	readonly chunks: Readonly<Record<string, CanonicalRecord<ChunkState>>>;
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
	readonly places: Readonly<Record<string, CanonicalRecord<PlaceState>>>;
	readonly buildings: Readonly<Record<string, CanonicalRecord<BuildingState>>>;
	readonly routes: Readonly<Record<string, CanonicalRecord<RouteState>>>;
	readonly interactionSlots: Readonly<
		Record<string, CanonicalRecord<InteractionSlotState>>
	>;
}

export type GeneratedInspectableKind =
	| "region"
	| "chunk"
	| "territory"
	| "terrain-cell"
	| "settlement"
	| "local-space"
	| "site"
	| "place"
	| "building"
	| "route"
	| "interaction-slot";

export interface GeneratedProjectionSource {
	readonly worldId: string;
	readonly releaseGenesisHash: string;
	readonly parentWorldId: string | null;
	readonly treatmentId: string;
	readonly identityHash: string;
	readonly generatedAtSimulationTime: 0;
}

export interface GeneratedMetricPointProjection {
	readonly xMillimeters: number;
	readonly yMillimeters: number;
	readonly elevationMillimeters: number;
}

export interface GeneratedMetricBoundsProjection {
	readonly minimum: GeneratedMetricPointProjection;
	readonly maximum: GeneratedMetricPointProjection;
}

/**
 * A camera hint is derived presentation data. Grid targets use millicells so
 * half-cell centers stay integral; local targets use canonical millimeters.
 */
export interface GeneratedCameraTarget {
	readonly cameraTargetId: string;
	readonly kind: "region" | "settlement" | "follow";
	readonly targetKind: GeneratedInspectableKind;
	readonly targetId: string;
	readonly coordinateSpace: "world-grid-millicells" | "local-millimeters";
	readonly position: Readonly<{
		readonly x: number;
		readonly y: number;
		readonly elevationMillimeters: number;
	}>;
	readonly extent: Readonly<{
		readonly x: number;
		readonly y: number;
		readonly elevationMillimeters: number;
	}>;
	readonly semanticLabel: string;
}

export interface GeneratedTerrainCellProjection {
	readonly inspectableId: string;
	readonly cellId: string;
	readonly regionId: string;
	readonly chunkId: string;
	readonly territoryId: string;
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
	readonly semanticLabel: string;
}

export interface GeneratedRegionProjection {
	readonly inspectableId: string;
	readonly regionId: string;
	readonly name: string;
	readonly cellIds: readonly string[];
	readonly chunkIds: readonly string[];
	readonly territoryIds: readonly string[];
	readonly neighboringRegionIds: readonly string[];
	readonly semanticLabel: string;
	readonly cameraTarget: GeneratedCameraTarget;
}

export interface GeneratedChunkProjection {
	readonly inspectableId: string;
	readonly chunkId: string;
	readonly regionId: string;
	readonly gridMinimumX: number;
	readonly gridMinimumY: number;
	readonly gridMaximumX: number;
	readonly gridMaximumY: number;
	readonly cellIds: readonly string[];
	readonly territoryIds: readonly string[];
	readonly semanticLabel: string;
}

export interface GeneratedTerritoryProjection {
	readonly inspectableId: string;
	readonly territoryId: string;
	readonly regionId: string;
	readonly cellIds: readonly string[];
	readonly controllingInstitutionId: string | null;
	readonly semanticLabel: string;
}

export interface GeneratedSettlementAnchorProjection {
	readonly inspectableId: string;
	readonly settlementId: string;
	readonly name: string;
	readonly territoryId: string;
	readonly anchorCellId: string;
	readonly localSpaceId: string;
	readonly foundedAtSimulationTime: number;
	readonly siteIds: readonly string[];
	readonly gridX: number;
	readonly gridY: number;
	readonly elevationMillimeters: number;
	readonly semanticLabel: string;
	readonly cameraTarget: GeneratedCameraTarget;
}

export interface GeneratedWorldOverviewProjection {
	readonly schemaVersion: "eonfolk-generated-world-overview-v1";
	readonly source: GeneratedProjectionSource;
	readonly regions: readonly GeneratedRegionProjection[];
	readonly chunks: readonly GeneratedChunkProjection[];
	readonly territories: readonly GeneratedTerritoryProjection[];
	readonly terrainCells: readonly GeneratedTerrainCellProjection[];
	readonly settlementAnchors: readonly GeneratedSettlementAnchorProjection[];
	readonly cameraTargets: Readonly<{
		readonly regions: readonly GeneratedCameraTarget[];
		readonly settlements: readonly GeneratedCameraTarget[];
	}>;
	readonly semanticCounts: Readonly<{
		readonly regions: number;
		readonly chunks: number;
		readonly territories: number;
		readonly terrainCells: number;
		readonly settlements: number;
	}>;
}

export interface GeneratedSettlementProjection {
	readonly inspectableId: string;
	readonly settlementId: string;
	readonly name: string;
	readonly territoryId: string;
	readonly anchorCellId: string;
	readonly localSpaceId: string;
	readonly foundedAtSimulationTime: number;
	readonly founderCitizenIds: readonly string[];
	readonly residentCitizenIds: readonly string[];
	readonly householdIds: readonly string[];
	readonly institutionIds: readonly string[];
	readonly siteIds: readonly string[];
	readonly semanticLabel: string;
}

export interface GeneratedLocalSpaceProjection {
	readonly inspectableId: string;
	readonly localSpaceId: string;
	readonly settlementId: string;
	readonly bounds: GeneratedMetricBoundsProjection;
	readonly siteIds: readonly string[];
	readonly routeIds: readonly string[];
	readonly semanticLabel: string;
}

export interface GeneratedSiteProjection {
	readonly inspectableId: string;
	readonly siteId: string;
	readonly localSpaceId: string;
	readonly cellId: string;
	readonly name: string;
	readonly kind: SiteState["kind"];
	readonly bounds: GeneratedMetricBoundsProjection;
	readonly placeIds: readonly string[];
	readonly buildingIds: readonly string[];
	readonly interactionSlotIds: readonly string[];
	readonly semanticLabel: string;
}

export interface GeneratedPlaceProjection {
	readonly inspectableId: string;
	readonly placeId: string;
	readonly siteId: string;
	readonly name: string;
	readonly kind: PlaceState["kind"];
	readonly position: GeneratedMetricPointProjection;
	readonly interactionSlotIds: readonly string[];
	readonly semanticLabel: string;
}

export interface GeneratedBuildingProjection {
	readonly inspectableId: string;
	readonly buildingId: string;
	readonly siteId: string;
	readonly buildingKind: string;
	readonly position: GeneratedMetricPointProjection;
	readonly entranceSlotId: string;
	readonly conditionBasisPoints: number;
	readonly capacity: number;
	readonly semanticLabel: string;
}

export interface GeneratedRouteProjection {
	readonly inspectableId: string;
	readonly routeId: string;
	readonly localSpaceId: string;
	readonly fromSiteId: string;
	readonly toSiteId: string;
	readonly waypoints: readonly GeneratedMetricPointProjection[];
	readonly distanceMillimeters: number;
	readonly travelFrictionBasisPoints: number;
	readonly semanticLabel: string;
}

export interface GeneratedInteractionSlotProjection {
	readonly inspectableId: string;
	readonly interactionSlotId: string;
	readonly siteId: string;
	readonly position: GeneratedMetricPointProjection;
	readonly facingMilliDegrees: number;
	readonly activityKinds: readonly string[];
	readonly capacity: number;
	readonly semanticLabel: string;
}

export interface GeneratedSettlementLocalProjection {
	readonly schemaVersion: "eonfolk-generated-settlement-local-v1";
	readonly source: GeneratedProjectionSource;
	readonly settlement: GeneratedSettlementProjection;
	readonly localSpace: GeneratedLocalSpaceProjection;
	readonly sites: readonly GeneratedSiteProjection[];
	readonly places: readonly GeneratedPlaceProjection[];
	readonly buildings: readonly GeneratedBuildingProjection[];
	readonly routes: readonly GeneratedRouteProjection[];
	readonly interactionSlots: readonly GeneratedInteractionSlotProjection[];
	readonly cameraTargets: Readonly<{
		readonly settlement: GeneratedCameraTarget;
		readonly follow: readonly GeneratedCameraTarget[];
	}>;
	readonly semanticCounts: Readonly<{
		readonly sites: number;
		readonly places: number;
		readonly buildings: number;
		readonly routes: number;
		readonly interactionSlots: number;
	}>;
}

const MILLICELLS_PER_CELL = 1_000;
const DEFAULT_FOLLOW_EXTENT_MILLIMETERS = 8_000;

function compareIds(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function sortedIds(ids: readonly string[]): readonly string[] {
	return Object.freeze([...ids].sort(compareIds));
}

function sortedUniqueIds(ids: readonly string[]): readonly string[] {
	return Object.freeze([...new Set(ids)].sort(compareIds));
}

function recordValue<T>(
	records: Readonly<Record<string, CanonicalRecord<T>>>,
	id: string,
	label: string,
): T {
	const record = records[id];
	if (record === undefined) throw new Error(`missing ${label} ${id}`);
	return record.value;
}

function sortedValues<T>(
	records: Readonly<Record<string, CanonicalRecord<T>>>,
	id: (value: T) => string,
): readonly T[] {
	return Object.freeze(
		Object.values(records)
			.map((record) => record.value)
			.sort((left, right) => compareIds(id(left), id(right))),
	);
}

function metricPoint(value: MetricPosition): GeneratedMetricPointProjection {
	return Object.freeze({
		xMillimeters: value.xMillimeters,
		yMillimeters: value.yMillimeters,
		elevationMillimeters: value.elevationMillimeters,
	});
}

function metricBounds(value: MetricBounds): GeneratedMetricBoundsProjection {
	return Object.freeze({
		minimum: metricPoint(value.minimum),
		maximum: metricPoint(value.maximum),
	});
}

function humanize(value: string): string {
	const words = value.replaceAll("-", " ");
	return words.length === 0
		? words
		: `${words[0]?.toUpperCase()}${words.slice(1)}`;
}

function source(world: GeneratedWorldStateInput): GeneratedProjectionSource {
	return Object.freeze({
		worldId: world.identity.worldId,
		releaseGenesisHash: world.identity.releaseGenesisHash,
		parentWorldId: world.identity.parentWorldId,
		treatmentId: world.identity.treatmentId,
		identityHash: world.identity.identityHash,
		generatedAtSimulationTime: world.generatedAtSimulationTime,
	});
}

function gridCameraTarget(input: {
	readonly kind: "region" | "settlement";
	readonly targetKind: "region" | "settlement";
	readonly targetId: string;
	readonly minimumGridX: number;
	readonly minimumGridY: number;
	readonly maximumGridX: number;
	readonly maximumGridY: number;
	readonly minimumElevationMillimeters: number;
	readonly maximumElevationMillimeters: number;
	readonly semanticLabel: string;
}): GeneratedCameraTarget {
	return Object.freeze({
		cameraTargetId: `camera:${input.kind}:grid:${input.targetId}`,
		kind: input.kind,
		targetKind: input.targetKind,
		targetId: input.targetId,
		coordinateSpace: "world-grid-millicells",
		position: Object.freeze({
			x: Math.trunc(
				((input.minimumGridX + input.maximumGridX) * MILLICELLS_PER_CELL) / 2,
			),
			y: Math.trunc(
				((input.minimumGridY + input.maximumGridY) * MILLICELLS_PER_CELL) / 2,
			),
			elevationMillimeters: Math.trunc(
				(input.minimumElevationMillimeters +
					input.maximumElevationMillimeters) /
					2,
			),
		}),
		extent: Object.freeze({
			x: (input.maximumGridX - input.minimumGridX + 1) * MILLICELLS_PER_CELL,
			y: (input.maximumGridY - input.minimumGridY + 1) * MILLICELLS_PER_CELL,
			elevationMillimeters:
				input.maximumElevationMillimeters - input.minimumElevationMillimeters,
		}),
		semanticLabel: input.semanticLabel,
	});
}

function metricCameraTarget(input: {
	readonly kind: "settlement" | "follow";
	readonly targetKind: GeneratedInspectableKind;
	readonly targetId: string;
	readonly position: MetricPosition;
	readonly extentX: number;
	readonly extentY: number;
	readonly extentElevation: number;
	readonly semanticLabel: string;
}): GeneratedCameraTarget {
	return Object.freeze({
		cameraTargetId: `camera:${input.kind}:local:${input.targetKind}:${input.targetId}`,
		kind: input.kind,
		targetKind: input.targetKind,
		targetId: input.targetId,
		coordinateSpace: "local-millimeters",
		position: Object.freeze({
			x: input.position.xMillimeters,
			y: input.position.yMillimeters,
			elevationMillimeters: input.position.elevationMillimeters,
		}),
		extent: Object.freeze({
			x: input.extentX,
			y: input.extentY,
			elevationMillimeters: input.extentElevation,
		}),
		semanticLabel: input.semanticLabel,
	});
}

function centerOfBounds(bounds: MetricBounds): MetricPosition {
	return {
		xMillimeters: Math.trunc(
			(bounds.minimum.xMillimeters + bounds.maximum.xMillimeters) / 2,
		),
		yMillimeters: Math.trunc(
			(bounds.minimum.yMillimeters + bounds.maximum.yMillimeters) / 2,
		),
		elevationMillimeters: Math.trunc(
			(bounds.minimum.elevationMillimeters +
				bounds.maximum.elevationMillimeters) /
				2,
		),
	};
}

function projectCell(cell: WorldCell): GeneratedTerrainCellProjection {
	return Object.freeze({
		inspectableId: cell.cellId,
		cellId: cell.cellId,
		regionId: cell.regionId,
		chunkId: cell.chunkId,
		territoryId: cell.territoryId,
		gridX: cell.gridX,
		gridY: cell.gridY,
		terrain: cell.terrain,
		elevationMillimeters: cell.elevationMillimeters,
		slopeBasisPoints: cell.slopeBasisPoints,
		waterAvailabilityBasisPoints: cell.waterAvailabilityBasisPoints,
		productivityBasisPoints: cell.productivityBasisPoints,
		timberBasisPoints: cell.timberBasisPoints,
		materialBasisPoints: cell.materialBasisPoints,
		travelFrictionBasisPoints: cell.travelFrictionBasisPoints,
		settlementSuitabilityBasisPoints: cell.settlementSuitabilityBasisPoints,
		semanticLabel: `${humanize(cell.terrain)} terrain at grid ${cell.gridX}, ${cell.gridY}`,
	});
}

function regionCameraTarget(
	world: GeneratedWorldStateInput,
	region: RegionState,
): GeneratedCameraTarget {
	const cells = region.cellIds.map((cellId) =>
		recordValue(world.cells, cellId, "region cell"),
	);
	if (cells.length === 0)
		throw new Error(`region ${region.regionId} has no cells`);
	return gridCameraTarget({
		kind: "region",
		targetKind: "region",
		targetId: region.regionId,
		minimumGridX: Math.min(...cells.map((cell) => cell.gridX)),
		minimumGridY: Math.min(...cells.map((cell) => cell.gridY)),
		maximumGridX: Math.max(...cells.map((cell) => cell.gridX)),
		maximumGridY: Math.max(...cells.map((cell) => cell.gridY)),
		minimumElevationMillimeters: Math.min(
			...cells.map((cell) => cell.elevationMillimeters),
		),
		maximumElevationMillimeters: Math.max(
			...cells.map((cell) => cell.elevationMillimeters),
		),
		semanticLabel: `View the ${region.name} region`,
	});
}

function projectRegion(
	world: GeneratedWorldStateInput,
	region: RegionState,
): GeneratedRegionProjection {
	return Object.freeze({
		inspectableId: region.regionId,
		regionId: region.regionId,
		name: region.name,
		cellIds: sortedIds(region.cellIds),
		chunkIds: sortedIds(region.chunkIds),
		territoryIds: sortedIds(region.territoryIds),
		neighboringRegionIds: sortedIds(region.neighboringRegionIds),
		semanticLabel: `${region.name} region`,
		cameraTarget: regionCameraTarget(world, region),
	});
}

function projectChunk(chunk: ChunkState): GeneratedChunkProjection {
	return Object.freeze({
		inspectableId: chunk.chunkId,
		chunkId: chunk.chunkId,
		regionId: chunk.regionId,
		gridMinimumX: chunk.gridMinimumX,
		gridMinimumY: chunk.gridMinimumY,
		gridMaximumX: chunk.gridMaximumX,
		gridMaximumY: chunk.gridMaximumY,
		cellIds: sortedIds(chunk.cellIds),
		territoryIds: sortedIds(chunk.territoryIds),
		semanticLabel: `Terrain chunk ${chunk.gridMinimumX}, ${chunk.gridMinimumY} through ${chunk.gridMaximumX}, ${chunk.gridMaximumY}`,
	});
}

function projectTerritory(
	territory: TerritoryState,
): GeneratedTerritoryProjection {
	return Object.freeze({
		inspectableId: territory.territoryId,
		territoryId: territory.territoryId,
		regionId: territory.regionId,
		cellIds: sortedIds(territory.cellIds),
		controllingInstitutionId: territory.controllingInstitutionId,
		semanticLabel:
			territory.controllingInstitutionId === null
				? `Uncontrolled territory with ${territory.cellIds.length} terrain cells`
				: `Territory controlled by institution ${territory.controllingInstitutionId}`,
	});
}

function projectSettlementAnchor(
	world: GeneratedWorldStateInput,
	settlement: SettlementState,
): GeneratedSettlementAnchorProjection {
	const anchor = recordValue(
		world.cells,
		settlement.anchorCellId,
		"settlement anchor cell",
	);
	const cameraTarget = gridCameraTarget({
		kind: "settlement",
		targetKind: "settlement",
		targetId: settlement.settlementId,
		minimumGridX: anchor.gridX,
		minimumGridY: anchor.gridY,
		maximumGridX: anchor.gridX,
		maximumGridY: anchor.gridY,
		minimumElevationMillimeters: anchor.elevationMillimeters,
		maximumElevationMillimeters: anchor.elevationMillimeters,
		semanticLabel: `View ${settlement.name} from the region`,
	});
	return Object.freeze({
		inspectableId: settlement.settlementId,
		settlementId: settlement.settlementId,
		name: settlement.name,
		territoryId: settlement.territoryId,
		anchorCellId: settlement.anchorCellId,
		localSpaceId: settlement.localSpaceId,
		foundedAtSimulationTime: settlement.foundedAtSimulationTime,
		siteIds: sortedIds(settlement.siteIds),
		gridX: anchor.gridX,
		gridY: anchor.gridY,
		elevationMillimeters: anchor.elevationMillimeters,
		semanticLabel: `${settlement.name} settlement at grid ${anchor.gridX}, ${anchor.gridY}`,
		cameraTarget,
	});
}

export function projectGeneratedWorldOverview(
	world: GeneratedWorldStateInput,
): GeneratedWorldOverviewProjection {
	const regions = Object.freeze(
		sortedValues(world.regions, (region) => region.regionId).map((region) =>
			projectRegion(world, region),
		),
	);
	const chunks = Object.freeze(
		sortedValues(world.chunks, (chunk) => chunk.chunkId).map(projectChunk),
	);
	const territories = Object.freeze(
		sortedValues(world.territories, (territory) => territory.territoryId).map(
			projectTerritory,
		),
	);
	const terrainCells = Object.freeze(
		sortedValues(world.cells, (cell) => cell.cellId).map(projectCell),
	);
	const settlementAnchors = Object.freeze(
		sortedValues(
			world.settlements,
			(settlement) => settlement.settlementId,
		).map((settlement) => projectSettlementAnchor(world, settlement)),
	);
	return Object.freeze({
		schemaVersion: "eonfolk-generated-world-overview-v1",
		source: source(world),
		regions,
		chunks,
		territories,
		terrainCells,
		settlementAnchors,
		cameraTargets: Object.freeze({
			regions: Object.freeze(regions.map((region) => region.cameraTarget)),
			settlements: Object.freeze(
				settlementAnchors.map((settlement) => settlement.cameraTarget),
			),
		}),
		semanticCounts: Object.freeze({
			regions: regions.length,
			chunks: chunks.length,
			territories: territories.length,
			terrainCells: terrainCells.length,
			settlements: settlementAnchors.length,
		}),
	});
}

function projectSettlement(
	settlement: SettlementState,
): GeneratedSettlementProjection {
	return Object.freeze({
		inspectableId: settlement.settlementId,
		settlementId: settlement.settlementId,
		name: settlement.name,
		territoryId: settlement.territoryId,
		anchorCellId: settlement.anchorCellId,
		localSpaceId: settlement.localSpaceId,
		foundedAtSimulationTime: settlement.foundedAtSimulationTime,
		founderCitizenIds: sortedIds(settlement.founderCitizenIds),
		residentCitizenIds: sortedIds(settlement.residentCitizenIds),
		householdIds: sortedIds(settlement.householdIds),
		institutionIds: sortedIds(settlement.institutionIds),
		siteIds: sortedIds(settlement.siteIds),
		semanticLabel: `${settlement.name} settlement`,
	});
}

function projectSite(site: SiteState): GeneratedSiteProjection {
	return Object.freeze({
		inspectableId: site.siteId,
		siteId: site.siteId,
		localSpaceId: site.localSpaceId,
		cellId: site.cellId,
		name: site.name,
		kind: site.kind,
		bounds: metricBounds(site.bounds),
		placeIds: sortedIds(site.placeIds),
		buildingIds: sortedIds(site.buildingIds),
		interactionSlotIds: sortedIds(site.interactionSlotIds),
		semanticLabel: `${site.name}, a ${humanize(site.kind).toLowerCase()} site`,
	});
}

function projectPlace(place: PlaceState): GeneratedPlaceProjection {
	return Object.freeze({
		inspectableId: place.placeId,
		placeId: place.placeId,
		siteId: place.siteId,
		name: place.name,
		kind: place.kind,
		position: metricPoint(place.position),
		interactionSlotIds: sortedIds(place.interactionSlotIds),
		semanticLabel: `${place.name}, a ${humanize(place.kind).toLowerCase()} place`,
	});
}

function projectBuilding(
	building: BuildingState,
	site: SiteState,
): GeneratedBuildingProjection {
	return Object.freeze({
		inspectableId: building.buildingId,
		buildingId: building.buildingId,
		siteId: building.siteId,
		buildingKind: building.buildingKind,
		position: metricPoint(building.position),
		entranceSlotId: building.entranceSlotId,
		conditionBasisPoints: building.conditionBasisPoints,
		capacity: building.capacity,
		semanticLabel: `${humanize(building.buildingKind)} at ${site.name}`,
	});
}

function projectRoute(
	route: RouteState,
	fromSite: SiteState,
	toSite: SiteState,
): GeneratedRouteProjection {
	return Object.freeze({
		inspectableId: route.routeId,
		routeId: route.routeId,
		localSpaceId: route.localSpaceId,
		fromSiteId: route.fromSiteId,
		toSiteId: route.toSiteId,
		waypoints: Object.freeze(route.waypoints.map(metricPoint)),
		distanceMillimeters: route.distanceMillimeters,
		travelFrictionBasisPoints: route.travelFrictionBasisPoints,
		semanticLabel: `Route from ${fromSite.name} to ${toSite.name}`,
	});
}

function projectInteractionSlot(
	slot: InteractionSlotState,
	site: SiteState,
): GeneratedInteractionSlotProjection {
	return Object.freeze({
		inspectableId: slot.interactionSlotId,
		interactionSlotId: slot.interactionSlotId,
		siteId: slot.siteId,
		position: metricPoint(slot.position),
		facingMilliDegrees: slot.facingMilliDegrees,
		activityKinds: sortedIds(slot.activityKinds),
		capacity: slot.capacity,
		semanticLabel: `${site.name} interaction slot for ${sortedIds(slot.activityKinds).join(", ")}`,
	});
}

function localSpaceProjection(
	localSpace: LocalSpaceState,
	settlementName: string,
): GeneratedLocalSpaceProjection {
	return Object.freeze({
		inspectableId: localSpace.localSpaceId,
		localSpaceId: localSpace.localSpaceId,
		settlementId: localSpace.settlementId,
		bounds: metricBounds(localSpace.bounds),
		siteIds: sortedIds(localSpace.siteIds),
		routeIds: sortedIds(localSpace.routeIds),
		semanticLabel: `${settlementName} local space`,
	});
}

function settlementCameraTarget(
	settlement: SettlementState,
	localBounds: MetricBounds,
): GeneratedCameraTarget {
	return metricCameraTarget({
		kind: "settlement",
		targetKind: "settlement",
		targetId: settlement.settlementId,
		position: centerOfBounds(localBounds),
		extentX:
			localBounds.maximum.xMillimeters - localBounds.minimum.xMillimeters,
		extentY:
			localBounds.maximum.yMillimeters - localBounds.minimum.yMillimeters,
		extentElevation:
			localBounds.maximum.elevationMillimeters -
			localBounds.minimum.elevationMillimeters,
		semanticLabel: `View the whole of ${settlement.name}`,
	});
}

function followTargets(input: {
	readonly sites: readonly SiteState[];
	readonly places: readonly PlaceState[];
	readonly buildings: readonly BuildingState[];
	readonly routes: readonly RouteState[];
	readonly slots: readonly InteractionSlotState[];
}): readonly GeneratedCameraTarget[] {
	const targets: GeneratedCameraTarget[] = [];
	for (const site of input.sites) {
		targets.push(
			metricCameraTarget({
				kind: "follow",
				targetKind: "site",
				targetId: site.siteId,
				position: centerOfBounds(site.bounds),
				extentX:
					site.bounds.maximum.xMillimeters - site.bounds.minimum.xMillimeters,
				extentY:
					site.bounds.maximum.yMillimeters - site.bounds.minimum.yMillimeters,
				extentElevation:
					site.bounds.maximum.elevationMillimeters -
					site.bounds.minimum.elevationMillimeters,
				semanticLabel: `Follow activity at ${site.name}`,
			}),
		);
	}
	for (const place of input.places) {
		targets.push(
			metricCameraTarget({
				kind: "follow",
				targetKind: "place",
				targetId: place.placeId,
				position: place.position,
				extentX: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentY: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentElevation: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				semanticLabel: `Follow activity at ${place.name}`,
			}),
		);
	}
	for (const building of input.buildings) {
		targets.push(
			metricCameraTarget({
				kind: "follow",
				targetKind: "building",
				targetId: building.buildingId,
				position: building.position,
				extentX: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentY: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentElevation: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				semanticLabel: `Follow activity at the ${humanize(building.buildingKind).toLowerCase()}`,
			}),
		);
	}
	for (const route of input.routes) {
		const position = route.waypoints[Math.trunc(route.waypoints.length / 2)];
		if (position === undefined)
			throw new Error(`route ${route.routeId} has no waypoint`);
		const extent = Math.max(
			DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
			route.distanceMillimeters,
		);
		targets.push(
			metricCameraTarget({
				kind: "follow",
				targetKind: "route",
				targetId: route.routeId,
				position,
				extentX: extent,
				extentY: extent,
				extentElevation: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				semanticLabel: `Follow travel on route ${route.routeId}`,
			}),
		);
	}
	for (const slot of input.slots) {
		targets.push(
			metricCameraTarget({
				kind: "follow",
				targetKind: "interaction-slot",
				targetId: slot.interactionSlotId,
				position: slot.position,
				extentX: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentY: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				extentElevation: DEFAULT_FOLLOW_EXTENT_MILLIMETERS,
				semanticLabel: `Follow ${sortedIds(slot.activityKinds).join(", ")} activity`,
			}),
		);
	}
	return Object.freeze(
		targets.sort(
			(left, right) =>
				compareIds(left.targetKind, right.targetKind) ||
				compareIds(left.targetId, right.targetId),
		),
	);
}

export function projectGeneratedSettlementLocal(
	world: GeneratedWorldStateInput,
	settlementId: string,
): GeneratedSettlementLocalProjection {
	const settlement = recordValue(world.settlements, settlementId, "settlement");
	const localSpace = recordValue(
		world.localSpaces,
		settlement.localSpaceId,
		"settlement local space",
	);
	if (localSpace.settlementId !== settlement.settlementId)
		throw new Error(
			`local space ${localSpace.localSpaceId} has wrong settlement`,
		);

	const siteValues = sortedIds(settlement.siteIds).map((siteId) =>
		recordValue(world.sites, siteId, "settlement site"),
	);
	const placeIds = sortedUniqueIds(siteValues.flatMap((site) => site.placeIds));
	const buildingIds = sortedUniqueIds(
		siteValues.flatMap((site) => site.buildingIds),
	);
	const slotIds = sortedUniqueIds(
		siteValues.flatMap((site) => site.interactionSlotIds),
	);
	const routeIds = sortedIds(localSpace.routeIds);
	const placeValues = placeIds.map((placeId) =>
		recordValue(world.places, placeId, "settlement place"),
	);
	const buildingValues = buildingIds.map((buildingId) =>
		recordValue(world.buildings, buildingId, "settlement building"),
	);
	const routeValues = routeIds.map((routeId) =>
		recordValue(world.routes, routeId, "settlement route"),
	);
	const slotValues = slotIds.map((slotId) =>
		recordValue(world.interactionSlots, slotId, "settlement interaction slot"),
	);
	const sitesById = new Map(siteValues.map((site) => [site.siteId, site]));
	const requiredSite = (siteId: string): SiteState => {
		const site = sitesById.get(siteId);
		if (site === undefined) throw new Error(`missing local site ${siteId}`);
		return site;
	};
	const projectedSites = Object.freeze(siteValues.map(projectSite));
	const projectedPlaces = Object.freeze(placeValues.map(projectPlace));
	const projectedBuildings = Object.freeze(
		buildingValues.map((building) =>
			projectBuilding(building, requiredSite(building.siteId)),
		),
	);
	const projectedRoutes = Object.freeze(
		routeValues.map((route) =>
			projectRoute(
				route,
				requiredSite(route.fromSiteId),
				requiredSite(route.toSiteId),
			),
		),
	);
	const projectedSlots = Object.freeze(
		slotValues.map((slot) =>
			projectInteractionSlot(slot, requiredSite(slot.siteId)),
		),
	);
	return Object.freeze({
		schemaVersion: "eonfolk-generated-settlement-local-v1",
		source: source(world),
		settlement: projectSettlement(settlement),
		localSpace: localSpaceProjection(localSpace, settlement.name),
		sites: projectedSites,
		places: projectedPlaces,
		buildings: projectedBuildings,
		routes: projectedRoutes,
		interactionSlots: projectedSlots,
		cameraTargets: Object.freeze({
			settlement: settlementCameraTarget(settlement, localSpace.bounds),
			follow: followTargets({
				sites: siteValues,
				places: placeValues,
				buildings: buildingValues,
				routes: routeValues,
				slots: slotValues,
			}),
		}),
		semanticCounts: Object.freeze({
			sites: projectedSites.length,
			places: projectedPlaces.length,
			buildings: projectedBuildings.length,
			routes: projectedRoutes.length,
			interactionSlots: projectedSlots.length,
		}),
	});
}
