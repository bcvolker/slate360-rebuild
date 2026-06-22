"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Cloud,
  LayoutDashboard,
  MapPin,
  FolderKanban,
  MessageSquare,
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
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";
import { getEntitlements, type Tier } from "@/lib/entitlements";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  gate?: keyof ReturnType<typeof getEntitlements>;
  internalKey?: "operationsConsole";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Site Walk", href: "/site-walk", icon: MapPin, gate: "canAccessStandalonePunchwalk" },
  { label: "SlateDrop", href: "/slatedrop", icon: Cloud },
  { label: "Coordination", href: "/coordination/inbox", icon: MessageSquare },
  { label: "Account", href: "/more", icon: User },
  { label: "Operations Console", href: "/operations-console", icon: Shield, internalKey: "operationsConsole" },
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
      <button
        className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors hover:bg-white/10 hover:text-[var(--graphite-primary)]"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={22} strokeWidth={2.25} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 sm:w-72 bg-background border-app p-0 [&>button]:text-foreground [&>button]:opacity-100 [&>button]:top-3.5 [&>button]:right-3 [&>button]:size-6"
        >
          <SheetHeader className="px-5 py-4 border-b border-app">
            <SheetTitle className="text-sm font-bold text-foreground">
              Navigation
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4 py-4 overflow-y-auto max-h-[calc(100dvh-5rem)]">
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:text-[var(--graphite-primary)] hover:bg-white/[0.04] transition-colors"
            >
              <SlateLogoOnLight className="h-4 w-auto flex-shrink-0" />
              Home
            </Link>
            <div className="h-px bg-white/[0.04] my-1" />
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-foreground hover:bg-white/[0.04]/80 transition-colors"
                >
                  <Icon size={16} className="text-zinc-400 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
