"use client";

import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import QuickNav from "@/components/shared/QuickNav";

/* ------------------------------------------------------------------ */
/*  DashboardTabShell — shared scaffolding for every standalone tab   */
/*  page (Design Studio, Content Studio, Analytics, CEO, etc.).       */
/*                                                                     */
/*  Standardises:                                                      */
/*    • Outer bg, min-h-screen, overflow                               */
/*    • Sticky header (logo, back link, breadcrumb, QuickNav)          */
/*    • Main area max-w, padding, spacing                              */
/*    • Category label + title + description                           */
/*  ------------------------------------------------------------------ */

export interface DashboardTabShellProps {
  /** Appears above the title (xs uppercase label). */
  category: string;
  /** Page title (2xl font-black). */
  title: string;
  /** Short description below the title. */
  description?: string;
  /** Lucide icon rendered beside the title. */
  icon?: LucideIcon;
  /** Accent colour for icon bg tint (default: #1E3A8A). */
  accent?: string;
  /** Use dark theme (Analytics, CEO). Default false (light). */
  dark?: boolean;
  /** Extra elements rendered in the header right area (action buttons, etc.). */
  headerActions?: React.ReactNode;
  /** Page body. */
  children: React.ReactNode;
}

export default function DashboardTabShell({
  category,
  title,
  description,
  icon: Icon,
  accent = "#1E3A8A",
  dark = false,
  headerActions,
  children,
}: DashboardTabShellProps) {
  /* ---- colour tokens ---- */
  const bg = dark ? "bg-[#0B1220]" : "bg-[#ECEEF2]";
  const headerBg = dark ? "bg-[#0B1220]/95" : "bg-white/95";
  const headerBorder = dark ? "border-slate-800" : "border-gray-100";
  const logoFilter = dark ? "brightness-0 invert" : "";
  const backText = dark ? "text-slate-400" : "text-gray-500";
  const sepText = dark ? "text-slate-700" : "text-gray-300";
  const catText = dark ? "text-slate-400" : "text-gray-500";
  const titleText = dark ? "text-white" : "text-gray-900";
  const descText = dark ? "text-slate-400" : "text-gray-500";

  return (
    <div className={`min-h-screen ${bg} overflow-x-hidden`}>
      {/* ═══ HEADER ═══ */}
      <header
        className={`sticky top-0 z-40 border-b ${headerBorder} ${headerBg} backdrop-blur-md`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 md:px-10">
          {/* Row 1: logo · back link · breadcrumb · QuickNav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="shrink-0">
                <img
                  src="/logo.svg"
                  alt="Slate360"
                  className={`h-7 w-auto ${logoFilter}`}
                />
              </Link>
              <Link
                href="/dashboard"
                className={`hidden sm:flex items-center gap-1.5 text-sm font-semibold ${backText} hover:text-[#FF4D00] transition-colors`}
              >
                <ChevronLeft size={16} /> Dashboard
              </Link>
              <span className={`hidden sm:block ${sepText}`}>·</span>
              <span
                className={`hidden sm:block text-sm font-semibold ${catText}`}
              >
                {title}
              </span>
            </div>
            <QuickNav />
          </div>

          {/* Row 2: category · title · description · actions */}
          <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  <Icon size={20} />
                </div>
              )}
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${catText}`}
                >
                  {category}
                </p>
                <h1 className={`text-xl font-black md:text-2xl ${titleText}`}>
                  {title}
                </h1>
                {description && (
                  <p className={`mt-0.5 text-sm ${descText}`}>{description}</p>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="mt-3 sm:mt-0 flex items-center gap-2">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {children}
      </main>
    </div>
  );
}
