import type {
	GeneratedCivilizationSpatialProjection,
	SpatialPointMm,
} from "@eonfolk/world-presentation";
import { Application, Entity } from "@playcanvas/react";
import { Camera, Light, Render } from "@playcanvas/react/components";
import { useApp, useAppEvent } from "@playcanvas/react/hooks";
import {
	Color,
	DEVICETYPE_WEBGL2,
	type Entity as PlayCanvasEntity,
	StandardMaterial,
	Vec3,
} from "playcanvas";
import {
	Component,
	type ErrorInfo,
	type ReactNode,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	GENERATED_FOLK_SOURCE_HEIGHT_UNITS,
	GeneratedFolkProxy,
} from "./components/generated/GeneratedFolkProxy";
import {
	type AxisAlignedVolumeMm,
	advanceGeneratedCameraIntent,
	cameraIntentForGeneratedNavigation,
	GENERATED_FOLK_ASSET,
	GENERATED_NAVIGATION_EVENT,
	GENERATED_TRAVEL_DURATION_TICKS,
	type GeneratedCameraIntent,
	type GeneratedEmbodiedActor,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	generatedCameraFidelity,
	generatedFollowViewportIsCompact,
	generatedTraversalPointAtTick,
	planGeneratedActorTransition,
	presentedActorCopy,
	resolveFollowCamera,
	sampleGeneratedActorPresentation,
} from "./generated-presentation";
import {
	authorityDayIntervalMs,
	PLAY_DAY_INTERVAL_MS,
	type PlayRate,
	visualDayProgress01,
} from "./play-clock";

function material(hex: string): StandardMaterial {
	const value = Number.parseInt(hex.slice(1), 16);
	const result = new StandardMaterial();
	result.diffuse = new Color(
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255,
	);
	result.metalness = 0;
	result.gloss = 0.22;
	result.opacity = 1;
	result.update();
	return result;
}

const palette = Object.freeze({
	ground: material("#718158"),
	soil: material("#7c6848"),
	path: material("#a8895d"),
	water: material("#5d9aaa"),
	wood: material("#755137"),
	bark: material("#5c402d"),
	leaf: material("#426249"),
	leafLight: material("#607a4f"),
	stone: material("#8c8c80"),
	civic: material("#d7bd86"),
	field: material("#b7a75f"),
	clay: material("#a96045"),
	changed: material("#d99a45"),
	social: material("#e7cc77"),
});

type PrimitiveKind = "box" | "cone" | "cylinder" | "plane" | "sphere";

function Primitive({
	type = "box",
	position,
	scale,
	rotation,
	color,
	castShadows = true,
}: {
	readonly type?: PrimitiveKind;
	readonly position: [number, number, number];
	readonly scale: [number, number, number];
	readonly rotation?: [number, number, number];
	readonly color: StandardMaterial;
	readonly castShadows?: boolean;
}) {
	return (
		<Entity position={position} scale={scale} rotation={rotation}>
			<Render
				type={type}
				material={color}
				castShadows={castShadows}
				receiveShadows
			/>
		</Entity>
	);
}

interface Frame {
	readonly centerX: number;
	readonly centerZ: number;
	readonly width: number;
	readonly depth: number;
}

const OVERVIEW_FRAME_DISTANCE_FACTOR = 0.22;

function sceneFrame(projection: GeneratedCivilizationSpatialProjection): Frame {
	const xs = projection.local.sites.flatMap((site) => [
		site.bounds.minimum.xMillimeters,
		site.bounds.maximum.xMillimeters,
	]);
	const zs = projection.local.sites.flatMap((site) => [
		site.bounds.minimum.yMillimeters,
		site.bounds.maximum.yMillimeters,
	]);
	for (const actor of projection.spatial.actors) {
		xs.push(actor.positionMm.x);
		zs.push(actor.positionMm.z);
	}
	for (const building of projection.local.buildings) {
		xs.push(building.position.xMillimeters);
		zs.push(building.position.yMillimeters);
	}
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	if (![minX, maxX, minZ, maxZ].every(Number.isFinite))
		throw new Error("Generated settlement has no finite visual bounds");
	const padding = 4;
	return Object.freeze({
		centerX: (minX + maxX) / 2_000,
		centerZ: (minZ + maxZ) / 2_000,
		width: Math.max(12, (maxX - minX) / 1_000 + padding),
		depth: Math.max(12, (maxZ - minZ) / 1_000 + padding),
	});
}

function localPoint(
	point: Readonly<{
		readonly x: number;
		readonly y: number;
		readonly z: number;
	}>,
	frame: Frame,
): [number, number, number] {
	return [
		point.x / 1_000 - frame.centerX,
		point.y / 1_000,
		point.z / 1_000 - frame.centerZ,
	];
}

function occupancySlotPoint(
	projection: GeneratedCivilizationSpatialProjection,
	actor: GeneratedEmbodiedActor,
): SpatialPointMm {
	const interaction = projection.spatial.interactions.find((candidate) =>
		candidate.participantIds.includes(actor.citizenId),
	);
	const canonicalActor = projection.spatial.actors.find(
		(candidate) => candidate.citizenId === actor.citizenId,
	);
	const slotId =
		actor.grounding.interactionSlotId ?? canonicalActor?.action.affordanceId;
	const participantIds = interaction?.participantIds ?? [actor.citizenId];
	const ordinal = participantIds.indexOf(actor.citizenId);
	const node =
		slotId === null || slotId === undefined
			? undefined
			: projection.scene.nodes[slotId];
	const coincidents = [...projection.spatial.actors]
		.filter(
			(candidate) =>
				candidate.positionMm.x === actor.positionMm.x &&
				candidate.positionMm.y === actor.positionMm.y &&
				candidate.positionMm.z === actor.positionMm.z,
		)
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId));
	const occupantIndex =
		coincidents.length > 1
			? coincidents.findIndex(
					(candidate) => candidate.citizenId === actor.citizenId,
				)
			: ordinal;
	const occupantCount =
		coincidents.length > 1 ? coincidents.length : participantIds.length;
	if (node === undefined || occupantIndex < 0) {
		if (coincidents.length <= 1) return actor.positionMm;
		const offset = (occupantIndex - (coincidents.length - 1) / 2) * 2_200;
		return {
			x: Math.round(actor.positionMm.x + offset),
			y: 0,
			z: Math.round(actor.positionMm.z + 2_800),
		};
	}
	const offset =
		(occupantIndex - (occupantCount - 1) / 2) *
		Math.max(2_200, node.occupantSpacingMm);
	const angle = (node.facingDegrees * Math.PI) / 180;
	const clearance = Math.max(3_600, node.occupantSpacingMm);
	return {
		x: Math.round(node.x + Math.cos(angle) * offset),
		y: 0,
		z: Math.round(node.z - Math.sin(angle) * offset - clearance),
	};
}

function presentedActorSample(
	projection: GeneratedCivilizationSpatialProjection,
	actor: GeneratedEmbodiedActor,
	previous: GeneratedEmbodiedActor | null,
	progress01: number,
	reducedMotion: boolean,
) {
	return sampleGeneratedActorPresentation({
		actor,
		previous,
		slotPointMm: occupancySlotPoint(projection, actor),
		progress01,
		reducedMotion,
	});
}

