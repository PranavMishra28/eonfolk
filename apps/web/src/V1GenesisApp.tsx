import type {
	GeneratedCivilizationSpatialProjection,
	SpatialActorProjection,
} from "@eonfolk/world-presentation";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import {
	loadGeneratedWorldExperience,
	type GeneratedWorldExperience,
} from "./generated-world-runtime";
import { V1_GENESIS_RELEASE_ID, V1_GENESIS_SEED } from "./v1-genesis-runtime";

const GeneratedWorldCanvas = lazy(async () => {
	const module = await import("./generated-world-canvas");
	return { default: module.GeneratedWorldCanvas };
});

type GenesisRoute = "entry" | "world";
type WorldView = "embodied" | "semantic" | "overview";

function shorten(value: string): string {
	return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

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

function WorldIdentity({
	experience,
}: {
	readonly experience: GeneratedWorldExperience;
}) {
	return (
		<dl className="v1-identity" aria-label="Immutable world identity">
			<div>
				<dt>World</dt>
				<dd>{experience.worldId}</dd>
			</div>
			<div>
				<dt>Identity hash</dt>
				<dd title={experience.worldIdentityHash}>
					{shorten(experience.worldIdentityHash)}
				</dd>
			</div>
			<div>
				<dt>State hash</dt>
				<dd title={experience.stateHash}>{shorten(experience.stateHash)}</dd>
			</div>
			<div>
				<dt>Simulation horizon</dt>
				<dd>{experience.horizonDays} days</dd>
			</div>
		</dl>
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
					<p className="v1-kicker">CANONICAL CHECKPOINT</p>
					<h2 id="v1-proof-title">One generated origin, advanced in full.</h2>
					<WorldIdentity experience={experience} />
					<details>
						<summary>Show the complete fixed seed</summary>
						<code data-testid="genesis-seed">{V1_GENESIS_SEED}</code>
					</details>
					<p className="v1-release-id">Release {V1_GENESIS_RELEASE_ID}</p>
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

function ActorDetail({ actor }: { readonly actor: SpatialActorProjection }) {
	return (
		<section className="generated-actor-detail" aria-labelledby="actor-title">
			<p className="v1-kicker">SELECTED PERSON</p>
			<h2 id="actor-title">{actor.name}</h2>
			<p className="v1-context-role">{readableId(actor.role)}</p>
			<p>{actor.semanticLabel}</p>
			<dl>
				<div>
					<dt>Action</dt>
					<dd>{readableId(actor.animationClass)}</dd>
				</div>
				<div>
					<dt>Place</dt>
					<dd>{actor.action.destinationPlaceId}</dd>
				</div>
				<div>
					<dt>Authority</dt>
					<dd>
						{actor.action.sourceKind === "world-event"
							? `Committed event ${actor.action.eventId ?? "unavailable"}`
							: "Scheduler-owned current behavior; no result claimed"}
					</dd>
				</div>
				<div>
					<dt>Carrying</dt>
					<dd>{actor.prop === null ? "nothing" : readableId(actor.prop)}</dd>
				</div>
			</dl>
		</section>
	);
}

function SemanticSettlement({
	projection,
	selectedActorId,
	onActor,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly selectedActorId: string | null;
	readonly onActor: (citizenId: string) => void;
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
			<section aria-labelledby="semantic-people-title">
				<h3 id="semantic-people-title">People and current actions</h3>
				{projection.spatial.actors.length === 0 ? (
					<p>No canonical resident activity is available.</p>
				) : (
					<ul>
						{projection.spatial.actors.map((actor) => (
							<li key={actor.citizenId}>
								<button
									type="button"
									aria-pressed={actor.citizenId === selectedActorId}
									onClick={() => onActor(actor.citizenId)}
								>
									<strong>{actor.name}</strong>
									<span>{actor.semanticLabel}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
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
	selectedActorId,
	onActor,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly selectedActorId: string | null;
	readonly onActor: (citizenId: string) => void;
}) {
	const selected =
		projection.spatial.actors.find(
			(actor) => actor.citizenId === selectedActorId,
		) ?? projection.spatial.actors[0];
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
			{selected === undefined ? (
				<ProjectionUnavailable projection={projection} />
			) : (
				<ActorDetail actor={selected} />
			)}
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
			<fieldset className="v1-people-list">
				<legend className="sr-only">Canonical residents</legend>
				{projection.spatial.actors.map((actor) => (
					<button
						key={actor.citizenId}
						type="button"
						aria-pressed={actor.citizenId === selected?.citizenId}
						onClick={() => onActor(actor.citizenId)}
					>
						<span
							className={`generated-activity-dot generated-activity-dot--${actor.animationClass}`}
							aria-hidden="true"
						/>
						<span>
							<strong>{actor.name}</strong>
							<small>{actor.semanticLabel}</small>
						</span>
					</button>
				))}
			</fieldset>
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
	const [reduceMotion, setReduceMotion] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
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
	const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

	if (projection === undefined)
		return <WorldError error={new Error("No settlement projection exists")} />;
	const openSettlement = (settlementId: string) => {
		setSelectedSettlementId(settlementId);
		setSelectedActorId(null);
		setRendererFailed(false);
		setView("embodied");
	};
	const effectiveView = rendererFailed ? "semantic" : view;

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
		>
			<header className="v1-world-header">
				<a className="v1-brand" href="/genesis" aria-label="Canonical origin">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">CANONICAL GENERATED CIVILIZATION</p>
					<h1>{projection.local.settlement.name}</h1>
					<p>
						Day {experience.horizonDays} · {projection.spatial.actors.length}{" "}
						visible residents · state {shorten(experience.stateHash)}
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="World view">
					<button
						type="button"
						aria-pressed={effectiveView === "embodied"}
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
					) : null}
					<SemanticSettlement
						projection={projection}
						selectedActorId={selectedActorId}
						onActor={setSelectedActorId}
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
								reducedMotion={reduceMotion}
								selectedActorId={selectedActorId}
								onFailure={() => setRendererFailed(true)}
							/>
						</Suspense>
						<div className="v1-world-vignette" aria-hidden="true" />
					</div>
					<GeneratedContextPanel
						projection={projection}
						selectedActorId={selectedActorId}
						onActor={setSelectedActorId}
					/>
				</section>
			)}

			<footer className="v1-world-footer">
				<p>
					Every person, place, project, and action above is read from the
					generated world and validated civilization checkpoint. Selection and
					camera state never write back to Reality.
				</p>
				<a href="/legacy">Open the frozen Riverhold regression surface</a>
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
