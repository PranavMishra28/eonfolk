import { readFileSync } from "node:fs";

const output = "tmp/gate-0-playwright";
const routeLog = JSON.parse(readFileSync(`${output}/route-log.json`, "utf8"));
if (!Array.isArray(routeLog) || routeLog.length === 0)
	throw new Error("empty Gate 0 route log");
const allowedOrigin = "http://127.0.0.1:4173";
for (const entry of routeLog) {
	if (
		entry.action !== "allow" ||
		typeof entry.url !== "string" ||
		!entry.url.startsWith(`${allowedOrigin}/`)
	)
		throw new Error(`external route attempt: ${JSON.stringify(entry)}`);
	const url = new URL(entry.url);
	if (
		!/^(?:\/(?:observer|product)\/[^/]+|\/assets\/[A-Za-z0-9_-]+\.(?:js|css)|\/)$/.test(
			url.pathname,
		)
	)
		throw new Error(`route outside frozen preview allowlist: ${entry.url}`);
}

const netlog = JSON.parse(readFileSync(`${output}/netlog.json`, "utf8"));
if (!Array.isArray(netlog.events) || netlog.events.length === 0)
	throw new Error("empty Chromium netlog");
const external = new Set();
const localUrls = new Set();
let localEvidence = 0;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
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
			if (localHosts.has(url.hostname)) {
				localEvidence += 1;
				localUrls.add(url.href);
			} else external.add(`${key}:${url.hostname}`);
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
for (const event of netlog.events) inspect(event.params ?? {});
if (external.size > 0)
	throw new Error(
		`external netlog attempt: ${[...external].sort().join(", ")}`,
	);
if (localEvidence === 0) throw new Error("netlog lacks local preview evidence");
for (const value of localUrls) {
	const url = new URL(value);
	if (
		!/^(?:\/(?:observer|product)\/[^/]+|\/assets\/[A-Za-z0-9_-]+\.(?:js|css)|\/ListAccounts|\/)$/.test(
			url.pathname,
		)
	)
		throw new Error(`netlog URL outside frozen preview allowlist: ${value}`);
}
process.stdout.write(
	`Gate 0 network oracles pass: ${routeLog.length} routed requests, ${netlog.events.length} netlog events, zero external attempts\n`,
);
