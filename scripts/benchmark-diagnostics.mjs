import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createServer } from "vite";

export const DIAGNOSTICS_BENCHMARK_VERSION = "eonfolk-diagnostics-overhead-v1";

const MODES = ["off", "local", "alpha"];
const REPETITIONS = 7;
const WARMUP_CALLS = 1_024;
const MEASURED_CALLS = 4_096;
const MODE_LIMITS = Object.freeze({
	off: Object.freeze({
		maximumEvents: 128,
		maximumBytes: 128 * 1024,
		maximumP95RecordCallMs: 0.5,
	}),
	local: Object.freeze({
		maximumEvents: 2_048,
		maximumBytes: 2 * 1024 * 1024,
		maximumP95RecordCallMs: 1,
	}),
	alpha: Object.freeze({
		maximumEvents: 512,
		maximumBytes: 512 * 1024,
		maximumP95RecordCallMs: 1,
	}),
});

const SOURCE_FILES = [
	"packages/diagnostics/src/fingerprint.ts",
	"packages/diagnostics/src/recorder.ts",
	"packages/diagnostics/src/redaction.ts",
	"packages/diagnostics/src/ring-buffer.ts",
	"packages/diagnostics/src/types.ts",
	"packages/protocol/src/canonical.ts",
	"scripts/benchmark-diagnostics.mjs",
];

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function percentile(values, fraction) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export function summarizeDurations(values) {
	if (values.length === 0)
		return Object.freeze({ count: 0, p50Ms: null, p95Ms: null, worstMs: null });
	return Object.freeze({
		count: values.length,
		p50Ms: percentile(values, 0.5),
		p95Ms: percentile(values, 0.95),
		worstMs: Math.max(...values),
	});
}

function eventInput(index) {
	if (index % 64 === 0) {
		return {
			category: "worker",
			name: "benchmark-failure",
			severity: "error",
			outcome: "failed",
			scope: { component: "benchmark", runId: "fixed-run" },
			fields: {
				code: "benchmark-failure",
				attempt: index % 4,
				phase: "measured",
			},
		};
	}
	return {
		category: "command",
		name: "benchmark-command",
		severity: "info",
		outcome: "observed",
		scope: { component: "benchmark", runId: "fixed-run" },
		fields: {
			operation: "observe",
			phase: "measured",
			revision: index,
			sequence: index,
		},
	};
}

function snapshotMaximum(snapshots, field) {
	return Math.max(
		...snapshots.map((snapshot) =>
			field === "events" ? snapshot.events.length : snapshot[field],
		),
	);
}

async function measureMode(FlightRecorder, mode) {
	const callDurations = [];
	const freezeDurations = [];
	const snapshots = [];
	let modeledMinuteBytes = null;
	for (let repetition = 0; repetition < REPETITIONS; repetition += 1) {
		let tick = 0;
		const warmup = new FlightRecorder({ mode, now: () => tick++ });
		for (let index = 0; index < WARMUP_CALLS; index += 1)
			warmup.record(eventInput(index));

		tick = 0;
		const recorder = new FlightRecorder({ mode, now: () => tick++ });
		let minuteBytes = 0;
		for (let index = 0; index < MEASURED_CALLS; index += 1) {
			const started = performance.now();
			const recorded = recorder.record(eventInput(index));
			callDurations.push(performance.now() - started);
			if (index < 60 && recorded !== null)
				minuteBytes += Buffer.byteLength(JSON.stringify(recorded));
		}
		modeledMinuteBytes ??= minuteBytes;
		if (modeledMinuteBytes !== minuteBytes)
			throw new Error(`${mode} modeled-minute serialization was not stable`);
		const trigger = recorder.record(eventInput(MEASURED_CALLS));
		if (trigger === null)
			throw new Error(`${mode} did not retain freeze trigger`);
		const freezeStarted = performance.now();
		await recorder.freeze({
			reason: "explicit-capture",
			trigger,
			safeSummary: "bounded benchmark capture",
			recovery: "not-attempted",
		});
		freezeDurations.push(performance.now() - freezeStarted);
		snapshots.push(recorder.snapshot());
	}
	const recordCall = summarizeDurations(callDurations);
	const freeze = summarizeDurations(freezeDurations);
	const limits = MODE_LIMITS[mode];
	const maximumEvents = snapshotMaximum(snapshots, "events");
	const maximumBytes = snapshotMaximum(snapshots, "byteLength");
	const assertions = Object.freeze({
		recordCallP95: Object.freeze({
			observedMs: recordCall.p95Ms,
			maximumMs: limits.maximumP95RecordCallMs,
			pass: recordCall.p95Ms <= limits.maximumP95RecordCallMs,
		}),
		liveEvents: Object.freeze({
			observed: maximumEvents,
			maximum: limits.maximumEvents,
			pass: maximumEvents <= limits.maximumEvents,
		}),
		liveBytes: Object.freeze({
			observed: maximumBytes,
			maximum: limits.maximumBytes,
			pass: maximumBytes <= limits.maximumBytes,
		}),
	});
	return Object.freeze({
		mode,
		identity: Object.freeze({
			diagnosticMode: mode,
			diagnosticSchema: snapshots[0].schemaVersion,
			redactionPolicy: snapshots[0].redactionPolicyVersion,
		}),
		recordCall,
		freeze,
		modeledSerializedBytesPerMinuteAt60Calls: modeledMinuteBytes,
		modeledRateGate:
			"INFORMATIONAL — the authority contract defines bounded live bytes, not a bytes/minute ceiling",
		maximumSnapshot: Object.freeze({
			events: maximumEvents,
			bytes: maximumBytes,
			droppedEvents: snapshotMaximum(snapshots, "droppedEvents"),
		}),
		assertions,
		pass: Object.values(assertions).every((assertion) => assertion.pass),
	});
}

