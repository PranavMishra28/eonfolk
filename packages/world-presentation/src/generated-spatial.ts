import {
	type GeneratedMetricPointProjection,
	type GeneratedRouteProjection,
	type GeneratedSettlementLocalProjection,
	type GeneratedSiteProjection,
	type GeneratedWorldOverviewProjection,
	type GeneratedWorldStateInput,
	projectGeneratedSettlementLocal,
	projectGeneratedWorldOverview,
} from "./generated-world";
import { humanSettlementPhysicalScale } from "./scene";
import type {
	AnimationClass,
	CanonicalActionRef,
	CanonicalPresentationSource,
	PropKind,
	SpatialActorProjection,
	SpatialCellDefinition,
	SpatialEdge,
	SpatialInteractionProjection,
	SpatialNode,
	SpatialPointMm,
	SpatialProjection,
	SpatialSceneDefinition,
} from "./types";

const MAX_PROJECTED_ENTITIES = 8;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const ANIMATION_CLASSES = new Set<AnimationClass>([
	"idle",
	"walk",
	"carry",
	"gather",
	"inspect",
	"talk",
	"listen",
	"exchange",
	"repair",
	"eat-rest",
	"react",
]);
const LOCOMOTION_CLASSES = new Set<AnimationClass>(["walk", "carry"]);

interface CivilizationCitizenInput {
	readonly schemaVersion: "eonfolk-civilization-social-v1";
	readonly citizenId: string;
	readonly name: string;
	readonly valueIds: readonly string[];
	readonly settlementId: string;
	readonly siteId: string;
	readonly householdId: string | null;
	readonly primaryRoleId: string | null;
	readonly residenceState: "resident" | "travelling" | "departed";
}

interface CivilizationProjectInput {
	readonly projectId: string;
	readonly kind: string;
	readonly name: string;
	readonly settlementId: string;
	readonly siteId: string | null;
	readonly state:
		| "proposed"
		| "approved"
		| "resourcing"
		| "active"
		| "paused"
		| "completed"
		| "failed"
		| "abandoned";
	readonly milestones: readonly Readonly<{
		readonly milestoneId: string;
		readonly progressBasisPoints: number;
		readonly state: "blocked" | "ready" | "active" | "completed" | "failed";
	}>[];
	readonly participantCitizenIds: readonly string[];
	readonly sourceEventIds: readonly string[];
}

/** Dependency-free structural view of the civilization v3 authority state. */
export interface GeneratedSpatialCivilizationInput {
	readonly schemaVersion: "eonfolk-civilization-kernel-v3";
	readonly revision: number;
	readonly simulationTime: number;
	readonly references: Readonly<{
		readonly citizenIds: readonly string[];
		readonly settlementIds: readonly string[];
		readonly siteIds: readonly string[];
	}>;
	readonly citizens: Readonly<Record<string, CivilizationCitizenInput>>;
	readonly projects: Readonly<Record<string, CivilizationProjectInput>>;
}

/** Exact metadata the adapter consumes from a validated v5 checkpoint. */
export interface GeneratedSpatialCheckpointInput {
	readonly schemaVersion: "eonfolk-civilization-experiment-v5";
	readonly runnerVersion: "eonfolk-civilization-runner-v5";
	readonly worldIdentityHash: string;
	readonly horizonDays: number;
	readonly finalStateHash: string;
	readonly events: readonly Readonly<{
		readonly eventIndex: number;
		readonly eventId: string;
		readonly eventHash: string;
	}>[];
	readonly metrics: Readonly<{
		readonly simulationTime: number;
		readonly modelInvocations: number;
	}>;
}

export type GeneratedSpatialActivityLocation =
	| Readonly<{
			readonly kind: "interaction-slot";
			readonly interactionSlotId: string;
	  }>
	| Readonly<{
			readonly kind: "route";
			readonly routeId: string;
			readonly progressBasisPoints: number;
	  }>;

/**
 * Minimal scheduler-owned projection boundary. The renderer never guesses a
 * person's current action or physical location from residence/project records.
 */
export interface GeneratedSpatialActivityInput {
	readonly schemaVersion: "eonfolk-generated-spatial-activity-v1";
	readonly citizenId: string;
	readonly canonicalAction: CanonicalActionRef;
	readonly location: GeneratedSpatialActivityLocation;
	readonly projectId: string | null;
	readonly carriedProp: PropKind | null;
	readonly focal: boolean;
}

export interface GeneratedProjectProjection {
	readonly projectId: string;
	readonly kind: string;
	readonly name: string;
	readonly settlementId: string;
	readonly siteId: string;
	readonly state: CivilizationProjectInput["state"];
	readonly progressBasisPoints: number;
	readonly participantCitizenIds: readonly string[];
	readonly sourceEventIds: readonly string[];
	readonly semanticLabel: string;
}

export type GeneratedSpatialAvailabilityReason =
	| "canonical-citizens-unavailable"
	| "canonical-activities-unavailable";

export interface GeneratedCivilizationSpatialProjection {
	readonly schemaVersion: "eonfolk-generated-civilization-spatial-v1";
	readonly availability: Readonly<{
		readonly status: "available" | "unavailable";
		readonly reasons: readonly GeneratedSpatialAvailabilityReason[];
	}>;
	readonly overview: GeneratedWorldOverviewProjection;
	readonly local: GeneratedSettlementLocalProjection;
	readonly scene: SpatialSceneDefinition;
	readonly projects: readonly GeneratedProjectProjection[];
	readonly spatial: SpatialProjection;
	readonly omitted: Readonly<{
		readonly citizens: number;
		readonly activities: number;
		readonly projects: number;
	}>;
}

export interface ProjectGeneratedCivilizationSpatialInput {
	readonly world: GeneratedWorldStateInput;
	readonly civilization: GeneratedSpatialCivilizationInput;
	readonly checkpoint: GeneratedSpatialCheckpointInput;
	readonly settlementId?: string;
	readonly activities?: readonly GeneratedSpatialActivityInput[];
	readonly presentationTick: number;
}

export type GeneratedTemporalMismatchCode =
	| "non-monotonic-tick"
	| "source-mismatch"
	| "off-route"
	| "route-regression"
	| "excessive-step"
	| "unsupported-spatial-jump"
	| "blocked-volume";

