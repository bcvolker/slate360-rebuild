"use client";

import { useState } from "react";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { DeliverSectionNav, type DeliverSection } from "@/components/thermal-studio-v2/panels/deliver/DeliverSectionNav";
import { DeliverShareHome } from "@/components/thermal-studio-v2/panels/deliver/DeliverShareHome";
import { DeliverExports } from "@/components/thermal-studio-v2/panels/deliver/DeliverExports";
import { DeliverQA } from "@/components/thermal-studio-v2/panels/deliver/DeliverQA";
import { DeliverMotionCards } from "@/components/thermal-studio-v2/panels/deliver/DeliverMotionCards";
import { MotionEditor } from "@/components/thermal-studio-v2/panels/deliver/MotionEditor";
import type { MotionState } from "@/components/thermal-studio-v2/lib/useMotionState";
import type { MotionMode } from "@/components/thermal-studio-v2/lib/motion-api";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/** Tab 5 — Deliver (doc §1, S7.5 + S8-M): saved-deliverables home + composer, reusing the real share/report/export/Q&A/motion backend. */
export function DeliverPanel({
  sessionId,
  captures,
  motion,
}: {
  sessionId: string;
  captures: ThermalV2Capture[];
  /** Audit remediation Batch 1: owned by ThermalV2Shell (never unmounts on tab switch), not here. */
  motion: MotionState;
}) {
  const [section, setSection] = useState<DeliverSection>("share");
  // S8-M Motion: which sub-view is open resets on remount, which is fine —
  // only the in/out range + settings (now shell-level) need to survive.
  const [motionMode, setMotionMode] = useState<MotionMode | null>(null);

  if (motionMode) {
    const state = motion.stateFor(motionMode);
    return (
      <MotionEditor
        sessionId={sessionId}
        captures={captures}
        mode={motionMode}
        range={state.range}
        onRangeChange={(next) => motion.setRange(motionMode, next)}
        settings={state.settings}
        onSettingsChange={(next) => motion.setSettings(motionMode, next)}
        onBack={() => setMotionMode(null)}
      />
    );
  }

  return (
    <V2PanelFrame
      left={{
        title: "Sections",
        content: <DeliverSectionNav active={section} onChange={setSection} />,
      }}
      center={
        <div className="h-full overflow-y-auto p-3">
          {section === "share" ? <DeliverShareHome sessionId={sessionId} /> : null}
          {section === "reports" ? <DeliverExports sessionId={sessionId} mode="reports" /> : null}
          {section === "exports" ? <DeliverExports sessionId={sessionId} mode="exports" /> : null}
          {section === "qa" ? <DeliverQA sessionId={sessionId} /> : null}
          {section === "motion" ? <DeliverMotionCards frameCount={captures.length} onOpen={setMotionMode} /> : null}
        </div>
      }
    />
  );
}
