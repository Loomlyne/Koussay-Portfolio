/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" only for Docker; Vercel handles its own output
  ...(process.env.VERCEL !== "1" ? { output: "standalone" } : {}),
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  experimental: {
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
    optimizePackageImports: ["gsap", "three"],
  },
  async redirects() {
    return [
      {
        source: "/work/:slug",
        destination: "/project/:slug",
        permanent: true,
      },
    ];
  },
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
