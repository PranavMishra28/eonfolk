import {
	type AnimationClass,
	type GeneratedCivilizationSpatialProjection,
	type GeneratedSpatialActivityInput,
	type GeneratedVisualLifecycle,
	type PropKind,
	playerFacingPlaceName,
	projectDisplayName,
	projectStateDisplayName,
	type SpatialActorProjection,
	type SpatialPointMm,
} from "@eonfolk/world-presentation";

export const GENERATED_EMBODIMENT_SCHEMA_VERSION =
	"eonfolk-generated-embodiment-v1" as const;

export const GENERATED_TRAVEL_DURATION_TICKS = 48;

export type GeneratedPoseFamily =
	| "locomotion"
	| "carry"
	| "inspect"
	| "harvest"
	| "repair"
	| "construct"
	| "social"
	| "life"
	| "wait"
	| "reaction";

export type GeneratedVisualPhase =
	| "plan"
	| "travel"
	| "arrive"
	| "perform"
	| "result"
	| "end"
	| "wait";

export interface GeneratedPose {
	readonly family: GeneratedPoseFamily;
	readonly torsoPitchDegrees: number;
	readonly leftArmPitchDegrees: number;
	readonly rightArmPitchDegrees: number;
	readonly leftLegPitchDegrees: number;
	readonly rightLegPitchDegrees: number;
}

export interface GeneratedGrounding {
	readonly kind: "entrance" | "interaction-slot" | "route";
	readonly authoritativeNodeIds: readonly string[];
	readonly routeTopologyNodeIds: readonly string[];
	readonly entranceNodeIds: readonly string[];
	readonly interactionSlotId: string | null;
	readonly routeId: string | null;
	readonly progressBasisPoints: number | null;
	/** Ordered metric points used to replay only already-authoritative progress. */
	readonly traversalPathMm?: readonly SpatialPointMm[];
	/** False means presentation must not interpolate across the missing segment. */
	readonly provesEntranceToEntranceTraversal: boolean;
}

export interface GeneratedEmbodiedActor {
	readonly citizenId: string;
	readonly settlementId: string;
	readonly name: string;
	readonly role: string;
	readonly placeId: string;
	readonly actionId: string;
	readonly animationClass: AnimationClass;
	readonly pose: GeneratedPose;
	readonly prop: PropKind | null;
	readonly positionMm: SpatialPointMm;
	readonly facingDegrees: number;
	readonly grounding: GeneratedGrounding;
	readonly interactionTarget: string | null;
	readonly focal: boolean;
	readonly identityVariant: number;
	readonly semanticLabel: string;
	readonly visualLifecycle: GeneratedVisualLifecycle | null;
}

export interface GeneratedProjectDelta {
	readonly projectId: string;
	readonly name: string;
	readonly siteId: string;
	readonly state: string;
	readonly previousState: string | null;
	readonly progressBasisPoints: number;
	readonly progressDeltaBasisPoints: number;
	readonly changed: boolean;
	readonly semanticLabel: string;
}

export interface GeneratedGrowthDelta {
	readonly addedSiteIds: readonly string[];
	readonly removedSiteIds: readonly string[];
	readonly addedBuildingIds: readonly string[];
	readonly removedBuildingIds: readonly string[];
	readonly addedRouteIds: readonly string[];
	readonly removedRouteIds: readonly string[];
	readonly addedCitizenIds: readonly string[];
	readonly removedCitizenIds: readonly string[];
	readonly visibleChangeCount: number;
}

export interface GeneratedEmbodimentProjection {
	readonly schemaVersion: typeof GENERATED_EMBODIMENT_SCHEMA_VERSION;
	readonly source: GeneratedCivilizationSpatialProjection["spatial"]["source"];
	readonly settlementId: string;
	readonly settlementName: string;
	readonly actors: readonly GeneratedEmbodiedActor[];
	readonly projects: readonly GeneratedProjectDelta[];
	readonly growth: GeneratedGrowthDelta;
	readonly teleportCount: number;
	readonly limitations: readonly string[];
}

export interface GeneratedEmbodimentInput {
	readonly current: GeneratedCivilizationSpatialProjection;
	readonly activities: readonly GeneratedSpatialActivityInput[];
	readonly previous?: GeneratedCivilizationSpatialProjection | null;
}

export interface GeneratedEmbodimentWorldProjection {
	readonly schemaVersion: "eonfolk-generated-embodiment-world-v1";
	readonly source: GeneratedCivilizationSpatialProjection["spatial"]["source"];
	readonly settlements: readonly GeneratedEmbodimentProjection[];
	readonly actors: readonly GeneratedEmbodiedActor[];
	readonly projects: readonly GeneratedProjectDelta[];
	readonly visibleCitizenCount: number;
	readonly teleportCount: number;
	readonly limitations: readonly string[];
}

