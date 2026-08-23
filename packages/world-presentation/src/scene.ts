import type {
	PhysicalScaleManifest,
	SpatialEdge,
	SpatialNode,
	SpatialSceneDefinition,
} from "./types";

export interface ChronicleCameraComposition {
	readonly key: "advice" | "choice" | "consequence";
	readonly distanceM: number;
	readonly yawDegrees: number;
	readonly pitchDegrees: number;
}

const chronicleCameraCompositions = Object.freeze([
	Object.freeze({
		key: "advice",
		distanceM: 22,
		yawDegrees: 4,
		pitchDegrees: 50,
	}),
	Object.freeze({
		key: "choice",
		distanceM: 17,
		yawDegrees: 32,
		pitchDegrees: 46,
	}),
	Object.freeze({
		key: "consequence",
		distanceM: 20,
		yawDegrees: -28,
		pitchDegrees: 54,
	}),
] as const satisfies readonly ChronicleCameraComposition[]);

/** Stable, bounded compositions for the three accepted Chronicle beats. */
export function chronicleCameraComposition(
	beatId: string,
): ChronicleCameraComposition {
	const parsed = /^beat:(\d+)$/u.exec(beatId);
	const ordinal = Number(parsed?.[1] ?? 1);
	return chronicleCameraCompositions[
		Math.max(0, Math.min(chronicleCameraCompositions.length - 1, ordinal - 1))
	]!;
}

interface NodeOptions {
	readonly affordance?: SpatialNode["affordance"];
	readonly capacity?: number;
	readonly facingDegrees?: number;
	readonly occupantSpacingMm?: number;
	readonly waitingNodeIds?: readonly string[];
}

const node = (
	nodeId: string,
	placeId: string,
	x: number,
	z: number,
	options: NodeOptions = {},
): SpatialNode => ({
	nodeId,
	placeId,
	x,
	y: 0,
	z,
	affordance: options.affordance ?? "transit",
	capacity: options.capacity ?? 1,
	facingDegrees: options.facingDegrees ?? 0,
	occupantSpacingMm: options.occupantSpacingMm ?? 900,
	waitingNodeIds: Object.freeze([...(options.waitingNodeIds ?? [])]),
});

const nodes = [
	node("market:west", "market", -8_000, 1_000),
	node("market:center", "market", 0, 0),
	node("market:east", "market", 8_000, 1_000),
	node("market:tally", "market", -2_200, -3_400, {
		affordance: "work",
		facingDegrees: 145,
	}),
	node("market:store", "market", 3_800, -3_000, {
		affordance: "storage",
		facingDegrees: 180,
	}),
	node("market:exchange-west", "market", 500, 3_200, {
		affordance: "interaction",
		facingDegrees: 90,
		occupantSpacingMm: 1_500,
		waitingNodeIds: ["market:queue"],
	}),
	node("market:exchange-east", "market", 2_000, 3_200, {
		affordance: "interaction",
		facingDegrees: -90,
		occupantSpacingMm: 1_500,
		waitingNodeIds: ["market:queue"],
	}),
	node("market:queue", "market", 3_600, 4_400, {
		affordance: "rendezvous",
		capacity: 2,
		facingDegrees: -125,
		occupantSpacingMm: 1_200,
	}),
	node("granary:entry", "granary", -14_000, -24_000, {
		affordance: "entrance",
		capacity: 2,
		facingDegrees: 180,
	}),
	node("granary:desk", "granary", -11_800, -27_000, {
		affordance: "work",
		facingDegrees: -90,
	}),
	node("granary:store", "granary", -16_000, -28_000, {
		affordance: "storage",
		facingDegrees: 90,
	}),
	node("fields:entry", "fields", -30_000, -48_000, {
		affordance: "entrance",
		capacity: 2,
		facingDegrees: -140,
	}),
	node("fields:work", "fields", -40_000, -61_000, {
		affordance: "resource",
		capacity: 3,
		facingDegrees: -25,
		occupantSpacingMm: 1_800,
	}),
	node("spring:entry", "spring", -39_000, 18_000, {
		affordance: "entrance",
		capacity: 2,
		facingDegrees: -50,
	}),
	node("spring:wait", "spring", -44_000, 23_000, {
		affordance: "rendezvous",
		capacity: 2,
		facingDegrees: -50,
		occupantSpacingMm: 1_200,
	}),
	node("spring:work", "spring", -47_000, 26_000, {
		affordance: "resource",
		capacity: 2,
		facingDegrees: 130,
		occupantSpacingMm: 1_400,
		waitingNodeIds: ["spring:wait"],
	}),
	node("woods:entry", "woods", 44_000, 29_000, {
		affordance: "entrance",
		capacity: 2,
		facingDegrees: 45,
	}),
	node("woods:work", "woods", 59_000, 43_000, {
		affordance: "resource",
		capacity: 3,
		facingDegrees: 30,
		occupantSpacingMm: 2_400,
	}),
	node("mill:entry", "mill", 35_000, 8_000, {
		affordance: "entrance",
		capacity: 2,
		facingDegrees: 90,
	}),
	node("mill:work", "mill", 43_000, 5_000, {
		affordance: "work",
		facingDegrees: 90,
		waitingNodeIds: ["mill:entry"],
	}),
	node("mill:wooddrop", "mill", 40_000, 13_000, {
		affordance: "storage",
		capacity: 2,
		facingDegrees: 180,
		occupantSpacingMm: 1_200,
	}),
] as const;

