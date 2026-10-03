import { defineConfig } from "@playwright/test";

import base from "./playwright.config.mjs";

// Screenshots for the font sign-off. Kept out of npm test: they are not
// assertions and each moment costs a full ring entry.
export default defineConfig({
  ...base,
  testMatch: "**/screens.spec.mjs",
  testIgnore: undefined,
  retries: 0,
  // The entry runs several times slower when other dev servers load the Mac.
  timeout: 300_000,
});
