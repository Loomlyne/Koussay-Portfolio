import { test, expect } from "@playwright/test";
import { guardBooking } from "./guards.mjs";
import { ORDER, PROJECTS_IN_ORDER } from "../content/projects/index.mjs";

const R2 = "https://media.koussay.online/projects/";

// Off Vercel this one request 404s; its own onerror message is console.log.
const SPEED_INSIGHTS = "/_vercel/speed-insights/script.js";

const GEIST = "/fonts/Geist-Variable.woff2";
const GEIST_MONO = "/fonts/GeistMono-Variable.woff2";

async function watch(page) {
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
  const bookingCalls = await guardBooking(page);
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
  // R2 responses and any request still going through the Notion proxy.
  const r2 = [];
  const apiMedia = [];
  page.on("response", (res) => {
    if (res.url().startsWith(R2)) {
      r2.push({
        url: res.url(),
        status: res.status(),
        acao: res.headers()["access-control-allow-origin"],
      });
    }
  });
  page.on("request", (req) => {
    const { pathname } = new URL(req.url());
    if (pathname.startsWith("/api/media")) apiMedia.push(req.url());
  });
  return { errors, bookingCalls, oldFonts, woff2, r2, apiMedia };
}

test("home renders the ring", async ({ page }) => {
  const { errors, bookingCalls, oldFonts, woff2, r2, apiMedia } =
    await watch(page);
  await page.goto("/");
  const canvas = page.locator(".ring-stage canvas");
  await expect(canvas).toHaveCount(1);
  const alive = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl2");
    return !!gl && !gl.isContextLost();
  });
  expect(alive).toBe(true);
  // The counter follows a GSAP tween, and GSAP lag smoothing advances the
  // timeline by only 33 ms for any frame over 500 ms. Under SwiftShader on a
  // loaded Mac that stretches the entry far past wall-clock expectations (a
  // 94 reading at 45 s was this). Keep the budget generous; do not shorten it.
  test.setTimeout(240_000);
  await expect(page.locator("[data-loader-count]")).toHaveText("100", {
    timeout: 150_000,
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
  // Cut-over: covers come from R2 with CORS, nothing from the Notion proxy.
  const okR2 = r2.filter((r) => r.status === 200 && r.acao === "*");
  expect(okR2.length).toBeGreaterThanOrEqual(ORDER.length);
  expect(apiMedia).toEqual([]);
  expect(errors).toEqual([]);
});

test("every project page renders", async ({ page, request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p.startsWith("/project/"));
  // The sitemap lists the content modules, in ring order, with their dates.
  expect(paths).toEqual(ORDER.map((slug) => `/project/${slug}`));
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) =>
    new Date(m[1]).toISOString(),
  );
  const projectLastmods = lastmods.slice(-ORDER.length);
  expect(projectLastmods).toEqual(
    PROJECTS_IN_ORDER.map((p) => new Date(p.updated).toISOString()),
  );
  // One real page load per slug; the count follows the content modules.
  test.setTimeout(60_000 + paths.length * 30_000);
  const { errors, bookingCalls, oldFonts, apiMedia } = await watch(page);
  for (const [i, path] of paths.entries()) {
    const project = PROJECTS_IN_ORDER[i];
    await test.step(path, async () => {
      // One shared page; clear the lists so errors belong to this slug.
      errors.length = 0;
      bookingCalls.length = 0;
      oldFonts.length = 0;
      apiMedia.length = 0;
      const res = await page.goto(path);
      expect.soft(res?.status(), path).toBe(200);
      await expect.soft(page.locator("#project-title"), path).toBeVisible({
        timeout: 25_000,
      });
      await expect
        .soft(page.locator("#project-title"), path)
        .toHaveText(project.name);
      await expect
        .soft(page.getByText(project.summary, { exact: true }), path)
        .toBeVisible();
      // The hero is eager and preloaded, so currentSrc is safe to read here.
      const hero = page.locator(`main header img[src^="${R2}"]`).first();
      await expect
        .soft(async () => {
          const info = await hero.evaluate((img) => ({
            src: img.currentSrc,
            w: img.naturalWidth,
          }));
          expect(info.src.startsWith(R2)).toBe(true);
          expect(info.w).toBeGreaterThan(0);
        }, path)
        .toPass({ timeout: 20_000 });
      await page.waitForTimeout(500);
      expect.soft(apiMedia, path).toEqual([]);
      expect.soft(bookingCalls, path).toEqual([]);
      expect.soft(oldFonts, path).toEqual([]);
      expect.soft(errors, path).toEqual([]);
    });
  }
});

