import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. 移除 output: "standalone"，Cloudflare Pages 不需要它
  
  typedRoutes: true,
  reactCompiler: true,
  
  experimental: {
    typedEnv: true,
    // 2. 移除 runtime: 'edge'，因为它在 experimental 下已失效
    // 必须通过在 page.tsx 或 route.ts 里写 export const runtime = 'edge' 来配置
  },

  // 3. 兼容 Turbopack：添加一个空的 turbopack 对象
  // 这会告诉 Next.js 你知道正在使用 Turbopack，从而消除 webpack 冲突报错
  turbopack: {}, 

  // 4. 只有在非 Turbopack 环境下才应用 webpack 配置
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime === 'nodejs') {
      config.externals.push('node:buffer', 'node:path', 'node:crypto');
    }
    return config;
  },
};

export default nextConfig;