export interface GeneratedTemporalDiagnosticSample {
	readonly presentationTick: number;
	readonly citizenId: string;
	readonly actionId: string;
	readonly destinationPlaceId: string;
	readonly routeId: string;
	readonly progressBasisPoints: number | null;
	readonly animationClass: AnimationClass;
	readonly interactionTarget: string | null;
	readonly prop: PropKind | null;
	readonly positionMm: SpatialPointMm;
}

export interface GeneratedTemporalMismatch {
	readonly code: GeneratedTemporalMismatchCode;
	readonly presentationTick: number;
	readonly citizenId: string | null;
}

export interface GeneratedTemporalWindowInspection {
	readonly samples: readonly GeneratedTemporalDiagnosticSample[];
	readonly movingCitizenIds: readonly string[];
	readonly traversedDistanceMmByCitizen: Readonly<Record<string, number>>;
	readonly animationClasses: readonly AnimationClass[];
	readonly interactionIds: readonly string[];
	readonly mismatches: readonly GeneratedTemporalMismatch[];
	readonly teleportCount: number;
	readonly contradictionCount: number;
}

function compareIds(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message: string): never {
	throw new Error(`generated spatial adapter: ${message}`);
}

function integer(value: number, label: string): number {
	if (!Number.isSafeInteger(value) || value < 0)
		fail(`${label} must be a non-negative safe integer`);
	return value;
}

function basisPoints(value: number, label: string): number {
	integer(value, label);
	if (value > 10_000) fail(`${label} exceeds 10000 basis points`);
	return value;
}

function point(value: GeneratedMetricPointProjection): SpatialPointMm {
	return Object.freeze({
		x: value.xMillimeters,
		y: value.elevationMillimeters,
		z: value.yMillimeters,
	});
}

function center(site: GeneratedSiteProjection): SpatialPointMm {
	return Object.freeze({
		x: Math.trunc(
			(site.bounds.minimum.xMillimeters + site.bounds.maximum.xMillimeters) / 2,
		),
		y: Math.trunc(
			(site.bounds.minimum.elevationMillimeters +
				site.bounds.maximum.elevationMillimeters) /
				2,
		),
		z: Math.trunc(
			(site.bounds.minimum.yMillimeters + site.bounds.maximum.yMillimeters) / 2,
		),
	});
}

function distance(left: SpatialPointMm, right: SpatialPointMm): number {
	return Math.round(
		Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z),
	);
}

function nodeAffordance(
	activityKinds: readonly string[],
): SpatialNode["affordance"] {
	if (activityKinds.includes("enter")) return "entrance";
	if (activityKinds.includes("gather")) return "resource";
	if (activityKinds.includes("store")) return "storage";
	if (activityKinds.includes("work")) return "work";
	if (activityKinds.includes("rest")) return "rest";
	if (activityKinds.includes("meet")) return "interaction";
	if (activityKinds.includes("rendezvous")) return "rendezvous";
	return "transit";
}

function validateIdentity(
	input: ProjectGeneratedCivilizationSpatialInput,
): void {
	if (input.civilization.schemaVersion !== "eonfolk-civilization-kernel-v3")
		fail("unsupported civilization schema");
	if (
		input.checkpoint.schemaVersion !== "eonfolk-civilization-experiment-v5" ||
		input.checkpoint.runnerVersion !== "eonfolk-civilization-runner-v5"
	)
		fail("unsupported checkpoint schema or runner");
	if (input.checkpoint.worldIdentityHash !== input.world.identity.identityHash)
		fail("checkpoint belongs to another generated world");
	if (!HASH_PATTERN.test(input.world.identity.identityHash))
		fail("generated world identity hash is malformed");
	if (!HASH_PATTERN.test(input.checkpoint.finalStateHash))
		fail("checkpoint final state hash is malformed");
	if (input.checkpoint.metrics.modelInvocations !== 0)
		fail("checkpoint is not inference-free");
	if (
		integer(
			input.checkpoint.metrics.simulationTime,
			"checkpoint simulation time",
		) !== input.civilization.simulationTime
	)
		fail("checkpoint and civilization simulation times differ");
	integer(input.civilization.revision, "civilization revision");
	integer(input.checkpoint.horizonDays, "checkpoint horizon");
	if (input.checkpoint.horizonDays < 1 || input.checkpoint.horizonDays > 365)
		fail("checkpoint horizon must be from 1 through 365 days");
	if (
		input.checkpoint.metrics.simulationTime !==
		input.checkpoint.horizonDays * 86_400
	)
		fail("checkpoint horizon and simulation time differ");
	integer(input.presentationTick, "presentation tick");
	const eventIds = new Set<string>();
	const eventHashes = new Set<string>();
	input.checkpoint.events.forEach((event, index) => {
		if (event.eventIndex !== index)
			fail("checkpoint events are not a contiguous ordered interval");
		if (!HASH_PATTERN.test(event.eventHash))
			fail(`checkpoint event ${event.eventId} hash is malformed`);
		if (eventIds.has(event.eventId) || eventHashes.has(event.eventHash))
			fail("checkpoint events contain duplicate identity");
		eventIds.add(event.eventId);
		eventHashes.add(event.eventHash);
	});
}

function validateRecordIdentities(
	input: ProjectGeneratedCivilizationSpatialInput,
): void {
	const keyed = <T>(
		record: Readonly<Record<string, { readonly value: T }>>,
		id: (value: T) => string,
		label: string,
	): void => {
		for (const [key, wrapped] of Object.entries(record))
			if (key !== id(wrapped.value))
				fail(`${label} key ${key} has mismatched identity`);
	};
	keyed(input.world.settlements, (value) => value.settlementId, "settlement");
	keyed(input.world.regions, (value) => value.regionId, "region");
	keyed(input.world.chunks, (value) => value.chunkId, "chunk");
	keyed(input.world.territories, (value) => value.territoryId, "territory");
	keyed(input.world.cells, (value) => value.cellId, "cell");
	keyed(input.world.localSpaces, (value) => value.localSpaceId, "local space");
	keyed(input.world.sites, (value) => value.siteId, "site");
	keyed(input.world.places, (value) => value.placeId, "place");
	keyed(input.world.buildings, (value) => value.buildingId, "building");
	keyed(input.world.routes, (value) => value.routeId, "route");
	keyed(
		input.world.interactionSlots,
		(value) => value.interactionSlotId,
		"interaction slot",
	);
	for (const [key, citizen] of Object.entries(input.civilization.citizens))
		if (key !== citizen.citizenId)
			fail(`citizen key ${key} has mismatched identity`);
	for (const [key, project] of Object.entries(input.civilization.projects))
		if (key !== project.projectId)
			fail(`project key ${key} has mismatched identity`);
}

