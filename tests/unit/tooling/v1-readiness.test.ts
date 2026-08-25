import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	canonicalGoalCommit,
	evaluateV1Readiness,
	isAllowedPostFreezePath,
	parseRequiredStateRows,
	readRepositoryArtifact,
	validateCanonicalGoalRoster,
	validateExactHeadEvidence,
	validatePostFreezeDelta,
	validateReviewConfirmationEvidence,
	validateTargetMacDeepEvidence,
	validateTestedIdentity,
} from "../../../scripts/check-v1-readiness.mjs";
import { contentSha256 } from "../../../scripts/evidence-integrity.mjs";
import {
	checkOrWriteInventory,
	renderRepositoryInventory,
} from "../../../scripts/generate-repo-inventory.mjs";
import {
	DEEP_BENCHMARK_CONTRACT,
	verificationContractSha256,
	verificationStepsForTier,
} from "../../../scripts/run-verification-tier.mjs";

function goal(state: string) {
	return `# Goal\n\n## Starting evidence\n\n| Requirement | State | Evidence |\n|---|---|---|\n| Baseline | IN PROGRESS | pending |\n\n## Repository and product\n\n| Requirement | State |\n|---|---|\n| First requirement | ${state} |\n\n## Generalized world\n\n| Requirement | State |\n|---|---|\n| Second requirement | VERIFIED |\n`;
}

const hash = (value: string | Uint8Array) =>
	createHash("sha256").update(value).digest("hex");
const selfHashed = <T extends object>(value: T) => ({
	...value,
	outputSha256: contentSha256(value),
});

function trustedRunRecord({
	runId,
	purpose,
	sourceSha,
	initialReviewSha,
	frozenCandidateSha,
	evidenceSha,
	payloadSha256,
	reviewerAgentId = null,
	reviewerSessionId = null,
}: {
	runId: number;
	purpose: string;
	sourceSha: string;
	initialReviewSha: string;
	frozenCandidateSha: string;
	evidenceSha: string;
	payloadSha256: string;
	reviewerAgentId?: string | null;
	reviewerSessionId?: string | null;
}) {
	return {
		actor: "release-operator",
		artifactArchiveSha256: "9".repeat(64),
		artifactId: runId + 100,
		artifactName: `v1-evidence-${runId}`,
		attestationClass: "PREMERGE_CANDIDATE_CONTROL",
		control: { sha: frozenCandidateSha, files: [] },
		conclusion: "success",
		event: "workflow_dispatch",
		evidenceSha,
		frozenCandidateSha,
		initialReviewSha,
		macExternalProbe: purpose === "target-mac-deep" ? {} : null,
		macLifecycle: purpose === "target-mac-deep" ? {} : null,
		payloadSha256,
		phaseAttestation: null,
		provider: "github-actions-live-api",
		purpose,
		repository: "owner/repo",
		reviewerAgentId,
		reviewerSessionId,
		runnerLabels: ["ubuntu-24.04"],
		runnerName: "GitHub Actions",
		runAttempt: 1,
		runId,
		sourceSha,
		workflowId: 42,
		workflowPath: ".github/workflows/ci.yml",
		workflowSourceSha: "e".repeat(40),
	};
}

function rawBenchmark(id: string, head: string) {
	const modes = ["off", "local", "alpha"];
	switch (id) {
		case "persistence-bounded":
			return selfHashed({
				schemaVersion: "eonfolk-persistence-benchmark-v3",
				status: "PASS",
				acceptance: { pass: true },
				source: { start: { commit: head } },
				indexedDb: {
					appendMedianMilliseconds: 1,
					recoveryMedianMilliseconds: 1,
				},
				memory: { appendMedianMilliseconds: 1, recoveryMedianMilliseconds: 1 },
			});
		case "diagnostics-source":
			return {
				schemaVersion: "eonfolk-diagnostics-overhead-evidence-v1",
				status: "PASS",
				source: { commit: head },
				modes: modes.map((mode) => ({ mode, recordCall: { p95Ms: 0.1 } })),
			};
		case "diagnostics-browser":
			return selfHashed({
				schemaVersion: "eonfolk-diagnostics-browser-comparison-v1",
				status: "PASS",
				source: { start: { commit: head } },
				modes: modes.map((mode) => ({
					mode,
					journeyMs: 1,
					frames: { arrival: { p95Ms: 1 } },
				})),
			});
		case "presentation-stress":
			return {
				schemaVersion: "eonfolk-twelve-actor-presentation-stress-v1",
				status: "PASS",
				sourceCommit: head,
				sourceClean: true,
				measurements: [
					["desktop", 25],
					["laptop", 25],
					["mobile", 33.3],
				].map(([name, practicalBudget]) => ({
					name,
					practicalBudget,
					p95Ratio: 1,
					pass: true,
					twelve: { actorCount: 12, p95FrameMilliseconds: 8 },
				})),
			};
		case "release-genesis-web-performance": {
			const profiles = ["desktop", "laptop", "mobile-emulation"];
			const budgets = [
				{
					profile: "desktop",
					maximumDisplayMs: 3_000,
					maximumInteractionLatencyMs: 250,
					maximumP95FrameMs: 16.7,
					maximumPersistenceReloadMs: 3_000,
					maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
				},
				{
					profile: "laptop",
					maximumDisplayMs: 3_000,
					maximumInteractionLatencyMs: 250,
					maximumP95FrameMs: 16.7,
					maximumPersistenceReloadMs: 3_000,
					maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
				},
				{
					profile: "mobile-emulation",
					maximumDisplayMs: 5_000,
					maximumInteractionLatencyMs: 500,
					maximumP95FrameMs: 33.3,
					maximumPersistenceReloadMs: 5_000,
					maximumUsedJsHeapBytes: 128 * 1_024 * 1_024,
				},
			];
			return {
				schemaVersion: "eonfolk-release-genesis-web-performance-v3",
				canonical: true,
				runtime: { power: { profileAccepted: true } },
				source: { commit: head, stable: true, builtOutput: { stable: true } },
				fixture: { run: "release-genesis-generated-world", route: "/world" },
				budgets,
				runs: profiles.flatMap((profile) =>
					Array.from({ length: 5 }, () => ({
						profile,
						marks: { meaningfulWorldMs: 1 },
						residentFocusLatencyMs: 1,
						overviewLatencyMs: 1,
						persistenceReload: { latencyMs: 1 },
						diagnostics: { usedJsHeapBytes: 1 },
					})),
				),
				aggregates: profiles.map((profile) => ({
					profile,
					pooled: { p95Ms: 1 },
				})),
				networkOracle: {
					externalRouteAttempts: [],
					externalNetlogAttempts: [],
				},
			};
		}
		case "local-model-treatment":
			return {
				schemaVersion: "eonfolk-local-model-benchmark-v3",
				source: { commit: head, dirty: false },
				summary: {
					executions: 100,
					fallbacks: 0,
					warmLatencyMs: { p95: 1 },
					promotionGates: Object.fromEntries(
						[
							"completeCorpus",
							"fallbackWithinFivePercent",
							"freeDiskReserve",
							"hiddenActionAgreementAtLeast98Percent",
							"memoryPressureNormal",
							"noSwapGrowth",
							"warmP95WithinFourSeconds",
						].map((gate) => [gate, true]),
					),
				},
			};
		default:
			throw new Error("unknown benchmark");
	}
}

