import {
	advancePresentationClock,
	humanoidPose,
	inspectSpatialProjection,
	projectPresentationResidency,
	projectSpatialScene,
	riverholdPhysicalScale,
	riverholdSpatialScene,
	type SemanticScale,
	type SpatialActorProjection,
	type SpatialCitizenInput,
	type SpatialProjection,
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
import { browserDiagnostics } from "../diagnostics";
import type { RiverholdProjection } from "../projection";

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

const metres = (millimetres: number) => millimetres / 1_000;
const physicalScale = Object.freeze({
	citizenHeight: metres(riverholdPhysicalScale.citizen.heightMm),
	doorHeight: metres(riverholdPhysicalScale.door.heightMm),
	doorWidth: metres(riverholdPhysicalScale.door.widthMm),
	houseWidth: metres(riverholdPhysicalScale.house.widthMm),
	houseDepth: metres(riverholdPhysicalScale.house.depthMm),
	houseRidgeHeight: metres(riverholdPhysicalScale.house.ridgeHeightMm),
	primaryRoadWidth: metres(riverholdPhysicalScale.road.primaryWidthMm),
	footpathWidth: metres(riverholdPhysicalScale.road.footpathWidthMm),
	treeHeight: metres(riverholdPhysicalScale.tree.matureHeightMm),
	treeCanopy: metres(riverholdPhysicalScale.tree.canopyDiameterMm),
	marketDiameter: metres(riverholdPhysicalScale.market.clearDiameterMm),
	marketStallWidth: metres(riverholdPhysicalScale.market.stallWidthMm),
	millWidth: metres(riverholdPhysicalScale.mill.widthMm),
	millDepth: metres(riverholdPhysicalScale.mill.depthMm),
	millRidgeHeight: metres(riverholdPhysicalScale.mill.ridgeHeightMm),
	millWheelDiameter: metres(riverholdPhysicalScale.mill.wheelDiameterMm),
});

const CITIZEN_RIG_HEIGHT = 2.3;

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
	const width = physicalScale.houseWidth * (wide ? 1.25 : 1);
	const depth = physicalScale.houseDepth * (wide ? 1.12 : 1);
	const wallHeight = physicalScale.houseRidgeHeight * 0.63;
	return (
		<Entity position={[x, 0, z]} rotation={[0, rotation, 0]}>
			<Primitive
				position={[0, wallHeight / 2, 0]}
				scale={[width, wallHeight, depth]}
				color={palette.wall}
			/>
			<Primitive
				position={[0, physicalScale.houseRidgeHeight - 0.25, 0]}
				scale={[width + 0.8, 0.5, depth + 0.7]}
				color={palette.roof}
				rotation={[0, 0, 10]}
			/>
			<Primitive
				position={[0, physicalScale.doorHeight / 2, depth / 2 + 0.02]}
				scale={[physicalScale.doorWidth, physicalScale.doorHeight, 0.16]}
				color={palette.ink}
			/>
			<Primitive
				position={[width * 0.3, 2.05, depth / 2 + 0.03]}
				scale={[1.05, 0.9, 0.12]}
				color={palette.water}
			/>
		</Entity>
	);
}

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
	const trunkHeight = physicalScale.treeHeight * 0.4;
	const canopyHeight = physicalScale.treeHeight - trunkHeight;
	return (
		<Entity position={[x, 0, z]} scale={[scale, scale, scale]}>
			<Primitive
				type="cylinder"
				position={[0, trunkHeight / 2, 0]}
				scale={[0.55, trunkHeight, 0.55]}
				color={palette.timber}
			/>
			<Primitive
				type="cone"
				position={[0, trunkHeight + canopyHeight / 2, 0]}
				scale={[
					physicalScale.treeCanopy,
					canopyHeight,
					physicalScale.treeCanopy,
				]}
				color={palette.leaf}
			/>
		</Entity>
	);
}