function parseArguments(argv) {
	let output = null;
	let allowDirty = false;
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--") continue;
		if (argument === "--allow-dirty") allowDirty = true;
		else if (argument === "--output") {
			output = argv[index + 1] ?? null;
			index += 1;
		} else throw new Error(`unknown argument: ${argument}`);
	}
	return { allowDirty, output };
}

async function run() {
	const arguments_ = parseArguments(process.argv.slice(2));
	const dirty = git("status", "--porcelain").length > 0;
	if (dirty && !arguments_.allowDirty)
		throw new Error(
			"diagnostics benchmark requires a clean tree; --allow-dirty produces SMOKE_ONLY evidence",
		);
	const expectedNode = JSON.parse(readFileSync(resolve("package.json"), "utf8"))
		.engines.node;
	const runtimeMatches =
		process.versions.node === expectedNode && arch() === "arm64";
	if (!runtimeMatches && !arguments_.allowDirty)
		throw new Error(
			`diagnostics benchmark requires Node ${expectedNode} arm64; found ${process.versions.node} ${arch()}`,
		);

	const sourceManifest = SOURCE_FILES.map((path) => ({
		path,
		sha256: sha256(readFileSync(resolve(path))),
	}));
	const workload = Object.freeze({
		version: DIAGNOSTICS_BENCHMARK_VERSION,
		repetitions: REPETITIONS,
		warmupCallsPerRepetition: WARMUP_CALLS,
		measuredCallsPerRepetition: MEASURED_CALLS,
		modeledCallsPerMinute: 60,
		failureEveryCalls: 64,
		workloadSha256: sha256(
			JSON.stringify(
				Array.from({ length: MEASURED_CALLS }, (_, index) => eventInput(index)),
			),
		),
	});

	const vite = await createServer({
		root: process.cwd(),
		logLevel: "error",
		appType: "custom",
		server: { middlewareMode: true },
	});
	let modes;
	try {
		const diagnostics = await vite.ssrLoadModule(
			"/packages/diagnostics/src/index.ts",
		);
		modes = [];
		for (const mode of MODES)
			modes.push(await measureMode(diagnostics.FlightRecorder, mode));
	} finally {
		await vite.close();
	}

	const microGatesPass = modes.every((mode) => mode.pass);
	const acceptanceEligible = !dirty && runtimeMatches;
	const result = Object.freeze({
		schemaVersion: "eonfolk-diagnostics-overhead-evidence-v1",
		status:
			microGatesPass && acceptanceEligible
				? "PASS"
				: microGatesPass
					? "SMOKE_ONLY"
					: "FAIL",
		claimBoundary:
			"Deterministic source-level recorder workload only; this does not satisfy integrated browser frame, input, display, network, persistence, or physical-device gates.",
		recordedAt: new Date().toISOString(),
		source: Object.freeze({
			commit: git("rev-parse", "HEAD"),
			clean: !dirty,
			lockfileSha256: sha256(readFileSync(resolve("pnpm-lock.yaml"))),
			sourceManifest,
			sourceManifestSha256: sha256(JSON.stringify(sourceManifest)),
		}),
		runtime: Object.freeze({
			node: process.versions.node,
			expectedNode,
			architecture: arch(),
			platform: platform(),
			release: release(),
			matchesRepositoryRuntime: runtimeMatches,
		}),
		workload,
		modes,
		unsupported: Object.freeze({
			browserFrameP95: "UNSUPPORTED_IN_SOURCE_MICROBENCHMARK",
			frameRegressionByMode: "UNSUPPORTED_IN_SOURCE_MICROBENCHMARK",
			longTasks: "UNSUPPORTED_IN_SOURCE_MICROBENCHMARK",
			inputLatency: "UNSUPPORTED_IN_SOURCE_MICROBENCHMARK",
			meaningfulWorldDisplay: "UNSUPPORTED_IN_SOURCE_MICROBENCHMARK",
			heap: "UNSUPPORTED_WITHOUT_INTRUSIVE_GC_INSTRUMENTATION",
			alphaUpload: "NOT_IMPLEMENTED_AND_NOT_RUN",
			physicalDevice: "NOT_RUN",
		}),
	});
	const serialized = `${JSON.stringify(result, null, 2)}\n`;
	if (arguments_.output === null) process.stdout.write(serialized);
	else writeFileSync(resolve(arguments_.output), serialized, { flag: "w" });
	if (result.status === "FAIL") process.exitCode = 1;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) await run();
