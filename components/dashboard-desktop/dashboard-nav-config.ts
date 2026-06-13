import type { LucideIcon } from "lucide-react";
import {
  Box,
  Cloud,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  Users,
} from "lucide-react";

import { APP_STORE_MODE } from "@/lib/app-store-mode";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes: string[];
  /** Hidden from authenticated nav during the Site-Walk-only release (AGENTS.md). */
  appStoreHidden?: boolean;
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
];

/** Site Walk is the only fully visible app for the first release (AGENTS.md);
 * Twin and other modules stay hidden in authenticated nav under app-store mode. */
export const DASHBOARD_DESKTOP_NAV: DashboardNavItem[] = DASHBOARD_DESKTOP_NAV_ALL.filter(
  (item) => !(APP_STORE_MODE && item.appStoreHidden),
);

export function resolveDashboardNavActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
