"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { CampaignInfluencerResults, Metric } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Manual, creator-level inputs that feed the derived-metric engine
// (revenue → ROAS, conversions → CPA, impressions → CPM).
const FIELDS: { name: keyof CampaignInfluencerResults; label: string }[] = [
  { name: "revenue", label: "Revenue (₹)" },
  { name: "installs", label: "Installs" },
  { name: "leads", label: "Leads" },
  { name: "bookings", label: "Bookings" },
  { name: "purchases", label: "Purchases" },
  { name: "impressions", label: "Impressions" },
];

/** Latest manual CI-level value for a metric name, if any. */
function manualValue(metrics: Metric[], name: string): string {
  const rows = metrics.filter(
    (m) => !m.post_id && m.source === "manual" && m.metric_name === name,
  );
  if (rows.length === 0) return "";
  const newest = rows.reduce((a, b) =>
    a.captured_at > b.captured_at ? a : b,
  );
  // Trim trailing zeros for display (e.g. "50000.0000" -> "50000").
  const n = Number(newest.metric_value);
  return Number.isNaN(n) ? newest.metric_value : String(n);
}

export function ResultsForm({
  campaignInfluencerId,
  metrics,
  onSaved,
}: {
  campaignInfluencerId: string;
  metrics: Metric[];
  /** Receives the CI-level metrics (manual results + recomputed KPIs). */
  onSaved: (ciLevelMetrics: Metric[]) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const payload: CampaignInfluencerResults = {};
    for (const { name } of FIELDS) {
      const raw = String(form.get(name) ?? "").trim();
      // Empty clears the metric; a value stores it.
      payload[name] = raw === "" ? null : raw;
    }
    try {
      const updated = await api.campaignInfluencers.setResults(
        campaignInfluencerId,
        payload,
      );
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save results.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results & conversions</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {FIELDS.map(({ name, label }) => (
              <div key={name} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  name={name}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="—"
                  defaultValue={manualValue(metrics, name)}
                  onChange={() => setSaved(false)}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save results"}
            </Button>
            {saved ? (
              <span className="text-sm text-muted-foreground">
                Saved — KPIs updated.
              </span>
            ) : null}
            {error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Revenue and conversions entered here drive ROAS, CPA and CPM in the
            Derived KPIs above. Pulled from AppsFlyer / Firebase / your booking
            system.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
