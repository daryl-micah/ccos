"use client";

import * as React from "react";
import { api, ApiError, type RosterImportResult } from "@/lib/api";
import type { Agency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

const NEW = "__new__";

export function RosterImportModal({
  campaignId,
  open,
  onClose,
  onImported,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [choice, setChoice] = React.useState<string>(""); // "" = in-house
  const [newAgency, setNewAgency] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RosterImportResult | null>(null);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setAgencies(await api.agencies.list());
      } catch {
        setAgencies([]);
      }
    })();
  }, [open]);

  function close() {
    setResult(null);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Choose a CSV or Excel file to import.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let agencyId: string | null = choice === NEW || choice === "" ? null : choice;
      if (choice === NEW) {
        if (!newAgency.trim()) {
          setError("Enter the new agency name.");
          setBusy(false);
          return;
        }
        const created = await api.agencies.create({ name: newAgency.trim() });
        agencyId = created.id;
      }
      const res = await api.campaigns.importRoster(campaignId, file, agencyId);
      setResult(res);
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import agency roster">
      {result ? (
        <div className="space-y-4">
          <p className="text-sm">
            Imported: <span className="font-medium">{result.linked}</span> added
            to this campaign
            {result.created > 0 ? (
              <>
                {" "}
                ({result.created} new creator
                {result.created === 1 ? "" : "s"} created)
              </>
            ) : null}
            {result.skipped > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                · {result.skipped} already on the campaign
              </span>
            ) : null}
            .
          </p>
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an agency&apos;s creator list (columns: name, contact,
            handle). Creators are matched by handle/name, created if new, and
            added to this campaign under the selected agency.
          </p>

          <div className="space-y-1.5">
            <Label>Closed by</Label>
            <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">In-house (brand team)</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value={NEW}>+ New agency…</option>
            </Select>
          </div>

          {choice === NEW ? (
            <div className="space-y-1.5">
              <Label>New agency name</Label>
              <Input
                value={newAgency}
                onChange={(e) => setNewAgency(e.target.value)}
                placeholder="e.g. Barcode"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Roster file (.csv or .xlsx)</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Importing…" : "Import roster"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
