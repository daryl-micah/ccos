"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Pencil, Download, ArchiveRestore, Undo2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import { campaignStatusVariant, titleCase } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useOrgMembers } from "@/lib/use-org-members";
import { useOwnerFilter } from "@/lib/use-owner-filter";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { CampaignForm } from "@/components/campaigns/campaign-form";

/** Owner cell: an initials disc reads faster down a column than a name alone. */
function OwnerCell({ label, assigned }: { label: string; assigned: boolean }) {
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={
          assigned
            ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-semibold text-teal"
            : "size-6 shrink-0 rounded-full border border-dashed"
        }
      >
        {assigned ? initials : null}
      </span>
      <span className={assigned ? undefined : "text-muted-foreground"}>
        {label}
      </span>
    </span>
  );
}

export default function CampaignsPage() {
  const { owner } = useOwnerFilter();
  const { labelFor } = useOrgMembers();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [archived, setArchived] = React.useState<Campaign[] | null>(null);
  const [loadingArchived, setLoadingArchived] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setCampaigns(await api.campaigns.list({ owner }));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? `Could not load campaigns (${err.message}). Is the API running?`
            : "Could not load campaigns.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [owner]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign? It will be archived (soft delete).")) return;
    try {
      await api.campaigns.remove(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(
        err instanceof ApiError
          ? `Could not delete campaign: ${err.message}`
          : "Could not delete campaign. Please try again.",
      );
    }
  }

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next && archived === null) {
      setLoadingArchived(true);
      try {
        setArchived(await api.campaigns.listArchived());
      } catch {
        setArchived([]);
      } finally {
        setLoadingArchived(false);
      }
    }
  }

  async function handleRestore(id: string) {
    try {
      const restored = await api.campaigns.restore(id);
      setArchived((prev) => (prev ?? []).filter((c) => c.id !== id));
      setCampaigns((prev) => [restored, ...prev]);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? `Could not restore campaign: ${err.message}`
          : "Could not restore campaign. Please try again.",
      );
    }
  }

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/campaigns/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => row.original.brand ?? "—",
    },
    {
      accessorKey: "owner_user_id",
      header: "Owner",
      cell: ({ row }) => (
        <OwnerCell
          label={labelFor(row.original.owner_user_id)}
          assigned={Boolean(row.original.owner_user_id)}
        />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={campaignStatusVariant(row.original.status)}>
          {titleCase(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "budget",
      header: "Budget",
      cell: ({ row }) => formatCurrency(row.original.budget),
    },
    {
      accessorKey: "start_date",
      header: "Start",
      cell: ({ row }) => formatDate(row.original.start_date),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingCampaign(row.original)}
            aria-label="Edit campaign"
          >
            <Pencil className="text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original.id)}
            aria-label="Delete campaign"
          >
            <Trash2 className="text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Campaigns"
        ownerFilter
        description="Every initiative your team is running."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleArchived}>
              <ArchiveRestore /> {showArchived ? "Hide archived" : "Archived"}
            </Button>
            <a href={api.reports.exportTrackerUrl()}>
              <Button variant="outline">
                <Download /> Tracker
              </Button>
            </a>
            <Button onClick={() => setShowForm(true)}>
              <Plus /> New campaign
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
            data={campaigns}
            searchColumn="name"
            searchPlaceholder="Search campaigns…"
            emptyMessage="No campaigns yet. Create your first one."
          />
        )}

        {showArchived ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Archived campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingArchived ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !archived || archived.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing archived. Deleted campaigns show up here and can be
                  restored.
                </p>
              ) : (
                <div className="divide-y">
                  {archived.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.brand ? (
                          <span className="text-xs text-muted-foreground">
                            {c.brand}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(c.id)}
                      >
                        <Undo2 /> Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New campaign"
      >
        <CampaignForm
          onCancel={() => setShowForm(false)}
          onCreated={(c) => {
            setCampaigns((prev) => [c, ...prev]);
            setShowForm(false);
          }}
        />
      </Modal>

      <Modal
        open={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        title="Edit campaign"
      >
        {editingCampaign ? (
          <CampaignForm
            campaign={editingCampaign}
            onCancel={() => setEditingCampaign(null)}
            onUpdated={(c) => {
              setCampaigns((prev) =>
                prev.map((p) => (p.id === c.id ? c : p))
              );
              setEditingCampaign(null);
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}