function validateCivilizationReferences(
	input: ProjectGeneratedCivilizationSpatialInput,
): void {
	for (const [label, ids] of [
		["citizen", input.civilization.references.citizenIds],
		["settlement", input.civilization.references.settlementIds],
		["site", input.civilization.references.siteIds],
	] as const)
		if (new Set(ids).size !== ids.length)
			fail(`civilization ${label} references contain a duplicate`);
	const siteSettlementId = (siteId: string): string => {
		const site = input.world.sites[siteId]?.value;
		if (site === undefined) fail(`missing site ${siteId}`);
		const localSpace = input.world.localSpaces[site.localSpaceId]?.value;
		if (localSpace === undefined) fail(`site ${siteId} has no local space`);
		return localSpace.settlementId;
	};
	for (const settlementId of input.civilization.references.settlementIds)
		if (input.world.settlements[settlementId] === undefined)
			fail(`civilization references missing settlement ${settlementId}`);
	for (const siteId of input.civilization.references.siteIds)
		if (input.world.sites[siteId] === undefined)
			fail(`civilization references missing site ${siteId}`);
	for (const citizen of Object.values(input.civilization.citizens)) {
		if (citizen.schemaVersion !== "eonfolk-civilization-social-v1")
			fail(`citizen ${citizen.citizenId} has an unsupported schema`);
		if (!input.civilization.references.citizenIds.includes(citizen.citizenId))
			fail(`citizen ${citizen.citizenId} is absent from canonical references`);
		if (input.world.settlements[citizen.settlementId] === undefined)
			fail(`citizen ${citizen.citizenId} references missing settlement`);
		if (input.world.sites[citizen.siteId] === undefined)
			fail(`citizen ${citizen.citizenId} references missing site`);
		if (siteSettlementId(citizen.siteId) !== citizen.settlementId)
			fail(`citizen ${citizen.citizenId} site belongs to another settlement`);
	}
	for (const project of Object.values(input.civilization.projects)) {
		if (input.world.settlements[project.settlementId] === undefined)
			fail(`project ${project.projectId} references missing settlement`);
		if (
			project.siteId !== null &&
			input.world.sites[project.siteId] === undefined
		)
			fail(`project ${project.projectId} references missing site`);
		if (
			project.siteId !== null &&
			siteSettlementId(project.siteId) !== project.settlementId
		)
			fail(`project ${project.projectId} site belongs to another settlement`);
		if (
			new Set(project.participantCitizenIds).size !==
			project.participantCitizenIds.length
		)
			fail(`project ${project.projectId} repeats a participant`);
		for (const citizenId of project.participantCitizenIds)
			if (!input.civilization.references.citizenIds.includes(citizenId))
				fail(`project ${project.projectId} references missing participant`);
		for (const milestone of project.milestones)
			basisPoints(
				milestone.progressBasisPoints,
				`project ${project.projectId} milestone progress`,
			);
	}
}

function siteDefaultNode(
	siteId: string,
	local: GeneratedSettlementLocalProjection,
): string {
	const buildingEntrances = local.buildings
		.filter((building) => building.siteId === siteId)
		.map((building) => building.entranceSlotId)
		.sort(compareIds);
	const slotIds = local.interactionSlots
		.filter((slot) => slot.siteId === siteId)
		.map((slot) => slot.interactionSlotId)
		.sort(compareIds);
	const result = buildingEntrances[0] ?? slotIds[0];
	if (result === undefined) fail(`site ${siteId} has no grounded spatial node`);
	return result;
}

function validateLocalGrounding(
	local: GeneratedSettlementLocalProjection,
): void {
	const sites = new Set(local.sites.map((site) => site.siteId));
	const slots = new Map(
		local.interactionSlots.map((slot) => [slot.interactionSlotId, slot]),
	);
	for (const building of local.buildings) {
		const entrance = slots.get(building.entranceSlotId);
		if (entrance === undefined)
			fail(`building ${building.buildingId} lacks its canonical entrance`);
		if (entrance.siteId !== building.siteId)
			fail(`building ${building.buildingId} entrance belongs to another site`);
	}
	for (const route of local.routes) {
		if (!sites.has(route.fromSiteId) || !sites.has(route.toSiteId))
			fail(`route ${route.routeId} is not grounded at local sites`);
		if (route.waypoints.length < 2)
			fail(`route ${route.routeId} lacks a traversable geometry`);
		siteDefaultNode(route.fromSiteId, local);
		siteDefaultNode(route.toSiteId, local);
	}
}

function routeWaypointId(routeId: string, index: number): string {
	return `${routeId}:waypoint:${index}`;
}

function directedEdges(
	baseId: string,
	from: SpatialNode,
	to: SpatialNode,
): readonly SpatialEdge[] {
	const costMm = distance(from, to);
	return Object.freeze([
		Object.freeze({
			edgeId: `${baseId}:forward`,
			fromNodeId: from.nodeId,
			toNodeId: to.nodeId,
			costMm,
		}),
		Object.freeze({
			edgeId: `${baseId}:reverse`,
			fromNodeId: to.nodeId,
			toNodeId: from.nodeId,
			costMm,
		}),
	]);
}

