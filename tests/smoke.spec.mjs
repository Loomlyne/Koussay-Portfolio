import { test, expect } from "@playwright/test";
import { guardBooking } from "./guards.mjs";

// Off Vercel this one request 404s; its own onerror message is console.log.
const SPEED_INSIGHTS = "/_vercel/speed-insights/script.js";

function watch(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const url = msg.location()?.url ?? "";
    if (
      msg.text().startsWith("Failed to load resource") &&
      url.endsWith(SPEED_INSIGHTS)
    ) {
      return;
    }
    errors.push(`${msg.text()} @ ${url}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  const bookingCalls = guardBooking(page);
  return { errors, bookingCalls };
}

test("home renders the ring", async ({ page }) => {
  const { errors, bookingCalls } = watch(page);
  await page.goto("/");
  const canvas = page.locator(".ring-stage canvas");
  await expect(canvas).toHaveCount(1);
  const alive = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl2");
    return !!gl && !gl.isContextLost();
  });
  expect(alive).toBe(true);
  await expect(page.locator("[data-loader-count]")).toHaveText("100", {
    timeout: 45_000,
  });
  await page.waitForTimeout(1_000);
  expect(bookingCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("every project page renders", async ({ page, request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p.startsWith("/project/"));
  expect(paths.length).toBeGreaterThan(0);
  // One real page load per slug; the count differs between the live Notion
  // set and the 18 placeholders, so the budget follows it.
  test.setTimeout(60_000 + paths.length * 30_000);
  const { errors, bookingCalls } = watch(page);
  for (const path of paths) {
    await test.step(path, async () => {
      // One shared page; clear the lists so errors belong to this slug.
      errors.length = 0;
      bookingCalls.length = 0;
      const res = await page.goto(path);
      expect.soft(res?.status(), path).toBe(200);
      await expect.soft(page.locator("#project-title"), path).toBeVisible({
        timeout: 25_000,
      });
      await page.waitForTimeout(500);
      expect.soft(bookingCalls, path).toEqual([]);
      expect.soft(errors, path).toEqual([]);
    });
  }
});

test("booking first step renders without a request", async ({ page }) => {
  const { errors, bookingCalls } = watch(page);
  await page.goto("/booking");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(bookingCalls).toEqual([]);
  expect(errors).toEqual([]);
});
