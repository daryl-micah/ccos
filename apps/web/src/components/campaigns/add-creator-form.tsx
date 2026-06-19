"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type {
  Agency,
  CampaignInfluencer,
  CampaignInfluencerStatus,
  Influencer,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUSES: CampaignInfluencerStatus[] = [
  "planned",
  "negotiating",
  "confirmed",
  "posted",
  "completed",
];

export function AddCreatorForm({
  campaignId,
  influencers,
  agencies,
  onAdded,
  onCancel,
}: {
  campaignId: string;
  influencers: Influencer[];
  agencies: Agency[];
  onAdded: (link: CampaignInfluencer) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const influencerId = String(form.get("influencer_id"));
    if (!influencerId) {
      setError("Pick an influencer.");
      setSaving(false);
      return;
    }
    const cost = String(form.get("cost")).trim();
    try {
      const created = await api.campaignInfluencers.create({
        campaign_id: campaignId,
        influencer_id: influencerId,
        agency_id: emptyToNull(form.get("agency_id")),
        cost: cost === "" ? null : cost,
        status: form.get("status") as CampaignInfluencerStatus,
        remarks: emptyToNull(form.get("remarks")),
      });
      onAdded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add creator");
    } finally {
      setSaving(false);
    }
  }

  if (influencers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No influencers in your database yet. Add one from the Influencers page
        first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>
          Influencer<span className="text-destructive"> *</span>
        </Label>
        <Select name="influencer_id" defaultValue="">
          <option value="" disabled>
            Select a creator…
          </option>
          {influencers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {i.city ? ` · ${i.city}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Closed by</Label>
        <Select name="agency_id" defaultValue="">
          <option value="">In-house (brand team)</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cost (₹)</Label>
          <Input name="cost" type="number" min="0" step="1" placeholder="25000" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select name="status" defaultValue="planned">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Remarks</Label>
        <Textarea name="remarks" placeholder="Negotiation notes…" />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add creator"}
        </Button>
      </div>
    </form>
  );
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}
