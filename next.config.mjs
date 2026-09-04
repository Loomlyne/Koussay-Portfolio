/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" only for Docker; Vercel handles its own output
  ...(process.env.VERCEL !== "1" ? { output: "standalone" } : {}),
  images: {
    localPatterns: [
      // Notion covers are versioned (`?v=`) so CMS edits bust the cache.
      // Next 16 blocks query strings on local images unless listed here.
      {
        pathname: "/api/media/**",
      },
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
