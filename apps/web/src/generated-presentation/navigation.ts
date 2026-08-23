import type { SpatialPointMm } from "@eonfolk/world-presentation";

import type { GeneratedEmbodimentProjection } from "./embodiment";

export type GeneratedFocus =
	| Readonly<{ readonly kind: "overview" }>
	| Readonly<{ readonly kind: "citizen"; readonly citizenId: string }>
	| Readonly<{ readonly kind: "project"; readonly projectId: string }>;

export interface GeneratedNavigationState {
	readonly focus: GeneratedFocus;
	readonly followCitizen: boolean;
	readonly distanceMm: number;
	readonly yawDegrees: number;
	readonly pitchDegrees: number;
}

export type GeneratedNavigationAction =
	| Readonly<{ readonly type: "overview" }>
	| Readonly<{ readonly type: "select-citizen"; readonly citizenId: string }>
	| Readonly<{ readonly type: "select-project"; readonly projectId: string }>
	| Readonly<{ readonly type: "toggle-follow" }>
	| Readonly<{ readonly type: "zoom"; readonly deltaMm: number }>
	| Readonly<{
			readonly type: "orbit";
			readonly yawDeltaDegrees: number;
			readonly pitchDeltaDegrees: number;
	  }>;

export interface GeneratedCameraIntent {
	readonly targetMm: SpatialPointMm;
	readonly distanceMm: number;
	readonly yawDegrees: number;
	readonly pitchDegrees: number;
	readonly followCitizenId: string | null;
	readonly semanticLabel: string;
}

const MIN_CAMERA_DISTANCE_MM = 8_000;
const MAX_CAMERA_DISTANCE_MM = 180_000;

export const INITIAL_GENERATED_NAVIGATION: GeneratedNavigationState =
	Object.freeze({
		focus: Object.freeze({ kind: "overview" }),
		followCitizen: false,
		distanceMm: 72_000,
		yawDegrees: 42,
		pitchDegrees: -38,
	});

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}

function finite(value: number, label: string): number {
	if (!Number.isFinite(value))
		throw new Error(`generated navigation: ${label} must be finite`);
	return value;
}

/** Shared reducer for pointer controls, keyboard controls and semantic DOM UI. */
export function reduceGeneratedNavigation(
	state: GeneratedNavigationState,
	action: GeneratedNavigationAction,
): GeneratedNavigationState {
	switch (action.type) {
		case "overview":
			return Object.freeze({
				...state,
				focus: Object.freeze({ kind: "overview" }),
				followCitizen: false,
			});
		case "select-citizen":
			if (action.citizenId.length === 0)
				throw new Error("generated navigation: citizen identity is empty");
			return Object.freeze({
				...state,
				focus: Object.freeze({
					kind: "citizen",
					citizenId: action.citizenId,
				}),
				followCitizen: false,
				distanceMm: Math.min(state.distanceMm, 24_000),
			});
		case "select-project":
			if (action.projectId.length === 0)
				throw new Error("generated navigation: project identity is empty");
			return Object.freeze({
				...state,
				focus: Object.freeze({
					kind: "project",
					projectId: action.projectId,
				}),
				followCitizen: false,
				distanceMm: Math.min(state.distanceMm, 34_000),
			});
		case "toggle-follow":
			if (state.focus.kind !== "citizen") return state;
			return Object.freeze({
				...state,
				followCitizen: !state.followCitizen,
			});
		case "zoom":
			return Object.freeze({
				...state,
				distanceMm: Math.round(
					clamp(
						state.distanceMm + finite(action.deltaMm, "zoom delta"),
						MIN_CAMERA_DISTANCE_MM,
						MAX_CAMERA_DISTANCE_MM,
					),
				),
			});
		case "orbit": {
			const yaw =
				state.yawDegrees + finite(action.yawDeltaDegrees, "yaw delta");
			const yawRemainder = yaw % 360;
			return Object.freeze({
				...state,
				yawDegrees: yawRemainder < 0 ? yawRemainder + 360 : yawRemainder,
				pitchDegrees: clamp(
					state.pitchDegrees + finite(action.pitchDeltaDegrees, "pitch delta"),
					-75,
					-18,
				),
			});
		}
	}
}

function overviewCenter(model: GeneratedEmbodimentProjection): SpatialPointMm {
	if (model.actors.length === 0) return Object.freeze({ x: 0, y: 0, z: 0 });
	return Object.freeze({
		x: Math.round(
			model.actors.reduce((total, actor) => total + actor.positionMm.x, 0) /
				model.actors.length,
		),
		y: Math.round(
			model.actors.reduce((total, actor) => total + actor.positionMm.y, 0) /
				model.actors.length,
		),
		z: Math.round(
			model.actors.reduce((total, actor) => total + actor.positionMm.z, 0) /
				model.actors.length,
		),
	});
}

export function cameraIntentForGeneratedNavigation(
	model: GeneratedEmbodimentProjection,
	state: GeneratedNavigationState,
): GeneratedCameraIntent {
	let targetMm = overviewCenter(model);
	let semanticLabel = `${model.settlementName} overview`;
	let followCitizenId: string | null = null;
	if (state.focus.kind === "citizen") {
		const citizenId = state.focus.citizenId;
		const actor = model.actors.find(
			(candidate) => candidate.citizenId === citizenId,
		);
		if (actor === undefined)
			throw new Error("generated navigation: selected citizen is not visible");
		targetMm = actor.positionMm;
		followCitizenId = state.followCitizen ? actor.citizenId : null;
		semanticLabel = `${state.followCitizen ? "Following" : "Viewing"} ${actor.name}: ${actor.semanticLabel}`;
	} else if (state.focus.kind === "project") {
		const projectId = state.focus.projectId;
		const project = model.projects.find(
			(candidate) => candidate.projectId === projectId,
		);
		if (project === undefined)
			throw new Error("generated navigation: selected project is not visible");
		const participants = model.actors.filter(
			(actor) =>
				actor.interactionTarget === project.projectId ||
				actor.placeId === project.siteId,
		);
		if (participants.length > 0) {
			targetMm = Object.freeze({
				x: Math.round(
					participants.reduce((total, actor) => total + actor.positionMm.x, 0) /
						participants.length,
				),
				y: Math.round(
					participants.reduce((total, actor) => total + actor.positionMm.y, 0) /
						participants.length,
				),
				z: Math.round(
					participants.reduce((total, actor) => total + actor.positionMm.z, 0) /
						participants.length,
				),
			});
		}
		semanticLabel = `Viewing ${project.semanticLabel}`;
	}
	return Object.freeze({
		targetMm,
		distanceMm: state.distanceMm,
		yawDegrees: state.yawDegrees,
		pitchDegrees: state.pitchDegrees,
		followCitizenId,
		semanticLabel,
	});
}
