import { Entity } from "@playcanvas/react";
import { Render } from "@playcanvas/react/components";
import { Color, StandardMaterial } from "playcanvas";
import type { GeneratedEmbodiedActor } from "../../generated-presentation";
import {
	GENERATED_FOLK_ASSET,
	poseAtGeneratedPresentationTick,
} from "../../generated-presentation";

type PrimitiveKind = "box" | "cone" | "cylinder" | "sphere";

function material(hex: string): StandardMaterial {
	const value = Number.parseInt(hex.slice(1), 16);
	const result = new StandardMaterial();
	result.diffuse = new Color(
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255,
	);
	result.metalness = 0;
	result.gloss = 0.18;
	result.opacity = 1;
	result.update();
	return result;
}

const identityMaterials = Object.freeze([
	material("#356f72"),
	material("#995d3d"),
	material("#637845"),
	material("#65598a"),
	material("#9a7737"),
	material("#445f85"),
]);

const materials = Object.freeze({
	skin: material("#c8946a"),
	dark: material("#282c28"),
	hairDark: material("#30271f"),
	hairWarm: material("#78432f"),
	linen: material("#d7c6a0"),
	selection: material("#f2dc91"),
	focal: material("#dc7849"),
	water: material("#5795aa"),
	logs: material("#765039"),
	grain: material("#c9a94d"),
	trade: material("#a16d83"),
	tool: material("#777c7b"),
	work: material("#dc9a3c"),
	social: material("#62a294"),
	reaction: material("#c84f48"),
});

/** The procedural proxy's body-and-activity silhouette spans 2.5 source units. */
export const GENERATED_FOLK_SOURCE_HEIGHT_UNITS = 2.5;

function Primitive({
	type = "box",
	position,
	scale,
	rotation = [0, 0, 0],
	color,
}: {
	readonly type?: PrimitiveKind;
	readonly position: [number, number, number];
	readonly scale: [number, number, number];
	readonly rotation?: [number, number, number];
	readonly color: StandardMaterial;
}) {
	return (
		<Entity position={position} scale={scale} rotation={rotation}>
			<Render type={type} material={color} castShadows receiveShadows />
		</Entity>
	);
}

function propMaterial(actor: GeneratedEmbodiedActor): StandardMaterial {
	switch (actor.prop) {
		case "water":
			return materials.water;
		case "logs":
			return materials.logs;
		case "grain":
			return materials.grain;
		case "trade":
			return materials.trade;
		case "tool":
			return materials.tool;
		case null:
			return materials.dark;
	}
}

function stateMaterial(actor: GeneratedEmbodiedActor): StandardMaterial {
	switch (actor.pose.family) {
		case "work":
			return materials.work;
		case "social":
			return materials.social;
		case "reaction":
			return materials.reaction;
		default:
			return materials.dark;
	}
}

function activityMaterial(actor: GeneratedEmbodiedActor): StandardMaterial {
	return actor.prop === null ? stateMaterial(actor) : propMaterial(actor);
}

function CanonicalProp({ actor }: { readonly actor: GeneratedEmbodiedActor }) {
	if (actor.prop === null) return null;
	const color = propMaterial(actor);
	switch (actor.prop) {
		case "water":
			return (
				<Entity position={[0.68, 0.72, 0]}>
					<Primitive
						type="cylinder"
						position={[0, 0, 0]}
						scale={[0.3, 0.4, 0.3]}
						color={color}
					/>
					<Primitive
						type="cylinder"
						position={[0, 0.24, 0]}
						scale={[0.38, 0.06, 0.38]}
						color={materials.linen}
					/>
				</Entity>
			);
		case "logs":
			return (
				<Entity position={[0.72, 0.88, 0]} rotation={[0, 0, 84]}>
					{[-0.18, 0, 0.18].map((offset) => (
						<Primitive
							key={offset}
							type="cylinder"
							position={[offset, 0, 0]}
							scale={[0.14, 0.86, 0.14]}
							color={color}
						/>
					))}
				</Entity>
			);
		case "grain":
			return (
				<Entity position={[0.7, 0.83, 0]}>
					<Primitive
						type="sphere"
						position={[0, 0, 0]}
						scale={[0.38, 0.5, 0.3]}
						color={color}
					/>
					<Primitive
						position={[0, 0.34, 0]}
						scale={[0.12, 0.12, 0.12]}
						color={materials.linen}
					/>
				</Entity>
			);
		case "trade":
			return (
				<Entity position={[0.72, 1.04, 0]}>
					{[-0.13, 0.13].map((offset) => (
						<Primitive
							key={offset}
							type="cylinder"
							position={[offset, 0, 0]}
							scale={[0.18, 0.05, 0.18]}
							color={color}
						/>
					))}
				</Entity>
			);
		case "tool":
			return (
				<Entity position={[0.7, 0.94, 0]} rotation={[0, 0, -28]}>
					<Primitive
						position={[0, 0, 0]}
						scale={[0.1, 0.82, 0.1]}
						color={materials.logs}
					/>
					<Primitive
						position={[0, 0.43, 0]}
						scale={[0.52, 0.15, 0.18]}
						color={color}
					/>
				</Entity>
			);
	}
}

