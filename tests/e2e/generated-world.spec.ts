import { parseWorldFocusHref } from "../../apps/web/src/research-navigation";
import {
	expect,
	type Locator,
	type Page,
	test,
} from "./support/eonfolk-fixture";
import { expectFollowShowsPerson } from "./support/follow-body";
import {
	pressTimeControl,
	revealPeopleAndWork,
	revealWorldTools,
} from "./support/world-hud";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

async function readAttributes(
	locator: Locator,
	names: readonly string[],
): Promise<Readonly<Record<string, string | null>>> {
	return locator.evaluate(
		(element, requestedNames) =>
			Object.fromEntries(
				requestedNames.map((name) => [name, element.getAttribute(name)]),
			),
		[...names],
	);
}

async function isolateLocalWorld(page: Page): Promise<string[]> {
	const externalRequests: string[] = [];
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else {
			externalRequests.push(route.request().url());
			await route.abort("blockedbyclient");
		}
	});
	return externalRequests;
}

async function pauseWorldTime(page: Page): Promise<void> {
	await page
		.getByRole("navigation", { name: "Time" })
		.getByRole("button", { name: "Pause" })
		.click();
}

type GeneratedWorkerPersistenceFault =
	| Readonly<{ kind: "open"; name: "SecurityError" }>
	| Readonly<{
			kind: "request";
			api: "get" | "put";
			name: "NotReadableError" | "QuotaExceededError" | "UnknownError";
	  }>;

/** Injects a persistence failure inside the production authority Worker. */
async function injectGeneratedWorkerPersistenceFault(
	page: Page,
	fault: GeneratedWorkerPersistenceFault,
): Promise<void> {
	await page.route(
		/\/assets\/generated-world-runtime\.worker-[^/]+\.js$/u,
		async (route) => {
			const response = await route.fetch();
			const body = await response.text();
			const serializedFault = JSON.stringify(fault);
			const injection = `{
	const fault = ${serializedFault};
	if (fault.kind === "open") {
		Object.defineProperty(indexedDB, "open", {
			configurable: true,
			value: () => { throw new DOMException("private open detail", fault.name); },
		});
	} else {
		const original = IDBObjectStore.prototype[fault.api];
		Object.defineProperty(IDBObjectStore.prototype, fault.api, {
			configurable: true,
			value: function (...args) {
				if (this.name.startsWith("authority"))
					throw new DOMException("private " + fault.name + " detail", fault.name);
				return Reflect.apply(original, this, args);
			},
		});
	}
}`;
			await route.fulfill({ response, body: `${injection}\n${body}` });
		},
	);
}

async function resetGeneratedCheckpoint(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(() => {
		window.localStorage.removeItem("eonfolk:play:last-active-wall-ms:v1");
		window.localStorage.removeItem("eonfolk:play:pending-return-catch-up-v1");
	});
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase(
					"eonfolk-generated-authority-v8",
				);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

async function inspectGeneratedCheckpoint(page: Page) {
	return page.evaluate(
		() =>
			new Promise<{
				readonly catchUpMarkerReceiptCount: number;
				readonly eventCount: number;
				readonly eventAppendReceiptCount: number;
				readonly operationCount: number;
				readonly receiptCount: number;
				readonly snapshotCount: number;
				readonly headHash: string;
				readonly stateHash: string;
				readonly simulationTime: number;
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v8", 1);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const transaction = database.transaction(
							[
								"authorityStreams",
								"authorityOperations",
								"authorityEvents",
								"authorityReceipts",
								"authoritySnapshots",
							],
							"readonly",
						);
						const requests = {
							streams: transaction.objectStore("authorityStreams").getAll(),
							operations: transaction
								.objectStore("authorityOperations")
								.count(),
							events: transaction.objectStore("authorityEvents").count(),
							receipts: transaction.objectStore("authorityReceipts").getAll(),
							snapshots: transaction.objectStore("authoritySnapshots").count(),
						};
						transaction.addEventListener(
							"complete",
							() => {
								const stream = requests.streams.result[0] as {
									head: {
										headHash: string;
										stateHash: string;
										simulationTime: number;
									};
								};
								const receipts = requests.receipts.result as Array<{
									value: {
										fromSequenceInclusive: number;
										toSequenceExclusive: number;
										commandReceipt: null | { schemaVersion?: string };
									};
								}>;
								resolve({
									catchUpMarkerReceiptCount: receipts.filter(
										(record) =>
											record.value.commandReceipt?.schemaVersion ===
											"eonfolk-authority-catch-up-marker-v1",
									).length,
									eventCount: requests.events.result,
									eventAppendReceiptCount: receipts.filter(
										(record) =>
											record.value.toSequenceExclusive >
											record.value.fromSequenceInclusive,
									).length,
									operationCount: requests.operations.result,
									receiptCount: receipts.length,
									snapshotCount: requests.snapshots.result,
									headHash: stream.head.headHash,
									stateHash: stream.head.stateHash,
									simulationTime: stream.head.simulationTime,
								});
								database.close();
							},
							{ once: true },
						);
					},
					{ once: true },
				);
			}),
	);
}

async function generatedAuthorityFingerprint(page: Page) {
	return page.evaluate(
		() =>
			new Promise<{
				readonly counts: Readonly<Record<string, number>>;
				readonly digest: string;
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v8");
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					const database = request.result;
					const stores = [...database.objectStoreNames].sort();
					const transaction = database.transaction(stores, "readonly");
					const rows = Object.fromEntries(
						stores.map((store) => [
							store,
							transaction.objectStore(store).getAll(),
						]),
					) as Record<string, IDBRequest<unknown[]>>;
					transaction.onerror = () => reject(transaction.error);
					transaction.oncomplete = async () => {
						try {
							const values = Object.fromEntries(
								Object.entries(rows).map(([store, result]) => [
									store,
									result.result,
								]),
							);
							const canonical = (value: unknown): string => {
								if (value === null || typeof value !== "object")
									return JSON.stringify(value);
								if (Array.isArray(value))
									return `[${value.map(canonical).join(",")}]`;
								return `{${Object.entries(value)
									.sort(([left], [right]) => left.localeCompare(right))
									.map(
										([key, entry]) =>
											`${JSON.stringify(key)}:${canonical(entry)}`,
									)
									.join(",")}}`;
							};
							const encoded = new TextEncoder().encode(
								canonical({ stores: values }),
							);
							const digest = [
								...new Uint8Array(
									await crypto.subtle.digest("SHA-256", encoded),
								),
							]
								.map((value) => value.toString(16).padStart(2, "0"))
								.join("");
							resolve({
								counts: Object.fromEntries(
									Object.entries(values).map(([store, entries]) => [
										store,
										entries.length,
									]),
								),
								digest,
							});
						} catch (error) {
							reject(error);
						} finally {
							database.close();
						}
					};
				};
			}),
	);
}

async function seedLegacyGeneratedAuthority(page: Page) {
	return page.evaluate(
		() =>
			new Promise<{
				readonly databaseVersion: number;
				readonly record: unknown;
				readonly stores: readonly string[];
			}>((resolve, reject) => {
				// v4 is deliberately retained as a legacy namespace. Current code must
				// neither restore it nor reclassify its bytes as v9 authority.
				const legacyDatabaseName = "eonfolk-generated-authority-v4";
				const deletion = indexedDB.deleteDatabase(legacyDatabaseName);
				deletion.onerror = () => reject(deletion.error);
				deletion.onsuccess = () => {
					const request = indexedDB.open(legacyDatabaseName, 1);
					request.onerror = () => reject(request.error);
					request.onupgradeneeded = () => {
						request.result.createObjectStore("legacyAuthoritySentinel", {
							keyPath: "key",
						});
					};
					request.onsuccess = () => {
						const database = request.result;
						const transaction = database.transaction(
							"legacyAuthoritySentinel",
							"readwrite",
						);
						transaction.objectStore("legacyAuthoritySentinel").put({
							key: "pre-v9",
							payload: "stale-authority-must-remain-in-v4",
						});
						transaction.onerror = () => reject(transaction.error);
						transaction.oncomplete = () => {
							const read = database
								.transaction("legacyAuthoritySentinel", "readonly")
								.objectStore("legacyAuthoritySentinel")
								.get("pre-v9");
							read.onerror = () => reject(read.error);
							read.onsuccess = () => {
								resolve({
									databaseVersion: database.version,
									record: read.result,
									stores: [...database.objectStoreNames],
								});
								database.close();
							};
						};
					};
				};
			}),
	);
}

