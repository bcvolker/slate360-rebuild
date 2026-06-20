import type { LucideIcon } from "lucide-react";
import {
  Box,
  Clapperboard,
  Cloud,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  Thermometer,
  UserCircle,
  Users,
  Wand2,
  Wrench,
} from "lucide-react";

import { APP_STORE_MODE } from "@/lib/app-store-mode";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes: string[];
  /** Hidden from authenticated nav during the Site-Walk-only release (AGENTS.md). */
  appStoreHidden?: boolean;
  /** Only shown to Slate360 staff/CEO with Operations Console access. */
  staffOnly?: boolean;
  /** Only shown to the Slate360 CEO. */
  ceoOnly?: boolean;
};

const DASHBOARD_DESKTOP_NAV_ALL: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchPrefixes: ["/dashboard"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderOpen,
    matchPrefixes: ["/projects"],
  },
  {
    label: "Site Walks",
    href: "/site-walks",
    icon: MapPin,
    matchPrefixes: ["/site-walks"],
  },
  {
    label: "Digital Twins",
    href: "/digital-twins",
    icon: Box,
    matchPrefixes: ["/digital-twins", "/digital-twin/twins"],
    appStoreHidden: true,
  },
  {
    label: "SlateDrop",
    href: "/slatedrop",
    icon: Cloud,
    matchPrefixes: ["/slatedrop"],
  },
  {
    label: "Thermal Studio",
    href: "/thermal-studio",
    icon: Thermometer,
    matchPrefixes: ["/thermal-studio"],
    ceoOnly: true,
  },
  {
    label: "Design Studio",
    href: "/unreal-studio",
    icon: Wand2,
    matchPrefixes: ["/unreal-studio"],
    ceoOnly: true,
  },
  {
    label: "Content Studio",
    href: "/content-studio-workspace",
    icon: Clapperboard,
    matchPrefixes: ["/content-studio-workspace"],
    ceoOnly: true,
  },
  {
    label: "Operations Console",
    href: "/operations-console",
    icon: Wrench,
    matchPrefixes: ["/operations-console"],
    staffOnly: true,
  },
  {
    label: "Team",
    href: "/more/organization",
    icon: Users,
    matchPrefixes: ["/more/organization"],
  },
  {
    label: "Billing",
    href: "/more/billing",
    icon: CreditCard,
    matchPrefixes: ["/more/billing"],
  },
  {
    label: "My Account",
    href: "/my-account",
    icon: UserCircle,
    matchPrefixes: ["/my-account"],
  },
];

/** Resolve the visible nav for the current viewer. App-Store mode hides in-progress
 * modules; Operations Console is staff-only. */
export function resolveDashboardNav(showOpsConsole: boolean, isCeo = false): DashboardNavItem[] {
  return DASHBOARD_DESKTOP_NAV_ALL.filter((item) => {
    if (APP_STORE_MODE && item.appStoreHidden) return false;
    if (item.ceoOnly && !isCeo) return false;
    if (item.staffOnly && !showOpsConsole) return false;
    return true;
  });
}

/** Default nav (no staff items) for contexts without viewer access info. */
export const DASHBOARD_DESKTOP_NAV: DashboardNavItem[] = resolveDashboardNav(false);

export function resolveDashboardNavActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
