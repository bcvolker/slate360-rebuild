/**
 * DashboardV2NavConfig — single source of truth for V2 full-shell navigation.
 *
 * Exports:
 *   DashboardNavItem       — individual nav link
 *   DashboardNavSection    — grouped section for the sidebar
 *   DASHBOARD_V2_NAV_SECTIONS — sidebar grouped nav (Workspace / Apps / Account)
 *   DASHBOARD_V2_NAV       — flat array derived from sections, used by mobile nav
 *
 * Route status (verified May 2026):
 *   /dashboard             ✅  app/(dashboard)/dashboard/page.tsx
 *   /projects              ✅  app/(dashboard)/projects/page.tsx
 *   /coordination/inbox    ✅  app/coordination/inbox/page.tsx
 *   /site-walk             ✅  app/site-walk/page.tsx
 *   /slatedrop             ✅  app/slatedrop/page.tsx
 *   /more                  ✅  app/(dashboard)/more/page.tsx
 *   /operations-console    ✅  app/(dashboard)/operations-console/page.tsx
 *
 * Deferred (no real route yet):
 *   /deliverables          ❌  no standalone route
 *   /activity              ❌  no route
 *   /processing            ❌  no route
 *   /shared-links          ❌  no route
 *   Digital Twin           ❌  Track B only
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Cloud,
  MessageSquare,
  User,
  Shield,
  MapPin,
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

export interface DashboardNavSection {
  /** Display label shown above the section in the sidebar. */
  label: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_V2_NAV_SECTIONS: DashboardNavSection[] = [
  {
    label: "Workspace",
    items: [
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
        matchPrefixes: ["/projects"],
      },
      {
        label: "Coordination",
        href: "/coordination/inbox",
        icon: MessageSquare,
        matchPrefixes: ["/coordination"],
      },
    ],
  },
  {
    label: "Apps",
    items: [
      {
        label: "Site Walk",
        href: "/site-walk",
        icon: MapPin,
        matchPrefixes: ["/site-walk"],
      },
      {
        label: "SlateDrop",
        href: "/slatedrop",
        icon: Cloud,
        matchPrefixes: ["/slatedrop"],
      },
    ],
  },
  {
    label: "Account",
    items: [
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
    ],
  },
];

/**
 * Flat nav array — derived from sections.
 * Used by DashboardV2MobileNav (which filters ownerOnly + mobileHidden).
 */
export const DASHBOARD_V2_NAV: DashboardNavItem[] = DASHBOARD_V2_NAV_SECTIONS.flatMap(
  (s) => s.items,
);
