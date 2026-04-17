"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
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
  internalKey?: "operationsConsole";
  phase1Hidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Command Center",href: "/dashboard",      icon: LayoutDashboard },
  { label: "Projects",      href: "/projects",       icon: FolderKanban },
  { label: "Site Walk",     href: "/site-walk",      icon: MapPin,        gate: "canAccessStandalonePunchwalk" },
  { label: "360 Tours",     href: "/tours",          icon: Compass,       gate: "canAccessTourBuilder", phase1Hidden: true },
  { label: "Design Studio", href: "/design-studio",  icon: Palette,       gate: "canAccessDesignStudio", phase1Hidden: true },
  { label: "Content Studio",href: "/content-studio", icon: Layers,        gate: "canAccessContent", phase1Hidden: true },
  { label: "Geospatial",    href: "/geospatial",     icon: Globe,         gate: "canAccessGeospatial", phase1Hidden: true },
  { label: "Virtual Studio",href: "/virtual-studio", icon: Film,          gate: "canAccessVirtual", phase1Hidden: true },
  { label: "Analytics",     href: "/analytics",      icon: BarChart3,     gate: "canAccessAnalytics", phase1Hidden: true },
  { label: "My Account",    href: "/my-account",     icon: User },
  { label: "Operations Console", href: "/operations-console",        icon: Shield,        internalKey: "operationsConsole" },
];

interface MobileNavSheetProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function MobileNavSheet({
  tier,
  isCeo = false,
  internalAccess,
}: MobileNavSheetProps) {
  const [open, setOpen] = useState(false);
  const ent = tier ? getEntitlements(tier, { isSlateCeo: isCeo }) : null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    // Phase 1 beta: hide placeholder modules from tester navigation
    if (item.phase1Hidden) return false;
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
        className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-primary transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 sm:w-72 bg-zinc-950 border-zinc-800 p-0 [&>button]:text-white [&>button]:opacity-100 [&>button]:top-3.5 [&>button]:right-3 [&>button]:size-6"
        >
          <SheetHeader className="px-5 py-4 border-b border-zinc-800">
            <SheetTitle className="text-sm font-bold text-white">
              Navigation
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4 py-4 overflow-y-auto max-h-[calc(100dvh-5rem)]">
            {/* Home link */}
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <img src="/uploads/slate360-logo-reversed-v2.svg" alt="Home" className="h-4 w-auto flex-shrink-0" />
              Home
            </Link>
            <div className="h-px bg-zinc-800 my-1" />
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