function evidence(head: string, tier: "pr" | "deep" = "deep") {
	const stored = new Map<string, Uint8Array>();
	const raw = new Map(
		DEEP_BENCHMARK_CONTRACT.map((contract) => [
			contract.path,
			Buffer.from(JSON.stringify(rawBenchmark(contract.id, head))),
		]),
	);
	const sources = [
		{
			path: "apps/web/dist/index.html",
			bytes: Buffer.from("<html>valid</html>"),
		},
		...DEEP_BENCHMARK_CONTRACT.map((contract) => ({
			path: contract.path,
			bytes: raw.get(contract.path) as Buffer,
		})),
	];
	const artifactFiles = sources
		.map(({ path, bytes }) => {
			const evidencePath = `docs/exec-plans/evidence/003/release/deep-artifacts/${path}`;
			stored.set(evidencePath, bytes);
			return {
				evidencePath,
				path,
				bytes: bytes.byteLength,
				sha256: hash(bytes),
			};
		})
		.sort((left, right) => left.path.localeCompare(right.path));
	const measurements = DEEP_BENCHMARK_CONTRACT.map((contract) => {
		const report = rawBenchmark(contract.id, head) as any;
		if (contract.id === "persistence-bounded")
			return {
				indexedDbAppendMedianMs: 1,
				indexedDbRecoveryMedianMs: 1,
				memoryAppendMedianMs: 1,
				memoryRecoveryMedianMs: 1,
			};
		if (contract.id === "diagnostics-source")
			return report.modes.map((mode: any) => ({
				mode: mode.mode,
				recordCallP95Ms: mode.recordCall.p95Ms,
			}));
		if (contract.id === "diagnostics-browser")
			return report.modes.map((mode: any) => ({
				journeyMs: mode.journeyMs,
				maximumFrameP95Ms: 1,
				mode: mode.mode,
			}));
		if (contract.id === "presentation-stress")
			return report.measurements.map((measurement: any) => ({
				p95FrameMilliseconds: measurement.twelve.p95FrameMilliseconds,
				viewport: measurement.name,
			}));
		if (contract.id === "release-genesis-web-performance")
			return report.aggregates.map((profile: any) => ({
				maximumMeaningfulWorldMs: 1,
				pooledFrameP95Ms: 1,
				profile: profile.profile,
			}));
		return { executions: 100, fallbacks: 0, warmP95Ms: 1 };
	});
	const trackedTree = {
		checkout: "detached-full",
		fileCount: 10,
		manifestSha256: "a".repeat(64),
	};
	const unsigned = {
		schemaVersion: "eonfolk-verification-tier-v3",
		tier,
		status: "PASS",
		claimBoundary: "Exact test fixture",
		recordedAt: "2026-08-23T00:00:00.000Z",
		inputs: {},
		integrityClaim: "REPOSITORY_COMPUTABLE_INTEGRITY_ONLY",
		verificationContractSha256: verificationContractSha256(tier),
		source: {
			start: { commit: head, clean: true, trackedTree },
			end: { commit: head, clean: true, trackedTree },
			unchanged: true,
			acceptanceEligible: true,
		},
		environment: { host: "darwin 25.6.0 arm64" },
		subcommands: verificationStepsForTier(tier).map((entry) => ({
			id: entry.id,
			command: [entry.command, ...entry.arguments].join(" "),
			durationMs: 1,
			exitCode: 0,
			status: "PASS",
		})),
		artifactAssertions: {
			productionDistPresent: true,
			filesInspected: 1,
			crashInjectionMarkersAbsent: true,
		},
		artifacts: {
			files: artifactFiles,
			manifestSha256: hash(JSON.stringify(artifactFiles)),
		},
		benchmarkEvidence:
			tier === "deep"
				? DEEP_BENCHMARK_CONTRACT.map((benchmark, index) => ({
						...benchmark,
						artifactSha256: artifactFiles.find(
							(file) => file.path === benchmark.path,
						)?.sha256,
						measurements: measurements[index],
						status: "PASS",
					}))
				: [],
	};
	const report = selfHashed(unsigned);
	const initialReviewSha = "a".repeat(40);
	const evidenceSha = "e".repeat(40);
	const rawSha256 = hash(JSON.stringify(report));
	const trustedRuns = new Map([
		[
			"target-mac-deep",
			trustedRunRecord({
				runId: 1,
				purpose: "target-mac-deep",
				sourceSha: head,
				initialReviewSha,
				frozenCandidateSha: head,
				evidenceSha,
				payloadSha256: rawSha256,
			}),
		],
	]);
	return {
		report,
		stored,
		trustedRuns,
		evidenceSha,
		initialReviewSha,
		rawSha256,
	};
}

const disciplines = [
	"product-game",
	"systems-correctness",
	"visual-accessibility",
	"cognition-eval",
	"security-ci",
	"repository-readiness",
] as const;

