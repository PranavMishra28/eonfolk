import type {
	ChronicleBeatProjection,
	CounselIntent,
	RiverholdIntent,
	RiverholdProjection,
	RiverholdRuntimeBridge,
} from "./projection";

const STORAGE_KEY = "eonfolk:riverhold:checkpoint-v1";

interface SavedCheckpoint {
	readonly schemaVersion: "riverhold-checkpoint-v1";
	readonly branch: CounselIntent;
	readonly phase?: "return-pending" | "return" | "chronicle";
}

const baseCitizens = [
	{
		id: "citizen:mara",
		name: "Mara",
		role: "Market tally-keeper",
		activity: "carrying water toward the market tally",
		activityKind: "water",
		x: 45,
		y: 45,
		focal: true,
	},
	{
		id: "citizen:toma",
		name: "Toma",
		role: "Storekeeper",
		activity: "settling a ration exchange with Iven",
		activityKind: "trade",
		x: 60,
		y: 50,
	},
	{
		id: "citizen:iven",
		name: "Iven",
		role: "Miller",
		activity: "trading repair wood for rations",
		activityKind: "trade",
		x: 70,
		y: 44,
	},
	{
		id: "citizen:sera",
		name: "Sera",
		role: "Water bearer",
		activity: "drawing water at the old well",
		activityKind: "water",
		x: 28,
		y: 62,
	},
	{
		id: "citizen:nadi",
		name: "Nadi",
		role: "Forester",
		activity: "bundling windfall wood",
		activityKind: "wood",
		x: 17,
		y: 37,
	},
	{
		id: "citizen:owen",
		name: "Owen",
		role: "Millwright",
		activity: "bracing the damaged mill wheel",
		activityKind: "mill",
		x: 80,
		y: 67,
	},
	{
		id: "citizen:bela",
		name: "Bela",
		role: "Grower",
		activity: "moving seed grain above the flood line",
		activityKind: "food",
		x: 37,
		y: 73,
	},
	{
		id: "citizen:corin",
		name: "Corin",
		role: "Carpenter",
		activity: "hauling cut timber down the north path",
		activityKind: "wood",
		x: 87,
		y: 34,
	},
] as const;

const branchData = {
	"verify-private": {
		interpretation: {
			counsel: "verify-private",
			chosenAction: "verify-private",
			disposition: "accepted",
			publicReason:
				"I trust Toma enough to check the reserve before I speak, but the count still has to be answered.",
			decisiveTerms: ["Caution", "Trust in Toma", "Observed 12-unit mismatch"],
		},
		consequence:
			"Mara and Iven verified the sealed repair reserve. Toma's trust held; the public count remains unresolved.",
		whileAway: [
			"Iven opened the sealed repair reserve for Mara.",
			"The missing 12 food units were still owned by Riverhold.",
			"Mara did not make a public allegation; Toma's trust held.",
		],
		secondActions: [
			{
				id: "publish-verified-count",
				label: "Ask Mara to publish the verified count",
				description:
					"Offer one more bounded counsel: disclose the reserve without alleging theft.",
			},
			{
				id: "observe",
				label: "Keep watch",
				description: "Make no intervention and see what Mara does next.",
			},
		],
		story: {
			heading: "YOU ADVISED: verify first",
			choice: "MARA CHOSE: a private recount",
			followed: "WHAT FOLLOWED: the reserve was verified; trust held",
			unresolved: "UNRESOLVED: will Riverhold correct the public count?",
		},
	},
	"accuse-now": {
		interpretation: {
			counsel: "accuse-now",
			chosenAction: "accuse-now",
			disposition: "accepted",
			publicReason:
				"The vote is near. If the count is wrong, waiting could hide a shortage from everyone who depends on it.",
			decisiveTerms: [
				"Public duty",
				"Council deadline",
				"Observed 12-unit mismatch",
			],
		},
		consequence:
			"Mara raised the mismatch at market. An audit opened, the reserve was held, and Toma's trust strained.",
		whileAway: [
			"Mara's statement triggered a council audit.",
			"The audit found a public repair reserve, not a private transfer.",
			"Toma now keeps her distance from Mara.",
		],
		secondActions: [
			{
				id: "repair-trust",
				label: "Counsel Mara to repair the trust",
				description:
					"Ask her to acknowledge what the audit established without undoing the record.",
			},
			{
				id: "uphold-audit",
				label: "Stand by the audit",
				description:
					"Support the public process and leave the relationship unresolved.",
			},
		],
		story: {
			heading: "YOU ADVISED: speak now",
			choice: "MARA CHOSE: a public challenge",
			followed: "WHAT FOLLOWED: an audit opened; Toma's trust strained",
			unresolved: "UNRESOLVED: can the truth and the friendship both hold?",
		},
	},
	abstain: {
		interpretation: {
			counsel: "abstain",
			chosenAction: "abstain",
			disposition: "not-applicable",
			publicReason:
				"No counsel was offered. I will follow my standing plan and keep the mismatch under observation.",
			decisiveTerms: [
				"Standing Plan",
				"Trust in Toma",
				"Evidence still incomplete",
			],
		},
		consequence:
			"Mara followed her existing plan. Trust held, but the ledger uncertainty remained through the next allocation.",
		whileAway: [
			"Mara kept the mismatch private and continued her tally rounds.",
			"The sealed reserve remained outside the open-bin count.",
			"A later ration tally still carries the same uncertainty.",
		],
		secondActions: [
			{
				id: "ask-iven",
				label: "Ask Mara to consult Iven",
				description:
					"Suggest a source who can inspect the mill repair reserve.",
			},
			{
				id: "observe",
				label: "Keep observing",
				description: "Let Mara continue without advice.",
			},
		],
		story: {
			heading: "YOU ABSTAINED",
			choice: "MARA CHOSE: to follow her plan",
			followed: "WHAT FOLLOWED: trust held; the mismatch remained",
			unresolved: "UNRESOLVED: how long can uncertainty stay private?",
		},
	},
} as const;

