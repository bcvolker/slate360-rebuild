"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  MapPin,
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
  gate?: keyof ReturnType<typeof getEntitlements>;
  internalKey?: "ceo" | "market" | "athlete360";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",      icon: LayoutDashboard },
  { label: "Site Walk",   href: "/site-walk",      icon: MapPin,          gate: "canAccessStandalonePunchwalk" },
  { label: "SlateDrop",   href: "/slatedrop",      icon: FolderOpen,   gate: "canViewSlateDropWidget" },
  { label: "Tours",       href: "/tours",          icon: Compass,      gate: "canAccessStandaloneTourBuilder" },
  { label: "Design",      href: "/design-studio",  icon: Palette,      gate: "canAccessStandaloneDesignStudio" },
  { label: "Content",     href: "/content-studio", icon: Layers,       gate: "canAccessStandaloneContentStudio" },
  { label: "Geo",         href: "/geospatial",     icon: Globe,        gate: "canAccessGeospatial" },
  { label: "Virtual",     href: "/virtual-studio", icon: Film,         gate: "canAccessVirtual" },
  { label: "Analytics",   href: "/analytics",      icon: BarChart3,    gate: "canAccessAnalytics" },
  { label: "Account",     href: "/my-account",     icon: User },
  { label: "CEO",         href: "/ceo",            icon: Shield,       internalKey: "ceo" },
  { label: "Market",      href: "/market",         icon: TrendingUp,   internalKey: "market" },
  { label: "Athlete",     href: "/athlete360",     icon: Zap,          internalKey: "athlete360" },
];

interface MobileModuleBarProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function MobileModuleBar({ tier, isCeo = false, internalAccess }: MobileModuleBarProps) {
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
    <nav className="flex sm:hidden border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
      <div
        className="flex gap-1 px-3 py-1.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-[#D4AF37] hover:bg-zinc-800/50 transition-colors shrink-0"
            >
              <Icon size={16} />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
