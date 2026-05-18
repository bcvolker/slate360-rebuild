/**
 * DashboardV2Home — main content surface for /preview/dashboard-v2-full.
 *
 * Server component. Receives real data from page.tsx via loadSiteWalkHubData.
 *
 * Desktop layout (max-w-7xl):
 *   Command center header  — workspace name + real alert badge + new worksite CTA
 *   Status strip           — real counts (walks / open items / draft deliverables)
 *   2-col grid             — Left: Apps + Quick Actions | Right: Activity Panel (340px)
 *   Full-width rail        — Continue Work horizontal scroll
 *
 * Mobile layout (auto-stacked):
 *   Header → status → Apps → Quick Actions → Activity Panel → Rail
 *
 * Production swap: when approved, replace app/(dashboard)/dashboard/page.tsx.
 */

import Link from "next/link";
import { ArrowRight, Bell, MapPin } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import type { HubSummary, HubWalk } from "@/lib/types/site-walk";
import { DashboardV2AppLauncher } from "@/components/dashboard-v2/DashboardV2AppLauncher";
import { DashboardV2QuickActions } from "@/components/dashboard-v2/DashboardV2QuickActions";
import { DashboardV2HorizontalRail } from "./DashboardV2HorizontalRail";
import { DashboardV2ActivityPanel } from "./DashboardV2ActivityPanel";

export interface DashboardV2HomeProps {
  entitlements: Entitlements | null;
  isSlateCeo: boolean;
  workspaceName: string;
  userName: string;
  walks: HubWalk[];
  summary: HubSummary;
}

export function DashboardV2Home({
  entitlements,
  isSlateCeo,
  workspaceName,
  userName,
  walks,
  summary,
}: DashboardV2HomeProps) {
  const firstName = userName.split(" ")[0] || null;
  const alertCount = summary.needsReview + summary.unsyncedItems;
  const hasWork = walks.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 py-1">

      {/* ── Command Center Header ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 lg:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.065) 0%, rgba(11,15,21,0) 55%), #0d1118",
        }}
      >
        {/* Ambient glow — decorative only */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-[0.15]"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.5) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Identity */}
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/60">
              Command Center
            </p>
            <h1 className="text-xl font-black tracking-tight text-white lg:text-2xl leading-tight">
              {workspaceName}
            </h1>
            {firstName && (
              <p className="mt-1 text-sm text-zinc-500">Welcome back, {firstName}</p>
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {alertCount > 0 && (
              <Link
                href="/site-walk/deliverables"
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/15 transition-colors"
              >
                <Bell className="h-3 w-3" />
                {alertCount} need attention
              </Link>
            )}
            <Link
              href="/site-walk/setup"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-amber-500/25 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              New Worksite
            </Link>
          </div>
        </div>

        {/* Status strip — only renders when real data exists */}
        {hasWork && (
          <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] pt-3 text-xs">
            <span className="text-zinc-500">
              <span className="font-semibold text-zinc-300">{walks.length}</span>{" "}
              worksite{walks.length !== 1 ? "s" : ""}
            </span>
            {summary.openItems > 0 && (
              <span className="text-zinc-500">
                <span className="font-semibold text-zinc-300">{summary.openItems}</span>{" "}
                open item{summary.openItems !== 1 ? "s" : ""}
              </span>
            )}
            {summary.draftDeliverables > 0 && (
              <span className="text-zinc-500">
                <span className="font-semibold text-zinc-300">{summary.draftDeliverables}</span>{" "}
                draft deliverable{summary.draftDeliverables !== 1 ? "s" : ""}
              </span>
            )}
            <Link
              href="/site-walk"
              className="ml-auto flex items-center gap-1 text-amber-400/70 hover:text-amber-400 transition-colors"
            >
              Site Walk <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* ── 2-col desktop grid / stacked mobile ──────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Apps + Quick Actions */}
        <div className="space-y-4 min-w-0">
          {/*
           * DashboardV2AppLauncher gates the Site Walk tile on canAccessStandalonePunchwalk.
           * Slate360 Twin tile absent — Track B must ship a real route first.
           */}
          <DashboardV2AppLauncher entitlements={entitlements} isSlateCeo={isSlateCeo} />
          {/*
           * DashboardV2QuickActions: "use client", uses useInviteShare() + ⌘K dispatch.
           * Context and listener both live in DashboardV2FullShell.
           */}
          <DashboardV2QuickActions />
        </div>

        {/* Right: Mission Feed / Activity */}
        <DashboardV2ActivityPanel summary={summary} walks={walks} />
      </div>

      {/* ── Full-width Continue Work rail ────────────────────────────── */}
      {/*
       * Slice 3 deferred:
       * - Project cards (add HubProject[] prop to rail)
       * - SlateDrop recent (query slatedrop_files by org_id + uploaded_at)
       * - Deliverable cards (query site_walk_deliverables + updated_at)
       * - project_notifications → wire to Alerts tab
       * - site_walk_assignments  → wire to Assigned tab
       */}
      <DashboardV2HorizontalRail walks={walks} />
    </div>
  );
}

