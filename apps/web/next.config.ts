import type { NextConfig } from 'next';

import { env } from './env';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/trpc'],
  basePath: env.NEXT_PUBLIC_BASE_PATH,
  trailingSlash: true,
};

export default nextConfig;