function buildScene(
	local: GeneratedSettlementLocalProjection,
	overview: GeneratedWorldOverviewProjection,
): SpatialSceneDefinition {
	validateLocalGrounding(local);
	const buildingEntranceIds = new Set(
		local.buildings.map((building) => building.entranceSlotId),
	);
	const slotNodes = local.interactionSlots.map((slot) => {
		const value = point(slot.position);
		return Object.freeze({
			nodeId: slot.interactionSlotId,
			placeId: slot.siteId,
			...value,
			affordance: buildingEntranceIds.has(slot.interactionSlotId)
				? "entrance"
				: nodeAffordance(slot.activityKinds),
			capacity: slot.capacity,
			facingDegrees: Math.trunc(slot.facingMilliDegrees / 1_000),
			occupantSpacingMm: 900,
			waitingNodeIds: Object.freeze([]),
		} satisfies SpatialNode);
	});
	const waypointNodes = local.routes.flatMap((route) =>
		route.waypoints.map((waypoint, index) =>
			Object.freeze({
				nodeId: routeWaypointId(route.routeId, index),
				placeId: index === 0 ? route.fromSiteId : route.toSiteId,
				...point(waypoint),
				affordance: "transit" as const,
				capacity: 8,
				facingDegrees: 0,
				occupantSpacingMm: 900,
				waitingNodeIds: Object.freeze([]),
			} satisfies SpatialNode),
		),
	);
	const nodes = Object.freeze(
		Object.fromEntries(
			[...slotNodes, ...waypointNodes]
				.sort((left, right) => compareIds(left.nodeId, right.nodeId))
				.map((node) => [node.nodeId, node]),
		),
	);
	const node = (nodeId: string): SpatialNode => {
		const value = nodes[nodeId];
		if (value === undefined) fail(`missing projected node ${nodeId}`);
		return value;
	};
	const edges: SpatialEdge[] = [];
	for (const route of [...local.routes].sort((left, right) =>
		compareIds(left.routeId, right.routeId),
	)) {
		const routeNodes = route.waypoints.map((_, index) =>
			node(routeWaypointId(route.routeId, index)),
		);
		const grounded = [
			node(siteDefaultNode(route.fromSiteId, local)),
			...routeNodes,
			node(siteDefaultNode(route.toSiteId, local)),
		];
		for (let index = 0; index < grounded.length - 1; index += 1) {
			const from = grounded[index];
			const to = grounded[index + 1];
			if (from === undefined || to === undefined)
				fail(`route ${route.routeId} has an incomplete segment`);
			edges.push(
				...directedEdges(`${route.routeId}:segment:${index}`, from, to),
			);
		}
	}
	const cells: Record<string, SpatialCellDefinition> = {};
	for (const site of local.sites) {
		const terrainCell = overview.terrainCells.find(
			(cell) => cell.cellId === site.cellId,
		);
		if (terrainCell === undefined)
			fail(`site ${site.siteId} references missing terrain cell`);
		const existing = cells[site.cellId];
		const placeIds = [...(existing?.placeIds ?? []), site.siteId].sort(
			compareIds,
		);
		const siteCenter = center(site);
		cells[site.cellId] = Object.freeze({
			cellId: site.cellId,
			regionId: terrainCell.regionId,
			centerMm: existing?.centerMm ?? siteCenter,
			radiusMm: Math.max(
				existing?.radiusMm ?? 0,
				Math.trunc(
					Math.hypot(
						site.bounds.maximum.xMillimeters - site.bounds.minimum.xMillimeters,
						site.bounds.maximum.yMillimeters - site.bounds.minimum.yMillimeters,
					) / 2,
				),
			),
			placeIds: Object.freeze(placeIds),
		});
	}
	return Object.freeze({
		schemaVersion: "eonfolk-generated-spatial-scene-v1",
		sceneVersion: `generated:${local.source.identityHash}:${local.settlement.settlementId}`,
		metresPerWorldUnit: 1,
		regionExtentMm: Object.freeze({
			minX: local.localSpace.bounds.minimum.xMillimeters,
			maxX: local.localSpace.bounds.maximum.xMillimeters,
			minZ: local.localSpace.bounds.minimum.yMillimeters,
			maxZ: local.localSpace.bounds.maximum.yMillimeters,
		}),
		physicalScale: humanSettlementPhysicalScale,
		cells: Object.freeze(cells),
		places: Object.freeze(
			Object.fromEntries(
				local.sites.map((site) => [
					site.siteId,
					Object.freeze({
						placeId: site.siteId,
						cellId: site.cellId,
						name: site.name,
						kind:
							site.kind === "resource"
								? "forest"
								: site.kind === "production"
									? "mill"
									: site.kind === "storage"
										? "storage"
										: site.kind === "residential"
											? "home"
											: site.kind === "civic"
												? "civic"
												: "field",
						centerMm: center(site),
						affordanceNodeIds: Object.freeze(
							local.interactionSlots
								.filter((slot) => slot.siteId === site.siteId)
								.map((slot) => slot.interactionSlotId)
								.sort(compareIds),
						),
					}),
				]),
			),
		),
		nodes,
		edges: Object.freeze(edges),
		blockedVolumes: Object.freeze([]),
	});
}

function projectProjects(
	state: GeneratedSpatialCivilizationInput,
	settlementId: string,
): readonly GeneratedProjectProjection[] {
	return Object.freeze(
		Object.values(state.projects)
			.filter(
				(
					project,
				): project is CivilizationProjectInput & { readonly siteId: string } =>
					project.settlementId === settlementId && project.siteId !== null,
			)
			.sort((left, right) => compareIds(left.projectId, right.projectId))
			.slice(0, MAX_PROJECTED_ENTITIES)
			.map((project) => {
				const progressBasisPoints =
					project.milestones.length === 0
						? 0
						: Math.trunc(
								project.milestones.reduce((total, milestone) => {
									basisPoints(
										milestone.progressBasisPoints,
										`project ${project.projectId} milestone progress`,
									);
									return total + milestone.progressBasisPoints;
								}, 0) / project.milestones.length,
							);
				return Object.freeze({
					projectId: project.projectId,
					kind: project.kind,
					name: project.name,
					settlementId: project.settlementId,
					siteId: project.siteId,
					state: project.state,
					progressBasisPoints,
					participantCitizenIds: Object.freeze(
						[...project.participantCitizenIds].sort(compareIds),
					),
					sourceEventIds: Object.freeze(
						[...project.sourceEventIds].sort(compareIds),
					),
					semanticLabel: `${project.name} is ${project.state} at ${project.siteId}`,
				});
			}),
	);
}

function pointAlongRoute(
	route: GeneratedRouteProjection,
	progressBasisPoints: number,
): Readonly<{
	readonly position: SpatialPointMm;
	readonly facingDegrees: number;
}> {
	basisPoints(progressBasisPoints, `route ${route.routeId} progress`);
	const points = route.waypoints.map(point);
	const segments = points.slice(0, -1).map((from, index) => {
		const to = points[index + 1];
		if (to === undefined)
			fail(`route ${route.routeId} has incomplete geometry`);
		return { from, to, distanceMm: distance(from, to) };
	});
	const total = segments.reduce((sum, segment) => sum + segment.distanceMm, 0);
	let remaining = Math.trunc((total * progressBasisPoints) / 10_000);
	for (const segment of segments) {
		if (remaining <= segment.distanceMm) {
			const ratio =
				segment.distanceMm === 0 ? 1 : remaining / segment.distanceMm;
			return Object.freeze({
				position: Object.freeze({
					x: Math.round(
						segment.from.x + (segment.to.x - segment.from.x) * ratio,
					),
					y: Math.round(
						segment.from.y + (segment.to.y - segment.from.y) * ratio,
					),
					z: Math.round(
						segment.from.z + (segment.to.z - segment.from.z) * ratio,
					),
				}),
				facingDegrees: Math.round(
					(Math.atan2(
						segment.to.x - segment.from.x,
						segment.to.z - segment.from.z,
					) *
						180) /
						Math.PI,
				),
			});
		}
		remaining -= segment.distanceMm;
	}
	const last = points.at(-1);
	if (last === undefined) fail(`route ${route.routeId} has no endpoint`);
	return Object.freeze({ position: last, facingDegrees: 0 });
}

