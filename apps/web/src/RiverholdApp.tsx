import type { DiagnosticIncident } from "@eonfolk/diagnostics";
import type { SemanticScale } from "@eonfolk/world-presentation";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Chronicle } from "./components/Chronicle";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { SemanticWorld } from "./components/SemanticWorld";
import { StoryCard } from "./components/StoryCard";
import type { WorldFocus } from "./components/RiverholdWorld";
import { browserDiagnostics } from "./diagnostics";
import {
	type ChronicleBeatProjection,
	type CounselIntent,
	counselLabels,
	type RiverholdIntent,
	type RiverholdProjection,
} from "./projection";
import { createRiverholdRuntimeBridge, RiverholdRuntimeError } from "./runtime";

const RiverholdWorld = lazy(async () => {
	const module = await import("./components/RiverholdWorld");
	return { default: module.RiverholdWorld };
});

type Sheet =
	| { readonly kind: "citizen"; readonly citizenId: string }
	| { readonly kind: "evidence"; readonly beat: ChronicleBeatProjection }
	| { readonly kind: "world" }
	| { readonly kind: "research" }
	| null;

type WorldLens = "activity" | "resources" | "routes" | "none";

interface RuntimeFailure {
	readonly writeAuthorityTransferred: boolean;
}

function runtimeFailure(error: unknown): RuntimeFailure {
	if (error instanceof RiverholdRuntimeError)
		return { writeAuthorityTransferred: error.code === "STALE_FENCE" };
	return { writeAuthorityTransferred: false };
}

function InkMark() {
	return (
		<span className="ink-mark" aria-hidden="true">
			<i />
			<i />
			<i />
		</span>
	);
}

function CounselCard({
	intent,
	selected,
	onSelect,
}: {
	readonly intent: CounselIntent;
	readonly selected: boolean;
	readonly onSelect: () => void;
}) {
	const descriptions = {
		"verify-private": [
			"Protect trust while testing the evidence",
			"The public count may stay wrong longer",
		],
		"accuse-now": [
			"Force public scrutiny before the vote",
			"An unverified allegation may damage trust",
		],
		abstain: [
			"Leave the choice fully to Mara's Standing Plan",
			"The uncertainty may survive the next allocation",
		],
	} as const;
	return (
		<label
			className={`counsel-card${selected ? " counsel-card--selected" : ""}`}
		>
			<input
				type="radio"
				name="counsel"
				value={intent}
				checked={selected}
				onChange={onSelect}
			/>
			<span className="counsel-glyph" aria-hidden="true">
				{intent === "verify-private"
					? "◎"
					: intent === "accuse-now"
						? "!"
						: "—"}
			</span>
			<span>
				<strong>{counselLabels[intent]}</strong>
				<small>{descriptions[intent][0]}</small>
				<em>{descriptions[intent][1]}</em>
			</span>
		</label>
	);
}

function MaraDossier({
	projection,
}: {
	readonly projection: RiverholdProjection;
}) {
	return (
		<div className="mara-dossier">
			<div className="portrait" aria-hidden="true">
				<span className="portrait-hair" />
				<span className="portrait-face" />
				<span className="portrait-scarf" />
			</div>
			<div className="dossier-copy">
				<div className="dossier-title">
					<div>
						<p className="eyebrow">YOUR COVENANT</p>
						<h2>Mara</h2>
					</div>
					<span className="status-seal">acts freely</span>
				</div>
				<p className="mara-role">
					Market tally-keeper · careful witness · Toma's oldest friend
				</p>
				<p className="autonomy-line">{projection.mara.autonomy}</p>
			</div>
			<dl className="mind-grid">
				<div>
					<dt>Standing Plan</dt>
					<dd>{projection.mara.standingPlan}</dd>
				</div>
				<div>
					<dt>Belief · {projection.mara.beliefStatus}</dt>
					<dd>{projection.mara.belief}</dd>
				</div>
				<div>
					<dt>Relationship</dt>
					<dd>{projection.mara.relationship}</dd>
				</div>
				<div>
					<dt>Values</dt>
					<dd>{projection.mara.values.join(" · ")}</dd>
				</div>
			</dl>
		</div>
	);
}

