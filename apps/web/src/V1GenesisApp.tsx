import type { GeneratedCivilizationSpatialProjection } from "@eonfolk/world-presentation";
import {
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { GeneratedEmbodimentControls } from "./components/generated/GeneratedEmbodimentControls";
import { GeneratedSponsorChronicle } from "./components/generated/GeneratedSponsorChronicle";
import { browserDiagnostics } from "./diagnostics";
import {
	type GeneratedAssetIntegrity,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	INITIAL_GENERATED_NAVIGATION,
	reduceGeneratedNavigation,
	verifyGeneratedFolkAsset,
} from "./generated-presentation";
import {
	type GeneratedWorldExperience,
	loadGeneratedWorldExperience,
} from "./generated-world-runtime";

const GeneratedWorldCanvas = lazy(async () => {
	const module = await import("./generated-world-canvas");
	return { default: module.GeneratedWorldCanvas };
});

type GenesisRoute = "entry" | "world";
type WorldView = "embodied" | "semantic" | "overview";

type GeneratedAssetState =
	| Readonly<{ readonly status: "checking" }>
	| Readonly<{
			readonly status: "verified";
			readonly integrity: GeneratedAssetIntegrity;
	  }>
	| Readonly<{ readonly status: "failed"; readonly error: Error }>;

function readableId(value: string): string {
	return value.replace(/[-_:]+/gu, " ");
}

function useGeneratedExperience(): {
	readonly experience: GeneratedWorldExperience | null;
	readonly error: Error | null;
} {
	const [experience, setExperience] = useState<GeneratedWorldExperience | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	useEffect(() => {
		let active = true;
		void loadGeneratedWorldExperience().then(
			(value) => {
				if (active) setExperience(value);
			},
			(reason: unknown) => {
				if (!active) return;
				setError(
					reason instanceof Error
						? reason
						: new Error("The generated civilization could not be projected"),
				);
			},
		);
		return () => {
			active = false;
		};
	}, []);
	return { experience, error };
}

function useGeneratedAsset(): GeneratedAssetState {
	const [state, setState] = useState<GeneratedAssetState>(() =>
		Object.freeze({ status: "checking" }),
	);
	useEffect(() => {
		let active = true;
		void verifyGeneratedFolkAsset().then(
			(integrity) => {
				if (active) setState(Object.freeze({ status: "verified", integrity }));
			},
			(reason: unknown) => {
				if (active)
					setState(
						Object.freeze({
							status: "failed",
							error:
								reason instanceof Error
									? reason
									: new Error("Generated asset verification failed"),
						}),
					);
			},
		);
		return () => {
			active = false;
		};
	}, []);
	return state;
}

function WorldLoading() {
	return (
		<main className="v1-genesis-shell v1-genesis-loading" aria-busy="true">
			<p className="v1-kicker">GENERATING CANONICAL REALITY</p>
			<h1>Advancing one world through its first year.</h1>
			<p>
				World generation and civilization simulation are deterministic, local,
				and complete without an external model.
			</p>
		</main>
	);
}

function WorldError({ error }: { readonly error: Error }) {
	return (
		<main className="v1-genesis-shell" aria-labelledby="v1-error-title">
			<p className="v1-kicker">WORLD UNAVAILABLE</p>
			<h1 id="v1-error-title">No incomplete world is being shown as fact.</h1>
			<p>
				The canonical generation, simulation, or projection boundary failed
				closed.
			</p>
			<details>
				<summary>Technical detail</summary>
				<code>{error.message}</code>
			</details>
			<a className="v1-text-link" href="/genesis">
				Try the canonical origin again
			</a>
		</main>
	);
}

function GenesisEntry({
	experience,
}: {
	readonly experience: GeneratedWorldExperience;
}) {
	const origin = experience.projections[0];
	return (
		<main
			className="v1-genesis-entry"
			data-world-id={experience.worldId}
			data-state-hash={experience.stateHash}
		>
			<header className="v1-entry-hero">
				<a className="v1-brand" href="/" aria-label="Eonfolk home">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-entry-copy">
					<p className="v1-kicker">ONE WORLD · ONE YEAR · NO ACCOUNT</p>
					<h1>A civilization has already begun.</h1>
					<p>
						Eight canonical people have gathered, worked, formed relationships,
						and founded what the world could sustain. Enter their current
						reality; the scene never invents a person or action missing from
						simulation.
					</p>
					<a className="v1-primary-link" href="/world">
						Enter the living world
					</a>
				</div>
				<section className="v1-genesis-proof" aria-labelledby="v1-proof-title">
					<p className="v1-kicker">THE SETTLEMENT TODAY</p>
					<h2 id="v1-proof-title">
						{origin?.local.settlement.name ?? "The first settlement"} endured
						long enough to send out a second founding.
					</h2>
					<p>
						Enter on day {experience.horizonDays}. Watch where people go, what
						they carry, and which shared work survives scarcity.
					</p>
					<nav aria-label="More about EONFOLK">
						<a href="/research">Research evidence</a>
						<a href="/developer">Developer surface</a>
					</nav>
				</section>
			</header>
			<section className="v1-entry-ledger" aria-labelledby="v1-world-now-title">
				<div>
					<p className="v1-kicker">THE WORLD NOW</p>
					<h2 id="v1-world-now-title">
						{origin?.local.settlement.name ?? "A settlement"} is no longer
						alone.
					</h2>
				</div>
				<ul aria-label="Canonical world summary">
					<li>
						<strong>{experience.population}</strong> canonical people
					</li>
					<li>
						<strong>{experience.settlementCount}</strong> grounded settlements
					</li>
					<li>
						<strong>{experience.horizonDays}</strong> simulated days
					</li>
					<li>
						<strong>
							{experience.projections.reduce(
								(total, projection) => total + projection.projects.length,
								0,
							)}
						</strong>{" "}
						canonical projects
					</li>
				</ul>
			</section>
		</main>
	);
}

function ProjectionUnavailable({
	projection,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
}) {
	return (
		<section className="generated-unavailable" role="status">
			<p className="v1-kicker">EMBODIED VIEW UNAVAILABLE</p>
			<h2>No activity is being inferred for this settlement.</h2>
			<p>
				Canonical projection stopped because{" "}
				{projection.availability.reasons.map(readableId).join(" and ")}. The
				grounded places remain inspectable below.
			</p>
		</section>
	);
}

function SemanticSettlement({
	projection,
	model,
	navigation,
	dispatch,
	presentationTick,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationTick: number;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
}) {
	return (
		<section
			className="generated-semantic"
			data-testid="generated-semantic-world"
		>
			<div>
				<p className="v1-kicker">WORLD IN WORDS</p>
				<h2>{projection.local.settlement.semanticLabel}</h2>
				<p>
					{projection.local.semanticCounts.sites} grounded sites,{" "}
					{projection.local.semanticCounts.routes} routes, and{" "}
					{projection.spatial.actors.length} visibly scheduled residents.
				</p>
			</div>
			<GeneratedEmbodimentControls
				model={model}
				navigation={navigation}
				dispatch={dispatch}
				presentationTick={presentationTick}
				presentationPlaying={presentationPlaying}
				reducedMotion={reducedMotion}
				onTogglePresentation={onTogglePresentation}
				onStepPresentation={onStepPresentation}
			/>
			<section aria-labelledby="semantic-places-title">
				<h3 id="semantic-places-title">Grounded places</h3>
				<ul>
					{projection.local.sites.map((site) => (
						<li key={site.siteId}>
							<strong>{site.name}</strong>
							<span>{site.semanticLabel}</span>
						</li>
					))}
				</ul>
			</section>
		</section>
	);
}

function SettlementOverview({
	experience,
	selectedSettlementId,
	onSettlement,
}: {
	readonly experience: GeneratedWorldExperience;
	readonly selectedSettlementId: string;
	readonly onSettlement: (settlementId: string) => void;
}) {
	return (
		<section
			className="generated-overview"
			data-testid="generated-world-overview"
		>
			<header>
				<p className="v1-kicker">CIVILIZATION OVERVIEW</p>
				<h2>One world, {experience.settlementCount} inhabited places.</h2>
				<p>
					This is a semantic equivalent to the embodied views. Counts and
					actions come from the same validated civilization checkpoint.
				</p>
			</header>
			<div className="generated-settlement-cards">
				{experience.projections.map((projection) => (
					<article key={projection.local.settlement.settlementId}>
						<p className="v1-kicker">
							{projection.local.settlement.foundedAtSimulationTime === 0
								? "ORIGIN SETTLEMENT"
								: "FOUNDED SETTLEMENT"}
						</p>
						<h3>{projection.local.settlement.name}</h3>
						<p>{projection.local.settlement.semanticLabel}</p>
						<ul>
							<li>{projection.spatial.actors.length} resident activities</li>
							<li>{projection.local.semanticCounts.sites} grounded sites</li>
							<li>{projection.projects.length} canonical projects</li>
						</ul>
						<button
							type="button"
							aria-pressed={
								projection.local.settlement.settlementId ===
								selectedSettlementId
							}
							onClick={() =>
								onSettlement(projection.local.settlement.settlementId)
							}
						>
							Open {projection.local.settlement.name}
						</button>
					</article>
				))}
			</div>
		</section>
	);
}

function GeneratedContextPanel({
	projection,
	model,
	navigation,
	dispatch,
	presentationTick,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationTick: number;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
}) {
	return (
		<aside
			className="v1-context-panel"
			aria-label="Canonical settlement context"
		>
			<div className="v1-context-now" aria-live="polite">
				<p className="v1-kicker">HAPPENING NOW</p>
				<strong>{projection.local.settlement.name}</strong>
				<span>
					{projection.spatial.actors.length} residents have scheduler-owned
					activities at this checkpoint.
				</span>
			</div>
			<GeneratedEmbodimentControls
				model={model}
				navigation={navigation}
				dispatch={dispatch}
				presentationTick={presentationTick}
				presentationPlaying={presentationPlaying}
				reducedMotion={reducedMotion}
				onTogglePresentation={onTogglePresentation}
				onStepPresentation={onStepPresentation}
			/>
			{projection.projects.map((project) => (
				<section className="v1-project-card" key={project.projectId}>
					<p className="v1-kicker">CANONICAL PROJECT</p>
					<h3>{project.name}</h3>
					<p>{project.semanticLabel}</p>
					<progress max={10_000} value={project.progressBasisPoints}>
						{project.progressBasisPoints / 100}%
					</progress>
				</section>
			))}
		</aside>
	);
}

function GeneratedWorld({
	experience,
}: {
	readonly experience: GeneratedWorldExperience;
}) {
	const [view, setView] = useState<WorldView>("embodied");
	const [rendererFailed, setRendererFailed] = useState(false);
	const asset = useGeneratedAsset();
	const [reduceMotion, setReduceMotion] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const [presentationTick, setPresentationTick] = useState(0);
	const [presentationPlaying, setPresentationPlaying] = useState(
		() => !reduceMotion,
	);
	const [navigation, dispatch] = useReducer(
		reduceGeneratedNavigation,
		INITIAL_GENERATED_NAVIGATION,
	);
	const rendererIncidentReported = useRef(false);
	const assetIncidentReported = useRef(false);
	const diagnosticStateRecorded = useRef<string | null>(null);
	const [selectedSettlementId, setSelectedSettlementId] = useState(
		experience.projections[0]?.local.settlement.settlementId ?? "",
	);
	const projection = useMemo(
		() =>
			experience.projections.find(
				(candidate) =>
					candidate.local.settlement.settlementId === selectedSettlementId,
			) ?? experience.projections[0],
		[experience, selectedSettlementId],
	);
	const model = useMemo(
		() =>
			experience.embodiments.find(
				(candidate) => candidate.settlementId === selectedSettlementId,
			) ?? experience.embodiments[0],
		[experience, selectedSettlementId],
	);

	useEffect(() => {
		if (!presentationPlaying || reduceMotion) return;
		const interval = window.setInterval(
			() => setPresentationTick((tick) => tick + 1),
			125,
		);
		return () => window.clearInterval(interval);
	}, [presentationPlaying, reduceMotion]);

	useEffect(() => {
		if (reduceMotion) setPresentationPlaying(false);
	}, [reduceMotion]);

	useEffect(() => {
		if (projection === undefined) return;
		const source = projection.spatial.source;
		browserDiagnostics.setWorldHead({
			runId: source.runId,
			regionId: source.regionId,
			revision: source.revision,
			sequence: source.throughSequence,
			simulationTime: experience.simulationTime,
			status: "healthy",
		});
		if (diagnosticStateRecorded.current === experience.stateHash) return;
		diagnosticStateRecorded.current = experience.stateHash;
		for (const settlement of experience.projections)
			for (const actor of settlement.spatial.actors)
				browserDiagnostics.record({
					category: "presentation",
					name: "canonical-action-render-linked",
					severity: "info",
					outcome: "observed",
					scope: {
						component: "generated-world",
						runId: settlement.spatial.source.runId,
						regionId: settlement.spatial.source.regionId,
					},
					fields: {
						citizenId: actor.citizenId,
						settlementId: settlement.local.settlement.settlementId,
						actionId: actor.action.actionId,
						actionKind: actor.action.kind,
						actionStatus: actor.action.status,
						actionSource: actor.action.sourceKind,
						eventSequence: actor.action.eventSequence ?? -1,
						prop: actor.prop ?? "none",
					},
				});
	}, [experience, projection]);

	useEffect(() => {
		if (asset.status !== "failed" || assetIncidentReported.current) return;
		assetIncidentReported.current = true;
		void browserDiagnostics.captureRuntimeFailure({
			code: "GENERATED_ASSET_INTEGRITY_FAILED",
			component: "generated-world-asset",
			protectReality: () => setView("semantic"),
		});
	}, [asset.status]);

	if (projection === undefined || model === undefined)
		return <WorldError error={new Error("No settlement projection exists")} />;
	const openSettlement = (settlementId: string) => {
		setSelectedSettlementId(settlementId);
		dispatch({ type: "overview" });
		setPresentationTick(0);
		setRendererFailed(false);
		setView("embodied");
	};
	const reportRendererFailure = () => {
		setRendererFailed(true);
		if (rendererIncidentReported.current) return;
		rendererIncidentReported.current = true;
		void browserDiagnostics.captureRuntimeFailure({
			code: "GENERATED_RENDERER_FAILED",
			component: "generated-world-renderer",
			protectReality: () => setRendererFailed(true),
		});
	};
	const assetVerified = asset.status === "verified";
	const effectiveView = rendererFailed || !assetVerified ? "semantic" : view;
	const togglePresentation = () =>
		setPresentationPlaying((playing) => !playing);
	const stepPresentation = () =>
		setPresentationTick((presentationTick) => presentationTick + 1);

	return (
		<main
			className={`v1-world ${reduceMotion ? "v1-reduced-motion" : ""}`}
			data-world-id={experience.worldId}
			data-world-identity-hash={experience.worldIdentityHash}
			data-state-hash={experience.stateHash}
			data-simulation-time={experience.simulationTime}
			data-projection-status={projection.availability.status}
			data-persistence={experience.persistence.kind}
			data-persistence-restored={String(experience.persistence.restored)}
			data-catch-up-receipts={experience.persistence.catchUpReceipts}
			data-previous-state-hash={experience.previousStateHash}
			data-previous-horizon-days={experience.previousHorizonDays}
			data-asset-integrity={asset.status}
			data-presentation-tick={presentationTick}
			data-presentation-playing={String(presentationPlaying)}
		>
			<header className="v1-world-header">
				<a className="v1-brand" href="/genesis" aria-label="Canonical origin">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">A LIVING SETTLEMENT</p>
					<h1>{projection.local.settlement.name}</h1>
					<p>
						Day {experience.horizonDays} · {projection.spatial.actors.length}{" "}
						visible residents
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="World view">
					<button
						type="button"
						aria-pressed={effectiveView === "embodied"}
						disabled={!assetVerified}
						onClick={() => setView("embodied")}
					>
						Embodied
					</button>
					<button
						type="button"
						aria-pressed={effectiveView === "semantic"}
						onClick={() => setView("semantic")}
					>
						World in words
					</button>
					<button
						type="button"
						aria-pressed={effectiveView === "overview"}
						onClick={() => setView("overview")}
					>
						Settlements
					</button>
					<button
						type="button"
						aria-pressed={reduceMotion}
						onClick={() => setReduceMotion((value) => !value)}
					>
						{reduceMotion ? "Motion reduced" : "Reduce motion"}
					</button>
				</nav>
			</header>

			<nav className="generated-settlement-switcher" aria-label="Settlements">
				{experience.projections.map((candidate) => (
					<button
						key={candidate.local.settlement.settlementId}
						type="button"
						aria-pressed={
							candidate.local.settlement.settlementId ===
							projection.local.settlement.settlementId
						}
						onClick={() =>
							openSettlement(candidate.local.settlement.settlementId)
						}
					>
						{candidate.local.settlement.name}
						<small>{candidate.spatial.actors.length} residents</small>
					</button>
				))}
			</nav>

			{effectiveView === "overview" ? (
				<SettlementOverview
					experience={experience}
					selectedSettlementId={projection.local.settlement.settlementId}
					onSettlement={openSettlement}
				/>
			) : effectiveView === "semantic" ? (
				<>
					{rendererFailed ? (
						<p className="renderer-note" role="status">
							The embodied renderer failed. The same canonical world remains
							inspectable in semantic form.
						</p>
					) : asset.status === "checking" ? (
						<p className="renderer-note" role="status">
							Verifying the repository-authored embodiment asset. Canonical
							world actions remain inspectable in words.
						</p>
					) : asset.status === "failed" ? (
						<p className="renderer-note" role="status">
							The embodiment asset did not pass integrity checks. The canonical
							world remains inspectable without it.
						</p>
					) : null}
					<SemanticSettlement
						projection={projection}
						model={model}
						navigation={navigation}
						dispatch={dispatch}
						presentationTick={presentationTick}
						presentationPlaying={presentationPlaying}
						reducedMotion={reduceMotion}
						onTogglePresentation={togglePresentation}
						onStepPresentation={stepPresentation}
					/>
				</>
			) : projection.availability.status === "unavailable" ? (
				<ProjectionUnavailable projection={projection} />
			) : (
				<section className="v1-living-stage" aria-label="Embodied settlement">
					<div className="v1-world-canvas-frame">
						<Suspense
							fallback={
								<section className="v1-living-loading" aria-busy="true">
									<p>Opening canonical local space…</p>
								</section>
							}
						>
							<GeneratedWorldCanvas
								projection={projection}
								model={model}
								navigation={navigation}
								presentationTick={presentationTick}
								reducedMotion={reduceMotion}
								onFailure={reportRendererFailure}
							/>
						</Suspense>
						<div className="v1-world-vignette" aria-hidden="true" />
					</div>
					<GeneratedContextPanel
						projection={projection}
						model={model}
						navigation={navigation}
						dispatch={dispatch}
						presentationTick={presentationTick}
						presentationPlaying={presentationPlaying}
						reducedMotion={reduceMotion}
						onTogglePresentation={togglePresentation}
						onStepPresentation={stepPresentation}
					/>
				</section>
			)}
			<GeneratedSponsorChronicle
				experience={experience}
				settlementId={projection.local.settlement.settlementId}
				dispatch={dispatch}
				onOpenSettlement={openSettlement}
			/>
			<details className="v1-feedback-drawer">
				<summary>Release Genesis feedback</summary>
				<div>
					<p className="v1-kicker">RELEASE GENESIS FEEDBACK</p>
					<FeedbackPanel contextLabel="RELEASE GENESIS FEEDBACK" />
				</div>
			</details>

			<footer className="v1-world-footer">
				<p>
					Watch the world first. Select a person or place when you want to
					understand more.
				</p>
				<nav aria-label="Evidence and development">
					<a href="/research">Research evidence</a>
					<a href="/developer">Developer surface</a>
				</nav>
			</footer>
		</main>
	);
}

export function V1GenesisApp({ route }: { readonly route: GenesisRoute }) {
	useEffect(() => {
		document.title =
			route === "entry"
				? "EONFOLK — A civilization has begun"
				: "EONFOLK — Canonical generated world";
	}, [route]);
	const { experience, error } = useGeneratedExperience();
	if (error !== null) return <WorldError error={error} />;
	if (experience === null) return <WorldLoading />;
	return route === "entry" ? (
		<GenesisEntry experience={experience} />
	) : (
		<GeneratedWorld experience={experience} />
	);
}
