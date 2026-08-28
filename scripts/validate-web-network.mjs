import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const NETLOG_NAME = /^(?:netlog|netlog-w\d+)\.json$/u;
const ROUTE_LOG_NAME = /^(?:route-log|route-log-w\d+)\.json$/u;

export function inspectNetlogEgress(netlog) {
	if (!Array.isArray(netlog.events) || netlog.events.length === 0)
		throw new Error("empty Chromium netlog");
	const networkConfigurationEventType =
		netlog.constants?.logEventTypes?.NETWORK_MAC_OS_CONFIG_CHANGED;
	const external = new Set();
	let localEvidence = 0;
	const inspect = (value, key = "") => {
		if (Array.isArray(value)) {
			for (const item of value) inspect(item, key);
			return;
		}
		if (value && typeof value === "object") {
			for (const [childKey, child] of Object.entries(value))
				inspect(child, childKey);
			return;
		}
		if (typeof value !== "string") return;
		if (
			!/^(?:url|destination|logical_destination|host|hostname|address|endpoint)$/i.test(
				key,
			)
		)
			return;
		for (const match of value.matchAll(/(?:https?|wss?):\/\/[^\s"'<>]+/g)) {
			try {
				const url = new URL(match[0]);
				if (localHosts.has(url.hostname)) localEvidence += 1;
				else external.add(`${key}:${url.hostname}`);
			} catch {
				external.add(`${key}:${match[0]}`);
			}
		}
		if (/host|hostname|address|endpoint|destination/i.test(key)) {
			const candidate = value
				.replace(/^\[/, "")
				.replace(/\]$/, "")
				.replace(/:\d+$/, "");
			if (candidate === "~notfound") return;
			if (/^[A-Za-z0-9.-]+$/.test(candidate) && candidate.includes(".")) {
				if (localHosts.has(candidate)) localEvidence += 1;
				else external.add(`${key}:${candidate}`);
			}
		}
	};
	for (const event of netlog.events) {
		if (event.type === networkConfigurationEventType) continue;
		inspect(event.params ?? {});
	}
	return Object.freeze({
		externalAttempts: Object.freeze([...external].sort()),
		localEvidence,
	});
}

function listArtifactFiles(output, pattern) {
	let names;
	try {
		names = readdirSync(output);
	} catch (error) {
		if (error?.code === "ENOENT")
			throw new Error(`missing Playwright output directory: ${output}`);
		throw error;
	}
	return names.filter((name) => pattern.test(name)).sort();
}

function readJsonArtifact(output, name, label) {
	const path = join(output, name);
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		throw new Error(`invalid ${label}: ${name}`);
	}
}

export function validateWebNetworkOutput(
	output = "tmp/dawnmere-playwright",
	allowedOrigin = "http://127.0.0.1:4174",
) {
	const routeLogNames = listArtifactFiles(output, ROUTE_LOG_NAME);
	if (routeLogNames.length === 0) throw new Error("empty Dawnmere route log");
	const routeLog = [];
	for (const name of routeLogNames) {
		const entries = readJsonArtifact(output, name, "Dawnmere route log");
		if (!Array.isArray(entries) || entries.length === 0)
			throw new Error(`empty Dawnmere route log: ${name}`);
		routeLog.push(...entries);
	}
	for (const entry of routeLog) {
		if (
			entry.action !== "allow" ||
			typeof entry.url !== "string" ||
			!entry.url.startsWith(`${allowedOrigin}/`)
		)
			throw new Error(`external route attempt: ${JSON.stringify(entry)}`);
	}

	const netlogNames = listArtifactFiles(output, NETLOG_NAME);
	if (netlogNames.length === 0) throw new Error("empty Chromium netlog");
	let netlogEventCount = 0;
	for (const name of netlogNames) {
		const netlog = readJsonArtifact(output, name, "Chromium netlog");
		const evidence = inspectNetlogEgress(netlog);
		if (evidence.externalAttempts.length > 0)
			throw new Error(
				`external netlog attempt: ${evidence.externalAttempts.join(", ")}`,
			);
		if (evidence.localEvidence === 0)
			throw new Error(`netlog lacks local preview evidence: ${name}`);
		netlogEventCount += netlog.events.length;
	}
	return Object.freeze({
		routeRequestCount: routeLog.length,
		netlogEventCount,
		routeLogFiles: routeLogNames.length,
		netlogFiles: netlogNames.length,
	});
}

export function validateViewportEvidence(output = "tmp/dawnmere-playwright") {
	const files = readdirSync(output, { recursive: true }).map(String);
	const expected = [
		"world-1728x1117.png",
		"world-1366x768.png",
		"world-390x844.png",
	];
	for (const filename of expected) {
		const matches = files.filter((path) => path.endsWith(filename));
		if (matches.length !== 1)
			throw new Error(
				`browser evidence requires exactly one ${filename}; found ${matches.length}`,
			);
	}
	return Object.freeze({ viewports: Object.freeze(expected) });
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
	const result = validateWebNetworkOutput();
	const viewportEvidence = process.argv.includes("--require-viewports")
		? validateViewportEvidence()
		: null;
	process.stdout.write(
		`Dawnmere network oracles pass: ${result.routeRequestCount} routed requests, ${result.netlogEventCount} netlog events, ${result.netlogFiles} worker netlogs, zero external attempts${viewportEvidence === null ? "" : "; three required viewport captures present"}\n`,
	);
}
