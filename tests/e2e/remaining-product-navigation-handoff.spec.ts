import { expect, type Page, test } from "./support/eonfolk-fixture";
import {
	buildWorldFocusHref,
	parseWorldFocusHref,
	type WorldFocus,
} from "../../apps/web/src/research-navigation";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

function focusHref(focus: WorldFocus): string {
	const href = buildWorldFocusHref(focus);
	if (href === null) throw new Error("invalid focus fixture");
	return href;
}

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
				const request = indexedDB.deleteDatabase(
					"eonfolk-generated-authority-v7",
				);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

async function openCanonicalWorld(page: Page, href = "/world") {
	await page.goto(href);
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	return world;
}

async function selectSponsorCandidate(page: Page): Promise<string> {
	await page.locator(".v1-context-panel").hover();
	const residents = page.locator("ul.v1-presence-roster button");
	for (let index = 0; index < (await residents.count()); index += 1) {
		const resident = residents.nth(index);
		await resident.click();
		const sponsor = page.getByRole("button", {
			name: /Sponsor this person|Consider an intervention|Review Chronicle/u,
		});
		if ((await sponsor.count()) === 1 && (await sponsor.isEnabled())) {
			const citizenId = await resident.getAttribute("data-citizen-id");
			if (citizenId !== null) return citizenId;
		}
	}
	throw new Error("no counsel-capable sponsor candidate is visible");
}

