import { defineConfig } from "@playwright/test";

// 3000, 3200 (Houssam) and 4330 (Vamos) are used by other products on this Mac.
const PORT = 3100;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

// The suite loads pages and the booking flow; production is read-only and
// opt-in (D-19): only smoke.spec.mjs runs, and its guard aborts /api/book.
const host = new URL(baseURL).hostname;
const onProduction =
  host === "koussay.online" || host.endsWith(".koussay.online");
const smokeProduction = process.env.SMOKE_PRODUCTION === "1";
if (onProduction && !smokeProduction) {
  throw new Error(
    `Refusing to run the tests against production (${host}). Unset BASE_URL. Set SMOKE_PRODUCTION=1 for the read-only production run (D-19).`,
  );
}
if (smokeProduction && host !== "koussay.online") {
  throw new Error(
    `SMOKE_PRODUCTION=1 needs BASE_URL on koussay.online, got ${host}.`,
  );
}

export default defineConfig({
  testDir: "tests",
  ...(smokeProduction ? { testMatch: "**/smoke.spec.mjs" } : {}),
  testIgnore: [
    "**/screens.spec.mjs",
    // Local-server specs: they write to a local D1 or need the test server.
    ...(process.env.BASE_URL
      ? [
          "**/booking-d1.spec.mjs",
          "**/admin.spec.mjs",
          "**/env-isolation.spec.mjs",
        ]
      : []),
  ],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Project media comes from media.koussay.online, so `npm test` needs network.
  retries: 1,
  // SwiftShader is CPU-bound; parallel pages starve each other.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1512, height: 945 },
      },
    },
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // The Worker under test must hold no live booking, mail or AI key:
        // tests/smoke.env blanks them all. Isolated HOME: never the default
        // (Vamos) wrangler login.
        command:
          "HOME=/Users/koss/.koussay-cloudflare npx opennextjs-cloudflare build && HOME=/Users/koss/.koussay-cloudflare npx opennextjs-cloudflare preview --port 3100 --env-file tests/smoke.env",
        url: baseURL,
        // A busy 3100 must fail loudly, not test someone else's server.
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
