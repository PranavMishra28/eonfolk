export type AnimationClass =
	| "idle"
	| "walk"
	| "carry"
	| "gather"
	| "inspect"
	| "talk"
	| "listen"
	| "exchange"
	| "repair"
	| "eat-rest"
	| "react";

export type PropKind = "grain" | "logs" | "trade" | "tool" | "water";

export type ActivityKind =
	| "water"
	| "wood"
	| "food"
	| "trade"
	| "mill"
	| "investigate"
	| "council";

export interface SpatialPointMm {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface SpatialNode extends SpatialPointMm {
	readonly nodeId: string;
	readonly placeId: string;
	readonly affordance:
		| "entrance"
		| "interaction"
		| "work"
		| "storage"
		| "rendezvous"
		| "resource"
		| "rest"
		| "transit";
}

export type SemanticScale = "region" | "town" | "citizen";
export type FidelityClass = "LOD0" | "LOD1" | "LOD2" | "LOD3";

export interface SpatialCellDefinition {
	readonly cellId: string;
	readonly regionId: "riverhold";
	readonly centerMm: SpatialPointMm;
	readonly radiusMm: number;
	readonly placeIds: readonly string[];
}

export interface PlaceDefinition {
	readonly placeId: string;
	readonly cellId: string;
	readonly name: string;
	readonly kind:
		| "market"
		| "water"
		| "forest"
		| "field"
		| "mill"
		| "storage"
		| "home"
		| "civic";
	readonly centerMm: SpatialPointMm;
	readonly affordanceNodeIds: readonly string[];
}

export interface SpatialEdge {
	readonly edgeId: string;
	readonly fromNodeId: string;
	readonly toNodeId: string;
	readonly costMm: number;
}

export interface BlockedVolume {
	readonly volumeId: string;
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
}

export interface SpatialSceneDefinition {
	readonly schemaVersion: "riverhold-spatial-scene-v2";
	readonly sceneVersion: string;
	readonly metresPerWorldUnit: 1;
	readonly regionExtentMm: Readonly<{
		readonly minX: number;
		readonly maxX: number;
		readonly minZ: number;
		readonly maxZ: number;
	}>;
	readonly cells: Readonly<Record<string, SpatialCellDefinition>>;
	readonly places: Readonly<Record<string, PlaceDefinition>>;
	readonly nodes: Readonly<Record<string, SpatialNode>>;
	readonly edges: readonly SpatialEdge[];
	readonly blockedVolumes: readonly BlockedVolume[];
}

export interface CanonicalPresentationSource {
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly throughSequence: number;
	readonly stateHash: string;
}

export interface CanonicalActionRef {
	readonly actionId: string;
	readonly sourceKind: "current-behavior" | "world-event";
	readonly eventId: string | null;
	readonly eventSequence: number | null;
	readonly status: "in-progress" | "committed";
	readonly kind: AnimationClass;
	readonly originPlaceId: string;
	readonly destinationPlaceId: string;
	readonly targetId: string | null;
	readonly simulationStart: number;
	readonly simulationEnd: number | null;
	readonly resultEventId: string | null;
}

export interface SpatialCitizenInput {
	readonly citizenId: string;
	readonly slug: string;
	readonly name: string;
	readonly role: string;
	readonly placeId: string;
	readonly activity: string;
	readonly activityKind: ActivityKind;
	readonly focal: boolean;
	readonly carriedProp: PropKind | null;
	readonly canonicalAction: CanonicalActionRef;
}

export interface SpatialActorProjection {
	readonly citizenId: string;
	readonly slug: string;
	readonly name: string;
	readonly role: string;
	readonly placeId: string;
	readonly positionMm: SpatialPointMm;
	readonly facingDegrees: number;
	readonly routeNodeIds: readonly string[];
	readonly animationClass: AnimationClass;
	readonly prop: PropKind | null;
	readonly travelState: Readonly<{
		readonly status: "stationary" | "travelling" | "arrived";
		readonly originPlaceId: string;
		readonly destinationPlaceId: string;
		readonly routeId: string;
		readonly targetId: string | null;
	}>;
	readonly interactionTarget: string | null;
	readonly action: CanonicalActionRef;
	readonly semanticLabel: string;
	readonly focal: boolean;
}

export interface SpatialInteractionProjection {
	readonly interactionId: string;
	readonly participantIds: readonly string[];
	readonly kind: "exchange" | "conversation";
	readonly sourceEventId: string | null;
	readonly sourceSequence: number | null;
	readonly status: "in-progress" | "committed";
	readonly semanticLabel: string;
}

export interface SpatialProjection {
	readonly schemaVersion: "eonfolk-spatial-projection-v1";
	readonly sceneVersion: string;
	readonly source: CanonicalPresentationSource;
	readonly presentationTick: number;
	readonly actors: readonly SpatialActorProjection[];
	readonly interactions: readonly SpatialInteractionProjection[];
	readonly animationClasses: readonly AnimationClass[];
	readonly movingCitizenCount: number;
	readonly canonicalEventLinkCount: number;
	readonly teleportCount: number;
	readonly contradictionCount: number;
}

export interface PresentationResidency {
	readonly semanticScale: SemanticScale;
	readonly cells: readonly Readonly<{
		readonly cellId: string;
		readonly fidelity: FidelityClass;
		readonly resident: boolean;
	}>[];
	readonly selectedCitizenId: string | null;
}

export interface PresentationSample {
	readonly tick: number;
	readonly actorId: string;
	readonly positionMm: SpatialPointMm;
	readonly animationClass: AnimationClass;
	readonly actionId: string;
	readonly eventId: string | null;
}