for (const viewport of [
	{ width: 1366, height: 768, label: "desktop" },
	{ width: 390, height: 844, label: "mobile" },
]) {
	test(`typed initial focus is exact and fail-closed on ${viewport.label} @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(150_000);
		const externalRequests = await isolateLocalWorld(page);
		await page.setViewportSize(viewport);
		await resetGeneratedCheckpoint(page);

		const defaultWorld = await openCanonicalWorld(
			page,
			"/world?focus-version=1&focus-kind=citizen&focus-id=unknown-citizen",
		);
		const defaultSettlement = await page
			.getByRole("heading", { level: 1 })
			.textContent();
		await expect(defaultWorld).toHaveAttribute(
			"data-navigation-rejection",
			"foreign-reference",
		);
		await page.goto(focusHref({ kind: "event", eventId: "event-01" }));
		await expect(page.locator("main.v1-world")).toHaveAttribute(
			"data-navigation-rejection",
			"foreign-reference",
			{ timeout: 30_000 },
		);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			defaultSettlement ?? "",
		);

		await page.goto(
			"/world?focus-version=1&focus-kind=citizen&focus-id=citizen-01&focus-id=citizen-02",
		);
		await expect(page.locator("main.v1-world")).toHaveAttribute(
			"data-navigation-rejection",
			"invalid-envelope",
			{ timeout: 30_000 },
		);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			defaultSettlement ?? "",
		);

		const settlementButtons = page
			.getByRole("navigation", { name: "Settlements" })
			.getByRole("button");
		const destinationButton = settlementButtons.last();
		await destinationButton.click();
		const destinationSettlement = await page
			.getByRole("heading", { level: 1 })
			.textContent();
		const destinationCitizen = page
			.locator("ul.v1-presence-roster button[data-citizen-id]")
			.first();
		const citizenId = await destinationCitizen.getAttribute("data-citizen-id");
		if (citizenId === null) throw new Error("destination citizen lacks an id");

		await page.goto(focusHref({ kind: "citizen", citizenId }));
		const focusedWorld = page.locator("main.v1-world");
		await expect(focusedWorld).not.toHaveAttribute(
			"data-navigation-rejection",
			{
				timeout: 30_000,
			},
		);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			destinationSettlement ?? "",
		);
		await expect(
			page.locator(
				`ul.v1-presence-roster button[data-citizen-id="${citizenId}"]`,
			),
		).toHaveAttribute("aria-pressed", "true");
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);
		await page.screenshot({
			path: test.info().outputPath(`${viewport.label}-citizen-focus.png`),
			fullPage: true,
		});
		expect(externalRequests).toEqual([]);
	});
}

for (const viewport of [
	{ width: 1366, height: 768, label: "desktop" },
	{ width: 390, height: 844, label: "mobile" },
]) {
	test(`Chronicle links focus world context without reload on ${viewport.label} @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(linuxSemanticCi ? 420_000 : 240_000);
		const externalRequests = await isolateLocalWorld(page);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize(viewport);
		await resetGeneratedCheckpoint(page);
		const world = await openCanonicalWorld(page);
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-render-policy",
			"on-demand",
		);
		const citizenId = await selectSponsorCandidate(page);
		await page.getByRole("button", { name: "Sponsor this person" }).click();
		await expect(
			page.getByRole("button", { name: "Consider an intervention" }),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await page
			.getByRole("button", { name: "Consider an intervention" })
			.click();
		await page
			.getByRole("button", {
				name: "Verify the evidence first — delays a conclusion",
			})
			.click();
		await expect(
			page.getByRole("button", {
				name: "Leave Dawnmere at this checkpoint",
			}),
		).toBeEnabled({ timeout: sponsorTransitionTimeout });
		await page
			.getByRole("button", { name: "Leave Dawnmere at this checkpoint" })
			.click();
		await page.getByRole("button", { name: "Return to Dawnmere" }).click();
		const beforeBoundaryHash = await world.getAttribute("data-state-hash");
		await page
			.getByRole("button", {
				name: "Advance one day to Mara's decision boundary",
			})
			.click();
		await expect
			.poll(() => world.getAttribute("data-state-hash"), {
				timeout: sponsorTransitionTimeout,
			})
			.not.toBe(beforeBoundaryHash);
		await expect(
			page.getByRole("heading", { name: "What happened" }),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await expect(
			page.getByRole("button", { name: "Review Chronicle" }),
		).toBeEnabled({ timeout: sponsorTransitionTimeout });
		await page.getByText("Exact event evidence").click();

		const stateHash = await world.getAttribute("data-state-hash");
		const navigationCount = await page.evaluate(
			() => performance.getEntriesByType("navigation").length,
		);
		const citizenLink = page.getByRole("link", { name: "Mara Vale" }).first();
		const objectHref = await page
			.locator('a[href*="focus-kind=object"]')
			.first()
			.getAttribute("href");
		const objectFocus = parseWorldFocusHref(objectHref ?? "");
		if (objectFocus?.kind !== "object")
			throw new Error("Chronicle object link is not typed");
		const citizenHref = await citizenLink.getAttribute("href");
		expect(citizenHref).not.toContain(" ");
		expect(citizenHref).not.toContain("name=");
		expect(parseWorldFocusHref(citizenHref ?? "")).toMatchObject({
			kind: "citizen",
			citizenId,
		});
		await citizenLink.focus();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(focusHref({ kind: "citizen", citizenId }));
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		expect(
			await page.evaluate(
				() => performance.getEntriesByType("navigation").length,
			),
		).toBe(navigationCount);

		const eventLink = page
			.locator(
				"section[aria-label='Shareable factual replay'] details ol > li ul a",
			)
			.first();
		const eventFocus = parseWorldFocusHref(
			(await eventLink.getAttribute("href")) ?? "",
		);
		expect(eventFocus?.kind).toBe("event");
		await eventLink.click();
		if (eventFocus?.kind !== "event")
			throw new Error("event link is not typed");
		await expect(page).toHaveURL(focusHref(eventFocus));
		await expect(world).toHaveAttribute(
			"data-focused-event-id",
			eventFocus.eventId,
		);
		await expect(
			page.getByRole("region", { name: "Chronicle event focus" }),
		).toContainText("Mara Vale");
		await expect(
			page.locator(
				`ul.v1-presence-roster button[data-citizen-id="${citizenId}"]`,
			),
		).toHaveAttribute("aria-pressed", "true");
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		expect(
			await page.evaluate(
				() => performance.getEntriesByType("navigation").length,
			),
		).toBe(navigationCount);
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 30_000 },
		);
		await expect(world).toHaveAttribute(
			"data-focused-event-id",
			eventFocus.eventId,
		);
		await expect(
			page.getByRole("region", { name: "Chronicle event focus" }),
		).toContainText("Mara Vale");
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		await page.getByText("Exact event evidence").first().click();
		await expect(
			page
				.getByRole("region", { name: "Chronicle event focus" })
				.locator("code"),
		).toHaveText(eventFocus.eventId);

		await page.goBack({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 30_000 },
		);
		await page.getByRole("button", { name: "Review Chronicle" }).click();
		const replay = page.getByRole("region", {
			name: "Shareable factual replay",
		});
		await replay.getByText("Exact event evidence").click();
		const locationLink = replay
			.locator('a[href*="focus-kind=location"]')
			.first();
		const locationFocus = parseWorldFocusHref(
			(await locationLink.getAttribute("href")) ?? "",
		);
		if (locationFocus?.kind !== "location")
			throw new Error("Chronicle location link is not typed");
		await locationLink.focus();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(focusHref(locationFocus));
		await expect(
			page.getByRole("button", { name: "World in words" }),
		).toHaveAttribute("aria-pressed", "true");
		const focusedPlace = page.locator('li[aria-current="location"]');
		await expect(focusedPlace).toHaveAttribute("aria-current", "location");
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		expect(
			await page.evaluate(
				() => performance.getEntriesByType("navigation").length,
			),
		).toBe(navigationCount);

		await page.goto(focusHref({ kind: "citizen", citizenId }), {
			waitUntil: "domcontentloaded",
		});
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 30_000 },
		);
		await page.getByRole("button", { name: "Review Chronicle" }).click();
		await replay.getByText("Exact event evidence").click();
		const objectLink = replay.locator('a[href*="focus-kind=object"]').first();
		const objectNavigationCount = await page.evaluate(
			() => performance.getEntriesByType("navigation").length,
		);
		await objectLink.focus();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(focusHref(objectFocus));
		await expect(world).toHaveAttribute("data-state-hash", stateHash ?? "");
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-focus-kind",
			/(?:building|project)/u,
		);
		await expect(
			page.getByText(/(?:BUILDING|PROJECT) IN FOCUS/u),
		).toBeVisible();
		expect(
			await page.evaluate(
				() => performance.getEntriesByType("navigation").length,
			),
		).toBe(objectNavigationCount);
		if (process.env.EONFOLK_CAPTURE_MEDIA === "1")
			await page.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: true,
				path: test
					.info()
					.outputPath(`${viewport.label}-chronicle-object-focus.png`),
			});
		await page.goBack();
		await expect(page).toHaveURL(focusHref({ kind: "citizen", citizenId }));
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-focus-kind",
			"citizen",
		);
		await expect(page.getByText("PERSON IN FOCUS")).toBeVisible();
		expect(
			await page.evaluate(
				() => performance.getEntriesByType("navigation").length,
			),
		).toBe(objectNavigationCount);
		await page.screenshot({
			path: test
				.info()
				.outputPath(`${viewport.label}-chronicle-site-focus.png`),
			fullPage: true,
		});
		expect(externalRequests).toEqual([]);
	});
}