function WorldHeader({
	projection,
	reducedMotion,
	setReducedMotion,
	onOpenWorld,
}: {
	readonly projection: RiverholdProjection;
	readonly reducedMotion: boolean;
	readonly setReducedMotion: (value: boolean) => void;
	readonly onOpenWorld: () => void;
}) {
	return (
		<header className="topbar">
			<a className="brand" href="#world" aria-label="EONFOLK Riverhold home">
				<InkMark />
				<span>
					<strong>EONFOLK</strong>
					<small>RIVERHOLD · FOUNDER ALPHA · LOCAL</small>
				</span>
			</a>
			<div className="world-pulse" role="status" aria-label="World pulse">
				<span className="pulse-dot" aria-hidden="true" />
				<span>
					<strong>World pulse</strong>
					<small>
						Day {projection.day} · {projection.citizens.length} citizens · 3
						resources
					</small>
				</span>
			</div>
			<div className="top-actions">
				<button className="quiet-button" type="button" onClick={onOpenWorld}>
					People & resources
				</button>
				<button
					className="quiet-button"
					type="button"
					aria-pressed={reducedMotion}
					onClick={() => setReducedMotion(!reducedMotion)}
				>
					{reducedMotion ? "Motion reduced" : "Reduce motion"}
				</button>
			</div>
		</header>
	);
}

function WorldControls({
	projection,
	focus,
	semanticScale,
	lens,
	onFocus,
	onSelectCitizen,
	onLens,
	onResearch,
}: {
	readonly projection: RiverholdProjection;
	readonly focus: WorldFocus;
	readonly semanticScale: SemanticScale;
	readonly lens: WorldLens;
	readonly onFocus: (focus: WorldFocus) => void;
	readonly onSelectCitizen: (citizenId: string) => void;
	readonly onLens: (lens: WorldLens) => void;
	readonly onResearch: () => void;
}) {
	const mara = projection.citizens.find((citizen) => citizen.slug === "mara");
	const cameraIntent = (kind: string) =>
		window.dispatchEvent(
			new CustomEvent("eonfolk:camera-intent", { detail: { kind } }),
		);
	return (
		<section className="world-controls" aria-label="Riverhold camera and lenses">
			<div className="camera-controls">
				<button
					type="button"
					onClick={() => onFocus({ kind: "overview" })}
					aria-pressed={focus.kind === "overview"}
				>
					Town overview
				</button>
				{mara ? (
					<button
						type="button"
						onClick={() =>
							onFocus({ kind: "citizen", id: mara.id, follow: true })
						}
						aria-pressed={
							focus.kind === "citizen" && focus.id === mara.id && focus.follow
						}
					>
						Follow Mara
					</button>
				) : null}
				<button
					type="button"
					aria-label="Zoom closer"
					onClick={() => cameraIntent("zoom-in")}
				>
					＋
				</button>
				<button
					type="button"
					aria-label="Zoom farther"
					onClick={() => cameraIntent("zoom-out")}
				>
					−
				</button>
				<button
					type="button"
					aria-label="Pan Riverhold left"
					onClick={() => cameraIntent("pan-left")}
				>
					←
				</button>
				<button
					type="button"
					aria-label="Pan Riverhold right"
					onClick={() => cameraIntent("pan-right")}
				>
					→
				</button>
				<span aria-live="polite">{semanticScale} scale</span>
			</div>
			<section className="lens-controls" aria-label="World lenses">
				{(["activity", "resources", "routes"] as const).map((value) => (
					<button
						key={value}
						type="button"
						aria-pressed={lens === value}
						onClick={() => onLens(lens === value ? "none" : value)}
					>
						{value === "activity"
							? "People"
							: value === "resources"
								? "Resources"
								: "Routes"}
					</button>
				))}
				<button type="button" onClick={onResearch}>
					Research lens
				</button>
			</section>
			{lens === "activity" ? (
				<div className="world-lens world-lens--people">
					<strong>People in motion</strong>
					<ul>
						{projection.citizens.map((citizen) => (
							<li key={citizen.id}>
								<button
									type="button"
									onClick={() => onSelectCitizen(citizen.id)}
								>
									<span>{citizen.name}</span>
									<small>{citizen.activity}</small>
								</button>
							</li>
						))}
					</ul>
				</div>
			) : lens === "resources" ? (
				<div className="world-lens">
					<strong>Resources in Riverhold</strong>
					<p>
						{projection.resources.food} food · {projection.resources.water}{" "}
						water · {projection.resources.wood} wood
					</p>
					<div className="place-focuses">
						<button
							type="button"
							onClick={() => onFocus({ kind: "place", id: "spring" })}
						>
							Low Spring
						</button>
						<button
							type="button"
							onClick={() => onFocus({ kind: "place", id: "granary" })}
						>
							Granary
						</button>
						<button
							type="button"
							onClick={() => onFocus({ kind: "place", id: "mill" })}
						>
							River Mill
						</button>
					</div>
				</div>
			) : lens === "routes" ? (
				<div className="world-lens">
					<strong>Selected route</strong>
					<p>
						{focus.kind === "citizen"
							? (projection.citizens.find((citizen) => citizen.id === focus.id)
									?.canonicalAction.destinationPlaceId ?? "No destination")
							: "Select a citizen to inspect their route."}
					</p>
				</div>
			) : null}
		</section>
	);
}

