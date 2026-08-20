import "pixi.js/unsafe-eval";
import { Application, Container, Graphics, Text } from "pixi.js";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";

import {
	ACTION_IDS,
	type ActionId,
	PARTICIPANT_ASSIGNMENTS,
	resolveTreatment,
	TreatmentConsequence,
	type TreatmentId,
	TreatmentPrototype,
} from "../../product";
import {
	GATE0_ASSIGNMENTS,
	GATE0_OPERATIONAL_SEED,
	GATE0_OPTION_SETS,
	OPERATOR_STATEMENT,
	PRESENTATIONS,
} from "../../study/contract.ts";
import {
	CITIZENS,
	createPixiCommands,
	createProjection,
} from "../../visual/index.mjs";
import "../../visual/gate0-visual.css";
import "./styles.css";
import optionOrders from "./option-orders.json";

type ProductStudyId = keyof typeof PARTICIPANT_ASSIGNMENTS;
type ObserverStudyId = `V0${1 | 2 | 3 | 4 | 5}`;
type Attempt = {
	status: "valid" | "invalid";
	invalidationReason: string | null;
};
const consent =
	"This is a voluntary unpaid prototype study. We record only an anonymous study ID, task timing, choices, ratings, comments, and written screen-observation notes; no name or contact details, audio, or video. You may skip or stop at any time without consequence. Do you agree to participate and to this anonymous data collection?";
const validAttempt = (): Attempt => ({
	status: "valid",
	invalidationReason: null,
});
const storageKey = (studyId: string) => `gate0-human-record:${studyId}`;
const progressKey = (studyId: string) => `gate0-progress:${studyId}`;

function persist(studyId: string, value: unknown) {
	localStorage.setItem(storageKey(studyId), JSON.stringify(value));
}

function attemptInvalid(record: any, key: string, reason: string) {
	if (record.protocol[key]?.status === "valid")
		record.protocol[key] = { status: "invalid", invalidationReason: reason };
}

function useProtocolInvalidation(
	currentKey: string | null,
	endpoint: boolean,
	update: (mutate: (record: any) => void) => void,
) {
	useEffect(() => {
		if (!currentKey || endpoint) return;
		const invalidate = (reason: string) =>
			update((record) => attemptInvalid(record, currentKey, reason));
		const onVisibility = () => {
			if (document.visibilityState !== "visible") invalidate("visibility-loss");
		};
		const onBlur = () => invalidate("focus-loss");
		const onPageHide = () => invalidate("navigation");
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("blur", onBlur);
		window.addEventListener("pagehide", onPageHide);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("pagehide", onPageHide);
		};
	}, [currentKey, endpoint, update]);
}

function Consent({ onAgree }: { onAgree: () => void }) {
	const [declined, setDeclined] = useState(false);
	if (declined)
		return (
			<main className="study-card">
				<h1>Study ended</h1>
				<p>No record was created.</p>
			</main>
		);
	return (
		<main className="study-card" aria-labelledby="consent-title">
			<h1 id="consent-title">Voluntary prototype study</h1>
			<p>{consent}</p>
			<div className="button-row">
				<button type="button" onClick={onAgree}>
					I agree
				</button>
				<button type="button" onClick={() => setDeclined(true)}>
					I do not agree
				</button>
			</div>
		</main>
	);
}

function StopParticipation({ onStop }: { onStop: () => void }) {
	return (
		<button className="stop-study" type="button" onClick={onStop}>
			Stop participation
		</button>
	);
}

function StudyEnded() {
	return (
		<main className="study-card">
			<h1>Study ended</h1>
			<p>
				Your partial anonymous record was retained; no replacement will be made.
			</p>
		</main>
	);
}

function blankProductRecord(studyId: ProductStudyId) {
	const rowId = `R${Number(studyId.slice(1)) - 1}`;
	const assignment = { studyId, cohortRole: "product", rowId };
	return {
		studyId,
		cohortRole: "product",
		eligible: true,
		affirmativeAgreement: false,
		assignment,
		protocol: Object.fromEntries(PRESENTATIONS.map((p) => [p, validAttempt()])),
		taskTimesMs: Object.fromEntries(
			PRESENTATIONS.map((p) => [`${p}MeaningfulActionMs`, null]),
		),
		choices: Object.fromEntries(
			PRESENTATIONS.flatMap((p) => [
				[`${p}Advice`, null],
				[`${p}Desirable`, null],
				[`${p}Continue`, null],
				[`${p}Replay`, null],
			]),
		),
		ratings: Object.fromEntries(PRESENTATIONS.map((p) => [`${p}Rank`, null])),
		textResponses: Object.fromEntries(
			PRESENTATIONS.flatMap((p) => [
				[`${p}Prediction`, null],
				[`${p}Objection`, null],
			]),
		),
		rubricScores: {},
		observationNotes: null,
		abandoned: false,
	};
}

