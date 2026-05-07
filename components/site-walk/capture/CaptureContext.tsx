"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PlanCaptureTarget } from "@/lib/hooks/useCaptureUpload";
import type { CameraRequestSource } from "./capture-camera-events";

export type CaptureInput = "camera" | "upload";

export type PendingCapture = {
  input: CaptureInput;
  source: CameraRequestSource;
};

type CaptureContextValue = {
  planTarget: PlanCaptureTarget | null;
  setPlanTarget: (target: PlanCaptureTarget | null) => void;
  clearPlanTarget: () => void;
  pendingCapture: PendingCapture | null;
  requestCapture: (input: CaptureInput, source?: CameraRequestSource) => void;
  consumePendingCapture: () => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [planTarget, setPlanTargetState] = useState<PlanCaptureTarget | null>(null);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);

  const setPlanTarget = useCallback((target: PlanCaptureTarget | null) => setPlanTargetState(target), []);
  const clearPlanTarget = useCallback(() => setPlanTargetState(null), []);
  const requestCapture = useCallback((input: CaptureInput, source: CameraRequestSource = "quick_capture") => {
    setPendingCapture({ input, source });
  }, []);
  const consumePendingCapture = useCallback(() => setPendingCapture(null), []);

  const value = useMemo<CaptureContextValue>(() => ({
    planTarget,
    setPlanTarget,
    clearPlanTarget,
    pendingCapture,
    requestCapture,
    consumePendingCapture,
  }), [planTarget, setPlanTarget, clearPlanTarget, pendingCapture, requestCapture, consumePendingCapture]);

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export function useCaptureContext(): CaptureContextValue {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error("useCaptureContext must be used inside <CaptureProvider>");
  return ctx;
}

export function useOptionalCaptureContext(): CaptureContextValue | null {
  return useContext(CaptureContext);
}
