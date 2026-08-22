import { Application, Entity } from "@playcanvas/react";
import { Camera, Light, Render } from "@playcanvas/react/components";
import { useApp, useAppEvent } from "@playcanvas/react/hooks";
import {
	advancePresentationClock,
	humanoidPose,
	inspectSpatialProjection,
	projectSpatialScene,
	type SpatialActorProjection,
	type SpatialCitizenInput,
	type SpatialProjection,
} from "@eonfolk/world-presentation";
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
import type { RiverholdProjection } from "../projection";
import { browserDiagnostics } from "../diagnostics";

function material(hex: string): StandardMaterial {
	const value = Number.parseInt(hex.slice(1), 16);
	const result = new StandardMaterial();
	result.diffuse = new Color(
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255,
	);
	result.metalness = 0;
	result.gloss = 0.28;
	result.update();
	return result;
}

const palette = {
	ink: material("#20251f"),
	earth: material("#786347"),
	path: material("#a58456"),
	grass: material("#6f8851"),
	field: material("#a69958"),
	water: material("#4f94a5"),
	waterLight: material("#74b5bc"),
	wall: material("#d3b57e"),
	roof: material("#8a4937"),
	timber: material("#70472d"),
	grain: material("#d7b35d"),
	linen: material("#e1d6ba"),
	mara: material("#3f7d83"),
	maraScarf: material("#c46d39"),
	moss: material("#667047"),
	skin: material("#bb8060"),
	leaf: material("#3e603b"),
	stone: material("#77796f"),
} as const;

type PrimitiveKind = "box" | "cone" | "cylinder" | "plane" | "sphere";

