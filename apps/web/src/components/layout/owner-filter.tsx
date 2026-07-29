"use client";

import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Select
      value={owner ?? ALL}
      onValueChange={(next) => setOwner(next === ALL ? undefined : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label="Filter by campaign owner"
        className={cn(
          "min-w-44",
          // A filtered view hides rows, so the control has to look switched on.
          active && "border-teal bg-teal/10 font-medium text-navy",
        )}
      >
        {/* Grouped, or the trigger's justify-between pushes the icon and the
            label to opposite ends. */}
        <span className="flex min-w-0 items-center gap-2">
          <ListFilter
            aria-hidden
            className={cn(
              "size-3.5",
              active ? "text-teal" : "text-muted-foreground",
            )}
          />
          <SelectValue />
        </span>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={ALL}>All owners</SelectItem>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Team</SelectLabel>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
      </SelectContent>
    </Select>
  );
}
