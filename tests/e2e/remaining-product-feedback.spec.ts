import { expect, type Page, test } from "@playwright/test";

const FEEDBACK_STORAGE_KEY = "eonfolk:release-genesis-feedback:v1";
const AUTHORITY_DATABASE = "eonfolk-generated-authority-v4";

type StoredFeedback = Readonly<{
	readonly schemaVersion: string;
	readonly category: string;
	readonly text: string;
	readonly delivery: string;
	readonly diagnostics: Readonly<{
		readonly schemaVersion: string;
		readonly identity: Readonly<{
			readonly experimentId: string;
			readonly runId: string;
			readonly viewportClass: string;
			readonly diagnosticsMode: string;
		}>;
		readonly capabilities: Readonly<{
			readonly feedbackDiagnostics: string;
			readonly networkRelay: string;
		}>;
		readonly health: Readonly<{
			readonly mode: string;
			readonly status: string;
		}>;
		readonly worldHead: Readonly<{
			readonly runId: string;
			readonly regionId: string;
			readonly status: string;
		}> | null;
	}>;
	readonly attachment: Readonly<{
		readonly mimeType: string;
		readonly width: number;
		readonly height: number;
		readonly byteLength: number;
		readonly dataUrl: string;
	}>;
}>;

async function keepWorldLocal(page: Page): Promise<string[]> {
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

async function resetLocalWorld(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		({ database, feedbackKey }) =>
			new Promise<void>((resolve, reject) => {
				localStorage.removeItem(feedbackKey);
				const request = indexedDB.deleteDatabase(database);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
		{ database: AUTHORITY_DATABASE, feedbackKey: FEEDBACK_STORAGE_KEY },
	);
}

async function authorityFingerprint(page: Page) {
	return page.evaluate(
		(databaseName) =>
			new Promise<{
				readonly counts: Readonly<Record<string, number>>;
				readonly digest: string;
			}>((resolve, reject) => {
				const request = indexedDB.open(databaseName);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const stores = [...database.objectStoreNames].sort();
						const transaction = database.transaction(stores, "readonly");
						const rows = Object.fromEntries(
							stores.map((store) => [
								store,
								transaction.objectStore(store).getAll(),
							]),
						) as Record<string, IDBRequest<unknown[]>>;
						transaction.addEventListener(
							"error",
							() => reject(transaction.error),
							{
								once: true,
							},
						);
						transaction.addEventListener(
							"complete",
							async () => {
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
									const bytes = new TextEncoder().encode(
										canonical({ stores: values }),
									);
									const digest = [
										...new Uint8Array(
											await crypto.subtle.digest("SHA-256", bytes),
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
							},
							{ once: true },
						);
					},
					{ once: true },
				);
			}),
		AUTHORITY_DATABASE,
	);
}

for (const viewport of [
	{ name: "desktop", width: 1366, height: 768, viewportClass: "wide" },
	{ name: "compact", width: 390, height: 844, viewportClass: "compact" },
] as const) {
	test(`remaining product feedback is bounded and Reality-neutral on ${viewport.name}`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		await page.setViewportSize(viewport);
		const externalRequests = await keepWorldLocal(page);
		await resetLocalWorld(page);
		await page.goto("/world", { waitUntil: "domcontentloaded" });

		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u, {
			timeout: 30_000,
		});
		const stateHash = await world.getAttribute("data-state-hash");
		const authorityBefore = await authorityFingerprint(page);
		const drawer = page.locator("details.v1-feedback-drawer");
		await drawer.scrollIntoViewIfNeeded();
		await expect(
			drawer.getByText("Release Genesis feedback", { exact: true }),
		).toBeVisible();
		const drawerBox = await drawer.boundingBox();
		expect(drawerBox).not.toBeNull();
		expect(drawerBox?.x ?? -1).toBeGreaterThanOrEqual(0);
		expect((drawerBox?.x ?? 0) + (drawerBox?.width ?? 0)).toBeLessThanOrEqual(
			viewport.width + 1,
		);

		await drawer.locator("summary").click();
		const panel = drawer.getByRole("region", { name: "What broke the spell?" });
		await panel
			.getByRole("button", { name: "Report issue / Save feedback locally" })
			.click();
		const consent = panel.getByLabel(/Include bounded structured diagnostics/i);
		await expect(consent).not.toBeChecked();
		await panel
			.getByLabel("What happened?")
			.fill(
				"The mill consequence disappeared. Contact player@example.com with ghp_abcdefghijklmnopqrstuvwxyz123456",
			);
		await panel
			.getByLabel("What did you expect? (optional)")
			.fill("The factual world consequence should remain visible.");
		await panel.getByLabel("Optional image").setInputFiles({
			name: "world-moment.png",
			mimeType: "image/png",
			buffer: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
				"base64",
			),
		});
		await expect(panel.getByText(/Sanitized to 1×1/iu)).toBeVisible();
		await consent.check();
		await panel.getByRole("button", { name: "Save feedback locally" }).click();
		await expect(panel.getByText(/nothing was uploaded/iu)).toBeVisible();

		const stored = await page.evaluate(
			(key) => localStorage.getItem(key),
			FEEDBACK_STORAGE_KEY,
		);
		expect(stored).not.toBeNull();
		expect(
			new TextEncoder().encode(stored ?? "").byteLength,
		).toBeLessThanOrEqual(4 * 1024 * 1024);
		expect(stored).not.toContain("player@example.com");
		expect(stored).not.toContain("ghp_");
		const reports = JSON.parse(stored ?? "[]") as readonly StoredFeedback[];
		expect(reports).toHaveLength(1);
		const report = reports[0];
		expect(report).toMatchObject({
			schemaVersion: "eonfolk-feedback-v1",
			category: "bug",
			delivery: "local-only",
			diagnostics: {
				schemaVersion: "eonfolk-local-feedback-diagnostics-v1",
				identity: {
					experimentId: "v1-civilization-standard-v5",
					runId: "eonfolk-genesis-world-v1",
					viewportClass: viewport.viewportClass,
					diagnosticsMode: "alpha",
				},
				capabilities: {
					feedbackDiagnostics: "active",
					networkRelay: "unsupported",
				},
				health: { mode: "alpha", status: "healthy" },
				worldHead: {
					runId: "eonfolk-genesis-world-v1",
					status: "healthy",
				},
			},
			attachment: {
				width: 1,
				height: 1,
			},
		});
		expect(report?.text).toContain("[redacted]");
		expect(report?.text.length).toBeLessThanOrEqual(1_930);
		expect(
			report?.attachment.byteLength ?? Number.POSITIVE_INFINITY,
		).toBeLessThanOrEqual(768 * 1024);
		expect(report?.attachment.dataUrl).toMatch(
			/^data:image\/(?:png|webp);base64,/u,
		);
		expect(
			new TextEncoder().encode(JSON.stringify(report?.diagnostics)).byteLength,
		).toBeLessThanOrEqual(24 * 1024);
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		expect(await authorityFingerprint(page)).toEqual(authorityBefore);
		expect(externalRequests).toEqual([]);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "", {
			timeout: 30_000,
		});
		await page.locator("details.v1-feedback-drawer").locator("summary").click();
		const restoredPanel = page.getByRole("region", {
			name: "What broke the spell?",
		});
		await restoredPanel
			.getByRole("button", { name: "Report issue / Save feedback locally" })
			.click();
		await expect(
			restoredPanel.getByRole("button", {
				name: /Delete queued feedback \(1\)/iu,
			}),
		).toBeVisible();
		await restoredPanel
			.getByRole("button", { name: /Delete queued feedback \(1\)/iu })
			.click();
		await expect(
			restoredPanel.getByText(/Deleted all locally queued feedback/iu),
		).toBeVisible();
		expect(
			await page.evaluate(
				(key) => localStorage.getItem(key),
				FEEDBACK_STORAGE_KEY,
			),
		).toBeNull();
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		expect(await authorityFingerprint(page)).toEqual(authorityBefore);
		expect(externalRequests).toEqual([]);
	});
}
