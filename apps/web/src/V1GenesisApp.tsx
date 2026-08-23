import type { GeneratedCivilizationSpatialProjection } from "@eonfolk/world-presentation";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { EonfolkMark } from "./components/EonfolkMark";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { GeneratedEmbodimentControls } from "./components/generated/GeneratedEmbodimentControls";
import { browserDiagnostics } from "./diagnostics";
import {
	type GeneratedAssetIntegrity,
	type GeneratedEmbodiedActor,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	INITIAL_GENERATED_NAVIGATION,
	reduceGeneratedNavigation,
	verifyGeneratedFolkAsset,
} from "./generated-presentation";
import type { GeneratedWorldFaultSpec } from "./generated-world-faults";
import {
	buildGeneratedWorldExperience,
	GENERATED_WORLD_STORAGE_KEY,
	type GeneratedWorldExperience,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";
import {
	buildWorldFocusHref,
	parseWorldFocusHref,
	type WorldFocus,
	worldFocusId,
} from "./research-navigation";

let generatedWorldCanvasModule:
	| Promise<typeof import("./generated-world-canvas")>
	| undefined;

const generatedFaultHooks =
	typeof __EONFOLK_E2E_CRASH_HOOKS__ !== "undefined" &&
	__EONFOLK_E2E_CRASH_HOOKS__;
const generatedWorldFaultModule = generatedFaultHooks
	? import("./generated-world-faults")
	: Promise.resolve(null);

function loadGeneratedWorldCanvasModule() {
	generatedWorldCanvasModule ??= import("./generated-world-canvas");
	return generatedWorldCanvasModule;
}

const GeneratedWorldCanvas = lazy(async () => {
	const module = await loadGeneratedWorldCanvasModule();
	return { default: module.GeneratedWorldCanvas };
});

type WorldView = "embodied" | "semantic" | "overview";

type GeneratedAssetState =
	| Readonly<{ readonly status: "checking" }>
	| Readonly<{
			readonly status: "verified";
			readonly integrity: GeneratedAssetIntegrity;
	  }>
	| Readonly<{ readonly status: "failed"; readonly error: Error }>;

function readableId(value: string): string {
	return value.replace(/[-_:]+/gu, " ");
}

function useGeneratedFault(): GeneratedWorldFaultSpec | null | undefined {
	const [fault, setFault] = useState<
		GeneratedWorldFaultSpec | null | undefined
	>(undefined);
	useEffect(() => {
		let active = true;
		void generatedWorldFaultModule.then((module) => {
			if (active) setFault(module?.readGeneratedWorldFault() ?? null);
		});
		return () => {
			active = false;
		};
	}, []);
	return fault;
}

function useGeneratedExperience(
	fault: GeneratedWorldFaultSpec | null | undefined,
): {
	readonly experience: GeneratedWorldExperience | null;
	readonly error: Error | null;
	readonly refresh: (expectedStateHash?: string) => Promise<void>;
} {
	const [experience, setExperience] = useState<GeneratedWorldExperience | null>(
		null,
	);
	const [error, setError] = useState<Error | null>(null);
	useEffect(() => {
		if (fault === undefined) return;
		let active = true;
		const loading =
			!generatedFaultHooks || fault === null
				? loadGeneratedWorldExperience()
				: generatedWorldFaultModule.then((module) => {
						if (module === null)
							throw new Error("Generated fault module is unavailable");
						return buildGeneratedWorldExperience(
							module.generatedWorldBuildOptionsForFault(fault),
						);
					});
		void loading.then(
			(value) => {
				if (active) setExperience(value);
			},
			(reason: unknown) => {
				if (!active) return;
				setError(
					reason instanceof Error
						? reason
						: new Error("World projection failed"),
				);
			},
		);
		return () => {
			active = false;
		};
	}, [fault]);
	return {
		experience,
		error,
		refresh: async (expectedStateHash) => {
			for (let attempt = 0; attempt < 2; attempt += 1) {
				const next = await refreshGeneratedWorldExperience();
				if (
					expectedStateHash === undefined ||
					next.stateHash === expectedStateHash
				) {
					setExperience(next);
					return;
				}
			}
			throw new Error(
				"The projection did not reach the committed authority head",
			);
		},
	};
}

function useGeneratedAsset(
	fault: GeneratedWorldFaultSpec | null,
): GeneratedAssetState {
	const [state, setState] = useState<GeneratedAssetState>(() =>
		Object.freeze({ status: "checking" }),
	);
	useEffect(() => {
		let active = true;
		const verification = generatedFaultHooks
			? generatedWorldFaultModule.then((module) =>
					verifyGeneratedFolkAsset(
						module?.generatedWorldAssetFetcherForFault(fault) ??
							globalThis.fetch,
					),
				)
			: verifyGeneratedFolkAsset();
		void verification.then(
			(integrity) => {
				if (active) setState(Object.freeze({ status: "verified", integrity }));
			},
			(reason: unknown) => {
				if (active)
					setState(
						Object.freeze({
							status: "failed",
							error:
								reason instanceof Error
									? reason
									: new Error("Generated asset verification failed"),
						}),
					);
			},
		);
		return () => {
			active = false;
		};
	}, [fault]);
	return state;
}

function WorldLoading() {
	return (
		<main className="v1-genesis-shell v1-genesis-loading" aria-busy="true">
			<p className="v1-kicker">GENERATING CANONICAL REALITY</p>
			<h1>Advancing one world through its first year.</h1>
		</main>
	);
}

function WorldError({
	error,
	fault = null,
}: {
	readonly error: Error;
	readonly fault?: GeneratedWorldFaultSpec | null;
}) {
	const boundaryFault =
		generatedFaultHooks && fault?.disposition === "fail-closed" ? fault : null;
	const faultErrorCode =
		generatedFaultHooks && "code" in error && typeof error.code === "string"
			? error.code
			: undefined;
	const retry = () => {
		void generatedWorldFaultModule.then((module) => {
			module?.clearGeneratedWorldFault();
			window.location.reload();
		});
	};
	return (
		<main
			className="v1-genesis-shell"
			aria-labelledby="v1-error-title"
			{...(generatedFaultHooks
				? {
						"data-fault-kind": boundaryFault?.kind,
						"data-fault-disposition": boundaryFault?.disposition,
						"data-fault-error-code": faultErrorCode,
					}
				: {})}
		>
			<p className="v1-kicker">WORLD UNAVAILABLE</p>
			<h1 id="v1-error-title">No incomplete world is shown as fact.</h1>
			<details>
				<summary>Technical detail</summary>
				<code>
					{generatedFaultHooks ? error.message : "LOCAL_RUNTIME_FAILURE"}
				</code>
			</details>
			{!generatedFaultHooks || boundaryFault === null ? null : (
				<button className="v1-text-link" type="button" onClick={retry}>
					Retry without the failed local input
				</button>
			)}
			<a className="v1-text-link" href="/genesis">
				Try the canonical origin again
			</a>
		</main>
	);
}

function ProjectionUnavailable({
	projection,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
}) {
	return (
		<section className="generated-unavailable" role="status">
			<p className="v1-kicker">EMBODIED VIEW UNAVAILABLE</p>
			<h2>No activity is being inferred for this settlement.</h2>
			<p>
				Canonical projection stopped because{" "}
				{projection.availability.reasons.map(readableId).join(" and ")}. The
				grounded places remain inspectable below.
			</p>
		</section>
	);
}

function SemanticSettlement({
	projection,
	model,
	navigation,
	dispatch,
	presentationTick,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
	onNavigationRejected,
	focusedLocationId,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationTick: number;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
	readonly onNavigationRejected: (
		reason: "invalid-envelope" | "foreign-reference",
	) => void;
	readonly focusedLocationId: string | null;
}) {
	return (
		<section
			className="generated-semantic"
			data-testid="generated-semantic-world"
		>
			<div>
				<p className="v1-kicker">WORLD IN WORDS</p>
				<h2>{projection.local.settlement.semanticLabel}</h2>
				<p>
					{projection.local.semanticCounts.sites} grounded sites,{" "}
					{projection.local.semanticCounts.routes} routes, and{" "}
					{projection.spatial.actors.length} visibly scheduled residents.
				</p>
			</div>
			<GeneratedEmbodimentControls
				model={model}
				navigation={navigation}
				dispatch={dispatch}
				presentationTick={presentationTick}
				presentationPlaying={presentationPlaying}
				reducedMotion={reducedMotion}
				onTogglePresentation={onTogglePresentation}
				onStepPresentation={onStepPresentation}
				onNavigationRejected={onNavigationRejected}
			/>
			<section aria-labelledby="semantic-places-title">
				<h3 id="semantic-places-title">Grounded places</h3>
				<ul>
					{projection.local.sites.map((site) => {
						const focused = focusedLocationId === site.siteId;
						return (
							<li
								key={site.siteId}
								aria-current={focused ? "location" : undefined}
							>
								<strong>{site.name}</strong>
								<span>{site.semanticLabel}</span>
							</li>
						);
					})}
				</ul>
			</section>
		</section>
	);
}

function SettlementOverview({
	experience,
	selectedSettlementId,
	onSettlement,
}: {
	readonly experience: GeneratedWorldExperience;
	readonly selectedSettlementId: string;
	readonly onSettlement: (settlementId: string) => void;
}) {
	return (
		<section
			className="generated-overview"
			data-testid="generated-world-overview"
		>
			<header>
				<p className="v1-kicker">CIVILIZATION OVERVIEW</p>
				<h2>One world, {experience.settlementCount} inhabited places.</h2>
			</header>
			<div className="generated-settlement-cards">
				{experience.projections.map((projection) => (
					<article key={projection.local.settlement.settlementId}>
						<p className="v1-kicker">
							{projection.local.settlement.foundedAtSimulationTime === 0
								? "ORIGIN SETTLEMENT"
								: "FOUNDED SETTLEMENT"}
						</p>
						<h3>{projection.local.settlement.name}</h3>
						<p>{projection.local.settlement.semanticLabel}</p>
						<ul>
							<li>{projection.spatial.actors.length} resident activities</li>
							<li>{projection.local.semanticCounts.sites} grounded sites</li>
							<li>{projection.projects.length} canonical projects</li>
						</ul>
						<button
							type="button"
							aria-pressed={
								projection.local.settlement.settlementId ===
								selectedSettlementId
							}
							onClick={() =>
								onSettlement(projection.local.settlement.settlementId)
							}
						>
							Open {projection.local.settlement.name}
						</button>
					</article>
				))}
			</div>
		</section>
	);
}

const ACTIVITY_WORDS = Object.freeze({
	idle: "pausing",
	walk: "walking",
	carry: "carrying",
	gather: "gathering",
	inspect: "inspecting the work",
	talk: "speaking",
	listen: "listening",
	exchange: "exchanging goods",
	repair: "making repairs",
	"eat-rest": "resting",
	react: "reacting",
});

const PROP_WORDS = Object.freeze({
	water: "water",
	logs: "logs",
	grain: "grain",
	trade: "goods",
	tool: "a tool",
});

function actorActivity(
	actor: GeneratedEmbodiedActor,
	projection: GeneratedCivilizationSpatialProjection,
): string {
	const place = projection.local.sites.find(
		({ siteId }) => siteId === actor.placeId,
	)?.name;
	const prop = actor.prop === null ? null : PROP_WORDS[actor.prop];
	const activity =
		prop !== null &&
		["carry", "gather", "exchange"].includes(actor.animationClass)
			? `${ACTIVITY_WORDS[actor.animationClass]} ${prop}`
			: ACTIVITY_WORDS[actor.animationClass];
	return place === undefined ? activity : `${activity} at ${place}`;
}

function GeneratedSceneTruth({
	projection,
	model,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
}) {
	const interaction = projection.spatial.interactions[0];
	if (interaction === undefined) return null;
	const participants = interaction.participantIds
		.map((citizenId) =>
			model.actors.find((actor) => actor.citizenId === citizenId),
		)
		.filter((actor) => actor !== undefined);
	if (participants.length < 2) return null;
	const first = participants[0];
	if (first === undefined) return null;
	const place = projection.local.sites.find(
		(site) => site.siteId === first.placeId,
	)?.name;
	const otherActivities = model.actors
		.filter((actor) => !interaction.participantIds.includes(actor.citizenId))
		.filter(
			(actor, index, actors) =>
				actors.findIndex(
					(candidate) => candidate.animationClass === actor.animationClass,
				) === index,
		)
		.slice(0, 4);
	const participantNames = participants.map(({ name }) => name).join(" + ");
	return (
		<div
			className="generated-scene-truth"
			data-testid="generated-scene-truth"
			data-interaction-kind={interaction.kind}
			data-interaction-status={interaction.status}
			data-participant-ids={interaction.participantIds.join(",")}
		>
			<p className="generated-scene-interaction">
				<span aria-hidden="true" className="generated-scene-signal" />
				<span>
					<strong>{participantNames}</strong>
					<small>
						{interaction.status === "in-progress" ? "In" : "Completed"}{" "}
						{interaction.kind}
						{place === undefined ? "" : ` · ${place}`}
					</small>
				</span>
			</p>
			<ul aria-label="Other visible work in the scene">
				{otherActivities.map((actor) => (
					<li
						key={actor.citizenId}
						className={`generated-scene-activity generated-scene-activity--${actor.animationClass}`}
					>
						<strong>{actor.name.split(" ")[0]}</strong>
						<span>{actorActivity(actor, projection).split(" at ")[0]}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function GeneratedContextPanel({
	projection,
	model,
	navigation,
	dispatch,
	presentationTick,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
	onNavigationRejected,
	authorityRegionId,
	authorityDatabaseName,
	sponsorCitizenId,
	sponsorPhase,
	activeCounselIntent,
	persistenceAvailable,
	onAuthorityCommitted,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationTick: number;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
	readonly onNavigationRejected: (
		reason: "invalid-envelope" | "foreign-reference",
	) => void;
	readonly authorityRegionId: string;
	readonly authorityDatabaseName: string;
	readonly sponsorCitizenId: string;
	readonly sponsorPhase:
		| "idle"
		| "sponsored"
		| "abstained"
		| "counseled"
		| "resolved";
	readonly activeCounselIntent: "verify-reserve" | "accuse-publicly" | null;
	readonly persistenceAvailable: boolean;
	readonly onAuthorityCommitted: (expectedStateHash?: string) => Promise<void>;
}) {
	const [sponsorStatus, setSponsorStatus] = useState("idle");
	const [chronicleTrace, setChronicleTrace] = useState("");
	const [shareArtifact, setShareArtifact] = useState("");
	const [chronicleBeats, setChronicleBeats] = useState<
		readonly {
			readonly text: string;
			readonly relation: string;
			readonly evidenceEventIds: readonly string[];
			readonly citizenId: string;
		}[]
	>([]);
	const [activeIntent, setActiveIntent] = useState<
		"verify-reserve" | "accuse-publicly"
	>("verify-reserve");
	const [copyStatus, setCopyStatus] = useState("");
	const [authorityRefreshing, setAuthorityRefreshing] = useState(false);
	const selectedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const selectedActor =
		selectedCitizenId === null
			? undefined
			: model.actors.find(({ citizenId }) => citizenId === selectedCitizenId);
	const canSponsor = selectedActor?.citizenId === sponsorCitizenId;
	const worldLink = (focus: WorldFocus, label: string) => {
		const href = buildWorldFocusHref(focus);
		return href === null ? null : <a href={href}>{label}</a>;
	};
	useEffect(() => {
		setSponsorStatus("idle");
		setChronicleTrace("");
		setShareArtifact("");
		setChronicleBeats([]);
		setCopyStatus("");
		setAuthorityRefreshing(false);
	}, [selectedCitizenId]);
	useEffect(() => {
		if (selectedCitizenId !== sponsorCitizenId) return;
		setSponsorStatus(sponsorPhase);
		setActiveIntent(activeCounselIntent ?? "verify-reserve");
	}, [activeCounselIntent, selectedCitizenId, sponsorCitizenId, sponsorPhase]);
	const commitSponsor = (
		step: "establish" | "abstain" | "counsel" | "resolve",
		intent = activeIntent,
	) => {
		if (selectedActor === undefined) return;
		setSponsorStatus(
			step === "establish"
				? "saving"
				: step === "counsel"
					? "counseling"
					: "returning",
		);
		void import("./generated-sponsor-runtime")
			.then(({ sponsorGeneratedCitizen }) =>
				sponsorGeneratedCitizen({
					citizenId: selectedActor.citizenId,
					regionId: authorityRegionId,
					databaseName: authorityDatabaseName,
					step,
					intent,
				}),
			)
			.then(async (result) => {
				setChronicleTrace(result.chronicleTrace);
				setShareArtifact(result.shareArtifact ?? "");
				setChronicleBeats(result.chronicleBeats);
				setSponsorStatus(result.phase);
				setActiveIntent(result.activeIntent ?? intent);
				if (!result.idempotent || step === "resolve") {
					setAuthorityRefreshing(true);
					await onAuthorityCommitted(result.authorityStateHash);
					setAuthorityRefreshing(false);
				}
			})
			.then(undefined, (reason: unknown) => {
				setAuthorityRefreshing(false);
				if (step !== "establish")
					setChronicleTrace(
						reason instanceof Error
							? `${reason.message}; prior state preserved.`
							: "Action unavailable; prior state preserved.",
					);
				setSponsorStatus(step === "establish" ? "failed" : sponsorPhase);
			});
	};
	const activityCounts = new Map<string, number>();
	for (const actor of model.actors) {
		const activity = ACTIVITY_WORDS[actor.animationClass];
		activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
	}
	const activeInteraction = projection.spatial.interactions[0];
	const interactionParticipants =
		activeInteraction === undefined
			? []
			: activeInteraction.participantIds
					.map((citizenId) =>
						model.actors.find((actor) => actor.citizenId === citizenId),
					)
					.filter((actor) => actor !== undefined);
	const interactionPlace = interactionParticipants[0]
		? projection.local.sites.find(
				(site) => site.siteId === interactionParticipants[0]?.placeId,
			)?.name
		: undefined;
	const interactionPhrase =
		activeInteraction?.status === "in-progress"
			? activeInteraction.kind === "conversation"
				? "are talking"
				: "are making an exchange"
			: activeInteraction?.kind === "conversation"
				? "finished talking"
				: "completed an exchange";
	return (
		<aside
			className="v1-context-panel"
			aria-label="Canonical settlement context"
		>
			<section className="v1-presence-card" aria-live="polite">
				<p className="v1-kicker">
					{selectedActor === undefined ? "HAPPENING NOW" : "PERSON IN FOCUS"}
				</p>
				<h2>{selectedActor?.name ?? projection.local.settlement.name}</h2>
				{selectedActor === undefined ? (
					<>
						{activeInteraction !== undefined &&
						interactionParticipants.length >= 2 ? (
							<p className="v1-live-interaction">
								<strong>
									{interactionParticipants
										.map(({ name }) => name)
										.join(" and ")}
								</strong>{" "}
								{interactionPhrase}
								{interactionPlace === undefined
									? "."
									: ` at ${interactionPlace}.`}
							</p>
						) : null}
						<p>
							{model.actors.length} lives are unfolding at once. Select someone
							to move from the settlement view into their immediate work.
						</p>
						<ul className="v1-activity-summary" aria-label="Visible activities">
							{[...activityCounts].map(([activity, count]) => (
								<li key={activity}>
									<strong>{count}</strong> {activity}
								</li>
							))}
						</ul>
					</>
				) : (
					<>
						<p className="v1-context-role">{selectedActor.role}</p>
						<p>{actorActivity(selectedActor, projection)}.</p>
						<p>
							<strong>Immediate relationship:</strong>{" "}
							{selectedActor.interactionTarget === null
								? "No one is currently beside them."
								: `They are engaged with ${model.actors.find(({ citizenId }) => citizenId === selectedActor.interactionTarget)?.name ?? "another resident"}.`}
						</p>
						<p>
							<strong>Current tension:</strong> continue{" "}
							{actorActivity(selectedActor, projection)}, or pause to examine
							your counsel without any guarantee they will follow it.
						</p>
						<p className="v1-local-disclosure">
							This world is stored only in this browser. There is no account,
							cloud backup, or recovery copy.
						</p>
						<div className="v1-focus-actions">
							<button
								type="button"
								aria-pressed={navigation.followCitizen}
								onClick={() => dispatch({ type: "toggle-follow" })}
							>
								{navigation.followCitizen ? "Stop following" : "Follow"}
							</button>
							<button
								type="button"
								onClick={() => dispatch({ type: "overview" })}
							>
								Back to settlement
							</button>
							<button
								type="button"
								disabled={
									!persistenceAvailable ||
									!canSponsor ||
									authorityRefreshing ||
									sponsorStatus === "saving" ||
									sponsorStatus === "counseling" ||
									sponsorStatus === "returning" ||
									sponsorStatus === "confirming" ||
									sponsorStatus === "counseled"
								}
								onClick={() =>
									sponsorStatus === "resolved"
										? commitSponsor("establish")
										: sponsorStatus === "sponsored" ||
												sponsorStatus === "abstained"
											? setSponsorStatus("confirming")
											: commitSponsor("establish")
								}
							>
								{sponsorStatus === "saving"
									? "Establishing…"
									: sponsorStatus === "counseling"
										? "Considering…"
										: sponsorStatus === "sponsored" ||
												sponsorStatus === "abstained"
											? "Consider an intervention"
											: sponsorStatus === "resolved"
												? "Review Chronicle"
												: "Sponsor this person"}
							</button>
						</div>
						{sponsorStatus === "abstained" ? (
							<p>
								Canonical Chronicle: the patron withheld counsel at this
								boundary; the citizen continued without intervention.
							</p>
						) : null}
						{canSponsor ? null : (
							<p>
								This resident has no local counsel relationship at this
								boundary.
							</p>
						)}
						{sponsorStatus === "confirming" ? (
							<section aria-label="Counsel stakes">
								<h3>Choose a consequential counsel</h3>
								<p>
									They may accept, reject, delay, or reinterpret either request.
									Their existing values, visible evidence, and active plan
									decide.
								</p>
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => {
										setActiveIntent("verify-reserve");
										commitSponsor("counsel", "verify-reserve");
									}}
								>
									Verify the evidence first — delays a conclusion
								</button>
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => {
										setActiveIntent("accuse-publicly");
										commitSponsor("counsel", "accuse-publicly");
									}}
								>
									Confront them publicly — risks trust
								</button>
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => {
										commitSponsor("abstain");
									}}
								>
									Abstain
								</button>
							</section>
						) : null}
						{sponsorStatus === "counseled" ? (
							<section aria-label="Decision boundary">
								<p>
									The counsel is recorded. The citizen has not interpreted it
									yet.
								</p>
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => commitSponsor("resolve", activeIntent)}
								>
									Return at the next decision boundary
								</button>
							</section>
						) : null}
						{sponsorStatus === "failed" ? (
							<p role="alert">Sponsorship was not committed.</p>
						) : chronicleTrace !== "" ? (
							<pre role="status">{chronicleTrace}</pre>
						) : null}
						{shareArtifact !== "" ? (
							<section aria-label="Shareable factual replay">
								<h3>Share this factual trace</h3>
								<pre>{shareArtifact}</pre>
								<details>
									<summary>Inspect Chronicle evidence</summary>
									<ol>
										{chronicleBeats.map((beat) => (
											<li
												key={`${beat.relation}:${beat.evidenceEventIds.join(":")}`}
											>
												<p>{beat.text}</p>
												<code>{beat.relation}</code>
												<ul>
													{beat.evidenceEventIds.map((eventId) => (
														<li key={eventId}>
															{worldLink({ kind: "event", eventId }, eventId)}
														</li>
													))}
												</ul>
												{worldLink(
													{ kind: "citizen", citizenId: beat.citizenId },
													"Citizen",
												)}
												{selectedActor === undefined
													? null
													: worldLink(
															{
																kind: "location",
																locationId: selectedActor.placeId,
															},
															"Current site",
														)}
											</li>
										))}
									</ol>
								</details>
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => {
										void navigator.clipboard.writeText(shareArtifact).then(
											() => setCopyStatus("Factual trace copied."),
											() => setCopyStatus("Copy unavailable on this device."),
										);
									}}
								>
									Copy factual trace
								</button>
								{copyStatus === "" ? null : <p role="status">{copyStatus}</p>}
								<button
									type="button"
									disabled={authorityRefreshing}
									onClick={() => {
										setActiveIntent(
											activeIntent === "verify-reserve"
												? "accuse-publicly"
												: "verify-reserve",
										);
										setSponsorStatus("confirming");
									}}
								>
									Consider a different counsel
								</button>
							</section>
						) : null}
					</>
				)}
			</section>
			<ul className="v1-presence-roster" aria-label="Visible residents">
				{model.actors.map((actor) => (
					<li key={actor.citizenId}>
						<button
							type="button"
							data-citizen-id={actor.citizenId}
							aria-pressed={selectedActor?.citizenId === actor.citizenId}
							onClick={() =>
								dispatch({
									type: "select-citizen",
									citizenId: actor.citizenId,
								})
							}
						>
							<strong>{actor.name}</strong>
							<span>{actorActivity(actor, projection)}</span>
						</button>
					</li>
				))}
			</ul>
			<details className="v1-world-tools">
				<summary>Camera, playback, and evidence</summary>
				<GeneratedEmbodimentControls
					model={model}
					navigation={navigation}
					dispatch={dispatch}
					presentationTick={presentationTick}
					presentationPlaying={presentationPlaying}
					reducedMotion={reducedMotion}
					onTogglePresentation={onTogglePresentation}
					onStepPresentation={onStepPresentation}
					onNavigationRejected={onNavigationRejected}
				/>
				{projection.projects.map((project) => (
					<section className="v1-project-card" key={project.projectId}>
						<p className="v1-kicker">SETTLEMENT RECORD</p>
						<h3>{project.name}</h3>
						<p>{project.state}</p>
						<progress
							aria-label={`${project.name} progress`}
							max={10_000}
							value={project.progressBasisPoints}
						>
							{project.progressBasisPoints / 100}%
						</progress>
						<p>{Math.round(project.progressBasisPoints / 100)}% complete</p>
					</section>
				))}
			</details>
		</aside>
	);
}

function GeneratedWorld({
	experience,
	fault,
	onAuthorityRefresh,
}: {
	readonly experience: GeneratedWorldExperience;
	readonly fault: GeneratedWorldFaultSpec | null;
	readonly onAuthorityRefresh: (expectedStateHash?: string) => Promise<void>;
}) {
	const [view, setView] = useState<WorldView>("embodied");
	const [rendererFailed, setRendererFailed] = useState(false);
	const asset = useGeneratedAsset(fault);
	const [reduceMotion, setReduceMotion] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const [presentationTick, setPresentationTick] = useState(0);
	const [presentationPlaying, setPresentationPlaying] = useState(
		() => !reduceMotion,
	);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const [rebuildState, setRebuildState] = useState<
		"idle" | "deleting" | "blocked" | "error"
	>("idle");
	const [navigation, dispatch] = useReducer(
		reduceGeneratedNavigation,
		INITIAL_GENERATED_NAVIGATION,
	);
	const [navigationRejection, setNavigationRejection] = useState<string | null>(
		null,
	);
	const [focusedLocationId, setFocusedLocationId] = useState<string | null>(
		null,
	);
	const reportNavigationRejection = useCallback(
		(reason: "invalid-envelope" | "foreign-reference") => {
			setNavigationRejection(reason);
			browserDiagnostics.record({
				category: "presentation",
				name: "generated-navigation-rejected",
				severity: "warning",
				outcome: "rejected",
				scope: { component: "generated-world-navigation" },
				fields: { reason },
			});
		},
		[],
	);
	const rendererIncidentReported = useRef(false);
	const assetIncidentReported = useRef(false);
	const diagnosticStateRecorded = useRef<string | null>(null);
	const [selectedSettlementId, setSelectedSettlementId] = useState(
		experience.projections[0]?.local.settlement.settlementId ?? "",
	);
	const projection = useMemo(
		() =>
			experience.projections.find(
				(candidate) =>
					candidate.local.settlement.settlementId === selectedSettlementId,
			) ?? experience.projections[0],
		[experience, selectedSettlementId],
	);
	const model = useMemo(
		() =>
			experience.embodiments.find(
				(candidate) => candidate.settlementId === selectedSettlementId,
			) ?? experience.embodiments[0],
		[experience, selectedSettlementId],
	);
	const focusWorldTarget = useCallback(
		(focus: WorldFocus, updateHistory = true) => {
			const href = buildWorldFocusHref(focus)!;
			if (focus.kind === "event") {
				if (!updateHistory) reportNavigationRejection("foreign-reference");
				else {
					setNavigationRejection(null);
					window.history.pushState(null, "", href);
				}
				return;
			}
			const targetId = worldFocusId(focus);
			const matches = experience.embodiments.filter((settlement) => {
				if (focus.kind === "citizen")
					return settlement.actors.some(
						({ citizenId }) => citizenId === targetId,
					);
				if (focus.kind === "object")
					return settlement.projects.some(
						({ projectId }) => projectId === targetId,
					);
				return experience.projections.some(
					(candidate) =>
						candidate.local.settlement.settlementId ===
							settlement.settlementId &&
						candidate.local.sites.some(({ siteId }) => siteId === targetId),
				);
			});
			if (matches.length !== 1) {
				reportNavigationRejection("foreign-reference");
				return;
			}

			setSelectedSettlementId(matches[0]!.settlementId);
			setFocusedLocationId(focus.kind === "location" ? targetId : null);
			setNavigationRejection(null);
			if (focus.kind === "citizen") {
				dispatch({ type: "select-citizen", citizenId: focus.citizenId });
			} else if (focus.kind === "location") {
				dispatch({ type: "overview" });
			} else if (focus.kind === "object") {
				dispatch({ type: "select-project", projectId: focus.objectId });
			}
			if (focus.kind === "location") setView("semantic");
			if (updateHistory) window.history.pushState(null, "", href);
		},
		[experience, reportNavigationRejection],
	);
	useEffect(() => {
		if (window.location.search === "" && window.location.hash === "") return;
		const focus = parseWorldFocusHref(
			`${window.location.pathname}${window.location.search}${window.location.hash}`,
		);
		if (focus === null) {
			reportNavigationRejection("invalid-envelope");
			return;
		}
		focusWorldTarget(focus, false);
		// Initial focus is deliberately admitted once against the mounted authority.
	}, []);

	useEffect(() => {
		if (!presentationPlaying || reduceMotion) return;
		const interval = window.setInterval(
			() => setPresentationTick((tick) => tick + 1),
			125,
		);
		return () => window.clearInterval(interval);
	}, [presentationPlaying, reduceMotion]);

	useEffect(() => {
		if (reduceMotion) setPresentationPlaying(false);
	}, [reduceMotion]);

	useEffect(() => {
		if (projection === undefined) return;
		const source = projection.spatial.source;
		browserDiagnostics.setWorldHead({
			runId: source.runId,
			regionId: source.regionId,
			revision: source.revision,
			sequence: source.throughSequence,
			simulationTime: experience.simulationTime,
			status: "healthy",
		});
		if (diagnosticStateRecorded.current === experience.stateHash) return;
		diagnosticStateRecorded.current = experience.stateHash;
		for (const settlement of experience.projections)
			for (const actor of settlement.spatial.actors)
				browserDiagnostics.record({
					category: "presentation",
					name: "canonical-action-render-linked",
					severity: "info",
					outcome: "observed",
					scope: {
						component: "generated-world",
						runId: settlement.spatial.source.runId,
						regionId: settlement.spatial.source.regionId,
					},
					fields: {
						citizenId: actor.citizenId,
						settlementId: settlement.local.settlement.settlementId,
						actionId: actor.action.actionId,
						actionKind: actor.action.kind,
						actionStatus: actor.action.status,
						actionSource: actor.action.sourceKind,
						eventSequence: actor.action.eventSequence ?? -1,
						prop: actor.prop ?? "none",
					},
				});
	}, [experience, projection]);

	useEffect(() => {
		if (!generatedFaultHooks || fault?.kind !== "navigation") return;
		window.dispatchEvent(
			new CustomEvent("eonfolk:generated-navigation", {
				detail: Object.freeze({
					type: "select-citizen",
					citizenId: 7,
					stateHash: "not-authority",
				}),
			}),
		);
	}, [fault]);

	useEffect(() => {
		if (asset.status !== "failed" || assetIncidentReported.current) return;
		assetIncidentReported.current = true;
		void browserDiagnostics.captureRuntimeFailure({
			code: "GENERATED_ASSET_INTEGRITY_FAILED",
			component: "generated-world-asset",
			protectReality: () => setView("semantic"),
		});
	}, [asset.status]);

	if (projection === undefined || model === undefined)
		return <WorldError error={new Error("No settlement projection exists")} />;
	const openSettlement = (settlementId: string) => {
		setSelectedSettlementId(settlementId);
		dispatch({ type: "overview" });
		setPresentationTick(0);
		setView(rendererFailed ? "semantic" : "embodied");
	};
	const retryRenderer = () => {
		if (generatedFaultHooks && fault?.kind === "renderer-webgl") {
			void generatedWorldFaultModule.then((module) => {
				module?.clearGeneratedWorldFault();
				window.location.reload();
			});
			return;
		}
		window.location.reload();
	};
	const rebuildPersistence = () => {
		setRebuildState("deleting");
		try {
			const request = indexedDB.deleteDatabase(GENERATED_WORLD_STORAGE_KEY);
			request.onsuccess = () => window.location.reload();
			request.onblocked = () => setRebuildState("blocked");
			request.onerror = () => setRebuildState("error");
		} catch {
			setRebuildState("error");
		}
	};
	const reportRendererFailure = () => {
		setRendererFailed(true);
		if (rendererIncidentReported.current) return;
		rendererIncidentReported.current = true;
		void browserDiagnostics.captureRuntimeFailure({
			code: "GENERATED_RENDERER_FAILED",
			component: "generated-world-renderer",
			protectReality: () => setRendererFailed(true),
		});
	};
	const assetVerified = asset.status === "verified";
	const effectiveView = rendererFailed || !assetVerified ? "semantic" : view;
	const embodiedAvailable =
		assetVerified &&
		!rendererFailed &&
		projection.availability.status !== "unavailable";
	const embodiedVisible = effectiveView === "embodied" && embodiedAvailable;
	const togglePresentation = () =>
		setPresentationPlaying((playing) => !playing);
	const stepPresentation = () =>
		setPresentationTick((presentationTick) => presentationTick + 1);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: delegated native links dispatch click for keyboard activation
		<main
			className={`v1-world ${reduceMotion ? "v1-reduced-motion" : ""}`}
			data-world-id={experience.worldId}
			data-world-identity-hash={experience.worldIdentityHash}
			data-state-hash={experience.stateHash}
			data-simulation-time={experience.simulationTime}
			data-projection-status={projection.availability.status}
			data-persistence={experience.persistence.kind}
			data-persistence-claim={experience.persistence.claim}
			data-persistence-failure-code={
				experience.persistence.failureCode ?? undefined
			}
			data-persistence-restored={String(experience.persistence.restored)}
			data-catch-up-receipts={experience.persistence.catchUpReceipts}
			data-previous-state-hash={experience.previousStateHash}
			data-previous-horizon-days={experience.previousHorizonDays}
			data-asset-integrity={asset.status}
			data-presentation-tick={presentationTick}
			data-presentation-playing={String(presentationPlaying)}
			data-navigation-rejection={navigationRejection ?? undefined}
			onClick={(event) => {
				const link = (event.target as Element).closest<HTMLAnchorElement>(
					'a[href^="/world?"]',
				);
				if (link === null) return;
				event.preventDefault();
				const focus = parseWorldFocusHref(link.getAttribute("href") ?? "");
				if (focus === null) reportNavigationRejection("invalid-envelope");
				else focusWorldTarget(focus);
			}}
			{...(generatedFaultHooks
				? {
						"data-fault-kind": fault?.kind,
						"data-fault-disposition": fault?.disposition,
					}
				: {})}
		>
			<header className="v1-world-header">
				<a className="v1-brand" href="/genesis" aria-label="Canonical origin">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">A LIVING SETTLEMENT</p>
					<h1>{projection.local.settlement.name}</h1>
					<p>
						Day {experience.horizonDays} · {projection.spatial.actors.length}{" "}
						visible residents
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="World view">
					<button
						type="button"
						aria-pressed={effectiveView === "embodied"}
						disabled={!assetVerified}
						onClick={() => setView("embodied")}
					>
						Embodied
					</button>
					<button
						type="button"
						aria-pressed={effectiveView === "semantic"}
						onClick={() => setView("semantic")}
					>
						World in words
					</button>
					<button
						type="button"
						aria-pressed={effectiveView === "overview"}
						onClick={() => setView("overview")}
					>
						Settlements
					</button>
					<button
						type="button"
						aria-pressed={reduceMotion}
						onClick={() => setReduceMotion((value) => !value)}
					>
						{reduceMotion ? "Motion reduced" : "Reduce motion"}
					</button>
				</nav>
			</header>

			{!generatedFaultHooks ||
			fault === null ||
			fault.kind === "latency" ||
			(fault.kind === "navigation" && navigationRejection === null) ? null : (
				<p
					className="renderer-note"
					role="status"
					data-testid="generated-world-fault-status"
				>
					{fault.message}
				</p>
			)}
			{experience.persistence.kind === "quarantined" ? (
				<p className="renderer-note" role="status">
					The stored authority was rejected. This separately admitted
					deterministic view does not derive facts from that checkpoint.{" "}
					<button
						type="button"
						onClick={rebuildPersistence}
						disabled={rebuildState === "deleting" || rebuildState === "blocked"}
					>
						{rebuildState === "idle" || rebuildState === "error"
							? "Rebuild local checkpoint"
							: "Rebuilding local checkpoint"}
					</button>
					{rebuildState === "blocked"
						? " Close other EONFOLK tabs; recovery will continue automatically."
						: rebuildState === "error"
							? " Recovery could not start. Retry after checking browser storage access."
							: null}
				</p>
			) : null}
			{experience.persistence.kind === "unavailable" ? (
				<p className="renderer-note" role="status">
					Local persistence unavailable; this deterministic view is read-only.
				</p>
			) : null}

			<nav className="generated-settlement-switcher" aria-label="Settlements">
				{experience.projections.map((candidate) => (
					<button
						key={candidate.local.settlement.settlementId}
						type="button"
						aria-pressed={
							candidate.local.settlement.settlementId ===
							projection.local.settlement.settlementId
						}
						onClick={() =>
							openSettlement(candidate.local.settlement.settlementId)
						}
					>
						{candidate.local.settlement.name}
						<small>
							{candidate.spatial.actors.length} resident
							{candidate.spatial.actors.length === 1 ? "" : "s"}
						</small>
					</button>
				))}
			</nav>

			{effectiveView === "overview" ? (
				<SettlementOverview
					experience={experience}
					selectedSettlementId={projection.local.settlement.settlementId}
					onSettlement={openSettlement}
				/>
			) : null}
			{effectiveView === "semantic" ? (
				<>
					{rendererFailed ? (
						<div className="renderer-note" role="status">
							<button type="button" onClick={retryRenderer}>
								Retry embodied renderer
							</button>
						</div>
					) : asset.status === "checking" ? (
						<p className="renderer-note" role="status">
							Verifying the repository-authored proxy geometry contract.
							Canonical world actions remain inspectable in words.
						</p>
					) : asset.status === "failed" ? (
						<p className="renderer-note" role="status">
							The proxy geometry reference did not pass integrity checks. The
							canonical world remains inspectable without it.
						</p>
					) : null}
					<SemanticSettlement
						projection={projection}
						model={model}
						navigation={navigation}
						dispatch={dispatch}
						presentationTick={presentationTick}
						presentationPlaying={presentationPlaying}
						reducedMotion={reduceMotion}
						onTogglePresentation={togglePresentation}
						onStepPresentation={stepPresentation}
						onNavigationRejected={reportNavigationRejection}
						focusedLocationId={focusedLocationId}
					/>
				</>
			) : null}
			{effectiveView === "embodied" && !embodiedAvailable ? (
				<ProjectionUnavailable projection={projection} />
			) : null}
			{embodiedAvailable ? (
				<section
					className="v1-living-stage"
					aria-label="Embodied settlement"
					aria-hidden={!embodiedVisible}
					style={embodiedVisible ? undefined : { display: "none" }}
				>
					<div className="v1-world-canvas-frame">
						<Suspense
							fallback={
								<section className="v1-living-loading" aria-busy="true">
									<p>Opening canonical local space…</p>
								</section>
							}
						>
							<GeneratedWorldCanvas
								projection={projection}
								model={model}
								navigation={navigation}
								presentationTick={presentationTick}
								reducedMotion={reduceMotion}
								onFailure={reportRendererFailure}
							/>
						</Suspense>
						<div className="v1-world-vignette" aria-hidden="true" />
						<GeneratedSceneTruth projection={projection} model={model} />
					</div>
					<GeneratedContextPanel
						projection={projection}
						model={model}
						navigation={navigation}
						dispatch={dispatch}
						presentationTick={presentationTick}
						presentationPlaying={presentationPlaying}
						reducedMotion={reduceMotion}
						onTogglePresentation={togglePresentation}
						onStepPresentation={stepPresentation}
						onNavigationRejected={reportNavigationRejection}
						authorityRegionId={experience.authorityRegionId}
						authorityDatabaseName={experience.authorityDatabaseName}
						sponsorCitizenId={experience.sponsorCitizenId}
						sponsorPhase={experience.sponsorPhase}
						activeCounselIntent={experience.activeCounselIntent}
						persistenceAvailable={experience.persistence.kind === "indexeddb"}
						onAuthorityCommitted={onAuthorityRefresh}
					/>
				</section>
			) : null}
			<details
				className="v1-feedback-drawer"
				onToggle={(event) => setFeedbackOpen(event.currentTarget.open)}
			>
				<summary>Release Genesis feedback</summary>
				{feedbackOpen ? <FeedbackPanel /> : null}
			</details>
			<footer className="v1-world-footer">
				<p>Watch first. Select a person or place to learn more.</p>
				<nav aria-label="Evidence and development">
					<a href="/research">Research evidence</a>
					<a href="/developer">Developer surface</a>
				</nav>
			</footer>
		</main>
	);
}

export function V1GenesisApp() {
	const fault = useGeneratedFault();
	useEffect(() => {
		if (!generatedFaultHooks || fault?.kind !== "renderer-webgl") return;
		let active = true;
		let cleanup: (() => void) | undefined;
		void generatedWorldFaultModule.then((module) => {
			if (active && module !== null)
				cleanup = module.injectGeneratedRendererContextLoss();
		});
		return () => {
			active = false;
			cleanup?.();
		};
	}, [fault]);
	useEffect(() => {
		void loadGeneratedWorldCanvasModule();
	}, []);
	useEffect(() => {
		document.title = "EONFOLK — Canonical generated world";
	}, []);
	const { experience, error, refresh } = useGeneratedExperience(fault);
	if (error !== null) return <WorldError error={error} fault={fault} />;
	if (fault === undefined || experience === null) return <WorldLoading />;
	return (
		<GeneratedWorld
			experience={experience}
			fault={fault}
			onAuthorityRefresh={refresh}
		/>
	);
}
