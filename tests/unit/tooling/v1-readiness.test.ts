import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
	evaluateV1Readiness,
	isAllowedPostFreezePath,
	parseRequiredStateRows,
	validateExactHeadEvidence,
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

function evidence(head: string, tier: "pr" | "deep" = "deep") {
	const measurements = (id: string) => {
		switch (id) {
			case "persistence-bounded":
				return {
					indexedDbAppendMedianMs: 1,
					indexedDbRecoveryMedianMs: 1,
					memoryAppendMedianMs: 1,
					memoryRecoveryMedianMs: 1,
				};
			case "diagnostics-source":
				return ["off", "local", "alpha"].map((mode) => ({
					mode,
					recordCallP95Ms: 0.1,
				}));
			case "diagnostics-browser":
				return ["off", "local", "alpha"].map((mode) => ({
					journeyMs: 1,
					maximumFrameP95Ms: 1,
					mode,
				}));
			case "release-genesis-web-performance":
				return ["desktop", "laptop", "mobile-emulation"].map((profile) => ({
					maximumMeaningfulWorldMs: 1,
					pooledFrameP95Ms: 1,
					profile,
				}));
			case "local-model-treatment":
				return { executions: 100, fallbacks: 0, warmP95Ms: 1 };
			default:
				throw new Error("unknown benchmark");
		}
	};
	const artifactFiles = [
		{
			path: "apps/web/dist/index.html",
			bytes: 10,
			sha256: "1".repeat(64),
		},
		...DEEP_BENCHMARK_CONTRACT.map((benchmark, index) => ({
			path: benchmark.path,
			bytes: 100 + index,
			sha256: String(index + 2).repeat(64),
		})),
	].sort((left, right) => left.path.localeCompare(right.path));
	const report = {
		schemaVersion: "eonfolk-verification-tier-v2",
		tier,
		status: "PASS",
		verificationContractSha256: verificationContractSha256(tier),
		source: {
			start: { commit: head, clean: true },
			end: { commit: head, clean: true },
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
			manifestSha256: createHash("sha256")
				.update(JSON.stringify(artifactFiles))
				.digest("hex"),
		},
		benchmarkEvidence:
			tier === "deep"
				? DEEP_BENCHMARK_CONTRACT.map((benchmark) => ({
						...benchmark,
						artifactSha256: artifactFiles.find(
							(file) => file.path === benchmark.path,
						)?.sha256,
						measurements: measurements(benchmark.id),
						status: "PASS",
					}))
				: [],
	};
	return {
		...report,
		outputSha256: createHash("sha256")
			.update(JSON.stringify(report))
			.digest("hex"),
	};
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

function reviewEvidence(initialReviewSha: string, frozenSoftwareSha: string) {
	const stored = new Map<string, Uint8Array>();
	const diffPaths = ["packages/sim/src/index.ts"];
	const diffPathsSha256 = createHash("sha256")
		.update(JSON.stringify(diffPaths))
		.digest("hex");
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
		const reviewerId = `agent-${index + 1}`;
		const findingId = `${reviewId}-P1-001`;
		const storedArtifact = artifact(
			`docs/reviews/${reviewId}.md`,
			`${initialReviewSha}\n${reviewId}\n${reviewerId}\n${findingId}\n`,
		);
		stored.set(storedArtifact.reference.path, storedArtifact.bytes);
		return {
			reviewId,
			reviewerId,
			discipline,
			sourceSha: initialReviewSha,
			status: "COMPLETE",
			findings: { p0: [], p1: [findingId] },
			artifact: storedArtifact.reference,
		};
	});
	const findingIds = reviews.flatMap((review) => review.findings.p1);
	const reconciliationArtifact = artifact(
		"docs/exec-plans/evidence/003/release/reconciliation.md",
		`${initialReviewSha}\n${frozenSoftwareSha}\n${findingIds.join("\n")}\n`,
	);
	const diffArtifact = artifact(
		"docs/exec-plans/evidence/003/release/final-diff.txt",
		`${initialReviewSha}\n${frozenSoftwareSha}\n${diffPathsSha256}\n`,
	);
	const confirmationArtifact = artifact(
		"docs/reviews/V1_CONFIRMATION.md",
		`${frozenSoftwareSha}\nagent-confirmation\nPASS\n`,
	);
	for (const storedArtifact of [
		reconciliationArtifact,
		diffArtifact,
		confirmationArtifact,
	])
		stored.set(storedArtifact.reference.path, storedArtifact.bytes);
	const report = {
		schemaVersion: "eonfolk-v1-review-confirmation-v2",
		status: "PASS",
		initialReviewSha,
		frozenSoftwareSha,
		reviews,
		reconciliation: {
			unrepairedP0: 0,
			unrepairedP1: 0,
			sourceSha: initialReviewSha,
			finalSoftwareSha: frozenSoftwareSha,
			dispositions: findingIds.map((findingId) => ({
				findingId,
				disposition: "ACCEPT",
				status: "CLOSED",
				evidenceRefs: ["focused regression"],
			})),
			artifact: reconciliationArtifact.reference,
			finalDiff: {
				baseSha: initialReviewSha,
				headSha: frozenSoftwareSha,
				pathCount: diffPaths.length,
				pathsSha256: diffPathsSha256,
				artifact: diffArtifact.reference,
			},
		},
		confirmation: {
			status: "PASS",
			sourceSha: frozenSoftwareSha,
			reviewerId: "agent-confirmation",
			artifact: confirmationArtifact.reference,
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
			diffPaths: () => diffPaths,
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

describe("V1 readiness and generated inventory tooling", () => {
	it("parses only required software rows and rejects unknown states", () => {
		expect(parseRequiredStateRows(goal("IN PROGRESS"))).toEqual([
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

	it("requires frozen target-Mac DEEP, six reviews, reconciliation, and confirmation", () => {
		const initialReviewSha = "a".repeat(40);
		const frozenSoftwareSha = "b".repeat(40);
		const head = "c".repeat(40);
		const deep = evidence(frozenSoftwareSha);
		const reviews = reviewEvidence(initialReviewSha, frozenSoftwareSha);
		const incomplete = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("IN PROGRESS")),
			mode: "ready",
			deepEvidence: deep,
			reviewEvidence: reviews.report,
			reviewValidationContext: { ...reviews.context, currentHead: head },
			head,
			testedIdentity: candidateIdentity(initialReviewSha, head),
			postFreeze: { ancestor: true, paths: ["GOAL.md"] },
		});
		expect(incomplete.status).toBe("V1 INCOMPLETE");

		const wrongHead = validateExactHeadEvidence(
			evidence(frozenSoftwareSha),
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
			reviewValidationContext: { ...reviews.context, currentHead: head },
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
		const pr = evidence(frozenSoftwareSha, "pr");
		expect(validateTargetMacDeepEvidence(pr, frozenSoftwareSha)).toMatchObject({
			ok: false,
		});
		const linux = evidence(frozenSoftwareSha);
		linux.environment.host = "linux 6.0.0 x64";
		const { outputSha256: _oldHash, ...linuxWithoutHash } = linux;
		linux.outputSha256 = createHash("sha256")
			.update(JSON.stringify(linuxWithoutHash))
			.digest("hex");
		expect(
			validateTargetMacDeepEvidence(linux, frozenSoftwareSha).failures,
		).toContain("DEEP environment is not macOS");

		const duplicateFixture = reviewEvidence(
			initialReviewSha,
			frozenSoftwareSha,
		);
		const duplicate = duplicateFixture.report;
		duplicate.reviews[1].reviewerId = duplicate.reviews[0].reviewerId;
		const { outputSha256: _reviewHash, ...duplicateWithoutHash } = duplicate;
		duplicate.outputSha256 = createHash("sha256")
			.update(JSON.stringify(duplicateWithoutHash))
			.digest("hex");
		expect(
			validateReviewConfirmationEvidence(duplicate, duplicateFixture.context)
				.failures,
		).toContain("reviewers are not independent");

		expect(isAllowedPostFreezePath("docs/reviews/V1.md")).toBe(true);
		expect(isAllowedPostFreezePath("packages/sim/src/index.ts")).toBe(false);
		const reviewFixture = reviewEvidence(initialReviewSha, frozenSoftwareSha);
		const result = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: evidence(frozenSoftwareSha),
			reviewEvidence: reviewFixture.report,
			reviewValidationContext: {
				...reviewFixture.context,
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
		const reviews = reviewEvidence(baseSha, frozenSoftwareSha);
		const ready = evaluateV1Readiness({
			rows: parseRequiredStateRows(goal("VERIFIED")),
			mode: "ready",
			deepEvidence: evidence(frozenSoftwareSha),
			reviewEvidence: reviews.report,
			reviewValidationContext: {
				...reviews.context,
				currentHead: testedSha,
				parents: () => [baseSha, candidateSha],
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
			schemaVersion: "eonfolk-verification-tier-v2",
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

		const tampered = evidence(head);
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
		const failures = validateTargetMacDeepEvidence(tampered, head).failures;
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
		expect(failures).toContain("review is missing reviewId");
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
