import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/island/index.html" },
      { source: "/island", destination: "/island/index.html" },
    ];
  },
};

export default nextConfig;
