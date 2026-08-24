import { useEffect, useState } from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import "./diagnostics";
import {
	type GeneratedWorldExperience,
	loadGeneratedWorldExperience,
} from "./generated-world-client";

export function GenesisEntryApp() {
	const [experience, setExperience] = useState<GeneratedWorldExperience | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	useEffect(() => {
		document.title = "EONFOLK — A civilization has begun";
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
						: new Error("Canonical world storage failed"),
				);
			},
		);
		return () => {
			active = false;
		};
	}, []);
	if (error !== null)
		return (
			<main className="v1-genesis-shell" role="alert">
				<h1>The canonical world could not be opened.</h1>
				<p>
					No substitute or temporary world was created. Check browser storage
					and reload to try again.
				</p>
			</main>
		);
	if (experience === null)
		return (
			<main className="v1-genesis-shell" aria-busy="true">
				<p>Preparing Release Genesis…</p>
			</main>
		);
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
						reality.
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
						Enter on day {experience.horizonDays}. Watch what people carry and
						which shared work survives scarcity.
					</p>
				</section>
			</header>
			<ul className="v1-entry-ledger" aria-label="Canonical world summary">
				<li>{experience.population} canonical people</li>
				<li>{experience.settlementCount} grounded settlements</li>
				<li>{experience.horizonDays} simulated days</li>
			</ul>
		</main>
	);
}
