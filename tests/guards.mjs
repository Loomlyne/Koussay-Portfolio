// The glob "**/api/book/**" does not match the bare POST /api/book, which
// writes the booking to Notion and sends both Resend emails. Match on the
// pathname instead.
export function isBookingUrl(url) {
  return url.pathname === "/api/book" || url.pathname.startsWith("/api/book/");
}

// Aborts and records every booking request. Returns the live list of URLs.
export function guardBooking(page) {
  const calls = [];
  page.route(isBookingUrl, (route) => {
    const url = route.request().url();
    if (!calls.includes(url)) calls.push(url);
    return route.abort();
  });
  // Second net: records anything the route handler did not see.
  page.on("request", (req) => {
    if (isBookingUrl(new URL(req.url())) && !calls.includes(req.url())) {
      calls.push(req.url());
    }
  });
  return calls;
}
