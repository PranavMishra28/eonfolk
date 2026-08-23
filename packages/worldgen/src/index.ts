import {
	bytesFromHex,
	createExperimentWorldIdentity,
	createReleaseGenesis,
	drawBounded,
	GENERATOR_VERSION,
	seedPrng,
	stableId,
	WORLD_SCHEMA_VERSION,
} from "@eonfolk/protocol";
import type {
	BuildingState,
	CanonicalRecord,
	ChunkState,
	GeneratedWorldState,
	InteractionSlotState,
	LocalSpaceState,
	MetricBounds,
	MetricPosition,
	PlaceState,
	RegionState,
	ReleaseGenesis,
	RouteState,
	SettlementState,
	SiteState,
	TerrainKind,
	TerritoryState,
	WorldCell,
} from "@eonfolk/protocol";

export const WORLD_GRID_WIDTH = 8;
export const WORLD_GRID_HEIGHT = 8;
export const WORLD_TERRITORY_COUNT = 4;
export const WORLD_CHUNK_COUNT = 4;
export const INITIAL_SITE_COUNT = 5;

const BASIS_POINTS = 10_000;
const FORD_ROWS = new Set([3, 4]);

interface CellDraft {
	readonly cellId: string;
	readonly gridX: number;
	readonly gridY: number;
	readonly territoryId: string;
	readonly chunkId: string;
	readonly elevationMillimeters: number;
	readonly riverDistance: number;
	readonly localNoise: number;
	readonly timberNoise: number;
	readonly materialNoise: number;
}

interface SiteTemplate {
	readonly name: string;
	readonly kind: SiteState["kind"];
	readonly bounds: readonly [number, number, number, number];
	readonly activityKinds: readonly [string, string];
	readonly buildingKind: string | null;
}

const SITE_TEMPLATES: readonly SiteTemplate[] = [
	{
		name: "Commons",
		kind: "civic",
		bounds: [48_000, 38_000, 72_000, 62_000],
		activityKinds: ["meet", "rendezvous"],
		buildingKind: "meeting-hall",
	},
	{
		name: "Weststead",
		kind: "residential",
		bounds: [8_000, 12_000, 40_000, 44_000],
		activityKinds: ["enter", "rest"],
		buildingKind: "shared-dwelling",
	},
	{
		name: "Storeyard",
		kind: "storage",
		bounds: [80_000, 14_000, 112_000, 44_000],
		activityKinds: ["enter", "store"],
		buildingKind: "storehouse",
	},
	{
		name: "Workshop",
		kind: "production",
		bounds: [76_000, 64_000, 112_000, 92_000],
		activityKinds: ["enter", "work"],
		buildingKind: "open-workshop",
	},
	{
		name: "Gathering Ground",
		kind: "resource",
		bounds: [8_000, 62_000, 44_000, 92_000],
		activityKinds: ["gather", "load"],
		buildingKind: null,
	},
];

const SETTLEMENT_NAMES = [
	"Alderwake",
	"Brackenford",
	"Cairnwater",
	"Dawnmere",
	"Emberfield",
	"Foxhollow",
] as const;

const PLACE_KINDS = [
	"meeting",
	"dwelling",
	"storage",
	"work",
	"resource",
] as const;

