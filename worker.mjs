// Wrapper around the OpenNext handler: www redirects to the apex (it served a
// duplicate 200 on Vercel) and any *.workers.dev host is kept out of search.
import { default as handler } from "./.open-next/worker.js";

const APEX = "koussay.online";

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }
    const response = await handler.fetch(request, env, ctx);
    if (url.hostname.endsWith(".workers.dev")) {
      const out = new Response(response.body, response);
      out.headers.set("X-Robots-Tag", "noindex, nofollow");
      return out;
    }
    return response;
  },
};

export default worker;
