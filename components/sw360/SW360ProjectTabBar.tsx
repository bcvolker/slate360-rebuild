"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "walks", label: "Walks" },
  { segment: "plans", label: "Plans" },
  { segment: "docs", label: "Docs" },
  { segment: "team", label: "Team" },
  { segment: "reports", label: "Reports" },
] as const;

/**
 * In-page tab bar for a project's detail sub-tabs — locked structure per
 * SITEWALK360_LOCK_SHEET.md / panel response: Walks · Plans · Docs · Team ·
 * Reports. Distinct from the bottom-nav 5 tabs (this is scoped to one
 * project). Horizontal, no scroll needed at 5 short labels on a 6.1" phone.
 */
export function SW360ProjectTabBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/sw360/projects/${projectId}`;

  return (
    <div className="flex border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const href = `${base}/${tab.segment}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "flex-1 border-b-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide",
              active
                ? "border-[var(--sw360-green-light)] text-[var(--sw360-green-light)]"
                : "border-transparent text-[var(--sw360-charcoal)]/50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