function fail(message: string): never {
	throw new Error(`generated embodiment: ${message}`);
}

function compareIds(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function pointEqual(left: SpatialPointMm, right: SpatialPointMm): boolean {
	return left.x === right.x && left.y === right.y && left.z === right.z;
}

function metricDistance(left: SpatialPointMm, right: SpatialPointMm): number {
	return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function containingSegment(
	value: SpatialPointMm,
	points: readonly SpatialPointMm[],
): number {
	return points.slice(0, -1).findIndex((from, index) => {
		const to = points[index + 1];
		if (to === undefined) return false;
		return (
			Math.abs(
				metricDistance(from, value) +
					metricDistance(value, to) -
					metricDistance(from, to),
			) <= 2.5
		);
	});
}

function nodePoint(
	projection: GeneratedCivilizationSpatialProjection,
	nodeId: string,
): SpatialPointMm {
	const node = projection.scene.nodes[nodeId];
	if (node === undefined) fail(`missing scene node ${nodeId}`);
	return Object.freeze({ x: node.x, y: node.y, z: node.z });
}

function identityVariant(citizenId: string): number {
	let hash = 2_166_136_261;
	for (let index = 0; index < citizenId.length; index += 1) {
		hash ^= citizenId.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return hash >>> 0;
}

function poseFamily(
	animationClass: AnimationClass,
	routineKind?: string,
): GeneratedPoseFamily {
	switch (animationClass) {
		case "walk":
			return "locomotion";
		case "carry":
			return "carry";
		case "gather":
			return "harvest";
		case "inspect":
			return "inspect";
		case "repair":
			return routineKind === "construct" ? "construct" : "repair";
		case "talk":
		case "listen":
		case "exchange":
			return "social";
		case "idle":
			return "wait";
		case "eat-rest":
			return "life";
		case "react":
			return "reaction";
	}
}

/**
 * A deterministic pose derived from a typed authoritative action. The walking
 * phase uses canonical metric position, never wall-clock time or randomness.
 */
export function poseForGeneratedActor(
	actor: Pick<SpatialActorProjection, "animationClass" | "positionMm"> & {
		readonly routineKind?: string | undefined;
	},
): GeneratedPose {
	const family = poseFamily(actor.animationClass, actor.routineKind);
	const stepPhase =
		(Math.abs(actor.positionMm.x) + Math.abs(actor.positionMm.z)) % 1_800 < 900
			? 1
			: -1;
	switch (family) {
		case "locomotion":
			return Object.freeze({
				family,
				torsoPitchDegrees: 5,
				leftArmPitchDegrees: -24 * stepPhase,
				rightArmPitchDegrees: 24 * stepPhase,
				leftLegPitchDegrees: 26 * stepPhase,
				rightLegPitchDegrees: -26 * stepPhase,
			});
		case "carry":
			return Object.freeze({
				family,
				torsoPitchDegrees: 8,
				leftArmPitchDegrees: -62,
				rightArmPitchDegrees: -58,
				leftLegPitchDegrees: 14 * stepPhase,
				rightLegPitchDegrees: -14 * stepPhase,
			});
		case "inspect":
			return Object.freeze({
				family,
				torsoPitchDegrees: 12,
				leftArmPitchDegrees: -8,
				rightArmPitchDegrees: -52,
				leftLegPitchDegrees: 2,
				rightLegPitchDegrees: -6,
			});
		case "harvest":
			return Object.freeze({
				family,
				torsoPitchDegrees: 22,
				leftArmPitchDegrees: -28,
				rightArmPitchDegrees: -88,
				leftLegPitchDegrees: 10,
				rightLegPitchDegrees: -12,
			});
		case "repair":
			return Object.freeze({
				family,
				torsoPitchDegrees: 16,
				leftArmPitchDegrees: -18,
				rightArmPitchDegrees: -78,
				leftLegPitchDegrees: 6,
				rightLegPitchDegrees: -8,
			});
		case "construct":
			return Object.freeze({
				family,
				torsoPitchDegrees: 10,
				leftArmPitchDegrees: -42,
				rightArmPitchDegrees: -70,
				leftLegPitchDegrees: 8,
				rightLegPitchDegrees: -4,
			});
		case "social":
			return Object.freeze({
				family,
				torsoPitchDegrees: 0,
				leftArmPitchDegrees: -18,
				rightArmPitchDegrees: -48,
				leftLegPitchDegrees: 0,
				rightLegPitchDegrees: 0,
			});
		case "life":
			return Object.freeze({
				family,
				torsoPitchDegrees: 14,
				leftArmPitchDegrees: -36,
				rightArmPitchDegrees: -58,
				leftLegPitchDegrees: 18,
				rightLegPitchDegrees: -6,
			});
		case "wait":
			return Object.freeze({
				family,
				torsoPitchDegrees: 0,
				leftArmPitchDegrees: 4,
				rightArmPitchDegrees: -6,
				leftLegPitchDegrees: 2,
				rightLegPitchDegrees: -2,
			});
		case "reaction":
			return Object.freeze({
				family,
				torsoPitchDegrees: -6,
				leftArmPitchDegrees: -105,
				rightArmPitchDegrees: -105,
				leftLegPitchDegrees: 9,
				rightLegPitchDegrees: -9,
			});
	}
}

/**
 * Samples a presentation-only pose from an explicit integer clock. It never
 * changes metric position, action identity, or Reality state, and reduced
 * motion returns the canonical base pose unchanged.
 */
export function poseAtGeneratedPresentationTick(
	pose: GeneratedPose,
	presentationTick: number,
	identityVariant: number,
	reducedMotion: boolean,
): GeneratedPose {
	if (!Number.isSafeInteger(presentationTick) || presentationTick < 0)
		fail("presentation tick must be a non-negative safe integer");
	if (!Number.isSafeInteger(identityVariant) || identityVariant < 0)
		fail("identity variant must be a non-negative safe integer");
	if (reducedMotion) return pose;
	const phase = (presentationTick + identityVariant) % 16 < 8 ? 1 : -1;
	switch (pose.family) {
		case "locomotion":
			return Object.freeze({
				...pose,
				leftArmPitchDegrees: Math.abs(pose.leftArmPitchDegrees) * phase,
				rightArmPitchDegrees: -Math.abs(pose.rightArmPitchDegrees) * phase,
				leftLegPitchDegrees: -Math.abs(pose.leftLegPitchDegrees) * phase,
				rightLegPitchDegrees: Math.abs(pose.rightLegPitchDegrees) * phase,
			});
		case "carry":
			return Object.freeze({
				...pose,
				leftLegPitchDegrees: Math.abs(pose.leftLegPitchDegrees) * phase,
				rightLegPitchDegrees: -Math.abs(pose.rightLegPitchDegrees) * phase,
			});
		case "inspect":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 6,
				torsoPitchDegrees: pose.torsoPitchDegrees + phase * 2,
			});
		case "harvest":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 16,
				torsoPitchDegrees: pose.torsoPitchDegrees + phase * 4,
			});
		case "repair":
		case "construct":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 14,
			});
		case "social":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 8,
			});
		case "life":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 5,
			});
		case "wait":
			return Object.freeze({
				...pose,
				torsoPitchDegrees: pose.torsoPitchDegrees + phase,
			});
		case "reaction":
			return pose;
	}
}

