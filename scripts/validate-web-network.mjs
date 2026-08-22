import { readFileSync } from "node:fs";

const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

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

export function validateWebNetworkOutput(
	output = "tmp/riverhold-playwright",
	allowedOrigin = "http://127.0.0.1:4174",
) {
	const routeLog = JSON.parse(readFileSync(`${output}/route-log.json`, "utf8"));
	if (!Array.isArray(routeLog) || routeLog.length === 0)
		throw new Error("empty Riverhold route log");
	for (const entry of routeLog) {
		if (
			entry.action !== "allow" ||
			typeof entry.url !== "string" ||
			!entry.url.startsWith(`${allowedOrigin}/`)
		)
			throw new Error(`external route attempt: ${JSON.stringify(entry)}`);
	}

	const netlog = JSON.parse(readFileSync(`${output}/netlog.json`, "utf8"));
	const evidence = inspectNetlogEgress(netlog);
	if (evidence.externalAttempts.length > 0)
		throw new Error(
			`external netlog attempt: ${evidence.externalAttempts.join(", ")}`,
		);
	if (evidence.localEvidence === 0)
		throw new Error("netlog lacks local preview evidence");
	return Object.freeze({
		routeRequestCount: routeLog.length,
		netlogEventCount: netlog.events.length,
	});
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
	const result = validateWebNetworkOutput();
	process.stdout.write(
		`Riverhold network oracles pass: ${result.routeRequestCount} routed requests, ${result.netlogEventCount} netlog events, zero external attempts\n`,
	);
}
