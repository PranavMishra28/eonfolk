import {
	countNoun,
	type GeneratedCivilizationSpatialProjection,
	playerFacingCopy,
} from "@eonfolk/world-presentation";
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
import { GeneratedEmbodimentControls } from "./components/generated/GeneratedEmbodimentControls";
import { browserDiagnostics } from "./diagnostics";
import {
	conversationVisuallyActive,
	type GeneratedEmbodiedActor,
	type GeneratedEmbodimentProjection,
	type GeneratedNavigationAction,
	type GeneratedNavigationState,
	INITIAL_GENERATED_NAVIGATION,
	presentedActorCopy,
	reduceGeneratedNavigation,
	verifyGeneratedFolkAsset,
} from "./generated-presentation";
import {
	type GeneratedBranchNextAction,
	type GeneratedChronicleEventContext,
	type GeneratedCounselContext,
	isSponsorContextMismatch,
} from "./generated-sponsor-runtime";
import {
	advanceGeneratedWorldLiveDay,
	catchUpGeneratedWorldReturnDays,
	GENERATED_WORLD_STORAGE_KEY,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-client";
import type { GeneratedWorldFaultSpec } from "./generated-world-faults";
import type {
	GeneratedChronicleRelation,
	GeneratedCitizenInnerLife,
	GeneratedWorldExperience,
	GeneratedWorldHappening,
} from "./generated-world-runtime";
import {
	authorityDayIntervalMs,
	clearPendingReturnCatchUp,
	dayAdvanceDue,
	FASTER_DAY_INTERVAL_MS,
	PLAY_DAY_INTERVAL_MS,
	type PlayRate,
	presentationIntervalMs,
	proposedReturnCatchUpDays,
	readLastActiveWallMs,
	readPendingReturnCatchUp,
	returnCatchUpOperationId,
	visualDayProgress01,
	writeLastActiveWallMs,
	writePendingReturnCatchUp,
} from "./play-clock";
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

const CHRONICLE_RELATION_LABEL: Readonly<
	Record<GeneratedChronicleRelation, string>
> = Object.freeze({
	fact: "Recorded",
	direct: "Direct cause",
	trigger: "Trigger",
	"contributing-condition": "Contributing",
	"temporal-predecessor": "Earlier",
	allegation: "Allegation",
});

function loadGeneratedWorldCanvasModule() {
	generatedWorldCanvasModule ??= import("./generated-world-canvas");
	return generatedWorldCanvasModule;
}

const GeneratedWorldCanvas = lazy(async () => {
	const module = await loadGeneratedWorldCanvasModule();
	return { default: module.GeneratedWorldCanvas };
});

const FeedbackPanel = lazy(async () => {
	const module = await import("./components/FeedbackPanel");
	return { default: module.FeedbackPanel };
});

type WorldView = "embodied" | "semantic" | "overview";

type GeneratedAssetState = "checking" | "verified" | "failed";

const readableId = (value: string) => value.replace(/[-_:]+/gu, " ");
const REDUCED_MOTION_STORAGE_KEY = "eonfolk:presentation:reduced-motion:v1";

function initialReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const stored = window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY);
		if (stored === "true") return true;
		if (stored === "false") return false;
	} catch {
		// Storage denial must not block the system accessibility preference.
	}
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useGeneratedFault(): GeneratedWorldFaultSpec | null | undefined {
	const [fault, setFault] = useState<
		GeneratedWorldFaultSpec | null | undefined
	>(generatedFaultHooks ? undefined : null);
	useEffect(() => {
		if (!generatedFaultHooks) return;
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
	readonly advanceDay: () => Promise<void>;
	readonly catchUpDays: (input: {
		readonly operationId: string;
		readonly additionalDays: number;
	}) => Promise<void>;
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
						return loadGeneratedWorldExperience(
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
	const advanceDay = useCallback(async () => {
		setExperience(await advanceGeneratedWorldLiveDay());
	}, []);
	const catchUpDays = useCallback(
		async (input: {
			readonly operationId: string;
			readonly additionalDays: number;
		}) => {
			setExperience(await catchUpGeneratedWorldReturnDays(input));
		},
		[],
	);
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
		advanceDay,
		catchUpDays,
	};
}

function useGeneratedAsset(
	fault: GeneratedWorldFaultSpec | null,
): GeneratedAssetState {
	const [state, setState] = useState<GeneratedAssetState>(() => "checking");
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
			() => active && setState("verified"),
			() => active && setState("failed"),
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
			<p className="v1-kicker">OPENING DAWNMERE</p>
			<h1>Opening Dawnmere…</h1>
		</main>
	);
}

function WorldAuthorityShell() {
	return (
		<main
			className="v1-world"
			data-world-id="eonfolk-genesis-world-v1"
			data-authority-pending="true"
			aria-busy="true"
		>
			<header className="v1-world-header">
				<a className="v1-brand" href="/" aria-label="Eonfolk home">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">A LIVING SETTLEMENT</p>
					<h1>Opening Dawnmere</h1>
					<p>People are already at work.</p>
				</div>
				<nav className="v1-view-controls" aria-label="Time">
					<button type="button" disabled>
						Pause
					</button>
					<button type="button" disabled>
						Play
					</button>
					<button type="button" disabled>
						Faster
					</button>
				</nav>
			</header>
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
				<code>{boundaryFault?.code ?? "LOCAL_RUNTIME_FAILURE"}</code>
			</details>
			{!generatedFaultHooks || boundaryFault === null ? null : (
				<button className="v1-text-link" type="button" onClick={retry}>
					Retry without the failed local input
				</button>
			)}
			<a className="v1-text-link" href="/">
				Try Dawnmere again
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
			<p className="v1-kicker">WATCH VIEW UNAVAILABLE</p>
			<h2>No activity is being inferred for this settlement.</h2>
			<p>
				This view stopped because{" "}
				{projection.availability.reasons.map(readableId).join(" and ")}. The
				places remain inspectable in words.
			</p>
		</section>
	);
}

function SemanticSettlement({
	projection,
	model,
	navigation,
	dispatch,
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
	onNavigationRejected,
	focusedLocationId,
	visualProgress01,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
	readonly onNavigationRejected: (
		reason: "invalid-envelope" | "foreign-reference",
	) => void;
	readonly focusedLocationId: string | null;
	readonly visualProgress01: number;
}) {
	return (
		<section
			className="generated-semantic"
			data-testid="generated-semantic-world"
		>
			<div>
				<p className="v1-kicker">IN WORDS</p>
				<h2>{projection.local.settlement.name}</h2>
				<p>
					{projection.local.semanticCounts.sites} places,{" "}
					{projection.local.semanticCounts.routes} paths, and{" "}
					{countNoun(projection.spatial.actors.length, "person", "people")} at
					work.
				</p>
			</div>
			<GeneratedEmbodimentControls
				projection={projection}
				model={model}
				navigation={navigation}
				dispatch={dispatch}
				presentationPlaying={presentationPlaying}
				reducedMotion={reducedMotion}
				onTogglePresentation={onTogglePresentation}
				onStepPresentation={onStepPresentation}
				onNavigationRejected={onNavigationRejected}
				showLookAround={false}
				visualProgress01={visualProgress01}
			/>
			<section aria-labelledby="semantic-places-title">
				<h3 id="semantic-places-title">Places</h3>
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
				<p className="v1-kicker">THE LAND</p>
				<h2>
					{experience.projections[0]?.local.settlement.name ?? "Dawnmere"}
				</h2>
				<p>
					{countNoun(
						experience.settlementCount,
						"inhabited place continues",
						"inhabited places continue",
					)}{" "}
					whether you are watching or not.
				</p>
			</header>
			<div className="generated-settlement-cards">
				{experience.projections.map((projection) => (
					<article key={projection.local.settlement.settlementId}>
						<p className="v1-kicker">
							{projection.local.settlement.foundedAtSimulationTime === 0
								? "ORIGIN"
								: "SECOND FOUNDING"}
						</p>
						<h3>{projection.local.settlement.name}</h3>
						<p>{projection.local.settlement.semanticLabel}</p>
						<ul>
							{projection.local.sites.slice(0, 6).map((site) => (
								<li key={site.siteId}>{site.name}</li>
							))}
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

function actorActivity(
	actor: GeneratedEmbodiedActor,
	projection: GeneratedCivilizationSpatialProjection,
	progress01 = 0.55,
): string {
	return presentedActorCopy(actor, projection, progress01);
}

function GeneratedSceneTruth({
	projection,
	model,
	selectedCitizenId,
	visualProgress01,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly selectedCitizenId: string | null;
	readonly visualProgress01: number;
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
					{participants.map((actor, index) => (
						<span key={actor.citizenId}>
							{index === 0 ? null : " + "}
							<button
								type="button"
								aria-pressed={selectedCitizenId === actor.citizenId}
								onClick={() =>
									window.dispatchEvent(
										new CustomEvent("eonfolk:generated-navigation", {
											detail: Object.freeze({
												type: "select-citizen",
												citizenId: actor.citizenId,
											}),
										}),
									)
								}
							>
								{actor.name}
							</button>
						</span>
					))}
					<small>
						{participants.every((actor) =>
							conversationVisuallyActive(actor, visualProgress01),
						)
							? "In"
							: "Completed"}{" "}
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
						<button
							type="button"
							aria-pressed={selectedCitizenId === actor.citizenId}
							onClick={() =>
								window.dispatchEvent(
									new CustomEvent("eonfolk:generated-navigation", {
										detail: Object.freeze({
											type: "select-citizen",
											citizenId: actor.citizenId,
										}),
									}),
								)
							}
						>
							<strong>{actor.name.split(" ")[0]}</strong>
							<span>
								{
									actorActivity(actor, projection, visualProgress01).split(
										" at ",
									)[0]
								}
							</span>
						</button>
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
	presentationPlaying,
	reducedMotion,
	onTogglePresentation,
	onStepPresentation,
	onNavigationRejected,
	authorityRegionId,
	authorityDatabaseName,
	authorityStateHash,
	sponsorCitizenId,
	sponsorPhase,
	activeCounselIntent,
	persistenceAvailable,
	onAuthorityCommitted,
	happenings,
	innerLives,
	onCounselConsiderationChange,
	visualProgress01,
	onChronicleAvailable,
}: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly model: GeneratedEmbodimentProjection;
	readonly navigation: GeneratedNavigationState;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly presentationPlaying: boolean;
	readonly reducedMotion: boolean;
	readonly onTogglePresentation: () => void;
	readonly onStepPresentation: () => void;
	readonly onNavigationRejected: (
		reason: "invalid-envelope" | "foreign-reference",
	) => void;
	readonly authorityRegionId: string;
	readonly authorityDatabaseName: string;
	readonly authorityStateHash: string;
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
	readonly happenings: readonly GeneratedWorldHappening[];
	readonly innerLives: readonly GeneratedCitizenInnerLife[];
	readonly onCounselConsiderationChange: (open: boolean) => void;
	readonly visualProgress01: number;
	readonly onChronicleAvailable?: () => void;
}) {
	const [sponsorStatus, setSponsorStatus] = useState("idle");
	const [chronicleTrace, setChronicleTrace] = useState("");
	const [shareArtifact, setShareArtifact] = useState("");
	const [chronicleBeats, setChronicleBeats] = useState<
		readonly {
			readonly text: string;
			readonly relation: string;
			readonly evidenceEventIds: readonly string[];
			readonly context: GeneratedChronicleEventContext | null;
		}[]
	>([]);
	const [counselContext, setCounselContext] =
		useState<GeneratedCounselContext | null>(null);
	const [nextAction, setNextAction] =
		useState<GeneratedBranchNextAction | null>(null);
	const [expectedAuthorityStateHash, setExpectedAuthorityStateHash] = useState<
		string | null
	>(authorityStateHash);
	const [journeyStage, setJourneyStage] = useState<
		"present" | "left" | "returned" | "advanced"
	>("present");
	const [activeIntent, setActiveIntent] = useState<
		"verify-reserve" | "accuse-publicly"
	>("verify-reserve");
	const [copyStatus, setCopyStatus] = useState("");
	const [authorityRefreshing, setAuthorityRefreshing] = useState(false);
	const counselRegionRef = useRef<HTMLElement>(null);
	const authorityStateHashRef = useRef(authorityStateHash);
	authorityStateHashRef.current = authorityStateHash;
	useEffect(() => {
		onCounselConsiderationChange(
			sponsorStatus === "confirming" ||
				sponsorStatus === "counseling" ||
				sponsorStatus === "saving" ||
				sponsorStatus === "returning",
		);
	}, [onCounselConsiderationChange, sponsorStatus]);
	useEffect(() => {
		if (
			sponsorStatus !== "confirming" &&
			sponsorStatus !== "counseled" &&
			sponsorStatus !== "abstained"
		)
			return;
		counselRegionRef.current?.focus();
	}, [sponsorStatus]);
	useEffect(() => {
		if (chronicleBeats.length === 0) return;
		onChronicleAvailable?.();
	}, [chronicleBeats, onChronicleAvailable]);
	useEffect(() => {
		if (
			sponsorStatus === "confirming" ||
			sponsorStatus === "saving" ||
			sponsorStatus === "counseling" ||
			sponsorStatus === "returning"
		)
			return;
		setExpectedAuthorityStateHash(authorityStateHash);
	}, [authorityStateHash, sponsorStatus]);
	const selectedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const selectedActor =
		selectedCitizenId === null
			? undefined
			: model.actors.find(({ citizenId }) => citizenId === selectedCitizenId);
	const selectedBuildingId =
		navigation.focus.kind === "building" ? navigation.focus.buildingId : null;
	const selectedBuilding =
		selectedBuildingId !== null
			? projection.local.buildings.find(
					({ buildingId }) => buildingId === selectedBuildingId,
				)
			: undefined;
	const selectedProjectId =
		navigation.focus.kind === "project" ? navigation.focus.projectId : null;
	const selectedProject =
		selectedProjectId !== null
			? model.projects.find(({ projectId }) => projectId === selectedProjectId)
			: undefined;
	const selectedObjectSite =
		selectedBuilding === undefined && selectedProject === undefined
			? undefined
			: projection.local.sites.find(
					({ siteId }) =>
						siteId === (selectedBuilding?.siteId ?? selectedProject?.siteId),
				);
	const selectedObject =
		selectedBuilding !== undefined
			? {
					kind: "building",
					id: selectedBuilding.buildingId,
					name: selectedBuilding.semanticLabel,
					status: `In ${Math.round(selectedBuilding.conditionBasisPoints / 100)}% condition · holds ${String(selectedBuilding.capacity)}.`,
				}
			: selectedProject === undefined
				? undefined
				: {
						kind: "project",
						id: selectedProject.projectId,
						name: selectedProject.name,
						status: selectedProject.semanticLabel,
					};
	const canSponsor = selectedActor?.citizenId === sponsorCitizenId;
	const selectedInnerLife =
		selectedActor === undefined
			? undefined
			: innerLives.find((life) => life.citizenId === selectedActor.citizenId);
	const worldLink = (focus: WorldFocus, label: string) => {
		const href = buildWorldFocusHref(focus);
		return href === null ? null : (
			<a className="v1-world-focus-link" href={href}>
				{label}
			</a>
		);
	};
	useEffect(() => {
		setSponsorStatus("idle");
		setChronicleTrace("");
		setShareArtifact("");
		setChronicleBeats([]);
		setCounselContext(null);
		setNextAction(null);
		setExpectedAuthorityStateHash(authorityStateHashRef.current);
		setJourneyStage("present");
		setCopyStatus("");
		setAuthorityRefreshing(false);
	}, [selectedCitizenId]);
	useEffect(() => {
		if (selectedCitizenId !== sponsorCitizenId) return;
		setSponsorStatus((current) =>
			current === "confirming" ||
			current === "saving" ||
			current === "counseling" ||
			current === "returning"
				? current
				: sponsorPhase,
		);
		setActiveIntent(activeCounselIntent ?? "verify-reserve");
	}, [activeCounselIntent, selectedCitizenId, sponsorCitizenId, sponsorPhase]);
	const commitSponsor = (
		step:
			| "establish"
			| "abstain"
			| "advance-abstention"
			| "counsel"
			| "resolve",
		intent = activeIntent,
		openCounsel = false,
	) => {
		if (selectedActor === undefined) return;
		setSponsorStatus(
			step === "establish"
				? "saving"
				: step === "counsel"
					? "counseling"
					: "returning",
		);
		void import("./generated-sponsor-runtime").then(
			({ playerFacingSponsorFailure, sponsorGeneratedCitizen }) =>
				sponsorGeneratedCitizen({
					citizenId: selectedActor.citizenId,
					regionId: authorityRegionId,
					databaseName: authorityDatabaseName,
					step,
					intent,
					...(expectedAuthorityStateHash === null
						? {}
						: { expectedAuthorityStateHash }),
				}).then(
					async (result) => {
						setChronicleTrace(result.chronicleTrace);
						setShareArtifact(result.shareArtifact ?? "");
						setChronicleBeats(result.chronicleBeats);
						setCounselContext(result.counselContext);
						setNextAction(result.nextAction);
						setExpectedAuthorityStateHash(result.authorityStateHash);
						setSponsorStatus(
							openCounsel && result.phase === "sponsored"
								? "confirming"
								: result.phase,
						);
						setActiveIntent(result.activeIntent ?? intent);
						if (result.consequenceRecorded) setJourneyStage("advanced");
						if (!result.idempotent || step === "resolve") {
							setAuthorityRefreshing(true);
							try {
								await onAuthorityCommitted(result.authorityStateHash);
							} finally {
								setAuthorityRefreshing(false);
							}
						}
					},
					(reason: unknown) => {
						setAuthorityRefreshing(false);
						const mismatch = isSponsorContextMismatch(reason);
						setChronicleTrace(playerFacingSponsorFailure(reason));
						if (mismatch) {
							setAuthorityRefreshing(true);
							void onAuthorityCommitted().then(() => {
								setExpectedAuthorityStateHash(authorityStateHashRef.current);
								setAuthorityRefreshing(false);
							});
							return;
						}
						if (step !== "establish") {
							setChronicleBeats([]);
							setShareArtifact("");
						}
						setSponsorStatus(step === "establish" ? "failed" : sponsorPhase);
					},
				),
		);
	};
	const activityCounts = new Map<string, number>();
	for (const actor of model.actors) {
		const activity = actorActivity(actor, projection, visualProgress01).split(
			" at ",
		)[0]!;
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
	const talkingNow =
		interactionParticipants.length >= 2 &&
		interactionParticipants.every((actor) =>
			conversationVisuallyActive(actor, visualProgress01),
		);
	const interactionPhrase = talkingNow
		? activeInteraction?.kind === "conversation"
			? "are talking"
			: "are making an exchange"
		: activeInteraction?.kind === "conversation"
			? "finished talking"
			: "completed an exchange";
	return (
		<aside
			className="v1-context-panel"
			aria-label="People and counsel"
			data-focus-kind={navigation.focus.kind}
		>
			<section className="v1-presence-card">
				<p className="v1-kicker">
					{selectedActor !== undefined
						? "PERSON IN FOCUS"
						: selectedObject !== undefined
							? `${selectedObject.kind.toUpperCase()} IN FOCUS`
							: "HAPPENING NOW"}
				</p>
				<h2>
					{selectedActor?.name ??
						selectedObject?.name ??
						projection.local.settlement.name}
				</h2>
				{selectedObject !== undefined ? (
					<>
						<p>
							<strong>Place:</strong>{" "}
							{selectedObjectSite?.name ?? "this settlement"}.
						</p>
						<p>{selectedObject.status}</p>
						<div className="v1-focus-actions">
							<button
								type="button"
								onClick={() => dispatch({ type: "overview" })}
							>
								Back to settlement
							</button>
							{worldLink(
								{ kind: "object", objectId: selectedObject.id },
								`Link to this ${selectedObject.kind}`,
							)}
						</div>
					</>
				) : selectedActor === undefined ? (
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
							{countNoun(
								model.actors.length,
								"life is unfolding",
								"lives are unfolding",
							)}{" "}
							at once. Select someone to move from the settlement view into
							their immediate work.
						</p>
						<ul className="v1-activity-summary" aria-label="Visible activities">
							{[...activityCounts].slice(0, 3).map(([activity, count]) => (
								<li key={activity}>
									<strong>{count}</strong> {activity}
								</li>
							))}
						</ul>
					</>
				) : (
					<>
						<p className="v1-context-role">{selectedActor.role}</p>
						<p>{actorActivity(selectedActor, projection, visualProgress01)}.</p>
						<p>
							<strong>Want:</strong>{" "}
							{playerFacingCopy(
								selectedInnerLife?.want ??
									happenings.find(
										(happening) =>
											happening.citizenId === selectedActor.citizenId,
									)?.summary ??
									"A standing plan for today's work.",
							)}
						</p>
						{selectedInnerLife?.waterStores !== undefined &&
						selectedInnerLife.waterStores !== null ? (
							<p>
								<strong>Water stores:</strong> {selectedInnerLife.waterStores}
							</p>
						) : null}
						<p>
							<strong>Day's work:</strong>{" "}
							{playerFacingCopy(
								selectedInnerLife?.daysWork ??
									actorActivity(selectedActor, projection, visualProgress01),
							)}
						</p>
						<p>
							<strong>Standing ties:</strong>{" "}
							{selectedInnerLife !== undefined &&
							selectedInnerLife.standingTies.length > 0
								? selectedInnerLife.standingTies.join("; ")
								: "No standing relationship is recorded."}
						</p>
						<p>
							<strong>Immediate company:</strong>{" "}
							{activeInteraction !== undefined &&
							interactionParticipants.some(
								(actor) => actor.citizenId === selectedActor.citizenId,
							) &&
							interactionParticipants.length >= 2
								? `They are ${interactionPhrase} with ${interactionParticipants
										.filter(
											(actor) => actor.citizenId !== selectedActor.citizenId,
										)
										.map(({ name }) => name)
										.join(
											" and ",
										)}${interactionPlace === undefined ? "" : ` at ${interactionPlace}`}.`
								: "No one is currently beside them."}
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
							{canSponsor &&
							sponsorStatus !== "counseled" &&
							sponsorStatus !== "confirming" ? (
								<button
									type="button"
									className={
										authorityRefreshing || sponsorStatus === "saving"
											? "v1-commit-busy"
											: undefined
									}
									aria-busy={
										authorityRefreshing ||
										sponsorStatus === "saving" ||
										sponsorStatus === "counseling" ||
										sponsorStatus === "returning"
									}
									disabled={
										!persistenceAvailable ||
										authorityRefreshing ||
										sponsorStatus === "saving" ||
										sponsorStatus === "counseling" ||
										sponsorStatus === "returning"
									}
									onClick={() => {
										if (
											sponsorStatus === "resolved" ||
											sponsorStatus === "abstained"
										)
											commitSponsor("establish");
										else if (sponsorStatus === "sponsored")
											counselContext === null
												? commitSponsor("establish", activeIntent, true)
												: setSponsorStatus("confirming");
										else commitSponsor("establish", activeIntent, true);
									}}
								>
									{sponsorStatus === "saving"
										? "Establishing…"
										: sponsorStatus === "counseling"
											? "Considering…"
											: sponsorStatus === "sponsored"
												? "Consider an intervention"
												: sponsorStatus === "abstained"
													? "Review abstention Chronicle"
													: sponsorStatus === "resolved"
														? "Review Chronicle"
														: sponsorStatus === "returning"
															? "Saving…"
															: "Sponsor Mara"}
								</button>
							) : null}
						</div>
						{sponsorStatus === "confirming" ? (
							<section
								ref={counselRegionRef}
								tabIndex={-1}
								aria-label="Counsel stakes"
								aria-live="assertive"
							>
								<h3>Choose at Mara's first boundary</h3>
								<p>
									Mara may accept, reject, delay, or reinterpret advice. This
									boundary closes after one choice.
								</p>
								<button
									type="button"
									className={authorityRefreshing ? "v1-commit-busy" : undefined}
									aria-busy={authorityRefreshing}
									disabled={authorityRefreshing}
									onClick={() => {
										setActiveIntent("verify-reserve");
										commitSponsor("counsel", "verify-reserve");
									}}
								>
									Check the stores first
								</button>
								{counselContext === null ? null : (
									<p>{counselContext.verifyStake}</p>
								)}
								{counselContext === null ||
								!counselContext.hasAllegation ? null : (
									<>
										<button
											type="button"
											className={
												authorityRefreshing ? "v1-commit-busy" : undefined
											}
											aria-busy={authorityRefreshing}
											disabled={authorityRefreshing}
											onClick={() => {
												setActiveIntent("accuse-publicly");
												commitSponsor("counsel", "accuse-publicly");
											}}
										>
											Raise this with Iven
										</button>
										<p>{counselContext.accuseStake}</p>
									</>
								)}
								<button
									type="button"
									className={authorityRefreshing ? "v1-commit-busy" : undefined}
									aria-busy={authorityRefreshing}
									disabled={authorityRefreshing}
									onClick={() => {
										commitSponsor("abstain");
									}}
								>
									Abstain — close this boundary without counsel
								</button>
								{counselContext === null ? null : (
									<p>{counselContext.abstainStake}</p>
								)}
								<button
									type="button"
									onClick={() => setSponsorStatus("sponsored")}
								>
									Keep watching
								</button>
								<p>
									Paused while you consider advice. Time resumes after you
									choose or dismiss.
								</p>
							</section>
						) : null}
						{sponsorStatus === "counseled" ||
						(sponsorStatus === "abstained" && journeyStage !== "advanced") ? (
							<section
								ref={counselRegionRef}
								tabIndex={-1}
								aria-label="See Mara's next step"
								aria-live="assertive"
							>
								<p>
									{sponsorStatus === "counseled"
										? "The advice is recorded. Mara has not interpreted it yet."
										: "No advice was given. This first boundary is durably closed and cannot accept counsel later."}
								</p>
								<button
									type="button"
									className={authorityRefreshing ? "v1-commit-busy" : undefined}
									aria-busy={authorityRefreshing}
									disabled={authorityRefreshing}
									onClick={() => {
										if (sponsorStatus === "counseled")
											commitSponsor("resolve", activeIntent);
										else commitSponsor("advance-abstention");
									}}
								>
									{sponsorStatus === "counseled"
										? "See Mara's decision"
										: "See what she did on her own"}
								</button>
							</section>
						) : null}
						{sponsorStatus === "failed" ? (
							<p role="alert">Sponsorship was not committed.</p>
						) : chronicleTrace !== "" && chronicleBeats.length === 0 ? (
							<p role="status">{chronicleTrace}</p>
						) : null}
						{shareArtifact !== "" &&
						(sponsorStatus === "resolved" || journeyStage === "advanced") ? (
							<section aria-label="Shareable factual replay">
								<h3>What happened</h3>
								<ol aria-label="Chronicle beats">
									{chronicleBeats.map((beat) => (
										<li
											key={`${beat.relation}:${beat.evidenceEventIds[0] ?? beat.text}`}
										>
											<p>{beat.text}</p>
											{beat.context === null ? null : (
												<p>
													{beat.context.citizenName}
													{beat.context.locationName === null
														? ""
														: ` · ${beat.context.locationName}`}
													{beat.context.objectName === null
														? ""
														: ` · ${beat.context.objectName}`}
												</p>
											)}
										</li>
									))}
								</ol>
								<details>
									<summary>Exact event evidence</summary>
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
															<code>{eventId}</code>{" "}
															{worldLink(
																{ kind: "event", eventId },
																"Open event in world",
															)}
														</li>
													))}
												</ul>
												{worldLink(
													{
														kind: "citizen",
														citizenId:
															beat.context?.citizenId ?? sponsorCitizenId,
													},
													beat.context?.citizenName ?? "Citizen",
												)}
												{beat.context?.locationId === null ||
												beat.context?.locationId === undefined
													? null
													: worldLink(
															{
																kind: "location",
																locationId: beat.context.locationId,
															},
															beat.context.locationName ?? "Event location",
														)}
												{beat.context?.objectId === null ||
												beat.context?.objectId === undefined
													? null
													: worldLink(
															{
																kind: "object",
																objectId: beat.context.objectId,
															},
															beat.context.objectName ?? "Event object",
														)}
											</li>
										))}
									</ol>
								</details>
								<details>
									<summary>Copyable story card</summary>
									<pre>{shareArtifact}</pre>
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
								{nextAction === null
									? null
									: worldLink(
											nextAction.focus,
											`${nextAction.label} — ${nextAction.description}`,
										)}
							</section>
						) : null}
					</>
				)}
			</section>
			<ul className="v1-presence-roster" aria-label="People here">
				{model.actors.map((actor) => (
					<li key={actor.citizenId}>
						<button
							type="button"
							data-citizen-id={actor.citizenId}
							data-sponsored={
								actor.citizenId === sponsorCitizenId && sponsorPhase !== "idle"
									? "true"
									: undefined
							}
							aria-pressed={selectedActor?.citizenId === actor.citizenId}
							onClick={() =>
								dispatch({
									type: "select-citizen",
									citizenId: actor.citizenId,
								})
							}
						>
							<strong>
								{actor.name}
								{actor.citizenId === sponsorCitizenId && sponsorPhase !== "idle"
									? " · sponsored"
									: ""}
							</strong>
							<span
								data-presented-activity={actorActivity(
									actor,
									projection,
									visualProgress01,
								)}
							>
								{actorActivity(actor, projection, visualProgress01)}
							</span>
						</button>
					</li>
				))}
			</ul>
			<details className="v1-world-tools">
				<summary>Camera, playback, and evidence</summary>
				<GeneratedEmbodimentControls
					projection={projection}
					model={model}
					navigation={navigation}
					dispatch={dispatch}
					presentationPlaying={presentationPlaying}
					reducedMotion={reducedMotion}
					onTogglePresentation={onTogglePresentation}
					onStepPresentation={onStepPresentation}
					onNavigationRejected={onNavigationRejected}
					visualProgress01={visualProgress01}
				/>
			</details>
		</aside>
	);
}

