import { expect, test } from "@playwright/test";

const viewports = [
	{ name: "desktop-1728x1117", width: 1728, height: 1117 },
	{ name: "laptop-1366x768", width: 1366, height: 768 },
	{ name: "mobile-390x844", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
	test(`observer projection is useful and operable at ${viewport.name}`, async ({
		page,
	}) => {
		const external: string[] = [];
		page.on("request", (request) => {
			if (!request.url().startsWith("http://127.0.0.1:4173"))
				external.push(request.url());
		});
		await page.setViewportSize(viewport);
		await page.goto(`/observer/V01?capture=1`);
		await expect(page.locator(".gate0-visual__canvas")).toHaveAttribute(
			"data-ready",
			"true",
		);
		await expect(page.getByText("Riverhold", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Follow Mara" }),
		).toBeEnabled();
		await expect(page.getByRole("button", { name: "People" })).toBeEnabled();
		await expect(
			page.getByText(
				"Iven and Toma exchanged wood and rations; the exchange settled.",
			),
		).toBeVisible();
		await expect(
			page.getByText(
				"Iven and Toma exchanged wood and rations at the Riverhold market.",
			),
		).toBeVisible();
		await page.getByRole("button", { name: "Follow Mara" }).focus();
		await expect(
			page.getByRole("button", { name: "Follow Mara" }),
		).toBeFocused();
		await expect(page.locator("canvas")).toHaveCount(1);
		await page.screenshot({
			animations: "disabled",
			path: `docs/exec-plans/evidence/001/studies/gate-0/viewports/${viewport.name}.png`,
		});
		expect(external).toEqual([]);
	});
}

test("product treatment is branding-hidden and keyboard operable", async ({
	page,
}) => {
	await page.goto("/product/P01");
	await page.getByRole("button", { name: "I agree" }).click();
	await expect(
		page.getByRole("heading", { name: "Follow Mara" }),
	).toBeVisible();
	await expect(page.getByText("EONFOLK")).toHaveCount(0);
	await page.getByLabel("Ask Mara to verify the count privately").check();
	await expect(
		page.getByRole("button", { name: "Confirm advice" }),
	).toBeEnabled();
});