async function inspectLegacyGeneratedAuthority(page: Page) {
	return page.evaluate(
		() =>
			new Promise<{
				readonly databaseVersion: number;
				readonly record: unknown;
				readonly stores: readonly string[];
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v4");
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					const database = request.result;
					const read = database
						.transaction("legacyAuthoritySentinel", "readonly")
						.objectStore("legacyAuthoritySentinel")
						.get("pre-v9");
					read.onerror = () => reject(read.error);
					read.onsuccess = () => {
						resolve({
							databaseVersion: database.version,
							record: read.result,
							stores: [...database.objectStoreNames],
						});
						database.close();
					};
				};
			}),
	);
}

async function corruptGeneratedAuthority(
	page: Page,
	kind: "genesis-schema" | "engine-version" | "range-gap",
): Promise<void> {
	await page.evaluate(async (kind) => {
		const requested = <T>(request: IDBRequest<T>) =>
			new Promise<T>((resolve, reject) => {
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		const completed = (transaction: IDBTransaction) =>
			new Promise<void>((resolve, reject) => {
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () =>
					reject(transaction.error ?? new Error("corruption fixture aborted"));
			});
		const database = await requested(
			indexedDB.open("eonfolk-generated-authority-v8"),
		);
		try {
			if (kind === "range-gap") {
				const transaction = database.transaction(
					"authorityOperations",
					"readwrite",
				);
				const done = completed(transaction);
				const keys = await requested(
					transaction.objectStore("authorityOperations").getAllKeys(),
				);
				const first = keys[0];
				if (first === undefined) throw new Error("operation fixture missing");
				transaction.objectStore("authorityOperations").delete(first);
				await done;
				return;
			}
			const read = database.transaction(
				["authorityStreams", "authoritySnapshots"],
				"readonly",
			);
			const readDone = completed(read);
			const [streamRows, snapshotRows] = await Promise.all([
				requested(read.objectStore("authorityStreams").getAll()),
				requested(read.objectStore("authoritySnapshots").getAll()),
			]);
			await readDone;
			const stream = streamRows[0] as
				| {
						key: string;
						genesis: {
							schemaVersion: string;
							head: Record<string, unknown>;
							snapshot: Record<string, unknown>;
						};
				  }
				| undefined;
			if (stream === undefined) throw new Error("stream fixture missing");
			if (kind === "genesis-schema") {
				stream.genesis.schemaVersion = "eonfolk-authority-genesis-v999";
			} else {
				const canonical = (value: unknown): string => {
					if (value === null || typeof value !== "object")
						return JSON.stringify(value);
					if (Array.isArray(value))
						return `[${value.map(canonical).join(",")}]`;
					return `{${Object.entries(value)
						.sort(([left], [right]) => left.localeCompare(right))
						.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
						.join(",")}}`;
				};
				const hashWithout = async (
					domain: string,
					value: Record<string, unknown>,
					key: string,
				) => {
					const unsigned = { ...value };
					delete unsigned[key];
					const bytes = new TextEncoder().encode(
						`${domain}\u0000${canonical(unsigned)}`,
					);
					return [
						...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
					]
						.map((byte) => byte.toString(16).padStart(2, "0"))
						.join("");
				};
				stream.genesis.head.engineVersion = "foreign-engine-v999";
				stream.genesis.snapshot.engineVersion = "foreign-engine-v999";
				stream.genesis.head.headHash = await hashWithout(
					"eonfolk-authority-head-v1",
					stream.genesis.head,
					"headHash",
				);
				stream.genesis.snapshot.snapshotHash = await hashWithout(
					"eonfolk-authority-snapshot-v1",
					stream.genesis.snapshot,
					"snapshotHash",
				);
			}
			const write = database.transaction(
				["authorityStreams", "authoritySnapshots"],
				"readwrite",
			);
			const writeDone = completed(write);
			write.objectStore("authorityStreams").put(stream);
			if (kind === "engine-version") {
				const genesis = snapshotRows.find(
					(candidate: { value?: { snapshotId?: string } }) =>
						candidate.value?.snapshotId === stream.genesis.snapshot.snapshotId,
				) as { key: string; streamKey: string; value: unknown } | undefined;
				if (genesis === undefined) throw new Error("genesis snapshot missing");
				write.objectStore("authoritySnapshots").put({
					...genesis,
					value: structuredClone(stream.genesis.snapshot),
				});
			}
			await writeDone;
		} finally {
			database.close();
		}
	}, kind);
}

async function replaceGeneratedAuthorityWithOrphan(
	page: Page,
	input: {
		readonly store:
			| "authorityOperations"
			| "authorityEvents"
			| "authorityReceipts"
			| "authoritySnapshots";
		readonly id: string | number;
		readonly worldId: string;
		readonly declaration: "target" | "foreign";
	},
): Promise<void> {
	await page.evaluate(async ({ store, id, worldId, declaration }) => {
		const requested = <T>(request: IDBRequest<T>) =>
			new Promise<T>((resolve, reject) => {
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		const deleted = indexedDB.deleteDatabase("eonfolk-generated-authority-v8");
		await requested(deleted);
		const opened = indexedDB.open("eonfolk-generated-authority-v8", 1);
		opened.onupgradeneeded = () => {
			for (const name of [
				"authorityStreams",
				"authorityOperations",
				"authorityEvents",
				"authorityReceipts",
				"authoritySnapshots",
			])
				opened.result.createObjectStore(name, { keyPath: "key" });
		};
		const database = await requested(opened);
		try {
			const transaction = database.transaction(store, "readwrite");
			const completed = new Promise<void>((resolve, reject) => {
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () =>
					reject(transaction.error ?? new Error("orphan fixture aborted"));
			});
			const runId = "v1-generated-civilization";
			const identityField = {
				authorityOperations: "ordinal",
				authorityEvents: "sequence",
				authorityReceipts: "appendId",
				authoritySnapshots: "snapshotId",
			}[store];
			transaction.objectStore(store).put({
				key: JSON.stringify([runId, worldId, id]),
				streamKey: JSON.stringify(
					declaration === "target"
						? [runId, worldId]
						: ["forged-run", "forged-region"],
				),
				value: { [identityField]: id },
				malformed: `${store}-orphan`,
			});
			await completed;
		} finally {
			database.close();
		}
	}, input);
}

async function forgeGeneratedAuthorityRowIdentity(
	page: Page,
	input: {
		readonly store:
			| "authorityOperations"
			| "authorityEvents"
			| "authorityReceipts"
			| "authoritySnapshots";
		readonly id?: string | number;
		readonly worldId: string;
		readonly mode: "foreign-declaration" | "logical-key-alias";
	},
): Promise<void> {
	await page.evaluate(async ({ store, id, worldId, mode }) => {
		const requested = <T>(request: IDBRequest<T>) =>
			new Promise<T>((resolve, reject) => {
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		const opened = await requested(
			indexedDB.open("eonfolk-generated-authority-v8"),
		);
		try {
			const transaction = opened.transaction(store, "readwrite");
			const completed = new Promise<void>((resolve, reject) => {
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () =>
					reject(transaction.error ?? new Error("forgery fixture aborted"));
			});
			const objectStore = transaction.objectStore(store);
			const rows = (await requested(objectStore.getAll())) as Array<{
				key: string;
				streamKey: string;
				value: unknown;
			}>;
			const runId = "v1-generated-civilization";
			const targetKey =
				id === undefined ? null : JSON.stringify([runId, worldId, id]);
			const row = rows.find(
				(candidate) => targetKey === null || candidate.key === targetKey,
			);
			if (row === undefined)
				throw new Error(`${store} forgery fixture missing`);
			objectStore.put({
				...row,
				...(mode === "foreign-declaration"
					? {
							streamKey: JSON.stringify(["forged-run", "forged-region"]),
						}
					: {
							key: `[${JSON.stringify(runId)}, ${JSON.stringify(worldId)}, ${JSON.stringify(id)}]`,
						}),
			});
			await completed;
		} finally {
			opened.close();
		}
	}, input);
}

async function installGeneratedAuthorityStreamFixture(
	page: Page,
	input: {
		readonly kind:
			| "missing-alias"
			| "missing-embedded-target"
			| "existing-duplicate-alias"
			| "existing-scope-mismatch"
			| "existing-malformed";
		readonly worldId: string;
	},
): Promise<void> {
	await page.evaluate(async ({ kind, worldId }) => {
		const requested = <T>(request: IDBRequest<T>) =>
			new Promise<T>((resolve, reject) => {
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		const completed = (transaction: IDBTransaction) =>
			new Promise<void>((resolve, reject) => {
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () =>
					reject(transaction.error ?? new Error("stream fixture aborted"));
			});
		const runId = "v1-generated-civilization";
		const expectedKey = JSON.stringify([runId, worldId]);
		const opened = await requested(
			indexedDB.open("eonfolk-generated-authority-v8"),
		);
		const read = opened.transaction("authorityStreams", "readonly");
		const readDone = completed(read);
		const canonical = (await requested(
			read.objectStore("authorityStreams").get(expectedKey),
		)) as
			| {
					key: string;
					genesis: Record<string, unknown>;
					[key: string]: unknown;
			  }
			| undefined;
		await readDone;
		opened.close();
		if (canonical === undefined) throw new Error("stream fixture missing");
		const aliasKey = `[${JSON.stringify(runId)}, ${JSON.stringify(worldId)}]`;

		if (kind.startsWith("missing-")) {
			await requested(
				indexedDB.deleteDatabase("eonfolk-generated-authority-v8"),
			);
			const recreated = indexedDB.open("eonfolk-generated-authority-v8", 1);
			recreated.onupgradeneeded = () => {
				for (const name of [
					"authorityStreams",
					"authorityOperations",
					"authorityEvents",
					"authorityReceipts",
					"authoritySnapshots",
				])
					recreated.result.createObjectStore(name, { keyPath: "key" });
			};
			const database = await requested(recreated);
			try {
				const write = database.transaction("authorityStreams", "readwrite");
				const writeDone = completed(write);
				write.objectStore("authorityStreams").put({
					...canonical,
					key:
						kind === "missing-alias"
							? aliasKey
							: JSON.stringify(["forged-run", "forged-region"]),
				});
				await writeDone;
			} finally {
				database.close();
			}
			return;
		}

		const database = await requested(
			indexedDB.open("eonfolk-generated-authority-v8"),
		);
		try {
			const write = database.transaction("authorityStreams", "readwrite");
			const writeDone = completed(write);
			write.objectStore("authorityStreams").put(
				kind === "existing-duplicate-alias"
					? { ...canonical, key: aliasKey }
					: kind === "existing-scope-mismatch"
						? {
								...canonical,
								genesis: {
									...canonical.genesis,
									regionId: "forged-region",
								},
							}
						: { ...canonical, genesis: null },
			);
			await writeDone;
		} finally {
			database.close();
		}
	}, input);
}

async function selectCanonicalResidentFromCanvas(
	page: Page,
	canvas: Locator,
): Promise<string> {
	const labels = page
		.getByRole("list", { name: "People in view" })
		.getByRole("button");
	await expect(labels.first()).toBeVisible({ timeout: 15_000 });
	const count = await labels.count();
	for (let index = 0; index < count; index += 1) {
		await labels.nth(index).evaluate((element) => {
			(element as HTMLElement).click();
		});
		try {
			await expect
				.poll(() => canvas.getAttribute("data-last-world-pick"), {
					timeout: 3_000,
				})
				.toMatch(/^citizen:/u);
		} catch {
			continue;
		}
		const selected = await canvas.getAttribute("data-last-world-pick");
		if (selected?.startsWith("citizen:") === true)
			return selected.slice("citizen:".length);
	}
	throw new Error("no exposed canonical citizen accepted a canvas pick");
}

async function selectCanonicalMara(page: Page): Promise<string> {
	const citizenId = "citizen-01";
	await revealPeopleAndWork(page);
	const resident = page.locator(
		`ul.v1-presence-roster button[data-citizen-id="${citizenId}"]`,
	);
	await expect(resident).toContainText("Mara Vale");
	await resident.click();
	return citizenId;
}

async function selectSponsorCandidate(page: Page): Promise<string> {
	const citizenId = await selectCanonicalMara(page);
	await expect(
		page.getByRole("button", { name: "Sponsor Mara" }),
	).toBeEnabled();
	return citizenId;
}

test("generated civilization is the identity-bound canonical /world @generated-world @generated-target", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/");
	await expect(page).toHaveTitle("EONFOLK — Follow Mara Vale");
	await expect(
		page.getByRole("heading", {
			name: "Follow Mara Vale. She acts for herself.",
		}),
	).toBeVisible();
	await expect(page.locator("main.v1-genesis-entry")).toHaveAttribute(
		"data-world-id",
		"eonfolk-genesis-world-v1",
	);
	await expect(page.getByText("Identity hash")).toHaveCount(0);

	await page.getByRole("link", { name: "Enter Dawnmere" }).click();
	await expect(page).toHaveURL(/\/world$/u);
	await expect(page).toHaveTitle("EONFOLK — Dawnmere");
	await expect(
		page.getByRole("heading", { name: "Dawnmere", level: 1 }),
	).toBeVisible();
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	const worldTruth = await readAttributes(world, [
		"data-world-id",
		"data-state-hash",
		"data-projection-status",
		"data-persistence",
		"data-persistence-restored",
		"data-catch-up-receipts",
		"data-asset-integrity",
		"data-previous-state-hash",
	]);
	expect(worldTruth).toMatchObject({
		"data-world-id": "eonfolk-genesis-world-v1",
		"data-projection-status": "available",
		"data-persistence": "indexeddb",
		"data-persistence-restored": "true",
		"data-catch-up-receipts": "1",
		"data-asset-integrity": "verified",
	});
	expect(worldTruth["data-state-hash"]).toMatch(/^[0-9a-f]{64}$/u);
	expect(worldTruth["data-previous-state-hash"]).toMatch(/^[0-9a-f]{64}$/u);
	const canvasTruth = await readAttributes(canvas, [
		"data-engine",
		"data-actor-count",
		"data-embodiment-schema",
		"data-canonical-action-ids",
		"data-route-segment-count",
		"data-actor-route-states",
		"data-actor-positions",
		"data-rendered-actor-positions",
		"data-actor-diagnostics",
		"data-interaction-count",
		"data-teleport-count",
		"data-contradiction-count",
		"data-citizen-height-mm",
		"data-door-height-mm",
		"data-road-width-mm",
		"data-semantic-scale",
		"data-fidelity-class",
		"data-navigation-mode",
		"data-moving-actor-count",
	]);
	expect(canvasTruth).toMatchObject({
		"data-engine": "playcanvas",
		"data-actor-count": "8",
		"data-teleport-count": "0",
		"data-contradiction-count": "0",
		"data-citizen-height-mm": "1750",
		"data-door-height-mm": "2050",
		"data-road-width-mm": "1800",
		"data-navigation-mode": "smooth",
	});
	expect(
		Number(canvasTruth["data-interaction-count"] ?? "0") > 0 ||
			(await page.locator("ul.v1-activity-summary li").count()) > 0,
	).toBe(true);
	expect(canvasTruth["data-embodiment-schema"]).toMatch(/v1$/u);
	expect(canvasTruth["data-canonical-action-ids"]).toMatch(/.+/u);
	expect(canvasTruth["data-route-segment-count"]).toMatch(/^[1-9]\d*$/u);
	expect(canvasTruth["data-actor-route-states"]).toMatch(/.+/u);
	expect(canvasTruth["data-actor-positions"]).toMatch(/.+/u);
	expect(canvasTruth["data-rendered-actor-positions"]).toMatch(/.+/u);
	expect(canvasTruth["data-actor-diagnostics"]).toMatch(/.+/u);
	expect(canvasTruth["data-semantic-scale"]).toMatch(
		/^(?:region|town|citizen)$/u,
	);
	expect(canvasTruth["data-fidelity-class"]).toMatch(/^LOD[0-3]$/u);
	await expect(
		page.locator('ul.v1-presence-roster button[data-citizen-id="citizen-01"]'),
	).toContainText("Mara Vale");
	await expect(page.locator("ul.v1-presence-roster button")).toHaveCount(8);
	await expect(page.getByRole("button", { name: "Follow Mara" })).toBeVisible();
	await expect(page.getByRole("navigation", { name: "Time" })).toBeVisible();
	const routeStates = canvasTruth["data-actor-route-states"]
		?.split(",")
		.filter(Boolean);
	const movingActorCount = Number(canvasTruth["data-moving-actor-count"]);
	expect(
		routeStates?.filter((state) => state.includes(":travelling:")).length,
	).toBe(movingActorCount);
	expect(externalRequests).toEqual([]);
});

test("v5 authority ignores and preserves legacy v4 bytes @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	const legacyBefore = await seedLegacyGeneratedAuthority(page);

	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await expect(canvas).toHaveAttribute(
		"data-actor-route-states",
		/\bcitizen-05:travelling:/u,
	);
	const currentAuthority = await inspectGeneratedCheckpoint(page);
	expect(currentAuthority.eventCount).toBeGreaterThan(0);
	expect(currentAuthority.snapshotCount).toBeGreaterThan(0);
	expect(currentAuthority.stateHash).toMatch(/^[0-9a-f]{64}$/u);

	expect(await inspectLegacyGeneratedAuthority(page)).toEqual(legacyBefore);
	expect(legacyBefore).toEqual({
		databaseVersion: 1,
		record: {
			key: "pre-v9",
			payload: "stale-authority-must-remain-in-v4",
		},
		stores: ["legacyAuthoritySentinel"],
	});
	expect(externalRequests).toEqual([]);
});

test("generated camera and canvas selection preserve the authoritative head @generated-world", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 180_000 : 90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	const stateHashBeforeNavigation = await world.getAttribute("data-state-hash");
	const canvasBounds = await canvas.boundingBox();
	if (canvasBounds === null) throw new Error("generated canvas has no bounds");
	const distanceBeforeWheel = Number(
		await page
			.getByTestId("generated-camera-status")
			.getAttribute("data-camera-distance-mm"),
	);
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.45,
		canvasBounds.y + canvasBounds.height * 0.45,
	);
	await page.mouse.wheel(0, -120);
	await expect
		.poll(() =>
			page
				.getByTestId("generated-camera-status")
				.getAttribute("data-camera-distance-mm")
				.then(Number),
		)
		.toBeLessThan(distanceBeforeWheel);
	const targetBeforePan = await canvas.getAttribute("data-camera-target-mm");
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.42,
		canvasBounds.y + canvasBounds.height * 0.42,
	);
	await page.mouse.down();
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.34,
		canvasBounds.y + canvasBounds.height * 0.48,
		{ steps: 4 },
	);
	await page.mouse.up();
	await expect
		.poll(() => canvas.getAttribute("data-camera-target-mm"))
		.not.toBe(targetBeforePan);
	await expect(world).toHaveAttribute(
		"data-state-hash",
		stateHashBeforeNavigation ?? "",
	);

	await page.locator(".v1-world-settings summary").click();
	await page.getByRole("button", { name: "Reduce motion" }).click();
	await expect(canvas).toHaveAttribute("data-navigation-mode", "direct");
	await expect(canvas).toHaveAttribute("data-render-policy", "on-demand");
	const pickedCitizenId = await selectCanonicalResidentFromCanvas(page, canvas);
	await expect(canvas).toHaveAttribute(
		"data-last-world-pick",
		`citizen:${pickedCitizenId}`,
	);
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await expect(canvas).toHaveAttribute("data-semantic-scale", "citizen");
	await page.getByRole("button", { name: "Back to settlement" }).click();
	expect(externalRequests).toEqual([]);
});

test("generated pose controls preserve authoritative state @generated-world", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 180_000 : 90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	const worldTools = page.locator("details.v1-world-tools");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pressTimeControl(page, "Pause");
	await expect(world).toHaveAttribute("data-presentation-playing", "false");
	await revealWorldTools(page);
	await expect(worldTools).toHaveAttribute("open", "");
	const stateHashBeforePose = await world.getAttribute("data-state-hash");
	const authorityBeforePose = await generatedAuthorityFingerprint(page);
	const tickBefore = Number(
		await canvas.getAttribute("data-presentation-tick"),
	);
	const positionsBeforePose = await canvas.getAttribute("data-actor-positions");
	const renderedBeforePose = await canvas.getAttribute(
		"data-rendered-actor-positions",
	);
	const traversalsBeforePose = await canvas.getAttribute(
		"data-actor-route-states",
	);
	const traversals = (traversalsBeforePose ?? "")
		.split(",")
		.filter(Boolean)
		.map((entry) => entry.split(":"))
		.filter(([, status]) => status === "travelling");
	expect(traversals.length).toBeGreaterThan(0);
	await expect(canvas).toHaveAttribute(
		"data-moving-actor-count",
		String(traversals.length),
	);
	for (const traversal of traversals) {
		const [, , routeId, progress] = traversal;
		expect(routeId).toMatch(/\S/u);
		expect(Number(progress)).toBeGreaterThanOrEqual(0);
		expect(Number(progress)).toBeLessThanOrEqual(10_000);
	}
	await expect(canvas).toHaveAttribute("data-teleport-count", "0");
	expect(
		Number(await canvas.getAttribute("data-project-count")),
	).toBeGreaterThan(0);
	expect(await canvas.getAttribute("data-limitation-count")).toBe("0");
	const projectButtons = worldTools.locator("button[data-project-id]");
	await projectButtons.first().scrollIntoViewIfNeeded();
	await expect(projectButtons.first()).toBeVisible();
	expect(renderedBeforePose).not.toBe(positionsBeforePose);
	await worldTools.getByRole("button", { name: "Step one beat" }).click();
	await expect(canvas).toHaveAttribute(
		"data-presentation-tick",
		String(tickBefore + 1),
	);
	await expect(world).toHaveAttribute(
		"data-state-hash",
		stateHashBeforePose ?? "",
	);
	await expect(canvas).toHaveAttribute(
		"data-actor-positions",
		positionsBeforePose ?? "",
	);
	expect(await canvas.getAttribute("data-rendered-actor-positions")).not.toBe(
		positionsBeforePose,
	);
	await expect(canvas).toHaveAttribute(
		"data-actor-route-states",
		traversalsBeforePose ?? "",
	);
	expect(await generatedAuthorityFingerprint(page)).toEqual(
		authorityBeforePose,
	);
	expect(externalRequests).toEqual([]);
});

test("generated citizen follow remains presentation-only @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	const stateHashBeforeFollow = await world.getAttribute("data-state-hash");
	const worldTools = page.locator("details.v1-world-tools");
	if (
		!(await worldTools.evaluate(
			(details) => (details as HTMLDetailsElement).open,
		))
	)
		await worldTools.locator("summary").click();
	await expect(canvas).toHaveAttribute("data-navigation-mode", "smooth");
	const firstResident = worldTools
		.getByRole("group", { name: "People here" })
		.getByRole("button")
		.first();
	await firstResident.click();
	await expect(firstResident).toHaveAttribute("aria-pressed", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await worldTools.getByRole("button", { name: "Follow this person" }).click();
	await expect(canvas).toHaveAttribute("data-following", "true");
	await expect(world).toHaveAttribute(
		"data-state-hash",
		stateHashBeforeFollow ?? "",
	);
	expect(externalRequests).toEqual([]);
});

test("canonical citizen, building, and project focus preserve authority across desktop and mobile @generated-world", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 240_000 : 180_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	const stateHash = await world.getAttribute("data-state-hash");
	const fingerprint = await generatedAuthorityFingerprint(page);
	await expect(canvas).toHaveAttribute("data-citizen-height-mm", "1750");
	await expect(canvas).toHaveAttribute("data-door-height-mm", "2050");
	await expect(canvas).toHaveAttribute("data-actor-count", "8");
	await page.locator(".v1-world-settings summary").click();
	await expect(
		page.getByRole("button", { name: "Motion reduced" }),
	).toBeVisible();
	await expect(canvas).toHaveAttribute("data-navigation-mode", "direct");
	await expect(canvas).toHaveAttribute("data-render-policy", "on-demand");
	const tools = page.locator("details.v1-world-tools");
	await revealWorldTools(page);
	await expect(tools.locator("button[data-building-id]")).toHaveCount(4, {
		timeout: 15_000,
	});
	const desktopBuilding = tools.locator("button[data-building-id]").first();
	await desktopBuilding.focus();
	await expect(desktopBuilding).toBeFocused();
	await desktopBuilding.press("Space");
	await expect(desktopBuilding).toHaveAttribute("aria-pressed", "true");
	await expect(desktopBuilding).toHaveAttribute("aria-current", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "building");
	await expect(canvas).toHaveAttribute("data-camera-distance-mm", "24000");
	await expect(page.getByText("BUILDING IN FOCUS")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Link to this building" }),
	).toHaveAttribute("href", /focus-kind=object/u);
	await page.getByRole("button", { name: "Back to settlement" }).click();
	if (
		!(await tools.evaluate((details) => (details as HTMLDetailsElement).open))
	)
		await tools.locator("summary").click();
	const citizenButton = tools.locator("button[data-citizen-id]").first();
	await citizenButton.focus();
	await expect(citizenButton).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(citizenButton).toHaveAttribute("aria-pressed", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await expect(canvas).toHaveAttribute("data-camera-distance-mm", "9000");

	if (
		!(await tools.evaluate((details) => (details as HTMLDetailsElement).open))
	)
		await tools.locator("summary").click();
	const projectButton = tools.locator("button[data-project-id]").first();
	await projectButton.focus();
	await expect(projectButton).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(projectButton).toHaveAttribute("aria-pressed", "true");
	await expect(projectButton).toHaveAttribute("aria-current", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "project");
	await expect(canvas).toHaveAttribute("data-camera-distance-mm", "28000");
	await expect(page.getByText("PROJECT IN FOCUS")).toBeVisible();
	if (process.env.EONFOLK_CAPTURE_MEDIA === "1") {
		if (await tools.evaluate((details) => (details as HTMLDetailsElement).open))
			await tools.locator("summary").click();
		await page
			.locator(".v1-context-panel")
			.evaluate((panel) => panel.scrollTo({ top: 0 }));
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
			path: test.info().outputPath("desktop-citizen-to-project-focus.png"),
		});
	}
	const projectHref = await page
		.getByRole("link", { name: "Link to this project" })
		.getAttribute("href");
	if (projectHref === null) throw new Error("project focus link missing");
	await page.goto(projectHref);
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-focus-kind",
		"project",
		{ timeout: 20_000 },
	);
	await pauseWorldTime(page);
	await expect(page.getByText("PROJECT IN FOCUS")).toBeVisible();

	for (const viewport of [
		{ width: 1366, height: 768 },
		{ width: 390, height: 844 },
	]) {
		await page.setViewportSize(viewport);
		const back = page.getByRole("button", { name: "Back to settlement" });
		if (await back.isVisible()) await back.click();
		await revealWorldTools(page);
		const buildingButton = tools.locator("button[data-building-id]").first();
		await buildingButton.scrollIntoViewIfNeeded();
		await buildingButton.focus();
		await expect(buildingButton).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(buildingButton).toHaveAttribute("aria-pressed", "true");
		await expect(buildingButton).toHaveAttribute("aria-current", "true");
		await expect(canvas).toHaveAttribute("data-camera-distance-mm", "24000");
		await expect(page.getByText("BUILDING IN FOCUS")).toBeVisible();
		if (viewport.width === 390) {
			await page.getByRole("button", { name: "Back to settlement" }).click();
			await revealWorldTools(page);
			const mobileCitizen = tools.locator("button[data-citizen-id]").first();
			await mobileCitizen.focus();
			await expect(mobileCitizen).toBeFocused();
			await page.keyboard.press("Enter");
			await expect(mobileCitizen).toHaveAttribute("aria-pressed", "true");
			await expect(page.getByText("PERSON IN FOCUS")).toBeVisible();
			await page.getByRole("button", { name: "Back to settlement" }).click();
			await revealWorldTools(page);
			const mobileProject = tools.locator("button[data-project-id]").first();
			await mobileProject.focus();
			await expect(mobileProject).toBeFocused();
			await page.keyboard.press("Enter");
			await expect(mobileProject).toHaveAttribute("aria-pressed", "true");
			await expect(mobileProject).toHaveAttribute("aria-current", "true");
			await expect(page.getByText("PROJECT IN FOCUS")).toBeVisible();
		}
		if (await tools.evaluate((details) => (details as HTMLDetailsElement).open))
			await tools.locator("summary").evaluate((element) => {
				(element as HTMLElement).click();
			});
		await expect
			.poll(
				() =>
					page.evaluate(
						() => document.documentElement.scrollWidth <= window.innerWidth + 1,
					),
				{ timeout: 15_000 },
			)
			.toBe(true);
		await expect
			.poll(
				() =>
					page
						.locator(".v1-context-panel")
						.evaluate((panel) => panel.scrollWidth <= panel.clientWidth + 1),
				{ timeout: 15_000 },
			)
			.toBe(true);
	}

	expect(await world.getAttribute("data-state-hash")).toBe(stateHash);
	expect(await generatedAuthorityFingerprint(page)).toEqual(fingerprint);
	expect(externalRequests).toEqual([]);
});