function routeTopology(
	projection: GeneratedCivilizationSpatialProjection,
	routeId: string,
): readonly string[] {
	const prefix = `${routeId}:segment:`;
	const segments = projection.scene.edges
		.flatMap((edge) => {
			if (!edge.edgeId.startsWith(prefix) || !edge.edgeId.endsWith(":forward"))
				return [];
			const ordinalText = edge.edgeId.slice(prefix.length, -":forward".length);
			const ordinal = Number.parseInt(ordinalText, 10);
			if (!Number.isSafeInteger(ordinal) || ordinal < 0)
				fail(`route ${routeId} has malformed segment identity`);
			return [{ edge, ordinal }];
		})
		.sort((left, right) => left.ordinal - right.ordinal);
	if (segments.length === 0) fail(`route ${routeId} has no grounded segments`);
	segments.forEach((segment, index) => {
		if (segment.ordinal !== index)
			fail(`route ${routeId} segments are not contiguous`);
		const next = segments[index + 1];
		if (next !== undefined && segment.edge.toNodeId !== next.edge.fromNodeId)
			fail(`route ${routeId} segments do not form a continuous path`);
	});
	const first = segments[0];
	if (first === undefined) fail(`route ${routeId} has no first segment`);
	return Object.freeze([
		first.edge.fromNodeId,
		...segments.map((segment) => segment.edge.toNodeId),
	]);
}

function interpolatePath(
	points: readonly SpatialPointMm[],
	progress01: number,
): SpatialPointMm {
	if (points.length === 0) fail("traversal path is empty");
	const clamped = Math.max(0, Math.min(1, progress01));
	const last = points[points.length - 1]!;
	if (points.length === 1 || clamped >= 1) return Object.freeze({ ...last });
	const scaled = clamped * (points.length - 1);
	const index = Math.min(Math.floor(scaled), points.length - 2);
	const progress = scaled - index;
	const from = points[index]!;
	const to = points[index + 1]!;
	return Object.freeze({
		x: Math.round(from.x + (to.x - from.x) * progress),
		y: Math.round(from.y + (to.y - from.y) * progress),
		z: Math.round(from.z + (to.z - from.z) * progress),
	});
}

/**
 * Walks the full proven route once, then holds at the destination.
 * Presentation never reverses along the path.
 */