function PhasePanel({
	projection,
	pending,
	onDispatch,
}: {
	readonly projection: RiverholdProjection;
	readonly pending: boolean;
	readonly onDispatch: (intent: RiverholdIntent, delay?: boolean) => void;
}) {
	const [counsel, setCounsel] = useState<CounselIntent | null>(null);
	const phase = projection.phase;
	if (phase === "orientation")
		return (
			<div className="phase-panel phase-panel--arrival">
				<p className="eyebrow">A LIVING TOWN · ONE LIMITED BOND</p>
				<h1>
					Follow one life.
					<br />
					<em>Do not control it.</em>
				</h1>
				<p className="lede">
					Mara found a gap in Riverhold's food count. The truth could protect
					the town—or break her oldest friendship.
				</p>
				<div className="arrival-facts">
					<span>
						<b>12</b> food units missing from open bins
					</span>
					<span>
						<b>1</b> council vote before nightfall
					</span>
				</div>
				<button
					className="primary-action primary-action--large"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "follow-mara" })}
				>
					Follow Mara <span aria-hidden="true">→</span>
				</button>
				<p className="microcopy">
					She acts for herself. Following grants a narrow view and rare
					counsel—not command.
				</p>
			</div>
		);
	if (phase === "following")
		return (
			<div className="phase-panel phase-panel--following">
				<MaraDossier projection={projection} />
				<div className="tension-card">
					<p className="eyebrow">CURRENT TENSION</p>
					<h3>The count could be wrong. Toma signed it.</h3>
					<p>
						Mara trusts Toma, but the public ledger lists{" "}
						{projection.investigation.ledgerCount} food while the open bins hold{" "}
						{projection.investigation.openBinCount}.
					</p>
				</div>
				<aside className="local-disclosure">
					<strong>Browser-local Alpha</strong>
					<span>{projection.localSaveNotice}</span>
				</aside>
				<button
					className="primary-action"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "investigate-count" })}
				>
					Check why Mara doubts the count
				</button>
			</div>
		);
	if (phase === "investigated")
		return (
			<div className="phase-panel">
				<p className="eyebrow">MARA CHECKS THE COUNT</p>
				<h2>Mara checks the public tally</h2>
				<div className="count-comparison">
					<div>
						<span>PUBLIC LEDGER</span>
						<strong>{projection.investigation.ledgerCount}</strong>
					</div>
					<div className="count-gap">
						<span>DIFFERENCE</span>
						<strong>−{projection.investigation.mismatch}</strong>
					</div>
					<div>
						<span>OPEN BINS</span>
						<strong>{projection.investigation.openBinCount}</strong>
					</div>
				</div>
				<div className="fact-stack">
					<p>
						<span className="fact-badge">OBSERVED</span> The ledger and open
						bins differ by 12 food.
					</p>
					<p>
						<span className="belief-badge">BELIEF</span> Mara suspects the count
						is incomplete. She has not observed theft.
					</p>
					<p>
						<span className="claim-badge">UNKNOWN</span> Toma's reason for
						signing the count remains unobserved.
					</p>
				</div>
				<button
					className="primary-action"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "open-counsel" })}
				>
					Review Mara's choices
				</button>
			</div>
		);
	if (phase === "counsel")
		return (
			<div className="phase-panel counsel-panel">
				<p className="eyebrow">ONE CHANCE TO OFFER ADVICE</p>
				<h2>What risk should Mara take?</h2>
				<section
					className="counsel-context"
					aria-labelledby="counsel-context-title"
				>
					<h3 className="sr-only" id="counsel-context-title">
						What Mara knows and cares about
					</h3>
					<p>
						<strong>What she saw:</strong> the public tally says{" "}
						{projection.investigation.ledgerCount} food; the open bins hold{" "}
						{projection.investigation.openBinCount} — a{" "}
						{projection.investigation.mismatch}-unit gap.
					</p>
					<p>
						<strong>What matters to her:</strong>{" "}
						{projection.mara.values.join("; ")}.
					</p>
					<p>
						<strong>Her plan:</strong> Reconcile the ledger before speaking (
						{projection.mara.standingPlan}).
					</p>
					<p>
						<strong>Her relationship:</strong> {projection.mara.relationship}.
					</p>
					<p>
						<strong>Still uncertain:</strong> {projection.mara.belief} Toma's
						reason is not known.
					</p>
				</section>
				<aside className="local-disclosure local-disclosure--compact">
					<strong>Saved on this device</strong>
					<span>{projection.localSaveNotice}</span>
				</aside>
				<fieldset>
					<legend className="sr-only">Choose counsel for Mara</legend>
					{(["verify-private", "accuse-now", "abstain"] as const).map(
						(intent) => (
							<CounselCard
								key={intent}
								intent={intent}
								selected={counsel === intent}
								onSelect={() => setCounsel(intent)}
							/>
						),
					)}
				</fieldset>
				<button
					className="primary-action"
					type="button"
					disabled={!counsel || pending}
					onClick={() =>
						counsel && onDispatch({ kind: "offer-counsel", counsel }, true)
					}
				>
					{pending ? "Mara is weighing the counsel…" : "Offer counsel"}
				</button>
				<p className="microcopy">
					Advice contributes to her decision. It never directly executes a world
					action.
				</p>
			</div>
		);
	if (phase === "consequence")
		return (
			<div className="phase-panel">
				<p className="eyebrow">MARA MADE HER CHOICE</p>
				<h2>
					{projection.interpretation?.disposition === "not-applicable"
						? "She continued without your advice"
						: `She ${projection.interpretation?.disposition} your counsel`}
				</h2>
				<blockquote>“{projection.interpretation?.publicReason}”</blockquote>
				<ul
					className="reason-terms"
					aria-label="Mara's decisive visible reasons"
				>
					{projection.interpretation?.decisiveTerms.map((term) => (
						<li key={term}>{term}</li>
					))}
				</ul>
				<div className="consequence-card">
					<p className="eyebrow">WHAT FOLLOWED</p>
					<p>{projection.consequence}</p>
				</div>
				<p className="causal-note">
					<strong>Your advice influenced her.</strong> Mara's own choice caused
					her action. Open Evidence in the Chronicle for the exact recorded
					links.
				</p>
				<button
					className="primary-action"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "leave-checkpoint" })}
				>
					Leave Riverhold at checkpoint
				</button>
			</div>
		);
	if (phase === "checkpoint")
		return (
			<div className="phase-panel checkpoint-panel">
				<div className="checkpoint-seal" aria-hidden="true">
					RH
				</div>
				<p className="eyebrow">CHECKPOINT SEALED</p>
				<h2>Riverhold can continue from here.</h2>
				<p>
					Your branch and Riverhold's record have been saved in this browser. No
					account, server, model, or network is involved.
				</p>
				<aside className="local-disclosure">
					<strong>No backup yet</strong>
					<span>
						Clearing browser data will erase this proof. It cannot be restored
						or moved to another device.
					</span>
				</aside>
				<button
					className="primary-action"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "return-to-checkpoint" })}
				>
					Return to Riverhold
				</button>
			</div>
		);
	if (phase === "return-pending")
		return (
			<div className="phase-panel return-panel">
				<p className="eyebrow">RETURN · CHANGED WORLD FIRST</p>
				<h1>{projection.headline}</h1>
				<p className="lede">{projection.tension}</p>
				<div className="return-glimpse">
					<span>Day {projection.day}</span>
					<span>{projection.mara.relationship}</span>
					<span>{projection.worldNotices[0]}</span>
				</div>
				<p className="microcopy">
					The next advance is explicit. Nothing irreversible happens merely
					because wall time passed.
				</p>
				<button
					className="primary-action primary-action--large"
					type="button"
					disabled={pending}
					onClick={() => onDispatch({ kind: "confirm-advance" })}
				>
					Advance Riverhold <span aria-hidden="true">→</span>
				</button>
			</div>
		);
	if (phase === "return")
		return (
			<div className="phase-panel">
				<p className="eyebrow">WHILE YOU WERE AWAY</p>
				<h2>Three changes reached the checkpoint</h2>
				<ol className="away-beats">
					{projection.whileAway.map((beat, index) => (
						<li key={beat}>
							<span>{index + 1}</span>
							<p>{beat}</p>
						</li>
					))}
				</ol>
				<div className="second-choice">
					<p className="eyebrow">THE NEXT BOUNDED RISK</p>
					<h3>What do you ask Mara to consider now?</h3>
					{projection.secondActions.map((action) => (
						<button
							key={action.id}
							type="button"
							disabled={pending}
							onClick={() =>
								onDispatch({ kind: "take-second-action", actionId: action.id })
							}
						>
							<strong>{action.label}</strong>
							<span>{action.description}</span>
						</button>
					))}
				</div>
			</div>
		);
	return (
		<div className="phase-panel chronicle-intro">
			<p className="eyebrow">THE CHRONICLE IS READY</p>
			<h2>
				The Chronicle separates your advice, Mara's choice, and what followed.
			</h2>
			<p>{projection.tension}</p>
			<p className="microcopy">
				The Chronicle separates what was seen, what was believed, and what
				actually caused the later change. Open Evidence for the technical
				record.
			</p>
		</div>
	);
}

