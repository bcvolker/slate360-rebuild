"use client";

import Link from "next/link";
import { ChevronLeft, SlidersHorizontal, type LucideIcon } from "lucide-react";
import QuickNav from "@/components/shared/QuickNav";
import { getEntitlements, type Tier } from "@/lib/entitlements";

/**
 * DashboardTabShell
 *
 * Shell for every standalone dashboard tab page (Design Studio, Content Studio,
 * 360 Tours, Geospatial, Virtual Studio, My Account, etc.).
 *
 * Header replicates the dashboard EXACTLY:
 *   • max-w-[1440px]  h-14 sm:h-16  z-50  bg-white/95 backdrop-blur-md
 *   • Logo h-6 sm:h-7  (matches DashboardClient)
 *   • Center: breadcrumb  Dashboard › Tab Name
 *   • Right:  disabled Customize placeholder + QuickNav + user avatar + tier badge
 *
 * Content area: max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 (matches DashboardClient main)
 */

export type TabStatus = "coming-soon" | "under-development" | "live";

export interface DashboardTabShellProps {
  /** Authenticated user — passed from server page via resolveServerOrgContext. */
  user: { name: string; email: string; avatar?: string };
  /** User tier — used to render the plan badge. */
  tier: Tier;
  /** Tab/page title shown in breadcrumb + page header. */
  title: string;
  /** Optional Lucide icon shown in page header. */
  icon?: LucideIcon;
  /** Accent colour for icon tint (default: #1E3A8A). */
  accent?: string;
  /**
   * Tab build status:
   *   "coming-soon"        — grayed badge, neutrals (default)
   *   "under-development"  — amber badge, active-work framing
   *   "live"               — no badge, children rendered as-is
   */
  status?: TabStatus;
  /** Tab body content. */
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

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">

      {/* ════════ TOP BAR — exact replica of DashboardClient header ════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">

          {/* Left — Logo (links home like dashboard) */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="Slate360" className="h-6 sm:h-7 w-auto" />
          </Link>

          {/* Center — breadcrumb: Dashboard › Tab Name */}
          <div className="hidden md:flex items-center gap-2 flex-1 mx-8 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 font-semibold text-gray-400 hover:text-[#FF4D00] transition-colors"
            >
              <ChevronLeft size={15} />Dashboard
            </Link>
            <span className="text-gray-300">›</span>
            {Icon && <Icon size={14} style={{ color: accent }} />}
            <span className="font-semibold text-gray-700">{title}</span>
          </div>

          {/* Right — Customize (disabled placeholder) + QuickNav + user avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Customize — disabled until module ships; matches layout slot of dashboard */}
            <button
              disabled
              title="Customize — available when this module launches"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-300 cursor-not-allowed"
            >
              <SlidersHorizontal size={18} />
            </button>

            {/* QuickNav dropdown */}
            <QuickNav />

            {/* User avatar + name + tier */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {ent.label} plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ════════ MAIN — same container as DashboardClient main ════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden space-y-6">

        {/* Page header row */}
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

        {/* Tab body */}
        {children}
      </main>
    </div>
  );
}