function SocialGesture() {
	return (
		<Entity position={[0, 2.44, 0]}>
			{[-0.22, 0, 0.22].map((offset, index) => (
				<Primitive
					key={offset}
					type="sphere"
					position={[offset, index === 1 ? 0.08 : 0, 0]}
					scale={[0.18, 0.18, 0.18]}
					color={materials.social}
				/>
			))}
		</Entity>
	);
}

function ActivityBeacon({ actor }: { readonly actor: GeneratedEmbodiedActor }) {
	const color = activityMaterial(actor);
	switch (actor.animationClass) {
		case "inspect":
			return (
				<Entity position={[0, 2.75, 0]} rotation={[0, 0, -24]}>
					<Primitive
						type="sphere"
						position={[0, 0, 0]}
						scale={[0.52, 0.52, 0.18]}
						color={color}
					/>
					<Primitive
						position={[0.42, -0.42, 0]}
						scale={[0.12, 0.62, 0.12]}
						color={color}
					/>
				</Entity>
			);
		case "repair":
			return (
				<Entity position={[0, 2.9, 0]} rotation={[0, 0, -32]}>
					<Primitive
						position={[0, 0, 0]}
						scale={[0.13, 0.95, 0.13]}
						color={materials.logs}
					/>
					<Primitive
						position={[0, 0.48, 0]}
						scale={[0.74, 0.22, 0.24]}
						color={color}
					/>
				</Entity>
			);
		case "gather":
			return (
				<Entity position={[0, 2.82, 0]}>
					{[-0.28, 0, 0.28].map((offset) => (
						<Primitive
							key={offset}
							type="cylinder"
							position={[offset, 0, 0]}
							scale={[0.16, 0.82, 0.16]}
							rotation={[0, 0, 90]}
							color={color}
						/>
					))}
				</Entity>
			);
		case "carry":
			return (
				<Entity position={[0, 2.88, 0]}>
					<Primitive
						position={[0, 0, 0]}
						scale={[0.8, 0.62, 0.52]}
						rotation={[0, 45, 0]}
						color={color}
					/>
				</Entity>
			);
		case "eat-rest":
			return (
				<Entity position={[0, 2.78, 0]} rotation={[0, 0, 90]}>
					<Primitive
						position={[0, 0, 0]}
						scale={[0.14, 1.1, 0.14]}
						color={color}
					/>
					<Primitive
						position={[0.3, 0.32, 0]}
						scale={[0.14, 0.58, 0.14]}
						color={color}
					/>
				</Entity>
			);
		case "talk":
		case "listen":
		case "exchange":
		case "walk":
		case "idle":
		case "react":
			return null;
	}
}

/**
 * Low-poly procedural runtime proxy whose named parts mirror the verified glTF
 * reference contract. The glTF is not rendered; procedural limbs preserve the
 * canonical typed pose and stable identity variants at lower runtime cost.
 */
