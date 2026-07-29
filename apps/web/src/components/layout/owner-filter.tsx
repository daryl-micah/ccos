"use client";

import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SelectMenu,
  SelectMenuContent,
  SelectMenuItem,
  SelectMenuTrigger,
  SelectMenuValue,
} from "@/components/ui/select-menu";
import { useOrgMembers } from "@/lib/use-org-members";
import { UNASSIGNED, useOwnerFilter } from "@/lib/use-owner-filter";

/** Radix reserves "" to clear a selection, so "everyone" needs its own value. */
const ALL = "all";

/** "Whose campaigns" scope selector — a view filter, not an access boundary. */
export function OwnerFilter() {
  const { owner, setOwner } = useOwnerFilter();
  const { members } = useOrgMembers();
  const active = Boolean(owner);

  return (
    <SelectMenu
      value={owner ?? ALL}
      onValueChange={(next) => setOwner(next === ALL ? undefined : next)}
    >
      <SelectMenuTrigger
        aria-label="Filter by campaign owner"
        className={cn(
          "h-8 w-auto min-w-44 text-xs",
          // A filtered view hides rows, so the control has to look switched on.
          active && "border-teal bg-teal/10 font-medium text-navy",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ListFilter
            aria-hidden
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-teal" : "text-muted-foreground",
            )}
          />
          <span className="truncate">
            <SelectMenuValue />
          </span>
        </span>
      </SelectMenuTrigger>
      <SelectMenuContent className="text-xs">
        <SelectMenuItem value={ALL}>All owners</SelectMenuItem>
        {members.map((m) => (
          <SelectMenuItem key={m.userId} value={m.userId}>
            {m.label}
          </SelectMenuItem>
        ))}
        <SelectMenuItem value={UNASSIGNED}>Unassigned</SelectMenuItem>
      </SelectMenuContent>
    </SelectMenu>
  );
}