function required<T>(value: T | undefined, label: string): T {
	if (value === undefined) throw new Error(`missing ${label}`);
	return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function basisPoints(value: number): number {
	return clamp(Math.trunc(value), 0, BASIS_POINTS);
}

function canonical<T>(release: ReleaseGenesis, value: T): CanonicalRecord<T> {
	return {
		dataClass: "canonical",
		validity: {
			validFromSimulationTime: 0,
			validUntilSimulationTime: null,
		},
		provenance: {
			sourceKind: "genesis",
			sourceId: release.genesisHash,
			schemaVersion: release.versions.worldSchema,
		},
		value,
	};
}

function asRecord<T>(
	entries: readonly (readonly [string, CanonicalRecord<T>])[],
): Readonly<Record<string, CanonicalRecord<T>>> {
	return Object.fromEntries(entries);
}

async function draws(
	seed: Uint8Array,
	entityId: string,
	purpose: string,
	count: number,
): Promise<readonly number[]> {
	let state = await seedPrng(seed, "worldgen-v1", entityId, purpose);
	const values: number[] = [];
	for (let index = 0; index < count; index += 1) {
		const draw = drawBounded(state, BASIS_POINTS + 1);
		values.push(draw.value);
		state = draw.state;
	}
	return values;
}

function territoryIndex(gridX: number, gridY: number): number {
	return (
		(gridY >= WORLD_GRID_HEIGHT / 2 ? 2 : 0) +
		(gridX >= WORLD_GRID_WIDTH / 2 ? 1 : 0)
	);
}

function cellIndex(gridX: number, gridY: number): number {
	return gridY * WORLD_GRID_WIDTH + gridX;
}

function position(xMillimeters: number, yMillimeters: number): MetricPosition {
	return { xMillimeters, yMillimeters, elevationMillimeters: 0 };
}

function metricBounds(
	minimumX: number,
	minimumY: number,
	maximumX: number,
	maximumY: number,
): MetricBounds {
	return {
		minimum: position(minimumX, minimumY),
		maximum: {
			xMillimeters: maximumX,
			yMillimeters: maximumY,
			elevationMillimeters: 12_000,
		},
	};
}

function terrainFor(input: {
	readonly isRiver: boolean;
	readonly riverDistance: number;
	readonly elevation: number;
	readonly timber: number;
	readonly material: number;
	readonly localNoise: number;
}): TerrainKind {
	if (input.isRiver) return "water";
	if (input.riverDistance === 1 && input.localNoise < 4_300) return "wetland";
	if (input.elevation >= 112_000) return "highland";
	if (input.material >= 7_300) return "rock";
	if (input.timber >= 6_200) return "woodland";
	return "plain";
}

async function validateReleaseGenesis(release: ReleaseGenesis): Promise<void> {
	if (release.versions.generator !== GENERATOR_VERSION) {
		throw new RangeError(`unsupported generator ${release.versions.generator}`);
	}
	if (release.versions.worldSchema !== WORLD_SCHEMA_VERSION) {
		throw new RangeError(
			`unsupported world schema ${release.versions.worldSchema}`,
		);
	}
	const reconstructed = await createReleaseGenesis({
		releaseId: release.releaseId,
		seedHex: release.seedHex,
		versions: release.versions,
	});
	if (reconstructed.genesisHash !== release.genesisHash) {
		throw new Error(
			"Release Genesis hash does not match its versioned identity",
		);
	}
}

export interface GenerateWorldInput {
	readonly releaseGenesis: ReleaseGenesis;
	readonly worldId?: string;
	readonly treatmentId?: string;
}

export interface TerritoryMigrationRoute {
	readonly originSettlementId: string;
	readonly destinationTerritoryId: string;
	readonly destinationCellId: string;
	readonly cellIds: readonly string[];
	readonly traversalUnitsByLeg: readonly number[];
	readonly totalTraversalUnits: number;
}

function worldValues<T>(
	record: Readonly<Record<string, CanonicalRecord<T>>>,
): T[] {
	return Object.values(record).map((entry) => entry.value);
}

function migrationRecord<T>(input: {
	readonly value: T;
	readonly sourceId: string;
	readonly simulationTime: number;
}): CanonicalRecord<T> {
	return {
		dataClass: "canonical",
		validity: {
			validFromSimulationTime: input.simulationTime,
			validUntilSimulationTime: null,
		},
		provenance: {
			sourceKind: "migration",
			sourceId: input.sourceId,
			schemaVersion: "eonfolk-world-founding-v1",
		},
		value: input.value,
	};
}

function freezeWorld<T>(value: T): T {
	if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
		for (const child of Object.values(value as Record<string, unknown>))
			freezeWorld(child);
		Object.freeze(value);
	}
	return value;
}

