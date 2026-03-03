"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  CreditCard,
  SlidersHorizontal,
  Activity,
  Plug,
  Search,
  type LucideIcon,
} from "lucide-react";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";

/**
 * DashboardTabShell
 *
 * Wraps every standalone dashboard-tab page (Design Studio, Content Studio,
 * 360 Tours, Geospatial, Virtual Studio, My Account, etc.).
 *
 * Header is PIXEL-FOR-PIXEL identical to DashboardClient:
 *   max-w-[1440px]  h-14 sm:h-16  z-50  bg-white/95 backdrop-blur-md
 *   Left:   logo (h-6 sm:h-7)
 *   Center: search bar (read-only stub until module ships)
 *   Right:  Bell  |  Customize (→ WidgetCustomizeDrawer)  |  User + dropdown
 *
 * Content area: max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8  (same as dashboard)
 */

export type TabStatus = "coming-soon" | "under-development" | "live";

export interface DashboardTabShellProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  title: string;
  icon?: LucideIcon;
  accent?: string;
  status?: TabStatus;
  children?: React.ReactNode;
}

export default function DashboardTabShell({
  user,
  tier,
  title,
  icon: Icon,
  accent = "#1E3A8A",
  status = "coming-soon",
  children,
}: DashboardTabShellProps) {
  const ent = getEntitlements(tier);
  const router = useRouter();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleOpenBillingPortal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json() as { url?: string };
    if (data?.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">

      {/* TOP BAR — identical to DashboardClient */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">

          {/* Left — Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="Slate360" className="h-6 sm:h-7 w-auto" />
          </Link>

          {/* Center — Search bar (read-only stub until module ships) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                readOnly
                placeholder={`Search ${title}…`}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm cursor-default"
              />
            </div>
          </div>

          {/* Right — Notifications + Customize + User */}
          <div className="flex items-center gap-1.5 sm:gap-3">

            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen(v => !v); setUserMenuOpen(false); }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Bell size={18} />
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">Notifications</p>
                    </div>
                    <div className="px-4 py-6 text-sm text-gray-500">No unread alerts.</div>
                  </div>
                </>
              )}
            </div>

            {/* Customize — wired to WidgetCustomizeDrawer */}
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize layout"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#FF4D00] transition-colors"
            >
              <SlidersHorizontal size={18} />
            </button>

            {/* User avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => { setUserMenuOpen(v => !v); setNotificationsOpen(false); }}
                className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{ent.label} plan</p>
                </div>
                <ChevronDown size={14} className="hidden sm:block text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-[#FF4D00]">
                        {ent.label}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Activity size={15} /> My Account
                      </Link>
                      <Link
                        href="/integrations"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Plug size={15} /> Integrations
                      </Link>
                      <button
                        onClick={handleOpenBillingPortal}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <CreditCard size={15} /> Billing &amp; Payments
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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

      {/* MAIN — same container/spacing as DashboardClient */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden space-y-6">

        {/* Page-header row */}
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              <Icon size={24} />
            </div>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">{title}</h1>
            {status === "under-development" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                Under Development
              </span>
            )}
            {status === "coming-soon" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                Coming Soon
              </span>
            )}
          </div>
        </div>

        {children}
      </main>

      {/* CUSTOMIZE DRAWER */}
      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title={`Customize ${title}`}
        subtitle="Widget customization will be available when this module launches"
        widgetPrefs={[]}
        widgetMeta={[]}
        onToggleVisible={() => {}}
        onSetSize={() => {}}
        onMoveOrder={() => {}}
        onReset={() => {}}
      />
    </div>
  );
}
