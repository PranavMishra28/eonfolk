import { useEffect, useState } from "react";

import { EonfolkMark } from "./components/EonfolkMark";
import informationSurfaceStylesheet from "./information-surface.css?url";
import type { ResearchEvidenceStatus } from "./research-evidence";

type InformationRoute = "research" | "developer" | "about" | "license";

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
			body: "The current build is an account-free local benchmark. There is no production deployment, payment path, required provider, or public multiplayer authority.",
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
				: route === "developer"
					? "EONFOLK — Developer surface"
					: route === "about"
						? "EONFOLK — About"
						: "EONFOLK — License";
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
					<a
						aria-current={route === "about" ? "page" : undefined}
						href="/about"
					>
						About
					</a>
					<a
						aria-current={route === "license" ? "page" : undefined}
						href="/license"
					>
						License
					</a>
				</div>
			</nav>
			{route === "research" ? (
				<ResearchEvidence />
			) : route === "about" ? (
				<>
					<header>
						<p className="v1-kicker">ABOUT</p>
						<h1>A local town that remembers you.</h1>
						<p>
							EONFOLK is a free, local-only settlement. Dawnmere lives in this
							browser. There is no account and no cloud. Closing the tab stops
							the clock unless you start a local world authority with{" "}
							<code>pnpm world:authority</code> and this browser can reach it.
							If both this browser and that process have a town, they are not
							merged until you choose. If that process was not running, you
							still choose whether up to 7 waited days pass.
						</p>
					</header>
					<section className="v1-information-grid" aria-label="About EONFOLK">
						<article>
							<h2>What you do</h2>
							<p>
								Follow Mara Vale, offer rare counsel she can refuse, and read a
								Chronicle that separates fact from belief.
							</p>
						</article>
						<article>
							<h2>What stays local</h2>
							<p>
								Saves, feedback, and optional local-model choice never leave
								this machine. Apache-2.0. See License.
							</p>
						</article>
					</section>
				</>
			) : route === "license" ? (
				<>
					<header>
						<p className="v1-kicker">LICENSE</p>
						<h1>Apache License 2.0</h1>
						<p>
							EONFOLK is licensed under the Apache License, Version 2.0. The
							full text lives in the repository LICENSE file.
						</p>
					</header>
					<section className="v1-information-grid" aria-label="License">
						<article>
							<h2>Use</h2>
							<p>
								You may use, reproduce, and distribute the work under the
								Apache-2.0 terms. No trademark or deployment claim is granted by
								this page.
							</p>
						</article>
					</section>
				</>
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
			</footer>
		</main>
	);
}