function followVolumes(
	projection: GeneratedCivilizationSpatialProjection,
): readonly AxisAlignedVolumeMm[] {
	return Object.freeze(
		projection.local.buildings.map((building) => {
			const site = projection.local.sites.find(
				(candidate) => candidate.siteId === building.siteId,
			);
			if (site === undefined)
				return Object.freeze({
					minX: building.position.xMillimeters - 1_800,
					maxX: building.position.xMillimeters + 1_800,
					minY: 0,
					maxY: 2_800,
					minZ: building.position.yMillimeters - 1_800,
					maxZ: building.position.yMillimeters + 1_800,
				});
			return Object.freeze({
				minX: site.bounds.minimum.xMillimeters,
				maxX: site.bounds.maximum.xMillimeters,
				minY: 0,
				maxY: 2_800,
				minZ: site.bounds.minimum.yMillimeters,
				maxZ: site.bounds.maximum.yMillimeters,
			});
		}),
	);
}

function followViewportCompact(host: HTMLElement | null): boolean {
	const width = host?.clientWidth ?? window.innerWidth;
	const height = host?.clientHeight ?? window.innerHeight;
	return generatedFollowViewportIsCompact(width, height);
}

function followFramingForActor(
	projection: GeneratedCivilizationSpatialProjection,
	actor: GeneratedEmbodiedActor,
	previous: GeneratedEmbodiedActor | null,
	progress01: number,
	reducedMotion: boolean,
	compact: boolean,
) {
	const bodyLookMm = Math.round(
		projection.scene.physicalScale.citizen.heightMm * 0.86,
	);
	return resolveFollowCamera(
		presentedActorSample(
			projection,
			actor,
			previous,
			progress01,
			reducedMotion,
		),
		followVolumes(projection),
		bodyLookMm,
		compact,
	);
}

function renderedActorPoint(
	projection: GeneratedCivilizationSpatialProjection,
	actor: GeneratedEmbodiedActor,
	presentationTick = 48,
	previous: GeneratedEmbodiedActor | null = null,
	progress01?: number,
	reducedMotion = false,
): SpatialPointMm {
	const progress =
		progress01 ??
		Math.min(
			1,
			presentationTick / Math.max(1, GENERATED_TRAVEL_DURATION_TICKS),
		);
	if (actor.grounding.kind === "route" && progress01 === undefined)
		return generatedTraversalPointAtTick(actor.grounding, presentationTick);
	return presentedActorSample(
		projection,
		actor,
		previous,
		progress,
		reducedMotion,
	).positionMm;
}

function WorldMotionClock({
	stateHash,
	playRate,
	reducedMotion,
	progressRef,
	originMs,
	held01,
}: {
	readonly stateHash: string;
	readonly playRate: PlayRate;
	readonly reducedMotion: boolean;
	readonly progressRef: { current: number };
	readonly originMs?: number;
	readonly held01?: number;
}) {
	const elapsedRef = useRef(0);
	const hashRef = useRef(stateHash);
	useAppEvent("update", (dt: number) => {
		const intervalMs = authorityDayIntervalMs(playRate) ?? PLAY_DAY_INTERVAL_MS;
		if (originMs !== undefined) {
			progressRef.current = visualDayProgress01({
				displayedAtMs: originMs,
				nowMs: performance.now(),
				intervalMs,
				playing: playRate !== 0,
				reducedMotion,
				held01: held01 ?? 0,
			});
			return;
		}
		if (hashRef.current !== stateHash) {
			hashRef.current = stateHash;
			elapsedRef.current = 0;
		}
		const daySeconds = intervalMs / 1_000;
		if (playRate !== 0 && !reducedMotion) elapsedRef.current += Math.max(0, dt);
		progressRef.current = reducedMotion
			? 0.55
			: Math.min(1, elapsedRef.current / Math.max(0.001, daySeconds));
	});
	return null;
}

function MovingCitizen({
	actor,
	previous,
	projection,
	frame,
	progressRef,
	presentationTick,
	reducedMotion,
	selected,
}: {
	readonly actor: GeneratedEmbodiedActor;
	readonly previous: GeneratedEmbodiedActor | null;
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly frame: Frame;
	readonly progressRef: { current: number };
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly selected: boolean;
}) {
	const entity = useRef<PlayCanvasEntity>(null);
	const scale = projection.scene.physicalScale;
	const actorScale =
		scale.citizen.heightMm / (GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000);
	useAppEvent("update", () => {
		const node = entity.current;
		if (node === null) return;
		const sample = presentedActorSample(
			projection,
			actor,
			previous,
			progressRef.current,
			reducedMotion,
		);
		const point = localPoint(sample.positionMm, frame);
		node.setPosition(point[0], point[1], point[2]);
	});
	const sample = presentedActorSample(
		projection,
		actor,
		previous,
		progressRef.current,
		reducedMotion,
	);
	const facingDegrees =
		actor.interactionTarget === null || sample.phase === "travel"
			? sample.facingDegrees
			: actor.facingDegrees;
	return (
		<Entity
			ref={entity}
			position={localPoint(sample.positionMm, frame)}
			scale={[actorScale, actorScale, actorScale]}
		>
			<GeneratedFolkProxy
				actor={{
					...actor,
					animationClass: sample.animationClass,
					pose: sample.pose,
					facingDegrees,
					positionMm: sample.positionMm,
				}}
				position={[0, 0, 0]}
				presentationTick={presentationTick}
				reducedMotion={reducedMotion}
				selected={selected}
			/>
		</Entity>
	);
}

function SceneProbe({
	host,
	onFailure,
	renderOnDemand,
	renderRevision,
}: {
	readonly host: RefObject<HTMLDivElement | null>;
	readonly onFailure: () => void;
	readonly renderOnDemand: boolean;
	readonly renderRevision: string;
}) {
	const app = useApp();
	const ready = useRef(false);
	useEffect(() => {
		app.autoRender = !renderOnDemand;
		app.renderNextFrame = true;
		return () => {
			app.autoRender = true;
			app.renderNextFrame = true;
		};
	}, [app, renderOnDemand]);
	useEffect(() => {
		if (renderOnDemand) app.renderNextFrame = true;
	}, [app, renderOnDemand, renderRevision]);
	useEffect(() => {
		app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);
		const resize = () => {
			if (host.current === null) return;
			app.resizeCanvas(host.current.clientWidth, host.current.clientHeight);
			app.renderNextFrame = true;
		};
		resize();
		const observer = new ResizeObserver(resize);
		if (host.current !== null) observer.observe(host.current);
		const canvas = app.graphicsDevice.canvas;
		const contextLost = (event: Event) => {
			event.preventDefault();
			onFailure();
		};
		canvas.addEventListener("webglcontextlost", contextLost);
		return () => {
			observer.disconnect();
			canvas.removeEventListener("webglcontextlost", contextLost);
		};
	}, [app, host, onFailure]);
	useAppEvent("postrender", () => {
		if (host.current === null) return;
		if (!ready.current) {
			ready.current = true;
			host.current.dataset.ready = "true";
			host.current.dataset.deviceType = app.graphicsDevice.deviceType;
		}
		const stats = (
			app as unknown as {
				stats?: {
					drawCalls?: { total?: number };
					frame?: { ms?: number };
				};
			}
		).stats;
		if (stats?.frame?.ms !== undefined)
			host.current.dataset.frameTimeMs = String(Math.round(stats.frame.ms));
		if (stats?.drawCalls?.total !== undefined)
			host.current.dataset.drawCalls = String(stats.drawCalls.total);
	});
	return null;
}

