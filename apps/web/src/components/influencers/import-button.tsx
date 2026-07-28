"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

type Mode = "file" | "links";

export function ImportButton({
  onImported,
}: {
  onImported: (created: Influencer[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("file");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [links, setLinks] = React.useState("");

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

  async function handleLinksSubmit() {
    if (!links.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.reports.importInfluencerLinks(links);
      onImported(result.created_influencers);
      setLinks("");
      setMessage(
        result.skipped.length
          ? `Imported ${result.created} influencer(s). Skipped ${result.skipped.length} line(s) we couldn't recognize: ${result.skipped.join(", ")}`
          : `Imported ${result.created} influencer(s).`,
      );
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
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload /> Import
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import influencers"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "file" ? "default" : "outline"}
              onClick={() => setMode("file")}
            >
              Upload CSV/Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "links" ? "default" : "outline"}
              onClick={() => setMode("links")}
            >
              Paste links
            </Button>
          </div>

          {mode === "file" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a .csv or .xlsx file. Recognized columns: name,
                instagram (or instagram link), youtube, city, country,
                category, language, manager, email, phone, notes. A generic
                &quot;link&quot; column with an Instagram or YouTube profile
                URL is also recognized and mapped automatically.
              </p>
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
                <Upload /> {busy ? "Importing…" : "Choose file"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste Instagram or YouTube profile links, one per line (or
                comma-separated) — handy for lists shared over WhatsApp or
                email. We&apos;ll create a bare influencer record per link
                using the handle as the name; fill in the rest of the
                details afterward.
              </p>
              <Textarea
                rows={6}
                placeholder={
                  "https://instagram.com/anita.r\nhttps://youtube.com/@AnitaVlogs"
                }
                value={links}
                onChange={(e) => setLinks(e.target.value)}
              />
              <Button
                onClick={handleLinksSubmit}
                disabled={busy || !links.trim()}
              >
                {busy ? "Importing…" : "Import links"}
              </Button>
            </div>
          )}

          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
