import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't guess from sibling lockfiles.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
