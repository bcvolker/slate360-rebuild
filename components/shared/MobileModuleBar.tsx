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
  gate?: keyof ReturnType<typeof getEntitlements>;
  internalKey?: "operationsConsole";
  phase1Hidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",      icon: LayoutDashboard },
  { label: "Projects",    href: "/project-hub",    icon: FolderKanban },
  { label: "Site Walk",   href: "/site-walk",      icon: MapPin,          gate: "canAccessStandalonePunchwalk" },
  { label: "SlateDrop",   href: "/slatedrop",      icon: FolderOpen,   gate: "canViewSlateDropWidget" },
  { label: "Tours",       href: "/tours",          icon: Compass,      gate: "canAccessStandaloneTourBuilder", phase1Hidden: true },
  { label: "Design",      href: "/design-studio",  icon: Palette,      gate: "canAccessStandaloneDesignStudio", phase1Hidden: true },
  { label: "Content",     href: "/content-studio", icon: Layers,       gate: "canAccessStandaloneContentStudio", phase1Hidden: true },
  { label: "Geo",         href: "/geospatial",     icon: Globe,        gate: "canAccessGeospatial", phase1Hidden: true },
  { label: "Virtual",     href: "/virtual-studio", icon: Film,         gate: "canAccessVirtual", phase1Hidden: true },
  { label: "Analytics",   href: "/analytics",      icon: BarChart3,    gate: "canAccessAnalytics", phase1Hidden: true },
  { label: "Account",     href: "/my-account",     icon: User },
  { label: "Ops Console", href: "/operations-console",            icon: Shield,       internalKey: "operationsConsole" },
];

interface MobileModuleBarProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function MobileModuleBar({ tier, isCeo = false, internalAccess }: MobileModuleBarProps) {
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
