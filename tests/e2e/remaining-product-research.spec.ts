import { expect, type Page, test } from "@playwright/test";

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