function dataFor(branch: CounselIntent | null) {
	return branch ? branchData[branch] : null;
}

function chronicleFor(
	branch: CounselIntent,
): readonly ChronicleBeatProjection[] {
	if (branch === "verify-private") {
		return [
			{
				id: "beat:counsel",
				timeLabel: "00:00",
				eyebrow: "CONTRIBUTING",
				title: "You advised a private check",
				body: "Your counsel contributed to Mara's next decision; it did not command her action.",
				evidence: [
					{
						eventId: "RV-004",
						label: "Counsel was offered",
						relation: "contributing",
						mechanism: "sponsor-counsel-v1",
						visibility: "patron",
					},
				],
			},
			{
				id: "beat:choice",
				timeLabel: "00:06",
				eyebrow: "DIRECT",
				title: "Mara chose to verify",
				body: "Mara's decision changed her Standing Plan. Iven's count verified the sealed public reserve.",
				evidence: [
					{
						eventId: "RV-005",
						label: "Standing Plan changed",
						relation: "direct",
						mechanism: "standard-brain-decision-v1",
						visibility: "patron",
					},
					{
						eventId: "RV-006",
						label: "Reserve observed",
						relation: "direct",
						mechanism: "typed-observation-v1",
						visibility: "patron",
					},
				],
			},
			{
				id: "beat:result",
				timeLabel: "00:14",
				eyebrow: "UNRESOLVED",
				title: "Trust held; the count did not",
				body: "The reserve remained Riverhold's property. No public accusation or petition occurred.",
				evidence: [
					{
						eventId: "RV-V-007",
						label: "Private verification completed",
						relation: "response-to",
						mechanism: "riverhold-private-recount-v1",
						visibility: "patron",
					},
				],
			},
		];
	}
	if (branch === "accuse-now") {
		return [
			{
				id: "beat:counsel",
				timeLabel: "00:00",
				eyebrow: "CONTRIBUTING",
				title: "You advised Mara to speak",
				body: "Your counsel was one recorded input. Mara weighed it against the council deadline and her duty to Riverhold.",
				evidence: [
					{
						eventId: "RV-004",
						label: "Counsel was offered",
						relation: "contributing",
						mechanism: "sponsor-counsel-v1",
						visibility: "patron",
					},
				],
			},
			{
				id: "beat:choice",
				timeLabel: "00:06",
				eyebrow: "TRIGGER",
				title: "Mara challenged the count",
				body: "Her public statement triggered an audit. It was an allegation, not proof that Toma stole grain.",
				evidence: [
					{
						eventId: "RV-007",
						label: "Mara spoke at market",
						relation: "trigger",
						mechanism: "public-audit-threshold-v1",
						visibility: "public",
					},
					{
						eventId: "RV-007-C",
						label: "Toma concealed grain",
						relation: "allegation",
						mechanism: "attributed-statement-v1",
						visibility: "public",
					},
				],
			},
			{
				id: "beat:result",
				timeLabel: "00:14",
				eyebrow: "DIRECT",
				title: "The audit found a repair reserve",
				body: "The 12 units still belonged to Riverhold. The accusation strained Mara and Toma's relationship.",
				evidence: [
					{
						eventId: "RV-008",
						label: "Trust changed to strained",
						relation: "direct",
						mechanism: "public-accusation-relationship-v1",
						visibility: "public",
					},
					{
						eventId: "RV-009",
						label: "Audit found public reserve",
						relation: "direct",
						mechanism: "council-audit-v1",
						visibility: "public",
					},
				],
			},
		];
	}
	return [
		{
			id: "beat:counsel",
			timeLabel: "00:00",
			eyebrow: "NO INTERVENTION",
			title: "You offered no advice",
			body: "No sponsor counsel entered Mara's decision. The Chronicle assigns you no causal credit.",
			evidence: [
				{
					eventId: "RV-A-004",
					label: "Sponsor abstained",
					relation: "temporal-predecessor",
					mechanism: "sponsor-boundary-v1",
					visibility: "patron",
				},
			],
		},
		{
			id: "beat:choice",
			timeLabel: "00:06",
			eyebrow: "DIRECT",
			title: "Mara followed her Standing Plan",
			body: "She continued observing the tally while protecting a close relationship.",
			evidence: [
				{
					eventId: "RV-A-005",
					label: "Standing Plan continued",
					relation: "direct",
					mechanism: "plan-continuation-v1",
					visibility: "patron",
				},
			],
		},
		{
			id: "beat:result",
			timeLabel: "00:14",
			eyebrow: "UNRESOLVED",
			title: "The uncertainty survived",
			body: "Trust held. The open-bin and ledger counts still differed at the next allocation.",
			evidence: [
				{
					eventId: "RV-A-009",
					label: "Mismatch persisted",
					relation: "direct",
					mechanism: "ration-count-v1",
					visibility: "patron",
				},
			],
		},
	];
}

