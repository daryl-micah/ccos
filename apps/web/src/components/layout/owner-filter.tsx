"use client";

import { Select } from "@/components/ui/select";
import { useOrgMembers } from "@/lib/use-org-members";
import { UNASSIGNED, useOwnerFilter } from "@/lib/use-owner-filter";

/** "Whose campaigns" scope selector — a view filter, not an access boundary. */
export function OwnerFilter() {
  const { owner, setOwner } = useOwnerFilter();
  const { members } = useOrgMembers();

  return (
    <Select
      aria-label="Filter by campaign owner"
      className="h-8 w-auto min-w-40 text-xs"
      value={owner ?? ""}
      onChange={(e) => setOwner(e.target.value || undefined)}
    >
      <option value="">All owners</option>
      {members.map((m) => (
        <option key={m.userId} value={m.userId}>
          {m.label}
        </option>
      ))}
      <option value={UNASSIGNED}>Unassigned</option>
    </Select>
  );
}
