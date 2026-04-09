"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  Palette,
  Layers,
  Compass,
  Globe,
  Film,
  BarChart3,
  FolderOpen,
  User,
  Shield,
  TrendingUp,
  Zap,
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
  internalKey?: "ceo" | "market" | "athlete360";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",      href: "/dashboard",       icon: LayoutDashboard },
  { label: "Project Hub",    href: "/project-hub",     icon: FolderKanban, gate: "canAccessHub" },
  { label: "Design Studio",  href: "/design-studio",   icon: Palette,      gate: "canAccessDesignStudio" },
  { label: "Content Studio", href: "/content-studio",  icon: Layers,       gate: "canAccessContent" },
  { label: "360 Tours",      href: "/tours",           icon: Compass,      gate: "canAccessTourBuilder" },
  { label: "Geospatial",     href: "/geospatial",      icon: Globe,        gate: "canAccessGeospatial" },
  { label: "Virtual Studio", href: "/virtual-studio",  icon: Film,         gate: "canAccessVirtual" },
  { label: "Analytics",      href: "/analytics",       icon: BarChart3,    gate: "canAccessAnalytics" },
  { label: "SlateDrop",      href: "/slatedrop",       icon: FolderOpen,   gate: "canViewSlateDropWidget" },
  { label: "My Account",     href: "/my-account",      icon: User },
  { label: "CEO",            href: "/ceo",             icon: Shield,       internalKey: "ceo" },
  { label: "Market Robot",   href: "/market",          icon: TrendingUp,   internalKey: "market" },
  { label: "Athlete360",     href: "/athlete360",      icon: Zap,          internalKey: "athlete360" },
];

interface QuickNavProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function QuickNav({ tier, isCeo = false, internalAccess }: QuickNavProps) {
  const [open, setOpen] = useState(false);
  // CEO override affects entitlements only for the actual CEO account.
  const ent = tier ? getEntitlements(tier, { isSlateCeo: isCeo }) : null;

  const visibleItems = NAV_ITEMS.filter((item) => {
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
