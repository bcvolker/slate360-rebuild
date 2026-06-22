"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Cloud,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  MessageSquare,
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

interface QuickNavProps {
  tier?: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function QuickNav({ tier, isCeo = false, internalAccess }: QuickNavProps) {
  const [open, setOpen] = useState(false);
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
        className="flex items-center gap-2 rounded-xl border border-app bg-app-card px-3 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)] hover:bg-white/[0.04] hover:text-[var(--graphite-primary)]"
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
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-[var(--graphite-primary)]"
                >
                  <Icon size={14} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