test("first session stays in Dawnmere without a empty settlement tab @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 20_000 },
	);
	await expect(
		page.getByRole("button", { name: "Settlements", exact: true }),
	).toHaveCount(0);
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-actor-count",
		"8",
	);
	await expect(page.locator("ul.v1-presence-roster button")).toHaveCount(8);
	await expect(page.getByText("HAPPENING NOW")).toBeVisible();
	await expect(page.getByText(/lives are unfolding/u)).toBeVisible();
	await page.locator("aside.v1-context-panel h2").click();
	await expect(
		page.getByRole("list", { name: "Visible activities" }),
	).toBeVisible();
	await expect(page.locator("ul.v1-activity-summary li").first()).toBeVisible();
	await expect(page.getByText("Authority", { exact: true })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Research" })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Developer" })).toHaveCount(0);
	expect(externalRequests).toEqual([]);
});

test("generated reload restores the durable head @generated-world @generated-target", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	const generatedAssetRequests: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (path.startsWith("/assets/generated/"))
			generatedAssetRequests.push(path);
	});
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 20_000 },
	);
	const firstCheckpoint = await inspectGeneratedCheckpoint(page);
	await page.reload();
	await expect(page.locator("main.v1-world")).toHaveAttribute(
		"data-persistence-restored",
		"true",
	);
	await expect(page.locator("main.v1-world")).toHaveAttribute(
		"data-asset-integrity",
		"verified",
	);
	expect((await inspectGeneratedCheckpoint(page)).headHash).toBe(
		firstCheckpoint.headHash,
	);
	expect(generatedAssetRequests.sort()).toEqual([
		"/assets/generated/ASSET_MANIFEST.json",
		"/assets/generated/ASSET_MANIFEST.json",
		"/assets/generated/eonfolk-folk-proxy.glb",
		"/assets/generated/eonfolk-folk-proxy.glb",
	]);
	expect(generatedAssetRequests).not.toContain(
		"/assets/generated/eonfolk-folk-proxy.gltf",
	);
	expect(externalRequests).toEqual([]);
});

