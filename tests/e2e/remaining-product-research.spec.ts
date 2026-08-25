import { expect, type Page, test } from "./support/eonfolk-fixture";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

async function keepLocal(page: Page): Promise<string[]> {
	const external: string[] = [];
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else {
			external.push(route.request().url());
			await route.abort("blockedbyclient");
		}
	});
	return external;
}

async function resetReleaseGenesisAuthority(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase(
					"eonfolk-generated-authority-v7",
				);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

async function authorityFingerprint(page: Page): Promise<string> {
	return await page.evaluate(
		() =>
			new Promise<string>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v7");
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const stores = [...database.objectStoreNames].sort();
						const transaction = database.transaction(stores, "readonly");
						const reads = Object.fromEntries(
							stores.map((store) => [
								store,
								transaction.objectStore(store).getAll(),
							]),
						) as Record<string, IDBRequest<unknown[]>>;
						transaction.addEventListener(
							"complete",
							async () => {
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
									const encoded = new TextEncoder().encode(
										canonical(
											Object.fromEntries(
												Object.entries(reads).map(([store, read]) => [
													store,
													read.result,
												]),
											),
										),
									);
									resolve(
										[
											...new Uint8Array(
												await crypto.subtle.digest("SHA-256", encoded),
											),
										]
											.map((value) => value.toString(16).padStart(2, "0"))
											.join(""),
									);
								} catch (error) {
									reject(error);
								} finally {
									database.close();
								}
							},
							{ once: true },
						);
					},
					{ once: true },
				);
			}),
	);
}

async function authorityStateHash(page: Page): Promise<string> {
	return await page.evaluate(
		() =>
			new Promise<string>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v7");
				request.onerror = () => reject(request.error);
				request.onsuccess = () => {
					const database = request.result;
					const transaction = database.transaction(
						"authorityStreams",
						"readonly",
					);
					const streams = transaction.objectStore("authorityStreams").getAll();
					transaction.onerror = () => reject(transaction.error);
					transaction.oncomplete = () => {
						const row = streams.result[0] as
							| { readonly head?: { readonly stateHash?: unknown } }
							| undefined;
						const stateHash = row?.head?.stateHash;
						database.close();
						if (typeof stateHash === "string") resolve(stateHash);
						else reject(new Error("accepted authority head is missing"));
					};
				};
			}),
	);
}

async function selectMara(page: Page): Promise<void> {
	await page.locator(".v1-context-panel").hover();
	const mara = page.locator(
		'ul.v1-presence-roster button[data-citizen-id="citizen-01"]',
	);
	await expect(mara).toContainText("Mara Vale");
	await mara.click();
}

for (const viewport of [
	{ name: "desktop", width: 1366, height: 768 },
	{ name: "mobile", width: 390, height: 844 },
] as const) {
	test(`remaining product research is a deliberate ${viewport.name} evidence mode`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		const external = await keepLocal(page);
		await page.goto("/research", { waitUntil: "networkidle" });

		await expect(page).toHaveTitle("EONFOLK — Research evidence");
		await expect(
			page.getByRole("heading", {
				name: "See what happened. See what the record can prove.",
			}),
		).toBeVisible();
		await expect(page.getByText("Evidence mode · outside play")).toBeVisible();
		await expect(
			page.locator("dt").filter({ hasText: "World record" }),
		).toBeVisible();
		await expect(
			page.locator("dt").filter({ hasText: "Citizen account" }),
		).toBeVisible();
		await expect(
			page.locator("dt").filter({ hasText: "Brain proposal" }),
		).toBeVisible();
		await expect(
			page.locator("dt").filter({ hasText: "Direct cause" }),
		).toBeVisible();
		await expect(
			page.locator("dt").filter({ hasText: "Allegation" }),
		).toBeVisible();
		await expect(
			page.getByText(/does not yet prove human attachment/iu),
		).toBeVisible();
		await expect(page.locator("[data-evidence-status]")).toHaveAttribute(
			"data-evidence-status",
			"empty",
		);
		await expect(
			page.getByText(/No local Release Genesis authority exists/iu),
		).toBeVisible();
		await expect(page.locator("canvas")).toHaveCount(0);
		await expect(
			page.getByText(/canonical hash|state hash|reducer/iu),
		).toHaveCount(0);
		expect(external).toEqual([]);

		await page.keyboard.press("Home");
		await page.keyboard.press("Tab");
		await expect(page.locator(":focus")).toBeVisible();
		await page.screenshot({
			path: test
				.info()
				.outputPath(`remaining-product-research-${viewport.name}.png`),
			fullPage: true,
		});
	});
}

