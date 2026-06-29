"use client";

import { useState } from "react";
import { WalkStartSheet } from "@/components/capture-v2/WalkStartSheet";
import { PlanPickerSheet, type PlanSet } from "@/components/capture-v2/PlanPickerSheet";

const MOCK_PLAN_SETS: PlanSet[] = [
  {
    id: "set-a",
    name: "Architectural",
    sheets: [
      { id: "a101", number: "A-101", label: "Level 1 — Floor plan", thumbUrl: null, priorPinCount: 12 },
      { id: "a102", number: "A-102", label: "Level 2 — Floor plan", thumbUrl: null, priorPinCount: 0 },
      { id: "a201", number: "A-201", label: "Elevations", thumbUrl: null, priorPinCount: 3 },
      { id: "a301", number: "A-301", label: "Sections", thumbUrl: null, priorPinCount: 0, converting: true },
    ],
  },
  {
    id: "set-m",
    name: "MEP",
    sheets: [
      { id: "m101", number: "M-101", label: "HVAC — Level 1", thumbUrl: null, priorPinCount: 5 },
      { id: "e101", number: "E-101", label: "Power — Level 1", thumbUrl: null, priorPinCount: 0 },
    ],
  },
];

export default function PreviewWalkStart() {
  const [screen, setScreen] = useState<"choose" | "plans">("choose");

  return (
    <div className="mx-auto flex h-[844px] max-w-sm flex-col overflow-hidden border border-white/10">
      {screen === "choose" ? (
        <WalkStartSheet
          walkLabel="Oak Ridge Roof Inspection"
          readyPlanCount={6}
          onWalkOnPlans={() => setScreen("plans")}
          onCameraOnly={() => {}}
        />
      ) : (
        <PlanPickerSheet
          walkLabel="Oak Ridge Roof Inspection"
          planSets={MOCK_PLAN_SETS}
          onBack={() => setScreen("choose")}
          onStart={() => {}}
        />
      )}
    </div>
  );
}
