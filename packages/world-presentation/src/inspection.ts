import { pointIntersectsBlockedVolume } from "./projector";
import { riverholdSpatialScene } from "./scene";
import type {
	AnimationClass,
	SpatialActorProjection,
	SpatialProjection,
} from "./types";

export type SpatialMismatchCode =
	| "action-animation-contradiction"
	| "blocked-volume"
	| "event-beyond-source-head"
	| "invalid-event-link"
	| "invalid-interaction-link"
	| "missing-participant"
	| "teleport";

export interface SpatialMismatch {
	readonly code: SpatialMismatchCode;
	readonly actorId: string | null;
	readonly actionKind: AnimationClass | null;
	readonly displayedAnimation: AnimationClass | null;
	readonly distanceMm: number | null;
}

export interface SpatialInspection {
	readonly mismatches: readonly SpatialMismatch[];
	readonly teleportCount: number;
	readonly contradictionCount: number;
}

const locomotion = new Set<AnimationClass>(["walk", "carry"]);

function completedLocomotion(actor: SpatialActorProjection): boolean {
	if (!locomotion.has(actor.action.kind) || actor.animationClass !== "idle")
		return false;
	const destinationNodeId = actor.routeNodeIds.at(-1);
	if (destinationNodeId === undefined) return false;
	const destination = currentSceneNode(destinationNodeId);
	return (
		destination !== null &&
		actor.positionMm.x === destination.x &&
		actor.positionMm.y === destination.y &&
		actor.positionMm.z === destination.z
	);
}

function currentSceneNode(nodeId: string) {
	return riverholdSpatialScene.nodes[nodeId] ?? null;
}

function actorById(
	projection: SpatialProjection,
): ReadonlyMap<string, SpatialActorProjection> {
	return new Map(projection.actors.map((actor) => [actor.citizenId, actor]));
}

export function inspectSpatialProjection(
	current: SpatialProjection,
	previous: SpatialProjection | null = null,
): SpatialInspection {
	const mismatches: SpatialMismatch[] = [];
	const currentActors = actorById(current);
	for (const actor of current.actors) {
		if (pointIntersectsBlockedVolume(actor.positionMm))
			mismatches.push({
				code: "blocked-volume",
				actorId: actor.citizenId,
				actionKind: actor.action.kind,
				displayedAnimation: actor.animationClass,
				distanceMm: null,
			});
		const invalidEventLink =
			(actor.action.sourceKind === "world-event" &&
				(actor.action.eventId === null ||
					actor.action.eventSequence === null)) ||
			(actor.action.sourceKind === "current-behavior" &&
				(actor.action.eventId !== null || actor.action.eventSequence !== null));
		if (invalidEventLink)
			mismatches.push({
				code: "invalid-event-link",
				actorId: actor.citizenId,
				actionKind: actor.action.kind,
				displayedAnimation: actor.animationClass,
				distanceMm: null,
			});
		if (
			actor.action.eventSequence !== null &&
			actor.action.eventSequence > current.source.throughSequence
		)
			mismatches.push({
				code: "event-beyond-source-head",
				actorId: actor.citizenId,
				actionKind: actor.action.kind,
				displayedAnimation: actor.animationClass,
				distanceMm: null,
			});
		if (
			actor.action.kind !== "idle" &&
			actor.animationClass !== actor.action.kind &&
			!locomotion.has(actor.animationClass) &&
			!completedLocomotion(actor)
		)
			mismatches.push({
				code: "action-animation-contradiction",
				actorId: actor.citizenId,
				actionKind: actor.action.kind,
				displayedAnimation: actor.animationClass,
				distanceMm: null,
			});
	}
	for (const interaction of current.interactions) {
		if (
			interaction.status === "committed" &&
			(interaction.sourceEventId === null ||
				interaction.sourceSequence === null)
		)
			mismatches.push({
				code: "invalid-interaction-link",
				actorId: null,
				actionKind: null,
				displayedAnimation: null,
				distanceMm: null,
			});
		if (
			interaction.participantIds.some(
				(participantId) => !currentActors.has(participantId),
			)
		)
			mismatches.push({
				code: "missing-participant",
				actorId: null,
				actionKind: null,
				displayedAnimation: null,
				distanceMm: null,
			});
	}
	if (
		previous !== null &&
		previous.sceneVersion === current.sceneVersion &&
		previous.source.stateHash === current.source.stateHash &&
		current.presentationTick > previous.presentationTick
	) {
		const previousActors = actorById(previous);
		const elapsedTicks = current.presentationTick - previous.presentationTick;
		const maximumDistanceMm = Math.ceil((elapsedTicks / 30) * 1_000) + 50;
		for (const actor of current.actors) {
			const prior = previousActors.get(actor.citizenId);
			if (prior === undefined) continue;
			const distanceMm = Math.round(
				Math.hypot(
					actor.positionMm.x - prior.positionMm.x,
					actor.positionMm.z - prior.positionMm.z,
				),
			);
			if (distanceMm > maximumDistanceMm)
				mismatches.push({
					code: "teleport",
					actorId: actor.citizenId,
					actionKind: actor.action.kind,
					displayedAnimation: actor.animationClass,
					distanceMm,
				});
		}
	}
	return Object.freeze({
		mismatches: Object.freeze(mismatches.map((entry) => Object.freeze(entry))),
		teleportCount: mismatches.filter((entry) => entry.code === "teleport")
			.length,
		contradictionCount: mismatches.filter((entry) => entry.code !== "teleport")
			.length,
	});
}
