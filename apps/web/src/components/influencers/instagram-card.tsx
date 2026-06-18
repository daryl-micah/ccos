"use client";

import * as React from "react";
import { ExternalLink, Instagram, Plug, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { InstagramPost, InstagramStatus, Metric } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectInstagramModal } from "@/components/influencers/connect-instagram";

// `decimals` keeps fractional precision for rate-style metrics; count metrics
// (followers, likes, comments, posts) render as whole numbers.
const FIELDS: {
  name: string;
  label: string;
  suffix?: string;
  decimals?: boolean;
}[] = [
  { name: "followers", label: "Followers" },
  { name: "avg_likes", label: "Avg likes" },
  { name: "avg_comments", label: "Avg comments" },
  {
    name: "engagement_rate",
    label: "ER (followers)",
    suffix: "%",
    decimals: true,
  },
  {
    name: "engagement_rate_reach",
    label: "ER (reach)",
    suffix: "%",
    decimals: true,
  },
  { name: "posting_frequency", label: "Posts/wk", decimals: true },
  { name: "post_count", label: "Total posts" },
];

export function InstagramCard({
  influencerId,
  instagramUsername,
  initialMetrics,
}: {
  influencerId: string;
  instagramUsername: string | null;
  initialMetrics: Metric[];
}) {
  // Latest value per Instagram metric name.
  const [values, setValues] = React.useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    const latest: Record<string, string> = {};
    for (const m of initialMetrics) {
      if (!latest[m.metric_name] || m.captured_at > latest[m.metric_name]) {
        latest[m.metric_name] = m.captured_at;
        out[m.metric_name] = Number(m.metric_value);
      }
    }
    return out;
  });
  const [lastSynced, setLastSynced] = React.useState<string | null>(() => {
    const times = initialMetrics.map((m) => m.captured_at).sort();
    return times.length ? times[times.length - 1] : null;
  });
  const [topPosts, setTopPosts] = React.useState<InstagramPost[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<InstagramStatus | null>(null);
  const [connectOpen, setConnectOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setStatus(await api.instagram.status());
      } catch {
        setStatus({ connected: false, username: null, source: null });
      }
    })();
  }, []);

  async function sync() {
    if (status && !status.connected) {
      setConnectOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.influencers.syncInstagram(influencerId);
      setValues({
        followers: r.followers,
        avg_likes: r.avg_likes,
        avg_comments: r.avg_comments,
        engagement_rate: r.engagement_rate,
        ...(r.engagement_rate_reach !== null
          ? { engagement_rate_reach: r.engagement_rate_reach }
          : {}),
        posting_frequency: r.posting_frequency,
        post_count: r.post_count,
      });
      setTopPosts(r.top_posts);
      setLastSynced(new Date().toISOString());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Not connected — prompt login.
        setStatus({ connected: false, username: null, source: null });
        setConnectOpen(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Sync failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await api.instagram.logout();
    setStatus({ connected: false, username: null, source: null });
  }

  const hasData = Object.keys(values).length > 0;
  const connected = status?.connected ?? false;

  return (
    <>
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Instagram className="size-4" /> Instagram
          {connected && status?.username ? (
            <span className="text-xs font-normal text-muted-foreground">
              · connected as @{status.username}
            </span>
          ) : null}
        </CardTitle>
        {instagramUsername ? (
          <div className="flex items-center gap-2">
            {connected ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={disconnect}
                className="text-muted-foreground"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConnectOpen(true)}
              >
                <Plug /> Connect Instagram
              </Button>
            )}
            <Button size="sm" onClick={sync} disabled={busy}>
              <RefreshCw /> {busy ? "Syncing…" : "Sync"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!instagramUsername ? (
          <p className="text-sm text-muted-foreground">
            No Instagram handle on this influencer. Add{" "}
            <code className="text-xs">instagram_username</code> to enable
            collection.
          </p>
        ) : (
          <>
            {hasData ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FIELDS.map((f) => (
                  <div key={f.name} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">
                      {f.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {f.name in values
                        ? `${formatNumber(
                            f.decimals
                              ? Math.round(values[f.name] * 100) / 100
                              : Math.round(values[f.name]),
                          )}${f.suffix ?? ""}`
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not synced yet. Click Sync to collect profile stats for{" "}
                <span className="font-medium">@{instagramUsername}</span>.
              </p>
            )}

            {topPosts.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Top posts
                </div>
                <div className="space-y-1.5">
                  {topPosts.map((p) => (
                    <a
                      key={p.shortcode}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="truncate">{p.caption || p.url}</span>
                      </span>
                      <span className="shrink-0 text-xs">
                        ♥ {formatNumber(p.likes)} · 💬 {formatNumber(p.comments)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : lastSynced ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last synced {new Date(lastSynced).toLocaleString("en-IN")} ·
                source: instagram (manual entries always win)
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>

    <ConnectInstagramModal
      open={connectOpen}
      onClose={() => setConnectOpen(false)}
      onConnected={(s) => {
        setStatus(s);
        setConnectOpen(false);
      }}
    />
    </>
  );
}