function ResearchEvidence() {
	const [currentEvidence, setCurrentEvidence] = useState<
		ResearchEvidenceStatus | "loading"
	>("loading");

	useEffect(() => {
		let mounted = true;
		void import("./research-evidence").then(
			async ({ readCurrentReleaseGenesisEvidence }) => {
				const evidence = await readCurrentReleaseGenesisEvidence();
				if (mounted) setCurrentEvidence(evidence);
			},
			() => {
				if (mounted)
					setCurrentEvidence({
						status: "unavailable",
						reason: "unverified-authority",
					});
			},
		);
		return () => {
			mounted = false;
		};
	}, []);

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

			<CurrentAcceptedEvidence evidence={currentEvidence} />

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

function CurrentAcceptedEvidence({
	evidence,
}: {
	readonly evidence: ResearchEvidenceStatus | "loading";
}) {
	if (evidence === "loading")
		return (
			<section
				aria-labelledby="current-evidence-title"
				aria-live="polite"
				className="v1-current-evidence v1-current-evidence--quiet"
				data-evidence-status="loading"
			>
				<p className="v1-kicker">CURRENT ACCEPTED RECORD</p>
				<h2 id="current-evidence-title">Checking this browser’s world…</h2>
				<p>Only a verified, accepted local event will appear here.</p>
			</section>
		);

	if (evidence.status === "empty")
		return (
			<section
				aria-labelledby="current-evidence-title"
				aria-live="polite"
				className="v1-current-evidence v1-current-evidence--quiet"
				data-evidence-status="empty"
			>
				<p className="v1-kicker">CURRENT ACCEPTED RECORD</p>
				<h2 id="current-evidence-title">Nothing to inspect yet</h2>
				<p>
					{evidence.reason === "no-authority"
						? "No local Release Genesis authority exists in this browser. Enter the world to begin its record."
						: "This local world has no accepted counsel consequence yet. Research mode will not invent one."}
				</p>
				<a href="/world">Enter Dawnmere</a>
			</section>
		);

	if (evidence.status === "unavailable")
		return (
			<section
				aria-labelledby="current-evidence-title"
				aria-live="assertive"
				className="v1-current-evidence v1-current-evidence--quiet"
				data-evidence-status="unavailable"
			>
				<p className="v1-kicker">CURRENT ACCEPTED RECORD</p>
				<h2 id="current-evidence-title">Evidence unavailable</h2>
				<p>
					{evidence.reason === "unsupported"
						? "This browser cannot perform the required read-only authority inspection. No event is presented as fact."
						: "The local authority could not be verified. No event is presented as fact."}
				</p>
			</section>
		);

	const { beat } = evidence;
	return (
		<section
			aria-labelledby="current-evidence-title"
			aria-live="polite"
			className="v1-current-evidence"
			data-evidence-status="available"
		>
			<header>
				<div>
					<p className="v1-kicker">CURRENT ACCEPTED RECORD</p>
					<h2 id="current-evidence-title">{beat.title}</h2>
				</div>
				<p className="v1-record-seal">Accepted world record</p>
			</header>
			<p className="v1-evidence-summary">{beat.summary}</p>
			<dl className="v1-evidence-relationship">
				<div>
					<dt>Causal relation</dt>
					<dd>{beat.causalRelation.replaceAll("-", " ")}</dd>
				</div>
				<div>
					<dt>Mechanism</dt>
					<dd>{beat.mechanismId}</dd>
				</div>
				<div>
					<dt>Accepted at</dt>
					<dd>
						Sequence {beat.provenance.sequence} · simulation time{" "}
						{beat.provenance.simulationTime}
					</dd>
				</div>
			</dl>
			{beat.allegation === null ? (
				<p className="v1-evidence-allegation">
					This accepted beat contains no allegation.
				</p>
			) : (
				<aside
					aria-labelledby="accepted-allegation-title"
					className="v1-evidence-allegation"
				>
					<p className="v1-kicker">ATTRIBUTED ALLEGATION</p>
					<h3 id="accepted-allegation-title">
						{beat.allegation.speakerName} spoke about{" "}
						{beat.allegation.targetName}
					</h3>
					<p>
						The accepted record proves that the allegation was made and records
						its relationship consequences. It does not prove the allegation’s
						claim.
					</p>
					<p>
						Trust {beat.allegation.trustDeltaBasisPoints} basis points · strain
						+{beat.allegation.strainDeltaBasisPoints} basis points
					</p>
				</aside>
			)}
			<details className="v1-evidence-provenance">
				<summary>Accepted event IDs and provenance</summary>
				<dl>
					<div>
						<dt>Events</dt>
						<dd>
							{beat.acceptedEventIds.map((eventId) => (
								<code key={eventId}>{eventId}</code>
							))}
						</dd>
					</div>
					<div>
						<dt>Event type</dt>
						<dd>{beat.provenance.eventType}</dd>
					</div>
					<div>
						<dt>Versions</dt>
						<dd>
							{beat.provenance.engineVersion} ·{" "}
							{beat.provenance.stateSchemaVersion}
						</dd>
					</div>
					<div>
						<dt>Brain provenance</dt>
						<dd>
							{beat.provenance.brainKind ?? "not recorded"} · decision{" "}
							{beat.provenance.cognitionDecisionId ?? "not recorded"}
						</dd>
					</div>
					{beat.allegation !== null ? (
						<div>
							<dt>Statement record</dt>
							<dd>{beat.allegation.statementRecordId}</dd>
						</div>
					) : null}
				</dl>
			</details>
		</section>
	);
}
