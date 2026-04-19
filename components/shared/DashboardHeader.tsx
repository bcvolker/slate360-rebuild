"use client";

/**
 * DashboardHeader — Unified top bar shared by the dashboard home,
 * all tab pages, and SlateDrop standalone.
 *
 * Layout (industry-standard):
 *   [Back] [Logo]  [⌘K Search]  [QuickNav] [+] [🔔] [⚙] [?] [Avatar▾]
 *
 * Tier-gated QuickNav, live notifications, command palette, quick-create,
 * help, and user menu all live here so every page has the same chrome.
 *
 * Sub-components extracted to `components/shared/header/` for size compliance.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FolderPlus,
  HelpCircle,
  Inbox,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import QuickNav from "@/components/shared/QuickNav";
import MobileNavSheet from "@/components/shared/MobileNavSheet";
import CommandPalette from "@/components/shared/CommandPalette";
import NotificationsMenu, { type HeaderNotification } from "@/components/shared/header/NotificationsMenu";
import UserMenu from "@/components/shared/header/UserMenu";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { SlateLogo } from "@/components/shared/SlateLogo";

export type { HeaderNotification };

export interface DashboardHeaderProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  /** Org admin (owner/admin role). Controls billing visibility in user menu. */
  isAdmin?: boolean;
  internalAccess?: { operationsConsole?: boolean };
  showBackLink?: boolean;
  /** Search shortcut placeholder (palette opens via ⌘K). */
  searchPlaceholder?: string;
  prefsDirty?: boolean;
  onCustomizeOpen?: () => void;
  notifications?: HeaderNotification[];
  notificationsLoading?: boolean;
  onRefreshNotifications?: () => void;
}

export default function DashboardHeader({
  user,
  tier,
  isCeo = false,
  isAdmin = true,
  internalAccess,
  showBackLink = false,
  searchPlaceholder = "Search projects, files, people…",
  prefsDirty = false,
  onCustomizeOpen,
  notifications = [],
  notificationsLoading = false,
  onRefreshNotifications,
}: DashboardHeaderProps) {
  const ent = getEntitlements(tier, { isSlateCeo: isCeo });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [shortcutKey, setShortcutKey] = useState("⌘");
  useEffect(() => {
    setShortcutKey(typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);

  const closeAll = () => {
    setUserMenuOpen(false);
    setNotificationsOpen(false);
    setCreateOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-app-page/80 backdrop-blur-xl border-b border-app">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-6 h-14 sm:h-16">

        {/* ── Left cluster: Logo + optional back link ── */}
        <div className="flex items-center gap-2 shrink-0">
          {showBackLink && (
            <Link
              href="/dashboard"
              aria-label="Back to Command Center"
              title="Command Center"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-teal transition-colors"
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          <Link
            href="/"
            aria-label="Slate360 home"
            title="Home"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <SlateLogo className="h-6 sm:h-7 w-auto" />
          </Link>
        </div>

        {/* ── Center: ⌘K palette trigger ── */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <button
            onClick={() => { closeAll(); setPaletteOpen(true); }}
            className="group relative w-full flex items-center gap-2 rounded-xl border border-app bg-app-card px-3 py-2 text-left text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 hover:border-white/10 transition-all"
            aria-label="Open command palette"
          >
            <Search size={15} />
            <span className="flex-1 truncate">{searchPlaceholder}</span>
            <kbd className="rounded border border-app bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              {shortcutKey}K
            </kbd>
          </button>
        </div>

        {/* spacer keeps right cluster pinned right when search is hidden */}
        <div className="flex-1 md:hidden" />

        {/* ── Right cluster ── */}
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto md:ml-0">
          {/* Hamburger — mobile only */}
          <MobileNavSheet tier={ent.tier} isCeo={isCeo} internalAccess={internalAccess} />

          {/* QuickNav — desktop only */}
          <div className="hidden lg:block">
            <QuickNav tier={ent.tier} isCeo={isCeo} internalAccess={internalAccess} />
          </div>

          {/* Quick-create + */}
          <div className="relative">
            <button
              onClick={() => { closeAll(); setCreateOpen((v) => !v); }}
              title="Create new…"
              aria-label="Create new"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/[0.04] hover:text-teal transition-colors"
            >
              <Plus size={18} />
            </button>
            {createOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCreateOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-app bg-app-card shadow-xl py-1">
                  <Link href="/projects?new=1" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white">
                    <FolderPlus size={15} /> New Project
                  </Link>
                  <Link href="/site-walk?new=1" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white">
                    <MapPin size={15} /> New Site Walk
                  </Link>
                  <Link href="/slatedrop?new=1" onClick={() => setCreateOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white">
                    <Inbox size={15} /> Send via SlateDrop
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <NotificationsMenu
            open={notificationsOpen}
            onOpenChange={(v) => { closeAll(); setNotificationsOpen(v); }}
            notifications={notifications}
            loading={notificationsLoading}
            onRefresh={onRefreshNotifications}
          />

          {/* Customize (only on dashboard home) */}
          {onCustomizeOpen && (
            <button
              onClick={onCustomizeOpen}
              title="Customize layout"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/[0.04] hover:text-teal transition-colors"
            >
              <SlidersHorizontal size={18} />
              {prefsDirty && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          )}

          {/* Help */}
          <Link
            href="/help"
            title="Help & docs"
            aria-label="Help and documentation"
            className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl items-center justify-center text-zinc-400 hover:bg-white/[0.04] hover:text-teal transition-colors"
          >
            <HelpCircle size={18} />
          </Link>

          {/* User menu */}
          <UserMenu
            user={user}
            tierLabel={ent.label}
            isAdmin={isAdmin}
            open={userMenuOpen}
            onOpenChange={(v) => { closeAll(); setUserMenuOpen(v); }}
          />
        </div>
      </div>

      {/* Global ⌘K command palette */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        hasOperationsConsoleAccess={Boolean(internalAccess?.operationsConsole)}
      />
    </header>
  );
}
