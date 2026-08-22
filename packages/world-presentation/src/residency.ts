import { riverholdSpatialScene } from "./scene";
import type {
	FidelityClass,
	PresentationResidency,
	SemanticScale,
	SpatialPointMm,
} from "./types";

export interface CameraPresentationInput {
	readonly targetMm: SpatialPointMm;
	readonly distanceMm: number;
	readonly selectedCitizenId: string | null;
}

export function semanticScaleForDistance(distanceMm: number): SemanticScale {
	if (!Number.isFinite(distanceMm) || distanceMm < 0)
		throw new RangeError("camera distance must be finite and non-negative");
	if (distanceMm <= 28_000) return "citizen";
	if (distanceMm <= 92_000) return "town";
	return "region";
}

function fidelityForDistance(distanceMm: number): FidelityClass {
	if (distanceMm <= 36_000) return "LOD0";
	if (distanceMm <= 82_000) return "LOD1";
	if (distanceMm <= 150_000) return "LOD2";
	return "LOD3";
}

export function projectPresentationResidency(
	input: CameraPresentationInput,
): PresentationResidency {
	const semanticScale = semanticScaleForDistance(input.distanceMm);
	const cells = Object.values(riverholdSpatialScene.cells)
		.sort((left, right) => left.cellId.localeCompare(right.cellId))
		.map((cell) => {
			const distanceMm = Math.round(
				Math.hypot(
					cell.centerMm.x - input.targetMm.x,
					cell.centerMm.z - input.targetMm.z,
				),
			);
			const fidelity = fidelityForDistance(distanceMm);
			return Object.freeze({
				cellId: cell.cellId,
				fidelity,
				resident:
					semanticScale === "region" ||
					distanceMm <= cell.radiusMm + input.distanceMm,
			});
		});
	return Object.freeze({
		semanticScale,
		cells: Object.freeze(cells),
		selectedCitizenId: input.selectedCitizenId,
	});
}
