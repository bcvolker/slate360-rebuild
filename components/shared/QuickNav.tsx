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
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",      href: "/dashboard",       icon: LayoutDashboard },
  { label: "Projects",       href: "/projects",        icon: FolderKanban },
  { label: "Site Walk",      href: "/site-walk",       icon: MapPin,          gate: "canAccessStandalonePunchwalk" },
  { label: "360 Tours",      href: "/tours",           icon: Compass,      gate: "canAccessStandaloneTourBuilder", phase1Hidden: true },
  { label: "Design Studio",  href: "/design-studio",   icon: Palette,      gate: "canAccessStandaloneDesignStudio", phase1Hidden: true },
  { label: "Content Studio", href: "/content-studio",  icon: Layers,       gate: "canAccessStandaloneContentStudio", phase1Hidden: true },
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
        className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
      >
        <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl py-2 overflow-hidden max-h-[70vh] overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-colors"
                >
                  <Icon size={14} /> {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
