"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType } from "react";
import { Cloud, FolderOpen, Home, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

export type MobilePlatformNavKey =
  | "home"
  | "projects"
  | "slatedrop"
  | "coordination"
  | "account";

export type MobileBottomNavItem<Key extends string = string> = {
  key: Key;
  label: string;
  icon: ElementType;
  href?: string;
  onSelect?: () => void;
};

/** V1 platform doctrine — Home | Projects | SlateDrop | Coordination | Account */
export const MOBILE_PLATFORM_NAV_ITEMS: MobileBottomNavItem<MobilePlatformNavKey>[] = [
  { key: "home", label: "Home", href: "/app", icon: Home },
  { key: "projects", label: "Projects", href: "/projects", icon: FolderOpen },
  { key: "slatedrop", label: "SlateDrop", href: "/slatedrop", icon: Cloud },
  {
    key: "coordination",
    label: "Coordination",
    href: "/coordination/inbox",
    icon: MessageSquare,
  },
  { key: "account", label: "Account", href: "/more", icon: User },
];

export function resolveMobilePlatformNavKey(pathname: string): MobilePlatformNavKey {
  if (pathname.startsWith("/projects") || pathname.startsWith("/project-hub")) {
    return "projects";
  }
  if (pathname.startsWith("/slatedrop")) return "slatedrop";
  if (pathname.startsWith("/coordination")) return "coordination";
  if (
    pathname.startsWith("/more") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/my-account")
  ) {
    return "account";
  }
  return "home";
}

function shouldUsePlatformDoctrine(pathname: string, ariaLabel: string): boolean {
  if (ariaLabel === "Platform") return true;
  return !pathname.startsWith("/site-walk") && !pathname.startsWith("/digital-twin");
}

type MobileBottomNavProps<Key extends string = string> = {
  items: MobileBottomNavItem<Key>[];
  activeKey: Key;
  ariaLabel?: string;
  className?: string;
};

export function MobileBottomNav<Key extends string = string>({
  items,
  activeKey,
  ariaLabel = "Primary",
  className,
}: MobileBottomNavProps<Key>) {
  const pathname = usePathname() ?? "";
  const usePlatformDoctrine = shouldUsePlatformDoctrine(pathname, ariaLabel);
  const navItems = usePlatformDoctrine ? MOBILE_PLATFORM_NAV_ITEMS : items;
  const navActiveKey = usePlatformDoctrine
    ? resolveMobilePlatformNavKey(pathname)
    : activeKey;

  return (
    <nav
      aria-label={usePlatformDoctrine ? "Platform" : ariaLabel}
      className={cn(
        "relative z-20 shrink-0 lg:hidden rounded-t-3xl border-t border-white/10 bg-[#0B0F15]/88 shadow-lg backdrop-blur-md",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingTop: "4px" }}
    >
      <ul className="flex min-h-[58px] w-full items-stretch justify-around px-2">
        {navItems.map(({ key, label, icon: Icon, href, onSelect }) => {
          const active = navActiveKey === key;
          const itemClassName = cn(
            "relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50",
            active ? mobileTokens.mobileBottomNavItemActive : mobileTokens.mobileBottomNavItemIdle,
          );
          const content = (
            <>
              {active && (
                <span
                  aria-hidden
                  className={mobileTokens.mobileBottomNavActiveIndicator}
                />
              )}
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 2}
                className={cn("transition-transform", active && "-translate-y-0.5")}
              />
              <span className={cn("truncate text-[10px] font-medium leading-none", active && "font-semibold")}>
                {label}
              </span>
            </>
          );

          return (
            <li key={key} className="min-w-0 flex-1 px-0.5">
              {href ? (
                <Link href={href} className={itemClassName} aria-current={active ? "page" : undefined}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={onSelect} className={itemClassName}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