function artifact(path: string, contents: string) {
	const bytes = Buffer.from(contents);
	return {
		reference: {
			path,
			bytes: bytes.byteLength,
			sha256: createHash("sha256").update(bytes).digest("hex"),
		},
		bytes,
	};
}

function reviewEvidence(
	initialReviewSha: string,
	frozenSoftwareSha: string,
	deepEvidenceOutputSha256 = "d".repeat(64),
) {
	const evidenceSha = "e".repeat(40);
	const stored = new Map<string, Uint8Array>();
	const trustedRuns = new Map<string, any>();
	const binding = {
		baseSha: initialReviewSha,
		baseTreeSha: "1".repeat(40),
		diffSha256: "3".repeat(64),
		headSha: frozenSoftwareSha,
		headTreeSha: "2".repeat(40),
	};
	const reviewIds = [
		"V1-RV-PRODUCT",
		"V1-RV-SYSTEMS",
		"V1-RV-VISUAL",
		"V1-RV-COGNITION",
		"V1-RV-SECURITY-CI",
		"V1-RV-REPOSITORY-READINESS",
	];
	const reviews = disciplines.map((discipline, index) => {
		const reviewId = reviewIds[index];
		const reviewerAgentId = `review-agent-${index}`;
		const reviewerSessionId = `review-session-${index}`;
		const findingId = `${reviewId}-P1-001`;
		const findings = {
			p0: [],
			p1: [
				{
					id: findingId,
					title: "Concrete release finding",
					narrative:
						"A concrete bounded release defect requires an explicit disposition.",
				},
			],
		};
		const storedArtifact = artifact(
			`docs/reviews/${reviewId}.json`,
			JSON.stringify({
				schemaVersion: "eonfolk-v1-structured-review-v3",
				reviewId,
				discipline,
				reviewerAgentId,
				reviewerSessionId,
				sourceSha: initialReviewSha,
				completedAt: `2026-08-23T00:0${index}:00.000Z`,
				conclusion: "FINDINGS",
				findings,
			}),
		);
		stored.set(storedArtifact.reference.path, storedArtifact.bytes);
		const runId = index + 10;
		trustedRuns.set(
			`review:${reviewId}`,
			trustedRunRecord({
				runId,
				purpose: `review:${reviewId}`,
				sourceSha: initialReviewSha,
				initialReviewSha,
				frozenCandidateSha: frozenSoftwareSha,
				evidenceSha,
				payloadSha256: storedArtifact.reference.sha256,
				reviewerAgentId,
				reviewerSessionId,
			}),
		);
		return {
			reviewId,
			discipline,
			reviewerAgentId,
			reviewerSessionId,
			sourceSha: initialReviewSha,
			status: "COMPLETE",
			findings,
			artifact: storedArtifact.reference,
		};
	});
	const findingIds = reviews.flatMap((review) =>
		review.findings.p1.map((finding) => finding.id),
	);
	const dispositions = findingIds.map((findingId) => ({
		findingId,
		disposition: "ACCEPT",
		status: "CLOSED",
		rationale: "The finding is valid and must be repaired before release.",
		affectedScope: "The exact frozen candidate and its release evidence.",
		remediationOrFalsification:
			"Apply the bounded repair in the frozen history.",
		validatingEvidence:
			"The cited commit and fresh confirmation validate closure.",
		evidenceRefs: [{ kind: "git-commit", sha: frozenSoftwareSha }],
	}));
	const reconciliationArtifact = artifact(
		"docs/exec-plans/evidence/003/release/reconciliation.json",
		JSON.stringify({
			schemaVersion: "eonfolk-v1-reconciliation-v2",
			initialReviewSha,
			frozenCandidateSha: frozenSoftwareSha,
			completedAt: "2026-08-23T01:00:00.000Z",
			dispositions,
		}),
	);
	const diffArtifact = artifact(
		"docs/exec-plans/evidence/003/release/final-diff.json",
		JSON.stringify({ schemaVersion: "eonfolk-v1-final-diff-v1", binding }),
	);
	const confirmationArtifact = artifact(
		"docs/reviews/V1_CONFIRMATION.json",
		JSON.stringify({
			schemaVersion: "eonfolk-v1-final-confirmation-v3",
			status: "PASS",
			sourceSha: frozenSoftwareSha,
			reviewerAgentId: "confirmation-agent",
			reviewerSessionId: "confirmation-session",
			completedAt: "2026-08-23T02:00:00.000Z",
			deepEvidenceOutputSha256,
			reconciliationSha256: reconciliationArtifact.reference.sha256,
			finalDiffSha256: diffArtifact.reference.sha256,
		}),
	);
	for (const storedArtifact of [
		reconciliationArtifact,
		diffArtifact,
		confirmationArtifact,
	])
		stored.set(storedArtifact.reference.path, storedArtifact.bytes);
	trustedRuns.set(
		"final-confirmation",
		trustedRunRecord({
			runId: 99,
			purpose: "final-confirmation",
			sourceSha: frozenSoftwareSha,
			initialReviewSha,
			frozenCandidateSha: frozenSoftwareSha,
			evidenceSha,
			payloadSha256: confirmationArtifact.reference.sha256,
			reviewerAgentId: "confirmation-agent",
			reviewerSessionId: "confirmation-session",
		}),
	);
	const report = {
		schemaVersion: "eonfolk-v1-review-confirmation-v7",
		status: "PASS",
		integrityClaim:
			"REPOSITORY_COMPUTABLE_PLUS_LIVE_GITHUB_RECEIPTS; REVIEWER_AGENT_IDENTITY_SELF_REPORTED",
		initialReviewSha,
		frozenCandidateSha: frozenSoftwareSha,
		reviews,
		reconciliation: {
			unrepairedP0: 0,
			unrepairedP1: 0,
			sourceSha: initialReviewSha,
			finalSoftwareSha: frozenSoftwareSha,
			completedAt: "2026-08-23T01:00:00.000Z",
			dispositions,
			artifact: reconciliationArtifact.reference,
			finalDiff: {
				binding,
				artifact: diffArtifact.reference,
			},
		},
		confirmation: {
			artifact: confirmationArtifact.reference,
			reviewerAgentId: "confirmation-agent",
			reviewerSessionId: "confirmation-session",
		},
	};
	const signed = {
		...report,
		outputSha256: contentSha256(report),
	};
	return {
		report: signed,
		context: {
			attestationClass: "PREMERGE_CANDIDATE_CONTROL",
			evidenceSha,
			initialReviewSha,
			isAncestor: () => true,
			commitExists: () => true,
			treeSha: (sha: string) =>
				sha === initialReviewSha ? binding.baseTreeSha : binding.headTreeSha,
			fullDiffSha256: () => binding.diffSha256,
			deepEvidenceOutputSha256,
			deepEvidenceRawSha256: null,
			trustedRuns,
			readArtifact: (_commit: string, path: string) => {
				const bytes = stored.get(path);
				if (bytes === undefined) throw new Error("missing");
				return bytes;
			},
		},
	};
}