function parseCheckpoint(storage: Storage | null): SavedCheckpoint | null {
	if (!storage) return null;
	try {
		const value = JSON.parse(
			storage.getItem(STORAGE_KEY) ?? "null",
		) as Partial<SavedCheckpoint> | null;
		if (value?.schemaVersion !== "riverhold-checkpoint-v1") return null;
		if (
			value.branch !== "verify-private" &&
			value.branch !== "accuse-now" &&
			value.branch !== "abstain"
		)
			return null;
		if (
			value.phase !== undefined &&
			value.phase !== "return-pending" &&
			value.phase !== "return" &&
			value.phase !== "chronicle"
		)
			return null;
		return value as SavedCheckpoint;
	} catch {
		return null;
	}
}

function citizensFor(branch: CounselIntent | null, returned: boolean) {
	if (!branch) return baseCitizens;
	return baseCitizens.map((citizen) => {
		if (citizen.id === "citizen:mara") {
			if (branch === "verify-private")
				return {
					...citizen,
					activity: returned
						? "preparing the verified count for the square"
						: "recounting the sealed reserve with Iven",
					activityKind: "investigate" as const,
					x: 67,
					y: 48,
				};
			if (branch === "accuse-now")
				return {
					...citizen,
					activity: returned
						? "watching the audit notice go up"
						: "speaking before the market council",
					activityKind: "council" as const,
					x: 57,
					y: 43,
				};
			return {
				...citizen,
				activity: "continuing her tally round",
				activityKind: "investigate" as const,
				x: 47,
				y: 52,
			};
		}
		if (citizen.id === "citizen:toma" && branch === "accuse-now")
			return {
				...citizen,
				activity: returned
					? "working apart from Mara at the reserve"
					: "answering the council audit",
				activityKind: "council" as const,
				x: 76,
				y: 55,
			};
		return citizen;
	});
}