function Primitive({
	type = "box",
	position,
	scale,
	color,
	rotation,
	castShadows = true,
}: {
	readonly type?: PrimitiveKind;
	readonly position: [number, number, number];
	readonly scale: [number, number, number];
	readonly color: StandardMaterial;
	readonly rotation?: [number, number, number];
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

function House({
	x,
	z,
	rotation = 0,
	wide = false,
}: {
	readonly x: number;
	readonly z: number;
	readonly rotation?: number;
	readonly wide?: boolean;
}) {
	return (
		<Entity position={[x, 0, z]} rotation={[0, rotation, 0]}>
			<Primitive
				position={[0, 0.85, 0]}
				scale={[wide ? 3.2 : 2.45, 1.7, 2]}
				color={palette.wall}
			/>
			<Primitive
				position={[0, 1.86, 0]}
				scale={[wide ? 3.6 : 2.85, 0.25, 2.4]}
				color={palette.roof}
				rotation={[0, 0, 10]}
			/>
			<Primitive
				position={[0, 0.58, 1.02]}
				scale={[0.55, 1.14, 0.12]}
				color={palette.ink}
			/>
			<Primitive
				position={[0.88, 1.15, 1.03]}
				scale={[0.4, 0.44, 0.1]}
				color={palette.water}
			/>
		</Entity>
	);
}

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
	return (
		<Entity position={[x, 0, z]} scale={[scale, scale, scale]}>
			<Primitive
				type="cylinder"
				position={[0, 0.75, 0]}
				scale={[0.22, 1.5, 0.22]}
				color={palette.timber}
			/>
			<Primitive
				type="cone"
				position={[0, 2.05, 0]}
				scale={[1.12, 1.95, 1.12]}
				color={palette.leaf}
			/>
		</Entity>
	);
}

function CosmeticRiverMotion({
	reducedMotion,
}: {
	readonly reducedMotion: boolean;
}) {
	const first = useRef<PlayCanvasEntity>(null);
	const second = useRef<PlayCanvasEntity>(null);
	const elapsed = useRef(0);
	useAppEvent("update", (dt) => {
		if (reducedMotion) return;
		elapsed.current += Math.min(dt, 0.1);
		for (const [index, stripe] of [first.current, second.current].entries()) {
			if (stripe === null) continue;
			const z = ((elapsed.current * 0.7 + index * 10) % 20) - 10;
			stripe.setLocalPosition(-8.8, 0.05, z);
		}
	});
	return (
		<>
			<Entity ref={first}>
				<Primitive
					position={[0, 0, 0]}
					scale={[1.65, 0.025, 1.25]}
					color={palette.waterLight}
					castShadows={false}
				/>
			</Entity>
			<Entity ref={second}>
				<Primitive
					position={[0, 0, 0]}
					scale={[1.65, 0.025, 1.25]}
					color={palette.waterLight}
					castShadows={false}
				/>
			</Entity>
		</>
	);
}

function WorldProps() {
	return (
		<>
			<Entity position={[7.8, 0, 5.3]}>
				<Primitive
					type="cylinder"
					position={[-0.3, 0.24, 0]}
					scale={[0.3, 1.25, 0.3]}
					rotation={[90, 0, 0]}
					color={palette.timber}
				/>
				<Primitive
					type="cylinder"
					position={[0.3, 0.24, 0]}
					scale={[0.3, 1.25, 0.3]}
					rotation={[90, 0, 0]}
					color={palette.timber}
				/>
			</Entity>
			<Entity position={[-7.5, 0, 4.3]}>
				<Primitive
					type="cylinder"
					position={[0, 0.45, 0]}
					scale={[0.65, 0.85, 0.65]}
					color={palette.water}
				/>
				<Primitive
					position={[0, 0.95, 0]}
					scale={[0.75, 0.12, 0.75]}
					color={palette.timber}
				/>
			</Entity>
			<Entity position={[-5.2, 0, -9.9]}>
				<Primitive
					position={[-0.4, 0.35, 0]}
					scale={[0.7, 0.7, 0.7]}
					color={palette.grain}
				/>
				<Primitive
					position={[0.4, 0.35, 0.2]}
					scale={[0.7, 0.7, 0.7]}
					color={palette.grain}
				/>
			</Entity>
			<Entity position={[7.5, 0, 1.3]}>
				<Primitive
					position={[0, 0.42, 0]}
					scale={[1.5, 0.22, 0.75]}
					color={palette.timber}
				/>
				<Primitive
					position={[0.35, 0.75, 0]}
					scale={[0.12, 0.7, 0.12]}
					rotation={[0, 0, 36]}
					color={palette.stone}
				/>
			</Entity>
		</>
	);
}

interface ActorRig {
	readonly root: PlayCanvasEntity;
	readonly leftArm: PlayCanvasEntity;
	readonly rightArm: PlayCanvasEntity;
	readonly leftLeg: PlayCanvasEntity;
	readonly rightLeg: PlayCanvasEntity;
	readonly prop: PlayCanvasEntity | null;
}

const citizenMaterials: Readonly<Record<string, StandardMaterial>> = {
	mara: palette.mara,
	toma: palette.linen,
	iven: palette.grain,
	sela: palette.water,
	rowan: palette.timber,
	neri: palette.field,
	odo: palette.roof,
	els: palette.leaf,
};

function CitizenProp({ actor }: { readonly actor: SpatialActorProjection }) {
	if (actor.prop === null) return null;
	if (actor.prop === "logs")
		return (
			<Entity position={[0, 0.92, -0.48]}>
				<Primitive
					type="cylinder"
					position={[-0.2, 0, 0]}
					scale={[0.16, 0.72, 0.16]}
					rotation={[90, 0, 0]}
					color={palette.timber}
				/>
				<Primitive
					type="cylinder"
					position={[0.2, 0, 0]}
					scale={[0.16, 0.72, 0.16]}
					rotation={[90, 0, 0]}
					color={palette.timber}
				/>
			</Entity>
		);
	if (actor.prop === "tool")
		return (
			<Entity position={[0.5, 0.95, -0.12]} rotation={[0, 0, 32]}>
				<Primitive
					position={[0, 0, 0]}
					scale={[0.1, 0.78, 0.1]}
					color={palette.timber}
				/>
				<Primitive
					position={[0, 0.42, 0]}
					scale={[0.48, 0.16, 0.18]}
					color={palette.stone}
				/>
			</Entity>
		);
	const color =
		actor.prop === "water"
			? palette.water
			: actor.prop === "grain"
				? palette.grain
				: palette.earth;
	return (
		<Primitive
			position={[0, 0.92, -0.48]}
			scale={[0.58, 0.42, 0.38]}
			color={color}
		/>
	);
}

function CitizenRig({
	actor,
	register,
}: {
	readonly actor: SpatialActorProjection;
	readonly register: (citizenId: string, rig: ActorRig | null) => void;
}) {
	const root = useRef<PlayCanvasEntity>(null);
	const leftArm = useRef<PlayCanvasEntity>(null);
	const rightArm = useRef<PlayCanvasEntity>(null);
	const leftLeg = useRef<PlayCanvasEntity>(null);
	const rightLeg = useRef<PlayCanvasEntity>(null);
	const prop = useRef<PlayCanvasEntity>(null);
	useEffect(() => {
		if (
			root.current === null ||
			leftArm.current === null ||
			rightArm.current === null ||
			leftLeg.current === null ||
			rightLeg.current === null
		)
			return;
		register(actor.citizenId, {
			root: root.current,
			leftArm: leftArm.current,
			rightArm: rightArm.current,
			leftLeg: leftLeg.current,
			rightLeg: rightLeg.current,
			prop: prop.current,
		});
		return () => register(actor.citizenId, null);
	}, [actor.citizenId, register]);
	const body = citizenMaterials[actor.slug] ?? palette.earth;
	return (
		<Entity
			ref={root}
			name={`citizen:${actor.slug}`}
			scale={[1.16, 1.16, 1.16]}
		>
			<Primitive
				type="sphere"
				position={[0, 1.84, 0]}
				scale={[0.36, 0.42, 0.36]}
				color={palette.skin}
			/>
			<Primitive
				position={[0, 1.18, 0]}
				scale={[0.72, 0.9, 0.42]}
				color={body}
			/>
			<Entity ref={leftArm} position={[-0.5, 1.35, 0]}>
				<Primitive
					position={[0, -0.32, 0]}
					scale={[0.2, 0.72, 0.2]}
					color={body}
				/>
			</Entity>
			<Entity ref={rightArm} position={[0.5, 1.35, 0]}>
				<Primitive
					position={[0, -0.32, 0]}
					scale={[0.2, 0.72, 0.2]}
					color={body}
				/>
			</Entity>
			<Entity ref={leftLeg} position={[-0.22, 0.75, 0]}>
				<Primitive
					position={[0, -0.38, 0]}
					scale={[0.25, 0.82, 0.28]}
					color={palette.ink}
				/>
			</Entity>
			<Entity ref={rightLeg} position={[0.22, 0.75, 0]}>
				<Primitive
					position={[0, -0.38, 0]}
					scale={[0.25, 0.82, 0.28]}
					color={palette.ink}
				/>
			</Entity>
			<Entity ref={prop}>
				<CitizenProp actor={actor} />
			</Entity>
			{actor.slug === "mara" ? (
				<>
					<Primitive
						position={[0, 1.48, -0.25]}
						scale={[0.78, 0.16, 0.5]}
						color={palette.maraScarf}
					/>
					<Primitive
						position={[0, 2.16, 0]}
						scale={[0.5, 0.14, 0.5]}
						color={palette.mara}
					/>
				</>
			) : null}
		</Entity>
	);
}

function poseRig(rig: ActorRig, actor: SpatialActorProjection, tick: number) {
	const pose = humanoidPose(actor.animationClass, tick);
	rig.leftArm.setLocalEulerAngles(pose.leftArmDegrees, 0, 0);
	rig.rightArm.setLocalEulerAngles(pose.rightArmDegrees, 0, 0);
	rig.leftLeg.setLocalEulerAngles(pose.leftLegDegrees, 0, 0);
	rig.rightLeg.setLocalEulerAngles(pose.rightLegDegrees, 0, 0);
	if (rig.prop !== null) {
		const scale =
			actor.prop === null || actor.animationClass === "idle" ? 0 : 1;
		rig.prop.setLocalScale(scale, scale, scale);
	}
}

function WorldController({
	projection,
	reducedMotion,
	host,
	rigs,
	exchangeProp,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
	readonly rigs: RefObject<Map<string, ActorRig>>;
	readonly exchangeProp: RefObject<PlayCanvasEntity | null>;
}) {
	const clock = useRef({ tick: 0, accumulatorMs: 0 });
	const previousProjection = useRef<SpatialProjection | null>(null);
	const recordedSource = useRef<string | null>(null);
	const recordedMismatch = useRef<string | null>(null);
	const inputs = useMemo<readonly SpatialCitizenInput[]>(
		() =>
			projection.citizens.map((citizen) => ({
				citizenId: citizen.id,
				slug: citizen.slug,
				name: citizen.name,
				role: citizen.role,
				placeId: citizen.placeId,
				activity: citizen.activity,
				activityKind: citizen.activityKind,
				focal: citizen.focal === true,
				canonicalAction: citizen.canonicalAction,
			})),
		[projection.citizens],
	);
	useEffect(() => {
		clock.current = { tick: 0, accumulatorMs: 0 };
		previousProjection.current = null;
		recordedSource.current = null;
		recordedMismatch.current = null;
	}, [projection.spatial.source.stateHash]);
	useAppEvent("update", (dt) => {
		clock.current = advancePresentationClock(
			clock.current,
			Math.min(dt, 0.1) * 1_000,
		);
		const sampled = projectSpatialScene({
			source: projection.spatial.source,
			citizens: inputs,
			presentationTick: clock.current.tick,
		});
		const inspection = inspectSpatialProjection(
			sampled,
			previousProjection.current,
		);
		previousProjection.current = sampled;
		for (const actor of sampled.actors) {
			const rig = rigs.current.get(actor.citizenId);
			if (rig === undefined) continue;
			rig.root.setLocalPosition(
				actor.positionMm.x / 1_000,
				0,
				actor.positionMm.z / 1_000,
			);
			rig.root.setLocalEulerAngles(0, actor.facingDegrees, 0);
			poseRig(
				rig,
				actor,
				reducedMotion ? Math.floor(clock.current.tick / 3) : clock.current.tick,
			);
		}
		const exchange = sampled.interactions.find(
			(interaction) => interaction.kind === "exchange",
		);
		const first = sampled.actors.find(
			(actor) => actor.citizenId === exchange?.participantIds[0],
		);
		const second = sampled.actors.find(
			(actor) => actor.citizenId === exchange?.participantIds[1],
		);
		if (
			exchangeProp.current !== null &&
			exchange !== undefined &&
			first !== undefined &&
			second !== undefined
		) {
			const progress = (clock.current.tick % 90) / 90;
			exchangeProp.current.setLocalPosition(
				(first.positionMm.x +
					(second.positionMm.x - first.positionMm.x) * progress) /
					1_000,
				1.12 + Math.sin(progress * Math.PI) * 0.16,
				(first.positionMm.z +
					(second.positionMm.z - first.positionMm.z) * progress) /
					1_000,
			);
			exchangeProp.current.setLocalScale(1, 1, 1);
		} else if (exchangeProp.current !== null) {
			exchangeProp.current.setLocalScale(0, 0, 0);
		}
		if (host.current !== null) {
			host.current.dataset.presentationTick = String(sampled.presentationTick);
			host.current.dataset.movingCitizens = String(sampled.movingCitizenCount);
			host.current.dataset.animationClasses =
				sampled.animationClasses.join(",");
			host.current.dataset.canonicalLinks = String(
				sampled.canonicalEventLinkCount,
			);
			host.current.dataset.interactions = String(sampled.interactions.length);
			host.current.dataset.exchangeTransfer =
				exchange === undefined ? "none" : "visible";
			host.current.dataset.teleports = String(inspection.teleportCount);
			host.current.dataset.contradictions = String(
				inspection.contradictionCount,
			);
		}
		const sourceKey = `${sampled.source.stateHash}:${sampled.source.throughSequence}`;
		if (recordedSource.current !== sourceKey) {
			recordedSource.current = sourceKey;
			browserDiagnostics.record({
				category: "presentation",
				name: "spatial-projection-observed",
				severity: "info",
				outcome: "observed",
				scope: {
					component: "world-presentation",
					runId: sampled.source.runId,
					regionId: sampled.source.regionId,
				},
				fields: {
					projectionVersion: sampled.schemaVersion,
					sceneVersion: sampled.sceneVersion,
					sourceSequence: sampled.source.throughSequence,
					actorCount: sampled.actors.length,
					interactionCount: sampled.interactions.length,
				},
			});
		}
		const firstMismatch = inspection.mismatches[0];
		if (firstMismatch !== undefined) {
			const mismatchKey = `${sourceKey}:${firstMismatch.code}:${firstMismatch.actorId ?? "none"}`;
			if (recordedMismatch.current !== mismatchKey) {
				recordedMismatch.current = mismatchKey;
				browserDiagnostics.record({
					category: "presentation",
					name: "spatial-projection-mismatch",
					severity: "error",
					outcome: "failed",
					scope: {
						component: "world-presentation",
						runId: sampled.source.runId,
						regionId: sampled.source.regionId,
					},
					fields: {
						mismatchCode: firstMismatch.code,
						actionKind: firstMismatch.actionKind ?? "none",
						displayedAction: firstMismatch.displayedAnimation ?? "none",
						distanceMm: firstMismatch.distanceMm ?? 0,
						clockTick: sampled.presentationTick,
					},
				});
			}
		}
	});
	return null;
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
		if (ready.current) return;
		ready.current = true;
		requestAnimationFrame(() => {
			if (host.current === null) return;
			host.current.dataset.ready = "true";
			host.current.dataset.engine = "playcanvas";
			host.current.dataset.deviceType = app.graphicsDevice.deviceType;
			host.current.dataset.pixelRatio = String(
				app.graphicsDevice.width / Math.max(1, host.current.clientWidth),
			);
			performance.mark("world-presence-ready");
		});
	});
	return null;
}