function MarketStall({
	x,
	z,
	rotation,
	canopy,
}: {
	readonly x: number;
	readonly z: number;
	readonly rotation: number;
	readonly canopy: StandardMaterial;
}) {
	const halfWidth = physicalScale.marketStallWidth / 2;
	return (
		<Entity position={[x, 0, z]} rotation={[0, rotation, 0]}>
			<Primitive
				position={[0, 0.82, 0]}
				scale={[physicalScale.marketStallWidth, 0.18, 1.35]}
				color={palette.timber}
			/>
			{[-halfWidth + 0.12, halfWidth - 0.12].map((postX) => (
				<Primitive
					key={postX}
					position={[postX, 1.45, 0]}
					scale={[0.14, 2.65, 0.14]}
					color={palette.timber}
				/>
			))}
			<Primitive
				position={[0, 2.72, 0]}
				scale={[physicalScale.marketStallWidth + 0.45, 0.22, 1.8]}
				color={canopy}
			/>
			<Primitive
				position={[0.75, 1.05, 0]}
				scale={[0.48, 0.42, 0.48]}
				color={palette.grain}
			/>
		</Entity>
	);
}

function ConversationIndicator() {
	return (
		<Entity position={[0.25, 2.6, 2.2]}>
			{[-0.38, 0, 0.38].map((x, index) => (
				<Primitive
					key={x}
					type="sphere"
					position={[x, index === 1 ? 0.14 : 0, 0]}
					scale={[0.22, 0.22, 0.22]}
					color={palette.linen}
					castShadows={false}
				/>
			))}
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
			const z = ((elapsed.current * 2.1 + index * 58) % 116) - 58;
			stripe.setLocalPosition(-72, 0.05, z);
		}
	});
	return (
		<>
			<Entity ref={first}>
				<Primitive
					position={[0, 0, 0]}
					scale={[14, 0.025, 4]}
					color={palette.waterLight}
					castShadows={false}
				/>
			</Entity>
			<Entity ref={second}>
				<Primitive
					position={[0, 0, 0]}
					scale={[14, 0.025, 4]}
					color={palette.waterLight}
					castShadows={false}
				/>
			</Entity>
		</>
	);
}

