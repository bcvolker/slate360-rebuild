"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { DASHBOARD_V2_NAV_SECTIONS } from "./DashboardV2NavConfig";

interface DashboardV2SidebarProps {
  hasOperationsConsoleAccess: boolean;
}

export function DashboardV2Sidebar({ hasOperationsConsoleAccess }: DashboardV2SidebarProps) {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-40 border-r border-white/[0.07] bg-[#0B0F15]/96 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/[0.07]">
        <Link href="/dashboard" aria-label="Slate360 home">
          <SlateLogo size="md" />
        </Link>
      </div>

      {/* Sectioned navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto py-5 px-3 gap-6" aria-label="App sections">
        {DASHBOARD_V2_NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.ownerOnly || hasOperationsConsoleAccess,
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {/* Section label */}
              <p className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-700">
                {section.label}
              </p>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = item.matchPrefixes.some((p) =>
                    pathname.startsWith(p),
                  );
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-amber-500/[0.09] text-amber-300 ring-1 ring-inset ring-amber-500/20"
                          : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Icon chip */}
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-amber-500/15 text-amber-400"
                            : "text-zinc-600 group-hover:bg-white/[0.05] group-hover:text-zinc-300",
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </span>

                      <span className="flex-1 truncate">{item.label}</span>

                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — live status dot */}
      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.55)]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">
            V2 Preview
          </p>
        </div>
      </div>
    </aside>
  );
}