function ProductRunner({ studyId }: { studyId: ProductStudyId }) {
	const row = PARTICIPANT_ASSIGNMENTS[studyId];
	const [record, setRecord] = useState<any>(() => {
		const prior = localStorage.getItem(storageKey(studyId));
		const value = prior ? JSON.parse(prior) : blankProductRecord(studyId);
		const progress = localStorage.getItem(progressKey(studyId));
		if (progress) {
			const key = JSON.parse(progress).presentation;
			attemptInvalid(value, key === "ranking" ? "V6" : key, "reload");
			persist(studyId, value);
		}
		return value;
	});
	const [ordinal, setOrdinal] = useState(() => {
		const progress = localStorage.getItem(progressKey(studyId));
		if (!progress) return 0;
		const key = JSON.parse(progress).presentation;
		return key === "ranking" ? 6 : Math.max(0, PRESENTATIONS.indexOf(key));
	});
	const [selected, setSelected] = useState<ActionId | null>(null);
	const [decisionAt, setDecisionAt] = useState<number | null>(null);
	const [now, setNow] = useState(0);
	const [immediate, setImmediate] = useState({
		desirable: null as boolean | null,
		continue: null as boolean | null,
		prediction: "",
		objection: "",
	});
	const [replay, setReplay] = useState<boolean | null>(null);
	const [rankValues, setRankValues] = useState<Record<string, string>>({});
	const [surfaceReady, setSurfaceReady] = useState(false);
	const [consented, setConsented] = useState(
		() => localStorage.getItem(storageKey(studyId)) !== null,
	);
	const origin = useRef<number | null>(null);
	const presentation = PRESENTATIONS[ordinal] ?? null;
	const treatmentId = row[ordinal] as TreatmentId | undefined;
	const mutate = (fn: (value: any) => void) =>
		setRecord((prior: any) => {
			const next = structuredClone(prior);
			fn(next);
			persist(studyId, next);
			return next;
		});
	const elapsed =
		origin.current === null ? 0 : Math.max(0, now - origin.current);
	const decisionElapsed =
		decisionAt === null ? 0 : Math.max(0, now - decisionAt);
	const atBoundary = ordinal >= 6;
	const endpoint = atBoundary && record.ratings.V1Rank !== null;
	useProtocolInvalidation(
		consented && (atBoundary || origin.current !== null)
			? atBoundary
				? "V6"
				: presentation
			: null,
		endpoint,
		mutate,
	);

	useLayoutEffect(() => {
		if (!consented || atBoundary || !presentation || !treatmentId) return;
		if (!surfaceReady) {
			const readyFrame = requestAnimationFrame(() => setSurfaceReady(true));
			return () => cancelAnimationFrame(readyFrame);
		}
		const instrument = document.querySelector<HTMLElement>(
			"[data-gate0-instrument]",
		);
		const enabledChoices = document.querySelectorAll(
			'.product-shell input[type="radio"]:not(:disabled)',
		);
		if (
			!ACTION_IDS.includes("verify-private") ||
			!row.includes(treatmentId) ||
			instrument?.dataset.variant !== treatmentId ||
			instrument.dataset.assignment !== studyId ||
			instrument.dataset.ordinal !== String(ordinal) ||
			enabledChoices.length !== 3
		)
			throw new Error("fixture-mismatch");
		origin.current = performance.now();
		localStorage.setItem(
			progressKey(studyId),
			JSON.stringify({ presentation }),
		);
		setNow(origin.current);
		const timer = window.setInterval(() => setNow(performance.now()), 50);
		return () => window.clearInterval(timer);
	}, [
		atBoundary,
		consented,
		ordinal,
		presentation,
		row,
		studyId,
		surfaceReady,
		treatmentId,
	]);

	useEffect(() => {
		if (
			decisionAt !== null ||
			origin.current === null ||
			elapsed < 90_000 ||
			!presentation
		)
			return;
		setDecisionAt(origin.current + 90_000);
		mutate((value) => {
			value.taskTimesMs[`${presentation}MeaningfulActionMs`] = null;
			value.choices[`${presentation}Advice`] = null;
		});
	}, [decisionAt, elapsed, presentation]);

	useEffect(() => {
		if (decisionAt === null || !presentation || decisionElapsed < 45_000)
			return;
		mutate((value) => {
			if (performance.now() - decisionAt > 46_000)
				attemptInvalid(value, presentation, "timer-delivery-overrun");
			value.choices[`${presentation}Desirable`] ??= immediate.desirable;
			value.choices[`${presentation}Continue`] ??= immediate.continue;
			value.textResponses[`${presentation}Prediction`] ??=
				immediate.prediction || null;
			value.textResponses[`${presentation}Objection`] ??=
				immediate.objection || null;
		});
	}, [decisionAt, decisionElapsed >= 45_000, presentation]);

	useEffect(() => {
		if (
			origin.current === null ||
			elapsed < 225_000 ||
			atBoundary ||
			!presentation
		)
			return;
		mutate((value) => {
			value.choices[`${presentation}Replay`] ??= replay;
		});
		localStorage.setItem(
			progressKey(studyId),
			JSON.stringify({
				presentation: ordinal === 5 ? "ranking" : PRESENTATIONS[ordinal + 1],
			}),
		);
		setOrdinal((value) => value + 1);
		setSelected(null);
		setDecisionAt(null);
		setImmediate({
			desirable: null,
			continue: null,
			prediction: "",
			objection: "",
		});
		setReplay(null);
		origin.current = null;
		setSurfaceReady(false);
	}, [atBoundary, elapsed >= 225_000, ordinal, presentation]);

	if (!consented)
		return (
			<Consent
				onAgree={() => {
					const next = blankProductRecord(studyId);
					next.affirmativeAgreement = true;
					persist(studyId, next);
					setRecord(next);
					setConsented(true);
				}}
			/>
		);
	const stop = () => {
		mutate((value) => {
			value.abandoned = true;
		});
		localStorage.removeItem(progressKey(studyId));
	};
	if (
		record.abandoned ||
		Object.values(record.protocol).some(
			(attempt: any) => attempt.status === "invalid",
		)
	)
		return <StudyEnded />;
	if (atBoundary) {
		const submitRanks = () => {
			const ranks = PRESENTATIONS.map((p) => Number(rankValues[p]));
			if ([...ranks].sort().join() !== "1,2,3,4,5,6") return;
			mutate((value) =>
				PRESENTATIONS.forEach((p, index) => {
					value.ratings[`${p}Rank`] = ranks[index];
				}),
			);
			localStorage.removeItem(progressKey(studyId));
		};
		return (
			<main className="study-card">
				<h1>Final ranking</h1>
				<p>
					Rank all six from 1 (most want to continue) to 6 (least), no ties.
				</p>
				{PRESENTATIONS.map((p) => (
					<label key={p}>
						{p}
						<input
							min="1"
							max="6"
							inputMode="numeric"
							value={rankValues[p] ?? ""}
							onChange={(event) =>
								setRankValues((prior) => ({
									...prior,
									[p]: event.target.value,
								}))
							}
						/>
					</label>
				))}
				<button type="button" onClick={submitRanks}>
					Save ranking
				</button>
				<p role="status">
					{record.ratings.V1Rank === null
						? "Ranking not yet saved."
						: "Record complete. Ask the operator to continue."}
				</p>
				<StopParticipation onStop={stop} />
			</main>
		);
	}
	if (!treatmentId || !presentation) return null;
	const confirm = () => {
		if (!selected || decisionAt !== null || origin.current === null) return;
		const raw = performance.now() - origin.current;
		if (raw >= 90_000) return;
		const at = performance.now();
		setDecisionAt(at);
		mutate((value) => {
			value.taskTimesMs[`${presentation}MeaningfulActionMs`] = Math.ceil(
				Math.max(0, raw),
			);
			value.choices[`${presentation}Advice`] = selected;
		});
	};
	if (decisionAt === null)
		return (
			<main className="product-shell">
				<span
					hidden
					data-gate0-instrument="gate-0-product-ready-v1"
					data-assignment={studyId}
					data-fixture-id="gate0-product-v1"
					data-ordinal={ordinal}
					data-variant={treatmentId}
				/>
				<p className="opaque-position">Version {presentation.slice(1)} of 6</p>
				<TreatmentPrototype
					disabled={!surfaceReady}
					treatmentId={treatmentId}
					selected={selected}
					onSelect={setSelected}
					onConfirm={confirm}
					idPrefix={`choice-${presentation}`}
				/>
				<StopParticipation onStop={stop} />
			</main>
		);
	const chosen = resolveTreatment(
		treatmentId,
		record.choices[`${presentation}Advice`] ?? "abstain",
	);
	if (decisionElapsed < 45_000)
		return (
			<main className="study-card">
				<h1>Immediate questions</h1>
				<YesNo
					label="Desirable: Would you choose to keep playing this version now? [Yes/No]"
					value={immediate.desirable}
					onChange={(value) =>
						setImmediate((prior) => ({ ...prior, desirable: value }))
					}
				/>
				<YesNo
					label="Continue: Do you want to see what happens after this decision? [Yes/No]"
					value={immediate.continue}
					onChange={(value) =>
						setImmediate((prior) => ({ ...prior, continue: value }))
					}
				/>
				<label>
					What consequence do you predict?
					<textarea
						value={immediate.prediction}
						onChange={(event) =>
							setImmediate((prior) => ({
								...prior,
								prediction: event.target.value.slice(0, 512),
							}))
						}
					/>
				</label>
				<label>
					What was confusing or objectionable?
					<textarea
						value={immediate.objection}
						onChange={(event) =>
							setImmediate((prior) => ({
								...prior,
								objection: event.target.value.slice(0, 512),
							}))
						}
					/>
				</label>
				<p>Responses lock when the fixed consequence appears.</p>
				<StopParticipation onStop={stop} />
			</main>
		);
	if (decisionElapsed < 60_000)
		return (
			<main className="product-shell">
				<TreatmentConsequence vector={chosen} />
				<StopParticipation onStop={stop} />
			</main>
		);
	if (decisionElapsed < 75_000)
		return (
			<main className="study-card">
				<TreatmentConsequence vector={chosen} />
				<YesNo
					label="Replay: Would you replay this consequence now? [Yes/No]"
					value={replay}
					onChange={setReplay}
				/>
				<StopParticipation onStop={stop} />
			</main>
		);
	return (
		<main className="neutral" aria-live="polite">
			<div aria-hidden="true" />
			<p>
				{decisionElapsed < 135_000
					? "Neutral reset"
					: "Please wait for the next fixed slot."}
			</p>
			<StopParticipation onStop={stop} />
		</main>
	);
}

