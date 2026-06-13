"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { cn } from "@/lib/utils";
import {
  resolveDashboardNav,
  resolveDashboardNavActive,
} from "./dashboard-nav-config";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

export function DashboardDesktopSidebar({
  showOpsConsole = false,
  isCeo = false,
}: {
  showOpsConsole?: boolean;
  isCeo?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const nav = resolveDashboardNav(showOpsConsole, isCeo);

  return (
    <aside className={t.sidebar} aria-label="Main navigation">
      <div className="flex h-14 shrink-0 items-center border-b border-[var(--mobile-app-card-border)] px-5">
        <Link href="/dashboard" aria-label="Slate360 dashboard home">
          <SlateLogo size="md" className="text-[var(--graphite-primary)]" />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Workspace">
        <p className={t.sidebarNavLabel}>Workspace</p>
        {nav.map((item) => {
          const isActive = resolveDashboardNavActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(t.navLink, isActive && t.navLinkActive)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn(t.navIcon, isActive && t.navIconActive)}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
