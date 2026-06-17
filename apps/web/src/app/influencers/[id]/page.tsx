"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Instagram, Youtube } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  Campaign,
  CampaignInfluencer,
  Influencer,
  Metric,
} from "@/lib/types";
import { ciStatusVariant, titleCase } from "@/lib/status";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstagramCard } from "@/components/influencers/instagram-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [influencer, setInfluencer] = React.useState<Influencer | null>(null);
  const [links, setLinks] = React.useState<CampaignInfluencer[]>([]);
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [igMetrics, setIgMetrics] = React.useState<Metric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [inf, l, allCampaigns, ig] = await Promise.all([
          api.influencers.get(id),
          api.campaignInfluencers.list({ influencer_id: id, limit: 500 }),
          api.campaigns.list({ limit: 500 }),
          api.metrics.list({ influencer_id: id, source: "instagram", limit: 500 }),
        ]);
        setInfluencer(inf);
        setLinks(l);
        setCampaigns(allCampaigns);
        setIgMetrics(ig);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load influencer (${err.message}).`
            : "Could not load influencer.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const campaignById = React.useMemo(
    () => new Map(campaigns.map((c) => [c.id, c])),
    [campaigns],
  );

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (error || !influencer) {
    return (
      <div className="p-8">
        <Link
          href="/influencers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> Influencers
        </Link>
        <p className="text-sm text-destructive">{error ?? "Not found."}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={influencer.name}
        description={
          [influencer.category, influencer.city].filter(Boolean).join(" · ") ||
          undefined
        }
      />
      <div className="space-y-6 p-8">
        <Link
          href="/influencers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" /> All influencers
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {influencer.instagram_username ? (
                <div className="flex items-center gap-2">
                  <Instagram className="size-4 text-muted-foreground" />
                  {influencer.instagram_username}
                </div>
              ) : null}
              {influencer.youtube_channel ? (
                <div className="flex items-center gap-2">
                  <Youtube className="size-4 text-muted-foreground" />
                  {influencer.youtube_channel}
                </div>
              ) : null}
              <Detail label="Language" value={influencer.language} />
              <Detail label="Manager" value={influencer.manager_name} />
              <Detail label="Email" value={influencer.email} />
              <Detail label="Phone" value={influencer.phone} />
              {influencer.notes ? (
                <p className="pt-2 text-muted-foreground">{influencer.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Campaign history</CardTitle>
            </CardHeader>
            <CardContent>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not part of any campaign yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l) => {
                      const c = campaignById.get(l.campaign_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">
                            {c ? (
                              <Link
                                href={`/campaigns/${c.id}`}
                                className="hover:underline"
                              >
                                {c.name}
                              </Link>
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ciStatusVariant(l.status)}>
                              {titleCase(l.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(l.cost)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <InstagramCard
          influencerId={id}
          instagramUsername={influencer.instagram_username}
          initialMetrics={igMetrics}
        />
      </div>
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