function cloneWorld<T>(value: T): T {
	if (Array.isArray(value)) return value.map((item) => cloneWorld(item)) as T;
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, cloneWorld(item)]),
		) as T;
	return value;
}

/**
 * Plans a deterministic physical cell route. The least traversal cost wins;
 * canonical cell IDs break ties so object insertion order never affects it.
 */
export function planTerritoryMigrationRoute(
	world: GeneratedWorldState,
	input: {
		readonly originSettlementId: string;
		readonly destinationTerritoryId: string;
	},
): TerritoryMigrationRoute {
	const origin = world.settlements[input.originSettlementId]?.value;
	if (origin === undefined)
		throw new RangeError(
			`unknown origin settlement ${input.originSettlementId}`,
		);
	if (world.territories[input.destinationTerritoryId] === undefined)
		throw new RangeError(
			`unknown destination territory ${input.destinationTerritoryId}`,
		);
	const cells = worldValues(world.cells);
	const byId = new Map(cells.map((cell) => [cell.cellId, cell]));
	const byCoordinate = new Map(
		cells.map((cell) => [`${cell.gridX}:${cell.gridY}`, cell]),
	);
	const start = byId.get(origin.anchorCellId);
	if (start === undefined)
		throw new Error("origin settlement lacks anchor cell");
	const target = cells
		.filter(
			(cell) =>
				cell.territoryId === input.destinationTerritoryId &&
				cell.terrain !== "water",
		)
		.sort(
			(left, right) =>
				right.settlementSuitabilityBasisPoints -
					left.settlementSuitabilityBasisPoints ||
				left.cellId.localeCompare(right.cellId),
		)[0];
	if (target === undefined)
		throw new RangeError("destination territory has no traversable cell");

	const costs = new Map<string, number>([[start.cellId, 0]]);
	const parents = new Map<string, string>();
	const frontier = new Set<string>([start.cellId]);
	while (frontier.size > 0) {
		const currentId = [...frontier].sort(
			(left, right) =>
				required(costs.get(left), `cost ${left}`) -
					required(costs.get(right), `cost ${right}`) ||
				left.localeCompare(right),
		)[0];
		if (currentId === undefined) break;
		frontier.delete(currentId);
		if (currentId === target.cellId) break;
		const current = required(byId.get(currentId), `route cell ${currentId}`);
		const neighbors = [
			[current.gridX - 1, current.gridY],
			[current.gridX + 1, current.gridY],
			[current.gridX, current.gridY - 1],
			[current.gridX, current.gridY + 1],
		]
			.map(([gridX, gridY]) => byCoordinate.get(`${gridX}:${gridY}`))
			.filter(
				(candidate): candidate is WorldCell =>
					candidate !== undefined && candidate.terrain !== "water",
			)
			.sort((left, right) => left.cellId.localeCompare(right.cellId));
		for (const neighbor of neighbors) {
			const nextCost =
				required(costs.get(currentId), `cost ${currentId}`) +
				1_000 +
				Math.trunc(
					(current.travelFrictionBasisPoints +
						neighbor.travelFrictionBasisPoints) /
						2,
				);
			const existing = costs.get(neighbor.cellId);
			const existingParent = parents.get(neighbor.cellId);
			if (
				existing === undefined ||
				nextCost < existing ||
				(nextCost === existing &&
					(existingParent === undefined ||
						currentId.localeCompare(existingParent) < 0))
			) {
				costs.set(neighbor.cellId, nextCost);
				parents.set(neighbor.cellId, currentId);
				frontier.add(neighbor.cellId);
			}
		}
	}
	if (!costs.has(target.cellId))
		throw new RangeError("destination territory is unreachable by land");
	const reversed = [target.cellId];
	while (reversed.at(-1) !== start.cellId) {
		const parent = parents.get(required(reversed.at(-1), "route cursor"));
		if (parent === undefined)
			throw new Error("route parent chain is incomplete");
		reversed.push(parent);
	}
	const cellIds = reversed.reverse();
	const traversalUnitsByLeg = cellIds.slice(1).map((cellId, index) => {
		const from = required(
			byId.get(required(cellIds[index], "route from")),
			"route from cell",
		);
		const to = required(byId.get(cellId), "route to cell");
		return (
			1_000 +
			Math.trunc(
				(from.travelFrictionBasisPoints + to.travelFrictionBasisPoints) / 2,
			)
		);
	});
	return freezeWorld({
		originSettlementId: input.originSettlementId,
		destinationTerritoryId: input.destinationTerritoryId,
		destinationCellId: target.cellId,
		cellIds,
		traversalUnitsByLeg,
		totalTraversalUnits: traversalUnitsByLeg.reduce(
			(total, units) => total + units,
			0,
		),
	});
}

