import { expect, test, type Page } from "@playwright/test";

const viewports = [
	{ name: "desktop", width: 1728, height: 1117 },
	{ name: "laptop", width: 1366, height: 768 },
	{ name: "mobile", width: 390, height: 844 },
] as const;

async function blockExternalNetwork(page: Page) {
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

test("Release Genesis exposes one immutable, account-free world entry", async ({
	page,
}) => {
	const externalRequests = await blockExternalNetwork(page);
	await page.setViewportSize(viewports[0]);
	await page.goto("/genesis");

	await expect(
		page.getByRole("heading", {
			name: "A world exists before anyone arrives.",
		}),
	).toBeVisible();
	await expect(page.getByLabel("Immutable world identity")).toContainText(
		"eonfolk-genesis-world-v1",
	);
	await expect(page.getByLabel("Generated world summary")).toContainText(
		"64 terrain cells",
	);
	await page.getByText("Show the complete fixed seed").click();
	await expect(page.getByTestId("genesis-seed")).toHaveText(/^[0-9a-f]{64}$/u);

	await page.getByRole("link", { name: /^Enter /u }).click();
	await expect(page).toHaveURL(/\/world$/u);
	await expect(page.getByTestId("region-map")).toBeVisible();
	await expect(
		page.locator("main[data-world-id='eonfolk-genesis-world-v1']"),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /^Enter .* settlement$/u }),
	).toBeVisible();
	expect(externalRequests).toEqual([]);
});

test("keyboard navigation reaches region, settlement, and generalized entities", async ({
	page,
}) => {
	await blockExternalNetwork(page);
	await page.setViewportSize(viewports[1]);
	await page.goto("/world");

	const settlement = page.getByRole("button", {
		name: /^Enter .* settlement$/u,
	});
	await settlement.focus();
	await settlement.press("Enter");
	await expect(page.getByTestId("settlement-map")).toBeVisible();
	await expect(
		page.getByRole("img", { name: /settlement map/u }),
	).toBeVisible();

	const semanticSite = page
		.getByRole("region", { name: /Navigate .* without the map/u })
		.getByRole("button")
		.first();
	await semanticSite.focus();
	await semanticSite.press("Enter");
	await expect(page.getByText("INSPECTING SITE")).toBeVisible();

	await page.getByRole("button", { name: "Use semantic view" }).click();
	await expect(page.getByTestId("settlement-map")).toBeHidden();
	await expect(
		page.getByRole("heading", { name: /Navigate .* without the map/u }),
	).toBeVisible();
	await page.getByRole("button", { name: "Reduce motion" }).click();
	await expect(
		page.getByRole("button", { name: "Motion reduced" }),
	).toHaveAttribute("aria-pressed", "true");
});

for (const viewport of viewports) {
	test(`${viewport.name} keeps Genesis and the world visible without horizontal overflow`, async ({
		page,
	}) => {
		await blockExternalNetwork(page);
		await page.setViewportSize(viewport);
		await page.goto("/genesis");
		await expect(page.getByRole("link", { name: /^Enter /u })).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);

		await page.goto("/world");
		await expect(
			page.getByText("GENERATED WORLD · TIME ZERO", { exact: true }),
		).toBeVisible();
		await expect(page.getByTestId("region-map")).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);
	});
}

test("the existing Founder Alpha route remains the default", async ({
	page,
}) => {
	await blockExternalNetwork(page);
	await page.goto("/");
	await expect(page).toHaveURL(/\/$/u);
	await expect(
		page.getByRole("heading", { name: /Follow one life/u }),
	).toBeVisible();
});