export function generatedTraversalPointAtTick(
	grounding: GeneratedGrounding,
	presentationTick: number,
): SpatialPointMm {
	const points = grounding.traversalPathMm!;
	if (!Number.isSafeInteger(presentationTick) || presentationTick < 0)
		throw new Error("presentationTick must be a non-negative safe integer");
	const duration = GENERATED_TRAVEL_DURATION_TICKS;
	return interpolatePath(points, Math.min(1, presentationTick / duration));
}

export function generatedVisualPhase(
	lifecycle: GeneratedVisualLifecycle | null,
	progress01: number,
	arrivalCommitted = true,
): GeneratedVisualPhase {
	if (!arrivalCommitted) return "travel";
	if (lifecycle === null) {
		if (progress01 < 0.28) return "travel";
		if (progress01 < 0.34) return "arrive";
		if (progress01 < 0.78) return "perform";
		if (progress01 < 0.86) return "result";
		if (progress01 < 0.94) return "end";
		return "wait";
	}
	const span = Math.max(1, lifecycle.simulationEnd - lifecycle.dayStart);
	const elapsed = lifecycle.dayStart + progress01 * span;
	if (elapsed < lifecycle.travelEnd) return "travel";
	if (elapsed < lifecycle.travelEnd + span * 0.04) return "arrive";
	if (elapsed < lifecycle.performEnd) return "perform";
	if (elapsed < lifecycle.simulationEnd) return "result";
	if (progress01 < 0.96) return "end";
	return "wait";
}

export function routeArrivalCommitted(actor: GeneratedEmbodiedActor): boolean {
	return (
		actor.grounding.kind !== "route" ||
		actor.grounding.progressBasisPoints === 10_000
	);
}

export function animationClassForVisualPhase(
	actor: GeneratedEmbodiedActor,
	phase: GeneratedVisualPhase,
): AnimationClass {
	if (phase === "travel" || phase === "arrive")
		return actor.visualLifecycle?.travelKind ?? "walk";
	if (phase === "perform" || phase === "result")
		return actor.visualLifecycle?.performKind ?? actor.animationClass;
	if (phase === "wait" || phase === "end") return "idle";
	return actor.animationClass;
}

const ACTIVITY_WORDS = Object.freeze({
	idle: "pausing",
	walk: "walking",
	carry: "carrying",
	gather: "gathering",
	inspect: "inspecting the work",
	talk: "speaking",
	listen: "listening",
	exchange: "exchanging goods",
	repair: "making repairs",
	"eat-rest": "resting",
	react: "reacting",
} as const);

const PROP_WORDS = Object.freeze({
	water: "water",
	logs: "logs",
	grain: "grain",
	trade: "goods",
	tool: "a tool",
} as const);

/** HUD copy for the body that is currently on screen, never a raw site id. */
export function presentedActorActivity(
	actor: GeneratedEmbodiedActor,
	placeName: string | undefined,
	progress01: number,
): string {
	const arrivalCommitted = routeArrivalCommitted(actor);
	const phase = generatedVisualPhase(
		actor.visualLifecycle,
		progress01,
		arrivalCommitted,
	);
	const animationClass = animationClassForVisualPhase(actor, phase);
	const destination = placeName ?? "this place";
	if (phase === "travel" || phase === "arrive") {
		const travel =
			animationClass === "carry"
				? `carrying toward ${destination}`
				: `walking toward ${destination}`;
		return travel;
	}
	const prop = actor.prop === null ? null : PROP_WORDS[actor.prop];
	const activity =
		prop !== null && ["carry", "gather", "exchange"].includes(animationClass)
			? `${ACTIVITY_WORDS[animationClass]} ${prop}`
			: ACTIVITY_WORDS[animationClass];
	return `${activity} at ${destination}`;
}

/** One interpolant vocabulary for Watch, In words, and PEOPLE HERE. */
export function presentedActorCopy(
	actor: GeneratedEmbodiedActor,
	projection: GeneratedCivilizationSpatialProjection,
	progress01: number,
): string {
	const spatial = projection.spatial.actors.find(
		(candidate) => candidate.citizenId === actor.citizenId,
	);
	const travelling =
		actor.grounding.kind === "route" && !routeArrivalCommitted(actor);
	const placeId = travelling
		? (spatial?.action.destinationPlaceId ?? actor.placeId)
		: actor.placeId;
	return presentedActorActivity(
		actor,
		playerFacingPlaceName(placeId, projection.local.sites),
		progress01,
	);
}

export function conversationVisuallyActive(
	actor: GeneratedEmbodiedActor,
	progress01: number,
): boolean {
	const phase = generatedVisualPhase(
		actor.visualLifecycle,
		progress01,
		routeArrivalCommitted(actor),
	);
	if (phase !== "perform" && phase !== "arrive" && phase !== "result")
		return false;
	const kind =
		phase === "perform" || phase === "result"
			? (actor.visualLifecycle?.performKind ?? actor.animationClass)
			: actor.animationClass;
	return kind === "talk" || kind === "listen" || kind === "exchange";
}

