import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // #region agent log
  console.log('[DEBUG] next.config.ts loaded during build');
  // #endregion
  // Ensure proper route handling in Next.js 15
  // Force dynamic rendering for all routes to prevent caching issues
  experimental: {
    // Ensure routes are properly generated
  },
  // Try output: 'standalone' to see if it helps with route generation
  // output: 'standalone',
};

export default nextConfig;
