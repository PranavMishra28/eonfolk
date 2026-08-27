import { createRoot } from "react-dom/client";
import { INITIAL_GENERATED_NAVIGATION } from "../../apps/web/src/generated-presentation";
import { GeneratedWorldCanvas } from "../../apps/web/src/generated-world-canvas";
import { buildGeneratedWorldExperience } from "../../apps/web/src/generated-world-runtime";

declare global {
	interface Window {
		__eonfolkPresentationStress?: Readonly<Record<string, unknown>>;
	}
}

function offset(index: number) {
	return { x: (index + 1) * 1_200, y: 0, z: (index % 2 === 0 ? 1 : -1) * 900 };
}

async function run() {
	const experience = await buildGeneratedWorldExperience({
		indexedDbFactory: null,
	});
	const projection = experience.projections[0];
	const model = experience.embodiments[0];
	if (
		projection === undefined ||
		model === undefined ||
		model.actors.length < 4
	)
		throw new Error("stress fixture requires four source actors");
	const requestedActorCount = Number(
		new URL(location.href).searchParams.get("actors") ?? "12",
	);
	const cloneCount = Math.max(0, requestedActorCount - model.actors.length);
	const spatialClones = Array.from({ length: cloneCount }, (_, index) => {
		const actor =
			projection.spatial.actors[index % projection.spatial.actors.length]!;
		return {
			...actor,
			citizenId: `presentation-stress-${index + 8}`,
			slug: `presentation-stress-${index + 8}`,
			name: `Stress resident ${index + 8}`,
			interactionTarget: null,
			positionMm: {
				x: actor.positionMm.x + offset(index).x,
				y: actor.positionMm.y,
				z: actor.positionMm.z + offset(index).z,
			},
			action: {
				...actor.action,
				actionId: `presentation-stress-action-${index + 8}`,
			},
		};
	});
	const modelClones = Array.from({ length: cloneCount }, (_, index) => {
		const actor = model.actors[index % model.actors.length]!;
		return {
			...actor,
			citizenId: `presentation-stress-${index + 8}`,
			name: `Stress resident ${index + 8}`,
			actionId: `presentation-stress-action-${index + 8}`,
			interactionTarget: null,
			focal: false,
			identityVariant: index + 8,
			positionMm: {
				x: actor.positionMm.x + offset(index).x,
				y: actor.positionMm.y,
				z: actor.positionMm.z + offset(index).z,
			},
		};
	});
	const stressProjection = {
		...projection,
		spatial: {
			...projection.spatial,
			actors: [...projection.spatial.actors, ...spatialClones],
		},
	};
	const stressModel = { ...model, actors: [...model.actors, ...modelClones] };
	createRoot(document.querySelector("#root")!).render(
		<GeneratedWorldCanvas
			projection={stressProjection}
			model={stressModel}
			navigation={INITIAL_GENERATED_NAVIGATION}
			presentationTick={48}
			reducedMotion={false}
			onFailure={() => {
				window.__eonfolkPresentationStress = { error: "renderer failure" };
			}}
		/>,
	);
	const readyDeadline = performance.now() + 20_000;
	while (
		document
			.querySelector(".generated-world-canvas")
			?.getAttribute("data-ready") !== "true"
	) {
		if (performance.now() >= readyDeadline)
			throw new Error("stress renderer did not become ready");
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => resolve()),
		);
	}
	await new Promise((resolve) => setTimeout(resolve, 1_000));
	const samples: number[] = [];
	let previous = performance.now();
	function sample(now: number) {
		if (samples.length >= 360) {
			const sorted = [...samples.slice(60)].sort((left, right) => left - right);
			window.__eonfolkPresentationStress = {
				actorCount: stressModel.actors.length,
				frameSamples: sorted.length,
				p95FrameMilliseconds: sorted[Math.floor(sorted.length * 0.95)],
			};
			return;
		}
		samples.push(now - previous);
		previous = now;
		requestAnimationFrame(sample);
	}
	requestAnimationFrame(sample);
}

void run().catch((error: unknown) => {
	window.__eonfolkPresentationStress = {
		error: error instanceof Error ? error.message : String(error),
	};
});
