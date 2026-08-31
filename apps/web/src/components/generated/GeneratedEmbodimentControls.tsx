import type { GeneratedCivilizationSpatialProjection } from "@eonfolk/world-presentation";
import { type Dispatch, useEffect } from "react";

import {
	GENERATED_NAVIGATION_EVENT,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	generatedCameraFidelity,
	generatedNavigationReferencesExist,
	parseGeneratedNavigationAction,
	presentedActorCopy,
} from "../../generated-presentation";

/**
 * Keyboard/semantic parity for canvas selection, semantic zoom and follow.
 * It deliberately shares the renderer's navigation reducer instead of keeping
 * a second DOM-only selection state.
 */
export function GeneratedEmbodimentControls({
	projection,
	model,
	navigation,
	dispatch,
	presentationPlaying: _presentationPlaying,
	reducedMotion: _reducedMotion,
	onTogglePresentation: _onTogglePresentation,
	onStepPresentation,
	onNavigationRejected,
	showLookAround = true,
	visualProgress01 = 0.55,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: Dispatch<GeneratedNavigationAction>;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
	readonly onNavigationRejected?: (
		reason: "invalid-envelope" | "foreign-reference",
	) => void;
	readonly showLookAround?: boolean;
	readonly visualProgress01?: number;
}) {
	useEffect(() => {
		const onCanvasNavigation = (event: Event) => {
			const action = parseGeneratedNavigationAction(
				(event as CustomEvent<unknown>).detail,
			);
			if (action === null) onNavigationRejected?.("invalid-envelope");
			else if (!generatedNavigationReferencesExist(action, model, projection))
				onNavigationRejected?.("foreign-reference");
			else dispatch(action);
		};
		window.addEventListener(GENERATED_NAVIGATION_EVENT, onCanvasNavigation);
		return () =>
			window.removeEventListener(
				GENERATED_NAVIGATION_EVENT,
				onCanvasNavigation,
			);
	}, [dispatch, model, onNavigationRejected, projection]);
	const fidelity = generatedCameraFidelity(navigation.distanceMm);
	const selectedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const selectedBuildingId =
		navigation.focus.kind === "building" ? navigation.focus.buildingId : null;
	const selectedProjectId =
		navigation.focus.kind === "project" ? navigation.focus.projectId : null;
	const mara = model.actors.find((actor) => actor.name === "Mara Vale");
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const target = event.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement ||
				(target instanceof HTMLElement && target.isContentEditable)
			) {
				return;
			}
			const inScrollableChrome =
				target instanceof HTMLElement &&
				target.closest(
					".v1-context-panel, .v1-chronicle-record, .v1-feedback-popover, .feedback-panel, .v1-inspector-sheet",
				) !== null;
			const characterKey =
				event.key.length === 1 && /[a-z0-9=+\-_]/iu.test(event.key);
			if (characterKey && !event.altKey && !event.metaKey && !event.ctrlKey)
				return;
			if (event.key === "f" || event.key === "F") {
				if (mara === undefined) return;
				event.preventDefault();
				dispatch({ type: "select-citizen", citizenId: mara.citizenId });
				dispatch({ type: "toggle-follow" });
				return;
			}
			if (event.key === "Home" || event.key === "0") {
				event.preventDefault();
				dispatch({ type: "overview" });
				return;
			}
			if (inScrollableChrome) return;
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				dispatch({ type: "pan", xDeltaMm: -8_000, zDeltaMm: 0 });
				return;
			}
			if (event.key === "ArrowRight") {
				event.preventDefault();
				dispatch({ type: "pan", xDeltaMm: 8_000, zDeltaMm: 0 });
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				dispatch({ type: "pan", xDeltaMm: 0, zDeltaMm: -8_000 });
				return;
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				dispatch({ type: "pan", xDeltaMm: 0, zDeltaMm: 8_000 });
				return;
			}
			if (event.key === "+" || event.key === "=") {
				event.preventDefault();
				dispatch({ type: "zoom", deltaMm: -8_000 });
				return;
			}
			if (event.key === "-" || event.key === "_") {
				event.preventDefault();
				dispatch({ type: "zoom", deltaMm: 8_000 });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [dispatch, mara]);
	return (
		<section
			className="generated-embodiment-controls"
			aria-label="World navigation"
		>
			{showLookAround ? (
				<fieldset className="generated-camera-controls">
					<legend>Look around</legend>
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
						disabled={selectedCitizenId === null}
						aria-pressed={navigation.followCitizen}
						onClick={() => dispatch({ type: "toggle-follow" })}
					>
						{navigation.followCitizen ? "Stop following" : "Follow this person"}
					</button>
					<button type="button" onClick={onStepPresentation}>
						Step one beat
					</button>
				</fieldset>
			) : null}
			<p
				className="generated-camera-status"
				data-testid="generated-camera-status"
				data-camera-distance-mm={navigation.distanceMm}
				data-semantic-scale={fidelity.semanticScale}
			>
				{navigation.distanceMm / 1_000}m
			</p>
			<fieldset className="generated-residents">
				<legend>People here</legend>
				<ul>
					{model.actors.map((actor) => {
						const activity = presentedActorCopy(
							actor,
							projection,
							visualProgress01,
						);
						return (
							<li key={actor.citizenId}>
								<button
									type="button"
									data-citizen-id={actor.citizenId}
									data-action-id={actor.actionId}
									data-animation-class={actor.animationClass}
									data-presented-activity={activity}
									aria-pressed={selectedCitizenId === actor.citizenId}
									onClick={() =>
										dispatch({
											type: "select-citizen",
											citizenId: actor.citizenId,
										})
									}
								>
									{actor.name} · {actor.role} · {activity}
								</button>
							</li>
						);
					})}
				</ul>
			</fieldset>
			{projection.local.buildings.length === 0 ? null : (
				<ul className="generated-buildings" aria-label="Buildings">
					{projection.local.buildings.map((building) => {
						const selected = selectedBuildingId === building.buildingId;
						return (
							<li key={building.buildingId}>
								<button
									type="button"
									data-building-id={building.buildingId}
									aria-pressed={selected}
									aria-current={selected ? "true" : undefined}
									onClick={() =>
										dispatch({
											type: "select-building",
											buildingId: building.buildingId,
										})
									}
								>
									{building.semanticLabel}
								</button>
							</li>
						);
					})}
				</ul>
			)}
			{model.projects.length === 0 ? null : (
				<ul className="generated-projects" aria-label="Works in progress">
					{model.projects.map((project) => (
						<li key={project.projectId}>
							<button
								type="button"
								data-project-id={project.projectId}
								aria-pressed={selectedProjectId === project.projectId}
								aria-current={
									selectedProjectId === project.projectId ? "true" : undefined
								}
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
					<strong>What this view cannot show</strong>
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