function WorldProps({
	projection,
}: {
	readonly projection: RiverholdProjection;
}) {
	const woodScale = Math.max(
		0.35,
		Math.min(1.4, projection.resources.wood / 10),
	);
	const foodScale = Math.max(
		0.35,
		Math.min(1.4, projection.resources.food / 30),
	);
	return (
		<>
			<Entity position={[40, 0, 13]} scale={[woodScale, woodScale, woodScale]}>
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
			<Entity position={[-47, 0, 26]}>
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
			<Entity
				position={[-16, 0, -28]}
				scale={[foodScale, foodScale, foodScale]}
			>
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
			<Entity position={[43, 0, 5]}>
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

export type WorldFocus =
	| { readonly kind: "overview" }
	| { readonly kind: "citizen"; readonly id: string; readonly follow: boolean }
	| { readonly kind: "place"; readonly id: string };

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
	semanticScale,
}: {
	readonly actor: SpatialActorProjection;
	readonly register: (citizenId: string, rig: ActorRig | null) => void;
	readonly semanticScale: SemanticScale;
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
			scale={[
				physicalScale.citizenHeight / CITIZEN_RIG_HEIGHT,
				physicalScale.citizenHeight / CITIZEN_RIG_HEIGHT,
				physicalScale.citizenHeight / CITIZEN_RIG_HEIGHT,
			]}
		>
			{actor.focal || semanticScale === "region" ? (
				<Primitive
					type="cylinder"
					position={[0, 0.03, 0]}
					scale={[actor.focal ? 1.5 : 0.85, 0.04, actor.focal ? 1.5 : 0.85]}
					color={actor.focal ? palette.maraScarf : palette.linen}
					castShadows={false}
				/>
			) : null}
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
	readonly host: RefObject<HTMLButtonElement | null>;
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
				carriedProp: citizen.carriedProp,
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
		const exchangeTransferStatus =
			exchange === undefined
				? "none"
				: exchange.status === "in-progress"
					? "awaiting-result"
					: clock.current.tick < 48
						? "transferring"
						: "settled";
		if (
			exchangeProp.current !== null &&
			exchangeTransferStatus === "transferring" &&
			first !== undefined &&
			second !== undefined
		) {
			const progress = Math.min(1, clock.current.tick / 47);
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
			host.current.dataset.exchangeTransfer = exchangeTransferStatus;
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

function CameraController({
	host,
	rigs,
	focus,
	reducedMotion,
	onSemanticScale,
	onCitizenSelect,
	onPlaceSelect,
	onOverview,
	onFollowCitizen,
	focalCitizenId,
}: {
	readonly host: RefObject<HTMLButtonElement | null>;
	readonly rigs: RefObject<Map<string, ActorRig>>;
	readonly focus: WorldFocus;
	readonly reducedMotion: boolean;
	readonly onSemanticScale: (scale: SemanticScale) => void;
	readonly onCitizenSelect: (citizenId: string) => void;
	readonly onPlaceSelect: (placeId: string) => void;
	readonly onOverview: () => void;
	readonly onFollowCitizen: (citizenId: string) => void;
	readonly focalCitizenId: string | null;
}) {
	const camera = useRef<PlayCanvasEntity>(null);
	const cameraState = useRef({
		targetX: 0,
		targetZ: -5,
		distance: 58,
		yaw: 38,
		pitch: 48,
	});
	const appliedInitialFocus = useRef(false);
	const pointers = useRef(new Map<number, { x: number; y: number }>());
	const pointerStarts = useRef(new Map<number, { x: number; y: number }>());
	const priorPinch = useRef<number | null>(null);
	const multiPointerGesture = useRef(false);
	const previousScale = useRef<SemanticScale | null>(null);
	const pickTargetSample = useRef(0);

	useEffect(() => {
		const state = cameraState.current;
		if (focus.kind === "overview") {
			state.targetX = 0;
			state.targetZ = -5;
			state.distance = appliedInitialFocus.current ? 118 : 58;
			appliedInitialFocus.current = true;
			return;
		}
		appliedInitialFocus.current = true;
		if (focus.kind === "place") {
			const place = riverholdSpatialScene.places[focus.id];
			if (place !== undefined) {
				state.targetX = place.centerMm.x / 1_000;
				state.targetZ = place.centerMm.z / 1_000;
				state.distance = 52;
			}
			return;
		}
		const rig = rigs.current.get(focus.id);
		if (rig !== undefined) {
			const position = rig.root.getPosition();
			state.targetX = position.x;
			state.targetZ = position.z;
		}
		state.distance = 18;
	}, [focus, rigs]);

	useEffect(() => {
		const surface = host.current;
		if (surface === null) return;
		const clampTarget = () => {
			const state = cameraState.current;
			state.targetX = Math.max(-92, Math.min(92, state.targetX));
			state.targetZ = Math.max(-78, Math.min(78, state.targetZ));
			state.distance = Math.max(12, Math.min(165, state.distance));
			state.pitch = Math.max(28, Math.min(67, state.pitch));
		};
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			cameraState.current.distance *= Math.exp(event.deltaY * 0.0012);
			clampTarget();
		};
		const onPointerDown = (event: PointerEvent) => {
			if (event.pointerType === "mouse" && event.button !== 0) return;
			surface.setPointerCapture(event.pointerId);
			const point = {
				x: event.clientX,
				y: event.clientY,
			};
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
				if (priorPinch.current !== null && pinch > 0)
					cameraState.current.distance *= priorPinch.current / pinch;
				priorPinch.current = pinch;
				clampTarget();
				return;
			}
			const dx = event.clientX - prior.x;
			const dy = event.clientY - prior.y;
			const state = cameraState.current;
			if (event.altKey || event.button === 2 || (event.buttons & 2) !== 0) {
				state.yaw -= dx * 0.28;
				state.pitch += dy * 0.2;
			} else {
				const unitsPerPixel = state.distance * 0.0018;
				const yaw = (state.yaw * Math.PI) / 180;
				state.targetX +=
					(-dx * Math.cos(yaw) + dy * Math.sin(yaw)) * unitsPerPixel;
				state.targetZ +=
					(dx * Math.sin(yaw) + dy * Math.cos(yaw)) * unitsPerPixel;
			}
			clampTarget();
		};
		const pickAt = (clientX: number, clientY: number, pointerType: string) => {
			const entity = camera.current;
			if (entity?.camera === undefined) return;
			const bounds = surface.getBoundingClientRect();
			const screenX = clientX - bounds.left;
			const screenY = clientY - bounds.top;
			const citizenThreshold = pointerType === "touch" ? 42 : 28;
			const placeThreshold = pointerType === "touch" ? 52 : 38;
			const citizen = [...rigs.current.entries()]
				.map(([citizenId, rig]) => {
					const point = entity.camera?.worldToScreen(rig.root.getPosition());
					return {
						citizenId,
						distance:
							point === undefined
								? Number.POSITIVE_INFINITY
								: Math.hypot(point.x - screenX, point.y - screenY),
					};
				})
				.sort((left, right) => left.distance - right.distance)[0];
			if (citizen !== undefined && citizen.distance <= citizenThreshold) {
				surface.dataset.lastWorldPick = `citizen:${citizen.citizenId}`;
				onCitizenSelect(citizen.citizenId);
				return;
			}
			const place = Object.values(riverholdSpatialScene.places)
				.map((candidate) => {
					const point = entity.camera?.worldToScreen(
						new Vec3(
							candidate.centerMm.x / 1_000,
							0,
							candidate.centerMm.z / 1_000,
						),
					);
					return {
						placeId: candidate.placeId,
						distance:
							point === undefined
								? Number.POSITIVE_INFINITY
								: Math.hypot(point.x - screenX, point.y - screenY),
					};
				})
				.sort((left, right) => left.distance - right.distance)[0];
			if (place !== undefined && place.distance <= placeThreshold) {
				surface.dataset.lastWorldPick = `place:${place.placeId}`;
				onPlaceSelect(place.placeId);
			}
		};
		const finishPointer = (event: PointerEvent, allowPick: boolean) => {
			const start = pointerStarts.current.get(event.pointerId);
			const isOnlyPointer = pointers.current.size === 1;
			const distance =
				start === undefined
					? Number.POSITIVE_INFINITY
					: Math.hypot(event.clientX - start.x, event.clientY - start.y);
			if (
				allowPick &&
				isOnlyPointer &&
				!multiPointerGesture.current &&
				distance <= 7
			)
				pickAt(event.clientX, event.clientY, event.pointerType);
			pointers.current.delete(event.pointerId);
			pointerStarts.current.delete(event.pointerId);
			priorPinch.current = null;
			if (pointers.current.size === 0) multiPointerGesture.current = false;
		};
		const onPointerUp = (event: PointerEvent) => finishPointer(event, true);
		const onPointerCancel = (event: PointerEvent) =>
			finishPointer(event, false);
		const stopMenu = (event: MouseEvent) => event.preventDefault();
		const applyCameraIntent = (kind: string) => {
			const state = cameraState.current;
			if (kind === "zoom-in") state.distance *= 0.78;
			else if (kind === "zoom-out") state.distance *= 1.28;
			else if (kind === "pan-left") state.targetX -= 8;
			else if (kind === "pan-right") state.targetX += 8;
			else if (kind === "pan-up") state.targetZ -= 8;
			else if (kind === "pan-down") state.targetZ += 8;
			else if (kind === "orbit-left") state.yaw -= 12;
			else if (kind === "orbit-right") state.yaw += 12;
			clampTarget();
		};
		const onCameraIntent = (event: Event) => {
			const custom = event as CustomEvent<{ readonly kind?: string }>;
			if (typeof custom.detail?.kind === "string")
				applyCameraIntent(custom.detail.kind);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement
			)
				return;
			if (event.target !== surface) return;
			if (event.key === "Home" || event.key === "0") {
				event.preventDefault();
				onOverview();
				return;
			}
			if (event.key.toLowerCase() === "f") {
				if (focalCitizenId !== null) {
					event.preventDefault();
					onFollowCitizen(focalCitizenId);
				}
				return;
			}
			const kind =
				event.key === "+" || event.key === "="
					? "zoom-in"
					: event.key === "-"
						? "zoom-out"
						: event.key === "ArrowLeft"
							? "pan-left"
							: event.key === "ArrowRight"
								? "pan-right"
								: event.key === "ArrowUp"
									? "pan-up"
									: event.key === "ArrowDown"
										? "pan-down"
										: null;
			if (kind !== null) {
				event.preventDefault();
				applyCameraIntent(kind);
			}
		};
		surface.addEventListener("wheel", onWheel, { passive: false });
		surface.addEventListener("pointerdown", onPointerDown);
		surface.addEventListener("pointermove", onPointerMove);
		surface.addEventListener("pointerup", onPointerUp);
		surface.addEventListener("pointercancel", onPointerCancel);
		surface.addEventListener("contextmenu", stopMenu);
		window.addEventListener("eonfolk:camera-intent", onCameraIntent);
		surface.addEventListener("keydown", onKeyDown);
		return () => {
			surface.removeEventListener("wheel", onWheel);
			surface.removeEventListener("pointerdown", onPointerDown);
			surface.removeEventListener("pointermove", onPointerMove);
			surface.removeEventListener("pointerup", onPointerUp);
			surface.removeEventListener("pointercancel", onPointerCancel);
			surface.removeEventListener("contextmenu", stopMenu);
			window.removeEventListener("eonfolk:camera-intent", onCameraIntent);
			surface.removeEventListener("keydown", onKeyDown);
		};
	}, [
		focalCitizenId,
		host,
		onCitizenSelect,
		onFollowCitizen,
		onOverview,
		onPlaceSelect,
		rigs,
	]);

	useAppEvent("update", () => {
		const entity = camera.current;
		if (entity === null) return;
		const state = cameraState.current;
		if (focus.kind === "citizen" && focus.follow) {
			const rig = rigs.current.get(focus.id);
			if (rig !== undefined) {
				const position = rig.root.getPosition();
				const blend = reducedMotion ? 1 : 0.09;
				state.targetX += (position.x - state.targetX) * blend;
				state.targetZ += (position.z - state.targetZ) * blend;
			}
		}
		const yaw = (state.yaw * Math.PI) / 180;
		const pitch = (state.pitch * Math.PI) / 180;
		const horizontal = Math.cos(pitch) * state.distance;
		entity.setPosition(
			state.targetX + Math.sin(yaw) * horizontal,
			Math.sin(pitch) * state.distance,
			state.targetZ + Math.cos(yaw) * horizontal,
		);
		entity.lookAt(state.targetX, 0.9, state.targetZ);
		const residency = projectPresentationResidency({
			targetMm: {
				x: Math.round(state.targetX * 1_000),
				y: 0,
				z: Math.round(state.targetZ * 1_000),
			},
			distanceMm: Math.round(state.distance * 1_000),
			selectedCitizenId: focus.kind === "citizen" ? focus.id : null,
		});
		if (host.current !== null) {
			host.current.dataset.semanticScale = residency.semanticScale;
			host.current.dataset.residentCells = residency.cells
				.filter((cell) => cell.resident)
				.map((cell) => `${cell.cellId}:${cell.fidelity}`)
				.join(",");
			host.current.dataset.cameraDistanceM = state.distance.toFixed(1);
			host.current.dataset.cameraTarget = `${state.targetX.toFixed(1)},${state.targetZ.toFixed(1)}`;
			host.current.dataset.navigationMode = reducedMotion
				? "direct"
				: "animated";
			const cameraComponent = entity.camera;
			pickTargetSample.current = (pickTargetSample.current + 1) % 6;
			if (
				cameraComponent !== undefined &&
				(pickTargetSample.current === 0 ||
					host.current.dataset.citizenPickTargets === undefined)
			) {
				host.current.dataset.citizenPickTargets = JSON.stringify(
					[...rigs.current.entries()].map(([citizenId, rig]) => {
						const point = cameraComponent.worldToScreen(rig.root.getPosition());
						return { id: citizenId, x: point.x, y: point.y };
					}),
				);
				host.current.dataset.placePickTargets = JSON.stringify(
					Object.values(riverholdSpatialScene.places).map((place) => {
						const point = cameraComponent.worldToScreen(
							new Vec3(place.centerMm.x / 1_000, 0, place.centerMm.z / 1_000),
						);
						return { id: place.placeId, x: point.x, y: point.y };
					}),
				);
			}
		}
		if (previousScale.current !== residency.semanticScale) {
			previousScale.current = residency.semanticScale;
			onSemanticScale(residency.semanticScale);
		}
	});

	return (
		<Entity ref={camera} position={[74, 87, 92]}>
			<Camera clearColor="#a9c0b4" fov={42} farClip={420} nearClip={0.2} />
		</Entity>
	);
}