test("entry admits the deterministic view when canonical IndexedDB is newer @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v8", 2);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						request.result.close();
						resolve();
					},
					{ once: true },
				);
			}),
	);
	await page.goto("/");
	await expect(
		page.getByRole("heading", {
			name: "Follow Mara Vale. She acts for herself.",
		}),
	).toBeVisible({ timeout: 20_000 });
	await expect(page.locator("main.v1-genesis-entry")).toHaveAttribute(
		"data-state-hash",
		/^[0-9a-f]{64}$/u,
	);
	await expect(page.locator("[aria-busy='true']")).toHaveCount(0);

	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await expect(world).toHaveAttribute("data-play-rate", "1");
	await expect(
		page.getByRole("button", { name: "Start a fresh local town" }),
	).toHaveCount(0);
	await expect(page.getByText(/cannot be read/u)).toHaveCount(0);
});

test("semantic people remain keyboard-operable @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await canvas.evaluate((element) => {
		element.dataset.semanticRoundTripIdentity = "retained";
	});
	await page.getByRole("button", { name: "In words" }).click();
	const semantic = page.getByTestId("generated-semantic-world");
	await expect(semantic).toBeVisible();
	await expect(canvas).toBeHidden();
	await expect(
		semantic.getByRole("group", { name: "People here" }).getByRole("button"),
	).toHaveCount(8);
	const citizen = semantic
		.getByRole("group", { name: "People here" })
		.getByRole("button")
		.first();
	await citizen.focus();
	await citizen.press("Enter");
	await expect(citizen).toHaveAttribute("aria-pressed", "true");
	const semanticContext = page.getByRole("complementary", {
		name: "People and counsel",
	});
	await expect(
		semanticContext.getByRole("heading", { name: "Mara Vale" }),
	).toBeVisible();
	const sponsorAction = semanticContext.getByRole("button", {
		name: "Sponsor Mara",
	});
	await expect(sponsorAction).toBeVisible();
	expect(
		await sponsorAction.evaluate(
			(button) => button.getBoundingClientRect().height,
		),
	).toBeGreaterThanOrEqual(43.9);
	await page.getByRole("button", { name: "Watch" }).click();
	await expect(canvas).toBeVisible();
	await expect(canvas).toHaveAttribute(
		"data-semantic-round-trip-identity",
		"retained",
	);
	await expect(canvas).toHaveAttribute("data-ready", "true");
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
});

