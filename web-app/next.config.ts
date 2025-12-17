import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Simplified config for single-tenant architecture
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
