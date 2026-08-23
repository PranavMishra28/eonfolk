import type { SemanticScale } from "@eonfolk/world-presentation";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import type { WorldFocus } from "./components/RiverholdWorld";
import { SemanticWorld } from "./components/SemanticWorld";
import type { RiverholdProjection } from "./projection";
import { createRiverholdRuntimeBridge } from "./runtime";
import {
	loadV1GenesisExperience,
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
	type V1GenesisExperience,
} from "./v1-genesis-runtime";

const RiverholdWorld = lazy(async () => {
	const module = await import("./components/RiverholdWorld");
	return { default: module.RiverholdWorld };
});

type GenesisRoute = "entry" | "world";

function shorten(value: string): string {
	return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function useGenesisExperience(): {
	readonly experience: V1GenesisExperience | null;
	readonly error: Error | null;
} {
	const [experience, setExperience] = useState<V1GenesisExperience | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	useEffect(() => {
		let active = true;
		void loadV1GenesisExperience().then(
			(value) => {
				if (active) setExperience(value);
			},
			(reason: unknown) => {
				if (active)
					setError(
						reason instanceof Error
							? reason
							: new Error("Release Genesis could not be projected"),
					);
			},
		);
		return () => {
			active = false;
		};
	}, []);
	return { experience, error };
}

function useCanonicalLivingWorld(): {
	readonly projection: RiverholdProjection | null;
	readonly error: Error | null;
} {
	const [projection, setProjection] = useState<RiverholdProjection | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	useEffect(() => {
		let active = true;
		let bridge: ReturnType<typeof createRiverholdRuntimeBridge>;
		try {
			bridge = createRiverholdRuntimeBridge();
		} catch (reason) {
			setError(reason instanceof Error ? reason : new Error(String(reason)));
			return;
		}
		const unsubscribe = bridge.subscribe(
			(value) => {
				if (active) setProjection(value);
			},
			(reason) => {
				if (active) setError(reason);
			},
		);
		void bridge.ready().then(
			(value) => {
				if (active) setProjection(value);
			},
			(reason: unknown) => {
				if (active)
					setError(
						reason instanceof Error ? reason : new Error(String(reason)),
					);
			},
		);
		return () => {
			active = false;
			unsubscribe();
			bridge.clear();
		};
	}, []);
	return { projection, error };
}

function GenesisLoading() {
	return (
		<main className="v1-genesis-shell v1-genesis-loading" aria-busy="true">
			<p className="v1-kicker">RELEASE GENESIS</p>
			<h1>Reading the same world from the same seed.</h1>
			<p>Generation is local, deterministic, and needs no account or model.</p>
		</main>
	);
}

function GenesisError({ error }: { readonly error: Error }) {
	return (
		<main className="v1-genesis-shell" aria-labelledby="v1-error-title">
			<p className="v1-kicker">WORLD UNAVAILABLE</p>
			<h1 id="v1-error-title">No world is being presented as factual.</h1>
			<p>The canonical projection stopped before it could be shown safely.</p>
			<details>
				<summary>Technical detail</summary>
				<code>{error.message}</code>
			</details>
			<a className="v1-text-link" href="/genesis">
				Return to Release Genesis
			</a>
		</main>
	);
}

function WorldIdentity({
	experience,
}: {
	readonly experience: V1GenesisExperience;
}) {
	const { overview } = experience;
	return (
		<dl className="v1-identity" aria-label="Immutable world identity">
			<div>
				<dt>World</dt>
				<dd>{overview.source.worldId}</dd>
			</div>
			<div>
				<dt>Identity hash</dt>
				<dd title={overview.source.identityHash}>
					{shorten(overview.source.identityHash)}
				</dd>
			</div>
			<div>
				<dt>Genesis hash</dt>
				<dd title={overview.source.releaseGenesisHash}>
					{shorten(overview.source.releaseGenesisHash)}
				</dd>
			</div>
			<div>
				<dt>Simulation time</dt>
				<dd>{overview.source.generatedAtSimulationTime}</dd>
			</div>
		</dl>
	);
}

function GenesisEntry({
	experience,
}: {
	readonly experience: V1GenesisExperience;
}) {
	const { overview, settlement } = experience;
	return (
		<main className="v1-genesis-entry">
			<header className="v1-entry-hero">
				<a className="v1-brand" href="/" aria-label="Eonfolk home">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-entry-copy">
					<p className="v1-kicker">RELEASE GENESIS · LOCAL PROOF</p>
					<h1>A living place, already in motion.</h1>
					<p>
						Riverhold's eight people work, travel, exchange goods, and react
						from canonical local state—not ambient animation. The generated
						origin is kept separate until simulation and world generation share
						one adapter.
					</p>
					<a className="v1-primary-link" href="/world">
						Enter the Riverhold local proof
					</a>
				</div>
				<section className="v1-genesis-proof" aria-labelledby="v1-proof-title">
					<p className="v1-kicker">IMMUTABLE ORIGIN</p>
					<h2 id="v1-proof-title">One generated world. One factual origin.</h2>
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
						A settlement to read through its people.
					</h2>
				</div>
				<ul aria-label="Release proof summary">
					<li>
						<strong>8</strong> canonical Riverhold citizens
					</li>
					<li>
						<strong>{settlement.semanticCounts.sites}</strong> generated sites
					</li>
					<li>
						<strong>{settlement.semanticCounts.routes}</strong> generated routes
					</li>
					<li>
						<strong>{overview.semanticCounts.terrainCells}</strong> terrain
						cells
					</li>
				</ul>
			</section>
		</main>
	);
}

function LivingWorldLoading() {
	return (
		<section className="v1-living-loading" aria-busy="true">
			<p className="v1-kicker">OPENING LOCAL REALITY</p>
			<h2>The settlement is taking its first measured step.</h2>
			<p>Canonical events and citizens are loading in the world worker.</p>
		</section>
	);
}

function ContextPanel({
	projection,
	selectedCitizenId,
	selectedPlaceId,
	onCitizen,
}: {
	readonly projection: RiverholdProjection;
	readonly selectedCitizenId: string | null;
	readonly selectedPlaceId: string | null;
	readonly onCitizen: (citizenId: string) => void;
}) {
	const citizen =
		projection.citizens.find(({ id }) => id === selectedCitizenId) ??
		projection.citizens.find(({ focal }) => focal === true) ??
		projection.citizens[0];
	const millworker = projection.citizens.find(
		({ canonicalAction }) => canonicalAction.affordanceId === "mill-repair",
	);
	return (
		<aside className="v1-context-panel" aria-label="World context">
			<div className="v1-context-now" aria-live="polite">
				<p className="v1-kicker">HAPPENING NOW</p>
				<strong>{projection.worldNotices[0]}</strong>
				<span>{projection.worldNotices[1]}</span>
			</div>
			{citizen === undefined ? null : (
				<section aria-labelledby="v1-citizen-title">
					<p className="v1-kicker">SELECTED CITIZEN</p>
					<h2 id="v1-citizen-title">{citizen.name}</h2>
					<p className="v1-context-role">{citizen.role}</p>
					<p>{citizen.activity}</p>
					<dl>
						<div>
							<dt>Place</dt>
							<dd>{citizen.place}</dd>
						</div>
						<div>
							<dt>Visible action</dt>
							<dd>{citizen.canonicalAction.kind}</dd>
						</div>
						<div>
							<dt>Authority</dt>
							<dd>
								{citizen.canonicalAction.status === "committed"
									? "Committed world event"
									: "Current typed behavior; no result claimed"}
							</dd>
						</div>
					</dl>
				</section>
			)}
			<section
				className="v1-project-card"
				data-testid="v1-project-state"
				data-project-state={
					projection.worldProcesses.millRepaired ? "complete" : "active"
				}
				aria-labelledby="v1-project-title"
			>
				<p className="v1-kicker">SETTLEMENT PROJECT</p>
				<h3 id="v1-project-title">River Mill repair</h3>
				<strong>
					{projection.worldProcesses.millRepaired
						? "Wheel repaired and operational"
						: "Repair active at the mill wheel"}
				</strong>
				<p>
					{projection.worldProcesses.millRepaired
						? "The changed wheel is backed by the committed mill-repair event."
						: `${millworker?.name ?? "A repair hand"} is working from a reserved mill affordance.`}
				</p>
			</section>
			{selectedPlaceId === null ? null : (
				<p className="v1-place-selection" role="status">
					Viewing place: <strong>{selectedPlaceId}</strong>
				</p>
			)}
			<fieldset className="v1-people-list">
				<legend className="sr-only">Eight citizens</legend>
				{projection.citizens.map((person) => (
					<button
						key={person.id}
						type="button"
						aria-pressed={person.id === citizen?.id}
						onClick={() => onCitizen(person.id)}
					>
						<span
							className={`activity-dot activity-dot--${person.activityKind}`}
							aria-hidden="true"
						/>
						<span>
							<strong>{person.name}</strong>
							<small>{person.activity}</small>
						</span>
					</button>
				))}
			</fieldset>
		</aside>
	);
}

function GenesisWorld({
	experience,
}: {
	readonly experience: V1GenesisExperience;
}) {
	const { overview } = experience;
	const { projection, error } = useCanonicalLivingWorld();
	const [semanticOnly, setSemanticOnly] = useState(false);
	const [rendererFailed, setRendererFailed] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(
		null,
	);
	const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
	const [semanticScale, setSemanticScale] = useState<SemanticScale>("region");
	const [focus, setFocus] = useState<WorldFocus>({ kind: "overview" });
	const focalCitizenId = useMemo(
		() => projection?.citizens.find(({ focal }) => focal === true)?.id ?? null,
		[projection],
	);

	const selectCitizen = (citizenId: string) => {
		setSelectedCitizenId(citizenId);
		setSelectedPlaceId(null);
		setFocus({ kind: "citizen", id: citizenId, follow: true });
	};
	const selectPlace = (placeId: string) => {
		setSelectedPlaceId(placeId);
		setFocus({ kind: "place", id: placeId });
	};
	if (error !== null) return <GenesisError error={error} />;

	return (
		<main
			className={`v1-world ${reduceMotion ? "v1-reduced-motion" : ""}`}
			data-world-id={projection?.spatial.source.runId ?? "pending"}
			data-generated-origin-id={overview.source.worldId}
		>
			<header className="v1-world-header">
				<a
					className="v1-brand"
					href="/genesis"
					aria-label="Release Genesis entry"
				>
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">RIVERHOLD · CANONICAL LOCAL REALITY</p>
					<h1>Riverhold</h1>
					<p>
						{projection === null
							? "Opening the settlement"
							: `Day ${projection.day} · ${projection.timeLabel} · ${projection.citizens.length} citizens`}
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="World view">
					<button
						type="button"
						aria-pressed={!semanticOnly}
						onClick={() => setSemanticOnly(false)}
					>
						Embodied world
					</button>
					<button
						type="button"
						aria-pressed={semanticOnly}
						onClick={() => setSemanticOnly(true)}
					>
						World in words
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

			{projection === null ? (
				<LivingWorldLoading />
			) : semanticOnly || rendererFailed ? (
				<div className="v1-semantic-world" data-testid="v1-semantic-world">
					{rendererFailed ? (
						<p className="renderer-note">
							The illustrated world is unavailable. Every important action
							remains playable here.
						</p>
					) : null}
					<SemanticWorld
						projection={projection}
						onCitizen={selectCitizen}
						compact
					/>
				</div>
			) : (
				<section className="v1-living-stage" aria-label="Embodied settlement">
					<div className="v1-world-canvas-frame">
						<Suspense fallback={<LivingWorldLoading />}>
							<RiverholdWorld
								projection={projection}
								reducedMotion={reduceMotion}
								onFailure={() => setRendererFailed(true)}
								focus={focus}
								onSemanticScaleChange={setSemanticScale}
								onCitizenSelect={selectCitizen}
								onPlaceSelect={selectPlace}
								onFocusChange={setFocus}
							/>
						</Suspense>
						<div className="v1-world-vignette" aria-hidden="true" />
						<div
							className="v1-camera-rail"
							role="toolbar"
							aria-label="World camera controls"
						>
							<button
								type="button"
								onClick={() => setFocus({ kind: "overview" })}
							>
								Settlement
							</button>
							<button
								type="button"
								disabled={focalCitizenId === null}
								onClick={() => {
									if (focalCitizenId !== null) selectCitizen(focalCitizenId);
								}}
							>
								Follow Mara
							</button>
							<span aria-live="polite">{semanticScale} view</span>
						</div>
					</div>
					<ContextPanel
						projection={projection}
						selectedCitizenId={selectedCitizenId}
						selectedPlaceId={selectedPlaceId}
						onCitizen={selectCitizen}
					/>
				</section>
			)}

			<footer className="v1-world-footer">
				<p>
					Movement, work, exchange, and project state are read from typed local
					Reality. Camera and selection never write back to it. The generated
					origin remains a separate read-only record until its simulation
					adapter is implemented.
				</p>
				<a href="/">Open the legacy regression build</a>
			</footer>
		</main>
	);
}

export function V1GenesisApp({ route }: { readonly route: GenesisRoute }) {
	useEffect(() => {
		document.title =
			route === "entry"
				? "EONFOLK — Release Genesis"
				: "EONFOLK — Genesis World";
	}, [route]);
	const { experience, error } = useGenesisExperience();
	if (error !== null) return <GenesisError error={error} />;
	if (experience === null) return <GenesisLoading />;
	return route === "entry" ? (
		<GenesisEntry experience={experience} />
	) : (
		<GenesisWorld experience={experience} />
	);
}