test("gallery items come from R2 through the optimizer", async ({ page }) => {
  const project = PROJECTS_IN_ORDER[0];
  await page.goto(`/project/${project.slug}`);
  const imgs = page.locator('section[aria-label="Gallery"] img');
  await expect(imgs).toHaveCount(project.gallery.length);
  const alts = await imgs.evaluateAll((els) => els.map((e) => e.alt));
  expect(alts).toEqual(project.gallery.map((g) => g.alt));
  // Attributes, not currentSrc: most items are lazy and have not loaded.
  const marker = "/_next/image?url=https%3A%2F%2Fmedia.koussay.online";
  const attrs = await imgs.evaluateAll((els) =>
    els.map((e) => `${e.getAttribute("src")} ${e.getAttribute("srcset")}`),
  );
  for (const a of attrs) expect(a).toContain(marker);
  await imgs.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() => imgs.first().evaluate((img) => img.naturalWidth), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
});

test("project share images are real and not the logo", async ({
  page,
  request,
}) => {
  const bodyOf = async (path) => {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("image/png");
    return (await res.body()).toString("base64");
  };
  const booking = await bodyOf("/booking/opengraph-image");
  for (const slug of ORDER) {
    await page.goto(`/project/${slug}`);
    const content = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    // Absolute production URL in the tag; request only its path locally.
    const u = new URL(content);
    expect(await bodyOf(u.pathname + u.search), slug).not.toBe(booking);
  }
});

test("a placeholder slug is gone", async ({ request }) => {
  const res = await request.get("/project/matchday");
  expect(res.status()).toBe(404);
});

test("removed files are gone", async ({ request }) => {
  for (const path of ["/1.webp", "/18.webp"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const stamp = await request.get("/api/cms-stamp");
  expect(await stamp.json()).toEqual({ stamp: "" });
});

test("warm round trip: deep link, back to the ring", async ({ page }) => {
  test.setTimeout(240_000);
  const { errors, r2 } = await watch(page);
  await page.goto(`/project/${ORDER[0]}`);
  await expect
    .poll(() =>
      page
        .locator(`main header img[src^="${R2}"]`)
        .first()
        .evaluate((i) => i.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.locator('a[href="/"]').filter({ hasText: "Back" }).first().click();
  const canvas = page.locator(".ring-stage canvas");
  await expect(canvas).toHaveCount(1);
  expect(
    await canvas.evaluate((c) => {
      const gl = c.getContext("webgl2");
      return !!gl && !gl.isContextLost();
    }),
  ).toBe(true);
  await page.waitForTimeout(3_000);
  expect(errors).toEqual([]);
  expect(r2.length).toBeGreaterThan(0);
  for (const r of r2) expect(r.acao, r.url).toBe("*");
});

test("warm round trip: ring, project, back", async ({ page }) => {
  test.setTimeout(240_000);
  const { errors } = await watch(page);
  await page.goto("/");
  await expect(page.locator("[data-loader-count]")).toHaveText("100", {
    timeout: 150_000,
  });
  await page.goto(`/project/${ORDER[1]}`);
  await page.goBack();
  await expect(page.locator(".ring-stage canvas")).toHaveCount(1);
  await page.waitForTimeout(3_000);
  expect(errors).toEqual([]);
});

test("booking first step renders without a request", async ({ page }) => {
  const { errors, bookingCalls, oldFonts } = await watch(page);
  await page.goto("/booking");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(bookingCalls).toEqual([]);
  expect(oldFonts).toEqual([]);
  expect(errors).toEqual([]);
});
