import { Entity } from "@playcanvas/react";
import { Render } from "@playcanvas/react/components";
import { Color, StandardMaterial } from "playcanvas";

import type { GeneratedProjectDelta } from "../../generated-presentation";

function material(hex: string): StandardMaterial {
	const value = Number.parseInt(hex.slice(1), 16);
	const result = new StandardMaterial();
	result.diffuse = new Color(
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255,
	);
	result.metalness = 0;
	result.gloss = 0.15;
	result.update();
	return result;
}

const timber = material("#795638");
const stone = material("#8a897e");
const changed = material("#d69a42");

function Beam({
	position,
	scale,
	color = timber,
}: {
	readonly position: [number, number, number];
	readonly scale: [number, number, number];
	readonly color?: StandardMaterial;
}) {
	return (
		<Entity position={position} scale={scale}>
			<Render type="box" material={color} castShadows receiveShadows />
		</Entity>
	);
}

/**
 * A staged construction proxy. Geometry is a pure function of authoritative
 * project progress; `changed` only adds a factual interval highlight.
 */
export function GeneratedProjectProxy({
	project,
	position,
}: {
	readonly project: GeneratedProjectDelta;
	readonly position: [number, number, number];
}) {
	const stage = project.visualStage;
	return (
		<Entity name={`project:${project.projectId}`} position={position}>
			<Beam
				position={[0, 0.14, 0]}
				scale={[3.8, 0.28, 3.2]}
				color={project.changed ? changed : stone}
			/>
			{stage >= 1 ? (
				<>
					<Beam position={[-1.45, 1.4, -1.1]} scale={[0.18, 2.8, 0.18]} />
					<Beam position={[1.45, 1.4, -1.1]} scale={[0.18, 2.8, 0.18]} />
					<Beam position={[-1.45, 1.4, 1.1]} scale={[0.18, 2.8, 0.18]} />
					<Beam position={[1.45, 1.4, 1.1]} scale={[0.18, 2.8, 0.18]} />
				</>
			) : null}
			{stage >= 2 ? (
				<>
					<Beam position={[0, 2.75, -1.1]} scale={[3.1, 0.18, 0.18]} />
					<Beam position={[0, 2.75, 1.1]} scale={[3.1, 0.18, 0.18]} />
				</>
			) : null}
			{stage >= 3 ? (
				<Beam position={[0, 1.45, 0]} scale={[2.8, 2.4, 1.8]} color={stone} />
			) : null}
			{stage >= 4 ? (
				<Entity position={[0, 3.25, 0]} scale={[3.5, 0.38, 2.5]}>
					<Render type="cone" material={timber} castShadows receiveShadows />
				</Entity>
			) : null}
		</Entity>
	);
}
