import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is the default bundler for dev and build.
  experimental: {
    // Server Actions are stable; raise body limit for large KB / document payloads.
    serverActions: { bodySizeLimit: "2mb" },
  },
  // The 공고문 한글(.hwp) 뷰어 loads `hwp.js`, which bundles `cfb`. `cfb` statically
  // imports Node's `fs` for disk helpers we never call in the browser (we render
  // from an in-memory Uint8Array). Stub `fs` to an empty module for the *client*
  // build only — the server keeps the real `fs`. Both bundlers are covered.
  turbopack: {
    resolveAlias: {
      fs: { browser: "./src/lib/empty.ts" },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
};

export default nextConfig;
