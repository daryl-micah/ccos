"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Campaign, CampaignInfluencer, Influencer } from "@/lib/types";
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

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [links, setLinks] = React.useState<CampaignInfluencer[]>([]);
  const [influencers, setInfluencers] = React.useState<Influencer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [c, l, allInf] = await Promise.all([
          api.campaigns.get(id),
          api.campaignInfluencers.list({ campaign_id: id, limit: 500 }),
          api.influencers.list({ limit: 500 }),
        ]);
        setCampaign(c);
        setLinks(l);
        setInfluencers(allInf);
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

  // Influencers not yet on this campaign — candidates to add.
  const candidates = React.useMemo(() => {
    const onCampaign = new Set(links.map((l) => l.influencer_id));
    return influencers.filter((i) => !onCampaign.has(i.id));
  }, [influencers, links]);

  const totalSpend = links.reduce((sum, l) => sum + Number(l.cost ?? 0), 0);

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
          <Button onClick={() => setShowAdd(true)}>
            <Plus /> Add creator
          </Button>
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
          <CardHeader>
            <CardTitle>Creators in this campaign</CardTitle>
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
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => {
                    const inf = nameById.get(l.influencer_id);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          {inf ? (
                            <Link
                              href={`/influencers/${inf.id}`}
                              className="hover:underline"
                            >
                              {inf.name}
                            </Link>
                          ) : (
                            "Unknown"
                          )}
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
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add creator to campaign"
      >
        <AddCreatorForm
          campaignId={id}
          influencers={candidates}
          onCancel={() => setShowAdd(false)}
          onAdded={(link) => {
            setLinks((prev) => [link, ...prev]);
            setShowAdd(false);
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
