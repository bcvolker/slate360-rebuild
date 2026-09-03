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
import { isSpatialOnlyAppList } from "@/lib/spatial-walkthrough/nav-filter";

export function DashboardDesktopSidebar({
  showOpsConsole = false,
  isCeo = false,
  visibleApps = null,
  collapsed = false,
  onToggleCollapse,
}: {
  showOpsConsole?: boolean;
  isCeo?: boolean;
  visibleApps?: import("@/lib/spatial-walkthrough/client-surface").ClientSurfaceApp[] | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const nav = resolveDashboardNav(showOpsConsole, isCeo, visibleApps);
  const homeHref = isSpatialOnlyAppList(visibleApps, isCeo) ? "/projects" : "/dashboard";
  const spatialOnly = isSpatialOnlyAppList(visibleApps, isCeo);

  return (
    <aside
      className={cn(t.sidebarBase, spatialOnly && "hidden lg:flex", collapsed ? "w-14" : "w-52")}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-12 shrink-0 items-center border-b border-[var(--mobile-app-card-border)]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed ? (
          <Link href={homeHref} aria-label="Slate360 home">
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

      <nav className={cn("flex flex-1 flex-col gap-4 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")} aria-label="Workspace">
        {(["primary", "tools", "labs", "account"] as const).map((section) => {
          if (section === "tools" && !isCeo) return null;
          const items = nav.filter((item) => (item.section ?? "primary") === section);
          if (!items.length) return null;
          return (
            <div key={section}>
              {!collapsed && section !== "primary" ? (
                <p className="mb-1 px-2 text-[11px] text-[var(--graphite-muted)]">
                  {section === "tools" ? "Tools" : section === "labs" ? "Labs" : "Account"}
                </p>
              ) : null}
              {items.map((item) => {
                const isActive = resolveDashboardNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(t.navLink, collapsed && "justify-center px-0", isActive && t.navLinkActive)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className={cn(t.navIcon, isActive && t.navIconActive)}>
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                    {!collapsed && item.children?.length ? (
                      <div className="mb-1 ml-6 flex flex-col gap-0.5">
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href} className={cn(t.navLink, "min-h-9 py-1 text-[12px]")}>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
