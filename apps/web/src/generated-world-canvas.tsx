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
} from "react";
import {
	GeneratedFolkProxy,
	GENERATED_FOLK_SOURCE_HEIGHT_UNITS,
} from "./components/generated/GeneratedFolkProxy";
import { GeneratedProjectProxy } from "./components/generated/GeneratedProjectProxy";
import {
	advanceGeneratedCameraIntent,
	cameraIntentForGeneratedNavigation,
	GENERATED_FOLK_ASSET,
	GENERATED_NAVIGATION_EVENT,
	type GeneratedCameraIntent,
	type GeneratedEmbodiedActor,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	generatedCameraFidelity,
} from "./generated-presentation";

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
	linen: material("#d9c89d"),
	clay: material("#a96045"),
	ink: material("#242921"),
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

const OVERVIEW_FRAME_DISTANCE_FACTOR = 0.84;

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
	for (const route of projection.local.routes)
		for (const waypoint of route.waypoints) {
			xs.push(waypoint.xMillimeters);
			zs.push(waypoint.yMillimeters);
		}
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	if (![minX, maxX, minZ, maxZ].every(Number.isFinite))
		throw new Error("Generated settlement has no finite visual bounds");
	const padding = 12;
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

function renderedActorPoint(
	projection: GeneratedCivilizationSpatialProjection,
	actor: GeneratedEmbodiedActor,
): SpatialPointMm {
	const interaction = projection.spatial.interactions.find((candidate) =>
		candidate.participantIds.includes(actor.citizenId),
	);
	const canonicalActor = projection.spatial.actors.find(
		(candidate) => candidate.citizenId === actor.citizenId,
	);
	const slotId = canonicalActor?.action.affordanceId;
	const participantIds =
		interaction?.participantIds ??
		projection.spatial.actors
			.filter(
				(candidate) =>
					slotId !== null &&
					slotId !== undefined &&
					candidate.action.affordanceId === slotId,
			)
			.map(({ citizenId }) => citizenId);
	if (participantIds.length < 2) return actor.positionMm;
	const ordinal = participantIds.indexOf(actor.citizenId);
	const node =
		slotId === null || slotId === undefined
			? undefined
			: projection.scene.nodes[slotId];
	if (node === undefined || ordinal < 0) return actor.positionMm;
	const offset =
		(ordinal - (participantIds.length - 1) / 2) * node.occupantSpacingMm;
	const angle = (node.facingDegrees * Math.PI) / 180;
	return Object.freeze({
		x: Math.round(node.x + Math.cos(angle) * offset),
		y: node.y,
		z: Math.round(node.z - Math.sin(angle) * offset),
	});
}

function renderedActorFacing(
	projection: GeneratedCivilizationSpatialProjection,
	model: GeneratedEmbodimentProjection,
	actor: GeneratedEmbodiedActor,
): number {
	if (actor.interactionTarget === null) return actor.facingDegrees;
	const target = model.actors.find(
		(candidate) => candidate.citizenId === actor.interactionTarget,
	);
	if (target === undefined) return actor.facingDegrees;
	const from = renderedActorPoint(projection, actor);
	const to = renderedActorPoint(projection, target);
	if (from.x === to.x && from.z === to.z) return actor.facingDegrees;
	return Math.round((Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI);
}

function SceneProbe({
	host,
}: {
	readonly host: RefObject<HTMLDivElement | null>;
}) {
	const app = useApp();
	const ready = useRef(false);
	useEffect(() => {
		app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);
		const resize = () => {
			if (host.current === null) return;
			app.resizeCanvas(host.current.clientWidth, host.current.clientHeight);
		};
		resize();
		const observer = new ResizeObserver(resize);
		if (host.current !== null) observer.observe(host.current);
		return () => observer.disconnect();
	}, [app, host]);
	useAppEvent("postrender", () => {
		if (ready.current || host.current === null) return;
		ready.current = true;
		host.current.dataset.ready = "true";
		host.current.dataset.deviceType = app.graphicsDevice.deviceType;
	});
	return null;
}

