"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filter value for campaigns with no owner (matches app/crud.py UNASSIGNED). */
export const UNASSIGNED = "unassigned";

/**
 * The app-wide "whose campaigns am I looking at" filter, stored in the URL
 * (`?owner=`) rather than React state so it survives refresh and is
 * shareable. Undefined = all owners.
 *
 * This is a view filter, not an access boundary — every member of the org can
 * see every campaign regardless of owner (PRODUCT.md 2026-07-29).
 */
export function useOwnerFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? undefined;

  const setOwner = React.useCallback(
    (next: string | undefined) => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set("owner", next);
      else params.delete("owner");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return { owner, setOwner };
}
