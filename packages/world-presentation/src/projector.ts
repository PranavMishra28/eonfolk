import { createAuthoredPathPlanner } from "./planner";
import { placeDefaultNode, riverholdSpatialScene } from "./scene";
import type {
	AnimationClass,
	CanonicalPresentationSource,
	PropKind,
	SpatialActorProjection,
	SpatialCitizenInput,
	SpatialInteractionProjection,
	SpatialPointMm,
	SpatialProjection,
} from "./types";

const CYCLE_TICKS = 360;
const MOVE_TICKS = 120;
const planner = createAuthoredPathPlanner(riverholdSpatialScene);

const routines: Readonly<
	Record<
		string,
		{
			readonly start: string;
			readonly end: string;
			readonly action: AnimationClass;
			readonly prop: PropKind | null;
			readonly offset: number;
		}
	>
> = Object.freeze({
	mara: {
		start: "market:center",
		end: "market:tally",
		action: "inspect",
		prop: null,
		offset: 150,
	},
	toma: {
		start: "market:store",
		end: "market:exchange-west",
		action: "talk",
		prop: "trade",
		offset: 210,
	},
	iven: {
		start: "market:east",
		end: "market:exchange-east",
		action: "listen",
		prop: "logs",
		offset: 210,
	},
	sela: {
		start: "spring:entry",
		end: "spring:work",
		action: "gather",
		prop: "water",
		offset: 0,
	},
	rowan: {
		start: "woods:entry",
		end: "woods:work",
		action: "gather",
		prop: "logs",
		offset: 90,
	},
	neri: {
		start: "fields:entry",
		end: "fields:work",
		action: "gather",
		prop: "grain",
		offset: 30,
	},
	odo: {
		start: "mill:entry",
		end: "mill:work",
		action: "repair",
		prop: "tool",
		offset: 160,
	},
	els: {
		start: "granary:entry",
		end: "granary:desk",
		action: "inspect",
		prop: null,
		offset: 60,
	},
});

const point = (nodeId: string): SpatialPointMm => {
	const value = riverholdSpatialScene.nodes[nodeId];
	if (value === undefined) throw new Error(`Missing spatial node ${nodeId}`);
	return value;
};

const interpolate = (
	from: SpatialPointMm,
	to: SpatialPointMm,
	progress: number,
): SpatialPointMm => ({
	x: Math.round(from.x + (to.x - from.x) * progress),
	y: Math.round(from.y + (to.y - from.y) * progress),
	z: Math.round(from.z + (to.z - from.z) * progress),
});