/** Materializes a viable founding into canonical world state. */
export function materializeFoundedSettlement(
	world: GeneratedWorldState,
	input: {
		readonly settlementId: string;
		readonly name: string;
		readonly territoryId: string;
		readonly anchorCellId: string;
		readonly founderCitizenIds: readonly string[];
		readonly residentCitizenIds: readonly string[];
		readonly migrationId: string;
		readonly foundedAtSimulationTime: number;
	},
): GeneratedWorldState {
	if (world.settlements[input.settlementId] !== undefined)
		throw new RangeError(`settlement ${input.settlementId} already exists`);
	if (
		!Number.isSafeInteger(input.foundedAtSimulationTime) ||
		input.foundedAtSimulationTime < 0
	)
		throw new RangeError("founding time must be a non-negative safe integer");
	if (input.founderCitizenIds.length === 0)
		throw new RangeError("a founded settlement needs a founder");
	const anchor = world.cells[input.anchorCellId]?.value;
	if (
		anchor === undefined ||
		anchor.terrain === "water" ||
		anchor.territoryId !== input.territoryId
	)
		throw new RangeError("founding anchor is not traversable destination land");
	const localSpaceId = `${input.settlementId}:local-space`;
	const siteId = `${input.settlementId}:founding-site`;
	if (
		world.localSpaces[localSpaceId] !== undefined ||
		world.sites[siteId] !== undefined
	)
		throw new RangeError("founding world identifiers already exist");
	const localSpace = migrationRecord<LocalSpaceState>({
		sourceId: input.migrationId,
		simulationTime: input.foundedAtSimulationTime,
		value: {
			localSpaceId,
			settlementId: input.settlementId,
			bounds: metricBounds(0, 0, 60_000, 60_000),
			siteIds: [siteId],
			routeIds: [],
		},
	});
	const site = migrationRecord<SiteState>({
		sourceId: input.migrationId,
		simulationTime: input.foundedAtSimulationTime,
		value: {
			siteId,
			localSpaceId,
			cellId: input.anchorCellId,
			name: "Founding ground",
			kind: "undeveloped",
			bounds: metricBounds(0, 0, 60_000, 60_000),
			placeIds: [],
			buildingIds: [],
			interactionSlotIds: [],
		},
	});
	const settlement = migrationRecord<SettlementState>({
		sourceId: input.migrationId,
		simulationTime: input.foundedAtSimulationTime,
		value: {
			settlementId: input.settlementId,
			name: input.name,
			territoryId: input.territoryId,
			anchorCellId: input.anchorCellId,
			localSpaceId,
			foundedAtSimulationTime: input.foundedAtSimulationTime,
			founderCitizenIds: [...input.founderCitizenIds].sort(),
			residentCitizenIds: [...input.residentCitizenIds].sort(),
			householdIds: [],
			institutionIds: [],
			siteIds: [siteId],
		},
	});
	return freezeWorld(
		cloneWorld({
			...world,
			localSpaces: { ...world.localSpaces, [localSpaceId]: localSpace },
			settlements: {
				...world.settlements,
				[input.settlementId]: settlement,
			},
			sites: { ...world.sites, [siteId]: site },
		}),
	);
}

