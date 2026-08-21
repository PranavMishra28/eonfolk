import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { isIP } from "node:net";
import { relative, resolve, sep } from "node:path";

export const PHYSICAL_EVIDENCE_VERSION = "eonfolk-physical-device-evidence-v1";
const STATES = ["arrival", "busy-market", "chronicle"];
const JOURNEY_CHECKS = [
	"citizenSelection",
	"identityReview",
	"counsel",
	"returnSummary",
	"chronicleNavigation",
	"replayControls",
	"reducedMotion",
	"semanticFallback",
];

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function percentile(values, fraction) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function assertExactKeys(value, expected, label) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new TypeError(`${label} must be an object`);
	const keys = Object.keys(value).sort();
	const wanted = [...expected].sort();
	if (JSON.stringify(keys) !== JSON.stringify(wanted))
		throw new TypeError(`${label} keys must be exactly: ${wanted.join(", ")}`);
}

function privateIpv4(hostname) {
	if (isIP(hostname) !== 4) return false;
	const [a, b] = hostname.split(".").map(Number);
	return (
		a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
	);
}

export function validatePhysicalObservation(input) {
	assertExactKeys(
		input,
		[
			"buildManifestSha256",
			"device",
			"endedAt",
			"externalRequestCount",
			"frameDeltasMs",
			"journey",
			"meaningfulWorldMs",
			"origin",
			"runId",
			"schemaVersion",
			"startedAt",
			"thermal",
		],
		"observation",
	);
	if (input.schemaVersion !== "eonfolk-physical-device-observation-v1")
		throw new TypeError("unsupported observation schemaVersion");
	if (!/^[a-z0-9][a-z0-9._:-]{2,63}$/u.test(input.runId))
		throw new TypeError("runId must be a bounded safe identifier");
	if (!/^[a-f0-9]{64}$/u.test(input.buildManifestSha256))
		throw new TypeError("buildManifestSha256 must be lowercase SHA-256");
	assertExactKeys(
		input.device,
		[
			"browser",
			"devicePixelRatio",
			"model",
			"os",
			"screenHeight",
			"screenWidth",
		],
		"device",
	);
	for (const key of ["browser", "model", "os"])
		if (
			typeof input.device[key] !== "string" ||
			input.device[key].length < 1 ||
			input.device[key].length > 96
		)
			throw new TypeError(`device.${key} must be a bounded string`);
	for (const key of ["devicePixelRatio", "screenHeight", "screenWidth"])
		if (
			!Number.isFinite(input.device[key]) ||
			input.device[key] <= 0 ||
			(key === "devicePixelRatio"
				? input.device[key] > 8
				: !Number.isSafeInteger(input.device[key]) ||
					input.device[key] > 10_000)
		)
			throw new TypeError(`device.${key} must be positive`);
	const origin = new URL(input.origin);
	if (
		origin.protocol !== "http:" ||
		origin.port !== "4173" ||
		origin.pathname !== "/" ||
		origin.username !== "" ||
		origin.password !== "" ||
		origin.search !== "" ||
		origin.hash !== "" ||
		!privateIpv4(origin.hostname)
	)
		throw new TypeError(
			"origin must be an RFC1918 http:// address on port 4173",
		);
	if (
		!Number.isFinite(input.meaningfulWorldMs) ||
		input.meaningfulWorldMs < 0 ||
		input.meaningfulWorldMs > 3_600_000
	)
		throw new TypeError("meaningfulWorldMs must be nonnegative");
	if (
		!Number.isSafeInteger(input.externalRequestCount) ||
		input.externalRequestCount < 0
	)
		throw new TypeError("externalRequestCount must be a nonnegative integer");
	assertExactKeys(input.frameDeltasMs, STATES, "frameDeltasMs");
	for (const state of STATES) {
		const samples = input.frameDeltasMs[state];
		if (
			!Array.isArray(samples) ||
			samples.length < 120 ||
			samples.length > 20_000
		)
			throw new TypeError(`frameDeltasMs.${state} needs 120–20000 raw samples`);
		if (
			samples.some(
				(sample) => !Number.isFinite(sample) || sample < 0 || sample > 60_000,
			)
		)
			throw new TypeError(`frameDeltasMs.${state} contains an invalid sample`);
	}
	assertExactKeys(input.journey, JOURNEY_CHECKS, "journey");
	if (JOURNEY_CHECKS.some((key) => typeof input.journey[key] !== "boolean"))
		throw new TypeError("journey values must be boolean observations");
	assertExactKeys(input.thermal, ["end", "start", "support"], "thermal");
	if (typeof input.thermal.support !== "boolean")
		throw new TypeError("thermal.support must be boolean");
	for (const key of ["start", "end"])
		if (
			typeof input.thermal[key] !== "string" ||
			!["nominal", "fair", "serious", "critical", "unsupported"].includes(
				input.thermal[key],
			)
		)
			throw new TypeError(`thermal.${key} is invalid`);
	if (
		(input.thermal.support &&
			(input.thermal.start === "unsupported" ||
				input.thermal.end === "unsupported")) ||
		(!input.thermal.support &&
			(input.thermal.start !== "unsupported" ||
				input.thermal.end !== "unsupported"))
	)
		throw new TypeError("thermal support and values disagree");
	for (const key of ["startedAt", "endedAt"])
		if (
			typeof input[key] !== "string" ||
			Number.isNaN(Date.parse(input[key])) ||
			new Date(input[key]).toISOString() !== input[key]
		)
			throw new TypeError(`${key} must be a canonical ISO timestamp`);
	if (Date.parse(input.endedAt) <= Date.parse(input.startedAt))
		throw new TypeError("endedAt must follow startedAt");
	return input;
}

