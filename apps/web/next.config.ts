import path from "node:path";
import type { NextConfig } from "next";

// In the monorepo, pin the workspace root so Next doesn't guess from sibling
// lockfiles. In an isolated build (Docker context = apps/web) there is no
// parent workspace, so fall back to the app directory.
const monorepoRoot = path.join(__dirname, "..", "..");
const root = process.env.NEXT_ISOLATED_BUILD ? __dirname : monorepoRoot;

// BFF: proxy same-origin /api/v1/* to the FastAPI backend server-side, so the
// browser never talks to the API directly (no CORS, API stays private). This
// runs when the Node server boots, so API_INTERNAL_URL is a runtime env var
// (NOT NEXT_PUBLIC_*) and can change without a rebuild. Defaults to the Docker
// service name; set http://localhost:8000 for local `next dev`.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://api:8000";

const nextConfig: NextConfig = {
  turbopack: { root },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiInternalUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
