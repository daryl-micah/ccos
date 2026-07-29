"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    // No application on file (direct nav, or submitted from a different
    // browser) means there's nothing to wait on — send them to apply instead.
    api.applications
      .getMine()
      .catch(() => router.replace("/apply"))
      .finally(() => setChecked(true));
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Your application is in review
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          We onboard private-beta teams by hand, so it may take a bit —
          we&apos;ll email you once your workspace is ready. Check back here
          and refresh once you&apos;ve heard from us.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => window.location.reload()}>
          Refresh status
        </Button>
        <UserButton />
      </div>
    </div>
  );
}
