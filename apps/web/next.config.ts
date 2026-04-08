import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/trpc'],
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${process.env.AUTH_API_URL}/api/auth/:path*`,
      },
      {
        source: '/api/trpc/:path*',
        destination: `${process.env.API_URL}/api/trpc/:path*`,
      },
    ];
  },

  /* config options here */
};

export default nextConfig;