function buildManifest() {
	const root = resolve("apps/web/dist");
	if (!existsSync(root)) return null;
	const entries = [];
	const walk = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = resolve(directory, entry.name);
			if (entry.isDirectory()) walk(absolute);
			else if (entry.isFile()) {
				const bytes = readFileSync(absolute);
				entries.push({
					path: relative(root, absolute).split(sep).join("/"),
					bytes: statSync(absolute).size,
					sha256: sha256(bytes),
				});
			}
		}
	};
	walk(root);
	entries.sort((left, right) =>
		left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
	);
	const manifest = entries
		.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}\n`)
		.join("");
	return Object.freeze({
		files: entries.length,
		totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
		sha256: sha256(manifest),
	});
}

export function summarizePhysicalObservation(input) {
	const observation = validatePhysicalObservation(input);
	const frames = Object.fromEntries(
		STATES.map((state) => {
			const values = observation.frameDeltasMs[state];
			return [
				state,
				Object.freeze({
					samples: values.length,
					p50Ms: percentile(values, 0.5),
					p95Ms: percentile(values, 0.95),
					worstMs: Math.max(...values),
					pass: percentile(values, 0.95) <= 33.3,
				}),
			];
		}),
	);
	const assertions = Object.freeze({
		meaningfulWorld: Object.freeze({
			observedMs: observation.meaningfulWorldMs,
			maximumMs: 5_000,
			pass: observation.meaningfulWorldMs <= 5_000,
		}),
		frames: Object.freeze({
			maximumP95Ms: 33.3,
			pass: Object.values(frames).every((state) => state.pass),
		}),
		journey: Object.freeze({
			pass: JOURNEY_CHECKS.every((key) => observation.journey[key]),
		}),
		egress: Object.freeze({
			observedExternalRequests: observation.externalRequestCount,
			maximumExternalRequests: 0,
			pass: observation.externalRequestCount === 0,
		}),
		thermal: Object.freeze({
			supported: observation.thermal.support,
			observedEnd: observation.thermal.end,
			pass:
				!observation.thermal.support ||
				observation.thermal.end === "nominal" ||
				observation.thermal.end === "fair",
		}),
	});
	return Object.freeze({
		frames: Object.freeze(frames),
		assertions,
		pass: Object.values(assertions).every((assertion) => assertion.pass),
	});
}

function parseArguments(argv) {
	let input = null;
	let output = null;
	let allowDirty = false;
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--") continue;
		if (argument === "--allow-dirty") allowDirty = true;
		else if (argument === "--input" || argument === "--output") {
			const value = argv[index + 1];
			if (!value) throw new TypeError(`${argument} requires a path`);
			if (argument === "--input") input = value;
			else output = value;
			index += 1;
		} else throw new TypeError(`unknown argument: ${argument}`);
	}
	return { allowDirty, input, output };
}

function sourceIdentity() {
	return Object.freeze({
		commit: git("rev-parse", "HEAD"),
		clean: git("status", "--porcelain").length === 0,
		lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
	});
}

function observationTemplate(build) {
	return Object.freeze({
		schemaVersion: "eonfolk-physical-device-observation-v1",
		runId: null,
		buildManifestSha256: build?.sha256 ?? null,
		device: Object.freeze({
			model: null,
			os: null,
			browser: null,
			screenWidth: null,
			screenHeight: null,
			devicePixelRatio: null,
		}),
		origin: null,
		startedAt: null,
		endedAt: null,
		meaningfulWorldMs: null,
		frameDeltasMs: Object.freeze({
			arrival: Object.freeze([]),
			"busy-market": Object.freeze([]),
			chronicle: Object.freeze([]),
		}),
		journey: Object.freeze(
			Object.fromEntries(JOURNEY_CHECKS.map((key) => [key, null])),
		),
		externalRequestCount: null,
		thermal: Object.freeze({ support: null, start: null, end: null }),
	});
}

async function run() {
	const arguments_ = parseArguments(process.argv.slice(2));
	const source = sourceIdentity();
	if (!source.clean && !arguments_.allowDirty)
		throw new Error(
			"physical evidence must bind to a clean tree; --allow-dirty can only create a NOT_RUN template",
		);
	const build = buildManifest();
	let record;
	if (arguments_.input === null) {
		record = Object.freeze({
			schemaVersion: PHYSICAL_EVIDENCE_VERSION,
			status: "NOT_RUN",
			claimBoundary:
				"No physical-device performance, thermal, touch, accessibility, or network result has been observed.",
			generatedAt: new Date().toISOString(),
			source,
			build,
			requiredCommand:
				"pnpm build && pnpm --filter @eonfolk/web preview --host 0.0.0.0 --port 4173",
			protocol:
				"Restrict the host firewall to the trusted device/LAN, sample the exact built manifest, inspect preview/network logs, then validate a manual observation with --input.",
			observationTemplate: observationTemplate(build),
			unsupported: Object.freeze({
				physicalFrameTiming: "NOT_RUN",
				physicalMeaningfulWorld: "NOT_RUN",
				thermal: "NOT_RUN",
				touchJourney: "NOT_RUN",
			}),
		});
	} else {
		if (!source.clean)
			throw new Error(
				"a completed physical observation cannot use a dirty tree",
			);
		if (build === null)
			throw new Error(
				"apps/web/dist is absent; run pnpm build before recording",
			);
		const observation = validatePhysicalObservation(
			(() => {
				const inputPath = resolve(arguments_.input);
				if (statSync(inputPath).size > 2 * 1024 * 1024)
					throw new Error("physical observation exceeds 2 MiB");
				return JSON.parse(readFileSync(inputPath, "utf8"));
			})(),
		);
		if (observation.buildManifestSha256 !== build.sha256)
			throw new Error(
				"observation build manifest does not match apps/web/dist",
			);
		const summary = summarizePhysicalObservation(observation);
		record = Object.freeze({
			schemaVersion: PHYSICAL_EVIDENCE_VERSION,
			status: summary.pass ? "PASS" : "FAIL",
			claimBoundary:
				"Manual physical-device observation; validated and source-bound, but not independently reproduced or pooled with canonical emulation.",
			recordedAt: new Date().toISOString(),
			source,
			build,
			observation,
			summary,
		});
	}
	const serialized = `${JSON.stringify(record, null, 2)}\n`;
	if (arguments_.output === null) process.stdout.write(serialized);
	else writeFileSync(resolve(arguments_.output), serialized, { flag: "w" });
	if (record.status === "FAIL") process.exitCode = 1;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) await run();