function activityActor(input: {
	readonly activity: GeneratedSpatialActivityInput;
	readonly citizen: CivilizationCitizenInput;
	readonly local: GeneratedSettlementLocalProjection;
	readonly scene: SpatialSceneDefinition;
	readonly state: GeneratedSpatialCivilizationInput;
}): SpatialActorProjection {
	const { activity, citizen, local, scene, state } = input;
	if (activity.schemaVersion !== "eonfolk-generated-spatial-activity-v1")
		fail(`activity for ${activity.citizenId} has an unsupported schema`);
	if (activity.citizenId !== citizen.citizenId)
		fail("activity and citizen identities differ");
	if (activity.canonicalAction.actionId.length === 0)
		fail("activity action identity is empty");
	if (!ANIMATION_CLASSES.has(activity.canonicalAction.kind))
		fail(`activity ${activity.canonicalAction.actionId} has an unknown kind`);
	integer(
		activity.canonicalAction.simulationStart,
		`activity ${activity.canonicalAction.actionId} start`,
	);
	if (activity.canonicalAction.simulationEnd !== null) {
		integer(
			activity.canonicalAction.simulationEnd,
			`activity ${activity.canonicalAction.actionId} end`,
		);
		if (
			activity.canonicalAction.simulationEnd <
			activity.canonicalAction.simulationStart
		)
			fail(
				`activity ${activity.canonicalAction.actionId} ends before it starts`,
			);
	}
	if (activity.canonicalAction.eventSequence !== null)
		integer(
			activity.canonicalAction.eventSequence,
			`activity ${activity.canonicalAction.actionId} event sequence`,
		);
	if (
		(activity.canonicalAction.eventId === null) !==
		(activity.canonicalAction.eventSequence === null)
	)
		fail(
			`activity ${activity.canonicalAction.actionId} event link is incomplete`,
		);
	if (activity.canonicalAction.affordanceSlotIndex !== null)
		integer(
			activity.canonicalAction.affordanceSlotIndex,
			`activity ${activity.canonicalAction.actionId} affordance slot`,
		);
	if (activity.canonicalAction.simulationStart > state.simulationTime)
		fail(`activity ${activity.canonicalAction.actionId} starts in the future`);
	if (
		activity.canonicalAction.simulationEnd !== null &&
		activity.canonicalAction.simulationEnd > state.simulationTime
	)
		fail(`activity ${activity.canonicalAction.actionId} ends in the future`);
	const authoritativeCurrentSite =
		activity.canonicalAction.status === "committed"
			? activity.canonicalAction.destinationPlaceId
			: activity.canonicalAction.originPlaceId;
	if (authoritativeCurrentSite !== citizen.siteId)
		fail(
			`activity ${activity.canonicalAction.actionId} disagrees with the citizen site`,
		);
	if (
		!local.sites.some(
			(site) => site.siteId === activity.canonicalAction.destinationPlaceId,
		)
	)
		fail(
			`activity ${activity.canonicalAction.actionId} leaves the local settlement`,
		);
	if (activity.projectId !== null) {
		const project = state.projects[activity.projectId];
		if (
			project === undefined ||
			project.siteId !== activity.canonicalAction.destinationPlaceId ||
			!project.participantCitizenIds.includes(citizen.citizenId)
		)
			fail(
				`activity ${activity.canonicalAction.actionId} is not grounded in its project`,
			);
	}
	let position: SpatialPointMm;
	let facingDegrees: number;
	let routeNodeIds: readonly string[];
	let routeId: string;
	const location = activity.location;
	if (location.kind === "interaction-slot") {
		const slot = local.interactionSlots.find(
			(candidate) => candidate.interactionSlotId === location.interactionSlotId,
		);
		if (slot === undefined)
			fail(`activity ${activity.canonicalAction.actionId} uses a missing slot`);
		if (
			slot.siteId !== activity.canonicalAction.originPlaceId &&
			slot.siteId !== activity.canonicalAction.destinationPlaceId
		)
			fail(
				`activity ${activity.canonicalAction.actionId} slot is at another site`,
			);
		if (
			activity.canonicalAction.affordanceId !== null &&
			activity.canonicalAction.affordanceId !== slot.interactionSlotId
		)
			fail(
				`activity ${activity.canonicalAction.actionId} affordance and slot differ`,
			);
		if (activity.canonicalAction.affordanceSlotIndex === null)
			fail(
				`activity ${activity.canonicalAction.actionId} lacks a reserved slot index`,
			);
		if (activity.canonicalAction.affordanceSlotIndex >= slot.capacity)
			fail(
				`activity ${activity.canonicalAction.actionId} exceeds slot capacity`,
			);
		const node = scene.nodes[slot.interactionSlotId];
		if (node === undefined)
			fail(`activity slot ${slot.interactionSlotId} is ungrounded`);
		position = Object.freeze({ x: node.x, y: node.y, z: node.z });
		facingDegrees = node.facingDegrees;
		routeNodeIds = Object.freeze([node.nodeId]);
		routeId = node.nodeId;
	} else {
		const route = local.routes.find(
			(candidate) => candidate.routeId === location.routeId,
		);
		if (route === undefined)
			fail(
				`activity ${activity.canonicalAction.actionId} uses a missing route`,
			);
		if (
			route.fromSiteId !== activity.canonicalAction.originPlaceId ||
			route.toSiteId !== activity.canonicalAction.destinationPlaceId
		)
			fail(
				`activity ${activity.canonicalAction.actionId} route endpoints differ`,
			);
		if (!LOCOMOTION_CLASSES.has(activity.canonicalAction.kind))
			fail(
				`activity ${activity.canonicalAction.actionId} route requires walk or carry`,
			);
		if (
			(activity.canonicalAction.status === "committed") !==
			(location.progressBasisPoints === 10_000)
		)
			fail(
				`activity ${activity.canonicalAction.actionId} route progress and status differ`,
			);
		const sample = pointAlongRoute(route, location.progressBasisPoints);
		position = sample.position;
		facingDegrees = sample.facingDegrees;
		routeNodeIds = Object.freeze(
			route.waypoints.map((_, index) => routeWaypointId(route.routeId, index)),
		);
		routeId = route.routeId;
	}
	const canonicalAction = Object.freeze({ ...activity.canonicalAction });
	return Object.freeze({
		citizenId: citizen.citizenId,
		slug: citizen.citizenId,
		name: citizen.name,
		role: citizen.primaryRoleId ?? "unassigned",
		placeId: citizen.siteId,
		positionMm: position,
		facingDegrees,
		routeNodeIds,
		animationClass:
			activity.location.kind === "route" &&
			activity.location.progressBasisPoints === 10_000
				? "idle"
				: activity.canonicalAction.kind,
		prop: activity.carriedProp,
		travelState: Object.freeze({
			status:
				activity.location.kind === "route"
					? activity.location.progressBasisPoints === 10_000 &&
						activity.canonicalAction.status === "committed"
						? "arrived"
						: "travelling"
					: "stationary",
			originPlaceId: activity.canonicalAction.originPlaceId,
			destinationPlaceId: activity.canonicalAction.destinationPlaceId,
			routeId,
			progressBasisPoints:
				activity.location.kind === "route"
					? activity.location.progressBasisPoints
					: null,
			targetId: activity.canonicalAction.targetId,
		}),
		interactionTarget: activity.canonicalAction.targetId,
		action: canonicalAction,
		semanticLabel: `${citizen.name} is ${activity.canonicalAction.kind} at ${activity.canonicalAction.destinationPlaceId}`,
		focal: activity.focal,
	});
}