function GeneratedCamera({
	frame,
	projection,
	model,
	navigation,
	presentationTick,
	reducedMotion,
	host,
	progressRef,
	previousByCitizen,
}: {
	readonly frame: Frame;
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
	readonly progressRef: { current: number };
	readonly previousByCitizen: ReadonlyMap<string, GeneratedEmbodiedActor>;
}) {
	const camera = useRef<PlayCanvasEntity>(null);
	const pointer = useRef<{
		id: number;
		x: number;
		y: number;
		startX: number;
		startY: number;
	} | null>(null);
	const navigationRef = useRef(navigation);
	navigationRef.current = navigation;
	const presentationTickRef = useRef(presentationTick);
	presentationTickRef.current = presentationTick;
	const requested = useMemo(
		() => cameraIntentForGeneratedNavigation(projection, model, navigation),
		[model, navigation, projection],
	);
	const desired = useMemo<GeneratedCameraIntent>(() => {
		const focus = navigation.focus;
		const compact = followViewportCompact(host.current);
		const actor =
			focus.kind === "citizen"
				? model.actors.find(({ citizenId }) => citizenId === focus.citizenId)
				: undefined;
		const actorPoint =
			actor === undefined
				? undefined
				: renderedActorPoint(
						projection,
						actor,
						presentationTick,
						previousByCitizen.get(actor.citizenId) ?? null,
						progressRef.current,
						reducedMotion,
					);
		const following = Boolean(navigation.followCitizen && actor !== undefined);
		const followFraming =
			following && actor !== undefined
				? followFramingForActor(
						projection,
						actor,
						previousByCitizen.get(actor.citizenId) ?? null,
						progressRef.current,
						reducedMotion,
						compact,
					)
				: null;
		const overviewMinimumMm = Math.round(
			Math.max(frame.width, frame.depth) *
				OVERVIEW_FRAME_DISTANCE_FACTOR *
				1_000,
		);
		return Object.freeze({
			...requested,
			targetMm:
				followFraming !== null
					? followFraming.targetMm
					: actorPoint === undefined
						? requested.targetMm
						: {
								...actorPoint,
								y: actorPoint.y + 1_000,
								x: actorPoint.x,
								z: actorPoint.z - (compact ? 800 : 2_400),
							},
			yawDegrees:
				followFraming !== null
					? followFraming.yawDegrees
					: requested.yawDegrees,
			pitchDegrees:
				followFraming !== null
					? followFraming.pitchDegrees
					: requested.pitchDegrees,
			distanceMm:
				followFraming !== null
					? followFraming.distanceMm
					: focus.kind === "overview"
						? Math.max(requested.distanceMm, overviewMinimumMm)
						: requested.distanceMm,
		});
	}, [
		frame,
		model.actors,
		navigation.focus,
		navigation.followCitizen,
		presentationTick,
		previousByCitizen,
		progressRef,
		projection,
		reducedMotion,
		requested,
	]);
	const desiredRef = useRef(desired);
	desiredRef.current = desired;
	const current = useRef(desired);
	const initialTarget = localPoint(desired.targetMm, frame);
	const initialYaw = (desired.yawDegrees * Math.PI) / 180;
	const initialPitch = (desired.pitchDegrees * Math.PI) / 180;
	const initialDistance = desired.distanceMm / 1_000;
	const initialHorizontal = Math.cos(initialPitch) * initialDistance;
	const initialPosition: [number, number, number] = [
		initialTarget[0] + Math.sin(initialYaw) * initialHorizontal,
		initialTarget[1] - Math.sin(initialPitch) * initialDistance,
		initialTarget[2] + Math.cos(initialYaw) * initialHorizontal,
	];
	const emit = (action: GeneratedNavigationAction) =>
		window.dispatchEvent(
			new CustomEvent(GENERATED_NAVIGATION_EVENT, { detail: action }),
		);

	useEffect(() => {
		const surface = host.current;
		if (surface === null) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			emit({
				type: "zoom",
				deltaMm: Math.max(-18_000, Math.min(18_000, event.deltaY * 50)),
			});
		};
		const onPointerDown = (event: PointerEvent) => {
			if (pointer.current !== null || event.button !== 0) return;
			surface.setPointerCapture(event.pointerId);
			pointer.current = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				startX: event.clientX,
				startY: event.clientY,
			};
		};
		const onPointerMove = (event: PointerEvent) => {
			const prior = pointer.current;
			if (prior?.id !== event.pointerId) return;
			const dx = event.clientX - prior.x;
			const dy = event.clientY - prior.y;
			pointer.current = { ...prior, x: event.clientX, y: event.clientY };
			const state = navigationRef.current;
			const unitsPerPixelMm = state.distanceMm * 0.0018;
			const yaw = (state.yawDegrees * Math.PI) / 180;
			emit({
				type: "pan",
				xDeltaMm: (-dx * Math.cos(yaw) + dy * Math.sin(yaw)) * unitsPerPixelMm,
				zDeltaMm: (dx * Math.sin(yaw) + dy * Math.cos(yaw)) * unitsPerPixelMm,
			});
		};
		const pickAt = (event: PointerEvent) => {
			const bounds = surface.getBoundingClientRect();
			const x = event.clientX - bounds.left;
			const y = event.clientY - bounds.top;
			const citizenTargets = JSON.parse(
				surface.dataset.citizenPickTargets ?? "[]",
			) as readonly { id: string; x: number; y: number }[];
			const nearest = citizenTargets
				.map((target) => ({
					citizenId: target.id,
					distance: Math.hypot(target.x - x, target.y - y),
				}))
				.sort((left, right) => left.distance - right.distance)[0];
			const threshold = event.pointerType === "touch" ? 72 : 56;
			if (nearest === undefined || nearest.distance > threshold) return;
			emit({ type: "select-citizen", citizenId: nearest.citizenId });
		};
		const finishPointer = (event: PointerEvent, allowPick: boolean) => {
			const prior = pointer.current;
			if (prior?.id !== event.pointerId) return;
			if (
				allowPick &&
				Math.hypot(
					event.clientX - prior.startX,
					event.clientY - prior.startY,
				) <= 7
			)
				pickAt(event);
			pointer.current = null;
		};
		const onPointerUp = (event: PointerEvent) => finishPointer(event, true);
		const onPointerCancel = (event: PointerEvent) =>
			finishPointer(event, false);
		surface.addEventListener("wheel", onWheel, { passive: false });
		surface.addEventListener("pointerdown", onPointerDown);
		surface.addEventListener("pointermove", onPointerMove);
		surface.addEventListener("pointerup", onPointerUp);
		surface.addEventListener("pointercancel", onPointerCancel);
		return () => {
			surface.removeEventListener("wheel", onWheel);
			surface.removeEventListener("pointerdown", onPointerDown);
			surface.removeEventListener("pointermove", onPointerMove);
			surface.removeEventListener("pointerup", onPointerUp);
			surface.removeEventListener("pointercancel", onPointerCancel);
		};
	}, [frame, host, model, projection]);

	useAppEvent("update", (dt: number) => {
		const entity = camera.current;
		if (entity === null) return;
		const focus = navigationRef.current.focus;
		const following = Boolean(navigationRef.current.followCitizen);
		let nextDesired = desiredRef.current;
		if (following && focus.kind === "citizen") {
			const followed = model.actors.find(
				({ citizenId }) => citizenId === focus.citizenId,
			);
			if (followed !== undefined) {
				const framing = followFramingForActor(
					projection,
					followed,
					previousByCitizen.get(followed.citizenId) ?? null,
					progressRef.current,
					reducedMotion,
					followViewportCompact(host.current),
				);
				nextDesired = Object.freeze({
					...nextDesired,
					targetMm: framing.targetMm,
					yawDegrees: framing.yawDegrees,
					pitchDegrees: framing.pitchDegrees,
					distanceMm: framing.distanceMm,
				});
			}
		}
		const intent = advanceGeneratedCameraIntent(
			current.current,
			nextDesired,
			reducedMotion,
			dt,
		);
		current.current = intent;
		const target = localPoint(intent.targetMm, frame);
		const distance = intent.distanceMm / 1_000;
		const yaw = (intent.yawDegrees * Math.PI) / 180;
		const pitch = (intent.pitchDegrees * Math.PI) / 180;
		const horizontal = Math.cos(pitch) * distance;
		entity.setPosition(
			target[0] + Math.sin(yaw) * horizontal,
			target[1] - Math.sin(pitch) * distance,
			target[2] + Math.cos(yaw) * horizontal,
		);
		entity.lookAt(target[0], target[1], target[2]);
		const fidelity = generatedCameraFidelity(intent.distanceMm);
		if (host.current !== null) {
			host.current.dataset.cameraDistanceMm = String(intent.distanceMm);
			host.current.dataset.cameraYawDegrees = intent.yawDegrees.toFixed(2);
			host.current.dataset.cameraTargetMm = `${intent.targetMm.x}:${intent.targetMm.y}:${intent.targetMm.z}`;
			host.current.dataset.semanticScale = fidelity.semanticScale;
			host.current.dataset.fidelityClass = fidelity.fidelityClass;
			host.current.dataset.navigationMode = reducedMotion ? "direct" : "smooth";
			const cameraComponent = entity.camera;
			if (cameraComponent !== undefined) {
				const picks = model.actors.map((actor) => {
					const point = localPoint(
						renderedActorPoint(
							projection,
							actor,
							presentationTickRef.current,
							previousByCitizen.get(actor.citizenId) ?? null,
							progressRef.current,
							reducedMotion,
						),
						frame,
					);
					const screen = cameraComponent.worldToScreen(
						new Vec3(point[0], point[1] + 0.9, point[2]),
					);
					return { id: actor.citizenId, x: screen.x, y: screen.y };
				});
				host.current.dataset.citizenPickTargets = JSON.stringify(picks);
				const followedId =
					following && focus.kind === "citizen" ? focus.citizenId : null;
				const followedPick =
					followedId === null
						? undefined
						: picks.find((pick) => pick.id === followedId);
				const height = Math.max(1, host.current.clientHeight);
				host.current.dataset.followSubjectYRatio =
					followedPick === undefined
						? ""
						: (followedPick.y / height).toFixed(3);
			}
		}
	});
	return (
		<Entity ref={camera} position={initialPosition}>
			<Camera
				clearColor="#8aa3b0"
				fov={
					navigation.followCitizen
						? generatedFollowViewportIsCompact(
								window.innerWidth,
								window.innerHeight,
							)
							? 38
							: 34
						: 46
				}
				farClip={720}
				nearClip={0.2}
			/>
		</Entity>
	);
}