function YesNo({
	label,
	value,
	onChange,
}: {
	label: string;
	value: boolean | null;
	onChange: (value: boolean) => void;
}) {
	return (
		<fieldset>
			<legend>{label}</legend>
			<label>
				<input
					type="radio"
					checked={value === true}
					onChange={() => onChange(true)}
				/>{" "}
				Yes
			</label>
			<label>
				<input
					type="radio"
					checked={value === false}
					onChange={() => onChange(false)}
				/>{" "}
				No
			</label>
		</fieldset>
	);
}

function RiverholdScene({ onReady }: { onReady: () => void }) {
	const host = useRef<HTMLDivElement>(null);
	const onReadyRef = useRef(onReady);
	useLayoutEffect(() => {
		onReadyRef.current = onReady;
	}, [onReady]);
	useEffect(() => {
		if (!host.current) return;
		let disposed = false;
		let initialized = false;
		const app = new Application();
		const width = host.current.clientWidth;
		const height = host.current.clientHeight;
		void app
			.init({
				antialias: true,
				autoDensity: false,
				background: "#d8c49a",
				height,
				resolution: 1,
				width,
			})
			.then(() => {
				initialized = true;
				if (disposed || !host.current) return app.destroy(true);
				host.current.append(app.canvas);
				const projection = (createProjection as any)({
					width: host.current.clientWidth || 1366,
					height: host.current.clientHeight || 768,
					reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
				});
				const world = new Graphics()
					.rect(0, 0, app.screen.width, app.screen.height)
					.fill("#d8c49a");
				world
					.rect(
						0,
						app.screen.height * 0.7,
						app.screen.width,
						app.screen.height * 0.3,
					)
					.fill("#8f9b63");
				world
					.moveTo(0, app.screen.height * 0.38)
					.lineTo(app.screen.width, app.screen.height * 0.55)
					.stroke({
						color: "#3c7780",
						width: Math.max(28, app.screen.height * 0.08),
					});
				app.stage.addChild(world);
				const layer = new Container();
				app.stage.addChild(layer);
				const landmarkStyle = {
					fill: "#3c3429",
					fontFamily: "Georgia",
					fontSize: app.screen.width <= 480 ? 10 : 13,
					fontWeight: "bold" as const,
				};
				const market = new Graphics()
					.rect(-26, -12, 52, 24)
					.fill("#b87945")
					.stroke({ color: "#342c25", width: 2 });
				market.position.set(app.screen.width * 0.62, app.screen.height * 0.46);
				layer.addChild(market);
				const marketLabel = new Text({ text: "Market", style: landmarkStyle });
				marketLabel.position.set(
					app.screen.width * 0.62 - 25,
					app.screen.height * 0.46 - 35,
				);
				layer.addChild(marketLabel);
				const well = new Graphics()
					.circle(0, 0, 15)
					.fill("#5e9ca7")
					.stroke({ color: "#342c25", width: 3 });
				well.position.set(app.screen.width * 0.25, app.screen.height * 0.59);
				layer.addChild(well);
				const wellLabel = new Text({ text: "Well", style: landmarkStyle });
				wellLabel.position.set(
					app.screen.width * 0.25 - 16,
					app.screen.height * 0.59 + 20,
				);
				layer.addChild(wellLabel);
				const commands = createPixiCommands(projection) as any[];
				const citizens = commands.filter(
					(value: any) =>
						value.kind.includes("citizen") || value.kind === "marker",
				);
				const positions = new Map(
					citizens.map((command: any) => [
						command.id,
						{
							x: (app.screen.width * command.xPercent) / 100,
							y: (app.screen.height * command.yPercent) / 100,
						},
					]),
				);
				const drawEdge = (
					from: string,
					to: string,
					color: string,
					width: number,
				) => {
					const a = positions.get(from)!;
					const b = positions.get(to)!;
					layer.addChild(
						new Graphics()
							.moveTo(a.x, a.y)
							.lineTo(b.x, b.y)
							.stroke({ color, width }),
					);
				};
				drawEdge("citizen:iven", "citizen:toma", "#22647a", 8);
				drawEdge("citizen:mara", "citizen:toma", "#98472f", 3);
				const exchange = new Text({
					text: "Exchange settled",
					style: {
						fill: "#153f4b",
						fontFamily: "Georgia",
						fontSize: app.screen.width <= 480 ? 11 : 15,
						fontWeight: "bold",
					},
				});
				exchange.position.set(
					app.screen.width * (app.screen.width <= 480 ? 0.43 : 0.6),
					app.screen.height * (app.screen.width <= 480 ? 0.53 : 0.53),
				);
				layer.addChild(exchange);
				for (const command of citizens) {
					const x = (app.screen.width * command.xPercent) / 100;
					const y = (app.screen.height * command.yPercent) / 100;
					const body = new Graphics()
						.circle(0, 0, command.name === "Mara" ? 18 : 14)
						.fill(command.name === "Mara" ? "#a97920" : "#38342d");
					body.position.set(x, y);
					layer.addChild(body);
					const prop = new Graphics();
					if (command.pose === "activity:carry-water")
						prop.rect(-7, -7, 14, 14).fill("#4f93a6");
					else if (command.pose === "activity:gather-wood") {
						prop.rect(-9, -5, 18, 4).fill("#7a4b2b");
						prop.rect(-7, 2, 18, 4).fill("#7a4b2b");
					} else {
						prop.circle(-4, 0, 6).fill("#b8893c");
						prop.rect(3, -5, 12, 10).fill("#7a4b2b");
					}
					prop.position.set(x + 19, y - 9);
					layer.addChild(prop);
					const activity =
						command.pose === "activity:carry-water"
							? "water"
							: command.pose === "activity:gather-wood"
								? "wood"
								: "trade";
					const label = new Text({
						text: `${command.name} · ${activity}`,
						style: {
							fill: "#181714",
							fontFamily: "Georgia",
							fontSize: app.screen.width <= 480 ? 10 : 14,
							fontWeight: command.name === "Mara" ? "bold" : "normal",
						},
					});
					label.position.set(x - (app.screen.width <= 480 ? 22 : 28), y + 18);
					layer.addChild(label);
				}
				app.renderer.render(app.stage);
				requestAnimationFrame(() => {
					if (host.current) host.current.dataset.ready = "true";
					onReadyRef.current();
				});
			});
		return () => {
			disposed = true;
			if (initialized) app.destroy(true);
		};
	}, []);
	return (
		<div
			ref={host}
			className="gate0-visual__canvas"
			data-fixture-id="gate0-visual-v1"
			aria-hidden="true"
		/>
	);
}

