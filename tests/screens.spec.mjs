import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect } from "@playwright/test";

import { guardBooking } from "./guards.mjs";

// Same timings for every label so before and after compare frame for frame.
const LABEL = process.env.SCREENS_LABEL || "before";
const DIR = join(process.cwd(), ".screens", LABEL);

// The entry timeline has no wall-clock guarantee under SwiftShader load, so
// every moment is timed from a DOM signal. The project column fades in with
// the heading (textStart in Carousel.jsx); its inline opacity at 0.6 means the
// heading is mostly drawn, and the screenshot itself costs long enough under
// load that it lands on the fully drawn heading, before it fades out.
// The entry is over once meta.show() fills the sr-only live region, which only
// runs when the ring is interactive.
const REST_AFTER_ENTRY = 1000;

async function columnLanded(page) {
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('ul[aria-label="Projects"]')?.style.opacity,
      ) >= 0.6,
    null,
    { timeout: 200_000 },
  );
}

const shot = (page, name) =>
  page.screenshot({
    path: join(DIR, `${test.info().project.name}-${name}.png`),
  });

// document.fonts.ready does not wait for a face only the canvas uses, so load
// every face by hand, then reload so the heading and tag rasterise from cache.
async function entryDone(page) {
  await page.waitForFunction(
    () =>
      (
        document.querySelector('div.sr-only[aria-live="polite"]')
          ?.textContent ?? ""
      ).length > 0,
    null,
    { timeout: 200_000 },
  );
}

async function loadAllFaces(page) {
  await page.evaluate(async () => {
    await Promise.all([
      ...[...document.fonts].map((f) => f.load().catch(() => null)),
      document.fonts.load('400 1em "PP Neue Montreal"').catch(() => null),
    ]);
  });
}

async function settledHome(page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      [...document.fonts].forEach((f) => f.load().catch(() => null));
    });
  });
  await page.goto("/");
  await expect(page.locator("[data-loader-count]")).toHaveText("100", {
    timeout: 200_000,
  });
  await loadAllFaces(page);
  await page.reload();
  await expect(page.locator("[data-loader-count]")).toHaveText("100", {
    timeout: 200_000,
  });
}

async function projectPath(request) {
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p.startsWith("/project/"));
  expect(paths.length).toBeGreaterThan(0);
  return paths[0];
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

test("loader", async ({ page }) => {
  const calls = guardBooking(page);
  await page.goto("/");
  await expect(page.locator("[data-loader-count]")).toBeVisible();
  await shot(page, "loader");
  expect(calls).toEqual([]);
});

test("heading", async ({ page }) => {
  const calls = guardBooking(page);
  await settledHome(page);
  await columnLanded(page);
  const fonts = await page.evaluate(() =>
    [...document.fonts].map((f) => ({
      family: f.family.replace(/["']/g, ""),
      weight: f.weight,
      status: f.status,
    })),
  );
  writeFileSync(
    join(DIR, `${test.info().project.name}-fonts.json`),
    JSON.stringify(fonts, null, 2) + "\n",
  );
  expect(fonts.length).toBeGreaterThan(0);
  for (const f of fonts) expect(f.status, f.family).toBe("loaded");
  await shot(page, "heading");
  expect(calls).toEqual([]);
});

test("meta-rest", async ({ page }) => {
  const calls = guardBooking(page);
  await settledHome(page);
  await entryDone(page);
  await page.waitForTimeout(REST_AFTER_ENTRY);
  await shot(page, "meta-rest");
  expect(calls).toEqual([]);
});

test("meta-morph", async ({ page }) => {
  const calls = guardBooking(page);
  await settledHome(page);
  await entryDone(page);
  await page.waitForTimeout(REST_AFTER_ENTRY);
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  await shot(page, "meta-morph");
  expect(calls).toEqual([]);
});

test("booking", async ({ page }) => {
  const calls = guardBooking(page);
  await page.goto("/booking");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await shot(page, "booking");
  expect(calls).toEqual([]);
});

// Last: the full-page capture leaves the browser unable to screenshot the next
// page in the same run.
test("project", async ({ page, request }) => {
  const calls = guardBooking(page);
  await page.goto(await projectPath(request));
  await expect(page.locator("#project-title")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(DIR, `${test.info().project.name}-project.png`),
    fullPage: true,
  });
  expect(calls).toEqual([]);
});
