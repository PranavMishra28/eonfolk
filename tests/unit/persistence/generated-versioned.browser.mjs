import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

test("generated authority uses real Chromium IndexedDB event and snapshot stores", async () => {
	const server = await createServer({
		root: process.cwd(),
		logLevel: "silent",
		server: { host: "127.0.0.1", port: 0, strictPort: false },
	});
	await server.listen();
	const address = server.httpServer?.address();
	if (
		address === null ||
		address === undefined ||
		typeof address === "string"
	) {
		await server.close();
		throw new Error("Vite did not expose a local TCP port");
	}
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(
			`http://127.0.0.1:${address.port}/tests/unit/persistence/generated-versioned-harness.html`,
		);
		await page.waitForFunction(
			() => window.__generatedPersistenceResult !== undefined,
		);
		const envelope = await page.evaluate(
			() => window.__generatedPersistenceResult,
		);
		assert.equal(envelope?.error, undefined, envelope?.error);
		assert.deepEqual(envelope?.result, {
			civilizationDay: 365,
			civilizationEvents: 5,
			civilizationReplayHashMatches: true,
			corruptionCode: "STALE_STATE",
			recoveredIdempotently: true,
			restoredGenesisIdempotently: true,
			replayedCount: 3,
			replayedSuffixEvents: 1,
			retryIdempotent: true,
			revisionAfterAbort: 2,
			staleFenceCode: "STALE_FENCE",
			stores: [
				"authorityEvents",
				"authorityOperations",
				"authorityReceipts",
				"authoritySnapshots",
				"authorityStreams",
			],
		});
	} finally {
		await browser.close();
		await server.close();
	}
});