export const humanSettlementPhysicalScale: PhysicalScaleManifest =
	Object.freeze({
		citizen: Object.freeze({ heightMm: 1_750, shoulderWidthMm: 500 }),
		door: Object.freeze({ heightMm: 2_050, widthMm: 900 }),
		house: Object.freeze({
			widthMm: 7_200,
			depthMm: 6_000,
			ridgeHeightMm: 5_400,
		}),
		road: Object.freeze({ primaryWidthMm: 4_200, footpathWidthMm: 1_800 }),
		tree: Object.freeze({ matureHeightMm: 11_000, canopyDiameterMm: 6_500 }),
		market: Object.freeze({ clearDiameterMm: 28_000, stallWidthMm: 3_000 }),
		mill: Object.freeze({
			widthMm: 9_000,
			depthMm: 8_000,
			ridgeHeightMm: 7_000,
			wheelDiameterMm: 4_800,
		}),
		interaction: Object.freeze({
			faceToFaceSpacingMm: 1_500,
			waitingSpacingMm: 1_200,
		}),
	});

/** Backward-compatible fixture name for the shared authored human scale. */
export const riverholdPhysicalScale = humanSettlementPhysicalScale;

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
	physicalScale: riverholdPhysicalScale,
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

export function validateRiverholdSpatialScene(): readonly string[] {
	const issues: string[] = [];
	const scale = riverholdSpatialScene.physicalScale;
	if (scale.citizen.heightMm < 1_600 || scale.citizen.heightMm > 1_900)
		issues.push("citizen height must remain within the 1.6-1.9 metre contract");
	if (scale.door.heightMm < 1_950 || scale.door.heightMm > 2_200)
		issues.push("door height must remain approximately two metres");
	if (scale.house.widthMm < 5_000 || scale.house.ridgeHeightMm < 4_000)
		issues.push("house dimensions must remain human-scale and inhabitable");
	if (scale.road.primaryWidthMm < 3_000 || scale.road.footpathWidthMm < 1_200)
		issues.push("roads and footpaths must remain traversable at human scale");
	if (scale.tree.matureHeightMm < 7_000)
		issues.push("mature trees must visually exceed the houses and citizens");
	if (scale.market.clearDiameterMm < 20_000)
		issues.push("market clear space must support visible shared activity");
	if (scale.mill.widthMm < 7_000 || scale.mill.wheelDiameterMm < 3_000)
		issues.push("mill dimensions must read as a working landmark");
	if (
		scale.interaction.faceToFaceSpacingMm < 900 ||
		scale.interaction.faceToFaceSpacingMm > 1_800
	)
		issues.push("interaction spacing must remain socially legible");
	for (const nodeDefinition of Object.values(riverholdSpatialScene.nodes)) {
		if (
			!Number.isSafeInteger(nodeDefinition.capacity) ||
			nodeDefinition.capacity < 1
		)
			issues.push(`${nodeDefinition.nodeId} has invalid affordance capacity`);
		if (
			!Number.isFinite(nodeDefinition.facingDegrees) ||
			nodeDefinition.facingDegrees < -180 ||
			nodeDefinition.facingDegrees > 180
		)
			issues.push(`${nodeDefinition.nodeId} has invalid authored facing`);
		if (nodeDefinition.occupantSpacingMm < 600)
			issues.push(`${nodeDefinition.nodeId} has implausible occupant spacing`);
		for (const waitingNodeId of nodeDefinition.waitingNodeIds) {
			const waitingNode = riverholdSpatialScene.nodes[waitingNodeId];
			if (waitingNode === undefined)
				issues.push(
					`${nodeDefinition.nodeId} references missing wait node ${waitingNodeId}`,
				);
			else if (waitingNode.placeId !== nodeDefinition.placeId)
				issues.push(
					`${nodeDefinition.nodeId} wait node crosses place boundaries`,
				);
			else if (
				waitingNode.affordance !== "rendezvous" &&
				waitingNode.affordance !== "entrance"
			)
				issues.push(
					`${nodeDefinition.nodeId} wait node is not a waiting affordance`,
				);
		}
	}
	return Object.freeze(issues);
}
