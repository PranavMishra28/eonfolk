import { type Dispatch, useEffect } from "react";

import {
	GENERATED_NAVIGATION_EVENT,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	generatedCameraFidelity,
	parseGeneratedNavigationAction,
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
	presentationTick,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
}: {
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: Dispatch<GeneratedNavigationAction>;
	readonly presentationTick: number;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
}) {
	useEffect(() => {
		const onCanvasNavigation = (event: Event) => {
			const action = parseGeneratedNavigationAction(
				(event as CustomEvent<unknown>).detail,
			);
			if (action !== null) dispatch(action);
		};
		window.addEventListener(GENERATED_NAVIGATION_EVENT, onCanvasNavigation);
		return () =>
			window.removeEventListener(
				GENERATED_NAVIGATION_EVENT,
				onCanvasNavigation,
			);
	}, [dispatch]);
	const fidelity = generatedCameraFidelity(navigation.distanceMm);
	const selectedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const selectedActor =
		selectedCitizenId !== null
			? model.actors.find((actor) => actor.citizenId === selectedCitizenId)
			: undefined;
	return (
		<section
			className="generated-embodiment-controls"
			aria-label="World navigation and citizen context"
		>
			<fieldset className="generated-camera-controls">
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
					onClick={() =>
						dispatch({
							type: "orbit",
							yawDeltaDegrees: -12,
							pitchDeltaDegrees: 0,
						})
					}
				>
					Orbit left
				</button>
				<button
					type="button"
					onClick={() =>
						dispatch({
							type: "orbit",
							yawDeltaDegrees: 12,
							pitchDeltaDegrees: 0,
						})
					}
				>
					Orbit right
				</button>
				<button
					type="button"
					onClick={() =>
						dispatch({ type: "pan", xDeltaMm: -8_000, zDeltaMm: 0 })
					}
				>
					Pan west
				</button>
				<button
					type="button"
					onClick={() =>
						dispatch({ type: "pan", xDeltaMm: 8_000, zDeltaMm: 0 })
					}
				>
					Pan east
				</button>
				<button
					type="button"
					disabled={selectedActor === undefined}
					aria-pressed={navigation.followCitizen}
					onClick={() => dispatch({ type: "toggle-follow" })}
				>
					{navigation.followCitizen ? "Stop following" : "Follow citizen"}
				</button>
				<button
					type="button"
					disabled={reducedMotion}
					aria-pressed={presentationPlaying}
					onClick={onTogglePresentation}
				>
					{presentationPlaying ? "Pause motion" : "Play motion"}
				</button>
				<button type="button" onClick={onStepPresentation}>
					Step one pose
				</button>
			</fieldset>
			<p
				className="generated-camera-status"
				data-testid="generated-camera-status"
				data-focus-kind={navigation.focus.kind}
				data-following={String(navigation.followCitizen)}
				data-camera-distance-mm={navigation.distanceMm}
				data-semantic-scale={fidelity.semanticScale}
				data-fidelity-class={fidelity.fidelityClass}
				data-presentation-tick={presentationTick}
			>
				{fidelity.semanticScale} scale · {fidelity.fidelityClass}. Presentation
				tick {presentationTick}. Camera distance {navigation.distanceMm / 1_000}
				metres.
			</p>
			<fieldset className="generated-residents">
				<legend>Canonical residents</legend>
				<ul>
					{model.actors.map((actor) => (
						<li key={actor.citizenId}>
							<button
								type="button"
								data-citizen-id={actor.citizenId}
								data-action-id={actor.actionId}
								data-animation-class={actor.animationClass}
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
			</fieldset>
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
			{model.limitations.length === 0 ? null : (
				<div className="generated-limitations" role="status">
					<strong>Canonical movement limit</strong>
					<ul>
						{model.limitations.map((limitation) => (
							<li key={limitation}>{limitation}</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}
