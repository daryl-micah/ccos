import type { BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const CAMPAIGN_STATUS: Record<string, Variant> = {
  draft: "muted",
  active: "success",
  completed: "secondary",
};

const CI_STATUS: Record<string, Variant> = {
  planned: "muted",
  negotiating: "warning",
  confirmed: "default",
  posted: "secondary",
  completed: "success",
};

export function campaignStatusVariant(status: string): Variant {
  return CAMPAIGN_STATUS[status] ?? "outline";
}

export function ciStatusVariant(status: string): Variant {
  return CI_STATUS[status] ?? "outline";
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
