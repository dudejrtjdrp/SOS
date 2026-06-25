import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is the default bundler for dev and build.
  experimental: {
    // Server Actions are stable; raise body limit for large KB / document payloads.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
