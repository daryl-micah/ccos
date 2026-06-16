"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { InstagramStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

export function ConnectInstagramModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (status: InstagramStatus) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const status = await api.instagram.login(
        String(form.get("username")).trim(),
        String(form.get("password")),
      );
      onConnected(status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect Instagram">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Instagram requires a login to collect profile data. We store only the
          session — your password is never saved. Use an account without
          two-factor auth.
        </p>
        <div className="space-y-1.5">
          <Label>Instagram username</Label>
          <Input name="username" required autoComplete="username" />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
