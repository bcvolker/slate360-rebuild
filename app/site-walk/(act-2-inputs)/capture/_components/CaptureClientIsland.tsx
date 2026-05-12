"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Map } from "lucide-react";
import { CaptureDataBottomSheet } from "@/components/site-walk/capture/CaptureDataBottomSheet";
import { ManageTradesModal } from "@/components/site-walk/capture/ManageTradesModal";
import { PlanViewer } from "@/components/site-walk/capture/PlanViewer";
import { VisualCaptureView } from "@/components/site-walk/capture/VisualCaptureView";
import { CaptureProvider, useCaptureContext } from "@/components/site-walk/capture/CaptureContext";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import { useProjectCaptureSettings } from "@/lib/hooks/useProjectCaptureSettings";
import { useDeviceContext, type DeviceCaptureInput } from "@/lib/hooks/useDeviceContext";
import { usePlanSheetsRealtime } from "@/lib/hooks/usePlanSheetsRealtime";
import type { SiteWalkPin, SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";
import { WalkStartChoice } from "./WalkStartChoice";

type Props = {
  sessionId: string;
  projectId: string | null;
  walkName: string;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
};

type WalkMode = "choice" | "plan" | "camera";

export function CaptureClientIsland(props: Props) {
  return (
    <CaptureProvider>
      <CaptureClientIslandInner {...props} />
    </CaptureProvider>
  );
}

function CaptureClientIslandInner({ sessionId, projectId, walkName, showPlanCanvas, showStartChoice, autoOpenCamera, launchId, initialItemId, planSets, planSheets }: Props) {
  // Subscribe to Realtime so hasRasterized flips immediately when Trigger.dev finishes
  const liveSheets = usePlanSheetsRealtime(planSheets, projectId);
  const captureCtx = useCaptureContext();
  const { requestCapture } = captureCtx;
  const [walkMode, setWalkMode] = useState<WalkMode>(() => showStartChoice ? "choice" : showPlanCanvas ? "plan" : "camera");
  const [currentLocation, setCurrentLocation] = useState("Stop 1");
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [planRefreshKey, setPlanRefreshKey] = useState(0);

  // ── Direct picker refs: these open the native file/camera picker synchronously ──
  const directCameraRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);
  const pickerIntentRef = useRef<{ source: string; input: "camera" | "upload" }>({ source: "quick_capture", input: "camera" });

  // Register the synchronous picker opener on the context so any child can use it
  useEffect(() => {
    captureCtx.openPickerRef.current = (input, source) => {
      pickerIntentRef.current = { source, input };
      const ref = input === "camera" ? directCameraRef : directUploadRef;
      ref.current!.value = "";
      ref.current!.click();
    };
    return () => { captureCtx.openPickerRef.current = null; };
  }, [captureCtx]);

  const [ghostOn, setGhostOn] = useState(false);
  const [markupOn, setMarkupOn] = useState(true);
  const carryForwardRef = useRef<Partial<Pick<CaptureItemDraft, "classification" | "trade" | "priority" | "status" | "assignedTo">> | null>(null);
  const appliedCarryRef = useRef<string | null>(null);
  const [returnToPlanAfterSave, setReturnToPlanAfterSave] = useState(false);
  const { primaryCaptureInput } = useDeviceContext();
  const { items, assignees, activeItem, draft, saveState, aiState, aiMessage, selectItem, deselectItem, patchDraft, flushCurrentDraft, saveMarkupData, savePhotoAttachmentPins, savePhotoAngle, formatNotesWithAi } = useCaptureItems({ sessionId, projectId });
  const tradeSettings = useProjectCaptureSettings(projectId);
  const [manageTradesOpen, setManageTradesOpen] = useState(false);

  useEffect(() => {
    if (!initialItemId || activeItem?.id === initialItemId) return;
    const target = items.find((item) => item.id === initialItemId || item.client_item_id === initialItemId);
    if (target) selectItem(target);
  }, [activeItem?.id, initialItemId, items, selectItem]);

  useEffect(() => {
    const savedLocation = sessionStorage.getItem(`site-walk:current-location:${sessionId}`);
    if (savedLocation?.trim()) setCurrentLocation(savedLocation.trim());
    const savedRecent = sessionStorage.getItem(`site-walk:recent-locations:${sessionId}`);
    if (savedRecent) setRecentLocations(parseRecentLocations(savedRecent));
  }, [sessionId]);

  useEffect(() => {
    sessionStorage.setItem(`site-walk:current-location:${sessionId}`, currentLocation);
  }, [currentLocation, sessionId]);

  useEffect(() => {
    sessionStorage.setItem(`site-walk:recent-locations:${sessionId}`, JSON.stringify(recentLocations));
  }, [recentLocations, sessionId]);

  useEffect(() => {
    if (!activeItem || !draft || appliedCarryRef.current === activeItem.id) return;
    appliedCarryRef.current = activeItem.id;
    if (carryForwardRef.current) patchDraft(carryForwardRef.current);
  }, [activeItem, draft, patchDraft]);

  function updateLocation(location: string) {
    const cleanLocation = location.trim() || "Stop 1";
    setCurrentLocation(cleanLocation);
    setRecentLocations((current) => [cleanLocation, ...current.filter((item) => item !== cleanLocation)].slice(0, 8));
  }

  function rememberCarryForward() {
    if (!draft) return;
    carryForwardRef.current = {
      classification: draft.classification,
      trade: draft.trade,
      priority: draft.priority,
      status: draft.status,
      assignedTo: draft.assignedTo,
    };
  }

  function captureNow(input: DeviceCaptureInput = primaryCaptureInput) {
    setWalkMode("camera");
    // Use the synchronous direct picker path — .click() happens in THIS event frame
    openPickerDirect(input, "next_item");
  }

  /** Opens the native picker synchronously — MUST be called from within a user tap/click handler frame. */
  function openPickerDirect(input: "camera" | "upload", source: string) {
    pickerIntentRef.current = { source, input };
    const ref = input === "camera" ? directCameraRef : directUploadRef;
    ref.current!.value = "";
    ref.current!.click();
  }

  function saveNextStop(options: { fromPlanPin?: boolean } = {}) {
    rememberCarryForward();
    // Fire and forget so we don't break the user gesture token for native file picker
    flushCurrentDraft().catch((error) => {
      console.error("[site-walk] Save & Next draft flush failed; continuing to next stop", error);
    });
    
    const shouldReturnToPlan = options.fromPlanPin || returnToPlanAfterSave;
    
    updateLocation(nextStopLabel(currentLocation, recentLocations));
    if (shouldReturnToPlan) {
      setWalkMode("plan");
      setReturnToPlanAfterSave(false);
      deselectItem();
      return;
    }
    // CRITICAL: this opens the picker synchronously in the same event frame as the tap
    captureNow();
  }

  function openCameraMode(openCamera = false) {
    setReturnToPlanAfterSave(false);
    setWalkMode("camera");
    if (openCamera) requestCapture(primaryCaptureInput, "next_item");
  }

  function handlePlanCaptureRequest(input: "camera" | "upload") {
    // PlanQuickActionMenu has already set the planTarget on the context.
    setReturnToPlanAfterSave(true);
    openPickerDirect(input, "plan_pin");
    setWalkMode("camera");
  }

  /** Handle files selected from the colocated direct picker inputs. */
  function handleDirectFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    // Dispatch a capture-file event that CameraViewfinder can consume
    window.dispatchEvent(new CustomEvent("site-walk:direct-capture-file", {
      detail: { file, source: pickerIntentRef.current.source, input: pickerIntentRef.current.input },
    }));
  }

  function handlePlanCaptureSaved(_pin: SiteWalkPin | null) {
    setReturnToPlanAfterSave(true);
    setPlanRefreshKey((current) => current + 1);
  }

  if (walkMode === "choice") {
    return <WalkStartChoice walkName={walkName} onPlanMode={() => setWalkMode("plan")} onCameraOnly={() => openCameraMode()} />;
  }

  const ghostImageUrl = findGhostImageUrl(items, activeItem?.id ?? null, currentLocation);

  return (
    <section className="relative flex h-full w-full flex-1 overflow-hidden bg-slate-950 text-white flex-col md:flex-row">
      {/* Left pane: capture canvas */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {walkMode === "plan" ? (
          <PlanViewer
            key={planRefreshKey}
            projectId={projectId}
            sessionId={sessionId}
            planSets={planSets}
            sheets={liveSheets}
            items={items}
            onCaptureRequest={handlePlanCaptureRequest}
            onSelectItem={(id) => {
              const target = items.find((i) => i.id === id);
              if (target) {
                selectItem(target);
                setWalkMode("camera");
              }
            }}
          />
        ) : (
          <VisualCaptureView
            sessionId={sessionId}
            autoOpenCamera={autoOpenCamera}
            launchId={launchId}
            items={items}
            activeItemId={activeItem?.id ?? null}
            modeLabel={showPlanCanvas ? "Plan-linked" : "Photos-only"}
            ghostImageUrl={ghostImageUrl}
            ghostOn={ghostOn}
            markupOn={markupOn}
            onToggleGhost={() => setGhostOn((current) => !current)}
            onToggleMarkup={() => setMarkupOn((current) => !current)}
            onMarkupChange={(itemId, markup) => void saveMarkupData(itemId, markup)}
            onAttachmentPinsChange={(itemId, pins) => void savePhotoAttachmentPins(itemId, pins)}
            onPlanCaptureSaved={handlePlanCaptureSaved}
            onAddAngle={() => requestCapture(primaryCaptureInput, "angle")}
            onAngleCaptureFile={savePhotoAngle}
            onSelectItem={(id) => { const t = items.find((i) => i.id === id); if (t) selectItem(t); }}
          />
        )}

        {/* Layer 1: mode switch and plan home affordance — overlay on canvas only */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {showPlanCanvas && <div className="pointer-events-auto"><CaptureModeToggle mode={walkMode === "plan" ? "plan" : "camera"} onPlan={() => { setReturnToPlanAfterSave(false); setWalkMode("plan"); }} onCamera={() => openCameraMode()} /></div>}
          {walkMode === "plan" && <div className="pointer-events-auto"><SiteWalkHomeButton /></div>}
        </div>
      </div>

      {/* Right pane on desktop / bottom sheet on mobile */}
      <CaptureDataBottomSheet
        sessionId={sessionId}
        item={activeItem}
        items={items}
        assignees={assignees}
        draft={draft}
        saveState={saveState}
        aiState={aiState}
        aiMessage={aiMessage}
        currentLocation={currentLocation}
        tradeOptions={tradeSettings.trades}
        canManageTrades={Boolean(projectId)}
        returnsToPlan={returnToPlanAfterSave}
        onDraftChange={patchDraft}
        onCapture={captureNow}
        onFormatNotes={() => void formatNotesWithAi()}
        onSaveNextStop={(opts?: { fromPlanPin?: boolean }) => saveNextStop({ fromPlanPin: opts?.fromPlanPin ?? returnToPlanAfterSave })}
        onOpenManageTrades={() => setManageTradesOpen(true)}
      />

      {manageTradesOpen && (
        <ManageTradesModal
          projectId={projectId}
          initialTrades={tradeSettings.trades}
          onClose={() => setManageTradesOpen(false)}
          onSave={tradeSettings.save}
        />
      )}

      {/* Direct picker inputs — colocated here so .click() runs in the same event frame as the tap.
          This is the FIX for iOS Safari user-activation loss (BUG-079). */}
      <input ref={directCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDirectFileChange} />
      <input ref={directUploadRef} type="file" accept="image/*" className="hidden" onChange={handleDirectFileChange} />
    </section>
  );
}

function CaptureModeToggle({ mode, onPlan, onCamera }: { mode: "plan" | "camera"; onPlan: () => void; onCamera: () => void }) {
  return <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/75 p-1 shadow-2xl backdrop-blur-xl"><button type="button" onClick={onPlan} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "plan" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}><Map className="h-3.5 w-3.5" /> Plan</button><button type="button" onClick={onCamera} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "camera" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}><Camera className="h-3.5 w-3.5" /> Camera</button></div>;
}

function SiteWalkHomeButton() {
  return <Link href="/site-walk" className="absolute right-3 top-3 z-30 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/75 px-3 text-xs font-black text-white/80 shadow-2xl backdrop-blur-xl hover:border-amber-300/50 hover:text-amber-100"><ArrowLeft className="h-4 w-4" /> Home</Link>;
}

function parseRecentLocations(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function nextStopLabel(currentLocation: string, recentLocations: string[]) {
  const candidates = [currentLocation, ...recentLocations];
  const maxStop = candidates.reduce((max, label) => {
    const match = label.trim().match(/^stop\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1);
  return `Stop ${maxStop + 1}`;
}
function findGhostImageUrl(items: { id: string; title: string; item_type: string; local_preview_url?: string | null }[], activeItemId: string | null, location: string) {
  const prefix = location.trim();
  return items.find((item) => item.id !== activeItemId && item.item_type === "photo" && item.title.startsWith(prefix) && item.local_preview_url)?.local_preview_url ?? null;
}