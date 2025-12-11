import type { NextConfig } from "next";

// #region agent log
console.log('[DEBUG] next.config.ts loaded during build');
// #endregion

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure proper route handling in Next.js 15
  // Force dynamic rendering for all routes to prevent caching issues
  experimental: {
    // Ensure routes are properly generated
  },
};

export default nextConfig;
