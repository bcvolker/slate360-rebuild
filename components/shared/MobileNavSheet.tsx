"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getEntitlements, type Tier } from "@/lib/entitlements";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  gate?: keyof ReturnType<typeof getEntitlements>;
  internalKey?: "ceo" | "market" | "athlete360";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",      icon: LayoutDashboard },
  { label: "Project Hub",   href: "/project-hub",    icon: FolderKanban,  gate: "canAccessHub" },
  { label: "Design Studio", href: "/design-studio",  icon: Palette,       gate: "canAccessDesignStudio" },
  { label: "Content Studio",href: "/content-studio", icon: Layers,        gate: "canAccessContent" },
  { label: "360 Tours",     href: "/tours",          icon: Compass,       gate: "canAccessTourBuilder" },
  { label: "Geospatial",    href: "/geospatial",     icon: Globe,         gate: "canAccessGeospatial" },
  { label: "Virtual Studio",href: "/virtual-studio", icon: Film,          gate: "canAccessVirtual" },
  { label: "Analytics",     href: "/analytics",      icon: BarChart3,     gate: "canAccessAnalytics" },
  { label: "SlateDrop",     href: "/slatedrop",      icon: FolderOpen,    gate: "canViewSlateDropWidget" },
  { label: "My Account",    href: "/my-account",     icon: User },
  { label: "CEO",           href: "/ceo",            icon: Shield,        internalKey: "ceo" },
  { label: "Market Robot",  href: "/market",         icon: TrendingUp,    internalKey: "market" },
  { label: "Athlete360",    href: "/athlete360",     icon: Zap,           internalKey: "athlete360" },
];

interface MobileNavSheetProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function MobileNavSheet({
  tier,
  isCeo = false,
  internalAccess,
}: MobileNavSheetProps) {
  const [open, setOpen] = useState(false);
  const ent = tier ? getEntitlements(tier, { isSlateCeo: isCeo }) : null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.internalKey) {
      return internalAccess ? Boolean(internalAccess[item.internalKey]) : isCeo;
    }
    if (item.gate && ent) {
      const val = ent[item.gate];
      if (typeof val === "boolean" && !val) return false;
    }
    return true;
  });

  return (
    <>
      {/* Hamburger trigger — only visible on mobile */}
      <button
        className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-[#FF4D00] transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 bg-zinc-950 border-zinc-800 p-0"
        >
          <SheetHeader className="px-5 py-4 border-b border-zinc-800">
            <SheetTitle className="text-sm font-bold text-white">
              Navigation
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 px-3 py-3 overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                >
                  <Icon size={16} className="text-zinc-400 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
