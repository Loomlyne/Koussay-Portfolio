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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.koussay.online",
        port: "",
        pathname: "/projects/**",
        search: "",
      },
    ],
    localPatterns: [
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
