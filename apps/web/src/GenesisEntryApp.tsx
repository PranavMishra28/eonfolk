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
		document.title = "EONFOLK — Follow Mara Vale";
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
						: new Error("The local world could not be opened"),
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
				<h1>Dawnmere could not be opened.</h1>
				<p>
					Nothing else was created. Check this browser's storage and reload to
					try again.
				</p>
			</main>
		);
	if (experience === null)
		return (
			<main className="v1-genesis-shell" aria-busy="true">
				<p>Opening Dawnmere…</p>
			</main>
		);
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
					<p className="v1-kicker">A TOWN THAT CONTINUES WITHOUT YOU</p>
					<h1>Follow Mara Vale. She acts for herself.</h1>
					<p>
						Watch a small settlement live, offer rare advice she can refuse, and
						read a Chronicle that separates fact from belief.
					</p>
					<a className="v1-primary-link" href="/world">
						Enter Dawnmere
					</a>
				</div>
			</header>
		</main>
	);
}