export function sampleGeneratedActorPresentation(input: {
	readonly actor: GeneratedEmbodiedActor;
	readonly previous: GeneratedEmbodiedActor | null;
	readonly slotPointMm: SpatialPointMm;
	readonly progress01: number;
	readonly reducedMotion: boolean;
}): Readonly<{
	readonly positionMm: SpatialPointMm;
	readonly facingDegrees: number;
	readonly animationClass: AnimationClass;
	readonly pose: GeneratedPose;
	readonly phase: GeneratedVisualPhase;
}> {
	const arrivalCommitted = routeArrivalCommitted(input.actor);
	const phase = generatedVisualPhase(
		input.actor.visualLifecycle,
		input.reducedMotion ? 0.55 : input.progress01,
		arrivalCommitted,
	);
	const animationClass = animationClassForVisualPhase(input.actor, phase);
	let positionMm = input.slotPointMm;
	if (input.actor.grounding.kind === "route") {
		const visualTravel = travelProgress01(
			input.actor.visualLifecycle,
			input.reducedMotion ? 0.55 : input.progress01,
		);
		const travelProgress = arrivalCommitted
			? input.reducedMotion || phase !== "travel"
				? 1
				: visualTravel
			: Math.min(0.92, visualTravel);
		positionMm = interpolatePath(
			input.actor.grounding.traversalPathMm ?? [input.actor.positionMm],
			travelProgress,
		);
	} else if (
		(phase === "travel" || phase === "arrive") &&
		input.previous !== null &&
		!input.reducedMotion
	) {
		try {
			const transition = planGeneratedActorTransition(input.previous, {
				...input.actor,
				positionMm: input.slotPointMm,
			});
			const travelProgress = travelProgress01(
				input.actor.visualLifecycle,
				input.progress01,
			);
			positionMm = sampleGeneratedActorTransition(
				transition,
				Math.round(Math.max(0, Math.min(1, travelProgress)) * 10_000),
			);
		} catch {
			positionMm = input.previous.positionMm;
		}
	}
	const facingDegrees =
		input.previous === null ||
		(positionMm.x === input.previous.positionMm.x &&
			positionMm.z === input.previous.positionMm.z)
			? input.actor.facingDegrees
			: Math.round(
					(Math.atan2(
						positionMm.x - input.previous.positionMm.x,
						positionMm.z - input.previous.positionMm.z,
					) *
						180) /
						Math.PI,
				);
	const pose = poseForGeneratedActor({
		animationClass,
		positionMm,
		routineKind: input.actor.visualLifecycle?.routineKind,
	});
	return Object.freeze({
		positionMm,
		facingDegrees:
			phase === "travel" ? facingDegrees : input.actor.facingDegrees,
		animationClass,
		pose,
		phase,
	});
}

function travelProgress01(
	lifecycle: GeneratedVisualLifecycle | null,
	progress01: number,
): number {
	if (lifecycle === null) return Math.min(1, progress01 / 0.28);
	const span = Math.max(1, lifecycle.travelEnd - lifecycle.dayStart);
	const elapsed =
		lifecycle.dayStart +
		progress01 * Math.max(1, lifecycle.simulationEnd - lifecycle.dayStart);
	return Math.max(0, Math.min(1, (elapsed - lifecycle.dayStart) / span));
}

function groundingFor(
	projection: GeneratedCivilizationSpatialProjection,
	actor: SpatialActorProjection,
	activity: GeneratedSpatialActivityInput,
): GeneratedGrounding {
	if (activity.location.kind === "interaction-slot") {
		const node = projection.scene.nodes[activity.location.interactionSlotId];
		if (node === undefined)
			fail(`${actor.citizenId} references a missing interaction slot`);
		if (!pointEqual(actor.positionMm, nodePoint(projection, node.nodeId)))
			fail(`${actor.citizenId} is not positioned on its authoritative slot`);
		return Object.freeze({
			kind: node.affordance === "entrance" ? "entrance" : "interaction-slot",
			authoritativeNodeIds: Object.freeze([node.nodeId]),
			routeTopologyNodeIds: Object.freeze([node.nodeId]),
			entranceNodeIds: Object.freeze(
				node.affordance === "entrance" ? [node.nodeId] : [],
			),
			interactionSlotId: node.nodeId,
			routeId: null,
			progressBasisPoints: null,
			provesEntranceToEntranceTraversal: true,
		});
	}
	if (
		activity.location.progressBasisPoints < 0 ||
		activity.location.progressBasisPoints > 10_000
	)
		fail(`${actor.citizenId} has invalid route progress`);
	const topology = routeTopology(projection, activity.location.routeId);
	const entrances = [topology[0]!, topology.at(-1)!];
	const authoritativePoints = actor.routeNodeIds.map((nodeId) =>
		nodePoint(projection, nodeId),
	);
	const actorSegment = containingSegment(actor.positionMm, authoritativePoints);
	if (actorSegment < 0)
		fail(`${actor.citizenId} position is outside its authoritative route`);
	const topologyInterior = topology.slice(1, -1);
	if (
		entrances.some(
			(nodeId) => projection.scene.nodes[nodeId]?.affordance !== "entrance",
		) ||
		actor.routeNodeIds.join() !== topologyInterior.join()
	)
		fail(`${actor.citizenId} route lacks registered entrance connectors`);
	const traversalPathMm = Object.freeze(
		topology.map((nodeId) => nodePoint(projection, nodeId)),
	);
	return Object.freeze({
		kind: "route",
		authoritativeNodeIds: Object.freeze([...actor.routeNodeIds]),
		routeTopologyNodeIds: topology,
		entranceNodeIds: Object.freeze(entrances),
		interactionSlotId: null,
		routeId: activity.location.routeId,
		progressBasisPoints: activity.location.progressBasisPoints,
		traversalPathMm,
		provesEntranceToEntranceTraversal: true,
	});
}

