import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

test("IndexedDB adapter persists atomically across a browser reload", async () => {
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
			`http://127.0.0.1:${address.port}/tests/unit/persistence/indexeddb-harness.html`,
		);
		await page.waitForFunction(() => window.__idbResult !== undefined);
		const envelope = await page.evaluate(() => window.__idbResult);
		assert.equal(envelope?.error, undefined, envelope?.error);
		const result = envelope?.result;
		assert.deepEqual(result, {
			collisionCode: "IDEMPOTENCY_COLLISION",
			eventSequences: [1, 2, 3],
			receiptAfterAbort: null,
			recoveredAfterCommitCrash: true,
			revisionAfterAbort: 1,
			retryIdempotent: true,
			revision: 2,
			stores: [
				"batches",
				"catchUpOperations",
				"commandReceipts",
				"decisionRecords",
				"events",
				"experimentManifests",
				"snapshots",
				"worlds",
			],
			expectedStores: [
				"experimentManifests",
				"worlds",
				"batches",
				"events",
				"decisionRecords",
				"commandReceipts",
				"catchUpOperations",
				"snapshots",
			],
		});
	} finally {
		await browser.close();
		await server.close();
	}
});
