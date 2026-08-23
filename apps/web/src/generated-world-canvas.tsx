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
import { GeneratedFolkProxy } from "./components/generated/GeneratedFolkProxy";
import { GeneratedProjectProxy } from "./components/generated/GeneratedProjectProxy";
import {
	cameraIntentForGeneratedNavigation,
	type GeneratedEmbodiedActor,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationState,
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
	result.update();
	return result;
}

const palette = Object.freeze({
	ground: material("#718158"),
	path: material("#a8895d"),
	water: material("#5d9aaa"),
	wood: material("#755137"),
	stone: material("#8c8c80"),
	civic: material("#d7bd86"),
	field: material("#b7a75f"),
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
	if (interaction === undefined) return actor.positionMm;
	const ordinal = interaction.participantIds.indexOf(actor.citizenId);
	const canonicalActor = projection.spatial.actors.find(
		(candidate) => candidate.citizenId === actor.citizenId,
	);
	const slotId = canonicalActor?.action.affordanceId;
	const node =
		slotId === null || slotId === undefined
			? undefined
			: projection.scene.nodes[slotId];
	if (node === undefined || ordinal < 0) return actor.positionMm;
	const offset =
		(ordinal - (interaction.participantIds.length - 1) / 2) *
		node.occupantSpacingMm;
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
	model,
	navigation,
}: {
	readonly frame: Frame;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
}) {
	const camera = useRef<PlayCanvasEntity>(null);
	const intent = useMemo(
		() => cameraIntentForGeneratedNavigation(model, navigation),
		[model, navigation],
	);
	const target = localPoint(intent.targetMm, frame);
	const requestedDistance = intent.distanceMm / 1_000;
	const distance =
		navigation.focus.kind === "overview"
			? Math.max(requestedDistance, Math.max(frame.width, frame.depth) * 0.9)
			: requestedDistance;
	const yaw = (intent.yawDegrees * Math.PI) / 180;
	const pitch = (intent.pitchDegrees * Math.PI) / 180;
	const horizontalDistance = Math.cos(pitch) * distance;
	const position: [number, number, number] = [
		target[0] + Math.sin(yaw) * horizontalDistance,
		target[1] - Math.sin(pitch) * distance,
		target[2] + Math.cos(yaw) * horizontalDistance,
	];
	useEffect(() => {
		camera.current?.lookAt(target[0], target[1], target[2]);
	}, [target]);
	return (
		<Entity ref={camera} position={position}>
			<Camera
				clearColor="#a9b9a8"
				fov={42}
				farClip={Math.max(600, distance * 4)}
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
			position={[(from[0] + to[0]) / 2, 0.04, (from[2] + to[2]) / 2]}
			scale={[width, 0.08, Math.max(0.1, length)]}
			rotation={[0, (Math.atan2(dx, dz) * 180) / Math.PI, 0]}
			color={color}
			castShadows={false}
		/>
	);
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
	const selectedActorId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="generated-playcanvas"
		>
			<SceneProbe host={host} />
			<GeneratedCamera frame={frame} model={model} navigation={navigation} />
			<Entity rotation={[48, -28, 0]}>
				<Light
					type="directional"
					color="#ffedcb"
					intensity={1.05}
					castShadows
				/>
			</Entity>
			<Primitive
				position={[0, -0.2, 0]}
				scale={[frame.width + 12, 0.4, frame.depth + 12]}
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
					<Primitive
						key={site.siteId}
						position={[position[0], 0.02, position[2]]}
						scale={[Math.max(2, width), 0.08, Math.max(2, depth)]}
						color={color}
						castShadows={false}
					/>
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
				return (
					<Entity key={building.buildingId} position={point}>
						<Primitive
							position={[0, 1.5, 0]}
							scale={[4.8, 3, 4]}
							color={palette.civic}
						/>
						<Primitive
							position={[0, 3.25, 0]}
							scale={[5.4, 0.6, 4.6]}
							color={palette.ink}
							rotation={[0, 0, 8]}
						/>
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
					<GeneratedFolkProxy
						key={actor.citizenId}
						actor={
							facingDegrees === actor.facingDegrees
								? actor
								: Object.freeze({ ...actor, facingDegrees })
						}
						position={localPoint(renderedActorPoint(projection, actor), frame)}
						presentationTick={presentationTick}
						reducedMotion={reducedMotion}
						selected={selectedActorId === actor.citizenId}
					/>
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
	const host = useRef<HTMLDivElement>(null);
	return (
		<div
			ref={host}
			className="generated-world-canvas"
			role="img"
			aria-label={`${projection.local.settlement.name}, an embodied generated settlement with ${projection.spatial.actors.length} visible residents`}
			data-testid="generated-world-canvas"
			data-ready="false"
			data-engine="playcanvas"
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
