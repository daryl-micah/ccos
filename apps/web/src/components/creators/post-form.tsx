"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { Deliverable, Platform, Post } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const PLATFORMS: Platform[] = ["instagram", "youtube", "other"];

export function PostForm({
  campaignInfluencerId,
  deliverables,
  onCreated,
  onCancel,
}: {
  campaignInfluencerId: string;
  deliverables: Deliverable[];
  onCreated: (p: Post) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const url = String(form.get("url")).trim();
    if (!url) {
      setError("Paste the live post link.");
      setSaving(false);
      return;
    }
    const deliverableId = String(form.get("deliverable_id"));
    try {
      const created = await api.posts.create({
        campaign_influencer_id: campaignInfluencerId,
        deliverable_id: deliverableId === "" ? null : deliverableId,
        url,
        platform: form.get("platform") as Platform,
        // posted_at is extracted from Instagram on sync.
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>
          Live post link<span className="text-destructive"> *</span>
        </Label>
        <Input
          name="url"
          required
          placeholder="https://instagram.com/reel/…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Platform</Label>
        <Select name="platform" defaultValue="instagram">
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          For Instagram, the post date and metrics are fetched automatically.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Linked deliverable (optional)</Label>
        <Select name="deliverable_id" defaultValue="">
          <option value="">— none —</option>
          {deliverables.map((d) => (
            <option key={d.id} value={d.id}>
              {d.type.replace("_", " ")} ×{d.quantity}
            </option>
          ))}
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add live post"}
        </Button>
      </div>
    </form>
  );
}
