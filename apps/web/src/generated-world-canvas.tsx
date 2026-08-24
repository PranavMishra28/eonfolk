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
	GENERATED_FOLK_SOURCE_HEIGHT_UNITS,
	GeneratedFolkProxy,
} from "./components/generated/GeneratedFolkProxy";
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
	generatedTraversalPointAtTick,
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

const OVERVIEW_FRAME_DISTANCE_FACTOR = 0.41;
const OVERVIEW_YAW_OFFSET_DEGREES = 138;
const OVERVIEW_PITCH_OFFSET_DEGREES = 8;

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
	presentationTick = 48,
): SpatialPointMm {
	const interaction = projection.spatial.interactions.find((candidate) =>
		candidate.participantIds.includes(actor.citizenId),
	);
	const canonicalActor = projection.spatial.actors.find(
		(candidate) => candidate.citizenId === actor.citizenId,
	);
	if (actor.grounding.kind === "route")
		return generatedTraversalPointAtTick(actor.grounding, presentationTick);
	const slotId =
		actor.grounding.interactionSlotId ?? canonicalActor?.action.affordanceId;
	const participantIds = interaction?.participantIds ?? [actor.citizenId];
	const ordinal = participantIds.indexOf(actor.citizenId);
	const node =
		slotId === null || slotId === undefined
			? undefined
			: projection.scene.nodes[slotId];
	if (node === undefined || ordinal < 0) return actor.positionMm;
	const offset =
		(ordinal - (participantIds.length - 1) / 2) *
		Math.max(2_200, node.occupantSpacingMm);
	const angle = (node.facingDegrees * Math.PI) / 180;
	const clearance = Math.max(6_000, node.occupantSpacingMm);
	return {
		x: Math.round(node.x + Math.cos(angle) * offset),
		y: node.y,
		z: Math.round(node.z - Math.sin(angle) * offset - clearance),
	};
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
	const pointer = useRef<{
		id: number;
		x: number;
		y: number;
		startX: number;
		startY: number;
	} | null>(null);
	const navigationRef = useRef(navigation);
	navigationRef.current = navigation;
	const requested = useMemo(
		() => cameraIntentForGeneratedNavigation(projection, model, navigation),
		[model, navigation, projection],
	);
	const desired = useMemo<GeneratedCameraIntent>(() => {
		const focus = navigation.focus;
		const actor =
			focus.kind === "citizen"
				? model.actors.find(({ citizenId }) => citizenId === focus.citizenId)
				: undefined;
		const actorPoint =
			actor === undefined ? undefined : renderedActorPoint(projection, actor);
		const overviewMinimumMm = Math.round(
			Math.max(frame.width, frame.depth) *
				OVERVIEW_FRAME_DISTANCE_FACTOR *
				1_000,
		);
		return Object.freeze({
			...requested,
			targetMm:
				actorPoint === undefined
					? focus.kind === "overview"
						? { ...requested.targetMm, z: requested.targetMm.z + 4_000 }
						: requested.targetMm
					: {
							...actorPoint,
							y: actorPoint.y + 1_000,
							z:
								actorPoint.z -
								((host.current?.clientWidth ?? 800) < 600 ? 800 : 2_400),
						},
			yawDegrees:
				focus.kind === "overview"
					? requested.yawDegrees + OVERVIEW_YAW_OFFSET_DEGREES
					: focus.kind === "citizen"
						? requested.yawDegrees + 48
						: requested.yawDegrees,
			pitchDegrees:
				focus.kind === "overview"
					? requested.pitchDegrees + OVERVIEW_PITCH_OFFSET_DEGREES
					: focus.kind === "citizen"
						? requested.pitchDegrees + 14
						: requested.pitchDegrees,
			distanceMm:
				focus.kind === "overview"
					? Math.max(requested.distanceMm, overviewMinimumMm)
					: requested.distanceMm,
		});
	}, [frame, model.actors, navigation.focus, projection, requested]);
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
			const yaw =
				((state.yawDegrees +
					(state.focus.kind === "overview" ? OVERVIEW_YAW_OFFSET_DEGREES : 0)) *
					Math.PI) /
				180;
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
			const threshold = event.pointerType === "touch" ? 42 : 28;
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
			<Camera clearColor="#a9b9a8" fov={46} farClip={720} nearClip={0.2} />
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
	const fields = [-0.18, 0.22] as const;
	return (
		<Entity name="cosmetic-landscape">
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
}: {
	readonly position: [number, number, number];
	readonly width: number;
	readonly depth: number;
	readonly ridgeHeight: number;
	readonly doorHeight: number;
}) {
	const wallHeight = ridgeHeight * 0.62;
	return (
		<Entity position={position}>
			<Primitive
				position={[0, 0.16, 0]}
				scale={[width + 0.45, 0.32, depth + 0.45]}
				color={palette.stone}
			/>
			<Primitive
				position={[0, wallHeight / 2 + 0.26, 0]}
				scale={[width, wallHeight, depth]}
				color={palette.civic}
			/>
			{[-1, 1].map((side) => (
				<Primitive
					key={side}
					position={[side * width * 0.23, ridgeHeight - 0.18, 0]}
					scale={[width * 0.58, 0.46, depth + 0.9]}
					rotation={[0, 0, -side * 27]}
					color={palette.clay}
				/>
			))}
			<Primitive
				position={[0, doorHeight / 2 + 0.25, depth / 2 + 0.04]}
				scale={[1.05, doorHeight, 0.12]}
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
	host,
	onFailure,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly frame: Frame;
	readonly fidelity: ReturnType<typeof generatedCameraFidelity>;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
	readonly onFailure: () => void;
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
	].join("|");
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="generated-playcanvas"
		>
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
			<Entity rotation={[48, 152, 0]}>
				<Light type="directional" color="#dce6c4" intensity={0.95} />
			</Entity>
			<Primitive
				position={[0, -0.2, 0]}
				scale={[frame.width + 180, 0.4, frame.depth + 180]}
				color={palette.ground}
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
				const color = model.growth.addedSiteIds.includes(site.siteId)
					? palette.changed
					: site.kind === "resource"
						? palette.leaf
						: site.kind === "civic"
							? palette.path
							: site.kind === "storage"
								? palette.soil
								: palette.field;
				return (
					<Entity key={site.siteId}>
						<Primitive
							type="sphere"
							position={[position[0], -0.32, position[2]]}
							scale={[
								Math.max(2, width * 0.64),
								0.68,
								Math.max(2, depth * 0.64),
							]}
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
				return (
					<VernacularBuilding
						key={building.buildingId}
						position={point}
						width={width}
						depth={depth}
						ridgeHeight={ridgeHeight}
						doorHeight={scale.door.heightMm / 1_000}
					/>
				);
			})}
			{model.actors.map((actor) => {
				const facingDegrees = renderedActorFacing(projection, model, actor);
				const actorScale =
					scale.citizen.heightMm / (GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000);
				const actorPoint = localPoint(
					renderedActorPoint(
						projection,
						actor,
						reducedMotion ? 48 : presentationTick,
					),
					frame,
				);
				return (
					<Entity
						key={actor.citizenId}
						position={actorPoint}
						scale={[actorScale, actorScale, actorScale]}
					>
						<GeneratedFolkProxy
							actor={
								facingDegrees === actor.facingDegrees
									? actor
									: { ...actor, facingDegrees }
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
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
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
	return (
		<div
			ref={host}
			className="generated-world-canvas"
			role="img"
			aria-label={`${projection.local.settlement.name}, settlement with ${projection.spatial.actors.length} residents. Drag to pan, scroll to zoom, or use semantic camera controls.`}
			data-testid="generated-world-canvas"
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
						reducedMotion ? 48 : presentationTick,
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
			data-teleport-count={projection.spatial.teleportCount}
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
			data-camera-yaw-degrees={
				navigation.yawDegrees +
				(navigation.focus.kind === "overview" ? OVERVIEW_YAW_OFFSET_DEGREES : 0)
			}
			data-camera-pitch-degrees={
				navigation.pitchDegrees +
				(navigation.focus.kind === "overview"
					? OVERVIEW_PITCH_OFFSET_DEGREES
					: 0)
			}
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
					host={host}
					onFailure={onFailure}
				/>
			</RendererBoundary>
		</div>
	);
}
