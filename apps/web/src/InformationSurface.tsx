import { useEffect } from "react";

import { EonfolkMark } from "./components/EonfolkMark";
import informationSurfaceStylesheet from "./information-surface.css?url";

type InformationRoute = "research" | "developer";

const developerContent = {
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
} as const;

export function InformationSurface({
	route,
}: {
	readonly route: InformationRoute;
}) {
	useEffect(() => {
		document.title =
			route === "research"
				? "EONFOLK — Research evidence"
				: "EONFOLK — Developer surface";
	}, [route]);
	return (
		<main className="v1-information" data-information-route={route}>
			<link rel="stylesheet" href={informationSurfaceStylesheet} />
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
			{route === "research" ? (
				<ResearchEvidence />
			) : (
				<>
					<header>
						<p className="v1-kicker">{developerContent.eyebrow}</p>
						<h1>{developerContent.title}</h1>
						<p>{developerContent.intro}</p>
					</header>
					<section
						className="v1-information-grid"
						aria-label={`${developerContent.eyebrow} summary`}
					>
						{developerContent.sections.map((section) => (
							<article key={section.title}>
								<h2>{section.title}</h2>
								<p>{section.body}</p>
							</article>
						))}
					</section>
				</>
			)}
			<footer>
				<a className="v1-primary-link" href="/world">
					Return to the world
				</a>
				<a href="/legacy">Open the frozen Founder Alpha regression</a>
			</footer>
		</main>
	);
}

function ResearchEvidence() {
	return (
		<>
			<header className="v1-record-intro">
				<div>
					<p className="v1-record-mode">Evidence mode · outside play</p>
					<h1 className="v1-record-title">
						See what happened. See what the record can prove.
					</h1>
				</div>
				<p className="v1-record-deck">
					The Chronicle is a reading of accepted world events, not an
					all-knowing narrator. This quiet record room keeps investigation
					separate from the living world.
				</p>
			</header>

			<section className="v1-record-guide" aria-labelledby="record-guide-title">
				<header>
					<p className="v1-kicker">READ THE SOURCE FIRST</p>
					<h2 id="record-guide-title">Three kinds of record</h2>
					<p>
						Every line should tell you where it came from and how much authority
						it carries.
					</p>
				</header>
				<dl className="v1-provenance-list">
					<div>
						<dt>World record</dt>
						<dd>
							<strong>Fact · accepted event</strong> An accepted, typed event
							says what physically or socially entered Reality. This is the sole
							factual authority.
						</dd>
					</div>
					<div>
						<dt>Citizen account</dt>
						<dd>
							<strong>Belief or allegation · named witness</strong> A person can
							report, remember, misunderstand, or dispute an event. Their
							account remains attributed rather than promoted to fact.
						</dd>
					</div>
					<div>
						<dt>Brain proposal</dt>
						<dd>
							<strong>Suggestion · accepted or refused</strong> A deterministic
							or optional model Brain may propose one legal action. The proposal
							has no authority until validation and acceptance.
						</dd>
					</div>
				</dl>
			</section>

			<section className="v1-relation-section" aria-labelledby="relation-title">
				<header>
					<div>
						<p className="v1-kicker">HOW EVENTS CONNECT</p>
						<h2 id="relation-title">Five labels. No invented certainty.</h2>
					</div>
					<p>
						Order alone is not cause. Open evidence from a Chronicle beat to see
						the source event, relationship, and mechanism behind its wording.
					</p>
				</header>
				<dl className="v1-relation-list">
					<div>
						<dt>Direct cause</dt>
						<dd>The recorded action directly produced the stated change.</dd>
					</div>
					<div>
						<dt>Trigger</dt>
						<dd>The event crossed a boundary that began the later response.</dd>
					</div>
					<div>
						<dt>Contributing condition</dt>
						<dd>It shaped the outcome without being sufficient on its own.</dd>
					</div>
					<div>
						<dt>Earlier event</dt>
						<dd>It happened first; the record makes no causal claim.</dd>
					</div>
					<div>
						<dt>Allegation</dt>
						<dd>A named person made the claim; Reality has not proved it.</dd>
					</div>
				</dl>
			</section>

			<aside className="v1-record-limits" aria-labelledby="limits-title">
				<div>
					<p className="v1-kicker">CURRENT EVIDENCE BOUNDARY</p>
					<h2 id="limits-title">What this local world proves</h2>
				</div>
				<ul>
					<li>
						Release Genesis can advance, persist in this browser, and replay
						deterministically without external inference.
					</li>
					<li>
						It does not yet prove human attachment, retention, fun, public
						scale, or sustainable service economics.
					</li>
					<li>
						Chronicle focus links may identify a citizen, place, object, or
						event; malformed links are ignored rather than guessed.
					</li>
				</ul>
			</aside>
		</>
	);
}
