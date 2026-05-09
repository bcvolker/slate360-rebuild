"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { PlanCaptureTarget } from "@/lib/hooks/useCaptureUpload";
import type { CameraRequestSource } from "./capture-camera-events";

export type CaptureInput = "camera" | "upload";

export type PendingCapture = {
  input: CaptureInput;
  source: CameraRequestSource;
};

/** Explicit capture flow states — replaces implicit boolean flags. */
export type CaptureFlowState =
  | "idle"            // No active capture, empty or viewing existing item
  | "opening_picker"  // Native file/camera picker is being opened
  | "uploading"       // File selected, compression + upload in progress
  | "active_item"     // An item is captured/selected and ready for notes/markup
  | "advancing"       // Save & Next in progress, flushing draft
  | "error";          // Something went wrong

/** Function signature for synchronously opening the native picker. */
export type OpenPickerSync = (input: CaptureInput, source: CameraRequestSource) => void;

type CaptureContextValue = {
  planTarget: PlanCaptureTarget | null;
  setPlanTarget: (target: PlanCaptureTarget | null) => void;
  clearPlanTarget: () => void;
  /** @deprecated Use openPickerSync instead — this defers .click() to useEffect. */
  pendingCapture: PendingCapture | null;
  /** @deprecated Use openPickerSync instead. */
  requestCapture: (input: CaptureInput, source?: CameraRequestSource) => void;
  consumePendingCapture: () => void;
  /** Synchronous picker open — call from inside a click/tap handler to preserve user-activation. */
  openPickerSync: OpenPickerSync;
  /** Ref that CaptureClientIsland sets to wire the synchronous picker path. */
  openPickerRef: MutableRefObject<OpenPickerSync | null>;
  /** Explicit capture flow state. */
  flowState: CaptureFlowState;
  setFlowState: (state: CaptureFlowState) => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [planTarget, setPlanTargetState] = useState<PlanCaptureTarget | null>(null);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [flowState, setFlowState] = useState<CaptureFlowState>("idle");
  const openPickerRefInternal = useRef<OpenPickerSync | null>(null);

  const setPlanTarget = useCallback((target: PlanCaptureTarget | null) => {
    console.log("[capture]#2 setPlanTarget", target);
    setPlanTargetState(target);
  }, []);
  const clearPlanTarget = useCallback(() => setPlanTargetState(null), []);

  // Legacy path — kept for backward compatibility but SHOULD NOT be used for new code.
  const requestCapture = useCallback((input: CaptureInput, source: CameraRequestSource = "quick_capture") => {
    // Try synchronous path first (if CaptureClientIsland has registered the ref)
    if (openPickerRefInternal.current) {
      openPickerRefInternal.current(input, source);
      return;
    }
    // Fallback to the old effect-based path
    setPendingCapture({ input, source });
  }, []);

  const consumePendingCapture = useCallback(() => setPendingCapture(null), []);

  const openPickerSync = useCallback<OpenPickerSync>((input, source) => {
    if (openPickerRefInternal.current) {
      openPickerRefInternal.current(input, source);
    }
  }, []);

  const value = useMemo<CaptureContextValue>(() => ({
    planTarget,
    setPlanTarget,
    clearPlanTarget,
    pendingCapture,
    requestCapture,
    consumePendingCapture,
    openPickerSync,
    openPickerRef: openPickerRefInternal,
    flowState,
    setFlowState,
  }), [planTarget, setPlanTarget, clearPlanTarget, pendingCapture, requestCapture, consumePendingCapture, openPickerSync, flowState]);

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