export function makeProjection(
	phase: RiverholdProjection["phase"],
	branch: CounselIntent | null,
	secondAction: string | null = null,
): RiverholdProjection {
	const data = branch ? branchData[branch] : null;
	const investigated = phase !== "orientation" && phase !== "following";
	const returned =
		phase === "return-pending" || phase === "return" || phase === "chronicle";
	const summaryVisible = phase === "return" || phase === "chronicle";
	const relationshipBand =
		branch === "accuse-now"
			? secondAction === "repair-trust"
				? "repairing"
				: "strained"
			: "close";
	const relationship =
		relationshipBand === "strained"
			? "Toma's trust is strained"
			: relationshipBand === "repairing"
				? "Mara and Toma have begun a careful repair"
				: "Mara trusts Toma";
	return Object.freeze({
		schemaVersion: "riverhold-view-v1",
		phase,
		day: returned ? 19 : 18,
		timeLabel: returned
			? "06:40 · dawn after the checkpoint"
			: "17:20 · spring count",
		headline:
			phase === "orientation"
				? "A town that remembers"
				: returned
					? "Riverhold changed while you were gone"
					: "The reserve count does not agree",
		tension:
			branch === "accuse-now"
				? "The audit found the reserve, but Mara and Toma no longer stand together."
				: branch === "verify-private"
					? "Mara knows where the grain is; Riverhold still does not."
					: branch === "abstain"
						? "Mara protected the relationship, and carried the uncertainty forward."
						: "Twelve food units appear in the public ledger but not in the open bins.",
		citizens: Object.freeze(citizensFor(branch, returned)),
		resources: Object.freeze({
			food: 28,
			water: 30,
			wood: 6,
		}),
		worldNotices: Object.freeze(
			branch === "accuse-now"
				? ["Council audit open", "Repair reserve held", relationship]
				: branch === "verify-private"
					? ["Sealed reserve verified", "Public count unchanged", relationship]
					: branch === "abstain"
						? [
								"Ledger uncertainty remains",
								"Allocation proceeded",
								relationship,
							]
						: [
								"Iven and Toma settled a wood-for-rations exchange",
								"Mill repair needs two more wood",
								relationship,
							],
		),
		mara: Object.freeze({
			activity:
				citizensFor(branch, returned)[0]?.activity ??
				"checking the market tally",
			values: Object.freeze([
				"Tell the truth carefully",
				"Protect earned trust",
				"Keep Riverhold fed",
			]),
			belief: investigated
				? branch === "verify-private"
					? "The sealed reserve exists and remains Riverhold's property."
					: branch === "accuse-now"
						? "The mismatch required public review; theft is not established."
						: "The ledger and open-bin counts differ by 12; the reason is still unverified."
				: "The ledger may be wrong; the open bins are 12 units short.",
			beliefStatus:
				branch === "verify-private"
					? "verified"
					: branch === "accuse-now"
						? "disputed"
						: "uncertain",
			relationship,
			relationshipBand,
			standingPlan:
				branch === "verify-private"
					? "Share the verified count without inventing Toma's motive."
					: branch === "accuse-now"
						? "Answer the audit, then decide whether to approach Toma."
						: "Check Iven's tally, then decide what to tell Toma.",
			autonomy:
				"She acts for herself. You can advise at named boundaries; you cannot command her.",
		}),
		investigation: Object.freeze({
			ledgerCount: 40,
			openBinCount: 28,
			mismatch: 12,
			observed: investigated,
		}),
		interpretation: data ? Object.freeze(data.interpretation) : null,
		branch,
		consequence: data?.consequence ?? null,
		whileAway: Object.freeze(summaryVisible ? (data?.whileAway ?? []) : []),
		secondActions: Object.freeze(
			phase === "return" ? (data?.secondActions ?? []) : [],
		),
		chronicle: Object.freeze(
			phase === "chronicle" && branch ? chronicleFor(branch) : [],
		),
		storyCard: phase === "chronicle" ? (data?.story ?? null) : null,
		localSaveNotice:
			"This proof is saved only in this browser. Backup and recovery are not available yet.",
	});
}

function createStaticRuntimeBridge(
	storage: Storage | null = typeof window === "undefined"
		? null
		: window.localStorage,
): RiverholdRuntimeBridge {
	const checkpoint = parseCheckpoint(storage);
	let phase: RiverholdProjection["phase"] =
		checkpoint?.phase ?? (checkpoint ? "return-pending" : "orientation");
	let branch: CounselIntent | null = checkpoint?.branch ?? null;
	let projection = makeProjection(phase, branch);

	return {
		getProjection: () => projection,
		ready: async () => projection,
		async dispatch(intent: RiverholdIntent) {
			switch (intent.kind) {
				case "follow-mara":
					phase = "following";
					break;
				case "investigate-count":
					phase = "investigated";
					break;
				case "open-counsel":
					phase = "counsel";
					break;
				case "offer-counsel":
					branch = intent.counsel;
					phase = "consequence";
					break;
				case "leave-checkpoint": {
					if (!branch)
						throw new Error("A branch is required before checkpointing");
					storage?.setItem(
						STORAGE_KEY,
						JSON.stringify({
							schemaVersion: "riverhold-checkpoint-v1",
							branch,
						} satisfies SavedCheckpoint),
					);
					phase = "checkpoint";
					break;
				}
				case "confirm-advance":
					phase = "return";
					break;
				case "take-second-action":
					if (
						!dataFor(branch)?.secondActions.some(
							({ id }) => id === intent.actionId,
						)
					)
						throw new Error("The action is not available in this branch");
					phase = "chronicle";
					projection = makeProjection(phase, branch, intent.actionId);
					return projection;
				case "reset-local-proof":
					storage?.removeItem(STORAGE_KEY);
					phase = "orientation";
					branch = null;
					break;
			}
			projection = makeProjection(phase, branch);
			return projection;
		},
		clear() {
			// Static test adapter has no process resource to release.
		},
	};
}

