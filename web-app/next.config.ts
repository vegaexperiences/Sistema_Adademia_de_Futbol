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
  // Try output: 'standalone' to see if it helps with Vercel deployment
  // output: 'standalone',
  // Ensure proper route generation for Vercel
  // This might help with route recognition
};

export default nextConfig;