test("mobile world controls and visible activity meet readability budgets @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await expect
		.poll(async () => {
			return canvas.evaluate((element) => {
				const bounds = element.getBoundingClientRect();
				const targets = JSON.parse(
					element.dataset.citizenPickTargets ?? "[]",
				) as readonly { readonly x: number; readonly y: number }[];
				return targets.filter(
					({ x, y }) =>
						x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height,
				).length;
			});
		})
		.toBeGreaterThanOrEqual(2);

	const chrome = await page.evaluate(() =>
		[
			...document.querySelectorAll<HTMLElement>(
				".v1-view-controls button, .v1-world-tools > summary",
			),
		]
			.filter((element) => element.getClientRects().length > 0)
			.map((element) => ({
				fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
				height: element.getBoundingClientRect().height,
			})),
	);
	expect(chrome.length).toBeGreaterThanOrEqual(6);
	expect(chrome.every(({ fontSize }) => fontSize >= 14)).toBe(true);
	expect(chrome.every(({ height }) => height >= 44)).toBe(true);
	await expect(
		page.locator(".generated-citizen-labels button").first(),
	).toBeVisible();
});

test("production ignores generated fault storage and exposes no harness markers @generated-world", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.addInitScript(() =>
		sessionStorage.setItem(
			"eonfolk:e2e-generated-world-fault-v1",
			"authoritative-invariant",
		),
	);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u, {
		timeout: 30_000,
	});
	await expect(world).not.toHaveAttribute("data-fault-kind", /.+/u);
	await expect(page.getByTestId("generated-world-fault-status")).toHaveCount(0);
	expect(externalRequests).toEqual([]);
});