function Route({
	from,
	to,
	color = palette.path,
	width = 0.75,
}: {
	readonly from: [number, number, number];
	readonly to: [number, number, number];
	readonly color?: StandardMaterial;
	readonly width?: number;
}) {
	const dx = to[0] - from[0];
	const dz = to[2] - from[2];
	const length = Math.hypot(dx, dz);
	return (
		<Primitive
			position={[
				(from[0] + to[0]) / 2,
				(from[1] + to[1]) / 2 + 0.04,
				(from[2] + to[2]) / 2,
			]}
			scale={[width, 0.08, Math.max(0.1, length)]}
			rotation={[0, (Math.atan2(dx, dz) * 180) / Math.PI, 0]}
			color={color}
			castShadows={false}
		/>
	);
}

function Tree({
	position,
	ordinal,
	height,
	canopyDiameter,
}: {
	readonly position: [number, number, number];
	readonly ordinal: number;
	readonly height: number;
	readonly canopyDiameter: number;
}) {
	const variedHeight = height * (0.92 + (ordinal % 3) * 0.04);
	const canopy = canopyDiameter * (0.92 + (ordinal % 2) * 0.08);
	return (
		<Entity position={position} rotation={[0, (ordinal * 47) % 360, 0]}>
			<Primitive
				type="cylinder"
				position={[0, variedHeight * 0.2, 0]}
				scale={[0.45, variedHeight * 0.4, 0.45]}
				color={palette.bark}
			/>
			<Primitive
				type="cone"
				position={[0, variedHeight * 0.7, 0]}
				scale={[canopy, variedHeight * 0.6, canopy]}
				color={ordinal % 2 === 0 ? palette.leaf : palette.leafLight}
			/>
		</Entity>
	);
}

/** Non-authoritative landscape context keeps the settlement inside a world. */
function WorldContext({ frame }: { readonly frame: Frame }) {
	const fields = [-0.28, 0.3] as const;
	return (
		<Entity name="cosmetic-landscape">
			{[-1.1, 1.15].map((side) => (
				<Primitive
					key={side}
					type="sphere"
					position={[side * frame.width * 0.9, 1.4, -frame.depth * 0.85]}
					scale={[18, 6.5, 14]}
					color={palette.soil}
					castShadows={false}
				/>
			))}
			{fields.map((x) => (
				<Entity key={x}>
					<Primitive
						type="sphere"
						position={[x * frame.width, -0.28, -x * frame.depth]}
						scale={[7.5, 0.58, 12]}
						color={palette.soil}
						castShadows={false}
					/>
					{[-2.8, -1.4, 0, 1.4, 2.8].map((row) => (
						<Primitive
							key={row}
							position={[x * frame.width + row, 0.12, -x * frame.depth]}
							scale={[0.52, 0.24, 9.5]}
							color={palette.field}
							castShadows={false}
						/>
					))}
				</Entity>
			))}
			<Route
				from={[-frame.width * 0.7, 0, -frame.depth * 0.58]}
				to={[-frame.width * 0.42, 0, frame.depth * 0.5]}
				color={palette.water}
				width={8.5}
			/>
		</Entity>
	);
}

