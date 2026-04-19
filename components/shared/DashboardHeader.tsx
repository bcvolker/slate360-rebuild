"use client";

/**
 * DashboardHeader — Unified top bar shared by the dashboard home,
 * all tab pages, and SlateDrop standalone. Replaces the parallel
 * header implementations in DashboardClient and DashboardTabShell.
 *
 * Tier-gated QuickNav, live notifications, customize trigger, and
 * user menu all live here so every page has exactly the same chrome.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Loader2,
  LogOut,
  Search,
  SlidersHorizontal,
  Activity,
} from "lucide-react";
import QuickNav from "@/components/shared/QuickNav";
import MobileNavSheet from "@/components/shared/MobileNavSheet";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";
import { SlateLogo } from "@/components/shared/SlateLogo";

export type HeaderNotification = {
  id: string;
  project_id: string;
  title: string;
  message: string;
  link_path?: string | null;
  created_at: string;
};

export interface DashboardHeaderProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
  /**
   * When true, renders a "← Dashboard" back link in the left cluster.
   * Set this on all tab pages; leave false (default) on the dashboard home itself.
   */
  showBackLink?: boolean;
  /** Active search query for pages that support real search. */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  /** Shows an amber dot on the customize button when there are unsaved widget prefs. */
  prefsDirty?: boolean;
  /** Called when the user clicks the Customize (sliders) button. */
  onCustomizeOpen?: () => void;
  /**
   * Unread notifications to display in the bell dropdown.
   * Pass an empty array while loading and after clearing.
   */
  notifications?: HeaderNotification[];
  notificationsLoading?: boolean;
  onRefreshNotifications?: () => void;
}

export default function DashboardHeader({
  user,
  tier,
  isCeo = false,
  internalAccess,
  showBackLink = false,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  prefsDirty = false,
  onCustomizeOpen,
  notifications = [],
  notificationsLoading = false,
  onRefreshNotifications,
}: DashboardHeaderProps) {
  const ent = getEntitlements(tier, { isSlateCeo: isCeo });
  const router = useRouter();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState<"portal" | null>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleOpenBillingPortal = async () => {
    setBillingBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
    } finally {
      setBillingBusy(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-app-page/80 backdrop-blur-xl border-b border-app">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">

        {/* ── Left cluster: Logo + optional back link ── */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <SlateLogo className="h-6 sm:h-7 w-auto" />
          </Link>
          {showBackLink && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-teal transition-colors"
            >
              <ChevronLeft size={14} /> Command Center
            </Link>
          )}
        </div>

        {/* ── Center: Search bar ── */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              readOnly={!onSearchChange}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-app bg-app-card text-sm text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* ── Right cluster: QuickNav + Bell + Customize + User ── */}
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Hamburger — mobile only (Sheet nav) */}
          <MobileNavSheet tier={ent.tier} isCeo={isCeo} internalAccess={internalAccess} />

          {/* QuickNav — desktop only */}
          <div className="hidden sm:block">
            <QuickNav tier={ent.tier} isCeo={isCeo} internalAccess={internalAccess} />
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setUserMenuOpen(false);
                if (!notificationsOpen) onRefreshNotifications?.();
              }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/[0.04] transition-colors"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                    <p className="text-sm font-bold text-white">Notifications</p>
                    {onRefreshNotifications && (
                      <button
                        onClick={onRefreshNotifications}
                        className="text-xs font-semibold text-primary hover:opacity-80"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">
                        <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading…
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No unread alerts.</div>
                    ) : (
                      notifications.map((n) => (
                        (() => {
                          const href = (n.link_path ?? `/projects/${n.project_id}`).replace(/^\/project-hub(?=\/|$)/, "/projects");
                          return (
                        <Link
                          key={n.id}
                          href={href}
                          onClick={() => setNotificationsOpen(false)}
                          className="block border-b border-zinc-800/50 px-4 py-3 hover:bg-white/[0.04]"
                        >
                          <p className="text-sm font-semibold text-zinc-200">{n.title}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">{n.message}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </Link>
                          );
                        })()
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Customize */}
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

          {/* User avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => { setUserMenuOpen((v) => !v); setNotificationsOpen(false); }}
              className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] text-zinc-400 leading-tight">{ent.label} plan</p>
              </div>
              <ChevronDown size={14} className="hidden sm:block text-zinc-500" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-12 w-56 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    <span
                      className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-primary-foreground bg-primary"
                    >
                      {ent.label}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/my-account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors"
                    >
                      <Activity size={15} /> My Account
                    </Link>
                    <button
                      onClick={handleOpenBillingPortal}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors"
                    >
                      {billingBusy === "portal" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CreditCard size={15} />
                      )}
                      Billing &amp; Payments
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


    </header>
  );
}
