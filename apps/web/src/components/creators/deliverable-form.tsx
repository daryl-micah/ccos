"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { Deliverable, DeliverableType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const TYPES: DeliverableType[] = [
  "reel",
  "story",
  "carousel",
  "youtube_short",
  "youtube_video",
];

export function DeliverableForm({
  campaignInfluencerId,
  onCreated,
  onCancel,
}: {
  campaignInfluencerId: string;
  onCreated: (d: Deliverable) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const created = await api.deliverables.create({
        campaign_influencer_id: campaignInfluencerId,
        type: form.get("type") as DeliverableType,
        quantity: Number(form.get("quantity")) || 1,
        due_date: emptyToNull(form.get("due_date")),
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add deliverable");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select name="type" defaultValue="reel">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Quantity</Label>
          <Input name="quantity" type="number" min="1" defaultValue="1" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Due date</Label>
        <Input name="due_date" type="date" />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add deliverable"}
        </Button>
      </div>
    </form>
  );
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}
