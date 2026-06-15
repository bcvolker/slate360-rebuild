"use client";

import { WalkStartSheet } from "@/components/capture-v2/WalkStartSheet";

export default function PreviewWalkStart() {
  return (
    <div className="mx-auto flex h-[844px] max-w-sm flex-col overflow-hidden">
      <WalkStartSheet
        walkLabel="Oak Ridge Roof Inspection"
        readyPlanCount={2}
        onWalkOnPlans={() => {}}
        onCameraOnly={() => {}}
      />
    </div>
  );
}
