"use client";

import { useMemo, useState } from "react";
import { Scan } from "lucide-react";

import { useMobileShellDock } from "@/components/mobile-system";
import { TwinHomeContinue } from "@/components/digital-twin/home/TwinHomeContinue";
import { TwinHomeProjects } from "@/components/digital-twin/home/TwinHomeProjects";
import { TwinNewScanSheet } from "@/components/digital-twin/home/TwinNewScanSheet";
import { buildTwinProjectCards, pickContinueTwin } from "@/lib/digital-twin/twin-hub-state";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  orgName: string | null;
  twins: HubTwin[];
  projects: HubTwinProject[];
};

/**
 * S1 Home (redesign 2026-09-09). Three things, in order, on one phone screen:
 * Scan · Continue (only when something is unfinished) · Projects as cards.
 * The 18-row "Quick Scan — <date>" feed is gone; twins live under their
 * project (S2). "Twin" is the object, "Scan" is the act (Decision 3).
 */
export function DigitalTwinHomeClient({ twins, projects }: Props) {
  const [scanOpen, setScanOpen] = useState(false);
  useMobileShellDock(null);

  const cards = useMemo(() => buildTwinProjectCards(twins), [twins]);
  const continueTwin = useMemo(() => pickContinueTwin(twins), [twins]);
  // The newest twin's project is the best guess when nothing was used on this phone yet.
  const fallbackProjectId = useMemo(() => twins.find((t) => t.projectId)?.projectId ?? projects[0]?.id ?? null, [projects, twins]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-3">
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        aria-label="Scan a space"
        data-twin-home="scan"
        className="flex min-h-[64px] w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-[var(--twin360-blue)] px-5 text-lg font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99]"
      >
        <Scan className="h-7 w-7" strokeWidth={2} aria-hidden />
        Scan
      </button>

      <TwinHomeContinue twin={continueTwin} />

      <TwinHomeProjects cards={cards} />

      <TwinNewScanSheet open={scanOpen} onOpenChange={setScanOpen} projects={projects} fallbackProjectId={fallbackProjectId} />
    </div>
  );
}
