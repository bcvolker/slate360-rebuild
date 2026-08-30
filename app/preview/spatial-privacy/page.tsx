"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SharePasswordGate } from "@/components/spatial-walkthrough/share/SharePasswordGate";
import { OperatorPatchPanel } from "@/components/spatial-walkthrough/studio/OperatorPatchPanel";
import { PrivacyRulesPanel } from "@/components/spatial-walkthrough/studio/PrivacyRulesPanel";
import { ExportModal } from "@/components/spatial-walkthrough/studio/ExportModal";
import { PrivacyTimeline } from "@/components/spatial-walkthrough/viewer/PrivacyTimeline";
import { parseOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { rulesForPolicy, timelineMarks, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { AccessPolicy, OperatorPatch } from "@/lib/spatial-walkthrough/types";

const RULES: RedactionRule[] = [
  { id: "r1", clipId: "c1", tStart: 12, tEnd: 24, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip", policy: "public", reason: "badge wall" },
  { id: "r2", clipId: "c1", tStart: 40, tEnd: 55, yawMin: 160, yawMax: -150, pitchMin: -20, pitchMax: 15, mode: "cover", policy: "public", reason: "site office" },
  { id: "r3", clipId: "c1", tStart: 0, tEnd: 0.1, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "hide-waypoint", policy: "client", waypointId: "wp-2" },
];

const WAYPOINTS = [
  { id: "wp-1", clipId: "c1", tSeconds: 4, label: "Lobby door", zone: "Lobby", yawDeg: 8, pitchDeg: -4, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-2", clipId: "c1", tSeconds: 22, label: "Payroll desk", zone: "Office", yawDeg: 40, pitchDeg: 0, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
];

function SphereMock({ policy, patch }: { policy: AccessPolicy; patch: OperatorPatch }) {
  const marks = timelineMarks(rulesForPolicy(RULES, policy), "c1", 90);
  return (
    <div className="relative h-[52vh] overflow-hidden border border-white/10 bg-[var(--graphite-canvas)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,white_12%,transparent),transparent_55%)]" />
      {patch.enabled && policy !== "master" ? (
        <>
          <div className="absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-black/80" data-testid="nadir-patch" />
          <div className="absolute bottom-24 left-1/2 h-20 w-40 -translate-x-1/2 bg-black/70" data-testid="rear-patch" />
        </>
      ) : null}
      {policy !== "master" && marks.some((m) => m.mode === "cover") ? (
        <div className="absolute right-10 top-24 grid h-28 w-40 place-items-center border border-white/10 bg-black/75 font-mono text-[10px] uppercase tracking-[0.14em]">
          Private
        </div>
      ) : null}
      <div className="absolute inset-x-4 bottom-4 space-y-2">
        <PrivacyTimeline duration={90} marks={marks} />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          {policy.toUpperCase()} preview
        </p>
      </div>
    </div>
  );
}

export default function SpatialPrivacyPreviewPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--graphite-muted)]">Loading…</p>}>
      <SpatialPrivacyPreview />
    </Suspense>
  );
}

function SpatialPrivacyPreview() {
  const params = useSearchParams();
  const view = params.get("view") ?? "authoring";
  const [patch, setPatch] = useState<OperatorPatch>(parseOperatorPatch({ enabled: true, rearYawCenter: 180, rearYawWidth: 70 }));
  const [exportOpen, setExportOpen] = useState(view === "export");
  const policy: AccessPolicy = view === "public" ? "public" : view === "client" ? "client" : "master";

  const title = useMemo(() => {
    if (view === "skip") return "Skip interval";
    if (view === "sector") return "Blocked sector";
    if (view === "client") return "CLIENT policy preview";
    if (view === "public") return "PUBLIC policy preview";
    if (view === "access-code") return "Access code";
    if (view === "export") return "Export";
    return "Privacy authoring";
  }, [view]);

  if (view === "access-code") {
    return <SharePasswordGate error={null} onSubmit={() => undefined} />;
  }

  return (
    <div className="min-h-screen space-y-4 bg-[var(--graphite-canvas)] p-4 text-[var(--graphite-text-header)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Spatial Walkthrough · {title}</p>
      <SphereMock policy={view === "skip" || view === "sector" ? "public" : policy} patch={patch} />
      {view === "authoring" || view === "skip" || view === "sector" ? (
        <>
          <OperatorPatchPanel patch={patch} onChange={setPatch} onPersist={() => undefined} />
          <PrivacyRulesPanel
            clipId="c1"
            walkthroughId="preview"
            draft={{ t: view === "skip" ? 12 : 40, yaw: 170, pitch: -8 }}
            waypoints={WAYPOINTS}
            rules={RULES}
            onRefresh={() => undefined}
          />
        </>
      ) : null}
      {view === "export" ? <ExportModal walkthroughId="preview" clipId="c1" open={exportOpen} onClose={() => setExportOpen(false)} /> : null}
    </div>
  );
}
