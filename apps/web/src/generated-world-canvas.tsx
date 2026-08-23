import type {
	GeneratedCivilizationSpatialProjection,
	SpatialActorProjection,
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
	resident: material("#3f7d83"),
	focal: material("#d27643"),
	selected: material("#e8dba6"),
	ink: material("#242921"),
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

function GeneratedCamera({ frame }: { readonly frame: Frame }) {
	const camera = useRef<PlayCanvasEntity>(null);
	useEffect(() => {
		camera.current?.lookAt(0, 0, 0);
	}, [frame]);
	const distance = Math.max(frame.width, frame.depth) * 0.9;
	return (
		<Entity ref={camera} position={[distance * 0.72, distance, distance * 0.8]}>
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
}: {
	readonly from: [number, number, number];
	readonly to: [number, number, number];
}) {
	const dx = to[0] - from[0];
	const dz = to[2] - from[2];
	const length = Math.hypot(dx, dz);
	return (
		<Primitive
			position={[(from[0] + to[0]) / 2, 0.04, (from[2] + to[2]) / 2]}
			scale={[0.75, 0.08, Math.max(0.1, length)]}
			rotation={[0, (Math.atan2(dx, dz) * 180) / Math.PI, 0]}
			color={palette.path}
			castShadows={false}
		/>
	);
}

function Citizen({
	actor,
	frame,
	reducedMotion,
	selected,
}: {
	readonly actor: SpatialActorProjection;
	readonly frame: Frame;
	readonly reducedMotion: boolean;
	readonly selected: boolean;
}) {
	const root = useRef<PlayCanvasEntity>(null);
	const position = localPoint(actor.positionMm, frame);
	useAppEvent("update", () => {
		if (root.current === null) return;
		const motion = reducedMotion
			? 0
			: Math.sin(performance.now() / 260 + actor.citizenId.length) * 0.07;
		root.current.setLocalPosition(
			position[0],
			position[1] + motion,
			position[2],
		);
	});
	return (
		<Entity
			ref={root}
			position={position}
			rotation={[0, actor.facingDegrees, 0]}
		>
			{selected || actor.focal ? (
				<Primitive
					type="cylinder"
					position={[0, 0.03, 0]}
					scale={[selected ? 1.35 : 1, 0.04, selected ? 1.35 : 1]}
					color={selected ? palette.selected : palette.focal}
					castShadows={false}
				/>
			) : null}
			<Primitive
				position={[0, 0.9, 0]}
				scale={[0.62, 1.15, 0.42]}
				color={actor.focal ? palette.focal : palette.resident}
			/>
			<Primitive
				type="sphere"
				position={[0, 1.72, 0]}
				scale={[0.42, 0.42, 0.42]}
				color={palette.selected}
			/>
			{actor.prop === null ? null : (
				<Primitive
					position={[0.48, 0.82, 0]}
					scale={[0.34, 0.34, 0.34]}
					color={actor.prop === "water" ? palette.water : palette.wood}
				/>
			)}
		</Entity>
	);
}

function GroundedSettlement({
	projection,
	reducedMotion,
	selectedActorId,
	host,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly reducedMotion: boolean;
	readonly selectedActorId: string | null;
	readonly host: RefObject<HTMLDivElement | null>;
}) {
	const frame = useMemo(() => sceneFrame(projection), [projection]);
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="generated-playcanvas"
		>
			<SceneProbe host={host} />
			<GeneratedCamera frame={frame} />
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
			{projection.local.routes.flatMap((route) =>
				route.waypoints.slice(0, -1).map((point, index) => {
					const next = route.waypoints[index + 1];
					if (next === undefined) return null;
					return (
						<Route
							key={`${route.routeId}:${point.xMillimeters}:${point.yMillimeters}`}
							from={localPoint(
								{
									x: point.xMillimeters,
									y: point.elevationMillimeters,
									z: point.yMillimeters,
								},
								frame,
							)}
							to={localPoint(
								{
									x: next.xMillimeters,
									y: next.elevationMillimeters,
									z: next.yMillimeters,
								},
								frame,
							)}
						/>
					);
				}),
			)}
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
				const color =
					site.kind === "resource"
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
			{projection.spatial.actors.map((actor) => (
				<Citizen
					key={actor.citizenId}
					actor={actor}
					frame={frame}
					reducedMotion={reducedMotion}
					selected={selectedActorId === actor.citizenId}
				/>
			))}
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
	reducedMotion,
	selectedActorId,
	onFailure,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly reducedMotion: boolean;
	readonly selectedActorId: string | null;
	readonly onFailure: () => void;
}) {
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
			data-animation-classes={projection.spatial.animationClasses.join(",")}
		>
			<RendererBoundary onFailure={onFailure}>
				<GroundedSettlement
					projection={projection}
					reducedMotion={reducedMotion}
					selectedActorId={selectedActorId}
					host={host}
				/>
			</RendererBoundary>
		</div>
	);
}
