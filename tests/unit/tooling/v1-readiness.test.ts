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
	outputSha256: hash(JSON.stringify(value)),
});

function rawBenchmark(id: string, head: string) {
	const modes = ["off", "local", "alpha"];
	switch (id) {
		case "persistence-bounded":
			return selfHashed({
				schemaVersion: "eonfolk-persistence-benchmark-v2",
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
		case "release-genesis-web-performance": {
			const profiles = ["desktop", "laptop", "mobile-emulation"];
			return {
				schemaVersion: "eonfolk-release-genesis-web-performance-v2",
				canonical: true,
				runtime: { power: { profileAccepted: true } },
				source: { commit: head, stable: true, builtOutput: { stable: true } },
				fixture: { run: "release-genesis-generated-world", route: "/world" },
				runs: profiles.flatMap((profile) =>
					Array.from({ length: 5 }, () => ({
						profile,
						marks: { meaningfulWorldMs: 1 },
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
				schemaVersion: "eonfolk-local-model-benchmark-v2",
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
		trustedRun: { attestationId: "deep-run" },
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
	const { outputSha256: _output, trustedRun: _run, ...payload } = report;
	const trustedRuns = new Map([
		[
			"deep-run",
			{
				attestationId: "deep-run",
				provider: "github-actions",
				repository: "owner/repo",
				runId: 1,
				runAttempt: 1,
				purpose: "target-mac-deep",
				sourceSha: head,
				payloadSha256: hash(JSON.stringify(payload)),
			},
		],
	]);
	return { report, stored, trustedRuns };
}

const disciplines = [
	"product-game",
	"systems-correctness",
	"visual-accessibility",
	"cognition-eval",
	"persistence-reliability",
	"ci-security",
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
		"V1-RV-PERSISTENCE",
		"V1-RV-CI",
	];
	const reviews = disciplines.map((discipline, index) => {
		const reviewId = reviewIds[index];
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
				schemaVersion: "eonfolk-v1-structured-review-v1",
				reviewId,
				discipline,
				sourceSha: initialReviewSha,
				completedAt: `2026-08-23T00:0${index}:00.000Z`,
				conclusion: "FINDINGS",
				findings,
			}),
		);
		stored.set(storedArtifact.reference.path, storedArtifact.bytes);
		const attestationId = `review-run-${index}`;
		trustedRuns.set(attestationId, {
			attestationId,
			provider: "github-actions",
			repository: "owner/repo",
			runId: index + 10,
			runAttempt: 1,
			purpose: `review:${reviewId}`,
			sourceSha: initialReviewSha,
			payloadSha256: storedArtifact.reference.sha256,
		});
		return {
			reviewId,
			discipline,
			sourceSha: initialReviewSha,
			status: "COMPLETE",
			findings,
			artifact: storedArtifact.reference,
			trustedRun: { attestationId },
		};
	});
	const findingIds = reviews.flatMap((review) =>
		review.findings.p1.map((finding) => finding.id),
	);
	const dispositions = findingIds.map((findingId) => ({
		findingId,
		disposition: "ACCEPT",
		status: "CLOSED",
		evidenceRefs: [{ kind: "git-commit", sha: frozenSoftwareSha }],
	}));
	const reconciliationArtifact = artifact(
		"docs/exec-plans/evidence/003/release/reconciliation.json",
		JSON.stringify({
			schemaVersion: "eonfolk-v1-reconciliation-v1",
			initialReviewSha,
			frozenSoftwareSha,
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
			schemaVersion: "eonfolk-v1-final-confirmation-v1",
			status: "PASS",
			sourceSha: frozenSoftwareSha,
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
	trustedRuns.set("confirmation-run", {
		attestationId: "confirmation-run",
		provider: "github-actions",
		repository: "owner/repo",
		runId: 99,
		runAttempt: 1,
		purpose: "final-confirmation",
		sourceSha: frozenSoftwareSha,
		payloadSha256: confirmationArtifact.reference.sha256,
	});
	const report = {
		schemaVersion: "eonfolk-v1-review-confirmation-v3",
		status: "PASS",
		integrityClaim: "REPOSITORY_COMPUTABLE_INTEGRITY_ONLY",
		initialReviewSha,
		frozenSoftwareSha,
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
			trustedRun: { attestationId: "confirmation-run" },
		},
	};
	const signed = {
		...report,
		outputSha256: createHash("sha256")
			.update(JSON.stringify(report))
			.digest("hex"),
	};
	return {
		report: signed,
		context: {
			isAncestor: () => true,
			commitExists: () => true,
			treeSha: (sha: string) =>
				sha === initialReviewSha ? binding.baseTreeSha : binding.headTreeSha,
			fullDiffSha256: () => binding.diffSha256,
			deepEvidenceOutputSha256,
			trustedRuns,
			readArtifact: (path: string) => {
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
			trustedRuns,
			readArtifact: (path: string) => {
				const bytes =
					deep.stored.get(path) ?? reviews.context.readArtifact(path);
				if (bytes === undefined) throw new Error("missing");
				return bytes;
			},
		},
	};
}

describe("V1 readiness and generated inventory tooling", () => {
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
			"ready mode requires --trusted-attestations from the external GitHub trust root",
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
		expect(ready.status).toBe("V1 READY");
		expect(ready.frozenSoftwareSha).toBe(frozenSoftwareSha);
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
		const { outputSha256: _oldHash, ...linuxWithoutHash } = linux;
		linux.outputSha256 = createHash("sha256")
			.update(JSON.stringify(linuxWithoutHash))
			.digest("hex");
		expect(
			validateTargetMacDeepEvidence(linux, frozenSoftwareSha, {
				readArtifact: (path: string) =>
					linuxFixture.stored.get(path) as Uint8Array,
				trustedRuns: linuxFixture.trustedRuns,
			}).failures,
		).toContain("DEEP environment is not macOS");

		const duplicateFixture = reviewEvidence(
			initialReviewSha,
			frozenSoftwareSha,
		);
		const duplicate = duplicateFixture.report;
		duplicate.reviews[1].trustedRun = duplicate.reviews[0].trustedRun;
		const { outputSha256: _reviewHash, ...duplicateWithoutHash } = duplicate;
		duplicate.outputSha256 = createHash("sha256")
			.update(JSON.stringify(duplicateWithoutHash))
			.digest("hex");
		expect(
			validateReviewConfirmationEvidence(duplicate, duplicateFixture.context)
				.failures,
		).toContain("review trusted runs are not independent");

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
		expect(result.releaseEvidence.failures[0]).toContain("software");
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
			outputSha256: createHash("sha256")
				.update(JSON.stringify(tiny))
				.digest("hex"),
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
		const { outputSha256: _old, ...tamperedWithoutHash } = tampered;
		tampered.outputSha256 = createHash("sha256")
			.update(JSON.stringify(tamperedWithoutHash))
			.digest("hex");
		const failures = validateTargetMacDeepEvidence(tampered, head, {
			readArtifact: (path: string) =>
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
		const { outputSha256: _old, ...withoutHash } = fixture.report;
		fixture.report.outputSha256 = createHash("sha256")
			.update(JSON.stringify(withoutHash))
			.digest("hex");
		const failures = validateReviewConfirmationEvidence(fixture.report, {
			...fixture.context,
			isAncestor: () => false,
		}).failures;
		expect(failures).toContain(
			"initialReviewSha is not an ancestor of frozenSoftwareSha",
		);
		expect(failures).toContain("review is missing exact discipline reviewId");
		expect(failures).toContain(
			"review V1-RV-SYSTEMS artifact hash does not match",
		);
		expect(failures).toContain(
			"P0/P1 dispositions do not exactly cover review findings",
		);
	});

	it("requires a separately hashed fresh-confirmation artifact", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.confirmation.artifact.sha256 = "0".repeat(64);
		const { outputSha256: _old, ...withoutHash } = fixture.report;
		fixture.report.outputSha256 = createHash("sha256")
			.update(JSON.stringify(withoutHash))
			.digest("hex");
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain("fresh confirmation artifact hash does not match");
	});

	it("rejects a shrunk canonical GOAL roster", () => {
		const canonicalSource = goal("IN PROGRESS");
		const canonical = parseRequiredStateRows(canonicalSource);
		const shrunk = canonical.slice(0, 1);
		expect(validateCanonicalGoalRoster(shrunk, canonical)).toMatchObject({
			ok: false,
			failures: ["GOAL requirement ID roster differs from the canonical base"],
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

	it("rejects shared review artifacts, untrusted runs, and duplicate dispositions", () => {
		const shared = reviewEvidence("a".repeat(40), "b".repeat(40));
		shared.report.reviews[1].artifact = shared.report.reviews[0].artifact;
		shared.report.reconciliation.dispositions.push(
			shared.report.reconciliation.dispositions[0],
		);
		shared.report.reviews[2].trustedRun = { attestationId: "manufactured" };
		const { outputSha256: _old, ...withoutHash } = shared.report;
		shared.report.outputSha256 = hash(JSON.stringify(withoutHash));
		const failures = validateReviewConfirmationEvidence(
			shared.report,
			shared.context,
		).failures;
		expect(failures).toContain("review artifacts are duplicated");
		expect(failures).toContain(
			"finding disposition is unknown, duplicated, or malformed",
		);
		expect(failures).toContain(
			"review V1-RV-VISUAL is not bound to an externally trusted GitHub run",
		);
	});

	it("requires an explicit structured no-P0/P1 conclusion", () => {
		const fixture = reviewEvidence("a".repeat(40), "b".repeat(40));
		fixture.report.reviews[0].findings = { p0: [], p1: [] };
		const { outputSha256: _old, ...withoutHash } = fixture.report;
		fixture.report.outputSha256 = hash(JSON.stringify(withoutHash));
		expect(
			validateReviewConfirmationEvidence(fixture.report, fixture.context)
				.failures,
		).toContain(
			"review V1-RV-PRODUCT structured content does not match its declaration",
		);
	});

	it("supports squash/rebase main tree equivalence but still rejects software deltas", () => {
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
				readArtifact: (path: string) => {
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
	});

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
	});

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
		expect(first).toContain("Founder Alpha regression boundary");
		expect(first).toContain("INELIGIBLE FOR V1 READINESS");
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
