import { expect, type Locator, type Page } from "./eonfolk-fixture";

async function detailsSnapshot(
	page: Page,
	selector: string,
): Promise<{ count: number; open: boolean }> {
	return page.evaluate((detailsSelector) => {
		const nodes = [
			...document.querySelectorAll<HTMLDetailsElement>(detailsSelector),
		];
		return {
			count: nodes.length,
			open: nodes.some((node) => node.open),
		};
	}, selector);
}

/** Open a details element through its summary so React `onToggle` sees the click. */
async function openDetails(page: Page, selector: string): Promise<void> {
	const snapshot = await detailsSnapshot(page, selector);
	if (snapshot.count === 0 || snapshot.open) return;
	const summary = page.locator(`${selector} > summary`);
	if (await summary.isVisible()) {
		await summary.evaluate((element) => {
			(element as HTMLElement).click();
		});
	} else {
		await page.evaluate((detailsSelector) => {
			const details =
				document.querySelector<HTMLDetailsElement>(detailsSelector);
			if (details === null || details.open) return;
			details.open = true;
			details.dispatchEvent(new Event("toggle", { bubbles: true }));
		}, selector);
	}
	await expect
		.poll(() => detailsSnapshot(page, selector).then((state) => state.open), {
			timeout: 15_000,
		})
		.toBe(true);
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