export function GeneratedFolkProxy({
	actor,
	position,
	selected,
	presentationTick,
	reducedMotion,
}: {
	readonly actor: GeneratedEmbodiedActor;
	readonly position: [number, number, number];
	readonly selected: boolean;
	readonly presentationTick: number;
	readonly reducedMotion: boolean;
}) {
	const cloth =
		identityMaterials[actor.identityVariant % identityMaterials.length] ??
		identityMaterials[0];
	if (cloth === undefined) throw new Error("generated folk palette is empty");
	const isMara = actor.name === "Mara Vale";
	const silhouette = actor.identityVariant % 3;
	const shoulderWidth =
		silhouette === 0 ? 0.78 : silhouette === 1 ? 0.68 : 0.72;
	const torsoHeight = silhouette === 2 ? 1.16 : 1.08;
	const hair = isMara ? materials.hairWarm : materials.hairDark;
	const pose = poseAtGeneratedPresentationTick(
		actor.pose,
		presentationTick,
		actor.identityVariant,
		reducedMotion,
	);
	return (
		<Entity
			name={`${GENERATED_FOLK_ASSET.assetId}:${actor.citizenId}`}
			position={position}
			rotation={[0, actor.facingDegrees, 0]}
			data-citizen-name={actor.name}
		>
			<Primitive
				type="cylinder"
				position={[0, 0.02, 0]}
				scale={[1.3, 0.025, 1.3]}
				color={activityMaterial(actor)}
			/>
			{selected || actor.focal ? (
				<Primitive
					type="cylinder"
					position={[0, 0.03, 0]}
					scale={[selected ? 1.3 : 1, 0.04, selected ? 1.3 : 1]}
					color={selected ? materials.selection : materials.focal}
				/>
			) : null}
			<Entity rotation={[pose.torsoPitchDegrees, 0, 0]}>
				<Primitive
					position={[0, 1.05, 0]}
					scale={[shoulderWidth, torsoHeight, 0.42]}
					color={cloth}
				/>
				<Primitive
					position={[0, 0.88, -0.22]}
					scale={[shoulderWidth + 0.05, 0.16, 0.08]}
					color={isMara ? materials.focal : materials.linen}
				/>
				<Primitive
					type="sphere"
					position={[0, 1.82, 0]}
					scale={[0.42, 0.46, 0.42]}
					color={materials.skin}
				/>
				{silhouette === 0 ? (
					<Primitive
						type="sphere"
						position={[0, 2.08, -0.04]}
						scale={[0.44, 0.18, 0.44]}
						color={hair}
					/>
				) : silhouette === 1 ? (
					<Primitive
						type="cone"
						position={[0, 2.22, -0.02]}
						scale={[0.48, 0.55, 0.48]}
						color={hair}
					/>
				) : (
					<>
						<Primitive
							type="sphere"
							position={[0, 2.08, -0.04]}
							scale={[0.42, 0.16, 0.42]}
							color={hair}
						/>
						<Primitive
							type="sphere"
							position={[0.32, 1.95, -0.18]}
							scale={[0.18, 0.34, 0.18]}
							color={hair}
						/>
					</>
				)}
				<Entity
					position={[-0.5, 1.34, 0]}
					rotation={[pose.leftArmPitchDegrees, 0, 0]}
				>
					<Primitive
						position={[0, -0.3, 0]}
						scale={[0.18, 0.68, 0.19]}
						color={cloth}
					/>
				</Entity>
				<Entity
					position={[0.5, 1.34, 0]}
					rotation={[pose.rightArmPitchDegrees, 0, 0]}
				>
					<Primitive
						position={[0, -0.3, 0]}
						scale={[0.18, 0.68, 0.19]}
						color={cloth}
					/>
				</Entity>
			</Entity>
			<Entity
				position={[-0.22, 0.6, 0]}
				rotation={[pose.leftLegPitchDegrees, 0, 0]}
			>
				<Primitive
					position={[0, -0.3, 0]}
					scale={[0.23, 0.72, 0.25]}
					color={materials.dark}
				/>
			</Entity>
			<Entity
				position={[0.22, 0.6, 0]}
				rotation={[pose.rightLegPitchDegrees, 0, 0]}
			>
				<Primitive
					position={[0, -0.3, 0]}
					scale={[0.23, 0.72, 0.25]}
					color={materials.dark}
				/>
			</Entity>
			<CanonicalProp actor={actor} />
			<ActivityBeacon actor={actor} />
			{actor.pose.family === "social" ? (
				<SocialGesture />
			) : ["work", "reaction"].includes(actor.pose.family) ? (
				<Primitive
					type={actor.pose.family === "reaction" ? "cone" : "sphere"}
					position={[0, 2.48, 0]}
					scale={[0.18, 0.18, 0.18]}
					color={stateMaterial(actor)}
				/>
			) : null}
		</Entity>
	);
}