test("production degrades an IndexedDB SecurityError without leaking detail @generated-world", async ({
	page,
}) => {
	await injectGeneratedWorkerPersistenceFault(page, {
		kind: "open",
		name: "SecurityError",
	});
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "unavailable", {
		timeout: 30_000,
	});
	await expect(world).toHaveAttribute(
		"data-persistence-claim",
		"admitted-deterministic-view",
	);
	await expect(world).toHaveAttribute(
		"data-persistence-failure-code",
		"SecurityError",
	);
	await expect(page.getByText(/cannot save the town/u)).toBeVisible();
	await expect(page.getByText("private open detail")).toHaveCount(0);
});

for (const boundary of [
	{ api: "get", name: "NotReadableError" },
	{ api: "put", name: "UnknownError" },
	{ api: "put", name: "QuotaExceededError" },
] as const) {
	test(`production degrades an IndexedDB ${boundary.name} at a real ${boundary.api} request @generated-world`, async ({
		page,
	}) => {
		await injectGeneratedWorkerPersistenceFault(page, {
			kind: "request",
			...boundary,
		});
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-persistence", "unavailable", {
			timeout: 30_000,
		});
		await expect(world).toHaveAttribute(
			"data-persistence-failure-code",
			boundary.name,
		);
		await expect(page.getByText(/cannot save the town/u)).toBeVisible();
		await expect(page.locator("body")).not.toContainText(
			`private ${boundary.name} detail`,
		);
	});
}

for (const corruption of [
	{
		kind: "genesis-schema",
		label: "unsupported genesis schema",
		failureCode: "UNSUPPORTED_VERSION",
		recover: "silent",
	},
	{
		kind: "engine-version",
		label: "hash-valid foreign engine version",
		failureCode: "UNSUPPORTED_VERSION",
		recover: "silent",
	},
	{
		kind: "range-gap",
		label: "operation range gap",
		failureCode: "RANGE_GAP",
		recover: "tap",
	},
] as const) {
	test(`production recovers a persisted ${corruption.label} without a stranger rebuild banner @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await resetGeneratedCheckpoint(page);
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		const canonicalHash = await world.getAttribute("data-state-hash");
		const canonicalAuthority = await generatedAuthorityFingerprint(page);

		await corruptGeneratedAuthority(page, corruption.kind);
		const corruptedAuthority = await generatedAuthorityFingerprint(page);
		expect(corruptedAuthority).not.toEqual(canonicalAuthority);

		await page.reload({ waitUntil: "domcontentloaded" });
		if (corruption.recover === "silent") {
			await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
				timeout: 30_000,
			});
			await expect(
				page.getByRole("button", { name: "Start a fresh local town" }),
			).toHaveCount(0);
		} else {
			await expect(world).toHaveAttribute("data-persistence", "quarantined", {
				timeout: 30_000,
			});
			await expect(world).toHaveAttribute(
				"data-persistence-claim",
				"admitted-deterministic-view",
			);
			await expect(world).toHaveAttribute(
				"data-persistence-failure-code",
				corruption.failureCode,
			);
			await expect(world).toHaveAttribute("data-play-rate", "1");
			await page
				.getByRole("button", { name: "Start a fresh local town" })
				.click();
		}
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		await expect(world).toHaveAttribute("data-state-hash", canonicalHash ?? "");
		expect(await generatedAuthorityFingerprint(page)).toEqual(
			canonicalAuthority,
		);
		expect(externalRequests).toEqual([]);
	});
}

for (const orphan of [
	{
		store: "authorityOperations",
		label: "operation",
		id: 0,
		mode: "foreign-declaration",
		declaration: "target",
	},
	{
		store: "authorityEvents",
		label: "event",
		id: 1,
		mode: "foreign-declaration",
		declaration: "target",
	},
	{
		store: "authorityReceipts",
		label: "receipt",
		mode: "foreign-declaration",
		id: "orphan-append",
		declaration: "target",
	},
	{
		store: "authoritySnapshots",
		label: "same-key genesis snapshot",
		id: "civilization-genesis",
		declaration: "target",
	},
	{
		store: "authorityOperations",
		label: "operation primary key with a foreign stream declaration",
		id: 0,
		declaration: "foreign",
	},
	{
		store: "authorityEvents",
		label: "event primary key with a foreign stream declaration",
		id: 1,
		declaration: "foreign",
	},
	{
		store: "authorityReceipts",
		label: "receipt primary key with a foreign stream declaration",
		id: "orphan-append",
		declaration: "foreign",
	},
	{
		store: "authoritySnapshots",
		label: "exact genesis primary key with a foreign stream declaration",
		id: "civilization-genesis",
		declaration: "foreign",
	},
] as const) {
	test(`production recovers a missing stream with an orphan ${orphan.label} without mutation @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await resetGeneratedCheckpoint(page);
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		const canonicalHash = await world.getAttribute("data-state-hash");
		const worldId = await world.getAttribute("data-world-id");
		if (worldId === null) throw new Error("generated world identity missing");
		const canonicalAuthority = await generatedAuthorityFingerprint(page);

		await replaceGeneratedAuthorityWithOrphan(page, { ...orphan, worldId });
		const orphanAuthority = await generatedAuthorityFingerprint(page);
		expect(orphanAuthority).not.toEqual(canonicalAuthority);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		await expect(
			page.getByRole("button", { name: "Start a fresh local town" }),
		).toHaveCount(0);
		await expect(world).toHaveAttribute("data-state-hash", canonicalHash ?? "");
		expect(await generatedAuthorityFingerprint(page)).toEqual(
			canonicalAuthority,
		);
		expect(externalRequests).toEqual([]);
	});
}

