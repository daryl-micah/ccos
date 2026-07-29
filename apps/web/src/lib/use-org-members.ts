"use client";

import * as React from "react";
import { useOrganization } from "@clerk/nextjs";

export interface OrgMember {
  userId: string;
  label: string;
}

/**
 * Team members of the active org, straight from Clerk — there's no roster of
 * our own to keep in sync. Shared so the owner filter, the campaign form and
 * the campaigns table all label the same person identically.
 */
export function useOrgMembers() {
  const { memberships } = useOrganization({ memberships: true });

  const members: OrgMember[] = React.useMemo(
    () =>
      (memberships?.data ?? []).flatMap((m) => {
        const userId = m.publicUserData?.userId;
        if (!userId) return [];
        const { firstName, lastName, identifier } = m.publicUserData ?? {};
        const name = [firstName, lastName].filter(Boolean).join(" ");
        return [{ userId, label: name || identifier || userId }];
      }),
    [memberships?.data],
  );

  const labelFor = React.useCallback(
    (userId: string | null) =>
      userId
        ? (members.find((m) => m.userId === userId)?.label ?? "Unknown")
        : "Unassigned",
    [members],
  );

  return { members, labelFor };
}
