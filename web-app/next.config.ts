import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure all routes are included in the build
  experimental: {
    // This might help with route generation in Next.js 16
  },
};

export default nextConfig;