function blankObserverRecord(studyId: ObserverStudyId) {
	const assignment = {
		studyId,
		cohortRole: "visual-observer",
		fixtureId: "gate0-visual-v1",
	};
	return {
		studyId,
		cohortRole: "visual-observer",
		eligible: true,
		affirmativeAgreement: false,
		assignment,
		protocol: { observer: validAttempt() },
		taskTimesMs: { followMaraFindMs: null, observationPromptMs: null },
		choices: {},
		ratings: {},
		textResponses: {
			mara: null,
			activities: null,
			interaction: null,
			autonomy: null,
		},
		rubricScores: {},
		observationNotes: null,
		abandoned: false,
	};
}

function ObserverRunner({
	studyId,
	capture = false,
}: {
	studyId: ObserverStudyId;
	capture?: boolean;
}) {
	const [record, setRecord] = useState<any>(() =>
		!capture && localStorage.getItem(storageKey(studyId))
			? JSON.parse(localStorage.getItem(storageKey(studyId))!)
			: blankObserverRecord(studyId),
	);
	const [consented, setConsented] = useState(
		capture || localStorage.getItem(storageKey(studyId)) !== null,
	);
	const [origin, setOrigin] = useState<number | null>(null);
	const [sceneReady, setSceneReady] = useState(false);
	const [quality, setQuality] = useState<"living-woodcut" | "semantic-markers">(
		"living-woodcut",
	);
	const [now, setNow] = useState(0);
	const [done, setDone] = useState(false);
	const [answers, setAnswers] = useState({
		mara: "",
		activities: [] as string[],
		interaction: "",
		autonomy: "",
	});
	const orders = useMemo(
		() => optionOrders.filter((order) => order.studyId === studyId),
		[studyId],
	);
	const handleSceneReady = useCallback(() => setSceneReady(true), []);
	const mutate = (fn: (value: any) => void) =>
		setRecord((prior: any) => {
			const next = structuredClone(prior);
			fn(next);
			if (!capture) persist(studyId, next);
			return next;
		});
	useLayoutEffect(() => {
		if (!sceneReady || origin !== null) return;
		const value = performance.now();
		setOrigin(value);
		setNow(value);
	}, [origin, sceneReady]);
	useProtocolInvalidation(
		!capture && consented && origin !== null ? "observer" : null,
		done,
		mutate,
	);
	useEffect(() => {
		if (origin === null) return;
		const timer = setInterval(() => setNow(performance.now()), 50);
		return () => clearInterval(timer);
	}, [origin]);
	const elapsed = origin === null ? 0 : now - origin;
	useLayoutEffect(() => {
		if (
			capture ||
			origin === null ||
			elapsed < 60_000 ||
			record.taskTimesMs.observationPromptMs !== null
		)
			return;
		const raw = performance.now() - origin;
		mutate((value) => {
			if (raw > 61_000)
				attemptInvalid(value, "observer", "timer-delivery-overrun");
			else value.taskTimesMs.observationPromptMs = Math.ceil(Math.max(0, raw));
		});
	}, [
		capture,
		elapsed >= 60_000,
		origin,
		record.taskTimesMs.observationPromptMs,
	]);
	useEffect(() => {
		if (
			capture ||
			origin === null ||
			elapsed <= 10_000 ||
			record.taskTimesMs.followMaraFindMs !== null
		)
			return;
		mutate((value) => attemptInvalid(value, "observer", "follow-find-timeout"));
	}, [capture, elapsed > 10_000, origin, record.taskTimesMs.followMaraFindMs]);
	if (!consented)
		return (
			<Consent
				onAgree={() => {
					const next = blankObserverRecord(studyId);
					next.affirmativeAgreement = true;
					persist(studyId, next);
					setRecord(next);
					setConsented(true);
				}}
			/>
		);
	const stop = () => {
		mutate((value) => {
			value.abandoned = true;
		});
		setDone(true);
	};
	if (record.abandoned || record.protocol.observer.status === "invalid")
		return <StudyEnded />;
	const follow = () => {
		if (origin === null || record.taskTimesMs.followMaraFindMs !== null) return;
		const raw = performance.now() - origin;
		if (raw <= 10_000)
			mutate((value) => {
				value.taskTimesMs.followMaraFindMs = Math.ceil(Math.max(0, raw));
			});
	};
	const question = (id: string) => {
		const order = orders.find((item) => item.questionId === id);
		const set = GATE0_OPTION_SETS.find((item) => item.questionId === id)!;
		return order!.tokens.map(
			(token) => set.options.find((option) => option.token === token)!,
		);
	};
	const submit = () => {
		if (
			!answers.mara ||
			answers.activities.length !== 3 ||
			!answers.interaction ||
			!answers.autonomy ||
			record.taskTimesMs.followMaraFindMs === null ||
			record.taskTimesMs.observationPromptMs === null
		)
			return;
		mutate((value) => {
			value.textResponses = {
				mara: answers.mara,
				activities: [...answers.activities].sort().join(","),
				interaction: answers.interaction,
				autonomy: answers.autonomy,
			};
		});
		setDone(true);
	};
	return (
		<main className="gate0-visual" data-quality={quality}>
			<section className="gate0-visual__world" aria-label="Riverhold world">
				<RiverholdScene onReady={handleSceneReady} />
				<div className="semantic-rows gate0-visual__semantic-world">
					<div className="semantic-title" aria-hidden="true">
						Riverhold
					</div>
					<h1>Mara</h1>
					<p>
						She acts for herself. Standing Plan: check Iven's tally, then decide
						what to tell Toma. Reason: the public ledger and the open-bin count
						differ.
					</p>
					<p role="status" aria-label="Authoritative interaction">
						Iven and Toma exchanged wood and rations; the exchange settled.
					</p>
					<p role="note" aria-label="Mara and Toma relationship">
						Mara and Toma compare the market tally; their concern remains
						unresolved. Relationship cue — no authoritative change.
					</p>
					<section aria-label="Chronicle beat: Exchange settled">
						Iven and Toma exchanged wood and rations at the Riverhold market.
					</section>
					<ul aria-label="Riverhold citizens and current activities">
						{CITIZENS.map((citizen: any) => (
							<li key={citizen.id}>
								{citizen.name}: {citizen.activity}.
							</li>
						))}
					</ul>
				</div>
				<aside className="gate0-visual__peek">
					<div className="peek-title" aria-hidden="true">
						Mara
					</div>
					<p>Reason: the public ledger and open-bin count differ.</p>
					<button
						type="button"
						aria-describedby="gate0-follow-note"
						disabled={origin === null}
						onClick={follow}
					>
						Follow Mara
					</button>
					<p id="gate0-follow-note">
						She acts for herself; following does not command movement or work.
					</p>
					<button
						type="button"
						onClick={() =>
							setQuality((value) =>
								value === "living-woodcut"
									? "semantic-markers"
									: "living-woodcut",
							)
						}
					>
						{quality === "living-woodcut" ? "People" : "World view"}
					</button>
				</aside>
			</section>
			{!capture && record.taskTimesMs.observationPromptMs !== null && !done && (
				<section className="observer-form">
					<h2>Observation prompt</h2>
					<OptionQuestion
						label="Point to Mara."
						options={question("point-mara")}
						value={answers.mara}
						onChange={(value) =>
							setAnswers((prior) => ({ ...prior, mara: value }))
						}
					/>
					<MultiQuestion
						label="Name what three citizens were doing."
						options={question("activities")}
						value={answers.activities}
						onChange={(value) =>
							setAnswers((prior) => ({ ...prior, activities: value }))
						}
					/>
					<OptionQuestion
						label="Which two interacted, and what changed?"
						options={question("interaction-change")}
						value={answers.interaction}
						onChange={(value) =>
							setAnswers((prior) => ({ ...prior, interaction: value }))
						}
					/>
					<OptionQuestion
						label="Can you directly command Mara's movement or work? Why?"
						options={question("autonomy")}
						value={answers.autonomy}
						onChange={(value) =>
							setAnswers((prior) => ({ ...prior, autonomy: value }))
						}
					/>
					<button type="button" onClick={submit}>
						Save observation
					</button>
				</section>
			)}
			{done && (
				<p role="status" className="study-card">
					Record complete. Ask the operator to continue.
				</p>
			)}
			{!capture && !done && <StopParticipation onStop={stop} />}
		</main>
	);
}