for (const mismatch of [
	{
		store: "authorityOperations",
		label: "operation",
		id: 0,
		mode: "logical-key-alias",
	},
	{
		store: "authorityEvents",
		label: "event",
		id: 1,
		mode: "logical-key-alias",
	},
	{
		store: "authorityReceipts",
		label: "receipt",
		mode: "logical-key-alias",
	},
	{
		store: "authoritySnapshots",
		label: "exact genesis snapshot",
		id: "civilization-genesis",
		mode: "foreign-declaration",
	},
	{
		store: "authorityOperations",
		label: "noncanonical logical operation-key collision",
		id: 0,
		mode: "logical-key-alias",
	},
] as const) {
	test(`production recovers an existing stream with a ${mismatch.label} without mutation @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await resetGeneratedCheckpoint(page);
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		const canonicalHash = await world.getAttribute("data-state-hash");
		const worldId = await world.getAttribute("data-world-id");
		if (worldId === null) throw new Error("generated world identity missing");
		const canonicalAuthority = await generatedAuthorityFingerprint(page);

		await forgeGeneratedAuthorityRowIdentity(page, {
			...mismatch,
			worldId,
		});
		const forgedAuthority = await generatedAuthorityFingerprint(page);
		expect(forgedAuthority).not.toEqual(canonicalAuthority);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		await expect(
			page.getByRole("button", { name: "Start a fresh local town" }),
		).toHaveCount(0);
		await expect(world).toHaveAttribute("data-state-hash", canonicalHash ?? "");
		expect(await generatedAuthorityFingerprint(page)).toEqual(
			canonicalAuthority,
		);
		expect(externalRequests).toEqual([]);
	});
}

for (const streamFixture of [
	{
		kind: "missing-alias",
		label: "missing exact stream with a noncanonical logical alias",
	},
	{
		kind: "missing-embedded-target",
		label: "missing exact stream with a foreign key and target genesis",
	},
	{
		kind: "existing-duplicate-alias",
		label: "existing stream with a duplicate logical alias",
	},
	{
		kind: "existing-scope-mismatch",
		label: "existing stream with primary/genesis disagreement",
	},
	{
		kind: "existing-malformed",
		label: "existing stream with a malformed target row",
	},
] as const) {
	test(`production recovers ${streamFixture.label} without mutation @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await resetGeneratedCheckpoint(page);
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		const canonicalHash = await world.getAttribute("data-state-hash");
		const worldId = await world.getAttribute("data-world-id");
		if (worldId === null) throw new Error("generated world identity missing");
		const canonicalAuthority = await generatedAuthorityFingerprint(page);

		await installGeneratedAuthorityStreamFixture(page, {
			...streamFixture,
			worldId,
		});
		const corruptedAuthority = await generatedAuthorityFingerprint(page);
		expect(corruptedAuthority).not.toEqual(canonicalAuthority);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
			timeout: 30_000,
		});
		await expect(
			page.getByRole("button", { name: "Start a fresh local town" }),
		).toHaveCount(0);
		await expect(world).toHaveAttribute("data-state-hash", canonicalHash ?? "");
		expect(await generatedAuthorityFingerprint(page)).toEqual(
			canonicalAuthority,
		);
		expect(externalRequests).toEqual([]);
	});
}

test("production recovery surfaces a synchronous database deletion failure and permits retry @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await resetGeneratedCheckpoint(page);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await corruptGeneratedAuthority(page, "range-gap");
	const corruptedAuthority = await generatedAuthorityFingerprint(page);
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(world).toHaveAttribute("data-persistence", "quarantined", {
		timeout: 30_000,
	});
	await page.evaluate(() => {
		Object.defineProperty(IDBFactory.prototype, "deleteDatabase", {
			configurable: true,
			value: () => {
				throw new DOMException("private deletion detail", "SecurityError");
			},
		});
	});
	const rebuild = page.getByRole("button", {
		name: "Start a fresh local town",
	});
	await rebuild.click();
	await expect(page.getByText(/Recovery could not start/u)).toBeVisible();
	await expect(rebuild).toBeEnabled();
	await expect(page.locator("body")).not.toContainText(
		"private deletion detail",
	);
	expect(await generatedAuthorityFingerprint(page)).toEqual(corruptedAuthority);
});

test("production recovery explains a blocked database deletion and resumes after the other tab closes @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await resetGeneratedCheckpoint(page);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await corruptGeneratedAuthority(page, "range-gap");
	const blocker = await page.context().newPage();
	await blocker.goto("/research", { waitUntil: "domcontentloaded" });
	await blocker.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v8");
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					request.result.onversionchange = () => undefined;
					(
						window as unknown as { heldGeneratedAuthority?: IDBDatabase }
					).heldGeneratedAuthority = request.result;
					resolve();
				};
			}),
	);
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(world).toHaveAttribute("data-persistence", "quarantined", {
		timeout: 30_000,
	});
	await page.getByRole("button", { name: "Start a fresh local town" }).click();
	await expect(
		page.getByText(/Close other EONFOLK tabs, then try again/u),
	).toBeVisible();
	await blocker.evaluate(() => {
		(
			window as unknown as { heldGeneratedAuthority?: IDBDatabase }
		).heldGeneratedAuthority?.close();
	});
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await blocker.close();
});