interface WorkerResponse {
	readonly id: number;
	readonly ok: boolean;
	readonly projection?: RiverholdProjection;
	readonly error?: string;
}

export function createRiverholdRuntimeBridge(
	storage: Storage | null = typeof window === "undefined"
		? null
		: window.localStorage,
): RiverholdRuntimeBridge {
	if (typeof Worker === "undefined") return createStaticRuntimeBridge(storage);
	const checkpoint = parseCheckpoint(storage);
	let projection = makeProjection(
		checkpoint?.phase ?? (checkpoint ? "return-pending" : "orientation"),
		checkpoint?.branch ?? null,
	);
	const worker = new Worker(new URL("./runtime.worker.ts", import.meta.url), {
		type: "module",
		name: "eonfolk-riverhold-authority",
	});
	let nextRequestId = 1;
	const pending = new Map<
		number,
		{
			resolve: (value: RiverholdProjection) => void;
			reject: (reason: Error) => void;
		}
	>();
	worker.addEventListener(
		"message",
		(message: MessageEvent<WorkerResponse>) => {
			const request = pending.get(message.data.id);
			if (request === undefined) return;
			pending.delete(message.data.id);
			if (!message.data.ok || message.data.projection === undefined) {
				request.reject(
					new Error(message.data.error ?? "worker request failed"),
				);
				return;
			}
			projection = message.data.projection;
			request.resolve(projection);
		},
	);
	worker.addEventListener("error", (event) => {
		for (const request of pending.values())
			request.reject(new Error(event.message || "Riverhold worker failed"));
		pending.clear();
	});
	const request = (
		message:
			| {
					readonly kind: "initialize";
					readonly phase: RiverholdProjection["phase"];
			  }
			| { readonly kind: "dispatch"; readonly intent: RiverholdIntent }
			| { readonly kind: "reset" },
	): Promise<RiverholdProjection> => {
		const id = nextRequestId++;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			worker.postMessage({ id, ...message });
		});
	};
	const ready = request({
		kind: "initialize",
		phase: checkpoint?.phase ?? (checkpoint ? "return-pending" : "orientation"),
	});

	return {
		getProjection: () => projection,
		ready: async () => ready,
		async dispatch(intent) {
			await ready;
			const next = await request(
				intent.kind === "reset-local-proof"
					? { kind: "reset" }
					: { kind: "dispatch", intent },
			);
			if (intent.kind === "reset-local-proof") {
				storage?.removeItem(STORAGE_KEY);
			} else if (intent.kind === "leave-checkpoint" && next.branch !== null) {
				storage?.setItem(
					STORAGE_KEY,
					JSON.stringify({
						schemaVersion: "riverhold-checkpoint-v1",
						branch: next.branch,
						phase: "return-pending",
					} satisfies SavedCheckpoint),
				);
			} else if (
				(intent.kind === "confirm-advance" ||
					intent.kind === "take-second-action") &&
				next.branch !== null
			) {
				storage?.setItem(
					STORAGE_KEY,
					JSON.stringify({
						schemaVersion: "riverhold-checkpoint-v1",
						branch: next.branch,
						phase: intent.kind === "confirm-advance" ? "return" : "chronicle",
					} satisfies SavedCheckpoint),
				);
			}
			return next;
		},
		clear() {
			worker.terminate();
		},
	};
}

export const riverholdRuntimeContract = Object.freeze({
	projectionSchema: "riverhold-view-v1",
	acceptedIntentKinds: Object.freeze([
		"follow-mara",
		"investigate-count",
		"open-counsel",
		"offer-counsel",
		"leave-checkpoint",
		"confirm-advance",
		"take-second-action",
		"reset-local-proof",
	]),
	boundary:
		"The application consumes immutable projections produced only after the simulation worker commits canonical events and decisions to IndexedDB.",
});
