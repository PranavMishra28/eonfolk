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

/**
 * Low-poly, recognizably humanoid proxy whose named parts mirror the tracked
 * glTF asset. Every visible pose comes from canonical typed action state.
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
		>
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
					scale={[0.74, 1.08, 0.42]}
					color={cloth}
				/>
				<Primitive
					type="sphere"
					position={[0, 1.82, 0]}
					scale={[0.42, 0.46, 0.42]}
					color={materials.skin}
				/>
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
			{actor.prop === null ? null : (
				<Primitive
					position={[0.72, 0.94, 0]}
					scale={[0.34, 0.34, 0.34]}
					color={propMaterial(actor)}
				/>
			)}
			{["work", "social", "reaction"].includes(actor.pose.family) ? (
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