function SiteLife({
	kind,
	position,
	width,
	depth,
	physicalScale,
	fidelityClass,
}: {
	readonly kind: GeneratedCivilizationSpatialProjection["local"]["sites"][number]["kind"];
	readonly position: [number, number, number];
	readonly width: number;
	readonly depth: number;
	readonly physicalScale: GeneratedCivilizationSpatialProjection["scene"]["physicalScale"];
	readonly fidelityClass: ReturnType<
		typeof generatedCameraFidelity
	>["fidelityClass"];
}) {
	const x = Math.max(1.4, width * 0.34);
	const z = Math.max(1.4, depth * 0.34);
	if (kind === "resource")
		return (
			<Entity position={position}>
				{[
					[-x, -z],
					[x, -z * 0.75],
					[-x * 0.8, z],
					[x * 0.9, z * 0.86],
					[0, z],
				]
					.slice(0, fidelityClass === "LOD3" ? 2 : 5)
					.map(([treeX, treeZ], ordinal) => (
						<Tree
							key={`${treeX}:${treeZ}`}
							position={[treeX ?? 0, 0, treeZ ?? 0]}
							ordinal={ordinal}
							height={physicalScale.tree.matureHeightMm / 1_000}
							canopyDiameter={physicalScale.tree.canopyDiameterMm / 1_000}
						/>
					))}
				<Primitive
					position={[0.9, 0.28, 0.15]}
					scale={[1.9, 0.32, 0.4]}
					rotation={[0, 18, 0]}
					color={palette.wood}
				/>
			</Entity>
		);
	if (kind === "production")
		return (
			<Entity position={position}>
				<Primitive
					position={[-x, 2.15, z]}
					scale={[5, 0.3, 3.6]}
					rotation={[0, 0, -8]}
					color={palette.clay}
				/>
				{[
					[-x, 0.55, z, 2.6, 0.25, 1.1],
					[-x - 1.8, 1.05, z, 0.18, 2.1, 0.18],
					[-x + 1.8, 1.05, z, 0.18, 2.1, 0.18],
				].map(([px, py, pz, sx, sy, sz], ordinal) => (
					<Primitive
						key={px}
						position={[px ?? 0, py ?? 0, pz ?? 0]}
						scale={[sx ?? 1, sy ?? 1, sz ?? 1]}
						color={ordinal === 0 ? palette.wood : palette.bark}
					/>
				))}
			</Entity>
		);
	if (kind === "storage")
		return (
			<Entity position={position}>
				{[0.75, 0.58, 0.52].map((height, ordinal) => (
					<Primitive
						key={height}
						position={[
							-x + ordinal * 0.62,
							height / 2,
							z - (ordinal === 2 ? 0.85 : 0),
						]}
						scale={[0.9, height, 0.9]}
						rotation={[0, ordinal * 12, 0]}
						color={palette.wood}
					/>
				))}
			</Entity>
		);
	if (kind === "civic")
		return (
			<Entity position={position}>
				<Primitive
					type="cylinder"
					position={[-x, 0.35, z]}
					scale={[1.15, 0.7, 1.15]}
					color={palette.stone}
				/>
				<Primitive
					type="cylinder"
					position={[-x, 0.76, z]}
					scale={[0.72, 0.18, 0.72]}
					color={palette.water}
					castShadows={false}
				/>
			</Entity>
		);
	if (kind === "residential")
		return (
			<Primitive
				position={position}
				scale={[2, 0.22, 2]}
				color={palette.soil}
				castShadows={false}
			/>
		);
	return null;
}

function VernacularBuilding({
	position,
	width,
	depth,
	ridgeHeight,
	doorHeight,
	buildingKind,
	completeness,
	foundingCamp,
}: {
	readonly position: [number, number, number];
	readonly width: number;
	readonly depth: number;
	readonly ridgeHeight: number;
	readonly doorHeight: number;
	readonly buildingKind: string;
	readonly completeness: number;
	readonly foundingCamp: boolean;
}) {
	const wallHeight = ridgeHeight * 0.72;
	if (foundingCamp)
		return (
			<Entity position={position}>
				<Primitive
					position={[0, 0.85, 0]}
					scale={[2.4, 1.7, 2.1]}
					color={palette.wood}
				/>
				<Primitive
					type="cone"
					position={[0, 2.05, 0]}
					scale={[3.2, 1.4, 2.9]}
					color={palette.bark}
				/>
				<Primitive
					type="cylinder"
					position={[2.2, 0.18, 1.1]}
					scale={[0.85, 0.14, 0.85]}
					color={palette.stone}
				/>
				<Primitive
					type="sphere"
					position={[2.2, 0.72, 1.1]}
					scale={[0.38, 0.62, 0.38]}
					color={palette.changed}
				/>
				<Primitive
					position={[2.05, 0.08, 1.85]}
					scale={[0.55, 0.35, 0.4]}
					color={palette.wood}
				/>
			</Entity>
		);
	if (completeness < 0.55)
		return (
			<Entity position={position}>
				<Primitive
					position={[0, 0.12, 0]}
					scale={[width + 0.4, 0.22, depth + 0.4]}
					color={palette.stone}
				/>
				{[-1, 1].map((side) => (
					<Primitive
						key={side}
						position={[side * width * 0.42, wallHeight * completeness, 0]}
						scale={[0.16, wallHeight * Math.max(0.4, completeness), 0.16]}
						color={palette.wood}
					/>
				))}
				<Primitive
					position={[0, 0.35, 0]}
					scale={[width * 0.7, 0.18, depth * 0.55]}
					color={palette.bark}
				/>
			</Entity>
		);
	const isHall = buildingKind.includes("meeting");
	const isStore =
		buildingKind.includes("store") || buildingKind.includes("cache");
	const isWorkshop = buildingKind.includes("workshop");
	const bodyColor = isHall
		? palette.civic
		: isWorkshop
			? palette.clay
			: isStore
				? palette.wood
				: palette.civic;
	return (
		<Entity position={position}>
			<Primitive
				position={[0, 0.16, 0]}
				scale={[width + 0.45, 0.32, depth + 0.45]}
				color={palette.stone}
			/>
			<Primitive
				position={[0, wallHeight / 2 + 0.26, 0]}
				scale={[
					isHall ? width * 1.15 : width,
					wallHeight * (isStore ? 0.85 : 1),
					isWorkshop ? depth * 1.2 : depth,
				]}
				color={bodyColor}
			/>
			{isHall ? (
				<Primitive
					type="cylinder"
					position={[0, wallHeight + 0.55, 0]}
					scale={[width * 0.35, 0.7, width * 0.35]}
					color={palette.clay}
				/>
			) : isWorkshop ? (
				<>
					<Primitive
						position={[0, wallHeight + 0.08, -depth * 0.08]}
						scale={[width * 1.08, 0.18, depth * 0.72]}
						color={palette.bark}
					/>
					<Primitive
						type="cylinder"
						position={[width * 0.38, wallHeight + 0.85, -depth * 0.18]}
						scale={[0.28, 1.15, 0.28]}
						color={palette.stone}
					/>
					<Primitive
						position={[width * 0.52, 0.55, depth * 0.12]}
						scale={[0.22, 1.05, 0.22]}
						color={palette.wood}
					/>
					<Primitive
						position={[width * 0.52, 1.05, depth * 0.12]}
						scale={[0.55, 0.12, 0.18]}
						color={palette.bark}
					/>
					<Primitive
						position={[-width * 0.2, 0.42, depth * 0.48]}
						scale={[0.35, 0.85, 0.18]}
						color={palette.wood}
					/>
				</>
			) : isStore ? (
				<>
					<Primitive
						position={[0, wallHeight * 0.85 + 0.22, 0]}
						scale={[width + 0.2, 0.22, depth + 0.2]}
						color={palette.bark}
					/>
					<Primitive
						position={[width * 0.38, 0.38, depth * 0.42]}
						scale={[0.7, 0.7, 0.55]}
						color={palette.wood}
					/>
					<Primitive
						position={[width * 0.52, 0.28, depth * 0.28]}
						scale={[0.5, 0.5, 0.4]}
						color={palette.bark}
					/>
				</>
			) : (
				[-1, 1].map((side) => (
					<Primitive
						key={side}
						position={[side * width * 0.23, wallHeight + 0.12, 0]}
						scale={[width * 0.58, 0.42, depth + 0.35]}
						rotation={[0, 0, -side * 27]}
						color={palette.clay}
					/>
				))
			)}
			<Primitive
				position={[
					0,
					doorHeight / 2 + 0.25,
					isWorkshop ? depth * 0.22 : depth / 2 + 0.04,
				]}
				scale={[isHall ? 1.4 : isWorkshop ? 1.55 : 1.05, doorHeight, 0.12]}
				color={palette.wood}
			/>
		</Entity>
	);
}

