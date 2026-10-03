// The glob "**/api/book/**" does not match the bare POST /api/book, which
// writes the booking to Notion and sends both Resend emails. Match on the
// pathname instead.
export function isBookingUrl(url) {
  return url.pathname === "/api/book" || url.pathname.startsWith("/api/book/");
}

// Aborts and records every booking request in the whole browser context
// (popups, extra pages), and waits until interception is live. Returns the
// live list of URLs; every request is recorded, repeats included.
export async function guardBooking(page) {
  const calls = [];
  const context = page.context();
  await context.route(
    (url) => isBookingUrl(url),
    (route) => {
      calls.push(route.request().url());
      return route.abort();
    },
  );
  // Second net: records anything the route handler did not see.
  context.on("request", (req) => {
    if (isBookingUrl(new URL(req.url()))) calls.push(`seen:${req.url()}`);
  });
  return calls;
}
