"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  MapPin,
  Compass,
  Palette,
  Layers,
  Globe,
  Film,
  BarChart3,
  FolderKanban,
  User,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { getEntitlements, type Tier } from "@/lib/entitlements";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Entitlements key to check — if undefined, always shown */
  gate?: keyof ReturnType<typeof getEntitlements>;
  /** Internal admin surface visibility, separate from tier entitlements. */
  internalKey?: "operationsConsole";
  /** Hidden from tester-facing navigation in Phase 1 beta. */
  phase1Hidden?: boolean;
  /** Marks the item as a preview / not-yet-shipped surface. */
  comingSoon?: boolean;
}

// Apps are listed in canonical order with equal styling — no app takes precedence.
// Visibility is entitlement-driven; items not yet shipped link to their public
// info page (`/apps/*`) and carry a "Soon" badge.
const NAV_ITEMS: NavItem[] = [
  { label: "Command Center", href: "/dashboard",       icon: LayoutDashboard },
  { label: "Projects",       href: "/projects",        icon: FolderKanban },
  { label: "Site Walk",      href: "/site-walk",                icon: MapPin,    gate: "canAccessStandalonePunchwalk" },
  { label: "360 Tours",      href: "/apps/360-tour-builder",    icon: Compass,   gate: "canAccessStandaloneTourBuilder",   comingSoon: true },
  { label: "Design Studio",  href: "/apps/design-studio",       icon: Palette,   gate: "canAccessStandaloneDesignStudio",  comingSoon: true },
  { label: "Content Studio", href: "/apps/content-studio",      icon: Layers,    gate: "canAccessStandaloneContentStudio", comingSoon: true },
  { label: "Geospatial",     href: "/geospatial",      icon: Globe,        gate: "canAccessGeospatial", phase1Hidden: true },
  { label: "Virtual Studio", href: "/virtual-studio",  icon: Film,         gate: "canAccessVirtual", phase1Hidden: true },
  { label: "Analytics",      href: "/analytics",       icon: BarChart3,    gate: "canAccessAnalytics", phase1Hidden: true },
  { label: "My Account",     href: "/my-account",      icon: User },
  { label: "Operations Console", href: "/operations-console",         icon: Shield,       internalKey: "operationsConsole" },
];

interface QuickNavProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function QuickNav({ tier, isCeo = false, internalAccess }: QuickNavProps) {
  const [open, setOpen] = useState(false);
  // CEO override affects entitlements only for the actual CEO account.
  const ent = tier ? getEntitlements(tier, { isSlateCeo: isCeo }) : null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    // Phase 1 beta: hide placeholder modules from tester navigation
    if (item.phase1Hidden) return false;
    if (item.internalKey) {
      if (internalAccess) return Boolean(internalAccess[item.internalKey]);
      return isCeo;
    }
    if (item.gate && ent) {
      const val = ent[item.gate];
      if (typeof val === "boolean" && !val) return false;
    }
    return true;
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-app bg-app-card px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04] hover:text-teal hover:border-teal transition-all"
      >
        <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-app bg-app-card shadow-2xl py-2 overflow-hidden max-h-[70vh] overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04] hover:text-teal transition-colors"
                >
                  <Icon size={14} />
                  <span className="flex-1">{item.label}</span>
                  {item.comingSoon && (
                    <span className="rounded-full border border-app bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
