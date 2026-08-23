import { expect, type Page, test } from "@playwright/test";

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

async function resetGeneratedCheckpoint(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase("eonfolk-v1-civilization");
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
				readonly initializedHorizonDays: number;
				readonly horizonDays: number;
				readonly receiptCount: number;
				readonly firstFrom: number | null;
				readonly firstTo: number | null;
				readonly modelInvocations: number;
				readonly recordHash: string;
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-v1-civilization", 1);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const transaction = database.transaction(
							"canonical-checkpoints",
							"readonly",
						);
						const get = transaction
							.objectStore("canonical-checkpoints")
							.get("release-genesis:eonfolk-genesis-world-v1");
						get.addEventListener(
							"success",
							() => {
								const value = get.result as {
									initializedHorizonDays: number;
									horizonDays: number;
									catchUpReceipts: Array<{
										fromHorizonDays: number;
										toHorizonDays: number;
									}>;
									checkpoint: { metrics: { modelInvocations: number } };
									recordHash: string;
								};
								resolve({
									initializedHorizonDays: value.initializedHorizonDays,
									horizonDays: value.horizonDays,
									receiptCount: value.catchUpReceipts.length,
									firstFrom: value.catchUpReceipts[0]?.fromHorizonDays ?? null,
									firstTo: value.catchUpReceipts[0]?.toHorizonDays ?? null,
									modelInvocations: value.checkpoint.metrics.modelInvocations,
									recordHash: value.recordHash,
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

test("generated civilization is the identity-bound canonical /world @illustrated-target", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/genesis");
	await expect(page).toHaveTitle("EONFOLK — A civilization has begun");
	await expect(
		page.getByRole("heading", { name: "A civilization has already begun." }),
	).toBeVisible();
	await expect(page.getByLabel("Immutable world identity")).toContainText(
		"eonfolk-genesis-world-v1",
	);

	await page.getByRole("link", { name: "Enter the living world" }).click();
	await expect(page).toHaveURL(/\/world$/u);
	await expect(page).toHaveTitle("EONFOLK — Canonical generated world");
	await expect(page.getByRole("heading", { name: "Dawnmere" })).toBeVisible();
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute(
		"data-world-id",
		"eonfolk-genesis-world-v1",
	);
	await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u);
	await expect(world).toHaveAttribute("data-projection-status", "available");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb");
	await expect(world).toHaveAttribute("data-persistence-restored", "true");
	await expect(world).toHaveAttribute("data-catch-up-receipts", "1");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-engine", "playcanvas");
	await expect(canvas).toHaveAttribute("data-actor-count", "7");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});

	await page
		.getByRole("navigation", { name: "Settlements" })
		.getByRole("button", { name: "Second Founding 1 residents" })
		.click();
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-actor-count",
		"1",
	);
	await expect(
		page
			.getByRole("group", { name: "Canonical residents" })
			.getByRole("button"),
	).toHaveCount(1);
	await expect(
		page.getByText("Scheduler-owned current behavior", { exact: false }),
	).toBeVisible();
	const firstCheckpoint = await inspectGeneratedCheckpoint(page);
	expect(firstCheckpoint).toMatchObject({
		initializedHorizonDays: 1,
		horizonDays: 365,
		receiptCount: 1,
		firstFrom: 1,
		firstTo: 365,
		modelInvocations: 0,
	});
	await page.reload();
	await expect(page.locator("main.v1-world")).toHaveAttribute(
		"data-persistence-restored",
		"true",
	);
	expect((await inspectGeneratedCheckpoint(page)).recordHash).toBe(
		firstCheckpoint.recordHash,
	);
	expect(externalRequests).toEqual([]);
});

test("settlement overview and semantic people remain keyboard-operable", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/world");
	await page.getByRole("button", { name: "Settlements" }).click();
	await expect(page.getByTestId("generated-world-overview")).toBeVisible();
	await expect(page.locator(".generated-settlement-cards article")).toHaveCount(
		2,
	);
	await expect(page.getByText("ORIGIN SETTLEMENT")).toBeVisible();
	await expect(page.getByText("FOUNDED SETTLEMENT")).toBeVisible();

	const dawnmere = page.getByRole("button", { name: "Open Dawnmere" });
	await dawnmere.focus();
	await dawnmere.press("Enter");
	await page.getByRole("button", { name: "World in words" }).click();
	const semantic = page.getByTestId("generated-semantic-world");
	await expect(semantic).toBeVisible();
	await expect(semantic.locator("button")).toHaveCount(7);
	const citizen = semantic.locator("button").first();
	await citizen.focus();
	await citizen.press("Enter");
	await expect(citizen).toHaveAttribute("aria-pressed", "true");
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
});
