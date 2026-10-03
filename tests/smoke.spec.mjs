import { test, expect } from "@playwright/test";
import { guardBooking } from "./guards.mjs";

// Off Vercel this one request 404s; its own onerror message is console.log.
const SPEED_INSIGHTS = "/_vercel/speed-insights/script.js";

const GEIST = "/fonts/Geist-Variable.woff2";
const GEIST_MONO = "/fonts/GeistMono-Variable.woff2";

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
  // Old font binaries must never be requested; the two woff2 statuses are
  // recorded so the home test can assert 200.
  const oldFonts = [];
  const woff2 = {};
  page.on("response", (res) => {
    const { pathname } = new URL(res.url());
    if (/\.(otf|ttf)$/i.test(pathname)) oldFonts.push(pathname);
    if (pathname === GEIST || pathname === GEIST_MONO) {
      woff2[pathname] = res.status();
    }
  });
  return { errors, bookingCalls, oldFonts, woff2 };
}

test("home renders the ring", async ({ page }) => {
  const { errors, bookingCalls, oldFonts, woff2 } = watch(page);
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
  // HYG-01: one preload, both woff2 served 200, FontFace status loaded.
  await expect(
    page.locator(`link[rel="preload"][href="${GEIST}"]`),
  ).toHaveCount(1);
  expect(woff2[GEIST]).toBe(200);
  expect(woff2[GEIST_MONO]).toBe(200);
  const faces = () =>
    page.evaluate(() =>
      [...document.fonts].map((f) => ({
        family: f.family.replace(/["']/g, ""),
        status: f.status,
      })),
    );
  const loaded = async () =>
    (await faces()).filter((f) => f.status === "loaded").map((f) => f.family);
  await expect.poll(loaded).toContain("Geist");
  await expect.poll(loaded).toContain("Geist Mono");
  const families = (await faces()).map((f) => f.family);
  expect(families).not.toContain("Satoshi");
  expect(families).not.toContain("PP Neue Montreal");
  expect(oldFonts).toEqual([]);
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
  const { errors, bookingCalls, oldFonts } = watch(page);
  for (const path of paths) {
    await test.step(path, async () => {
      // One shared page; clear the lists so errors belong to this slug.
      errors.length = 0;
      bookingCalls.length = 0;
      oldFonts.length = 0;
      const res = await page.goto(path);
      expect.soft(res?.status(), path).toBe(200);
      await expect.soft(page.locator("#project-title"), path).toBeVisible({
        timeout: 25_000,
      });
      await page.waitForTimeout(500);
      expect.soft(bookingCalls, path).toEqual([]);
      expect.soft(oldFonts, path).toEqual([]);
      expect.soft(errors, path).toEqual([]);
    });
  }
});

test("booking first step renders without a request", async ({ page }) => {
  const { errors, bookingCalls, oldFonts } = watch(page);
  await page.goto("/booking");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(bookingCalls).toEqual([]);
  expect(oldFonts).toEqual([]);
  expect(errors).toEqual([]);
});
