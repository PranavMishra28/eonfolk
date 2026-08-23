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
	readonly panOffsetMm: Readonly<{ readonly x: number; readonly z: number }>;
}

export type GeneratedNavigationAction =
	| Readonly<{ readonly type: "overview" }>
	| Readonly<{ readonly type: "select-citizen"; readonly citizenId: string }>
	| Readonly<{ readonly type: "select-project"; readonly projectId: string }>
	| Readonly<{ readonly type: "toggle-follow" }>
	| Readonly<{ readonly type: "zoom"; readonly deltaMm: number }>
	| Readonly<{
			readonly type: "pan";
			readonly xDeltaMm: number;
			readonly zDeltaMm: number;
	  }>
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

export type GeneratedSemanticScale = "region" | "town" | "citizen";
export type GeneratedFidelityClass = "LOD0" | "LOD1" | "LOD2" | "LOD3";

export interface GeneratedCameraFidelity {
	readonly semanticScale: GeneratedSemanticScale;
	readonly fidelityClass: GeneratedFidelityClass;
}

export const GENERATED_NAVIGATION_EVENT = "eonfolk:generated-navigation";

/** Fail-closed boundary for canvas-originated DOM navigation intents. */
export function parseGeneratedNavigationAction(
	value: unknown,
): GeneratedNavigationAction | null {
	if (typeof value !== "object" || value === null) return null;
	const candidate = value as Readonly<Record<string, unknown>>;
	const keyCount = Object.keys(candidate).length;
	switch (candidate.type) {
		case "overview":
		case "toggle-follow":
			return keyCount === 1 ? Object.freeze({ type: candidate.type }) : null;
		case "select-citizen":
			return keyCount === 2 &&
				typeof candidate.citizenId === "string" &&
				candidate.citizenId.length > 0
				? Object.freeze({
						type: "select-citizen",
						citizenId: candidate.citizenId,
					})
				: null;
		case "select-project":
			return keyCount === 2 &&
				typeof candidate.projectId === "string" &&
				candidate.projectId.length > 0
				? Object.freeze({
						type: "select-project",
						projectId: candidate.projectId,
					})
				: null;
		case "zoom":
			return keyCount === 2 &&
				typeof candidate.deltaMm === "number" &&
				Number.isFinite(candidate.deltaMm)
				? Object.freeze({ type: "zoom", deltaMm: candidate.deltaMm })
				: null;
		case "pan":
			return keyCount === 3 &&
				typeof candidate.xDeltaMm === "number" &&
				typeof candidate.zDeltaMm === "number" &&
				Number.isFinite(candidate.xDeltaMm) &&
				Number.isFinite(candidate.zDeltaMm)
				? Object.freeze({
						type: "pan",
						xDeltaMm: candidate.xDeltaMm,
						zDeltaMm: candidate.zDeltaMm,
					})
				: null;
		case "orbit":
			return keyCount === 3 &&
				typeof candidate.yawDeltaDegrees === "number" &&
				typeof candidate.pitchDeltaDegrees === "number" &&
				Number.isFinite(candidate.yawDeltaDegrees) &&
				Number.isFinite(candidate.pitchDeltaDegrees)
				? Object.freeze({
						type: "orbit",
						yawDeltaDegrees: candidate.yawDeltaDegrees,
						pitchDeltaDegrees: candidate.pitchDeltaDegrees,
					})
				: null;
		default:
			return null;
	}
}

/** Referential admission after the exact DOM envelope has parsed. */
export function generatedNavigationReferencesExist(
	action: GeneratedNavigationAction,
	model: GeneratedEmbodimentProjection,
): boolean {
	if (action.type === "select-citizen")
		return model.actors.some(({ citizenId }) => citizenId === action.citizenId);
	if (action.type === "select-project")
		return model.projects.some(
			({ projectId }) => projectId === action.projectId,
		);
	return true;
}

const MIN_CAMERA_DISTANCE_MM = 8_000;
const MAX_CAMERA_DISTANCE_MM = 180_000;
const MAX_CAMERA_PAN_MM = 120_000;
const CAMERA_BLEND_BASIS_POINTS = 2_600;

export const INITIAL_GENERATED_NAVIGATION: GeneratedNavigationState =
	Object.freeze({
		focus: Object.freeze({ kind: "overview" }),
		followCitizen: false,
		distanceMm: 72_000,
		yawDegrees: 42,
		pitchDegrees: -38,
		panOffsetMm: Object.freeze({ x: 0, z: 0 }),
	});

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}

function finite(value: number, label: string): number {
	if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
	return value;
}

function assertNavigationState(state: GeneratedNavigationState): void {
	finite(state.distanceMm, "distance");
	finite(state.yawDegrees, "yaw");
	finite(state.pitchDegrees, "pitch");
	finite(state.panOffsetMm.x, "pan x");
	finite(state.panOffsetMm.z, "pan z");
	if (
		state.distanceMm < MIN_CAMERA_DISTANCE_MM ||
		state.distanceMm > MAX_CAMERA_DISTANCE_MM ||
		state.pitchDegrees < -75 ||
		state.pitchDegrees > -18
	)
		throw new Error("Camera bounds exceeded");
	if (
		(state.focus.kind === "citizen" && state.focus.citizenId.length === 0) ||
		(state.focus.kind === "project" && state.focus.projectId.length === 0)
	)
		throw new Error("Focus missing");
}

