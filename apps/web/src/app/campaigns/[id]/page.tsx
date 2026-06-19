"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Plus, Trash2, ExternalLink, RefreshCw, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Agency, Campaign, CampaignInfluencer, Influencer, Metric, Post } from "@/lib/types";
import { campaignStatusVariant, ciStatusVariant, titleCase } from "@/lib/status";
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
import { AddCreatorForm } from "@/components/campaigns/add-creator-form";
import { RosterImportModal } from "@/components/campaigns/roster-import";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [links, setLinks] = React.useState<CampaignInfluencer[]>([]);
  const [influencers, setInfluencers] = React.useState<Influencer[]>([]);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [metrics, setMetrics] = React.useState<Metric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showRoster, setShowRoster] = React.useState(false);
  const [recomputing, setRecomputing] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [c, l, allInf, allAgencies] = await Promise.all([
          api.campaigns.get(id),
          api.campaignInfluencers.list({ campaign_id: id, limit: 500 }),
          api.influencers.list({ limit: 500 }),
          api.agencies.list(),
        ]);
        setCampaign(c);
        setLinks(l);
        setInfluencers(allInf);
        setAgencies(allAgencies);

        // Fetch posts and metrics for all campaign influencers
        if (l.length > 0) {
          const [allPosts, allMetricsByCi] = await Promise.all([
            Promise.all(
              l.map((link) =>
                api.posts.list({ campaign_influencer_id: link.id, limit: 500 })
              )
            ),
            Promise.all(
              l.map((link) =>
                api.metrics.list({ campaign_influencer_id: link.id, limit: 500 })
              )
            ),
          ]);
          const flatPosts = allPosts.flat();
          setPosts(flatPosts);
          const flatMetrics = allMetricsByCi.flat();
          setMetrics(flatMetrics);
        }
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load campaign (${err.message}).`
            : "Could not load campaign.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const nameById = React.useMemo(
    () => new Map(influencers.map((i) => [i.id, i])),
    [influencers],
  );

  const agencyById = React.useMemo(
    () => new Map(agencies.map((a) => [a.id, a])),
    [agencies],
  );

  // After a roster import, refresh creators, influencers, and agencies.
  async function reloadRoster() {
    const [l, allInf, allAgencies] = await Promise.all([
      api.campaignInfluencers.list({ campaign_id: id, limit: 500 }),
      api.influencers.list({ limit: 500 }),
      api.agencies.list(),
    ]);
    setLinks(l);
    setInfluencers(allInf);
    setAgencies(allAgencies);
  }

  // Influencers not yet on this campaign — candidates to add.
  const candidates = React.useMemo(() => {
    const onCampaign = new Set(links.map((l) => l.influencer_id));
    return influencers.filter((i) => !onCampaign.has(i.id));
  }, [influencers, links]);

  const totalSpend = links.reduce((sum, l) => sum + Number(l.cost ?? 0), 0);

  // Build metric lookup for each campaign influencer (creator-level metrics)
  const ciMetricsByName = React.useMemo(() => {
    const map = new Map<string, Map<string, Metric>>();
    for (const m of metrics) {
      if (m.post_id) continue; // only CI-level metrics
      const ciMap = map.get(m.campaign_influencer_id) ?? new Map();
      const existing = ciMap.get(m.metric_name);
      if (!existing || (existing.source === "calculated" && m.source !== "calculated")) {
        ciMap.set(m.metric_name, m);
      }
      map.set(m.campaign_influencer_id, ciMap);
    }
    return map;
  }, [metrics]);

  function getCiMetric(ciId: string, name: string): string | null {
    const ciMap = ciMetricsByName.get(ciId);
    if (!ciMap) return null;
    const m = ciMap.get(name);
    return m ? m.metric_value : null;
  }

  // Metric columns for creators table - standard KPIs
  const creatorMetricNames = [
    "views",
    "reach",
    "engagement_rate",
    "cpv",
    "cpm",
    "cpa",
    "roas",
    "installs",
    "leads",
    "bookings",
    "purchases",
    "revenue",
  ];

  // Group post-scoped metrics by post
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

  // Metric columns for the posts table
  const postMetricNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const m of metrics) if (m.post_id) set.add(m.metric_name);
    const preferred = [
      "likes",
      "comments",
      "views",
      "engagement_rate",
      "engagement_rate_reach",
    ];
    const rest = [...set].filter((n) => !preferred.includes(n)).sort();
    return [...preferred.filter((n) => set.has(n)), ...rest];
  }, [metrics]);

  function postMetric(postId: string, name: string): string | null {
    const rows = (metricsByPost.get(postId) ?? []).filter(
      (m) => m.metric_name === name,
    );
    if (rows.length === 0) return null;
    const manual = rows.filter((m) => m.source === "manual");
    const pool = manual.length ? manual : rows;
    return pool.reduce((a, b) => (a.captured_at > b.captured_at ? a : b))
      .metric_value;
  }

  async function handleRecompute() {
    setRecomputing(true);
    try {
      const recalculated = await api.campaigns.recomputeMetrics(id);
      // Replace CI-level calculated metrics with fresh ones
      const calculatedNames = new Set(recalculated.map((m) => m.metric_name));
      setMetrics((prev) => [
        ...prev.filter(
          (m) =>
            !(
              m.source === "calculated" &&
              !m.post_id &&
              calculatedNames.has(m.metric_name)
            ),
        ),
        ...recalculated,
      ]);
    } catch (err) {
      console.error("Recompute failed", err);
    } finally {
      setRecomputing(false);
    }
  }

  async function handleRemove(linkId: string) {
    if (!confirm("Remove this creator from the campaign? (soft delete)")) return;
    await api.campaignInfluencers.remove(linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (error || !campaign) {
    return (
      <div className="p-8">
        <Link
          href="/campaigns"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> Campaigns
        </Link>
        <p className="text-sm text-destructive">{error ?? "Not found."}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={campaign.brand ?? undefined}
        action={
          <div className="flex gap-2">
            <a href={api.reports.exportCampaignCreatorsUrl(id)}>
              <Button variant="outline">
                <Download /> Creators
              </Button>
            </a>
            <a href={api.reports.exportCampaignPostsUrl(id)}>
              <Button variant="outline">
                <Download /> Posts
              </Button>
            </a>
          </div>
        }
      />
      <div className="space-y-6 p-8">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> All campaigns
        </Link>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Summary label="Status">
            <Badge variant={campaignStatusVariant(campaign.status)}>
              {titleCase(campaign.status)}
            </Badge>
          </Summary>
          <Summary label="Budget">{formatCurrency(campaign.budget)}</Summary>
          <Summary label="Committed spend">
            {formatCurrency(totalSpend)}
          </Summary>
          <Summary label="Creators">{String(links.length)}</Summary>
        </div>

        {campaign.objective ? (
          <Card>
            <CardHeader>
              <CardTitle>Objective</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {campaign.objective}
              <div className="mt-3 flex gap-6 text-xs">
                <span>Start: {formatDate(campaign.start_date)}</span>
                <span>End: {formatDate(campaign.end_date)}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Creators in this campaign</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus /> Add creator
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRoster(true)}
              >
                <Upload /> Import roster
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecompute}
                disabled={recomputing}
              >
                <RefreshCw /> {recomputing ? "Computing…" : "Recompute KPIs"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No creators yet. Add one to start tracking deliverables and
                results.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Closed by</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    {creatorMetricNames.map((n) => (
                      <TableHead key={n} className="text-right">
                        {metricLabel(n)}
                      </TableHead>
                    ))}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => {
                    const inf = nameById.get(l.influencer_id);
                    const agency = l.agency_id
                      ? agencyById.get(l.agency_id)
                      : null;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/campaigns/${id}/creators/${l.id}`}
                            className="hover:underline"
                          >
                            {inf ? inf.name : "Unknown creator"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {agency ? agency.name : "In-house"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inf?.city ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ciStatusVariant(l.status)}>
                            {titleCase(l.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(l.cost)}</TableCell>
                        {creatorMetricNames.map((n) => {
                          const v = getCiMetric(l.id, n);
                          return (
                            <TableCell key={n} className="text-right tabular-nums">
                              {v === null
                                ? "—"
                                : `${formatMetric(v)}${
                                    n === "engagement_rate" ? "%" : ""
                                  }`}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(l.id)}
                            aria-label="Remove creator"
                          >
                            <Trash2 className="text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Live posts across all creators */}
        <Card>
          <CardHeader>
            <CardTitle>All live posts & metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No live posts yet for this campaign. Add them on each
                creator&apos;s detail page.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Posted</TableHead>
                      {postMetricNames.map((n) => (
                        <TableHead key={n} className="text-right">
                          {metricLabel(n)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => {
                      const inf = nameById.get(
                        links.find((l) => l.id === post.campaign_influencer_id)
                          ?.influencer_id ?? ""
                      );
                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">
                            {inf?.name ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-60">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1.5 truncate hover:underline"
                            >
                              <ExternalLink className="size-3.5 shrink-0" />
                              <span className="truncate">{post.url}</span>
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{post.platform}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {post.posted_at ? formatDate(post.posted_at) : "—"}
                          </TableCell>
                          {postMetricNames.map((n) => {
                            const v = postMetric(post.id, n);
                            return (
                              <TableCell
                                key={n}
                                className="text-right tabular-nums"
                              >
                                {v === null
                                  ? "—"
                                  : `${formatMetric(v)}${
                                      n.startsWith("engagement_rate") ? "%" : ""
                                    }`}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add creator to campaign"
      >
        <AddCreatorForm
          campaignId={id}
          influencers={candidates}
          agencies={agencies}
          onCancel={() => setShowAdd(false)}
          onAdded={(link) => {
            setLinks((prev) => [link, ...prev]);
            setShowAdd(false);
          }}
        />
      </Modal>

      <RosterImportModal
        campaignId={id}
        open={showRoster}
        onClose={() => setShowRoster(false)}
        onImported={reloadRoster}
      />
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
  const num = Number(n.toFixed(4));
  if (Number.isInteger(num)) return String(num);
  return String(num);
}

function metricLabel(name: string): string {
  if (name === "engagement_rate") return "ER (followers)";
  if (name === "engagement_rate_reach") return "ER (reach)";
  return titleCase(name);
}