function difference(current: readonly string[], previous: readonly string[]) {
	const prior = new Set(previous);
	return Object.freeze(
		current.filter((value) => !prior.has(value)).sort(compareIds),
	);
}

function growthDelta(
	current: GeneratedCivilizationSpatialProjection,
	previous: GeneratedCivilizationSpatialProjection | null,
): GeneratedGrowthDelta {
	if (previous === null)
		return Object.freeze({
			addedSiteIds: Object.freeze([]),
			removedSiteIds: Object.freeze([]),
			addedBuildingIds: Object.freeze([]),
			removedBuildingIds: Object.freeze([]),
			addedRouteIds: Object.freeze([]),
			removedRouteIds: Object.freeze([]),
			addedCitizenIds: Object.freeze([]),
			removedCitizenIds: Object.freeze([]),
			visibleChangeCount: 0,
		});
	const ids = <T>(values: readonly T[], identity: (value: T) => string) =>
		values.map(identity).sort(compareIds);
	const previousSites = ids(previous.local.sites, (site) => site.siteId);
	const currentSites = ids(current.local.sites, (site) => site.siteId);
	const previousBuildings = ids(
		previous.local.buildings,
		(building) => building.buildingId,
	);
	const currentBuildings = ids(
		current.local.buildings,
		(building) => building.buildingId,
	);
	const previousRoutes = ids(previous.local.routes, (route) => route.routeId);
	const currentRoutes = ids(current.local.routes, (route) => route.routeId);
	const previousCitizens = previous.spatial.actors
		.map((actor) => actor.citizenId)
		.sort(compareIds);
	const currentCitizens = current.spatial.actors
		.map((actor) => actor.citizenId)
		.sort(compareIds);
	const addedSiteIds = difference(currentSites, previousSites);
	const removedSiteIds = difference(previousSites, currentSites);
	const addedBuildingIds = difference(currentBuildings, previousBuildings);
	const removedBuildingIds = difference(previousBuildings, currentBuildings);
	const addedRouteIds = difference(currentRoutes, previousRoutes);
	const removedRouteIds = difference(previousRoutes, currentRoutes);
	const addedCitizenIds = difference(currentCitizens, previousCitizens);
	const removedCitizenIds = difference(previousCitizens, currentCitizens);
	return Object.freeze({
		addedSiteIds,
		removedSiteIds,
		addedBuildingIds,
		removedBuildingIds,
		addedRouteIds,
		removedRouteIds,
		addedCitizenIds,
		removedCitizenIds,
		visibleChangeCount:
			addedSiteIds.length +
			removedSiteIds.length +
			addedBuildingIds.length +
			removedBuildingIds.length +
			addedRouteIds.length +
			removedRouteIds.length +
			addedCitizenIds.length +
			removedCitizenIds.length,
	});
}

function projectDeltas(
	current: GeneratedCivilizationSpatialProjection,
	previous: GeneratedCivilizationSpatialProjection | null,
): readonly GeneratedProjectDelta[] {
	const previousById = new Map(
		(previous?.projects ?? []).map((project) => [project.projectId, project]),
	);
	return Object.freeze(
		current.projects.map((project) => {
			const prior = previousById.get(project.projectId);
			const progressDeltaBasisPoints =
				prior === undefined
					? 0
					: project.progressBasisPoints - prior.progressBasisPoints;
			const changed =
				prior !== undefined &&
				(prior.state !== project.state || progressDeltaBasisPoints !== 0);
			return Object.freeze({
				projectId: project.projectId,
				name: project.name,
				siteId: project.siteId,
				state: project.state,
				previousState: prior?.state ?? null,
				progressBasisPoints: project.progressBasisPoints,
				progressDeltaBasisPoints,
				changed,
				semanticLabel:
					prior === undefined
						? `${projectDisplayName(project.name)}: ${projectStateDisplayName(project.state)}; current checkpoint baseline`
						: changed
							? `${projectDisplayName(project.name)}: ${projectStateDisplayName(prior.state)} to ${projectStateDisplayName(project.state)}; ${progressDeltaBasisPoints >= 0 ? "+" : ""}${Math.round(progressDeltaBasisPoints / 100)}% progress`
							: `${projectDisplayName(project.name)}: ${projectStateDisplayName(project.state)}; no change in this interval`,
			});
		}),
	);
}

