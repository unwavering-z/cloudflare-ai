import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. 移除 standalone，因为 Cloudflare Pages 不需要它，它更适合 Docker
  // output: "standalone", 

  typedRoutes: true,
  reactCompiler: true,
  
  // 2. 强制开启 Edge 运行时支持
  experimental: {
    typedEnv: true,
    runtime: 'edge', // 关键：告诉 Next.js 默认尝试边缘模式
  },

  // 3. 解决一些 Node.js 模块在边缘环境的打包问题
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('node:buffer', 'node:path', 'node:crypto');
    }
    return config;
  },
};

export default nextConfig;
// trigger build
