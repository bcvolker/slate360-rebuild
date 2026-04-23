"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
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
    <div className="dark flex flex-col bg-[#0B0F15] text-white border-r border-white/10 h-full">
      {/* Logo + Close */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center">
          <SlateLogo className="h-6 w-auto" />
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-white/5 h-8 w-8 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3 py-3 overflow-y-auto">
        {/* Search */}
        <button
          onClick={() => setSearchExpanded(!searchExpanded)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-cobalt-soft hover:text-cobalt-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
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
              className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
              autoFocus
            />
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          if (item.comingSoon) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
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
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
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
        "fixed left-0 top-0 z-40 w-64 h-[100dvh] bg-[#0B0F15] transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
