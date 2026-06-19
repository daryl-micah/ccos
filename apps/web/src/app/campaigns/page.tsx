"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Pencil, Download } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import { campaignStatusVariant, titleCase } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setCampaigns(await api.campaigns.list());
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
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign? It will be archived (soft delete).")) return;
    await api.campaigns.remove(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
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
        description="Every initiative your team is running."
        action={
          <div className="flex gap-2">
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