/**
 * Projects canonical activity records into a renderer-neutral embodiment view.
 * Missing or mismatched activity records are a hard error: the renderer must
 * never invent what a citizen is doing.
 */
export function projectGeneratedEmbodiment(
	input: GeneratedEmbodimentInput,
): GeneratedEmbodimentProjection {
	if (input.current.availability.status !== "available")
		fail("canonical civilization projection is unavailable");
	if (
		input.previous !== null &&
		input.previous !== undefined &&
		input.previous.local.settlement.settlementId !==
			input.current.local.settlement.settlementId
	)
		fail("previous and current projections refer to different settlements");
	const activityByCitizen = new Map(
		input.activities.map((activity) => [activity.citizenId, activity]),
	);
	if (activityByCitizen.size !== input.activities.length)
		fail("activities contain duplicate citizen identities");
	const actors = Object.freeze(
		input.current.spatial.actors.map((actor) => {
			const activity = activityByCitizen.get(actor.citizenId);
			if (activity === undefined)
				fail(`missing canonical activity for ${actor.citizenId}`);
			if (activity.canonicalAction.actionId !== actor.action.actionId)
				fail(`activity/action mismatch for ${actor.citizenId}`);
			return Object.freeze({
				citizenId: actor.citizenId,
				settlementId: input.current.local.settlement.settlementId,
				name: actor.name,
				role: actor.role,
				placeId: actor.placeId,
				actionId: actor.action.actionId,
				animationClass: actor.animationClass,
				pose: poseForGeneratedActor({
					animationClass: actor.animationClass,
					positionMm: actor.positionMm,
					routineKind: activity.visualLifecycle?.routineKind,
				}),
				prop: actor.prop,
				positionMm: Object.freeze({ ...actor.positionMm }),
				facingDegrees: actor.facingDegrees,
				grounding: groundingFor(input.current, actor, activity),
				interactionTarget: actor.interactionTarget,
				focal: actor.focal,
				identityVariant: identityVariant(actor.citizenId),
				semanticLabel: actor.semanticLabel,
				visualLifecycle: activity.visualLifecycle ?? null,
			});
		}),
	);
	const previousByCitizen = new Map(
		(input.previous?.spatial.actors ?? []).map((actor) => [
			actor.citizenId,
			actor,
		]),
	);
	const teleportCount = actors.filter((actor) => {
		const prior = previousByCitizen.get(actor.citizenId);
		if (prior === undefined) return false;
		if (pointEqual(prior.positionMm, actor.positionMm)) return false;
		const sameRoute =
			actor.grounding.kind === "route" &&
			prior.travelState.routeId === actor.grounding.routeId &&
			prior.travelState.progressBasisPoints !== null &&
			actor.grounding.progressBasisPoints !== null;
		if (
			sameRoute &&
			actor.grounding.progressBasisPoints! >
				prior.travelState.progressBasisPoints!
		)
			return false;
		return true;
	}).length;
	return Object.freeze({
		schemaVersion: GENERATED_EMBODIMENT_SCHEMA_VERSION,
		source: input.current.spatial.source,
		settlementId: input.current.local.settlement.settlementId,
		settlementName: input.current.local.settlement.name,
		actors,
		projects: projectDeltas(input.current, input.previous ?? null),
		growth: growthDelta(input.current, input.previous ?? null),
		teleportCount,
		limitations: Object.freeze([]),
	});
}

/**
 * Combines settlement-local projections from one checkpoint without changing
 * their metric coordinates or inventing absent residents.
 */
