import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@worldcup-settlement/domain",
    "@worldcup-settlement/shared",
    "@worldcup-settlement/txline-client"
  ]
};

export default nextConfig;
