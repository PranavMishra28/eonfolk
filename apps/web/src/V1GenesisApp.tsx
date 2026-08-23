import { useEffect, useMemo, useState } from "react";
import type {
	GeneratedInspectableKind,
	GeneratedSettlementLocalProjection,
	GeneratedTerrainCellProjection,
	GeneratedWorldOverviewProjection,
} from "@eonfolk/world-presentation";
import { EonfolkMark } from "./components/EonfolkMark";
import {
	loadV1GenesisExperience,
	type V1GenesisExperience,
	V1_GENESIS_RELEASE_ID,
	V1_GENESIS_SEED,
} from "./v1-genesis-runtime";

type GenesisRoute = "entry" | "world";
type WorldScale = "region" | "settlement";

interface InspectableSelection {
	readonly id: string;
	readonly kind: GeneratedInspectableKind;
	readonly label: string;
	readonly detail: string;
}

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

function GenesisLoading() {
	return (
		<main className="v1-genesis-shell v1-genesis-loading" aria-busy="true">
			<p className="v1-kicker">RELEASE GENESIS</p>
			<h1>Reading the same world from the same seed.</h1>
			<p>
				Generation is local, deterministic, and requires no account or model.
			</p>
		</main>
	);
}

function GenesisError({ error }: { readonly error: Error }) {
	return (
		<main className="v1-genesis-shell" aria-labelledby="v1-error-title">
			<p className="v1-kicker">WORLD UNAVAILABLE</p>
			<h1 id="v1-error-title">No generated world is being presented.</h1>
			<p>
				The deterministic projection stopped before showing canonical facts.
			</p>
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
	overview,
}: {
	readonly overview: GeneratedWorldOverviewProjection;
}) {
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
				<a className="v1-brand" href="/" aria-label="Eonfolk Founder Alpha">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-entry-copy">
					<p className="v1-kicker">RELEASE GENESIS · FIXED WORLD ZERO</p>
					<h1>A world exists before anyone arrives.</h1>
					<p>
						One seed resolves into terrain, territories, a settlement, places,
						and routes. Look first. Nothing here needs an account, a model, or
						the network.
					</p>
					<a className="v1-primary-link" href="/world">
						Enter {settlement.settlement.name}
					</a>
				</div>
				<section className="v1-genesis-proof" aria-labelledby="v1-proof-title">
					<p className="v1-kicker">IMMUTABLE ORIGIN</p>
					<h2 id="v1-proof-title">The browser is reading, not inventing.</h2>
					<WorldIdentity overview={overview} />
					<details>
						<summary>Show the complete fixed seed</summary>
						<code data-testid="genesis-seed">{V1_GENESIS_SEED}</code>
					</details>
					<p className="v1-release-id">Release {V1_GENESIS_RELEASE_ID}</p>
				</section>
			</header>
			<section className="v1-entry-ledger" aria-labelledby="v1-world-now-title">
				<div>
					<p className="v1-kicker">WORLD AT TIME ZERO</p>
					<h2 id="v1-world-now-title">Not a dashboard. A place to enter.</h2>
				</div>
				<ul aria-label="Generated world summary">
					<li>
						<strong>{overview.semanticCounts.terrainCells}</strong> terrain
						cells
					</li>
					<li>
						<strong>{overview.semanticCounts.territories}</strong> territories
					</li>
					<li>
						<strong>{settlement.semanticCounts.sites}</strong> named sites
					</li>
					<li>
						<strong>{settlement.semanticCounts.routes}</strong> traversable
						routes
					</li>
				</ul>
			</section>
		</main>
	);
}

function terrainColor(
	terrain: GeneratedTerrainCellProjection["terrain"],
): string {
	return `var(--v1-terrain-${terrain})`;
}

