import path from "node:path";
import type { NextConfig } from "next";

// In the monorepo, pin the workspace root so Next doesn't guess from sibling
// lockfiles. In an isolated build (Docker context = apps/web) there is no
// parent workspace, so fall back to the app directory.
const monorepoRoot = path.join(__dirname, "..", "..");
const root = process.env.NEXT_ISOLATED_BUILD ? __dirname : monorepoRoot;

// BFF: same-origin /api/v1/* is proxied server-side to the FastAPI backend by
// the Route Handler at src/app/api/v1/[...path]/route.ts (not a static
// rewrite here, since rewrites can't attach a per-request Clerk token).

const nextConfig: NextConfig = {
  turbopack: { root },
};

export default nextConfig;
