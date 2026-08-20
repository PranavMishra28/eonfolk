import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal"],
});

const profiles = [
  { name: "desktop", width: 1728, height: 1117, deviceScaleFactor: 1 },
  { name: "laptop", width: 1366, height: 768, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];

const results = [];
for (const profile of profiles) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.mobile ?? false,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const startedAt = performance.now();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  const meaningfulWorldMs = performance.now() - startedAt;
  const metrics = await page.evaluate(async () => {
    const frames = [];
    let previous = performance.now();
    await new Promise((resolve) => {
      function sample(now) {
        frames.push(now - previous);
        previous = now;
        if (frames.length >= 240) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    const sorted = frames.slice(20).sort((a, b) => a - b);
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    return {
      sampleCount: sorted.length,
      medianFrameMs: sorted[Math.floor(sorted.length * 0.5)],
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      maxFrameMs: sorted.at(-1),
      renderer: gl?.getParameter(gl.RENDERER) ?? null,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      semanticButtons: document.querySelectorAll("button").length,
    };
  });
  await page.screenshot({ path: `spike/${profile.name}.png`, fullPage: true });
  results.push({ profile: profile.name, meaningfulWorldMs, errors, ...metrics });
  await context.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
