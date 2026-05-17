"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_V2_NAV } from "./DashboardV2NavConfig";

/** 5 main tabs for mobile — excludes ownerOnly items. */
const MOBILE_TABS = DASHBOARD_V2_NAV.filter((item) => !item.mobileHidden);

export function DashboardV2MobileNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/10 bg-[#0B0F15]/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      {MOBILE_TABS.map((item) => {
        const isActive = item.matchPrefixes.some((prefix) =>
          pathname.startsWith(prefix),
        );
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[56px]",
              "text-[10px] font-semibold tracking-wide transition-colors",
              isActive
                ? "text-amber-400"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                isActive && "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]",
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