function GeneratedWorld({
	experience,
	fault,
	onAuthorityRefresh,
	onAdvanceDay,
	onCatchUpDays,
}: {
	readonly experience: GeneratedWorldExperience;
	readonly fault: GeneratedWorldFaultSpec | null;
	readonly onAuthorityRefresh: (expectedStateHash?: string) => Promise<void>;
	readonly onAdvanceDay: () => Promise<void>;
	readonly onCatchUpDays: (input: {
		readonly operationId: string;
		readonly additionalDays: number;
	}) => Promise<void>;
}) {
	const [view, setView] = useState<WorldView>("embodied");
	const [rendererFailed, setRendererFailed] = useState(false);
	const asset = useGeneratedAsset(fault);
	const [reduceMotion, setReduceMotion] = useState(initialReducedMotion);
	const [playRate, setPlayRate] = useState<PlayRate>(1);
	const [consideringCounsel, setConsideringCounsel] = useState(false);
	const resumePlayRate = useRef<PlayRate>(1);
	const pausedForCounsel = useRef(false);
	const [presentationTick, setPresentationTick] = useState(0);
	const presentationPlaying = playRate !== 0;
	const visualDayClock = useRef({
		hash: "",
		startedAt: 0,
		held: 0,
	});
	const advancingDay = useRef(false);
	const catchingUp = useRef(false);
	const dayAnchor = useRef({
		day: experience.horizonDays,
		displayedAt: performance.now(),
	});
	const experienceRef = useRef(experience);
	experienceRef.current = experience;
	const [catchUpProposal, setCatchUpProposal] = useState(0);
	const [, setVisualCopyBeat] = useState(0);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const [inspectorSheetOpen, setInspectorSheetOpen] = useState(
		() =>
			typeof window === "undefined" ||
			window.matchMedia("(min-width: 721px)").matches,
	);
	const [chronicleSheetOpen, setChronicleSheetOpen] = useState(false);
	const openChronicleRecord = useCallback(() => {
		setChronicleSheetOpen(true);
		if (window.matchMedia("(max-width: 720px)").matches)
			setInspectorSheetOpen(false);
	}, []);
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
	const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
	const [focusedEventContext, setFocusedEventContext] =
		useState<GeneratedChronicleEventContext | null>(null);
	const eventFocusRequest = useRef<string | null>(null);
	const initialLocationFocusApplied = useRef(false);
	const navigationOutcomeReported = useRef(false);
	const [focusedLocationId, setFocusedLocationId] = useState<string | null>(
		null,
	);
	const reportNavigationRejection = useCallback(
		(reason: "invalid-envelope" | "foreign-reference") => {
			setNavigationRejection(reason);
			if (
				generatedFaultHooks &&
				fault?.kind === "navigation" &&
				!navigationOutcomeReported.current
			) {
				navigationOutcomeReported.current = true;
				void generatedWorldFaultModule.then((module) =>
					module?.recordGeneratedWorldFaultOutcome("navigation"),
				);
			}
			browserDiagnostics.record({
				category: "presentation",
				name: "generated-navigation-rejected",
				severity: "warning",
				outcome: "rejected",
				scope: { component: "generated-world-navigation" },
				fields: { reason },
			});
		},
		[fault],
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
			const currentExperience = experienceRef.current;
			const href = buildWorldFocusHref(focus)!;
			if (focus.kind === "event") {
				eventFocusRequest.current = focus.eventId;
				setFocusedEventId(focus.eventId);
				setFocusedEventContext(null);
				setNavigationRejection(null);
				if (updateHistory) window.history.pushState(null, "", href);
				void import("./generated-sponsor-runtime")
					.then(({ loadGeneratedChronicleEventFocus }) =>
						loadGeneratedChronicleEventFocus({
							eventId: focus.eventId,
							regionId: currentExperience.authorityRegionId,
							databaseName: currentExperience.authorityDatabaseName,
						}),
					)
					.then((context) => {
						if (eventFocusRequest.current !== focus.eventId) return;
						if (context === null) {
							setFocusedEventId(null);
							reportNavigationRejection("foreign-reference");
							return;
						}
						const settlement = experienceRef.current.embodiments.find(
							(candidate) =>
								candidate.actors.some(
									({ citizenId }) => citizenId === context.citizenId,
								),
						);
						if (settlement === undefined) {
							setFocusedEventId(null);
							reportNavigationRejection("foreign-reference");
							return;
						}
						setSelectedSettlementId(settlement.settlementId);
						setFocusedLocationId(context.locationId);
						dispatch({
							type: "select-citizen",
							citizenId: context.citizenId,
						});
						setFocusedEventContext(context);
						setNavigationRejection(null);
					})
					.catch(() => {
						if (eventFocusRequest.current !== focus.eventId) return;
						setFocusedEventId(null);
						reportNavigationRejection("foreign-reference");
					});
				return;
			}
			eventFocusRequest.current = null;
			setFocusedEventId(null);
			setFocusedEventContext(null);
			const targetId = worldFocusId(focus);
			const latest = experienceRef.current;
			const matches = latest.projections.flatMap((candidate) => {
				const settlement = latest.embodiments.find(
					({ settlementId }) =>
						settlementId === candidate.local.settlement.settlementId,
				);
				if (settlement === undefined) return [];
				const kinds =
					focus.kind === "citizen"
						? settlement.actors.some(({ citizenId }) => citizenId === targetId)
							? ["citizen" as const]
							: []
						: focus.kind === "location"
							? candidate.local.sites.some(({ siteId }) => siteId === targetId)
								? ["location" as const]
								: []
							: [
									...(settlement.projects.some(
										({ projectId }) => projectId === targetId,
									)
										? (["project"] as const)
										: []),
									...(candidate.local.buildings.some(
										({ buildingId }) => buildingId === targetId,
									)
										? (["building"] as const)
										: []),
								];
				return kinds.map((kind) => ({ settlement, kind }));
			});
			if (matches.length !== 1) {
				reportNavigationRejection("foreign-reference");
				return;
			}

			const match = matches[0]!;
			setSelectedSettlementId(match.settlement.settlementId);
			setFocusedLocationId(match.kind === "location" ? targetId : null);
			setNavigationRejection(null);
			if (match.kind === "citizen") {
				dispatch({ type: "select-citizen", citizenId: targetId });
			} else if (match.kind === "location") {
				dispatch({ type: "overview" });
			} else if (match.kind === "project") {
				dispatch({ type: "select-project", projectId: targetId });
			} else {
				dispatch({ type: "select-building", buildingId: targetId });
			}
			if (match.kind === "location") setView("semantic");
			if (updateHistory) window.history.pushState(null, "", href);
		},
		[reportNavigationRejection],
	);
	useEffect(() => {
		const applyLocationFocus = () => {
			if (window.location.search === "" && window.location.hash === "") {
				eventFocusRequest.current = null;
				setFocusedEventId(null);
				setFocusedEventContext(null);
				setFocusedLocationId(null);
				setNavigationRejection(null);
				dispatch({ type: "overview" });
				return;
			}
			const focus = parseWorldFocusHref(
				`${window.location.pathname}${window.location.search}${window.location.hash}`,
			);
			if (focus === null) {
				reportNavigationRejection("invalid-envelope");
				return;
			}
			focusWorldTarget(focus, false);
		};
		if (!initialLocationFocusApplied.current) {
			initialLocationFocusApplied.current = true;
			applyLocationFocus();
		}
		window.addEventListener("popstate", applyLocationFocus);
		return () => window.removeEventListener("popstate", applyLocationFocus);
	}, [focusWorldTarget, reportNavigationRejection]);

	useEffect(() => {
		const interval = presentationIntervalMs(playRate);
		if (interval === null) return;
		const id = window.setInterval(
			() => setPresentationTick((tick) => tick + 1),
			interval,
		);
		return () => window.clearInterval(id);
	}, [playRate]);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 721px)");
		const sync = () => setInspectorSheetOpen(mq.matches);
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		dayAnchor.current = {
			day: experience.horizonDays,
			displayedAt: performance.now(),
		};
	}, [experience.horizonDays, playRate]);

	useEffect(() => {
		if (playRate === 0 || reduceMotion) return;
		const id = window.setInterval(
			() => setVisualCopyBeat((beat) => beat + 1),
			250,
		);
		return () => window.clearInterval(id);
	}, [playRate, reduceMotion]);

	useEffect(() => {
		const interval = authorityDayIntervalMs(playRate);
		if (
			interval === null ||
			catchUpProposal > 0 ||
			catchingUp.current ||
			consideringCounsel ||
			experience.persistence.kind !== "indexeddb"
		)
			return;
		const id = window.setInterval(() => {
			if (advancingDay.current || catchingUp.current || consideringCounsel)
				return;
			if (
				!dayAdvanceDue(
					dayAnchor.current.displayedAt,
					interval,
					performance.now(),
				)
			)
				return;
			advancingDay.current = true;
			void onAdvanceDay()
				.then(() => {
					writeLastActiveWallMs();
					dayAnchor.current = {
						...dayAnchor.current,
						displayedAt: performance.now(),
					};
				})
				.catch(() => {
					dayAnchor.current = {
						...dayAnchor.current,
						displayedAt: performance.now(),
					};
				})
				.finally(() => {
					advancingDay.current = false;
				});
		}, 250);
		return () => window.clearInterval(id);
	}, [
		catchUpProposal,
		consideringCounsel,
		experience.persistence.kind,
		onAdvanceDay,
		playRate,
	]);

	useEffect(() => {
		setCatchUpProposal(
			proposedReturnCatchUpDays(
				Date.now(),
				readLastActiveWallMs(),
				experience.horizonDays,
			),
		);
	}, [experience.horizonDays]);

	useEffect(() => {
		const persist = () => writeLastActiveWallMs();
		window.addEventListener("pagehide", persist);
		const onVisibility = () => {
			if (document.visibilityState === "hidden") persist();
		};
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("pagehide", persist);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);

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
		if (asset !== "failed" || assetIncidentReported.current) return;
		assetIncidentReported.current = true;
		if (generatedFaultHooks)
			void generatedWorldFaultModule.then((module) =>
				module?.recordGeneratedWorldFaultOutcome("asset"),
			);
		void browserDiagnostics.captureRuntimeFailure({
			code: generatedFaultHooks ? "GENERATED_ASSET_REJECTED" : "ASSET_REJECTED",
			component: "generated-world-asset",
			protectReality: () => setView("semantic"),
		});
	}, [asset]);

	useEffect(() => {
		if (consideringCounsel) {
			if (!pausedForCounsel.current) {
				pausedForCounsel.current = true;
				setPlayRate((current) => {
					resumePlayRate.current = current;
					return 0;
				});
			}
			return;
		}
		if (pausedForCounsel.current) {
			pausedForCounsel.current = false;
			setPlayRate(resumePlayRate.current);
		}
	}, [consideringCounsel]);

	useEffect(() => {
		if (!consideringCounsel) return;
		if (window.matchMedia("(max-width: 720px)").matches)
			setInspectorSheetOpen(true);
	}, [consideringCounsel]);

	if (projection === undefined || model === undefined)
		return <WorldError error={new Error("No settlement projection exists")} />;
	if (visualDayClock.current.hash !== experience.stateHash) {
		visualDayClock.current = {
			hash: experience.stateHash,
			startedAt: performance.now(),
			held: reduceMotion ? 0.55 : 0,
		};
	}
	const visualProgress01 = visualDayProgress01({
		displayedAtMs: visualDayClock.current.startedAt,
		nowMs: performance.now(),
		intervalMs: playRate === 3 ? FASTER_DAY_INTERVAL_MS : PLAY_DAY_INTERVAL_MS,
		playing: playRate !== 0,
		reducedMotion: reduceMotion,
		held01: visualDayClock.current.held,
	});
	if (playRate !== 0) visualDayClock.current.held = visualProgress01;
	const focusedCitizenId =
		navigation.focus.kind === "citizen" ? navigation.focus.citizenId : null;
	const followActor =
		(focusedCitizenId === null
			? model.actors.find(
					(actor) => actor.citizenId === experience.sponsorCitizenId,
				)
			: model.actors.find((actor) => actor.citizenId === focusedCitizenId)) ??
		model.actors[0];
	const openSettlement = (settlementId: string) => {
		setSelectedSettlementId(settlementId);
		const nextProjection = experience.projections.find(
			(candidate) => candidate.local.settlement.settlementId === settlementId,
		);
		const notable =
			nextProjection?.spatial.actors.find((actor) =>
				actor.name.startsWith("Orin"),
			) ?? nextProjection?.spatial.actors[0];
		if (
			notable !== undefined &&
			nextProjection?.local.settlement.name === "Second Founding"
		)
			dispatch({ type: "select-citizen", citizenId: notable.citizenId });
		else dispatch({ type: "overview" });
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
		if (generatedFaultHooks)
			void generatedWorldFaultModule.then((module) =>
				module?.recordGeneratedWorldFaultOutcome("renderer-webgl"),
			);
		void browserDiagnostics.captureRuntimeFailure({
			code: generatedFaultHooks
				? "GENERATED_RENDERER_UNAVAILABLE"
				: "RENDERER_UNAVAILABLE",
			component: "generated-world-renderer",
			invariant: "render-reality-noninterference",
			protectReality: () => setRendererFailed(true),
		});
	};
	const assetVerified = asset === "verified";
	const effectiveView = rendererFailed || !assetVerified ? "semantic" : view;
	const embodiedAvailable =
		assetVerified &&
		!rendererFailed &&
		projection.availability.status !== "unavailable";
	const embodiedVisible = effectiveView === "embodied" && embodiedAvailable;
	const authorityDaysLocked = experience.persistence.kind !== "indexeddb";
	const clockLockReason = consideringCounsel
		? "Paused while you consider advice"
		: undefined;
	const togglePresentation = () =>
		setPlayRate((rate) => {
			const next = rate === 0 ? 1 : 0;
			if (next === 0) writeLastActiveWallMs();
			return next;
		});
	const toggleReducedMotion = () =>
		setReduceMotion((value) => {
			const next = !value;
			try {
				window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(next));
			} catch {
				// The in-memory preference still applies for this session.
			}
			return next;
		});
	const stepPresentation = () =>
		setPresentationTick((presentationTick) => presentationTick + 1);
	const contextPanel = () => (
		<GeneratedContextPanel
			projection={projection}
			model={model}
			navigation={navigation}
			dispatch={dispatch}
			presentationPlaying={presentationPlaying}
			reducedMotion={reduceMotion}
			onTogglePresentation={togglePresentation}
			onStepPresentation={stepPresentation}
			onNavigationRejected={reportNavigationRejection}
			authorityRegionId={experience.authorityRegionId}
			authorityDatabaseName={experience.authorityDatabaseName}
			authorityStateHash={experience.stateHash}
			sponsorCitizenId={experience.sponsorCitizenId}
			sponsorPhase={experience.sponsorPhase}
			activeCounselIntent={experience.activeCounselIntent}
			persistenceAvailable={experience.persistence.kind === "indexeddb"}
			onAuthorityCommitted={onAuthorityRefresh}
			happenings={experience.happenings}
			innerLives={experience.innerLives}
			onCounselConsiderationChange={setConsideringCounsel}
			visualProgress01={visualProgress01}
		/>
	);

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
			data-asset-integrity={asset}
			data-presentation-tick={presentationTick}
			data-presentation-playing={String(presentationPlaying)}
			data-play-rate={String(playRate)}
			data-day-interval-ms={String(authorityDayIntervalMs(playRate) ?? 0)}
			data-visual-progress={visualProgress01.toFixed(3)}
			data-view={effectiveView}
			data-inspector-open={String(inspectorSheetOpen)}
			data-chronicle-open={String(chronicleSheetOpen)}
			data-counsel-open={String(consideringCounsel)}
			data-horizon-days={String(experience.horizonDays)}
			data-sponsor-phase={experience.sponsorPhase}
			data-catch-up-proposal={String(catchUpProposal)}
			data-navigation-rejection={navigationRejection ?? undefined}
			data-focused-event-id={focusedEventId ?? undefined}
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
			<a className="skip-link" href="#v1-world-stage">
				Skip to world
			</a>
			<header className="v1-world-header">
				<a className="v1-brand" href="/" aria-label="Eonfolk home">
					<EonfolkMark label="" />
					<span>EONFOLK</span>
				</a>
				<div className="v1-world-title">
					<p className="v1-kicker">A LIVING SETTLEMENT</p>
					<h1>{projection.local.settlement.name}</h1>
					<p>
						Day {experience.horizonDays} ·{" "}
						{countNoun(projection.spatial.actors.length, "person", "people")}
					</p>
				</div>
				<nav className="v1-view-controls" aria-label="Time">
					<button
						type="button"
						aria-pressed={playRate === 0}
						disabled={consideringCounsel}
						title={clockLockReason}
						onClick={() => {
							writeLastActiveWallMs();
							setPlayRate(0);
						}}
					>
						Pause
					</button>
					<button
						type="button"
						aria-pressed={playRate === 1}
						disabled={consideringCounsel}
						title={clockLockReason}
						onClick={() => setPlayRate(1)}
					>
						Play
					</button>
					<button
						type="button"
						aria-pressed={playRate === 3}
						disabled={consideringCounsel}
						title={clockLockReason}
						onClick={() => setPlayRate(3)}
					>
						Faster
					</button>
					<button
						type="button"
						data-testid="follow-mara"
						disabled={followActor === undefined}
						onClick={() => {
							if (followActor === undefined) return;
							dispatch({
								type: "select-citizen",
								citizenId: followActor.citizenId,
							});
							dispatch({ type: "toggle-follow" });
						}}
					>
						{followActor === undefined
							? "Follow"
							: navigation.followCitizen &&
									navigation.focus.kind === "citizen" &&
									navigation.focus.citizenId === followActor.citizenId
								? `Stop following ${followActor.name.split(" ")[0]}`
								: `Follow ${followActor.name.split(" ")[0]}`}
					</button>
				</nav>
				<nav className="v1-view-controls" aria-label="World view">
					<button
						type="button"
						aria-pressed={effectiveView === "embodied"}
						disabled={!assetVerified}
						onClick={() => setView("embodied")}
					>
						Watch
					</button>
					<button
						type="button"
						aria-pressed={effectiveView === "semantic"}
						onClick={() => setView("semantic")}
					>
						In words
					</button>
					{experience.happenings.length === 0 ? null : (
						<button
							type="button"
							aria-pressed={chronicleSheetOpen}
							onClick={() =>
								chronicleSheetOpen
									? setChronicleSheetOpen(false)
									: openChronicleRecord()
							}
						>
							Chronicle
						</button>
					)}
					{experience.settlementCount < 2 ? null : (
						<button
							type="button"
							aria-pressed={effectiveView === "overview"}
							onClick={() => setView("overview")}
						>
							Settlements
						</button>
					)}
					<details className="v1-world-settings">
						<summary>Settings</summary>
						<button
							type="button"
							aria-pressed={reduceMotion}
							onClick={toggleReducedMotion}
						>
							{reduceMotion ? "Motion reduced" : "Reduce motion"}
						</button>
					</details>
				</nav>
				{experience.settlementCount < 2 ? null : (
					<nav
						className="generated-settlement-switcher"
						aria-label="Settlements"
						data-testid="settlement-switcher"
					>
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
				)}
			</header>
			{catchUpProposal > 0 ? (
				<p className="renderer-note" role="status">
					You were away. {catchUpProposal} day
					{catchUpProposal === 1 ? "" : "s"} can pass if you choose.{" "}
					<button
						type="button"
						disabled={authorityDaysLocked}
						onClick={() => {
							const pending = readPendingReturnCatchUp();
							const currentDay = experience.horizonDays;
							const days = catchUpProposal;
							if (days < 1) return;
							const lastActive = readLastActiveWallMs() ?? Date.now();
							const operationId =
								pending?.operationId ?? returnCatchUpOperationId(lastActive);
							writePendingReturnCatchUp({
								operationId,
								fromDay: pending?.fromDay ?? currentDay,
								toDay: pending?.toDay ?? currentDay + days,
								lastActiveMs: pending?.lastActiveMs ?? lastActive,
							});
							catchingUp.current = true;
							void onCatchUpDays({
								operationId,
								additionalDays: days,
							})
								.then(() => {
									clearPendingReturnCatchUp();
									writeLastActiveWallMs();
									setCatchUpProposal(0);
								})
								.catch(() => {
									setCatchUpProposal(
										proposedReturnCatchUpDays(
											Date.now(),
											readLastActiveWallMs(),
											experienceRef.current.horizonDays,
										),
									);
								})
								.finally(() => {
									catchingUp.current = false;
								});
						}}
					>
						Let those days pass
					</button>{" "}
					<button
						type="button"
						onClick={() => {
							setPlayRate(0);
							writeLastActiveWallMs();
							clearPendingReturnCatchUp();
							setCatchUpProposal(0);
						}}
					>
						Stay on this day
					</button>
				</p>
			) : null}
			{focusedEventId === null ? null : focusedEventContext === null ? (
				<p className="renderer-note" role="status">
					Restoring this Chronicle event from the local world record…
				</p>
			) : (
				<section className="renderer-note" aria-label="Chronicle event focus">
					<h2>{focusedEventContext.title}</h2>
					<p>
						{focusedEventContext.citizenName}
						{focusedEventContext.locationName === null
							? ""
							: ` · ${focusedEventContext.locationName}`}
						{focusedEventContext.objectName === null
							? ""
							: ` · ${focusedEventContext.objectName}`}
					</p>
					<details>
						<summary>Exact event evidence</summary>
						<code>{focusedEventContext.eventId}</code>
					</details>
				</section>
			)}

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
					This browser copy of Dawnmere cannot be read. Start a fresh local town
					to keep watching.{" "}
					<button
						type="button"
						onClick={rebuildPersistence}
						disabled={rebuildState === "deleting" || rebuildState === "blocked"}
					>
						{rebuildState === "idle" || rebuildState === "error"
							? "Start a fresh local town"
							: "Starting a fresh local town"}
					</button>
					{rebuildState === "blocked"
						? " Close other EONFOLK tabs, then try again."
						: rebuildState === "error"
							? " Recovery could not start. Retry after checking browser storage access."
							: null}
				</p>
			) : null}
			{experience.persistence.kind === "unavailable" ? (
				<p className="renderer-note" role="status">
					This browser cannot save the town. You can still watch, but days will
					not continue after you leave.
				</p>
			) : null}
			{effectiveView === "overview" ? (
				<SettlementOverview
					experience={experience}
					selectedSettlementId={projection.local.settlement.settlementId}
					onSettlement={openSettlement}
				/>
			) : null}
			{effectiveView === "semantic" ? (
				<section className="v1-semantic-layout" aria-label="World in words">
					{rendererFailed ? (
						<div className="renderer-note" role="status">
							<button type="button" onClick={retryRenderer}>
								Retry the watch view
							</button>
						</div>
					) : asset === "checking" ? (
						<p className="renderer-note" role="status">
							The watch view is still opening. People remain inspectable in
							words.
						</p>
					) : asset === "failed" ? (
						<p className="renderer-note" role="status">
							The picture of Dawnmere could not be verified. The town remains
							inspectable in words.
						</p>
					) : null}
					<SemanticSettlement
						projection={projection}
						model={model}
						navigation={navigation}
						dispatch={dispatch}
						presentationPlaying={presentationPlaying}
						reducedMotion={reduceMotion}
						onTogglePresentation={togglePresentation}
						onStepPresentation={stepPresentation}
						onNavigationRejected={reportNavigationRejection}
						focusedLocationId={focusedLocationId}
						visualProgress01={visualProgress01}
					/>
					{contextPanel()}
				</section>
			) : null}
			{effectiveView === "embodied" && !embodiedAvailable ? (
				<ProjectionUnavailable projection={projection} />
			) : null}
			{embodiedAvailable ? (
				<section
					id="v1-world-stage"
					className="v1-living-stage"
					aria-label="Dawnmere"
					tabIndex={-1}
					aria-hidden={!embodiedVisible}
					style={embodiedVisible ? undefined : { display: "none" }}
				>
					<div className="v1-world-canvas-frame">
						<Suspense
							fallback={
								<section className="v1-living-loading" aria-busy="true">
									<p>Opening Dawnmere…</p>
								</section>
							}
						>
							<GeneratedWorldCanvas
								projection={projection}
								model={model}
								navigation={navigation}
								presentationTick={presentationTick}
								reducedMotion={reduceMotion}
								playRate={playRate}
								visualDayOriginMs={visualDayClock.current.startedAt}
								visualDayHeld01={visualDayClock.current.held}
								onFailure={reportRendererFailure}
							/>
						</Suspense>
						<div className="v1-world-vignette" aria-hidden="true" />
						{experience.happenings.length === 0 || chronicleSheetOpen ? null : (
							<button
								type="button"
								className="v1-world-chronicle"
								aria-label="What happened"
								onClick={openChronicleRecord}
							>
								<p className="v1-kicker">What happened</p>
								<ul>
									{experience.happenings.map((happening) => (
										<li
											key={happening.happeningId}
											data-happening-id={happening.happeningId}
										>
											{happening.title}
											{happening.relation === "fact"
												? ""
												: ` · ${CHRONICLE_RELATION_LABEL[happening.relation]}`}
										</li>
									))}
								</ul>
							</button>
						)}
						{chronicleSheetOpen && experience.happenings.length > 0 ? (
							<section
								className="v1-chronicle-record"
								aria-label="Chronicle"
								data-testid="chronicle-record"
							>
								<div className="v1-chronicle-record-head">
									<p className="v1-kicker">CHRONICLE</p>
									<button
										type="button"
										onClick={() => setChronicleSheetOpen(false)}
									>
										Close
									</button>
								</div>
								<h2>Fact, belief, and what happened</h2>
								<p>
									This is the settlement record. Feedback stays a separate note,
									not this Chronicle.
								</p>
								<ul aria-label="Chronicle record">
									{experience.happenings.map((happening) => (
										<li
											key={happening.happeningId}
											data-happening-id={happening.happeningId}
										>
											<strong>{happening.title}.</strong>{" "}
											<span className="v1-chronicle-relation">
												{CHRONICLE_RELATION_LABEL[happening.relation]}
											</span>
											. {happening.summary}
										</li>
									))}
								</ul>
							</section>
						) : null}
						<GeneratedSceneTruth
							projection={projection}
							model={model}
							visualProgress01={visualProgress01}
							selectedCitizenId={
								navigation.focus.kind === "citizen"
									? navigation.focus.citizenId
									: null
							}
						/>
					</div>
					{embodiedVisible ? (
						<details
							className="v1-inspector-sheet"
							open={inspectorSheetOpen}
							onToggle={(event) =>
								setInspectorSheetOpen(event.currentTarget.open)
							}
						>
							<summary>People and work</summary>
							{contextPanel()}
						</details>
					) : null}
				</section>
			) : null}
			<button
				type="button"
				className="v1-feedback-bug"
				aria-expanded={feedbackOpen}
				aria-controls="v1-feedback-dialog"
				title="Report an issue"
				onClick={() => setFeedbackOpen((open) => !open)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill="currentColor"
						d="M9 7V6a3 3 0 1 1 6 0v1h2.5a1 1 0 0 1 0 2H16v2h2.5a1 1 0 1 1 0 2H16v2h1.5a1 1 0 1 1 0 2H16v1a4 4 0 0 1-8 0v-1H6.5a1 1 0 1 1 0-2H8v-2H5.5a1 1 0 1 1 0-2H8V9H6.5a1 1 0 0 1 0-2zm2-.8V7h2V6.2A1.2 1.2 0 0 0 11 6.2"
					/>
				</svg>
				<span className="sr-only">
					{feedbackOpen
						? "Close local issue report"
						: "Report an issue — saved only in this browser"}
				</span>
			</button>
			{feedbackOpen ? (
				<div
					id="v1-feedback-dialog"
					className="v1-feedback-popover"
					role="dialog"
					aria-labelledby="feedback-title"
				>
					<Suspense fallback={<p>Opening the local feedback form…</p>}>
						<FeedbackPanel startOpen />
					</Suspense>
				</div>
			) : null}
			<footer className="v1-world-footer">
				<p>
					Watch first. Select a person to learn more.{" "}
					{consideringCounsel
						? "Paused while you consider advice"
						: catchUpProposal > 0
							? "Days are waiting on your choice before time continues."
							: playRate === 0
								? "Time is paused. Play when you want another day to pass."
								: "Time keeps moving until you pause it."}
				</p>
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
		document.title = "EONFOLK — Dawnmere";
	}, []);
	const { experience, error, refresh, advanceDay, catchUpDays } =
		useGeneratedExperience(fault);
	useEffect(() => {
		void loadGeneratedWorldCanvasModule();
	}, []);
	useEffect(() => {
		if (experience === null) return;
		window.dispatchEvent(new Event("eonfolk-authority-ready"));
	}, [experience]);
	if (error !== null) return <WorldError error={error} fault={fault} />;
	if (fault === undefined) return <WorldLoading />;
	if (experience === null)
		return fault === null ? <WorldAuthorityShell /> : <WorldLoading />;
	return (
		<GeneratedWorld
			experience={experience}
			fault={fault}
			onAuthorityRefresh={refresh}
			onAdvanceDay={advanceDay}
			onCatchUpDays={catchUpDays}
		/>
	);
}
