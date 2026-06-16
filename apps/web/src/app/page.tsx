"use client";

import * as React from "react";
import Link from "next/link";
import { IndianRupee, Megaphone, TrendingUp, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Campaign, CampaignInfluencer, Influencer, Metric } from "@/lib/types";
import { campaignStatusVariant, titleCase } from "@/lib/status";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { SpendChart, type SpendDatum } from "@/components/dashboard/spend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [influencers, setInfluencers] = React.useState<Influencer[]>([]);
  const [links, setLinks] = React.useState<CampaignInfluencer[]>([]);
  const [metrics, setMetrics] = React.useState<Metric[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [c, i, l, m] = await Promise.all([
          api.campaigns.list({ limit: 500 }),
          api.influencers.list({ limit: 500 }),
          api.campaignInfluencers.list({ limit: 500 }),
          api.metrics.list({ limit: 500 }),
        ]);
        setCampaigns(c);
        setInfluencers(i);
        setLinks(l);
        setMetrics(m);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load dashboard (${err.message}). Is the API running?`
            : "Could not load dashboard.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSpend = links.reduce((sum, l) => sum + Number(l.cost ?? 0), 0);
  const totalRevenue = metrics
    .filter((m) => m.metric_name === "revenue")
    .reduce((sum, m) => sum + Number(m.metric_value), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const spendByCampaign: SpendDatum[] = React.useMemo(() => {
    const nameById = new Map(campaigns.map((c) => [c.id, c.name]));
    const totals = new Map<string, number>();
    for (const l of links) {
      const key = l.campaign_id;
      totals.set(key, (totals.get(key) ?? 0) + Number(l.cost ?? 0));
    }
    return [...totals.entries()]
      .map(([id, spend]) => ({ name: nameById.get(id) ?? "—", spend }))
      .filter((d) => d.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);
  }, [campaigns, links]);

  const recent = [...campaigns].slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" description="Your campaigns at a glance." />
      <div className="space-y-6 p-8">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Campaigns"
                value={String(campaigns.length)}
                hint={`${activeCampaigns} active`}
                icon={<Megaphone className="size-4" />}
              />
              <StatCard
                label="Influencers"
                value={String(influencers.length)}
                hint="In your creator database"
                icon={<Users className="size-4" />}
              />
              <StatCard
                label="Total spend"
                value={formatCurrency(totalSpend)}
                hint="Committed creator cost"
                icon={<IndianRupee className="size-4" />}
              />
              <StatCard
                label="ROAS"
                value={totalRevenue > 0 ? `${roas.toFixed(2)}×` : "—"}
                hint={`Revenue ${formatCurrency(totalRevenue)}`}
                icon={<TrendingUp className="size-4" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Spend by campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpendChart data={spendByCampaign} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent campaigns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No campaigns yet.{" "}
                      <Link href="/campaigns" className="underline">
                        Create one
                      </Link>
                      .
                    </p>
                  ) : (
                    recent.map((c) => (
                      <Link
                        key={c.id}
                        href={`/campaigns/${c.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                      >
                        <span className="text-sm font-medium">{c.name}</span>
                        <Badge variant={campaignStatusVariant(c.status)}>
                          {titleCase(c.status)}
                        </Badge>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
