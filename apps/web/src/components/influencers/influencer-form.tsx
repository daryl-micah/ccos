"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseProfileLink } from "@/lib/profile-link";

export function InfluencerForm({
  influencer,
  onCreated,
  onUpdated,
  onCancel,
}: {
  influencer?: Influencer;
  onCreated?: (influencer: Influencer) => void;
  onUpdated?: (influencer: Influencer) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isEditing = !!influencer;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    let instagramUsername = emptyToNull(form.get("instagram_username"));
    let youtubeChannel = emptyToNull(form.get("youtube_channel"));
    const profileLink = emptyToNull(form.get("profile_link"));
    if (profileLink) {
      const parsed = parseProfileLink(profileLink);
      if (!parsed) {
        setError("Profile link must be an Instagram or YouTube profile URL.");
        setSaving(false);
        return;
      }
      if (parsed.field === "instagram_username") {
        instagramUsername ??= parsed.handle;
      } else {
        youtubeChannel ??= parsed.handle;
      }
    }
    const payload = {
      name: String(form.get("name")).trim(),
      instagram_username: instagramUsername,
      youtube_channel: youtubeChannel,
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
      if (isEditing && influencer) {
        const updated = await api.influencers.update(influencer.id, payload);
        onUpdated?.(updated);
      } else {
        const created = await api.influencers.create(payload);
        onCreated?.(created);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save influencer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" required>
        <Input
          name="name"
          required
          placeholder="Anita R"
          defaultValue={influencer?.name ?? ""}
        />
      </Field>
      <Field label="Profile link">
        <Input
          name="profile_link"
          placeholder="https://instagram.com/anita.r or https://youtube.com/@AnitaVlogs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram username">
          <Input
            name="instagram_username"
            placeholder="anita.r"
            defaultValue={influencer?.instagram_username ?? ""}
          />
        </Field>
        <Field label="YouTube channel">
          <Input
            name="youtube_channel"
            placeholder="@AnitaVlogs or UC..."
            defaultValue={influencer?.youtube_channel ?? ""}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <Input
            name="city"
            placeholder="Bangalore"
            defaultValue={influencer?.city ?? ""}
          />
        </Field>
        <Field label="Country">
          <Input
            name="country"
            placeholder="India"
            defaultValue={influencer?.country ?? ""}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <Input
            name="category"
            placeholder="Lifestyle"
            defaultValue={influencer?.category ?? ""}
          />
        </Field>
        <Field label="Language">
          <Input
            name="language"
            placeholder="English"
            defaultValue={influencer?.language ?? ""}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Manager">
          <Input
            name="manager_name"
            placeholder="Ravi"
            defaultValue={influencer?.manager_name ?? ""}
          />
        </Field>
        <Field label="Email">
          <Input
            name="email"
            type="email"
            placeholder="anita@example.com"
            defaultValue={influencer?.email ?? ""}
          />
        </Field>
        <Field label="Phone">
          <Input
            name="phone"
            placeholder="+91..."
            defaultValue={influencer?.phone ?? ""}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          name="notes"
          placeholder="Context about this creator..."
          defaultValue={influencer?.notes ?? ""}
        />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? "Saving…"
            : isEditing
              ? "Update influencer"
              : "Create influencer"}
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
