import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        source: "/book",
        destination: "/booking",
        permanent: true,
      },
      {
        source: "/book/:path*",
        destination: "/booking/:path*",
        permanent: true,
      },
    ];
  },
  // R2 images are sized at authoring time; no request-time image work.
  images: { unoptimized: true },
};

export default nextConfig;
initOpenNextCloudflareForDev();
