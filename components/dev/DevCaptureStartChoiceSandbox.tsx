"use client";

import { useState } from "react";
import { CaptureV2StartChoiceSheet } from "@/components/capture-v2/CaptureV2StartChoiceSheet";

export function DevCaptureStartChoiceSandbox() {
  const [mode, setMode] = useState<"sheet" | "plan" | "camera">("sheet");

  if (mode !== "sheet") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--graphite-canvas)] p-6 text-sm text-slate-300">
        Selected: {mode === "plan" ? "Walk on plans" : "Camera only"}
      </div>
    );
  }

  return (
    <CaptureV2StartChoiceSheet
      walkLabel="Riverside Tower — Level 3"
      onWalkOnPlans={() => setMode("plan")}
      onCameraOnly={() => setMode("camera")}
    />
  );
}
