"use client";

/**
 * MobileBottomNav — fixed glassy bottom navigation for mobile (≤lg).
 *
 * V1 Foundational Release platform tabs (locked 2026-05-02):
 *   Home / Projects / SlateDrop / Coordination / Account
 *
 * Coordination is a first-class tab (was buried under More).
 * Account replaces More and is the entry point to org / billing / settings.
 * Safe-area padding so it sits above the iOS home indicator.
 *
 * Mounted in AppShell behind a lg:hidden wrapper.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Cloud, Footprints, FileText, MessageSquare, MoreHorizontal, User, Map } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefixes: string[];
}

const PLATFORM_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, matchPrefixes: ["/dashboard"] },
  { label: "Projects", href: "/projects", icon: FolderOpen, matchPrefixes: ["/projects", "/project-hub"] },
  { label: "SlateDrop", href: "/slatedrop", icon: Cloud, matchPrefixes: ["/slatedrop"] },
  { label: "Coordination", href: "/coordination/inbox", icon: MessageSquare, matchPrefixes: ["/coordination"] },
  { label: "Account", href: "/more", icon: User, matchPrefixes: ["/more", "/my-account", "/settings", "/apps", "/operations-console"] },
];

const SITE_WALK_NAV: NavItem[] = [
  { label: "Home", href: "/site-walk", icon: Home, matchPrefixes: ["/site-walk$"] },
  { label: "Walks", href: "/site-walk/walks", icon: Footprints, matchPrefixes: ["/site-walk/walks", "/site-walk/capture", "/site-walk/board"] },
  { label: "Plans", href: "/site-walk/plans", icon: Map, matchPrefixes: ["/site-walk/plans"] },
  { label: "Deliverables", href: "/site-walk/deliverables", icon: FileText, matchPrefixes: ["/site-walk/deliverables", "/site-walk/present"] },
  { label: "More", href: "/site-walk/more", icon: MoreHorizontal, matchPrefixes: ["/site-walk/more", "/site-walk/slatedrop", "/site-walk/files", "/site-walk/templates", "/site-walk/contacts"] },
];

function pickNav(pathname: string): NavItem[] {
  if (pathname.startsWith("/site-walk")) return SITE_WALK_NAV;
  return PLATFORM_NAV;
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const items = pickNav(pathname);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "rounded-t-3xl border-t border-white/10 bg-[#0B0F15]/88 shadow-lg backdrop-blur-md"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingTop: "4px" }}
    >
      <ul className="flex min-h-[70px] items-stretch justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.matchPrefixes.some((p) => {
            if (p === "/dashboard") return pathname === "/dashboard" || pathname === "/";
            if (p === "/site-walk$") return pathname === "/site-walk";
            return pathname.startsWith(p);
          });

          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full gap-1 py-2 transition-colors duration-200 rounded-lg mx-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",
                  active
                    ? "bg-header-active text-header"
                    : "text-header-muted hover:text-header hover:bg-header-hover"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={cn("transition-transform", active && "-translate-y-0.5")}
                />
                <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileBottomNav;
