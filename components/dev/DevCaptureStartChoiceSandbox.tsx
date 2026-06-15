"use client";

import { useState } from "react";
import { WalkStartSheet } from "@/components/capture-v2/WalkStartSheet";

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
    <WalkStartSheet
      walkLabel="Riverside Tower — Level 3"
      readyPlanCount={2}
      onWalkOnPlans={() => setMode("plan")}
      onCameraOnly={() => setMode("camera")}
    />
  );
}
