import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/island", destination: "/island/index.html" }];
  },
};

export default nextConfig;
