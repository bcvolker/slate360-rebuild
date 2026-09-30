"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WalkthroughExperience } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { PREVIEW_PATCH, PREVIEW_THEME, PREVIEW_WAYPOINTS } from "@/lib/spatial-walkthrough/preview-fixtures";
import { HOUSEWALK_CLIP_ID, HOUSEWALK_TITLE } from "@/lib/spatial-walkthrough/housewalk-audio";
import type { ItemAudience } from "@/lib/spatial-walkthrough/project-items";

const VIEWS: Record<string, { audience: ItemAudience; canManage: boolean; label: string }> = {
  ask: { audience: "client", canManage: false, label: "Ask about this" },
  discussion: { audience: "client", canManage: false, label: "Discussion" },
  "voice-comment": { audience: "contractor", canManage: true, label: "Voice comment" },
  convert: { audience: "contractor", canManage: true, label: "Convert to action" },
  assign: { audience: "contractor", canManage: true, label: "Assign" },
  list: { audience: "contractor", canManage: true, label: "Project Items" },
  open: { audience: "contractor", canManage: true, label: "Open in Walkthrough" },
  restricted: { audience: "client", canManage: false, label: "Client restricted view" },
  mine: { audience: "client", canManage: false, label: "My questions" },
};

function SpatialItemsPreview() {
  const params = useSearchParams();
  const view = params?.get("view") ?? "ask";
  const cfg = VIEWS[view] ?? VIEWS.ask;

  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
      <p className="px-4 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
        Spatial Walkthrough · {cfg.label}
      </p>
      <div className="relative h-[78vh]">
        <WalkthroughExperience
          theme={PREVIEW_THEME}
          title={HOUSEWALK_TITLE}
          clipId={HOUSEWALK_CLIP_ID}
          duration={42}
          waypoints={PREVIEW_WAYPOINTS.map((w) => ({ ...w, clipId: HOUSEWALK_CLIP_ID }))}
          pins={[]}
          redactions={[]}
          operatorPatch={PREVIEW_PATCH}
          preview
          capturedAt="2026-08-12T00:00:00.000Z"
          projectName="HouseWalk"
          walkthroughId="wt-housewalk"
          chapterId="ch-lobby"
          collaboration={{
            audience: cfg.audience,
            canManage: cfg.canManage,
            previewView: view,
          }}
        />
      </div>
    </div>
  );
}

export default function SpatialItemsPreviewPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--graphite-muted)]">Loading…</p>}>
      <SpatialItemsPreview />
    </Suspense>
  );
}
