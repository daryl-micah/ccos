"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  Campaign,
  CampaignInfluencer,
  Deliverable,
  Influencer,
  Metric,
  Post,
} from "@/lib/types";
import { ciStatusVariant, titleCase } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { DeliverableForm } from "@/components/creators/deliverable-form";
import { PostForm } from "@/components/creators/post-form";
import { PostMetricForm } from "@/components/creators/post-metric-form";
import { DerivedKpis } from "@/components/creators/derived-kpis";

export default function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string; ciId: string }>;
}) {
  const { id, ciId } = use(params);

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [ci, setCi] = React.useState<CampaignInfluencer | null>(null);
  const [influencer, setInfluencer] = React.useState<Influencer | null>(null);
  const [deliverables, setDeliverables] = React.useState<Deliverable[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [metrics, setMetrics] = React.useState<Metric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showDeliverable, setShowDeliverable] = React.useState(false);
  const [showPost, setShowPost] = React.useState(false);
  const [syncingPost, setSyncingPost] = React.useState<string | null>(null);
  const [postSyncError, setPostSyncError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const link = await api.campaignInfluencers.get(ciId);
        setCi(link);
        const [c, inf, d, p, m] = await Promise.all([
          api.campaigns.get(id),
          api.influencers.get(link.influencer_id),
          api.deliverables.list({ campaign_influencer_id: ciId, limit: 500 }),
          api.posts.list({ campaign_influencer_id: ciId, limit: 500 }),
          api.metrics.list({ campaign_influencer_id: ciId, limit: 500 }),
        ]);
        setCampaign(c);
        setInfluencer(inf);
        setDeliverables(d);
        setPosts(p);
        setMetrics(m);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load creator (${err.message}).`
            : "Could not load creator.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id, ciId]);

  const metricsByPost = React.useMemo(() => {
    const map = new Map<string, Metric[]>();
    for (const m of metrics) {
      if (!m.post_id) continue;
      const arr = map.get(m.post_id) ?? [];
      arr.push(m);
      map.set(m.post_id, arr);
    }
    return map;
  }, [metrics]);

  async function deleteDeliverable(deliverableId: string) {
    await api.deliverables.remove(deliverableId);
    setDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this live post and its metrics? (soft delete)")) return;
    await api.posts.remove(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function deleteMetric(metricId: string) {
    await api.metrics.remove(metricId);
    setMetrics((prev) => prev.filter((m) => m.id !== metricId));
  }

  async function syncPostMetrics(postId: string) {
    setSyncingPost(postId);
    setPostSyncError(null);
    try {
      const res = await api.posts.syncMetrics(postId);
      // Replace this post's Instagram metrics; manual entries stay.
      setMetrics((prev) => [
        ...prev.filter(
          (m) => !(m.post_id === postId && m.source === "instagram"),
        ),
        ...res.metrics,
      ]);
    } catch (err) {
      setPostSyncError(
        err instanceof ApiError && err.status === 409
          ? "Connect Instagram (on the influencer's page) to fetch post metrics."
          : err instanceof ApiError
            ? err.message
            : "Could not fetch post metrics.",
      );
    } finally {
      setSyncingPost(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (error || !ci) {
    return (
      <div className="p-8">
        <Link
          href={`/campaigns/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to campaign
        </Link>
        <p className="text-sm text-destructive">{error ?? "Not found."}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={influencer?.name ?? "Creator"}
        description={campaign ? `in ${campaign.name}` : undefined}
      />
      <div className="space-y-6 p-8">
        <Link
          href={`/campaigns/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to campaign
        </Link>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Summary label="Status">
            <Badge variant={ciStatusVariant(ci.status)}>
              {titleCase(ci.status)}
            </Badge>
          </Summary>
          <Summary label="Cost">{formatCurrency(ci.cost)}</Summary>
          <Summary label="Deliverables">{String(deliverables.length)}</Summary>
          <Summary label="Live posts">{String(posts.length)}</Summary>
        </div>

        <DerivedKpis
          campaignInfluencerId={ciId}
          metrics={metrics}
          onRecomputed={(calculated) => {
            const names = new Set(calculated.map((m) => m.metric_name));
            setMetrics((prev) => [
              // drop superseded CI-level calculated rows, keep everything else
              ...prev.filter(
                (m) =>
                  !(
                    m.source === "calculated" &&
                    !m.post_id &&
                    names.has(m.metric_name)
                  ),
              ),
              ...calculated,
            ]);
          }}
        />

        {/* Deliverables */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Deliverables</CardTitle>
            <Button size="sm" onClick={() => setShowDeliverable(true)}>
              <Plus /> Add deliverable
            </Button>
          </CardHeader>
          <CardContent>
            {deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deliverables committed yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliverables.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {titleCase(d.type)}
                      </TableCell>
                      <TableCell>{d.quantity}</TableCell>
                      <TableCell>{formatDate(d.due_date)}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{titleCase(d.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDeliverable(d.id)}
                          aria-label="Delete deliverable"
                        >
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Live posts + insight metrics */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Live posts & insights</CardTitle>
            <Button size="sm" onClick={() => setShowPost(true)}>
              <Plus /> Add live post
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Instagram posts auto-fetch likes, comments, views & engagement on
              add — or hit sync. Shares & reposts aren&apos;t exposed by
              Instagram&apos;s API.
            </p>
            {postSyncError ? (
              <p className="text-sm text-destructive">{postSyncError}</p>
            ) : null}
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No live posts yet. Paste a published post link to start tracking
                likes, comments, and engagement.
              </p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 truncate font-medium hover:underline"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="truncate">{post.url}</span>
                      </a>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{post.platform}</Badge>
                        {post.posted_at ? (
                          <span>{formatDate(post.posted_at)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {post.platform === "instagram" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => syncPostMetrics(post.id)}
                          disabled={syncingPost === post.id}
                          aria-label="Sync post metrics"
                          title="Fetch likes, comments & ER% from Instagram"
                        >
                          <RefreshCw
                            className={
                              syncingPost === post.id
                                ? "animate-spin text-muted-foreground"
                                : "text-muted-foreground"
                            }
                          />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePost(post.id)}
                        aria-label="Delete post"
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(metricsByPost.get(post.id) ?? []).map((m) => (
                      <span
                        key={m.id}
                        className="group inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {titleCase(m.metric_name)}
                        </span>
                        <span className="font-medium">
                          {formatMetric(m.metric_value)}
                        </span>
                        <button
                          onClick={() => deleteMetric(m.id)}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove metric"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {(metricsByPost.get(post.id) ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No metrics yet —
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <PostMetricForm
                      campaignInfluencerId={ciId}
                      postId={post.id}
                      onAdded={(m) => setMetrics((prev) => [...prev, m])}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={showDeliverable}
        onClose={() => setShowDeliverable(false)}
        title="Add deliverable"
      >
        <DeliverableForm
          campaignInfluencerId={ciId}
          onCancel={() => setShowDeliverable(false)}
          onCreated={(d) => {
            setDeliverables((prev) => [...prev, d]);
            setShowDeliverable(false);
          }}
        />
      </Modal>

      <Modal
        open={showPost}
        onClose={() => setShowPost(false)}
        title="Add live post"
      >
        <PostForm
          campaignInfluencerId={ciId}
          deliverables={deliverables}
          onCancel={() => setShowPost(false)}
          onCreated={(p) => {
            setPosts((prev) => [...prev, p]);
            setShowPost(false);
            if (p.platform === "instagram") syncPostMetrics(p.id);
          }}
        />
      </Modal>
    </>
  );
}

function Summary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-semibold">{children}</div>
    </div>
  );
}

function formatMetric(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  // Drop trailing zeros (e.g. "2400.0000" -> "2400", "5.4000" -> "5.4").
  return String(Number(n.toFixed(4)));
}
