"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InfluencerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (influencer: Influencer) => void;
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
      instagram_username: emptyToNull(form.get("instagram_username")),
      youtube_channel: emptyToNull(form.get("youtube_channel")),
      city: emptyToNull(form.get("city")),
      country: emptyToNull(form.get("country")),
      category: emptyToNull(form.get("category")),
      language: emptyToNull(form.get("language")),
      manager_name: emptyToNull(form.get("manager_name")),
      email: emptyToNull(form.get("email")),
      phone: emptyToNull(form.get("phone")),
      notes: emptyToNull(form.get("notes")),
    };
    try {
      const created = await api.influencers.create(payload);
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create influencer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" required>
        <Input name="name" required placeholder="Anita R" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram username">
          <Input name="instagram_username" placeholder="anita.r" />
        </Field>
        <Field label="YouTube channel">
          <Input name="youtube_channel" placeholder="@AnitaVlogs or UC..." />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <Input name="city" placeholder="Bangalore" />
        </Field>
        <Field label="Country">
          <Input name="country" placeholder="India" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <Input name="category" placeholder="Lifestyle" />
        </Field>
        <Field label="Language">
          <Input name="language" placeholder="English" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Manager">
          <Input name="manager_name" placeholder="Ravi" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" placeholder="anita@example.com" />
        </Field>
        <Field label="Phone">
          <Input name="phone" placeholder="+91..." />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea name="notes" placeholder="Context about this creator..." />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create influencer"}
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