export async function generateWorld(
	input: GenerateWorldInput,
): Promise<GeneratedWorldState> {
	const release = input.releaseGenesis;
	await validateReleaseGenesis(release);
	const seed = bytesFromHex(release.seedHex, 32);
	const identity = await createExperimentWorldIdentity({
		worldId: input.worldId ?? "canonical-world",
		releaseGenesisHash: release.genesisHash,
		treatmentId: input.treatmentId ?? "standard-brain",
	});
	const regionId = await stableId("region", seed, 0);
	const territoryIds = await Promise.all(
		Array.from({ length: WORLD_TERRITORY_COUNT }, (_, index) =>
			stableId("territory", seed, index),
		),
	);
	const chunkIds = await Promise.all(
		Array.from({ length: WORLD_CHUNK_COUNT }, (_, index) =>
			stableId("chunk", seed, index),
		),
	);
	const cellIds = await Promise.all(
		Array.from({ length: WORLD_GRID_WIDTH * WORLD_GRID_HEIGHT }, (_, index) =>
			stableId("cell", seed, index),
		),
	);

	const macro = await draws(seed, "region-0", "macro-shape", 5);
	const hillX = required(macro[0], "hill x") % WORLD_GRID_WIDTH;
	const hillY = required(macro[1], "hill y") % WORLD_GRID_HEIGHT;
	const forestBias = required(macro[2], "forest bias") - 5_000;
	const climateBias = required(macro[3], "climate bias") - 5_000;
	let riverColumn = 1 + (required(macro[4], "river origin") % 6);
	const riverColumns: number[] = [];
	for (let gridY = 0; gridY < WORLD_GRID_HEIGHT; gridY += 1) {
		const [meander] = await draws(seed, `river-row-${gridY}`, "meander", 1);
		riverColumn = clamp(
			riverColumn + (required(meander, "river meander") % 3) - 1,
			1,
			WORLD_GRID_WIDTH - 2,
		);
		riverColumns.push(riverColumn);
	}

	const drafts: CellDraft[] = [];
	for (let gridY = 0; gridY < WORLD_GRID_HEIGHT; gridY += 1) {
		for (let gridX = 0; gridX < WORLD_GRID_WIDTH; gridX += 1) {
			const index = cellIndex(gridX, gridY);
			const partitionIndex = territoryIndex(gridX, gridY);
			const noise = await draws(seed, `cell-${gridX}-${gridY}`, "terrain", 3);
			const hillDistance = Math.abs(gridX - hillX) + Math.abs(gridY - hillY);
			const elevationMillimeters = clamp(
				66_000 +
					Math.max(0, 8 - hillDistance) * 7_000 +
					required(noise[0], "elevation noise") -
					5_000,
				40_000,
				130_000,
			);
			drafts.push({
				cellId: required(cellIds[index], `cell ID ${index}`),
				gridX,
				gridY,
				territoryId: required(
					territoryIds[partitionIndex],
					`territory for ${gridX},${gridY}`,
				),
				chunkId: required(
					chunkIds[partitionIndex],
					`chunk for ${gridX},${gridY}`,
				),
				elevationMillimeters,
				riverDistance: Math.abs(
					gridX - required(riverColumns[gridY], `river row ${gridY}`),
				),
				localNoise: required(noise[0], "local noise"),
				timberNoise: required(noise[1], "timber noise"),
				materialNoise: required(noise[2], "material noise"),
			});
		}
	}

	const cellValues: WorldCell[] = drafts.map((draft) => {
		let greatestNeighborDelta = 0;
		for (const [offsetX, offsetY] of [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
		] as const) {
			const neighborX = draft.gridX + offsetX;
			const neighborY = draft.gridY + offsetY;
			if (
				neighborX < 0 ||
				neighborX >= WORLD_GRID_WIDTH ||
				neighborY < 0 ||
				neighborY >= WORLD_GRID_HEIGHT
			)
				continue;
			const neighbor = required(
				drafts[cellIndex(neighborX, neighborY)],
				`neighbor ${neighborX},${neighborY}`,
			);
			greatestNeighborDelta = Math.max(
				greatestNeighborDelta,
				Math.abs(draft.elevationMillimeters - neighbor.elevationMillimeters),
			);
		}
		const slope = basisPoints(Math.trunc(greatestNeighborDelta / 2));
		const water = basisPoints(
			9_800 -
				draft.riverDistance * 1_550 +
				Math.trunc((draft.localNoise - 5_000) / 8),
		);
		const timber = basisPoints(
			3_400 +
				Math.trunc(forestBias / 3) +
				Math.trunc((draft.timberNoise - 5_000) / 2) +
				Math.trunc((BASIS_POINTS - slope) / 5),
		);
		const material = basisPoints(
			1_500 +
				Math.trunc(draft.elevationMillimeters / 20) +
				Math.trunc((draft.materialNoise - 5_000) / 2),
		);
		const isRiver = draft.riverDistance === 0 && !FORD_ROWS.has(draft.gridY);
		const terrain = terrainFor({
			isRiver,
			riverDistance: draft.riverDistance,
			elevation: draft.elevationMillimeters,
			timber,
			material,
			localNoise: draft.localNoise,
		});
		const productivity = basisPoints(
			2_200 +
				Math.trunc(water / 2) -
				Math.trunc((slope * 18) / 100) +
				Math.trunc(climateBias / 4) +
				Math.trunc((draft.localNoise - 5_000) / 4),
		);
		const terrainFriction: Readonly<Record<TerrainKind, number>> = {
			water: 10_000,
			wetland: 5_500,
			plain: 1_200,
			woodland: 2_900,
			rock: 3_700,
			highland: 4_500,
		};
		const travelFriction = basisPoints(
			terrainFriction[terrain] + Math.trunc(slope / 3),
		);
		const suitability =
			terrain === "water"
				? 0
				: basisPoints(
						Math.trunc((productivity * 42) / 100) +
							Math.trunc((water * 20) / 100) +
							Math.trunc(((BASIS_POINTS - travelFriction) * 28) / 100) +
							Math.trunc((material * 10) / 100),
					);
		return {
			cellId: draft.cellId,
			regionId,
			chunkId: draft.chunkId,
			territoryId: draft.territoryId,
			gridX: draft.gridX,
			gridY: draft.gridY,
			terrain,
			elevationMillimeters: draft.elevationMillimeters,
			slopeBasisPoints: slope,
			waterAvailabilityBasisPoints: water,
			productivityBasisPoints: productivity,
			timberBasisPoints: timber,
			materialBasisPoints: material,
			travelFrictionBasisPoints: travelFriction,
			settlementSuitabilityBasisPoints: suitability,
		};
	});

	const anchor = required(
		cellValues
			.filter(
				(cell) =>
					cell.gridX > 0 &&
					cell.gridX < WORLD_GRID_WIDTH - 1 &&
					cell.gridY > 0 &&
					cell.gridY < WORLD_GRID_HEIGHT - 1 &&
					cell.terrain !== "water",
			)
			.sort(
				(left, right) =>
					right.settlementSuitabilityBasisPoints -
						left.settlementSuitabilityBasisPoints ||
					left.cellId.localeCompare(right.cellId),
			)[0],
		"settlement anchor",
	);

	const settlementId = await stableId("settlement", seed, 0);
	const localSpaceId = await stableId("local-space", seed, 0);
	const siteIds = await Promise.all(
		SITE_TEMPLATES.map((_, index) => stableId("site", seed, index)),
	);
	const placeIds = await Promise.all(
		SITE_TEMPLATES.map((_, index) => stableId("place", seed, index)),
	);
	const interactionSlotIds = await Promise.all(
		Array.from({ length: INITIAL_SITE_COUNT * 2 }, (_, index) =>
			stableId("interaction-slot", seed, index),
		),
	);
	const buildingIds = await Promise.all(
		SITE_TEMPLATES.filter((template) => template.buildingKind !== null).map(
			(_, index) => stableId("building", seed, index),
		),
	);
	const routeIds = await Promise.all(
		Array.from({ length: INITIAL_SITE_COUNT - 1 }, (_, index) =>
			stableId("route", seed, index),
		),
	);

	const slotValues: InteractionSlotState[] = [];
	const buildingValues: BuildingState[] = [];
	const placeValues: PlaceState[] = [];
	const siteValues: SiteState[] = SITE_TEMPLATES.map((template, index) => {
		const [minimumX, minimumY, maximumX, maximumY] = template.bounds;
		const siteId = required(siteIds[index], `site ID ${index}`);
		const entranceSlotId = required(
			interactionSlotIds[index * 2],
			`entrance slot ${index}`,
		);
		const workSlotId = required(
			interactionSlotIds[index * 2 + 1],
			`work slot ${index}`,
		);
		const placeId = required(placeIds[index], `place ID ${index}`);
		const centerX = Math.trunc((minimumX + maximumX) / 2);
		const centerY = Math.trunc((minimumY + maximumY) / 2);
		slotValues.push(
			{
				interactionSlotId: entranceSlotId,
				siteId,
				position: position(centerX, minimumY + 2_000),
				facingMilliDegrees: 180_000,
				activityKinds: [template.activityKinds[0]],
				capacity: 2,
			},
			{
				interactionSlotId: workSlotId,
				siteId,
				position: position(centerX, centerY),
				facingMilliDegrees: 0,
				activityKinds: [template.activityKinds[1]],
				capacity: index === 0 ? 8 : 3,
			},
		);
		placeValues.push({
			placeId,
			siteId,
			name: template.name,
			kind: required(PLACE_KINDS[index], `place kind ${index}`),
			position: position(centerX, centerY),
			interactionSlotIds: [entranceSlotId, workSlotId],
		});
		const buildingId =
			template.buildingKind === null
				? null
				: required(buildingIds[index], `building ID ${index}`);
		if (buildingId !== null && template.buildingKind !== null) {
			buildingValues.push({
				buildingId,
				siteId,
				buildingKind: template.buildingKind,
				position: position(centerX, centerY),
				entranceSlotId,
				conditionBasisPoints: BASIS_POINTS,
				capacity: index === 0 ? 12 : 6,
			});
		}
		return {
			siteId,
			localSpaceId,
			cellId: anchor.cellId,
			name: template.name,
			kind: template.kind,
			bounds: metricBounds(minimumX, minimumY, maximumX, maximumY),
			placeIds: [placeId],
			buildingIds: buildingId === null ? [] : [buildingId],
			interactionSlotIds: [entranceSlotId, workSlotId],
		};
	});

	const centerSite = required(siteValues[0], "center site");
	const centerTemplate = required(SITE_TEMPLATES[0], "center template");
	const center = position(
		Math.trunc((centerTemplate.bounds[0] + centerTemplate.bounds[2]) / 2),
		Math.trunc((centerTemplate.bounds[1] + centerTemplate.bounds[3]) / 2),
	);
	const routeValues: RouteState[] = siteValues.slice(1).map((site, index) => {
		const template = required(SITE_TEMPLATES[index + 1], `route site ${index}`);
		const target = position(
			Math.trunc((template.bounds[0] + template.bounds[2]) / 2),
			Math.trunc((template.bounds[1] + template.bounds[3]) / 2),
		);
		return {
			routeId: required(routeIds[index], `route ID ${index}`),
			localSpaceId,
			fromSiteId: centerSite.siteId,
			toSiteId: site.siteId,
			waypoints: [
				center,
				position(target.xMillimeters, center.yMillimeters),
				target,
			],
			distanceMillimeters:
				Math.abs(target.xMillimeters - center.xMillimeters) +
				Math.abs(target.yMillimeters - center.yMillimeters),
			travelFrictionBasisPoints: Math.max(
				1_000,
				anchor.travelFrictionBasisPoints,
			),
		};
	});

	const region: RegionState = {
		regionId,
		name: "Genesis Reach",
		cellIds,
		chunkIds,
		territoryIds,
		neighboringRegionIds: [],
	};
	const chunkValues: ChunkState[] = chunkIds.map((chunkId, index) => {
		const minimumX = index % 2 === 0 ? 0 : WORLD_GRID_WIDTH / 2;
		const minimumY = index < 2 ? 0 : WORLD_GRID_HEIGHT / 2;
		return {
			chunkId,
			regionId,
			gridMinimumX: minimumX,
			gridMinimumY: minimumY,
			gridMaximumX: minimumX + WORLD_GRID_WIDTH / 2 - 1,
			gridMaximumY: minimumY + WORLD_GRID_HEIGHT / 2 - 1,
			cellIds: cellValues
				.filter((cell) => cell.chunkId === chunkId)
				.map((cell) => cell.cellId),
			territoryIds: [required(territoryIds[index], `chunk territory ${index}`)],
		};
	});
	const territoryValues: TerritoryState[] = territoryIds.map(
		(territoryId, index) => ({
			territoryId,
			regionId,
			cellIds: cellValues
				.filter((cell) => territoryIndex(cell.gridX, cell.gridY) === index)
				.map((cell) => cell.cellId),
			controllingInstitutionId: null,
		}),
	);
	const settlementNameDraw = required(
		(await draws(seed, "settlement-0", "name", 1))[0],
		"settlement name",
	);
	const settlement: SettlementState = {
		settlementId,
		name: required(
			SETTLEMENT_NAMES[settlementNameDraw % SETTLEMENT_NAMES.length],
			"settlement name option",
		),
		territoryId: anchor.territoryId,
		anchorCellId: anchor.cellId,
		localSpaceId,
		foundedAtSimulationTime: 0,
		founderCitizenIds: [],
		residentCitizenIds: [],
		householdIds: [],
		institutionIds: [],
		siteIds,
	};

	return {
		identity,
		generatedAtSimulationTime: 0,
		regions: { [regionId]: canonical(release, region) },
		chunks: asRecord(
			chunkValues.map((value) => [value.chunkId, canonical(release, value)]),
		),
		territories: asRecord(
			territoryValues.map((value) => [
				value.territoryId,
				canonical(release, value),
			]),
		),
		cells: asRecord(
			cellValues.map((value) => [value.cellId, canonical(release, value)]),
		),
		localSpaces: {
			[localSpaceId]: canonical(release, {
				localSpaceId,
				settlementId,
				bounds: metricBounds(0, 0, 120_000, 100_000),
				siteIds,
				routeIds,
			}),
		},
		settlements: { [settlementId]: canonical(release, settlement) },
		sites: asRecord(
			siteValues.map((value) => [value.siteId, canonical(release, value)]),
		),
		places: asRecord(
			placeValues.map((value) => [value.placeId, canonical(release, value)]),
		),
		buildings: asRecord(
			buildingValues.map((value) => [
				value.buildingId,
				canonical(release, value),
			]),
		),
		routes: asRecord(
			routeValues.map((value) => [value.routeId, canonical(release, value)]),
		),
		interactionSlots: asRecord(
			slotValues.map((value) => [
				value.interactionSlotId,
				canonical(release, value),
			]),
		),
	};
}
