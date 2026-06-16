"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Metric } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const KPIS: { name: string; label: string; format: (v: number) => string }[] = [
  { name: "engagement_rate", label: "Engagement rate", format: (v) => `${v}%` },
  { name: "cpv", label: "CPV", format: inr },
  { name: "cpm", label: "CPM", format: inr },
  { name: "cpa", label: "CPA", format: inr },
  { name: "roas", label: "ROAS", format: (v) => `${v}×` },
];

function inr(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export function DerivedKpis({
  campaignInfluencerId,
  metrics,
  onRecomputed,
}: {
  campaignInfluencerId: string;
  metrics: Metric[];
  onRecomputed: (calculated: Metric[]) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Manual overrides win over calculated for the same KPI name.
  const resolved = React.useMemo(() => {
    const map = new Map<string, Metric>();
    for (const m of metrics) {
      if (m.post_id) continue; // KPIs are creator-level
      const existing = map.get(m.metric_name);
      if (!existing || (existing.source === "calculated" && m.source !== "calculated")) {
        map.set(m.metric_name, m);
      }
    }
    return map;
  }, [metrics]);

  async function recompute() {
    setBusy(true);
    setError(null);
    try {
      onRecomputed(await api.campaignInfluencers.recomputeMetrics(campaignInfluencerId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Recompute failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Derived KPIs</CardTitle>
        <Button size="sm" variant="outline" onClick={recompute} disabled={busy}>
          <RefreshCw /> {busy ? "Computing…" : "Recompute"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {KPIS.map((kpi) => {
            const metric = resolved.get(kpi.name);
            const value = metric ? Number(metric.metric_value) : null;
            return (
              <div key={kpi.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {kpi.label}
                  </span>
                  {metric ? (
                    <Badge
                      variant={metric.source === "manual" ? "warning" : "muted"}
                    >
                      {metric.source === "manual" ? "manual" : "calc"}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {value === null ? "—" : kpi.format(value)}
                </div>
              </div>
            );
          })}
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Calculated from entered metrics. Manual entries always win over
            calculated values.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
