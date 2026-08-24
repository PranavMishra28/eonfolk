import {
	Component,
	type ErrorInfo,
	lazy,
	type ReactNode,
	Suspense,
} from "react";
import { createRoot, type Root } from "react-dom/client";

const root = document.getElementById("root");
if (!root) throw new Error("EONFOLK root is missing");

const V1GenesisApp = lazy(async () => {
	const module = await import("./V1GenesisApp");
	return { default: module.V1GenesisApp };
});

const GenesisEntryApp = lazy(async () => {
	const module = await import("./GenesisEntryApp");
	return { default: module.GenesisEntryApp };
});

const RiverholdApp = lazy(async () => {
	const module = await import("./RiverholdApp");
	return { default: module.RiverholdApp };
});

const InformationSurface = lazy(async () => {
	const module = await import("./InformationSurface");
	return { default: module.InformationSurface };
});

class RuntimeBoundary extends Component<
	{ readonly children: ReactNode },
	{ readonly error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(_error: Error, _info: ErrorInfo) {
		// The fail-closed surface below is the user-visible diagnostic boundary.
	}

	render() {
		if (this.state.error !== null)
			return (
				<main
					className="runtime-failure"
					aria-labelledby="runtime-failure-title"
				>
					<p className="eyebrow">WORLD UNAVAILABLE</p>
					<h1 id="runtime-failure-title">
						EONFOLK stopped before showing a world.
					</h1>
					<p>
						No world state or Chronicle is being presented as authoritative. The
						local world requires a working Web Worker and browser storage.
					</p>
					<details>
						<summary>Technical detail</summary>
						<code>{this.state.error.message}</code>
					</details>
				</main>
			);
		return this.props.children;
	}
}

const reactRoot: Root = import.meta.hot?.data.reactRoot ?? createRoot(root);
if (import.meta.hot) import.meta.hot.data.reactRoot = reactRoot;

const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const genesisRoute =
	normalizedPath === "/" || normalizedPath === "/genesis"
		? "entry"
		: normalizedPath === "/world"
			? "world"
			: null;

if (genesisRoute === "world") {
	void import("./generated-world-client");
	requestAnimationFrame(() =>
		setTimeout(() => void import("./generated-world-canvas"), 425),
	);
}

reactRoot.render(
	<RuntimeBoundary>
		{normalizedPath === "/legacy" ? (
			<Suspense
				fallback={
					<main className="loading-state" aria-busy="true">
						<p>Opening the local world…</p>
					</main>
				}
			>
				<RiverholdApp />
			</Suspense>
		) : genesisRoute !== null ? (
			<Suspense
				fallback={
					genesisRoute === "world" ? (
						<main className="v1-genesis-loading" aria-busy="true">
							<h1>Advancing one world through its first year.</h1>
							<p>Verifying its local authority before presenting facts.</p>
						</main>
					) : (
						<main className="v1-genesis-shell" aria-busy="true">
							<p>Preparing Release Genesis…</p>
						</main>
					)
				}
			>
				{genesisRoute === "entry" ? <GenesisEntryApp /> : <V1GenesisApp />}
			</Suspense>
		) : normalizedPath === "/research" || normalizedPath === "/developer" ? (
			<Suspense
				fallback={
					<main className="v1-information" aria-busy="true">
						<p>Opening the evidence surface…</p>
					</main>
				}
			>
				<InformationSurface
					route={normalizedPath === "/research" ? "research" : "developer"}
				/>
			</Suspense>
		) : (
			<main className="runtime-failure" aria-labelledby="not-found-title">
				<p className="eyebrow">UNKNOWN PLACE</p>
				<h1 id="not-found-title">This route is outside the canonical world.</h1>
				<a href="/">Return to EONFOLK</a>
			</main>
		)}
	</RuntimeBoundary>,
);
