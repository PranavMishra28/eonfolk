import { expect, type Page, test } from "./support/eonfolk-fixture";

const FAULT_KEY = "eonfolk:e2e-generated-world-fault-v1";
const FAULT_APPLIED_KEY = `${FAULT_KEY}:applied`;

type FaultKind =
	| "model-provider"
	| "persistence"
	| "checkpoint"
	| "renderer-webgl"
	| "asset"
	| "navigation"
	| "authoritative-invariant"
	| "latency";

async function injectFault(page: Page, kind: FaultKind): Promise<void> {
	await page.addInitScript(
		({ appliedKey, key, value }) => {
			if (sessionStorage.getItem(appliedKey) !== null) return;
			sessionStorage.setItem(key, value);
			sessionStorage.setItem(appliedKey, "true");
		},
		{ appliedKey: FAULT_APPLIED_KEY, key: FAULT_KEY, value: kind },
	);
}

async function isolateGeneratedWorld(page: Page): Promise<string[]> {
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

async function openFaultedWorld(
	page: Page,
	kind: FaultKind,
): Promise<string[]> {
	const externalRequests = await isolateGeneratedWorld(page);
	await injectFault(page, kind);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	return externalRequests;
}

async function expectRecoverableWorld(
	page: Page,
	kind: FaultKind,
): Promise<string> {
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-fault-kind", kind, {
		timeout: 30_000,
	});
	await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u);
	await expect(page.getByTestId("generated-world-fault-status")).toBeVisible();
	return (await world.getAttribute("data-state-hash")) ?? "";
}

async function authorityFingerprint(page: Page): Promise<unknown> {
	return page.evaluate(async () => {
		const databases = await indexedDB.databases();
		if (
			!databases.some(({ name }) => name === "eonfolk-generated-authority-v7")
		)
			return null;
		return await new Promise((resolve, reject) => {
			const request = indexedDB.open("eonfolk-generated-authority-v7");
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const database = request.result;
				const stores = [...database.objectStoreNames].sort();
				if (stores.length === 0) {
					void crypto.subtle
						.digest("SHA-256", new TextEncoder().encode('{"stores":{}}'))
						.then((result) => {
							resolve({
								counts: {},
								digest: [...new Uint8Array(result)]
									.map((byte) => byte.toString(16).padStart(2, "0"))
									.join(""),
							});
						})
						.catch(reject)
						.finally(() => database.close());
					return;
				}
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
						const values = Object.fromEntries(
							Object.entries(rows).map(([store, result]) => [
								store,
								result.result,
							]),
						);
						const bytes = new TextEncoder().encode(
							canonical({ stores: values }),
						);
						const digest = [
							...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
						]
							.map((byte) => byte.toString(16).padStart(2, "0"))
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
		});
	});
}

async function generatedFaultDiagnostic(page: Page): Promise<{
	readonly observer: {
		readonly worldHead: unknown;
		readonly trace: readonly {
			readonly name: string;
			readonly category: string;
			readonly outcome: string;
			readonly fields: Readonly<Record<string, unknown>>;
		}[];
	};
	readonly outcome: {
		readonly name: string;
		readonly category: string;
		readonly outcome: string;
		readonly fields: Readonly<Record<string, unknown>>;
	};
}> {
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window
						.__EONFOLK_OBSERVER__?.()
						.trace.some((event) => event.name === "generated-fault-outcome"),
				),
			),
		)
		.toBe(true);
	return page.evaluate(() => {
		const observer = window.__EONFOLK_OBSERVER__?.();
		if (observer === undefined)
			throw new Error("Bounded fault observer is unavailable");
		const outcome = observer.trace.find(
			(event) => event.name === "generated-fault-outcome",
		);
		if (outcome === undefined)
			throw new Error("Closed generated-fault outcome is unavailable");
		return { observer, outcome };
	});
}

