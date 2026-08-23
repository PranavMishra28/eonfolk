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

test("Release Genesis owns the product root and keeps evidence deliberate", async ({
	page,
}) => {
	const external = await keepLocal(page);
	await page.goto("/");
	await expect(page).toHaveTitle("EONFOLK — A civilization has begun");
	await expect(
		page.getByRole("heading", { name: "A civilization has already begun." }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Enter the living world" }),
	).toHaveAttribute("href", "/world");
	await expect(
		page.getByText(/canonical hash|reducer|persistence fence/iu),
	).toHaveCount(0);
	await expect(page.locator("main.riverhold-app")).toHaveCount(0);
	expect(external).toEqual([]);
});

for (const route of ["research", "developer"] as const) {
	test(`${route} is a separate keyboard-accessible information surface`, async ({
		page,
	}) => {
		const external = await keepLocal(page);
		await page.goto(`/${route}`);
		const main = page.locator("main.v1-information");
		await expect(main).toHaveAttribute("data-information-route", route);
		await expect(
			page.getByRole("navigation", { name: "EONFOLK surfaces" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "World", exact: true }),
		).toHaveAttribute("href", "/world");
		await page.keyboard.press("Tab");
		await expect(page.locator(":focus")).toBeVisible();
		await expect(page.locator("canvas")).toHaveCount(0);
		expect(external).toEqual([]);
	});
}

test("Founder Alpha remains available only at the explicit legacy route", async ({
	page,
}) => {
	await page.goto("/legacy");
	await expect(
		page.getByRole("heading", { name: /follow one life/iu }),
	).toBeVisible({
		timeout: 20_000,
	});
	await expect(page).toHaveURL(/\/legacy$/u);
});
