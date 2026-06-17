"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { Campaign, CampaignStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUSES: CampaignStatus[] = ["draft", "active", "completed"];

export function CampaignForm({
  onCreated,
  onCancel,
}: {
  onCreated: (campaign: Campaign) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")).trim(),
      brand: emptyToNull(form.get("brand")),
      objective: emptyToNull(form.get("objective")),
      budget: computeBudget(form.get("budget_amount"), form.get("budget_unit")),
      status: form.get("status") as CampaignStatus,
      start_date: emptyToNull(form.get("start_date")),
      end_date: emptyToNull(form.get("end_date")),
      notes: emptyToNull(form.get("notes")),
    };
    try {
      const created = await api.campaigns.create(payload);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" required>
        <Input name="name" required placeholder="Bangalore Launch" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Brand">
          <Input name="brand" placeholder="Pronto" />
        </Field>
        <Field label="Budget (₹)">
          <div className="flex gap-2">
            <Input
              name="budget_amount"
              type="number"
              min="0"
              step="any"
              placeholder="45.29"
              className="flex-1"
            />
            <Select
              name="budget_unit"
              defaultValue="1"
              aria-label="Budget unit"
              className="w-20"
            >
              <option value="1">₹</option>
              <option value="1000">K</option>
              <option value="100000">L</option>
              <option value="10000000">Cr</option>
            </Select>
          </div>
        </Field>
      </div>
      <Field label="Objective">
        <Input name="objective" placeholder="Drive app installs in Bangalore" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Status">
          <Select name="status" defaultValue="draft">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input name="start_date" type="date" />
        </Field>
        <Field label="End date">
          <Input name="end_date" type="date" />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea name="notes" placeholder="Campaign learnings…" />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}

// Multiply the entered amount by the selected unit (₹ / K / L / Cr).
function computeBudget(
  amount: FormDataEntryValue | null,
  unit: FormDataEntryValue | null,
): string | null {
  const a = amount ? String(amount).trim() : "";
  if (a === "") return null;
  const n = Number(a);
  if (Number.isNaN(n)) return null;
  const mult = Number(unit) || 1;
  return String(Math.round(n * mult * 100) / 100);
}