function GeneratedCamera({
	frame,
	projection,
	model,
	navigation,
	reducedMotion,
	host,
}: {
	readonly frame: Frame;
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
}) {
	const camera = useRef<PlayCanvasEntity>(null);
	const pointers = useRef(new Map<number, { x: number; y: number }>());
	const pointerStarts = useRef(new Map<number, { x: number; y: number }>());
	const priorPinch = useRef<number | null>(null);
	const multiPointerGesture = useRef(false);
	const navigationRef = useRef(navigation);
	navigationRef.current = navigation;
	const requested = useMemo(
		() => cameraIntentForGeneratedNavigation(model, navigation),
		[model, navigation],
	);
	const desired = useMemo<GeneratedCameraIntent>(() => {
		const overviewMinimumMm = Math.round(
			Math.max(frame.width, frame.depth) *
				OVERVIEW_FRAME_DISTANCE_FACTOR *
				1_000,
		);
		return Object.freeze({
			...requested,
			distanceMm:
				navigation.focus.kind === "overview"
					? Math.max(requested.distanceMm, overviewMinimumMm)
					: requested.distanceMm,
		});
	}, [frame, navigation.focus.kind, requested]);
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
			if (
				event.pointerType === "mouse" &&
				event.button !== 0 &&
				event.button !== 2
			)
				return;
			surface.setPointerCapture(event.pointerId);
			const point = { x: event.clientX, y: event.clientY };
			pointers.current.set(event.pointerId, point);
			pointerStarts.current.set(event.pointerId, point);
			if (pointers.current.size > 1) multiPointerGesture.current = true;
		};
		const onPointerMove = (event: PointerEvent) => {
			const prior = pointers.current.get(event.pointerId);
			if (prior === undefined) return;
			pointers.current.set(event.pointerId, {
				x: event.clientX,
				y: event.clientY,
			});
			const active = [...pointers.current.values()];
			if (active.length >= 2) {
				const first = active[0]!;
				const second = active[1]!;
				const pinch = Math.hypot(first.x - second.x, first.y - second.y);
				if (priorPinch.current !== null)
					emit({
						type: "zoom",
						deltaMm: Math.max(
							-18_000,
							Math.min(18_000, (priorPinch.current - pinch) * 120),
						),
					});
				priorPinch.current = pinch;
				return;
			}
			const dx = event.clientX - prior.x;
			const dy = event.clientY - prior.y;
			if (event.altKey || event.button === 2 || (event.buttons & 2) !== 0) {
				emit({
					type: "orbit",
					yawDeltaDegrees: -dx * 0.28,
					pitchDeltaDegrees: dy * 0.2,
				});
				return;
			}
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
			const entity = camera.current;
			if (entity?.camera === undefined) return;
			const bounds = surface.getBoundingClientRect();
			const x = event.clientX - bounds.left;
			const y = event.clientY - bounds.top;
			const nearest = model.actors
				.map((actor) => {
					const point = localPoint(
						renderedActorPoint(projection, actor),
						frame,
					);
					const screen = entity.camera?.worldToScreen(
						new Vec3(point[0], point[1] + 0.9, point[2]),
					);
					return {
						citizenId: actor.citizenId,
						distance:
							screen === undefined
								? Number.POSITIVE_INFINITY
								: Math.hypot(screen.x - x, screen.y - y),
					};
				})
				.sort((left, right) => left.distance - right.distance)[0];
			const threshold = event.pointerType === "touch" ? 42 : 28;
			if (nearest === undefined || nearest.distance > threshold) return;
			surface.dataset.lastWorldPick = `citizen:${nearest.citizenId}`;
			emit({ type: "select-citizen", citizenId: nearest.citizenId });
		};
		const finishPointer = (event: PointerEvent, allowPick: boolean) => {
			const start = pointerStarts.current.get(event.pointerId);
			const wasOnlyPointer = pointers.current.size === 1;
			const travelled =
				start === undefined
					? Number.POSITIVE_INFINITY
					: Math.hypot(event.clientX - start.x, event.clientY - start.y);
			if (
				allowPick &&
				wasOnlyPointer &&
				!multiPointerGesture.current &&
				travelled <= 7
			)
				pickAt(event);
			pointers.current.delete(event.pointerId);
			pointerStarts.current.delete(event.pointerId);
			priorPinch.current = null;
			if (pointers.current.size === 0) multiPointerGesture.current = false;
		};
		const onPointerUp = (event: PointerEvent) => finishPointer(event, true);
		const onPointerCancel = (event: PointerEvent) =>
			finishPointer(event, false);
		const onContextMenu = (event: MouseEvent) => event.preventDefault();
		surface.addEventListener("wheel", onWheel, { passive: false });
		surface.addEventListener("pointerdown", onPointerDown);
		surface.addEventListener("pointermove", onPointerMove);
		surface.addEventListener("pointerup", onPointerUp);
		surface.addEventListener("pointercancel", onPointerCancel);
		surface.addEventListener("contextmenu", onContextMenu);
		return () => {
			surface.removeEventListener("wheel", onWheel);
			surface.removeEventListener("pointerdown", onPointerDown);
			surface.removeEventListener("pointermove", onPointerMove);
			surface.removeEventListener("pointerup", onPointerUp);
			surface.removeEventListener("pointercancel", onPointerCancel);
			surface.removeEventListener("contextmenu", onContextMenu);
		};
	}, [frame, host, model, projection]);

	useAppEvent("update", () => {
		const entity = camera.current;
		if (entity === null) return;
		const intent = advanceGeneratedCameraIntent(
			current.current,
			desiredRef.current,
			reducedMotion,
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
			if (cameraComponent !== undefined)
				host.current.dataset.citizenPickTargets = JSON.stringify(
					model.actors.map((actor) => {
						const point = localPoint(
							renderedActorPoint(projection, actor),
							frame,
						);
						const screen = cameraComponent.worldToScreen(
							new Vec3(point[0], point[1] + 0.9, point[2]),
						);
						return { id: actor.citizenId, x: screen.x, y: screen.y };
					}),
				);
		}
	});
	return (
		<Entity ref={camera} position={initialPosition}>
			<Camera clearColor="#a9b9a8" fov={42} farClip={720} nearClip={0.2} />
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
			position={[(from[0] + to[0]) / 2, 0.04, (from[2] + to[2]) / 2]}
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
	fidelityClass,
}: {
	readonly position: [number, number, number];
	readonly ordinal: number;
	readonly height: number;
	readonly canopyDiameter: number;
	readonly fidelityClass: ReturnType<
		typeof generatedCameraFidelity
	>["fidelityClass"];
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
			{fidelityClass === "LOD0" ? (
				<Primitive
					type="sphere"
					position={[0, variedHeight * 0.55, 0]}
					scale={[canopy * 0.72, canopy * 0.5, canopy * 0.72]}
					color={palette.leafLight}
				/>
			) : null}
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
							fidelityClass={fidelityClass}
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
					position={[-x, 0.55, z]}
					scale={[2.6, 0.25, 1.1]}
					color={palette.wood}
				/>
				<Primitive
					position={[-x - 0.9, 0.25, z]}
					scale={[0.18, 0.55, 0.18]}
					color={palette.bark}
				/>
				<Primitive
					position={[-x + 0.9, 0.25, z]}
					scale={[0.18, 0.55, 0.18]}
					color={palette.bark}
				/>
				<Primitive
					position={[x, 0.28, -z]}
					scale={[1.45, 0.56, 0.75]}
					color={palette.clay}
				/>
			</Entity>
		);
	if (kind === "storage")
		return (
			<Entity position={position}>
				{[
					[-x, z, 0.75],
					[-x + 1.25, z, 0.58],
					[-x + 0.55, z - 0.85, 0.52],
				].map(([crateX, crateZ, height], ordinal) => (
					<Primitive
						key={`${crateX}:${crateZ}`}
						position={[crateX ?? 0, (height ?? 0.5) / 2, crateZ ?? 0]}
						scale={[0.9, height ?? 0.5, 0.9]}
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
				<Primitive
					position={[x, 1.4, -z]}
					scale={[2.6, 0.14, 1.5]}
					rotation={[0, 8, 0]}
					color={palette.linen}
				/>
				<Primitive
					position={[x - 1, 0.7, -z]}
					scale={[0.14, 1.4, 0.14]}
					color={palette.bark}
				/>
				<Primitive
					position={[x + 1, 0.7, -z]}
					scale={[0.14, 1.4, 0.14]}
					color={palette.bark}
				/>
			</Entity>
		);
	if (kind === "residential")
		return (
			<Entity position={position}>
				{[-1, 0, 1].map((ordinal) => (
					<Primitive
						key={ordinal}
						position={[ordinal * 1.45, 0.12, z]}
						scale={[1.1, 0.22, 2.25]}
						color={ordinal === 0 ? palette.soil : palette.field}
						castShadows={false}
					/>
				))}
			</Entity>
		);
	return null;
}

function GroundedSettlement({
	projection,
	model,
	navigation,
	presentationTick,
	reducedMotion,
	host,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
}) {
	const frame = useMemo(() => sceneFrame(projection), [projection]);
	const scale = projection.scene.physicalScale;
	const requestedCamera = cameraIntentForGeneratedNavigation(model, navigation);
	const cameraDistanceMm =
		navigation.focus.kind === "overview"
			? Math.max(
					requestedCamera.distanceMm,
					Math.round(
						Math.max(frame.width, frame.depth) *
							OVERVIEW_FRAME_DISTANCE_FACTOR *
							1_000,
					),
				)
			: requestedCamera.distanceMm;
	const fidelity = generatedCameraFidelity(cameraDistanceMm);
	const selectedActorId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="generated-playcanvas"
		>
			<SceneProbe host={host} />
			<GeneratedCamera
				frame={frame}
				projection={projection}
				model={model}
				navigation={navigation}
				reducedMotion={reducedMotion}
				host={host}
			/>
			<Entity rotation={[48, -28, 0]}>
				<Light
					type="directional"
					color="#ffedcb"
					intensity={1.05}
					castShadows
				/>
			</Entity>
			<Entity rotation={[-35, 145, 0]}>
				<Light type="directional" color="#8daaa0" intensity={0.28} />
			</Entity>
			<Primitive
				position={[0, -0.2, 0]}
				scale={[frame.width + 180, 0.4, frame.depth + 180]}
				color={palette.ground}
			/>
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
				const color = model.growth.addedSiteIds.includes(site.siteId)
					? palette.changed
					: site.kind === "resource"
						? palette.wood
						: site.kind === "civic"
							? palette.civic
							: palette.field;
				return (
					<Entity key={site.siteId}>
						<Primitive
							position={[position[0], 0.04, position[2]]}
							scale={[Math.max(2, width), 0.08, Math.max(2, depth)]}
							color={color}
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
				const wallHeight = ridgeHeight * 0.68;
				return (
					<Entity key={building.buildingId} position={point}>
						<Primitive
							position={[0, wallHeight / 2, 0]}
							scale={[width, wallHeight, depth]}
							color={palette.civic}
						/>
						<Primitive
							position={[0, scale.door.heightMm / 2_000, depth / 2 + 0.03]}
							scale={[
								scale.door.widthMm / 1_000,
								scale.door.heightMm / 1_000,
								0.12,
							]}
							color={palette.wood}
						/>
						{fidelity.fidelityClass === "LOD0" ||
						fidelity.fidelityClass === "LOD1" ? (
							<>
								<Primitive
									position={[
										-width * 0.28,
										wallHeight * 0.62,
										depth / 2 + 0.04,
									]}
									scale={[0.72, 0.72, 0.08]}
									color={palette.water}
									castShadows={false}
								/>
								<Primitive
									position={[width * 0.28, wallHeight * 0.62, depth / 2 + 0.04]}
									scale={[0.72, 0.72, 0.08]}
									color={palette.water}
									castShadows={false}
								/>
							</>
						) : null}
						<Primitive
							position={[0, ridgeHeight - 0.35, 0]}
							scale={[width + 0.6, 0.7, depth + 0.6]}
							color={palette.clay}
							rotation={[0, 0, 8]}
						/>
						{fidelity.fidelityClass === "LOD3" ? null : (
							<Primitive
								position={[width * 0.28, ridgeHeight + 0.45, -depth * 0.18]}
								scale={[0.58, 1.6, 0.58]}
								color={palette.ink}
							/>
						)}
					</Entity>
				);
			})}
			{model.projects.map((project) => {
				const site = projection.local.sites.find(
					(candidate) => candidate.siteId === project.siteId,
				);
				if (site === undefined)
					throw new Error(`Generated project ${project.projectId} has no site`);
				return (
					<GeneratedProjectProxy
						key={project.projectId}
						project={project}
						position={localPoint(
							{
								x:
									(site.bounds.minimum.xMillimeters +
										site.bounds.maximum.xMillimeters) /
									2,
								y: site.bounds.maximum.elevationMillimeters,
								z:
									(site.bounds.minimum.yMillimeters +
										site.bounds.maximum.yMillimeters) /
									2,
							},
							frame,
						)}
					/>
				);
			})}
			{model.actors.map((actor) => {
				const facingDegrees = renderedActorFacing(projection, model, actor);
				return (
					<Entity
						key={actor.citizenId}
						position={localPoint(renderedActorPoint(projection, actor), frame)}
						scale={[
							scale.citizen.heightMm /
								(GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000),
							scale.citizen.heightMm /
								(GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000),
							scale.citizen.heightMm /
								(GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000),
						]}
					>
						<GeneratedFolkProxy
							actor={
								facingDegrees === actor.facingDegrees
									? actor
									: Object.freeze({ ...actor, facingDegrees })
							}
							position={[0, 0, 0]}
							presentationTick={presentationTick}
							reducedMotion={reducedMotion}
							selected={selectedActorId === actor.citizenId}
						/>
					</Entity>
				);
			})}
			{projection.spatial.interactions.map((interaction) => {
				const participants = interaction.participantIds
					.map((citizenId) =>
						model.actors.find((actor) => actor.citizenId === citizenId),
					)
					.filter((actor) => actor !== undefined);
				const first = participants[0];
				const second = participants[1];
				if (first === undefined || second === undefined) return null;
				const from = localPoint(renderedActorPoint(projection, first), frame);
				const to = localPoint(renderedActorPoint(projection, second), frame);
				return (
					<Entity key={interaction.interactionId}>
						<Route from={from} to={to} color={palette.social} width={0.08} />
						<Primitive
							type="sphere"
							position={[
								(from[0] + to[0]) / 2,
								Math.max(from[1], to[1]) + 2.65,
								(from[2] + to[2]) / 2,
							]}
							scale={[0.22, 0.22, 0.22]}
							color={palette.social}
							castShadows={false}
						/>
					</Entity>
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
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
}) {
	const cameraIntent = cameraIntentForGeneratedNavigation(model, navigation);
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
	return (
		<div
			ref={host}
			className="generated-world-canvas"
			role="img"
			aria-label={`${projection.local.settlement.name}, an embodied generated settlement with ${projection.spatial.actors.length} visible residents. Drag to pan, Alt-drag to orbit, or use the adjacent semantic camera controls.`}
			data-testid="generated-world-canvas"
			data-ready="false"
			data-engine="playcanvas"
			data-folk-renderer="procedural-typed-proxy"
			data-folk-reference-asset={GENERATED_FOLK_ASSET.url}
			data-environment-context="presentation-only-ground-apron"
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
					const position = renderedActorPoint(projection, actor);
					return `${actor.citizenId}:${position.x}:${position.y}:${position.z}`;
				})
				.join(",")}
			data-actor-diagnostics={projection.spatial.actors
				.map(
					(actor) =>
						`${actor.citizenId}|${actor.action.actionId}|${actor.action.destinationPlaceId}|${actor.animationClass}|${actor.interactionTarget ?? "none"}|${actor.prop ?? "none"}|${actor.positionMm.x}:${actor.positionMm.y}:${actor.positionMm.z}`,
				)
				.join(";")}
			data-teleport-count={projection.spatial.teleportCount}
			data-contradiction-count={projection.spatial.contradictionCount}
			data-embodiment-schema={model.schemaVersion}
			data-presentation-tick={presentationTick}
			data-focus-kind={navigation.focus.kind}
			data-following={String(navigation.followCitizen)}
			data-camera-target={cameraIntent.semanticLabel}
			data-camera-distance-mm={effectiveDistanceMm}
			data-camera-yaw-degrees={navigation.yawDegrees}
			data-camera-target-mm={`${cameraIntent.targetMm.x}:${cameraIntent.targetMm.y}:${cameraIntent.targetMm.z}`}
			data-semantic-scale={fidelity.semanticScale}
			data-fidelity-class={fidelity.fidelityClass}
			data-navigation-mode={reducedMotion ? "direct" : "smooth"}
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
					navigation={navigation}
					presentationTick={presentationTick}
					reducedMotion={reducedMotion}
					host={host}
				/>
			</RendererBoundary>
		</div>
	);
}
