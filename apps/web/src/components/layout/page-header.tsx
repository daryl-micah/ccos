import * as React from "react";
import { OwnerFilter } from "@/components/layout/owner-filter";

export function PageHeader({
  title,
  description,
  action,
  ownerFilter = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Show the campaign-owner scope selector. Opt-in: pages whose data isn't
   *  campaign-derived (the influencer roster is org-wide) must leave it off
   *  rather than render a control that silently does nothing. */
  ownerFilter?: boolean;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Fixed-height bar so its divider aligns with the sidebar's. */}
      <div className="flex h-16 items-center justify-between gap-4 border-b px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {ownerFilter ? <OwnerFilter /> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="px-8 pt-6 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
