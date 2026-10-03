import { defineConfig } from "@playwright/test";

// 3000, 3200 (Houssam) and 4330 (Vamos) are used by other products on this Mac.
const PORT = 3100;
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests",
  testIgnore: "**/screens.spec.mjs",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Project media still comes through the live Notion proxy until Phase 3.
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
        url: baseURL,
        // A busy 3100 must fail loudly, not test someone else's server.
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
