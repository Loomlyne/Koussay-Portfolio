import { test, expect } from "@playwright/test";

// Proves the blank keys in tests/smoke.env reach the Worker (A4) without
// printing any value: with no booking keys /api/book answers 503.
// Plan 04 replaces this file.
test("the test Worker holds no booking key", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  const res = await request.post("/api/book", {
    multipart: { payload: "{}" },
  });
  expect(res.status()).toBe(503);
});
