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
import { Home, FolderOpen, Cloud, MessagesSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  matchPrefixes: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, matchPrefixes: ["/dashboard"] },
  { label: "Projects", href: "/projects", icon: FolderOpen, matchPrefixes: ["/projects"] },
  { label: "SlateDrop", href: "/slatedrop", icon: Cloud, matchPrefixes: ["/slatedrop"] },
  { label: "Coordination", href: "/my-account?tab=notifications", icon: MessagesSquare, matchPrefixes: ["/coordination", "/my-account"] },
  { label: "Account", href: "/my-account", icon: User, matchPrefixes: ["/my-account"] },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40",
        "h-[72px] pb-safe",
        "bg-[#0B0F15]/85 backdrop-blur-xl",
        "border-t border-white/5"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex h-full items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.matchPrefixes.some((p) =>
            p === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(p)
          );

          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center h-full gap-1 transition-colors",
                  active
                    ? "text-cobalt"
                    : "text-slate-500 hover:text-slate-300"
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
