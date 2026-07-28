const IG_SKIP_SEGMENTS = new Set(["p", "reel", "reels", "stories", "explore", "tv"]);
const YT_PATH_SEGMENTS = new Set(["channel", "c", "user"]);

/** Detect an Instagram/YouTube profile URL and extract its handle. */
export function parseProfileLink(
  value: string,
): { field: "instagram_username" | "youtube_channel"; handle: string } | null {
  const text = value.trim();
  if (!text) return null;
  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (host.includes("instagram.com")) {
    const handle = segments[0].replace(/^@/, "");
    if (IG_SKIP_SEGMENTS.has(handle.toLowerCase())) return null;
    return { field: "instagram_username", handle };
  }
  if (host.includes("youtube.com")) {
    if (segments[0].startsWith("@")) {
      return { field: "youtube_channel", handle: segments[0] };
    }
    if (YT_PATH_SEGMENTS.has(segments[0]) && segments.length > 1) {
      return { field: "youtube_channel", handle: segments[1] };
    }
    return null;
  }
  return null;
}
