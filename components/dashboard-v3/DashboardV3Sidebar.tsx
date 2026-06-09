"use client";

import { useState } from "react";
import {
  AppWindow,
  CalendarCheck2,
  ChevronDown,
  CreditCard,
  FolderGit2,
  Home,
  Inbox,
  LogOut,
  Map,
  Settings,
  Settings2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  defaultExpanded: boolean;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "command-center",
    label: "Command Center",
    defaultExpanded: true,
    items: [
      { icon: Home, label: "Dashboard", href: "#", active: true },
      { icon: FolderGit2, label: "Projects", href: "#" },
      { icon: CalendarCheck2, label: "Deliverables", href: "#" },
      { icon: Inbox, label: "Coordination", href: "#" },
    ],
  },
  {
    id: "core-workspace",
    label: "Core Workspace Apps",
    defaultExpanded: true,
    items: [
      { icon: Map, label: "Site Walk Field Hub", href: "#" },
      { icon: AppWindow, label: "Twin 360 Studio", href: "/digital-twin" },
    ],
  },
  {
    id: "system-admin",
    label: "System Administration",
    defaultExpanded: false,
    items: [
      { icon: Users, label: "Team Access", href: "#" },
      { icon: CreditCard, label: "Billing & Usage", href: "#" },
      { icon: Settings2, label: "Ops Console", href: "#" },
    ],
  },
];

const FOLDER_ROW =
  "flex cursor-pointer items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 transition-colors duration-150 hover:text-white";

const FOOTER_ROW =
  "flex cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-[#F8FAFC]";

export function DashboardV3Sidebar() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.id, group.defaultExpanded])),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  return (
    <aside className="flex h-screen w-[270px] flex-col overflow-hidden border-r border-white/5 bg-[#0B0F15] text-sm">
      <div className="flex h-[68px] shrink-0 items-center px-6">
        <Link href="/app" className="block cursor-pointer" aria-label="Slate360 cockpit hub">
          <Slate360Logo variant="dark" />
        </Link>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-2">
          {NAV_GROUPS.map((group) => {
            const expanded = expandedGroups[group.id];

            return (
              <div key={group.id}>
                <button
                  type="button"
                  className={FOLDER_ROW}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-150",
                      expanded ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="space-y-0.5 px-2 pb-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "flex cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-[#F8FAFC]",
                          item.active && "bg-white/10 font-medium text-[#F8FAFC]",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-50 mt-auto flex shrink-0 flex-col gap-2 border-t border-white/[0.05] bg-[#0B0F15] p-4">
        <Link href="/more/account" className={FOOTER_ROW}>
          <User className="h-4 w-4" />
          <span>Account</span>
        </Link>
        <Link href="/settings" className={FOOTER_ROW}>
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
        <Link href="/auth/logout" className={FOOTER_ROW}>
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );
}
