"use client";

import Link from "next/link";
import { Camera, Footprints, FileText, Map, Plus, ChevronRight } from "lucide-react";

interface Props {
  displayName: string;
}

/**
 * SiteWalkHomeClient — Phase 2 home dashboard for the Site Walk module.
 *
 * Layout per redesign spec:
 *   - Greeting + project picker hint
 *   - Workflow status (active walk / pending deliverables)
 *   - Quick actions grid (Start Walk, Open Plan, New Deliverable)
 *   - Recent activity feed
 *
 * No data wiring yet — empty states until Phase 3 hooks up real queries.
 */
export default function SiteWalkHomeClient({ displayName }: Props) {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Site Walk
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick up where you left off, or start a new walk.
        </p>
      </header>

      <section className="rounded-2xl border border-app bg-app-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Footprints className="h-4 w-4 text-cobalt" />
          <h2 className="text-base font-semibold text-foreground">Workflow status</h2>
        </div>
        <div className="rounded-xl border border-dashed border-app bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground text-center">
          No active walks. Start a new walk below.
        </div>
      </section>

      <section className="rounded-2xl border border-app bg-app-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-cobalt" />
          <h2 className="text-base font-semibold text-foreground">Quick actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <QuickAction href="/site-walk/walks" icon={<Camera className="h-5 w-5" />} label="Start a Walk" />
          <QuickAction href="/site-walk/board" icon={<Map className="h-5 w-5" />} label="Open Plan" />
          <QuickAction href="/site-walk/deliverables" icon={<FileText className="h-5 w-5" />} label="New Deliverable" />
        </div>
      </section>

      <section className="rounded-2xl border border-app bg-app-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
          <Link
            href="/site-walk/walks"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-app bg-white/[0.02] px-4 py-8 text-sm text-muted-foreground text-center">
          No recent activity yet. Captures and deliverables will appear here.
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-app bg-white/[0.02] px-3 py-4 text-center transition-colors hover:border-cobalt hover:bg-cobalt-soft"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] text-cobalt transition-transform group-hover:scale-110">
        {icon}
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}
