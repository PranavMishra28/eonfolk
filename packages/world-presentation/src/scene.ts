import type { SpatialEdge, SpatialNode, SpatialSceneDefinition } from "./types";

const node = (
	nodeId: string,
	placeId: string,
	x: number,
	z: number,
): SpatialNode => ({ nodeId, placeId, x, y: 0, z });

const nodes = [
	node("market:west", "market", -3_800, 400),
	node("market:center", "market", 0, 0),
	node("market:east", "market", 3_800, 400),
	node("market:tally", "market", -900, -1_600),
	node("market:store", "market", 1_600, -1_400),
	node("market:exchange-west", "market", 300, 1_300),
	node("market:exchange-east", "market", 1_500, 1_300),
	node("granary:entry", "granary", -1_700, -5_600),
	node("granary:desk", "granary", -1_000, -7_100),
	node("fields:entry", "fields", -3_800, -9_000),
	node("fields:work", "fields", -5_800, -10_600),
	node("spring:entry", "spring", -6_000, 2_800),
	node("spring:work", "spring", -7_700, 4_600),
	node("woods:entry", "woods", 6_500, 4_200),
	node("woods:work", "woods", 8_300, 6_300),
	node("mill:entry", "mill", 5_600, 1_600),
	node("mill:work", "mill", 7_600, 800),
	node("mill:wooddrop", "mill", 7_000, 2_500),
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
	schemaVersion: "riverhold-spatial-scene-v1",
	sceneVersion: "riverhold-low-poly-v1",
	nodes: byId,
	edges: Object.freeze(edges),
	blockedVolumes: Object.freeze([
		{
			volumeId: "granary-building",
			minX: -3_300,
			maxX: -1_900,
			minZ: -7_900,
			maxZ: -5_900,
		},
		{
			volumeId: "mill-building",
			minX: 6_000,
			maxX: 7_400,
			minZ: -700,
			maxZ: 700,
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