function Settlement({
	projection,
	reducedMotion,
	host,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
}) {
	const rigs = useRef(new Map<string, ActorRig>());
	const exchangeProp = useRef<PlayCanvasEntity>(null);
	const register = useMemo(
		() => (citizenId: string, rig: ActorRig | null) => {
			if (rig === null) rigs.current.delete(citizenId);
			else rigs.current.set(citizenId, rig);
		},
		[],
	);
	const trees = [
		[-10, -5, 1.05],
		[-9, 4, 0.9],
		[9.5, -4.5, 1.05],
		[10, 5.5, 0.9],
		[7, 9, 0.85],
		[-6.8, 8, 1.1],
	] as const;
	return (
		<Application
			deviceTypes={[DEVICETYPE_WEBGL2]}
			className="riverhold-playcanvas"
		>
			<SceneProbe host={host} />
			<WorldController
				projection={projection}
				reducedMotion={reducedMotion}
				host={host}
				rigs={rigs}
				exchangeProp={exchangeProp}
			/>
			<Entity position={[14, 14, 18]} rotation={[-31, 38, 0]}>
				<Camera clearColor="#afc5c1" fov={41} farClip={90} />
			</Entity>
			<Entity rotation={[42, -35, 0]}>
				<Light
					type="directional"
					color="#ffedca"
					intensity={1.55}
					castShadows
					shadowResolution={1024}
				/>
			</Entity>
			<Entity position={[0, 8, 0]}>
				<Light type="omni" color="#86aee2" intensity={0.24} range={35} />
			</Entity>
			<Primitive
				position={[0, -0.24, 0]}
				scale={[24, 0.4, 25]}
				color={palette.grass}
			/>
			<Primitive
				position={[0, -0.01, 0]}
				scale={[4.2, 0.08, 22]}
				color={palette.path}
			/>
			<Primitive
				position={[-8.8, 0, 0]}
				scale={[2.3, 0.08, 25]}
				color={palette.water}
				castShadows={false}
			/>
			<CosmeticRiverMotion reducedMotion={reducedMotion} />
			<Primitive
				position={[-4.8, -0.01, -10]}
				scale={[6.8, 0.08, 4.7]}
				color={palette.field}
			/>
			<House x={-2.7} z={-7} rotation={-6} wide />
			<House x={2.8} z={-3.8} rotation={7} />
			<House x={-3.4} z={3.4} rotation={10} />
			<House x={3.6} z={4.3} rotation={-8} />
			<Entity position={[0.8, 0, 0.5]}>
				<Primitive
					type="cylinder"
					position={[0, 0.42, 0]}
					scale={[2.2, 0.46, 2.2]}
					color={palette.earth}
				/>
				<Primitive
					position={[0, 1.08, 0]}
					scale={[2.6, 0.17, 1.35]}
					color={palette.timber}
				/>
				<Primitive
					position={[0, 1.42, 0]}
					scale={[1.2, 0.62, 0.92]}
					color={palette.grain}
				/>
			</Entity>
			<Entity position={[6.7, 0, 0]}>
				<Primitive
					position={[0, 1.05, 0]}
					scale={[1.7, 2.1, 1.7]}
					color={palette.wall}
				/>
				<Primitive
					type="cylinder"
					position={[0, 2.75, 0]}
					scale={[0.72, 1.75, 0.72]}
					color={palette.wall}
				/>
				<Primitive
					position={[0, 2.75, 0.86]}
					scale={[0.15, 3.5, 0.15]}
					color={palette.timber}
					rotation={[0, 0, reducedMotion ? 0 : 12]}
				/>
				<Primitive
					position={[0, 2.75, 0.86]}
					scale={[3.5, 0.15, 0.15]}
					color={
						projection.worldProcesses.millRepaired
							? palette.moss
							: palette.timber
					}
					rotation={[
						0,
						0,
						projection.worldProcesses.millRepaired || reducedMotion ? 0 : 12,
					]}
				/>
				{projection.worldProcesses.millRepaired ? (
					<Primitive
						position={[0, 1.25, 0.9]}
						scale={[1.2, 0.18, 0.18]}
						color={palette.moss}
					/>
				) : null}
			</Entity>
			<Entity ref={exchangeProp} scale={[0, 0, 0]}>
				<Primitive
					position={[0, 0, 0]}
					scale={[0.42, 0.3, 0.32]}
					color={palette.earth}
				/>
			</Entity>
			<WorldProps />
			{trees.map(([x, z, scale]) => (
				<Tree key={`${x}:${z}`} x={x} z={z} scale={scale} />
			))}
			{projection.spatial.actors.map((actor) => (
				<CitizenRig key={actor.citizenId} actor={actor} register={register} />
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

function CheckedSettlement({
	projection,
	reducedMotion,
	host,
	onFailure,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLDivElement | null>;
	readonly onFailure: () => void;
}) {
	const injectedFailure =
		sessionStorage.getItem("eonfolk:e2e-renderer-failure") === "1";
	useEffect(() => {
		if (injectedFailure) onFailure();
	}, [injectedFailure, onFailure]);
	if (injectedFailure) return null;
	return (
		<Settlement
			projection={projection}
			reducedMotion={reducedMotion}
			host={host}
		/>
	);
}

export function RiverholdWorld({
	projection,
	reducedMotion,
	onFailure,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
}) {
	const host = useRef<HTMLDivElement>(null);
	return (
		<div
			ref={host}
			className="world-canvas"
			aria-hidden="true"
			data-testid="riverhold-canvas"
			data-ready="false"
			data-engine="playcanvas"
			data-cosmetic-processes="river-flow"
			data-mill-state={
				projection.worldProcesses.millRepaired ? "repaired" : "needs-repair"
			}
		>
			<RendererBoundary onFailure={onFailure}>
				<CheckedSettlement
					projection={projection}
					reducedMotion={reducedMotion}
					host={host}
					onFailure={onFailure}
				/>
			</RendererBoundary>
		</div>
	);
}
