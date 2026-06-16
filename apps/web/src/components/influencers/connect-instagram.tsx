"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { InstagramStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Method = "session" | "password";

export function ConnectInstagramModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (status: InstagramStatus) => void;
}) {
  const [method, setMethod] = React.useState<Method>("session");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const status =
        method === "session"
          ? await api.instagram.loginWithSession(
              String(form.get("sessionid")).trim(),
            )
          : await api.instagram.login(
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
      <div className="mb-4 flex gap-1 rounded-lg border p-1">
        <MethodTab
          active={method === "session"}
          onClick={() => setMethod("session")}
        >
          Session ID
        </MethodTab>
        <MethodTab
          active={method === "password"}
          onClick={() => setMethod("password")}
        >
          Username &amp; password
        </MethodTab>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {method === "session" ? (
          <>
            <p className="text-sm text-muted-foreground">
              The reliable way (Instagram blocks password logins from tools).
              In a browser where you&apos;re logged in to Instagram:
            </p>
            <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Open DevTools → <span className="font-medium">Application</span>{" "}
                → Cookies → <code className="text-xs">instagram.com</code>
              </li>
              <li>
                Copy the value of the{" "}
                <code className="text-xs">sessionid</code> cookie
              </li>
              <li>Paste it below</li>
            </ol>
            <div className="space-y-1.5">
              <Label>sessionid cookie</Label>
              <Input
                name="sessionid"
                required
                placeholder="e.g. 5829…%3A…%3A…"
                autoComplete="off"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Often blocked by Instagram with an &quot;Unexpected null login
              result&quot; error. If it fails, use the Session ID method
              instead. Use an account without two-factor auth.
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
          </>
        )}

        <p className="text-xs text-muted-foreground">
          We store only the session — your password is never saved.
        </p>

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

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