function GroundedSettlement({
	projection,
	model,
	frame,
	fidelity,
	navigation,
	presentationTick,
	reducedMotion,
	playRate,
	host,
	onFailure,
	progressRef,
	previousByCitizen,
	visualDayOriginMs,
	visualDayHeld01,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly frame: Frame;
	readonly fidelity: ReturnType<typeof generatedCameraFidelity>;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly playRate: PlayRate;
	readonly host: RefObject<HTMLDivElement | null>;
	readonly onFailure: () => void;
	readonly progressRef: { current: number };
	readonly previousByCitizen: ReadonlyMap<string, GeneratedEmbodiedActor>;
	readonly visualDayOriginMs?: number;
	readonly visualDayHeld01?: number;
}) {
	const scale = projection.scene.physicalScale;
	const selectedActorId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const focusRevision =
		navigation.focus.kind === "overview"
			? "overview"
			: navigation.focus.kind === "citizen"
				? `citizen:${navigation.focus.citizenId}`
				: navigation.focus.kind === "building"
					? `building:${navigation.focus.buildingId}`
					: `project:${navigation.focus.projectId}`;
	const renderRevision = [
		projection.spatial.source.stateHash,
		focusRevision,
		navigation.followCitizen,
		navigation.distanceMm,
		navigation.yawDegrees,
		navigation.pitchDegrees,
		navigation.panOffsetMm.x,
		navigation.panOffsetMm.z,
		playRate,
	].join("|");
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="generated-playcanvas"
		>
			<WorldMotionClock
				stateHash={projection.spatial.source.stateHash}
				playRate={playRate}
				reducedMotion={reducedMotion}
				progressRef={progressRef}
				originMs={visualDayOriginMs}
				held01={visualDayHeld01}
			/>
			<SceneProbe
				host={host}
				onFailure={onFailure}
				renderOnDemand={reducedMotion}
				renderRevision={renderRevision}
			/>
			<GeneratedCamera
				frame={frame}
				projection={projection}
				model={model}
				navigation={navigation}
				presentationTick={presentationTick}
				reducedMotion={reducedMotion}
				host={host}
				progressRef={progressRef}
				previousByCitizen={previousByCitizen}
			/>
			<Entity rotation={[54, -18, 0]}>
				<Light
					type="directional"
					color="#fff1d4"
					intensity={0.92}
					castShadows
				/>
			</Entity>
			<Entity rotation={[32, 140, 0]}>
				<Light type="directional" color="#c5d4e4" intensity={0.42} />
			</Entity>
			<Primitive
				position={[0, -0.35, 0]}
				scale={[Math.max(frame.width, 96), 0.5, Math.max(frame.depth, 96)]}
				color={palette.ground}
			/>
			<Primitive
				type="cylinder"
				position={[0, -0.08, 0]}
				scale={[
					Math.max(frame.width, frame.depth) * 0.62,
					0.16,
					Math.max(frame.width, frame.depth) * 0.62,
				]}
				color={palette.soil}
				castShadows={false}
			/>
			<WorldContext frame={frame} />
			{projection.scene.edges
				.filter((edge) => edge.edgeId.endsWith(":forward"))
				.map((edge) => {
					const from = projection.scene.nodes[edge.fromNodeId];
					const to = projection.scene.nodes[edge.toNodeId];
					if (from === undefined || to === undefined)
						throw new Error(
							`Generated route edge ${edge.edgeId} is ungrounded`,
						);
					return (
						<Route
							key={edge.edgeId}
							from={localPoint(from, frame)}
							to={localPoint(to, frame)}
							width={scale.road.footpathWidthMm / 1_000}
						/>
					);
				})}
			{projection.local.sites.map((site) => {
				const width =
					(site.bounds.maximum.xMillimeters -
						site.bounds.minimum.xMillimeters) /
					1_000;
				const depth =
					(site.bounds.maximum.yMillimeters -
						site.bounds.minimum.yMillimeters) /
					1_000;
				const position = localPoint(
					{
						x:
							(site.bounds.minimum.xMillimeters +
								site.bounds.maximum.xMillimeters) /
							2,
						y: site.bounds.minimum.elevationMillimeters,
						z:
							(site.bounds.minimum.yMillimeters +
								site.bounds.maximum.yMillimeters) /
							2,
					},
					frame,
				);
				const foundingCamp =
					model.growth.addedSiteIds.includes(site.siteId) ||
					(projection.local.settlement.foundedAtSimulationTime > 0 &&
						!projection.local.buildings.some(
							(building) => building.siteId === site.siteId,
						));
				return (
					<Entity key={site.siteId}>
						{foundingCamp ? (
							<>
								<Primitive
									type="cylinder"
									position={[position[0], 0.04, position[2]]}
									scale={[3.4, 0.1, 3.4]}
									color={palette.soil}
									castShadows={false}
								/>
								<VernacularBuilding
									position={[position[0], 0.08, position[2]]}
									width={2.4}
									depth={2.2}
									ridgeHeight={2.1}
									doorHeight={1.2}
									buildingKind="founding-camp"
									completeness={0.2}
									foundingCamp
								/>
							</>
						) : (
							<>
								<Primitive
									type="sphere"
									position={[position[0], -0.32, position[2]]}
									scale={[
										Math.max(2, width * 0.64),
										0.68,
										Math.max(2, depth * 0.64),
									]}
									color={
										site.kind === "resource"
											? palette.leaf
											: site.kind === "civic"
												? palette.path
												: site.kind === "storage"
													? palette.soil
													: palette.field
									}
									castShadows={false}
								/>
								<SiteLife
									kind={site.kind}
									position={[position[0], 0.08, position[2]]}
									width={width}
									depth={depth}
									physicalScale={scale}
									fidelityClass={fidelity.fidelityClass}
								/>
							</>
						)}
					</Entity>
				);
			})}
			{projection.local.buildings.map((building) => {
				const point = localPoint(
					{
						x: building.position.xMillimeters,
						y: building.position.elevationMillimeters,
						z: building.position.yMillimeters,
					},
					frame,
				);
				const isMill = building.buildingKind.toLowerCase().includes("mill");
				const width =
					(isMill ? scale.mill.widthMm : scale.house.widthMm) / 1_000;
				const depth =
					(isMill ? scale.mill.depthMm : scale.house.depthMm) / 1_000;
				const ridgeHeight =
					(isMill ? scale.mill.ridgeHeightMm : scale.house.ridgeHeightMm) /
					1_000;
				const siteProject = model.projects.find(
					(project) => project.siteId === building.siteId,
				);
				const completeness =
					siteProject === undefined
						? Math.max(0.4, building.conditionBasisPoints / 10_000)
						: siteProject.progressBasisPoints / 10_000;
				return (
					<VernacularBuilding
						key={building.buildingId}
						position={point}
						width={width}
						depth={depth}
						ridgeHeight={ridgeHeight}
						doorHeight={scale.door.heightMm / 1_000}
						buildingKind={building.buildingKind}
						completeness={completeness}
						foundingCamp={
							projection.local.settlement.foundedAtSimulationTime > 0 &&
							completeness < 0.35
						}
					/>
				);
			})}
			{model.actors.map((actor) => (
				<MovingCitizen
					key={actor.citizenId}
					actor={actor}
					previous={previousByCitizen.get(actor.citizenId) ?? null}
					projection={projection}
					frame={frame}
					progressRef={progressRef}
					presentationTick={presentationTick}
					reducedMotion={reducedMotion}
					selected={selectedActorId === actor.citizenId}
				/>
			))}
			{projection.spatial.interactions.map((interaction) => {
				const participants = interaction.participantIds
					.map((citizenId) =>
						model.actors.find((actor) => actor.citizenId === citizenId),
					)
					.filter((actor) => actor !== undefined);
				const first = participants[0];
				const second = participants[1];
				if (first === undefined || second === undefined) return null;
				const from = localPoint(
					renderedActorPoint(
						projection,
						first,
						presentationTick,
						previousByCitizen.get(first.citizenId) ?? null,
						progressRef.current,
						reducedMotion,
					),
					frame,
				);
				const to = localPoint(
					renderedActorPoint(
						projection,
						second,
						presentationTick,
						previousByCitizen.get(second.citizenId) ?? null,
						progressRef.current,
						reducedMotion,
					),
					frame,
				);
				return (
					<Primitive
						key={interaction.interactionId}
						type="cylinder"
						position={[(from[0] + to[0]) / 2, 0.055, (from[2] + to[2]) / 2]}
						scale={[2.25, 0.035, 2.25]}
						color={palette.social}
						castShadows={false}
					/>
				);
			})}
		</Application>
	);
}