function RegionMap({
	overview,
	onInspect,
	onEnterSettlement,
}: {
	readonly overview: GeneratedWorldOverviewProjection;
	readonly onInspect: (selection: InspectableSelection) => void;
	readonly onEnterSettlement: () => void;
}) {
	const settlement = overview.settlementAnchors[0];
	return (
		<div className="v1-map-frame" data-testid="region-map">
			<fieldset className="v1-region-grid">
				<legend className="sr-only">Generated terrain map</legend>
				{overview.terrainCells.map((cell) => (
					<button
						key={cell.cellId}
						type="button"
						className="v1-terrain-cell"
						style={{
							gridColumn: cell.gridX + 1,
							gridRow: cell.gridY + 1,
							background: terrainColor(cell.terrain),
						}}
						aria-label={cell.semanticLabel}
						onClick={() =>
							onInspect({
								id: cell.inspectableId,
								kind: "terrain-cell",
								label: cell.semanticLabel,
								detail: `${cell.elevationMillimeters.toLocaleString()} mm elevation · ${cell.productivityBasisPoints} productivity`,
							})
						}
					/>
				))}
				{settlement === undefined ? null : (
					<button
						type="button"
						className="v1-settlement-anchor"
						style={{
							gridColumn: settlement.gridX + 1,
							gridRow: settlement.gridY + 1,
						}}
						aria-label={`Enter ${settlement.name} settlement`}
						onClick={onEnterSettlement}
					>
						<span aria-hidden="true">◆</span>
						<strong>{settlement.name}</strong>
					</button>
				)}
			</fieldset>
		</div>
	);
}

function LocalMap({
	local,
	onInspect,
}: {
	readonly local: GeneratedSettlementLocalProjection;
	readonly onInspect: (selection: InspectableSelection) => void;
}) {
	const bounds = local.localSpace.bounds;
	const width = bounds.maximum.xMillimeters - bounds.minimum.xMillimeters;
	const height = bounds.maximum.yMillimeters - bounds.minimum.yMillimeters;
	return (
		<div className="v1-map-frame" data-testid="settlement-map">
			<svg
				className="v1-local-map"
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-labelledby="v1-local-title v1-local-description"
			>
				<title id="v1-local-title">
					{local.settlement.name} settlement map
				</title>
				<desc id="v1-local-description">
					Named sites connected by generated routes. Use the semantic navigator
					for keyboard access to every place.
				</desc>
				{local.routes.map((route) => (
					<polyline
						key={route.routeId}
						className="v1-route-line"
						points={route.waypoints
							.map((point) => `${point.xMillimeters},${point.yMillimeters}`)
							.join(" ")}
					/>
				))}
				{local.sites.map((site) => {
					const siteWidth =
						site.bounds.maximum.xMillimeters - site.bounds.minimum.xMillimeters;
					const siteHeight =
						site.bounds.maximum.yMillimeters - site.bounds.minimum.yMillimeters;
					return (
						<g key={site.siteId}>
							<rect
								className={`v1-site-shape v1-site-shape--${site.kind}`}
								x={site.bounds.minimum.xMillimeters}
								y={site.bounds.minimum.yMillimeters}
								width={siteWidth}
								height={siteHeight}
								rx="2800"
							/>
							<text
								x={site.bounds.minimum.xMillimeters + siteWidth / 2}
								y={site.bounds.minimum.yMillimeters + siteHeight / 2}
								className="v1-site-label"
							>
								{site.name}
							</text>
						</g>
					);
				})}
			</svg>
			<fieldset className="v1-map-hit-layer">
				<legend className="sr-only">Settlement sites</legend>
				{local.sites.map((site) => (
					<button
						key={site.siteId}
						type="button"
						aria-label={`Inspect ${site.name}, ${site.kind} site`}
						onClick={() =>
							onInspect({
								id: site.inspectableId,
								kind: "site",
								label: site.semanticLabel,
								detail: `${site.placeIds.length} place · ${site.buildingIds.length} building · ${site.interactionSlotIds.length} interaction slots`,
							})
						}
					/>
				))}
			</fieldset>
		</div>
	);
}

