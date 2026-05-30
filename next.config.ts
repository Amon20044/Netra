import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["netra-artifacts"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
