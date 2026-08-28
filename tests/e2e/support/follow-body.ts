import { expect, type Locator, type Page } from "./eonfolk-fixture";

type FollowBodyCounts = Readonly<{
	readonly width: number;
	readonly height: number;
	readonly sampled: number;
	readonly skin: number;
	readonly cloth: number;
	readonly brown: number;
}>;

async function countFollowBodyPixels(
	page: Page,
	png: Buffer,
): Promise<FollowBodyCounts> {
	return page.evaluate(async (base64) => {
		const image = new Image();
		image.src = `data:image/png;base64,${base64}`;
		await image.decode();
		const surface = document.createElement("canvas");
		surface.width = image.width;
		surface.height = image.height;
		const context = surface.getContext("2d");
		if (context === null) throw new Error("follow body canvas is unavailable");
		context.drawImage(image, 0, 0);
		const pixels = context.getImageData(0, 0, surface.width, surface.height);
		const x0 = Math.floor(surface.width * 0.12);
		const x1 = Math.ceil(surface.width * 0.88);
		const y0 = Math.floor(surface.height * 0.18);
		const y1 = Math.ceil(surface.height * 0.72);
		let sampled = 0;
		let skin = 0;
		let cloth = 0;
		let brown = 0;
		const isSkinPixel = (r: number, g: number, b: number) =>
			r > 145 &&
			g > 85 &&
			b > 45 &&
			r > g &&
			g > b - 8 &&
			r - b >= 32 &&
			r - g <= 100 &&
			r < 245;
		const isBrownPixel = (r: number, g: number, b: number) => {
			const chroma = Math.max(r, g, b) - Math.min(r, g, b);
			return (
				r > 70 &&
				g > 40 &&
				b < 115 &&
				r >= g - 6 &&
				r - b > 22 &&
				g - b < 55 &&
				chroma < 115 &&
				g < 165
			);
		};
		const isClothPixel = (r: number, g: number, b: number) => {
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const chroma = max - min;
			if (chroma < 28 || isBrownPixel(r, g, b) || isSkinPixel(r, g, b))
				return false;
			const groundGreen = g > r + 8 && g > b && g < 170;
			const sky = b > r && b > g && chroma < 50;
			return !groundGreen && !sky;
		};
		for (let y = y0; y < y1; y += 1) {
			for (let x = x0; x < x1; x += 1) {
				const index = (y * surface.width + x) * 4;
				const r = pixels.data[index] ?? 0;
				const g = pixels.data[index + 1] ?? 0;
				const b = pixels.data[index + 2] ?? 0;
				sampled += 1;
				if (isSkinPixel(r, g, b)) skin += 1;
				else if (isClothPixel(r, g, b)) cloth += 1;
				else if (isBrownPixel(r, g, b)) brown += 1;
			}
		}
		return {
			width: surface.width,
			height: surface.height,
			sampled,
			skin,
			cloth,
			brown,
		};
	}, png.toString("base64"));
}

function followShowsPerson(counts: FollowBodyCounts): boolean {
	const person = counts.skin + counts.cloth;
	const brownShare = counts.sampled === 0 ? 1 : counts.brown / counts.sampled;
	return (
		counts.skin >= 18 &&
		person >= 70 &&
		brownShare < 0.52 &&
		person > counts.brown * 0.12
	);
}

/** Screenshot the WebGL view and fail if the followed body is dirt or a wall. */
export async function expectFollowShowsPerson(
	page: Page,
	canvas: Locator,
	outputPath: string,
): Promise<FollowBodyCounts> {
	await expect(canvas).toHaveAttribute("data-following", "true");
	const gl = canvas.locator("canvas").first();
	await expect(gl).toBeVisible();
	let counts: FollowBodyCounts = {
		width: 0,
		height: 0,
		sampled: 0,
		skin: 0,
		cloth: 0,
		brown: 0,
	};
	await expect
		.poll(
			async () => {
				const png = await gl.screenshot({ animations: "disabled" });
				counts = await countFollowBodyPixels(page, png);
				return followShowsPerson(counts);
			},
			{ timeout: 8_000 },
		)
		.toBe(true);
	await gl.screenshot({
		animations: "disabled",
		path: outputPath,
	});
	expect(
		followShowsPerson(counts),
		`Follow screenshot is dirt/wall fill (skin=${counts.skin} cloth=${counts.cloth} brown=${counts.brown} of ${counts.sampled})`,
	).toBe(true);
	return counts;
}
