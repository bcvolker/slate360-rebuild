/**
 * DashboardV2NavConfig — single source of truth for V2 full-shell navigation.
 *
 * Used by both DashboardV2Sidebar (desktop) and DashboardV2MobileNav (mobile).
 * Pure TypeScript — no React/JSX.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Cloud,
  MessageSquare,
  User,
  Shield,
} from "lucide-react";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that activate this item's active state. */
  matchPrefixes: string[];
  /** Visible only when hasOperationsConsoleAccess === true. */
  ownerOnly?: boolean;
  /** Excluded from mobile bottom nav (too many items, or owner-only). */
  mobileHidden?: boolean;
}

/**
 * V2 platform nav items.
 *
 * Production swap note: when /preview/dashboard-v2-full becomes production
 * /dashboard, update the Dashboard href and matchPrefixes accordingly.
 * Currently points to production /dashboard so the active state works on the
 * preview route until the swap.
 */
export const DASHBOARD_V2_NAV: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchPrefixes: ["/dashboard", "/preview/dashboard-v2"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderOpen,
    matchPrefixes: ["/projects", "/project-hub"],
  },
  {
    label: "SlateDrop",
    href: "/slatedrop",
    icon: Cloud,
    matchPrefixes: ["/slatedrop"],
  },
  {
    label: "Coordination",
    href: "/coordination/inbox",
    icon: MessageSquare,
    matchPrefixes: ["/coordination"],
  },
  {
    label: "Account",
    href: "/more",
    icon: User,
    matchPrefixes: ["/more", "/my-account", "/settings"],
  },
  {
    label: "Operations Console",
    href: "/operations-console",
    icon: Shield,
    matchPrefixes: ["/operations-console"],
    ownerOnly: true,
    mobileHidden: true,
  },
];