test("abstention closes the first boundary and stale counsel cannot stack", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 420_000 : 180_000);
	await keepLocal(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await resetReleaseGenesisAuthority(page);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(page);
	await page.getByRole("button", { name: "Sponsor this person" }).click();
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible();
	await page
		.getByRole("button", {
			name: "Abstain — close this boundary without counsel",
		})
		.click();
	await expect(
		page.getByText(/first boundary is durably closed/iu),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	const abstainedStateHash = await authorityStateHash(page);

	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(page);
	await expect(
		page.getByRole("button", { name: "Review abstention Chronicle" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: /Verify the evidence first/iu }),
	).toHaveCount(0);
	await page
		.getByRole("button", { name: "Leave Dawnmere at this checkpoint" })
		.click();
	await page.getByRole("button", { name: "Return to Dawnmere" }).click();
	const advance = page.getByRole("button", {
		name: "Continue to Mara's independent outcome",
	});
	await expect(advance).toBeEnabled({ timeout: sponsorTransitionTimeout });
	await advance.click();
	await expect(
		page.getByRole("heading", { name: "What happened" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("independently continued the active Standing Plan");
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText(
		"Abstention preceded this outcome but is not recorded as its cause",
	);
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).not.toContainText(/you advised|your counsel/iu);
	await expect(
		page.getByText(/Observe Mara's independent plan/iu),
	).toBeVisible();
	const advancedStateHash = await authorityStateHash(page);
	expect(advancedStateHash).not.toBe(abstainedStateHash);

	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(page);
	await page
		.getByRole("button", { name: "Review abstention Chronicle" })
		.click();
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("independently continued the active Standing Plan", {
		timeout: sponsorTransitionTimeout,
	});
	expect(await authorityStateHash(page)).toBe(advancedStateHash);
});

test("a first-boundary action fails closed when its displayed context is stale", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 420_000 : 180_000);
	await keepLocal(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await resetReleaseGenesisAuthority(page);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(page);
	await page.getByRole("button", { name: "Sponsor this person" }).click();
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible();

	const other = await page.context().newPage();
	await keepLocal(other);
	await other.emulateMedia({ reducedMotion: "reduce" });
	await other.goto("/world", { waitUntil: "domcontentloaded" });
	await expect(other.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(other);
	await other.getByRole("button", { name: "Consider an intervention" }).click();
	await expect(
		other.getByRole("button", { name: "Consider an intervention" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await other.getByRole("button", { name: "Consider an intervention" }).click();
	await other
		.getByRole("button", {
			name: "Abstain — close this boundary without counsel",
		})
		.click();
	await expect(
		other.getByText(/first boundary is durably closed/iu),
	).toBeVisible({
		timeout: sponsorTransitionTimeout,
	});
	const beforeStaleAttempt = await authorityFingerprint(other);

	await page
		.getByRole("button", {
			name: "Verify the evidence first — delays a conclusion",
		})
		.click();
	await expect(page.getByRole("status")).toContainText(
		"CURRENT_CONTEXT_MISMATCH",
		{ timeout: sponsorTransitionTimeout },
	);
	expect(await authorityFingerprint(page)).toBe(beforeStaleAttempt);
	await other.close();
});

test("remaining product research reads one accepted Chronicle beat without authority mutation", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 420_000 : 180_000);
	const external = await keepLocal(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetReleaseGenesisAuthority(page);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-render-policy",
		"on-demand",
	);
	await selectMara(page);
	await page.getByRole("button", { name: "Sponsor this person" }).click();
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await page
		.getByRole("button", {
			name: "Confront them publicly — risks trust",
		})
		.click();
	await expect(
		page.getByRole("button", { name: "Leave Dawnmere at this checkpoint" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await selectMara(page);
	await expect(
		page.getByRole("button", { name: "Leave Dawnmere at this checkpoint" }),
	).toBeEnabled({ timeout: sponsorTransitionTimeout });
	await page
		.getByRole("button", { name: "Leave Dawnmere at this checkpoint" })
		.click();
	await page.getByRole("button", { name: "Return to Dawnmere" }).click();
	const beforeAccusationBoundaryHash =
		await world.getAttribute("data-state-hash");
	await page
		.getByRole("button", {
			name: "Advance one day to Mara's decision boundary",
		})
		.click();
	await expect
		.poll(() => world.getAttribute("data-state-hash"), {
			timeout: sponsorTransitionTimeout,
		})
		.not.toBe(beforeAccusationBoundaryHash);
	await expect(
		page.getByRole("button", { name: "Review Chronicle" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("rejected the advice");
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("Standing Plan continued");
	const acceptedStateHash = await authorityStateHash(page);
	expect(acceptedStateHash).toMatch(/^[0-9a-f]{64}$/u);
	const before = await authorityFingerprint(page);

	await page.goto("/research", { waitUntil: "networkidle" });
	const evidence = page.locator('[data-evidence-status="available"]');
	await expect(evidence).toBeVisible();
	await expect(
		evidence.getByRole("heading", {
			name: "Mara Vale's later decision boundary",
		}),
	).toBeVisible();
	await expect(evidence.getByText("Accepted world record")).toBeVisible();
	await expect(evidence.getByText("temporal predecessor")).toBeVisible();
	await expect(
		evidence.getByText("civilization.scheduler.counsel-boundary.v1"),
	).toBeVisible();
	await expect(
		evidence.getByText("This accepted beat contains no allegation."),
	).toBeVisible();
	await evidence.getByText("Accepted event IDs and provenance").click();
	await expect(evidence.locator("code")).toHaveCount(2);
	for (const eventId of await evidence.locator("code").allTextContents())
		expect(eventId).toMatch(/^event:/u);
	await expect(page.locator("canvas")).toHaveCount(0);
	expect(await authorityFingerprint(page)).toBe(before);
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
	await page.screenshot({
		path: test
			.info()
			.outputPath("remaining-product-research-accepted-desktop.png"),
		fullPage: true,
	});

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(evidence).toBeVisible();
	await expect(
		evidence.getByText("This accepted beat contains no allegation."),
	).toBeVisible();
	expect(await authorityFingerprint(page)).toBe(before);
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
	await page.screenshot({
		path: test
			.info()
			.outputPath("remaining-product-research-accepted-mobile.png"),
		fullPage: true,
	});

	await page.goto("/world", { waitUntil: "domcontentloaded" });
	await expect(world).toHaveAttribute(
		"data-state-hash",
		acceptedStateHash ?? "",
		{
			timeout: 30_000,
		},
	);
	expect(await authorityStateHash(page)).toBe(acceptedStateHash);
	expect(external).toEqual([]);
});
