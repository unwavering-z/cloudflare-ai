import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    runtime: 'edge', 
  },
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
