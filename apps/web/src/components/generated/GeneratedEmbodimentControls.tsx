import type { Dispatch } from "react";

import type {
	GeneratedEmbodimentProjection,
	GeneratedNavigationAction,
	GeneratedNavigationState,
} from "../../generated-presentation";

/**
 * Keyboard/semantic parity for canvas selection, semantic zoom and follow.
 * It deliberately shares the renderer's navigation reducer instead of keeping
 * a second DOM-only selection state.
 */
export function GeneratedEmbodimentControls({
	model,
	navigation,
	dispatch,
}: {
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: Dispatch<GeneratedNavigationAction>;
}) {
	const selectedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const selectedActor =
		selectedCitizenId !== null
			? model.actors.find((actor) => actor.citizenId === selectedCitizenId)
			: undefined;
	return (
		<section aria-label="World navigation and citizen context">
			<fieldset>
				<legend>World camera controls</legend>
				<button type="button" onClick={() => dispatch({ type: "overview" })}>
					Settlement overview
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "zoom", deltaMm: -8_000 })}
				>
					Zoom in
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "zoom", deltaMm: 8_000 })}
				>
					Zoom out
				</button>
				<button
					type="button"
					disabled={selectedActor === undefined}
					aria-pressed={navigation.followCitizen}
					onClick={() => dispatch({ type: "toggle-follow" })}
				>
					{navigation.followCitizen ? "Stop following" : "Follow citizen"}
				</button>
			</fieldset>
			<ul aria-label={`${model.settlementName} residents`}>
				{model.actors.map((actor) => (
					<li key={actor.citizenId}>
						<button
							type="button"
							aria-pressed={selectedCitizenId === actor.citizenId}
							onClick={() =>
								dispatch({
									type: "select-citizen",
									citizenId: actor.citizenId,
								})
							}
						>
							{actor.name} · {actor.role} · {actor.animationClass}
						</button>
					</li>
				))}
			</ul>
			{selectedActor === undefined ? null : (
				<article
					aria-live="polite"
					aria-label={`${selectedActor.name} context`}
				>
					<h2>{selectedActor.name}</h2>
					<p>{selectedActor.semanticLabel}</p>
					<p>
						{selectedActor.grounding.kind === "route"
							? `On ${selectedActor.grounding.routeId} at ${selectedActor.grounding.progressBasisPoints} basis points.`
							: `At ${selectedActor.grounding.interactionSlotId}.`}
					</p>
				</article>
			)}
			{model.projects.length === 0 ? null : (
				<ul aria-label="Visible projects">
					{model.projects.map((project) => (
						<li key={project.projectId}>
							<button
								type="button"
								onClick={() =>
									dispatch({
										type: "select-project",
										projectId: project.projectId,
									})
								}
							>
								{project.semanticLabel}
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