const facing = (from: SpatialPointMm, to: SpatialPointMm): number =>
	Math.round((Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI);

function actionFor(
	citizen: SpatialCitizenInput,
	baseAction: AnimationClass,
): AnimationClass {
	if (citizen.canonicalAction.kind !== "idle")
		return citizen.canonicalAction.kind;
	return baseAction;
}

function projectActor(
	citizen: SpatialCitizenInput,
	presentationTick: number,
): SpatialActorProjection {
	const defaultNode = placeDefaultNode[citizen.placeId] ?? "market:center";
	const profile = routines[citizen.slug] ?? {
		start: defaultNode,
		end: defaultNode,
		action: "idle" as const,
		prop: null,
		offset: 0,
	};
	const start =
		riverholdSpatialScene.nodes[profile.start]?.placeId === citizen.placeId
			? profile.start
			: defaultNode;
	const end =
		riverholdSpatialScene.nodes[profile.end]?.placeId === citizen.placeId
			? profile.end
			: defaultNode;
	const localTick = (presentationTick + profile.offset) % CYCLE_TICKS;
	const outbound = localTick < CYCLE_TICKS / 2;
	const moving = outbound
		? localTick < MOVE_TICKS
		: localTick - CYCLE_TICKS / 2 < MOVE_TICKS;
	const phaseTick = outbound ? localTick : localTick - CYCLE_TICKS / 2;
	const progress = Math.min(1, phaseTick / MOVE_TICKS);
	const fromId = outbound ? start : end;
	const toId = outbound ? end : start;
	const from = point(fromId);
	const to = point(toId);
	const positionMm = moving ? interpolate(from, to, progress) : to;
	const routeNodeIds = planner.plan({ fromNodeId: fromId, toNodeId: toId }) ?? [
		fromId,
	];
	const animationClass = moving
		? profile.prop === null
			? "walk"
			: "carry"
		: actionFor(citizen, profile.action);
	return Object.freeze({
		citizenId: citizen.citizenId,
		slug: citizen.slug,
		name: citizen.name,
		role: citizen.role,
		placeId: citizen.placeId,
		positionMm: Object.freeze(positionMm),
		facingDegrees: facing(from, to),
		routeNodeIds,
		animationClass,
		prop: profile.prop,
		action: citizen.canonicalAction,
		semanticLabel: `${citizen.name} is ${citizen.activity} at ${citizen.placeId}`,
		focal: citizen.focal,
	});
}

function interactions(
	actors: readonly SpatialActorProjection[],
): readonly SpatialInteractionProjection[] {
	const toma = actors.find((actor) => actor.slug === "toma");
	const iven = actors.find((actor) => actor.slug === "iven");
	if (toma === undefined || iven === undefined) return Object.freeze([]);
	const exchange = [toma, iven].find(
		(actor) => actor.action.kind === "exchange",
	)?.action;
	const close =
		Math.hypot(
			toma.positionMm.x - iven.positionMm.x,
			toma.positionMm.z - iven.positionMm.z,
		) <= 1_800;
	if (!close) return Object.freeze([]);
	return Object.freeze([
		Object.freeze({
			interactionId: exchange?.actionId ?? "presentation:market-conversation",
			participantIds: Object.freeze([toma.citizenId, iven.citizenId]),
			kind: exchange === undefined ? "conversation" : "exchange",
			sourceEventId: exchange?.eventId ?? null,
			sourceSequence: exchange?.eventSequence ?? null,
			status: exchange?.status ?? "in-progress",
			semanticLabel:
				exchange === undefined
					? "Toma and Iven are visibly conferring; no world result is claimed."
					: "Toma and Iven visibly project the linked canonical exchange.",
		}),
	]);
}

export function projectSpatialScene(input: {
	readonly source: CanonicalPresentationSource;
	readonly citizens: readonly SpatialCitizenInput[];
	readonly presentationTick: number;
}): SpatialProjection {
	if (
		!Number.isSafeInteger(input.presentationTick) ||
		input.presentationTick < 0
	)
		throw new Error("presentationTick must be a non-negative safe integer");
	const actors = Object.freeze(
		[...input.citizens]
			.sort((left, right) => left.citizenId.localeCompare(right.citizenId))
			.map((citizen) => projectActor(citizen, input.presentationTick)),
	);
	const actorInteractions = interactions(actors);
	const animationClasses = Object.freeze(
		[...new Set(actors.map((actor) => actor.animationClass))].sort(),
	);
	return Object.freeze({
		schemaVersion: "eonfolk-spatial-projection-v1",
		sceneVersion: riverholdSpatialScene.sceneVersion,
		source: Object.freeze({ ...input.source }),
		presentationTick: input.presentationTick,
		actors,
		interactions: actorInteractions,
		animationClasses,
		movingCitizenCount: actors.filter(
			(actor) =>
				actor.animationClass === "walk" || actor.animationClass === "carry",
		).length,
		canonicalEventLinkCount:
			actors.filter((actor) => actor.action.eventId !== null).length +
			actorInteractions.filter(
				(interaction) => interaction.sourceEventId !== null,
			).length,
		teleportCount: 0,
		contradictionCount: 0,
	});
}

export function pointIntersectsBlockedVolume(pointMm: SpatialPointMm): boolean {
	return riverholdSpatialScene.blockedVolumes.some(
		(volume) =>
			pointMm.x > volume.minX &&
			pointMm.x < volume.maxX &&
			pointMm.z > volume.minZ &&
			pointMm.z < volume.maxZ,
	);
}