function OptionQuestion({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: readonly any[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<fieldset>
			<legend>{label}</legend>
			{options.map((option) => (
				<label key={option.token}>
					<input
						type="radio"
						checked={value === option.token}
						onChange={() => onChange(option.token)}
					/>{" "}
					{option.label}
				</label>
			))}
		</fieldset>
	);
}
function MultiQuestion({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: readonly any[];
	value: string[];
	onChange: (value: string[]) => void;
}) {
	return (
		<fieldset>
			<legend>{label}</legend>
			{options.map((option) => (
				<label key={option.token}>
					<input
						type="checkbox"
						checked={value.includes(option.token)}
						disabled={!value.includes(option.token) && value.length >= 3}
						onChange={() =>
							onChange(
								value.includes(option.token)
									? value.filter((token) => token !== option.token)
									: [...value, option.token],
							)
						}
					/>{" "}
					{option.label}
				</label>
			))}
		</fieldset>
	);
}

function OperatorConsole() {
	const [studyCommit, setStudyCommit] = useState("");
	const [manifestHash, setManifestHash] = useState("");
	const [minutes, setMinutes] = useState({
		setup: 0,
		facilitation: 0,
		analysis: 0,
	});
	const [attests, setAttests] = useState(false);
	const [signedAtUtc, setSignedAtUtc] = useState("");
	const records = GATE0_ASSIGNMENTS.map((assignment) =>
		localStorage.getItem(storageKey(assignment.studyId)),
	).map((raw) => (raw ? JSON.parse(raw) : null));
	const terminal = (record: any) => {
		if (!record) return false;
		if (record.abandoned) return true;
		if (
			Object.values(record.protocol).some(
				(attempt: any) => attempt.status === "invalid",
			)
		)
			return true;
		if (record.cohortRole === "product")
			return (
				PRESENTATIONS.map((p) => record.ratings[`${p}Rank`])
					.sort()
					.join() === "1,2,3,4,5,6"
			);
		return (
			record.taskTimesMs.followMaraFindMs !== null &&
			record.taskTimesMs.observationPromptMs !== null &&
			[
				record.textResponses.mara,
				record.textResponses.activities,
				record.textResponses.interaction,
				record.textResponses.autonomy,
			].every((value) => value !== null)
		);
	};
	const complete = records.every(terminal);
	const validInstant =
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(signedAtUtc) &&
		!Number.isNaN(Date.parse(signedAtUtc)) &&
		new Date(signedAtUtc).toISOString() === signedAtUtc;
	const minuteTotal = Object.values(minutes).reduce((a, b) => a + b, 0);
	const validMinutes = Object.values(minutes).every(
		(value) => Number.isInteger(value) && value >= 0 && value <= 165,
	);
	const readyToDownload =
		complete &&
		attests &&
		/^[0-9a-f]{40}$/.test(studyCommit) &&
		/^[0-9a-f]{64}$/.test(manifestHash) &&
		validInstant &&
		validMinutes &&
		minuteTotal <= 165;
	const download = () => {
		if (!readyToDownload) return;
		const source = {
			schemaVersion: "eonfolk-human-evidence-v1",
			gateId: "gate-0",
			studyCommit,
			manifestHash,
			seed: GATE0_OPERATIONAL_SEED,
			assignments: GATE0_ASSIGNMENTS,
			operatorFocusedMinutes: minutes,
			participantRecords: records,
			operatorSignoff: {
				attests: true,
				role: "authorized-human-operator",
				signedAtUtc,
				statement: OPERATOR_STATEMENT,
			},
		};
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(source)], { type: "application/json" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "gate-0-human.json";
		anchor.click();
		URL.revokeObjectURL(url);
	};
	return (
		<main className="study-card">
			<h1>Gate 0 operator console</h1>
			<p>
				Records present: {records.filter(Boolean).length}/11. This console does
				not score or interpret responses.
			</p>
			<nav>
				<h2>Assignments</h2>
				{GATE0_ASSIGNMENTS.map((assignment) => (
					<a
						key={assignment.studyId}
						href={`/${assignment.cohortRole === "product" ? "product" : "observer"}/${assignment.studyId}`}
					>
						{assignment.studyId}
					</a>
				))}
			</nav>
			<label>
				Frozen study commit
				<input
					value={studyCommit}
					onChange={(e) => setStudyCommit(e.target.value)}
				/>
			</label>
			<label>
				Manifest hash
				<input
					value={manifestHash}
					onChange={(e) => setManifestHash(e.target.value)}
				/>
			</label>
			{(["setup", "facilitation", "analysis"] as const).map((key) => (
				<label key={key}>
					{key} focused minutes
					<input
						type="number"
						min="0"
						max="165"
						value={minutes[key]}
						onChange={(e) =>
							setMinutes((prior) => ({
								...prior,
								[key]: Number(e.target.value),
							}))
						}
					/>
				</label>
			))}
			<label>
				Signed UTC instant
				<input
					placeholder="2026-08-20T12:00:00.000Z"
					value={signedAtUtc}
					onChange={(e) => setSignedAtUtc(e.target.value)}
				/>
			</label>
			<label>
				<input
					type="checkbox"
					checked={attests}
					onChange={(e) => setAttests(e.target.checked)}
				/>{" "}
				{OPERATOR_STATEMENT}
			</label>
			<button type="button" disabled={!readyToDownload} onClick={download}>
				Download gate-0-human.json
			</button>
			<p role="status">
				{complete
					? "All eleven records reached a closed endpoint or terminal failure."
					: "Collection is not complete."}
			</p>
			<p>
				Place the signed file only in the authorized external evidence inbox.
			</p>
		</main>
	);
}

function App() {
	const [, mode, rawId] = location.pathname.split("/");
	const id = rawId ?? "";
	const capture = new URLSearchParams(location.search).get("capture") === "1";
	if (mode === "product" && /^P0[1-6]$/.test(id))
		return <ProductRunner studyId={id as ProductStudyId} />;
	if (mode === "observer" && /^V0[1-5]$/.test(id))
		return <ObserverRunner studyId={id as ObserverStudyId} capture={capture} />;
	return <OperatorConsole />;
}

createRoot(document.getElementById("root")!).render(<App />);
