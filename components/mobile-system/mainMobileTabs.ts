import type { ElementType } from "react";
import { Cloud, FolderOpen, Home, MessageSquare, User } from "lucide-react";

export type MainMobileTabKey =
  | "home"
  | "projects"
  | "slatedrop"
  | "coordination"
  | "account";

export type MainMobileTab<Key extends string = string> = {
  key: Key;
  label: string;
  icon: ElementType;
  href?: string;
  onSelect?: () => void;
};

/** Unified platform bottom nav — Home | Projects | SlateDrop | Coordination | Account */
export const mainMobileTabs: MainMobileTab<MainMobileTabKey>[] = [
  { key: "home", label: "Home", href: "/app", icon: Home },
  { key: "projects", label: "Projects", href: "/projects", icon: FolderOpen },
  { key: "slatedrop", label: "SlateDrop", href: "/slatedrop", icon: Cloud },
  {
    key: "coordination",
    label: "Coordination",
    href: "/coordination",
    icon: MessageSquare,
  },
  { key: "account", label: "Account", href: "/more/account", icon: User },
];

/** Routes that use the clean (mobile) platform shell and bottom nav. */
export const MAIN_MOBILE_TAB_ROUTE_PREFIXES = [
  "/app",
  "/site-walk",
  "/digital-twin",
  "/projects",
  "/project-hub",
  "/slatedrop",
  "/coordination",
  "/more",
  "/settings",
  "/my-account",
] as const;

export function isMainMobileTabRoute(pathname: string): boolean {
  return MAIN_MOBILE_TAB_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveMainMobileTabKey(pathname: string): MainMobileTabKey {
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

export type MainMobileHeaderMeta = {
  title?: string;
  subtitle?: string;
  showBackToApp?: boolean;
};

export function resolveMainMobileHeaderMeta(pathname: string): MainMobileHeaderMeta {
  if (pathname === "/site-walk" || pathname === "/digital-twin") {
    return { showBackToApp: true };
  }
  return {};
}
