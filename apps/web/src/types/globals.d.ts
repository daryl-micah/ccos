export {};

declare global {
  interface CustomJwtSessionClaims {
    // Requires publicMetadata to be added to the session-token claims in the
    // Clerk Dashboard (Sessions > Customize session token). See PRODUCT.md
    // Decisions Log ("Gated private-beta onboarding — approval is
    // organization creation").
    publicMetadata?: {
      status?: string;
    };
  }
}
