import type { AppIcon } from "@/lib/types/app-icon";
import { AppWindow, Camera, Cloud, FolderOpen, Home, MessageSquare, User } from "lucide-react";

export type MainMobileTabKey =
  | "home"
  | "projects"
  | "slatedrop"
  | "coordination"
  | "account";

export type MainMobileTab<Key extends string = string> = {
  key: Key;
  label: string;
  icon: AppIcon;
  href?: string;
  onSelect?: () => void;
};

/** Unified platform bottom nav — Home · Projects · SlateDrop · Activity · Account */
export const mainMobileTabs: MainMobileTab<MainMobileTabKey>[] = [
  { key: "home", label: "Home", href: "/app", icon: Home },
  { key: "projects", label: "Projects", href: "/projects", icon: FolderOpen },
  { key: "slatedrop", label: "SlateDrop", href: "/slatedrop", icon: Cloud },
  {
    key: "coordination",
    label: "Activity",
    href: "/coordination/inbox",
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
  "/slatedrop",
  "/coordination",
  "/more",
  "/settings",
  "/my-account",
] as const;

export type ModuleHomeBrand = {
  name: string;
  icon: AppIcon;
  accent: "primary" | "info";
};

const MODULE_HOME_BRANDS: Record<string, ModuleHomeBrand> = {
  "/site-walk": { name: "Site Walk", icon: Camera, accent: "primary" },
  "/digital-twin": { name: "Twin 360", icon: AppWindow, accent: "info" },
};

export function resolveModuleHomeBrand(pathname: string): ModuleHomeBrand | null {
  return MODULE_HOME_BRANDS[pathname] ?? null;
}

export function isMainMobileTabRoute(pathname: string): boolean {
  return MAIN_MOBILE_TAB_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveMainMobileTabKey(pathname: string): MainMobileTabKey | null {
  if (pathname.startsWith("/projects")) {
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
  // Home is ONLY /app. Inside Site Walk / Twin 360 no tab is active — lighting
  // "Home" up in the app's accent while you're in an app claimed you were
  // somewhere you weren't (the bottom-nav inconsistency).
  if (pathname === "/app" || pathname.startsWith("/app/")) return "home";
  return null;
}

export type MainMobileHeaderMeta = {
  title?: string;
  subtitle?: string;
  moduleHomeBrand?: ModuleHomeBrand | null;
};

export function resolveMainMobileHeaderMeta(pathname: string): MainMobileHeaderMeta {
  const moduleHomeBrand = resolveModuleHomeBrand(pathname);
  if (moduleHomeBrand) return { moduleHomeBrand };
  return {};
}

export type MobileShellRoute = "app" | "site-walk" | "digital-twin";

export function resolveMobileRoute(pathname: string): MobileShellRoute {
  if (pathname.startsWith("/site-walk")) return "site-walk";
  if (pathname.startsWith("/digital-twin")) return "digital-twin";
  return "app";
}
