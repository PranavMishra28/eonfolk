import { expect, type Page, test } from "./support/eonfolk-fixture";

async function isolateLocalWorld(page: Page): Promise<void> {
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else await route.abort("blockedbyclient");
	});
}

async function resetGeneratedWorld(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				window.localStorage.removeItem("eonfolk:play:last-active-wall-ms:v1");
				window.localStorage.removeItem(
					"eonfolk:play:pending-return-catch-up-v1",
				);
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

test("Play advances a day without pressing Pause first @generated-world", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await isolateLocalWorld(page);
	await resetGeneratedWorld(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect(world).toHaveAttribute("data-play-rate", "1");
	const startDay = Number(await world.getAttribute("data-horizon-days"));
	expect(startDay).toBeGreaterThanOrEqual(1);
	await expect(world).toHaveAttribute(
		"data-horizon-days",
		String(startDay + 1),
		{
			timeout: 90_000,
		},
	);
	const peopleOrHappening = await page.evaluate(() => {
		const header = document.querySelector(".v1-world-title")?.textContent ?? "";
		const happening = document.querySelector("[data-happening-id]");
		return { header, hasHappening: happening !== null };
	});
	expect(
		/8 people/u.test(peopleOrHappening.header) ||
			/Orin/u.test(peopleOrHappening.header) ||
			peopleOrHappening.hasHappening,
	).toBe(true);
});

test("sponsoring Mara keeps the clock running and opens counsel @generated-world", async ({
	page,
}) => {
	test.setTimeout(180_000);
	await isolateLocalWorld(page);
	await resetGeneratedWorld(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await page
		.locator('ul.v1-presence-roster button[data-citizen-id="citizen-01"]')
		.click();
	await expect(
		page.getByRole("button", { name: "Sponsor Mara" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Sponsor Mara" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible({ timeout: 30_000 });
	await expect(
		page.getByRole("button", { name: "Check the stores first" }),
	).toBeVisible();
	await expect(page.locator("p.v1-context-role")).not.toContainText(
		"EXPEDITION-STEWARD",
	);
	await expect(page.locator(".v1-context-panel")).not.toContainText(
		"meeting-hall",
	);
	await page.getByRole("button", { name: "Follow", exact: true }).click();
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-following",
		"true",
	);
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-camera-target",
		/Mara/u,
	);
	const time = page.getByRole("navigation", { name: "Time" });
	await expect(time.getByRole("button", { name: "Pause" })).toBeEnabled();
	await expect(time.getByRole("button", { name: "Play" })).toBeEnabled();
	await expect(time.getByRole("button", { name: "Faster" })).toBeEnabled();
	const dayAtCounsel = Number(await world.getAttribute("data-horizon-days"));
	await time.getByRole("button", { name: "Faster" }).click();
	await expect(world).toHaveAttribute(
		"data-horizon-days",
		String(dayAtCounsel + 1),
		{ timeout: 60_000 },
	);
	await expect(
		page.locator('ul.v1-presence-roster button[data-citizen-id="citizen-01"]'),
	).toHaveAttribute("aria-pressed", "true");
});
