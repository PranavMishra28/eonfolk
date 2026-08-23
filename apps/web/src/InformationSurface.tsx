import { useEffect } from "react";

import { EonfolkMark } from "./components/EonfolkMark";

type InformationRoute = "research" | "developer";

const content = {
	research: {
		eyebrow: "RESEARCH EVIDENCE",
		title: "Inspect the world without turning play into a dashboard.",
		intro:
			"This deliberate surface separates canonical facts, citizen knowledge, model proposals, and presentation. The normal world keeps these implementation details out of the way.",
		sections: [
			{
				title: "What is authoritative",
				body: "Typed Reality and its accepted event history own world facts. A citizen's beliefs may be incomplete or wrong; a Chronicle claim must distinguish cause, contribution, sequence, and allegation.",
			},
			{
				title: "What the current local experiment proves",
				body: "A fixed Release Genesis world can generate, advance for 365 simulated days, persist in this browser, replay deterministically, and continue without external inference.",
			},
			{
				title: "What it does not prove",
				body: "This internal V1 is not evidence of human attachment, retention, fun, public scale, or a sustainable service. Optional model cognition is not required for world progress.",
			},
		],
	},
	developer: {
		eyebrow: "DEVELOPER SURFACE",
		title: "One local authority, explicit boundaries, reproducible evidence.",
		intro:
			"This surface states the runtime contract for contributors. It is separate from normal play and makes no deployment or production-readiness claim.",
		sections: [
			{
				title: "Runtime",
				body: "Strict TypeScript packages feed a deterministic civilization worker, versioned browser IndexedDB authority, renderer-neutral spatial projection, and a PlayCanvas WebGL presentation.",
			},
			{
				title: "Authority boundary",
				body: "Camera, selection, diagnostics, renderer state, and optional cognition cannot mutate Reality. Commands are validated before atomic event append; replay never reruns model inference.",
			},
			{
				title: "Current boundary",
				body: "The repository remains an internal, account-free local benchmark. There is no production deployment, payment path, required provider, or public multiplayer authority.",
			},
		],
	},
} as const;

export function InformationSurface({
	route,
}: {
	readonly route: InformationRoute;
}) {
	const page = content[route];
	useEffect(() => {
		document.title =
			route === "research"
				? "EONFOLK — Research evidence"
				: "EONFOLK — Developer surface";
	}, [route]);
	return (
		<main className="v1-information" data-information-route={route}>
			<nav aria-label="EONFOLK surfaces">
				<a className="v1-brand" href="/">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div>
					<a href="/world">World</a>
					<a
						aria-current={route === "research" ? "page" : undefined}
						href="/research"
					>
						Research
					</a>
					<a
						aria-current={route === "developer" ? "page" : undefined}
						href="/developer"
					>
						Developer
					</a>
				</div>
			</nav>
			<header>
				<p className="v1-kicker">{page.eyebrow}</p>
				<h1>{page.title}</h1>
				<p>{page.intro}</p>
			</header>
			<section
				className="v1-information-grid"
				aria-label={`${page.eyebrow} summary`}
			>
				{page.sections.map((section) => (
					<article key={section.title}>
						<h2>{section.title}</h2>
						<p>{section.body}</p>
					</article>
				))}
			</section>
			<footer>
				<a className="v1-primary-link" href="/world">
					Return to the world
				</a>
				<a href="/legacy">Open the frozen Founder Alpha regression</a>
			</footer>
		</main>
	);
}