function resolveSlotOccupancy(input: {
	readonly scene: SpatialSceneDefinition;
	readonly actors: readonly SpatialActorProjection[];
}): readonly SpatialActorProjection[] {
	const bySlot = new Map<string, SpatialActorProjection[]>();
	for (const actor of input.actors) {
		if (
			actor.travelState.status !== "stationary" ||
			actor.action.affordanceId === null ||
			actor.travelState.routeId !== actor.action.affordanceId
		)
			continue;
		const occupants = bySlot.get(actor.action.affordanceId) ?? [];
		occupants.push(actor);
		bySlot.set(actor.action.affordanceId, occupants);
	}
	for (const [nodeId, unsorted] of bySlot) {
		const node = input.scene.nodes[nodeId];
		if (node === undefined) fail(`occupied slot ${nodeId} is missing`);
		const occupants = [...unsorted].sort((left, right) => {
			const leftIndex = left.action.affordanceSlotIndex ?? 0;
			const rightIndex = right.action.affordanceSlotIndex ?? 0;
			return (
				leftIndex - rightIndex || compareIds(left.citizenId, right.citizenId)
			);
		});
		const slotIndices = occupants.map(
			(actor) => actor.action.affordanceSlotIndex ?? 0,
		);
		if (new Set(slotIndices).size !== slotIndices.length)
			fail(`occupied slot ${nodeId} repeats an affordance slot index`);
		if (
			occupants.length > node.capacity ||
			slotIndices.some((index) => index >= node.capacity)
		)
			fail(`occupied slot ${nodeId} exceeds canonical capacity`);
	}
	// The canonical projection remains exactly on the reserved slot. A renderer
	// may apply bounded per-occupant separation without changing this authority.
	return input.actors;
}

function deriveInteractions(input: {
	readonly actors: readonly SpatialActorProjection[];
}): Readonly<{
	readonly actors: readonly SpatialActorProjection[];
	readonly interactions: readonly SpatialInteractionProjection[];
}> {
	const social = new Set<AnimationClass>(["talk", "listen", "exchange"]);
	const byId = new Map(input.actors.map((actor) => [actor.citizenId, actor]));
	const oriented = new Map<string, SpatialActorProjection>();
	const interactions: SpatialInteractionProjection[] = [];
	const emittedPairs = new Set<string>();
	for (const actor of [...input.actors].sort((left, right) =>
		compareIds(left.citizenId, right.citizenId),
	)) {
		const slotId = actor.action.affordanceId;
		const targetId = actor.action.targetId;
		const target = targetId === null ? undefined : byId.get(targetId);
		if (
			actor.travelState.status !== "stationary" ||
			slotId === null ||
			!social.has(actor.action.kind) ||
			target === undefined ||
			target.travelState.status !== "stationary" ||
			target.action.affordanceId !== slotId ||
			!social.has(target.action.kind) ||
			target.action.targetId !== actor.citizenId
		)
			continue;
		const participants = [actor, target].sort((left, right) =>
			compareIds(left.citizenId, right.citizenId),
		);
		const pairId = participants.map(({ citizenId }) => citizenId).join("+");
		if (emittedPairs.has(pairId)) continue;
		emittedPairs.add(pairId);
		for (const [participantIndex, actor] of participants.entries()) {
			const interactionTarget =
				participants[0]?.citizenId === actor.citizenId
					? participants[1]
					: participants[0];
			if (interactionTarget === undefined) continue;
			oriented.set(
				actor.citizenId,
				Object.freeze({
					...actor,
					facingDegrees:
						participantIndex === 0
							? actor.facingDegrees
							: (actor.facingDegrees + 180) % 360,
					interactionTarget: interactionTarget.citizenId,
				}),
			);
		}
		const eventIds = new Set(
			participants
				.map((actor) => actor.action.eventId)
				.filter((value): value is string => value !== null),
		);
		const eventSequences = new Set(
			participants
				.map((actor) => actor.action.eventSequence)
				.filter((value): value is number => value !== null),
		);
		const linkedEventId =
			eventIds.size === 1 && eventSequences.size === 1
				? ([...eventIds][0] ?? null)
				: null;
		const linkedSequence =
			linkedEventId === null ? null : ([...eventSequences][0] ?? null);
		const committed =
			linkedEventId !== null &&
			participants.every((actor) => actor.action.status === "committed");
		const names = participants.map((actor) => actor.name);
		interactions.push(
			Object.freeze({
				interactionId:
					(linkedEventId === null ? null : `${linkedEventId}:${pairId}`) ??
					`current:${slotId}:${participants
						.map((actor) => actor.action.actionId)
						.join("+")}`,
				participantIds: Object.freeze(
					participants.map((actor) => actor.citizenId),
				),
				kind: participants.every((actor) => actor.action.kind === "exchange")
					? "exchange"
					: "conversation",
				sourceEventId: linkedEventId,
				sourceSequence: linkedSequence,
				status: committed ? "committed" : "in-progress",
				semanticLabel: `${names.join(", ")} share a canonical ${participants.every((actor) => actor.action.kind === "exchange") ? "exchange" : "conversation"} slot at ${participants[0]?.placeId ?? slotId}`,
			}),
		);
	}
	return Object.freeze({
		actors: Object.freeze(
			input.actors.map((actor) => oriented.get(actor.citizenId) ?? actor),
		),
		interactions: Object.freeze(interactions),
	});
}

