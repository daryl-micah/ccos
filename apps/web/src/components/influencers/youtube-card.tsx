"use client";

import * as React from "react";
import { ExternalLink, RefreshCw, Youtube } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Metric, YouTubeVideo } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FIELDS: {
  name: string;
  label: string;
  suffix?: string;
  decimals?: boolean;
}[] = [
  { name: "subscribers", label: "Subscribers" },
  { name: "avg_views", label: "Avg views" },
  { name: "avg_likes", label: "Avg likes" },
  { name: "avg_comments", label: "Avg comments" },
  {
    name: "engagement_rate",
    label: "ER (subs)",
    suffix: "%",
    decimals: true,
  },
  {
    name: "engagement_rate_reach",
    label: "ER (views)",
    suffix: "%",
    decimals: true,
  },
  { name: "upload_frequency", label: "Videos/wk", decimals: true },
  { name: "video_count", label: "Total videos" },
];

export function YouTubeCard({
  influencerId,
  youtubeChannel,
  initialMetrics,
}: {
  influencerId: string;
  youtubeChannel: string | null;
  initialMetrics: Metric[];
}) {
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
  const [topVideos, setTopVideos] = React.useState<YouTubeVideo[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.influencers.syncYouTube(influencerId);
      setValues({
        ...(r.subscribers !== null ? { subscribers: r.subscribers } : {}),
        ...(r.total_views !== null ? { total_views: r.total_views } : {}),
        ...(r.video_count !== null ? { video_count: r.video_count } : {}),
        avg_views: r.avg_views,
        ...(r.avg_likes !== null ? { avg_likes: r.avg_likes } : {}),
        ...(r.avg_comments !== null ? { avg_comments: r.avg_comments } : {}),
        ...(r.engagement_rate !== null
          ? { engagement_rate: r.engagement_rate }
          : {}),
        ...(r.engagement_rate_reach !== null
          ? { engagement_rate_reach: r.engagement_rate_reach }
          : {}),
        upload_frequency: r.upload_frequency,
      });
      setTopVideos(r.top_videos);
      setLastSynced(new Date().toISOString());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  const hasData = Object.keys(values).length > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Youtube className="size-4" /> YouTube
        </CardTitle>
        {youtubeChannel ? (
          <Button size="sm" onClick={sync} disabled={busy}>
            <RefreshCw /> {busy ? "Syncing..." : "Sync"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!youtubeChannel ? (
          <p className="text-sm text-muted-foreground">
            No YouTube channel on this influencer. Add{" "}
            <code className="text-xs">youtube_channel</code> or{" "}
            <code className="text-xs">youtube_channel_id</code> to enable
            collection.
          </p>
        ) : (
          <>
            {hasData ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                        : "-"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not synced yet. Click Sync to collect channel stats for{" "}
                <span className="font-medium">{youtubeChannel}</span>.
              </p>
            )}

            {topVideos.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Top videos
                </div>
                <div className="space-y-1.5">
                  {topVideos.map((v) => (
                    <a
                      key={v.video_id}
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="truncate">{v.title || v.url}</span>
                      </span>
                      <span className="shrink-0 text-xs">
                        {formatNumber(v.views)} views
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
                Last synced {new Date(lastSynced).toLocaleString("en-IN")} -
                source: youtube (manual entries always win)
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
