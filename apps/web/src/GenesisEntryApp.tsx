import {
	lazy,
	type MouseEvent,
	Suspense,
	useEffect,
	useMemo,
	useState,
} from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import "./diagnostics";
import { INITIAL_GENERATED_NAVIGATION } from "./generated-presentation";
import {
	type GeneratedWorldExperience,
	loadGeneratedWorldExperience,
} from "./generated-world-client";

function loadGeneratedWorldCanvasModule() {
	return import("./generated-world-canvas");
}

const GeneratedWorldCanvas = lazy(async () => {
	const module = await loadGeneratedWorldCanvasModule();
	return { default: module.GeneratedWorldCanvas };
});

function enterDawnmere(event: MouseEvent<HTMLAnchorElement>) {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const doc = document as Document & {
		startViewTransition?: (update: () => void) => void;
	};
	if (typeof doc.startViewTransition !== "function") return;
	event.preventDefault();
	doc.startViewTransition(() => {
		window.location.assign("/world");
	});
}

export function GenesisEntryApp() {
	const [experience, setExperience] = useState<GeneratedWorldExperience | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	const [heroFailed, setHeroFailed] = useState(false);
	const reducedMotion = useMemo(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		[],
	);
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
	const projection = experience.projections[0];
	const model = experience.embodiments[0];
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
					<a className="v1-primary-link" href="/world" onClick={enterDawnmere}>
						Enter Dawnmere
					</a>
				</div>
				{projection === undefined || model === undefined || heroFailed ? (
					<aside className="v1-genesis-proof" aria-label="Dawnmere">
						<p className="v1-kicker">DAWNMERE</p>
						<h2>Eight people keep a living town.</h2>
					</aside>
				) : (
					<aside
						className="v1-entry-hero-world"
						aria-label="Dawnmere in miniature"
					>
						<Suspense fallback={<p>Opening Dawnmere…</p>}>
							<GeneratedWorldCanvas
								projection={projection}
								model={model}
								navigation={INITIAL_GENERATED_NAVIGATION}
								presentationTick={0}
								reducedMotion={reducedMotion}
								playRate={reducedMotion ? 0 : 1}
								variant="hero"
								onFailure={() => setHeroFailed(true)}
							/>
						</Suspense>
					</aside>
				)}
			</header>
			<section className="v1-entry-ledger" aria-labelledby="meet-the-town">
				<div>
					<p className="v1-kicker">MEET THE TOWN</p>
					<h2 id="meet-the-town">Eight lives, one shared place.</h2>
				</div>
				<p>
					Dawnmere is already at work when you arrive. Homes, a workshop,
					stores, water, and fields sit in a settlement you can walk with your
					eyes before you choose anyone.
				</p>
			</section>
			<section className="v1-entry-ledger" aria-labelledby="follow-a-life">
				<div>
					<p className="v1-kicker">FOLLOW A LIFE</p>
					<h2 id="follow-a-life">Stay beside one person.</h2>
				</div>
				<p>
					Follow Mara Vale through a day. She walks, works, talks, and rests
					without waiting for a command. You can leave her and return to someone
					else.
				</p>
			</section>
			<section className="v1-entry-ledger" aria-labelledby="influence">
				<div>
					<p className="v1-kicker">INFLUENCE, DO NOT COMMAND</p>
					<h2 id="influence">Advice is rare, and she can refuse it.</h2>
				</div>
				<p>
					Sponsorship is a relationship, not a control panel. When a boundary
					opens, you may counsel Mara or abstain. The town continues either way.
				</p>
			</section>
			<section className="v1-entry-ledger" aria-labelledby="leave-and-return">
				<div>
					<p className="v1-kicker">LEAVE AND RETURN</p>
					<h2 id="leave-and-return">The settlement keeps its own time.</h2>
				</div>
				<p>
					Close the page. Dawnmere remains in this browser. When you come back,
					days may have waited, and you choose whether they pass.
				</p>
			</section>
			<footer className="v1-entry-footer">
				<a href="/research">Research</a>
				<a href="/developer">Developer</a>
			</footer>
		</main>
	);
}
