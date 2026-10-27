import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg uses node APIs, keep it out of the bundle
  serverExternalPackages: ["pg"],
};

export default nextConfig;
