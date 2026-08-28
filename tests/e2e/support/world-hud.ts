import { expect, type Locator, type Page } from "./eonfolk-fixture";

async function openDetails(locator: Locator): Promise<void> {
	if ((await locator.count()) === 0) return;
	await locator.evaluate((element) => {
		(element as HTMLDetailsElement).open = true;
	});
	await expect
		.poll(
			() => locator.evaluate((element) => (element as HTMLDetailsElement).open),
			{ timeout: 15_000 },
		)
		.toBe(true);
}

/** Open the mobile People-and-work sheet when that quieter HUD is in effect. */
export async function revealPeopleAndWork(page: Page): Promise<void> {
	const inspector = page.locator("details.v1-inspector-sheet");
	if ((await inspector.count()) === 0) return;
	const summary = inspector.locator(":scope > summary");
	if (await summary.isVisible()) await openDetails(inspector);
	await expect(page.locator("aside.v1-context-panel").first()).toBeVisible();
}

export async function revealWorldTools(page: Page): Promise<void> {
	await revealPeopleAndWork(page);
	await openDetails(page.locator("details.v1-world-tools"));
}

/** Re-open the resolved Chronicle replay after a reload or history navigation. */
export async function openChronicleReplay(page: Page): Promise<void> {
	await revealPeopleAndWork(page);
	const review = page.getByRole("button", {
		name: /Review Chronicle|Review abstention Chronicle/u,
	});
	await expect(review).toBeVisible({ timeout: 30_000 });
	await review.click();
	await expect(
		page.getByRole("region", { name: "Shareable factual replay" }),
	).toBeVisible();
}
