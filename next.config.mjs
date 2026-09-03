/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" only for Docker; Vercel handles its own output
  ...(process.env.VERCEL !== "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
