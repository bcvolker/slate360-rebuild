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
    <div className="flex flex-col bg-header text-header border-r border-header">
      {/* Logo + Close */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-header">
        <Link href="/dashboard" className="flex items-center">
          <SlateLogo className="h-6 w-auto" />
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-header-muted hover:text-header hover:bg-header-hover h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3 py-3 overflow-y-auto">
        {/* Search */}
        <button
          onClick={() => setSearchExpanded(!searchExpanded)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-header-muted hover:bg-cobalt-soft hover:text-cobalt-hover transition-all"
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
              className="h-8 text-sm bg-app-card border-header text-header placeholder:text-header-subtle focus-visible:ring-primary/50"
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
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-header-subtle cursor-not-allowed"
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-cobalt-soft-strong text-cobalt-hover"
                  : "text-header-muted hover:bg-cobalt-soft hover:text-cobalt-hover",
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
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-header-muted hover:bg-cobalt-soft hover:text-cobalt-hover transition-all"
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
        "fixed left-0 top-0 z-40 w-64 bg-header transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