function SemanticNavigator({
	local,
	onInspect,
}: {
	readonly local: GeneratedSettlementLocalProjection;
	readonly onInspect: (selection: InspectableSelection) => void;
}) {
	return (
		<section
			className="v1-semantic-navigator"
			aria-labelledby="v1-semantic-title"
		>
			<div>
				<p className="v1-kicker">SEMANTIC WORLD VIEW</p>
				<h2 id="v1-semantic-title">
					Navigate {local.settlement.name} without the map
				</h2>
			</div>
			<ul>
				{local.sites.map((site) => (
					<li key={site.siteId}>
						<button
							type="button"
							onClick={() =>
								onInspect({
									id: site.inspectableId,
									kind: "site",
									label: site.semanticLabel,
									detail: `${site.kind} · ${site.placeIds.length} place · ${site.interactionSlotIds.length} interaction slots`,
								})
							}
						>
							<strong>{site.name}</strong>
							<span>{site.kind}</span>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}

function GenesisWorld({
	experience,
}: {
	readonly experience: V1GenesisExperience;
}) {
	const { overview, settlement } = experience;
	const [scale, setScale] = useState<WorldScale>("region");
	const [semanticOnly, setSemanticOnly] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const firstRegion = overview.regions[0];
	const initialSelection = useMemo<InspectableSelection>(
		() => ({
			id: firstRegion?.inspectableId ?? overview.source.worldId,
			kind: "region",
			label: firstRegion?.semanticLabel ?? "Generated world region",
			detail: `${overview.semanticCounts.terrainCells} terrain cells · ${overview.semanticCounts.territories} territories · ${overview.semanticCounts.settlements} settlement`,
		}),
		[firstRegion, overview],
	);
	const [selection, setSelection] = useState(initialSelection);

	const enterSettlement = () => {
		setScale("settlement");
		setSelection({
			id: settlement.settlement.inspectableId,
			kind: "settlement",
			label: settlement.settlement.semanticLabel,
			detail: `${settlement.semanticCounts.sites} sites · ${settlement.semanticCounts.routes} routes · ${settlement.semanticCounts.interactionSlots} interaction slots`,
		});
	};

	return (
		<main
			className={`v1-world ${reduceMotion ? "v1-reduced-motion" : ""}`}
			data-world-id={overview.source.worldId}
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
					<p className="v1-kicker">GENERATED WORLD · TIME ZERO</p>
					<h1>{settlement.settlement.name}</h1>
					<p>
						{firstRegion?.name ?? "First region"} · identity{" "}
						{shorten(overview.source.identityHash)}
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="World scale">
					<button
						type="button"
						aria-pressed={scale === "region"}
						onClick={() => {
							setScale("region");
							setSelection(initialSelection);
						}}
					>
						Region
					</button>
					<button
						type="button"
						aria-pressed={scale === "settlement"}
						onClick={enterSettlement}
					>
						Settlement
					</button>
				</nav>
			</header>

			<section className="v1-world-stage" aria-label={`${scale} world view`}>
				<div className="v1-world-stage-tools">
					<button
						type="button"
						aria-pressed={semanticOnly}
						onClick={() => setSemanticOnly((value) => !value)}
					>
						{semanticOnly ? "Show drawn world" : "Use semantic view"}
					</button>
					<button
						type="button"
						aria-pressed={reduceMotion}
						onClick={() => setReduceMotion((value) => !value)}
					>
						{reduceMotion ? "Motion reduced" : "Reduce motion"}
					</button>
				</div>
				{semanticOnly ? null : scale === "region" ? (
					<RegionMap
						overview={overview}
						onInspect={setSelection}
						onEnterSettlement={enterSettlement}
					/>
				) : (
					<LocalMap local={settlement} onInspect={setSelection} />
				)}
				<div className="v1-world-caption" aria-live="polite">
					<p className="v1-kicker">INSPECTING {selection.kind.toUpperCase()}</p>
					<h2>{selection.label}</h2>
					<p>{selection.detail}</p>
					<code>{selection.id}</code>
				</div>
			</section>

			<SemanticNavigator local={settlement} onInspect={setSelection} />
			<footer className="v1-world-footer">
				<p>
					This view derives from immutable generated state. Selection, scale,
					and camera intent never write back to the world.
				</p>
				<a href="/">Open Founder Alpha</a>
			</footer>
		</main>
	);
}

export function V1GenesisApp({ route }: { readonly route: GenesisRoute }) {
	const { experience, error } = useGenesisExperience();
	if (error !== null) return <GenesisError error={error} />;
	if (experience === null) return <GenesisLoading />;
	return route === "entry" ? (
		<GenesisEntry experience={experience} />
	) : (
		<GenesisWorld experience={experience} />
	);
}