export function RiverholdApp() {
	const bridge = useMemo(
		() => createRiverholdRuntimeBridge(undefined, browserDiagnostics),
		[],
	);
	const [projection, setProjection] = useState<RiverholdProjection | null>(
		null,
	);
	const [pending, setPending] = useState(true);
	const [reducedMotion, setReducedMotion] = useState(
		() =>
			window.localStorage.getItem("eonfolk:reduced-motion") === "true" ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const [worldView, setWorldView] = useState<"illustrated" | "words">(() =>
		window.localStorage.getItem("eonfolk:world-view") === "words"
			? "words"
			: "illustrated",
	);
	const [rendererFailed, setRendererFailed] = useState(false);
	const [worldFocus, setWorldFocus] = useState<WorldFocus>({
		kind: "overview",
	});
	const [semanticScale, setSemanticScale] = useState<SemanticScale>("region");
	const [worldLens, setWorldLens] = useState<WorldLens>("activity");
	const [sheet, setSheet] = useState<Sheet>(null);
	const [runtimeError, setRuntimeError] = useState<RuntimeFailure | null>(null);
	const [runtimeIncident, setRuntimeIncident] =
		useState<DiagnosticIncident | null>(null);
	const phaseFocus = useRef<HTMLElement>(null);
	const pendingDispatch = useRef(true);
	const dialog = useRef<HTMLElement>(null);
	const dialogInvoker = useRef<HTMLElement | null>(null);
	const showWords = useCallback((failed = false) => {
		if (failed) setRendererFailed(true);
		setWorldView("words");
		window.localStorage.setItem("eonfolk:world-view", "words");
	}, []);
	const showIllustrated = useCallback(() => {
		setRendererFailed(false);
		setWorldView("illustrated");
		window.localStorage.setItem("eonfolk:world-view", "illustrated");
	}, []);
	const captureFailure = (error: unknown) => {
		const failure = runtimeFailure(error);
		void browserDiagnostics
			.captureRuntimeFailure({
				code: failure.writeAuthorityTransferred
					? "STALE_FENCE"
					: "RUNTIME_FAILED",
				component: "riverhold-app",
				protectReality: () => bridge.clear(),
			})
			.then(setRuntimeIncident)
			.finally(() => setRuntimeError(failure));
	};

	useEffect(() => {
		void bridge
			.ready()
			.then((next) => {
				setProjection(next);
				pendingDispatch.current = false;
				setPending(false);
			})
			.catch(captureFailure);
		return () => bridge.clear();
	}, [bridge]);
	useEffect(() => {
		window.localStorage.setItem(
			"eonfolk:reduced-motion",
			reducedMotion ? "true" : "false",
		);
	}, [reducedMotion]);

	useEffect(() => {
		phaseFocus.current?.focus({ preventScroll: true });
		if (projection?.phase === "following") {
			const mara = projection.citizens.find(
				(citizen) => citizen.slug === "mara",
			);
			if (mara !== undefined)
				setWorldFocus({ kind: "citizen", id: mara.id, follow: true });
		}
	}, [projection?.phase]);
	useEffect(() => {
		const close = () => setSheet(null);
		window.addEventListener("popstate", close);
		return () => window.removeEventListener("popstate", close);
	}, []);
	const openSheet = (next: Exclude<Sheet, null>) => {
		dialogInvoker.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		window.history.pushState({ riverholdSheet: next.kind }, "");
		setSheet(next);
	};
	const selectCitizen = (citizenId: string) => {
		setWorldFocus({ kind: "citizen", id: citizenId, follow: false });
		openSheet({ kind: "citizen", citizenId });
	};
	const closeSheet = () => {
		if (sheet) window.history.back();
		else setSheet(null);
	};
	useEffect(() => {
		if (sheet === null) {
			dialogInvoker.current?.focus({ preventScroll: true });
			return;
		}
		const surface = dialog.current;
		if (surface === null) return;
		const focusable = () =>
			[
				...surface.querySelectorAll<HTMLElement>("button, [href], [tabindex]"),
			].filter(
				(element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
			);
		const heading = surface.querySelector<HTMLElement>("#detail-title");
		heading?.focus({ preventScroll: true });
		const scrim = surface.parentElement;
		const siblings = scrim?.parentElement
			? [...scrim.parentElement.children].filter((node) => node !== scrim)
			: [];
		const priorOverflow = document.body.style.overflow;
		for (const node of siblings) {
			if (!(node instanceof HTMLElement)) continue;
			node.inert = true;
			node.setAttribute("aria-hidden", "true");
		}
		document.body.style.overflow = "hidden";
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				window.history.back();
				return;
			}
			if (event.key !== "Tab") return;
			const candidates = focusable();
			if (candidates.length === 0) return;
			const first = candidates[0]!;
			const last = candidates.at(-1)!;
			if (!event.shiftKey && document.activeElement === heading) {
				event.preventDefault();
				first.focus();
			} else if (event.shiftKey && document.activeElement === heading) {
				event.preventDefault();
				last.focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			for (const node of siblings) {
				if (!(node instanceof HTMLElement)) continue;
				node.inert = false;
				node.removeAttribute("aria-hidden");
			}
			document.body.style.overflow = priorOverflow;
		};
	}, [sheet]);
	const dispatch = (intent: RiverholdIntent, delay = false) => {
		if (pendingDispatch.current) return;
		browserDiagnostics.record({
			category: "ui",
			name: "player-intent",
			severity: "info",
			outcome: "started",
			scope: { component: "riverhold-app" },
			fields: { operation: intent.kind, phase: projection?.phase ?? "loading" },
		});
		pendingDispatch.current = true;
		setPending(true);
		const execute = () => {
			void bridge
				.dispatch(intent)
				.then(setProjection)
				.catch(captureFailure)
				.finally(() => {
					pendingDispatch.current = false;
					setPending(false);
				});
		};
		if (delay) window.setTimeout(execute, reducedMotion ? 160 : 720);
		else execute();
	};
	const selectedCitizen =
		sheet?.kind === "citizen"
			? projection?.citizens.find((citizen) => citizen.id === sheet.citizenId)
			: null;

	if (runtimeError !== null)
		return (
			<main className="runtime-failure" aria-labelledby="runtime-failure-title">
				<InkMark />
				<p className="eyebrow">FOUNDER ALPHA UNAVAILABLE</p>
				<h1 id="runtime-failure-title">
					Riverhold stopped before showing further world state.
				</h1>
				<p>
					No world state or Chronicle is being presented as authoritative. This
					Founder Alpha requires a working Web Worker and browser storage.
				</p>
				{runtimeError.writeAuthorityTransferred && (
					<p role="alert">
						<strong>Another Riverhold tab took write authority.</strong> This
						tab was stopped with STALE_FENCE so it cannot overwrite the newer
						world.
					</p>
				)}
				{runtimeIncident !== null && (
					<aside aria-label="Local reproduction details">
						<p>{runtimeIncident.safeSummary}</p>
						<p>
							Reproduction ID: <code>{runtimeIncident.incidentId}</code>
						</p>
					</aside>
				)}
				<FeedbackPanel />
			</main>
		);

	if (projection === null)
		return (
			<main className="runtime-loading" aria-labelledby="runtime-loading-title">
				<InkMark />
				<p className="eyebrow">OPENING RIVERHOLD'S RECORD</p>
				<h1 id="runtime-loading-title">Checking Riverhold's durable record…</h1>
				<p>
					No world facts or Chronicle will appear until the local authority has
					opened and replayed successfully.
				</p>
			</main>
		);

	return (
		<div
			className={`app-shell phase-${projection.phase}${reducedMotion ? " reduced-motion" : ""}`}
		>
			<a href="#phase-panel" className="skip-link">
				Skip to current decision
			</a>
			<WorldHeader
				projection={projection}
				reducedMotion={reducedMotion}
				setReducedMotion={setReducedMotion}
				onOpenWorld={() => openSheet({ kind: "world" })}
			/>
			<main id="world" ref={phaseFocus} tabIndex={-1}>
				<section
					className={`world-stage${worldView === "words" ? " world-stage--words" : ""}`}
					aria-label={
						worldView === "words"
							? "Riverhold world in words"
							: "Illustrated Riverhold world"
					}
				>
					<button
						className="world-view-toggle"
						type="button"
						aria-pressed={worldView === "words"}
						onClick={() =>
							worldView === "illustrated" ? showWords() : showIllustrated()
						}
					>
						{worldView === "illustrated"
							? "Use list view"
							: "Use illustrated view"}
					</button>
					{worldView === "illustrated" ? (
						<>
							<Suspense
								fallback={
									<div className="world-renderer-loading" role="status">
										Preparing the embodied Riverhold view…
									</div>
								}
							>
								<RiverholdWorld
									projection={projection}
									reducedMotion={reducedMotion}
									onFailure={() => showWords(true)}
									focus={worldFocus}
									onSemanticScaleChange={setSemanticScale}
								/>
							</Suspense>
							<div className="world-vignette" aria-hidden="true" />
						</>
					) : (
						<div className="world-words">
							{rendererFailed && (
								<p className="renderer-note" role="status">
									The illustrated view could not start. Riverhold is fully
									playable in this words view; no world fact or action has been
									lost.
								</p>
							)}
							<SemanticWorld
								projection={projection}
								onCitizen={selectCitizen}
								compact
							/>
						</div>
					)}
					{worldView === "illustrated" && (
						<WorldControls
							projection={projection}
							focus={worldFocus}
							semanticScale={semanticScale}
							lens={worldLens}
							onFocus={setWorldFocus}
							onSelectCitizen={selectCitizen}
							onLens={setWorldLens}
							onResearch={() => openSheet({ kind: "research" })}
						/>
					)}
					{worldView === "illustrated" && (
						<div className="world-caption">
							<div>
								<p className="eyebrow">RIVERHOLD · DAY {projection.day}</p>
								<h2>{projection.headline}</h2>
								<p>{projection.timeLabel}</p>
							</div>
							<div
								className="resource-ribbon"
								role="status"
								aria-label={`Resources: ${projection.resources.food} food, ${projection.resources.water} water, ${projection.resources.wood} wood`}
							>
								<span>
									<i className="grain" />
									{projection.resources.food}
									<small>food</small>
								</span>
								<span>
									<i className="drop" />
									{projection.resources.water}
									<small>water</small>
								</span>
								<span>
									<i className="log" />
									{projection.resources.wood}
									<small>wood</small>
								</span>
							</div>
						</div>
					)}
					{worldView === "illustrated" && (
						<div className="world-notice" role="status">
							<span aria-hidden="true">✦</span>
							{projection.worldNotices[0]}
						</div>
					)}
				</section>
				<aside
					id="phase-panel"
					className="decision-rail"
					aria-label="Current Riverhold decision"
				>
					<PhasePanel
						projection={projection}
						pending={pending}
						onDispatch={dispatch}
					/>
				</aside>
			</main>
			{projection.phase === "chronicle" && (
				<>
					<Chronicle
						beats={projection.chronicle}
						reducedMotion={reducedMotion}
						onEvidence={(beat) => openSheet({ kind: "evidence", beat })}
						onShowInWorld={(beat) => {
							const citizenId = beat.spatialFocus.participantIds[0];
							setWorldFocus(
								citizenId === undefined
									? { kind: "place", id: beat.spatialFocus.placeId }
									: { kind: "citizen", id: citizenId, follow: false },
							);
							document
								.querySelector("#world")
								?.scrollIntoView({
									behavior: reducedMotion ? "auto" : "smooth",
								});
						}}
					/>
					<StoryCard projection={projection} />
				</>
			)}
			{worldView === "illustrated" && (
				<SemanticWorld projection={projection} onCitizen={selectCitizen} />
			)}
			<FeedbackPanel />
			<footer>
				<InkMark />
				<p>
					<strong>Riverhold Founder Alpha · local and account-free</strong>
					<span>
						The world record should be trustworthy. Mara's beliefs may still be
						wrong.
					</span>
				</p>
			</footer>
			{sheet && (
				<div className="sheet-scrim" role="presentation">
					<section
						ref={dialog}
						className="detail-sheet"
						role="dialog"
						aria-modal="true"
						aria-labelledby="detail-title"
					>
						<button
							className="sheet-close"
							type="button"
							onClick={closeSheet}
							aria-label="Close details"
						>
							×
						</button>
						{sheet.kind === "citizen" && selectedCitizen && (
							<>
								<p className="eyebrow">RIVERHOLD CITIZEN</p>
								<h2 id="detail-title" tabIndex={-1}>
									{selectedCitizen.name}
								</h2>
								<p className="sheet-role">{selectedCitizen.role}</p>
								<dl>
									<div>
										<dt>Current activity</dt>
										<dd>{selectedCitizen.activity}</dd>
									</div>
									<div>
										<dt>Visibility</dt>
										<dd>
											This public activity is visible in both the illustrated
											world and the words view.
										</dd>
									</div>
									{selectedCitizen.focal && (
										<>
											<div>
												<dt>Standing Plan</dt>
												<dd>{projection.mara.standingPlan}</dd>
											</div>
											<div>
												<dt>Relationship</dt>
												<dd>{projection.mara.relationship}</dd>
											</div>
										</>
									)}
								</dl>
							</>
						)}
						{sheet.kind === "world" && (
							<>
								<p className="eyebrow">WORLD PULSE</p>
								<h2 id="detail-title" tabIndex={-1}>
									Eight lives in motion
								</h2>
								<dl>
									<div>
										<dt>Food · water · wood</dt>
										<dd>
											{projection.resources.food} · {projection.resources.water}{" "}
											· {projection.resources.wood}
										</dd>
									</div>
									<div>
										<dt>Current interaction</dt>
										<dd>{projection.worldNotices[0]}</dd>
									</div>
									<div>
										<dt>World time</dt>
										<dd>
											Day {projection.day}, {projection.timeLabel}
										</dd>
									</div>
									<div>
										<dt>Storage</dt>
										<dd>{projection.localSaveNotice}</dd>
									</div>
								</dl>
							</>
						)}
						{sheet.kind === "research" && (
							<>
								<p className="eyebrow">RESEARCH LENS · DELIBERATE DEPTH</p>
								<h2 id="detail-title" tabIndex={-1}>
									Why this view is trustworthy
								</h2>
								<p>
									The world is the default. These protocol details are shown
									only because you opened Research Lens.
								</p>
								<dl>
									<div>
										<dt>Reality head</dt>
										<dd>
											Revision {projection.spatial.source.revision}; accepted
											through event {projection.spatial.source.throughSequence}
										</dd>
									</div>
									<div>
										<dt>Projection source</dt>
										<dd>
											Region {projection.spatial.source.regionId}; state
											fingerprint{" "}
											{projection.spatial.source.stateHash.slice(0, 12)}…
										</dd>
									</div>
									<div>
										<dt>Current distinction</dt>
										<dd>
											Mara’s beliefs may be wrong. Only accepted world events
											determine resources, relationships, and consequences.
										</dd>
									</div>
									<div>
										<dt>Cognition</dt>
										<dd>
											Standard Brain proposes bounded actions; validation after
											cognition decides whether they can enter Reality.
										</dd>
									</div>
								</dl>
							</>
						)}
						{sheet.kind === "evidence" && (
							<>
								<p className="eyebrow">AUTHORIZED EVENT EVIDENCE</p>
								<h2 id="detail-title" tabIndex={-1}>
									{sheet.beat.title}
								</h2>
								<p>{sheet.beat.body}</p>
								<ul className="evidence-list">
									{sheet.beat.evidence.map((item) => (
										<li key={item.eventId}>
											<div>
												<strong>{item.eventId}</strong>
												<span className={`relation relation--${item.relation}`}>
													{item.relation}
												</span>
											</div>
											<p>{item.label}</p>
											<small>
												Mechanism: {item.mechanism} · visibility:{" "}
												{item.visibility}
											</small>
										</li>
									))}
								</ul>
								<p className="microcopy">
									{sheet.beat.evidence.some(
										(item) => item.relation === "allegation",
									)
										? "An allegation is attributed content; it is not presented as an established fact."
										: sheet.beat.evidence.some(
													(item) => item.relation === "temporal-predecessor",
												)
											? "A temporal predecessor is recorded without being promoted to a cause."
											: "Contributing evidence is recorded separately from the direct cause of the later consequence."}
								</p>
							</>
						)}
					</section>
				</div>
			)}
		</div>
	);
}
