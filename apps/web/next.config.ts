import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@a2a-x402-wallet/x402'],
};

export default nextConfig;
