"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  Grid3X3,
  Inbox,
  FileCheck,
  Users,
  CreditCard,
  ChevronDown,
  Sparkles,
  Building2,
  MapPin,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entitlements } from "@/lib/entitlements";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Apps", icon: Grid3X3, href: "/apps" },
  { label: "SlateDrop", icon: Inbox, href: "/slatedrop" },
  { label: "Deliverables", icon: FileCheck, href: "/deliverables" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Billing", icon: CreditCard, href: "/my-account?tab=billing" },
  { label: "Enterprise Settings", icon: Settings, href: "#enterprise" },
];

interface AppLink {
  id: string;
  name: string;
  icon: React.ElementType;
  href: string;
  gate: keyof Entitlements;
}

const APP_LINKS: AppLink[] = [
  { id: "site-walk", name: "Site Walk", icon: MapPin, href: "/site-walk", gate: "canAccessStandalonePunchwalk" },
  { id: "360-tours", name: "360 Tours", icon: Building2, href: "/tours", gate: "canAccessStandaloneTourBuilder" },
  { id: "design-studio", name: "Design Studio", icon: Sparkles, href: "/design-studio", gate: "canAccessStandaloneDesignStudio" },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  entitlements?: Entitlements | null;
}

export function DashboardSidebar({ isOpen, onClose, isMobile = false, entitlements }: DashboardSidebarProps) {
  const [appsExpanded, setAppsExpanded] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sidebarContent = (
    <div className="flex flex-col bg-zinc-950 border-r border-zinc-800">
      {/* Logo + Close */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800">
        <a href="/" className="flex items-center">
          <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-6 w-auto" />
        </a>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3 py-3 overflow-y-auto">
        {/* Search */}
        <button
          onClick={() => setSearchExpanded(!searchExpanded)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all"
        >
          <Search className="h-4 w-4" />
          Search
          <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", searchExpanded && "rotate-180")} />
        </button>
        {searchExpanded && (
          <div className="px-3 pb-2">
            <Input
              type="search"
              placeholder="Search projects, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-[#D4AF37]"
              autoFocus
            />
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          if (item.label === "Apps") {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setAppsExpanded(!appsExpanded)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", appsExpanded && "rotate-180")} />
                </button>
                {appsExpanded && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-800 pl-3">
                    {APP_LINKS.filter((app) => !entitlements || entitlements[app.gate]).map((app) => (
                      <a
                        key={app.id}
                        href={app.href}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors"
                      >
                        <app.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {app.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      <div className="px-3 pb-3">
        <Button className="w-full bg-[#D4AF37] text-zinc-950 hover:bg-[#D4AF37]/90 text-sm h-9">
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return sidebarContent;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 w-64 bg-zinc-950 transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
