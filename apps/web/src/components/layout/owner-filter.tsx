"use client";

import { useOrganization } from "@clerk/nextjs";
import { Select } from "@/components/ui/select";
import { UNASSIGNED, useOwnerFilter } from "@/lib/use-owner-filter";

/**
 * "Whose campaigns" scope selector. Member list comes straight from Clerk, so
 * there's no team-roster API of our own to keep in sync.
 */
export function OwnerFilter() {
  const { owner, setOwner } = useOwnerFilter();
  const { memberships } = useOrganization({ memberships: true });

  return (
    <Select
      aria-label="Filter by campaign owner"
      className="h-8 w-auto min-w-40 text-xs"
      value={owner ?? ""}
      onChange={(e) => setOwner(e.target.value || undefined)}
    >
      <option value="">All owners</option>
      {memberships?.data?.map((m) => (
        <option key={m.id} value={m.publicUserData?.userId ?? ""}>
          {m.publicUserData?.firstName || m.publicUserData?.identifier}
        </option>
      ))}
      <option value={UNASSIGNED}>Unassigned</option>
    </Select>
  );
}
