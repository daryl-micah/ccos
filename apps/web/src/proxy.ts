import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy-policy",
  "/terms-of-service",
]);

// The marketing landing page. Public, but signed-in users are sent straight
// into the app so "/" never shows them the pitch for a product they own.
const isLandingRoute = createRouteMatcher(["/"]);
const isApplyRoute = createRouteMatcher(["/apply"]);
const isPendingRoute = createRouteMatcher(["/pending"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

// Access is gated behind manual approval (PRODUCT.md, "Gated private-beta
// onboarding — approval is organization creation"): a signed-up user has no
// org until approved, and approving *is* creating their org. So the only
// signal this middleware needs is orgId (app) vs. publicMetadata.status
// (pending vs. needs to apply) — there's no self-serve org creation left to
// gate. API routes are left alone here; they return their own 401/403.
export default clerkMiddleware(async (auth, request) => {
  if (isLandingRoute(request)) {
    const { userId, orgId } = await auth();
    if (!userId) return;
    return NextResponse.redirect(
      new URL(orgId ? "/dashboard" : "/apply", request.url),
    );
  }
  if (isPublicRoute(request)) return;

  const { orgId, sessionClaims } = await auth.protect();
  if (isApiRoute(request)) return;

  const isPending = sessionClaims?.publicMetadata?.status === "pending";

  if (!orgId) {
    if (isPending && !isPendingRoute(request)) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    if (!isPending && !isApplyRoute(request)) {
      return NextResponse.redirect(new URL("/apply", request.url));
    }
    return;
  }

  if (isApplyRoute(request) || isPendingRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
