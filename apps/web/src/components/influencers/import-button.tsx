"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ImportButton({
  onImported,
}: {
  onImported: (created: Influencer[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.reports.importInfluencers(file);
      onImported(result.created_influencers);
      setMessage(`Imported ${result.created} influencer(s).`);
    } catch (err) {
      setMessage(
        err instanceof ApiError
          ? `Import failed: ${err.message}`
          : "Import failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span className="text-xs text-muted-foreground">{message}</span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xlsm"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Upload /> {busy ? "Importing…" : "Import CSV/Excel"}
      </Button>
    </div>
  );
}