test.describe
	.serial("generated Release Genesis fault matrix @fault", () => {
		test.setTimeout(90_000);

		test("model/provider loss preserves the deterministic Standard Brain world", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "model-provider");
			const hash = await expectRecoverableWorld(page, "model-provider");
			const world = page.locator("main.v1-world");
			const diagnostics = page.locator("html");
			await expect(diagnostics).toHaveAttribute(
				"data-fault-cognition-provider-attempts",
				/^[1-9][0-9]*$/u,
			);
			const attempts = await diagnostics.getAttribute(
				"data-fault-cognition-provider-attempts",
			);
			await expect(diagnostics).toHaveAttribute(
				"data-fault-cognition-fallbacks",
				attempts ?? "",
			);
			await expect(diagnostics).toHaveAttribute(
				"data-fault-cognition-actor-visible-contexts",
				attempts ?? "",
			);
			await expect(diagnostics).toHaveAttribute(
				"data-fault-cognition-kinds",
				/^(standard-brain,)*standard-brain$/u,
			);
			await expect(diagnostics).toHaveAttribute(
				"data-fault-cognition-hidden-field-leaks",
				"0",
			);
			await expect(
				page.getByTestId("generated-world-fault-status"),
			).toContainText("deterministic Standard Brain remains authoritative");
			await page.waitForTimeout(250);
			await expect(world).toHaveAttribute("data-state-hash", hash);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "cognition",
				outcome: "recovered",
				fields: {
					code: "GENERATED_MODEL_PROVIDER_UNAVAILABLE",
					phase: "head-preserved",
					status: "standard-brain-fallback",
				},
			});
			const observerBefore = JSON.stringify(diagnostic.observer.worldHead);
			await page.waitForTimeout(50);
			expect(
				JSON.stringify(
					(await generatedFaultDiagnostic(page)).observer.worldHead,
				),
			).toBe(observerBefore);
			expect(JSON.stringify(diagnostic.observer)).not.toContain(
				"Injected cognition provider unavailable",
			);
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			expect(externalRequests).toEqual([]);
		});

		test("persistence loss uses the explicit non-persistent deterministic adapter", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "persistence");
			const stateHash = await expectRecoverableWorld(page, "persistence");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-persistence",
				"unavailable",
			);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "persistence",
				outcome: "recovered",
				fields: {
					code: "GENERATED_PERSISTENCE_UNAVAILABLE",
					phase: "head-preserved",
					status: "admitted-deterministic-view",
				},
			});
			expect(JSON.stringify(diagnostic.observer)).not.toContain(
				"Injected IndexedDB",
			);
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			await page.evaluate((key) => sessionStorage.removeItem(key), FAULT_KEY);
			await page.reload({ waitUntil: "domcontentloaded" });
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				stateHash,
				{ timeout: 30_000 },
			);
			expect(externalRequests).toEqual([]);
		});

		for (const kind of ["checkpoint", "authoritative-invariant"] as const) {
			test(`${kind} failure hides all world facts and recovers only after retry`, async ({
				page,
			}) => {
				const externalRequests = await isolateGeneratedWorld(page);
				await page.goto("/world", { waitUntil: "domcontentloaded" });
				const canonical = page.locator("main.v1-world");
				await expect(canonical).toHaveAttribute(
					"data-state-hash",
					/^[0-9a-f]{64}$/u,
					{ timeout: 30_000 },
				);
				const canonicalHash = await canonical.getAttribute("data-state-hash");
				const before = await authorityFingerprint(page);
				await page.evaluate(
					({ key, value }) => sessionStorage.setItem(key, value),
					{ key: FAULT_KEY, value: kind },
				);
				await page.reload({ waitUntil: "domcontentloaded" });
				const error = page.locator("main.v1-genesis-shell");
				await expect(error).toHaveAttribute("data-fault-kind", kind, {
					timeout: 30_000,
				});
				await expect(error).toHaveAttribute(
					"data-fault-disposition",
					"fail-closed",
				);
				await expect(page.locator("html")).toHaveAttribute(
					"data-fault-candidate-checkpoints",
					"5",
				);
				if (kind === "checkpoint")
					await expect(error).toHaveAttribute(
						"data-fault-error-code",
						"STALE_STATE",
					);
				const diagnostic = await generatedFaultDiagnostic(page);
				expect(diagnostic.outcome).toMatchObject({
					category: "sentinel",
					outcome: "rejected",
					fields: {
						code:
							kind === "checkpoint"
								? "GENERATED_CHECKPOINT_REJECTED"
								: "GENERATED_AUTHORITY_INVARIANT_FAILED",
						phase: "head-preserved",
						recovery: "safe-stop",
						status: "candidate-rejected",
					},
				});
				await expect(error.locator("details code")).toHaveText(
					kind === "checkpoint"
						? "GENERATED_CHECKPOINT_REJECTED"
						: "GENERATED_AUTHORITY_INVARIANT_FAILED",
				);
				expect(JSON.stringify(diagnostic.observer)).not.toContain(
					"injected-pre-commit-authority-invariant",
				);
				expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
				await expect(page.locator("main.v1-world")).toHaveCount(0);
				expect(await authorityFingerprint(page)).toEqual(before);
				await expect(
					page.getByRole("heading", {
						name: "No incomplete world is shown as fact.",
					}),
				).toBeVisible();
				await page
					.getByRole("button", { name: "Retry without the failed local input" })
					.click();
				await expect(page.locator("main.v1-world")).toHaveAttribute(
					"data-state-hash",
					canonicalHash ?? "",
					{ timeout: 30_000 },
				);
				expect(externalRequests).toEqual([]);
			});
		}

		test("renderer/WebGL loss switches to the semantic world without changing authority", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "renderer-webgl");
			const hash = await expectRecoverableWorld(page, "renderer-webgl");
			const authority = await authorityFingerprint(page);
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			await expect(page.getByTestId("generated-world-canvas")).toHaveCount(0);
			await page
				.locator(".generated-settlement-switcher button")
				.first()
				.click();
			await expect(page.getByTestId("generated-world-canvas")).toHaveCount(0);
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				hash,
			);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "sentinel",
				outcome: "recovered",
				fields: {
					code: "GENERATED_RENDERER_UNAVAILABLE",
					domain: "render",
					invariant: "render-reality-noninterference",
					phase: "head-preserved",
					recovery: "semantic-fallback",
					status: "renderer-unavailable",
				},
			});
			expect(
				diagnostic.observer.trace.find(
					(event) => event.name === "invariant-violation",
				),
			).toMatchObject({
				category: "sentinel",
				fields: {
					code: "GENERATED_RENDERER_UNAVAILABLE",
					domain: "render",
					invariant: "render-reality-noninterference",
				},
			});
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			await page
				.getByRole("button", { name: "Retry embodied renderer" })
				.click();
			await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
				"data-ready",
				"true",
				{ timeout: 30_000 },
			);
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				hash,
			);
			expect(await authorityFingerprint(page)).toEqual(authority);
			expect(externalRequests).toEqual([]);
		});

		test("reference-integrity failure keeps the semantic world usable", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "asset");
			await expectRecoverableWorld(page, "asset");
			const authority = await authorityFingerprint(page);
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-asset-integrity",
				"failed",
			);
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			await page.getByRole("button", { name: "Zoom in" }).click();
			await expect(
				page
					.getByTestId("generated-semantic-world")
					.getByTestId("generated-camera-status"),
			).toHaveAttribute("data-semantic-scale", /(region|town|citizen)/u);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "sentinel",
				outcome: "recovered",
				fields: {
					code: "GENERATED_ASSET_REJECTED",
					domain: "integrity",
					phase: "head-preserved",
					recovery: "semantic-fallback",
					status: "reference-rejected",
				},
			});
			expect(
				diagnostic.observer.trace.find(
					(event) => event.name === "invariant-violation",
				),
			).toMatchObject({
				fields: {
					code: "GENERATED_ASSET_REJECTED",
					domain: "integrity",
				},
			});
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			expect(await authorityFingerprint(page)).toEqual(authority);
			expect(externalRequests).toEqual([]);
		});

		test("malformed asset manifest crosses the browser verifier and degrades semantically @fault", async ({
			page,
		}) => {
			const externalRequests = await isolateGeneratedWorld(page);
			await page.route(
				"**/assets/generated/ASSET_MANIFEST.json",
				async (route) => {
					const response = await route.fetch();
					const manifest = (await response.json()) as Record<string, unknown>;
					await route.fulfill({
						response,
						json: { ...manifest, schemaVersion: "untrusted-manifest-v0" },
					});
				},
			);
			await page.goto("/world", { waitUntil: "domcontentloaded" });
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-asset-integrity",
				"failed",
				{ timeout: 30_000 },
			);
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			expect(externalRequests).toEqual([]);
		});

		test("malformed navigation is rejected without authority or view mutation", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "navigation");
			const hash = await expectRecoverableWorld(page, "navigation");
			const authority = await authorityFingerprint(page);
			const canvas = page.getByTestId("generated-world-canvas");
			await expect(canvas).toHaveAttribute("data-ready", "true", {
				timeout: 20_000,
			});
			await expect(canvas).toHaveAttribute("data-focus-kind", "overview");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-navigation-rejection",
				"invalid-envelope",
			);
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("eonfolk:generated-navigation", {
						detail: { type: "zoom", deltaMm: Number.POSITIVE_INFINITY },
					}),
				);
			});
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("eonfolk:generated-navigation", {
						detail: {
							type: "select-citizen",
							citizenId: "foreign-citizen",
						},
					}),
				);
			});
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-navigation-rejection",
				"foreign-reference",
			);
			await expect(canvas).toHaveAttribute("data-focus-kind", "overview");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				hash,
			);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "ui",
				outcome: "rejected",
				fields: {
					code: "GENERATED_NAVIGATION_REJECTED",
					operation: "navigation-intent",
					phase: "pre-dispatch",
					status: "candidate-rejected",
				},
			});
			expect(
				diagnostic.observer.trace.some(
					(event) =>
						event.name === "invariant-violation" &&
						event.fields.code === "GENERATED_NAVIGATION_REJECTED",
				),
			).toBe(false);
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			expect(await authorityFingerprint(page)).toEqual(authority);
			expect(externalRequests).toEqual([]);
		});

		test("latency shows no world facts until canonical generation completes", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "latency");
			await expect(
				page.getByRole("heading", {
					name: "Advancing one world through its first year.",
				}),
			).toBeVisible();
			await expect(page.locator("main.v1-world")).toHaveCount(0);
			await page.waitForTimeout(500);
			expect(await authorityFingerprint(page)).toBeNull();
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				/^[0-9a-f]{64}$/u,
				{ timeout: 30_000 },
			);
			const diagnostic = await generatedFaultDiagnostic(page);
			expect(diagnostic.outcome).toMatchObject({
				category: "performance",
				outcome: "recovered",
				fields: {
					operation: "authority-advance",
					phase: "committed-after-wait",
					status: "completed",
				},
			});
			expect(JSON.stringify(diagnostic.observer)).not.toContain("stateHash");
			expect(externalRequests).toEqual([]);
		});

		test("stale IndexedDB is quarantined and rebuilt only after explicit recovery @fault", async ({
			page,
		}) => {
			const externalRequests = await isolateGeneratedWorld(page);
			await page.goto("/research", { waitUntil: "domcontentloaded" });
			await page.evaluate(async () => {
				await new Promise<void>((resolve, reject) => {
					const deletion = indexedDB.deleteDatabase(
						"eonfolk-generated-authority-v7",
					);
					deletion.onsuccess = () => resolve();
					deletion.onerror = () => reject(deletion.error);
				});
				await new Promise<void>((resolve, reject) => {
					const open = indexedDB.open("eonfolk-generated-authority-v7", 1);
					open.onsuccess = () => {
						open.result.close();
						resolve();
					};
					open.onerror = () => reject(open.error);
				});
			});
			const staleAuthority = await authorityFingerprint(page);
			await page.goto("/world", { waitUntil: "domcontentloaded" });
			const world = page.locator("main.v1-world");
			await expect(world).toHaveAttribute("data-persistence", "quarantined", {
				timeout: 30_000,
			});
			expect(await authorityFingerprint(page)).toEqual(staleAuthority);
			await page
				.getByRole("button", { name: "Rebuild local checkpoint" })
				.click();
			await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
				timeout: 30_000,
			});
			expect(externalRequests).toEqual([]);
		});

		test("corrupt IndexedDB ledger is quarantined without presenting its facts @fault", async ({
			page,
		}) => {
			const externalRequests = await isolateGeneratedWorld(page);
			await page.goto("/world", { waitUntil: "domcontentloaded" });
			const world = page.locator("main.v1-world");
			await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
				timeout: 30_000,
			});
			const canonicalHash = await world.getAttribute("data-state-hash");
			const canonicalAuthority = await authorityFingerprint(page);
			await page.evaluate(
				() =>
					new Promise<void>((resolve, reject) => {
						const open = indexedDB.open("eonfolk-generated-authority-v7");
						open.onerror = () => reject(open.error);
						open.onsuccess = () => {
							const database = open.result;
							const transaction = database.transaction(
								"authorityEvents",
								"readwrite",
							);
							const store = transaction.objectStore("authorityEvents");
							const rows = store.getAll();
							rows.onsuccess = () => {
								const first = rows.result[0] as
									| { value?: Record<string, unknown> }
									| undefined;
								if (first === undefined) {
									transaction.abort();
									return;
								}
								store.put({
									...first,
									value: { ...first.value, payload: { corrupt: true } },
								});
							};
							transaction.oncomplete = () => {
								database.close();
								resolve();
							};
							transaction.onerror = () => reject(transaction.error);
							transaction.onabort = () =>
								reject(transaction.error ?? new Error("corruption aborted"));
						};
					}),
			);
			const corruptedAuthority = await authorityFingerprint(page);
			expect(corruptedAuthority).not.toEqual(canonicalAuthority);
			await page.reload({ waitUntil: "domcontentloaded" });
			await expect(world).toHaveAttribute("data-persistence", "quarantined", {
				timeout: 30_000,
			});
			await expect(world).toHaveAttribute(
				"data-state-hash",
				canonicalHash ?? "",
			);
			expect(await authorityFingerprint(page)).toEqual(corruptedAuthority);
			await page
				.getByRole("button", { name: "Rebuild local checkpoint" })
				.click();
			await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
				timeout: 30_000,
			});
			expect(externalRequests).toEqual([]);
		});
	});
