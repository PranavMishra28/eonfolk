import type { SpatialEdge, SpatialNode, SpatialSceneDefinition } from "./types";

const node = (
	nodeId: string,
	placeId: string,
	x: number,
	z: number,
	affordance: SpatialNode["affordance"] = "transit",
): SpatialNode => ({ nodeId, placeId, x, y: 0, z, affordance });

const nodes = [
	node("market:west", "market", -8_000, 1_000),
	node("market:center", "market", 0, 0),
	node("market:east", "market", 8_000, 1_000),
	node("market:tally", "market", -2_200, -3_400, "work"),
	node("market:store", "market", 3_800, -3_000, "storage"),
	node("market:exchange-west", "market", 500, 3_200, "interaction"),
	node("market:exchange-east", "market", 2_000, 3_200, "interaction"),
	node("market:queue", "market", 3_600, 4_400, "rendezvous"),
	node("granary:entry", "granary", -14_000, -24_000, "entrance"),
	node("granary:desk", "granary", -11_800, -27_000, "work"),
	node("granary:store", "granary", -16_000, -28_000, "storage"),
	node("fields:entry", "fields", -30_000, -48_000, "entrance"),
	node("fields:work", "fields", -40_000, -61_000, "resource"),
	node("spring:entry", "spring", -39_000, 18_000, "entrance"),
	node("spring:wait", "spring", -44_000, 23_000, "rendezvous"),
	node("spring:work", "spring", -47_000, 26_000, "resource"),
	node("woods:entry", "woods", 44_000, 29_000, "entrance"),
	node("woods:work", "woods", 59_000, 43_000, "resource"),
	node("mill:entry", "mill", 35_000, 8_000, "entrance"),
	node("mill:work", "mill", 43_000, 5_000, "work"),
	node("mill:wooddrop", "mill", 40_000, 13_000, "storage"),
] as const;

const byId = Object.freeze(
	Object.fromEntries(nodes.map((entry) => [entry.nodeId, entry])),
) as Readonly<Record<string, SpatialNode>>;

const edgePairs = [
	["market:west", "market:center"],
	["market:center", "market:east"],
	["market:center", "market:tally"],
	["market:center", "market:store"],
	["market:center", "market:exchange-west"],
	["market:exchange-west", "market:exchange-east"],
	["market:east", "mill:entry"],
	["mill:entry", "mill:work"],
	["mill:entry", "mill:wooddrop"],
	["mill:entry", "woods:entry"],
	["woods:entry", "woods:work"],
	["market:west", "spring:entry"],
	["spring:entry", "spring:work"],
	["market:center", "granary:entry"],
	["granary:entry", "granary:desk"],
	["granary:entry", "fields:entry"],
	["fields:entry", "fields:work"],
] as const;

const distance = (first: SpatialNode, second: SpatialNode): number =>
	Math.round(Math.hypot(first.x - second.x, first.z - second.z));

const edges: SpatialEdge[] = edgePairs.flatMap(([left, right]) => {
	const first = byId[left];
	const second = byId[right];
	if (first === undefined || second === undefined)
		throw new Error(`Riverhold spatial edge references a missing node`);
	const costMm = distance(first, second);
	return [
		{ edgeId: `${left}>${right}`, fromNodeId: left, toNodeId: right, costMm },
		{ edgeId: `${right}>${left}`, fromNodeId: right, toNodeId: left, costMm },
	];
});

export const riverholdSpatialScene: SpatialSceneDefinition = Object.freeze({
	schemaVersion: "riverhold-spatial-scene-v2",
	sceneVersion: "riverhold-living-world-v2",
	metresPerWorldUnit: 1,
	regionExtentMm: Object.freeze({
		minX: -125_000,
		maxX: 125_000,
		minZ: -105_000,
		maxZ: 105_000,
	}),
	cells: Object.freeze({
		"cell:west": Object.freeze({
			cellId: "cell:west",
			regionId: "riverhold",
			centerMm: Object.freeze({ x: -50_000, y: 0, z: 0 }),
			radiusMm: 78_000,
			placeIds: Object.freeze(["spring", "fields"]),
		}),
		"cell:town": Object.freeze({
			cellId: "cell:town",
			regionId: "riverhold",
			centerMm: Object.freeze({ x: 0, y: 0, z: -8_000 }),
			radiusMm: 52_000,
			placeIds: Object.freeze(["market", "granary"]),
		}),
		"cell:east": Object.freeze({
			cellId: "cell:east",
			regionId: "riverhold",
			centerMm: Object.freeze({ x: 52_000, y: 0, z: 20_000 }),
			radiusMm: 78_000,
			placeIds: Object.freeze(["mill", "woods"]),
		}),
	}),
	places: Object.freeze({
		market: Object.freeze({
			placeId: "market",
			cellId: "cell:town",
			name: "Market Green",
			kind: "market",
			centerMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			affordanceNodeIds: Object.freeze([
				"market:west",
				"market:center",
				"market:east",
				"market:tally",
				"market:store",
				"market:exchange-west",
				"market:exchange-east",
				"market:queue",
			]),
		}),
		granary: Object.freeze({
			placeId: "granary",
			cellId: "cell:town",
			name: "Common Granary",
			kind: "storage",
			centerMm: Object.freeze({ x: -14_000, y: 0, z: -26_000 }),
			affordanceNodeIds: Object.freeze([
				"granary:entry",
				"granary:desk",
				"granary:store",
			]),
		}),
		fields: Object.freeze({
			placeId: "fields",
			cellId: "cell:west",
			name: "North Fields",
			kind: "field",
			centerMm: Object.freeze({ x: -38_000, y: 0, z: -56_000 }),
			affordanceNodeIds: Object.freeze(["fields:entry", "fields:work"]),
		}),
		spring: Object.freeze({
			placeId: "spring",
			cellId: "cell:west",
			name: "Low Spring",
			kind: "water",
			centerMm: Object.freeze({ x: -45_000, y: 0, z: 24_000 }),
			affordanceNodeIds: Object.freeze([
				"spring:entry",
				"spring:wait",
				"spring:work",
			]),
		}),
		woods: Object.freeze({
			placeId: "woods",
			cellId: "cell:east",
			name: "Alder Woods",
			kind: "forest",
			centerMm: Object.freeze({ x: 54_000, y: 0, z: 38_000 }),
			affordanceNodeIds: Object.freeze(["woods:entry", "woods:work"]),
		}),
		mill: Object.freeze({
			placeId: "mill",
			cellId: "cell:east",
			name: "River Mill",
			kind: "mill",
			centerMm: Object.freeze({ x: 40_000, y: 0, z: 8_000 }),
			affordanceNodeIds: Object.freeze([
				"mill:entry",
				"mill:work",
				"mill:wooddrop",
			]),
		}),
	}),
	nodes: byId,
	edges: Object.freeze(edges),
	blockedVolumes: Object.freeze([
		{
			volumeId: "granary-building",
			minX: -23_000,
			maxX: -17_000,
			minZ: -32_000,
			maxZ: -24_000,
		},
		{
			volumeId: "mill-building",
			minX: 36_000,
			maxX: 44_000,
			minZ: 0,
			maxZ: 4_000,
		},
	]),
});

export const placeDefaultNode: Readonly<Record<string, string>> = Object.freeze(
	{
		market: "market:center",
		granary: "granary:entry",
		mill: "mill:entry",
		spring: "spring:entry",
		woods: "woods:entry",
		fields: "fields:entry",
	},
);
