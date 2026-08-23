import type {
	AnimationClass,
	GeneratedCivilizationSpatialProjection,
	GeneratedSpatialActivityInput,
	PropKind,
	SpatialActorProjection,
	SpatialPointMm,
} from "@eonfolk/world-presentation";

export const GENERATED_EMBODIMENT_SCHEMA_VERSION =
	"eonfolk-generated-embodiment-v1" as const;

export type GeneratedPoseFamily =
	| "locomotion"
	| "carry"
	| "work"
	| "social"
	| "life"
	| "reaction";

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

function pointOnPolyline(
	value: SpatialPointMm,
	points: readonly SpatialPointMm[],
): boolean {
	return points.slice(0, -1).some((from, index) => {
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

function poseFamily(animationClass: AnimationClass): GeneratedPoseFamily {
	switch (animationClass) {
		case "walk":
			return "locomotion";
		case "carry":
			return "carry";
		case "gather":
		case "inspect":
		case "repair":
			return "work";
		case "talk":
		case "listen":
		case "exchange":
			return "social";
		case "idle":
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
	actor: Pick<SpatialActorProjection, "animationClass" | "positionMm">,
): GeneratedPose {
	const family = poseFamily(actor.animationClass);
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
				torsoPitchDegrees: 4,
				leftArmPitchDegrees: -58,
				rightArmPitchDegrees: -58,
				leftLegPitchDegrees: 8 * stepPhase,
				rightLegPitchDegrees: -8 * stepPhase,
			});
		case "work":
			return Object.freeze({
				family,
				torsoPitchDegrees: 16,
				leftArmPitchDegrees: -34,
				rightArmPitchDegrees: -72,
				leftLegPitchDegrees: 4,
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
				torsoPitchDegrees: actor.animationClass === "eat-rest" ? 10 : 0,
				leftArmPitchDegrees: actor.animationClass === "eat-rest" ? -42 : 3,
				rightArmPitchDegrees: actor.animationClass === "eat-rest" ? -42 : -3,
				leftLegPitchDegrees: 0,
				rightLegPitchDegrees: 0,
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
		case "work":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 10,
			});
		case "social":
			return Object.freeze({
				...pose,
				rightArmPitchDegrees: pose.rightArmPitchDegrees + phase * 8,
			});
		case "life":
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
	const entrances = topology.filter(
		(nodeId) => projection.scene.nodes[nodeId]?.affordance === "entrance",
	);
	for (const nodeId of actor.routeNodeIds)
		if (!topology.includes(nodeId))
			fail(`${actor.citizenId} route node is outside grounded topology`);
	const authoritativePoints = actor.routeNodeIds.map((nodeId) =>
		nodePoint(projection, nodeId),
	);
	if (
		authoritativePoints.length < 2 ||
		!pointOnPolyline(actor.positionMm, authoritativePoints)
	)
		fail(`${actor.citizenId} position is outside its authoritative route`);
	return Object.freeze({
		kind: "route",
		authoritativeNodeIds: Object.freeze([...actor.routeNodeIds]),
		routeTopologyNodeIds: topology,
		entranceNodeIds: Object.freeze(entrances),
		interactionSlotId: null,
		routeId: activity.location.routeId,
		progressBasisPoints: activity.location.progressBasisPoints,
		// Current canonical progress is explicitly defined over route waypoints.
		// It cannot truthfully animate the extra entrance connector segments.
		provesEntranceToEntranceTraversal:
			actor.routeNodeIds.length === topology.length &&
			actor.routeNodeIds.every((nodeId, index) => nodeId === topology[index]),
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
						? `${project.name}: ${project.state}; current checkpoint baseline`
						: changed
							? `${project.name}: ${prior.state} to ${project.state}; ${progressDeltaBasisPoints >= 0 ? "+" : ""}${progressDeltaBasisPoints} progress basis points`
							: `${project.name}: ${project.state}; no change in this interval`,
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
				pose: poseForGeneratedActor(actor),
				prop: actor.prop,
				positionMm: Object.freeze({ ...actor.positionMm }),
				facingDegrees: actor.facingDegrees,
				grounding: groundingFor(input.current, actor, activity),
				interactionTarget: actor.interactionTarget,
				focal: actor.focal,
				identityVariant: identityVariant(actor.citizenId),
				semanticLabel: actor.semanticLabel,
			});
		}),
	);
	const routeActors = actors.filter(
		(actor) => actor.grounding.kind === "route",
	);
	const unprovenRoutes = routeActors.filter(
		(actor) => !actor.grounding.provesEntranceToEntranceTraversal,
	);
	const limitations = Object.freeze(
		unprovenRoutes.length === 0
			? []
			: [
					`${unprovenRoutes.length} canonical route activit${unprovenRoutes.length === 1 ? "y does" : "ies do"} not expose entrance-connector progress; presentation will not interpolate those segments`,
				],
	);
	return Object.freeze({
		schemaVersion: GENERATED_EMBODIMENT_SCHEMA_VERSION,
		source: input.current.spatial.source,
		settlementId: input.current.local.settlement.settlementId,
		settlementName: input.current.local.settlement.name,
		actors,
		projects: projectDeltas(input.current, input.previous ?? null),
		growth: growthDelta(input.current, input.previous ?? null),
		limitations,
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
		limitations: Object.freeze(
			settlements.flatMap((settlement) => settlement.limitations),
		),
	});
}

export interface GeneratedActorTransition {
	readonly citizenId: string;
	readonly kind: "stationary" | "grounded-route";
	readonly fromMm: SpatialPointMm;
	readonly toMm: SpatialPointMm;
	readonly routeId: string | null;
	readonly progressDeltaBasisPoints: number;
}

/**
 * Allows interpolation only when two authoritative snapshots name the same
 * route and monotonic progress. Cross-action jumps fail closed as teleports.
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
		previous.grounding.kind !== "route" ||
		current.grounding.kind !== "route" ||
		previous.grounding.routeId !== current.grounding.routeId ||
		previous.grounding.progressBasisPoints === null ||
		current.grounding.progressBasisPoints === null ||
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
