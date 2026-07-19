import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy-policy",
  "/terms-of-service",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

// No "personal" ungrouped mode (PRODUCT.md) — every signed-in user must
// belong to an active Clerk Organization before reaching the app, since
// every API query is org-scoped (app/core/auth.py rejects requests with no
// org_id). API routes are left alone here; they return their own 401/403.
export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { orgId } = await auth.protect();
  if (isApiRoute(request)) return;

  if (!orgId && !isOnboardingRoute(request)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if (orgId && isOnboardingRoute(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
