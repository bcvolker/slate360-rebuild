"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string };

const BASE_TABS: Tab[] = [
  { href: "/site-walk", label: "My Dashboard" },
  { href: "/site-walk/walks", label: "Active Walks" },
  { href: "/site-walk/assigned-work", label: "Assigned Work" },
];

const WEB_TABS: Tab[] = [
  { href: "/site-walk", label: "My Dashboard" },
  { href: "/site-walk/deliverables", label: "Deliverables" },
  { href: "/site-walk/walks", label: "Active Walks" },
  { href: "/site-walk/plans", label: "Plan Room" },
  { href: "/site-walk/setup", label: "Setup & Branding" },
];

const TABS: Tab[] =
  process.env.NEXT_PUBLIC_APP_STORE_MODE === "true" ? BASE_TABS : WEB_TABS;

/**
 * Sticky top-tab segmented control for the Site Walk module.
 * Per redesign spec: module nav lives at TOP, NEVER as a second bottom bar.
 * Horizontally scrollable on small screens (no horizontal page scroll though).
 */
export function SiteWalkSegmentedNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Site Walk sections"
      className="sticky top-12 z-30 border-b border-app bg-app-page/80 backdrop-blur-xl"
    >
      <div className="overflow-x-auto no-scrollbar">
        <ul className="flex min-w-max items-center gap-1 px-2 py-1.5">
          {TABS.map((tab) => {
            const active =
              tab.href === "/site-walk"
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-cobalt text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
