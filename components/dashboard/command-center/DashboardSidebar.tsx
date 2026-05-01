"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  LayoutDashboard,
  Inbox,
  CreditCard,
  ChevronDown,
  MapPin,
  FolderKanban,
  Shield,
  Compass,
  Palette,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";
import { SlateLogo } from "@/components/shared/SlateLogo";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  /** Path prefix used to determine active state. Defaults to href. */
  matchPrefix?: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects", icon: FolderKanban, href: "/projects" },
  { label: "SlateDrop", icon: Inbox, href: "/slatedrop" },
  { label: "Site Walk", icon: MapPin, href: "/site-walk/walks", matchPrefix: "/site-walk" },
  { label: "360 Tours", icon: Compass, href: "/tours", comingSoon: true },
  { label: "Design Studio", icon: Palette, href: "/design-studio", comingSoon: true },
  { label: "Content Studio", icon: Film, href: "/content-studio", comingSoon: true },
  { label: "My Account", icon: CreditCard, href: "/my-account" },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  /** When true, show the Operations Console link. Gated by owner access. */
  hasOperationsConsoleAccess?: boolean;
}

export function DashboardSidebar({ isOpen, onClose, isMobile = false, hasOperationsConsoleAccess = false }: DashboardSidebarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname() ?? "";

  const isActive = (item: NavItem): boolean => {
    if (item.comingSoon) return false;
    const prefix = item.matchPrefix ?? item.href;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-white/10 bg-[#0B0F15] text-slate-300 shadow-lg">
      {/* Logo + Close */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex items-center">
          <SlateLogo className="h-6 w-auto" />
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3 py-3 overflow-y-auto">
        {/* Search */}
        <button
          onClick={() => setSearchExpanded(!searchExpanded)}
          className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white hover:translate-x-[1px] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-cobalt/0 hover:before:bg-cobalt/60 before:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
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
              className="h-8 border-white/15 bg-white/5 text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
              autoFocus
            />
          </div>
        )}

        {NAV_ITEMS.filter((item) => !shouldHideInAppStoreMode(item.comingSoon)).map((item) => {
          const active = isActive(item);
          if (item.comingSoon) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cobalt/70">Soon</span>
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F8FAFC]",
                active
                  ? "bg-white/10 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-cobalt"
                  : "text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-[1px] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-cobalt/0 hover:before:bg-cobalt/60 before:transition-colors",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        {/* Operations Console — owner only */}
        {hasOperationsConsoleAccess && (
          <a
            href="/operations-console"
            className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white hover:translate-x-[1px] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-cobalt/0 hover:before:bg-cobalt/60 before:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
          >
            <Shield className="h-4 w-4" />
            Operations Console
          </a>
        )}
      </nav>


    </div>
  );

  if (isMobile) {
    return sidebarContent;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-[100dvh] w-64 bg-[#0B0F15] transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
