"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Instagram, Plus, Trash2, Youtube } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Influencer } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { InfluencerForm } from "@/components/influencers/influencer-form";
import { ImportButton } from "@/components/influencers/import-button";

export default function InfluencersPage() {
  const [influencers, setInfluencers] = React.useState<Influencer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setInfluencers(await api.influencers.list());
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load influencers (${err.message}). Is the API running?`
            : "Could not load influencers.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this influencer? It will be archived (soft delete).")) return;
    await api.influencers.remove(id);
    setInfluencers((prev) => prev.filter((i) => i.id !== id));
  }

  const columns: ColumnDef<Influencer>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/influencers/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "handles",
      header: "Handles",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-muted-foreground">
          {row.original.instagram_username ? (
            <span className="flex items-center gap-1 text-xs">
              <Instagram className="size-3.5" />
              {row.original.instagram_username}
            </span>
          ) : null}
          {row.original.youtube_channel ? (
            <span className="flex items-center gap-1 text-xs">
              <Youtube className="size-3.5" />
              {row.original.youtube_channel}
            </span>
          ) : null}
          {!row.original.instagram_username &&
          !row.original.youtube_channel
            ? "—"
            : null}
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => row.original.city ?? "—",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category ? (
          <Badge variant="secondary">{row.original.category}</Badge>
        ) : (
          "—"
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(row.original.id)}
          aria-label="Delete influencer"
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Influencers"
        description="Your master creator database."
        action={
          <div className="flex gap-2">
            <ImportButton
              onImported={(created) =>
                setInfluencers((prev) => [...created, ...prev])
              }
            />
            <Button onClick={() => setShowForm(true)}>
              <Plus /> New influencer
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <DataTable
            columns={columns}
            data={influencers}
            searchColumn="name"
            searchPlaceholder="Search influencers…"
            emptyMessage="No influencers yet. Add your first creator."
          />
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New influencer"
      >
        <InfluencerForm
          onCancel={() => setShowForm(false)}
          onCreated={(i) => {
            setInfluencers((prev) => [i, ...prev]);
            setShowForm(false);
          }}
        />
      </Modal>
    </>
  );
}
