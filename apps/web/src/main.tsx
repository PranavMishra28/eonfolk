import {
	Component,
	lazy,
	Suspense,
	type ErrorInfo,
	type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { RiverholdApp } from "./RiverholdApp";

const root = document.getElementById("root");
if (!root) throw new Error("Riverhold root is missing");

const V1GenesisApp = lazy(async () => {
	const module = await import("./V1GenesisApp");
	return { default: module.V1GenesisApp };
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
	normalizedPath === "/genesis"
		? "entry"
		: normalizedPath === "/world"
			? "world"
			: null;

reactRoot.render(
	<RuntimeBoundary>
		{normalizedPath === "/" || normalizedPath === "/legacy" ? (
			<RiverholdApp />
		) : genesisRoute !== null ? (
			<Suspense
				fallback={
					<main className="v1-genesis-shell" aria-busy="true">
						<p>Preparing Release Genesis…</p>
					</main>
				}
			>
				<V1GenesisApp route={genesisRoute} />
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