class RendererBoundary extends Component<
	{ readonly children: ReactNode; readonly onFailure: () => void },
	{ readonly failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(_error: Error, _info: ErrorInfo) {
		this.props.onFailure();
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}

export function GeneratedWorldCanvas({
	projection,
	model,
	navigation,
	presentationTick,
	reducedMotion,
	onFailure,
	playRate = 1,
	variant = "world",
	visualDayOriginMs,
	visualDayHeld01,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
	readonly playRate?: PlayRate;
	readonly variant?: "world" | "hero";
	readonly visualDayOriginMs?: number;
	readonly visualDayHeld01?: number;
}) {
	const cameraIntent = cameraIntentForGeneratedNavigation(
		projection,
		model,
		navigation,
	);
	const frame = useMemo(() => sceneFrame(projection), [projection]);
	const effectiveDistanceMm =
		navigation.focus.kind === "overview"
			? Math.max(
					cameraIntent.distanceMm,
					Math.round(
						Math.max(frame.width, frame.depth) *
							OVERVIEW_FRAME_DISTANCE_FACTOR *
							1_000,
					),
				)
			: cameraIntent.distanceMm;
	const fidelity = generatedCameraFidelity(effectiveDistanceMm);
	const host = useRef<HTMLDivElement>(null);
	const progressRef = useRef(reducedMotion ? 0.55 : 0);
	const lastModelRef = useRef(model);
	const previousModelRef = useRef<GeneratedEmbodimentProjection | null>(null);
	if (lastModelRef.current.source.stateHash !== model.source.stateHash) {
		previousModelRef.current = lastModelRef.current;
		lastModelRef.current = model;
	}
	const previousByCitizen = useMemo(() => {
		return new Map(
			(previousModelRef.current?.actors ?? []).map((actor) => [
				actor.citizenId,
				actor,
			]),
		);
	}, [model.source.stateHash]);
	const transitionKinds = model.actors
		.map((actor) => {
			const previous = previousByCitizen.get(actor.citizenId);
			if (previous === undefined) return `${actor.citizenId}:enter`;
			try {
				return `${actor.citizenId}:${planGeneratedActorTransition(previous, actor).kind}`;
			} catch {
				return `${actor.citizenId}:blocked`;
			}
		})
		.join(",");
	return (
		<div
			ref={host}
			className={
				variant === "hero"
					? "generated-world-canvas generated-world-hero"
					: "generated-world-canvas"
			}
			role="img"
			aria-label={`${projection.local.settlement.name}, settlement with ${projection.spatial.actors.length} residents. Drag to pan, scroll to zoom, or use semantic camera controls.`}
			data-testid={
				variant === "hero" ? "generated-world-hero" : "generated-world-canvas"
			}
			data-ready="false"
			data-engine="playcanvas"
			data-folk-renderer="procedural-typed-proxy"
			data-folk-reference-asset={GENERATED_FOLK_ASSET.url}
			data-environment-context="presentation-only-ground-apron"
			data-environment-authority="cosmetic-never-reality"
			data-world-id={projection.spatial.source.runId}
			data-state-hash={projection.spatial.source.stateHash}
			data-world-revision={projection.spatial.source.revision}
			data-world-sequence={projection.spatial.source.throughSequence}
			data-settlement-id={projection.local.settlement.settlementId}
			data-actor-count={projection.spatial.actors.length}
			data-canonical-actor-ids={model.actors
				.map(({ citizenId }) => citizenId)
				.join(",")}
			data-canonical-action-ids={model.actors
				.map(({ actionId }) => actionId)
				.join(",")}
			data-animation-classes={projection.spatial.animationClasses.join(",")}
			data-moving-actor-count={projection.spatial.movingCitizenCount}
			data-interaction-count={projection.spatial.interactions.length}
			data-canonical-event-link-count={
				projection.spatial.canonicalEventLinkCount
			}
			data-route-segment-count={
				projection.scene.edges.filter((edge) =>
					edge.edgeId.endsWith(":forward"),
				).length
			}
			data-actor-route-states={projection.spatial.actors
				.map(
					(actor) =>
						`${actor.citizenId}:${actor.travelState.status}:${actor.travelState.routeId}:${actor.travelState.progressBasisPoints ?? "slot"}`,
				)
				.join(",")}
			data-actor-positions={projection.spatial.actors
				.map(
					(actor) =>
						`${actor.citizenId}:${actor.positionMm.x}:${actor.positionMm.y}:${actor.positionMm.z}`,
				)
				.join(",")}
			data-rendered-actor-positions={model.actors
				.map((actor) => {
					const position = renderedActorPoint(
						projection,
						actor,
						presentationTick,
						previousByCitizen.get(actor.citizenId) ?? null,
						progressRef.current,
						reducedMotion,
					);
					return `${actor.citizenId}:${position.x}:${position.y}:${position.z}`;
				})
				.join(",")}
			data-actor-diagnostics={projection.spatial.actors
				.map(
					(actor) =>
						`${actor.citizenId}|${actor.action.actionId}|${actor.action.destinationPlaceId}|${actor.animationClass}|${actor.interactionTarget ?? "none"}|${actor.prop ?? "none"}|${actor.positionMm.x}:${actor.positionMm.y}:${actor.positionMm.z}`,
				)
				.join(";")}
			data-teleport-count={String(model.teleportCount)}
			data-transition-kinds={transitionKinds}
			data-contradiction-count={projection.spatial.contradictionCount}
			data-embodiment-schema={model.schemaVersion}
			data-presentation-tick={presentationTick}
			data-focus-kind={navigation.focus.kind}
			data-last-world-pick={
				navigation.focus.kind === "citizen"
					? `citizen:${navigation.focus.citizenId}`
					: ""
			}
			data-following={String(navigation.followCitizen)}
			data-camera-target={cameraIntent.semanticLabel}
			data-camera-distance-mm={effectiveDistanceMm}
			data-camera-yaw-degrees={navigation.yawDegrees}
			data-camera-pitch-degrees={navigation.pitchDegrees}
			data-camera-target-mm={`${cameraIntent.targetMm.x}:${cameraIntent.targetMm.y}:${cameraIntent.targetMm.z}`}
			data-semantic-scale={fidelity.semanticScale}
			data-fidelity-class={fidelity.fidelityClass}
			data-navigation-mode={reducedMotion ? "direct" : "smooth"}
			data-render-policy={reducedMotion ? "on-demand" : "continuous"}
			data-citizen-height-mm={projection.scene.physicalScale.citizen.heightMm}
			data-door-height-mm={projection.scene.physicalScale.door.heightMm}
			data-road-width-mm={projection.scene.physicalScale.road.footpathWidthMm}
			data-growth-changes={model.growth.visibleChangeCount}
			data-project-count={model.projects.length}
			data-limitation-count={model.limitations.length}
		>
			<RendererBoundary onFailure={onFailure}>
				<GroundedSettlement
					projection={projection}
					model={model}
					frame={frame}
					fidelity={fidelity}
					navigation={navigation}
					presentationTick={presentationTick}
					reducedMotion={reducedMotion}
					playRate={playRate}
					host={host}
					onFailure={onFailure}
					progressRef={progressRef}
					previousByCitizen={previousByCitizen}
					visualDayOriginMs={visualDayOriginMs}
					visualDayHeld01={visualDayHeld01}
				/>
			</RendererBoundary>
			{variant === "hero" ? null : (
				<CitizenNameOverlay
					host={host}
					model={model}
					projection={projection}
					previousByCitizen={previousByCitizen}
					progressRef={progressRef}
					reducedMotion={reducedMotion}
					selectedCitizenId={
						navigation.focus.kind === "citizen"
							? navigation.focus.citizenId
							: null
					}
				/>
			)}
		</div>
	);
}

function CitizenNameOverlay({
	host,
	model,
	projection,
	progressRef,
	selectedCitizenId,
}: {
	readonly host: RefObject<HTMLDivElement | null>;
	readonly model: GeneratedEmbodimentProjection;
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly previousByCitizen: ReadonlyMap<string, GeneratedEmbodiedActor>;
	readonly progressRef: { current: number };
	readonly reducedMotion: boolean;
	readonly selectedCitizenId: string | null;
}) {
	const [targets, setTargets] = useState<
		readonly { readonly id: string; readonly x: number; readonly y: number }[]
	>([]);
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	useEffect(() => {
		let frame = 0;
		let previous = "";
		const tick = () => {
			const next = host.current?.dataset.citizenPickTargets ?? "[]";
			if (next !== previous) {
				previous = next;
				try {
					setTargets(
						JSON.parse(next) as readonly {
							readonly id: string;
							readonly x: number;
							readonly y: number;
						}[],
					);
				} catch {
					setTargets([]);
				}
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [host]);
	useEffect(() => {
		const surface = host.current;
		if (surface === null) return;
		const onMove = (event: PointerEvent) => {
			const bounds = surface.getBoundingClientRect();
			const x = event.clientX - bounds.left;
			const y = event.clientY - bounds.top;
			const nearest = targets
				.map((target) => ({
					id: target.id,
					distance: Math.hypot(target.x - x, target.y - y),
				}))
				.sort((left, right) => left.distance - right.distance)[0];
			setHoveredId(
				nearest !== undefined && nearest.distance <= 56 ? nearest.id : null,
			);
		};
		surface.addEventListener("pointermove", onMove);
		return () => surface.removeEventListener("pointermove", onMove);
	}, [host, targets]);
	const visible = targets.filter((target) => {
		const actor = model.actors.find(({ citizenId }) => citizenId === target.id);
		if (actor === undefined) return false;
		return (
			actor.name === "Mara Vale" ||
			actor.citizenId === selectedCitizenId ||
			actor.citizenId === hoveredId
		);
	});
	return (
		<ul className="generated-citizen-labels" aria-label="People in view">
			{visible.map((target) => {
				const actor = model.actors.find(
					({ citizenId }) => citizenId === target.id,
				);
				if (actor === undefined) return null;
				const hostEl = host.current;
				const width = hostEl?.clientWidth ?? 0;
				const height = hostEl?.clientHeight ?? 0;
				const pad = 16;
				const left =
					width <= pad * 2
						? target.x
						: Math.max(pad, Math.min(target.x, width - pad));
				const top =
					height <= pad * 2
						? target.y
						: Math.max(pad, Math.min(target.y, height - pad));
				return (
					<li
						key={target.id}
						style={{ left, top }}
						data-sponsored={actor.name === "Mara Vale" ? "true" : undefined}
					>
						<button
							type="button"
							aria-pressed={selectedCitizenId === actor.citizenId}
							onClick={() =>
								window.dispatchEvent(
									new CustomEvent(GENERATED_NAVIGATION_EVENT, {
										detail: Object.freeze({
											type: "select-citizen",
											citizenId: actor.citizenId,
										}),
									}),
								)
							}
						>
							<strong>{actor.name}</strong>
							<span>
								{
									presentedActorCopy(
										actor,
										projection,
										progressRef.current,
									).split(" at ")[0]
								}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