function SceneProbe({
	host,
}: {
	readonly host: RefObject<HTMLButtonElement | null>;
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

const treePositions = [
	[-112, -78, 1.2],
	[-104, -52, 1],
	[-108, -20, 1.15],
	[-108, 18, 0.95],
	[-104, 52, 1.2],
	[-94, 78, 1.05],
	[-82, 90, 1.2],
	[-58, 88, 0.9],
	[-24, 92, 1.05],
	[12, 91, 0.95],
	[44, 88, 1.1],
	[70, 81, 1.2],
	[92, 70, 1.1],
	[107, 48, 1.25],
	[112, 15, 1],
	[108, -18, 1.15],
	[102, -52, 1],
	[91, -79, 1.2],
	[65, -91, 1.05],
	[31, -94, 1.15],
	[-3, -93, 1],
	[-35, -91, 1.15],
	[-67, -88, 1],
	[-92, -75, 1.2],
	[49, 30, 1],
	[57, 38, 1.1],
	[64, 45, 0.92],
	[72, 35, 1.16],
	[54, 54, 1.05],
	[79, 53, 1.2],
	[87, 34, 0.95],
	[46, 61, 1.1],
] as const;

function LivingLandscape({
	projection,
	reducedMotion,
	semanticScale,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly semanticScale: SemanticScale;
}) {
	return (
		<>
			<Primitive
				position={[0, -0.3, 0]}
				scale={[250, 0.5, 210]}
				color={palette.grass}
			/>
			<Primitive
				position={[-72, -0.01, 0]}
				scale={[18, 0.08, 220]}
				color={palette.water}
				castShadows={false}
			/>
			<CosmeticRiverMotion reducedMotion={reducedMotion} />
			<Primitive
				position={[0, -0.01, -5]}
				scale={[physicalScale.primaryRoadWidth, 0.08, 142]}
				color={palette.path}
			/>
			<Primitive
				position={[24, -0.005, 7]}
				scale={[82, 0.08, physicalScale.primaryRoadWidth]}
				color={palette.path}
				rotation={[0, -8, 0]}
			/>
			<Primitive
				position={[-27, -0.005, 12]}
				scale={[70, 0.08, physicalScale.footpathWidth]}
				color={palette.path}
				rotation={[0, 24, 0]}
			/>
			<Primitive
				position={[-38, -0.01, -57]}
				scale={[36, 0.08, 30]}
				color={palette.field}
			/>
			{[-49, -42, -35, -28].map((x) => (
				<Primitive
					key={x}
					position={[x, 0.05, -57]}
					scale={[1.2, 0.08, 26]}
					color={palette.grain}
					castShadows={false}
				/>
			))}
			<House x={-22} z={-5} rotation={8} wide />
			<House x={17} z={-12} rotation={-7} />
			<House x={-7} z={19} rotation={12} />
			<House x={22} z={19} rotation={-10} wide />
			<House x={-29} z={14} rotation={20} />
			<House x={9} z={32} rotation={-4} wide />
			<House x={-14} z={-26} rotation={3} wide />
			<Entity position={[1, 0, 1]}>
				<Primitive
					type="cylinder"
					position={[0, 0.35, 0]}
					scale={[
						physicalScale.marketDiameter,
						0.5,
						physicalScale.marketDiameter,
					]}
					color={palette.earth}
				/>
				<MarketStall x={-5.2} z={0} rotation={12} canopy={palette.roof} />
				<MarketStall x={5.2} z={0} rotation={-10} canopy={palette.grain} />
				<MarketStall x={0} z={-6.1} rotation={90} canopy={palette.mara} />
				{projection.spatial.interactions.length > 0 ? (
					<ConversationIndicator />
				) : null}
			</Entity>
			<Entity position={[40, 0, 8]}>
				<Primitive
					position={[0, physicalScale.millRidgeHeight * 0.37, 0]}
					scale={[
						physicalScale.millWidth,
						physicalScale.millRidgeHeight * 0.74,
						physicalScale.millDepth,
					]}
					color={palette.wall}
				/>
				<Primitive
					position={[0, physicalScale.millRidgeHeight - 0.3, 0]}
					scale={[
						physicalScale.millWidth + 1,
						0.6,
						physicalScale.millDepth + 1,
					]}
					color={palette.roof}
					rotation={[0, 0, 9]}
				/>
				<Primitive
					type="cylinder"
					position={[
						physicalScale.millWidth / 2 + 0.5,
						physicalScale.millWheelDiameter / 2,
						0,
					]}
					scale={[0.45, physicalScale.millWheelDiameter, 0.45]}
					color={palette.timber}
					rotation={[90, 0, 0]}
				/>
				<Primitive
					position={[
						physicalScale.millWidth / 2 + 0.5,
						physicalScale.millWheelDiameter / 2,
						0,
					]}
					scale={[0.28, physicalScale.millWheelDiameter - 0.2, 0.28]}
					color={
						projection.worldProcesses.millRepaired
							? palette.moss
							: palette.timber
					}
					rotation={[0, 0, reducedMotion ? 0 : 14]}
				/>
				<Primitive
					position={[
						physicalScale.millWidth / 2 + 0.5,
						physicalScale.millWheelDiameter / 2,
						0,
					]}
					scale={[physicalScale.millWheelDiameter - 0.2, 0.28, 0.28]}
					color={
						projection.worldProcesses.millRepaired
							? palette.moss
							: palette.timber
					}
				/>
			</Entity>
			<Entity position={[-47, 0, 26]}>
				<Primitive
					type="cylinder"
					position={[0, 0.65, 0]}
					scale={[2.3, 1.25, 2.3]}
					color={palette.stone}
				/>
				<Primitive
					type="cylinder"
					position={[0, 1.2, 0]}
					scale={[1.55, 1.1, 1.55]}
					color={palette.water}
				/>
				<Primitive
					position={[0, 2.5, 0]}
					scale={[4.5, 0.25, 0.25]}
					color={palette.timber}
				/>
			</Entity>
			<WorldProps projection={projection} />
			{treePositions.map(([x, z, scale]) => (
				<Tree key={`${x}:${z}`} x={x} z={z} scale={scale} />
			))}
			{semanticScale !== "region"
				? [
						[39, 26, 0.85],
						[48, 20, 0.9],
						[64, 27, 0.82],
						[69, 45, 0.88],
						[58, 58, 0.9],
					].map(([x, z, scale]) => (
						<Tree key={`detail:${x}:${z}`} x={x!} z={z!} scale={scale!} />
					))
				: null}
			{[
				[-118, -94, 16],
				[-94, 98, 20],
				[-5, 105, 18],
				[88, 98, 22],
				[120, 58, 17],
				[118, -82, 20],
				[42, -105, 18],
			].map(([x, z, scale]) => (
				<Primitive
					key={`hill:${x}:${z}`}
					type="cone"
					position={[x!, scale! * 0.35, z!]}
					scale={[scale!, scale! * 0.7, scale!]}
					color={palette.moss}
					castShadows={false}
				/>
			))}
		</>
	);
}

function Settlement({
	projection,
	reducedMotion,
	host,
	focus,
	onSemanticScaleChange,
	onCitizenSelect,
	onPlaceSelect,
	onFocusChange,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLButtonElement | null>;
	readonly focus: WorldFocus;
	readonly onSemanticScaleChange: (scale: SemanticScale) => void;
	readonly onCitizenSelect: (citizenId: string) => void;
	readonly onPlaceSelect: (placeId: string) => void;
	readonly onFocusChange: (focus: WorldFocus) => void;
}) {
	const rigs = useRef(new Map<string, ActorRig>());
	const exchangeProp = useRef<PlayCanvasEntity>(null);
	const [semanticScale, setSemanticScale] = useState<SemanticScale>("region");
	const register = useMemo(
		() => (citizenId: string, rig: ActorRig | null) => {
			if (rig === null) rigs.current.delete(citizenId);
			else rigs.current.set(citizenId, rig);
		},
		[],
	);
	const updateSemanticScale = (scale: SemanticScale) => {
		setSemanticScale(scale);
		onSemanticScaleChange(scale);
	};
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
			<CameraController
				host={host}
				rigs={rigs}
				focus={focus}
				reducedMotion={reducedMotion}
				onSemanticScale={updateSemanticScale}
				onCitizenSelect={onCitizenSelect}
				onPlaceSelect={onPlaceSelect}
				onOverview={() => onFocusChange({ kind: "overview" })}
				onFollowCitizen={(citizenId) =>
					onFocusChange({ kind: "citizen", id: citizenId, follow: true })
				}
				focalCitizenId={
					projection.citizens.find((citizen) => citizen.focal)?.id ?? null
				}
			/>
			<Entity rotation={[48, -32, 0]}>
				<Light
					type="directional"
					color="#ffedca"
					intensity={1.35}
					castShadows
					shadowResolution={1024}
				/>
			</Entity>
			<Entity position={[0, 28, 0]}>
				<Light type="omni" color="#89a9cb" intensity={0.18} range={180} />
			</Entity>
			<LivingLandscape
				projection={projection}
				reducedMotion={reducedMotion}
				semanticScale={semanticScale}
			/>
			<Entity ref={exchangeProp} scale={[0, 0, 0]}>
				<Primitive
					position={[0, 0, 0]}
					scale={[0.42, 0.3, 0.32]}
					color={palette.earth}
				/>
			</Entity>
			{projection.spatial.actors.map((actor) => (
				<CitizenRig
					key={actor.citizenId}
					actor={actor}
					register={register}
					semanticScale={semanticScale}
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

function CheckedSettlement({
	projection,
	reducedMotion,
	host,
	onFailure,
	focus,
	onSemanticScaleChange,
	onCitizenSelect,
	onPlaceSelect,
	onFocusChange,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly host: RefObject<HTMLButtonElement | null>;
	readonly onFailure: () => void;
	readonly focus: WorldFocus;
	readonly onSemanticScaleChange: (scale: SemanticScale) => void;
	readonly onCitizenSelect: (citizenId: string) => void;
	readonly onPlaceSelect: (placeId: string) => void;
	readonly onFocusChange: (focus: WorldFocus) => void;
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
			focus={focus}
			onSemanticScaleChange={onSemanticScaleChange}
			onCitizenSelect={onCitizenSelect}
			onPlaceSelect={onPlaceSelect}
			onFocusChange={onFocusChange}
		/>
	);
}

export function RiverholdWorld({
	projection,
	reducedMotion,
	onFailure,
	focus,
	onSemanticScaleChange,
	onCitizenSelect,
	onPlaceSelect,
	onFocusChange,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly onFailure: () => void;
	readonly focus?: WorldFocus;
	readonly onSemanticScaleChange?: (scale: SemanticScale) => void;
	readonly onCitizenSelect?: (citizenId: string) => void;
	readonly onPlaceSelect?: (placeId: string) => void;
	readonly onFocusChange?: (focus: WorldFocus) => void;
}) {
	const host = useRef<HTMLButtonElement>(null);
	return (
		<button
			ref={host}
			className="world-canvas"
			type="button"
			onClick={(event) => {
				if (event.detail === 0) onFocusChange?.({ kind: "overview" });
			}}
			aria-label="Interactive Riverhold world. Drag to pan, pinch or use plus and minus to zoom, Home for overview, and F to follow Mara. Tap an inhabitant or place for details."
			data-testid="riverhold-canvas"
			data-ready="false"
			data-engine="playcanvas"
			data-world-metres-per-unit={riverholdSpatialScene.metresPerWorldUnit}
			data-citizen-height-m={physicalScale.citizenHeight}
			data-door-height-m={physicalScale.doorHeight}
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
					focus={focus ?? { kind: "overview" }}
					onSemanticScaleChange={onSemanticScaleChange ?? (() => undefined)}
					onCitizenSelect={onCitizenSelect ?? (() => undefined)}
					onPlaceSelect={onPlaceSelect ?? (() => undefined)}
					onFocusChange={onFocusChange ?? (() => undefined)}
				/>
			</RendererBoundary>
		</button>
	);
}