/** Distance alone determines semantic scale and renderer fidelity. */
export function generatedCameraFidelity(
	distanceMm: number,
): GeneratedCameraFidelity {
	const distance = finite(distanceMm, "fidelity distance");
	if (distance < MIN_CAMERA_DISTANCE_MM)
		throw new Error("Fidelity distance too near");
	if (distance <= 18_000)
		return Object.freeze({ semanticScale: "citizen", fidelityClass: "LOD0" });
	if (distance <= 34_000)
		return Object.freeze({ semanticScale: "citizen", fidelityClass: "LOD1" });
	if (distance <= 100_000)
		return Object.freeze({ semanticScale: "town", fidelityClass: "LOD2" });
	return Object.freeze({ semanticScale: "region", fidelityClass: "LOD3" });
}

/** Shared reducer for pointer controls, keyboard controls and semantic DOM UI. */
export function reduceGeneratedNavigation(
	state: GeneratedNavigationState,
	action: GeneratedNavigationAction,
): GeneratedNavigationState {
	assertNavigationState(state);
	switch (action.type) {
		case "overview":
			return Object.freeze({
				...state,
				focus: Object.freeze({ kind: "overview" }),
				followCitizen: false,
				panOffsetMm: Object.freeze({ x: 0, z: 0 }),
			});
		case "select-citizen":
			if (action.citizenId.length === 0) throw new Error("Citizen missing");
			return Object.freeze({
				...state,
				focus: Object.freeze({
					kind: "citizen",
					citizenId: action.citizenId,
				}),
				followCitizen: false,
				distanceMm: Math.min(state.distanceMm, 24_000),
				panOffsetMm: Object.freeze({ x: 0, z: 0 }),
			});
		case "select-project":
			if (action.projectId.length === 0) throw new Error("Project missing");
			return Object.freeze({
				...state,
				focus: Object.freeze({
					kind: "project",
					projectId: action.projectId,
				}),
				followCitizen: false,
				distanceMm: Math.min(state.distanceMm, 34_000),
				panOffsetMm: Object.freeze({ x: 0, z: 0 }),
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
		case "pan":
			return Object.freeze({
				...state,
				followCitizen: false,
				panOffsetMm: Object.freeze({
					x: Math.round(
						clamp(
							state.panOffsetMm.x + finite(action.xDeltaMm, "pan x delta"),
							-MAX_CAMERA_PAN_MM,
							MAX_CAMERA_PAN_MM,
						),
					),
					z: Math.round(
						clamp(
							state.panOffsetMm.z + finite(action.zDeltaMm, "pan z delta"),
							-MAX_CAMERA_PAN_MM,
							MAX_CAMERA_PAN_MM,
						),
					),
				}),
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

function interpolateInteger(current: number, desired: number): number {
	const delta = desired - current;
	if (Math.abs(delta) <= 1) return desired;
	return current + Math.round((delta * CAMERA_BLEND_BASIS_POINTS) / 10_000);
}

function interpolateYaw(current: number, desired: number): number {
	const delta = ((desired - current + 540) % 360) - 180;
	const next = current + (Math.abs(delta) <= 0.05 ? delta : delta * 0.26);
	return ((next % 360) + 360) % 360;
}

/** Pure frame-step camera interpolation; reduced motion applies the target once. */
export function advanceGeneratedCameraIntent(
	current: GeneratedCameraIntent,
	desired: GeneratedCameraIntent,
	reducedMotion: boolean,
): GeneratedCameraIntent {
	for (const [label, value] of [
		["current distance", current.distanceMm],
		["desired distance", desired.distanceMm],
		["current target x", current.targetMm.x],
		["current target y", current.targetMm.y],
		["current target z", current.targetMm.z],
		["desired target x", desired.targetMm.x],
		["desired target y", desired.targetMm.y],
		["desired target z", desired.targetMm.z],
	] as const)
		finite(value, label);
	if (reducedMotion) return desired;
	return Object.freeze({
		...desired,
		targetMm: Object.freeze({
			x: interpolateInteger(current.targetMm.x, desired.targetMm.x),
			y: interpolateInteger(current.targetMm.y, desired.targetMm.y),
			z: interpolateInteger(current.targetMm.z, desired.targetMm.z),
		}),
		distanceMm: interpolateInteger(current.distanceMm, desired.distanceMm),
		yawDegrees: interpolateYaw(current.yawDegrees, desired.yawDegrees),
		pitchDegrees:
			Math.abs(desired.pitchDegrees - current.pitchDegrees) <= 0.05
				? desired.pitchDegrees
				: current.pitchDegrees +
					(desired.pitchDegrees - current.pitchDegrees) * 0.26,
	});
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
	assertNavigationState(state);
	let targetMm = overviewCenter(model);
	let semanticLabel = `${model.settlementName} overview`;
	let followCitizenId: string | null = null;
	if (state.focus.kind === "citizen") {
		const citizenId = state.focus.citizenId;
		const actor = model.actors.find(
			(candidate) => candidate.citizenId === citizenId,
		);
		if (actor === undefined) throw new Error("Citizen not visible");
		targetMm = actor.positionMm;
		followCitizenId = state.followCitizen ? actor.citizenId : null;
		semanticLabel = `${state.followCitizen ? "Following" : "Viewing"} ${actor.name}: ${actor.semanticLabel}`;
	} else if (state.focus.kind === "project") {
		const projectId = state.focus.projectId;
		const project = model.projects.find(
			(candidate) => candidate.projectId === projectId,
		);
		if (project === undefined) throw new Error("Project not visible");
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
	targetMm = Object.freeze({
		x: targetMm.x + state.panOffsetMm.x,
		y: targetMm.y,
		z: targetMm.z + state.panOffsetMm.z,
	});
	return Object.freeze({
		targetMm,
		distanceMm: state.distanceMm,
		yawDegrees: state.yawDegrees,
		pitchDegrees: state.pitchDegrees,
		followCitizenId,
		semanticLabel,
	});
}