export function projectGeneratedWorldEmbodiment(input: {
	readonly current: readonly GeneratedCivilizationSpatialProjection[];
	readonly activities: readonly GeneratedSpatialActivityInput[];
	readonly previous?: readonly GeneratedCivilizationSpatialProjection[];
}): GeneratedEmbodimentWorldProjection {
	if (input.current.length === 0)
		fail("world embodiment requires at least one settlement projection");
	const previousBySettlement = new Map(
		(input.previous ?? []).map((projection) => [
			projection.local.settlement.settlementId,
			projection,
		]),
	);
	if (previousBySettlement.size !== (input.previous ?? []).length)
		fail("previous world projections repeat a settlement");
	const settlements = Object.freeze(
		input.current
			.map((projection) =>
				projectGeneratedEmbodiment({
					current: projection,
					previous:
						previousBySettlement.get(
							projection.local.settlement.settlementId,
						) ?? null,
					activities: input.activities,
				}),
			)
			.sort((left, right) => compareIds(left.settlementId, right.settlementId)),
	);
	const first = settlements[0];
	if (first === undefined) fail("world embodiment has no first settlement");
	for (const settlement of settlements)
		if (
			settlement.source.runId !== first.source.runId ||
			settlement.source.stateHash !== first.source.stateHash ||
			settlement.source.revision !== first.source.revision ||
			settlement.source.throughSequence !== first.source.throughSequence
		)
			fail("settlement projections do not share one canonical checkpoint");
	const actors = Object.freeze(
		settlements
			.flatMap((settlement) => settlement.actors)
			.sort((left, right) => compareIds(left.citizenId, right.citizenId)),
	);
	if (new Set(actors.map((actor) => actor.citizenId)).size !== actors.length)
		fail("world embodiment repeats a citizen across settlements");
	const projects = Object.freeze(
		settlements
			.flatMap((settlement) => settlement.projects)
			.sort((left, right) => compareIds(left.projectId, right.projectId)),
	);
	if (
		new Set(projects.map((project) => project.projectId)).size !==
		projects.length
	)
		fail("world embodiment repeats a project across settlements");
	return Object.freeze({
		schemaVersion: "eonfolk-generated-embodiment-world-v1",
		source: first.source,
		settlements,
		actors,
		projects,
		visibleCitizenCount: actors.length,
		teleportCount: settlements.reduce(
			(total, settlement) => total + settlement.teleportCount,
			0,
		),
		limitations: Object.freeze(
			settlements.flatMap((settlement) => settlement.limitations),
		),
	});
}

export interface GeneratedActorTransition {
	readonly citizenId: string;
	readonly kind: "stationary" | "grounded-route" | "approach";
	readonly fromMm: SpatialPointMm;
	readonly toMm: SpatialPointMm;
	readonly routeId: string | null;
	readonly progressDeltaBasisPoints: number;
}

/**
 * Same-route monotonic progress interpolates on the path. Slot or activity
 * changes become a timed approach rather than a snap. Reverse progress still
 * fails closed.
 */
export function planGeneratedActorTransition(
	previous: GeneratedEmbodiedActor,
	current: GeneratedEmbodiedActor,
): GeneratedActorTransition {
	if (previous.citizenId !== current.citizenId)
		fail("transition actor identities differ");
	if (pointEqual(previous.positionMm, current.positionMm))
		return Object.freeze({
			citizenId: current.citizenId,
			kind: "stationary",
			fromMm: previous.positionMm,
			toMm: current.positionMm,
			routeId: current.grounding.routeId,
			progressDeltaBasisPoints: 0,
		});
	if (
		previous.grounding.kind === "route" &&
		current.grounding.kind === "route" &&
		previous.grounding.routeId === current.grounding.routeId &&
		previous.grounding.progressBasisPoints !== null &&
		current.grounding.progressBasisPoints !== null
	) {
		if (
			current.grounding.progressBasisPoints <=
			previous.grounding.progressBasisPoints
		)
			fail(`unproven movement for ${current.citizenId}; refusing teleport`);
		return Object.freeze({
			citizenId: current.citizenId,
			kind: "grounded-route",
			fromMm: previous.positionMm,
			toMm: current.positionMm,
			routeId: current.grounding.routeId,
			progressDeltaBasisPoints:
				current.grounding.progressBasisPoints -
				previous.grounding.progressBasisPoints,
		});
	}
	return Object.freeze({
		citizenId: current.citizenId,
		kind: "approach",
		fromMm: previous.positionMm,
		toMm: current.positionMm,
		routeId: current.grounding.routeId,
		progressDeltaBasisPoints: 10_000,
	});
}

export function sampleGeneratedActorTransition(
	transition: GeneratedActorTransition,
	progressBasisPoints: number,
): SpatialPointMm {
	if (
		!Number.isSafeInteger(progressBasisPoints) ||
		progressBasisPoints < 0 ||
		progressBasisPoints > 10_000
	)
		fail("transition progress must be integer basis points");
	return Object.freeze({
		x: Math.round(
			transition.fromMm.x +
				((transition.toMm.x - transition.fromMm.x) * progressBasisPoints) /
					10_000,
		),
		y: Math.round(
			transition.fromMm.y +
				((transition.toMm.y - transition.fromMm.y) * progressBasisPoints) /
					10_000,
		),
		z: Math.round(
			transition.fromMm.z +
				((transition.toMm.z - transition.fromMm.z) * progressBasisPoints) /
					10_000,
		),
	});
}
