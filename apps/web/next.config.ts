import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@worldcup-settlement/domain",
    "@worldcup-settlement/settlement",
    "@worldcup-settlement/shared",
    "@worldcup-settlement/solana-adapter",
    "@worldcup-settlement/txline-client"
  ]
};

export default nextConfig;
