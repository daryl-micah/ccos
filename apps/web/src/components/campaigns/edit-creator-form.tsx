"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type {
  Agency,
  CampaignInfluencer,
  CampaignInfluencerStatus,
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

export function EditCreatorForm({
  link,
  agencies,
  onUpdated,
  onCancel,
}: {
  link: CampaignInfluencer;
  agencies: Agency[];
  onUpdated: (link: CampaignInfluencer) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const cost = String(form.get("cost")).trim();
    try {
      const updated = await api.campaignInfluencers.update(link.id, {
        agency_id: emptyToNull(form.get("agency_id")),
        cost: (() => {
          const val = cost.replace(/[^0-9.-]/g, "");
          if (val === "") return null;
          const num = parseFloat(val);
          return isNaN(num) ? null : String(num);
        })(),
        status: form.get("status") as CampaignInfluencerStatus,
        remarks: emptyToNull(form.get("remarks")),
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update creator");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Closed by</Label>
        <Select name="agency_id" defaultValue={link.agency_id ?? ""}>
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
          <Input
            name="cost"
            type="number"
            min="0"
            step="1"
            placeholder="25000"
            defaultValue={link.cost ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select name="status" defaultValue={link.status}>
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
        <Textarea
          name="remarks"
          placeholder="Negotiation notes…"
          defaultValue={link.remarks ?? ""}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}
