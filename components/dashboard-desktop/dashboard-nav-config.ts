import type { LucideIcon } from "lucide-react";
import {
  Box,
  Boxes,
  Clapperboard,
  Cloud,
  CreditCard,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  Orbit,
  Scan,
  Thermometer,
  UserCircle,
  Users,
  Wand2,
  Wrench,
} from "lucide-react";

import { APP_STORE_MODE } from "@/lib/app-store-mode";
import type { ClientSurfaceApp } from "@/lib/spatial-walkthrough/client-surface";
import { isNavAppVisible, isSpatialOnlyAppList } from "@/lib/spatial-walkthrough/nav-filter";

export type DashboardNavSection = "primary" | "tools" | "labs" | "account";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes: string[];
  section?: DashboardNavSection;
  /** Hidden from authenticated nav during the Site-Walk-only release (AGENTS.md). */
  appStoreHidden?: boolean;
  /** Only shown to Slate360 staff/CEO with Operations Console access. */
  staffOnly?: boolean;
  /** Only shown to the Slate360 CEO. */
  ceoOnly?: boolean;
  /** Hide unless this client-surface app is visible (CEO still sees authoring apps). */
  requiresApp?: ClientSurfaceApp;
  hideWhenSpatialOnly?: boolean;
};

const DASHBOARD_DESKTOP_NAV_ALL: DashboardNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchPrefixes: ["/dashboard"],
    section: "primary",
    hideWhenSpatialOnly: true,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderOpen,
    matchPrefixes: ["/projects"],
    section: "primary",
  },
  {
    label: "Library",
    href: "/spatial-walkthrough",
    icon: Scan,
    matchPrefixes: ["/spatial-walkthrough"],
    section: "primary",
    requiresApp: "spatial-walkthrough",
  },
  {
    label: "Site Walk",
    href: "/site-walks",
    icon: MapPin,
    matchPrefixes: ["/site-walks"],
    section: "tools",
    requiresApp: "site-walk",
  },
  {
    label: "Twin",
    href: "/digital-twins",
    icon: Box,
    matchPrefixes: ["/digital-twins", "/digital-twin/twins"],
    section: "tools",
    appStoreHidden: true,
    requiresApp: "twin360",
  },
  {
    // F1 (TWIN_SERVICE_STUDIO_PLAN.md Phase F): the operator production cockpit —
    // distinct from the "Twin 360" row above, which is the client-facing app's own
    // twin list. ceoOnly here matches Thermal Studio's precedent (coarse nav gate);
    // the route itself does the real canAccessTwinDesktop entitlement check.
    label: "Twin Studio",
    href: "/twin-studio",
    icon: Boxes,
    matchPrefixes: ["/twin-studio"],
    section: "labs",
    ceoOnly: true,
  },
  {
    label: "SlateDrop",
    href: "/slatedrop",
    icon: Cloud,
    matchPrefixes: ["/slatedrop"],
    section: "tools",
    requiresApp: "slatedrop",
  },
  {
    label: "Thermal",
    href: "/thermal-studio",
    icon: Thermometer,
    matchPrefixes: ["/thermal-studio"],
    section: "tools",
    ceoOnly: true,
  },
  {
    // Parallel rebuild (see docs/design/THERMAL_V2_BUILD_LOG.md) — real
    // authenticated sessions via /thermal-studio-v2, the actual UI swap (S9)
    // is explicitly held pending review, so this stays a SEPARATE nav entry
    // rather than replacing the row above.
    label: "Thermal Studio V2",
    href: "/thermal-studio-v2",
    icon: FlaskConical,
    matchPrefixes: ["/thermal-studio-v2"],
    section: "labs",
    ceoOnly: true,
  },
  {
    label: "360° Tours",
    href: "/tours",
    icon: Orbit,
    matchPrefixes: ["/tours"],
    section: "labs",
    ceoOnly: true,
  },
  {
    label: "Design Studio",
    href: "/unreal-studio",
    icon: Wand2,
    matchPrefixes: ["/unreal-studio"],
    section: "labs",
    ceoOnly: true,
  },
  {
    label: "Content Studio",
    href: "/content-studio-workspace",
    icon: Clapperboard,
    matchPrefixes: ["/content-studio-workspace"],
    section: "labs",
    ceoOnly: true,
  },
  {
    label: "Operations Console",
    href: "/operations-console",
    icon: Wrench,
    matchPrefixes: ["/operations-console"],
    section: "labs",
    staffOnly: true,
  },
  {
    label: "Team",
    href: "/more/organization",
    icon: Users,
    matchPrefixes: ["/more/organization"],
    section: "account",
  },
  {
    label: "Billing",
    href: "/more/billing",
    icon: CreditCard,
    matchPrefixes: ["/more/billing"],
    section: "account",
  },
  {
    label: "Account",
    href: "/my-account",
    icon: UserCircle,
    matchPrefixes: ["/my-account"],
    section: "account",
  },
];

/** Resolve the visible nav for the current viewer. App-Store mode hides in-progress
 * modules; Operations Console is staff-only. */
export function resolveDashboardNav(
  showOpsConsole: boolean,
  isCeo = false,
  visibleApps?: ClientSurfaceApp[] | null,
): DashboardNavItem[] {
  const spatialOnly = isSpatialOnlyAppList(visibleApps, isCeo);
  return DASHBOARD_DESKTOP_NAV_ALL.filter((item) => {
    if (APP_STORE_MODE && item.appStoreHidden) return false;
    if (item.ceoOnly && !isCeo) return false;
    if (item.staffOnly && !showOpsConsole) return false;
    if (item.hideWhenSpatialOnly && spatialOnly) return false;
    return isNavAppVisible(item.requiresApp, isCeo, visibleApps);
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
