"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  StudioWorkspaceShell,
  StudioTabs,
  StudioChip,
  type StudioTab,
} from "@/components/studio/StudioWorkspaceShell";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";
import type { TwinStudioSpace } from "@/lib/digital-twin/load-twin-studio-data";
import { ProducePanel } from "./panels/ProducePanel";
import { CleanPanel } from "./panels/CleanPanel";
import { PlanPanel } from "./panels/PlanPanel";
import { DeliverPanel } from "./panels/DeliverPanel";

export type TwinStudioTab = "produce" | "clean" | "plan" | "deliver";

const TABS: StudioTab<TwinStudioTab>[] = [
  { id: "produce", label: "Produce" },
  { id: "clean", label: "Clean" },
  { id: "plan", label: "Plan" },
  { id: "deliver", label: "Deliver" },
];

/**
 * F1 (TWIN_SERVICE_STUDIO_PLAN.md Phase F) — Twin Studio shell, modeled
 * directly on ThermalV2Shell.tsx: thin top bar (title · space · tabs · live
 * job status), one fully-unmounting panel per tab. Only Produce is real in
 * F1 — Clean/Plan/Deliver are honest placeholders until F2/F3/F4 land.
 */
export function TwinStudioShell({ space }: { space: TwinStudioSpace }) {
  const [tab, setTab] = useState<TwinStudioTab>("produce");
  // Hoisted here (not inside ProducePanel) so the live job status survives a
  // tab switch away from Produce and back, and so the top-bar chip can show
  // it too — same reasoning ThermalV2Shell documents for its own shared state.
  const { job, connected } = useTwinJobRealtime(space.latestCaptureId);

  return (
    <StudioWorkspaceShell
      title="Twin Studio"
      subtitle={space.spaceTitle}
      bare
      leftSlot={
        <Link
          href="/twin-studio"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          aria-label="Back to Twin Studio spaces"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
      }
      tabsSlot={<StudioTabs tabs={TABS} active={tab} onChange={setTab} />}
      rightSlot={
        <>
          <StudioChip label="Status" value={space.status} />
          {job ? (
            <StudioChip
              label="Job"
              value={job.status === "processing" ? `${job.stage ?? "processing"} ${job.progress_pct}%` : job.status}
            />
          ) : null}
          {!connected && space.latestCaptureId ? (
            <span className="text-[10px] text-[var(--graphite-muted)]">reconnecting…</span>
          ) : null}
        </>
      }
    >
      {tab === "produce" ? <ProducePanel space={space} job={job} /> : null}
      {tab === "clean" ? <CleanPanel /> : null}
      {tab === "plan" ? <PlanPanel /> : null}
      {tab === "deliver" ? <DeliverPanel /> : null}
    </StudioWorkspaceShell>
  );
}
