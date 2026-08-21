import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { RiverholdApp } from "./RiverholdApp";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Riverhold root is missing");

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
					<p className="eyebrow">LOCAL PROOF UNAVAILABLE</p>
					<h1 id="runtime-failure-title">
						Riverhold stopped before showing a world.
					</h1>
					<p>
						No world state or Chronicle is being presented as authoritative.
						This local proof requires a working Web Worker and browser storage.
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

createRoot(root).render(
	<RuntimeBoundary>
		<RiverholdApp />
	</RuntimeBoundary>,
);
