import { defineConfig } from "@playwright/test";

// 3000, 3200 (Houssam) and 4330 (Vamos) are used by other products on this Mac.
const PORT = 3100;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

// The suite loads pages and the booking flow; never point it at production.
const host = new URL(baseURL).hostname;
if (host === "koussay.online" || host.endsWith(".koussay.online")) {
  throw new Error(
    `Refusing to run the tests against production (${host}). Unset BASE_URL.`,
  );
}

export default defineConfig({
  testDir: "tests",
  testIgnore: "**/screens.spec.mjs",
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
        command: `npm run build && npx next start -p ${PORT}`,
        // An empty value is "defined" to @next/env, so it wins over
        // .env.local. The server under test must not hold live booking or
        // mail credentials: /api/book* then answers 503 by itself.
        env: {
          NOTION_BOOKINGS_DATABASE_ID: "",
          NOTION_CALENDAR_DATABASE_ID: "",
          RESEND_API_KEY: "",
          RESEND_FROM: "",
          BOOKING_NOTIFY_EMAIL: "",
        },
        url: baseURL,
        // A busy 3100 must fail loudly, not test someone else's server.
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
