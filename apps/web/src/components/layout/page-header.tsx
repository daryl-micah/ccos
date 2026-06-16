import * as React from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      {/* Fixed-height bar so its divider aligns with the sidebar's. */}
      <div className="flex h-16 items-center justify-between gap-4 border-b px-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="px-8 pt-6 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