function candidateIdentity(baseSha: string, candidateSha: string) {
	return {
		baseSha,
		candidateSha,
		testedKind: "candidate",
		testedSha: candidateSha,
	};
}

function releaseFixture(initialReviewSha: string, frozenSoftwareSha: string) {
	const deep = evidence(frozenSoftwareSha);
	const reviews = reviewEvidence(
		initialReviewSha,
		frozenSoftwareSha,
		deep.report.outputSha256,
	);
	const trustedRuns = new Map([
		...deep.trustedRuns,
		...reviews.context.trustedRuns,
	]);
	return {
		deep,
		reviews,
		context: {
			...reviews.context,
			deepEvidenceRawSha256: deep.rawSha256,
			trustedRuns,
			readArtifact: (commit: string, path: string) => {
				const bytes =
					deep.stored.get(path) ?? reviews.context.readArtifact(commit, path);
				if (bytes === undefined) throw new Error("missing");
				return bytes;
			},
		},
	};
}

describe("V1 readiness and generated inventory tooling", () => {
	it("uses one strict key-ordered internal content-hash contract", () => {
		expect(contentSha256({ b: 2, a: 1 })).toBe(contentSha256({ a: 1, b: 2 }));
		expect(() => contentSha256({ a: undefined })).toThrow(
			/undefined object fields/u,
		);
	});

	it("bridges exact producer bytes through receipt hashing into readiness", () => {
		const fixture = evidence("b".repeat(40));
		const producerBytes = Buffer.from(
			`${JSON.stringify(fixture.report, null, 2)}\n`,
		);
		const rawSha256 = hash(producerBytes);
		fixture.trustedRuns.get("target-mac-deep").payloadSha256 = rawSha256;
		const context = {
			attestationClass: "PREMERGE_CANDIDATE_CONTROL",
			evidenceSha: fixture.evidenceSha,
			initialReviewSha: fixture.initialReviewSha,
			deepEvidenceRawSha256: rawSha256,
			readArtifact: (_commit: string, path: string) =>
				fixture.stored.get(path) as Uint8Array,
			trustedRuns: fixture.trustedRuns,
		};
		expect(
			validateTargetMacDeepEvidence(
				JSON.parse(producerBytes.toString("utf8")),
				"b".repeat(40),
				context,
			).failures,
		).toEqual([]);
		context.deepEvidenceRawSha256 = fixture.report.outputSha256;
		expect(
			validateTargetMacDeepEvidence(fixture.report, "b".repeat(40), context)
				.failures,
		).toContain(
			"DEEP evidence is not bound to the required live GitHub control/blob attestation",
		);
	});

	it("parses only required software rows and rejects unknown states", () => {
		expect(parseRequiredStateRows(goal("IN PROGRESS"))).toMatchObject([
			{ requirement: "First requirement", state: "IN PROGRESS" },
			{ requirement: "Second requirement", state: "VERIFIED" },
		]);
		expect(() => parseRequiredStateRows(goal("DONE"))).toThrow(
			/invalid GOAL state/,
		);
		expect(() =>
			parseRequiredStateRows(
				goal("VERIFIED").replace(
					"| Second requirement | VERIFIED |",
					"| Second requirement | VERIFIED | invented evidence |",
				),
			),
		).toThrow(/malformed GOAL table row/);
	});

	it("keeps incomplete draft CI non-claiming and green", () => {
		const result = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "draft",
			head: "a".repeat(40),
		});
		expect(result.status).toBe("V1 INCOMPLETE");
		expect(result.releaseEvidence.status).toBe("NOT_REQUIRED_FOR_DRAFT");
		expect(result.claimBoundary).toContain("no V1 readiness claim");
	});

	it("fails ready CLI with an actionable missing external receipt error", () => {
		const head = execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();
		const base = execFileSync("git", ["rev-parse", "HEAD^"], {
			encoding: "utf8",
		}).trim();
		const result = spawnSync(
			process.execPath,
			[
				"scripts/check-v1-readiness.mjs",
				"--mode",
				"ready",
				"--head",
				head,
				"--base-head",
				base,
				"--tested-head",
				head,
				"--tested-kind",
				"candidate",
			],
			{ encoding: "utf8" },
		);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain(
			"ready mode requires --trusted-attestations from live GitHub verification",
		);
	});

	it("requires frozen target-Mac DEEP, six reviews, reconciliation, and confirmation", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const head = "c".repeat(40);
		const release = releaseFixture(initialReviewSha, frozenSoftwareSha);
		const deep = release.deep.report;
		const reviews = release.reviews;
		const incomplete = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "ready",
			deepEvidence: deep,
			reviewEvidence: reviews.report,
			reviewValidationContext: { ...release.context, currentHead: head },
			head,
			testedIdentity: candidateIdentity(initialReviewSha, head),
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(incomplete.status).toBe("V1 INCOMPLETE");

		const wrongHead = validateExactHeadEvidence(
			evidence(frozenSoftwareSha).report,
			head,
		);
		expect(wrongHead.ok).toBe(false);
		expect(wrongHead.failures).toContain(
			"source.start.commit is not exact HEAD",
		);

		const ready = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: deep,
			reviewEvidence: reviews.report,
			reviewValidationContext: { ...release.context, currentHead: head },
			head,
			testedIdentity: candidateIdentity(initialReviewSha, head),
			postFreeze: {
				ancestor: true,
				paths: [
					"GOAL.md",
					"docs/reviews/V1_CONFIRMATION.md",
					"docs/exec-plans/evidence/003/release/target-mac-deep.json",
				],
			},
		});
		expect(ready.releaseEvidence.failures).toEqual([]);
		expect(ready.status).toBe("V1 READY");
		expect(ready.frozenSoftwareSha).toBe(frozenSoftwareSha);
	});

	it("requires a fresh protected-main attestation class after merge", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const mainHead = "d".repeat(40);
		const release = releaseFixture(initialReviewSha, frozenSoftwareSha);
		const testedIdentity = {
			baseSha: "c".repeat(40),
			candidateSha: mainHead,
			testedKind: "main-push",
			testedSha: mainHead,
		};
		const preMerge = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: release.deep.report,
			reviewEvidence: release.reviews.report,
			reviewValidationContext: { ...release.context, currentHead: mainHead },
			head: mainHead,
			testedIdentity,
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(preMerge.releaseEvidence.failures).toContain(
			"review V1-RV-PRODUCT is not bound to the required live GitHub control/blob attestation",
		);

		for (const record of release.context.trustedRuns.values()) {
			record.attestationClass = "POSTMERGE_PROTECTED_MAIN";
			record.phaseAttestation = {
				event: "push",
				headSha: mainHead,
				mergeCommittedAt: "2026-08-23T03:00:00.000Z",
				runAttempt: 1,
				runId: 700,
				runStartedAt: "2026-08-23T03:01:00.000Z",
			};
		}
		const postMerge = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: release.deep.report,
			reviewEvidence: release.reviews.report,
			reviewValidationContext: {
				...release.context,
				attestationClass: "POSTMERGE_PROTECTED_MAIN",
				currentHead: mainHead,
			},
			head: mainHead,
			testedIdentity,
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(postMerge.releaseEvidence.failures).toEqual([]);
		expect(postMerge.status).toBe("V1 READY");
	});

	it("rejects PR-tier, non-Mac, duplicate-reviewer, and software-delta substitutions", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const pr = evidence(frozenSoftwareSha, "pr").report;
		expect(validateTargetMacDeepEvidence(pr, frozenSoftwareSha)).toMatchObject({
			ok: false,
		});
		const linuxFixture = evidence(frozenSoftwareSha);
		const linux = linuxFixture.report;
		linux.environment.host = "linux 6.0.0 x64";
		linux.outputSha256 = contentSha256(linux);
		expect(
			validateTargetMacDeepEvidence(linux, frozenSoftwareSha, {
				attestationClass: "PREMERGE_CANDIDATE_CONTROL",
				evidenceSha: linuxFixture.evidenceSha,
				initialReviewSha: linuxFixture.initialReviewSha,
				deepEvidenceRawSha256: linuxFixture.rawSha256,
				readArtifact: (_commit: string, path: string) =>
					linuxFixture.stored.get(path) as Uint8Array,
				trustedRuns: linuxFixture.trustedRuns,
			}).failures,
		).toContain("DEEP environment is not macOS");

		const duplicateFixture = reviewEvidence(
			initialReviewSha,
			frozenSoftwareSha,
		);
		const duplicate = duplicateFixture.report;
		duplicate.reviews[1].reviewerSessionId =
			duplicate.reviews[0].reviewerSessionId;
		duplicate.outputSha256 = contentSha256(duplicate);
		expect(
			validateReviewConfirmationEvidence(duplicate, duplicateFixture.context)
				.failures,
		).toContain("reviewer sessions are missing or duplicated");

		expect(isAllowedPostFreezePath("docs/reviews/V1.md")).toBe(true);
		expect(isAllowedPostFreezePath("packages/sim/src/index.ts")).toBe(false);
		const releaseForDelta = releaseFixture(initialReviewSha, frozenSoftwareSha);
		const reviewFixture = releaseForDelta.reviews;
		const result = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: releaseForDelta.deep.report,
			reviewEvidence: reviewFixture.report,
			reviewValidationContext: {
				...releaseForDelta.context,
				currentHead: "c".repeat(40),
			},
			head: "c".repeat(40),
			testedIdentity: candidateIdentity(initialReviewSha, "c".repeat(40)),
			postFreeze: {
				ancestor: true,
				paths: ["packages/sim/src/index.ts"],
			},
		});
		expect(result.status).toBe("V1 INCOMPLETE");
		expect(result.releaseEvidence.failures).toContain(
			"post-freeze delta contains software or unapproved files: packages/sim/src/index.ts",
		);
	});

	it("distinguishes a tested PR merge-ref from its candidate and base", () => {
		const baseSha = "a".repeat(40);
		const candidateSha = "b".repeat(40);
		const testedSha = "c".repeat(40);
		const context = {
			currentHead: testedSha,
			isAncestor: () => true,
			parents: () => [baseSha, candidateSha],
			treeSha: () => "same-tree",
		};
		expect(
			validateTestedIdentity(
				{
					baseSha,
					candidateSha,
					testedKind: "pull-request-merge",
					testedSha,
				},
				context,
			),
		).toMatchObject({ ok: true, failures: [] });

		const substituted = validateTestedIdentity(
			{
				baseSha,
				candidateSha,
				testedKind: "pull-request-merge",
				testedSha: candidateSha,
			},
			{ ...context, currentHead: candidateSha },
		);
		expect(substituted.ok).toBe(false);
		expect(substituted.failures).toContain(
			"pull-request merge-ref is indistinguishable from candidateSha",
		);
		const wrongParents = validateTestedIdentity(
			{
				baseSha,
				candidateSha,
				testedKind: "pull-request-merge",
				testedSha,
			},
			{ ...context, parents: () => [baseSha, "d".repeat(40)] },
		);
		expect(wrongParents.failures).toContain(
			"tested merge-ref parents are not exact base and candidate",
		);
	});

	it("binds release proof to the candidate while CI tests its exact merge-ref", () => {
		const baseSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const candidateSha = "c".repeat(40);
		const testedSha = "d".repeat(40);
		const release = releaseFixture(baseSha, frozenSoftwareSha);
		const reviews = release.reviews;
		const ready = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: release.deep.report,
			reviewEvidence: reviews.report,
			reviewValidationContext: {
				...release.context,
				currentHead: testedSha,
				parents: () => [baseSha, candidateSha],
				treeSha: (sha: string) =>
					sha === candidateSha || sha === testedSha
						? "integration-tree"
						: release.context.treeSha(sha),
			},
			head: candidateSha,
			testedIdentity: {
				baseSha,
				candidateSha,
				testedKind: "pull-request-merge",
				testedSha,
			},
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(ready.releaseEvidence.failures).toEqual([]);
		expect(ready.status).toBe("V1 READY");
		expect(ready.head).toBe(candidateSha);
		expect(ready.testedIdentity).toMatchObject({ testedSha, candidateSha });
		expect(ready.releaseEvidence.postFreezeAudit).toMatchObject({
			frozenSha: frozenSoftwareSha,
			head: candidateSha,
		});
	});

	it("rejects tiny, reordered, failed, unhashed, and measurement-free DEEP substitutes", () => {
		const head = "d".repeat(40);
		const tiny = {
			schemaVersion: "eonfolk-verification-tier-v3",
			tier: "deep",
			status: "PASS",
			source: {
				start: { commit: head, clean: true },
				end: { commit: head, clean: true },
				unchanged: true,
				acceptanceEligible: true,
			},
			environment: { host: "darwin 25.6.0 arm64" },
		};
		const tinySigned = {
			...tiny,
			outputSha256: contentSha256(tiny),
		};
		const tinyResult = validateTargetMacDeepEvidence(tinySigned, head);
		expect(tinyResult.ok).toBe(false);
		expect(tinyResult.failures).toContain(
			"DEEP constituent count does not match the exact roster",
		);
		expect(tinyResult.failures).toContain("DEEP artifact manifest is empty");

		const tamperedFixture = evidence(head);
		const tampered = tamperedFixture.report;
		[tampered.subcommands[0], tampered.subcommands[1]] = [
			tampered.subcommands[1],
			tampered.subcommands[0],
		];
		tampered.subcommands[2].exitCode = 1;
		tampered.benchmarkEvidence[0].measurements = {};
		tampered.artifacts.files.find(
			(file) => file.path === DEEP_BENCHMARK_CONTRACT[1].path,
		).sha256 = "f".repeat(64);
		tampered.outputSha256 = contentSha256(tampered);
		const failures = validateTargetMacDeepEvidence(tampered, head, {
			attestationClass: "PREMERGE_CANDIDATE_CONTROL",
			evidenceSha: tamperedFixture.evidenceSha,
			initialReviewSha: tamperedFixture.initialReviewSha,
			readArtifact: (_commit: string, path: string) =>
				tamperedFixture.stored.get(path) as Uint8Array,
			trustedRuns: tamperedFixture.trustedRuns,
		}).failures;
		expect(failures).toContain("DEEP step 1 is not runtime");
		expect(failures).toContain(
			"DEEP step architecture did not PASS with exit 0",
		);
		expect(failures).toContain(
			"DEEP benchmark persistence-bounded measurements are invalid",
		);
		expect(failures).toContain(
			"DEEP benchmark diagnostics-source artifact hash does not match",
		);
	});

	it("rejects arbitrary review IDs, missing artifacts, ancestry gaps, and uncovered findings", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.reviews[0].reviewId = "RV-1";
		fixture.report.reviews[1].artifact.sha256 = "0".repeat(64);
		fixture.report.reconciliation.dispositions.pop();
		fixture.report.reconciliation.dispositions.pop();
		fixture.report.outputSha256 = contentSha256(fixture.report);
		const failures = validateReviewConfirmationEvidence(fixture.report, {
			...fixture.context,
			isAncestor: () => false,
		}).failures;
		expect(failures).toContain(
			"initialReviewSha -> frozenCandidateSha -> evidenceSha ancestry is invalid",
		);
		expect(failures).toContain("review is missing exact discipline reviewId");
		expect(failures).toContain(
			"review V1-RV-SYSTEMS artifact hash does not match",
		);
		expect(failures).toContain(
			"P0/P1 dispositions do not exactly cover review findings",
		);
	});

	it("rejects the superseded persistence and CI review roster", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.schemaVersion = "eonfolk-v1-review-confirmation-v6";
		fixture.report.reviews[4].discipline = "persistence-reliability";
		fixture.report.reviews[4].reviewId = "V1-RV-PERSISTENCE";
		fixture.report.reviews[5].discipline = "ci-security";
		fixture.report.reviews[5].reviewId = "V1-RV-CI";
		fixture.report.outputSha256 = contentSha256(fixture.report);
		const failures = validateReviewConfirmationEvidence(
			fixture.report,
			fixture.context,
		).failures;
		expect(failures).toContain("unsupported review evidence schema");
		expect(failures).toContain(
			"unknown review discipline persistence-reliability",
		);
		expect(failures).toContain("unknown review discipline ci-security");
	});

	it("requires a separately hashed fresh-confirmation artifact", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.confirmation.artifact.sha256 = "0".repeat(64);
		fixture.report.outputSha256 = contentSha256(fixture.report);
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain("fresh confirmation artifact hash does not match");
	});

	it("rejects a non-distinct review/frozen/evidence SHA chain", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.context.evidenceSha = fixture.report.frozenCandidateSha;
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain(
			"initialReviewSha, frozenCandidateSha, and trusted evidence checkout SHA must be pairwise distinct",
		);
	});

	it("rejects a shrunk canonical GOAL roster", () => {
		const canonicalSource = goal("IN PROGRESS");
		const canonical = parseRequiredStateRows(canonicalSource);
		const shrunk = canonical.slice(0, 1);
		expect(validateCanonicalGoalRoster(shrunk, canonical)).toMatchObject({
			ok: false,
			failures: ["GOAL requirement ID roster differs from the canonical base"],
		});
		expect(
			evaluateV1Readiness({
				rows: shrunk,
				canonicalRows: canonical,
				mode: "draft",
				head: "a".repeat(40),
			}),
		).toMatchObject({
			releaseEvidence: {
				status: "INVALID",
				failures: [
					"GOAL requirement ID roster differs from the canonical base",
				],
			},
		});
		const stateOnlySource = goal("VERIFIED");
		expect(
			validateCanonicalGoalRoster(
				parseRequiredStateRows(stateOnlySource),
				canonical,
				{ source: stateOnlySource, canonicalSource },
			),
		).toMatchObject({ ok: true });
		const rewritten = stateOnlySource.replace(
			"## Generalized world",
			"## Rewritten authority",
		);
		expect(
			validateCanonicalGoalRoster(
				parseRequiredStateRows(rewritten),
				canonical,
				{
					source: rewritten,
					canonicalSource,
				},
			),
		).toMatchObject({
			ok: false,
			failures: ["GOAL changed outside state and evidence cells"],
		});
	});

	it("ignores only trailing blanks before the excluded post-merge section", () => {
		const canonicalSource = `${goal("IN PROGRESS")}\n`;
		const currentSource = `${goal("VERIFIED")}\n\n## Post-merge operational reattestation\n\n| Requirement | State | Evidence |\n|---|---|---|\n| Protected merge completed | NOT STARTED | pending |\n`;
		expect(
			validateCanonicalGoalRoster(
				parseRequiredStateRows(currentSource),
				parseRequiredStateRows(canonicalSource),
				{ source: currentSource, canonicalSource },
			),
		).toMatchObject({ ok: true, failures: [] });

		const structurallyChanged = currentSource.replace(
			"## Generalized world",
			"## Rewritten authority",
		);
		expect(
			validateCanonicalGoalRoster(
				parseRequiredStateRows(structurallyChanged),
				parseRequiredStateRows(canonicalSource),
				{ source: structurallyChanged, canonicalSource },
			),
		).toMatchObject({
			ok: false,
			failures: ["GOAL changed outside state and evidence cells"],
		});
	});

	it("uses one immutable GOAL introduction when protected main predates it", () => {
		const baseSha = "a".repeat(40);
		const introductionSha = "b".repeat(40);
		expect(
			canonicalGoalCommit({
				baseSha,
				baseContainsGoal: true,
				introductionCommits: [],
			}),
		).toBe(baseSha);
		expect(
			canonicalGoalCommit({
				baseSha,
				baseContainsGoal: false,
				introductionCommits: [introductionSha],
			}),
		).toBe(introductionSha);
		for (const introductionCommits of [[], [introductionSha, "c".repeat(40)]])
			expect(() =>
				canonicalGoalCommit({
					baseSha,
					baseContainsGoal: false,
					introductionCommits,
				}),
			).toThrow(/exactly one immutable introduction/u);
	});

	it("rejects shared review artifacts, untrusted runs, and duplicate dispositions", () => {
		const shared = reviewEvidence("a".repeat(40), "b".repeat(40));
		shared.report.reviews[1].artifact = shared.report.reviews[0].artifact;
		shared.report.reconciliation.dispositions.push(
			shared.report.reconciliation.dispositions[0],
		);
		shared.report.reconciliation.dispositions[0].rationale = "too short";
		shared.context.trustedRuns.delete("review:V1-RV-VISUAL");
		shared.report.outputSha256 = contentSha256(shared.report);
		const failures = validateReviewConfirmationEvidence(
			shared.report,
			shared.context,
		).failures;
		expect(failures).toContain("review artifacts are duplicated");
		expect(failures).toContain(
			"finding disposition is unknown, duplicated, or malformed",
		);
		expect(failures).toContain(
			"finding disposition rationale is not substantive",
		);
		expect(failures).toContain(
			"review V1-RV-VISUAL is not bound to the required live GitHub control/blob attestation",
		);
	});

	it("rejects a duplicated reviewer session despite distinct runs", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.reviews[1].reviewerSessionId =
			fixture.report.reviews[0].reviewerSessionId;
		const artifactReference = fixture.report.reviews[1].artifact;
		const parsed = JSON.parse(
			Buffer.from(
				fixture.context.readArtifact(
					fixture.context.evidenceSha,
					artifactReference.path,
				),
			).toString("utf8"),
		);
		parsed.reviewerSessionId = fixture.report.reviews[0].reviewerSessionId;
		const bytes = Buffer.from(JSON.stringify(parsed));
		artifactReference.bytes = bytes.byteLength;
		artifactReference.sha256 = hash(bytes);
		fixture.context.trustedRuns.get("review:V1-RV-SYSTEMS").payloadSha256 =
			hash(bytes);
		const originalReadArtifact = fixture.context.readArtifact;
		fixture.context.readArtifact = (commit: string, path: string) =>
			path === artifactReference.path
				? bytes
				: originalReadArtifact(commit, path);
		fixture.report.outputSha256 = contentSha256(fixture.report);
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain("reviewer sessions are missing or duplicated");
	});

	it("requires an explicit structured no-P0/P1 conclusion", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.reviews[0].findings = { p0: [], p1: [] };
		fixture.report.outputSha256 = contentSha256(fixture.report);
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain(
			"review V1-RV-PRODUCT structured content does not match its declaration",
		);
	});

	it("allows a main-push delta audit without ancestry but still rejects software changes", () => {
		expect(
			validatePostFreezeDelta({
				ancestor: false,
				ancestryRequired: false,
				paths: ["docs/exec-plans/evidence/003/release/final-diff.txt"],
			}),
		).toMatchObject({ ok: true });
		expect(
			validatePostFreezeDelta({
				ancestor: false,
				ancestryRequired: false,
				paths: ["packages/sim/src/index.ts"],
			}),
		).toMatchObject({ ok: false });
	});

	it("rejects missing raw DEEP artifacts instead of trusting their manifest", () => {
		const fixture = evidence("a".repeat(40));
		const missing = fixture.report.artifacts.files.find(
			(file) => file.path === DEEP_BENCHMARK_CONTRACT[0].path,
		);
		fixture.stored.delete(missing?.evidencePath ?? "");
		const result = validateTargetMacDeepEvidence(
			fixture.report,
			"a".repeat(40),
			{
				attestationClass: "PREMERGE_CANDIDATE_CONTROL",
				evidenceSha: fixture.evidenceSha,
				initialReviewSha: fixture.initialReviewSha,
				readArtifact: (_commit: string, path: string) => {
					const bytes = fixture.stored.get(path);
					if (bytes === undefined) throw new Error("missing");
					return bytes;
				},
				trustedRuns: fixture.trustedRuns,
			},
		);
		expect(result.failures).toContain(
			"DEEP artifact tmp/eonfolk-persistence-benchmark.json artifact is missing or unreadable",
		);
	});

	it("rejects evidence symlinks by real filesystem inspection", () => {
		const root = mkdtempSync(join(tmpdir(), "eonfolk-evidence-root-"));
		const outside = mkdtempSync(join(tmpdir(), "eonfolk-evidence-outside-"));
		try {
			mkdirSync(join(root, "docs/reviews"), { recursive: true });
			writeFileSync(join(outside, "forged.json"), "{}\n");
			symlinkSync(
				join(outside, "forged.json"),
				join(root, "docs/reviews/forged.json"),
			);
			expect(() =>
				readRepositoryArtifact(root, "docs/reviews/forged.json"),
			).toThrow(/must not be a symlink/u);
		} finally {
			rmSync(root, { recursive: true, force: true });
			rmSync(outside, { recursive: true, force: true });
		}
	});

	it("rejects assume-unchanged tracked bytes in a real detached Git checkout", () => {
		const root = mkdtempSync(join(tmpdir(), "eonfolk-checkout-"));
		try {
			execFileSync("git", ["init", "--quiet"], { cwd: root });
			execFileSync("git", ["config", "user.email", "test@example.invalid"], {
				cwd: root,
			});
			execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
			writeFileSync(join(root, "tracked.txt"), "canonical\n");
			execFileSync("git", ["add", "tracked.txt"], { cwd: root });
			execFileSync("git", ["commit", "--quiet", "-m", "base"], { cwd: root });
			execFileSync("git", ["checkout", "--quiet", "--detach"], { cwd: root });
			const modulePath = join(
				process.cwd(),
				"scripts/run-verification-tier.mjs",
			);
			const inspect = `import { trackedTreeState } from ${JSON.stringify(modulePath)}; console.log(JSON.stringify(trackedTreeState()));`;
			expect(
				execFileSync(
					process.execPath,
					["--input-type=module", "--eval", inspect],
					{
						cwd: root,
						encoding: "utf8",
					},
				),
			).toContain('"checkout":"detached-full"');
			execFileSync(
				"git",
				["update-index", "--assume-unchanged", "tracked.txt"],
				{
					cwd: root,
				},
			);
			writeFileSync(join(root, "tracked.txt"), "forged\n");
			expect(() =>
				execFileSync(
					process.execPath,
					["--input-type=module", "--eval", inspect],
					{
						cwd: root,
						encoding: "utf8",
						stdio: "pipe",
					},
				),
			).toThrow();
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}, 15_000);

	it("rejects a real divergent-base merge and a changed integration tree", () => {
		const root = mkdtempSync(join(tmpdir(), "eonfolk-merge-"));
		try {
			const git = (...arguments_: string[]) =>
				execFileSync("git", arguments_, { cwd: root, encoding: "utf8" }).trim();
			git("init", "--quiet");
			git("config", "user.email", "test@example.invalid");
			git("config", "user.name", "Test");
			writeFileSync(join(root, "common"), "a\n");
			git("add", ".");
			git("commit", "--quiet", "-m", "common");
			const baseBranch = git("branch", "--show-current");
			git("branch", "candidate");
			writeFileSync(join(root, "base-only"), "base\n");
			git("add", ".");
			git("commit", "--quiet", "-m", "base");
			const baseSha = git("rev-parse", "HEAD");
			git("checkout", "--quiet", "candidate");
			writeFileSync(join(root, "candidate-only"), "candidate\n");
			git("add", ".");
			git("commit", "--quiet", "-m", "candidate");
			const candidateSha = git("rev-parse", "HEAD");
			git("merge", "--quiet", "--no-ff", baseBranch, "-m", "synthetic merge");
			const testedSha = git("rev-parse", "HEAD");
			const result = validateTestedIdentity(
				{ baseSha, candidateSha, testedKind: "pull-request-merge", testedSha },
				{
					currentHead: testedSha,
					isAncestor: (ancestor: string, descendant: string) => {
						try {
							git("merge-base", "--is-ancestor", ancestor, descendant);
							return true;
						} catch {
							return false;
						}
					},
					parents: (commit: string) =>
						git("show", "-s", "--format=%P", commit).split(" "),
					treeSha: (commit: string) => git("rev-parse", `${commit}^{tree}`),
				},
			);
			expect(result.failures).toContain(
				"baseSha is not an ancestor of candidateSha",
			);
			expect(result.failures).toContain(
				"tested merge-ref tree differs from candidate tree",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}, 15_000);

	it("renders inventory deterministically from sorted file paths", () => {
		const files = [
			"tests/unit/example.test.ts",
			"apps/web/src/main.ts",
			"apps/web/package.json",
			"GOAL.md",
		];
		const readRoot = process.cwd();
		const first = renderRepositoryInventory(files, readRoot);
		const second = renderRepositoryInventory([...files].reverse(), readRoot);
		expect(first).toBe(second);
		expect(first).toContain("Historical naming boundary");
		expect(first).toContain(
			"The removed Founder Alpha browser application is preserved only in the private archive tag and external bundle",
		);
	});

	it("writes a reproducible inventory and detects a changed file set", () => {
		const root = mkdtempSync(join(tmpdir(), "eonfolk-inventory-"));
		try {
			execFileSync("git", ["init", "--quiet"], { cwd: root });
			mkdirSync(join(root, "docs/generated"), { recursive: true });
			writeFileSync(join(root, "GOAL.md"), "# Goal\n");
			expect(checkOrWriteInventory({ root, mode: "write" }).ok).toBe(true);
			expect(checkOrWriteInventory({ root, mode: "check" }).ok).toBe(true);
			writeFileSync(join(root, "new-file.txt"), "new\n");
			expect(checkOrWriteInventory({ root, mode: "check" })).toMatchObject({
				ok: false,
			});
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
