import { expect, type Locator, type Page } from "./eonfolk-fixture";

async function toggleDetails(
	page: Page,
	selector: string,
	open: boolean,
): Promise<void> {
	const details = page.locator(selector).first();
	try {
		await details.waitFor({ state: "attached", timeout: 8_000 });
	} catch {
		return;
	}
	const isOpen = (await details.getAttribute("open")) !== null;
	if (isOpen === open) return;
	const summary = details.locator(":scope > summary");
	if (await summary.isVisible()) {
		await summary.evaluate((element) => {
			(element as HTMLElement).click();
		});
	} else {
		await details.evaluate((element, nextOpen) => {
			(element as HTMLDetailsElement).open = nextOpen;
			element.dispatchEvent(new Event("toggle", { bubbles: true }));
		}, open);
	}
	if (open)
		await expect(details).toHaveAttribute("open", "", { timeout: 15_000 });
	else await expect(details).not.toHaveAttribute("open", { timeout: 15_000 });
}

async function openDetails(page: Page, selector: string): Promise<void> {
	await toggleDetails(page, selector, true);
}

/** Open the mobile People-and-work sheet when that quieter HUD is in effect. */
export async function revealPeopleAndWork(page: Page): Promise<void> {
	const inspector = page.locator("details.v1-inspector-sheet");
	const summary = inspector.locator(":scope > summary");
	if (await summary.isVisible())
		await openDetails(page, "details.v1-inspector-sheet");
	await expect(page.locator("aside.v1-context-panel").first()).toBeVisible();
}

export async function revealWorldTools(page: Page): Promise<void> {
	await revealPeopleAndWork(page);
	await openDetails(page, "details.v1-world-tools");
}

/** Close camera tools and settings so overflow is measured on the quieter HUD. */
export async function concealWorldTools(page: Page): Promise<void> {
	await toggleDetails(page, "details.v1-world-tools", false);
	await toggleDetails(page, "details.v1-world-settings", false);
}

/**
 * Re-open the resolved Chronicle replay after a reload or history navigation.
 * Click Review Chronicle only when the replay region is missing — that button
 * re-establishes when already resolved, which unmounts a visible replay.
 */
export async function openChronicleReplay(page: Page): Promise<void> {
	await revealPeopleAndWork(page);
	const replay = page.getByRole("region", { name: "Shareable factual replay" });
	if (await replay.isVisible()) return;
	const mara = page.locator(
		'ul.v1-presence-roster button[data-citizen-id="citizen-01"]',
	);
	if (await mara.isVisible()) {
		await mara.evaluate((element) => {
			(element as HTMLElement).click();
		});
	}
	if (await replay.isVisible()) return;
	const review = page.getByRole("button", {
		name: /Review Chronicle|Review abstention Chronicle/u,
	});
	const restoreTimeout =
		process.env.EONFOLK_ALLOW_LINUX_CI === "1" ? 120_000 : 30_000;
	await expect(review).toBeVisible({ timeout: restoreTimeout });
	await expect(review).toBeEnabled({ timeout: restoreTimeout });
	await review.evaluate((element) => {
		(element as HTMLElement).click();
	});
	await expect(replay).toBeVisible({ timeout: restoreTimeout });
}

export async function pressTimeControl(
	page: Page,
	name: string,
): Promise<void> {
	const button = page
		.locator("header.v1-world-header")
		.getByRole("button", { name, exact: true });
	await expect(button).toBeVisible({ timeout: 30_000 });
	await button.evaluate((element) => {
		(element as HTMLElement).click();
	});
}

export async function waitForEnabledCounsel(
	page: Page,
	name: string,
	timeout: number,
): Promise<Locator> {
	const button = page.getByRole("button", { name });
	await expect(button).toBeVisible({ timeout });
	await expect(button).toBeEnabled({ timeout });
	return button;
}
