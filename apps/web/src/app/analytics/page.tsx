"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type {
  CampaignRanking,
  CreatorRanking,
  GroupRanking,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function roas(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)}×`;
}
function rate(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)}%`;
}
function cpv(v: number | null): string {
  return v === null ? "—" : formatCurrency(v);
}

export default function AnalyticsPage() {
  const [creators, setCreators] = React.useState<CreatorRanking[]>([]);
  const [cities, setCities] = React.useState<GroupRanking[]>([]);
  const [categories, setCategories] = React.useState<GroupRanking[]>([]);
  const [campaigns, setCampaigns] = React.useState<CampaignRanking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [cr, ci, ca, cp] = await Promise.all([
          api.analytics.creators(),
          api.analytics.cities(),
          api.analytics.categories(),
          api.analytics.campaigns(),
        ]);
        setCreators(cr);
        setCities(ci);
        setCategories(ca);
        setCampaigns(cp);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load analytics (${err.message}). Is the API running?`
            : "Could not load analytics.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bestCampaign = campaigns.find((c) => c.roas !== null) ?? null;
  const topCreator = creators.find((c) => c.roas !== null) ?? null;
  const lowestCpv = [...creators]
    .filter((c) => c.cpv !== null)
    .sort((a, b) => (a.cpv ?? 0) - (b.cpv ?? 0))[0];
  const repeatCount = creators.filter((c) => c.repeat_candidate).length;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Cross-campaign performance intelligence."
      />
      <div className="space-y-6 p-8">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : creators.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No campaign data yet. Add creators and metrics to see rankings.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Best campaign"
                value={bestCampaign?.name ?? "—"}
                hint={bestCampaign ? `ROAS ${roas(bestCampaign.roas)}` : undefined}
              />
              <StatCard
                label="Top creator (ROAS)"
                value={topCreator?.name ?? "—"}
                hint={topCreator ? `ROAS ${roas(topCreator.roas)}` : undefined}
              />
              <StatCard
                label="Lowest CPV"
                value={lowestCpv?.name ?? "—"}
                hint={lowestCpv ? cpv(lowestCpv.cpv) : undefined}
              />
              <StatCard
                label="Repeat candidates"
                value={String(repeatCount)}
                hint="Multi-campaign, ROAS ≥ 1×"
              />
            </div>

            {/* Creators */}
            <Card>
              <CardHeader>
                <CardTitle>Creator rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>ROAS</TableHead>
                      <TableHead>CPV</TableHead>
                      <TableHead>Eng. rate</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators.map((c) => (
                      <TableRow key={c.influencer_id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/influencers/${c.influencer_id}`}
                            className="hover:underline"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.city ?? "—"}
                        </TableCell>
                        <TableCell>{c.campaigns}</TableCell>
                        <TableCell>{formatCurrency(c.spend)}</TableCell>
                        <TableCell>{formatCurrency(c.revenue)}</TableCell>
                        <TableCell>{roas(c.roas)}</TableCell>
                        <TableCell>{cpv(c.cpv)}</TableCell>
                        <TableCell>{rate(c.avg_engagement_rate)}</TableCell>
                        <TableCell>
                          {c.repeat_candidate ? (
                            <Badge variant="success">Repeat</Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GroupCard title="By city" rows={cities} labelKey="city" />
              <GroupCard
                title="By category"
                rows={categories}
                labelKey="category"
              />
            </div>

            {/* Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Creators</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.campaign_id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/campaigns/${c.campaign_id}`}
                            className="hover:underline"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell>{c.creators}</TableCell>
                        <TableCell>{formatCurrency(c.spend)}</TableCell>
                        <TableCell>{formatCurrency(c.revenue)}</TableCell>
                        <TableCell>{roas(c.roas)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function GroupCard({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: GroupRanking[];
  labelKey: "city" | "category";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labelKey === "city" ? "City" : "Category"}</TableHead>
              <TableHead>Creators</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r[labelKey] ?? "Unknown"}>
                <TableCell className="font-medium">
                  {r[labelKey] ?? "Unknown"}
                </TableCell>
                <TableCell>{r.creators}</TableCell>
                <TableCell>{formatCurrency(r.spend)}</TableCell>
                <TableCell>{roas(r.roas)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
