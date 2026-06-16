"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Metric } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Common insight metrics for live posts (engagement + awareness).
const SUGGESTED = [
  "likes",
  "comments",
  "saves",
  "shares",
  "views",
  "reach",
  "impressions",
  "engagement_rate",
];

export function PostMetricForm({
  campaignInfluencerId,
  postId,
  onAdded,
}: {
  campaignInfluencerId: string;
  postId: string;
  onAdded: (m: Metric) => void;
}) {
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || value === "") return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.metrics.create({
        campaign_influencer_id: campaignInfluencerId,
        post_id: postId,
        metric_name: name.trim(),
        metric_value: value,
        source: "manual",
      });
      onAdded(created);
      setName("");
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add metric");
    } finally {
      setSaving(false);
    }
  }

  const listId = `metric-suggestions-${postId}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        list={listId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="metric (e.g. likes)"
        className="h-8 w-40"
      />
      <datalist id={listId}>
        {SUGGESTED.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        className="h-8 w-28"
      />
      <Button type="submit" size="sm" variant="outline" disabled={saving}>
        <Plus /> Add
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
