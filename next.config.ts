import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { dev }) {
    // OneDrive syncs .next while webpack writes its cache, which fails with ENOENT pack.gz.
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
