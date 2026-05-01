"use client";

/**
 * CommandPalette — Slate360 ⌘K
 *
 * Global command palette. Opens with ⌘K / Ctrl+K from anywhere in the
 * authenticated app. Lists navigation, app jumps, and quick-create
 * actions. Built on `cmdk` (same library Linear/Vercel use).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Compass,
  FileText,
  FolderKanban,
  FolderPlus,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Search,
  Settings,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";

interface PaletteItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: "navigate" | "signout";
  href?: string;
  group: "Navigate" | "Apps" | "Create" | "Account";
  internalOnly?: boolean;
  comingSoon?: boolean;
}

const ITEMS: PaletteItem[] = [
  // Navigate
  { id: "nav-cc",       group: "Navigate", label: "Command Center",  icon: LayoutDashboard, action: "navigate", href: "/dashboard",   shortcut: "G C" },
  { id: "nav-projects", group: "Navigate", label: "Projects",        icon: FolderKanban,    action: "navigate", href: "/projects",    shortcut: "G P" },
  { id: "nav-slatedrop",group: "Navigate", label: "SlateDrop",       icon: Inbox,           action: "navigate", href: "/slatedrop",   shortcut: "G D" },
  { id: "nav-account",  group: "Navigate", label: "My Account",      icon: User,            action: "navigate", href: "/my-account",  shortcut: "G A" },
  { id: "nav-ops",      group: "Navigate", label: "Operations Console", icon: Shield,       action: "navigate", href: "/operations-console", internalOnly: true },

  // Apps
  { id: "app-sw",       group: "Apps", label: "Site Walk",      icon: MapPin,    action: "navigate", href: "/site-walk" },
  { id: "app-tours",    group: "Apps", label: "360 Tours",      icon: Compass,   action: "navigate", href: "/apps/360-tour-builder",  comingSoon: true },
  { id: "app-design",   group: "Apps", label: "Design Studio",  icon: Palette,   action: "navigate", href: "/apps/design-studio",     comingSoon: true },
  { id: "app-content",  group: "Apps", label: "Content Studio", icon: FileText,  action: "navigate", href: "/apps/content-studio",    comingSoon: true },

  // Create
  { id: "new-project",  group: "Create", label: "New Project",   icon: FolderPlus, action: "navigate", href: "/projects?new=1",  shortcut: "C P" },
  { id: "new-walk",     group: "Create", label: "New Site Walk", icon: MapPin,     action: "navigate", href: "/site-walk?new=1", shortcut: "C W" },

  // Account
  { id: "acc-settings", group: "Account", label: "Settings",  icon: Settings, action: "navigate", href: "/my-account?tab=preferences" },
  { id: "acc-signout",  group: "Account", label: "Sign out",  icon: LogOut,   action: "signout" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasOperationsConsoleAccess?: boolean;
}

export default function CommandPalette({
  open,
  onOpenChange,
  hasOperationsConsoleAccess = false,
}: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Global ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  async function runItem(item: PaletteItem) {
    onOpenChange(false);
    if (item.action === "navigate" && item.href) {
      router.push(item.href);
    } else if (item.action === "signout") {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    }
  }

  const visible = ITEMS.filter((i) => (!i.internalOnly || hasOperationsConsoleAccess) && !shouldHideInAppStoreMode(i.comingSoon));
  const groups = ["Navigate", "Apps", "Create", "Account"] as const;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-2xl border border-app bg-app-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-app">
            <Search className="h-4 w-4 text-zinc-500" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-500 outline-none"
              autoFocus
            />
            <kbd className="rounded border border-app bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto py-1">
            <Command.Empty className="py-8 text-center text-sm text-zinc-500">
              No results.
            </Command.Empty>

            {groups.map((group) => {
              const items = visible.filter((i) => i.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="px-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-500"
                >
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.id}
                        value={`${item.group} ${item.label}`}
                        onSelect={() => runItem(item)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 cursor-pointer aria-selected:bg-white/[0.06] aria-selected:text-foreground"
                      >
                        <Icon className="h-4 w-4 text-zinc-400" />
                        <span className="flex-1">{item.label}</span>
                        {item.comingSoon && (
                          <span className="rounded-full border border-app bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                            Soon
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="rounded border border-app bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
                            {item.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>

          <div className="flex items-center justify-between border-t border-app px-4 py-2 text-[10px] text-zinc-500">
            <span>↑↓ navigate · ↵ select</span>
            <span>⌘K to toggle</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
