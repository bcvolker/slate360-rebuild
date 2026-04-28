"use client";

/**
 * MobileBottomNav — fixed glassy bottom navigation for mobile (≤lg).
 *
 * Five tabs: Home / Projects / SlateDrop / Coordination / Account.
 * Cobalt active indicator (matches new color palette — no amber/gold).
 * Safe-area padding so it sits above the iOS home indicator.
 *
 * Mounted in AppShell behind a lg:hidden wrapper.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Cloud, Footprints, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefixes: string[];
}

const PLATFORM_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, matchPrefixes: ["/dashboard"] },
  { label: "Projects", href: "/projects", icon: FolderOpen, matchPrefixes: ["/projects"] },
  { label: "SlateDrop", href: "/slatedrop", icon: Cloud, matchPrefixes: ["/slatedrop"] },
  { label: "More", href: "/more", icon: MoreHorizontal, matchPrefixes: ["/more", "/my-work", "/coordination", "/my-account", "/settings", "/apps"] },
];

const SITE_WALK_NAV: NavItem[] = [
  { label: "Home", href: "/site-walk", icon: Home, matchPrefixes: ["/site-walk$"] },
  { label: "Capture", href: "/site-walk/capture", icon: Footprints, matchPrefixes: ["/site-walk/capture", "/site-walk/walks", "/site-walk/board"] },
  { label: "Files", href: "/slatedrop", icon: Cloud, matchPrefixes: ["/slatedrop", "/site-walk/files"] },
  { label: "Outputs", href: "/site-walk/deliverables", icon: FileText, matchPrefixes: ["/site-walk/deliverables", "/site-walk/present"] },
  { label: "More", href: "/site-walk/more", icon: MoreHorizontal, matchPrefixes: ["/site-walk/more", "/site-walk/plans", "/site-walk/templates", "/site-walk/contacts"] },
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
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-header-glass",
        "border-t border-header"
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
                  "relative flex flex-col items-center justify-center h-full gap-1 py-2 transition-colors duration-200 rounded-lg mx-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg",
                  active
                    ? "bg-header-active text-header"
                    : "text-header-muted hover:text-header hover:bg-header-hover"
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-cobalt shadow-[0_2px_10px_rgba(59,130,246,0.45)]"
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