test("normal generated world commits sponsorship, counsel, and a factual Chronicle trace @generated-world @generated-target", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 480_000 : 240_000);
	const externalRequests = await isolateLocalWorld(page);
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const canvas = page.getByTestId("generated-world-canvas");
	const initialFailure = page.getByRole("heading", {
		name: "No incomplete world is shown as fact.",
	});
	await Promise.race([
		canvas.waitFor({ state: "attached", timeout: 20_000 }),
		initialFailure.waitFor({ state: "visible", timeout: 20_000 }),
	]);
	if (await initialFailure.isVisible()) {
		await page.getByText("Technical detail").click();
		throw new Error(
			(await page.locator("main.v1-genesis-shell code").textContent()) ??
				"generated world failed closed",
		);
	}
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	await expect(canvas).toHaveAttribute("data-render-policy", "on-demand");
	await selectSponsorCandidate(page);
	const sponsor = page.getByRole("button", { name: "Sponsor Mara" });
	const initialHash = await page
		.locator("main.v1-world")
		.getAttribute("data-state-hash");
	await expect(sponsor).toBeVisible();
	if (process.env.EONFOLK_CAPTURE_MEDIA === "1")
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: false,
			path: test.info().outputPath("sponsor-mara-focus.png"),
		});
	await sponsor.click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect
		.poll(() => page.locator("main.v1-world").getAttribute("data-state-hash"), {
			timeout: 30_000,
		})
		.not.toBe(initialHash);
	await expect
		.poll(
			() =>
				page.locator(".v1-context-panel").evaluate((panel) => {
					const overflow = panel.scrollWidth - panel.clientWidth;
					return overflow <= 1 ? "fits" : `overflow ${String(overflow)}`;
				}),
			{ timeout: linuxSemanticCi ? 15_000 : 8_000 },
		)
		.toBe("fits");
	for (const term of [
		"Check the stores first",
		"Abstain — close this boundary without counsel",
		"Keep watching",
	])
		await expect(page.getByRole("button", { name: term })).toBeVisible();
	await expect(
		page.getByText(/sourced count before any other move/u),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toBeDisabled();
	await expect(page.getByRole("button", { name: "Sponsor Mara" })).toHaveCount(
		0,
	);
	await page
		.getByRole("button", {
			name: "Check the stores first",
		})
		.click();
	await expect(
		page.getByRole("button", {
			name: "See Mara's decision",
		}),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await page.reload();
	const boundaryCanvas = page.getByTestId("generated-world-canvas");
	await expect(boundaryCanvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	await selectCanonicalMara(page);
	await expect(
		page.getByRole("button", {
			name: "See Mara's decision",
		}),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	const beforeBoundaryHash = await page
		.locator("main.v1-world")
		.getAttribute("data-state-hash");
	await page
		.getByRole("button", {
			name: "See Mara's decision",
		})
		.click();
	await expect
		.poll(() => page.locator("main.v1-world").getAttribute("data-state-hash"), {
			timeout: sponsorTransitionTimeout,
		})
		.not.toBe(beforeBoundaryHash);
	await expect(
		page.getByRole("button", { name: "Review Chronicle" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.getByRole("heading", { name: "What happened" }),
	).toBeVisible();
	await expect(page.getByRole("status")).toHaveCount(0);
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("inspection recorded");
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("Mara Vale");
	await page.getByText("Exact event evidence").click();
	await expect(
		page.locator("section[aria-label='Shareable factual replay'] code").first(),
	).toBeVisible();
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByRole("button", { name: "Copy factual trace" }).click();
	await expect(page.getByText("Factual trace copied.")).toBeVisible();
	const chronicleCitizenHref = await page
		.getByRole("link", { name: "Mara Vale" })
		.first()
		.getAttribute("href");
	expect(parseWorldFocusHref(chronicleCitizenHref ?? "")).toEqual({
		kind: "citizen",
		citizenId: "citizen-01",
	});
	await expect(page.getByText(/reserve count is recorded/iu)).toBeVisible();
	await expect(
		page.getByRole("button", { name: /Confront them publicly/iu }),
	).toHaveCount(0);
	const committed = await inspectGeneratedCheckpoint(page);
	expect(committed.eventCount).toBeGreaterThan(0);
	expect(committed.eventAppendReceiptCount).toBe(committed.eventCount);
	expect(committed.catchUpMarkerReceiptCount).toBeGreaterThanOrEqual(1);
	expect(committed.snapshotCount).toBeGreaterThan(0);
	expect(committed.simulationTime % 86_400).toBe(0);
	expect(committed.simulationTime).toBeGreaterThanOrEqual(86_400);
	await expect
		.poll(() => page.locator("main.v1-world").getAttribute("data-state-hash"), {
			timeout: 30_000,
		})
		.toBe(committed.stateHash);
	await page.screenshot({
		path: test.info().outputPath("normal-route-sponsor-chronicle.png"),
		fullPage: true,
	});

	await page.reload();
	const reloadedCanvas = page.getByTestId("generated-world-canvas");
	await Promise.race([
		reloadedCanvas.waitFor({ state: "attached", timeout: 20_000 }),
		page
			.getByRole("heading", {
				name: "No incomplete world is being shown as fact.",
			})
			.waitFor({ state: "visible", timeout: 20_000 }),
	]);
	const failure = page.getByRole("heading", {
		name: "No incomplete world is being shown as fact.",
	});
	if (await failure.isVisible()) {
		await page.getByText("Technical detail").click();
		throw new Error(
			(await page.locator("main.v1-genesis-shell code").textContent()) ??
				"generated world failed closed",
		);
	}
	await expect(reloadedCanvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await pauseWorldTime(page);
	expect(
		await page.locator("main.v1-world").getAttribute("data-state-hash"),
	).toBe(committed.stateHash);
	expect(
		await page.locator("main.v1-world").getAttribute("data-simulation-time"),
	).toBe(String(committed.simulationTime));
	await selectCanonicalMara(page);
	await expect(page.locator("p.v1-context-role + p")).toContainText(
		/Workshop|walking|inspecting|speaking|carrying|gathering|resting/u,
	);
	await expect(page.locator(".v1-presence-card")).not.toContainText(/site_/u);
	await page.getByRole("button", { name: "Review Chronicle" }).click();
	await expect(
		page.getByRole("heading", { name: "What happened" }),
	).toBeVisible({ timeout: 20_000 });
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("inspection recorded");
	expect(
		await page.locator("main.v1-world").getAttribute("data-state-hash"),
	).toBe(committed.stateHash);
	expect((await inspectGeneratedCheckpoint(page)).headHash).toBe(
		committed.headHash,
	);
	expect(browserErrors).toEqual([]);
	expect(externalRequests).toEqual([]);
});

for (const viewport of [
	{ width: 1728, height: 1117 },
	{ width: 1366, height: 768 },
	{ width: 390, height: 844 },
]) {
	test(`generated embodiment remains truthful and operable at ${viewport.width}x${viewport.height} @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await page.setViewportSize(viewport);
		if (viewport.width === 390) {
			await resetGeneratedCheckpoint(page);
			await page.setViewportSize(viewport);
			await page.goto("/");
			await page.getByRole("link", { name: "Enter Dawnmere" }).click();
			await expect(page).toHaveURL(/\/world$/u);
			const world = page.locator("main.v1-world");
			const canvas = page.getByTestId("generated-world-canvas");
			await expect(world).toHaveAttribute("data-asset-integrity", "verified");
			await expect(canvas).toHaveAttribute("data-ready", "true", {
				timeout: 20_000,
			});
			await expect(page.locator(".v1-world-title h1")).toHaveText("Dawnmere");
			await expect(page.locator(".v1-world-title")).toContainText("8 people");
			const followStartedAt = Date.now();
			await page.getByTestId("follow-mara").click();
			await expect(canvas).toHaveAttribute("data-following", "true");
			expect(Date.now() - followStartedAt).toBeLessThan(20_000);
			await expectFollowShowsPerson(
				page,
				canvas,
				test.info().outputPath("follow-mara-workshop-390x844.png"),
			);
			const headerBox = await page
				.locator("header.v1-world-header")
				.boundingBox();
			expect(headerBox?.height ?? 999).toBeLessThan(180);
			expect(
				await page.locator(".v1-world-title").evaluate((node) => {
					const overlay = getComputedStyle(node);
					return overlay.pointerEvents;
				}),
			).toBe("none");
			expect(
				await page.locator(".v1-world-title h1").evaluate((node) => {
					const box = node.getBoundingClientRect();
					const hit = document.elementFromPoint(
						box.left + Math.min(24, box.width / 2),
						box.top + box.height / 2,
					);
					return hit?.closest(".v1-world-title") ? "title" : "passthrough";
				}),
			).toBe("passthrough");
			const switcher = page.getByTestId("settlement-switcher");
			if (await switcher.isVisible()) {
				await switcher
					.getByRole("button", { name: /Second Founding/u })
					.click();
				await expect(page.locator(".v1-world-title h1")).toHaveText(
					"Second Founding",
				);
				const followOrin = page.getByTestId("follow-mara");
				await expect(followOrin).toContainText(/Orin/u);
				if ((await canvas.getAttribute("data-following")) !== "true")
					await followOrin.click();
				await expect(canvas).toHaveAttribute("data-following", "true");
				await expectFollowShowsPerson(
					page,
					canvas,
					test.info().outputPath("follow-orin-second-founding-390x844.png"),
				);
			}
			const chronicle = page.getByRole("button", {
				name: "Chronicle",
				exact: true,
			});
			if (await chronicle.isVisible()) {
				await chronicle.click();
				await expect(page.getByTestId("chronicle-record")).toBeVisible();
				await expect(page.getByTestId("chronicle-record")).toContainText(
					/fact|belief|happened/iu,
				);
				await expect(
					page.locator("details.v1-inspector-sheet > summary"),
				).toHaveText("People and work");
			}
			await page.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: false,
				path: test
					.info()
					.outputPath(`world-${viewport.width}x${viewport.height}.png`),
			});
			await page.locator(".v1-world-settings summary").click();
			await page.getByRole("button", { name: "Reduce motion" }).click();
			await expect(world).toHaveClass(/v1-reduced-motion/u);
			await page.getByRole("button", { name: "In words" }).click();
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			await expect
				.poll(() =>
					page.evaluate(
						() => document.documentElement.scrollWidth <= window.innerWidth + 1,
					),
				)
				.toBe(true);
			expect(externalRequests).toEqual([]);
			return;
		}
		await page.goto("/world");
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-asset-integrity", "verified");
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 20_000 },
		);
		await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: false,
			path: test
				.info()
				.outputPath(`world-${viewport.width}x${viewport.height}.png`),
		});
		await page.locator(".v1-world-settings summary").click();
		await page.getByRole("button", { name: "Reduce motion" }).click();
		await expect(world).toHaveClass(/v1-reduced-motion/u);
		await page.getByRole("button", { name: "In words" }).click();
		await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);
		expect(externalRequests).toEqual([]);
	});
}
