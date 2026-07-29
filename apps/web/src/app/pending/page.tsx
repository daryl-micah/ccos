"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <AuthShell>
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber/15 px-3 py-1 text-xs font-medium text-navy">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-amber" />
            </span>
            In review
          </span>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              Your application is in review
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We onboard private-beta teams by hand, so it may take a bit —
              we&apos;ll email you once your workspace is ready. Check back here
              and refresh once you&apos;ve heard from us.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw />
              Refresh status
            </Button>
            <UserButton />
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
