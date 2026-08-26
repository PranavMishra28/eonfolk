import { expect, test } from "./support/eonfolk-fixture";
import {
	isolateLocalWorld,
	openCanonicalWorld,
	resetGeneratedCheckpoint,
	SYNTHETIC_DISCLAIMER,
	selectCanonicalMara,
	writeSyntheticReport,
} from "./support/synthetic-session";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

test.describe("synthetic product evaluation (not human research) @synthetic", () => {
	test.describe.configure({ timeout: linuxSemanticCi ? 420_000 : 240_000 });

	test("persona A systemic-game player can read settlement systems @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		const world = await openCanonicalWorld(page);
		await expect(
			page.getByRole("heading", { name: "Dawnmere", level: 1 }),
		).toBeVisible();
		await page.locator(".v1-context-panel").hover();
		await expect(
			page.locator(
				'ul.v1-presence-roster button[data-citizen-id="citizen-01"]',
			),
		).toContainText("Mara Vale");
		await expect(
			page.getByRole("list", { name: "Visible activities" }),
		).toBeVisible();
		await selectCanonicalMara(page);
		await expect(page.locator("p.v1-context-role")).toBeVisible();
		const hash = await world.getAttribute("data-state-hash");
		expect(hash).toMatch(/^[0-9a-f]{64}$/u);
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "A-systemic-game",
			stepsCompleted: [
				"open-world",
				"see-mara-in-roster",
				"select-mara",
				"see-activity-summary",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona B AI-native engineer finds authority surfaces without mutating truth @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		const world = await openCanonicalWorld(page);
		const before = await world.getAttribute("data-state-hash");
		await page.goto("/developer");
		await expect(page.getByText(/cannot mutate Reality/iu)).toBeVisible();
		await expect(
			page.getByText(/replay never reruns model inference/iu),
		).toBeVisible();
		await expect(
			page.getByText(/account-free local benchmark/iu),
		).toBeVisible();
		await page.screenshot({
			path: test.info().outputPath("persona-b-developer.png"),
			fullPage: true,
		});
		await page.goto("/research");
		await expect(page.getByText(/outside play|Evidence mode/iu)).toBeVisible();
		await page.goto("/world", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 30_000 },
		);
		expect(
			await page.locator("main.v1-world").getAttribute("data-state-hash"),
		).toBe(before);
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "B-ai-native-engineer",
			stepsCompleted: [
				"world-hash",
				"developer-authority-copy",
				"research-mode",
				"reload-world-hash-unchanged",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona C AI skeptic sees abstention is not recorded as cause @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		await openCanonicalWorld(page);
		await selectCanonicalMara(page);
		await page.getByRole("button", { name: "Sponsor this person" }).click();
		await page
			.getByRole("button", { name: "Consider an intervention" })
			.click({ timeout: sponsorTransitionTimeout });
		await expect(
			page.getByText(/Mara may accept, reject, delay, or reinterpret/iu),
		).toBeVisible();
		await page
			.getByRole("button", {
				name: "Abstain — close this boundary without counsel",
			})
			.click();
		await expect(
			page.getByText(/first boundary is durably closed/iu),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await page
			.getByRole("button", { name: "Leave Dawnmere at this checkpoint" })
			.click();
		await page.getByRole("button", { name: "Return to Dawnmere" }).click();
		await page
			.getByRole("button", {
				name: "Continue to Mara's independent outcome",
			})
			.click();
		await expect(
			page.getByRole("heading", { name: "What happened" }),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await expect(
			page.getByRole("list", { name: "Chronicle beats" }),
		).toContainText("not recorded as its cause");
		await expect(
			page.getByRole("list", { name: "Chronicle beats" }),
		).not.toContainText(/you advised|your counsel/iu);
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "C-ai-skeptic",
			stepsCompleted: [
				"sponsor-mara",
				"read-independence-copy",
				"abstain",
				"chronicle-not-cause",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona D nontechnical player can reach sponsor without developer jargon @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		await page.goto("/");
		await expect(
			page.getByRole("heading", { name: "A civilization has already begun." }),
		).toBeVisible();
		await expect(
			page.getByText(/canonical hash|reducer|persistence fence/iu),
		).toHaveCount(0);
		await page.getByRole("link", { name: "Enter the living world" }).click();
		await expect(page).toHaveURL(/\/world$/u);
		await expect(
			page.getByRole("heading", { name: "Dawnmere", level: 1 }),
		).toBeVisible({ timeout: 30_000 });
		await selectCanonicalMara(page);
		await expect(
			page.getByRole("button", { name: "Sponsor this person" }),
		).toBeEnabled();
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "D-nontechnical",
			stepsCompleted: [
				"landing",
				"enter-world",
				"select-mara",
				"sponsor-enabled",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona E keyboard-first user can sponsor from the semantic world @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: "reduce" });
		await resetGeneratedCheckpoint(page);
		await openCanonicalWorld(page);
		const words = page.getByRole("button", { name: "World in words" });
		await words.click();
		await expect(words).toHaveAttribute("aria-pressed", "true");
		const mara = page
			.getByTestId("generated-semantic-world")
			.locator('button[data-citizen-id="citizen-01"]');
		await mara.click();
		await expect(
			page.getByRole("button", { name: "Sponsor this person" }),
		).toBeEnabled();
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "E-keyboard-semantic",
			stepsCompleted: [
				"reduced-motion",
				"world-in-words",
				"semantic-mara",
				"sponsor-enabled",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona F impatient visitor reaches the living world within 90 seconds @synthetic", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const external = await isolateLocalWorld(page);
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		await page.goto("/");
		await page.getByRole("link", { name: "Enter the living world" }).click();
		await expect(
			page.getByRole("heading", { name: "Dawnmere", level: 1 }),
		).toBeVisible({ timeout: 60_000 });
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 20_000 },
		);
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "F-impatient-visitor",
			stepsCompleted: ["landing", "enter-world", "dawnmere-visible"],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});

	test("persona G adversarial counsel does not overcredit the player @synthetic", async ({
		page,
	}) => {
		const external = await isolateLocalWorld(page);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize({ width: 1366, height: 768 });
		await resetGeneratedCheckpoint(page);
		await openCanonicalWorld(page);
		await selectCanonicalMara(page);
		await page.getByRole("button", { name: "Sponsor this person" }).click();
		await page
			.getByRole("button", { name: "Consider an intervention" })
			.click({ timeout: sponsorTransitionTimeout });
		await page
			.getByRole("button", {
				name: "Confront them publicly — risks trust",
			})
			.click();
		await expect(
			page.getByRole("button", { name: "Leave Dawnmere at this checkpoint" }),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 30_000 },
		);
		await selectCanonicalMara(page);
		await page
			.getByRole("button", { name: "Leave Dawnmere at this checkpoint" })
			.click();
		await page.getByRole("button", { name: "Return to Dawnmere" }).click();
		await page
			.getByRole("button", {
				name: "Advance one day to Mara's decision boundary",
			})
			.click();
		await expect(
			page.getByRole("button", { name: "Review Chronicle" }),
		).toBeVisible({ timeout: sponsorTransitionTimeout });
		await expect(
			page.getByRole("list", { name: "Chronicle beats" }),
		).toContainText("rejected the advice");
		await expect(
			page.getByRole("list", { name: "Chronicle beats" }),
		).not.toContainText(/you made Mara|you forced|you caused the rejection/iu);
		expect(external).toEqual([]);
		writeSyntheticReport({
			persona: "G-adversarial-counsel",
			stepsCompleted: [
				"premature-confrontation",
				"reload",
				"independent-rejection",
				"chronicle-does-not-overcredit-player",
			],
			notes: [SYNTHETIC_DISCLAIMER],
		});
	});
});
