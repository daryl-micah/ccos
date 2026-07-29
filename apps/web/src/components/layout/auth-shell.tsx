import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, focusRing } from "@/lib/utils";

/**
 * Frame for the pages someone sees before they have a workspace (/apply,
 * /pending). They arrive straight off the landing page, so they carry its
 * wordmark and teal glow rather than dropping onto a bare white screen.
 */
export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-teal/10 blur-3xl"
      />
      <div
        className={cn(
          "relative w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500",
          className,
        )}
      >
        <Link
          href="/"
          aria-label="CCOS home"
          className={cn("mx-auto mb-8 block w-fit rounded-md", focusRing)}
        >
          <Image
            src="/logo-wordmark.png"
            alt="CCOS"
            width={590}
            height={188}
            priority
            className="h-8 w-auto"
          />
        </Link>
        {children}
      </div>
    </div>
  );
}