function source(
	input: ProjectGeneratedCivilizationSpatialInput,
	local: GeneratedSettlementLocalProjection,
	overview: GeneratedWorldOverviewProjection,
): CanonicalPresentationSource {
	const anchor = overview.terrainCells.find(
		(cell) => cell.cellId === local.settlement.anchorCellId,
	);
	if (anchor === undefined)
		fail("settlement anchor has no projected terrain cell");
	return Object.freeze({
		runId: input.world.identity.worldId,
		regionId: anchor.regionId,
		revision: input.civilization.revision,
		throughSequence: input.checkpoint.events.length,
		stateHash: input.checkpoint.finalStateHash,
	});
}

function spatialProjection(input: {
	readonly source: CanonicalPresentationSource;
	readonly scene: SpatialSceneDefinition;
	readonly presentationTick: number;
	readonly actors: readonly SpatialActorProjection[];
}): SpatialProjection {
	const occupiedActors = resolveSlotOccupancy({
		scene: input.scene,
		actors: input.actors,
	});
	const linked = deriveInteractions({ actors: occupiedActors });
	const animationClasses = Object.freeze(
		[...new Set(linked.actors.map((actor) => actor.animationClass))].sort(),
	) as readonly AnimationClass[];
	return Object.freeze({
		schemaVersion: "eonfolk-spatial-projection-v1",
		sceneVersion: input.scene.sceneVersion,
		source: input.source,
		presentationTick: input.presentationTick,
		actors: linked.actors,
		interactions: linked.interactions,
		animationClasses,
		movingCitizenCount: linked.actors.filter(
			(actor) => actor.travelState.status === "travelling",
		).length,
		canonicalEventLinkCount:
			linked.actors.filter((actor) => actor.action.eventId !== null).length +
			linked.interactions.filter(
				(interaction) => interaction.sourceEventId !== null,
			).length,
		teleportCount: 0,
		contradictionCount: 0,
	});
}

/**
 * Pure renderer-neutral unification of a generated world and one validated
 * civilization checkpoint. Derived camera/scene values never mutate Reality.
 */
export function projectGeneratedCivilizationSpatial(
	input: ProjectGeneratedCivilizationSpatialInput,
): GeneratedCivilizationSpatialProjection {
	validateIdentity(input);
	validateRecordIdentities(input);
	validateCivilizationReferences(input);
	const overview = projectGeneratedWorldOverview(input.world);
	const settlementId =
		input.settlementId ??
		[...overview.settlementAnchors].sort((left, right) =>
			compareIds(left.settlementId, right.settlementId),
		)[0]?.settlementId;
	if (settlementId === undefined) fail("generated world has no settlement");
	const local = projectGeneratedSettlementLocal(input.world, settlementId);
	const scene = buildScene(local, overview);
	const localCitizens = Object.values(input.civilization.citizens)
		.filter(
			(citizen) =>
				citizen.settlementId === settlementId &&
				citizen.residenceState === "resident",
		)
		.sort((left, right) => compareIds(left.citizenId, right.citizenId));
	const activities = [...(input.activities ?? [])].sort((left, right) =>
		compareIds(left.citizenId, right.citizenId),
	);
	if (
		new Set(activities.map((activity) => activity.citizenId)).size !==
		activities.length
	)
		fail("activities contain a duplicate citizen");
	if (
		new Set(activities.map((activity) => activity.canonicalAction.actionId))
			.size !== activities.length
	)
		fail("activities contain a duplicate action identity");
	for (const activity of activities)
		if (input.civilization.citizens[activity.citizenId] === undefined)
			fail(`activity references missing citizen ${activity.citizenId}`);
	const boundedCitizens = localCitizens.slice(0, MAX_PROJECTED_ENTITIES);
	const activityByCitizen = new Map(
		activities.map((activity) => [activity.citizenId, activity]),
	);
	const actors = Object.freeze(
		boundedCitizens.flatMap((citizen) => {
			const activity = activityByCitizen.get(citizen.citizenId);
			return activity === undefined
				? []
				: [
						activityActor({
							activity,
							citizen,
							local,
							scene,
							state: input.civilization,
						}),
					];
		}),
	);
	const reasons: GeneratedSpatialAvailabilityReason[] = [];
	if (localCitizens.length === 0)
		reasons.push("canonical-citizens-unavailable");
	else if (actors.length === 0 || actors.length !== boundedCitizens.length)
		reasons.push("canonical-activities-unavailable");
	const projects = projectProjects(input.civilization, settlementId);
	const canonicalProjects = Object.values(input.civilization.projects).filter(
		(project) =>
			project.settlementId === settlementId && project.siteId !== null,
	);
	return Object.freeze({
		schemaVersion: "eonfolk-generated-civilization-spatial-v1",
		availability: Object.freeze({
			status: reasons.length === 0 ? "available" : "unavailable",
			reasons: Object.freeze(reasons),
		}),
		overview,
		local,
		scene,
		projects,
		spatial: spatialProjection({
			source: source(input, local, overview),
			scene,
			presentationTick: input.presentationTick,
			actors,
		}),
		omitted: Object.freeze({
			citizens: Math.max(0, localCitizens.length - MAX_PROJECTED_ENTITIES),
			activities: Math.max(0, activities.length - actors.length),
			projects: Math.max(0, canonicalProjects.length - MAX_PROJECTED_ENTITIES),
		}),
	});
}

function samePoint(left: SpatialPointMm, right: SpatialPointMm): boolean {
	return left.x === right.x && left.y === right.y && left.z === right.z;
}

function insideBlockedVolume(
	pointMm: SpatialPointMm,
	scene: SpatialSceneDefinition,
): boolean {
	return scene.blockedVolumes.some(
		(volume) =>
			pointMm.x > volume.minX &&
			pointMm.x < volume.maxX &&
			pointMm.z > volume.minZ &&
			pointMm.z < volume.maxZ,
	);
}

