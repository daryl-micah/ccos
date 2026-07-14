import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// BFF: proxy same-origin /api/v1/* to the FastAPI backend server-side,
// forwarding the caller's Clerk session token so the API can verify it (see
// apps/api/app/core/auth.py). Replaces the old next.config.ts rewrite, which
// had no way to attach a per-request token. This runs in the Node runtime, so
// API_INTERNAL_URL is a runtime env var (NOT NEXT_PUBLIC_*) and can change
// without a rebuild. Defaults to the Docker service name; set
// http://localhost:8000 for local `next dev`.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://api:8000";

// Never cache a per-user, per-org authenticated proxy response.
export const dynamic = "force-dynamic";

// Hop-by-hop headers (RFC 7230 §6.1) plus Host, which must target the
// upstream API rather than the Next.js server.
const STRIPPED_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
];

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const upstreamUrl = new URL(
    `/api/v1/${path.join("/")}${request.nextUrl.search}`,
    apiInternalUrl,
  );

  const headers = new Headers(request.headers);
  for (const name of STRIPPED_HEADERS) headers.delete(name);
  headers.set("authorization", `Bearer ${token}`);

  // Streaming a request body through Node's fetch (undici) requires `duplex`,
  // which isn't in the DOM RequestInit type yet.
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  };

  const upstreamResponse = await fetch(upstreamUrl, init);

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const name of STRIPPED_HEADERS) responseHeaders.delete(name);

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
};
