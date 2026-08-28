import { expect, type Page } from "./eonfolk-fixture";

/** Open the mobile People-and-work sheet when that quieter HUD is in effect. */
export async function revealPeopleAndWork(page: Page): Promise<void> {
	const inspector = page.locator("details.v1-inspector-sheet");
	if ((await inspector.count()) === 0) return;
	const summary = inspector.locator(":scope > summary");
	if (await summary.isVisible()) {
		if (
			!(await inspector.evaluate(
				(element) => (element as HTMLDetailsElement).open,
			))
		)
			await summary.evaluate((element) => (element as HTMLElement).click());
	}
	await expect(page.locator("aside.v1-context-panel").first()).toBeVisible();
}

export async function revealWorldTools(page: Page): Promise<void> {
	await revealPeopleAndWork(page);
	const tools = page.locator("details.v1-world-tools");
	if (
		!(await tools.evaluate((element) => (element as HTMLDetailsElement).open))
	)
		await tools
			.locator("summary")
			.evaluate((element) => (element as HTMLElement).click());
	await expect
		.poll(() =>
			tools.evaluate((element) => (element as HTMLDetailsElement).open),
		)
		.toBe(true);
}
