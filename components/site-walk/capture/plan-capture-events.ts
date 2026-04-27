"use client";

import { useEffect, useState } from "react";
import type { PlanCaptureTarget } from "@/lib/hooks/useCaptureUpload";

const PLAN_CAPTURE_EVENT = "site-walk-plan-capture-target";

type PlanCaptureDetail = PlanCaptureTarget & {
  action: "photo" | "note";
};

function isPlanCaptureDetail(value: unknown): value is PlanCaptureDetail {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.planSheetId === "string" &&
    typeof record.xPct === "number" &&
    typeof record.yPct === "number" &&
    (record.action === "photo" || record.action === "note");
}

export function publishPlanCaptureTarget(detail: PlanCaptureDetail) {
  window.dispatchEvent(new CustomEvent(PLAN_CAPTURE_EVENT, { detail }));
}

export function usePlanCaptureTarget() {
  const [target, setTarget] = useState<PlanCaptureTarget | null>(null);

  useEffect(() => {
    function handleEvent(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (!isPlanCaptureDetail(detail)) return;
      setTarget({ planSheetId: detail.planSheetId, xPct: detail.xPct, yPct: detail.yPct, pinId: detail.pinId });
    }

    window.addEventListener(PLAN_CAPTURE_EVENT, handleEvent);
    return () => window.removeEventListener(PLAN_CAPTURE_EVENT, handleEvent);
  }, []);

  return { target, clearTarget: () => setTarget(null) };
}

export type { PlanCaptureDetail };
