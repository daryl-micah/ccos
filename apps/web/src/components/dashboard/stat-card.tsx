"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENT = {
  teal: "bg-teal/10 text-teal",
  amber: "bg-amber/10 text-amber",
  navy: "bg-navy/10 text-navy",
  orange: "bg-orange/10 text-orange",
} as const;

/** Eases a numeric value from 0 to `value` over ~700ms; skipped for reduced motion. */
function useCountUp(value: number, durationMs = 700) {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const effectiveDuration = reduced ? 1 : durationMs;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / effectiveDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
}

export function StatCard({
  label,
  value,
  format,
  hint,
  icon,
  accent = "teal",
}: {
  label: string;
  /** A number animates via count-up; a string (e.g. "—") renders as-is. */
  value: number | string;
  format?: (n: number) => string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: keyof typeof ACCENT;
}) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  const display =
    typeof value === "number"
      ? (format ?? Math.round)(animated)
      : value;

  return (
    <Card interactive className="p-5">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon ? (
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                ACCENT[accent],
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">
          {display}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
