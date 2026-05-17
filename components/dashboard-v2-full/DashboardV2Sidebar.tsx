"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { DASHBOARD_V2_NAV } from "./DashboardV2NavConfig";

interface DashboardV2SidebarProps {
  hasOperationsConsoleAccess: boolean;
}

export function DashboardV2Sidebar({ hasOperationsConsoleAccess }: DashboardV2SidebarProps) {
  const pathname = usePathname() ?? "";

  const visibleItems = DASHBOARD_V2_NAV.filter(
    (item) => !item.ownerOnly || hasOperationsConsoleAccess,
  );

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-40 border-r border-white/10 bg-[#0B0F15]"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/10">
        <Link href="/dashboard" aria-label="Slate360 home">
          <SlateLogo size="md" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 pt-4">
        {visibleItems.map((item) => {
          const isActive = item.matchPrefixes.some((prefix) =>
            pathname.startsWith(prefix),
          );
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-400/20"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100 border border-transparent",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer slot — version or org name can go here later */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <p className="text-[10px] text-zinc-600 text-center tracking-wide uppercase font-black">
          V2 Preview
        </p>
      </div>
    </aside>
  );
}
