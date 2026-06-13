"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  collapsed = false,
  onToggleCollapse,
}: {
  showOpsConsole?: boolean;
  isCeo?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const nav = resolveDashboardNav(showOpsConsole, isCeo);

  return (
    <aside
      className={cn(t.sidebarBase, collapsed ? "w-14" : "w-52")}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed ? (
          <Link href="/dashboard" aria-label="Slate360 dashboard home">
            <SlateLogo size="sm" className="text-[var(--graphite-primary)]" />
          </Link>
        ) : null}
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] hover:text-[var(--graphite-text-header)]"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")} aria-label="Workspace">
        {nav.map((item) => {
          const isActive = resolveDashboardNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                t.navLink,
                collapsed && "justify-center px-0",
                isActive && t.navLinkActive,
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn(t.navIcon, isActive && t.navIconActive)}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
