"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCaptureContext } from "@/components/site-walk/capture/CaptureContext";
import type { PlanPinDropPayload } from "@/components/site-walk/capture/PlanViewerLeaflet";
import type { PlanViewerPin } from "@/components/site-walk/capture/PlanPin";
import type { PlanCaptureTarget } from "@/lib/hooks/useCaptureUpload";
import { useCamera } from "@/lib/hooks/useCamera";
import type { CaptureV2SourcePickerRowId } from "@/lib/capture-v2/source-picker-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";
import { fetchSlateDropFileAsBlob } from "@/lib/digital-twin/twin-review-fetch";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import type { CaptureV2Session } from "../session-types";
import type { CaptureV2Loop } from "../useCaptureV2Loop";
import { useCaptureV2SourcePicker } from "../useCaptureV2SourcePicker";

type Args = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  photo360Entitled?: boolean;
  onPinsRefresh: () => void;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function useWithPlansPinCapture({
  session,
  loop,
  photo360Entitled = false,
  onPinsRefresh,
}: Args) {
  const captureCtx = useCaptureContext();
  const camera = useCamera();
  const [captureActive, setCaptureActive] = useState(false);
  const [openDetailsOnMount, setOpenDetailsOnMount] = useState(false);
  const [pinDetailPin, setPinDetailPin] = useState<PlanViewerPin | null>(null);
  const [pendingStopNumber, setPendingStopNumber] = useState(1);
  const [planTargetRef, setPlanTargetRef] = useState<PlanCaptureTarget | null>(null);

  const projectLabel = session.project_name?.trim() || "Walk";

  const ingestFile = useCallback(
    (file: File) => {
      loop.setIntent({ source: "plan_pin", input: "camera" });
      loop.handleFile(file, false);
      triggerHapticSuccess();
    },
    [loop],
  );

  const [project360PickerOpen, setProject360PickerOpen] = useState(false);

  const sourcePicker = useCaptureV2SourcePicker({
    sessionId: session.id,
    loop,
    camera,
    photo360Entitled,
    ingestLivePhoto: ingestFile,
    hasProjectFolder: Boolean(session.project_id),
    onRequestProject360: () => setProject360PickerOpen(true),
  });

  // SlateDrop 360 → fetch the picked file as a blob and run it through the same
  // 360 persist path (attaches to the pending pin/stop like a device 360).
  const handleProject360Picked = useCallback(
    async (files: SlateDropPickerFile[]) => {
      const picked = files[0];
      setProject360PickerOpen(false);
      if (!picked) return;
      try {
        const file = await fetchSlateDropFileAsBlob(picked);
        await sourcePicker.ingest360File(file);
      } catch (error) {
        loop.setExternalError(
          error instanceof Error ? error.message : "Could not load that 360 from the project folder.",
        );
      }
    },
    [loop, sourcePicker],
  );

  const returnToPlan = useCallback(() => {
    setCaptureActive(false);
    setOpenDetailsOnMount(false);
    setPinDetailPin(null);
    loop.setActivePreview(null);
    captureCtx.clearPlanTarget();
    setPlanTargetRef(null);
    camera.stopCamera();
    onPinsRefresh();
  }, [camera, captureCtx, loop, onPinsRefresh]);

  const handlePinDropped = useCallback(
    (payload: PlanPinDropPayload) => {
      const target: PlanCaptureTarget = {
        planSheetId: payload.planSheetId,
        xPct: payload.xPct,
        yPct: payload.yPct,
        clientPinId: payload.clientPinId,
        pinId: isUuid(payload.pin.id) ? payload.pin.id : null,
      };
      captureCtx.setPlanTarget(target);
      setPlanTargetRef(target);
      setPendingStopNumber(payload.pinNumber);
      sourcePicker.open({ mode: "new_stop", source: "plan_pin" });
    },
    [captureCtx, sourcePicker],
  );

  const handleSourcePickerRow = useCallback(
    (rowId: CaptureV2SourcePickerRowId) => {
      if (rowId === "take_photo") {
        // The live preview is owned by NoPlansCaptureCanvas (its own camera).
        // Do NOT start this hook's camera too — that opened a second, never-
        // rendered getUserMedia stream that kept iOS's camera indicator lit
        // (and wasn't covered by the canvas background-release lifecycle).
        sourcePicker.close();
        setCaptureActive(true);
        return;
      }
      sourcePicker.selectRow(rowId);
    },
    [sourcePicker],
  );

  const handleCaptureSaved = useCallback(() => {
    returnToPlan();
  }, [returnToPlan]);

  const handleSessionPinTap = useCallback((pin: PlanViewerPin) => {
    setPinDetailPin(pin);
  }, []);

  // Capture into an EXISTING (usually empty) pin: point the source picker at this
  // pin instead of dropping a new one, so camera/upload/360 attach here.
  const captureIntoPin = useCallback(
    (pin: PlanViewerPin, planSheetId: string) => {
      const target: PlanCaptureTarget = {
        planSheetId,
        xPct: pin.x_pct,
        yPct: pin.y_pct,
        clientPinId: pin.client_pin_id ?? pin.id,
        pinId: isUuid(pin.id) ? pin.id : null,
      };
      captureCtx.setPlanTarget(target);
      setPlanTargetRef(target);
      setPendingStopNumber(Number.parseInt(pin.label, 10) || 1);
      setPinDetailPin(null);
      sourcePicker.open({ mode: "new_stop", source: "plan_pin" });
    },
    [captureCtx, sourcePicker],
  );

  // Remove a pin from the drawing. Only saved (UUID) pins hit the API; either way
  // we re-fetch so the marker disappears. Attached photos stay in the walk.
  const [deletingPinId, setDeletingPinId] = useState<string | null>(null);
  const deletePin = useCallback(
    async (pin: PlanViewerPin) => {
      setPinDetailPin(null);
      if (isUuid(pin.id)) {
        setDeletingPinId(pin.id);
        try {
          await fetch(`/api/site-walk/pins/${encodeURIComponent(pin.id)}`, { method: "DELETE" });
        } catch {
          // best-effort; refresh below reflects server truth
        }
        setDeletingPinId(null);
      }
      onPinsRefresh();
    },
    [onPinsRefresh],
  );

  const pinDetailItem = useMemo(() => {
    if (!pinDetailPin?.item_id) return null;
    return loop.items.find((item) => item.id === pinDetailPin.item_id) ?? null;
  }, [loop.items, pinDetailPin]);

  const openPinDetails = useCallback(() => {
    if (!pinDetailItem) return;
    loop.focusFilmstripItem(pinDetailItem);
    setOpenDetailsOnMount(true);
    setCaptureActive(true);
    setPinDetailPin(null);
  }, [loop, pinDetailItem]);

  useEffect(() => {
    if (!planTargetRef?.clientPinId) return;
    const serverPinId = captureCtx.planTarget?.pinId;
    if (!serverPinId || serverPinId === planTargetRef.pinId) return;
    setPlanTargetRef((current) => (current ? { ...current, pinId: serverPinId } : current));
  }, [captureCtx.planTarget?.pinId, planTargetRef]);

  return {
    camera,
    captureActive,
    setCaptureActive,
    sourcePicker,
    handleSourcePickerRow,
    handlePinDropped,
    handleSessionPinTap,
    captureIntoPin,
    deletePin,
    deletingPinId,
    project360PickerOpen,
    setProject360PickerOpen,
    handleProject360Picked,
    handleCaptureSaved,
    returnToPlan,
    pinDetailPin,
    setPinDetailPin,
    pinDetailItem,
    openPinDetails,
    openDetailsOnMount,
    pendingStopNumber,
    projectLabel,
    ingestFile,
    loop,
    session,
  };
}

export type WithPlansPinCapture = ReturnType<typeof useWithPlansPinCapture>;