/**
 * Audits an ordered set of authoritative generated-world presentation frames.
 * This never synthesizes motion: a citizen counts as moving only when successive
 * frames expose monotonically increasing progress on the same canonical route.
 */
export function inspectGeneratedTemporalWindow(
	frames: readonly GeneratedCivilizationSpatialProjection[],
): GeneratedTemporalWindowInspection {
	const samples: GeneratedTemporalDiagnosticSample[] = [];
	const mismatches: GeneratedTemporalMismatch[] = [];
	const movingCitizenIds = new Set<string>();
	const animationClasses = new Set<AnimationClass>();
	const interactionIds = new Set<string>();
	const traversedDistanceMmByCitizen: Record<string, number> = {};
	const first = frames[0];
	let previous: GeneratedCivilizationSpatialProjection | null = null;
	for (const frame of frames) {
		if (
			first !== undefined &&
			(frame.scene.sceneVersion !== first.scene.sceneVersion ||
				frame.spatial.source.runId !== first.spatial.source.runId ||
				frame.spatial.source.regionId !== first.spatial.source.regionId)
		)
			mismatches.push(
				Object.freeze({
					code: "source-mismatch" as const,
					presentationTick: frame.spatial.presentationTick,
					citizenId: null,
				}),
			);
		if (
			previous !== null &&
			frame.spatial.presentationTick <= previous.spatial.presentationTick
		)
			mismatches.push(
				Object.freeze({
					code: "non-monotonic-tick" as const,
					presentationTick: frame.spatial.presentationTick,
					citizenId: null,
				}),
			);
		const previousActors = new Map(
			(previous?.spatial.actors ?? []).map((actor) => [actor.citizenId, actor]),
		);
		for (const interaction of frame.spatial.interactions)
			interactionIds.add(interaction.interactionId);
		for (const actor of frame.spatial.actors) {
			animationClasses.add(actor.animationClass);
			samples.push(
				Object.freeze({
					presentationTick: frame.spatial.presentationTick,
					citizenId: actor.citizenId,
					actionId: actor.action.actionId,
					destinationPlaceId: actor.action.destinationPlaceId,
					routeId: actor.travelState.routeId,
					progressBasisPoints: actor.travelState.progressBasisPoints,
					animationClass: actor.animationClass,
					interactionTarget: actor.interactionTarget,
					prop: actor.prop,
					positionMm: actor.positionMm,
				}),
			);
			if (insideBlockedVolume(actor.positionMm, frame.scene))
				mismatches.push(
					Object.freeze({
						code: "blocked-volume" as const,
						presentationTick: frame.spatial.presentationTick,
						citizenId: actor.citizenId,
					}),
				);
			const progress = actor.travelState.progressBasisPoints;
			if (progress !== null) {
				const route = frame.local.routes.find(
					(candidate) => candidate.routeId === actor.travelState.routeId,
				);
				const expected =
					route === undefined ? null : pointAlongRoute(route, progress);
				if (
					expected === null ||
					!samePoint(expected.position, actor.positionMm)
				)
					mismatches.push(
						Object.freeze({
							code: "off-route" as const,
							presentationTick: frame.spatial.presentationTick,
							citizenId: actor.citizenId,
						}),
					);
			}
			const prior = previousActors.get(actor.citizenId);
			if (prior === undefined || samePoint(prior.positionMm, actor.positionMm))
				continue;
			const priorProgress = prior.travelState.progressBasisPoints;
			const sameGroundedRoute =
				prior.action.actionId === actor.action.actionId &&
				prior.travelState.routeId === actor.travelState.routeId &&
				priorProgress !== null &&
				progress !== null;
			if (!sameGroundedRoute) {
				mismatches.push(
					Object.freeze({
						code: "unsupported-spatial-jump" as const,
						presentationTick: frame.spatial.presentationTick,
						citizenId: actor.citizenId,
					}),
				);
				continue;
			}
			if (progress <= priorProgress) {
				mismatches.push(
					Object.freeze({
						code: "route-regression" as const,
						presentationTick: frame.spatial.presentationTick,
						citizenId: actor.citizenId,
					}),
				);
				continue;
			}
			const route = frame.local.routes.find(
				(candidate) => candidate.routeId === actor.travelState.routeId,
			);
			if (route === undefined) {
				mismatches.push(
					Object.freeze({
						code: "off-route" as const,
						presentationTick: frame.spatial.presentationTick,
						citizenId: actor.citizenId,
					}),
				);
				continue;
			}
			const traversedDistanceMm = Math.ceil(
				(route.distanceMillimeters * (progress - priorProgress)) / 10_000,
			);
			const elapsedTicks =
				frame.spatial.presentationTick -
				(previous?.spatial.presentationTick ?? frame.spatial.presentationTick);
			const maximumDistanceMm = Math.ceil((elapsedTicks / 30) * 1_000) + 50;
			if (traversedDistanceMm > maximumDistanceMm)
				mismatches.push(
					Object.freeze({
						code: "excessive-step" as const,
						presentationTick: frame.spatial.presentationTick,
						citizenId: actor.citizenId,
					}),
				);
			movingCitizenIds.add(actor.citizenId);
			traversedDistanceMmByCitizen[actor.citizenId] =
				(traversedDistanceMmByCitizen[actor.citizenId] ?? 0) +
				traversedDistanceMm;
		}
		previous = frame;
	}
	const frozenMismatches = Object.freeze(mismatches);
	return Object.freeze({
		samples: Object.freeze(samples),
		movingCitizenIds: Object.freeze([...movingCitizenIds].sort(compareIds)),
		traversedDistanceMmByCitizen: Object.freeze(
			Object.fromEntries(
				Object.entries(traversedDistanceMmByCitizen).sort(([left], [right]) =>
					compareIds(left, right),
				),
			),
		),
		animationClasses: Object.freeze(
			[...animationClasses].sort(compareIds),
		) as readonly AnimationClass[],
		interactionIds: Object.freeze([...interactionIds].sort(compareIds)),
		mismatches: frozenMismatches,
		teleportCount: frozenMismatches.filter(
			(mismatch) =>
				mismatch.code === "route-regression" ||
				mismatch.code === "excessive-step" ||
				mismatch.code === "unsupported-spatial-jump",
		).length,
		contradictionCount: frozenMismatches.filter(
			(mismatch) =>
				mismatch.code !== "route-regression" &&
				mismatch.code !== "excessive-step" &&
				mismatch.code !== "unsupported-spatial-jump",
		).length,
	});
}
