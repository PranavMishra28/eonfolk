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
			validatedSession: {
				fullValidationReads: 2,
				preCommitFailureCaught: true,
				revisionAfterPreCommitFailure: 0,
				postCommitFailureCaught: true,
				revisionAfterPostCommitFailure: 1,
				persistedRevision: 2,
				persistedEvents: 2,
				persistedReceipt: true,
				activeSessionCloseCode: "INVALID_INPUT",
				concurrentWriteCode: "STALE_REVISION",
				concurrentChangeCode: "STALE_REVISION",
				postConcurrentFencingToken: 2,
				corruptionCode: "STALE_STATE",
				corruptionWriteCode: "STALE_REVISION",
				corruptionWriteAtomic: true,
				postSessionCorruptionCode: "STALE_STATE",
			},
			boundaryFailures: {
				open: true,
				quota: true,
				read: true,
				transactionAbort: true,
				upgrade: true,
				write: true,
			},
			catchUpBoundaryThrown: true,
			catchUpCrashRevision: 1,
			catchUpFreshProcessComplete: true,
			catchUpFreshProcessRevision: 5,
			civilizationDay: 365,
			civilizationEvents: 5,
			civilizationReplayHashMatches: true,
			corruptionCode: "STALE_STATE",
			generatedAbstentionBoundaryIdempotent: true,
			generatedAbstentionBoundaryReloaded: true,
			generatedAbstentionBoundaryRelatedOnly: true,
			generatedFirstLoadAppendCalls: 1,
			generatedFirstLoadPersisted: true,
			generatedInvalidRefreshFailedClosed: true,
			generatedRefreshAppendCalls: 0,
			generatedRefreshObservedSponsor: true,
			dualTabFenceCode: "STALE_FENCE",
			openFailureName: "VersionError",
			quotaAtomic: true,
			quotaFailureName: "QuotaExceededError",
			quotaHeadUnchanged: true,
			quotaStoreCountsUnchanged: true,
			recoveredIdempotently: true,
			restoredGenesisIdempotently: true,
			replayedCount: 3,
			replayedSuffixEvents: 1,
			rejectionHeadUnchanged: true,
			rejectionRetryIdempotent: true,
			retryIdempotent: true,
			revisionAfterAbort: 2,
			staleFenceCode: "STALE_FENCE",
			transactionAbortHeadUnchanged: true,
			transactionAbortStoreCountsUnchanged: true,
			writeBoundaryHeadUnchanged: true,
			writeBoundaryStoreCountsUnchanged: true,
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
