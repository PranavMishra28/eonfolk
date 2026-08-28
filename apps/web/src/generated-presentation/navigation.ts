import type {
	GeneratedCivilizationSpatialProjection,
	SpatialPointMm,
} from "@eonfolk/world-presentation";

import type { GeneratedEmbodimentProjection } from "./embodiment";

export type GeneratedFocus =
	| Readonly<{ readonly kind: "overview" }>
	| Readonly<{ readonly kind: "citizen"; readonly citizenId: string }>
	| Readonly<{ readonly kind: "building"; readonly buildingId: string }>
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
	| Readonly<{ readonly type: "select-building"; readonly buildingId: string }>
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
		case "select-building":
			return keyCount === 2 &&
				typeof candidate.buildingId === "string" &&
				candidate.buildingId.length > 0
				? Object.freeze({
						type: "select-building",
						buildingId: candidate.buildingId,
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
	projection: GeneratedCivilizationSpatialProjection,
): boolean {
	if (action.type === "select-citizen")
		return model.actors.some(({ citizenId }) => citizenId === action.citizenId);
	if (action.type === "select-building")
		return projection.local.buildings.some(
			({ buildingId }) => buildingId === action.buildingId,
		);
	if (action.type === "select-project")
		return model.projects.some(
			({ projectId }) => projectId === action.projectId,
		);
	return true;
}

export const FOLLOW_CAMERA_DISTANCE_MM = 6_200;
const MIN_CAMERA_DISTANCE_MM = 4_500;
const MAX_CAMERA_DISTANCE_MM = 180_000;
const MAX_CAMERA_PAN_MM = 150_000;
const CAMERA_BLEND_BASIS_POINTS = 2_600;
/** Shallow enough that Follow is a person, not a ground/wall fill. */
export const FOLLOW_CAMERA_PITCH_DEGREES = -12;
export const FOLLOW_LOOK_HEIGHT_MM = 1_520;
export const FOLLOW_SHOULDER_OFFSET_MM = 480;
/** Three-quarter from behind so Follow sees the person, not a wall fill. */
export const FOLLOW_CAMERA_YAW_OFFSET_DEGREES = 154;
const MIN_CAMERA_PITCH_DEGREES = -75;
const MAX_CAMERA_PITCH_DEGREES = -8;

export interface AxisAlignedVolumeMm {
	readonly minX: number;
	readonly maxX: number;
	readonly minY: number;
	readonly maxY: number;
	readonly minZ: number;
	readonly maxZ: number;
}

export interface FollowCameraFraming {
	readonly targetMm: SpatialPointMm;
	readonly yawDegrees: number;
	readonly pitchDegrees: number;
	readonly distanceMm: number;
}

export function cameraEyeMm(
	targetMm: SpatialPointMm,
	yawDegrees: number,
	pitchDegrees: number,
	distanceMm: number,
): SpatialPointMm {
	const yaw = (yawDegrees * Math.PI) / 180;
	const pitch = (pitchDegrees * Math.PI) / 180;
	const horizontal = Math.cos(pitch) * distanceMm;
	return Object.freeze({
		x: targetMm.x + Math.sin(yaw) * horizontal,
		y: targetMm.y - Math.sin(pitch) * distanceMm,
		z: targetMm.z + Math.cos(yaw) * horizontal,
	});
}

function volumeContains(
	volume: AxisAlignedVolumeMm,
	point: SpatialPointMm,
): boolean {
	return (
		point.x >= volume.minX &&
		point.x <= volume.maxX &&
		point.y >= volume.minY &&
		point.y <= volume.maxY &&
		point.z >= volume.minZ &&
		point.z <= volume.maxZ
	);
}

/** Shoulder/height framing that backs out of walls so the followed body stays readable. */
export function resolveFollowCamera(
	sample: {
		readonly positionMm: SpatialPointMm;
		readonly facingDegrees: number;
	},
	volumes: readonly AxisAlignedVolumeMm[] = [],
	lookHeightMm = FOLLOW_LOOK_HEIGHT_MM,
): FollowCameraFraming {
	const facing = (sample.facingDegrees * Math.PI) / 180;
	const targetMm = Object.freeze({
		x: Math.round(
			sample.positionMm.x + Math.cos(facing) * FOLLOW_SHOULDER_OFFSET_MM,
		),
		y: sample.positionMm.y + lookHeightMm,
		z: Math.round(
			sample.positionMm.z - Math.sin(facing) * FOLLOW_SHOULDER_OFFSET_MM,
		),
	});
	let pitchDegrees = FOLLOW_CAMERA_PITCH_DEGREES;
	let distanceMm = FOLLOW_CAMERA_DISTANCE_MM;
	const yawDegrees = sample.facingDegrees + FOLLOW_CAMERA_YAW_OFFSET_DEGREES;
	for (let step = 0; step < 8; step += 1) {
		const eye = cameraEyeMm(targetMm, yawDegrees, pitchDegrees, distanceMm);
		if (!volumes.some((volume) => volumeContains(volume, eye))) break;
		distanceMm = Math.min(MAX_CAMERA_DISTANCE_MM, distanceMm + 1_200);
		pitchDegrees = Math.max(MIN_CAMERA_PITCH_DEGREES, pitchDegrees - 2);
	}
	return Object.freeze({
		targetMm,
		yawDegrees,
		pitchDegrees,
		distanceMm,
	});
}

export const INITIAL_GENERATED_NAVIGATION: GeneratedNavigationState =
	Object.freeze({
		focus: Object.freeze({ kind: "overview" }),
		followCitizen: false,
		distanceMm: 32_000,
		yawDegrees: 28,
		pitchDegrees: -32,
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
		state.pitchDegrees < MIN_CAMERA_PITCH_DEGREES ||
		state.pitchDegrees > MAX_CAMERA_PITCH_DEGREES
	)
		throw new Error("Camera bounds exceeded");
	if (
		(state.focus.kind === "citizen" && state.focus.citizenId.length === 0) ||
		(state.focus.kind === "building" && state.focus.buildingId.length === 0) ||
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
	if (distance <= 16_000)
		return Object.freeze({ semanticScale: "citizen", fidelityClass: "LOD0" });
	if (distance <= 28_000)
		return Object.freeze({ semanticScale: "citizen", fidelityClass: "LOD1" });
	if (distance <= 96_000)
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
				distanceMm: 32_000,
				yawDegrees: 28,
				pitchDegrees: -32,
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
				followCitizen: state.followCitizen,
				distanceMm: state.followCitizen
					? FOLLOW_CAMERA_DISTANCE_MM
					: Math.min(state.distanceMm, 9_000),
				pitchDegrees: state.followCitizen
					? FOLLOW_CAMERA_PITCH_DEGREES
					: state.pitchDegrees,
				panOffsetMm: Object.freeze({ x: 0, z: 0 }),
			});
		case "select-building":
			if (action.buildingId.length === 0) throw new Error("Building missing");
			return Object.freeze({
				...state,
				focus: Object.freeze({
					kind: "building",
					buildingId: action.buildingId,
				}),
				followCitizen: false,
				distanceMm: 24_000,
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
				distanceMm: 28_000,
				panOffsetMm: Object.freeze({ x: 0, z: 0 }),
			});
		case "toggle-follow":
			if (state.focus.kind !== "citizen") return state;
			return Object.freeze({
				...state,
				followCitizen: !state.followCitizen,
				distanceMm: state.followCitizen ? 12_000 : FOLLOW_CAMERA_DISTANCE_MM,
				pitchDegrees: state.followCitizen
					? state.pitchDegrees
					: FOLLOW_CAMERA_PITCH_DEGREES,
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
					MIN_CAMERA_PITCH_DEGREES,
					MAX_CAMERA_PITCH_DEGREES,
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

function interpolateYaw(
	current: number,
	desired: number,
	blend = 0.26,
): number {
	const delta = ((desired - current + 540) % 360) - 180;
	const next = current + (Math.abs(delta) <= 0.05 ? delta : delta * blend);
	return ((next % 360) + 360) % 360;
}

/** Pure frame-step camera interpolation; reduced motion applies the target once. */
export function advanceGeneratedCameraIntent(
	current: GeneratedCameraIntent,
	desired: GeneratedCameraIntent,
	reducedMotion: boolean,
	dtSeconds?: number,
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
	if (dtSeconds === undefined)
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
	const blend = 1 - 0.98 ** Math.max(0, dtSeconds * 60);
	const mix = (from: number, to: number) =>
		Math.abs(to - from) <= 1 ? to : from + (to - from) * blend;
	return Object.freeze({
		...desired,
		targetMm: Object.freeze({
			x: Math.round(mix(current.targetMm.x, desired.targetMm.x)),
			y: Math.round(mix(current.targetMm.y, desired.targetMm.y)),
			z: Math.round(mix(current.targetMm.z, desired.targetMm.z)),
		}),
		distanceMm: Math.round(mix(current.distanceMm, desired.distanceMm)),
		yawDegrees: interpolateYaw(current.yawDegrees, desired.yawDegrees, blend),
		pitchDegrees:
			Math.abs(desired.pitchDegrees - current.pitchDegrees) <= 0.05
				? desired.pitchDegrees
				: current.pitchDegrees +
					(desired.pitchDegrees - current.pitchDegrees) * blend,
	});
}

function overviewCenter(
	model: GeneratedEmbodimentProjection,
	projection: GeneratedCivilizationSpatialProjection,
): SpatialPointMm {
	if (model.actors.length > 0)
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
	if (projection.local.buildings.length > 0) {
		const buildings = projection.local.buildings;
		return Object.freeze({
			x: Math.round(
				buildings.reduce(
					(total, building) => total + building.position.xMillimeters,
					0,
				) / buildings.length,
			),
			y: Math.round(
				buildings.reduce(
					(total, building) => total + building.position.elevationMillimeters,
					0,
				) / buildings.length,
			),
			z: Math.round(
				buildings.reduce(
					(total, building) => total + building.position.yMillimeters,
					0,
				) / buildings.length,
			),
		});
	}
	const sites = projection.local.sites;
	if (sites.length === 0) return Object.freeze({ x: 0, y: 0, z: 0 });
	return Object.freeze({
		x: Math.round(
			sites.reduce(
				(total, site) =>
					total +
					(site.bounds.minimum.xMillimeters +
						site.bounds.maximum.xMillimeters) /
						2,
				0,
			) / sites.length,
		),
		y: Math.round(
			sites.reduce(
				(total, site) => total + site.bounds.minimum.elevationMillimeters,
				0,
			) / sites.length,
		),
		z: Math.round(
			sites.reduce(
				(total, site) =>
					total +
					(site.bounds.minimum.yMillimeters +
						site.bounds.maximum.yMillimeters) /
						2,
				0,
			) / sites.length,
		),
	});
}

export function cameraIntentForGeneratedNavigation(
	projection: GeneratedCivilizationSpatialProjection,
	model: GeneratedEmbodimentProjection,
	state: GeneratedNavigationState,
): GeneratedCameraIntent {
	assertNavigationState(state);
	let targetMm = overviewCenter(model, projection);
	let semanticLabel = `${model.settlementName} overview`;
	let followCitizenId: string | null = null;
	if (state.focus.kind === "citizen") {
		const citizenId = state.focus.citizenId;
		const actor = model.actors.find(
			(candidate) => candidate.citizenId === citizenId,
		);
		if (actor === undefined) {
			semanticLabel = "This person is no longer in this settlement";
		} else {
			targetMm = actor.positionMm;
			followCitizenId = state.followCitizen ? actor.citizenId : null;
			semanticLabel = `${state.followCitizen ? "Following" : "Viewing"} ${actor.name}: ${actor.semanticLabel}`;
		}
	} else if (state.focus.kind === "building") {
		const buildingId = state.focus.buildingId;
		const building = projection.local.buildings.find(
			(candidate) => candidate.buildingId === buildingId,
		);
		if (building === undefined) throw new Error("Building not visible");
		targetMm = Object.freeze({
			x: building.position.xMillimeters,
			y: building.position.elevationMillimeters,
			z: building.position.yMillimeters,
		});
		semanticLabel = `Viewing ${building.semanticLabel}`;
	} else if (state.focus.kind === "project") {
		const projectId = state.focus.projectId;
		const project = model.projects.find(
			(candidate) => candidate.projectId === projectId,
		);
		if (project === undefined) throw new Error("Project not visible");
		const site = projection.local.sites.find(
			(candidate) => candidate.siteId === project.siteId,
		);
		if (site === undefined) throw new Error("Project site not visible");
		targetMm = Object.freeze({
			x: Math.round(
				(site.bounds.minimum.xMillimeters + site.bounds.maximum.xMillimeters) /
					2,
			),
			y: site.bounds.minimum.elevationMillimeters,
			z: Math.round(
				(site.bounds.minimum.yMillimeters + site.bounds.maximum.yMillimeters) /
					2,
			),
		});
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
