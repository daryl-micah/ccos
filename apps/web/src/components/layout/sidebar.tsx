"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, LayoutDashboard, Megaphone, Users } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn, focusRing } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/influencers", label: "Influencers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-gradient-to-b from-muted to-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" aria-label="CCOS home" className={cn("rounded-md", focusRing)}>
          <Image
            src="/logo-wordmark.png"
            alt="CCOS"
            width={590}
            height={188}
            priority
            className="h-7 w-auto"
          />
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]",
                active
                  ? "text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                focusRing,
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-secondary"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-3 border-t p-4">
        <UserButton showName />
      </div>
    </aside>
  );
}
