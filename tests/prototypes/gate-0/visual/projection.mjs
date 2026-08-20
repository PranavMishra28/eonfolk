import {
	AUTHORITATIVE_INTERACTION,
	CHRONICLE_BEAT,
	CITIZENS,
	FIXTURE,
	MARA_PROJECTION,
	MARA_TOMA_CUE,
	VIEWPORTS,
} from "./fixture.mjs";

const POSITIONS = Object.freeze({
	"citizen:mara": [48, 43],
	"citizen:toma": [59, 47],
	"citizen:iven": [68, 43],
	"citizen:sera": [31, 57],
	"citizen:nadi": [19, 37],
	"citizen:owen": [78, 65],
	"citizen:bela": [40, 70],
	"citizen:corin": [85, 35],
});

export function classifyViewport(width, height) {
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0
	) {
		throw new TypeError("viewport dimensions must be positive finite numbers");
	}
	return width <= 480 || height > width * 1.35
		? "mobile"
		: width < 1500
			? "laptop"
			: "desktop";
}

export function createProjection({
	width,
	height,
	reducedMotion = false,
	weakDevice = false,
} = {}) {
	const mode = classifyViewport(width, height);
	const worldHeightPercent = mode === "mobile" ? 64 : 100;
	const quality = weakDevice ? "semantic-markers" : "living-woodcut";
	const motion = reducedMotion || weakDevice ? "discrete" : "ambient";

	return Object.freeze({
		fixtureId: FIXTURE.fixtureId,
		rendererMode: FIXTURE.rendererMode,
		viewport: Object.freeze({ width, height, mode }),
		layout: Object.freeze({
			worldHeightPercent,
			peekHeightPercent: mode === "mobile" ? 33 : 0,
		}),
		quality,
		motion,
		settlement: Object.freeze({
			id: "riverhold",
			label: "Riverhold — bridge, well, market, mill, and woodpile",
			dominates: worldHeightPercent >= 55,
		}),
		citizens: Object.freeze(
			CITIZENS.map((citizen) =>
				Object.freeze({
					...citizen,
					positionPercent: Object.freeze(POSITIONS[citizen.id]),
					marker: weakDevice
						? `${citizen.name}: ${citizen.activity}`
						: citizen.prop,
				}),
			),
		),
		mara: MARA_PROJECTION,
		authoritativeInteraction: AUTHORITATIVE_INTERACTION,
		relationshipCue: MARA_TOMA_CUE,
		peek: Object.freeze({
			citizenId: "citizen:mara",
			heightPercent: mode === "mobile" ? 33 : null,
			content: MARA_PROJECTION,
		}),
		chronicleBeat: CHRONICLE_BEAT,
	});
}

export function createPixiCommands(projection) {
	const citizens = projection.citizens.map((citizen, index) =>
		Object.freeze({
			kind:
				projection.quality === "semantic-markers" ? "marker" : "citizen-sprite",
			id: citizen.id,
			name: citizen.name,
			xPercent: citizen.positionPercent[0],
			yPercent: citizen.positionPercent[1],
			zIndex: 20 + index,
			pose: citizen.activityId,
			prop: citizen.prop,
			label: citizen.activity,
			focusRing: citizen.id === "citizen:mara" ? "gold-cut-ring" : null,
			animate: projection.motion === "ambient",
		}),
	);

	return Object.freeze([
		Object.freeze({
			kind: "settlement",
			id: "riverhold",
			zIndex: 0,
			landmarks: Object.freeze([
				"bridge",
				"well",
				"market",
				"mill",
				"woodpile",
			]),
		}),
		...citizens,
		Object.freeze({
			kind: "interaction-edge",
			id: "exchange-settled",
			from: "citizen:iven",
			to: "citizen:toma",
			style: "solid-labeled",
			label: AUTHORITATIVE_INTERACTION.label,
			zIndex: 40,
		}),
		Object.freeze({
			kind: "relationship-edge",
			id: "mara-toma-concern",
			from: "citizen:mara",
			to: "citizen:toma",
			style: "broken-labeled",
			label: MARA_TOMA_CUE.label,
			zIndex: 41,
		}),
	]);
}

export function canonicalReadyFacts(projection) {
	return Object.freeze({
		fixtureId: projection.fixtureId,
		paintedCitizenIds: Object.freeze(projection.citizens.map(({ id }) => id)),
		paintedActivityIds: Object.freeze(
			projection.citizens.map(({ activityId }) => activityId),
		),
		semanticRowCitizenIds: Object.freeze(
			projection.citizens.map(({ id }) => id),
		),
		interactionCuePainted: true,
		maraPainted: projection.citizens.some(({ id }) => id === "citizen:mara"),
		followMara: Object.freeze({
			enabled: true,
			focusable: true,
			accessibleName: "Follow Mara",
		}),
	});
}

export { VIEWPORTS };
