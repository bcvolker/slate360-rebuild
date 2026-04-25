"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects",   icon: FolderKanban,    href: "/projects" },
  { label: "Directory",  icon: Users,           href: "/directory" },
  { label: "Reports",    icon: BarChart3,        href: "/reports" },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  hasOperationsConsoleAccess?: boolean;
}

export function DashboardSidebar({
  isOpen,
  onClose,
  isMobile = false,
  hasOperationsConsoleAccess = false,
}: DashboardSidebarProps) {
  const pathname = usePathname() ?? "";

  const isActive = (item: NavItem): boolean => {
    const prefix = item.matchPrefix ?? item.href;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Logo row */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
          aria-label="Slate360 home"
        >
          {/* Wordmark — crisp white */}
          <span className="text-lg font-bold tracking-tight text-white select-none">
            Slate<span className="text-blue-400">360</span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Main navigation">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 select-none">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <item.icon
                className={cn("h-4 w-4 shrink-0", active ? "text-blue-400" : "text-slate-400")}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Operations Console */}
      {hasOperationsConsoleAccess && (
        <div className="shrink-0 px-3 pb-4 border-t border-white/10 pt-4">
          <a
            href="/operations-console"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Shield className="h-4 w-4 shrink-0" />
            Operations Console
          </a>
        </div>
      )}

      {/* Footer label */}
      <div className="shrink-0 px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-slate-600 select-none">Slate360 &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if (isMobile) return sidebarContent;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 w-64 h-[100dvh] shadow-2xl transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
