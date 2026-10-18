import type { NextConfig } from "next";

const root = process.cwd();

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
